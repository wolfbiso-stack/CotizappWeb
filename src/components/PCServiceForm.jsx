import React, { useState, useEffect } from 'react';
import { X, Save, User, Monitor, Settings, ShoppingCart, Calendar, Plus, Trash2, Image } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { supabase } from '../utils/supabase';

const PCServiceForm = ({ service, onSave, onCancel, darkMode }) => {
    // Initial State derived from service prop or defaults
    const [formData, setFormData] = useState({
        orden_numero: '', // Will be generated on backend/App for new
        status: 'Recibido',
        fecha: new Date().toISOString().split('T')[0],

        // Cliente
        cliente_nombre: '',
        cliente_telefono: '',

        // Equipo
        equipo_tipo: 'Laptop',
        equipo_modelo: '',
        equipo_serie: '',
        equipo_password: '',

        // Técnico
        tecnico_nombre: '',

        // Detalles
        problema_reportado: '',
        diagnostico_tecnico: '',
        trabajo_realizado: '',
        observaciones: '',
        repuestos_descripcion: '', // Will store JSON string of parts

        // Financiero
        mano_obra: 0,
        repuestos_costo: 0, // This will be the sum of public prices
        anticipo: 0
    });

    // Valid parts array state
    const [parts, setParts] = useState([]);
    // File Upload State
    const [files, setFiles] = useState([]);
    // Existing Photos State
    const [existingPhotos, setExistingPhotos] = useState([]);
    const [photosToDelete, setPhotosToDelete] = useState([]);

    useEffect(() => {
        if (service) {
            // Check if repuestos_descripcion is a JSON string (new format) or simple text (legacy)
            let loadedParts = [];
            try {
                if (service.repuestos_descripcion && service.repuestos_descripcion.trim().startsWith('[')) {
                    loadedParts = JSON.parse(service.repuestos_descripcion);
                    // Ensure compatibility if 'cantidad' didn't exist before
                    loadedParts = loadedParts.map(p => ({ ...p, cantidad: p.cantidad || 1 }));
                } else if (service.repuestos_descripcion && service.repuestos_descripcion.trim() !== '') {
                    // Legacy: convert single text line to one part
                    loadedParts = [{
                        id: Date.now(),
                        cantidad: 1,
                        descripcion: service.repuestos_descripcion,
                        costo_empresa: 0,
                        precio_publico: service.repuestos_costo || 0
                    }];
                }
            } catch (e) {
                console.error("Error parsing parts:", e);
                // Fallback
                loadedParts = [];
            }
            setParts(loadedParts);


            // Workaround: Extract password from observations if present
            let servicioObservaciones = service.observaciones || '';
            let servicioPassword = service.equipo_password || '';

            const passwordMatch = servicioObservaciones.match(/\[Contraseña: (.*?)\]/);
            if (passwordMatch) {
                servicioPassword = passwordMatch[1];
                servicioObservaciones = servicioObservaciones.replace(passwordMatch[0], '').trim();
            }

            setFormData({
                ...formData,
                ...service,
                observaciones: servicioObservaciones,
                equipo_password: servicioPassword,
                // Ensure dates are formatted for input type="date"
                fecha: service.fecha ? service.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
                // Ensure numbers
                mano_obra: service.mano_obra || 0,
                repuestos_costo: service.repuestos_costo || 0,
                anticipo: service.anticipo || 0,
                // Ensure strings
                trabajo_realizado: Array.isArray(service.trabajo_realizado)
                    ? service.trabajo_realizado.join(', ')
                    : (service.trabajo_realizado || '')
            });

            // Fetch Existing Photos
            if (service.id) {
                const fetchPhotos = async () => {
                    const { data, error } = await supabase
                        .from('servicio_fotos')
                        .select('*')
                        .eq('servicio_id', service.id);

                    if (data) setExistingPhotos(data);
                };
                fetchPhotos();
            }
        }
    }, [service]);

    // Recalculate total parts cost whenever parts change
    useEffect(() => {
        const totalPublic = parts.reduce((acc, part) => acc + ((parseFloat(part.precio_publico) || 0) * (parseFloat(part.cantidad) || 1)), 0);
        setFormData(prev => ({ ...prev, repuestos_costo: totalPublic }));
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
            [name]: parseFloat(value) || 0
        }));
    };

    // Parts Management
    const addPart = () => {
        setParts([...parts, {
            id: Date.now(),
            cantidad: 1,
            descripcion: '',
            costo_empresa: 0,
            precio_publico: 0
        }]);
    };

    const removePart = (id) => {
        setParts(parts.filter(p => p.id !== id));
    };

    const updatePart = (id, field, value) => {
        setParts(parts.map(p => {
            if (p.id === id) {
                return {
                    ...p,
                    [field]: field === 'descripcion' ? value : (parseFloat(value) || 0)
                };
            }
            return p;
        }));
    };

    // File Handlers
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
        // Prepare data for save
        const dataToSave = {
            ...formData,
            // Save parts as JSON string in the description field
            repuestos_descripcion: JSON.stringify(parts),
            total: (formData.mano_obra || 0) + (formData.repuestos_costo || 0),
            files: files, // Pass files to parent for upload
            photosToDelete: photosToDelete // Pass IDs to delete
        };
        onSave(dataToSave);
    };

    const total = (formData.mano_obra || 0) + (formData.repuestos_costo || 0);
    const restante = total - (formData.anticipo || 0);

    const inputClass = `w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${darkMode
        ? 'bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-400'
        : 'bg-white/50 border-slate-200 text-slate-800 placeholder-slate-400'
        }`;

    const labelClass = `block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'
        }`;

    const sectionTitleClass = `text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'
        }`;

    const tableHeaderClass = `text-left text-xs font-bold uppercase tracking-wider p-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'
        }`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with Blur */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity"
                onClick={onCancel}
            />

            {/* Modal Content */}
            <div className={`relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border ${darkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-white/20'
                } backdrop-blur-xl flex flex-col`}>

                {/* Header */}
                <div className={`flex justify-between items-center p-6 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'
                    }`}>
                    <div>
                        <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'
                            }`}>
                            {service ? 'Editar Servicio' : 'Nuevo Servicio'}
                        </h2>
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Completa la información del servicio técnico
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                            }`}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8 pb-32">

                    {/* Top Row: Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className={labelClass}>Estado</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className={inputClass}
                            >
                                <option value="Recibido">Recibido</option>
                                <option value="Diagnóstico">Diagnóstico</option>
                                <option value="En Espera">En Espera</option>
                                <option value="Reparación">Reparación</option>
                                <option value="Terminado">Terminado</option>
                                <option value="Entregado">Entregado</option>
                                <option value="Cancelado">Cancelado</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Fecha Recepción</label>
                            <input
                                type="date"
                                name="fecha"
                                value={formData.fecha}
                                onChange={handleChange}
                                className={inputClass}
                                required
                            />
                        </div>
                    </div>

                    {/* Section 1: Cliente & Equipo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Cliente */}
                        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-blue-50/50 border-blue-100'}`}>
                            <h3 className={sectionTitleClass}>
                                <User className="w-4 h-4" /> Cliente
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>Nombre Completo</label>
                                    <input
                                        type="text"
                                        name="cliente_nombre"
                                        value={formData.cliente_nombre}
                                        onChange={handleChange}
                                        className={inputClass}
                                        placeholder="Ej. Juan Pérez"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Teléfono / Contacto</label>
                                    <input
                                        type="tel"
                                        name="cliente_telefono"
                                        value={formData.cliente_telefono}
                                        onChange={handleChange}
                                        className={inputClass}
                                        placeholder="Ej. 6671234567"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Equipo */}
                        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-purple-50/50 border-purple-100'}`}>
                            <h3 className={sectionTitleClass}>
                                <Monitor className="w-4 h-4" /> Equipo
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Tipo</label>
                                    <input
                                        type="text"
                                        name="equipo_tipo"
                                        value={formData.equipo_tipo}
                                        onChange={handleChange}
                                        className={inputClass}
                                        placeholder="Ej. Laptop"
                                        list="tipos-equipo"
                                    />
                                    <datalist id="tipos-equipo">
                                        <option value="Laptop" />
                                        <option value="PC Escritorio" />
                                        <option value="Impresora" />
                                        <option value="Consola" />
                                        <option value="Tablet" />
                                    </datalist>
                                </div>
                                <div>
                                    <label className={labelClass}>Modelo</label>
                                    <input
                                        type="text"
                                        name="equipo_modelo"
                                        value={formData.equipo_modelo}
                                        onChange={handleChange}
                                        className={inputClass}
                                        placeholder="Ej. HP Pavilion 15"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>No. Serie</label>
                                    <input
                                        type="text"
                                        name="equipo_serie"
                                        value={formData.equipo_serie}
                                        onChange={handleChange}
                                        className={inputClass}
                                        placeholder="S/N..."
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Contraseña</label>
                                    <input
                                        type="text"
                                        name="equipo_password"
                                        value={formData.equipo_password}
                                        onChange={handleChange}
                                        className={inputClass}
                                        placeholder="PIN / Patrón"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Detalles Técnicos */}
                    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                        <h3 className={sectionTitleClass}>
                            <Settings className="w-4 h-4" /> Detalles del Servicio
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Problema Reportado</label>
                                <textarea
                                    name="problema_reportado"
                                    value={formData.problema_reportado}
                                    onChange={handleChange}
                                    className={`${inputClass} min-h-[80px] resize-none`}
                                    placeholder="Describe la falla reportada por el cliente..."
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Diagnóstico Técnico</label>
                                    <textarea
                                        name="diagnostico_tecnico"
                                        value={formData.diagnostico_tecnico}
                                        onChange={handleChange}
                                        className={`${inputClass} min-h-[100px] resize-none`}
                                        placeholder="Diagnóstico realizado..."
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Trabajo Realizado</label>
                                    <textarea
                                        name="trabajo_realizado"
                                        value={formData.trabajo_realizado}
                                        onChange={handleChange}
                                        className={`${inputClass} min-h-[100px] resize-none`}
                                        placeholder="Acciones realizadas para solucionar el problema..."
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Observaciones / Notas Internas</label>
                                <input
                                    type="text"
                                    name="observaciones"
                                    value={formData.observaciones}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="Detalles adicionales..."
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Técnico Asignado</label>
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
                    </div>

                    {/* Section 3: Financiero */}
                    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-green-50/50 border-green-100'}`}>
                        <h3 className={sectionTitleClass}>
                            <ShoppingCart className="w-4 h-4" /> Costos y Pagos
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                            <div>
                                <label className={labelClass}>Mano de Obra ($)</label>
                                <input
                                    type="number"
                                    name="mano_obra"
                                    value={formData.mano_obra}
                                    onChange={handleNumberChange}
                                    className={`${inputClass} font-mono font-bold`}
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Refacciones ($)</label>
                                <input
                                    type="number"
                                    name="repuestos_costo"
                                    value={formData.repuestos_costo}
                                    readOnly
                                    className={`${inputClass} font-mono font-bold bg-gray-100/50 text-gray-500 cursor-not-allowed`}
                                />
                                <span className="text-[10px] text-gray-400">Calculado automáticamente</span>
                            </div>
                            <div>
                                <label className={labelClass}>Anticipo ($)</label>
                                <input
                                    type="number"
                                    name="anticipo"
                                    value={formData.anticipo}
                                    onChange={handleNumberChange}
                                    className={`${inputClass} font-mono font-bold text-green-600`}
                                    min="0"
                                />
                            </div>
                            <div className="md:ml-auto text-right p-4 bg-white/50 rounded-xl border border-dashed border-slate-300 w-full">
                                <p className="text-xs uppercase text-slate-500 font-bold">Total a Pagar</p>
                                <p className="text-3xl font-black text-slate-800">
                                    ${formatCurrency(total)}
                                </p>
                                {restante > 0 && (
                                    <p className="text-sm font-bold text-rose-500 mt-1">
                                        Resta: ${formatCurrency(restante)}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Parts List */}
                        <div className="mt-8">
                            <div className="flex justify-between items-center mb-4">
                                <label className={labelClass}>Listado de Refacciones y Materiales</label>
                                <button
                                    type="button"
                                    onClick={addPart}
                                    className="text-xs flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    <Plus className="w-4 h-4" /> Agregar Refacción
                                </button>
                            </div>

                            <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                                <table className="w-full text-sm">
                                    <thead className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                                        <tr>
                                            <th className={`${tableHeaderClass} w-[80px]`}>Cant.</th>
                                            <th className={tableHeaderClass}>Artículo / Descripción</th>
                                            <th className={`${tableHeaderClass} w-[120px]`}>$ Empresa</th>
                                            <th className={`${tableHeaderClass} w-[120px]`}>$ Público</th>
                                            <th className={`${tableHeaderClass} w-[120px]`}>Total</th>
                                            <th className="w-[50px]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                                        {parts.map((part) => (
                                            <tr key={part.id} className={darkMode ? 'bg-slate-800/30' : 'bg-white'}>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        value={part.cantidad}
                                                        onChange={(e) => updatePart(part.id, 'cantidad', e.target.value)}
                                                        className={`w-full text-center bg-transparent outline-none border-b border-transparent focus:border-blue-500 ${darkMode ? 'text-white' : 'text-slate-800'}`}
                                                        min="1"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Descripción..."
                                                        value={part.descripcion}
                                                        onChange={(e) => updatePart(part.id, 'descripcion', e.target.value)}
                                                        className={`w-full bg-transparent outline-none border-b border-transparent focus:border-blue-500 ${darkMode ? 'text-white' : 'text-slate-800'}`}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        placeholder="0.00"
                                                        value={part.costo_empresa}
                                                        onChange={(e) => updatePart(part.id, 'costo_empresa', e.target.value)}
                                                        className={`w-full text-right bg-transparent outline-none border-b border-transparent focus:border-blue-500 font-mono text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        placeholder="0.00"
                                                        value={part.precio_publico}
                                                        onChange={(e) => updatePart(part.id, 'precio_publico', e.target.value)}
                                                        className={`w-full text-right bg-transparent outline-none border-b border-transparent focus:border-green-500 font-mono font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}
                                                    />
                                                </td>
                                                <td className="p-2 text-right font-mono text-xs font-bold opacity-70">
                                                    ${formatCurrency((parseFloat(part.cantidad) || 0) * (parseFloat(part.precio_publico) || 0))}
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removePart(part.id)}
                                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {parts.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className={`text-center p-8 italic ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    No hay refacciones agregadas. Haz clic en "Agregar Refacción".
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    {/* Section 4: Evidencia Fotográfica (Upload) */}
                    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-indigo-50/50 border-indigo-100'}`}>
                        <h3 className={sectionTitleClass}>
                            <Image className="w-4 h-4" /> Evidencia Fotográfica
                        </h3>
                        <div className="space-y-4">
                            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${darkMode ? 'border-slate-600 hover:border-slate-500 bg-slate-800/50' : 'border-indigo-200 hover:border-indigo-300 bg-white/50'}`}>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="photo-upload"
                                />
                                <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                    <div className={`p-3 rounded-full ${darkMode ? 'bg-slate-700 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                        <Image className="w-6 h-6" />
                                    </div>
                                    <p className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Click para seleccionar fotos
                                    </p>
                                    <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        SVG, PNG, JPG o GIF (Max. 5MB)
                                    </p>
                                </label>
                            </div>

                            {/* Previews Grid */}
                            {(existingPhotos.length > 0 || files.length > 0) && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                    {/* Existing Photos */}
                                    {existingPhotos.map((photo) => (
                                        <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200">
                                            <img
                                                src={photo.uri || photo.foto_url || photo.url}
                                                alt="Evidencia"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteExisting(photo.id)}
                                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                                                title="Eliminar foto existente"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                            <span className="absolute bottom-2 left-2 text-[10px] bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                                                Guardada
                                            </span>
                                        </div>
                                    ))}

                                    {/* New Files */}
                                    {files.map((file, index) => (
                                        <div key={`new-${index}`} className="relative group aspect-square rounded-xl overflow-hidden border border-blue-200 ring-2 ring-blue-500/20">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={`Preview ${index}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                            <span className="absolute bottom-2 right-2 text-[10px] bg-blue-600/90 text-white px-2 py-0.5 rounded-full shadow-sm">
                                                Nueva
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </form>

                {/* Footer Actions */}
                <div className={`p-6 border-t flex justify-end gap-3 sticky bottom-0 backdrop-blur-xl ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-100'
                    }`}>
                    <button
                        onClick={onCancel}
                        className={`px-6 py-2 rounded-xl font-bold transition-all ${darkMode
                            ? 'text-slate-300 hover:bg-slate-700'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
                    >
                        <Save className="w-5 h-5" />
                        {service ? 'Guardar Cambios' : 'Crear Servicio'}
                    </button>
                </div>
            </div >
        </div >
    );
};

export default PCServiceForm;
