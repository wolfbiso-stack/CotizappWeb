import React, { useState, useMemo } from 'react';
import { Calendar, Plus, Search, Eye, Edit2, CheckCircle, XCircle, FileText, Download, MapPin, Phone, User, Info, DollarSign, Clock } from 'lucide-react';
import { supabase } from '../../utils/supabase'; // Will adjust import depth if needed
import { jsPDF } from 'jspdf';
import { formatCurrency, formatServiceDate, formatDateForInput, dateToAndroidString } from '../utils/format';

const CitasView = ({ citas = [], fetchCitas, user, darkMode = false }) => {
    // Basic Boilerplate for structure
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        fecha: '', hora: '', tecnico_nombre: '', cliente_nombre: '',
        cliente_telefono: '', cliente_ubicacion: '', cliente_direccion: '',
        motivo: '', notas: '', costo: 0, estatus: 'Pendiente'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [selectedCita, setSelectedCita] = useState(null); // For View/Edit
    const [isViewMode, setIsViewMode] = useState(false);

    // Filtered Citas
    const filteredCitas = useMemo(() => {
        if (!searchTerm) return citas;
        const term = searchTerm.toLowerCase();
        return citas.filter(c =>
            (c.folio && c.folio.toLowerCase().includes(term)) ||
            (c.cliente_nombre && c.cliente_nombre.toLowerCase().includes(term)) ||
            (c.tecnico_nombre && c.tecnico_nombre.toLowerCase().includes(term))
        );
    }, [citas, searchTerm]);

    const handleOpenForm = (cita = null, viewMode = false) => {
        setIsViewMode(viewMode);
        if (cita) {
            setSelectedCita(cita);
            setFormData({
                fecha: cita.fecha ? formatDateForInput(cita.fecha) : '',
                hora: cita.hora || '',
                tecnico_nombre: cita.tecnico_nombre || '',
                cliente_nombre: cita.cliente_nombre || '',
                cliente_telefono: cita.cliente_telefono || '',
                cliente_ubicacion: cita.cliente_ubicacion || '',
                cliente_direccion: cita.cliente_direccion || '',
                motivo: cita.motivo || '',
                notas: cita.notas || '',
                costo: cita.costo || 0,
                estatus: cita.estatus || 'Pendiente'
            });
        } else {
            setSelectedCita(null);
            setFormData({
                fecha: new Date().toLocaleDateString('en-CA'),
                hora: new Date().toTimeString().substring(0, 5),
                tecnico_nombre: '', cliente_nombre: '',
                cliente_telefono: '', cliente_ubicacion: '', cliente_direccion: '',
                motivo: '', notas: '', costo: 0, estatus: 'Pendiente'
            });
        }
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setSelectedCita(null);
        setIsViewMode(false);
    };

    // UI Helpers
    const baseCard = `rounded-xl shadow-sm border p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`;
    const headClass = `text-left py-4 px-4 font-bold text-xs uppercase tracking-wider ${darkMode ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`;
    const cellClass = `py-4 px-4 text-sm ${darkMode ? 'text-slate-300 border-slate-700/50' : 'text-slate-600 border-slate-50'}`;
    const inputClass = `w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${darkMode ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'}`;

    const renderStatusBadge = (status) => {
        let colorClass = 'bg-slate-100 text-slate-600';
        if (status === 'Pendiente') colorClass = 'bg-yellow-100 text-yellow-700';
        if (status === 'Atendida') colorClass = 'bg-emerald-100 text-emerald-700';
        if (status === 'Cancelada') colorClass = 'bg-red-100 text-red-700';

        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${colorClass}`}>
                {status || 'Desconocido'}
            </span>
        );
    };

    // Calculate Next Folio
    const generateNextFolio = () => {
        const year = new Date().getFullYear();
        if (!citas || citas.length === 0) return `V-${year}-100`;

        // Find the latest folio matching this year to increment
        const yearCitas = citas.filter(c => c.folio && c.folio.startsWith(`V-${year}-`));
        if (yearCitas.length === 0) return `V-${year}-100`;

        const maxInc = yearCitas.reduce((max, c) => {
            const parts = c.folio.split('-');
            const num = parseInt(parts[2]);
            return !isNaN(num) && num > max ? num : max;
        }, 99);

        return `V-${year}-${maxInc + 1}`;
    };

    const handleSaveCita = async (e) => {
        e.preventDefault();
        if (!user) return alert("Error de sesión");
        setIsSaving(true);

        try {
            const isEditing = !!selectedCita;

            const dbFecha = dateToAndroidString(formData.fecha);

            const payload = {
                ...formData,
                fecha: dbFecha,
                costo: Number(formData.costo) || 0,
                user_id: user.id,
                updated_at: new Date().toISOString()
            };

            if (isEditing) {
                const { error } = await supabase.from('citas').update(payload).eq('id', selectedCita.id);
                if (error) throw error;
            } else {
                payload.folio = generateNextFolio();
                const { error } = await supabase.from('citas').insert([payload]);
                if (error) throw error;
            }

            await fetchCitas();
            handleCloseForm();
        } catch (error) {
            console.error("Error guardando cita:", error);
            alert("Hubo un error al guardar la cita.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleQuickStatusUpdate = async (id, newStatus) => {
        try {
            const { error } = await supabase.from('citas').update({ estatus: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
            if (error) throw error;
            fetchCitas();
        } catch (error) {
            console.error("Error actualizando estatus:", error);
            alert("No se pudo actualizar el estatus");
        }
    };

    const handleExportPDF = () => {
        if (!selectedCita) return;
        const doc = new jsPDF();

        // Header
        doc.setFillColor(37, 99, 235); // Blue 600
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("Detalles de Cita", 20, 25);
        doc.setFontSize(12);
        doc.text(`Folio: ${selectedCita.folio}`, 150, 25);

        // Content
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);

        let yPos = 55;
        const addSection = (title, items) => {
            doc.setFont("helvetica", "bold");
            doc.text(title, 20, yPos);
            doc.line(20, yPos + 2, 190, yPos + 2);
            yPos += 10;
            doc.setFont("helvetica", "normal");

            items.forEach(item => {
                doc.setFont("helvetica", "bold");
                doc.text(`${item.label}:`, 20, yPos);
                doc.setFont("helvetica", "normal");

                // Handle long text wrapping
                const textLines = doc.splitTextToSize(item.value || 'N/A', 130);
                doc.text(textLines, 60, yPos);
                yPos += (textLines.length * 6);
            });
            yPos += 10;
        };

        addSection('Información del Cliente', [
            { label: 'Nombre', value: selectedCita.cliente_nombre },
            { label: 'Teléfono', value: selectedCita.cliente_telefono },
            { label: 'Dirección', value: selectedCita.cliente_direccion },
            { label: 'Ubicación', value: selectedCita.cliente_ubicacion }
        ]);

        addSection('Programación', [
            { label: 'Fecha', value: formatServiceDate(selectedCita.fecha) },
            { label: 'Hora', value: selectedCita.hora },
            { label: 'Técnico', value: selectedCita.tecnico_nombre },
            { label: 'Estatus', value: selectedCita.estatus }
        ]);

        addSection('Detalles y Costos', [
            { label: 'Motivo', value: selectedCita.motivo },
            { label: 'Costo', value: `$${formatCurrency(selectedCita.costo || 0)}` },
            { label: 'Notas', value: selectedCita.notas }
        ]);

        doc.save(`Cita_${selectedCita.folio}_${selectedCita.cliente_nombre}.pdf`);
    };

    return (
        <div className="animate-in fade-in duration-300 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                    <h2 className={`text-2xl font-black flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        <Calendar className="w-6 h-6 text-blue-500" />
                        Gestión de Citas
                    </h2>
                    <p className={`text-sm mt-1 mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Administra tus visitas, mantenimientos y servicios programados
                    </p>

                    <div className="relative w-full md:max-w-md">
                        <Search className={`absolute left-3 top-3 w-5 h-5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input
                            type="text"
                            placeholder="Buscar por folio, cliente o técnico..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`${inputClass} pl-10`}
                        />
                    </div>
                </div>
                <button
                    onClick={() => handleOpenForm()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-95 whitespace-nowrap"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Cita
                </button>
            </div>

            <div className={baseCard}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className={headClass}>Folio</th>
                                <th className={headClass}>Cliente</th>
                                <th className={headClass}>Fecha y Hora</th>
                                <th className={headClass}>Técnico</th>
                                <th className={headClass}>Estatus</th>
                                <th className={`${headClass} text-center`}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCitas.map((cita) => (
                                <tr key={cita.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className={cellClass}>
                                        <span className="font-bold text-blue-500">
                                            {cita.folio}
                                        </span>
                                    </td>
                                    <td className={cellClass}>
                                        <p className="font-bold">{cita.cliente_nombre}</p>
                                        <p className="text-xs opacity-70 flex items-center gap-1"><Phone className="w-3 h-3" /> {cita.cliente_telefono || 'Sin Tel.'}</p>
                                    </td>
                                    <td className={cellClass}>
                                        <p className="font-medium">{formatServiceDate(cita.fecha)}</p>
                                        <p className="text-xs opacity-70 flex items-center gap-1"><Clock className="w-3 h-3" /> {cita.hora}</p>
                                    </td>
                                    <td className={cellClass}>{cita.tecnico_nombre || '-'}</td>
                                    <td className={cellClass}>{renderStatusBadge(cita.estatus)}</td>
                                    <td className={`${cellClass} text-center`}>
                                        <div className="flex flex-wrap items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                            {/* Acción Ver */}
                                            <button onClick={() => handleOpenForm(cita, true)} className="p-1.5 hover:bg-white dark:hover:bg-slate-900 rounded-lg text-blue-500 hover:shadow-sm" title="Ver Cita">
                                                <Eye className="w-4 h-4" />
                                            </button>

                                            {/* Acción Editar */}
                                            <button onClick={() => handleOpenForm(cita, false)} className="p-1.5 hover:bg-white dark:hover:bg-slate-900 rounded-lg text-slate-500 hover:shadow-sm" title="Editar Cita">
                                                <Edit2 className="w-4 h-4" />
                                            </button>

                                            {/* Acciones Rápidas Status */}
                                            {cita.estatus !== 'Atendida' && (
                                                <button onClick={() => handleQuickStatusUpdate(cita.id, 'Atendida')} className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg text-emerald-500 hover:shadow-sm" title="Marcar como Atendida">
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            {cita.estatus !== 'Cancelada' && (
                                                <button onClick={() => handleQuickStatusUpdate(cita.id, 'Cancelada')} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-500 hover:shadow-sm" title="Marcar como Cancelada">
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredCitas.length === 0 && (
                                <tr>
                                    <td colSpan="6" className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        No hay citas registradas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Formulario */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => handleCloseForm()}></div>
                    <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                        {/* Header */}
                        <div className={`sticky top-0 z-10 px-6 py-5 border-b backdrop-blur-md flex justify-between items-center ${darkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                    {isViewMode ? <Eye className="w-5 h-5" /> : selectedCita ? <Edit2 className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className={`font-black text-xl ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                        {isViewMode ? 'Detalles de la Cita' : selectedCita ? 'Editar Cita' : 'Nueva Cita'}
                                    </h3>
                                    {selectedCita && (
                                        <p className="text-xs text-blue-500 font-bold mt-0.5">{selectedCita.folio}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isViewMode && selectedCita && (
                                    <button type="button" onClick={handleExportPDF} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                                        <Download className="w-4 h-4" /> PDF
                                    </button>
                                )}
                                <button onClick={handleCloseForm} type="button" className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Body Form */}
                        <form onSubmit={handleSaveCita} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Sección Fecha y Hora */}
                                <div className="space-y-4 md:col-span-2 bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                                    <h4 className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-blue-400' : 'text-blue-600'} flex items-center gap-2`}>
                                        <Clock className="w-4 h-4" /> Programación
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Fecha</label>
                                            <input type="date" required disabled={isViewMode} value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Hora</label>
                                            <input type="time" required disabled={isViewMode} value={formData.hora} onChange={(e) => setFormData({ ...formData, hora: e.target.value })} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Estatus</label>
                                            <select disabled={isViewMode} value={formData.estatus} onChange={(e) => setFormData({ ...formData, estatus: e.target.value })} className={`${inputClass} font-semibold`}>
                                                <option value="Pendiente">Pendiente</option>
                                                <option value="Atendida">Atendida</option>
                                                <option value="Cancelada">Cancelada</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Sección Cliente */}
                                <div className="space-y-4">
                                    <h4 className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'} flex items-center gap-2`}><User className="w-4 h-4" /> Cliente</h4>
                                    <div>
                                        <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Nombre del Cliente</label>
                                        <input type="text" required disabled={isViewMode} placeholder="Nombre completo" value={formData.cliente_nombre} onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Teléfono</label>
                                        <input type="tel" disabled={isViewMode} placeholder="Ej. 1234567890" value={formData.cliente_telefono} onChange={(e) => setFormData({ ...formData, cliente_telefono: e.target.value })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Ubicación / Coordenadas</label>
                                        <input type="text" disabled={isViewMode} placeholder="Opcional. Link de Maps o coordenadas" value={formData.cliente_ubicacion} onChange={(e) => setFormData({ ...formData, cliente_ubicacion: e.target.value })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Dirección</label>
                                        <textarea disabled={isViewMode} rows={2} placeholder="Calle, número, colonia..." value={formData.cliente_direccion} onChange={(e) => setFormData({ ...formData, cliente_direccion: e.target.value })} className={`${inputClass} resize-none`} />
                                    </div>
                                </div>

                                {/* Detalles Cita */}
                                <div className="space-y-4">
                                    <h4 className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'} flex items-center gap-2`}><Info className="w-4 h-4" /> Detalles</h4>
                                    <div>
                                        <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Motivo de la cita</label>
                                        <input type="text" disabled={isViewMode} required placeholder="Ej. Revisión de equipos, Instalación..." value={formData.motivo} onChange={(e) => setFormData({ ...formData, motivo: e.target.value })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Técnico Asignado</label>
                                        <input type="text" disabled={isViewMode} placeholder="Nombre del técnico" value={formData.tecnico_nombre} onChange={(e) => setFormData({ ...formData, tecnico_nombre: e.target.value })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Costo Anticipado / Cobro</label>
                                        <div className="relative">
                                            <DollarSign className={`absolute left-3 top-3 w-5 h-5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                            <input type="number" step="0.01" disabled={isViewMode} min={0} value={formData.costo} onChange={(e) => setFormData({ ...formData, costo: e.target.value })} className={`${inputClass} pl-10`} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Notas internas</label>
                                        <textarea disabled={isViewMode} rows={2} placeholder="Comentarios privados..." value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} className={`${inputClass} resize-none`} />
                                    </div>
                                </div>
                            </div>

                            {/* Acciones Modal */}
                            {!isViewMode && (
                                <div className={`mt-8 pt-5 border-t flex justify-end gap-3 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                                    <button
                                        type="button"
                                        onClick={handleCloseForm}
                                        disabled={isSaving}
                                        className={`px-6 py-2.5 rounded-xl font-bold transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
                                    >
                                        {isSaving ? (
                                            <>Guardando...</>
                                        ) : selectedCita ? (
                                            <>
                                                <CheckCircle className="w-5 h-5" />
                                                Actualizar Cita
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-5 h-5" />
                                                Crear Cita
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CitasView;
