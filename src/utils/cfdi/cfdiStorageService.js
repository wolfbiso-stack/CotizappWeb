import { parseAndNormalizeCfdi } from './xmlParser.js';
import { generateCfdiPdf, loadImageAsDataUrl } from './pdfGenerator.js';

export const CFDI_BUCKET = 'facturas-archivos';

const computeSha256Hex = async (text) => {
    try {
        const bytes = new TextEncoder().encode(text);
        const hashBuf = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(hashBuf))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    } catch {
        return null;
    }
};

export const getNextFacturaNumero = async (fechaEmision, client) => {
    const year =
        String(fechaEmision || '').match(/^(\d{4})/)?.[1] ||
        String(new Date().getFullYear());
    const prefix = `F-${year}-`;

    if (!client) return `${prefix}100`;

    try {
        const { data, error } = await client
            .from('facturas_cfdi')
            .select('factura_numero')
            .like('factura_numero', `${prefix}%`);

        if (error || !Array.isArray(data) || data.length === 0) {
            return `${prefix}100`;
        }

        let maxNum = 99;
        for (const row of data) {
            const match = String(row.factura_numero || '').match(/^F-\d{4}-(\d+)$/);
            if (match) {
                const n = parseInt(match[1], 10);
                if (Number.isFinite(n) && n > maxNum) {
                    maxNum = n;
                }
            }
        }

        return `${prefix}${Math.max(maxNum + 1, 100)}`;
    } catch {
        return `${prefix}100`;
    }
};

export const checkDuplicateUuid = async (uuid, client) => {
    if (!client || !uuid) return { exists: false, existing: null };
    const clean = String(uuid).trim().toUpperCase();
    const { data, error } = await client
        .from('facturas_cfdi')
        .select('id, uuid, serie, folio, fecha_emision, rfc_receptor, nombre_receptor, total, pdf_version')
        .ilike('uuid', clean)
        .maybeSingle();

    if (error) throw error;
    return { exists: Boolean(data), existing: data || null };
};

export const saveImportedCfdi = async ({
    normalized,
    xmlText,
    xmlFilename,
    pdfBlob,
    pdfFilename,
    facturaNumero = null,
    user,
    linkedSolicitudId = null,
    client
}) => {
    if (!client) throw new Error('Supabase no está configurado.');
    if (!normalized?.timbre?.uuid) throw new Error('El CFDI no contiene un UUID válido.');

    const uuid = normalized.timbre.uuid.toUpperCase();

    // 1. Verificar duplicado por UUID antes de subir o insertar
    const dup = await checkDuplicateUuid(uuid, client);
    if (dup.exists) {
        const err = new Error(`Ya existe una factura registrada con el UUID ${uuid}.`);
        err.code = 'DUPLICATE_UUID';
        err.existing = dup.existing;
        throw err;
    }

    const xmlPath = `cfdi/${uuid}/original.xml`;
    const pdfPath = `cfdi/${uuid}/representacion_v1.pdf`;
    const xmlSha256 = await computeSha256Hex(xmlText);

    // 2. Subir XML intacto al bucket privado
    const xmlBlob = new Blob([xmlText], { type: 'application/xml' });
    const { error: xmlUploadErr } = await client.storage
        .from(CFDI_BUCKET)
        .upload(xmlPath, xmlBlob, { contentType: 'application/xml', upsert: false });

    if (xmlUploadErr) throw new Error(`Error al subir XML original: ${xmlUploadErr.message}`);

    // 3. Subir PDF generado al bucket privado
    const { error: pdfUploadErr } = await client.storage
        .from(CFDI_BUCKET)
        .upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: false });

    if (pdfUploadErr) {
        await client.storage.from(CFDI_BUCKET).remove([xmlPath]);
        throw new Error(`Error al subir representación PDF: ${pdfUploadErr.message}`);
    }

    const nowIso = new Date().toISOString();

    const resolvedFacturaNumero =
        (facturaNumero && String(facturaNumero).trim()) ||
        (await getNextFacturaNumero(normalized.fecha, client));

    const recordPayload = {
        uuid,
        factura_numero: resolvedFacturaNumero,
        version: normalized.version || '4.0',
        serie: normalized.serie || null,
        folio: normalized.folio || null,
        tipo_comprobante: normalized.tipoDeComprobante,
        fecha_emision: normalized.fecha,
        fecha_timbrado: normalized.timbre.fechaTimbrado || null,
        rfc_emisor: normalized.emisor.rfc,
        nombre_emisor: normalized.emisor.nombre || normalized.emisor.rfc,
        regimen_emisor: normalized.emisor.regimenFiscal || null,
        rfc_receptor: normalized.receptor.rfc,
        nombre_receptor: normalized.receptor.nombre || normalized.receptor.rfc,
        regimen_receptor: normalized.receptor.regimenFiscalReceptor || null,
        uso_cfdi: normalized.receptor.usoCFDI || null,
        cp_receptor: normalized.receptor.domicilioFiscalReceptor || null,
        subtotal: normalized.importes.subTotal,
        descuento: normalized.importes.descuento || 0,
        total_impuestos_trasladados: normalized.impuestos.totalTrasladados || 0,
        total_impuestos_retenidos: normalized.impuestos.totalRetenidos || 0,
        total: normalized.importes.total,
        moneda: normalized.moneda || 'MXN',
        tipo_cambio: normalized.tipoCambio ?? null,
        metodo_pago: normalized.metodoPago || null,
        forma_pago: normalized.formaPago || null,
        lugar_expedicion: normalized.lugarExpedicion || null,
        xml_path: xmlPath,
        xml_filename: xmlFilename || `${uuid}.xml`,
        xml_sha256: xmlSha256,
        pdf_path: pdfPath,
        pdf_filename: pdfFilename || `CFDI_${uuid.slice(0, 8)}.pdf`,
        pdf_version: 1,
        pdf_regenerated_at: null,
        pdf_history: [
            {
                version: 1,
                path: pdfPath,
                generated_at: nowIso,
                generated_by: user?.id || null
            }
        ],
        datos_normalizados: normalized,
        estado: 'vigente',
        solicitud_id: linkedSolicitudId || null,
        imported_at: nowIso,
        imported_by: user?.id || null
    };

    const { data: inserted, error: insertErr } = await client
        .from('facturas_cfdi')
        .insert([recordPayload])
        .select()
        .single();

    if (insertErr) {
        await client.storage.from(CFDI_BUCKET).remove([xmlPath, pdfPath]);
        if (insertErr.code === '23505') {
            throw new Error(`El UUID ${uuid} ya se encuentra registrado.`);
        }
        throw new Error(`Error al guardar registro fiscal: ${insertErr.message}`);
    }

    // Si se relacionó con una solicitud existente de Cotizapp, vincular los archivos sin duplicar
    if (linkedSolicitudId) {
        await client
            .from('solicitudes_factura')
            .update({
                factura_uuid: uuid,
                xml_path: xmlPath,
                xml_filename: recordPayload.xml_filename,
                pdf_path: pdfPath,
                pdf_filename: recordPayload.pdf_filename,
                archivos_updated_at: nowIso
            })
            .eq('id', linkedSolicitudId);
    }

    return inserted;
};

export const regenerateCfdiPdf = async ({ cfdiRecord, user, logoDataUrl = null, client }) => {
    if (!client) throw new Error('Supabase no está configurado.');
    if (!cfdiRecord?.xml_path || !cfdiRecord?.uuid) {
        throw new Error('El registro no cuenta con el XML original para regenerar el PDF.');
    }

    // 1. Descargar XML original SIN modificarlo jamás
    const { data: xmlBlob, error: dlErr } = await client.storage
        .from(CFDI_BUCKET)
        .download(cfdiRecord.xml_path);

    if (dlErr || !xmlBlob) {
        throw new Error(`No se pudo descargar el XML original: ${dlErr?.message || 'Archivo no encontrado'}`);
    }

    const xmlText = await xmlBlob.text();
    const parsed = parseAndNormalizeCfdi(xmlText);
    if (!parsed.valid || !parsed.data) {
        throw new Error(`El XML original no pudo validarse: ${parsed.errors.join(' ')}`);
    }

    // Verificar que el UUID del XML coincida con el del registro
    if (parsed.data.timbre.uuid.toUpperCase() !== cfdiRecord.uuid.toUpperCase()) {
        throw new Error('Integridad comprometida: el UUID del XML no coincide con el registro.');
    }

    const resolvedLogo = logoDataUrl || (await loadImageAsDataUrl('/LogoEmpresa.png'));
    const nextVersion = (Number(cfdiRecord.pdf_version) || 1) + 1;
    const pdfResult = await generateCfdiPdf(parsed.data, {
        logoDataUrl: resolvedLogo,
        facturaNumero: cfdiRecord.factura_numero || null
    });

    const newPdfPath = `cfdi/${cfdiRecord.uuid.toUpperCase()}/representacion_v${nextVersion}.pdf`;
    const { error: uploadErr } = await client.storage
        .from(CFDI_BUCKET)
        .upload(newPdfPath, pdfResult.blob, { contentType: 'application/pdf', upsert: true });

    if (uploadErr) {
        throw new Error(`Error al subir nueva versión de PDF: ${uploadErr.message}`);
    }

    const nowIso = new Date().toISOString();
    const prevHistory = Array.isArray(cfdiRecord.pdf_history) ? cfdiRecord.pdf_history : [];
    const nextHistory = [
        ...prevHistory,
        {
            version: nextVersion,
            path: newPdfPath,
            generated_at: nowIso,
            generated_by: user?.id || null
        }
    ];

    const { data: updated, error: updateErr } = await client
        .from('facturas_cfdi')
        .update({
            pdf_path: newPdfPath,
            pdf_filename: pdfResult.filename,
            pdf_version: nextVersion,
            pdf_regenerated_at: nowIso,
            pdf_history: nextHistory
        })
        .eq('id', cfdiRecord.id)
        .select()
        .single();

    if (updateErr) {
        throw new Error(`Error al actualizar versión del PDF: ${updateErr.message}`);
    }

    if (cfdiRecord.solicitud_id) {
        await client
            .from('solicitudes_factura')
            .update({
                pdf_path: newPdfPath,
                pdf_filename: pdfResult.filename,
                archivos_updated_at: nowIso
            })
            .eq('id', cfdiRecord.solicitud_id);
    }

    return { updated, pdfResult };
};

export const getSignedCfdiFileUrl = async (path, expiresIn = 3600, client) => {
    if (!client || !path) throw new Error('Ruta de archivo inválida.');
    const { data, error } = await client.storage.from(CFDI_BUCKET).createSignedUrl(path, expiresIn);
    if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'No se pudo generar URL firmada.');
    }
    return data.signedUrl;
};

export const downloadCfdiFile = async (path, filename, client) => {
    if (!client || !path) throw new Error('Ruta de archivo inválida.');
    const { data, error } = await client.storage.from(CFDI_BUCKET).download(path);
    if (error || !data) {
        throw new Error(error?.message || 'No se pudo descargar el archivo.');
    }

    const blobUrl = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || 'archivo';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
};

export const updateCfdiAssociations = async (id, associations, client) => {
    if (!client || !id) throw new Error('ID de factura inválido.');
    const { data, error } = await client
        .from('facturas_cfdi')
        .update(associations)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const deleteCfdiRecord = async (cfdiRecord, client) => {
    if (!client || !cfdiRecord?.id) throw new Error('Registro inválido.');

    const pathsToRemove = [];
    if (cfdiRecord.xml_path) pathsToRemove.push(cfdiRecord.xml_path);
    if (cfdiRecord.pdf_path) pathsToRemove.push(cfdiRecord.pdf_path);
    if (Array.isArray(cfdiRecord.pdf_history)) {
        for (const h of cfdiRecord.pdf_history) {
            if (h?.path && !pathsToRemove.includes(h.path)) {
                pathsToRemove.push(h.path);
            }
        }
    }

    if (pathsToRemove.length > 0) {
        await client.storage.from(CFDI_BUCKET).remove(pathsToRemove);
    }

    const { error } = await client.from('facturas_cfdi').delete().eq('id', cfdiRecord.id);
    if (error) throw new Error(error.message);
    return true;
};
