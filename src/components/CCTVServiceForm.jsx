import React, { useState, useEffect } from 'react';
import PartsList from './PartsList';
import { createPortal } from 'react-dom';
import { X, Save, User, Video, Settings, ShoppingCart, Calendar, Plus, Trash2, Image, ShieldCheck, Layout, FolderOpen } from 'lucide-react';
import QuoteSelector from './QuoteSelector';
import { formatCurrency, formatDateForInput } from '../utils/format';
import { supabase } from '../../utils/supabase';

const CCTVServiceForm = ({ service, onSave, onCancel, darkMode }) => {
    // Initial State
    const [formData, setFormData] = useState({
        orden_numero: '',
        fecha: new Date().toLocaleDateString('en-CA'),

        // Cliente
        cliente_nombre: '',
        cliente_telefono: '',

        // Sistema/Equipo
        sistema_tipo: 'DVR/NVR',
        sistema_modelo: '',
        cantidad_camaras: 1,
        ubicacion_instalacion: '',
        
        // Nuevos campos DB
        tipo_servicio: 'Instalacion',
        marca_principal: '',
        tipo_grabador: 'NVR',
        tipos_camaras: '', // string for input, will be parsed to array on save
        ip_grabador: '',
        usuario: '',
        contrasena: '',
        id_nube_p2p: '',
        dominio_ddns: '',
        garantia_aplica: false,
        garantia_fecha_inicio: '',
        garantia_fecha_vencimiento: '',
        garantia_detalles: '',

        // Técnico
        tecnico_nombre: '',

        // Detalles
        problema_reportado: '',
        diagnostico_tecnico: '',
        trabajo_realizado: '',
        observaciones: '',
        repuestos_descripcion: '',

        // Financiero
        mano_obra: 0,
        repuestos_costo: 0,
        anticipo: 0,
        incluir_iva: false,
        iva: 0,
        subtotal: 0,
        total: 0,

        // Status
        estatus: 'recibido',
        pagado: false,
        entregado: false
    });

    const [parts, setParts] = useState([]);
    const [files, setFiles] = useState([]);
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
                if (service.inventario_materiales) {
                    if (typeof service.inventario_materiales === 'string') {
                        loadedParts = JSON.parse(service.inventario_materiales);
                    } else {
                        loadedParts = service.inventario_materiales;
                    }
                } else if (service.repuestos_descripcion && service.repuestos_descripcion.trim().startsWith('[')) {
                    loadedParts = JSON.parse(service.repuestos_descripcion);
                }

                loadedParts = loadedParts.map(p => ({
                    id: p.id || Date.now() + Math.random(),
                    cantidad: p.cantidad || 1,
                    producto: p.producto || p.descripcion || '',
                    costoPublico: p.costoPublico || p.precio_publico || 0,
                    costoEmpresa: p.costoEmpresa || p.costo_empresa || 0,
                    numeroSerie: p.numeroSerie || ''
                }));
            } catch (e) {
                console.error("Error parsing parts:", e);
            }
            setParts(loadedParts);

            let parsedDynamic = {};
            if (service.contenido_dinamico) {
                try {
                    parsedDynamic = typeof service.contenido_dinamico === 'string' ? JSON.parse(service.contenido_dinamico) : service.contenido_dinamico;
                } catch(e) { console.error("Error parsing dynamic content", e); }
            }
            if (Array.isArray(parsedDynamic)) parsedDynamic = {}; // fallback if old record is array

            setFormData({
                ...formData,
                ...service,
                ...parsedDynamic,
                fecha: formatDateForInput(service.servicio_fecha || service.fecha),
                tipos_camaras: Array.isArray(service.tipos_camaras) ? service.tipos_camaras.join(', ') : (service.tipos_camaras || ''),
                mano_obra: service.mano_obra || 0,
                repuestos_costo: service.materiales || service.repuestos_costo || 0,
                anticipo: service.anticipo || 0,
                estatus: service.estatus || 'recibido'
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

    const checklistOptions = [
        "Se explicó funcionamiento",
        "Se configuró app movil",
        "Se verificó grabación",
        "Se enseñó a exportar",
        "Se explicó garantia",
        "Se revisaron angulos",
        "Se entregaron credenciales"
    ];

    const handleChecklistChange = (option, checked) => {
        setIsDirty(true);
        let current = formData.trabajo_realizado ? formData.trabajo_realizado.split('\n').map(s => s.trim()).filter(Boolean) : [];
        if (checked) {
            if (!current.includes(option)) current.push(option);
        } else {
            current = current.filter(item => item !== option);
        }
        setFormData(prev => ({ ...prev, trabajo_realizado: current.join('\n') }));
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
                {/* Fixed Header */}
                <div className={`px-4 md:px-8 py-3 md:py-6 flex justify-between items-center border-b ${darkMode ? 'border-slate-700 bg-slate-800/90' : 'border-slate-100 bg-white/90'} backdrop-blur-md`}>
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2 md:p-3 bg-indigo-600 rounded-xl md:rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
                            <Video className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div>
                            <h2 className={`text-lg md:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                {service ? 'Editar Servicio' : 'Nuevo Servicio'} <span className="text-indigo-600">CCTV</span>
                            </h2>
                            <p className={`text-[10px] md:text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {service ? `Orden: #${service.servicio_numero}` : 'Instalación o Mantenimiento de Cámaras'}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                        <X className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
                    </button>
                </div>

                {/* Scrollable Form */}
                <form id="cctvForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-8">
                    {/* Basic Info Section */}
                    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
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
                                    placeholder="Nombre completo o Empresa"
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
                        <div className="col-span-3">
                            <label className={labelClass}>Dirección</label>
                            <input
                                type="text"
                                name="cliente_direccion"
                                value={formData.cliente_direccion || ''}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="Dirección completa"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
                        <div>
                            <label className={labelClass}>Fecha de Servicio</label>
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
                                placeholder="Nombre del instalador"
                            />
                        </div>
                    </div>

                    {/* Access Section */}
                    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-blue-50/30 border-blue-100'}`}>
                        <div className="flex items-center gap-2 mb-6 text-blue-600">
                            <ShieldCheck className="w-5 h-5" />
                            <h3 className="font-bold uppercase text-xs tracking-widest">Accesos y Configuración Red</h3>
                        </div>
                        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 mb-4">
                            <div>
                                <label className={labelClass}>IP Grabador / Dominio</label>
                                <input type="text" name="ip_grabador" value={formData.ip_grabador} onChange={handleChange} className={inputClass} placeholder="Ej: 192.168.1.64" />
                            </div>
                            <div>
                                <label className={labelClass}>Usuario</label>
                                <input type="text" name="usuario" value={formData.usuario} onChange={handleChange} className={inputClass} placeholder="Ej: admin" />
                            </div>
                            <div>
                                <label className={labelClass}>Contraseña</label>
                                <input type="text" name="contrasena" value={formData.contrasena} onChange={handleChange} className={inputClass} placeholder="Contraseña de acceso" />
                            </div>
                            <div>
                                <label className={labelClass}>ID P2P / Nube</label>
                                <input type="text" name="id_nube_p2p" value={formData.id_nube_p2p} onChange={handleChange} className={inputClass} placeholder="Código Cloud / SN" />
                            </div>
                        </div>
                        <div className="flex flex-col lg:grid lg:grid-cols-1 gap-6">
                            <div>
                                <label className={labelClass}>Dominio DDNS</label>
                                <input type="text" name="dominio_ddns" value={formData.dominio_ddns} onChange={handleChange} className={inputClass} placeholder="Ej: micam.ddns.net" />
                            </div>
                        </div>
                    </div>

                    {/* System Specs Section */}
                    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-indigo-50/30 border-indigo-100'}`}>
                        <div className="flex items-center gap-2 mb-6 text-indigo-600">
                            <Layout className="w-5 h-5" />
                            <h3 className="font-bold uppercase text-xs tracking-widest">Detalles del Sistema</h3>
                        </div>
                        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 mb-6">
                            <div>
                                <label className={labelClass}>Tipo de Servicio</label>
                                <select name="tipo_servicio" value={formData.tipo_servicio} onChange={handleChange} className={inputClass}>
                                    <option value="Instalacion">Instalación Nueva</option>
                                    <option value="Ampliacion">Ampliación</option>
                                    <option value="Configuracion">Configuración</option>
                                    <option value="Mantenimiento">Mantenimiento</option>
                                    <option value="Diagnostico">Diagnóstico / Revisión</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Marca Principal</label>
                                <input type="text" name="marca_principal" value={formData.marca_principal} onChange={handleChange} className={inputClass} placeholder="Ej: Hikvision, Dahua" />
                            </div>
                            <div>
                                <label className={labelClass}>Tipo de Grabador</label>
                                <select
                                    name="tipo_grabador"
                                    value={formData.tipo_grabador}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    <option value="DVR">DVR (Analógico)</option>
                                    <option value="NVR">NVR (IP)</option>
                                    <option value="XVR">XVR (Híbrido)</option>
                                    <option value="Cámara Wi-Fi">Cámara Wi-Fi</option>
                                    <option value="Otro">Otro</option>
                                    <option value="N/A">N/A</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Modelo Grabador</label>
                                <input
                                    type="text"
                                    name="sistema_modelo"
                                    value={formData.sistema_modelo}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="Ej: 7208HQHI"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
                            <div>
                                <label className={labelClass}>Tipos de Equipos (Cámaras)</label>
                                <input
                                    type="text"
                                    name="tipos_camaras"
                                    value={formData.tipos_camaras}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="Ej: ptz, ip, domo, bala"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Num. Cámaras</label>
                                <input
                                    type="number"
                                    name="cantidad_camaras"
                                    value={formData.cantidad_camaras}
                                    onChange={handleNumberChange}
                                    className={inputClass}
                                    min="0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Report Section */}
                    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-rose-50/30 border-rose-100'}`}>
                        {['Instalacion', 'Ampliacion', 'Configuracion'].includes(formData.tipo_servicio) ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 mb-4 text-emerald-500">
                                    <Settings className="w-5 h-5" />
                                    <h3 className="font-bold uppercase text-xs tracking-widest">Checklist de Actividades</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {checklistOptions.map(option => {
                                        const isChecked = (formData.trabajo_realizado || '').includes(option);
                                        return (
                                            <label key={option} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => handleChecklistChange(option, e.target.checked)}
                                                    className="w-5 h-5 text-emerald-600 rounded"
                                                />
                                                <span className={`${labelClass} !mb-0 cursor-pointer`}>{option}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <div className="mt-6">
                                    <label className={labelClass}>Observaciones Adicionales</label>
                                    <textarea
                                        name="observaciones"
                                        value={formData.observaciones}
                                        onChange={handleChange}
                                        className={`${inputClass} h-24 resize-none`}
                                        placeholder="Notas extras o detalles adicionales..."
                                    ></textarea>
                                </div>
                            </div>
                        ) : ['Mantenimiento', 'Diagnostico', 'Revision'].includes(formData.tipo_servicio) ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <div className="flex items-center gap-2 mb-4 text-amber-500">
                                            <Settings className="w-5 h-5" />
                                            <h3 className="font-bold uppercase text-xs tracking-widest">Falla Reportada</h3>
                                        </div>
                                        <textarea
                                            name="problema_reportado"
                                            value={formData.problema_reportado}
                                            onChange={handleChange}
                                            className={`${inputClass} h-32 resize-none`}
                                            placeholder="¿Qué falla presenta el equipo?"
                                        ></textarea>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-4 text-emerald-500">
                                            <Settings className="w-5 h-5" />
                                            <h3 className="font-bold uppercase text-xs tracking-widest">Solución Aplicada</h3>
                                        </div>
                                        <textarea
                                            name="trabajo_realizado"
                                            value={formData.trabajo_realizado}
                                            onChange={handleChange}
                                            className={`${inputClass} h-32 resize-none`}
                                            placeholder="Trabajo realizado para solucionarlo..."
                                        ></textarea>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Observaciones Adicionales</label>
                                    <textarea
                                        name="observaciones"
                                        value={formData.observaciones}
                                        onChange={handleChange}
                                        className={`${inputClass} h-20 resize-none`}
                                    ></textarea>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-4 text-emerald-500">
                                        <Settings className="w-5 h-5" />
                                        <h3 className="font-bold uppercase text-xs tracking-widest">Especificar Servicio</h3>
                                    </div>
                                    <textarea
                                        name="trabajo_realizado"
                                        value={formData.trabajo_realizado}
                                        onChange={handleChange}
                                        className={`${inputClass} h-32 resize-none`}
                                        placeholder="Describe a detalle el servicio realizado..."
                                    ></textarea>
                                </div>
                                <div>
                                    <label className={labelClass}>Observaciones Adicionales</label>
                                    <textarea
                                        name="observaciones"
                                        value={formData.observaciones}
                                        onChange={handleChange}
                                        className={`${inputClass} h-20 resize-none`}
                                    ></textarea>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Garantia Section */}
                    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-emerald-50/30 border-emerald-100'}`}>
                        <div className="flex items-center gap-2 mb-6 text-emerald-600">
                            <ShieldCheck className="w-5 h-5" />
                            <h3 className="font-bold uppercase text-xs tracking-widest">Información de Garantía</h3>
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                            <input type="checkbox" id="garantia_aplica" name="garantia_aplica" checked={formData.garantia_aplica} onChange={handleChange} className="w-5 h-5 text-emerald-600 rounded" />
                            <label htmlFor="garantia_aplica" className={labelClass + " mb-0 cursor-pointer"}>Aplica Garantía</label>
                        </div>
                        {formData.garantia_aplica && (
                            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 mb-4">
                                <div>
                                    <label className={labelClass}>Fecha de Inicio</label>
                                    <input type="date" name="garantia_fecha_inicio" value={formData.garantia_fecha_inicio} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Fecha de Vencimiento</label>
                                    <input type="date" name="garantia_fecha_vencimiento" value={formData.garantia_fecha_vencimiento} onChange={handleChange} className={inputClass} />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelClass}>Detalles de Garantía</label>
                                    <textarea name="garantia_detalles" value={formData.garantia_detalles} onChange={handleChange} className={`${inputClass} min-h-[60px] resize-y`} placeholder="Condiciones de la garantía..."></textarea>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Parts List Section */}
                      <PartsList parts={parts} setParts={setParts} darkMode={darkMode} setShowQuoteSelector={setShowQuoteSelector} setIsDirty={setIsDirty} />

                    {/* Photos Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-500">
                            <Image className="w-5 h-5" />
                            <h3 className="font-bold uppercase text-xs tracking-widest">Evidencia Fotográfica</h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {existingPhotos.map((photo) => (
                                <div key={photo.id} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200">
                                    <img src={photo.uri} alt="Evidencia" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteExisting(photo.id)}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-sm hover:bg-red-600 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            {files.map((file, index) => (
                                <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-blue-500 border-dashed bg-blue-50/30 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-blue-600 text-center px-2 truncate w-full">{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="absolute top-1 right-1 p-1 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                            <label className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${darkMode ? 'border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/5' : 'border-slate-200 hover:border-indigo-500 hover:bg-indigo-50'} `}>
                                <Plus className="w-8 h-8 text-slate-400 mb-2" />
                                <span className="text-[10px] font-black uppercase text-slate-400">Subir Fotos</span>
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
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
                                        className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 px-4 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2"
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

export default CCTVServiceForm;
