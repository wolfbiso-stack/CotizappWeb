import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { X, Download, Printer, FileText, CheckCircle2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const PCServiceReport = ({ service, user, company: companyProp, onClose, darkMode }) => {
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

            // Clone and adjust styles for capture
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

            // Fixed scaling based on manual selection
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

            pdf.save(`Reporte-PC-${service.orden_numero || service.folio}.pdf`);
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
        if (!service.repuestos_descripcion) return [];
        try {
            if (typeof service.repuestos_descripcion === 'string' && service.repuestos_descripcion.trim().startsWith('[')) {
                return JSON.parse(service.repuestos_descripcion).map(p => ({
                    cantidad: p.cantidad || 1,
                    descripcion: p.producto || p.descripcion || 'Sin descripción',
                    costo: p.costoPublico || p.precio_publico || 0
                }));
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
    const totalRepuestos = parts.reduce((acc, part) => acc + (parseFloat(part.costo) * (parseFloat(part.cantidad) || 1)), 0);
    const subtotal = manoObra + totalRepuestos;
    const ivaValue = service.incluir_iva ? subtotal * 0.16 : 0;
    const totalFinal = subtotal + ivaValue;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className={`relative w-full max-w-5xl max-h-[95vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-all ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>

                {/* Modal Actions - NO PRINT */}
                <div className={`p-4 border-b flex justify-between items-center z-10 flex-none no-print ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <h3 className={`font-bold text-lg flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        Vista Previa de Reporte
                    </h3>

                    <div className="flex items-center gap-4">
                        {/* Scale Control */}
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
                        {/* Visual Page Break Indicators - Carta (1056px) - NO PRINT / NO CAPTURE */}
                        <div className="absolute left-0 right-0 top-[1056px] border-b-2 border-dashed border-red-400 z-[60] no-print flex justify-end pointer-events-none">
                            <span className="bg-red-400 text-white text-[10px] px-2 py-0.5 font-bold rounded-l-md uppercase shadow-sm">Fin Hoja 1 (Carta)</span>
                        </div>

                        <div className="absolute left-0 right-0 top-[2112px] border-b-2 border-dashed border-red-400 z-[60] no-print flex justify-end pointer-events-none">
                            <span className="bg-red-400 text-white text-[10px] px-2 py-0.5 font-bold rounded-l-md uppercase shadow-sm">Fin Hoja 2 (Carta)</span>
                        </div>

                        <div
                            ref={reportRef}
                            id="report-paper"
                            className="relative max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:border print:border-gray-200 transition-transform origin-top"
                            style={{ transform: `scale(${reportScale})` }}
                        >
                            {/* 1. Encabezado e Información General */}
                            <header className="p-6 md:p-10 bg-indigo-50">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                                    {/* Logo y Nombre de la Empresa */}
                                    <div className="flex items-start mb-4 md:mb-0 max-w-[60%]">
                                        <div className="flex-none h-20 w-auto mr-6 flex items-center justify-center">
                                            {company?.logo_uri ? (
                                                <img src={company.logo_uri} alt="Logo" className="max-h-full w-auto object-contain" />
                                            ) : (
                                                <div className="w-16 h-16 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col justify-center h-20">
                                            <h1 className="text-2xl font-black text-indigo-900 leading-none mb-2 uppercase tracking-tighter">{company?.nombre || 'Tu Empresa Tech'}</h1>
                                            <div className="space-y-0.5">
                                                {company?.direccion && <p className="text-[10px] text-gray-400 font-bold uppercase leading-none">{company.direccion}</p>}
                                                <div className="flex gap-2">
                                                    {company?.telefono && <p className="text-[10px] text-gray-400 font-medium leading-none">Tel: {company.telefono}</p>}
                                                    {company?.correo && <p className="text-[10px] text-gray-400 font-medium leading-none">| {company.correo}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info del Reporte */}
                                    <div className="text-left md:text-right">
                                        <h2 className="text-3xl font-extrabold text-indigo-700">Reporte de Servicio</h2>
                                        <p className="text-gray-600 font-medium">Orden N°: <span className="font-normal">{service.orden_numero || service.folio}</span></p>
                                        <p className="text-gray-600 font-medium">Fecha: <span className="font-normal">{formatDate(service.fecha || new Date())}</span></p>
                                    </div>
                                </div>
                            </header>

                            <main className="p-6 md:p-10">
                                {/* 2. Información Cliente y Técnico */}
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-8 print-section">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-indigo-100 pb-2">Información del Cliente</h3>
                                        <div className="space-y-2 text-gray-700">
                                            <p><strong>Nombre:</strong> {service.cliente_nombre}</p>
                                            <p><strong>Teléfono:</strong> {service.cliente_telefono || 'N/A'}</p>
                                            <p><strong>Correo:</strong> {service.cliente_correo || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-indigo-100 pb-2">Información del Técnico</h3>
                                        <div className="space-y-2 text-gray-700">
                                            <p><strong>Técnico Asignado:</strong> {service.tecnico_nombre || 'N/A'}</p>
                                        </div>
                                    </div>
                                </section>

                                {/* 3. Detalles del Equipo */}
                                <section className="mt-10 print-section">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-indigo-100 pb-2">Detalles del Equipo</h3>
                                    <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div>
                                            <span className="text-sm text-gray-500 block">Tipo de Equipo</span>
                                            <strong className="text-gray-900">{service.equipo_tipo || 'N/A'}</strong>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-500 block">Marca y Modelo</span>
                                            <strong className="text-gray-900">{service.equipo_modelo || 'N/A'}</strong>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-500 block">Número de Serie</span>
                                            <strong className="text-gray-900">{service.equipo_serie || 'N/A'}</strong>
                                        </div>
                                    </div>
                                </section>

                                {/* 4. Problema Reportado y Diagnóstico */}
                                {(service.problema_reportado || service.diagnostico_tecnico) && (
                                    <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 print-section">
                                        {service.problema_reportado && (
                                            <div className="bg-blue-50 border-l-4 border-blue-400 p-5 rounded-r-lg">
                                                <h3 className="text-lg font-bold text-blue-800 mb-2">Problema Reportado por el Cliente</h3>
                                                <p className="text-gray-700 italic">"{service.problema_reportado}"</p>
                                            </div>
                                        )}
                                        {service.diagnostico_tecnico && (
                                            <div className="bg-green-50 border-l-4 border-green-400 p-5 rounded-r-lg">
                                                <h3 className="text-lg font-bold text-green-800 mb-2">Diagnóstico Técnico</h3>
                                                <p className="text-gray-700">{service.diagnostico_tecnico}</p>
                                            </div>
                                        )}
                                    </section>
                                )}

                                {/* 5. Trabajo Realizado */}
                                <section className="mt-10 print-section">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-indigo-100 pb-2">Trabajo Realizado y Solución</h3>
                                    <div className="space-y-3">
                                        {service.trabajo_realizado ? (
                                            service.trabajo_realizado.split('\n').filter(line => line.trim() !== '').map((line, idx) => (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-none fill-green-500/20" strokeWidth={2.5} />
                                                    <p className="text-gray-700 leading-relaxed font-medium">{line.trim()}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-400 italic">Pendiente de registrar descripción detallada.</p>
                                        )}
                                    </div>
                                </section>

                                {/* 6. Repuestos y Costos */}
                                <section className="mt-10 grid grid-cols-1 md:grid-cols-5 gap-8 print-section">
                                    <div className="md:col-span-3">
                                        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-indigo-100 pb-2">Repuestos Utilizados</h3>
                                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-100">
                                                    <tr>
                                                        <th className="p-3 font-semibold text-gray-700">Cant.</th>
                                                        <th className="p-3 font-semibold text-gray-700">Descripción</th>
                                                        <th className="p-3 font-semibold text-gray-700">Costo Unit.</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {parts.length > 0 ? (
                                                        parts.map((item, idx) => (
                                                            <tr key={idx}>
                                                                <td className="p-3 text-gray-700">{item.cantidad}</td>
                                                                <td className="p-3 text-gray-700">{item.descripcion}</td>
                                                                <td className="p-3 text-gray-700">$ {formatCurrency(item.costo)}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="3" className="p-3 text-gray-400 italic text-center">No se utilizaron repuestos adicionales.</td>
                                                        </tr>
                                                    )}
                                                    {parts.length < 2 && (
                                                        <tr>
                                                            <td className="p-3 text-gray-700">&nbsp;</td>
                                                            <td className="p-3 text-gray-700"></td>
                                                            <td className="p-3 text-gray-700"></td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-indigo-100 pb-2">Resumen de Costos</h3>
                                        <div className="bg-indigo-50 rounded-lg p-5 space-y-3">
                                            <div className="flex justify-between text-gray-700">
                                                <span>Mano de Obra</span>
                                                <span className="font-medium">$ {formatCurrency(manoObra)}</span>
                                            </div>
                                            <div className="flex justify-between text-gray-700">
                                                <span>Total Repuestos</span>
                                                <span className="font-medium">$ {formatCurrency(totalRepuestos)}</span>
                                            </div>
                                            <div className="flex justify-between text-gray-700">
                                                <span>Subtotal</span>
                                                <span className="font-medium">$ {formatCurrency(subtotal)}</span>
                                            </div>
                                            <div className="flex justify-between text-gray-700">
                                                <span>IVA (16%)</span>
                                                <span className="font-medium">$ {formatCurrency(ivaValue)}</span>
                                            </div>
                                            <div className="border-t border-indigo-200 pt-3 mt-3">
                                                <div className="flex justify-between text-indigo-800">
                                                    <span className="font-bold text-xl uppercase italic">Total a Pagar</span>
                                                    <span className="font-bold text-xl">$ {formatCurrency(totalFinal)}</span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 text-right mt-1 font-bold">MONEDA: MXN</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* 7. Observaciones y Recomendaciones */}
                                <section className="mt-10 print-section">
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-5 rounded-r-lg">
                                        <h3 className="text-lg font-bold text-yellow-800 mb-2">Observaciones y Recomendaciones</h3>
                                        <p className="text-gray-700 italic">
                                            {service.observaciones || 'Se recomienda realizar una limpieza física interna cada 12 meses para evitar sobrecalentamiento.'}
                                        </p>
                                    </div>
                                </section>

                                {/* 8. Garantía y Cierre */}
                                <footer className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500 print-section">
                                    <p className="mb-2"><strong>Garantía:</strong> El servicio de mano de obra cuenta con 30 días de garantía. Componentes de hardware cuentan con garantía según fabricante.</p>

                                    <div className="flex flex-col md:flex-row justify-between items-center mt-10 gap-8">
                                        <div className="w-full md:w-1/2">
                                            <p className="text-center">Recibí de conformidad</p>
                                            <div className="border-b-2 border-dotted border-gray-400 mt-12"></div>
                                            <p className="text-center font-medium text-gray-700 mt-2">{service.cliente_nombre || 'Cliente'}</p>
                                        </div>
                                        <div className="w-full md:w-1/2">
                                            <p className="text-center">Entregado por</p>
                                            <div className="border-b-2 border-dotted border-gray-400 mt-12"></div>
                                            <p className="text-center font-medium text-gray-700 mt-2">{service.tecnico_nombre || 'Técnico'}</p>
                                        </div>
                                    </div>
                                </footer>
                            </main>
                        </div>
                    </div>
                </div>

                {/* Print Styles Injection */}
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
                        #report-paper {
                            transform: scale(${reportScale * 0.95});
                            transform-origin: top center;
                        }
                        .no-print {
                            display: none !important;
                        }
                        .print-card {
                            box-shadow: none !important;
                            border: 1px solid #e5e7eb !important;
                        }
                        .print-section {
                            page-break-inside: avoid;
                        }
                        header {
                            background-color: #f5f3ff !important; /* bg-indigo-50 */
                        }
                        .bg-indigo-50 { background-color: #f5f3ff !important; }
                        .bg-indigo-600 { background-color: #4f46e5 !important; }
                        .bg-gray-50 { background-color: #f9fafb !important; }
                        .bg-blue-50 { background-color: #eff6ff !important; }
                        .bg-green-50 { background-color: #f0fdf4 !important; }
                        .bg-yellow-50 { background-color: #fefce8 !important; }
                        .bg-gray-100 { background-color: #f3f4f6 !important; }
                        .text-indigo-800 { color: #3730a3 !important; }
                        .text-indigo-700 { color: #4338ca !important; }
                        .text-blue-800 { color: #1e40af !important; }
                        .text-green-800 { color: #166534 !important; }
                        .text-yellow-800 { color: #854d0e !important; }
                        .border-indigo-100 { border-color: #e0e7ff !important; }
                        .border-blue-400 { border-color: #60a5fa !important; }
                        .border-green-400 { border-color: #4ade80 !important; }
                        .border-yellow-400 { border-color: #facc15 !important; }
                    }
                `}} />
            </div>
        </div>
    );
};

export default PCServiceReport;
