import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, MapPin, Phone, Mail, QrCode as QrCodeIcon } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const QRServiceTicket = ({ service, company: companyProp, onClose, darkMode }) => {
    const ticketRef = useRef(null);
    const [company, setCompany] = useState(companyProp || null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!companyProp) {
            fetchCompany();
        }
    }, [companyProp]);

    const fetchCompany = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('configuracion_empresa')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (!error && data) {
                setCompany(data);
            }
        } catch (error) {
            console.error('Error fetching company:', error);
        }
    };

    // Get base path from document base or default to /CotizappWeb/
    const basePath = document.querySelector('base')?.getAttribute('href') || '/CotizappWeb/';
    // Use Hash Routing for GitHub Pages compatibility
    const publicUrl = `${window.location.origin}${basePath}#/track/${service.token}`;

    const parseDate = (dateString) => {
        if (!dateString) return new Date();
        
        // If it's already a Date object
        if (dateString instanceof Date) return dateString;

        // Try standard ISO format YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return new Date(`${dateString}T00:00:00`);
        }

        // Try DD/MM/YYYY format
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
            const [day, month, year] = dateString.split('/');
            return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
        }

        // Try to parse as is
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) return date;

        return new Date(); // Fallback to current date
    };

    const handleDownloadPDF = async () => {
        if (!ticketRef.current) return;
        setIsGenerating(true);

        try {
            const element = ticketRef.current;
            
            // Clone the element to capture full height without scroll restrictions
            const clone = element.cloneNode(true);
            
            // Apply styles to ensure the clone renders fully and matches the original look
            Object.assign(clone.style, {
                position: 'fixed',
                top: '-10000px',
                left: '-10000px',
                width: '380px', // Force the fixed width of the ticket
                height: 'auto',
                minHeight: '600px',
                overflow: 'visible', // Allow content to expand
                maxHeight: 'none',
                zIndex: '-1000'
            });

            document.body.appendChild(clone);

            const canvas = await html2canvas(clone, {
                scale: 2, // Reduced from 3 to 2 for better file size optimization while maintaining good quality
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: 380, 
            });

            document.body.removeChild(clone);

            // Use JPEG with 0.95 quality instead of PNG
            // PNG is lossless but produces huge files for this kind of content at high resolutions.
            // JPEG at 0.95 is visually identical but significantly smaller.
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            
            const pdfWidth = 100; 
            const pdfHeight = (imgHeight * pdfWidth) / imgWidth;

            const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
            // Use 'FAST' compression for JPEG
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            pdf.save(`Ticket-${service.orden_numero}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            {/* Modal Container */}
            <div className={`relative w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl transition-all ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>

                {/* Toolbar */}
                <div className={`p-4 border-b flex justify-between items-center z-10 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <h3 className={`font-bold text-lg flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <QrCodeIcon className="w-5 h-5" />
                        </div>
                        Ticket QR
                    </h3>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isGenerating}
                            className={`p-2 rounded-xl transition-all ${isGenerating
                                ? 'bg-slate-100 text-slate-400 cursor-wait'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                                }`}
                            title="Descargar PDF"
                        >
                            <Download className="w-5 h-5" />
                        </button>

                        <button
                            onClick={onClose}
                            className={`p-2 rounded-xl transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-800'}`}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto bg-gray-100 p-4 flex justify-center">
                    
                    {/* The Ticket Design */}
                    <div
                        ref={ticketRef}
                        className="bg-white w-full max-w-[380px] shadow-xl overflow-hidden relative flex flex-col text-sm"
                        style={{ minHeight: '600px' }}
                    >
                        {/* Header Section */}
                        <div className="relative bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white p-6 pb-12 rounded-br-[60px]">
                            <div className="flex justify-between items-start mb-4">
                                {/* Profile Image / Logo */}
                                <div className="w-24 h-20 bg-white/20 rounded-lg overflow-hidden flex items-center justify-center backdrop-blur-sm border border-white/10">
                                    {company?.logo_uri ? (
                                        <img src={company.logo_uri} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-bold text-3xl">{company?.nombre?.charAt(0) || 'C'}</span>
                                    )}
                                </div>
                                
                                {/* Badge & Date */}
                                <div className="text-right">
                                    <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-1 inline-block border border-white/10">
                                        #{service.orden_numero}
                                    </div>
                                    <p className="text-[10px] font-medium opacity-90">
                                        {parseDate(service.fecha).toLocaleDateString('es-MX', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Brand Name */}
                            <h1 className="text-xl font-black uppercase tracking-wide mb-3 leading-tight">
                                {company?.nombre || 'MI EMPRESA'}
                            </h1>

                            {/* Contact Info */}
                            <div className="space-y-1 text-[10px] font-medium opacity-90">
                                {company?.direccion && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                                        <span className="truncate">{company.direccion}</span>
                                    </div>
                                )}
                                {company?.telefono && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-3 h-3 text-orange-400 shrink-0" />
                                        <span>{company.telefono}</span>
                                    </div>
                                )}
                                {company?.correo && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-3 h-3 text-blue-300 shrink-0" />
                                        <span>{company.correo}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Body Content */}
                        <div className="px-6 py-6 space-y-6">
                            
                            {/* Cliente Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-400 text-xs font-medium mb-0.5">Cliente</p>
                                    <p className="font-bold text-gray-900 text-base leading-tight">
                                        {service.cliente_nombre || 'Cliente General'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs font-medium mb-0.5">Teléfono</p>
                                    <p className="font-bold text-gray-900 text-base leading-tight">
                                        {service.cliente_telefono || 'N/A'}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-gray-400 text-xs font-medium mb-0.5">Técnico Responsable</p>
                                    <p className="font-bold text-gray-900 text-base leading-tight">
                                        {service.tecnico_nombre || 'Sin asignar'}
                                    </p>
                                </div>
                            </div>

                            {/* Equipo / Modelo */}
                            <div>
                                <p className="text-gray-400 text-xs font-medium mb-0.5">Equipo / Modelo</p>
                                <p className="font-bold text-gray-900 text-base">
                                    {service.equipo_tipo ? `${service.equipo_tipo} ` : ''} 
                                    {service.equipo_modelo || service.marca_principal || service.modelo || 'Equipo Genérico'}
                                </p>
                            </div>

                            {/* Detalles del Servicio */}
                            <div>
                                <h3 className="text-[#1e3a8a] font-bold text-lg mb-3">Detalles del Servicio</h3>
                                
                                <div className="mb-3">
                                    <p className="text-blue-600 text-xs font-bold mb-1">Problema Reportado</p>
                                    <p className="text-gray-800 italic font-medium">
                                        "{service.problema_reportado || service.falla_reportada || 'Sin reporte'}"
                                    </p>
                                </div>

                                <div>
                                    <p className="text-gray-400 text-xs font-medium mb-1">Observaciones de Recepción</p>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 bg-gray-50 min-h-[60px]">
                                        <p className="text-gray-600 text-xs leading-relaxed">
                                            {service.observaciones || service.comentarios || 'Sin observaciones adicionales.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* QR Code */}
                            <div className="flex flex-col items-center justify-center pt-4 pb-2">
                                <QRCodeSVG
                                    value={publicUrl}
                                    size={180}
                                    level="H"
                                    className="mb-3"
                                />
                                <p className="text-gray-500 text-xs font-bold text-center">
                                    Escanee para ver el estado de su equipo
                                </p>
                            </div>

                            {/* Footer Terms */}
                            <div className="border-t border-dashed border-gray-200 pt-4">
                                <p className="text-[9px] text-gray-400 text-justify leading-tight">
                                    <span className="font-bold text-gray-500">Términos y Condiciones:</span> Después de 30 días naturales a partir de la fecha de recepción, no nos hacemos responsables por equipos olvidados, pudiendo estos ser desechados o vendidos para recuperar costos de mano de obra y/o materiales. No hay garantía en software ni virus.
                                </p>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default QRServiceTicket;
