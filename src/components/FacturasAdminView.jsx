import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import {
    FileCheck,
    Search,
    Filter,
    RefreshCw,
    Copy,
    Check,
    ExternalLink,
    Clock,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Eye,
    Edit3,
    Calendar,
    Building2,
    MapPin,
    Hash,
    Mail,
    ChevronRight,
    X,
    ShieldAlert,
    Send,
    Loader2
} from 'lucide-react';

const REGIMENES_CATALOG = {
    '601': 'General de Ley Personas Morales',
    '603': 'Personas Morales con Fines no Lucrativos',
    '605': 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
    '606': 'Arrendamiento',
    '607': 'Régimen de Enajenación o Adquisición de Bienes',
    '608': 'Demás ingresos',
    '610': 'Residentes en el Extranjero sin Establecimiento Permanente en México',
    '611': 'Ingresos por Dividendos (socios y accionistas)',
    '612': 'Personas Físicas con Actividades Empresariales y Profesionales',
    '614': 'Ingresos por intereses',
    '615': 'Régimen de los ingresos por obtención de premios',
    '616': 'Sin obligaciones fiscales',
    '620': 'Sociedades Cooperativas de Producción',
    '621': 'Incorporación Fiscal (RIF)',
    '622': 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
    '623': 'Opcional para Grupos de Sociedades',
    '624': 'Coordinados',
    '625': 'Actividades Empresariales con Plataformas Tecnológicas',
    '626': 'Régimen Simplificado de Confianza (RESICO)'
};

const USOS_CATALOG = {
    'G01': 'Adquisición de mercancías',
    'G02': 'Devoluciones, descuentos o bonificaciones',
    'G03': 'Gastos en general',
    'I01': 'Construcciones',
    'I02': 'Mobiliario y equipo de oficina por inversiones',
    'I03': 'Equipo de transporte',
    'I04': 'Equipo de cómputo y accesorios',
    'I05': 'Dados, troqueles, moldes, matrices y herramental',
    'I06': 'Comunicaciones telefónicas',
    'I07': 'Comunicaciones satelitales',
    'I08': 'Otra maquinaria y equipo',
    'D01': 'Honorarios médicos, dentales y hospitalarios',
    'D02': 'Gastos médicos por incapacidad o discapacidad',
    'D03': 'Gastos funerales',
    'D04': 'Donativos',
    'D05': 'Intereses reales por créditos hipotecarios',
    'D06': 'Aportaciones voluntarias al SAR',
    'D07': 'Primas por seguros de gastos médicos',
    'D08': 'Gastos de transportación escolar obligatoria',
    'D09': 'Depósitos en cuentas especiales para el ahorro',
    'D10': 'Pagos por servicios educativos (colegiaturas)',
    'S01': 'Sin efectos fiscales',
    'CP01': 'Pagos',
    'CN01': 'Nómina'
};

const FacturasAdminView = ({ darkMode, user }) => {
    const isDark = darkMode;

    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('todas');
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [copiedData, setCopiedData] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [permissionError, setPermissionError] = useState(null);

    // Formulario de edición de estado
    const [editForm, setEditForm] = useState({
        estado: 'pendiente',
        factura_uuid: '',
        factura_observaciones: '',
        factura_fecha: ''
    });

    // Cargar solicitudes desde Supabase
    const fetchSolicitudes = async () => {
        if (!supabase) return;
        setRefreshing(true);
        setPermissionError(null);

        try {
            const { data, error } = await supabase
                .from('solicitudes_factura')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error al consultar solicitudes:', error);
                setPermissionError(error.message);
                setSolicitudes([]);
            } else {
                setSolicitudes(data || []);
            }
        } catch (err) {
            console.error('Excepción al cargar solicitudes:', err);
            setPermissionError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSolicitudes();
    }, []);

    // Conteo para tarjetas de métricas
    const stats = useMemo(() => {
        return {
            total: solicitudes.length,
            pendiente: solicitudes.filter(s => s.estado === 'pendiente').length,
            en_revision: solicitudes.filter(s => s.estado === 'en_revision').length,
            facturada: solicitudes.filter(s => s.estado === 'facturada').length,
            cancelada: solicitudes.filter(s => s.estado === 'cancelada').length
        };
    }, [solicitudes]);

    // Filtrar solicitudes
    const filteredSolicitudes = useMemo(() => {
        return solicitudes.filter(s => {
            const matchesStatus = statusFilter === 'todas' || s.estado === statusFilter;
            const term = searchTerm.toLowerCase().trim();
            const matchesSearch = !term ||
                (s.folio && s.folio.toLowerCase().includes(term)) ||
                (s.rfc && s.rfc.toLowerCase().includes(term)) ||
                (s.razon_social && s.razon_social.toLowerCase().includes(term)) ||
                (s.correo && s.correo.toLowerCase().includes(term)) ||
                (s.codigo_postal && s.codigo_postal.includes(term));

            return matchesStatus && matchesSearch;
        });
    }, [solicitudes, statusFilter, searchTerm]);

    const handleOpenDetail = (solicitud) => {
        setSelectedSolicitud(solicitud);
        setEditForm({
            estado: solicitud.estado,
            factura_uuid: solicitud.factura_uuid || '',
            factura_observaciones: solicitud.factura_observaciones || '',
            factura_fecha: solicitud.factura_fecha ? solicitud.factura_fecha.split('T')[0] : new Date().toISOString().split('T')[0]
        });
        setIsEditModalOpen(true);
    };

    const handleSaveStatus = async (e) => {
        e.preventDefault();
        if (!selectedSolicitud || !supabase) return;

        setSaving(true);
        try {
            const updates = {
                estado: editForm.estado,
                factura_uuid: editForm.estado === 'facturada' ? editForm.factura_uuid.trim() || null : null,
                factura_observaciones: editForm.factura_observaciones.trim() || null,
                factura_fecha: editForm.estado === 'facturada' && editForm.factura_fecha ? new Date(editForm.factura_fecha).toISOString() : null,
                processed_at: new Date().toISOString(),
                processed_by: user?.id || null
            };

            const { data, error } = await supabase
                .from('solicitudes_factura')
                .update(updates)
                .eq('id', selectedSolicitud.id)
                .select()
                .single();

            if (error) throw error;

            // Actualizar lista local
            setSolicitudes(prev => prev.map(s => s.id === selectedSolicitud.id ? data : s));
            setSelectedSolicitud(data);
            setIsEditModalOpen(false);
        } catch (err) {
            console.error('Error al actualizar solicitud:', err);
            alert('Error al guardar los cambios: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Copiar formato estructurado para SAT
    const handleCopySatData = (solicitud) => {
        const text = `RFC: ${solicitud.rfc}
Nombre/Razón Social: ${solicitud.razon_social}
Código Postal: ${solicitud.codigo_postal}
Régimen Fiscal: ${solicitud.regimen_fiscal} - ${REGIMENES_CATALOG[solicitud.regimen_fiscal] || ''}
Uso de CFDI: ${solicitud.uso_cfdi} - ${USOS_CATALOG[solicitud.uso_cfdi] || ''}
Correo: ${solicitud.correo || 'No especificado'}
Observaciones: ${solicitud.observaciones || 'Ninguna'}`;

        navigator.clipboard.writeText(text);
        setCopiedData(true);
        setTimeout(() => setCopiedData(false), 2500);
    };

    // Copiar enlace del portal público para clientes (cubiservicios.lat/facturacion)
    const handleCopyPublicUrl = () => {
        let domain = window.location.hostname;
        if (domain.startsWith('app.')) {
            domain = domain.replace(/^app\./, '');
        }
        const port = window.location.port ? `:${window.location.port}` : '';
        const protocol = window.location.protocol;
        const url = `${protocol}//${domain}${port}/facturacion`;
        navigator.clipboard.writeText(url);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2500);
    };

    const getEstadoBadge = (estado) => {
        switch (estado) {
            case 'pendiente':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        Pendiente
                    </span>
                );
            case 'en_revision':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <Edit3 className="w-3 h-3" />
                        En Revisión
                    </span>
                );
            case 'facturada':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Facturada
                    </span>
                );
            case 'cancelada':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                        <XCircle className="w-3 h-3" />
                        Cancelada
                    </span>
                );
            default:
                return <span>{estado}</span>;
        }
    };

    return (
        <div className={`w-full min-h-screen p-4 sm:p-6 md:p-8 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <FileCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight">Solicitudes de Facturación</h1>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Administra los datos fiscales recibidos desde el portal público de clientes
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCopyPublicUrl}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${isDark
                            ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'
                            }`}
                        title="Copiar enlace del portal público para clientes"
                    >
                        {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-blue-500" />}
                        <span>{copiedUrl ? '¡Enlace Copiado!' : 'Copiar URL /facturacion'}</span>
                    </button>

                    <a
                        href="/facturacion"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${isDark
                            ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'
                            }`}
                    >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        <span>Abrir Formulario</span>
                    </a>

                    <button
                        onClick={fetchSolicitudes}
                        disabled={refreshing}
                        className={`p-2.5 rounded-xl border transition-all ${isDark
                            ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'
                            } disabled:opacity-50`}
                        title="Recargar solicitudes"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-500' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Banner de advertencia si no tiene permisos de administrador */}
            {permissionError && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
                    <div className="text-xs space-y-1.5">
                        <p className="font-bold">Permiso de Administrador Requerido</p>
                        <p>
                            Las políticas de seguridad (RLS) impiden consultar la tabla <code>solicitudes_factura</code> sin rol de administrador.
                        </p>
                        <div className="p-2 rounded-lg bg-black/20 font-mono text-[11px] select-all">
                            UPDATE public.profiles SET role = 'admin' WHERE email = '{user?.email || 'tu_correo@ejemplo.com'}';
                        </div>
                    </div>
                </div>
            )}

            {/* Tarjetas de Métricas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div
                    onClick={() => setStatusFilter('todas')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${statusFilter === 'todas'
                        ? (isDark ? 'bg-slate-800/90 border-blue-500 ring-2 ring-blue-500/20' : 'bg-blue-50/50 border-blue-400 shadow-sm')
                        : (isDark ? 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800' : 'bg-white border-slate-200/80 hover:bg-slate-50 shadow-sm')
                        }`}
                >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total</span>
                    <span className="text-2xl font-black mt-1 block">{stats.total}</span>
                </div>

                <div
                    onClick={() => setStatusFilter('pendiente')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${statusFilter === 'pendiente'
                        ? (isDark ? 'bg-amber-950/20 border-amber-500 ring-2 ring-amber-500/20' : 'bg-amber-50 border-amber-400 shadow-sm')
                        : (isDark ? 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800' : 'bg-white border-slate-200/80 hover:bg-slate-50 shadow-sm')
                        }`}
                >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 block">Pendientes</span>
                    <span className="text-2xl font-black text-amber-500 mt-1 block">{stats.pendiente}</span>
                </div>

                <div
                    onClick={() => setStatusFilter('en_revision')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${statusFilter === 'en_revision'
                        ? (isDark ? 'bg-blue-950/20 border-blue-500 ring-2 ring-blue-500/20' : 'bg-blue-50 border-blue-400 shadow-sm')
                        : (isDark ? 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800' : 'bg-white border-slate-200/80 hover:bg-slate-50 shadow-sm')
                        }`}
                >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block">En Revisión</span>
                    <span className="text-2xl font-black text-blue-500 mt-1 block">{stats.en_revision}</span>
                </div>

                <div
                    onClick={() => setStatusFilter('facturada')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${statusFilter === 'facturada'
                        ? (isDark ? 'bg-emerald-950/20 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-emerald-50 border-emerald-400 shadow-sm')
                        : (isDark ? 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800' : 'bg-white border-slate-200/80 hover:bg-slate-50 shadow-sm')
                        }`}
                >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 block">Facturadas</span>
                    <span className="text-2xl font-black text-emerald-500 mt-1 block">{stats.facturada}</span>
                </div>
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className={`p-4 rounded-2xl border mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${isDark ? 'bg-slate-800/40 border-slate-700/70' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                <div className="relative w-full sm:w-96">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por Folio, RFC, Razón Social o Correo..."
                        className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                            ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                            : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                            }`}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Filtro de Estado */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    {['todas', 'pendiente', 'en_revision', 'facturada', 'cancelada'].map((st) => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${statusFilter === st
                                ? 'bg-blue-600 text-white shadow-sm'
                                : (isDark ? 'text-slate-400 hover:bg-slate-700/60' : 'text-slate-600 hover:bg-slate-100')
                                }`}
                        >
                            {st === 'todas' ? 'Todas' : st.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabla de Solicitudes */}
            <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-slate-800/40 border-slate-700/70' : 'bg-white border-slate-200'
                }`}>
                {loading ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-xs">Cargando solicitudes de facturación...</span>
                    </div>
                ) : filteredSolicitudes.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <h3 className="text-base font-bold text-slate-300 mb-1">No hay solicitudes</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            {searchTerm || statusFilter !== 'todas'
                                ? 'No se encontraron resultados para los filtros seleccionados.'
                                : 'Aún no se han recibido solicitudes desde el portal público (/factura).'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className={`border-b ${isDark ? 'border-slate-700/80 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Folio</th>
                                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Fecha</th>
                                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider">RFC / Razón Social</th>
                                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Régimen & Uso</th>
                                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Estado</th>
                                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                                {filteredSolicitudes.map((s) => (
                                    <tr
                                        key={s.id}
                                        className={`transition-colors hover:${isDark ? 'bg-slate-700/30' : 'bg-slate-50/80'}`}
                                    >
                                        {/* Folio */}
                                        <td className="py-3 px-4 font-mono font-bold text-blue-500">
                                            {s.folio}
                                        </td>

                                        {/* Fecha */}
                                        <td className={`py-3 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {new Date(s.created_at).toLocaleDateString('es-MX', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </td>

                                        {/* RFC y Razón Social */}
                                        <td className="py-3 px-4">
                                            <div className="font-mono font-bold text-slate-200">{s.rfc}</div>
                                            <div className={`truncate max-w-[220px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`} title={s.razon_social}>
                                                {s.razon_social}
                                            </div>
                                            {s.correo && (
                                                <div className="text-[11px] text-blue-400/80 truncate max-w-[220px]">
                                                    {s.correo}
                                                </div>
                                            )}
                                        </td>

                                        {/* Régimen & Uso */}
                                        <td className="py-3 px-4">
                                            <div className="font-semibold">{s.regimen_fiscal} - {REGIMENES_CATALOG[s.regimen_fiscal]?.slice(0, 25) || ''}...</div>
                                            <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Uso: {s.uso_cfdi}
                                            </div>
                                        </td>

                                        {/* Estado */}
                                        <td className="py-3 px-4">
                                            {getEstadoBadge(s.estado)}
                                        </td>

                                        {/* Acciones */}
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => handleCopySatData(s)}
                                                    className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
                                                        }`}
                                                    title="Copiar datos para SAT"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>

                                                <button
                                                    onClick={() => handleOpenDetail(s)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>Gestionar</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL DE DETALLE Y GESTIÓN */}
            {isEditModalOpen && selectedSolicitud && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`max-w-2xl w-full rounded-3xl p-6 sm:p-8 border shadow-2xl overflow-y-auto max-h-[90vh] ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}>
                        {/* Cabecera Modal */}
                        <div className="flex items-center justify-between border-b border-slate-700/60 pb-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                                    <FileCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Solicitud {selectedSolicitud.folio}</h3>
                                    <span className="text-xs text-slate-400">
                                        Registrada el {new Date(selectedSolicitud.created_at).toLocaleString('es-MX')}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tarjeta de Datos Fiscales del Cliente */}
                        <div className={`p-5 rounded-2xl border mb-6 ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}>
                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700/50">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-blue-400" />
                                    Datos Fiscales Receptor
                                </span>
                                <button
                                    onClick={() => handleCopySatData(selectedSolicitud)}
                                    className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-400 px-2.5 py-1 rounded-lg bg-blue-500/10 transition-colors"
                                >
                                    {copiedData ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedData ? '¡Copiado!' : 'Copiar para SAT'}</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-slate-400 block text-[11px]">RFC:</span>
                                    <span className="font-mono font-bold text-sm text-blue-400">{selectedSolicitud.rfc}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[11px]">Código Postal Fiscal:</span>
                                    <span className="font-mono font-bold text-sm">{selectedSolicitud.codigo_postal}</span>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-slate-400 block text-[11px]">Nombre o Razón Social:</span>
                                    <span className="font-bold text-sm">{selectedSolicitud.razon_social}</span>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-slate-400 block text-[11px]">Régimen Fiscal:</span>
                                    <span className="font-medium">
                                        {selectedSolicitud.regimen_fiscal} - {REGIMENES_CATALOG[selectedSolicitud.regimen_fiscal] || 'No identificado'}
                                    </span>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-slate-400 block text-[11px]">Uso de CFDI:</span>
                                    <span className="font-medium">
                                        {selectedSolicitud.uso_cfdi} - {USOS_CATALOG[selectedSolicitud.uso_cfdi] || 'No identificado'}
                                    </span>
                                </div>
                                {selectedSolicitud.correo && (
                                    <div className="sm:col-span-2">
                                        <span className="text-slate-400 block text-[11px]">Correo Electrónico:</span>
                                        <span className="font-medium text-blue-400">{selectedSolicitud.correo}</span>
                                    </div>
                                )}
                                {selectedSolicitud.observaciones && (
                                    <div className="sm:col-span-2">
                                        <span className="text-slate-400 block text-[11px]">Observaciones del Cliente:</span>
                                        <p className="p-2.5 rounded-lg bg-black/20 text-slate-300 mt-1 italic">
                                            "{selectedSolicitud.observaciones}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Formulario de Atención y Timbrado */}
                        <form onSubmit={handleSaveStatus} className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Actualizar Estado de la Solicitud
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">Estado</label>
                                    <select
                                        value={editForm.estado}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, estado: e.target.value }))}
                                        className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                                            }`}
                                    >
                                        <option value="pendiente">Pendiente</option>
                                        <option value="en_revision">En Revisión</option>
                                        <option value="facturada">Facturada</option>
                                        <option value="cancelada">Cancelada</option>
                                    </select>
                                </div>

                                {editForm.estado === 'facturada' && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-300 block mb-1">Fecha de Factura</label>
                                        <input
                                            type="date"
                                            value={editForm.factura_fecha}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, factura_fecha: e.target.value }))}
                                            className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                                                }`}
                                        />
                                    </div>
                                )}
                            </div>

                            {editForm.estado === 'facturada' && (
                                <div>
                                    <label className="text-xs font-bold text-slate-300 block mb-1">
                                        Folio Fiscal / UUID SAT (36 caracteres)
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.factura_uuid}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, factura_uuid: e.target.value }))}
                                        placeholder="Ej: A1B2C3D4-E5F6-7A8B-9C0D-1E2F3A4B5C6D"
                                        className={`w-full px-3 py-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'
                                            }`}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-slate-300 block mb-1">
                                    Notas Internas de Facturación
                                </label>
                                <textarea
                                    rows={2}
                                    value={editForm.factura_observaciones}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, factura_observaciones: e.target.value }))}
                                    placeholder="Anotaciones para el equipo administrativo..."
                                    className={`w-full px-3 py-2.5 rounded-xl border text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'
                                        }`}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/60">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                                        }`}
                                >
                                    Cerrar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    <span>Guardar Cambios</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacturasAdminView;

