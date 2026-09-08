import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { X, Download, Printer, Check, Lock, CheckCircle2 } from 'lucide-react';
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
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
        return parseFloat(amount || 0).toLocaleString('en-US', {
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

    const checklistItems = service.trabajo_realizado ? String(service.trabajo_realizado).split('\n').filter(line => line.trim() !== '') : [];

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
                <div className="flex-1 overflow-y-auto bg-gray-200 p-4 md:p-8 min-h-0 flex flex-col items-center">
                    <div className="relative w-full max-w-4xl flex justify-center pb-8">
                        <div
                            ref={reportRef}
                            id="report-paper"
                            className="relative max-w-4xl w-full bg-white shadow-xl overflow-hidden print:shadow-none transition-transform origin-top text-gray-800"
                            style={{ transform: `scale(${reportScale})` }}
                        >
                            {/* 1. Encabezado */}
                            <header className="bg-[#f0f6ff] px-10 py-8">
                                <div className="flex justify-between items-start">
                                    {/* Logo y Datos de Empresa */}
                                    <div className="flex gap-4 items-center">
                                        <div className="w-20 h-20 bg-white rounded flex items-center justify-center p-2 shadow-sm overflow-hidden">
                                            {company?.logo_uri ? (
                                                <img src={company.logo_uri} alt="Logo" className="w-full h-full object-contain" />
                                            ) : (
                                                <span className="text-xl font-bold text-gray-400">LOGO</span>
                                            )}
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-bold text-[#1a365d] mb-1">{company?.nombre || 'CUBI Servicios'}</h1>
                                            <p className="text-[#3b82f6] text-sm">{company?.direccion}</p>
                                            <p className="text-[#3b82f6] text-sm">
                                                Tel: {company?.telefono} | {company?.correo}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Titulo Reporte */}
                                    <div className="text-right">
                                        <h2 className="text-3xl font-bold text-[#374151] mb-2">Reporte Técnico CCTV</h2>
                                        <p className="text-[#6b7280] text-sm">
                                            Folio: <span className="font-bold text-[#3b82f6]">{service.servicio_numero || service.folio}</span>
                                        </p>
                                        <p className="text-[#6b7280] text-sm mt-1">{formatDate(service.servicio_fecha || service.fecha)}</p>
                                    </div>
                                </div>
                            </header>

                            <main className="px-10 py-8">
                                {/* 2. Información Cliente y Técnico */}
                                <div className="flex justify-between items-start mb-8 print-section">
                                    <div>
                                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">CLIENTE</h3>
                                        <p className="text-lg font-bold text-gray-800">{service.cliente_nombre}</p>
                                        <p className="text-gray-500 text-sm mt-1">{service.cliente_telefono}</p>
                                    </div>
                                    <div className="text-right">
                                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">TÉCNICO RESPONSABLE</h3>
                                        <p className="text-lg font-bold text-gray-800">{service.tecnico_nombre}</p>
                                        <p className="text-gray-500 text-sm mt-1">{service.tecnico_celular}</p>
                                    </div>
                                </div>

                                <h2 className="text-xl font-bold text-gray-800 mb-4 print-section">Detalles del Servicio</h2>

                                {/* 3. Detalles del Servicio (Tarjeta 1) */}
                                <div className="border border-gray-200 rounded-xl p-6 mb-6 print-section bg-gray-50/30">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                        <div>
                                            <span className="text-[11px] text-gray-500 uppercase font-bold block mb-2">TIPO</span>
                                            <span className="inline-block bg-white border border-gray-200 text-gray-800 font-semibold px-4 py-1.5 rounded-lg shadow-sm">
                                                {service.tipo_servicio || 'CCTV'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[11px] text-gray-500 uppercase font-bold block mb-2">MARCA</span>
                                            <span className="text-gray-800 font-bold">{service.marca_principal || service.sistema_modelo || '---'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[11px] text-gray-500 uppercase font-bold block mb-2">EQUIPOS INSTALADOS</span>
                                            <span className="text-gray-800 font-bold">{tiposCamarasFormatted || '---'}</span>
                                        </div>
                                    </div>
                                    
                                    {['Mantenimiento', 'Diagnostico', 'Revision'].includes(service.tipo_servicio) ? (
                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">FALLA REPORTADA</h3>
                                                <p className="text-gray-700 italic">"{service.problema_reportado || 'N/A'}"</p>
                                            </div>
                                            <div>
                                                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">SOLUCIÓN APLICADA</h3>
                                                <p className="text-gray-700 whitespace-pre-line">{service.trabajo_realizado || 'N/A'}</p>
                                            </div>
                                        </div>
                                    ) : service.tipo_servicio === 'Otro' ? (
                                        <div>
                                            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">DETALLES DEL SERVICIO</h3>
                                            <p className="text-gray-700 whitespace-pre-line">{service.trabajo_realizado || 'N/A'}</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">ACTIVIDADES REALIZADAS (CHECKLIST)</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
                                                {checklistItems.length > 0 ? (
                                                    checklistItems.map((line, idx) => (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <Check className="w-5 h-5 text-emerald-500 flex-none" strokeWidth={3} />
                                                            <p className="text-gray-700">{line.trim()}</p>
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
                                <div className="border border-blue-100 rounded-xl overflow-hidden flex mb-6 print-section bg-[#f4f8fc]">
                                    <div className="bg-[#2563eb] w-32 flex flex-col justify-center items-center py-6">
                                        <Lock className="w-6 h-6 text-white mb-2" />
                                        <div className="text-white text-xs font-bold tracking-widest uppercase">
                                            ACCESOS
                                        </div>
                                    </div>
                                    <div className="flex-1 p-6">
                                        <div className="grid grid-cols-3 gap-6 mb-6">
                                            <div>
                                                <span className="text-[11px] text-gray-500 uppercase font-bold block mb-1">IP / DOMINIO</span>
                                                <span className="text-gray-800 font-semibold">{service.ip_grabador || service.dominio_ddns || '---'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[11px] text-gray-500 uppercase font-bold block mb-1">USUARIO</span>
                                                <span className="text-gray-800 font-semibold">{service.usuario || '---'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[11px] text-gray-500 uppercase font-bold block mb-1">CONTRASEÑA</span>
                                                <span className="inline-block bg-white border border-gray-200 text-[#2563eb] font-semibold px-4 py-1.5 rounded-lg shadow-sm">
                                                    {service.contrasena || '---'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="border-t border-blue-100/50 pt-4">
                                            <span className="text-[11px] text-gray-500 uppercase font-bold block mb-1">ID P2P / NUBE</span>
                                            <span className="text-gray-800 font-bold text-lg">{service.id_nube_p2p || '---'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 5. Totales y Garantía */}
                                <div className="grid grid-cols-2 gap-6 print-section items-end">
                                    {/* Garantia */}
                                    <div className="border border-gray-200 rounded-xl p-6 bg-gray-50/50 self-start w-full">
                                        <div className="flex items-center gap-2 mb-3">
                                            <CheckCircle2 className={`w-5 h-5 ${service.garantia_aplica ? 'text-blue-500' : 'text-gray-400'}`} />
                                            <h3 className="text-xs font-bold text-gray-700 uppercase">GARANTÍA</h3>
                                        </div>
                                        {service.garantia_aplica ? (
                                            <>
                                                <p className="text-gray-800 font-medium mb-4 text-sm leading-relaxed">
                                                    {service.garantia_detalles || 'Garantía 3 meses en mano de obra. 1 año en Componentes con fabricante.'}
                                                </p>
                                                <div className="border-t border-gray-200 pt-4 flex justify-between">
                                                    <div className="flex gap-2">
                                                        <span className="text-[11px] text-gray-500 uppercase">Inicio:</span>
                                                        <span className="text-[11px] font-bold text-gray-800">{formatDate(service.garantia_fecha_inicio)}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <span className="text-[11px] text-gray-500 uppercase">Fin:</span>
                                                        <span className="text-[11px] font-bold text-gray-800">{formatDate(service.garantia_fecha_vencimiento)}</span>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-gray-500 text-sm">Sin garantía aplicable.</p>
                                        )}
                                    </div>

                                    {/* Totales */}
                                    <div className="bg-[#f0f6ff] rounded-xl p-6 border border-blue-100 self-start w-full">
                                        <div className="space-y-3 mb-4 text-sm text-gray-600">
                                            <div className="flex justify-between">
                                                <span>Mano de Obra</span>
                                                <span className="font-medium">${formatCurrency(manoObra)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Artículos</span>
                                                <span className="font-medium">${formatCurrency(totalRepuestos)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Anticipo Recibido</span>
                                                <span className="text-red-500 font-medium">-${formatCurrency(anticipo)}</span>
                                            </div>
                                        </div>
                                        <div className="border-t border-blue-200 pt-4 flex justify-between items-center">
                                            <span className="text-sm font-bold text-gray-800 uppercase">TOTAL</span>
                                            <span className="text-2xl font-black text-[#1e40af]">${formatCurrency(totalFinal)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 6. Footer y Firmas */}
                                <footer className="mt-10 pt-4 print-section">
                                    <p className="text-[9px] text-gray-400 text-center mb-16 leading-relaxed">
                                        El cliente declara recibir a su entera satisfacción el servicio y/o equipos, aceptando el costo y condiciones. {service.garantia_aplica ? 'La garantía de equipos es del fabricante. La garantía de instalación es de 3 Meses y no cubre daños por variaciones de voltaje, vandalismo o mala operación.' : ''}
                                    </p>

                                    <div className="flex justify-between items-end px-12">
                                        <div className="w-64 text-center">
                                            <div className="border-b border-dashed border-gray-400 mb-2"></div>
                                            <p className="text-xs font-semibold text-gray-600">Firma del Técnico</p>
                                        </div>
                                        <div className="w-64 text-center">
                                            <div className="border-b border-dashed border-gray-400 mb-2"></div>
                                            <p className="text-xs font-semibold text-gray-600">Aceptación del Cliente</p>
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
                            size: letter;
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
