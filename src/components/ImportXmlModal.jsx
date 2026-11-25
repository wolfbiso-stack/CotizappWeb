import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    X,
    Upload,
    FileCode2,
    FileText,
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    Download,
    Save,
    Loader2,
    Eye,
    Building2,
    ShieldCheck,
    Link2
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { parseAndNormalizeCfdi } from '../utils/cfdi/xmlParser';
import { generateCfdiPdf, loadImageAsDataUrl } from '../utils/cfdi/pdfGenerator';
import { checkDuplicateUuid, saveImportedCfdi, getNextFacturaNumero } from '../utils/cfdi/cfdiStorageService';
import {
    TIPOS_COMPROBANTE,
    REGIMENES_FISCALES,
    USOS_CFDI,
    METODOS_PAGO,
    FORMAS_PAGO,
    describeCatalog
} from '../utils/cfdi/catalogs';
import { formatCurrency } from '../utils/format';

const ImportXmlModal = ({ isOpen, onClose, darkMode, user, solicitudes = [], onImported }) => {
    const isDark = darkMode;
    const fileInputRef = useRef(null);

    const [dragActive, setDragActive] = useState(false);
    const [xmlText, setXmlText] = useState('');
    const [xmlFilename, setXmlFilename] = useState('');
    const [parseErrors, setParseErrors] = useState([]);
    const [parseWarnings, setParseWarnings] = useState([]);
    const [cfdiData, setCfdiData] = useState(null);
    const [facturaNumero, setFacturaNumero] = useState('');
    const [duplicateInfo, setDuplicateInfo] = useState(null);
    const [pdfResult, setPdfResult] = useState(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
    const [processing, setProcessing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [linkedSolicitudId, setLinkedSolicitudId] = useState('');
    const [activePreviewTab, setActivePreviewTab] = useState('datos'); // 'datos' | 'pdf'

    // Limpiar Blob URL al desmontar o cambiar
    useEffect(() => {
        return () => {
            if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        };
    }, [pdfPreviewUrl]);

    const resetState = () => {
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        setXmlText('');
        setXmlFilename('');
        setParseErrors([]);
        setParseWarnings([]);
        setCfdiData(null);
        setFacturaNumero('');
        setDuplicateInfo(null);
        setPdfResult(null);
        setPdfPreviewUrl('');
        setProcessing(false);
        setSaving(false);
        setSaveError('');
        setLinkedSolicitudId('');
        setActivePreviewTab('datos');
    };

    useEffect(() => {
        if (!isOpen) resetState();
    }, [isOpen]);

    // Sugerir automáticamente solicitudes de Cotizapp que coincidan con el RFC receptor
    const matchingSolicitudes = useMemo(() => {
        if (!cfdiData?.receptor?.rfc) return [];
        const rfc = cfdiData.receptor.rfc.toUpperCase();
        return solicitudes.filter((s) => (s.rfc || '').toUpperCase() === rfc);
    }, [cfdiData, solicitudes]);

    const processXmlFile = async (file) => {
        if (!file) return;
        resetState();

        const lower = file.name.toLowerCase();
        if (!lower.endsWith('.xml') && file.type !== 'text/xml' && file.type !== 'application/xml') {
            setParseErrors(['Selecciona un archivo XML válido (.xml).']);
            return;
        }

        setProcessing(true);
        setXmlFilename(file.name);

        try {
            const text = await file.text();
            setXmlText(text);

            const parsed = parseAndNormalizeCfdi(text);
            setParseWarnings(parsed.warnings || []);

            if (!parsed.valid || !parsed.data) {
                setParseErrors(parsed.errors || ['No fue posible validar el CFDI.']);
                return;
            }

            setCfdiData(parsed.data);

            // Verificar duplicado por UUID en Supabase
            try {
                const dup = await checkDuplicateUuid(parsed.data.timbre.uuid, supabase);
                if (dup.exists) {
                    setDuplicateInfo(dup.existing);
                }
            } catch (dupErr) {
                console.warn('No se pudo verificar duplicado UUID:', dupErr.message);
            }

            // Calcular el siguiente número consecutivo interno (F-YYYY-100, F-YYYY-101, ...)
            const nextNum = await getNextFacturaNumero(parsed.data.fecha, supabase);
            setFacturaNumero(nextNum);

            // Generar PDF corporativo CUBI Servicios para vista previa
            const logoDataUrl = await loadImageAsDataUrl('/LogoEmpresa.png');
            const generated = await generateCfdiPdf(parsed.data, {
                logoDataUrl,
                facturaNumero: nextNum
            });
            setPdfResult(generated);
            if (generated.blob) {
                setPdfPreviewUrl(URL.createObjectURL(generated.blob));
            }
        } catch (err) {
            console.error('Error al procesar XML:', err);
            setParseErrors([err.message || 'Error inesperado al procesar el archivo XML.']);
        } finally {
            setProcessing(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) processXmlFile(file);
    };

    const handleDownloadPreviewPdf = () => {
        if (!pdfResult?.blob) return;
        const url = URL.createObjectURL(pdfResult.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pdfResult.filename || 'CFDI_CUBI.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    };

    const handleSave = async () => {
        if (!cfdiData || !pdfResult?.blob || duplicateInfo) return;
        setSaving(true);
        setSaveError('');

        try {
            const inserted = await saveImportedCfdi({
                normalized: cfdiData,
                xmlText,
                xmlFilename,
                pdfBlob: pdfResult.blob,
                pdfFilename: pdfResult.filename,
                facturaNumero: facturaNumero || null,
                user,
                linkedSolicitudId: linkedSolicitudId || null,
                client: supabase
            });

            if (typeof onImported === 'function') {
                onImported(inserted);
            }
            onClose();
        } catch (err) {
            console.error('Error al guardar CFDI importado:', err);
            setSaveError(err.message || 'No fue posible guardar la factura.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const tipoInfo = cfdiData ? TIPOS_COMPROBANTE[cfdiData.tipoDeComprobante] : null;
    const folioDisplay = facturaNumero || (cfdiData
        ? [cfdiData.serie, cfdiData.folio].filter(Boolean).join('-') || 'F-2026-100'
        : '');

    return (
        <div
            className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className={`w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[94vh] ${
                    isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-100'
                        : 'bg-white border-slate-200 text-slate-800'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${
                        isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50/80'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-[#0F2A47] text-white flex items-center justify-center shadow-md">
                            <FileCode2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight">Importar factura XML</h2>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Interpreta un CFDI timbrado y genera su representación impresa corporativa CUBI Servicios (solo lectura fiscal)
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-2 rounded-xl transition-colors ${
                            isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
                        }`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                    {/* Zona Drag & Drop */}
                    {!cfdiData && (
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragActive(true);
                            }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                                dragActive
                                    ? 'border-[#1982C4] bg-[#1982C4]/10'
                                    : isDark
                                        ? 'border-slate-700 hover:border-[#1982C4] bg-slate-800/40'
                                        : 'border-slate-300 hover:border-[#1982C4] bg-slate-50'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xml,application/xml,text/xml"
                                className="hidden"
                                onChange={(e) => processXmlFile(e.target.files?.[0])}
                            />
                            {processing ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-10 h-10 animate-spin text-[#1982C4]" />
                                    <p className="text-sm font-bold">Interpretando XML y generando PDF corporativo...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-14 h-14 rounded-2xl bg-[#1982C4]/15 text-[#1982C4] flex items-center justify-center">
                                        <Upload className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">
                                            Arrastra tu archivo XML timbrado aquí o haz clic para seleccionarlo
                                        </p>
                                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            CFDI 4.0 con TimbreFiscalDigital · Máximo 5 MB · El XML original se conservará intacto
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Errores de validación */}
                    {parseErrors.length > 0 && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs space-y-1.5">
                            <div className="flex items-center gap-2 font-bold text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>El XML no superó la validación estructural</span>
                            </div>
                            <ul className="list-disc pl-5 space-y-1">
                                {parseErrors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Advertencias */}
                    {parseWarnings.length > 0 && (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-1.5">
                            <div className="flex items-center gap-2 font-bold">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>Advertencias de validación</span>
                            </div>
                            <ul className="list-disc pl-5 space-y-0.5">
                                {parseWarnings.map((w, i) => (
                                    <li key={i}>{w}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Alerta de UUID duplicado */}
                    {duplicateInfo && (
                        <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-300 text-xs flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-sm">UUID ya registrado (duplicado bloqueado)</p>
                                <p className="mt-0.5">
                                    El folio fiscal <strong className="font-mono">{duplicateInfo.uuid}</strong> ya existe en el sistema
                                    ({duplicateInfo.nombre_receptor} · ${formatCurrency(duplicateInfo.total)}). Puedes previsualizar o descargar el PDF, pero no duplicar el registro.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error al guardar */}
                    {saveError && (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs font-semibold">
                            {saveError}
                        </div>
                    )}

                    {/* Pantalla de revisión de datos + vista previa PDF */}
                    {cfdiData && (
                        <div className="space-y-4">
                            {/* Barra superior de revisión */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActivePreviewTab('datos')}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                            activePreviewTab === 'datos'
                                                ? 'bg-[#0F2A47] text-white shadow-sm'
                                                : isDark
                                                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                    >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        <span>Datos Fiscales ({cfdiData.conceptos.length} conceptos)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActivePreviewTab('pdf')}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                            activePreviewTab === 'pdf'
                                                ? 'bg-[#1982C4] text-white shadow-sm'
                                                : isDark
                                                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Vista previa PDF ({pdfResult?.pageCount || 1} pág.)</span>
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={resetState}
                                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                                        isDark
                                            ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                                            : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    Cargar otro XML
                                </button>
                            </div>

                            {activePreviewTab === 'datos' ? (
                                <div className="space-y-4">
                                    {/* Identificación CFDI */}
                                    <div
                                        className={`p-4 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs ${
                                            isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                                        }`}
                                    >
                                        <div className="col-span-2">
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">UUID Fiscal</span>
                                            <span className="font-mono font-bold text-[#1982C4] break-all">{cfdiData.timbre.uuid}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Tipo / Versión</span>
                                            <span className="font-bold">
                                                {cfdiData.tipoDeComprobante} - {tipoInfo?.label} · v{cfdiData.version}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Factura N°</span>
                                            <span className="font-mono font-bold text-[#1982C4]">{folioDisplay}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Emisión</span>
                                            <span>{cfdiData.fecha.replace('T', ' ')}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Certificación</span>
                                            <span>{(cfdiData.timbre.fechaTimbrado || '—').replace('T', ' ')}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Método / Forma Pago</span>
                                            <span>
                                                {cfdiData.metodoPago || '—'} / {describeCatalog(FORMAS_PAGO, cfdiData.formaPago) || '—'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Moneda</span>
                                            <span className="font-bold">
                                                {cfdiData.moneda} {cfdiData.tipoCambioRaw ? `(TC ${cfdiData.tipoCambioRaw})` : ''}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Emisor y Receptor */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
                                            <div className="flex items-center gap-2 font-bold text-[#1982C4] mb-2 uppercase text-[11px]">
                                                <Building2 className="w-3.5 h-3.5" />
                                                <span>Emisor</span>
                                            </div>
                                            <p className="font-bold text-sm">{cfdiData.emisor.nombre || '—'}</p>
                                            <p className="font-mono font-semibold text-slate-400 mt-0.5">{cfdiData.emisor.rfc}</p>
                                            <p className="mt-1 text-slate-500">
                                                Régimen: {describeCatalog(REGIMENES_FISCALES, cfdiData.emisor.regimenFiscal) || '—'}
                                            </p>
                                        </div>

                                        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
                                            <div className="flex items-center gap-2 font-bold text-emerald-500 mb-2 uppercase text-[11px]">
                                                <Building2 className="w-3.5 h-3.5" />
                                                <span>Receptor</span>
                                            </div>
                                            <p className="font-bold text-sm">{cfdiData.receptor.nombre || '—'}</p>
                                            <p className="font-mono font-semibold text-slate-400 mt-0.5">
                                                {cfdiData.receptor.rfc} {cfdiData.receptor.domicilioFiscalReceptor ? `· C.P. ${cfdiData.receptor.domicilioFiscalReceptor}` : ''}
                                            </p>
                                            <p className="mt-1 text-slate-500">
                                                Régimen: {describeCatalog(REGIMENES_FISCALES, cfdiData.receptor.regimenFiscalReceptor) || '—'}
                                            </p>
                                            <p className="text-slate-500">
                                                Uso CFDI: {describeCatalog(USOS_CFDI, cfdiData.receptor.usoCFDI) || '—'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Importes (solo lectura, exactos del XML) */}
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                                        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                            <span className="text-[10px] uppercase text-slate-400 font-bold block">Subtotal</span>
                                            <span className="font-mono font-bold text-sm">${formatCurrency(cfdiData.importes.subTotal)}</span>
                                        </div>
                                        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                            <span className="text-[10px] uppercase text-slate-400 font-bold block">Descuentos</span>
                                            <span className="font-mono font-bold text-sm">${formatCurrency(cfdiData.importes.descuento)}</span>
                                        </div>
                                        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                            <span className="text-[10px] uppercase text-slate-400 font-bold block">Trasladados</span>
                                            <span className="font-mono font-bold text-sm">${formatCurrency(cfdiData.impuestos.totalTrasladados)}</span>
                                        </div>
                                        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                            <span className="text-[10px] uppercase text-slate-400 font-bold block">Retenidos</span>
                                            <span className="font-mono font-bold text-sm">${formatCurrency(cfdiData.impuestos.totalRetenidos)}</span>
                                        </div>
                                        <div className="p-3 rounded-xl bg-[#0F2A47] text-white">
                                            <span className="text-[10px] uppercase text-sky-300 font-bold block">Total ({cfdiData.moneda})</span>
                                            <span className="font-mono font-black text-base">${formatCurrency(cfdiData.importes.total)}</span>
                                        </div>
                                    </div>

                                    {/* Relacionar con solicitud existente de Cotizapp (opcional) */}
                                    {solicitudes.length > 0 && !duplicateInfo && (
                                        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-blue-50/50 border-blue-200'}`}>
                                            <label className="flex items-center gap-2 text-xs font-bold mb-1.5">
                                                <Link2 className="w-3.5 h-3.5 text-[#1982C4]" />
                                                <span>Relacionar con una solicitud de facturación existente (opcional)</span>
                                            </label>
                                            <select
                                                value={linkedSolicitudId}
                                                onChange={(e) => setLinkedSolicitudId(e.target.value)}
                                                className={`w-full px-3 py-2 rounded-xl border text-xs ${
                                                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                                                }`}
                                            >
                                                <option value="">— No vincular con solicitud previa —</option>
                                                {matchingSolicitudes.length > 0 && (
                                                    <optgroup label="Coinciden con el RFC del receptor">
                                                        {matchingSolicitudes.map((s) => (
                                                            <option key={s.id} value={s.id}>
                                                                {s.folio} · {s.rfc} · {s.razon_social} ({s.estado})
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                )}
                                                <optgroup label="Todas las solicitudes">
                                                    {solicitudes.map((s) => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.folio} · {s.rfc} · {s.razon_social}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 h-[56vh]">
                                    {pdfPreviewUrl ? (
                                        <iframe
                                            title="Vista previa PDF CFDI"
                                            src={pdfPreviewUrl}
                                            className="w-full h-full"
                                        />
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                            Generando vista previa...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div
                    className={`px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3 ${
                        isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50/80'
                    }`}
                >
                    <span className="text-[11px] text-slate-400">
                        {xmlFilename ? `Archivo: ${xmlFilename}` : 'El XML original nunca se altera'}
                    </span>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                                isDark
                                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            Cancelar
                        </button>

                        {pdfResult?.blob && (
                            <button
                                type="button"
                                onClick={handleDownloadPreviewPdf}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1982C4] hover:bg-[#146CA3] text-white flex items-center gap-1.5"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Descargar PDF</span>
                            </button>
                        )}

                        {cfdiData && !duplicateInfo && (
                            <button
                                type="button"
                                disabled={saving || !pdfResult?.blob}
                                onClick={handleSave}
                                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0F2A47] hover:bg-emerald-600 text-white flex items-center gap-1.5 shadow-md disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                <span>{saving ? 'Guardando...' : 'Guardar representación impresa'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportXmlModal;
