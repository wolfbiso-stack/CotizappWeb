import React, { useRef, useState, useEffect } from 'react';
import { X, Download, MapPin, Phone, Mail, FileText } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { downloadPDF, downloadImageBase64 } from '../utils/downloadHelper';

const ServiceLabel = ({ service, user, company: companyProp, onClose, darkMode }) => {
    const labelRef = useRef(null);
    const [company, setCompany] = useState(companyProp || null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!companyProp) {
            fetchCompany();
        }
    }, [companyProp, user]);

    const fetchCompany = async () => {
        try {
            const currentUser = user || (await supabase.auth.getUser()).data.user;
            if (!currentUser) return;

            const { data, error } = await supabase
                .from('configuracion_empresa')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();

            if (!error && data) {
                setCompany(data);
            }
        } catch (error) {
            console.error('Error fetching company:', error);
        }
    };

    const handleDownloadPDF = async () => {
        if (!labelRef.current) return;
        setIsGenerating(true);

        try {
            const element = labelRef.current;
            const clone = element.cloneNode(true);

            Object.assign(clone.style, {
                position: 'fixed',
                top: '-10000px',
                left: '-10000px',
                width: '850px', // Standard business card ratio (85x55 mm) scaled
                height: '550px',
                overflow: 'hidden',
                zIndex: '-1000'
            });

            document.body.appendChild(clone);

            const canvas = await html2canvas(clone, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: 850,
            });

            document.body.removeChild(clone);

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            
            // Standard business card size: 85x55 mm, landscape ('l')
            const pdf = new jsPDF('l', 'mm', [85, 55]);
            pdf.addImage(imgData, 'JPEG', 0, 0, 85, 55, undefined, 'FAST');
            await downloadPDF(pdf, `Etiqueta-${service.orden_numero || service.folio}.pdf`);
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
            <div className={`relative w-full max-w-4xl max-h-[95vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl transition-all ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>

                {/* Toolbar */}
                <div className={`p-4 border-b flex justify-between items-center z-10 flex-none ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <h3 className={`font-bold text-lg flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                            <FileText className="w-5 h-5" />
                        </div>
                        Etiqueta de Servicio (Tarjeta)
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
                <div className="flex-1 overflow-y-auto bg-gray-100 min-h-0 flex items-center justify-center p-8">
                    {/* The Label Design: 850x550 aspect ratio container */}
                    <div
                        ref={labelRef}
                        className="bg-white shadow-xl relative flex overflow-hidden shrink-0 border border-gray-200"
                        style={{ width: '850px', height: '550px' }}
                    >
                        {/* Left Side: Company Info (approx 60% width) */}
                        <div className="w-3/5 p-12 flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-50 to-white relative z-10 text-center">
                            
                            {/* Logo */}
                            <div className="w-56 h-56 bg-white rounded-3xl overflow-hidden flex items-center justify-center shadow-md border border-gray-100 shrink-0 mb-8 p-4">
                                {company?.logo_uri ? (
                                    <img src={company.logo_uri} alt="Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <span className="font-bold text-6xl text-blue-600">{company?.nombre?.charAt(0) || 'C'}</span>
                                )}
                            </div>

                            {/* Company Name */}
                            <h1 className="text-4xl font-black text-gray-900 leading-tight uppercase w-full mb-6">
                                {company?.nombre || 'MI EMPRESA'}
                            </h1>
                            
                            {/* Address and Phone */}
                            <div className="space-y-4 w-full flex flex-col items-center">
                                {company?.direccion && (
                                    <div className="flex items-center gap-3 text-gray-700 max-w-sm">
                                        <MapPin className="w-6 h-6 text-red-500 shrink-0" />
                                        <span className="text-lg font-medium leading-snug text-left">{company.direccion}</span>
                                    </div>
                                )}
                                
                                {company?.telefono && (
                                    <div className="flex items-center gap-3 text-gray-700 max-w-sm">
                                        <svg className="w-6 h-6 text-[#25D366] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                        </svg>
                                        <span className="text-xl font-bold">{company.telefono}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Side: QR Code Area (approx 40% width) */}
                        <div className="w-2/5 bg-gradient-to-bl from-blue-600 to-blue-800 p-8 flex flex-col items-center justify-center relative">
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-bl-full pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-tr-full pointer-events-none"></div>
                            
                            <h2 className="text-white font-bold text-center text-xl mb-8 uppercase tracking-widest z-10 px-4">
                                Escanear para ver<br/>detalles del Servicio
                            </h2>
                            
                            {/* Blank Space for QR */}
                            <div className="w-64 h-64 bg-white rounded-2xl shadow-inner border-2 border-dashed border-gray-300 flex items-center justify-center z-10 relative">
                                <div className="text-center opacity-30">
                                    <div className="w-16 h-16 border-4 border-gray-400 rounded-lg mx-auto mb-2 relative">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-gray-400"></div>
                                    </div>
                                    <span className="text-sm font-bold uppercase">Espacio QR</span>
                                </div>
                                {/* Corner markers for sticking */}
                                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-gray-400"></div>
                                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-gray-400"></div>
                                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-gray-400"></div>
                                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-gray-400"></div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceLabel;
