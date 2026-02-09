import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download, QrCode as QrCodeIcon, Share2 } from 'lucide-react';
import { getStatusLabel } from '../utils/statusMapper';
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
                .from('configuracion_empresa') // Corrected table name from 'empresas' based on App.jsx usage
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
    const publicUrl = `${window.location.origin}${basePath}#/track/${service.public_token}`;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    const handleDownloadPDF = async () => {
        if (!ticketRef.current) return;
        setIsGenerating(true);

        try {
            const element = ticketRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff', // Force white background
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Center vertically if it's smaller than the page
            const yPosition = imgHeight < pdfHeight ? (pdfHeight - imgHeight) / 2 : 0;

            pdf.addImage(imgData, 'PNG', 0, yPosition, imgWidth, imgHeight);
            pdf.save(`Ticket-Servicio-${service.orden_numero}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            {/* Main Modal Container */}
            <div className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl transition-all ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>

                {/* 1. Header Toolbar (Actions) */}
                <div className={`p-4 border-b flex justify-between items-center z-10 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <h3 className={`font-bold text-lg flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                            <QrCodeIcon className="w-5 h-5" />
                        </div>
                        Ticket de Seguimiento
                    </h3>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isGenerating}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all shadow-sm ${isGenerating
                                ? 'bg-slate-100 text-slate-400 cursor-wait'
                                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md hover:scale-105'
                                }`}
                        >
                            {isGenerating ? (
                                <>Generando...</>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">Guardar PDF</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={onClose}
                            className={`p-2 rounded-xl transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-800'}`}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* 2. Scrollable Preview Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-500/10 flex justify-center items-start">

                    {/* The "Paper" Document */}
                    <div
                        ref={ticketRef}
                        id="qr-ticket-content"
                        className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] shadow-xl p-8 md:p-12 relative flex flex-col"
                        style={{ aspectRatio: '210/297' }} // A4 aspect ratio hint
                    >
                        {/* Paper Background Pattern/Watermark (Optional) */}
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #000 1px, transparent 0)', backgroundSize: '20px 20px' }}>
                        </div>

                        {/* Document Content */}

                        {/* Header Section */}
                        <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                            <div className="flex items-start gap-6">
                                {/* Logo */}
                                {company?.logo_uri ? (
                                    <img src={company.logo_uri} alt="Logo" className="h-24 w-auto object-contain" />
                                ) : (
                                    <div className="h-24 w-24 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-4xl">
                                        {company?.nombre?.charAt(0) || 'C'}
                                    </div>
                                )}

                                {/* Company Info */}
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase">
                                        {company?.nombre || 'Centro de Servicio'}
                                    </h1>
                                    <div className="space-y-1 text-sm text-slate-600 font-medium">
                                        <p>{company?.direccion}</p>
                                        <p>{company?.ciudad}</p>
                                        <p className="flex items-center gap-2">
                                            {company?.telefono && <span>Tel: {company.telefono}</span>}
                                            {company?.correo && <span>• {company.correo}</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Orden de Servicio</p>
                                <p className="text-5xl font-black text-blue-600">#{service.orden_numero}</p>
                                <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-wide">
                                    {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        {/* Main Grid Content */}
                        <div className="grid grid-cols-12 gap-8 mb-12">

                            {/* Left Side: Details (8 cols) */}
                            <div className="col-span-8 space-y-8">

                                {/* Client Info Box */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Información del Cliente</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Cliente</p>
                                            <p className="text-lg font-bold text-slate-800">{service.cliente_nombre}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Contacto</p>
                                            <p className="text-base text-slate-800">{service.cliente_telefono}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Equipment Info Box */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Detalles del Equipo</h4>
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Equipo</p>
                                            <p className="font-bold text-slate-800">{service.equipo_tipo}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Marca/Modelo</p>
                                            <p className="font-bold text-slate-800">{service.equipo_modelo}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Serie</p>
                                            <p className="font-mono text-sm bg-white border px-2 py-0.5 rounded inline-block">
                                                {service.equipo_serie || 'S/N'}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Problema Reportado</p>
                                        <p className="text-sm text-slate-700 italic border-l-4 border-red-400 pl-3">
                                            "{service.problema_reportado}"
                                        </p>
                                    </div>
                                </div>

                                {/* Financial Summary */}
                                <div className="flex justify-between items-end border-t-2 border-slate-100 pt-6">
                                    <div className="text-sm text-slate-500">
                                        <p className="mb-1"><span className="font-bold text-slate-700">Estado Actual:</span> {getStatusLabel(service.status)}</p>
                                        <p><span className="font-bold text-slate-700">Técnico:</span> {service.tecnico_nombre || 'Por asignar'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Costo Estimado</p>
                                        <p className="text-3xl font-black text-slate-900">${formatCurrency(service.total)}</p>
                                        {service.anticipo > 0 && (
                                            <p className="text-sm font-bold text-green-600 mt-1">
                                                Anticipo: -${formatCurrency(service.anticipo)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: QR & Instructions (4 cols) */}
                            <div className="col-span-4 flex flex-col">
                                <div className="bg-slate-900 text-white rounded-2xl p-6 flex-1 flex flex-col items-center text-center relative overflow-hidden print-force-bg">
                                    {/* Abstract BG */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-30"></div>
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500 rounded-full blur-[60px] opacity-30"></div>

                                    <div className="relative z-10 w-full flex flex-col items-center">
                                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                            <QrCodeIcon className="w-5 h-5 text-blue-400" />
                                            Seguimiento Online
                                        </h3>

                                        <div className="bg-white p-4 rounded-xl shadow-2xl mb-6">
                                            <QRCodeSVG
                                                value={publicUrl}
                                                size={160}
                                                level="H"
                                                includeMargin={false}
                                            />
                                        </div>

                                        <p className="text-xs font-medium text-slate-300 mb-4 leading-relaxed">
                                            Escanea este código con la cámara de tu celular para ver el estado de tu reparación en tiempo real.
                                        </p>

                                        <div className="w-full h-px bg-slate-700 my-4"></div>

                                        <p className="text-[10px] text-slate-500 font-mono break-all opacity-60">
                                            {publicUrl}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer / Terms */}
                        <div className="mt-auto pt-8 border-t-2 border-dashed border-slate-300">
                            <div className="grid grid-cols-2 gap-8 text-[10px] text-slate-500">
                                <div>
                                    <p className="font-bold text-slate-700 uppercase mb-2">Términos y Condiciones</p>
                                    <ul className="list-disc pl-3 space-y-1">
                                        <li>Garantía de 30 días en mano de obra.</li>
                                        <li>No hay garantía por daños líquidos o golpes posteriore</li>
                                        <li>Equipos no reclamados después de 60 días causan abandono.</li>
                                        <li>El taller no se responsabiliza por pérdida de información.</li>
                                    </ul>
                                </div>
                                <div className="text-right flex flex-col justify-end">
                                    <p className="font-bold text-slate-700 uppercase">Gracias por su preferencia</p>
                                    <p>{company?.nombre}</p>
                                    <p className="mt-2 text-slate-400">Generado por CotizApp</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Print Specific Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    @media print {
                        body { background: white; margin: 0; padding: 0; }
                        @page { size: A4; margin: 0; }
                        .print-force-bg { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #0f172a !important; color: white !important; }
                    }
                `
            }} />
        </div>
    );
};

export default QRServiceTicket;
