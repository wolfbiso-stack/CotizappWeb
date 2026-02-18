import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, User, Smartphone, Settings, ShoppingCart, Calendar, Plus, Trash2, Image, ShieldCheck, FolderOpen } from 'lucide-react';
import QuoteSelector from './QuoteSelector';
import { formatCurrency, formatDateForInput } from '../utils/format';
import { supabase } from '../../utils/supabase';

const PhoneServiceForm = ({ service, onSave, onCancel, darkMode }) => {
    // Initial State derived from service prop or defaults
    const [formData, setFormData] = useState({
        orden_numero: '',
        fecha: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD in local time

        // Cliente
        cliente_nombre: '',
        cliente_telefono: '',

        // Equipo
        equipo_modelo: '',
        equipo_imei: '',
        equipo_pass: '',
        estado_fisico: '',

        // Técnico
        tecnico_nombre: '',

        // Detalles
        trabajo_realizado: '', // Can be stored as JSON or text depending on App.jsx handling
        observaciones: '',
        repuestos_descripcion: '', // Stores JSON string of parts

        // Financiero
        mano_obra: 0,
        repuestos_costo: 0,
        anticipo: 0,
        incluir_iva: false,
        iva: 0,
        subtotal: 0,
        total: 0,

        // Status
        pagado: false,
        entregado: false,
        status: 'recibido'
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
                if (service.repuestos_descripcion && service.repuestos_descripcion.trim().startsWith('[')) {
                    loadedParts = JSON.parse(service.repuestos_descripcion);
                    // Standardize keys for backward compatibility
                    loadedParts = loadedParts.map(p => ({
                        id: p.id || Date.now() + Math.random(),
                        cantidad: p.cantidad || 1,
                        producto: p.producto || p.descripcion || '',
                        costoPublico: p.costoPublico || p.precio_publico || 0,
                        costoEmpresa: p.costoEmpresa || p.costo_empresa || 0,
                        numeroSerie: p.numeroSerie || ''
                    }));
                } else if (service.repuestos_descripcion && service.repuestos_descripcion.trim() !== '') {
                    loadedParts = [{
                        id: Date.now(),
                        cantidad: 1,
                        producto: service.repuestos_descripcion,
                        costoEmpresa: 0,
                        costoPublico: service.repuestos_costo || 0,
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
                repuestos_costo: service.repuestos_costo || 0,
                anticipo: service.anticipo || 0,
                trabajo_realizado: Array.isArray(service.trabajo_realizado)
                    ? service.trabajo_realizado.join(', ')
                    : (service.trabajo_realizado || '')
            });

            if (service.id) {
                const fetchPhotos = async () => {
                    const { data } = await supabase
                        .from('servicio_fotos')
                        .select('*')
                        .eq('servicio_id', service.id);
                    if (data) setExistingPhotos(data);
                };
                fetchPhotos();
            }
        }
    }, [service]);

    useEffect(() => {
        const totalParts = parts.reduce((acc, part) => acc + ((parseFloat(part.costoPublico) || 0) * (parseFloat(part.cantidad) || 1)), 0);
        setFormData(prev => ({ ...prev, repuestos_costo: totalParts }));
    }, [parts]);

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
                const numericFields = ['cantidad', 'costoPublico', 'costoEmpresa'];
                const newValue = numericFields.includes(field) ? Math.max(0, parseFloat(value) || 0) : value;
                return {
                    ...p,
                    [field]: newValue
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
        const totalRC = parseFloat(formData.repuestos_costo) || 0;
        const subtotal = totalMO + totalRC;
        const ivaValue = formData.incluir_iva ? subtotal * 0.16 : 0;
        const total = subtotal + ivaValue;

        const dataToSave = {
            ...formData,
            repuestos_descripcion: JSON.stringify(parts),
            subtotal: subtotal,
            iva: ivaValue,
            total: total,
            files: files,
            photosToDelete: photosToDelete
        };
        onSave(dataToSave);
    };

    const subtotal = (parseFloat(formData.mano_obra) || 0) + (parseFloat(formData.repuestos_costo) || 0);
    const ivaValue = formData.incluir_iva ? subtotal * 0.16 : 0;
    const currentTotal = subtotal + ivaValue;
    const restante = currentTotal - (parseFloat(formData.anticipo) || 0);

    const inputClass = `w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${darkMode
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
                        <div className="p-3 bg-rose-500 rounded-2xl shadow-lg shadow-rose-500/20 text-white">
                            <Smartphone className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                {service ? 'Editar Servicio' : 'Nuevo Servicio'} <span className="text-rose-500">Celular</span>
                            </h2>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {service ? `Orden: #${service.orden_numero}` : 'Complete los datos del dispositivo'}
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
                            <label className={labelClass}>Fecha de Ingreso</label>
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
                                placeholder="Nombre del técnico que repara"
                            />
                        </div>
                    </div>

                    {/* Device Specs Section */}
                    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-rose-50/30 border-rose-100'}`}>
                        <div className="flex items-center gap-2 mb-6 text-rose-500">
                            <Smartphone className="w-5 h-5" />
                            <h3 className="font-bold uppercase text-xs tracking-widest">Especificaciones del Dispositivo</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="md:col-span-2">
                                <label className={labelClass}>Modelo del Equipo</label>
                                <input
                                    type="text"
                                    name="equipo_modelo"
                                    value={formData.equipo_modelo}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="Ej: iPhone 13 Pro, Samsung S21..."
                                    required
                                />
                            </div>
                            <div>
                                <label className={labelClass}>IMEI</label>
                                <input
                                    type="text"
                                    name="equipo_imei"
                                    value={formData.equipo_imei}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="15 dígitos"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Contraseña/Patrón</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        name="equipo_pass"
                                        value={formData.equipo_pass}
                                        onChange={handleChange}
                                        className={`${inputClass} pl-10`}
                                        placeholder="Acceso"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-6">
                            <label className={labelClass}>Estado Físico / Estético</label>
                            <textarea
                                name="estado_fisico"
                                value={formData.estado_fisico}
                                onChange={handleChange}
                                className={`${inputClass} h-20 resize-none`}
                                placeholder="Rayones, golpes, falta de botones..."
                            ></textarea>
                        </div>
                    </div>

                    {/* Report Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-orange-500">
                                <Settings className="w-5 h-5" />
                                <h3 className="font-bold uppercase text-xs tracking-widest">Trabajo Realizado / Notas</h3>
                            </div>
                            <textarea
                                name="trabajo_realizado"
                                value={formData.trabajo_realizado}
                                onChange={handleChange}
                                className={`${inputClass} h-40 resize-none`}
                                placeholder="Describe el trabajo realizado..."
                            ></textarea>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-blue-500">
                                <Settings className="w-5 h-5" />
                                <h3 className="font-bold uppercase text-xs tracking-widest">Observaciones Internas</h3>
                            </div>
                            <textarea
                                name="observaciones"
                                value={formData.observaciones}
                                onChange={handleChange}
                                className={`${inputClass} h-40 resize-none`}
                                placeholder="Notas adicionales del equipo..."
                            ></textarea>
                        </div>
                    </div>

                    {/* Parts List Section */}
                    <div className={`p-8 rounded-3xl border transition-all ${darkMode ? 'bg-slate-900/40 border-slate-700' : 'bg-gray-50/50 border-slate-100'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Repuestos y Materiales</h3>
                                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Desglose de refacciones utilizadas</p>
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
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${darkMode ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-900/70' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'}`}
                                >
                                    <FolderOpen className="w-4 h-4" /> Desde Cotización
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {parts.map((part) => (
                                <div key={part.id} className={`flex flex-col md:flex-row gap-3 p-4 md:p-3 rounded-2xl border items-center transition-all ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <div className="w-full md:w-20">
                                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1 ml-1 md:text-center">Cant.</label>
                                        <input
                                            type="number"
                                            value={part.cantidad}
                                            onChange={(e) => updatePart(part.id, 'cantidad', e.target.value)}
                                            className={`${inputClass} text-center px-1`}
                                            min="0"
                                        />
                                    </div>
                                    <div className="w-full md:flex-1">
                                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1 ml-1">Producto / Material</label>
                                        <input
                                            type="text"
                                            value={part.producto}
                                            onChange={(e) => updatePart(part.id, 'producto', e.target.value)}
                                            className={inputClass}
                                            placeholder="Descripción del artículo..."
                                        />
                                    </div>
                                    <div className="w-full md:w-32">
                                        <label className="block text-[10px] uppercase font-black text-rose-400 mb-1 ml-1">Costo Empresa</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={part.costoEmpresa}
                                                onChange={(e) => updatePart(part.id, 'costoEmpresa', e.target.value)}
                                                className={`${inputClass} pl-6 border-rose-100 focus:border-rose-300`}
                                            />
                                        </div>
                                    </div>
                                    <div className="w-full md:w-32">
                                        <label className="block text-[10px] uppercase font-black text-blue-400 mb-1 ml-1">Costo Público</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={part.costoPublico}
                                                onChange={(e) => updatePart(part.id, 'costoPublico', e.target.value)}
                                                className={`${inputClass} pl-6 border-blue-100 focus:border-blue-300`}
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
                                    No hay repuestos agregados aún.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Photos Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-purple-500">
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
                                    <div className="absolute bottom-0 left-0 right-0 bg-blue-600/80 text-[8px] text-white text-center py-0.5">NUEVA</div>
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
                            <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer transition-all hover:border-blue-400 group">
                                <Image className="w-8 h-8 text-slate-300 group-hover:text-blue-400 mb-2" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-blue-500">Subir Foto</span>
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
                                    min="0"
                                    name="mano_obra"
                                    value={formData.mano_obra}
                                    onChange={handleNumberChange}
                                    className={`${inputClass} pl-7 font-bold text-blue-600`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Anticipo</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    min="0"
                                    name="anticipo"
                                    value={formData.anticipo}
                                    onChange={handleNumberChange}
                                    className={`${inputClass} pl-7 font-bold text-rose-600`}
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
                                        <span className={`text-4xl font-black ${restante > 0 ? 'text-rose-500' : 'text-green-500'}`}>
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
                                        className="btn bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20 transform hover:-translate-y-0.5 px-8 py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3"
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

export default PhoneServiceForm;
