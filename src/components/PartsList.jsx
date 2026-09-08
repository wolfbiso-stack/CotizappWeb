import React, { useState } from 'react';
import { ShoppingCart, Plus, FolderOpen, Trash2, Edit2, ChevronUp } from 'lucide-react';

export default function PartsList({ parts, setParts, darkMode, setShowQuoteSelector, setIsDirty }) {
    const [expandedPartId, setExpandedPartId] = useState(null);

    const addPart = () => {
        if (setIsDirty) setIsDirty(true);
        const newId = Date.now();
        setParts([...parts, {
            id: newId,
            cantidad: 1,
            producto: '',
            costoEmpresa: '',
            costoPublico: '',
            numeroSerie: ''
        }]);
        setExpandedPartId(newId); // auto-expand the new part
    };

    const removePart = (id) => {
        if (setIsDirty) setIsDirty(true);
        setParts(parts.filter(p => p.id !== id));
    };

    const updatePart = (id, field, value) => {
        if (setIsDirty) setIsDirty(true);
        setParts(parts.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const toggleExpand = (id) => {
        if (expandedPartId === id) {
            setExpandedPartId(null);
        } else {
            setExpandedPartId(id);
        }
    };

    const inputClass = `w-full p-3 rounded-xl border transition-all ${
        darkMode
            ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
    }`;

    return (
        <div className={`p-6 rounded-2xl border transition-all ${darkMode ? 'bg-slate-900/40 border-slate-700' : 'bg-gray-50/50 border-slate-100'}`}>
            <div className="flex flex-col justify-start items-start gap-4 mb-6 w-full">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Repuestos y Materiales</h3>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Desglose de refacciones utilizadas</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3 mb-6">
                {parts.length === 0 ? (
                    <div className={`text-center py-8 rounded-2xl border border-dashed ${darkMode ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                        <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No se han agregado repuestos</p>
                    </div>
                ) : (
                    parts.map((part) => (
                        <div key={part.id} className={`rounded-2xl border overflow-hidden transition-all ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                            {/* COLLAPSED VIEW (Summary) */}
                            {expandedPartId !== part.id ? (
                                <div className="flex justify-between items-center p-4 cursor-pointer hover:bg-black/5" onClick={() => toggleExpand(part.id)}>
                                    <div className="flex-1 min-w-0 pr-4">
                                        <p className={`font-semibold truncate text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                            {part.producto || 'Nuevo repuesto sin nombre'}
                                        </p>
                                        <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Cant: {part.cantidad} | Subtotal: ${((parseFloat(part.cantidad) || 0) * (parseFloat(part.costoPublico) || 0)).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleExpand(part.id); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); removePart(part.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* EXPANDED VIEW (Form) */
                                <div className="p-4">
                                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
                                        <span className="text-xs font-bold uppercase text-slate-400">Editando Repuesto</span>
                                        <button type="button" onClick={() => toggleExpand(part.id)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                                            <ChevronUp className="w-5 h-5 text-slate-500" />
                                        </button>
                                    </div>

                                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
                                        {/* Mobile: Top Row for Producto (full width) */}
                                        <div className="flex-1 w-full">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-[10px] uppercase font-black text-slate-400 ml-1">Producto / Material</label>
                                            </div>
                                            <input
                                                type="text"
                                                value={part.producto}
                                                onChange={(e) => updatePart(part.id, 'producto', e.target.value)}
                                                className={inputClass}
                                                placeholder="Descripción completa del artículo..."
                                            />
                                        </div>

                                        {/* Mobile: Grid for numbers, Desktop: Row */}
                                        <div className="grid grid-cols-2 lg:flex lg:flex-row w-full lg:w-auto gap-3 lg:items-end">
                                            <div className="w-full lg:w-20">
                                                <label className="block text-[10px] uppercase font-black text-slate-400 mb-1 ml-1 lg:text-center">Cant.</label>
                                                <input
                                                    type="number"
                                                    value={part.cantidad}
                                                    onChange={(e) => updatePart(part.id, 'cantidad', e.target.value)}
                                                    className={`${inputClass} text-center px-1`}
                                                    min="0"
                                                />
                                            </div>
                                            
                                            <div className="w-full lg:w-32">
                                                <label className="block text-[10px] uppercase font-black text-rose-400 mb-1 ml-1">C. Empresa</label>
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
                                            <div className="w-full lg:w-32">
                                                <label className="block text-[10px] uppercase font-black text-blue-400 mb-1 ml-1">C. Público</label>
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
                                            <div className="w-full lg:w-32">
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
                                            
                                            {/* Trash icon only shows on desktop here */}
                                            <div className="hidden lg:block lg:w-auto flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => removePart(part.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mb-1"
                                                    title="Eliminar Item"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end lg:hidden">
                                        <button type="button" onClick={() => removePart(part.id)} className="flex items-center gap-2 text-red-500 text-sm font-bold p-2">
                                            <Trash2 className="w-4 h-4"/> Eliminar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Buttons moved to the BOTTOM of the parts list */}
            <div className="flex flex-col sm:flex-row w-full gap-2">
                <button
                    type="button"
                    onClick={addPart}
                    className={`flex justify-center items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-sm flex-1 ${darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'}`}
                >
                    <Plus className="w-5 h-5" /> Agregar Repuesto
                </button>
                <button
                    type="button"
                    onClick={() => setShowQuoteSelector(true)}
                    className={`flex justify-center items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-sm flex-1 ${darkMode ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-900/70' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'}`}
                >
                    <FolderOpen className="w-5 h-5" /> Desde Cotización
                </button>
            </div>
        </div>
    );
}
