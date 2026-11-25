import React, { useState, useMemo } from 'react';
import {
    FileCode2,
    FileText,
    Eye,
    Download,
    RefreshCw,
    Link2,
    Info,
    Search,
    X,
    Loader2,
    Check,
    Building2,
    ShieldCheck,
    Calendar,
    Trash2
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { formatCurrency } from '../utils/format';
import {
    TIPOS_COMPROBANTE,
    REGIMENES_FISCALES,
    USOS_CFDI,
    FORMAS_PAGO,
    describeCatalog
} from '../utils/cfdi/catalogs';
import {
    getSignedCfdiFileUrl,
    downloadCfdiFile,
    regenerateCfdiPdf,
    updateCfdiAssociations,
    deleteCfdiRecord
} from '../utils/cfdi/cfdiStorageService';

const CfdiImportedPanel = ({
    cfdiList = [],
    darkMode,
    user,
    clients = [],
    quotations = [],
    services = [],
    onCfdiUpdated,
    onCfdiDeleted,
    onNotify,
    errorMessage = null
}) => {
    const isDark = darkMode;

    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFilter, setTipoFilter] = useState('todos');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [busyAction, setBusyAction] = useState(null);

    // Modal de información fiscal
    const [inspectRecord, setInspectRecord] = useState(null);

    // Modal de asociación (Cliente / Cotización / Servicio)
    const [assocRecord, setAssocRecord] = useState(null);
    const [assocForm, setAssocForm] = useState({
        cliente_id: '',
        cotizacion_id: '',
        servicio_key: ''
    });
    const [savingAssoc, setSavingAssoc] = useState(false);

    const filteredList = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        return cfdiList.filter((item) => {
            if (tipoFilter !== 'todos' && item.tipo_comprobante !== tipoFilter) return false;

            if (dateFrom) {
                const em = (item.fecha_emision || '').slice(0, 10);
                if (em && em < dateFrom) return false;
            }
            if (dateTo) {
                const em = (item.fecha_emision || '').slice(0, 10);
                if (em && em > dateTo) return false;
            }

            if (!term) return true;
            const folioFull = [item.factura_numero, item.serie, item.folio].filter(Boolean).join(' ').toLowerCase();
            return (
                (item.uuid && item.uuid.toLowerCase().includes(term)) ||
                (item.rfc_receptor && item.rfc_receptor.toLowerCase().includes(term)) ||
                (item.nombre_receptor && item.nombre_receptor.toLowerCase().includes(term)) ||
                (item.cliente_nombre_asociado && item.cliente_nombre_asociado.toLowerCase().includes(term)) ||
                folioFull.includes(term)
            );
        });
    }, [cfdiList, searchTerm, tipoFilter, dateFrom, dateTo]);

    const handleViewPdf = async (item) => {
        if (!item.pdf_path) return;
        setBusyAction(`view-${item.id}`);
        try {
            const url = await getSignedCfdiFileUrl(item.pdf_path, 3600, supabase);
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (err) {
            onNotify?.('error', `No se pudo abrir el PDF: ${err.message}`);
        } finally {
            setBusyAction(null);
        }
    };

    const handleDownload = async (item, type) => {
        const path = type === 'xml' ? item.xml_path : item.pdf_path;
        const filename =
            type === 'xml'
                ? item.xml_filename || `${item.uuid}.xml`
                : item.pdf_filename || `CFDI_${item.uuid.slice(0, 8)}.pdf`;
        if (!path) return;

        setBusyAction(`dl-${type}-${item.id}`);
        try {
            await downloadCfdiFile(path, filename, supabase);
        } catch (err) {
            onNotify?.('error', `Error al descargar ${type.toUpperCase()}: ${err.message}`);
        } finally {
            setBusyAction(null);
        }
    };

    const handleRegeneratePdf = async (item) => {
        setBusyAction(`regen-${item.id}`);
        try {
            const { updated } = await regenerateCfdiPdf({ cfdiRecord: item, user, client: supabase });
            onCfdiUpdated?.(updated);
            onNotify?.(
                'success',
                `Representación PDF regenerada (v${updated.pdf_version}) desde el XML original sin alterar datos fiscales.`
            );
        } catch (err) {
            onNotify?.('error', `Error al regenerar PDF: ${err.message}`);
        } finally {
            setBusyAction(null);
        }
    };

    const handleDeleteCfdi = async (item) => {
        const confirmed = window.confirm(
            `¿Estás seguro de eliminar el CFDI ${item.factura_numero || item.uuid}? Se eliminarán su XML y PDF del almacenamiento.`
        );
        if (!confirmed) return;

        setBusyAction(`del-${item.id}`);
        try {
            await deleteCfdiRecord(item, supabase);
            onCfdiDeleted?.(item.id);
            onNotify?.('success', `CFDI ${item.factura_numero || item.uuid} eliminado correctamente.`);
        } catch (err) {
            onNotify?.('error', `Error al eliminar CFDI: ${err.message}`);
        } finally {
            setBusyAction(null);
        }
    };

    const openAssociationModal = (item) => {
        setAssocRecord(item);
        setAssocForm({
            cliente_id: item.cliente_id || '',
            cotizacion_id: item.cotizacion_id || '',
            servicio_key:
                item.servicio_table && item.servicio_id
                    ? `${item.servicio_table}::${item.servicio_id}`
                    : ''
        });
    };

    const handleSaveAssociations = async (e) => {
        e.preventDefault();
        if (!assocRecord) return;
        setSavingAssoc(true);
        try {
            const selectedClient = clients.find((c) => String(c.id) === String(assocForm.cliente_id));
            const selectedQuote = quotations.find((q) => String(q.id) === String(assocForm.cotizacion_id));

            let srvTable = null;
            let srvId = null;
            let srvFolio = null;
            if (assocForm.servicio_key) {
                const [tbl, id] = assocForm.servicio_key.split('::');
                const foundSrv = services.find(
                    (s) => s.tableName === tbl && String(s.id) === String(id)
                );
                srvTable = tbl || null;
                srvId = id || null;
                srvFolio = foundSrv ? `${foundSrv.type} #${foundSrv.folio}` : null;
            }

            const updated = await updateCfdiAssociations(assocRecord.id, {
                cliente_id: assocForm.cliente_id || null,
                cliente_nombre_asociado: selectedClient ? selectedClient.nombre : null,
                cotizacion_id: assocForm.cotizacion_id || null,
                cotizacion_folio_asociado: selectedQuote ? `#${selectedQuote.folio}` : null,
                servicio_table: srvTable,
                servicio_id: srvId,
                servicio_folio_asociado: srvFolio
            }, supabase);

            onCfdiUpdated?.(updated);
            setAssocRecord(null);
            onNotify?.('success', 'Asociaciones guardadas correctamente.');
        } catch (err) {
            onNotify?.('error', `Error al guardar asociaciones: ${err.message}`);
        } finally {
            setSavingAssoc(false);
        }
    };

    const getTipoBadge = (tipo) => {
        const map = {
            I: 'bg-blue-500/15 text-blue-500',
            E: 'bg-amber-500/15 text-amber-500',
            P: 'bg-violet-500/15 text-violet-500',
            T: 'bg-slate-500/15 text-slate-400',
            N: 'bg-cyan-500/15 text-cyan-500'
        };
        const label = TIPOS_COMPROBANTE[tipo]?.label || tipo;
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${map[tipo] || 'bg-slate-500/15 text-slate-400'}`}>
                {tipo} · {label}
            </span>
        );
    };

    if (errorMessage) {
        return (
            <div className="p-10 text-center">
                <FileCode2 className="w-10 h-10 mx-auto mb-3 text-amber-500" />
                <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Tabla de CFDI importados pendiente de migración
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Ejecuta la migración <code>20261125150000_facturas_cfdi_importadas.sql</code> en el SQL Editor de Supabase para habilitar el almacenamiento de XML timbrados y sus representaciones PDF.
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Filtros avanzados */}
            <div
                className={`p-4 border-b flex flex-wrap items-center gap-3 ${
                    isDark ? 'border-slate-700/70 bg-slate-900/40' : 'border-slate-200 bg-slate-50/70'
                }`}
            >
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por UUID, RFC, Cliente o Folio..."
                        className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDark
                                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                                : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                        }`}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <select
                    value={tipoFilter}
                    onChange={(e) => setTipoFilter(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-xs border font-semibold ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                >
                    <option value="todos">Todos los tipos</option>
                    <option value="I">I · Ingreso</option>
                    <option value="E">E · Egreso</option>
                    <option value="P">P · Pago</option>
                    <option value="T">T · Traslado</option>
                    <option value="N">N · Nómina</option>
                </select>

                <div className="flex items-center gap-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                        title="Fecha desde"
                    />
                    <span className="text-slate-400">a</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                        title="Fecha hasta"
                    />
                    {(dateFrom || dateTo || tipoFilter !== 'todos' || searchTerm) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                setTipoFilter('todos');
                                setDateFrom('');
                                setDateTo('');
                            }}
                            className="px-2 py-1.5 text-[11px] font-semibold text-blue-500 hover:underline"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {filteredList.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                    <FileCode2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <h3 className={`text-base font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        No hay facturas CFDI importadas
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Haz clic en <strong>Importar factura XML</strong> para cargar un CFDI timbrado y generar su representación impresa corporativa CUBI Servicios.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr
                                className={`border-b ${
                                    isDark
                                        ? 'border-slate-700/80 bg-slate-900/60 text-slate-400'
                                        : 'border-slate-200 bg-slate-50 text-slate-600'
                                }`}
                            >
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Factura N° / Fecha</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">UUID</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Cliente / RFC Receptor</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Tipo</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Importe</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Estado</th>
                                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-slate-700/60' : 'divide-slate-200'}`}>
                            {filteredList.map((item) => {
                                const folioStr =
                                    item.factura_numero ||
                                    [item.serie, item.folio].filter(Boolean).join('-') ||
                                    'Sin folio';
                                const isRegen = busyAction === `regen-${item.id}`;
                                return (
                                    <tr
                                        key={item.id}
                                        className={`transition-colors ${
                                            isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50/80'
                                        }`}
                                    >
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <div className="font-mono font-bold text-[#1982C4]">{folioStr}</div>
                                            <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {new Date(item.fecha_emision).toLocaleDateString('es-MX', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                        </td>

                                        <td className="py-3 px-4">
                                            <span
                                                className="font-mono text-[11px] block max-w-[155px] truncate"
                                                title={item.uuid}
                                            >
                                                {item.uuid}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                PDF v{item.pdf_version || 1}
                                            </span>
                                        </td>

                                        <td className="py-3 px-4">
                                            <div className={`font-bold truncate max-w-[210px] ${isDark ? 'text-slate-100' : 'text-slate-900'}`} title={item.nombre_receptor}>
                                                {item.nombre_receptor}
                                            </div>
                                            <div className="font-mono text-[11px] text-slate-400">{item.rfc_receptor}</div>
                                            {(item.cliente_nombre_asociado || item.cotizacion_folio_asociado || item.servicio_folio_asociado) && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {item.cliente_nombre_asociado && (
                                                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px] font-semibold">
                                                            Cli: {item.cliente_nombre_asociado}
                                                        </span>
                                                    )}
                                                    {item.cotizacion_folio_asociado && (
                                                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 text-[10px] font-semibold">
                                                            Cot: {item.cotizacion_folio_asociado}
                                                        </span>
                                                    )}
                                                    {item.servicio_folio_asociado && (
                                                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold">
                                                            Srv: {item.servicio_folio_asociado}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        <td className="py-3 px-4 whitespace-nowrap">{getTipoBadge(item.tipo_comprobante)}</td>

                                        <td className="py-3 px-4 whitespace-nowrap font-mono font-bold">
                                            ${formatCurrency(item.total)}{' '}
                                            <span className="text-[10px] font-normal text-slate-400">{item.moneda}</span>
                                        </td>

                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                                                    item.estado === 'vigente'
                                                        ? 'bg-emerald-500/15 text-emerald-500'
                                                        : 'bg-red-500/15 text-red-500'
                                                }`}
                                            >
                                                {item.estado}
                                            </span>
                                        </td>

                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewPdf(item)}
                                                    disabled={busyAction === `view-${item.id}`}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        isDark ? 'hover:bg-slate-700 text-blue-400' : 'hover:bg-blue-50 text-blue-600'
                                                    }`}
                                                    title="Ver factura PDF"
                                                >
                                                    {busyAction === `view-${item.id}` ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Eye className="w-3.5 h-3.5" />
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDownload(item, 'pdf')}
                                                    disabled={busyAction === `dl-pdf-${item.id}`}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        isDark ? 'hover:bg-slate-700 text-rose-400' : 'hover:bg-rose-50 text-rose-600'
                                                    }`}
                                                    title="Descargar PDF"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDownload(item, 'xml')}
                                                    disabled={busyAction === `dl-xml-${item.id}`}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        isDark ? 'hover:bg-slate-700 text-sky-400' : 'hover:bg-sky-50 text-sky-600'
                                                    }`}
                                                    title="Descargar XML original"
                                                >
                                                    <FileCode2 className="w-3.5 h-3.5" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleRegeneratePdf(item)}
                                                    disabled={isRegen}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        isDark ? 'hover:bg-slate-700 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-600'
                                                    }`}
                                                    title="Regenerar representación PDF desde el XML original"
                                                >
                                                    <RefreshCw className={`w-3.5 h-3.5 ${isRegen ? 'animate-spin' : ''}`} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => openAssociationModal(item)}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        isDark ? 'hover:bg-slate-700 text-indigo-400' : 'hover:bg-indigo-50 text-indigo-600'
                                                    }`}
                                                    title="Asociar con cliente, cotización o servicio"
                                                >
                                                    <Link2 className="w-3.5 h-3.5" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setInspectRecord(item)}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
                                                    }`}
                                                    title="Consultar información fiscal"
                                                >
                                                    <Info className="w-3.5 h-3.5" />
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={busyAction === `del-${item.id}`}
                                                    onClick={() => handleDeleteCfdi(item)}
                                                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                                        isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-600'
                                                    }`}
                                                    title="Eliminar factura CFDI"
                                                >
                                                    {busyAction === `del-${item.id}` ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal: Consultar información fiscal */}
            {inspectRecord && (
                <div
                    className="fixed inset-0 z-[155] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setInspectRecord(null)}
                >
                    <div
                        className={`max-w-2xl w-full rounded-3xl p-6 border shadow-2xl max-h-[88vh] overflow-y-auto ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/40">
                            <div className="flex items-center gap-2.5">
                                <ShieldCheck className="w-5 h-5 text-[#1982C4]" />
                                <div>
                                    <h3 className="text-base font-bold">Información Fiscal del CFDI</h3>
                                    <p className="font-mono text-[11px] text-slate-400">{inspectRecord.uuid}</p>
                                </div>
                            </div>
                            <button onClick={() => setInspectRecord(null)} className="p-1.5 rounded-lg hover:bg-slate-800/40">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                    <span className="text-[10px] uppercase font-bold text-[#1982C4] flex items-center gap-1 mb-1">
                                        <Building2 className="w-3 h-3" /> Emisor
                                    </span>
                                    <p className="font-bold">{inspectRecord.nombre_emisor}</p>
                                    <p className="font-mono text-slate-400">{inspectRecord.rfc_emisor}</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        {describeCatalog(REGIMENES_FISCALES, inspectRecord.regimen_emisor)}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                    <span className="text-[10px] uppercase font-bold text-emerald-500 flex items-center gap-1 mb-1">
                                        <Building2 className="w-3 h-3" /> Receptor
                                    </span>
                                    <p className="font-bold">{inspectRecord.nombre_receptor}</p>
                                    <p className="font-mono text-slate-400">
                                        {inspectRecord.rfc_receptor} {inspectRecord.cp_receptor ? `· C.P. ${inspectRecord.cp_receptor}` : ''}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Uso: {describeCatalog(USOS_CFDI, inspectRecord.uso_cfdi)}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                    <span className="text-[10px] text-slate-400 block">Subtotal</span>
                                    <span className="font-mono font-bold">${formatCurrency(inspectRecord.subtotal)}</span>
                                </div>
                                <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                    <span className="text-[10px] text-slate-400 block">Impuestos Trasl. / Ret.</span>
                                    <span className="font-mono font-bold">
                                        +${formatCurrency(inspectRecord.total_impuestos_trasladados)} / -${formatCurrency(inspectRecord.total_impuestos_retenidos)}
                                    </span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-[#0F2A47] text-white">
                                    <span className="text-[10px] text-sky-300 block">Total ({inspectRecord.moneda})</span>
                                    <span className="font-mono font-black">${formatCurrency(inspectRecord.total)}</span>
                                </div>
                            </div>

                            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                <p className="font-bold text-[11px] uppercase text-slate-400 mb-1.5">
                                    Trazabilidad de Representación PDF (v{inspectRecord.pdf_version || 1})
                                </p>
                                <p className="text-[11px]">
                                    Importado el: <strong>{new Date(inspectRecord.imported_at).toLocaleString('es-MX')}</strong>
                                </p>
                                {inspectRecord.pdf_regenerated_at && (
                                    <p className="text-[11px]">
                                        Última regeneración: <strong>{new Date(inspectRecord.pdf_regenerated_at).toLocaleString('es-MX')}</strong>
                                    </p>
                                )}
                                <p className="text-[11px] mt-1">
                                    Forma / Método de pago: <strong>{describeCatalog(FORMAS_PAGO, inspectRecord.forma_pago) || '—'}</strong> · <strong>{inspectRecord.metodo_pago || '—'}</strong>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Asociar con Cliente, Cotización o Servicio */}
            {assocRecord && (
                <div
                    className="fixed inset-0 z-[155] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setAssocRecord(null)}
                >
                    <form
                        onSubmit={handleSaveAssociations}
                        className={`max-w-lg w-full rounded-3xl p-6 border shadow-2xl space-y-4 ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-700/40">
                            <div>
                                <h3 className="text-base font-bold">Asociar Factura CFDI</h3>
                                <p className="font-mono text-[11px] text-slate-400">{assocRecord.uuid}</p>
                            </div>
                            <button type="button" onClick={() => setAssocRecord(null)} className="p-1.5 rounded-lg hover:bg-slate-800/40">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-bold block mb-1">Cliente</label>
                                <select
                                    value={assocForm.cliente_id}
                                    onChange={(e) => setAssocForm((p) => ({ ...p, cliente_id: e.target.value }))}
                                    className={`w-full px-3 py-2 rounded-xl border ${
                                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300'
                                    }`}
                                >
                                    <option value="">— Sin cliente asociado —</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.nombre} {c.empresa ? `(${c.empresa})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-bold block mb-1">Cotización</label>
                                <select
                                    value={assocForm.cotizacion_id}
                                    onChange={(e) => setAssocForm((p) => ({ ...p, cotizacion_id: e.target.value }))}
                                    className={`w-full px-3 py-2 rounded-xl border ${
                                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300'
                                    }`}
                                >
                                    <option value="">— Sin cotización asociada —</option>
                                    {quotations.map((q) => (
                                        <option key={q.id} value={q.id}>
                                            #{q.folio} · {q.nombre_cliente} · ${formatCurrency(q.total)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-bold block mb-1">Servicio</label>
                                <select
                                    value={assocForm.servicio_key}
                                    onChange={(e) => setAssocForm((p) => ({ ...p, servicio_key: e.target.value }))}
                                    className={`w-full px-3 py-2 rounded-xl border ${
                                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300'
                                    }`}
                                >
                                    <option value="">— Sin servicio asociado —</option>
                                    {services.map((s) => (
                                        <option key={`${s.tableName}::${s.id}`} value={`${s.tableName}::${s.id}`}>
                                            {s.type} #{s.folio} · {s.cliente} · ${formatCurrency(s.total)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-700/40">
                            <button
                                type="button"
                                onClick={() => setAssocRecord(null)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                                    isDark ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700'
                                }`}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={savingAssoc}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0F2A47] hover:bg-[#1982C4] text-white flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {savingAssoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                <span>Guardar asociaciones</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CfdiImportedPanel;
