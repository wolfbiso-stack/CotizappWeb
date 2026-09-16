import React, { useState } from 'react';
import { generateBillOfMaterials, MATERIAL_CATEGORIES } from '../utils/materials';
import { generateQuantification } from '../utils/measurements';
import { calculateEconomics } from '../utils/economics';
import { 
    Settings, Info, ChevronDown, ChevronRight, Edit2, RotateCcw, 
    Box, DollarSign, AlertTriangle, Plus, Trash2, CheckCircle, Calculator
} from 'lucide-react';

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(value);
};

const EconomicsPanel = ({ state, dispatch, analysisResults, darkMode }) => {
    const [expandedCats, setExpandedCats] = useState(
        Object.values(MATERIAL_CATEGORIES).reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
    );
    const [activeSection, setActiveSection] = useState('materials'); // materials, labor, additional, summary

    if (!analysisResults) return null;
    const quant = generateQuantification(state, analysisResults);
    const bom = generateBillOfMaterials(state, quant);
    if (!bom) return null;

    const economics = calculateEconomics(state, bom, quant);
    if (!economics) return null;

    const toggleCat = (cat) => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
    const inputClass = `w-full px-2 py-1 border rounded text-sm text-right ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`;
    const btnClass = `flex items-center justify-center gap-1 px-3 py-1.5 rounded font-bold text-xs transition-colors`;

    const handleMaterialCostChange = (id, valStr) => {
        const val = parseFloat(valStr);
        if (!isNaN(val) && val >= 0) {
            dispatch({ type: 'SET_MATERIAL_COST', payload: { materialId: id, unitCost: val, isManual: true } });
        } else if (valStr === '') {
             // Reset to warning
            dispatch({ type: 'SET_MATERIAL_COST', payload: { materialId: id, unitCost: undefined, isManual: false } });
        }
    };

    const handleNoCost = (id) => {
        dispatch({ type: 'SET_MATERIAL_COST', payload: { materialId: id, unitCost: 0, isManual: true } });
    };

    return (
        <div className="flex-1 overflow-y-auto flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative">
            
            {/* Cabecera / Navegación interna */}
            <div className={`sticky top-0 z-10 flex border-b ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <button onClick={() => setActiveSection('materials')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeSection === 'materials' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-700'}`}>
                    Materiales {economics.summary.hasWarnings && <span className="inline-block w-2 h-2 rounded-full bg-red-500 ml-1"></span>}
                </button>
                <button onClick={() => setActiveSection('labor')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeSection === 'labor' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-700'}`}>
                    Mano de Obra
                </button>
                <button onClick={() => setActiveSection('additional')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeSection === 'additional' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-700'}`}>
                    Adicional
                </button>
                <button onClick={() => setActiveSection('summary')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeSection === 'summary' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-700'}`}>
                    Resumen
                </button>
            </div>

            {/* SECCIÓN MATERIALES */}
            {activeSection === 'materials' && (
                <div className="flex-1 pb-4">
                    {economics.summary.hasWarnings && (
                        <div className="m-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded flex gap-2 items-start text-xs text-red-700 dark:text-red-400">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Faltan costos de materiales</p>
                                <p>Por favor asigna un costo o marca como "Sin Costo" los conceptos pendientes para tener un cálculo exacto.</p>
                            </div>
                        </div>
                    )}

                    {Object.values(MATERIAL_CATEGORIES).map(cat => {
                        const items = economics.groupedMaterials[cat] || [];
                        if (items.length === 0) return null;

                        let catTotal = items.reduce((s, m) => s + m.subtotal, 0);

                        return (
                            <div key={cat} className="mb-2">
                                <button 
                                    onClick={() => toggleCat(cat)}
                                    className={`w-full flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}
                                >
                                    <span>{cat}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-blue-600 dark:text-blue-400">{formatCurrency(catTotal)}</span>
                                        {expandedCats[cat] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </div>
                                </button>
                                
                                {expandedCats[cat] && (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {items.map(item => (
                                            <div key={item.id} className={`p-3 ${item.costStatus === 'WARNING' ? 'bg-red-50/50 dark:bg-red-900/10' : darkMode ? 'bg-slate-800/50' : 'bg-white'} hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="font-bold text-sm text-slate-800 dark:text-slate-200 pr-2 leading-tight">
                                                        {item.name}
                                                        <div className="text-xs font-normal text-slate-500 mt-1">Cant: {item.quantity} {item.unit}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-sm text-blue-600 dark:text-blue-400">{formatCurrency(item.subtotal)}</div>
                                                        {item.costStatus === 'WARNING' && <div className="text-[10px] text-red-500 font-bold uppercase">Falta costo</div>}
                                                        {item.costStatus === 'NO_COST' && <div className="text-[10px] text-slate-400 font-bold uppercase">Sin costo</div>}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs font-bold text-slate-500 w-16">P. Unit:</span>
                                                    <div className="relative flex-1">
                                                        <span className="absolute left-2 top-1.5 text-slate-400 text-xs">$</span>
                                                        <input 
                                                            type="number" 
                                                            step="0.01"
                                                            value={item.unitCost === undefined ? '' : item.unitCost}
                                                            onChange={(e) => handleMaterialCostChange(item.id, e.target.value)}
                                                            className={`${inputClass} pl-5`}
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    {item.costStatus === 'WARNING' && (
                                                        <button 
                                                            onClick={() => handleNoCost(item.id)}
                                                            className="px-2 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-[10px] font-bold uppercase transition-colors"
                                                            title="Marcar sin costo"
                                                        >
                                                            Zero
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* SECCIÓN MANO DE OBRA */}
            {activeSection === 'labor' && (
                <div className="p-4 flex-1">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-sm">Mano de Obra</h3>
                        <button 
                            onClick={() => {
                                const id = 'labor_' + Date.now();
                                dispatch({ type: 'ADD_LABOR_ITEM', payload: { id, name: 'Nueva Tarea', type: 'FIXED', source: null, quantity: 1, unit: 'servicio', unitCost: 0 } });
                            }}
                            className={`${btnClass} bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400`}
                        >
                            <Plus className="w-3 h-3" /> Agregar
                        </button>
                    </div>

                    {economics.laborCosts.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No hay conceptos de mano de obra registrados.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {economics.laborCosts.map(labor => (
                                <div key={labor.id} className={`p-3 rounded border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                    <div className="flex justify-between mb-2">
                                        <input 
                                            type="text" 
                                            value={labor.name}
                                            onChange={(e) => dispatch({ type: 'UPDATE_LABOR_ITEM', payload: { id: labor.id, updates: { name: e.target.value } } })}
                                            className={`font-bold text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 flex-1 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}
                                            placeholder="Nombre del trabajo"
                                        />
                                        <button onClick={() => dispatch({ type: 'REMOVE_LABOR_ITEM', payload: labor.id })} className="text-red-400 hover:text-red-600 px-2"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                            <select 
                                                value={labor.type}
                                                onChange={(e) => {
                                                    const type = e.target.value;
                                                    let source = null, unit = 'servicio';
                                                    if (type === 'PER_METER') { source = 'fenceLength'; unit = 'm'; }
                                                    if (type === 'PER_PIECE') { source = 'totalPosts'; unit = 'pza'; }
                                                    dispatch({ type: 'UPDATE_LABOR_ITEM', payload: { id: labor.id, updates: { type, source, unit } } });
                                                }}
                                                className={`w-full px-2 py-1 border rounded text-xs ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                                            >
                                                <option value="FIXED">Fijo / Manual</option>
                                                <option value="PER_METER">Por Metro (V5)</option>
                                                <option value="PER_PIECE">Por Poste (V5)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Costo Unit.</label>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1 text-slate-400 text-xs">$</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={labor.unitCost || ''}
                                                    onChange={(e) => dispatch({ type: 'UPDATE_LABOR_ITEM', payload: { id: labor.id, updates: { unitCost: parseFloat(e.target.value) || 0 } } })}
                                                    className={`${inputClass} pl-5 text-xs`}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-900 p-2 rounded text-xs mt-2">
                                        <div>
                                            <span className="text-slate-500">Cant: </span>
                                            <span className="font-bold">{labor.quantity.toFixed(2)} {labor.unit}</span>
                                            {labor.source && <span className="text-[9px] text-blue-500 ml-1 uppercase">(Auto)</span>}
                                        </div>
                                        <div className="font-bold text-blue-600 dark:text-blue-400">
                                            {formatCurrency(labor.subtotal)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* SECCIÓN ADICIONALES */}
            {activeSection === 'additional' && (
                <div className="p-4 flex-1">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-sm">Costos Adicionales</h3>
                        <button 
                            onClick={() => {
                                const id = 'add_' + Date.now();
                                dispatch({ type: 'ADD_ADDITIONAL_COST', payload: { id, name: 'Gasto adicional', quantity: 1, unit: 'pago', unitCost: 0 } });
                            }}
                            className={`${btnClass} bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400`}
                        >
                            <Plus className="w-3 h-3" /> Agregar
                        </button>
                    </div>

                    {economics.additionalCosts.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No hay costos adicionales registrados.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {economics.additionalCosts.map(item => (
                                <div key={item.id} className={`p-3 rounded border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                    <div className="flex justify-between mb-2">
                                        <input 
                                            type="text" 
                                            value={item.name}
                                            onChange={(e) => dispatch({ type: 'UPDATE_ADDITIONAL_COST', payload: { id: item.id, updates: { name: e.target.value } } })}
                                            className={`font-bold text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 flex-1 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}
                                            placeholder="Descripción"
                                        />
                                        <button onClick={() => dispatch({ type: 'REMOVE_ADDITIONAL_COST', payload: item.id })} className="text-red-400 hover:text-red-600 px-2"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2 mb-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cant</label>
                                            <input 
                                                type="number" 
                                                value={item.quantity || ''}
                                                onChange={(e) => dispatch({ type: 'UPDATE_ADDITIONAL_COST', payload: { id: item.id, updates: { quantity: parseFloat(e.target.value) || 0 } } })}
                                                className={`w-full px-2 py-1 border rounded text-xs ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Costo Unit.</label>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1 text-slate-400 text-xs">$</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={item.unitCost || ''}
                                                    onChange={(e) => dispatch({ type: 'UPDATE_ADDITIONAL_COST', payload: { id: item.id, updates: { unitCost: parseFloat(e.target.value) || 0 } } })}
                                                    className={`${inputClass} pl-5 text-xs`}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-900 p-2 rounded text-xs mt-2">
                                        <div className="text-slate-500 font-bold uppercase">Subtotal</div>
                                        <div className="font-bold text-blue-600 dark:text-blue-400">
                                            {formatCurrency(item.subtotal)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* SECCIÓN RESUMEN */}
            {activeSection === 'summary' && (
                <div className="p-4 flex-1">
                    <div className={`p-4 rounded-lg shadow-sm border mb-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <h3 className="font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-wide text-slate-500">
                            <Calculator className="w-4 h-4 text-blue-500" /> Resumen del Proyecto
                        </h3>
                        
                        <div className="space-y-2 text-sm mb-4">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Materiales:</span>
                                <span className="font-bold">{formatCurrency(economics.summary.totalMaterials)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Mano de Obra:</span>
                                <span className="font-bold">{formatCurrency(economics.summary.totalLabor)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Costos Adicionales:</span>
                                <span className="font-bold">{formatCurrency(economics.summary.totalAdditional)}</span>
                            </div>
                        </div>

                        <div className={`pt-3 border-t flex justify-between font-bold text-base mb-4 ${darkMode ? 'border-slate-700 text-blue-400' : 'border-slate-100 text-blue-700'}`}>
                            <span>Costo Directo:</span>
                            <span>{formatCurrency(economics.summary.directCost)}</span>
                        </div>

                        <div className={`p-3 rounded mb-4 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Utilidad sobre costo</label>
                            <div className="flex gap-2">
                                <select 
                                    value={economics.settings.marginType}
                                    onChange={(e) => dispatch({ type: 'UPDATE_ECONOMIC_SETTINGS', payload: { marginType: e.target.value } })}
                                    className={`flex-1 px-2 py-1.5 border rounded text-xs ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
                                >
                                    <option value="PERCENTAGE_ON_COST">Porcentaje (%)</option>
                                    <option value="FIXED_AMOUNT">Monto Fijo ($)</option>
                                </select>
                                <input 
                                    type="number"
                                    value={economics.settings.margin}
                                    onChange={(e) => dispatch({ type: 'UPDATE_ECONOMIC_SETTINGS', payload: { margin: parseFloat(e.target.value) || 0 } })}
                                    className={`w-24 px-2 py-1.5 border rounded text-xs text-right ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
                                />
                            </div>
                            <div className="flex justify-between items-center mt-2 text-xs">
                                <span className="text-slate-500">Monto Utilidad:</span>
                                <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(economics.summary.profit)}</span>
                            </div>
                        </div>

                        <div className={`pt-3 border-t flex justify-between items-end font-bold text-lg ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                            <span className="text-slate-800 dark:text-slate-200">PRECIO SUGERIDO</span>
                            <span className="text-orange-500 dark:text-orange-400 text-xl">{formatCurrency(economics.summary.suggestedPrice)}</span>
                        </div>
                    </div>

                    <div className={`p-4 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <h4 className="font-bold text-xs uppercase text-slate-500 mb-3">Indicadores</h4>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-500">Costo directo por metro:</span>
                            <span className="font-bold">{formatCurrency(economics.summary.costPerMeter)}/m</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-500">Precio sugerido por metro:</span>
                            <span className="font-bold">{formatCurrency(economics.summary.pricePerMeter)}/m</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">* Basado en la longitud lineal del proyecto ({economics.summary.fenceLengthMeters.toFixed(2)}m)</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EconomicsPanel;
