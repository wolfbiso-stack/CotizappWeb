export const calculateEconomics = (state, bom, quant) => {
    const economics = state.project?.economics || {
       materialCosts: {},
       labor: [],
       additionalCosts: [],
       settings: { margin: 25, marginType: 'PERCENTAGE_ON_COST', currency: 'MXN' }
    };

    if (!bom || !bom.items) return null;

    // 1. Materials
    let totalMaterials = 0;
    let hasWarnings = false;

    const materialCosts = bom.items.map(item => {
        const costData = economics.materialCosts[item.id] || {};
        const unitCost = costData.unitCost;
        
        let status = 'AUTO';
        let finalUnitCost = 0;

        if (unitCost === undefined || unitCost === null) {
            status = 'WARNING';
            hasWarnings = true;
        } else if (unitCost === 0 && costData.isManual) {
            status = 'NO_COST';
        } else if (costData.isManual) {
            status = 'MANUAL';
            finalUnitCost = unitCost;
        } else {
            // Placeholder for future automated costs (catalog, DB, etc.)
            finalUnitCost = unitCost;
        }

        const subtotal = item.quantity * finalUnitCost;
        totalMaterials += subtotal;
        
        return {
            ...item,
            unitCost: finalUnitCost,
            subtotal,
            costStatus: status
        };
    });

    // Grouping for UI
    const groupedMaterials = {};
    materialCosts.forEach(m => {
        if (!groupedMaterials[m.category]) {
            groupedMaterials[m.category] = [];
        }
        groupedMaterials[m.category].push(m);
    });

    // 2. Labor
    let totalLabor = 0;
    const laborCosts = economics.labor.map(item => {
        let quantity = item.quantity || 0;
        
        // Derive quantity if needed
        if (item.type === 'PER_METER' && item.source === 'fenceLength') {
            quantity = quant?.fenceLengthMeters || 0;
        } else if (item.type === 'PER_PIECE' && item.source === 'totalPosts') {
            quantity = bom.summary?.totalPosts || 0;
        } else if (item.type === 'FIXED') {
            quantity = 1;
        }
        
        const subtotal = quantity * (item.unitCost || 0);
        totalLabor += subtotal;
        
        return {
            ...item,
            quantity,
            subtotal
        };
    });

    // 3. Additional Costs
    let totalAdditional = 0;
    const additionalCosts = economics.additionalCosts.map(item => {
        const subtotal = (item.quantity || 0) * (item.unitCost || 0);
        totalAdditional += subtotal;
        
        return {
            ...item,
            subtotal
        };
    });

    // 4. Totals
    const directCost = totalMaterials + totalLabor + totalAdditional;
    let profit = 0;
    
    if (economics.settings.marginType === 'PERCENTAGE_ON_COST') {
        profit = directCost * ((economics.settings.margin || 0) / 100);
    } else if (economics.settings.marginType === 'FIXED_AMOUNT') {
        profit = economics.settings.margin || 0;
    }

    const suggestedPrice = directCost + profit;
    const costPerMeter = quant?.fenceLengthMeters > 0 ? (directCost / quant.fenceLengthMeters) : 0;
    const pricePerMeter = quant?.fenceLengthMeters > 0 ? (suggestedPrice / quant.fenceLengthMeters) : 0;

    return {
        materialCosts,
        groupedMaterials,
        laborCosts,
        additionalCosts,
        summary: {
            totalMaterials,
            totalLabor,
            totalAdditional,
            directCost,
            profit,
            suggestedPrice,
            costPerMeter,
            pricePerMeter,
            hasWarnings,
            fenceLengthMeters: quant?.fenceLengthMeters || 0
        },
        settings: economics.settings
    };
};
