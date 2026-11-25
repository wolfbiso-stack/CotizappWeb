import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    parseAndNormalizeCfdi,
    buildSatQrUrl,
    validateRawXmlSecurity
} from '../src/utils/cfdi/xmlParser.js';
import { amountToWords } from '../src/utils/cfdi/amountToWords.js';
import { generateCfdiPdf } from '../src/utils/cfdi/pdfGenerator.js';
import {
    checkDuplicateUuid,
    saveImportedCfdi,
    regenerateCfdiPdf,
    getNextFacturaNumero
} from '../src/utils/cfdi/cfdiStorageService.js';

// Generador de fixtures XML CFDI 4.0 sintéticos solo para pruebas
const makeCfdiXml = ({
    version = '4.0',
    tipo = 'I',
    serie = 'A',
    folio = '1042',
    fecha = '2026-11-25T10:30:00',
    moneda = 'MXN',
    tipoCambio = '',
    metodoPago = 'PUE',
    formaPago = '03',
    subTotal = '1000.00',
    descuento = '',
    total = '1160.00',
    emisorRfc = 'CUB200101AB1',
    emisorNombre = 'CUBI SERVICIOS INTEGRALES',
    emisorRegimen = '601',
    receptorRfc = 'XAXX010101000',
    receptorNombre = 'PUBLICO EN GENERAL',
    receptorCp = '96000',
    receptorRegimen = '616',
    receptorUso = 'S01',
    conceptosXml = null,
    impuestosXml = `<cfdi:Impuestos TotalImpuestosTrasladados="160.00">
        <cfdi:Traslados>
            <cfdi:Traslado Base="1000.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="160.00" />
        </cfdi:Traslados>
    </cfdi:Impuestos>`,
    includeTimbre = true,
    uuid = '11111111-2222-4333-8444-555555555555',
    selloCFD = 'ABCDEFGH1234567890SELLOCFD12345678',
    selloSAT = 'ZYXWVUT9876543210SELLOSAT98765432',
    extraComplemento = ''
} = {}) => {
    const defaultConcepto = `<cfdi:Concepto ClaveProdServ="81111800" Cantidad="1" ClaveUnidad="E48" Unidad="Servicio" Descripcion="Mantenimiento preventivo de sistema CCTV" ValorUnitario="1000.00" Importe="1000.00" ObjetoImp="02" />`;
    const timbreXml = includeTimbre
        ? `<tfd:TimbreFiscalDigital Version="1.1" UUID="${uuid}" FechaTimbrado="2026-11-25T10:30:05" RfcProvCertif="SAT970701NN3" SelloCFD="${selloCFD}" NoCertificadoSAT="00001000000504465028" SelloSAT="${selloSAT}" />`
        : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
    xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
    xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
    xmlns:pago20="http://www.sat.gob.mx/Pagos20"
    Version="${version}"
    Serie="${serie}"
    Folio="${folio}"
    Fecha="${fecha}"
    FormaPago="${formaPago}"
    NoCertificado="00001000000512345678"
    SubTotal="${subTotal}"
    ${descuento ? `Descuento="${descuento}"` : ''}
    Moneda="${moneda}"
    ${tipoCambio ? `TipoCambio="${tipoCambio}"` : ''}
    Total="${total}"
    TipoDeComprobante="${tipo}"
    Exportacion="01"
    MetodoPago="${metodoPago}"
    LugarExpedicion="96000"
    Sello="${selloCFD}">
    <cfdi:Emisor Rfc="${emisorRfc}" Nombre="${emisorNombre}" RegimenFiscal="${emisorRegimen}" />
    <cfdi:Receptor Rfc="${receptorRfc}" Nombre="${receptorNombre}" DomicilioFiscalReceptor="${receptorCp}" RegimenFiscalReceptor="${receptorRegimen}" UsoCFDI="${receptorUso}" />
    <cfdi:Conceptos>
        ${conceptosXml || defaultConcepto}
    </cfdi:Conceptos>
    ${impuestosXml}
    <cfdi:Complemento>
        ${timbreXml}
        ${extraComplemento}
    </cfdi:Complemento>
</cfdi:Comprobante>`;
};

// Mock Supabase client para probar duplicados y regeneración sin tocar producción
const createMockSupabase = () => {
    const db = new Map();
    const storage = new Map();

    return {
        db,
        storageFiles: storage,
        from(table) {
            return {
                select() {
                    return {
                        ilike(_col, val) {
                            return {
                                async maybeSingle() {
                                    const found = db.get(String(val).toUpperCase()) || null;
                                    return { data: found, error: null };
                                }
                            };
                        },
                        async like(col, pattern) {
                            const prefix = String(pattern).replace(/%$/, '');
                            const matches = Array.from(db.values()).filter((row) =>
                                String(row[col] || '').startsWith(prefix)
                            );
                            return { data: matches, error: null };
                        }
                    };
                },
                insert(rows) {
                    return {
                        select() {
                            return {
                                async single() {
                                    const row = rows[0];
                                    const key = row.uuid.toUpperCase();
                                    if (db.has(key)) {
                                        return { data: null, error: { code: '23505', message: 'duplicate key' } };
                                    }
                                    const saved = { id: `rec-${db.size + 1}`, ...row };
                                    db.set(key, saved);
                                    return { data: saved, error: null };
                                }
                            };
                        }
                    };
                },
                update(patch) {
                    return {
                        eq(col, val) {
                            return {
                                select() {
                                    return {
                                        async single() {
                                            for (const [k, v] of db.entries()) {
                                                if (v[col] === val) {
                                                    const updated = { ...v, ...patch };
                                                    db.set(k, updated);
                                                    return { data: updated, error: null };
                                                }
                                            }
                                            return { data: null, error: { message: 'Not found' } };
                                        }
                                    };
                                }
                            };
                        }
                    };
                }
            };
        },
        storage: {
            from() {
                return {
                    async upload(path, blob) {
                        storage.set(path, blob);
                        return { data: { path }, error: null };
                    },
                    async download(path) {
                        const blob = storage.get(path);
                        if (!blob) return { data: null, error: { message: 'Not found' } };
                        return { data: blob, error: null };
                    },
                    async remove(paths) {
                        for (const p of paths) storage.delete(p);
                        return { data: [], error: null };
                    }
                };
            }
        }
    };
};

test('1. XML CFDI 4.0 válido: extrae emisor, receptor, importes, timbre, QR oficial SAT y genera PDF', async () => {
    const xml = makeCfdiXml();
    const res = parseAndNormalizeCfdi(xml);
    assert.equal(res.valid, true);
    assert.equal(res.errors.length, 0);
    assert.equal(res.data.version, '4.0');
    assert.equal(res.data.timbre.uuid, '11111111-2222-4333-8444-555555555555');
    assert.equal(res.data.emisor.rfc, 'CUB200101AB1');
    assert.equal(res.data.receptor.rfc, 'XAXX010101000');
    assert.equal(res.data.importes.total, 1160);

    // Formato oficial SAT QR (idéntico al generado por el PDF oficial del SAT)
    assert.equal(
        res.data.satQrUrl,
        'https://verificacfdi.facturaelectronica.sat.gob.mx/?id=11111111-2222-4333-8444-555555555555&re=CUB200101AB1&rr=XAXX010101000&tt=1160.00&fe=12345678'
    );

    const pdf = await generateCfdiPdf(res.data);
    assert.equal(pdf.pageCount, 1);
    assert.ok(pdf.arrayBuffer.byteLength > 2000);
});

test('2. XML inválido y protección anti-XXE / DTD', () => {
    const badXml = parseAndNormalizeCfdi('<not-a-cfdi><foo /></not-a-cfdi>');
    assert.equal(badXml.valid, false);

    const xxeXml = `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><cfdi:Comprobante/>`;
    const sec = validateRawXmlSecurity(xxeXml);
    assert.equal(sec.ok, false);
    assert.match(sec.error, /DTD|entidades externas/i);
});

test('3. XML sin TimbreFiscalDigital es rechazado', () => {
    const xml = makeCfdiXml({ includeTimbre: false });
    const res = parseAndNormalizeCfdi(xml);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('TimbreFiscalDigital')));
});

test('4. XML con múltiples conceptos y descripciones extensas ajusta tipografía y cabe en 1 sola hoja', async () => {
    const longDesc =
        'Instalación profesional de sistema de videovigilancia IP 4K con cableado estructurado Cat6 exterior, canalización con tubería conduit galvanizada, configuración de NVR 16 canales, acceso remoto seguro P2P y capacitación al personal operativo.';
    const conceptosXml = Array.from({ length: 14 }, (_, i) =>
        `<cfdi:Concepto ClaveProdServ="81111800" Cantidad="1" ClaveUnidad="E48" Unidad="Servicio" Descripcion="Partida ${i + 1}: ${longDesc}" ValorUnitario="100.00" Importe="100.00" ObjetoImp="02" />`
    ).join('\n');

    const xml = makeCfdiXml({
        subTotal: '1400.00',
        total: '1624.00',
        conceptosXml,
        impuestosXml: `<cfdi:Impuestos TotalImpuestosTrasladados="224.00"><cfdi:Traslados><cfdi:Traslado Base="1400.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="224.00" /></cfdi:Traslados></cfdi:Impuestos>`
    });

    const res = parseAndNormalizeCfdi(xml);
    assert.equal(res.valid, true);
    assert.equal(res.data.conceptos.length, 14);

    const pdf = await generateCfdiPdf(res.data);
    assert.equal(pdf.pageCount, 1, `Se esperaba 1 sola hoja ajustando tipografía, se obtuvieron ${pdf.pageCount}`);
});

test('5. XML con descuentos, IVA, retenciones e impuestos mixtos conserva importes exactos', async () => {
    const xml = makeCfdiXml({
        subTotal: '2000.00',
        descuento: '200.00',
        total: '1888.00',
        impuestosXml: `<cfdi:Impuestos TotalImpuestosTrasladados="288.00" TotalImpuestosRetenidos="200.00">
            <cfdi:Retenciones>
                <cfdi:Retencion Impuesto="001" Importe="20.00" />
                <cfdi:Retencion Impuesto="002" Importe="180.00" />
            </cfdi:Retenciones>
            <cfdi:Traslados>
                <cfdi:Traslado Base="1800.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="288.00" />
            </cfdi:Traslados>
        </cfdi:Impuestos>`
    });

    const res = parseAndNormalizeCfdi(xml);
    assert.equal(res.valid, true);
    assert.equal(res.data.importes.subTotal, 2000);
    assert.equal(res.data.importes.descuento, 200);
    assert.equal(res.data.impuestos.totalTrasladados, 288);
    assert.equal(res.data.impuestos.totalRetenidos, 200);
    assert.equal(res.data.importes.total, 1888);

    const pdf = await generateCfdiPdf(res.data);
    assert.ok(pdf.arrayBuffer.byteLength > 2000);
});

test('6. XML de Egreso (E) y XML de Pago (P con Pagos 2.0)', async () => {
    const egresoXml = makeCfdiXml({ tipo: 'E', folio: 'NC-12' });
    const egreso = parseAndNormalizeCfdi(egresoXml);
    assert.equal(egreso.valid, true);
    assert.equal(egreso.data.tipoDeComprobante, 'E');
    assert.ok((await generateCfdiPdf(egreso.data)).arrayBuffer.byteLength > 2000);

    const pagoXml = makeCfdiXml({
        tipo: 'P',
        moneda: 'XXX',
        metodoPago: '',
        formaPago: '',
        subTotal: '0',
        total: '0',
        impuestosXml: '',
        conceptosXml: `<cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago" ValorUnitario="0" Importe="0" ObjetoImp="01" />`,
        extraComplemento: `<pago20:Pagos Version="2.0">
            <pago20:Totales MontoTotalPagos="1160.00" />
            <pago20:Pago FechaPago="2026-11-25T10:00:00" FormaDePagoP="03" MonedaP="MXN" Monto="1160.00">
                <pago20:DoctoRelacionado IdDocumento="AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE" Serie="A" Folio="1001" MonedaDR="MXN" NumParcialidad="1" ImpSaldoAnt="1160.00" ImpPagado="1160.00" ImpSaldoInsoluto="0.00" />
            </pago20:Pago>
        </pago20:Pagos>`
    });

    const pago = parseAndNormalizeCfdi(pagoXml);
    assert.equal(pago.valid, true);
    assert.equal(pago.data.tipoDeComprobante, 'P');
    assert.equal(pago.data.pagos.pagos.length, 1);
    assert.equal(pago.data.pagos.pagos[0].doctosRelacionados[0].impPagado.value, 1160);
    assert.ok((await generateCfdiPdf(pago.data)).arrayBuffer.byteLength > 2000);
});

test('7. Datos fiscales incompletos y complementos no soportados generan errores/advertencias', () => {
    const incomplete = parseAndNormalizeCfdi(makeCfdiXml({ emisorRfc: '' }));
    assert.equal(incomplete.valid, false);
    assert.ok(incomplete.errors.some((e) => e.includes('RFC del Emisor')));

    const withExtraComp = parseAndNormalizeCfdi(
        makeCfdiXml({ extraComplemento: '<cartaporte30:CartaPorte Version="3.0" />' })
    );
    assert.equal(withExtraComp.valid, true);
    assert.ok(withExtraComp.warnings.some((w) => w.includes('CartaPorte')));
});

test('8. UUID duplicado es bloqueado y regeneración de PDF conserva XML original e incrementa versión', async () => {
    const mockClient = createMockSupabase();
    const xml = makeCfdiXml({ uuid: '99999999-2222-4333-8444-555555555555' });
    const parsed = parseAndNormalizeCfdi(xml);
    const pdf = await generateCfdiPdf(parsed.data);

    const saved = await saveImportedCfdi({
        normalized: parsed.data,
        xmlText: xml,
        xmlFilename: 'factura_test.xml',
        pdfBlob: pdf.blob,
        pdfFilename: pdf.filename,
        user: { id: 'admin-user-1' },
        client: mockClient
    });

    assert.equal(saved.pdf_version, 1);
    assert.equal(saved.factura_numero, 'F-2026-100');
    assert.equal(await getNextFacturaNumero('2026-11-25T10:30:00', mockClient), 'F-2026-101');
    assert.equal((await checkDuplicateUuid(saved.uuid, mockClient)).exists, true);

    // Intentar importar mismo UUID debe fallar con DUPLICATE_UUID
    await assert.rejects(
        saveImportedCfdi({
            normalized: parsed.data,
            xmlText: xml,
            xmlFilename: 'factura_test.xml',
            pdfBlob: pdf.blob,
            pdfFilename: pdf.filename,
            user: { id: 'admin-user-1' },
            client: mockClient
        }),
        (err) => err.code === 'DUPLICATE_UUID'
    );

    // Regenerar PDF debe conservar XML intacto, conservar UUID y pasar a v2 sin duplicar registro
    const originalXmlBefore = await mockClient.storageFiles.get(saved.xml_path).text();
    const { updated } = await regenerateCfdiPdf({ cfdiRecord: saved, user: { id: 'admin-user-1' }, client: mockClient });
    const originalXmlAfter = await mockClient.storageFiles.get(updated.xml_path).text();

    assert.equal(updated.id, saved.id);
    assert.equal(updated.uuid, saved.uuid);
    assert.equal(updated.pdf_version, 2);
    assert.equal(updated.pdf_history.length, 2);
    assert.equal(originalXmlBefore, originalXmlAfter);
    assert.equal(mockClient.db.size, 1);
});

test('9. Importe con letra respeta moneda y centavos exactos', () => {
    assert.equal(amountToWords('1160.50', 'MXN'), 'MIL CIENTO SESENTA PESOS 50/100 M.N.');
    assert.equal(amountToWords('1.00', 'USD'), 'UN DÓLAR 00/100 USD');
    assert.equal(amountToWords('0', 'XXX'), '');
});

test('10. Migración SQL garantiza RLS estricto (sin acceso a anon/public, solo is_admin)', () => {
    const sql = fs.readFileSync('supabase/migrations/20261125150000_facturas_cfdi_importadas.sql', 'utf8');
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
    assert.match(sql, /REVOKE ALL ON public\.facturas_cfdi FROM public, anon/i);
    assert.match(sql, /USING \(public\.is_admin\(\)\)/i);
    assert.match(sql, /WITH CHECK \(public\.is_admin\(\)\)/i);
});
