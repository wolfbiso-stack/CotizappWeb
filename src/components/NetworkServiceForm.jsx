import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, User, Wifi, Settings, ShoppingCart, Calendar, Plus, Trash2, Image, Activity, ArrowDown, ArrowUp, Router, FolderOpen } from 'lucide-react';
import QuoteSelector from './QuoteSelector';
import { formatCurrency, formatDateForInput } from '../utils/format';
import { supabase } from '../../utils/supabase';

const NetworkServiceForm = ({ service, onSave, onCancel, darkMode }) => {
    // Initial State derived from service prop or defaults
    const [formData, setFormData] = useState({
        orden_numero: '',
        fecha: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD in local time

        // Cliente
        cliente_nombre: '',
        cliente_telefono: '',

        // Red / Equipo
        tipo_servicio: 'Instalación',
        wifi_ssid: '',
        wifi_password: '',
        wifi_portal_password: '',
        wifi_gateway_ip: '',

        // Velocidades
        velocidad_bajada: '',
        velocidad_subida: '',
        velocidad_ping: '',

        // Técnico
        tecnico_nombre: '',

        // Detalles
        trabajo_realizado: '', // text
        observaciones: '',
        materiales_descripcion: '', // Stores JSON string of parts/materials

        // Financiero
        mano_obra: 0,
        costo_materiales: 0,
        anticipo: 0,
        incluir_iva: false,
        iva: 0,
        subtotal: 0,
        total: 0,

        // Status
        pagado: false,
        entregado: false
    });

    // Valid parts array state
    const [parts, setParts] = useState([]);
    // File Upload State
    const [files, setFiles] = useState([]);
    // Existing Photos State
    const [existingPhotos, setExistingPhotos] = useState([]);
    const [photosToDelete, setPhotosToDelete] = useState([]);

    // Quote Selector State
    const [showQuoteSelector, setShowQuoteSelector] = useState(false);

    useEffect(() => {
        if (service) {
            let loadedParts = [];
            try {
                if (service.materiales_descripcion && service.materiales_descripcion.trim().startsWith('[')) {
                    loadedParts = JSON.parse(service.materiales_descripcion);
                    // Standardize keys
                    loadedParts = loadedParts.map(p => ({
                        id: p.id || Date.now() + Math.random(),
                        cantidad: p.cantidad || 1,
                        producto: p.producto || p.descripcion || '',
                        costoPublico: p.costoPublico || p.precio_publico || 0,
                        costoEmpresa: p.costoEmpresa || p.costo_empresa || 0,
                        numeroSerie: p.numeroSerie || ''
                    }));
                } else if (service.materiales_descripcion && service.materiales_descripcion.trim() !== '') {
                    loadedParts = [{
                        id: Date.now(),
                        cantidad: 1,
                        producto: service.materiales_descripcion,
                        costoEmpresa: 0,
                        costoPublico: service.costo_materiales || 0,
                        numeroSerie: ''
                    }];
                }
            } catch (e) {
                console.error("Error parsing parts:", e);
            }
            setParts(loadedParts);

            setFormData({
                ...formData,
                ...service,
                fecha: formatDateForInput(service.fecha),
                mano_obra: service.mano_obra || 0,
                costo_materiales: service.costo_materiales || 0,
                anticipo: service.anticipo || 0,
                total: service.total || 0
            });

            if (service.id) {
                const fetchPhotos = async () => {
                    const { data } = await supabase
                        .from('servicio_fotos')
                        .select('*')
                        .eq('servicio_id', service.id)
                        .eq('tipo_servicio', 'servicios_redes');

                    if (data) {
                        setExistingPhotos(data);
                    }
                };
                fetchPhotos();
            }
        }
    }, [service]);

    useEffect(() => {
        const totalParts = parts.reduce((acc, part) => acc + ((parseFloat(part.costoPublico) || 0) * (parseFloat(part.cantidad) || 1)), 0);
        setFormData(prev => {
            const subtotal = (parseFloat(prev.mano_obra) || 0) + totalParts;
            const ivaValue = prev.incluir_iva ? subtotal * 0.16 : 0;
            const total = subtotal + ivaValue;

            return {
                ...prev,
                costo_materiales: totalParts,
                subtotal: subtotal,
                iva: ivaValue,
                total: total
            };
        });
    }, [parts, formData.mano_obra, formData.incluir_iva]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleNumberChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: Math.max(0, parseFloat(value) || 0)
        }));
    };

    const addPart = () => {
        setParts([...parts, {
            id: Date.now(),
            cantidad: 1,
            producto: '',
            costoEmpresa: 0,
            costoPublico: 0,
            numeroSerie: ''
        }]);
    };

    const removePart = (id) => {
        setParts(parts.filter(p => p.id !== id));
    };

    const updatePart = (id, field, value) => {
        setParts(parts.map(p => {
            if (p.id === id) {
                const isNumeric = field === 'cantidad' || field === 'costoEmpresa' || field === 'costoPublico';
                return {
                    ...p,
                    [field]: isNumeric ? Math.max(field === 'cantidad' ? 1 : 0, parseFloat(value) || 0) : value
                };
            }
            return p;
        }));
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDeleteExisting = (photoId) => {
        setPhotosToDelete(prev => [...prev, photoId]);
        setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const totalMO = parseFloat(formData.mano_obra) || 0;
        const totalRC = parseFloat(formData.costo_materiales) || 0;
        const subtotal = totalMO + totalRC;
        const ivaValue = formData.incluir_iva ? subtotal * 0.16 : 0;
        const total = subtotal + ivaValue;

        const dataToSave = {
            ...formData,
            materiales_descripcion: JSON.stringify(parts),
            subtotal: subtotal,
            iva: ivaValue,
            total: total,
            files: files,
            photosToDelete: photosToDelete
        };
        onSave(dataToSave);
    };

    const subtotal = (parseFloat(formData.mano_obra) || 0) + (parseFloat(formData.costo_materiales) || 0);
    const ivaValue = formData.incluir_iva ? subtotal * 0.16 : 0;
    const currentTotal = subtotal + ivaValue;
    const restante = currentTotal - (parseFloat(formData.anticipo) || 0);

    const inputClass = `w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all ${darkMode
        ? 'bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-400'
        : 'bg-white/50 border-slate-200 text-slate-800 placeholder-slate-400'
        }`;

    const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`;

    const handleQuoteSelect = (quoteItems) => {
        const newParts = quoteItems.map(item => ({
            id: Date.now() + Math.random(),
            cantidad: item.cantidad || 1,
            producto: item.articulo || item.producto || '',
            costoEmpresa: item.costoEmpresa || 0,
            costoPublico: item.precioUnitario || item.precio || 0,
            numeroSerie: ''
        }));

        setParts([...parts, ...newParts]);
    };

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {showQuoteSelector && (
                <QuoteSelector
                    onSelect={handleQuoteSelect}
                    onClose={() => setShowQuoteSelector(false)}
                    darkMode={darkMode}
                />
            )}
            <div className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
                {/* Header */}
                <div className={`px-8 py-6 flex justify-between items-center border-b sticky top-0 z-10 ${darkMode ? 'border-slate-700 bg-slate-800/90' : 'border-slate-100 bg-white/90'} backdrop-blur-md`}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-cyan-600 rounded-2xl shadow-lg shadow-cyan-500/20 text-white">
                            <Wifi className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                {service ? 'Editar Servicio' : 'Nuevo Servicio'} <span className="text-cyan-600">Redes</span>
                            </h2>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {service ? `Orden: #${service.orden_numero}` : 'Detalles de la instalación o servicio'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onCancel} className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
                    {/* Basic Info Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="col-span-2">
                            <label className={labelClass}>Nombre del Cliente</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    name="cliente_nombre"
                                    value={formData.cliente_nombre}
                                    onChange={handleChange}
                                    className={`${inputClass} pl-10`}
                                    placeholder="Nombre completo"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Teléfono</label>
                            <input
                                type="text"
                                name="cliente_telefono"
                                value={formData.cliente_telefono}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="WhatsApp / Celular"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className={labelClass}>Fecha</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                                <input
                                    type="date"
                                    name="fecha"
                                    value={formData.fecha}
                                    onChange={handleChange}
                                    className={`${inputClass} pl-10`}
                                    required
                                />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className={labelClass}>Técnico Responsable</label>
                            <input
                                type="text"
                                name="tecnico_nombre"
                                value={formData.tecnico_nombre}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="Nombre del técnico"
                            />
                        </div>
                    </div>

                    {/* Network Specs Section */}
                    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-cyan-50/30 border-cyan-100'}`}>
                        <div className="flex items-center gap-2 mb-6 text-cyan-600">
                            <Router className="w-5 h-5" />
                            <h3 className="font-bold uppercase text-xs tracking-widest">Configuración de Red</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className={labelClass}>Tipo de Servicio</label>
                                <select
                                    name="tipo_servicio"
                                    value={formData.tipo_servicio}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    <option value="Instalación">Instalación</option>
                                    <option value="Mantenimiento">Mantenimiento</option>
                                    <option value="Configuración">Configuración</option>
                                    <option value="Diagnóstico">Diagnóstico</option>
                                    <option value="Cableado Estructurado">Cableado Estructurado</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>SSID (Nombre WiFi)</label>
                                <input
                                    type="text"
                                    name="wifi_ssid"
                                    value={formData.wifi_ssid}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="Nombre de la red"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Contraseña WiFi</label>
                                <input
                                    type="text"
                                    name="wifi_password"
                                    value={formData.wifi_password}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="Clave de red"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Portal Password</label>
                                <input
                                    type="text"
                                    name="wifi_portal_password"
                                    value={formData.wifi_portal_password}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="Acceso al router"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Gateway IP</label>
                                <input
                                    type="text"
                                    name="wifi_gateway_ip"
                                    value={formData.wifi_gateway_ip}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="Ej: 192.168.1.1"
                                />
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-dashed border-cyan-200/50">
                            <div className="flex items-center gap-2 mb-4 text-cyan-600">
                                <Activity className="w-5 h-5" />
                                <h3 className="font-bold uppercase text-xs tracking-widest">Pruebas de Velocidad</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClass}>Bajada (Download)</label>
                                    <div className="relative">
                                        <ArrowDown className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            name="velocidad_bajada"
                                            value={formData.velocidad_bajada}
                                            onChange={handleChange}
                                            className={`${inputClass} pl-9`}
                                            placeholder="Mbps"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Subida (Upload)</label>
                                    <div className="relative">
                                        <ArrowUp className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            name="velocidad_subida"
                                            value={formData.velocidad_subida}
                                            onChange={handleChange}
                                            className={`${inputClass} pl-9`}
                                            placeholder="Mbps"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Ping / Latencia</label>
                                    <div className="relative">
                                        <Activity className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            name="velocidad_ping"
                                            value={formData.velocidad_ping}
                                            onChange={handleChange}
                                            className={`${inputClass} pl-9`}
                                            placeholder="ms"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Report Section */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <div className="flex items-center gap-2 mb-4 text-indigo-500">
                                    <Settings className="w-5 h-5" />
                                    <h3 className="font-bold uppercase text-xs tracking-widest">Trabajo Realizado</h3>
                                </div>
                                <textarea
                                    name="trabajo_realizado"
                                    value={formData.trabajo_realizado}
                                    onChange={handleChange}
                                    className={`${inputClass} h-32 resize-none`}
                                    placeholder="Descripción del trabajo..."
                                ></textarea>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-4 text-slate-500">
                                    <Settings className="w-5 h-5" />
                                    <h3 className="font-bold uppercase text-xs tracking-widest">Observaciones</h3>
                                </div>
                                <textarea
                                    name="observaciones"
                                    value={formData.observaciones}
                                    onChange={handleChange}
                                    className={`${inputClass} h-32 resize-none`}
                                    placeholder="Notas adicionales..."
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Materials List Section */}
                    <div className={`p-8 rounded-3xl border transition-all ${darkMode ? 'bg-slate-900/40 border-slate-700' : 'bg-gray-50/50 border-slate-100'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${darkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Materiales Utilizados</h3>
                                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Desglose de materiales y equipos</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={addPart}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'}`}
                                >
                                    <Plus className="w-4 h-4" /> Agregar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowQuoteSelector(true)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${darkMode ? 'bg-purple-900/40 text-purple-300 hover:bg-purple-900/60' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'}`}
                                >
                                    <FolderOpen className="w-4 h-4" /> Desde Cotización
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {parts.map((part) => (
                                <div key={part.id} className={`flex flex-col md:flex-row gap-3 p-4 md:p-3 rounded-2xl border items-center transition-all ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <div className="w-full md:w-20">
                                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1 ml-1 md:text-center">Cant.</label>
                                        <input
                                            type="number"
                                            value={part.cantidad}
                                            onChange={(e) => updatePart(part.id, 'cantidad', e.target.value)}
                                            className={`${inputClass} text-center px-1`}
                                            min="1"
                                        />
                                    </div>
                                    <div className="w-full md:flex-1">
                                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1 ml-1">Producto / Material</label>
                                        <input
                                            type="text"
                                            value={part.producto}
                                            onChange={(e) => updatePart(part.id, 'producto', e.target.value)}
                                            className={inputClass}
                                            placeholder="Cámara, Cable, Balun..."
                                        />
                                    </div>
                                    <div className="w-full md:w-32">
                                        <label className="block text-[10px] uppercase font-black text-rose-400 mb-1 ml-1">Costo Empresa</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                                            <input
                                                type="number"
                                                value={part.costoEmpresa}
                                                onChange={(e) => updatePart(part.id, 'costoEmpresa', e.target.value)}
                                                className={`${inputClass} pl-6 border-rose-100 focus:border-rose-300`}
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <div className="w-full md:w-32">
                                        <label className="block text-[10px] uppercase font-black text-blue-400 mb-1 ml-1">Costo Público</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                                            <input
                                                type="number"
                                                value={part.costoPublico}
                                                onChange={(e) => updatePart(part.id, 'costoPublico', e.target.value)}
                                                className={`${inputClass} pl-6 border-blue-100 focus:border-blue-300`}
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <div className="w-full md:w-32">
                                        <label className="block text-[10px] uppercase font-black text-green-500 mb-1 ml-1">Subtotal</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                                            <input
                                                type="text"
                                                value={((parseFloat(part.cantidad) || 0) * (parseFloat(part.costoPublico) || 0)).toFixed(2)}
                                                readOnly
                                                className={`${inputClass} pl-6 bg-slate-50 font-bold text-slate-600`}
                                            />
                                        </div>
                                    </div>
                                    <div className="w-full md:w-auto flex justify-end md:self-end md:mb-1">
                                        <button
                                            type="button"
                                            onClick={() => removePart(part.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar Item"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {parts.length === 0 && (
                                <div className="text-center py-10 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                                    No hay materiales agregados aún.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Photos Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-cyan-500">
                            <Image className="w-5 h-5" />
                            <h3 className="font-bold uppercase text-xs tracking-widest">Evidencia Fotográfica</h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {/* New Photos */}
                            {files.map((file, idx) => (
                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                                    <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeFile(idx)}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-600 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 bg-cyan-600/80 text-[8px] text-white text-center py-0.5">NUEVA</div>
                                </div>
                            ))}

                            {/* Existing Photos */}
                            {existingPhotos.map((photo) => (
                                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                                    <img src={photo.uri} alt="Existing" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteExisting(photo.id)}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-600 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                            {/* Upload Button */}
                            <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer transition-all hover:border-cyan-400 group">
                                <Image className="w-8 h-8 text-slate-300 group-hover:text-cyan-400 mb-2" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-cyan-500">Subir Foto</span>
                                <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                        </div>
                    </div>
                </form>

                {/* Footer / Totals */}
                <div className={`p-8 border-t sticky bottom-0 z-10 ${darkMode ? 'border-slate-700 bg-slate-800/90' : 'bg-gray-50/90 border-slate-100'} backdrop-blur-md`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div>
                            <label className={labelClass}>Mano de Obra</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    name="mano_obra"
                                    value={formData.mano_obra}
                                    onChange={handleNumberChange}
                                    className={`${inputClass} pl-7 font-bold text-blue-600`}
                                    min="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Anticipo</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    name="anticipo"
                                    value={formData.anticipo}
                                    onChange={handleNumberChange}
                                    className={`${inputClass} pl-7 font-bold text-rose-600`}
                                    min="0"
                                />
                            </div>
                        </div>

                        <div className="lg:col-span-2 flex flex-col justify-end">
                            <div className={`flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl ${darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'} shadow-sm gap-4`}>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Por Pagar</span>
                                        {formData.incluir_iva && <span className="bg-blue-100 text-blue-600 text-[8px] px-1.5 py-0.5 rounded-full font-black tracking-tighter uppercase">Con IVA</span>}
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-4xl font-black ${restante > 0 ? 'text-slate-800' : 'text-green-500'}`}>
                                            ${formatCurrency(restante)}
                                        </span>
                                        <span className={`text-xs font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            Total: ${formatCurrency(currentTotal)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 justify-end">
                                        <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>IVA 16%</span>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, incluir_iva: !prev.incluir_iva }))}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formData.incluir_iva ? 'bg-blue-600' : 'bg-slate-300'}`}
                                        >
                                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${formData.incluir_iva ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        className="btn bg-cyan-600 text-white hover:bg-cyan-700 shadow-xl shadow-cyan-500/20 transform hover:-translate-y-0.5 px-8 py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3"
                                    >
                                        <Save className="w-5 h-5" />
                                        GUARDAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default NetworkServiceForm;
