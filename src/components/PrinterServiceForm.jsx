import React, { useState, useEffect } from 'react';
import PartsList from './PartsList';
import { createPortal } from 'react-dom';
import { X, Save, User, Printer, Settings, ShoppingCart, Calendar, Plus, Trash2, Image, ShieldCheck, HardDrive, Zap, Box, FolderOpen } from 'lucide-react';
import QuoteSelector from './QuoteSelector';
import { formatCurrency, formatDateForInput } from '../utils/format';
import { supabase } from '../../utils/supabase';
import ClientAutocomplete from './ClientAutocomplete';

const PrinterServiceForm = ({ service, onSave, onCancel, darkMode }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [guardarCliente, setGuardarCliente] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
        };
        fetchUser();
    }, []);

    // Initial State derived from service prop or defaults
    const [formData, setFormData] = useState({
        orden_numero: '',
        fecha: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD in local time

        // Cliente
        cliente_nombre: '',
        cliente_telefono: '',

        // Equipo
        equipo_tipo: 'Multifuncional',
        equipo_modelo: '',
        equipo_serie: '',
        equipo_contador: 0,

        // Detalles específicos de impresoras
        accesorios: '', // Will be converted to/from JSONB array
        estado_consumibles: '',

        // Técnico
        tecnico_nombre: '',

        // Detalles
        problema_reportado: '',
        diagnostico: '', // Note: PC uses diagnostico_tecnico, Printer uses diagnostico
        trabajo_realizado: '', // JSONB in DB, handled as text here
        observaciones: '',
        repuestos_descripcion: '', // Stores JSON string of parts

        // Financiero
        mano_obra: 0,
        costo_repuestos: 0, // Note: PC uses repuestos_costo, Printer uses costo_repuestos
        anticipo: 0,
        incluir_iva: false,
        iva: 0,
        subtotal: 0,
        total: 0,
        costo_total: 0, // Redundant with total? DB has costo_total and total. Usually total is final.

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
    const [isDirty, setIsDirty] = useState(false);
    const handleClose = () => {
        if (isDirty) {
            if (window.confirm("Hay datos sin guardar. ¿Estás seguro que quieres salir?")) {
                onCancel();
            }
        } else {
            onCancel();
        }
    };


    useEffect(() => {
        if (service) {
            let loadedParts = [];
            try {
                if (service.repuestos_descripcion && service.repuestos_descripcion.trim().startsWith('[')) {
                    loadedParts = JSON.parse(service.repuestos_descripcion);
                    // Standardize keys
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
                        costoEmpresa: '',
                        costoPublico: service.costo_repuestos || 0,
                        numeroSerie: ''
                    }];
                }
            } catch (e) {
                console.error("Error parsing parts:", e);
            }
            setParts(loadedParts);

            // Handle accesorios (JSONB)
            let loadedAccesorios = '';
            if (service.accesorios) {
                if (Array.isArray(service.accesorios)) {
                    loadedAccesorios = service.accesorios.join(', ');
                } else if (typeof service.accesorios === 'string') {
                    // Try parsing if it's a JSON string
                    try {
                        const parsed = JSON.parse(service.accesorios);
                        if (Array.isArray(parsed)) loadedAccesorios = parsed.join(', ');
                        else loadedAccesorios = service.accesorios;
                    } catch {
                        loadedAccesorios = service.accesorios;
                    }
                }
            }

            // Handle trabajo_realizado (JSONB)
            let loadedTrabajo = '';
            if (service.trabajo_realizado) {
                if (Array.isArray(service.trabajo_realizado)) {
                    loadedTrabajo = service.trabajo_realizado.join(', ');
                } else if (typeof service.trabajo_realizado === 'string') {
                    try {
                        const parsed = JSON.parse(service.trabajo_realizado);
                        if (Array.isArray(parsed)) loadedTrabajo = parsed.join(', ');
                        else loadedTrabajo = service.trabajo_realizado;
                    } catch {
                        loadedTrabajo = service.trabajo_realizado;
                    }
                }
            }

            setFormData({
                ...formData,
                ...service,
                accesorios: loadedAccesorios,
                trabajo_realizado: loadedTrabajo,
                fecha: formatDateForInput(service.fecha),
                mano_obra: service.mano_obra || 0,
                costo_repuestos: service.costo_repuestos || 0,
                anticipo: service.anticipo || 0,
                costo_total: service.costo_total || 0,
                total: service.total || 0
            });

            if (service.id) {
                const fetchPhotos = async () => {
                    const { data } = await supabase
                        .from('servicio_fotos')
                        .select('*')
                        .eq('servicio_id', service.id)
                        .eq('tipo_servicio', 'servicios_impresoras');

                    if (data) {
                        setExistingPhotos(data);
                    }
                };

                // Let's rely on the fetch in the View component to see how it's done. 
                // In PCServiceView: .eq('servicio_id', service.id).eq('user_id', user.id).
                // It doesn't filter by type. This suggests maybe IDs are unique or they don't care about collisions (bad) or they use UUIDs (User said integer).
                // Wait, if IDs are integers, 1 in PC and 1 in Printer will collide in 'servicio_fotos' if not filtered by type.
                // I will add `.eq('tipo_servicio', 'servicio_impresora')` to be safe.
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
                costo_repuestos: totalParts,
                subtotal: subtotal,
                iva: ivaValue,
                total: total,
                costo_total: total
            };
        });
    }, [parts, formData.mano_obra, formData.incluir_iva]);

    const handleChange = (e) => {
        setIsDirty(true);
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleNumberChange = (e) => {
        setIsDirty(true);
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
            costoEmpresa: '',
            costoPublico: '',
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
        setIsDirty(true);
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };

    const removeFile = (index) => {
        setIsDirty(true);
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDeleteExisting = (photoId) => {
        setPhotosToDelete(prev => [...prev, photoId]);
        setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const totalMO = parseFloat(formData.mano_obra) || 0;
        const totalRC = parseFloat(formData.costo_repuestos) || 0;
        const subtotal = totalMO + totalRC;
        const ivaValue = formData.incluir_iva ? subtotal * 0.16 : 0;
        const total = subtotal + ivaValue;

        if (guardarCliente && currentUser && formData.cliente_nombre) {
            try {
                const { error: insertError } = await supabase.from('clientes').insert([{
                    nombre: formData.cliente_nombre,
                    numero: formData.cliente_telefono || '',
                    empresa: '',
                    correo: '',
                    notas: '',
                    user_id: currentUser.id,
                    created_at: new Date().toISOString()
                }]);
                if (insertError) {
                    console.error("Error saving client:", insertError);
                }
            } catch (error) {
                console.error("Exception saving client:", error);
            }
        }

        // Convert accessories string to array for JSONB
        const accesoriosArray = formData.accesorios
            ? formData.accesorios.split(',').map(s => s.trim()).filter(s => s)
            : [];

        // Convert trabajo_realizado string to array for JSONB if desired, or keep as string if DB allows. 
        // User said `trabajo_realizado` is `jsonb`. PC Service uses string in form but array in DB?
        // PC form uses: `trabajo_realizado: Array.isArray(...) ? ...join : ...`
        // So PC DB has it as text or jsonb?
        // User input: `trabajo_realizado | jsonb`.
        // So I should save it as an array of strings to be safe/structured.
        const trabajoArray = formData.trabajo_realizado
            ? formData.trabajo_realizado.split(',').map(s => s.trim()).filter(s => s)
            : [];

        const dataToSave = {
            ...formData,
            repuestos_descripcion: JSON.stringify(parts),
            accesorios: JSON.stringify(accesoriosArray), // Sending as JSON string, Supabase handles JSONB
            trabajo_realizado: JSON.stringify(trabajoArray),
            subtotal: subtotal,
            iva: ivaValue,
            total: total,
            costo_total: total, // Syncing both
            files: files,
            photosToDelete: photosToDelete
        };
        onSave(dataToSave);
    };

    const subtotal = (parseFloat(formData.mano_obra) || 0) + (parseFloat(formData.costo_repuestos) || 0);
    const ivaValue = formData.incluir_iva ? subtotal * 0.16 : 0;
    const currentTotal = subtotal + ivaValue;
    const restante = currentTotal - (parseFloat(formData.anticipo) || 0);

    const inputClass = `w-full px-4 py-3 md:py-2 text-base md:text-sm rounded-xl md:rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${darkMode
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
            {showQuoteSelector && (
                <QuoteSelector
                    onSelect={handleQuoteSelect}
                    onClose={() => setShowQuoteSelector(false)}
                    darkMode={darkMode}
                />
            )}
            <div className={`w-full md:w-[95vw] max-w-6xl h-[95vh] md:max-h-[90vh] md:h-auto flex flex-col rounded-none md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-200 ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
                {/* Header */}
                <div className={`px-4 md:px-8 py-3 md:py-6 flex justify-between items-center border-b sticky top-0 z-10 ${darkMode ? 'border-slate-700 bg-slate-800/90' : 'border-slate-100 bg-white/90'} backdrop-blur-md`}>
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2 md:p-3 bg-purple-600 rounded-xl md:rounded-2xl shadow-lg shadow-purple-500/20 text-white">
                            <Printer className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div>
                            <h2 className={`text-lg md:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                {service ? 'Editar Servicio' : 'Nuevo Servicio'} <span className="text-purple-600">Impresora</span>
                            </h2>
                            <p className={`text-[10px] md:text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {service ? `Orden: #${service.orden_numero}` : 'Complete los datos del equipo'}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                        <X className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-8">
                    {/* Basic Info Section */}
                    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
                        <div className="col-span-2">
                            <label className={labelClass}>Nombre del Cliente</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 w-5 h-5 text-slate-400 z-10" />
                                <div className="pl-10">
                                    <ClientAutocomplete
                                        value={formData.cliente_nombre}
                                        onChange={(val) => setFormData(prev => ({ ...prev, cliente_nombre: val }))}
                                        onSelect={(client) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                cliente_nombre: client.nombre,
                                                cliente_telefono: client.numero || prev.cliente_telefono
                                            }));
                                            setIsDirty(true);
                                        }}
                                        darkMode={darkMode}
                                        user={currentUser}
                                    />
                                </div>
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
                        <div className="col-span-3">
                            <label className={`flex items-center gap-2 cursor-pointer mt-1 text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                <input 
                                    type="checkbox" 
                                    checked={guardarCliente} 
                                    onChange={(e) => setGuardarCliente(e.target.checked)}
                                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500" 
                                />
                                Guardar en Clientes
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
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
                                placeholder="Nombre del técnico experto"
                            />
                        </div>
                    </div>

                    {/* Device Specs Section */}
                    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-purple-50/30 border-purple-100'}`}>
                        <div className="flex items-center gap-2 mb-6 text-purple-600">
                            <Printer className="w-5 h-5" />
                            <h3 className="font-bold uppercase text-xs tracking-widest">Especificaciones del Equipo</h3>
                        </div>
                        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClass}>Tipo de Equipo</label>
                                <select
                                    name="equipo_tipo"
                                    value={formData.equipo_tipo}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    <option value="Multifuncional">Multifuncional</option>
                                    <option value="Laser">Láser</option>
                                    <option value="Inyección">Inyección de Tinta</option>
                                    <option value="Matricial">Matricial</option>
                                    <option value="Plotter">Plotter</option>
                                    <option value="Termica">Térmica / Tickets</option>
                                    <option value="3D">Impresora 3D</option>
                                    <option value="Scanner">Escáner</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Número de Serie</label>
                                <input
                                    type="text"
                                    name="equipo_serie"
                                    value={formData.equipo_serie}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="S/N"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Modelo / Marca</label>
                                <input
                                    type="text"
                                    name="equipo_modelo"
                                    value={formData.equipo_modelo}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="Ej: Epson L3110"
                                    required
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Contador de Impresiones</label>
                                <input
                                    type="number"
                                    name="equipo_contador"
                                    value={formData.equipo_contador}
                                    onChange={handleNumberChange}
                                    className={inputClass}
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className={labelClass}>Accesorios Recibidos</label>
                                <div className="relative">
                                    <Box className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        name="accesorios"
                                        value={formData.accesorios}
                                        onChange={handleChange}
                                        className={`${inputClass} pl-10`}
                                        placeholder="Cables, bandejas, tóner extra (separar por comas)"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className={labelClass}>Estado de Consumibles</label>
                            <div className="relative">
                                <Zap className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    name="estado_consumibles"
                                    value={formData.estado_consumibles}
                                    onChange={handleChange}
                                    className={`${inputClass} pl-10`}
                                    placeholder="Niveles de tinta/tóner, estado de fusor, etc."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Report Section */}
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-amber-500">
                                <Settings className="w-5 h-5" />
                                <h3 className="font-bold uppercase text-xs tracking-widest">Problema Reportado</h3>
                            </div>
                            <textarea
                                name="problema_reportado"
                                value={formData.problema_reportado}
                                onChange={handleChange}
                                className={`${inputClass} h-24 resize-none`}
                                placeholder="Falla comentada por el cliente..."
                            ></textarea>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <div className="flex items-center gap-2 mb-4 text-indigo-500">
                                    <Settings className="w-5 h-5" />
                                    <h3 className="font-bold uppercase text-xs tracking-widest">Diagnóstico Técnico</h3>
                                </div>
                                <textarea
                                    name="diagnostico"
                                    value={formData.diagnostico}
                                    onChange={handleChange}
                                    className={`${inputClass} h-32 resize-none`}
                                    placeholder="Lo que se encontró al revisar..."
                                ></textarea>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-4 text-emerald-500">
                                    <Settings className="w-5 h-5" />
                                    <h3 className="font-bold uppercase text-xs tracking-widest">Trabajo Realizado</h3>
                                </div>
                                <textarea
                                    name="trabajo_realizado"
                                    value={formData.trabajo_realizado}
                                    onChange={handleChange}
                                    className={`${inputClass} h-32 resize-none`}
                                    placeholder="Acciones correctivas aplicadas (separar por comas)..."
                                ></textarea>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-slate-500">
                                <Settings className="w-5 h-5" />
                                <h3 className="font-bold uppercase text-xs tracking-widest">Observaciones Internas</h3>
                            </div>
                            <textarea
                                name="observaciones"
                                value={formData.observaciones}
                                onChange={handleChange}
                                className={`${inputClass} h-20 resize-none`}
                                placeholder="Notas internas que no ve el cliente..."
                            ></textarea>
                        </div>
                    </div>

                    {/* Parts List Section */}
                      <PartsList parts={parts} setParts={setParts} darkMode={darkMode} setShowQuoteSelector={setShowQuoteSelector} setIsDirty={setIsDirty} />

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
                                    <div className="absolute bottom-0 left-0 right-0 bg-purple-600/80 text-[8px] text-white text-center py-0.5">NUEVA</div>
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
                            <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer transition-all hover:border-purple-400 group">
                                <Image className="w-8 h-8 text-slate-300 group-hover:text-purple-400 mb-2" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-purple-500">Subir Foto</span>
                                <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                        </div>
                    </div>
                    {/* Footer / Totals (Moved into form) */}
                    <div className={`mt-4 pt-6 md:p-8 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                        <div className="grid grid-cols-2 md:block gap-4">
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
                        </div>

                        <div className="lg:col-span-2 flex flex-col justify-end">
                            <div className={`flex items-center justify-between p-3 md:p-4 rounded-2xl ${darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'} shadow-sm gap-4`}>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Por Pagar</span>
                                        {formData.incluir_iva && <span className="bg-blue-100 text-blue-600 text-[8px] px-1.5 py-0.5 rounded-full font-black tracking-tighter uppercase">Con IVA</span>}
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-xl md:text-4xl font-black ${restante > 0 ? 'text-slate-800' : 'text-green-500'}`}>
                                            ${formatCurrency(restante)}
                                        </span>
                                        <span className={`hidden sm:inline text-xs font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            Total: ${formatCurrency(currentTotal)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-row items-center gap-3">
                                    <div className="flex flex-col items-end gap-0.5">
                                        <span className={`text-[9px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>IVA</span>
                                        <button
                                            type="button"
                                            onClick={() => { setFormData(prev => ({ ...prev, incluir_iva: !prev.incluir_iva })); setIsDirty(true); }}
                                            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${formData.incluir_iva ? 'bg-blue-600' : 'bg-slate-300'}`}
                                        >
                                            <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${formData.incluir_iva ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        className="bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/20 px-4 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-4 h-4 md:w-5 md:h-5" />
                                        GUARDAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default PrinterServiceForm;
