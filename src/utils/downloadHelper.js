import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Guarda y/o comparte un PDF generado con jsPDF.
 * En Web usa la descarga estándar del navegador.
 * En Capacitor (Nativo) guarda el archivo en Documentos y lanza la hoja de compartir.
 * 
 * @param {import('jspdf').jsPDF} pdf Instancia de jsPDF
 * @param {string} filename Nombre del archivo (ej. 'Reporte-123.pdf')
 */
export const downloadPDF = async (pdf, filename) => {
    if (Capacitor.isNativePlatform()) {
        try {
            const dataUriString = pdf.output('datauristring');
            const base64Data = dataUriString.split(',')[1];
            
            let savedFile;
            try {
                // Intentamos guardar directamente en la carpeta pública "Documentos"
                savedFile = await Filesystem.writeFile({
                    path: filename,
                    data: base64Data,
                    directory: Directory.Documents
                });
                alert(`Descarga completada.\nEl archivo se guardó en la carpeta "Documentos" de tu dispositivo.\n\nNombre: ${filename}`);
            } catch (e) {
                console.warn('No se pudo escribir en Documentos públicos, guardando en Caché', e);
                // Si falla (por permisos o Android 11+), guardamos en caché temporal
                savedFile = await Filesystem.writeFile({
                    path: filename,
                    data: base64Data,
                    directory: Directory.Cache
                });
            }
            
            // Opcional: Aún mostramos la hoja de compartir para que puedan enviarlo rápidamente
            try {
                await Share.share({
                    title: filename,
                    url: savedFile.uri,
                    dialogTitle: 'Enviar Archivo (Opcional)'
                });
            } catch (shareError) {
                // El usuario canceló la hoja de compartir, no pasa nada
            }
            
        } catch (error) {
            console.error('Error procesando PDF nativo:', error);
            alert('Error al descargar el archivo en el dispositivo');
        }
    } else {
        pdf.save(filename);
    }
};

/**
 * Guarda y/o comparte una imagen en formato base64 (Data URL).
 * En Web usa un <a> oculto para forzar la descarga.
 * En Capacitor (Nativo) guarda el archivo en Documentos y lanza la hoja de compartir nativa.
 * 
 * @param {string} dataUrl String de la imagen en base64 (ej. 'data:image/png;base64,...')
 * @param {string} filename Nombre del archivo (ej. 'QR-123.png')
 */
export const downloadImageBase64 = async (dataUrl, filename) => {
    if (Capacitor.isNativePlatform()) {
        try {
            const base64Data = dataUrl.split(',')[1];
            
            let savedFile;
            try {
                // Intentamos guardar directamente en la carpeta pública "Documentos"
                savedFile = await Filesystem.writeFile({
                    path: filename,
                    data: base64Data,
                    directory: Directory.Documents
                });
                alert(`Descarga completada.\nLa imagen se guardó en la carpeta "Documentos" de tu dispositivo.\n\nNombre: ${filename}`);
            } catch (e) {
                console.warn('No se pudo escribir en Documentos públicos, guardando en Caché', e);
                savedFile = await Filesystem.writeFile({
                    path: filename,
                    data: base64Data,
                    directory: Directory.Cache
                });
            }
            
            // Compartir
            try {
                await Share.share({
                    title: filename,
                    url: savedFile.uri,
                    dialogTitle: 'Enviar Imagen (Opcional)'
                });
            } catch (shareError) {}
            
        } catch (error) {
            console.error('Error procesando Imagen nativa:', error);
            alert('Error al descargar la imagen en el dispositivo');
        }
    } else {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
    }
};
