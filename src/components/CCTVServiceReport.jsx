import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { X, Download, Printer, CheckCircle2, Lock, ShieldCheck, Check } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { downloadPDF } from '../utils/downloadHelper';

const CCTVServiceReport = ({ service, user, company: companyProp, onClose, darkMode }) => {
    const reportRef = useRef(null);
    const [company, setCompany] = useState(companyProp || null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportScale, setReportScale] = useState(1.0);

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
        if (!reportRef.current) return;
        setIsGenerating(true);

        try {
            const element = reportRef.current;
            const clone = element.cloneNode(true);
            Object.assign(clone.style, {
                position: 'fixed',
                top: '-10000px',
                left: '0',
                width: '1024px',
                height: 'auto',
                overflow: 'visible',
                zIndex: '-1000'
            });
            document.body.appendChild(clone);

            const canvas = await html2canvas(clone, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: 1024
            });

            document.body.removeChild(clone);

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            const pageHeight = pdf.internal.pageSize.getHeight();

            if (pdfHeight > pageHeight) {
                const shouldFitOnePage = pdfHeight < pageHeight * 1.3 || reportScale < 1.0;

                if (shouldFitOnePage) {
                    const scaleFactor = Math.min(pageHeight / pdfHeight, reportScale);
                    const imgWidthScaled = pdfWidth * scaleFactor;
                    const imgHeightScaled = pdfHeight * scaleFactor;
                    const xOffset = (pdfWidth - imgWidthScaled) / 2;
                    pdf.addImage(imgData, 'JPEG', xOffset, 0, imgWidthScaled, imgHeightScaled);
                } else {
                    let heightLeft = pdfHeight;
                    let position = 0;
                    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
                    heightLeft -= pageHeight;
                    while (heightLeft >= 0) {
                        position = heightLeft - pdfHeight;
                        pdf.addPage();
                        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
                        heightLeft -= pageHeight;
                    }
                }
            } else {
                const imgWidthScaled = pdfWidth * reportScale;
                const imgHeightScaled = pdfHeight * reportScale;
                const xOffset = (pdfWidth - imgWidthScaled) / 2;
                pdf.addImage(imgData, 'JPEG', xOffset, 0, imgWidthScaled, imgHeightScaled);
            }

            await downloadPDF(pdf, `Reporte-CCTV-${service.servicio_numero || service.folio}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('es-ES', options);
    };

    const getParts = () => {
        if (!service.inventario_materiales && !service.repuestos_descripcion) return [];
        try {
            const src = service.inventario_materiales || service.repuestos_descripcion;
            if (typeof src === 'string' && src.trim().startsWith('[')) {
                return JSON.parse(src).map(p => ({
                    cantidad: p.cantidad || 1,
                    descripcion: p.producto || p.descripcion || 'Sin descripción',
                    costo: p.costoPublico || p.precio_publico || 0
                }));
            } else if (Array.isArray(src)) {
                return src;
            }
        } catch (e) {
            console.error("Error parsing parts:", e);
        }
        return [];
    };

    const formatCurrency = (amount) => {
        return parseFloat(amount || 0).toLocaleString('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const parts = getParts();
    const manoObra = parseFloat(service.mano_obra || 0);
    const totalRepuestos = parts.reduce((acc, part) => acc + (parseFloat(part.costoPublico || part.costo || 0) * (parseFloat(part.cantidad) || 1)), 0);
    const subtotal = manoObra + totalRepuestos;
    const anticipo = parseFloat(service.anticipo || 0);
    const totalFinal = parseFloat(service.total || subtotal);
    
    let tiposCamarasFormatted = service.tipos_camaras || '';
    if (Array.isArray(tiposCamarasFormatted)) {
        tiposCamarasFormatted = tiposCamarasFormatted.join(', ');
    }

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className={`relative w-full max-w-5xl max-h-[95vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-all ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>

                {/* Modal Actions - NO PRINT */}
                <div className={`p-3 sm:p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 z-10 flex-none no-print ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <h3 className={`font-bold text-lg flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        Vista Previa de Reporte CCTV
                    </h3>

                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4 w-full sm:w-auto">
                        <div className="hidden lg:flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-1.5 dark:bg-slate-800">
                            <span className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>ESCALA: {Math.round(reportScale * 100)}%</span>
                            <input
                                type="range"
                                min="0.5"
                                max="1.0"
                                step="0.05"
                                value={reportScale}
                                onChange={(e) => setReportScale(parseFloat(e.target.value))}
                                className="w-24 h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrint}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${darkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                                <Printer className="w-4 h-4" />
                                <span className="hidden sm:inline font-bold">Imprimir</span>
                            </button>

                            <button
                                onClick={handleDownloadPDF}
                                disabled={isGenerating}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${isGenerating ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'}`}
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline font-bold">{isGenerating ? 'Generando...' : 'Descargar PDF'}</span>
                            </button>

                            <button
                                onClick={onClose}
                                className={`p-2 rounded-xl transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800'}`}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Report Content Container */}
                <div className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-10 min-h-0 flex flex-col items-center">
                    <div className="relative w-full max-w-4xl flex justify-center py-4">
                        <div
                            ref={reportRef}
                            id="report-paper"
                            className="relative max-w-4xl w-full bg-white shadow-xl overflow-hidden print:shadow-none transition-transform origin-top"
                            style={{ transform: `scale(${reportScale})` }}
                        >
                            {/* 1. Encabezado */}
                            <header className="p-8 bg-[#0ea5e9] text-white">
                                <div className="flex flex-col md:flex-row justify-between items-center">
                                    {/* Logo y Datos de Empresa */}
                                    <div className="flex items-center gap-6">
                                        <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center p-2 shadow-lg overflow-hidden">
                                            {company?.logo_uri ? (
                                                <img src={company.logo_uri} alt="Logo" className="w-full h-full object-contain" />
                                            ) : (
                                                <span className="text-xl font-bold text-gray-400">LOGO</span>
                                            )}
                                        </div>
                                        <div>
                                            <h1 className="text-3xl font-black tracking-tight mb-1 uppercase">{company?.nombre || 'Mi Empresa'}</h1>
                                            <p className="text-sm text-blue-100 uppercase font-medium">{company?.direccion}</p>
                                            <p className="text-sm text-blue-100 uppercase font-medium">{company?.telefono}</p>
                                            <p className="text-sm text-blue-100">{company?.correo}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Titulo Reporte */}
                                    <div className="text-right mt-6 md:mt-0">
                                        <h2 className="text-3xl font-black mb-2 uppercase">Reporte Técnico<br/>CCTV</h2>
                                        <div className="bg-white/20 inline-block px-4 py-2 rounded-lg backdrop-blur-sm">
                                            <p className="text-sm font-semibold uppercase tracking-wider text-blue-100 mb-1">Folio</p>
                                            <p className="text-xl font-bold">{service.servicio_numero || service.folio}</p>
                                        </div>
                                        <p className="text-sm font-semibold mt-2 text-blue-100">FECHA: {formatDate(service.servicio_fecha || service.fecha)}</p>
                                    </div>
                                </div>
                            </header>

                            <main className="p-8 space-y-6">
                                {/* 2. Información Cliente y Técnico */}
                                <div className="grid grid-cols-2 gap-8 border-b-2 border-gray-100 pb-6 print-section">
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Cliente</h3>
                                        <p className="text-lg font-bold text-gray-800 uppercase">{service.cliente_nombre}</p>
                                        <p className="text-sm text-gray-600">{service.cliente_telefono}</p>
                                        <p className="text-sm text-gray-600">{service.cliente_direccion}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Técnico Responsable</h3>
                                        <p className="text-lg font-bold text-gray-800 uppercase">{service.tecnico_nombre}</p>
                                        <p className="text-sm text-gray-600">{service.tecnico_celular}</p>
                                    </div>
                                </div>

                                {/* 3. Detalles del Servicio (Tarjeta 1) */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden print-section">
                                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-wrap gap-6 items-center">
                                        <div className="flex-1">
                                            <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Tipo</span>
                                            <span className="inline-block bg-[#0ea5e9] text-white text-xs font-bold px-3 py-1 rounded-full uppercase">{service.tipo_servicio || 'CCTV'}</span>
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Marca</span>
                                            <span className="text-gray-800 font-bold uppercase">{service.marca_principal || service.sistema_modelo || 'N/A'}</span>
                                        </div>
                                        <div className="flex-1 min-w-[200px]">
                                            <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Equipos Instalados</span>
                                            <span className="text-gray-800 font-bold uppercase">{tiposCamarasFormatted || 'N/A'}</span>
                                        </div>
                                    </div>
                                    {['Mantenimiento', 'Diagnostico', 'Revision'].includes(service.tipo_servicio) ? (
                                        <div className="p-6 bg-white space-y-6">
                                            {service.problema_reportado && (
                                                <div>
                                                    <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">Falla Reportada</h3>
                                                    <p className="text-gray-700 italic border-l-4 border-amber-400 pl-3 py-1 bg-amber-50/50">"{service.problema_reportado}"</p>
                                                </div>
                                            )}
                                            {service.trabajo_realizado && (
                                                <div>
                                                    <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">Solución Aplicada</h3>
                                                    <p className="text-gray-700 whitespace-pre-line">{service.trabajo_realizado}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-white">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                                                {service.tipo_servicio === 'Otro' ? 'Detalles del Servicio' : 'Actividades Realizadas (Checklist)'}
                                            </h3>
                                            <div className="space-y-3">
                                                {service.trabajo_realizado ? (
                                                    String(service.trabajo_realizado).split('\n').filter(line => line.trim() !== '').map((line, idx) => (
                                                        <div key={idx} className="flex items-start gap-3">
                                                            <Check className="w-5 h-5 text-green-500 mt-0.5 flex-none" strokeWidth={3} />
                                                            <p className="text-gray-700 font-medium">{line.trim()}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-gray-400 italic">No se detallaron actividades.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 4. Accesos (Tarjeta 2) */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden flex print-section">
                                    <div className="bg-[#0ea5e9] w-12 flex flex-col justify-center items-center py-4">
                                        <Lock className="w-6 h-6 text-white mb-2" />
                                        <div className="text-white text-xs font-bold tracking-widest uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                            ACCESOS
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-sky-50/50 p-6 grid grid-cols-2 gap-6">
                                        <div>
                                            <span className="text-xs text-gray-400 uppercase font-bold block mb-1">IP / Dominio</span>
                                            <span className="text-gray-800 font-bold">{service.ip_grabador || service.dominio_ddns || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Usuario</span>
                                            <span className="text-gray-800 font-bold">{service.usuario || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Contraseña</span>
                                            <span className="text-gray-800 font-bold">{service.contrasena || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400 uppercase font-bold block mb-1">ID P2P / Nube</span>
                                            <span className="text-gray-800 font-bold">{service.id_nube_p2p || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 5. Totales y Garantía */}
                                <div className="grid grid-cols-2 gap-6 print-section">
                                    {/* Garantia */}
                                    <div className="border border-gray-200 rounded-xl p-6 flex flex-col justify-center bg-gray-50">
                                        <div className="flex items-center gap-3 mb-4">
                                            <ShieldCheck className={`w-8 h-8 ${service.garantia_aplica ? 'text-green-500' : 'text-gray-400'}`} />
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-800 uppercase">Garantía del Servicio</h3>
                                                <p className={`text-xs font-bold uppercase ${service.garantia_aplica ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {service.garantia_aplica ? 'Activa / Aplica' : 'No Aplica / Expirada'}
                                                </p>
                                            </div>
                                        </div>
                                        {service.garantia_aplica && (
                                            <div className="grid grid-cols-2 gap-4 mt-2">
                                                <div>
                                                    <span className="text-xs text-gray-400 uppercase font-bold block">Inicio</span>
                                                    <span className="text-gray-800 font-bold text-sm">{formatDate(service.garantia_fecha_inicio)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-gray-400 uppercase font-bold block">Fin</span>
                                                    <span className="text-gray-800 font-bold text-sm">{formatDate(service.garantia_fecha_vencimiento)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Totales */}
                                    <div className="bg-[#0ea5e9]/10 rounded-xl p-6 border border-[#0ea5e9]/20">
                                        <div className="space-y-2 mb-4 text-sm font-medium text-gray-600">
                                            <div className="flex justify-between">
                                                <span>Mano de Obra</span>
                                                <span>$ {formatCurrency(manoObra)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Artículos / Materiales</span>
                                                <span>$ {formatCurrency(totalRepuestos)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Anticipo Recibido</span>
                                                <span className="text-red-500">- $ {formatCurrency(anticipo)}</span>
                                            </div>
                                        </div>
                                        <div className="border-t border-[#0ea5e9]/20 pt-4 flex justify-between items-end">
                                            <span className="text-sm font-bold text-[#0ea5e9] uppercase">Total</span>
                                            <span className="text-3xl font-black text-[#0ea5e9]">$ {formatCurrency(totalFinal)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 6. Footer y Firmas */}
                                <footer className="mt-12 pt-8 print-section">
                                    <p className="text-xs text-gray-500 text-center mb-16 italic">
                                        "El cliente declara recibir a su entera satisfacción los trabajos descritos en el presente reporte, así como los equipos en las condiciones señaladas."
                                    </p>

                                    <div className="flex justify-between items-end px-12">
                                        <div className="w-64 text-center">
                                            <div className="border-b-2 border-gray-800 mb-2"></div>
                                            <p className="text-sm font-bold text-gray-800 uppercase">Firma del Técnico</p>
                                        </div>
                                        <div className="w-64 text-center">
                                            <div className="border-b-2 border-gray-800 mb-2"></div>
                                            <p className="text-sm font-bold text-gray-800 uppercase">Aceptación del Cliente</p>
                                        </div>
                                    </div>
                                </footer>
                            </main>
                        </div>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #report-paper, #report-paper * {
                            visibility: visible;
                        }
                        #report-paper {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100% !important;
                            height: auto !important;
                            box-shadow: none !important;
                            border: none !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        @page {
                            size: A4;
                            margin: 0;
                        }
                        .no-print {
                            display: none !important;
                        }
                        .print-section {
                            page-break-inside: avoid;
                        }
                    }
                `}} />
            </div>
        </div>
    );
};

export default CCTVServiceReport;
