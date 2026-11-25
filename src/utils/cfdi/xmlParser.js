import { XMLParser } from 'fast-xml-parser';

const MAX_XML_BYTES = 5 * 1024 * 1024; // 5 MB
const UUID_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
const FORBIDDEN_XML_PATTERNS = [
    /<!DOCTYPE\b/i,
    /<!ENTITY\b/i,
    /<!ELEMENT\b/i,
    /<!ATTLIST\b/i,
    /SYSTEM\s+["']/i,
    /PUBLIC\s+["']/i
];

const SUPPORTED_COMPLEMENTS = new Set([
    'TimbreFiscalDigital',
    'Pagos'
]);

const sanitizeText = (val) => {
    if (val === undefined || val === null) return '';
    return String(val)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .trim();
};

const toArray = (node) => {
    if (!node) return [];
    return Array.isArray(node) ? node : [node];
};

const parseNumericString = (raw) => {
    const clean = sanitizeText(raw);
    if (!clean) return { raw: '', value: null };
    const num = Number(clean);
    return {
        raw: clean,
        value: Number.isFinite(num) ? num : null
    };
};

// Paso 1: Validación de seguridad del texto XML antes de parsear (anti-XXE / DTD / tamaño)
export const validateRawXmlSecurity = (xmlText) => {
    if (typeof xmlText !== 'string' || !xmlText.trim()) {
        return { ok: false, error: 'El archivo XML está vacío.' };
    }

    const byteLength = new TextEncoder().encode(xmlText).length;
    if (byteLength > MAX_XML_BYTES) {
        return { ok: false, error: 'El archivo XML excede el tamaño máximo permitido de 5 MB.' };
    }

    for (const pattern of FORBIDDEN_XML_PATTERNS) {
        if (pattern.test(xmlText)) {
            return {
                ok: false,
                error: 'El XML contiene declaraciones DTD o entidades externas no permitidas por seguridad (XXE).'
            };
        }
    }

    return { ok: true };
};

// Paso 2: Lectura y parseo seguro con fast-xml-parser
export const parseRawXmlDocument = (xmlText) => {
    const sec = validateRawXmlSecurity(xmlText);
    if (!sec.ok) {
        return { ok: false, error: sec.error };
    }

    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        removeNSPrefix: true,
        processEntities: false,
        allowBooleanAttributes: false,
        parseTagValue: false,
        parseAttributeValue: false,
        trimValues: true
    });

    try {
        const parsed = parser.parse(xmlText);
        if (!parsed || typeof parsed !== 'object') {
            return { ok: false, error: 'No fue posible interpretar la estructura del XML.' };
        }
        return { ok: true, doc: parsed };
    } catch (err) {
        return {
            ok: false,
            error: `El archivo no es un XML bien formado: ${err?.message || 'Error de sintaxis'}`
        };
    }
};

// Cadena original del Complemento de Certificación Digital del SAT (Anexo 20)
export const buildTimbreCadenaOriginal = (timbre) => {
    if (!timbre || !timbre.uuid || !timbre.selloCFD || !timbre.noCertificadoSAT) return '';
    const parts = [
        timbre.version || '1.1',
        timbre.uuid,
        timbre.fechaTimbrado,
        timbre.rfcProvCertif,
        ...(timbre.leyenda ? [timbre.leyenda] : []),
        timbre.selloCFD,
        timbre.noCertificadoSAT
    ].map((p) => sanitizeText(p));

    return `||${parts.join('|')}||`;
};

// URL oficial de verificación SAT para el código QR (idéntica a la generada por el portal del SAT)
// Ejemplo oficial: https://verificacfdi.facturaelectronica.sat.gob.mx/?id=UUID&re=RFC_EMISOR&rr=RFC_RECEPTOR&tt=4500.00&fe=wNCIVQ==
export const buildSatQrUrl = ({ uuid, rfcEmisor, rfcReceptor, totalRaw, selloCFD }) => {
    if (!uuid || !rfcEmisor || !rfcReceptor) return '';

    const fe = selloCFD ? selloCFD.slice(-8) : '';
    const tt = sanitizeText(totalRaw) || '0.00';
    const safeRe = sanitizeText(rfcEmisor).replace(/&/g, '%26');
    const safeRr = sanitizeText(rfcReceptor).replace(/&/g, '%26');

    return `https://verificacfdi.facturaelectronica.sat.gob.mx/?id=${sanitizeText(uuid)}&re=${safeRe}&rr=${safeRr}&tt=${tt}&fe=${fe}`;
};

// Paso 3 & 4: Validación estructural, extracción y normalización del CFDI
export const parseAndNormalizeCfdi = (xmlText) => {
    const errors = [];
    const warnings = [];

    const parsedRes = parseRawXmlDocument(xmlText);
    if (!parsedRes.ok) {
        return { valid: false, errors: [parsedRes.error], warnings: [], data: null };
    }

    const root = parsedRes.doc.Comprobante;
    if (!root || typeof root !== 'object') {
        return {
            valid: false,
            errors: ['El archivo XML no corresponde a un CFDI (no se encontró el nodo raíz Comprobante).'],
            warnings: [],
            data: null
        };
    }

    // Datos generales del Comprobante
    const version = sanitizeText(root['@_Version'] || root['@_version']);
    if (!version) {
        errors.push('El CFDI no declara el atributo Version.');
    } else if (version !== '4.0') {
        warnings.push(`El CFDI corresponde a la versión ${version}. Este módulo está optimizado para CFDI 4.0; revise los datos antes de guardar.`);
    }

    const tipoDeComprobante = sanitizeText(root['@_TipoDeComprobante']).toUpperCase();
    if (!['I', 'E', 'P', 'T', 'N'].includes(tipoDeComprobante)) {
        errors.push(`TipoDeComprobante no reconocido o ausente: "${tipoDeComprobante || 'vacío'}".`);
    } else if (tipoDeComprobante === 'T' || tipoDeComprobante === 'N') {
        warnings.push(
            `El tipo de comprobante "${tipoDeComprobante}" (${tipoDeComprobante === 'N' ? 'Nómina' : 'Traslado'}) puede contener complementos especializados no renderizados en su totalidad. Verifique antes de entregar esta representación impresa.`
        );
    }

    const serie = sanitizeText(root['@_Serie']);
    const folio = sanitizeText(root['@_Folio']);
    const fecha = sanitizeText(root['@_Fecha']);
    const moneda = sanitizeText(root['@_Moneda']).toUpperCase() || 'MXN';
    const tipoCambio = parseNumericString(root['@_TipoCambio']);
    const metodoPago = sanitizeText(root['@_MetodoPago']).toUpperCase();
    const formaPago = sanitizeText(root['@_FormaPago']);
    const exportacion = sanitizeText(root['@_Exportacion']);
    const lugarExpedicion = sanitizeText(root['@_LugarExpedicion']);
    const noCertificado = sanitizeText(root['@_NoCertificado']);
    const sello = sanitizeText(root['@_Sello']);
    const condicionesDePago = sanitizeText(root['@_CondicionesDePago']);

    const subTotal = parseNumericString(root['@_SubTotal']);
    const descuento = parseNumericString(root['@_Descuento']);
    const total = parseNumericString(root['@_Total']);

    if (!fecha) errors.push('Falta la Fecha de emisión en el Comprobante.');
    if (subTotal.value === null) errors.push('Falta o es inválido el atributo SubTotal.');
    if (total.value === null) errors.push('Falta o es inválido el atributo Total.');

    // Emisor
    const emisorNode = root.Emisor || {};
    const emisor = {
        rfc: sanitizeText(emisorNode['@_Rfc']).toUpperCase(),
        nombre: sanitizeText(emisorNode['@_Nombre']),
        regimenFiscal: sanitizeText(emisorNode['@_RegimenFiscal']),
        lugarExpedicion
    };
    if (!emisor.rfc) errors.push('Falta el RFC del Emisor.');
    if (!emisor.nombre) warnings.push('El nodo Emisor no incluye Nombre o Razón Social.');

    // Receptor
    const receptorNode = root.Receptor || {};
    const receptor = {
        rfc: sanitizeText(receptorNode['@_Rfc']).toUpperCase(),
        nombre: sanitizeText(receptorNode['@_Nombre']),
        domicilioFiscalReceptor: sanitizeText(receptorNode['@_DomicilioFiscalReceptor']),
        regimenFiscalReceptor: sanitizeText(receptorNode['@_RegimenFiscalReceptor']),
        usoCFDI: sanitizeText(receptorNode['@_UsoCFDI']).toUpperCase(),
        residenciaFiscal: sanitizeText(receptorNode['@_ResidenciaFiscal'])
    };
    if (!receptor.rfc) errors.push('Falta el RFC del Receptor.');
    if (!receptor.nombre) warnings.push('El nodo Receptor no incluye Nombre o Razón Social.');
    if (version === '4.0' && !receptor.domicilioFiscalReceptor) {
        warnings.push('CFDI 4.0 sin DomicilioFiscalReceptor declarado.');
    }
    if (version === '4.0' && !receptor.regimenFiscalReceptor) {
        warnings.push('CFDI 4.0 sin RegimenFiscalReceptor declarado.');
    }

    // Conceptos
    const conceptosRaw = toArray(root.Conceptos?.Concepto);
    if (conceptosRaw.length === 0) {
        errors.push('El CFDI no contiene nodos de Concepto.');
    }

    const conceptos = conceptosRaw.map((c, idx) => {
        const cant = parseNumericString(c['@_Cantidad']);
        const valUnit = parseNumericString(c['@_ValorUnitario']);
        const imp = parseNumericString(c['@_Importe']);
        const desc = parseNumericString(c['@_Descuento']);

        const trasladosConcepto = toArray(c.Impuestos?.Traslados?.Traslado).map((t) => ({
            base: parseNumericString(t['@_Base']),
            impuesto: sanitizeText(t['@_Impuesto']),
            tipoFactor: sanitizeText(t['@_TipoFactor']),
            tasaOCuota: sanitizeText(t['@_TasaOCuota']),
            importe: parseNumericString(t['@_Importe'])
        }));

        const retencionesConcepto = toArray(c.Impuestos?.Retenciones?.Retencion).map((r) => ({
            base: parseNumericString(r['@_Base']),
            impuesto: sanitizeText(r['@_Impuesto']),
            tipoFactor: sanitizeText(r['@_TipoFactor']),
            tasaOCuota: sanitizeText(r['@_TasaOCuota']),
            importe: parseNumericString(r['@_Importe'])
        }));

        return {
            index: idx + 1,
            claveProdServ: sanitizeText(c['@_ClaveProdServ']),
            noIdentificacion: sanitizeText(c['@_NoIdentificacion']),
            cantidad: cant.value ?? 0,
            cantidadRaw: cant.raw || '0',
            claveUnidad: sanitizeText(c['@_ClaveUnidad']),
            unidad: sanitizeText(c['@_Unidad']),
            descripcion: sanitizeText(c['@_Descripcion']),
            valorUnitario: valUnit.value ?? 0,
            valorUnitarioRaw: valUnit.raw || '0',
            importe: imp.value ?? 0,
            importeRaw: imp.raw || '0',
            descuento: desc.value ?? 0,
            descuentoRaw: desc.raw || '',
            objetoImp: sanitizeText(c['@_ObjetoImp']),
            traslados: trasladosConcepto,
            retenciones: retencionesConcepto
        };
    });

    // Impuestos globales (sin recalcular ni alterar lo declarado en el XML)
    const impNode = root.Impuestos || {};
    const totalImpuestosTrasladados = parseNumericString(impNode['@_TotalImpuestosTrasladados']);
    const totalImpuestosRetenidos = parseNumericString(impNode['@_TotalImpuestosRetenidos']);

    const traslados = toArray(impNode.Traslados?.Traslado).map((t) => ({
        base: parseNumericString(t['@_Base']),
        impuesto: sanitizeText(t['@_Impuesto']),
        tipoFactor: sanitizeText(t['@_TipoFactor']),
        tasaOCuota: sanitizeText(t['@_TasaOCuota']),
        importe: parseNumericString(t['@_Importe'])
    }));

    const retenciones = toArray(impNode.Retenciones?.Retencion).map((r) => ({
        impuesto: sanitizeText(r['@_Impuesto']),
        importe: parseNumericString(r['@_Importe'])
    }));

    // CFDIs Relacionados
    const cfdiRelacionados = toArray(root.CfdiRelacionados).map((group) => ({
        tipoRelacion: sanitizeText(group['@_TipoRelacion']),
        uuids: toArray(group.CfdiRelacionado)
            .map((rel) => sanitizeText(rel['@_UUID']).toUpperCase())
            .filter(Boolean)
    }));

    // Complementos (TimbreFiscalDigital, Pagos, otros)
    const complementosList = toArray(root.Complemento);
    let timbreNode = null;
    let pagosNode = null;
    const complementosDetectados = [];
    const complementosNoSoportados = [];

    for (const comp of complementosList) {
        if (!comp || typeof comp !== 'object') continue;
        for (const key of Object.keys(comp)) {
            if (key.startsWith('@_')) continue;
            complementosDetectados.push(key);
            if (key === 'TimbreFiscalDigital') {
                timbreNode = Array.isArray(comp[key]) ? comp[key][0] : comp[key];
            } else if (key === 'Pagos') {
                pagosNode = Array.isArray(comp[key]) ? comp[key][0] : comp[key];
            } else if (!SUPPORTED_COMPLEMENTS.has(key)) {
                complementosNoSoportados.push(key);
            }
        }
    }

    if (complementosNoSoportados.length > 0) {
        warnings.push(
            `El XML contiene complementos adicionales con soporte parcial: ${complementosNoSoportados.join(', ')}. El XML original se conservará intacto.`
        );
    }

    if (!timbreNode) {
        errors.push('El XML no contiene el complemento TimbreFiscalDigital (no está timbrado).');
    }

    const timbre = timbreNode
        ? {
              version: sanitizeText(timbreNode['@_Version'] || timbreNode['@_version']) || '1.1',
              uuid: sanitizeText(timbreNode['@_UUID']).toUpperCase(),
              fechaTimbrado: sanitizeText(timbreNode['@_FechaTimbrado']),
              rfcProvCertif: sanitizeText(timbreNode['@_RfcProvCertif']).toUpperCase(),
              leyenda: sanitizeText(timbreNode['@_Leyenda']),
              selloCFD: sanitizeText(timbreNode['@_SelloCFD']) || sello,
              noCertificadoSAT: sanitizeText(timbreNode['@_NoCertificadoSAT']),
              selloSAT: sanitizeText(timbreNode['@_SelloSAT'])
          }
        : null;

    if (timbre) {
        if (!timbre.uuid || !UUID_REGEX.test(timbre.uuid)) {
            errors.push('El UUID del TimbreFiscalDigital falta o no tiene un formato válido.');
        }
        if (!timbre.fechaTimbrado) warnings.push('Falta FechaTimbrado en el TimbreFiscalDigital.');
        if (!timbre.selloCFD) warnings.push('Falta SelloCFD en el TimbreFiscalDigital.');
        if (!timbre.selloSAT) warnings.push('Falta SelloSAT en el TimbreFiscalDigital.');
        if (!timbre.noCertificadoSAT) warnings.push('Falta NoCertificadoSAT en el TimbreFiscalDigital.');
    }

    // Complemento de Pagos (2.0 / 1.0) si TipoDeComprobante === 'P'
    let pagos = null;
    if (pagosNode) {
        const totalesNode = pagosNode.Totales || {};
        const pagosList = toArray(pagosNode.Pago).map((p, idx) => ({
            index: idx + 1,
            fechaPago: sanitizeText(p['@_FechaPago']),
            formaDePagoP: sanitizeText(p['@_FormaDePagoP']),
            monedaP: sanitizeText(p['@_MonedaP']).toUpperCase() || 'MXN',
            tipoCambioP: sanitizeText(p['@_TipoCambioP']),
            monto: parseNumericString(p['@_Monto']),
            numOperacion: sanitizeText(p['@_NumOperacion']),
            doctosRelacionados: toArray(p.DoctoRelacionado).map((d) => ({
                idDocumento: sanitizeText(d['@_IdDocumento']).toUpperCase(),
                serie: sanitizeText(d['@_Serie']),
                folio: sanitizeText(d['@_Folio']),
                monedaDR: sanitizeText(d['@_MonedaDR']).toUpperCase(),
                equivalenciaDR: sanitizeText(d['@_EquivalenciaDR']),
                numParcialidad: sanitizeText(d['@_NumParcialidad']),
                impSaldoAnt: parseNumericString(d['@_ImpSaldoAnt']),
                impPagado: parseNumericString(d['@_ImpPagado']),
                impSaldoInsoluto: parseNumericString(d['@_ImpSaldoInsoluto'])
            }))
        }));

        pagos = {
            version: sanitizeText(pagosNode['@_Version']) || '2.0',
            montoTotalPagos: parseNumericString(totalesNode['@_MontoTotalPagos']),
            totalTrasladosImpuestoIVA16: parseNumericString(totalesNode['@_TotalTrasladosImpuestoIVA16']),
            totalTrasladosBaseIVA16: parseNumericString(totalesNode['@_TotalTrasladosBaseIVA16']),
            pagos: pagosList
        };
    } else if (tipoDeComprobante === 'P') {
        warnings.push('El comprobante es de tipo Pago (P) pero no contiene el complemento Pagos.');
    }

    // Comprobación de consistencia aritmética (solo advertencia, NUNCA modifica los importes del XML)
    if (tipoDeComprobante !== 'P' && subTotal.value !== null && total.value !== null) {
        const expected =
            subTotal.value -
            (descuento.value || 0) +
            (totalImpuestosTrasladados.value || 0) -
            (totalImpuestosRetenidos.value || 0);
        if (Math.abs(expected - total.value) > 0.05) {
            warnings.push(
                `Diferencia de redondeo/consistencia detectada entre los importes declarados (Total XML: ${total.raw}). Se conservan intactos los valores oficiales del XML.`
            );
        }
    }

    if (errors.length > 0) {
        return { valid: false, errors, warnings, data: null };
    }

    const cadenaOriginalSAT = buildTimbreCadenaOriginal(timbre);
    const satQrUrl = buildSatQrUrl({
        uuid: timbre.uuid,
        rfcEmisor: emisor.rfc,
        rfcReceptor: receptor.rfc,
        totalRaw: total.raw,
        selloCFD: timbre.selloCFD
    });

    const normalized = {
        version,
        tipoDeComprobante,
        serie,
        folio,
        fecha,
        moneda,
        tipoCambio: tipoCambio.value,
        tipoCambioRaw: tipoCambio.raw,
        metodoPago,
        formaPago,
        exportacion,
        lugarExpedicion,
        noCertificado,
        condicionesDePago,
        emisor,
        receptor,
        conceptos,
        impuestos: {
            totalTrasladados: totalImpuestosTrasladados.value ?? 0,
            totalTrasladadosRaw: totalImpuestosTrasladados.raw,
            totalRetenidos: totalImpuestosRetenidos.value ?? 0,
            totalRetenidosRaw: totalImpuestosRetenidos.raw,
            traslados,
            retenciones
        },
        importes: {
            subTotal: subTotal.value ?? 0,
            subTotalRaw: subTotal.raw,
            descuento: descuento.value ?? 0,
            descuentoRaw: descuento.raw,
            total: total.value ?? 0,
            totalRaw: total.raw
        },
        cfdiRelacionados,
        pagos,
        timbre,
        cadenaOriginalSAT,
        satQrUrl,
        complementosDetectados,
        complementosNoSoportados
    };

    return {
        valid: true,
        errors: [],
        warnings,
        data: normalized
    };
};
