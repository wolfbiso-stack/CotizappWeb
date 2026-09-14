import React, { useState } from 'react';
import { generateBillOfMaterials, MATERIAL_CATEGORIES } from '../utils/materials';
import { generateQuantification } from '../utils/measurements';
import { Settings, Info, ChevronDown, ChevronRight, Edit2, RotateCcw, Box } from 'lucide-react';

const MaterialsPanel = ({ state, dispatch, analysisResults, darkMode }) => {
  const [expandedCats, setExpandedCats] = useState(
      Object.values(MATERIAL_CATEGORIES).reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
  );
  
  const [expandedInfo, setExpandedInfo] = useState({});

  if (!analysisResults) return null;
  const quant = generateQuantification(state, analysisResults);
  const bom = generateBillOfMaterials(state, quant);

  if (!bom) return null;

  const toggleCat = (cat) => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  const toggleInfo = (id) => setExpandedInfo(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex-1 overflow-y-auto flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      
      {/* Resumen */}
      <div className={`p-4 m-4 rounded border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
         <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
           <Box className="w-4 h-4 text-blue-500" /> Resumen de Materiales
         </h3>
         <div className="grid grid-cols-2 gap-y-2 text-xs">
           <div className="text-slate-500">Conceptos totales:</div><div className="font-bold text-right">{bom.summary.totalItems}</div>
           <div className="text-slate-500">Postes requeridos:</div><div className="font-bold text-right">{bom.summary.totalPosts}</div>
           <div className="text-slate-500">Aisladores requeridos:</div><div className="font-bold text-right">{bom.summary.totalInsulators}</div>
           <div className="text-slate-500">Longitud calculada:</div><div className="font-bold text-right">{quant?.fenceLengthFormatted || '0m'}</div>
         </div>
      </div>

      {/* Categorías */}
      <div className="flex-1 pb-4">
         {Object.values(MATERIAL_CATEGORIES).map(cat => {
            const items = bom.grouped[cat] || [];
            if (items.length === 0) return null;

            return (
              <div key={cat} className="mb-2">
                <button 
                  onClick={() => toggleCat(cat)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}
                >
                  <span>{cat}</span>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-[10px]">{items.length}</span>
                    {expandedCats[cat] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>
                
                {expandedCats[cat] && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                     {items.map(item => (
                       <div key={item.id} className={`p-3 ${darkMode ? 'hover:bg-slate-800/50' : 'bg-white hover:bg-slate-50'}`}>
                         <div className="flex justify-between items-start mb-1">
                           <div className="font-bold text-sm text-slate-800 dark:text-slate-200 pr-2">{item.name}</div>
                           <div className="flex flex-col items-end flex-shrink-0">
                              <span className="font-bold text-base text-blue-600 dark:text-blue-400">
                                {item.quantity} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">{item.unit}</span>
                              </span>
                              {item.isManual && <span className="text-[9px] bg-yellow-100 text-yellow-800 px-1 rounded uppercase font-bold mt-1">Manual</span>}
                           </div>
                         </div>
                         <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{item.description}</div>
                         
                         <div className="flex gap-2">
                            <button onClick={() => toggleInfo(item.id)} className="text-xs flex items-center gap-1 text-slate-400 hover:text-blue-500 transition-colors">
                              <Info className="w-3 h-3" /> Trazabilidad
                            </button>
                            {!item.isManual ? (
                               <button 
                                 onClick={() => {
                                     const qty = prompt(`Ingresa la cantidad manual para ${item.name}:`, item.quantity);
                                     if (qty !== null && !isNaN(qty)) {
                                         dispatch({ type: 'SET_MATERIAL_OVERRIDE', payload: { materialId: item.id, isManual: true, quantity: parseFloat(qty) } });
                                     }
                                 }}
                                 className="text-xs flex items-center gap-1 text-slate-400 hover:text-orange-500 transition-colors ml-auto"
                               >
                                 <Edit2 className="w-3 h-3" /> Ajustar
                               </button>
                            ) : (
                               <button 
                                 onClick={() => dispatch({ type: 'SET_MATERIAL_OVERRIDE', payload: { materialId: item.id, isManual: false, quantity: item.autoQuantity } })}
                                 className="text-xs flex items-center gap-1 text-orange-500 hover:text-orange-600 transition-colors font-bold ml-auto"
                               >
                                 <RotateCcw className="w-3 h-3" /> Restaurar Auto
                               </button>
                            )}
                         </div>

                         {/* Panel de Trazabilidad */}
                         {expandedInfo[item.id] && (
                           <div className={`mt-3 p-3 text-xs rounded border ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                             <div className="font-bold mb-1 flex items-center gap-1"><Settings className="w-3 h-3" /> Regla de Cálculo:</div>
                             <div className="font-mono text-[10px] mb-2 bg-slate-200 dark:bg-slate-800 p-1 rounded">{item.formula}</div>
                             <div className="font-bold mb-1">Origen de la cantidad:</div>
                             <div>{item.details}</div>
                             {item.isManual && (
                               <div className="mt-2 text-yellow-600 dark:text-yellow-500 font-bold">
                                 * La cantidad actual ({item.quantity}) fue fijada manualmente, ignorando el cálculo automático ({item.autoQuantity}).
                               </div>
                             )}
                           </div>
                         )}
                       </div>
                     ))}
                  </div>
                )}
              </div>
            );
         })}
      </div>

    </div>
  );
};

export default MaterialsPanel;
