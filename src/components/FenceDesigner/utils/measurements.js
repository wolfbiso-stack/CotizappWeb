/**
 * Motor de Mediciones y Cuantificación (V4)
 * Calcula longitudes reales usando la geometría visual y la escala calibrada.
 */

export const calculateDistance = (p1, p2) => {
    if (!p1 || !p2) return 0;
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
};

export const toMeters = (pxDistance, scale) => {
    if (!scale || !scale.enabled) return null;
    return pxDistance / scale.pixelsPerMeter;
};

export const calculatePolylineLength = (points) => {
    if (!points || points.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
        total += calculateDistance(points[i], points[i+1]);
    }
    return total;
};

export const calculateElementLengthPx = (el) => {
    if (el.type === 'segment' || el.type === 'wire') {
        return calculatePolylineLength(el.points);
    }
    if (el.type === 'wall') {
        // Para muros, la longitud puede ser el ancho si es horizontal
        return Math.max(Math.abs(el.width), Math.abs(el.height));
    }
    return 0;
};

export const calculatePathLengthPx = (path, state) => {
    let totalPx = 0;
    path.wires.forEach(wId => {
       const wireEl = state.elements.find(w => w.id === wId);
       if (wireEl) {
           totalPx += calculateElementLengthPx(wireEl);
       }
    });
    path.connections.forEach(cId => {
       const conn = state.connections.find(c => c.id === cId);
       if (conn) {
           const fromNode = state.nodes.find(n => n.id === conn.fromNodeId);
           const toNode = state.nodes.find(n => n.id === conn.toNodeId);
           if (fromNode && toNode) {
               totalPx += Math.hypot(toNode.x - fromNode.x, toNode.y - fromNode.y);
           }
       }
    });
    return totalPx;
};

export const formatMeasurement = (pxValue, scale) => {
    const meters = toMeters(pxValue, scale);
    if (meters === null) return 'N/D';
    return `${meters.toFixed(2)} m`;
};

export const generateQuantification = (state, analysis) => {
    const scale = state.project?.scale || { enabled: false, pixelsPerMeter: 100 };
    
    // Contadores
    const counts = {
        segments: state.segments.length,
        wires: state.elements.filter(e => e.type === 'wire').length,
        nodes: state.nodes.length,
        bridges: state.connections.filter(c => c.type === 'bridge').length,
        continuities: state.connections.filter(c => c.type === 'continuity').length,
        energizers: state.elements.filter(e => e.type === 'energizer').length,
        rooms: state.elements.filter(e => e.type === 'room').length,
    };
    
    let fenceLengthPx = 0;
    state.segments.forEach(seg => {
        fenceLengthPx += calculateElementLengthPx(seg);
    });

    let totalWireLengthPx = 0;
    state.elements.filter(e => e.type === 'wire').forEach(w => {
        totalWireLengthPx += calculateElementLengthPx(w);
    });
    state.connections.forEach(conn => {
        const fromNode = state.nodes.find(n => n.id === conn.fromNodeId);
        const toNode = state.nodes.find(n => n.id === conn.toNodeId);
        if (fromNode && toNode) {
            totalWireLengthPx += Math.hypot(toNode.x - fromNode.x, toNode.y - fromNode.y);
        }
    });

    // Construir tabla de hilos (Paths de V3)
    const paths = analysis?.paths || [];
    const tableHilos = paths.map(p => {
        const px = calculatePathLengthPx(p, state);
        
        let tramosSet = new Set();
        p.wires.forEach(wId => {
           const w = state.elements.find(el => el.id === wId);
           if (w?.properties?.parentSegmentId) tramosSet.add(w.properties.parentSegmentId);
        });
        
        return {
            id: p.id,
            name: p.name || `Recorrido ${p.id}`,
            wireTypes: p.wireTypes,
            segmentsCount: tramosSet.size || 1, 
            pxLength: px,
            formattedLength: formatMeasurement(px, scale),
            status: p.statusLabel
        };
    });

    const tableTramos = state.segments.map((s, i) => {
        const px = calculateElementLengthPx(s);
        return {
            id: s.id,
            name: s.properties?.name || `Tramo ${i + 1}`,
            wireCount: s.wireCount || 0,
            pxLength: px,
            formattedLength: formatMeasurement(px, scale),
            status: 'OK' // TBD based on wires inside
        };
    });

    return {
        scaleEnabled: scale.enabled,
        scaleInfo: scale.enabled ? `1m = ${scale.pixelsPerMeter.toFixed(2)}px` : 'No configurada',
        counts,
        fenceLengthPx,
        fenceLengthFormatted: formatMeasurement(fenceLengthPx, scale),
        totalWireLengthPx,
        totalWireLengthFormatted: formatMeasurement(totalWireLengthPx, scale),
        tableHilos,
        tableTramos
    };
};
