import React, { createContext, useReducer, useContext } from 'react';

const DesignerContext = createContext();

const initialState = {
  project: {
    id: null,
    name: 'Nuevo Proyecto Cerco',
    dimensions: { width: 3000, height: 3000 },
    settings: {
       postSpacing: 3, // meters
       wastePercentage: 5, // %
    },
    materialsOverrides: {}, // { materialId: { isManual: boolean, quantity: number } }
    scale: {
       enabled: false,
       pixelsPerMeter: 100, // 1m = 100px by default
       reference: null // { pxDistance, realDistance, unit }
    }
  },
  view: {
    zoom: 1,
    panX: 0,
    panY: 0,
    showGrid: true,
    snapToGrid: true,
    gridSize: 20,
  },
  elements: [],
  segments: [],
  nodes: [],
  connections: [],
  ui: {
    currentTool: 'select',
    selectedElementIds: [],
    selectedConnectionIds: [],
    designMode: false,
    showWireLabels: true,
    highlightedPathId: null,
  },
  history: {
    past: [],
    future: [],
  }
};

function designerReducer(state, action) {
  // We save the entire physical/graphical state in history
  const getSnapshot = (st) => ({
    elements: st.elements,
    segments: st.segments,
    nodes: st.nodes,
    connections: st.connections
  });

  const saveHistory = (newState) => {
    return {
      ...newState,
      history: {
        past: [...state.history.past, getSnapshot(state)],
        future: []
      }
    };
  };

  switch (action.type) {
    case 'SET_TOOL':
      return { ...state, ui: { ...state.ui, currentTool: action.payload } };
    
    case 'SET_DESIGN_MODE':
      return { ...state, ui: { ...state.ui, designMode: action.payload, currentTool: 'select' } };

    case 'TOGGLE_WIRE_LABELS':
      return { ...state, ui: { ...state.ui, showWireLabels: !state.ui.showWireLabels } };
    
    case 'ADD_ELEMENT':
      return saveHistory({
        ...state,
        elements: [...state.elements, action.payload]
      });

    case 'UPDATE_ELEMENT':
      const updatedElements = state.elements.map(el => el.id === action.payload.id ? { ...el, ...action.payload.updates } : el);
      if (action.payload.noHistory) {
        return { ...state, elements: updatedElements };
      }
      return saveHistory({ ...state, elements: updatedElements });
      
    case 'CALIBRATE_SCALE':
      return {
         ...state,
         project: {
            ...state.project,
            scale: {
               enabled: true,
               pixelsPerMeter: action.payload.pxDistance / action.payload.realDistance,
               reference: action.payload
            }
         }
      };

    case 'SAVE_HISTORY':
      return saveHistory(state);
      
    case 'REMOVE_ELEMENT':
      return saveHistory({
        ...state,
        elements: state.elements.filter(el => el.id !== action.payload),
        ui: {
          ...state.ui,
          selectedElementIds: state.ui.selectedElementIds.filter(id => id !== action.payload)
        }
      });
      
    case 'SELECT_ELEMENT':
      return { ...state, ui: { ...state.ui, selectedElementIds: [action.payload], selectedConnectionIds: [] } };
    case 'SELECT_CONNECTION':
      return { ...state, ui: { ...state.ui, selectedConnectionIds: [action.payload], selectedElementIds: [], highlightedPathId: null } };

    case 'CLEAR_SELECTION':
      return { ...state, ui: { ...state.ui, selectedElementIds: [], selectedConnectionIds: [], highlightedPathId: null } };

    case 'HIGHLIGHT_PATH':
      return { ...state, ui: { ...state.ui, highlightedPathId: action.payload, selectedElementIds: [], selectedConnectionIds: [] } };


    case 'UPDATE_PROJECT_SETTINGS':
      return saveHistory({
        ...state,
        project: {
          ...state.project,
          settings: { ...state.project.settings, ...action.payload }
        }
      });
      
    case 'SET_MATERIAL_OVERRIDE':
      return saveHistory({
        ...state,
        project: {
          ...state.project,
          materialsOverrides: {
            ...state.project.materialsOverrides,
            [action.payload.materialId]: {
              isManual: action.payload.isManual,
              quantity: action.payload.quantity
            }
          }
        }
      });

    case 'SET_VIEW':
      return { ...state, view: { ...state.view, ...action.payload } };
      
    case 'UNDO':
      if (state.history.past.length === 0) return state;
      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, state.history.past.length - 1);
      return {
        ...state,
        ...previous,
        history: {
          past: newPast,
          future: [getSnapshot(state), ...state.history.future]
        }
      };

    case 'REDO':
      if (state.history.future.length === 0) return state;
      const next = state.history.future[0];
      const newFuture = state.history.future.slice(1);
      return {
        ...state,
        ...next,
        history: {
          past: [...state.history.past, getSnapshot(state)],
          future: newFuture
        }
      };

    case 'LOAD_PROJECT':
      return {
        ...state,
        project: action.payload.project || initialState.project,
        elements: action.payload.elements || [],
        segments: action.payload.segments || [],
        nodes: action.payload.nodes || [],
        connections: action.payload.connections || [],
        history: { past: [], future: [] }
      };

    case 'UPDATE_PROJECT':
      return { ...state, project: { ...state.project, ...action.payload } };

    // V2 Actions
    case 'ADD_SEGMENT':
      return saveHistory({
        ...state,
        segments: [...state.segments, action.payload]
      });
      
    case 'UPDATE_SEGMENT':
      const updatedSegments = state.segments.map(seg => seg.id === action.payload.id ? { ...seg, ...action.payload.updates } : seg);
      if (action.payload.noHistory) {
        return { ...state, segments: updatedSegments };
      }
      return saveHistory({ ...state, segments: updatedSegments });

    case 'REMOVE_SEGMENT':
      return saveHistory({
        ...state,
        segments: state.segments.filter(s => s.id !== action.payload),
        elements: state.elements.filter(el => el.properties?.segmentId !== action.payload), // remove wires of this segment
        nodes: state.nodes.filter(n => n.segmentId !== action.payload) // remove nodes of this segment
      });

    case 'SET_NODES':
      return { ...state, nodes: action.payload };
      
    case 'ADD_NODES':
      return { ...state, nodes: [...state.nodes, ...action.payload] };

    case 'ADD_CONNECTION':
      return saveHistory({ ...state, connections: [...state.connections, action.payload] });
      
    case 'REMOVE_CONNECTION':
      return saveHistory({ ...state, connections: state.connections.filter(c => c.id !== action.payload) });

    // When we want to batch multiple changes (elements, segments, nodes) in one history step
    case 'BATCH_UPDATE':
      if (action.payload.noHistory) {
        return { ...state, ...action.payload.updates };
      }
      return saveHistory({ ...state, ...action.payload.updates });

    default:
      return state;
  }
}

export const DesignerProvider = ({ children }) => {
  const [state, dispatch] = useReducer(designerReducer, initialState);

  return (
    <DesignerContext.Provider value={{ state, dispatch }}>
      {children}
    </DesignerContext.Provider>
  );
};

export const useDesigner = () => useContext(DesignerContext);
