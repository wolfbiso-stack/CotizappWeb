import React, { useState, useEffect, useMemo } from 'react';
import {
    X, ShieldCheck, Plus, Search, QrCode, Barcode, Trash2, Edit2,
    CheckCircle2, AlertCircle, Calendar, Package, Loader, Check, Sparkles
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { formatCurrency, formatDateForInput, formatServiceDate } from '../utils/format';

/**
 * Parses materials used from a service order (handles JSON string or array).
 */
export const parseServiceMaterials = (service) => {
    if (!service) return [];
    const raw = service.inventario_materiales ?? service.repuestos_descripcion;
    if (!raw || raw === '[]') return [];
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

/**
 * Returns true if the service order has at least one used material item.
 */
export const hasServiceMaterials = (service) => parseServiceMaterials(service).length > 0;

/**
 * Extracts P/N (model) and S/N (serial number) from a Dahua QR string.
 * Supports formats like:
 *   "P/N:DH-HAC-HDW1200EMP S/N:8G04A23PAZ12345"
 *   "P/N: DHI-NVR4108HS\nS/N: 9A01234PAZ56789"
 *   "PN:12345;SN:67890"
 */
export const parseDahuaQR = (rawText) => {
    if (!rawText || typeof rawText !== 'string') return { modelo: '', numeroSerie: '' };
    const text = rawText.trim();

    const pnMatch = text.match(/P\s*\/?\s*N\s*[:=]\s*([^\s,;|\r\n]+)/i);
    const snMatch = text.match(/S\s*\/?\s*N\s*[:=]\s*([^\s,;|\r\n]+)/i);

    return {
        modelo: pnMatch ? pnMatch[1].trim() : '',
        numeroSerie: snMatch ? snMatch[1].trim() : ''
    };
};

const ESTADOS_GARANTIA = [
    { value: 'vigente', label: 'Vigente', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: 'en_revision', label: 'En Revisión', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'reclamada', label: 'Garantía Reclamada', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'vencida', label: 'Vencida', badge: 'bg-rose-100 text-rose-700 border-rose-200' }
];

const DeviceWarrantyModal = ({
    isOpen,
    onClose,
    service = null,
    darkMode = false,
    user = null,
    initialTab = 'register' // 'register' | 'lookup'
}) => {
    const [activeTab, setActiveTab] = useState(service ? initialTab : 'lookup');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [warranties, setWarranties] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [feedback, setFeedback] = useState(null);

    // Registration form state
    const [qrInput, setQrInput] = useState('');
    const [formData, setFormData] = useState({
        fecha_venta: '',
        nombre_producto: '',
        modelo: '',
        numero_serie: '',
        codigo_barras: '',
        notas: '',
        estado: 'vigente'
    });

    // Global lookup state
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState(null);

    const materials = useMemo(() => parseServiceMaterials(service), [service]);

    const defaultSaleDate = useMemo(() => {
        if (!service) return new Date().toISOString().split('T')[0];
        const rawDate = service.servicio_fecha || service.fecha;
        return formatDateForInput(rawDate) || new Date().toISOString().split('T')[0];
    }, [service]);

    useEffect(() => {
        if (!isOpen) return;
        setActiveTab(service ? initialTab : 'lookup');
        setFeedback(null);
        setEditingId(null);
        setQrInput('');
        setSearchQuery('');
        setSearchResults(null);
        setFormData({
            fecha_venta: defaultSaleDate,
            nombre_producto: '',
            modelo: '',
            numero_serie: '',
            codigo_barras: '',
            notas: '',
            estado: 'vigente'
        });

        if (service?.id) {
            fetchOrderWarranties();
        }
    }, [isOpen, service?.id, initialTab, defaultSaleDate]);

    const getCurrentUserId = async () => {
        if (user?.id) return user.id;
        const { data } = await supabase.auth.getUser();
        return data?.user?.id || null;
    };

    const fetchOrderWarranties = async () => {
        if (!service?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('garantias_dispositivos')
                .select('*')
                .eq('servicio_id', String(service.id))
                .eq('tipo_servicio', service.tipo_servicio || 'CCTV')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setWarranties(data || []);
        } catch (err) {
            console.error('Error cargando garantías del servicio:', err);
            setFeedback({
                type: 'error',
                message: 'No se pudieron cargar las garantías. Verifica que la tabla garantias_dispositivos exista en Supabase.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSelectMaterial = (part) => {
        setEditingId(null);
        setQrInput('');
        setFeedback(null);
        setFormData({
            fecha_venta: defaultSaleDate,
            nombre_producto: part.producto || part.descripcion || '',
            modelo: part.modelo || '',
            numero_serie: part.numeroSerie || '',
            codigo_barras: part.codigoBarras || '',
            notas: '',
            estado: 'vigente'
        });
    };

    const handleDahuaQRChange = (value) => {
        setQrInput(value);
        const parsed = parseDahuaQR(value);
        if (parsed.modelo || parsed.numeroSerie) {
            setFormData(prev => ({
                ...prev,
                modelo: parsed.modelo || prev.modelo,
                numero_serie: parsed.numeroSerie || prev.numero_serie,
                codigo_barras: prev.codigo_barras || value.trim()
            }));
        }
    };

    const handleSaveDevice = async (e) => {
        e.preventDefault();
        setFeedback(null);

        if (!formData.nombre_producto.trim() || !formData.numero_serie.trim() || !formData.fecha_venta) {
            setFeedback({
                type: 'error',
                message: 'Completa al menos Fecha de venta, Nombre del producto y Número de Serie.'
            });
            return;
        }

        setSaving(true);
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('Sesión no encontrada');

            const payload = {
                user_id: userId,
                servicio_id: String(service.id),
                tipo_servicio: service.tipo_servicio || 'CCTV',
                servicio_numero: service.servicio_numero || service.folio || '',
                cliente_nombre: service.cliente_nombre || service.cliente || '',
                cliente_telefono: service.cliente_telefono || '',
                fecha_venta: formData.fecha_venta,
                nombre_producto: formData.nombre_producto.trim(),
                modelo: formData.modelo.trim() || null,
                numero_serie: formData.numero_serie.trim(),
                codigo_barras: formData.codigo_barras.trim() || null,
                qr_raw: qrInput.trim() || null,
                notas: formData.notas.trim() || null,
                estado: formData.estado || 'vigente',
                updated_at: new Date().toISOString()
            };

            if (editingId) {
                const { error } = await supabase
                    .from('garantias_dispositivos')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
                setFeedback({ type: 'success', message: 'Dispositivo actualizado correctamente.' });
            } else {
                const { error } = await supabase
                    .from('garantias_dispositivos')
                    .insert([payload]);
                if (error) throw error;
                setFeedback({ type: 'success', message: 'Dispositivo registrado en garantía correctamente.' });
            }

            setEditingId(null);
            setQrInput('');
            setFormData({
                fecha_venta: defaultSaleDate,
                nombre_producto: '',
                modelo: '',
                numero_serie: '',
                codigo_barras: '',
                notas: '',
                estado: 'vigente'
            });
            await fetchOrderWarranties();
        } catch (err) {
            console.error('Error guardando garantía:', err);
            setFeedback({
                type: 'error',
                message: err?.message || 'Error al guardar en Supabase.'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleEditWarranty = (item) => {
        setEditingId(item.id);
        setQrInput(item.qr_raw || '');
        setFeedback(null);
        setFormData({
            fecha_venta: formatDateForInput(item.fecha_venta) || defaultSaleDate,
            nombre_producto: item.nombre_producto || '',
            modelo: item.modelo || '',
            numero_serie: item.numero_serie || '',
            codigo_barras: item.codigo_barras || '',
            notas: item.notas || '',
            estado: item.estado || 'vigente'
        });
    };

    const handleDeleteWarranty = async (id) => {
        if (!window.confirm('¿Eliminar este registro de garantía?')) return;
        try {
            const { error } = await supabase
                .from('garantias_dispositivos')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await fetchOrderWarranties();
        } catch (err) {
            console.error('Error eliminando garantía:', err);
            setFeedback({ type: 'error', message: 'No se pudo eliminar el registro.' });
        }
    };

    const handleGlobalLookup = async (e) => {
        if (e) e.preventDefault();
        const raw = searchQuery.trim();
        if (!raw) return;

        // If user pasted a Dahua QR in the search bar, extract S/N or P/N automatically
        const parsedQR = parseDahuaQR(raw);
        const term = parsedQR.numeroSerie || raw;

        setSearching(true);
        setFeedback(null);
        try {
            const userId = await getCurrentUserId();
            if (!userId) throw new Error('Sesión no encontrada');

            const safeTerm = term.replace(/[%_,]/g, '');
            const { data, error } = await supabase
                .from('garantias_dispositivos')
                .select('*')
                .eq('user_id', userId)
                .or(`numero_serie.ilike.%${safeTerm}%,codigo_barras.ilike.%${safeTerm}%,modelo.ilike.%${safeTerm}%,cliente_nombre.ilike.%${safeTerm}%`)
                .order('fecha_venta', { ascending: false })
                .limit(30);

            if (error) throw error;
            setSearchResults(data || []);
        } catch (err) {
            console.error('Error buscando garantía:', err);
            setFeedback({
                type: 'error',
                message: 'Error al consultar garantías en Supabase.'
            });
        } finally {
            setSearching(false);
        }
    };

    if (!isOpen) return null;

    const inputClass = `w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${darkMode
        ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500'
        : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
        }`;

    const labelClass = `block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'
        }`;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
            <div className={`w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden my-auto border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                {/* Header */}
                <div className={`px-6 py-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${darkMode ? 'bg-slate-800/60 border-slate-800' : 'bg-gradient-to-r from-teal-50 via-blue-50 to-white border-slate-200'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/20">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black tracking-tight">
                                Registro de Dispositivos para Garantías
                            </h2>
                            {service ? (
                                <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Orden <span className="font-bold text-blue-600">#{service.servicio_numero || service.folio}</span> • {service.cliente_nombre || service.cliente || 'Cliente'}
                                </p>
                            ) : (
                                <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Verifica si un equipo con falla fue vendido en tus órdenes de servicio
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {service && (
                            <div className={`inline-flex p-1 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('register')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'register'
                                        ? 'bg-teal-600 text-white shadow-sm'
                                        : (darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                                        }`}
                                >
                                    Registrar Orden
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('lookup')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'lookup'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : (darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                                        }`}
                                >
                                    Verificar Equipo (S/N)
                                </button>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[82vh] overflow-y-auto space-y-6">
                    {feedback && (
                        <div className={`p-3.5 rounded-2xl border flex items-center gap-3 text-sm font-medium ${feedback.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                            }`}>
                            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />}
                            <span>{feedback.message}</span>
                        </div>
                    )}

                    {activeTab === 'register' && service ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Left: Productos Vendidos en la Orden */}
                            <div className="lg:col-span-5 space-y-4">
                                <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                            <Package className="w-4 h-4 text-blue-600" />
                                            Productos Vendidos ({materials.length})
                                        </h3>
                                    </div>
                                    <p className={`text-xs mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Selecciona un artículo para cargar su descripción y registrar su Número de Serie / Modelo / Código.
                                    </p>

                                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                        {materials.map((part, idx) => {
                                            const name = part.producto || part.descripcion || `Producto ${idx + 1}`;
                                            const qty = part.cantidad || 1;
                                            const price = part.costoPublico || part.precio_publico || 0;
                                            const registeredCount = warranties.filter(
                                                w => (w.nombre_producto || '').toLowerCase() === name.toLowerCase()
                                            ).length;

                                            return (
                                                <div
                                                    key={part.id || idx}
                                                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${formData.nombre_producto === name
                                                        ? (darkMode ? 'bg-teal-900/30 border-teal-500' : 'bg-teal-50 border-teal-400')
                                                        : (darkMode ? 'bg-slate-900 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-blue-300')
                                                        }`}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-bold truncate" title={name}>{name}</p>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                                                            <span>Cant: <strong>{qty}</strong></span>
                                                            <span>•</span>
                                                            <span>${formatCurrency(price)}</span>
                                                            {registeredCount > 0 && (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                                                    {registeredCount} reg.
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectMaterial(part)}
                                                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 flex-shrink-0 transition-colors"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        Agregar
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Registered devices for this order */}
                                <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                                        Equipos Registrados en esta Orden ({warranties.length})
                                    </h3>
                                    {loading ? (
                                        <div className="py-6 flex justify-center">
                                            <Loader className="w-5 h-5 animate-spin text-teal-600" />
                                        </div>
                                    ) : warranties.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic py-4 text-center">
                                            Aún no hay dispositivos registrados para esta orden.
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                            {warranties.map(item => (
                                                <div
                                                    key={item.id}
                                                    className={`p-3 rounded-xl border text-xs ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-sm truncate">{item.nombre_producto}</p>
                                                            <p className="font-mono text-teal-600 font-bold mt-0.5">
                                                                S/N: {item.numero_serie}
                                                            </p>
                                                            {item.modelo && (
                                                                <p className="text-slate-500">Modelo / P/N: <span className="font-semibold">{item.modelo}</span></p>
                                                            )}
                                                            {item.codigo_barras && (
                                                                <p className="text-slate-500 truncate">Cód. Barras: {item.codigo_barras}</p>
                                                            )}
                                                            <p className="text-slate-400 mt-1">Venta: {formatServiceDate(item.fecha_venta)}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditWarranty(item)}
                                                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                                                                title="Editar"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteWarranty(item.id)}
                                                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Formulario de Registro + Escáner QR Dahua */}
                            <div className="lg:col-span-7">
                                <form onSubmit={handleSaveDevice} className={`p-5 rounded-2xl border space-y-4 ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50/70 border-slate-200'}`}>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black uppercase tracking-wider text-teal-600">
                                            {editingId ? 'Editar Dispositivo Registrado' : 'Datos del Dispositivo para Garantía'}
                                        </h3>
                                        {editingId && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingId(null);
                                                    setFormData({
                                                        fecha_venta: defaultSaleDate,
                                                        nombre_producto: '',
                                                        modelo: '',
                                                        numero_serie: '',
                                                        codigo_barras: '',
                                                        notas: '',
                                                        estado: 'vigente'
                                                    });
                                                }}
                                                className="text-xs font-bold text-slate-500 hover:text-slate-700 underline"
                                            >
                                                Cancelar edición
                                            </button>
                                        )}
                                    </div>

                                    {/* Dahua QR Quick Parser */}
                                    <div className={`p-3.5 rounded-xl border ${darkMode ? 'bg-blue-950/30 border-blue-800/50' : 'bg-blue-50/70 border-blue-200'}`}>
                                        <label className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300 mb-1.5">
                                            <QrCode className="w-4 h-4" />
                                            Lectura / Pegado Rápido QR Dahua (P/N y S/N)
                                        </label>
                                        <input
                                            type="text"
                                            value={qrInput}
                                            onChange={(e) => handleDahuaQRChange(e.target.value)}
                                            placeholder="Escanea o pega aquí el QR de Dahua (ej: P/N:DH-HAC-HDW1200EMP S/N:8G04A23PAZ12345)"
                                            className={inputClass}
                                        />
                                        <p className="text-[11px] text-blue-600/80 dark:text-blue-300/80 mt-1 flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />
                                            Detecta automáticamente P/N (Modelo) y S/N (Número de Serie).
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Fecha de Venta *</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    required
                                                    value={formData.fecha_venta}
                                                    onChange={(e) => setFormData({ ...formData, fecha_venta: e.target.value })}
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className={labelClass}>Estado de Garantía</label>
                                            <select
                                                value={formData.estado}
                                                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                                                className={inputClass}
                                            >
                                                {ESTADOS_GARANTIA.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Nombre del Producto / Dispositivo *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.nombre_producto}
                                            onChange={(e) => setFormData({ ...formData, nombre_producto: e.target.value })}
                                            placeholder="Ej. Cámara Bala Dahua 2MP"
                                            className={inputClass}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Número de Serie (S/N) *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.numero_serie}
                                                onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                                                placeholder="Ej. 8G04A23PAZ12345"
                                                className={`${inputClass} font-mono`}
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>Modelo / P/N</label>
                                            <input
                                                type="text"
                                                value={formData.modelo}
                                                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                                                placeholder="Ej. DH-HAC-HDW1200EMP"
                                                className={`${inputClass} font-mono`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Código de Barras</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={formData.codigo_barras}
                                                onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                                                placeholder="Escanea o escribe el código de barras"
                                                className={`${inputClass} font-mono`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Notas / Ubicación de instalación</label>
                                        <textarea
                                            rows={2}
                                            value={formData.notas}
                                            onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                                            placeholder="Ej. Cámara #1 entrada principal, DVR rack..."
                                            className={inputClass}
                                        />
                                    </div>

                                    <div className="pt-2 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                                }`}
                                        >
                                            Cerrar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-teal-600/20 flex items-center gap-2 transition-all"
                                        >
                                            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            {editingId ? 'Actualizar Dispositivo' : 'Guardar Garantía'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    ) : (
                        /* Global Lookup Tab */
                        <div className="space-y-5">
                            <form onSubmit={handleGlobalLookup} className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Buscar por Número de Serie (S/N), Código de Barras, Modelo (P/N), Cliente o pega el QR de Dahua..."
                                        className={`${inputClass} pl-10`}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={searching || !searchQuery.trim()}
                                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                    {searching ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                    Verificar Equipo
                                </button>
                            </form>

                            {searchResults === null ? (
                                <div className={`p-10 rounded-2xl border text-center ${darkMode ? 'bg-slate-800/40 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                    <Barcode className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                    <p className="text-sm font-medium">
                                        Ingresa o escanea el <strong>Número de Serie</strong>, <strong>Código de Barras</strong> o <strong>QR Dahua</strong> de un equipo para comprobar si fue vendido en tus órdenes de servicio.
                                    </p>
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="p-8 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 text-center">
                                    <AlertCircle className="w-10 h-10 mx-auto mb-2 text-rose-600" />
                                    <p className="font-bold text-base">No se encontró ningún equipo registrado con ese dato</p>
                                    <p className="text-xs mt-1 text-rose-700">
                                        Este número de serie o código no aparece en tu historial de dispositivos vendidos con garantía.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                                        <CheckCircle2 className="w-5 h-5" />
                                        Se encontraron {searchResults.length} coincidencia(s) en tus ventas registradas:
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {searchResults.map(item => {
                                            const estadoInfo = ESTADOS_GARANTIA.find(e => e.value === item.estado) || ESTADOS_GARANTIA[0];
                                            return (
                                                <div key={item.id} className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div>
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                                                                Orden #{item.servicio_numero || item.servicio_id} ({item.tipo_servicio})
                                                            </span>
                                                            <h4 className="font-bold text-base">{item.nombre_producto}</h4>
                                                        </div>
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${estadoInfo.badge}`}>
                                                            {estadoInfo.label}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1 text-xs">
                                                        <p className="font-mono font-bold text-teal-600">S/N: {item.numero_serie}</p>
                                                        {item.modelo && <p><span className="text-slate-400">Modelo / P/N:</span> <span className="font-mono font-semibold">{item.modelo}</span></p>}
                                                        {item.codigo_barras && <p><span className="text-slate-400">Cód. Barras:</span> <span className="font-mono">{item.codigo_barras}</span></p>}
                                                        <p><span className="text-slate-400">Cliente:</span> <strong>{item.cliente_nombre || 'N/A'}</strong> {item.cliente_telefono ? `(${item.cliente_telefono})` : ''}</p>
                                                        <p className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> <span className="text-slate-400">Fecha de venta:</span> <strong>{formatServiceDate(item.fecha_venta)}</strong></p>
                                                        {item.notas && <p className="text-slate-500 italic mt-1">"{item.notas}"</p>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeviceWarrantyModal;
