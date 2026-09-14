import React, { useRef, useState, useEffect } from 'react';
import { useDesigner } from '../context/DesignerContext';
import { analyzeProject } from '../utils/connectivity';
import { v4 as uuidv4 } from 'uuid';

const generateId = () => Math.random().toString(36).substr(2, 9);

const Workspace = ({ darkMode }) => {
  const { state, dispatch } = useDesigner();

  const analysis = React.useMemo(() => {
    if (!state.ui.highlightedPathId) return null;
    return analyzeProject(state);
  }, [state, state.ui.highlightedPathId]);
  const hPath = analysis?.paths.find(p => p.id === state.ui.highlightedPathId);
  const hWires = hPath ? new Set(hPath.wires) : null;
  const hConnections = hPath ? new Set(hPath.connections) : null;
  const hNodes = hPath ? new Set(hPath.nodes) : null;
  const svgRef = useRef(null);
  
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPanPoint, setStartPanPoint] = useState({ x: 0, y: 0 });
  const [currentDrawElement, setCurrentDrawElement] = useState(null);
  
  const [draggingAction, setDraggingAction] = useState(null);
  const [hasDragged, setHasDragged] = useState(false);
  
  const [connectingAction, setConnectingAction] = useState(null);
  const clipboardRef = useRef(null);

  const getSVGCoordinates = (e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const CTM = svg.getScreenCTM();
    const viewportX = (e.clientX - CTM.e) / CTM.a;
    const viewportY = (e.clientY - CTM.f) / CTM.d;
    
    // Convert to logical coordinates within the transformed <g>
    return {
      x: (viewportX - state.view.panX) / state.view.zoom,
      y: (viewportY - state.view.panY) / state.view.zoom
    };
  };

  const snapToGrid = (val) => {
    if (!state.view.snapToGrid) return val;
    return Math.round(val / state.view.gridSize) * state.view.gridSize;
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomChange = e.deltaY > 0 ? -0.1 : 0.1;
      dispatch({ type: 'SET_VIEW', payload: { zoom: Math.max(0.1, state.view.zoom + zoomChange) } });
    } else {
      dispatch({ type: 'SET_VIEW', payload: { panX: state.view.panX - e.deltaX, panY: state.view.panY - e.deltaY } });
    }
  };

  const handlePointerDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsDraggingPan(true);
      setStartPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (e.button !== 0) return;

    const coords = getSVGCoordinates(e);
    const snappedCoords = { x: snapToGrid(coords.x), y: snapToGrid(coords.y) };

    if (state.ui.currentTool === 'select') {
      if (e.target === svgRef.current || e.target.tagName === 'rect' && e.target.getAttribute('fill') === 'url(#grid)') {
        dispatch({ type: 'CLEAR_SELECTION' });
      }
    } else if (['connect', 'bridge'].includes(state.ui.currentTool)) {
       if (e.target === svgRef.current || e.target.tagName === 'rect' && e.target.getAttribute('fill') === 'url(#grid)') {
          setConnectingAction(null);
       }
    } else {
      setIsDrawing(true);
      const newElement = {
        id: generateId(),
        type: state.ui.currentTool,
        x: snappedCoords.x,
        y: snappedCoords.y,
        width: 0,
        height: 0,
        points: [{ x: snappedCoords.x, y: snappedCoords.y }],
        properties: { name: `Nuevo ${state.ui.currentTool}` }
      };
      setCurrentDrawElement(newElement);
    }
  };

  const handleElementPointerDown = (e, el) => {
    if (state.ui.currentTool === 'select' && e.button === 0) {
      e.stopPropagation();
      dispatch({ type: 'SELECT_ELEMENT', payload: el.id });
      setDraggingAction({ type: 'move', element: el, startCoords: getSVGCoordinates(e) });
      setHasDragged(false);
    }
  };

  const handleHandlePointerDown = (e, el, pointIndex, handleType) => {
    if (state.ui.currentTool === 'select' && e.button === 0) {
      e.stopPropagation();
      dispatch({ type: 'SELECT_ELEMENT', payload: el.id });
      setDraggingAction({ type: 'resize', element: el, pointIndex, handleType, startCoords: getSVGCoordinates(e) });
      setHasDragged(false);
    }
  };
  
  const handleNodePointerDown = (e, node) => {
    if (['connect', 'bridge'].includes(state.ui.currentTool) && e.button === 0) {
      e.stopPropagation();
      setConnectingAction({ fromNode: node, tempPoint: getSVGCoordinates(e) });
    }
  };
  
  const handleNodePointerUp = (e, node) => {
    if (connectingAction && connectingAction.fromNode.id !== node.id) {
       e.stopPropagation();
       const newConn = {
         id: generateId(),
         type: state.ui.currentTool === 'connect' ? 'continuity' : 'bridge',
         fromNodeId: connectingAction.fromNode.id,
         toNodeId: node.id
       };
       
       const sourceWireId = connectingAction.fromNode.wireId;
       const targetWireId = node.wireId;
       const sourceWire = state.elements.find(w => w.id === sourceWireId);
       
       let updates = {
          connections: [...state.connections, newConn]
       };
       
       if (sourceWire && state.ui.currentTool === 'bridge') {
          updates.elements = state.elements.map(w => w.id === targetWireId ? { ...w, properties: { ...w.properties, wireType: sourceWire.properties?.wireType || 'line' } } : w);
       }
       dispatch({ type: 'BATCH_UPDATE', payload: { updates } });
       setConnectingAction(null);
       dispatch({ type: 'SET_TOOL', payload: 'select' });
    }
  };
  
  const recalculateSegment = (segmentId, newPoints, newSpacing) => {
      const segment = state.segments.find(s => s.id === segmentId);
      if (!segment) return { updates: {} };
      
      const p1 = newPoints[0];
      const p2 = newPoints[1];
      const length = Math.sqrt(Math.pow(p2.x-p1.x,2) + Math.pow(p2.y-p1.y,2));
      if (length <= 0) return { updates: {} };
      
      const nx = -(p2.y - p1.y) / length;
      const ny = (p2.x - p1.x) / length;
      
      const wires = state.elements.filter(w => w.properties?.segmentId === segmentId);
      const nodes = state.nodes.filter(n => n.segmentId === segmentId);
      
      const updatedWires = wires.map(w => {
         const offset = (w.properties.wireNumber - 1 - (segment.wireCount - 1) / 2) * newSpacing;
         return { ...w, points: [{ x: p1.x + nx * offset, y: p1.y + ny * offset }, { x: p2.x + nx * offset, y: p2.y + ny * offset }] };
      });
      
      const updatedNodes = nodes.map(n => {
         const w = updatedWires.find(uw => uw.id === n.wireId);
         if (!w) return n;
         if (n.type === 'wire-start') return { ...n, x: w.points[0].x, y: w.points[0].y };
         if (n.type === 'wire-end') return { ...n, x: w.points[1].x, y: w.points[1].y };
         return n;
      });
      
      return {
          segments: state.segments.map(s => s.id === segmentId ? { ...s, points: newPoints, properties: { ...s.properties, spacing: newSpacing } } : s),
          elements: state.elements.map(elem => updatedWires.find(uw => uw.id === elem.id) || elem),
          nodes: state.nodes.map(n => updatedNodes.find(un => un.id === n.id) || n)
      };
  };

  const handlePointerMove = (e) => {
    if (isDraggingPan) {
      const dx = e.clientX - startPanPoint.x;
      const dy = e.clientY - startPanPoint.y;
      dispatch({ type: 'SET_VIEW', payload: { panX: state.view.panX + dx, panY: state.view.panY + dy } });
      setStartPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (connectingAction) {
       setConnectingAction(prev => ({ ...prev, tempPoint: getSVGCoordinates(e) }));
       return;
    }

    if (draggingAction) {
      const coords = getSVGCoordinates(e);
      const dxUnsnapped = coords.x - draggingAction.startCoords.x;
      const dyUnsnapped = coords.y - draggingAction.startCoords.y;
      
      const dx = state.view.snapToGrid ? Math.round(dxUnsnapped / state.view.gridSize) * state.view.gridSize : dxUnsnapped;
      const dy = state.view.snapToGrid ? Math.round(dyUnsnapped / state.view.gridSize) * state.view.gridSize : dyUnsnapped;
      
      if (dx !== 0 || dy !== 0) {
        setHasDragged(true);
        
        if (draggingAction.type === 'move') {
          const el = draggingAction.element;
          
          if (el.type === 'segment') {
             const newPoints = el.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
             const spacing = el.properties?.spacing || 15;
             const updates = recalculateSegment(el.id, newPoints, spacing);
             
             dispatch({ type: 'BATCH_UPDATE', payload: { updates, noHistory: true }});
             setDraggingAction({ ...draggingAction, startCoords: { x: draggingAction.startCoords.x + dx, y: draggingAction.startCoords.y + dy }, element: { ...el, points: newPoints } });
             
          } else {
             let updates = {};
             if (['wire'].includes(el.type)) {
               updates.points = el.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
             } else {
               updates.x = el.x + dx;
               updates.y = el.y + dy;
             }
             dispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates, noHistory: true } });
             
             if (el.type === 'wire') {
                const nodes = state.nodes.filter(n => n.wireId === el.id);
                if (nodes.length > 0) {
                   const updatedNodes = nodes.map(n => ({ ...n, x: n.x + dx, y: n.y + dy }));
                   dispatch({ type: 'BATCH_UPDATE', payload: { updates: {
                      nodes: state.nodes.map(n => updatedNodes.find(un => un.id === n.id) || n)
                   }, noHistory: true }});
                }
             } else if (el.type === 'energizer') {
                const nodes = state.nodes.filter(n => n.wireId === el.id);
                if (nodes.length > 0) {
                   const updatedNodes = nodes.map(n => ({ ...n, x: n.x + dx, y: n.y + dy }));
                   dispatch({ type: 'BATCH_UPDATE', payload: { updates: {
                      nodes: state.nodes.map(n => updatedNodes.find(un => un.id === n.id) || n)
                   }, noHistory: true }});
                }
             }
             
             setDraggingAction({ ...draggingAction, startCoords: { x: draggingAction.startCoords.x + dx, y: draggingAction.startCoords.y + dy }, element: { ...el, ...updates } });
          }
          
        } else if (draggingAction.type === 'resize') {
          const el = draggingAction.element;
          
          if (el.type === 'segment') {
             let newPoints = [...el.points];
             let spacing = el.properties?.spacing || 15;
             
             if (draggingAction.handleType === 'spacing') {
                 // Adjusting width
                 const p1 = newPoints[0];
                 const p2 = newPoints[1];
                 const length = Math.sqrt(Math.pow(p2.x-p1.x,2) + Math.pow(p2.y-p1.y,2));
                 if (length > 0) {
                     const nx = -(p2.y - p1.y) / length;
                     const ny = (p2.x - p1.x) / length;
                     
                     // We use the raw unsnapped delta so it feels smooth, or we can just use dx/dy
                     // dxUnsnapped and dyUnsnapped are available above
                     const mouseDist = dxUnsnapped * nx + dyUnsnapped * ny;
                     
                     const origDist = ((el.wireCount - 1) / 2) * spacing;
                     let newDist = origDist + mouseDist;
                     if (newDist < 5) newDist = 5; // minimum spacing constraint
                     spacing = newDist / ((el.wireCount - 1) / 2);
                 }
             } else {
                 newPoints[draggingAction.pointIndex] = { 
                   x: el.points[draggingAction.pointIndex].x + dx,
                   y: el.points[draggingAction.pointIndex].y + dy
                 };
             }
             
             const updates = recalculateSegment(el.id, newPoints, spacing);
             dispatch({ type: 'BATCH_UPDATE', payload: { updates, noHistory: true }});
             setDraggingAction({ ...draggingAction, startCoords: { x: draggingAction.startCoords.x + dxUnsnapped, y: draggingAction.startCoords.y + dyUnsnapped }, element: { ...el, points: newPoints, properties: { ...el.properties, spacing } } });
             
          } else if (['wire'].includes(el.type)) {
            const newPoints = [...el.points];
            newPoints[draggingAction.pointIndex] = { 
              x: el.points[draggingAction.pointIndex].x + dx,
              y: el.points[draggingAction.pointIndex].y + dy
            };
            dispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates: { points: newPoints }, noHistory: true } });
            
            if (el.type === 'wire') {
                const nodes = state.nodes.filter(n => n.wireId === el.id);
                if (nodes.length > 0) {
                   const updatedNodes = nodes.map(n => {
                      if (n.type === 'wire-start' && draggingAction.pointIndex === 0) return { ...n, x: newPoints[0].x, y: newPoints[0].y };
                      if (n.type === 'wire-end' && draggingAction.pointIndex === 1) return { ...n, x: newPoints[1].x, y: newPoints[1].y };
                      return n;
                   });
                   dispatch({ type: 'BATCH_UPDATE', payload: { updates: {
                      nodes: state.nodes.map(n => updatedNodes.find(un => un.id === n.id) || n)
                   }, noHistory: true }});
                }
            }
            
            setDraggingAction({ ...draggingAction, startCoords: { x: draggingAction.startCoords.x + dx, y: draggingAction.startCoords.y + dy }, element: { ...el, points: newPoints } });
          } else {
            if (draggingAction.handleType === 'se') {
               const updates = { width: el.width + dx, height: el.height + dy };
               dispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, updates, noHistory: true } });
               
               if (el.type === 'energizer') {
                   const nodes = state.nodes.filter(n => n.wireId === el.id);
                   if (nodes.length > 0) {
                      const finalWidth = el.width + dx;
                      const finalHeight = el.height + dy;
                      const startX = el.x + finalWidth + 10;
                      const startY = el.y;
                      
                      const updatedNodes = nodes.map(n => {
                          if (n.type === 'energizer-out') return { ...n, x: startX, y: startY + finalHeight * 0.25 };
                          if (n.type === 'energizer-gnd') return { ...n, x: startX, y: startY + finalHeight * 0.5 };
                          if (n.type === 'energizer-ret') return { ...n, x: startX, y: startY + finalHeight * 0.75 };
                          return n;
                      });
                      dispatch({ type: 'BATCH_UPDATE', payload: { updates: {
                         nodes: state.nodes.map(n => updatedNodes.find(un => un.id === n.id) || n)
                      }, noHistory: true }});
                   }
               }
               
               setDraggingAction({ ...draggingAction, startCoords: { x: draggingAction.startCoords.x + dx, y: draggingAction.startCoords.y + dy }, element: { ...el, ...updates } });
            }
          }
        }
      }
      return;
    }

    if (isDrawing && currentDrawElement) {
      const coords = getSVGCoordinates(e);
      const snappedCoords = { x: snapToGrid(coords.x), y: snapToGrid(coords.y) };

      if (['wire', 'segment'].includes(currentDrawElement.type)) {
        setCurrentDrawElement(prev => ({ ...prev, points: [prev.points[0], { x: snappedCoords.x, y: snappedCoords.y }] }));
      } else {
        setCurrentDrawElement(prev => ({ ...prev, width: snappedCoords.x - prev.x, height: snappedCoords.y - prev.y }));
      }
    }
  };

  const handlePointerUp = (e) => {
    setIsDraggingPan(false);
    
    if (connectingAction) {
       setConnectingAction(null);
       return;
    }
    
    if (draggingAction) {
      if (hasDragged) {
        dispatch({ type: 'SAVE_HISTORY' });
      }
      setDraggingAction(null);
      setHasDragged(false);
      return;
    }
    
    if (isDrawing && currentDrawElement) {
      setIsDrawing(false);
      let isValid = false;
      if (['wire', 'segment'].includes(currentDrawElement.type)) {
        if (currentDrawElement.points.length > 1 && (currentDrawElement.points[0].x !== currentDrawElement.points[1].x || currentDrawElement.points[0].y !== currentDrawElement.points[1].y)) {
          isValid = true;
        }
      } else {
        if (currentDrawElement.type === 'post') {
           // FORZAR TAMAÑO Y FORMA INDEPENDIENTEMENTE DE SI ARRASTRÓ
           let finalElement = { ...currentDrawElement };
           finalElement.width = 10;
           finalElement.height = state.view.gridSize || 20; // 1 fila de cuadritos
           finalElement.x = currentDrawElement.points[0].x - 5;
           finalElement.y = currentDrawElement.points[0].y - 10;
           isValid = true;
           setCurrentDrawElement(finalElement);
        } else if (currentDrawElement.type === 'energizer') {
           let finalElement = { ...currentDrawElement };
           if (Math.abs(currentDrawElement.width) < 10 && Math.abs(currentDrawElement.height) < 10) {
              finalElement.width = 100;
              finalElement.height = 120;
              finalElement.x = currentDrawElement.points[0].x - 50;
              finalElement.y = currentDrawElement.points[0].y - 60;
           } else {
              if (finalElement.width < 0) { finalElement.x += finalElement.width; finalElement.width = Math.abs(finalElement.width); }
              if (finalElement.height < 0) { finalElement.y += finalElement.height; finalElement.height = Math.abs(finalElement.height); }
           }
           isValid = true;
           setCurrentDrawElement(finalElement);
        } else if (Math.abs(currentDrawElement.width) > 10 || Math.abs(currentDrawElement.height) > 10) {
          let finalElement = { ...currentDrawElement };
          if (finalElement.width < 0) { finalElement.x += finalElement.width; finalElement.width = Math.abs(finalElement.width); }
          if (finalElement.height < 0) { finalElement.y += finalElement.height; finalElement.height = Math.abs(finalElement.height); }
          isValid = true;
          setCurrentDrawElement(finalElement);
        }
      }

      if (isValid) {
        if (currentDrawElement.type === 'segment') {
          const segmentId = generateId();
          const wireCount = 5;
          const segment = {
            id: segmentId,
            type: 'segment',
            wireCount: wireCount,
            points: currentDrawElement.points,
            properties: { name: `Tramo ${state.segments.length + 1}`, spacing: 15 }
          };
          
          const newWires = [];
          const newNodes = [];
          const p1 = currentDrawElement.points[0];
          const p2 = currentDrawElement.points[1];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const length = Math.sqrt(dx*dx + dy*dy);
          const nx = -dy / length;
          const ny = dx / length;
          const wireSpacing = 15;
          
          for (let i = 0; i < wireCount; i++) {
             const wireId = generateId();
             const startNodeId = generateId();
             const endNodeId = generateId();
             const offset = (i - (wireCount - 1) / 2) * wireSpacing;
             const wp1 = { x: p1.x + nx * offset, y: p1.y + ny * offset };
             const wp2 = { x: p2.x + nx * offset, y: p2.y + ny * offset };
             
             let wireType = 'line';
             if (i === 1) wireType = 'ground';
             if (i === wireCount - 1) wireType = 'return';
             
             newWires.push({
               id: wireId,
               type: 'wire',
               points: [wp1, wp2],
               properties: { name: `Hilo ${i+1}`, segmentId, wireNumber: i+1, wireType }
             });
             newNodes.push({ id: startNodeId, type: 'wire-start', wireId, segmentId, x: wp1.x, y: wp1.y });
             newNodes.push({ id: endNodeId, type: 'wire-end', wireId, segmentId, x: wp2.x, y: wp2.y });
          }
          
          dispatch({ type: 'BATCH_UPDATE', payload: { updates: {
            segments: [...state.segments, segment],
            elements: [...state.elements, ...newWires],
            nodes: [...state.nodes, ...newNodes]
          }}});
          dispatch({ type: 'SELECT_ELEMENT', payload: segmentId });
          
        } else {
          if (currentDrawElement.type === 'wire') {
             const wireId = currentDrawElement.id;
             const startNodeId = generateId();
             const endNodeId = generateId();
             const p1 = currentDrawElement.points[0];
             const p2 = currentDrawElement.points[1];
             const newNodes = [
                { id: startNodeId, type: 'wire-start', wireId, segmentId: null, x: p1.x, y: p1.y },
                { id: endNodeId, type: 'wire-end', wireId, segmentId: null, x: p2.x, y: p2.y }
             ];
             
             // Auto-connect to nearby nodes
             const SNAP_DIST = 20;
             const newConnections = [];
             
             const findNearbyNode = (point) => {
                return state.nodes.find(n => Math.abs(n.x - point.x) < SNAP_DIST && Math.abs(n.y - point.y) < SNAP_DIST);
             };
             
             const snapStartNode = findNearbyNode(p1);
             const snapEndNode = findNearbyNode(p2);
             
             if (snapStartNode) {
                newNodes[0].x = snapStartNode.x;
                newNodes[0].y = snapStartNode.y;
                currentDrawElement.points[0] = { x: snapStartNode.x, y: snapStartNode.y };
                newConnections.push({ id: generateId(), type: 'continuity', fromNodeId: snapStartNode.id, toNodeId: startNodeId });
             }
             
             if (snapEndNode) {
                newNodes[1].x = snapEndNode.x;
                newNodes[1].y = snapEndNode.y;
                currentDrawElement.points[1] = { x: snapEndNode.x, y: snapEndNode.y };
                newConnections.push({ id: generateId(), type: 'continuity', fromNodeId: snapEndNode.id, toNodeId: endNodeId });
             }
             
             dispatch({ type: 'BATCH_UPDATE', payload: { updates: {
                elements: [...state.elements, currentDrawElement],
                nodes: [...state.nodes, ...newNodes],
                connections: [...state.connections, ...newConnections]
             }}});
             dispatch({ type: 'SELECT_ELEMENT', payload: currentDrawElement.id });
          } else if (currentDrawElement.type === 'energizer') {
             const energizerId = generateId();
             const newEnergizer = { ...currentDrawElement, id: energizerId };
             
             const startX = newEnergizer.x + newEnergizer.width + 10;
             const startY = newEnergizer.y;
             
             const newNodes = [
                { id: generateId(), type: 'energizer-out', wireId: energizerId, segmentId: null, x: startX, y: startY + (newEnergizer.height * 0.25) },
                { id: generateId(), type: 'energizer-gnd', wireId: energizerId, segmentId: null, x: startX, y: startY + (newEnergizer.height * 0.5) },
                { id: generateId(), type: 'energizer-ret', wireId: energizerId, segmentId: null, x: startX, y: startY + (newEnergizer.height * 0.75) }
             ];
             
             dispatch({ type: 'BATCH_UPDATE', payload: { updates: {
                elements: [...state.elements, newEnergizer],
                nodes: [...state.nodes, ...newNodes]
             }}});
             dispatch({ type: 'SELECT_ELEMENT', payload: energizerId });
          } else {
             dispatch({ type: 'ADD_ELEMENT', payload: currentDrawElement });
             dispatch({ type: 'SELECT_ELEMENT', payload: currentDrawElement.id });
          }
        }
        dispatch({ type: 'SET_TOOL', payload: 'select' });
      }
      setCurrentDrawElement(null);
    }
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (svg) {
      svg.addEventListener('wheel', handleWheel, { passive: false });
      return () => svg.removeEventListener('wheel', handleWheel);
    }
  }, [state.view]);
  
  // Auto-repair missing nodes for wires (e.g. drawn before the update or missing due to bugs)
  useEffect(() => {
     const wiresWithoutNodes = state.elements.filter(el => el.type === 'wire' && !state.nodes.some(n => n.wireId === el.id));
     if (wiresWithoutNodes.length > 0) {
        let newNodes = [];
        wiresWithoutNodes.forEach(w => {
           if (w.points && w.points.length > 1) {
              newNodes.push({ id: generateId(), type: 'wire-start', wireId: w.id, segmentId: null, x: w.points[0].x, y: w.points[0].y });
              newNodes.push({ id: generateId(), type: 'wire-end', wireId: w.id, segmentId: null, x: w.points[1].x, y: w.points[1].y });
           }
        });
        if (newNodes.length > 0) {
           dispatch({ type: 'BATCH_UPDATE', payload: { updates: { nodes: [...state.nodes, ...newNodes] }, noHistory: true } });
        }
     }
  }, [state.elements, state.nodes, dispatch]);
  
  // Keyboard Shortcuts (Copy & Paste)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorar si el usuario está escribiendo en el panel de propiedades
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      
      // Eliminar
      if (e.key === 'Delete' || e.key === 'Backspace') {
         if (state.ui.selectedElementIds.length > 0) {
            const id = state.ui.selectedElementIds[0];
            const isSegment = state.segments.some(s => s.id === id);
            if (isSegment) {
               dispatch({ type: 'REMOVE_SEGMENT', payload: id });
            } else {
               dispatch({ type: 'REMOVE_ELEMENT', payload: id });
               // If it was a wire or energizer, also remove its nodes
               const wireNodes = state.nodes.filter(n => n.wireId === id);
               if (wireNodes.length > 0) {
                   dispatch({ type: 'BATCH_UPDATE', payload: { updates: {
                      nodes: state.nodes.filter(n => n.wireId !== id)
                   }}});
               }
            }
         } else if (state.ui.selectedConnectionIds && state.ui.selectedConnectionIds.length > 0) {
            const connId = state.ui.selectedConnectionIds[0];
            const conn = state.connections.find(c => c.id === connId);
            if (conn) {
               const targetNode = state.nodes.find(n => n.id === conn.toNodeId);
               let updates = {
                  connections: state.connections.filter(c => c.id !== connId)
               };
               // Reset wire type if bridge is deleted
               if (conn.type === 'bridge' && targetNode && targetNode.wireId) {
                  updates.elements = state.elements.map(w => w.id === targetNode.wireId ? { ...w, properties: { ...w.properties, wireType: null } } : w);
               }
               dispatch({ type: 'BATCH_UPDATE', payload: { updates } });
            }
         }
      }
      
      // Copiar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
         if (state.ui.selectedElementIds.length > 0) {
            const selectedId = state.ui.selectedElementIds[0];
            const element = state.elements.find(el => el.id === selectedId) || state.segments.find(s => s.id === selectedId);
            if (element) {
               clipboardRef.current = JSON.parse(JSON.stringify(element));
            }
         }
      }
      
      // Pegar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
         if (clipboardRef.current) {
            const sourceEl = clipboardRef.current;
            const offset = 50; // Pegar desplazado para que se note
            
            if (sourceEl.type === 'segment') {
               const segmentId = generateId();
               const wireCount = sourceEl.wireCount || 5;
               const spacing = sourceEl.properties?.spacing || 15;
               const newPoints = sourceEl.points.map(p => ({ x: p.x + offset, y: p.y + offset }));
               
               const segment = {
                 id: segmentId,
                 type: 'segment',
                 wireCount: wireCount,
                 points: newPoints,
                 properties: { ...sourceEl.properties, name: `Tramo Copia ${state.segments.length + 1}` }
               };
               
               const newWires = [];
               const newNodes = [];
               const p1 = newPoints[0];
               const p2 = newPoints[1];
               const length = Math.sqrt(Math.pow(p2.x-p1.x,2) + Math.pow(p2.y-p1.y,2));
               const nx = length > 0 ? -(p2.y - p1.y) / length : 0;
               const ny = length > 0 ? (p2.x - p1.x) / length : 0;
               
               for (let i = 0; i < wireCount; i++) {
                  const wireId = generateId();
                  const startNodeId = generateId();
                  const endNodeId = generateId();
                  const wireOffset = (i - (wireCount - 1) / 2) * spacing;
                  const wp1 = { x: p1.x + nx * wireOffset, y: p1.y + ny * wireOffset };
                  const wp2 = { x: p2.x + nx * wireOffset, y: p2.y + ny * wireOffset };
                  
                  let wireType = 'line';
                  if (i === 1) wireType = 'ground';
                  if (i === wireCount - 1) wireType = 'return';
                  
                  newWires.push({
                    id: wireId,
                    type: 'wire',
                    points: [wp1, wp2],
                    properties: { name: `Hilo ${i+1}`, segmentId, wireNumber: i+1, wireType }
                  });
                  newNodes.push({ id: startNodeId, type: 'wire-start', wireId, segmentId, x: wp1.x, y: wp1.y });
                  newNodes.push({ id: endNodeId, type: 'wire-end', wireId, segmentId, x: wp2.x, y: wp2.y });
               }
               
               dispatch({ type: 'BATCH_UPDATE', payload: { updates: {
                 segments: [...state.segments, segment],
                 elements: [...state.elements, ...newWires],
                 nodes: [...state.nodes, ...newNodes]
               }}});
               dispatch({ type: 'SELECT_ELEMENT', payload: segmentId });
            } else {
               // Copiar un elemento normal (barda, casa, hilo libre)
               const newEl = { ...sourceEl, id: generateId(), properties: { ...sourceEl.properties, name: (sourceEl.properties?.name || sourceEl.type) + ' Copia' } };
               if (newEl.points) {
                  newEl.points = newEl.points.map(p => ({ x: p.x + offset, y: p.y + offset }));
               } else {
                  newEl.x += offset;
                  newEl.y += offset;
               }
               
               let updates = {
                  elements: [...state.elements, newEl]
               };
               
               if (newEl.type === 'wire') {
                  const startNodeId = generateId();
                  const endNodeId = generateId();
                  const newNodes = [
                     { id: startNodeId, type: 'wire-start', wireId: newEl.id, segmentId: null, x: newEl.points[0].x, y: newEl.points[0].y },
                     { id: endNodeId, type: 'wire-end', wireId: newEl.id, segmentId: null, x: newEl.points[1].x, y: newEl.points[1].y }
                  ];
                  updates.nodes = [...state.nodes, ...newNodes];
               }
               
               dispatch({ type: 'BATCH_UPDATE', payload: { updates } });
               dispatch({ type: 'SELECT_ELEMENT', payload: newEl.id });
            }
            dispatch({ type: 'SET_TOOL', payload: 'select' });
         }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, dispatch]);

  const renderGrid = () => {
    if (!state.view.showGrid) return null;
    return (
      <pattern id="grid" width={state.view.gridSize} height={state.view.gridSize} patternUnits="userSpaceOnUse">
        <path d={`M ${state.view.gridSize} 0 L 0 0 0 ${state.view.gridSize}`} fill="none" stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="1"/>
      </pattern>
    );
  };
  
  const renderFlowArrows = (edgeId, pathD, isReversed) => {
     const dur = 1.5; // Always 1.5s to keep them somewhat in sync
     const arrows = [];
     const numArrows = 3;
     for (let i = 0; i < numArrows; i++) {
         const beginDelay = (dur / numArrows) * i;
         arrows.push(
            <g key={`${edgeId}-arrow-${i}`} fill="#000">
               <polygon points={isReversed ? "8,-4 0,0 8,4" : "0,-4 8,0 0,4"} />
               <animateMotion dur={`${dur}s`} begin={`-${beginDelay}s`} repeatCount="indefinite" rotate="auto" keyPoints={isReversed ? "1;0" : "0;1"} keyTimes="0;1" calcMode="linear">
                  <mpath href={`#anim-path-${edgeId}`} />
               </animateMotion>
            </g>
         );
     }
     return (
        <g>
           <path id={`anim-path-${edgeId}`} d={pathD} fill="none" stroke="none" />
           {arrows}
        </g>
     );
  };
  
  const getWireColor = (wireType, isSelected) => {
     if (isSelected && wireType !== 'ground') return '#3b82f6';
     switch(wireType) {
       case 'line': return '#ef4444'; 
       case 'ground': return '#22c55e';
       case 'return': return '#3b82f6';
       default: return '#94a3b8';
     }
  };

  const renderElement = (el, isDrawingPreview = false) => {
    const isSelected = state.ui.selectedElementIds.includes(el.id);
    const strokeColor = isSelected ? '#3b82f6' : (darkMode ? '#94a3b8' : '#475569');
    const cursor = state.ui.currentTool === 'select' ? (draggingAction && draggingAction.element?.id === el.id ? 'grabbing' : 'grab') : 'crosshair';
    
    switch (el.type) {
      case 'segment':
        if (!el.points || el.points.length < 2) return null;
        
        const p1 = el.points[0];
        const p2 = el.points[1];
        const length = Math.sqrt(Math.pow(p2.x-p1.x,2) + Math.pow(p2.y-p1.y,2));
        const nx = length > 0 ? -(p2.y - p1.y) / length : 0;
        const ny = length > 0 ? (p2.x - p1.x) / length : 0;
        const tx = length > 0 ? (p2.x - p1.x) / length : 1;
        const ty = length > 0 ? (p2.y - p1.y) / length : 0;
        
        const spacing = el.properties?.spacing || 15;
        // Padding around the wires
        const padX = 20; 
        const padY = 25; 
        const widthHalf = ((el.wireCount - 1) / 2) * spacing + padY; 
        
        const polyPoints = `
           ${p1.x - tx*padX + nx*widthHalf},${p1.y - ty*padX + ny*widthHalf} 
           ${p2.x + tx*padX + nx*widthHalf},${p2.y + ty*padX + ny*widthHalf} 
           ${p2.x + tx*padX - nx*widthHalf},${p2.y + ty*padX - ny*widthHalf} 
           ${p1.x - tx*padX - nx*widthHalf},${p1.y - ty*padX - ny*widthHalf}
        `;
        
        return (
          <g key={el.id}>
            {/* Hit area polygon */}
            <polygon points={polyPoints} fill="transparent" stroke="transparent" strokeWidth="4" onPointerDown={(e) => handleElementPointerDown(e, el)} style={{ cursor }} />
            
            {isSelected && state.ui.designMode && !isDrawingPreview && (
              <>
                 <polygon points={polyPoints} fill={darkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)'} stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,4" pointerEvents="none" />
                 
                 {/* Length Resizers with large hit area */}
                 <circle cx={p1.x} cy={p1.y} r="20" fill="transparent" style={{cursor: 'pointer'}} onPointerDown={(e) => handleHandlePointerDown(e, el, 0, 'point')} />
                 <circle cx={p2.x} cy={p2.y} r="20" fill="transparent" style={{cursor: 'pointer'}} onPointerDown={(e) => handleHandlePointerDown(e, el, 1, 'point')} />
                 <circle cx={p1.x} cy={p1.y} r="8" fill="#fff" stroke="#3b82f6" strokeWidth="2" pointerEvents="none" />
                 <circle cx={p2.x} cy={p2.y} r="8" fill="#fff" stroke="#3b82f6" strokeWidth="2" pointerEvents="none" />
                 
                 {/* Spacing Resizers (Both sides, made larger 12x12) */}
                 <rect x={(p1.x + p2.x)/2 + nx * widthHalf - 6} y={(p1.y + p2.y)/2 + ny * widthHalf - 6} width="12" height="12" fill="#fff" stroke="#f59e0b" strokeWidth="2" style={{cursor: 'pointer'}} onPointerDown={(e) => handleHandlePointerDown(e, el, null, 'spacing')} />
                 <rect x={(p1.x + p2.x)/2 - nx * widthHalf - 6} y={(p1.y + p2.y)/2 - ny * widthHalf - 6} width="12" height="12" fill="#fff" stroke="#f59e0b" strokeWidth="2" style={{cursor: 'pointer'}} onPointerDown={(e) => handleHandlePointerDown(e, el, null, 'spacing')} />
              </>
            )}
            
            {/* Draw preview for Segment Creation */}
            {isDrawingPreview && (
               <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#a855f7" strokeWidth="2" strokeDasharray="5,5" />
            )}
          </g>
        );

      case 'post':
        return (
          <g key={el.id} onPointerDown={(e) => handleElementPointerDown(e, el)} style={{ cursor }}>
            <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="#94a3b8" stroke="#475569" strokeWidth="2" rx="2" />
            <line x1={el.x + 2} y1={el.y + el.height/2} x2={el.x + el.width - 2} y2={el.y + el.height/2} stroke="#cbd5e1" strokeWidth="1" />
            {isSelected && !isDrawingPreview && (
              <rect x={el.x - 2} y={el.y - 2} width={el.width + 4} height={el.height + 4} fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,4" pointerEvents="none" />
            )}
          </g>
        );

      case 'energizer':
        const midY = el.y + el.height/2;
        const midX = el.x + el.width/2;
        return (
          <g key={el.id} onPointerDown={(e) => handleElementPointerDown(e, el)} style={{ cursor }}>
            <rect x={el.x} y={el.y} width={el.width} height={el.height} fill={darkMode ? '#1e293b' : '#f1f5f9'} stroke={strokeColor} strokeWidth="2" rx="4" />
            {/* Zap Icon approximation centered relative to height */}
            <path d={`M${midX + 5} ${midY - 25} L${midX - 5} ${midY - 5} L${midX + 2} ${midY - 5} L${midX - 2} ${midY + 15} L${midX + 8} ${midY - 10} L${midX + 1} ${midY - 10} Z`} fill="#f59e0b" />
            <text x={midX} y={midY + 40} textAnchor="middle" fontSize="11" fill={darkMode ? '#94a3b8' : '#64748b'} fontWeight="bold" pointerEvents="none">ENERGIZADOR</text>
            {isSelected && !isDrawingPreview && (
              <rect x={el.x - 2} y={el.y - 2} width={el.width + 4} height={el.height + 4} fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,4" pointerEvents="none" />
            )}
            {isSelected && !isDrawingPreview && (
              <rect x={el.x + el.width - 4} y={el.y + el.height - 4} width="8" height="8" fill="#fff" stroke="#3b82f6" strokeWidth="2" style={{cursor: 'nwse-resize'}} onPointerDown={(e) => handleHandlePointerDown(e, el, null, 'se')} />
            )}
          </g>
        );
      
      case 'wire':
        const wireColor = getWireColor(el.properties?.wireType, isSelected || (hWires && hWires.has(el.id)));
        const isDimmed = hWires && !hWires.has(el.id);
        
        const flowEdgeWire = hPath?.flowEdges?.find(e => e.id === el.id);

        return (
          <g key={el.id} onPointerDown={(e) => handleElementPointerDown(e, el)} style={{ cursor, opacity: isDimmed ? 0.1 : 1, transition: 'opacity 0.2s' }}>
            {el.points.length > 1 && (
              <>
                <line x1={el.points[0].x} y1={el.points[0].y} x2={el.points[1]?.x} y2={el.points[1]?.y} stroke={wireColor} strokeWidth="4" />
                {flowEdgeWire && renderFlowArrows(el.id, `M ${el.points[0].x} ${el.points[0].y} L ${el.points[1].x} ${el.points[1].y}`, flowEdgeWire.isReversed)}
              </>
            )}
            
            {state.ui.showWireLabels && el.points.length > 1 && (
              <text x={el.points[0].x + 10} y={el.points[0].y - 5} fill={darkMode ? '#cbd5e1' : '#475569'} fontSize="10" fontFamily="sans-serif" pointerEvents="none">
                H{el.properties?.wireNumber || 1}
              </text>
            )}

            {isSelected && !isDrawingPreview && el.points.length > 1 && (
              <>
                <circle cx={el.points[0].x} cy={el.points[0].y} r="20" fill="transparent" style={{cursor: 'pointer'}} onPointerDown={(e) => handleHandlePointerDown(e, el, 0, 'point')} />
                <circle cx={el.points[1]?.x} cy={el.points[1]?.y} r="20" fill="transparent" style={{cursor: 'pointer'}} onPointerDown={(e) => handleHandlePointerDown(e, el, 1, 'point')} />
                <circle cx={el.points[0].x} cy={el.points[0].y} r="6" fill="#fff" stroke="#3b82f6" strokeWidth="2" pointerEvents="none" />
                <circle cx={el.points[1]?.x} cy={el.points[1]?.y} r="6" fill="#fff" stroke="#3b82f6" strokeWidth="2" pointerEvents="none" />
              </>
            )}
          </g>
        );
      
      case 'house':
      case 'room':
      case 'wall':
        const getRectFill = () => {
           if (el.type === 'wall') return darkMode ? '#475569' : '#94a3b8'; // Solid gray for wall
           return darkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)'; // Transparent for room
        };
        return (
          <g key={el.id} onPointerDown={(e) => handleElementPointerDown(e, el)} style={{ cursor }}>
            <rect x={el.width < 0 ? el.x + el.width : el.x} y={el.height < 0 ? el.y + el.height : el.y} width={Math.abs(el.width)} height={Math.abs(el.height)} fill={getRectFill()} stroke={strokeColor} strokeWidth="2" />
            {isSelected && !isDrawingPreview && (
              <>
                <rect x={(el.width < 0 ? el.x + el.width : el.x) - 2} y={(el.height < 0 ? el.y + el.height : el.y) - 2} width={Math.abs(el.width) + 4} height={Math.abs(el.height) + 4} fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4" />
                <rect x={(el.width < 0 ? el.x + el.width : el.x) + Math.abs(el.width) - 4} y={(el.height < 0 ? el.y + el.height : el.y) + Math.abs(el.height) - 4} width="8" height="8" fill="#fff" stroke="#3b82f6" strokeWidth="2" style={{cursor: 'nwse-resize'}} onPointerDown={(e) => handleHandlePointerDown(e, el, null, 'se')} />
              </>
            )}
          </g>
        );

      case 'gate':
      case 'door':
        return (
          <g key={el.id} onPointerDown={(e) => handleElementPointerDown(e, el)} style={{ cursor }}>
            <rect x={el.width < 0 ? el.x + el.width : el.x} y={el.height < 0 ? el.y + el.height : el.y} width={Math.abs(el.width)} height={Math.abs(el.height)} fill={el.type === 'gate' ? '#fbbf24' : '#8b5cf6'} stroke={strokeColor} strokeWidth="2" />
            {isSelected && !isDrawingPreview && (
              <rect x={(el.width < 0 ? el.x + el.width : el.x) + Math.abs(el.width) - 4} y={(el.height < 0 ? el.y + el.height : el.y) + Math.abs(el.height) - 4} width="8" height="8" fill="#fff" stroke="#3b82f6" strokeWidth="2" style={{cursor: 'nwse-resize'}} onPointerDown={(e) => handleHandlePointerDown(e, el, null, 'se')} />
            )}
          </g>
        );

      default:
        return null;
    }
  };

  const renderNodes = () => {
     if (!state.ui.designMode) return null;
     return state.nodes.map(n => {
         const isHoverTarget = ['connect', 'bridge'].includes(state.ui.currentTool);
         const isNodeDimmed = hNodes && !hNodes.has(n.id);
         const isOpenNode = hPath?.openNodes?.includes(n.id);
         
         let fill = darkMode ? '#0f172a' : '#fff';
         let stroke = isOpenNode ? '#ef4444' : (darkMode ? '#e2e8f0' : '#0f172a');
         
         if (n.type === 'energizer-out') {
            fill = '#ef4444';
            stroke = '#b91c1c';
         } else if (n.type === 'energizer-gnd') {
            fill = '#22c55e';
            stroke = '#15803d';
         } else if (n.type === 'energizer-ret') {
            fill = '#3b82f6';
            stroke = '#1d4ed8';
         }
         
         return (
           <g key={n.id}>
             {isOpenNode && (
               <circle 
                  cx={n.x} cy={n.y} r="12" 
                  fill="rgba(239, 68, 68, 0.4)" 
                  className="animate-ping"
                  style={{ pointerEvents: 'none' }}
               />
             )}
             <circle 
                style={{ opacity: isNodeDimmed ? 0.1 : 1, transition: 'opacity 0.2s', cursor: isHoverTarget ? 'crosshair' : 'default' }} 
                cx={n.x} cy={n.y} r="5" 
                fill={fill} 
                stroke={stroke} 
                strokeWidth={isOpenNode ? "3" : "2"}
                onPointerDown={(e) => handleNodePointerDown(e, n)}
                onPointerUp={(e) => handleNodePointerUp(e, n)}
             />
           </g>
         );
      });
  };
  
  const renderConnections = () => {
     if (!state.ui.designMode) return null;
     
     // Detect duplicates to offset them visually
     const bridgeCounts = {};
     
     return state.connections.map(conn => {
        const fromNode = state.nodes.find(n => n.id === conn.fromNodeId);
        const toNode = state.nodes.find(n => n.id === conn.toNodeId);
        if (!fromNode || !toNode) return null;
        
        if (conn.type === 'continuity') {
             const flowEdgeConn = hPath?.flowEdges?.find(e => e.id === conn.id);
             return (
               <g key={conn.id}>
                 <line 
                     x1={fromNode.x} y1={fromNode.y} x2={toNode.x} y2={toNode.y} 
                     stroke={state.ui.selectedConnectionIds?.includes(conn.id) ? "#3b82f6" : "#f59e0b"} 
                     strokeWidth="2" strokeDasharray="4,4" 
                     style={{ cursor: 'pointer' }}
                     onPointerDown={(e) => { e.stopPropagation(); dispatch({ type: 'SELECT_CONNECTION', payload: conn.id }); }}
                 />
                 {flowEdgeConn && renderFlowArrows(conn.id, `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`, flowEdgeConn.isReversed)}
               </g>
             );
        } else {
             // Retrieve color from the source wire
             const sourceWire = state.elements.find(w => w.id === fromNode.wireId);
             const wireColor = getWireColor(sourceWire?.properties?.wireType || 'line', state.ui.selectedConnectionIds?.includes(conn.id) || (hConnections && hConnections.has(conn.id)));
             const isConnDimmed = hConnections && !hConnections.has(conn.id);
             
             const flowEdgeConn = hPath?.flowEdges?.find(e => e.id === conn.id);
             
             // Ortogonal Bus Routing (Cables separados)
             const dx = toNode.x - fromNode.x;
             const dy = toNode.y - fromNode.y;
             
             // Check if it's a wire-to-wire bridge on the same side
             const isWireToWire = fromNode.type.startsWith('wire-') && toNode.type.startsWith('wire-');
             const isSameSide = Math.abs(dx) < 5 || Math.abs(dy) < 5;
             
             let midX, midY;
             
             if (isWireToWire && isSameSide) {
                 // Calculate inward vector from source wire
                 let inwardDx = 0;
                 let inwardDy = 0;
                 if (sourceWire && sourceWire.points && sourceWire.points.length >= 2) {
                     if (fromNode.type === 'wire-start') {
                         inwardDx = sourceWire.points[1].x - sourceWire.points[0].x;
                         inwardDy = sourceWire.points[1].y - sourceWire.points[0].y;
                     } else if (fromNode.type === 'wire-end') {
                         inwardDx = sourceWire.points[0].x - sourceWire.points[1].x;
                         inwardDy = sourceWire.points[0].y - sourceWire.points[1].y;
                     }
                 }
                 const len = Math.hypot(inwardDx, inwardDy) || 1;
                 const insetX = (inwardDx / len) * 15;
                 const insetY = (inwardDy / len) * 15;
                 
                 // Orthogonal bridge routing slightly inset from the edges
                 if (Math.abs(dy) > Math.abs(dx)) {
                     // Vertical gap -> Horizontal inset
                     midX = fromNode.x + insetX;
                 } else {
                     // Horizontal gap -> Vertical inset
                     midY = fromNode.y + insetY;
                 }
             } else {
                 // Energizer or generic fanning behavior
                 let wireNum = sourceWire?.properties?.wireNumber;
                 if (!wireNum) {
                     if (fromNode.type === 'energizer-out') wireNum = 1;
                     else if (fromNode.type === 'energizer-gnd') wireNum = 3;
                     else if (fromNode.type === 'energizer-ret') wireNum = 5;
                     else wireNum = 3;
                 }
                 
                 if (Math.abs(dy) > Math.abs(dx)) {
                     const offsetX = (3 - wireNum) * 15;
                     midX = (fromNode.x + toNode.x) / 2 + offsetX;
                 } else {
                     const offsetY = (3 - wireNum) * 15;
                     midY = (fromNode.y + toNode.y) / 2 + offsetY;
                 }
             }
             
             const pathData = (Math.abs(dy) > Math.abs(dx)) 
                 ? `M ${fromNode.x} ${fromNode.y} L ${midX} ${fromNode.y} L ${midX} ${toNode.y} L ${toNode.x} ${toNode.y}`
                 : `M ${fromNode.x} ${fromNode.y} L ${fromNode.x} ${midY} L ${toNode.x} ${midY} L ${toNode.x} ${toNode.y}`;

             return (
                 <g key={conn.id}>
                     <path 
                         d={pathData} 
                         fill="none" 
                         stroke={wireColor}
                         style={{ opacity: isConnDimmed ? 0.1 : 1, transition: 'opacity 0.2s', cursor: 'pointer' }} 
                         strokeWidth={state.ui.selectedConnectionIds?.includes(conn.id) ? "4" : "3"} 
                         onPointerDown={(e) => { e.stopPropagation(); dispatch({ type: 'SELECT_CONNECTION', payload: conn.id }); }}
                     />
                     {flowEdgeConn && renderFlowArrows(conn.id, pathData, flowEdgeConn.isReversed)}
                 </g>
             );
        }
     });
  };

  return (
    <div className={`flex-1 relative overflow-hidden select-none ${darkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`} style={{ cursor: isDraggingPan ? 'grabbing' : (['select'].includes(state.ui.currentTool) ? 'default' : 'crosshair') }}>
      <svg
        id="designer-svg-canvas"
        ref={svgRef}
        width="100%"
        height="100%"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          {renderGrid()}
        </defs>
        <g transform={`translate(${state.view.panX}, ${state.view.panY}) scale(${state.view.zoom})`}>
          <rect width="10000" height="10000" x="-5000" y="-5000" fill="url(#grid)" />
          
          {/* Segments (virtual bounding) - Rendered FIRST so wires are clickable on top */}
          {state.segments.map(seg => renderElement(seg))}

          {/* Elements (Wires, Walls, Gates) */}
          {state.elements.map(el => renderElement(el))}
          
          {/* Drawing Preview */}
          {isDrawing && currentDrawElement && renderElement(currentDrawElement, true)}
          
          {/* Connections & Nodes */}
          {renderConnections()}
          {renderNodes()}
          
          {/* Active Connection Drawing with pointerEvents="none" to prevent blocking */}
          {connectingAction && (
             <line 
                x1={connectingAction.fromNode.x} 
                y1={connectingAction.fromNode.y} 
                x2={connectingAction.tempPoint.x} 
                y2={connectingAction.tempPoint.y} 
                stroke={state.ui.currentTool === 'connect' ? '#f59e0b' : '#a855f7'} 
                strokeWidth="2" 
                strokeDasharray="4,4" 
                pointerEvents="none"
             />
          )}
        </g>
      </svg>
      <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur px-3 py-1 rounded text-xs font-mono border border-slate-200 dark:border-slate-700 shadow-sm pointer-events-none">
        X: {Math.round(-state.view.panX / state.view.zoom)}, Y: {Math.round(-state.view.panY / state.view.zoom)}
      </div>
    </div>
  );
};

export default Workspace;
