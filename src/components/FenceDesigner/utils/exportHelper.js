import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export const exportProjectToPDF = async (state, darkMode, progressCallback) => {
    try {
        const svgContainer = document.getElementById('designer-svg-canvas');
        if (!svgContainer) throw new Error("No se encontró el lienzo principal.");

        // 1. Calculate Bounding Box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        state.segments.forEach(seg => {
            seg.points.forEach(p => {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            });
        });

        state.elements.forEach(el => {
            if (el.points) {
                el.points.forEach(p => {
                    if (p.x < minX) minX = p.x;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.y > maxY) maxY = p.y;
                });
            } else if (el.x !== undefined && el.y !== undefined) {
                const w = el.width || 50;
                const h = el.height || 50;
                if (el.x < minX) minX = el.x;
                if (el.x + w > maxX) maxX = el.x + w;
                if (el.y < minY) minY = el.y;
                if (el.y + h > maxY) maxY = el.y + h;
            }
        });

        state.nodes.forEach(n => {
            if (n.x < minX) minX = n.x;
            if (n.x > maxX) maxX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.y > maxY) maxY = n.y;
        });

        if (minX === Infinity) {
            throw new Error("El diseño está vacío. Agrega elementos antes de exportar.");
        }

        const padding = 100; // Logical pixels
        const bbox = {
            x: minX - padding,
            y: minY - padding,
            width: (maxX - minX) + padding * 2,
            height: (maxY - minY) + padding * 2
        };

        // 2. Setup Offscreen Render Container
        const offscreenContainer = document.createElement('div');
        offscreenContainer.style.position = 'absolute';
        offscreenContainer.style.left = '-9999px';
        offscreenContainer.style.top = '0';
        offscreenContainer.style.backgroundColor = darkMode ? '#0f172a' : '#f8fafc';
        
        // Use 2x Letter resolution for crispness
        const renderWidth = 1584; // 792pt * 2
        const renderHeight = 1224; // 612pt * 2
        offscreenContainer.style.width = `${renderWidth}px`;
        offscreenContainer.style.height = `${renderHeight}px`;

        const clonedSvg = svgContainer.cloneNode(true);
        offscreenContainer.appendChild(clonedSvg);
        document.body.appendChild(offscreenContainer);

        // Remove grid for cleaner print
        const gridDef = clonedSvg.querySelector('defs pattern#grid');
        if (gridDef) gridDef.remove();
        const gridRect = clonedSvg.querySelector('rect[fill="url(#grid)"]');
        if (gridRect) gridRect.remove();

        // Also remove any active tools overlay (like measure)
        const measureLines = clonedSvg.querySelector('.measure-lines');
        if (measureLines) measureLines.remove();

        const gTransform = clonedSvg.querySelector('g');
        if (!gTransform) throw new Error("No se encontró el grupo principal del SVG.");

        // 3. Pagination Logic
        // We fit the logical height into the renderHeight
        const scale = renderHeight / bbox.height;
        const logicalPageWidth = renderWidth / scale;
        
        const totalPages = Math.ceil(bbox.width / logicalPageWidth);

        // 4. Generate PDF
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: 'letter'
        });

        const projectName = state.project.name || 'Diseño de Cerco';

        for (let i = 0; i < totalPages; i++) {
            if (progressCallback) progressCallback(i + 1, totalPages);

            const panX = bbox.x + i * logicalPageWidth;
            const panY = bbox.y;

            // Apply SVG transform
            gTransform.setAttribute('transform', `translate(${-panX * scale}, ${-panY * scale}) scale(${scale})`);

            // Wait a bit for DOM to settle
            await new Promise(res => setTimeout(res, 100));

            const canvas = await html2canvas(offscreenContainer, {
                scale: 1, // Already 2x inside the container
                backgroundColor: darkMode ? '#0f172a' : '#f8fafc',
                logging: false,
            });

            if (i > 0) pdf.addPage();
            
            // Add image to PDF (compress as JPEG to keep file size reasonable)
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.8), 'JPEG', 0, 0, 792, 612);

            // Add Title Block (Membrete)
            pdf.setFillColor(darkMode ? 30 : 255, darkMode ? 41 : 255, darkMode ? 59 : 255);
            pdf.rect(792 - 230, 612 - 60, 210, 40, 'F');
            pdf.setDrawColor(darkMode ? 100 : 200);
            pdf.setLineWidth(1);
            pdf.rect(792 - 230, 612 - 60, 210, 40, 'S');

            pdf.setTextColor(darkMode ? 200 : 50);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.text(`CUBI Servicios`, 792 - 220, 612 - 45);
            
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            const truncatedName = projectName.length > 25 ? projectName.substring(0, 22) + '...' : projectName;
            pdf.text(`Proyecto: ${truncatedName}`, 792 - 220, 612 - 32);
            pdf.text(`Hoja ${i + 1} de ${totalPages}`, 792 - 80, 612 - 32);
        }

        // Cleanup
        document.body.removeChild(offscreenContainer);

        // Save PDF
        pdf.save(`${projectName.replace(/\s+/g, '_')}_Planos.pdf`);

    } catch (e) {
        console.error(e);
        throw e;
    }
};
