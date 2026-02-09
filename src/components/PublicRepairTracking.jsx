import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { getProgressFromStatus, STATUS_OPTIONS } from '../utils/statusMapper';
import { Loader, XCircle, Building2, Phone, Mail, MapPin, Download, QrCode as QrCodeIcon, Share2, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const PublicRepairTracking = () => {
    // Extract token from Hash or Path
    const getToken = () => {
        const hash = window.location.hash;
        if (hash.includes('/track/')) {
            return hash.split('/track/')[1];
        }
        const path = window.location.pathname;
        if (path.includes('/track/')) {
            return path.split('/track/')[1];
        }
        return null;
    };

    const token = getToken();

    const [service, setService] = useState(null);
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const ticketRef = useRef(null);

    useEffect(() => {
        if (token) {
            fetchData();
        } else {
            setError('Token no proporcionado en la URL');
            setLoading(false);
        }
    }, [token]);

    const fetchData = async () => {
        try {
            setLoading(true);

            const { data: serviceData, error: serviceError } = await supabase
                .from('servicios_pc')
                .select('*, user_id')
                .eq('public_token', token)
                .single();

            if (serviceError) throw serviceError;
            if (!serviceData) throw new Error('Servicio no encontrado');

            setService(serviceData);

            try {
                if (serviceData.user_id) {
                    const { data: companyData } = await supabase
                        .from('configuracion_empresa')
                        .select('*')
                        .eq('user_id', serviceData.user_id)
                        .single();

                    if (companyData) setCompany(companyData);
                }
            } catch (err) {
                console.log('No company data available');
            }
        } catch (err) {
            console.error('Error fetching service:', err);
            setError('No se pudo encontrar el servicio. Verifica el código QR.');
        } finally {
            setLoading(false);
        }
    };

    // Get public URL for QR
    const basePath = document.querySelector('base')?.getAttribute('href') || '/CotizappWeb/';
    const publicUrl = service ? `${window.location.origin}${basePath}#/track/${service.public_token}` : '';


    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    const getStatusLabel = (statusValue) => {
        const option = STATUS_OPTIONS.find(o => o.value === statusValue?.toLowerCase());
        return option ? option.label : statusValue;
    };

    const handleDownloadPDF = async () => {
        if (!ticketRef.current) return;
        setIsGenerating(true);

        try {
            const element = ticketRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            const yPosition = imgHeight < pdfHeight ? (pdfHeight - imgHeight) / 2 : 0;

            pdf.addImage(imgData, 'PNG', 0, yPosition, imgWidth, imgHeight);
            pdf.save(`Estado-Servicio-${service.orden_numero}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF');
        } finally {
            setIsGenerating(false);
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
                    <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium animate-pulse">Cargando información...</p>
                </div>
            </div>
        );
    }

    if (error || !service) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-md">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <XCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Servicio No Encontrado</h1>
                    <p className="text-slate-600 mb-8 leading-relaxed">{error || 'Enlace no válido.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-500/10 flex flex-col items-center py-8 px-4">

            {/* Action Bar */}
            <div className="w-full max-w-4xl flex justify-end mb-6 gap-4">
                <button
                    onClick={handleDownloadPDF}
                    disabled={isGenerating}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${isGenerating
                            ? 'bg-slate-200 text-slate-400 cursor-wait'
                            : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
                        }`}
                >
                    {isGenerating ? 'Generando PDF...' : (
                        <>
                            <Download className="w-5 h-5" />
                            Descargar Reporte
                        </>
                    )}
                </button>
            </div>

            {/* Document Container */}
            <div
                ref={ticketRef}
                className="bg-white text-slate-900 w-full max-w-[210mm] shadow-2xl p-8 md:p-12 relative flex flex-col rounded-sm"
                style={{ minHeight: '297mm' }}
            >
                {/* Paper Pattern */}
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #000 1px, transparent 0)', backgroundSize: '20px 20px' }}>
                </div>

                {/* Header Section */}
                <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                    <div className="flex items-start gap-6">
                        {company?.logo_uri ? (
                            <img src={company.logo_uri} alt="Logo" className="h-24 w-auto object-contain" />
                        ) : (
                            <div className="h-24 w-24 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-4xl">
                                {company?.nombre?.charAt(0) || 'C'}
                            </div>
                        )}

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
                            {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-12 gap-8 mb-12">
                    {/* Left Column (8) */}
                    <div className="col-span-8 space-y-8">

                        {/* Status Box */}
                        <div className="bg-slate-50 border-l-4 border-blue-500 p-6 rounded-r-xl">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Estado del Servicio</h3>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                                    <Check className="w-6 h-6" />
                                </div>
                                <span className="text-2xl font-bold text-slate-800">{getStatusLabel(service.status)}</span>
                            </div>
                            {service.status === 'entregado' && (
                                <p className="mt-2 text-green-600 font-medium text-sm">El equipo ha sido entregado al cliente.</p>
                            )}
                        </div>

                        {/* Equipment Info */}
                        <div className="border border-slate-200 rounded-xl p-6">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Información del Equipo</h4>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Tipo de Equipo</p>
                                    <p className="font-bold text-slate-800 text-lg">{service.equipo_tipo}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Modelo / Marca</p>
                                    <p className="font-bold text-slate-800 text-lg">{service.equipo_modelo}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Problema Reportado</p>
                                    <p className="text-slate-700 italic bg-red-50 p-3 rounded-lg border border-red-100">
                                        "{service.problema_reportado}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Financials */}
                        <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Resumen Financiero</h4>
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-600">Mano de Obra: <span className="font-bold">${formatCurrency(service.mano_obra)}</span></p>
                                    <p className="text-sm text-slate-600">Refacciones: <span className="font-bold">${formatCurrency(service.repuestos_costo)}</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Estimado</p>
                                    <p className="text-4xl font-black text-slate-900">${formatCurrency(service.total)}</p>
                                    {service.anticipo > 0 && (
                                        <p className="text-sm font-bold text-green-600">Anticipo: -${formatCurrency(service.anticipo)}</p>
                                    )}
                                    <div className="border-t border-slate-300 mt-2 pt-2">
                                        <p className="text-sm font-bold text-blue-600 uppercase flex justify-between gap-4">
                                            <span>Restante:</span>
                                            <span>${formatCurrency((service.total || 0) - (service.anticipo || 0))}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column (4) */}
                    <div className="col-span-4 space-y-8">
                        {/* Client Card */}
                        <div className="bg-slate-900 text-white rounded-xl p-6 relative overflow-hidden print-force-bg">
                            <div className="relative z-10">
                                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Propietario</h3>
                                <p className="text-xl font-bold mb-1">{service.cliente_nombre}</p>
                                <p className="text-slate-400 text-sm mb-4">{service.cliente_telefono}</p>
                                <div className="w-full h-px bg-slate-700 mb-4"></div>
                                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg">
                                    <div className="bg-blue-500 rounded-full p-1.5">
                                        <Phone className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase text-slate-400 font-bold">Contacto Técnico</p>
                                        <p className="font-bold text-sm">{service.tecnico_celular || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Valid QR Code */}
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                            <div className="bg-white p-2 mb-2">
                                <QRCodeSVG
                                    value={publicUrl}
                                    size={120}
                                    level="H"
                                />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Acceso Rápido</p>
                            <p className="text-[10px] text-slate-400 mt-1">Escanea para ver actualizaciones</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-auto pt-8 border-t-2 border-slate-900 flex justify-between items-end">
                    <div className="text-[10px] text-slate-500 max-w-md">
                        <p className="font-bold text-slate-700 uppercase mb-1">Información Importante</p>
                        <p>Este documento es un comprobante del estado de su servicio. Para cualquier aclaración, favor de presentar su número de orden.</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-slate-900 text-lg">{company?.nombre}</p>
                        <p className="text-xs text-slate-500">{new Date().getFullYear()} © CotizApp System</p>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
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

export default PublicRepairTracking;
