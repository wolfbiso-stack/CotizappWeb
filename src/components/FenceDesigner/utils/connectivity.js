import { calculatePathLengthPx, toMeters } from './measurements';

/**
 * Motor de Análisis de Conectividad (V3)
 * Este módulo procesa el estado del diseñador y devuelve un modelo de grafos
 * y los resultados del análisis de conectividad.
 */

export const analyzeProject = (state) => {
  const { elements, segments, nodes, connections } = state;
  const wires = elements.filter(el => el.type === 'wire');

  const results = {
    summary: {
      totalWires: wires.length,
      totalSegments: segments.length,
      totalNodes: nodes.length,
      totalConnections: connections.length,
      status: 'valid' // 'valid', 'warning', 'error'
    },
    paths: [], // Array de componentes conectados (recorridos)
    errors: [],
    warnings: [],
    nodeDegrees: {},
    wirePathMap: {}, // wireId -> pathId
  };

  // 1. Validate references and build graph
  const adjList = {}; // nodeId -> array of connected nodeIds
  nodes.forEach(n => {
    adjList[n.id] = [];
    results.nodeDegrees[n.id] = 0;
  });

  // Edge type 1: Wires
  wires.forEach(w => {
    const wNodes = nodes.filter(n => n.wireId === w.id);
    if (wNodes.length === 2) {
      adjList[wNodes[0].id].push({ to: wNodes[1].id, type: 'wire', ref: w.id });
      adjList[wNodes[1].id].push({ to: wNodes[0].id, type: 'wire', ref: w.id });
      results.nodeDegrees[wNodes[0].id]++;
      results.nodeDegrees[wNodes[1].id]++;
    } else {
      results.errors.push({ type: 'WIRE_INVALID_NODES', message: `Hilo ${w.properties?.name || w.id} no tiene exactamente 2 nodos.`, refId: w.id });
    }
  });

  // Edge type 2: Connections (Bridges / Continuities)
  connections.forEach(c => {
    const fromExists = adjList[c.fromNodeId];
    const toExists = adjList[c.toNodeId];

    if (!fromExists || !toExists) {
      results.errors.push({ type: 'CONNECTION_INVALID_REF', message: `Conexión contiene referencias inválidas (nodos eliminados).`, refId: c.id });
      return;
    }

    adjList[c.fromNodeId].push({ to: c.toNodeId, type: 'connection', ref: c.id });
    adjList[c.toNodeId].push({ to: c.fromNodeId, type: 'connection', ref: c.id });
    results.nodeDegrees[c.fromNodeId]++;
    results.nodeDegrees[c.toNodeId]++;
  });

  // 2. Find Connected Components (Paths / Recorridos)
  const visited = new Set();
  let pathIdCounter = 1;

  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      const pathNodes = [];
      const pathWires = new Set();
      const pathConnections = new Set();
      
      const queue = [n.id];
      visited.add(n.id);
      
      while(queue.length > 0) {
        const curr = queue.shift();
        pathNodes.push(curr);
        
        adjList[curr].forEach(edge => {
          if (edge.type === 'wire') pathWires.add(edge.ref);
          if (edge.type === 'connection') pathConnections.add(edge.ref);
          
          if (!visited.has(edge.to)) {
            visited.add(edge.to);
            queue.push(edge.to);
          }
        });
      }

      if (pathWires.size === 0) return; // ignore isolated nodes without wires

      // Analyze this path's status
      let openEnds = 0;
      let openNodes = [];
      let hasEnergizerOut = false;
      let hasEnergizerRet = false;
      let hasEnergizerGnd = false;
      
      pathNodes.forEach(nodeId => {
        if (results.nodeDegrees[nodeId] === 1) {
          const nodeObj = state.nodes.find(n => n.id === nodeId);
          if (nodeObj && nodeObj.type === 'energizer-out') {
             hasEnergizerOut = true;
          } else if (nodeObj && nodeObj.type === 'energizer-ret') {
             hasEnergizerRet = true;
          } else if (nodeObj && nodeObj.type === 'energizer-gnd') {
             hasEnergizerGnd = true;
          } else {
             openEnds++;
             openNodes.push(nodeId);
          }
        }
      });

      const wireTypes = Array.from(new Set(Array.from(pathWires).map(wId => {
         const w = wires.find(w => w.id === wId);
         return w?.properties?.wireType || 'unassigned';
      })));

      let status = 'CONNECTED';
      let statusLabel = 'Conectado';
      
      const isGround = wireTypes.includes('ground') && !wireTypes.includes('line');

      if (pathConnections.size === 0) {
        status = 'ISOLATED';
        statusLabel = 'Aislado (Sin Conexiones)';
      } else if (openEnds > 0) {
        if (isGround) {
           status = 'CONNECTED';
           statusLabel = hasEnergizerGnd ? 'Aterrizado a Energizador' : 'Conectado (Tierra)';
        } else {
           status = 'OPEN';
           statusLabel = `Abierto (${openEnds} extremos sueltos)`;
        }
      } else {
        if (isGround) {
           statusLabel = hasEnergizerGnd ? 'Aterrizado a Energizador' : 'Conectado (Tierra)';
        } else {
           // Si no tiene extremos sueltos, y tiene Salida y Retorno
           if (hasEnergizerOut && hasEnergizerRet) {
              statusLabel = 'Conectado a Energizador (OK)';
           } else if (hasEnergizerOut || hasEnergizerRet) {
              status = 'OPEN';
              statusLabel = 'Falta cerrar circuito (Solo conectado a 1 polo)';
           } else {
              statusLabel = 'Conectado (Circuito Cerrado)';
           }
        }
      }

      // Calculate directional flow path for animations
      const flowEdges = [];
      let startNodeId = null;
      
      const outNode = pathNodes.find(nId => state.nodes.find(n => n.id === nId)?.type === 'energizer-out');
      const gndNode = pathNodes.find(nId => state.nodes.find(n => n.id === nId)?.type === 'energizer-gnd');
      
      if (outNode) startNodeId = outNode;
      else if (gndNode) startNodeId = gndNode;
      else if (openNodes.length > 0) startNodeId = openNodes[0];
      else startNodeId = pathNodes[0];
      
      if (startNodeId) {
         const flowVisitedNodes = new Set();
         const flowVisitedEdges = new Set();
         
         const dfsFlow = (currentId) => {
            flowVisitedNodes.add(currentId);
            const edges = adjList[currentId] || [];
            for (let edge of edges) {
               if (!flowVisitedEdges.has(edge.ref)) {
                  flowVisitedEdges.add(edge.ref);
                  
                  let isReversed = false;
                  if (edge.type === 'wire') {
                     const wireNodes = state.nodes.filter(n => n.wireId === edge.ref);
                     const wireStart = wireNodes.find(n => n.type === 'wire-start');
                     if (wireStart && wireStart.id !== currentId) {
                        isReversed = true;
                     }
                  } else if (edge.type === 'connection') {
                     const conn = state.connections.find(c => c.id === edge.ref);
                     if (conn && conn.toNodeId === currentId) {
                        isReversed = true;
                     }
                  }
                  
                  flowEdges.push({ id: edge.ref, type: edge.type, isReversed });
                  
                  if (!flowVisitedNodes.has(edge.to)) {
                     dfsFlow(edge.to);
                  }
               }
            }
         };
         
         dfsFlow(startNodeId);
      }

      const pathObj = {
        id: `path-${pathIdCounter++}`,
        wires: Array.from(pathWires),
        connections: Array.from(pathConnections),
        nodes: pathNodes,
        status,
        statusLabel,
        openEnds,
        openNodes,
        isGround,
        wireTypes,
        flowEdges
      };

      // Ensure path name inherits from the most common wire
      const mainWire = wires.find(w => w.id === pathObj.wires[0]);
      pathObj.name = mainWire?.properties?.name || `Recorrido ${pathObj.id}`;

      results.paths.push(pathObj);

      // Map wires to their path
      pathWires.forEach(wId => {
        results.wirePathMap[wId] = pathObj;
      });
    }
  });

  // Calculate Lengths per path
  results.paths.forEach(p => {
    const px = calculatePathLengthPx(p, state);
    p.lengthPx = px;
    
    if (state.project?.scale?.enabled) {
        const m = toMeters(px, state.project.scale);
        p.lengthMeters = m ? m.toFixed(2) : 'N/D';
    } else {
        p.lengthMeters = 'N/D';
    }
  });

  // Check global ground continuity
  const groundPaths = results.paths.filter(p => p.wireTypes.includes('ground') && !p.wireTypes.includes('line'));
  if (groundPaths.length > 1) {
     results.warnings.push({ type: 'GROUND_DISCONNECTED', message: `Falta continuidad en la Tierra. Se detectaron ${groundPaths.length} circuitos de tierra separados.` });
     groundPaths.forEach(p => {
        if (p.status === 'CONNECTED') {
           p.status = 'PARTIAL';
           p.statusLabel = 'Parcial (Falta continuidad de Tierra)';
        }
     });
  }

  // Add warnings for unassigned wires
  wires.forEach(w => {
     if (w.properties?.wireType === 'unassigned') {
        results.warnings.push({ type: 'WIRE_UNASSIGNED_TYPE', message: `El hilo ${w.properties?.name} no tiene voltaje asignado.`, refId: w.id });
     }
  });

  // Overall status
  if (results.errors.length > 0) results.summary.status = 'error';
  else if (results.paths.some(p => p.status === 'OPEN' || p.status === 'ISOLATED') || results.warnings.length > 0) results.summary.status = 'warning';
  else results.summary.status = 'valid';

  return results;
};
