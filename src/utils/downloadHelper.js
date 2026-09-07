import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Guarda y/o comparte un PDF generado con jsPDF.
 * En Web usa la descarga estándar del navegador.
 * En Capacitor (Nativo) guarda el archivo en caché y lanza la hoja de compartir nativa.
 * 
 * @param {import('jspdf').jsPDF} pdf Instancia de jsPDF
 * @param {string} filename Nombre del archivo (ej. 'Reporte-123.pdf')
 */
export const downloadPDF = async (pdf, filename) => {
    if (Capacitor.isNativePlatform()) {
        try {
            // pdf.output('datauristring') devuelve algo como 'data:application/pdf;filename=generated.pdf;base64,JVBERi0xLjM...'
            const dataUriString = pdf.output('datauristring');
            const base64Data = dataUriString.split(',')[1];
            
            const savedFile = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache
            });
            
            await Share.share({
                title: filename,
                url: savedFile.uri,
                dialogTitle: 'Guardar o Compartir PDF'
            });
        } catch (error) {
            console.error('Error compartiendo PDF nativo:', error);
            alert('Error al descargar el archivo en el dispositivo');
        }
    } else {
        pdf.save(filename);
    }
};

/**
 * Guarda y/o comparte una imagen en formato base64 (Data URL).
 * En Web usa un <a> oculto para forzar la descarga.
 * En Capacitor (Nativo) guarda el archivo en caché y lanza la hoja de compartir nativa.
 * 
 * @param {string} dataUrl String de la imagen en base64 (ej. 'data:image/png;base64,...')
 * @param {string} filename Nombre del archivo (ej. 'QR-123.png')
 */
export const downloadImageBase64 = async (dataUrl, filename) => {
    if (Capacitor.isNativePlatform()) {
        try {
            const base64Data = dataUrl.split(',')[1];
            
            const savedFile = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache
            });
            
            await Share.share({
                title: filename,
                url: savedFile.uri,
                dialogTitle: 'Guardar o Compartir Imagen'
            });
        } catch (error) {
            console.error('Error compartiendo Imagen nativa:', error);
            alert('Error al descargar la imagen en el dispositivo');
        }
    } else {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
    }
};
