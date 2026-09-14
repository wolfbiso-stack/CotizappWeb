import { calculateElementLengthPx } from './measurements';

export const MATERIAL_CATEGORIES = {
    STRUCTURE: 'Estructura',
    WIRES: 'Hilos',
    INSULATORS: 'Aisladores',
    TENSIONING: 'Tensado',
    CONNECTIONS: 'Conexiones',
    ENERGIZATION: 'Energización',
    GROUNDING: 'Tierra física',
    ACCESSORIES: 'Accesorios',
    CONSUMABLES: 'Consumibles',
};

export const getPhysicalCornerPosts = (state) => {
    if (!state.nodes || state.nodes.length === 0) return [];
    
    // Solo nos importan los nodos donde inician/terminan/quiebran los hilos
    const wireNodes = state.nodes.filter(n => n.type === 'wire-start' || n.type === 'wire-end' || n.type === 'continuity');
    if (wireNodes.length === 0) return [];

    const posts = [];
    const SNAP_DIST = 20;
    
    wireNodes.forEach(node => {
        let foundPost = posts.find(p => Math.abs(p.x - node.x) < SNAP_DIST);
        if (foundPost) {
            foundPost.nodes.push(node);
            foundPost.minY = Math.min(foundPost.minY, node.y);
            foundPost.maxY = Math.max(foundPost.maxY, node.y);
            // Agrupar los hilos asociados a este poste (para saber el # de hilos)
            if (node.wireId && !foundPost.wires.includes(node.wireId)) {
                foundPost.wires.push(node.wireId);
            }
        } else {
            posts.push({
                x: node.x,
                minY: node.y,
                maxY: node.y,
                nodes: [node],
                wires: node.wireId ? [node.wireId] : []
            });
        }
    });
    
    return posts;
};

// Base data for materials and their specific calculation rules
export const MATERIALS_DB = [
    {
        id: 'post_intermediate',
        category: MATERIAL_CATEGORIES.STRUCTURE,
        name: 'Poste intermedio (Paso)',
        unit: 'pza',
        description: 'Poste para soporte de hilos en tramos rectos.',
        calculate: (state, quant, settings, scale) => {
            const spacing = settings.postSpacing || 3;
            let qty = 0;
            state.segments.forEach(seg => {
                const lenPx = calculateElementLengthPx(seg);
                const lenM = scale.enabled ? lenPx / scale.pixelsPerMeter : (lenPx / scale.pixelsPerMeter);
                let posts = Math.floor(lenM / spacing);
                let remaining = lenM - (posts * spacing);
                if (remaining < (spacing * 0.5) && posts > 0) {
                    posts -= 1;
                }
                qty += posts;
            });
            return {
                qty,
                details: `Calculado en base a tramos y separación de ${spacing}m.`,
                formula: `Σ max(0, ceil(longitud_tramo / ${spacing}) - 1)`
            };
        }
    },
    {
        id: 'post_corner',
        category: MATERIAL_CATEGORIES.STRUCTURE,
        name: 'Poste esquinero / Terminal',
        unit: 'pza',
        description: 'Poste reforzado para inicios, finales o esquinas.',
        calculate: (state, quant, settings, scale) => {
            const corners = getPhysicalCornerPosts(state);
            return {
                qty: corners.length,
                details: `Basado en la cantidad total de vértices físicos (inicios, finales y quiebres) de los hilos.`,
                formula: `Postes físicos agrupados`
            };
        }
    },
    {
        id: 'wire_line',
        category: MATERIAL_CATEGORIES.WIRES,
        name: 'Hilo de cerco (Aleación/Aluminio)',
        unit: 'm',
        description: 'Cable principal para los circuitos del cerco.',
        calculate: (state, quant, settings, scale) => {
            const waste = settings.wastePercentage || 5;
            const px = quant.totalWireLengthPx || 0;
            const meters = scale.enabled ? px / scale.pixelsPerMeter : (px / scale.pixelsPerMeter);
            const qty = meters * (1 + waste / 100);
            return {
                qty: Math.ceil(qty),
                details: `Longitud total: ${meters.toFixed(2)}m + ${waste}% desperdicio.`,
                formula: `Longitud Hilos × (1 + ${waste}%)`
            };
        }
    },
    {
        id: 'insulator_standard',
        category: MATERIAL_CATEGORIES.INSULATORS,
        name: 'Aislador de paso (Estándar)',
        unit: 'pza',
        description: 'Aisladores para postes intermedios.',
        calculate: (state, quant, settings, scale) => {
            const spacing = settings.postSpacing || 3;
            let totalWires = 0;
            let avgWires = 0;
            if (state.segments.length > 0) {
               totalWires = state.segments.reduce((acc, s) => acc + (s.wireCount || 0), 0);
               avgWires = totalWires / state.segments.length;
            }
            let inter = 0;
            state.segments.forEach(seg => {
                const lenPx = calculateElementLengthPx(seg);
                const lenM = scale.enabled ? lenPx / scale.pixelsPerMeter : (lenPx / scale.pixelsPerMeter);
                let posts = Math.floor(lenM / spacing);
                let remaining = lenM - (posts * spacing);
                if (remaining < (spacing * 0.5) && posts > 0) {
                    posts -= 1;
                }
                inter += posts;
            });
            const qty = inter * Math.round(avgWires);
            return {
                qty,
                details: `Postes de paso (${inter}) × Hilos promedio (${Math.round(avgWires)}).`,
                formula: `Postes Paso × Hilos`
            };
        }
    },
    {
        id: 'insulator_corner',
        category: MATERIAL_CATEGORIES.INSULATORS,
        name: 'Aislador de esquina (Tensor)',
        unit: 'pza',
        description: 'Aisladores de tensión para postes esquineros.',
        calculate: (state, quant, settings, scale) => {
            const corners = getPhysicalCornerPosts(state);
            let totalTensioners = 0;
            corners.forEach(post => {
                // Cada hilo en este poste requiere un aislador de esquina
                totalTensioners += post.wires.length;
            });
            return {
                qty: totalTensioners,
                details: `1 Aislador tensor por cada punta de hilo conectada a un poste esquinero (${corners.length} postes).`,
                formula: `Σ (Hilos por Poste)`
            };
        }
    },
    {
        id: 'tensioner',
        category: MATERIAL_CATEGORIES.TENSIONING,
        name: 'Tensor / Resorte',
        unit: 'pza',
        description: 'Tensores mecánicos para mantener la tensión.',
        calculate: (state, quant, settings, scale) => {
            const corners = getPhysicalCornerPosts(state);
            let totalTensioners = 0;
            corners.forEach(post => {
                // Solo un tensor por cada INICIO de hilo (primer poste del tramo)
                const startNodes = post.nodes.filter(n => n.type === 'wire-start');
                totalTensioners += startNodes.length;
            });
            return {
                qty: totalTensioners,
                details: `1 Tensor solo en el inicio de cada hilo (${corners.length} postes evaluados).`,
                formula: `Σ (Inicios de Hilo)`
            };
        }
    },
    {
        id: 'bridge_cable',
        category: MATERIAL_CATEGORIES.CONNECTIONS,
        name: 'Cable bujía (Alta Tensión)',
        unit: 'm',
        description: 'Cable doble aislamiento para puentes y bajadas.',
        calculate: (state, quant, settings, scale) => {
            const numBridges = quant.counts?.bridges || 0;
            const waste = settings.wastePercentage || 5;
            let meters = (numBridges * 1.5) + (quant.counts?.energizers ? 10 : 0);
            const qty = meters * (1 + waste / 100);
            return {
                qty: Math.ceil(qty),
                details: `Puentes (${numBridges}x1.5m) + Conexión a energizador + ${waste}% desperdicio.`,
                formula: `(Puentes × 1.5m + Bajadas) × (1 + ${waste}%)`
            };
        }
    },
    {
        id: 'connection_clamps',
        category: MATERIAL_CATEGORIES.CONNECTIONS,
        name: 'Conectores / Perros',
        unit: 'pza',
        description: 'Conectores para unir hilos.',
        calculate: (state, quant, settings, scale) => {
            const numBridges = quant.counts?.bridges || 0;
            const numContinuities = quant.counts?.continuities || 0;
            const qty = (numBridges * 2) + (numContinuities * 2);
            return {
                qty,
                details: `2 conectores por puente (${numBridges}) y continuidad (${numContinuities}).`,
                formula: `(Puentes + Continuidades) × 2`
            };
        }
    },
    {
        id: 'energizer_unit',
        category: MATERIAL_CATEGORIES.ENERGIZATION,
        name: 'Energizador',
        unit: 'pza',
        description: 'Equipo principal generador de pulsos.',
        calculate: (state, quant, settings, scale) => {
            const qty = quant.counts?.energizers || (state.segments.length > 0 ? 1 : 0);
            return {
                qty,
                details: `Equipos detectados en el diseño.`,
                formula: `Energizadores dibujados (o 1 por defecto)`
            };
        }
    },
    {
        id: 'ground_rod',
        category: MATERIAL_CATEGORIES.GROUNDING,
        name: 'Varilla Cooperweld (Jabalina)',
        unit: 'pza',
        description: 'Varilla para tierra física independiente.',
        calculate: (state, quant, settings, scale) => {
            const energizers = quant.counts?.energizers || (state.segments.length > 0 ? 1 : 0);
            const qty = energizers * 1; 
            return {
                qty,
                details: `1 jabalina recomendada por energizador (${energizers}).`,
                formula: `Energizadores × 1`
            };
        }
    },
    {
        id: 'warning_signs',
        category: MATERIAL_CATEGORIES.ACCESSORIES,
        name: 'Letreros de Advertencia',
        unit: 'pza',
        description: 'Señalización obligatoria.',
        calculate: (state, quant, settings, scale) => {
            const px = quant.fenceLengthPx || 0;
            const meters = scale.enabled ? px / scale.pixelsPerMeter : (px / scale.pixelsPerMeter);
            const qty = Math.ceil(meters / 10);
            return {
                qty,
                details: `1 letrero sugerido cada 10 metros de cerco (${meters.toFixed(2)}m).`,
                formula: `ceil(Longitud Cerco / 10m)`
            };
        }
    }
];

export const generateBillOfMaterials = (state, quantification) => {
    const scale = state.project?.scale || { enabled: false, pixelsPerMeter: 100 };
    const settings = state.project?.settings || { postSpacing: 3, wastePercentage: 5 };
    const overrides = state.project?.materialsOverrides || {};
    
    if (!quantification) return null;

    let rawList = MATERIALS_DB.map(material => {
        const override = overrides[material.id];
        const isManual = override?.isManual === true;
        
        let calculation;
        try {
            calculation = material.calculate(state, quantification, settings, scale);
        } catch (e) {
            console.error("Error calculating material", material.id, e);
            calculation = { qty: 0, details: "Error en cálculo", formula: "-" };
        }
        
        return {
            ...material,
            autoQuantity: calculation.qty,
            quantity: isManual ? override.quantity : calculation.qty,
            isManual,
            details: calculation.details,
            formula: calculation.formula
        };
    });
    
    rawList = rawList.filter(m => m.quantity > 0 || m.isManual);

    const grouped = {};
    Object.values(MATERIAL_CATEGORIES).forEach(cat => {
        grouped[cat] = [];
    });
    
    rawList.forEach(m => {
        if (grouped[m.category]) {
            grouped[m.category].push(m);
        } else {
            grouped[m.category] = [m];
        }
    });

    return {
        items: rawList,
        grouped,
        summary: {
            totalItems: rawList.length,
            totalPosts: rawList.filter(m => m.category === MATERIAL_CATEGORIES.STRUCTURE).reduce((s, m) => s + m.quantity, 0),
            totalInsulators: rawList.filter(m => m.category === MATERIAL_CATEGORIES.INSULATORS).reduce((s, m) => s + m.quantity, 0)
        }
    };
};
