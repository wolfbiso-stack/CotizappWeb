import React from 'react';
import { useDesigner } from '../context/DesignerContext';
import { MousePointer2, Square, Grid3X3, DoorClosed, Type, Hexagon, Component, PenLine, Layers, Cable, Waypoints, LocateFixed, Zap, Ruler, Scale } from 'lucide-react';

const LAYOUT_TOOLS = [
  { id: 'select', icon: MousePointer2, label: 'Seleccionar' },
  { id: 'post', icon: LocateFixed, label: 'Poste de Cerco' },
  { id: 'wall', icon: Hexagon, label: 'Barda / Esquina' },
  { id: 'room', icon: Grid3X3, label: 'Cuarto / Área' },
  { id: 'gate', icon: Component, label: 'Portón' },
  { id: 'door', icon: DoorClosed, label: 'Puerta' },
  { id: 'text', icon: Type, label: 'Texto / Anotación' },
  { id: 'measure', icon: Ruler, label: 'Medir' },
  { id: 'calibrate', icon: Scale, label: 'Calibrar Escala' },
];

const DESIGN_TOOLS = [
  { id: 'select', icon: MousePointer2, label: 'Seleccionar' },
  { id: 'energizer', icon: Zap, label: 'Energizador' },
  { id: 'post', icon: LocateFixed, label: 'Poste de Cerco' },
  { id: 'segment', icon: Layers, label: 'Tramo de Hilos' },
  { id: 'connect', icon: Waypoints, label: 'Conectar Nodos' },
  { id: 'bridge', icon: Cable, label: 'Puente Libre' },
  { id: 'wire', icon: PenLine, label: 'Hilo Libre' },
  { id: 'measure', icon: Ruler, label: 'Medir' },
  { id: 'calibrate', icon: Scale, label: 'Calibrar Escala' },
];

const Toolbar = ({ darkMode }) => {
  const { state, dispatch } = useDesigner();
  const activeTool = state.ui.currentTool;
  
  const tools = state.ui.designMode ? DESIGN_TOOLS : LAYOUT_TOOLS;

  return (
    <div className={`w-16 border-r flex flex-col items-center py-4 gap-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => dispatch({ type: 'SET_TOOL', payload: tool.id })}
          title={tool.label}
          className={`p-3 rounded-xl transition-all ${activeTool === tool.id ? 'bg-blue-100 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
        >
          <tool.icon className="w-6 h-6" />
        </button>
      ))}
    </div>
  );
};

export default Toolbar;
