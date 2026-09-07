import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, QrCode as QrCodeIcon, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import { downloadPDF, downloadImageBase64 } from '../utils/downloadHelper';

const PrintQRModal = ({ service, onClose, darkMode }) => {
    const qrRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Get base path from document base or default to /CotizappWeb/
    const basePath = document.querySelector('base')?.getAttribute('href') || '/CotizappWeb/';
    // Use Hash Routing for GitHub Pages compatibility
    const publicUrl = `${window.location.origin}${basePath}#/track/${service.token}`;

    const handleDownload = async () => {
        if (!qrRef.current) return;
        setIsGenerating(true);

        try {
            const canvas = await html2canvas(qrRef.current, {
                scale: 4, // High resolution
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });

            const dataUrl = canvas.toDataURL('image/png');
            await downloadImageBase64(dataUrl, `QR-${service.orden_numero || service.folio}.png`);
        } catch (error) {
            console.error('Error generating QR image:', error);
            alert('Error al generar la imagen del QR');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = () => {
        const printContent = qrRef.current;
        if (!printContent) return;
        
        const originalContents = document.body.innerHTML;
        const printStyles = `
            <style>
                @media print {
                    body {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            </style>
        `;
        
        document.body.innerHTML = printStyles + '<div style="display: flex; justify-content: center; padding: 2rem;">' + printContent.innerHTML + '</div>';
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload(); // Reload to restore event listeners properly
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className={`relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl transition-all flex flex-col ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                
                {/* Toolbar */}
                <div className={`p-3 sm:p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 z-10 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <h3 className={`font-bold text-lg flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <QrCodeIcon className="w-5 h-5" />
                        </div>
                        Imprimir QR
                    </h3>

                    <button
                        onClick={onClose}
                        className={`p-2 rounded-xl transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-800'}`}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col items-center justify-center space-y-6">
                    <div 
                        ref={qrRef} 
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center"
                    >
                        <QRCodeSVG
                            value={publicUrl}
                            size={220}
                            level="H"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 w-full">
                        <button
                            onClick={handleDownload}
                            disabled={isGenerating}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                darkMode 
                                ? 'bg-slate-700 text-white hover:bg-slate-600' 
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            <Download className="w-5 h-5" />
                            Descargar
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                        >
                            <Printer className="w-5 h-5" />
                            Imprimir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintQRModal;
