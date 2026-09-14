import React from 'react';
import { useDesigner } from '../context/DesignerContext';
import { Settings, Trash2, Link, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { analyzeProject } from '../utils/connectivity';
import { generateQuantification } from '../utils/measurements';
import { Calculator } from 'lucide-react';
import MaterialsPanel from './MaterialsPanel';

const PropertiesPanel = ({ darkMode }) => {
  const { state, dispatch } = useDesigner();
  const selectedIds = state.ui.selectedElementIds;
  const [activeTab, setActiveTab] = React.useState('properties');
  const analysisResults = (activeTab === 'analysis' || activeTab === 'quantification' || activeTab === 'materials') ? analyzeProject(state) : null;
  
  const inputClass = `w-full px-3 py-2 border rounded text-sm ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`;
  
  const selectedElement = state.elements.find(el => el.id === selectedIds[0]) || state.segments.find(s => s.id === selectedIds[0]);

  const handleChange = (field, value) => {
    if (selectedElement.type === 'segment') {
       dispatch({ type: 'UPDATE_SEGMENT', payload: { id: selectedElement.id, updates: { [field]: value } } });
    } else {
       dispatch({ type: 'UPDATE_ELEMENT', payload: { id: selectedElement.id, updates: { [field]: value } } });
    }
  };

  const handlePropertyChange = (field, value) => {
    if (selectedElement.type === 'segment') {
       dispatch({ type: 'UPDATE_SEGMENT', payload: { id: selectedElement.id, updates: { properties: { ...selectedElement.properties, [field]: value } } } });
    } else {
       dispatch({ type: 'UPDATE_ELEMENT', payload: { id: selectedElement.id, updates: { properties: { ...selectedElement.properties, [field]: value } } } });
    }
  };

  const renderSpecificProperties = () => {
    if (!selectedElement) return null;
    
    switch (selectedElement.type) {
      case 'segment':
        return (
          <>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre del Tramo</label>
              <input type="text" value={selectedElement.properties?.name || ''} onChange={(e) => handlePropertyChange('name', e.target.value)} className={inputClass} />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Cantidad de Hilos</label>
              <input type="number" value={selectedElement.wireCount || 5} disabled className={inputClass + ' opacity-50'} title="Para cambiar la cantidad, debes redibujar el tramo (por ahora)" />
            </div>
          </>
        );
      case 'room':
      case 'wall':
        const wPx = Math.abs(selectedElement.width) || 0;
        const hPx = Math.abs(selectedElement.height) || 0;
        const anchoM = (wPx / 50).toFixed(2);
        const largoM = (hPx / 50).toFixed(2);
        
        const handleWidthChange = (e) => {
           const newM = parseFloat(e.target.value);
           if (isNaN(newM) || newM <= 0) return;
           const newPx = newM * 50;
           // Mantener el signo original para no invertir el elemento
           const newWidth = selectedElement.width < 0 ? -newPx : newPx;
           handleChange('width', newWidth);
        };
        
        const handleHeightChange = (e) => {
           const newM = parseFloat(e.target.value);
           if (isNaN(newM) || newM <= 0) return;
           const newPx = newM * 50;
           const newHeight = selectedElement.height < 0 ? -newPx : newPx;
           handleChange('height', newHeight);
        };
        
        return (
          <>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre</label>
              <input type="text" value={selectedElement.properties?.name || ''} onChange={(e) => handlePropertyChange('name', e.target.value)} className={inputClass} />
            </div>
            <div className="mb-4 flex gap-2">
               <div className="flex-1">
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Ancho X (m)</label>
                 <input type="number" step="0.1" value={anchoM} onChange={handleWidthChange} className={inputClass} />
               </div>
               <div className="flex-1">
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Largo Y (m)</label>
                 <input type="number" step="0.1" value={largoM} onChange={handleHeightChange} className={inputClass} />
               </div>
            </div>
            <p className="text-[10px] text-slate-400 mb-4 -mt-2">Escala visual: 50px = 1 metro</p>
            {selectedElement.type === 'wall' && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Altura de construcción (m)</label>
                <input type="number" step="0.1" value={selectedElement.properties?.wallHeight || 2.5} onChange={(e) => handlePropertyChange('wallHeight', parseFloat(e.target.value))} className={inputClass} />
              </div>
            )}
          </>
        );
      case 'post':
        return (
          <>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre</label>
              <input type="text" value={selectedElement.properties?.name || 'Poste'} onChange={(e) => handlePropertyChange('name', e.target.value)} className={inputClass} />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Tipo de Poste</label>
              <select value={selectedElement.properties?.postType || 'paso'} onChange={(e) => handlePropertyChange('postType', e.target.value)} className={inputClass}>
                <option value="paso">Poste de Paso</option>
                <option value="esquinero">Poste Esquinero</option>
                <option value="tensor">Poste Tensor</option>
              </select>
            </div>
          </>
        );
      case 'gate':
        return (
          <>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Tipo de Portón</label>
              <select value={selectedElement.properties?.gateType || 'vehicular'} onChange={(e) => handlePropertyChange('gateType', e.target.value)} className={inputClass}>
                <option value="vehicular">Vehicular</option>
                <option value="peatonal">Peatonal</option>
              </select>
            </div>
          </>
        );
      case 'energizer':
        return (
          <>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre / Modelo</label>
              <input type="text" value={selectedElement.properties?.name || 'Energizador'} onChange={(e) => handlePropertyChange('name', e.target.value)} className={inputClass} />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Voltaje (kV)</label>
              <input type="number" step="0.5" value={selectedElement.properties?.voltage || 12} onChange={(e) => handlePropertyChange('voltage', parseFloat(e.target.value))} className={inputClass} />
            </div>
          </>
        );
      case 'wire':
        const wireNodes = state.nodes.filter(n => n.wireId === selectedElement.id);
        const startNode = wireNodes.find(n => n.type === 'wire-start');
        const endNode = wireNodes.find(n => n.type === 'wire-end');
        
        let connectedStart = false;
        let connectedEnd = false;
        
        if (startNode) connectedStart = state.connections.some(c => c.fromNodeId === startNode.id || c.toNodeId === startNode.id);
        if (endNode) connectedEnd = state.connections.some(c => c.fromNodeId === endNode.id || c.toNodeId === endNode.id);
        
        let status = '⚪ Sin conectar';
        if (connectedStart && connectedEnd) status = '🟢 Conectado';
        else if (connectedStart || connectedEnd) status = '🟡 Parcial';
        
        return (
          <>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre</label>
              <input type="text" value={selectedElement.properties?.name || ''} onChange={(e) => handlePropertyChange('name', e.target.value)} className={inputClass} />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Número de Hilo</label>
              <input type="number" value={selectedElement.properties?.wireNumber || 1} onChange={(e) => handlePropertyChange('wireNumber', parseInt(e.target.value))} className={inputClass} />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Tipo de Hilo</label>
              <select value={selectedElement.properties?.wireType || 'unassigned'} onChange={(e) => handlePropertyChange('wireType', e.target.value)} className={inputClass}>
                <option value="unassigned">Por definir</option>
                <option value="line">Línea (Positivo)</option>
                <option value="ground">Tierra (Negativo)</option>
                <option value="return">Retorno</option>
              </select>
            </div>
            <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Estado</label>
              <div className="text-sm font-medium">{status}</div>
            </div>
          </>
        );
      default:
        return (
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre</label>
            <input type="text" value={selectedElement.properties?.name || ''} onChange={(e) => handlePropertyChange('name', e.target.value)} className={inputClass} />
          </div>
        );
    }
  };
  
  const renderConnectionsList = () => {
    if (!state.ui.designMode) return null;
    return (
       <div className={`mt-4 flex-1 overflow-y-auto border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4`}>
         <h2 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3 px-4">Conexiones ({state.connections.length})</h2>
         {state.connections.length === 0 ? (
            <p className="text-xs text-slate-400 px-4">No hay conexiones</p>
         ) : (
            <div className="px-2 space-y-2">
              {state.connections.map((conn, idx) => {
                 const fromNode = state.nodes.find(n => n.id === conn.fromNodeId);
                 const toNode = state.nodes.find(n => n.id === conn.toNodeId);
                 
                 const fromWire = fromNode ? state.elements.find(w => w.id === fromNode.wireId) : null;
                 const toWire = toNode ? state.elements.find(w => w.id === toNode.wireId) : null;
                 
                 const fromLabel = fromWire ? fromWire.properties?.name : 'Desconocido';
                 const toLabel = toWire ? toWire.properties?.name : 'Desconocido';
                 
                 return (
                    <div key={conn.id} className={`p-2 rounded border text-xs ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                       <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-500">{conn.type === 'bridge' ? 'Puente' : 'Continuidad'}</span>
                          <button onClick={() => dispatch({ type: 'REMOVE_CONNECTION', payload: conn.id })} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="truncate flex-1">{fromLabel}</span>
                          <Link className="w-3 h-3 flex-shrink-0 text-slate-400" />
                          <span className="truncate flex-1 text-right">{toLabel}</span>
                       </div>
                    </div>
                 );
              })}
            </div>
         )}
       </div>
    );
  };

  const renderAnalysis = () => {
    if (!analysisResults) return null;
    
    return (
      <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
        <div className={`p-4 rounded border ${analysisResults.summary.status === 'valid' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : analysisResults.summary.status === 'warning' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
           <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
             {analysisResults.summary.status === 'valid' && <CheckCircle className="w-4 h-4 text-green-500" />}
             {analysisResults.summary.status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
             {analysisResults.summary.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
             Resumen del Diseño
           </h3>
           <div className="grid grid-cols-2 gap-2 text-xs">
             <div>Hilos: <span className="font-bold">{analysisResults.summary.totalWires}</span></div>
             <div>Tramos: <span className="font-bold">{analysisResults.summary.totalSegments}</span></div>
             <div>Nodos: <span className="font-bold">{analysisResults.summary.totalNodes}</span></div>
             <div>Conexiones: <span className="font-bold">{analysisResults.summary.totalConnections}</span></div>
           </div>
        </div>

        {analysisResults.errors.length > 0 && (
          <div>
            <h3 className="font-bold text-xs uppercase text-red-500 mb-2">Errores Críticos ({analysisResults.errors.length})</h3>
            <div className="space-y-2">
              {analysisResults.errors.map((err, i) => (
                <div key={i} className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-400">
                   {err.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {analysisResults.warnings.length > 0 && (
          <div>
            <h3 className="font-bold text-xs uppercase text-yellow-500 mb-2">Advertencias ({analysisResults.warnings.length})</h3>
            <div className="space-y-2">
              {analysisResults.warnings.map((warn, i) => (
                <div key={i} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-700 dark:text-yellow-400">
                   {warn.message}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
           <h3 className="font-bold text-xs uppercase text-slate-500 mb-2">Recorridos Identificados ({analysisResults.paths.length})</h3>
           <div className="space-y-2">
              {analysisResults.paths.map((p, i) => {
                 let colorClass = 'border-slate-200';
                 let textClass = 'text-slate-600';
                 if (p.status === 'CONNECTED') { colorClass = 'border-green-300 bg-green-50'; textClass = 'text-green-700'; }
                 if (p.status === 'OPEN' || p.status === 'PARTIAL') { colorClass = 'border-yellow-300 bg-yellow-50'; textClass = 'text-yellow-700'; }
                 if (p.status === 'ISOLATED') { colorClass = 'border-slate-300 bg-slate-50'; textClass = 'text-slate-500'; }
                 
                 if (darkMode) {
                    if (p.status === 'CONNECTED') { colorClass = 'border-green-800 bg-green-900/20'; textClass = 'text-green-400'; }
                    if (p.status === 'OPEN' || p.status === 'PARTIAL') { colorClass = 'border-yellow-800 bg-yellow-900/20'; textClass = 'text-yellow-400'; }
                    if (p.status === 'ISOLATED') { colorClass = 'border-slate-700 bg-slate-800'; textClass = 'text-slate-400'; }
                 }

                 return (
                    <div key={i} className={`p-3 rounded border ${colorClass} cursor-pointer hover:opacity-80 transition-opacity ${state.ui.highlightedPathId === p.id ? 'ring-2 ring-blue-500' : ''}`} onClick={() => dispatch({ type: 'HIGHLIGHT_PATH', payload: p.id })}>
                       <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm">{p.name}</span>
                          <span className="text-xs font-medium">{p.lengthMeters} m</span>
                       </div>
                       <div className={`text-xs font-bold ${textClass} mb-2`}>{p.statusLabel}</div>
                       <div className="text-[10px] opacity-70">
                          {p.wires.length} segmentos • {p.connections.length} puentes
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>
      </div>
    );
  };


  const renderQuantification = () => {
    if (!analysisResults) return null;
    const quant = generateQuantification(state, analysisResults);
    
    return (
      <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
        <div className={`p-4 rounded border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
           <h3 className="font-bold text-sm mb-4">Resumen del Proyecto</h3>
           <div className="grid grid-cols-2 gap-y-2 text-xs">
             <div className="text-slate-500">Escala:</div><div className="font-bold text-right">{quant.scaleInfo}</div>
             <div className="text-slate-500">Longitud de cerco:</div><div className="font-bold text-right">{quant.fenceLengthFormatted}</div>
             <div className="text-slate-500">Longitud total de hilos:</div><div className="font-bold text-right">{quant.totalWireLengthFormatted}</div>
             <div className="text-slate-500">Tramos:</div><div className="font-bold text-right">{quant.counts.segments}</div>
             <div className="text-slate-500">Hilos (Total):</div><div className="font-bold text-right">{quant.counts.wires}</div>
             <div className="text-slate-500">Puentes:</div><div className="font-bold text-right">{quant.counts.bridges}</div>
           </div>
        </div>

        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Tabla de Hilos (Circuitos)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
             <thead className={`${darkMode ? 'bg-slate-800' : 'bg-slate-100'} uppercase font-bold text-slate-500`}>
               <tr>
                 <th className="p-2">Hilo</th>
                 <th className="p-2">Tipo</th>
                 <th className="p-2">Tramos</th>
                 <th className="p-2">Longitud</th>
                 <th className="p-2">Estado</th>
               </tr>
             </thead>
             <tbody>
               {quant.tableHilos.map((h, idx) => (
                 <tr 
                    key={h.id} 
                    className={`border-b ${darkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-100 hover:bg-slate-50'} cursor-pointer`}
                    onClick={() => dispatch({ type: 'HIGHLIGHT_PATH', payload: h.id })}
                 >
                   <td className="p-2 font-bold">{h.name}</td>
                   <td className="p-2">{h.wireTypes.join(', ')}</td>
                   <td className="p-2 text-center">{h.segmentsCount}</td>
                   <td className="p-2 font-mono">{h.formattedLength}</td>
                   <td className="p-2 truncate max-w-[80px]" title={h.status}>{h.status}</td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>

        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mt-4">Tabla de Tramos (Físicos)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
             <thead className={`${darkMode ? 'bg-slate-800' : 'bg-slate-100'} uppercase font-bold text-slate-500`}>
               <tr>
                 <th className="p-2">Tramo</th>
                 <th className="p-2">Longitud</th>
                 <th className="p-2">Hilos</th>
                 <th className="p-2">Estado</th>
               </tr>
             </thead>
             <tbody>
               {quant.tableTramos.map((t, idx) => (
                 <tr 
                    key={t.id} 
                    className={`border-b ${darkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-100 hover:bg-slate-50'} cursor-pointer`}
                    onClick={() => dispatch({ type: 'SELECT_ELEMENT', payload: t.id })}
                 >
                   <td className="p-2 font-bold">{t.name}</td>
                   <td className="p-2 font-mono">{t.formattedLength}</td>
                   <td className="p-2 text-center">{t.wireCount}</td>
                   <td className="p-2 text-green-600">{t.status}</td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-72 border-l flex flex-col h-full ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200'}`}>
      {/* Tabs */}
      <div className={`flex flex-wrap border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <button onClick={() => { setActiveTab('properties'); dispatch({ type: 'HIGHLIGHT_PATH', payload: null }); }} className={`flex-1 min-w-[70px] py-2 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'properties' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-400 hover:text-slate-600'}`}>Props</button>
        <button onClick={() => setActiveTab('analysis')} className={`flex-1 min-w-[70px] py-2 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'analysis' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-400 hover:text-slate-600'}`}>Análisis</button>
        <button onClick={() => { setActiveTab('quantification'); dispatch({ type: 'HIGHLIGHT_PATH', payload: null }); }} className={`flex-1 min-w-[70px] py-2 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'quantification' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-400 hover:text-slate-600'}`}>Cuantif</button>
        <button onClick={() => { setActiveTab('materials'); dispatch({ type: 'HIGHLIGHT_PATH', payload: null }); }} className={`flex-1 min-w-[70px] py-2 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'materials' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-400 hover:text-slate-600'}`}>Materiales</button>
      </div>

      {activeTab === 'materials' ? <MaterialsPanel state={state} dispatch={dispatch} analysisResults={analysisResults} darkMode={darkMode} /> : activeTab === 'quantification' ? renderQuantification() : activeTab === 'analysis' ? renderAnalysis() : (
        !selectedElement ? (
          <div className="p-6 flex flex-col items-center justify-center text-center flex-1">
            <Settings className="w-12 h-12 mb-4 opacity-20 text-slate-500" />
            <p className="text-sm text-slate-500">Selecciona un elemento para ver sus propiedades</p>
            {renderConnectionsList()}
          </div>
        ) : (
          <div className="flex flex-col flex-1 h-full overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-bold text-lg uppercase tracking-wider text-slate-500 text-xs mb-1">Propiedades</h2>
              <h3 className="font-bold text-xl capitalize">{selectedElement.type === 'segment' ? 'Tramo' : selectedElement.type === 'wall' ? 'Barda' : selectedElement.type === 'room' ? 'Cuarto/Área' : selectedElement.type}</h3>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              {selectedElement.x !== undefined && (
                <div className="grid grid-cols-2 gap-2 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">X</label>
                    <input type="number" value={Math.round(selectedElement.x)} disabled className={inputClass + ' opacity-50'} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Y</label>
                    <input type="number" value={Math.round(selectedElement.y)} disabled className={inputClass + ' opacity-50'} />
                  </div>
                </div>
              )}
              {renderSpecificProperties()}
              
              {renderConnectionsList()}
            </div>

            <div className="p-4 border-t">
              <button 
                onClick={() => {
                   if (selectedElement.type === 'segment') dispatch({ type: 'REMOVE_SEGMENT', payload: selectedElement.id });
                   else dispatch({ type: 'REMOVE_ELEMENT', payload: selectedElement.id });
                   dispatch({ type: 'CLEAR_SELECTION' });
                }}
                className="w-full py-2 px-4 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded transition-colors font-bold text-sm flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Eliminar {selectedElement.type === 'segment' ? 'Tramo' : 'Elemento'}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default PropertiesPanel;
