import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import {
    TIPOS_COMPROBANTE,
    REGIMENES_FISCALES,
    USOS_CFDI,
    METODOS_PAGO,
    FORMAS_PAGO,
    EXPORTACION,
    IMPUESTOS,
    describeCatalog
} from './catalogs.js';
import { amountToWords } from './amountToWords.js';

// Paleta corporativa CUBI Servicios
const NAVY = [15, 42, 71];       // #0F2A47
const BLUE = [25, 130, 196];     // #1982C4
const INK = [15, 23, 42];        // #0F172A
const MUTED = [100, 116, 139];   // #64748B
const LINE = [226, 232, 240];    // #E2E8F0
const SURFACE = [248, 250, 252]; // #F8FAFC
const WHITE = [255, 255, 255];

const PAGE_W = 215.9; // Letter width (mm)
const PAGE_H = 279.4; // Letter height (mm)
const MARGIN_X = 12;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FOOTER_Y = PAGE_H - 8;
const SAFE_BOTTOM = PAGE_H - 13.5;

const fmtMoney = (val, raw) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return raw || '0.00';
    return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
};

const fmtFixed2 = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return '$0.00';
    return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtDate = (isoStr) => {
    if (!isoStr) return '—';
    return String(isoStr).replace('T', ' ');
};

export const loadImageAsDataUrl = async (url = '/LogoEmpresa.png') => {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return null;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
};

// Calcula dimensiones proporcionales dentro de maxW x maxH sin deformar el logo
const fitLogoBox = (doc, dataUrl, maxW, maxH) => {
    try {
        const props = doc.getImageProperties(dataUrl);
        if (props && props.width > 0 && props.height > 0) {
            const ratio = props.width / props.height;
            let w = maxW;
            let h = w / ratio;
            if (h > maxH) {
                h = maxH;
                w = h * ratio;
            }
            return { w, h };
        }
    } catch {
        // fallback proporcional cuadrado/rectangular suave
    }
    return { w: Math.min(maxW, maxH * 2.2), h: maxH };
};

export const generateCfdiPdf = async (cfdi, options = {}) => {
    if (!cfdi || !cfdi.timbre?.uuid) {
        throw new Error('Datos de CFDI incompletos para generar la representación impresa.');
    }

    const {
        logoDataUrl = null,
        brandName = 'CUBI Servicios',
        facturaNumero = null
    } = options;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
        compress: true
    });

    const tipoInfo = TIPOS_COMPROBANTE[cfdi.tipoDeComprobante] || {
        label: cfdi.tipoDeComprobante || 'Comprobante',
        docTitle: `COMPROBANTE CFDI (${cfdi.tipoDeComprobante || 'N/A'})`
    };

    const yearFromFecha =
        String(cfdi.fecha || '').match(/^(\d{4})/)?.[1] || String(new Date().getFullYear());
    const xmlSerieFolio = [cfdi.serie, cfdi.folio].filter(Boolean).join('-');
    const facturaNumeroDisplay =
        (facturaNumero && String(facturaNumero).trim()) ||
        xmlSerieFolio ||
        `F-${yearFromFecha}-100`;

    // Generar QR oficial del SAT como PNG Data URL
    let qrDataUrl = null;
    if (cfdi.satQrUrl) {
        try {
            qrDataUrl = await QRCode.toDataURL(cfdi.satQrUrl, {
                errorCorrectionLevel: 'M',
                margin: 1,
                width: 220,
                color: { dark: '#0F2A47', light: '#FFFFFF' }
            });
        } catch {
            qrDataUrl = null;
        }
    }

    // ================= 1. ENCABEZADO (LOGO PROPORCIONAL + EMISOR ÚNICO + METADATA DERECHA) =================
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PAGE_W * 0.72, 2.4, 'F');
    doc.setFillColor(...BLUE);
    doc.rect(PAGE_W * 0.72, 0, PAGE_W * 0.28, 2.4, 'F');

    let y = 7.5;

    // Izquierda: Logotipo proporcional + Datos fiscales del Emisor (único lugar donde aparecen)
    const leftBlockW = 108;
    let leftY = y;
    if (logoDataUrl && typeof logoDataUrl === 'string' && logoDataUrl.startsWith('data:image/')) {
        try {
            const { w, h } = fitLogoBox(doc, logoDataUrl, 48, 15);
            doc.addImage(logoDataUrl, 'PNG', MARGIN_X, leftY, w, h, undefined, 'FAST');
            leftY += h + 3;
        } catch {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(15);
            doc.setTextColor(...NAVY);
            doc.text(brandName, MARGIN_X, leftY + 6);
            leftY += 9.5;
        }
    } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(...NAVY);
        doc.text(brandName, MARGIN_X, leftY + 6);
        leftY += 9.5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    const emisorTitleLines = doc.splitTextToSize(cfdi.emisor.nombre || brandName, leftBlockW);
    doc.text(emisorTitleLines, MARGIN_X, leftY);
    leftY += emisorTitleLines.length * 3.8 + 0.8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text(`RFC: ${cfdi.emisor.rfc}`, MARGIN_X, leftY);
    leftY += 3.6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(...MUTED);
    if (cfdi.emisor.regimenFiscal) {
        const regLines = doc.splitTextToSize(
            `Régimen Fiscal: ${describeCatalog(REGIMENES_FISCALES, cfdi.emisor.regimenFiscal)}`,
            leftBlockW
        );
        doc.text(regLines, MARGIN_X, leftY);
        leftY += regLines.length * 3.4;
    }
    if (cfdi.lugarExpedicion) {
        doc.text(`Domicilio Fiscal / Lugar de Expedición (C.P.): ${cfdi.lugarExpedicion}`, MARGIN_X, leftY);
        leftY += 3.5;
    }

    // Derecha: Tipo de comprobante, Serie/Folio, Fecha de emisión y UUID en su propia línea (sin encimar)
    const rightX = MARGIN_X + leftBlockW + 6;
    const rightW = CONTENT_W - leftBlockW - 6;

    doc.setFillColor(...NAVY);
    doc.roundedRect(rightX, y, rightW, 7.8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text(`Factura N°: ${facturaNumeroDisplay}`, rightX + rightW / 2, y + 5.2, {
        align: 'center'
    });

    let rightY = y + 11.8;

    // Fecha de emisión
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text('FECHA DE EMISIÓN', rightX, rightY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text(fmtDate(cfdi.fecha), rightX + rightW, rightY, { align: 'right' });
    rightY += 5.0;

    // Folio Fiscal (UUID) en línea separada debajo de su etiqueta para nunca encimarse
    doc.setFillColor(...SURFACE);
    doc.roundedRect(rightX, rightY - 2.6, rightW, 9.2, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(...BLUE);
    doc.text('FOLIO FISCAL (UUID)', rightX + 2, rightY + 0.6);

    doc.setFont('courier', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(...NAVY);
    doc.text(cfdi.timbre.uuid, rightX + 2, rightY + 4.8);
    rightY += 9.8;

    // No. de Certificado del SAT y del Emisor debajo del Folio Fiscal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text('NO. DE CERTIFICADO DEL SAT', rightX, rightY);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...INK);
    doc.text(cfdi.timbre.noCertificadoSAT || '—', rightX + rightW, rightY, { align: 'right' });
    rightY += 4.2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text('NO. DE CERTIFICADO DEL EMISOR', rightX, rightY);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...INK);
    doc.text(cfdi.noCertificado || '—', rightX + rightW, rightY, { align: 'right' });
    rightY += 3.5;

    y = Math.max(leftY, rightY) + 2;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
    y += 3.5;

    // ================= 2. BLOQUE COMPLETO EXCLUSIVO PARA RECEPTOR =================
    const recColGap = 6;
    const recLeftW = CONTENT_W * 0.52;
    const recRightX = MARGIN_X + recLeftW + recColGap;
    const recRightW = CONTENT_W - recLeftW - recColGap;

    const recNameLines = doc.splitTextToSize(cfdi.receptor.nombre || '—', recLeftW - 22);
    const recRegLines = doc.splitTextToSize(
        describeCatalog(REGIMENES_FISCALES, cfdi.receptor.regimenFiscalReceptor) || '—',
        recRightW - 20
    );
    const recUsoLines = doc.splitTextToSize(
        describeCatalog(USOS_CFDI, cfdi.receptor.usoCFDI) || '—',
        recRightW - 20
    );

    const recLeftH = 9.5 + recNameLines.length * 3.5 + 4.2;
    const recRightH = 9.5 + recRegLines.length * 3.4 + recUsoLines.length * 3.4 + 1.5;
    const receptorBoxH = Math.max(recLeftH, recRightH, 19);

    doc.setFillColor(...SURFACE);
    doc.roundedRect(MARGIN_X, y, CONTENT_W, receptorBoxH, 1.5, 1.5, 'F');
    doc.setFillColor(...BLUE);
    doc.rect(MARGIN_X, y, CONTENT_W, 1.1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...BLUE);
    doc.text('RECEPTOR', MARGIN_X + 3, y + 4.8);

    // Columna izquierda del Receptor: Razón Social, RFC y C.P. Fiscal
    let ryL = y + 8.8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('Razón Social:', MARGIN_X + 3, ryL);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...INK);
    doc.text(recNameLines, MARGIN_X + 22, ryL);
    ryL += recNameLines.length * 3.5 + 1;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('RFC:', MARGIN_X + 3, ryL);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...INK);
    doc.text(cfdi.receptor.rfc || '—', MARGIN_X + 22, ryL);

    if (cfdi.receptor.domicilioFiscalReceptor) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text('C.P. Fiscal:', MARGIN_X + 58, ryL);
        doc.setFont('courier', 'bold');
        doc.setFontSize(7.8);
        doc.setTextColor(...INK);
        doc.text(cfdi.receptor.domicilioFiscalReceptor, MARGIN_X + 75, ryL);
    }

    // Columna derecha del Receptor: Régimen Fiscal y Uso CFDI
    let ryR = y + 8.8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('Régimen:', recRightX, ryR);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(...INK);
    doc.text(recRegLines, recRightX + 18, ryR);
    ryR += recRegLines.length * 3.4 + 1;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('Uso CFDI:', recRightX, ryR);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(...INK);
    doc.text(recUsoLines, recRightX + 18, ryR);

    y += receptorBoxH + 3.2;

    // ================= 3. INFORMACIÓN DEL COMPROBANTE =================
    const metaFields = [
        { label: 'Fecha Certificación', value: fmtDate(cfdi.timbre.fechaTimbrado) },
        { label: 'Tipo Comprobante', value: `${cfdi.tipoDeComprobante} - ${tipoInfo.label}` },
        {
            label: 'Moneda',
            value: cfdi.tipoCambioRaw ? `${cfdi.moneda} (TC: ${cfdi.tipoCambioRaw})` : cfdi.moneda
        },
        { label: 'Método de Pago', value: describeCatalog(METODOS_PAGO, cfdi.metodoPago) || '—' },
        { label: 'Forma de Pago', value: describeCatalog(FORMAS_PAGO, cfdi.formaPago) || '—' },
        { label: 'Lugar Expedición', value: cfdi.lugarExpedicion || '—' }
    ];

    const metaCellW = CONTENT_W / 3;
    const metaH = 17.5;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.roundedRect(MARGIN_X, y, CONTENT_W, metaH, 1.3, 1.3, 'S');

    metaFields.forEach((field, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const cx = MARGIN_X + col * metaCellW + 2.5;
        const cy = y + 3.8 + row * 8.4;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(...MUTED);
        doc.text(field.label.toUpperCase(), cx, cy);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.1);
        doc.setTextColor(...INK);
        const valText = doc.splitTextToSize(String(field.value), metaCellW - 4)[0] || '—';
        doc.text(valText, cx, cy + 3.4);
    });

    y += metaH + 3.5;

    // ================= 4. CÁLCULO EXACTO PARA AJUSTAR TODO A 1 SOLA HOJA =================
    // Preparar filas de resumen de importes
    const summaryRows = [{ label: 'Subtotal', value: fmtFixed2(cfdi.importes.subTotal) }];
    if (cfdi.importes.descuento > 0) {
        summaryRows.push({ label: 'Descuento', value: `-${fmtFixed2(cfdi.importes.descuento)}` });
    }
    if (cfdi.impuestos.traslados.length > 0) {
        for (const t of cfdi.impuestos.traslados) {
            const taxName = IMPUESTOS[t.impuesto] || t.impuesto;
            let rateLabel = '';
            if (t.tasaOCuota) {
                const pct = Number(t.tasaOCuota) * 100;
                const pctText = Number.isInteger(pct) ? String(pct) : pct.toFixed(2).replace(/\.?0+$/, '');
                rateLabel = ` (${pctText}%)`;
            }
            summaryRows.push({
                label: `${taxName}${rateLabel}`,
                value: fmtFixed2(t.importe.value ?? 0)
            });
        }
    } else if (cfdi.impuestos.totalTrasladados > 0) {
        summaryRows.push({
            label: 'IVA',
            value: fmtFixed2(cfdi.impuestos.totalTrasladados)
        });
    }
    if (cfdi.impuestos.retenciones.length > 0) {
        for (const r of cfdi.impuestos.retenciones) {
            const taxName = IMPUESTOS[r.impuesto] || r.impuesto;
            summaryRows.push({
                label: `${taxName} Retenido`,
                value: `-${fmtFixed2(r.importe.value ?? 0)}`
            });
        }
    } else if (cfdi.impuestos.totalRetenidos > 0) {
        summaryRows.push({
            label: 'Impuestos Retenidos',
            value: `-${fmtFixed2(cfdi.impuestos.totalRetenidos)}`
        });
    }

    // Medir altura fija de bloques inferiores (Pagos + Relacionados + Importes + Certificación SAT)
    const pagosCount = cfdi.pagos?.pagos?.length || 0;
    const doctosCount =
        cfdi.pagos?.pagos?.reduce((acc, p) => acc + (p.doctosRelacionados?.length || 0), 0) || 0;
    const pagosEstH = pagosCount > 0 ? 5 + pagosCount * 8.5 + doctosCount * 4 + 2 : 0;

    const relEstH =
        cfdi.cfdiRelacionados && cfdi.cfdiRelacionados.length > 0
            ? cfdi.cfdiRelacionados.reduce((acc, g) => acc + 4.5 + g.uuids.length * 3.5, 4)
            : 0;

    const summaryEstH = summaryRows.length * 4.4 + 11.5;

    // Medir bloque de certificación SAT (puede compactarse ligeramente si hay muchos conceptos)
    const measureCertBlock = (compact) => {
        const sealFont = compact ? 5.1 : 5.7;
        const sealLineH = compact ? 2.25 : 2.55;
        const qrSize = compact ? 24 : 28;
        doc.setFont('courier', 'normal');
        doc.setFontSize(sealFont);
        const sCfd = doc.splitTextToSize(cfdi.timbre.selloCFD || '—', CONTENT_W - 5);
        const sSat = doc.splitTextToSize(cfdi.timbre.selloSAT || '—', CONTENT_W - 5);
        const cad = doc.splitTextToSize(cfdi.cadenaOriginalSAT || '—', CONTENT_W - 5);
        const sealsH =
            (sCfd.length + sSat.length + cad.length) * sealLineH +
            3 * (compact ? 4.8 : 5.6) +
            3 * (compact ? 1.5 : 2);
        const totalH = 3 + qrSize + 2.5 + sealsH + 5;
        return { sealFont, sealLineH, qrSize, sCfd, sSat, cad, totalH };
    };

    const cols = [
        { key: 'cant', label: 'Cant.', w: 13, align: 'right' },
        { key: 'clave', label: 'Cve. Prod.', w: 19, align: 'left' },
        { key: 'desc', label: 'Descripción', w: 72, align: 'left' },
        { key: 'unidad', label: 'Unidad', w: 22, align: 'left' },
        { key: 'vunit', label: 'Valor Unit.', w: 22, align: 'right' },
        { key: 'descAmt', label: 'Descuento', w: 19, align: 'right' },
        { key: 'imp', label: 'Importe', w: 24.9, align: 'right' }
    ];

    const measureConceptTable = (fontSize) => {
        const lineH = fontSize * 0.44;
        const padV = Math.max(1.2, fontSize * 0.32);
        const headerH = Math.max(5.5, fontSize * 0.92);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fontSize);

        let totalH = headerH;
        const rows = cfdi.conceptos.map((c) => {
            const descLines = doc.splitTextToSize(c.descripcion || '—', cols[2].w - 3.5);
            const unitLabel = [c.claveUnidad, c.unidad].filter(Boolean).join(' ') || '—';
            const unitLines = doc.splitTextToSize(unitLabel, cols[3].w - 2.5);
            const maxLines = Math.max(descLines.length, unitLines.length, 1);
            const rowH = Math.max(fontSize * 0.85, maxLines * lineH + padV * 2);
            totalH += rowH;
            return { c, descLines, unitLines, rowH };
        });

        return { fontSize, lineH, padV, headerH, rows, totalH };
    };

    // Probar escala de fuente de conceptos (7.4pt -> 4.0pt) para asegurar que TODO quepa en 1 sola hoja
    let certLayout = measureCertBlock(false);
    let availableForConcepts = SAFE_BOTTOM - y - pagosEstH - relEstH - summaryEstH - certLayout.totalH - 6;

    const candidateSizes = [7.4, 7.0, 6.6, 6.2, 5.8, 5.4, 5.0, 4.6, 4.3, 4.0];
    let tableLayout = measureConceptTable(candidateSizes[0]);

    for (const sz of candidateSizes) {
        const candidate = measureConceptTable(sz);
        tableLayout = candidate;
        if (candidate.totalH <= availableForConcepts) {
            break;
        }
    }

    // Si aún es muy justo, activar modo compacto del bloque de certificación y volver a ajustar fuente
    if (tableLayout.totalH > availableForConcepts) {
        certLayout = measureCertBlock(true);
        availableForConcepts = SAFE_BOTTOM - y - pagosEstH - relEstH - summaryEstH - certLayout.totalH - 5;
        for (const sz of [...candidateSizes, 3.7, 3.4]) {
            const candidate = measureConceptTable(sz);
            tableLayout = candidate;
            if (candidate.totalH <= availableForConcepts) {
                break;
            }
        }
    }

    // ================= 5. DIBUJAR TABLA DE CONCEPTOS =================
    doc.setFillColor(...NAVY);
    doc.rect(MARGIN_X, y, CONTENT_W, tableLayout.headerH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.min(7.2, Math.max(5.5, tableLayout.fontSize)));
    doc.setTextColor(...WHITE);

    let cx = MARGIN_X;
    for (const col of cols) {
        const tx = col.align === 'right' ? cx + col.w - 1.8 : cx + 1.8;
        doc.text(col.label, tx, y + tableLayout.headerH * 0.68, { align: col.align });
        cx += col.w;
    }
    y += tableLayout.headerH;

    tableLayout.rows.forEach(({ c, descLines, unitLines, rowH }, idx) => {
        if (idx % 2 === 1) {
            doc.setFillColor(...SURFACE);
            doc.rect(MARGIN_X, y, CONTENT_W, rowH, 'F');
        }

        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.18);
        doc.line(MARGIN_X, y + rowH, PAGE_W - MARGIN_X, y + rowH);

        const ty = y + tableLayout.padV + tableLayout.lineH * 0.82;
        let rx = MARGIN_X;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(tableLayout.fontSize);
        doc.setTextColor(...INK);
        doc.text(c.cantidadRaw || String(c.cantidad), rx + cols[0].w - 1.8, ty, { align: 'right' });
        rx += cols[0].w;

        doc.setFont('courier', 'normal');
        doc.setFontSize(Math.max(4.5, tableLayout.fontSize - 0.3));
        doc.text(c.claveProdServ || '—', rx + 1.8, ty);
        rx += cols[1].w;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(tableLayout.fontSize);
        doc.text(descLines, rx + 1.8, ty, { lineHeightFactor: 1.12 });
        rx += cols[2].w;

        doc.setFontSize(Math.max(4.5, tableLayout.fontSize - 0.4));
        doc.setTextColor(...MUTED);
        doc.text(unitLines, rx + 1.8, ty, { lineHeightFactor: 1.12 });
        rx += cols[3].w;

        doc.setFontSize(tableLayout.fontSize);
        doc.setTextColor(...INK);
        doc.text(fmtMoney(c.valorUnitario, c.valorUnitarioRaw), rx + cols[4].w - 1.8, ty, { align: 'right' });
        rx += cols[4].w;

        doc.text(
            c.descuento > 0 ? fmtMoney(c.descuento, c.descuentoRaw) : '—',
            rx + cols[5].w - 1.8,
            ty,
            { align: 'right' }
        );
        rx += cols[5].w;

        doc.setFont('helvetica', 'bold');
        doc.text(fmtMoney(c.importe, c.importeRaw), rx + cols[6].w - 1.8, ty, { align: 'right' });

        y += rowH;
    });

    y += 3;

    // ================= 6. COMPLEMENTO DE PAGOS (SI TIPO = P) =================
    if (cfdi.pagos && cfdi.pagos.pagos?.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...NAVY);
        doc.text(`DETALLE DEL COMPLEMENTO DE PAGOS (${cfdi.pagos.version})`, MARGIN_X, y + 2);
        y += 4.5;

        for (const pago of cfdi.pagos.pagos) {
            doc.setFillColor(...SURFACE);
            doc.roundedRect(MARGIN_X, y, CONTENT_W, 6.8, 1, 1, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.8);
            doc.setTextColor(...INK);
            doc.text(
                `Pago #${pago.index} · Fecha: ${fmtDate(pago.fechaPago)} · Forma: ${describeCatalog(FORMAS_PAGO, pago.formaDePagoP)} · Moneda: ${pago.monedaP} · Monto: ${fmtFixed2(pago.monto.value)}`,
                MARGIN_X + 2.5,
                y + 4.4
            );
            y += 8.2;

            for (const dr of pago.doctosRelacionados || []) {
                doc.setFont('courier', 'normal');
                doc.setFontSize(6.3);
                doc.setTextColor(...INK);
                doc.text(
                    `Doc: ${dr.idDocumento} | Parc: ${dr.numParcialidad || '1'} | Ant: ${fmtFixed2(dr.impSaldoAnt.value)} | Pagado: ${fmtFixed2(dr.impPagado.value)} | Insoluto: ${fmtFixed2(dr.impSaldoInsoluto.value)}`,
                    MARGIN_X + 2.5,
                    y
                );
                y += 3.8;
            }
        }
        y += 1.5;
    }

    // ================= 7. CFDIS RELACIONADOS =================
    if (cfdi.cfdiRelacionados && cfdi.cfdiRelacionados.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...NAVY);
        doc.text('CFDI RELACIONADOS', MARGIN_X, y + 1.5);
        y += 4;
        for (const grp of cfdi.cfdiRelacionados) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(...MUTED);
            doc.text(`Tipo de relación: ${grp.tipoRelacion || '—'}`, MARGIN_X, y);
            y += 3.4;
            for (const relUuid of grp.uuids) {
                doc.setFont('courier', 'normal');
                doc.setFontSize(6.8);
                doc.setTextColor(...INK);
                doc.text(`• ${relUuid}`, MARGIN_X + 2.5, y);
                y += 3.4;
            }
        }
        y += 2;
    }

    // ================= 8. RESUMEN DE IMPORTES + IMPORTE CON LETRA =================
    const wordsText =
        cfdi.tipoDeComprobante === 'P' && cfdi.pagos?.montoTotalPagos?.raw
            ? amountToWords(cfdi.pagos.montoTotalPagos.raw, 'MXN')
            : amountToWords(cfdi.importes.totalRaw || cfdi.importes.total, cfdi.moneda);

    const wordsW = 110;
    if (wordsText) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.6);
        doc.setTextColor(...MUTED);
        doc.text('IMPORTE CON LETRA', MARGIN_X, y + 3);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.6);
        doc.setTextColor(...NAVY);
        const wLines = doc.splitTextToSize(wordsText, wordsW);
        doc.text(wLines, MARGIN_X, y + 7);
    }

    const totX = MARGIN_X + wordsW + 6;
    const totW = CONTENT_W - wordsW - 6;
    let ty = y + 3;

    for (const row of summaryRows) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.6);
        doc.setTextColor(...MUTED);
        doc.text(row.label, totX, ty);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...INK);
        doc.text(row.value, totX + totW, ty, { align: 'right' });
        ty += 4.4;
    }

    doc.setFillColor(...NAVY);
    doc.roundedRect(totX - 1.5, ty - 0.8, totW + 3, 8.2, 1.3, 1.3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...WHITE);
    doc.text(`TOTAL (${cfdi.moneda})`, totX + 1, ty + 4.5);
    doc.setFontSize(9.6);
    doc.text(fmtFixed2(cfdi.importes.total), totX + totW - 1, ty + 4.6, { align: 'right' });

    y = Math.max(y + summaryEstH, ty + 9.5) + 2;

    // ================= 9. CERTIFICACIÓN SAT, QR Y SELLOS (EN LA MISMA HOJA) =================
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
    y += 3;

    const qrSize = certLayout.qrSize;
    if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', MARGIN_X, y, qrSize, qrSize);
    } else {
        doc.setDrawColor(...LINE);
        doc.rect(MARGIN_X, y, qrSize, qrSize);
    }

    const certX = MARGIN_X + qrSize + 4.5;
    const certW = CONTENT_W - qrSize - 4.5;
    let cy = y + 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(...NAVY);
    doc.text('CERTIFICACIÓN DIGITAL DEL SAT', certX, cy);
    cy += 4.4;

    const certRows = [
        ['Folio Fiscal (UUID)', cfdi.timbre.uuid],
        ['Fecha y Hora de Certificación', fmtDate(cfdi.timbre.fechaTimbrado)],
        ['RFC Proveedor de Certificación', cfdi.timbre.rfcProvCertif || '—']
    ];

    const certRowStep = qrSize < 26 ? 3.8 : 4.2;
    for (const [lbl, val] of certRows) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.6);
        doc.setTextColor(...MUTED);
        doc.text(`${lbl}:`, certX, cy);

        doc.setFont('courier', 'bold');
        doc.setFontSize(6.9);
        doc.setTextColor(...INK);
        doc.text(String(val), certX + certW, cy, { align: 'right' });
        cy += certRowStep;
    }

    y = Math.max(y + qrSize, cy) + 2.5;

    const drawSealBox = (title, lines) => {
        const headerPad = certLayout.sealFont < 5.5 ? 3.2 : 3.6;
        const boxH = lines.length * certLayout.sealLineH + headerPad + 1.8;
        doc.setFillColor(...SURFACE);
        doc.roundedRect(MARGIN_X, y, CONTENT_W, boxH, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.1);
        doc.setTextColor(...NAVY);
        doc.text(title, MARGIN_X + 2.2, y + 3);

        doc.setFont('courier', 'normal');
        doc.setFontSize(certLayout.sealFont);
        doc.setTextColor(...INK);
        doc.text(lines, MARGIN_X + 2.2, y + headerPad + 2.1, { lineHeightFactor: 1.05 });
        y += boxH + (certLayout.sealFont < 5.5 ? 1.4 : 1.8);
    };

    drawSealBox('SELLO DIGITAL DEL CFDI', certLayout.sCfd);
    drawSealBox('SELLO DIGITAL DEL SAT', certLayout.sSat);
    drawSealBox('CADENA ORIGINAL DEL COMPLEMENTO DE CERTIFICACIÓN DIGITAL DEL SAT', certLayout.cad);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...NAVY);
    doc.text(
        'Este documento es una representación impresa de un CFDI',
        PAGE_W / 2,
        Math.min(y + 2.5, FOOTER_Y - 5.5),
        { align: 'center' }
    );

    // ================= PIE DE PÁGINA =================
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.22);
        doc.line(MARGIN_X, FOOTER_Y - 3.2, PAGE_W - MARGIN_X, FOOTER_Y - 3.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(...MUTED);
        doc.text(
            `${brandName} · Representación impresa de CFDI ${cfdi.version} · UUID: ${cfdi.timbre.uuid}`,
            MARGIN_X,
            FOOTER_Y
        );
        doc.text(`Página ${i} de ${totalPages}`, PAGE_W - MARGIN_X, FOOTER_Y, { align: 'right' });
    }

    const arrayBuffer = doc.output('arraybuffer');
    const blob = typeof Blob !== 'undefined' ? new Blob([arrayBuffer], { type: 'application/pdf' }) : null;

    return {
        doc,
        blob,
        arrayBuffer,
        pageCount: totalPages,
        facturaNumero: facturaNumeroDisplay,
        filename: `${facturaNumeroDisplay.replace(/[^a-zA-Z0-9_-]/g, '_')}_${cfdi.timbre.uuid.slice(0, 8)}.pdf`
    };
};
