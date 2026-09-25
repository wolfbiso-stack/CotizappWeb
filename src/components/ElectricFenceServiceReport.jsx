import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { X, Download, Printer, Check, Zap, Shield, Battery, PenTool, Camera } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { downloadPDF } from '../utils/downloadHelper';

const ElectricFenceServiceReport = ({ service, user, company: companyProp, onClose, darkMode }) => {
    const reportRef = useRef(null);
    const [company, setCompany] = useState(companyProp || null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportScale, setReportScale] = useState(1.0);
    const [photos, setPhotos] = useState([]);

    useEffect(() => {
        const handleResize = () => {
            const screenWidth = window.innerWidth;
            if (screenWidth < 850) {
                setReportScale(Math.max(0.3, (screenWidth - 40) / 816));
            } else {
                setReportScale(1.0);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!companyProp) fetchCompany();
        if (service?.id) fetchPhotos();
    }, [companyProp, user, service]);

    const fetchCompany = async () => {
        try {
            const currentUser = user || (await supabase.auth.getUser()).data.user;
            if (!currentUser) return;

            const { data } = await supabase
                .from('configuracion_empresa')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();

            if (data) setCompany(data);
        } catch (error) {
            console.error('Error fetching company:', error);
        }
    };

    const fetchPhotos = async () => {
        try {
            const { data } = await supabase
                .from('servicio_fotos')
                .select('*')
                .eq('servicio_id', service.id)
                .eq('tipo_servicio', 'servicios_cercos_electricos');
            if (data) setPhotos(data);
        } catch (error) {
            console.error('Error fetching photos:', error);
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
                width: '816px', // A4 width at 96 DPI
                height: 'auto',
                overflow: 'visible',
                zIndex: '-1000',
                transform: 'none'
            });
            document.body.appendChild(clone);

            const canvas = await html2canvas(clone, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, windowWidth: 816 });
            document.body.removeChild(clone);

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            let heightLeft = pdfHeight;
            let position = 0;
            const pageHeight = pdf.internal.pageSize.getHeight();

            if (heightLeft <= pageHeight * 1.3 && heightLeft > pageHeight) {
                 const scaleFactor = Math.min(pageHeight / heightLeft, 1.0);
                 pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth * scaleFactor, heightLeft * scaleFactor);
            } else {
                 pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
                 heightLeft -= pageHeight;
                 while (heightLeft >= 0) {
                     position = heightLeft - pdfHeight;
                     pdf.addPage();
                     pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
                     heightLeft -= pageHeight;
                 }
            }

            const fileName = `Reporte_${service?.orden_numero || 'Cerco'}.pdf`;
            downloadPDF(pdf, fileName);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Hubo un error al generar el PDF");
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (!service) return null;

    // Parse dynamic content
    let parsedDynamic = {};
    if (service.contenido_dinamico) {
        try {
            parsedDynamic = typeof service.contenido_dinamico === 'string' ? JSON.parse(service.contenido_dinamico) : service.contenido_dinamico;
        } catch(e) {}
    }
    
    const sData = { ...service, ...parsedDynamic };
    
    // Parse parts
    let parts = [];
    try {
        if (service.inventario_materiales) {
            parts = typeof service.inventario_materiales === 'string' ? JSON.parse(service.inventario_materiales) : service.inventario_materiales;
        }
    } catch(e){}

    const SectionHeader = ({ title, icon: Icon }) => (
        <div className="flex items-center gap-2 mb-3 bg-gray-100 p-2 border-l-4 border-yellow-500 font-bold text-gray-800">
            {Icon && <Icon size={18} className="text-yellow-600" />}
            <span className="uppercase text-sm">{title}</span>
        </div>
    );

    const DataRow = ({ label, value }) => {
        if (!value && value !== 0) return null;
        return (
            <div className="flex border-b border-gray-100 py-1 text-sm">
                <span className="font-semibold text-gray-700 w-1/2">{label}:</span>
                <span className="text-gray-900 w-1/2">{value}</span>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 print:p-0 print:bg-white print:block overflow-y-auto">
            {/* Control Panel (Hidden on print) */}
            <div className="fixed top-4 right-4 z-50 flex gap-2 print:hidden bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg">
                <button onClick={handleDownloadPDF} disabled={isGenerating} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Descargar PDF">
                    <Download size={20} />
                </button>
                <button onClick={handlePrint} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors" title="Imprimir">
                    <Printer size={20} />
                </button>
                <button onClick={onClose} className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Cerrar">
                    <X size={20} />
                </button>
            </div>

            <div 
                className="bg-white shadow-xl relative my-auto print:shadow-none print:m-0 w-full max-w-4xl mx-auto origin-top"
                style={{ transform: `scale(${reportScale})`, transformOrigin: 'top center' }}
            >
                <div ref={reportRef} className="bg-white w-[816px] min-h-[1056px] mx-auto p-8 font-sans text-gray-800 border box-border">
                    
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
                        <div className="w-1/3">
                            {company?.logo_url ? (
                                <img src={company.logo_url} alt="Logo" className="max-h-24 max-w-[200px] object-contain" crossOrigin="anonymous" />
                            ) : (
                                <h1 className="text-2xl font-black text-gray-800 uppercase">{company?.nombre || 'Mi Empresa'}</h1>
                            )}
                        </div>
                        <div className="w-1/3 text-center">
                            <h2 className="text-xl font-bold uppercase mb-1">REPORTE TÉCNICO</h2>
                            <div className="inline-block bg-yellow-500 text-white font-bold px-3 py-1 text-sm rounded">
                                CERCOS ELÉCTRICOS
                            </div>
                        </div>
                        <div className="w-1/3 text-right text-sm">
                            <div className="text-gray-500">Folio: <span className="font-bold text-red-600 text-lg">{sData.orden_numero}</span></div>
                            <div className="text-gray-500">Fecha: <span className="font-semibold text-gray-800">{new Date(sData.fecha).toLocaleDateString()}</span></div>
                            <div className="text-gray-500">Técnico: <span className="font-semibold text-gray-800">{sData.tecnico_nombre}</span></div>
                        </div>
                    </div>

                    {/* General Info */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <SectionHeader title="Datos del Cliente" />
                            <DataRow label="Nombre" value={sData.cliente_nombre} />
                            <DataRow label="Teléfono" value={sData.cliente_telefono} />
                            <DataRow label="Dirección/Sitio" value={sData.ubicacion_instalacion} />
                        </div>
                        <div>
                            <SectionHeader title="Información del Servicio" />
                            <DataRow label="Tipo de Servicio" value={sData.sub_tipo_servicio || 'Instalación nueva'} />
                            <DataRow label="Tipo de Inmueble" value={sData.tipo_inmueble} />
                            <DataRow label="Estado" value={<span className="uppercase">{sData.estatus}</span>} />
                        </div>
                    </div>

                    {/* Technical Specs */}
                    <div className="mb-6">
                        <SectionHeader title="Especificaciones del Sistema" icon={Shield} />
                        <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                            <DataRow label="Perímetro (m)" value={sData.perimetro_m} />
                            <DataRow label="No. Hilos" value={sData.numero_hilos} />
                            <DataRow label="No. Zonas" value={sData.numero_zonas} />
                            <DataRow label="Altura Promedio" value={sData.altura_promedio ? `${sData.altura_promedio}m` : null} />
                            <DataRow label="Tipo de Poste" value={sData.tipo_poste} />
                            <DataRow label="Conductor" value={sData.tipo_conductor} />
                        </div>
                    </div>

                    {/* Energizer */}
                    <div className="mb-6">
                        <SectionHeader title="Energizador" icon={Zap} />
                        <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                            <DataRow label="Marca" value={sData.energizador_marca} />
                            <DataRow label="Modelo" value={sData.energizador_modelo} />
                            <DataRow label="Serie" value={sData.energizador_serie} />
                            <DataRow label="Joules" value={sData.energizador_joules} />
                            <DataRow label="Salida Nominal" value={sData.energizador_voltaje_salida ? `${sData.energizador_voltaje_salida}V` : null} />
                            <DataRow label="Alimentación" value={sData.energizador_alimentacion} />
                            {sData.tiene_bateria && (
                                <>
                                    <DataRow label="Batería" value={sData.bateria_marca || 'Instalada'} />
                                    <DataRow label="Capacidad (Ah)" value={sData.bateria_capacidad_ah} />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Mediciones Antes/Después */}
                    {sData.medicion_despues_salida && (
                        <div className="mb-6">
                            <SectionHeader title="Mediciones (kV)" icon={Battery} />
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="py-1 px-2">Punto de Medición</th>
                                        <th className="py-1 px-2 text-center text-red-600">Antes</th>
                                        <th className="py-1 px-2 text-center text-green-600">Después</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b">
                                        <td className="py-1 px-2">Voltaje Salida Energizador</td>
                                        <td className="py-1 px-2 text-center">{sData.medicion_antes_salida || '-'}</td>
                                        <td className="py-1 px-2 text-center font-bold">{sData.medicion_despues_salida || '-'}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-1 px-2">Voltaje Retorno</td>
                                        <td className="py-1 px-2 text-center">{sData.medicion_antes_retorno || '-'}</td>
                                        <td className="py-1 px-2 text-center font-bold">{sData.medicion_despues_retorno || '-'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Trabajo y Diagnóstico */}
                    <div className="mb-6">
                        <SectionHeader title="Trabajo Realizado" icon={PenTool} />
                        <div className="text-sm bg-gray-50 p-3 border rounded text-gray-700 whitespace-pre-wrap">
                            {sData.trabajo_realizado || sData.trabajo_realizado_desc || 'Sin descripción detallada.'}
                        </div>
                    </div>
                    
                    {/* Resumen Técnico */}
                    <div className="mb-6">
                        <SectionHeader title="Resumen Técnico y Pruebas" />
                        <p className="text-sm text-gray-700">
                            <strong>Resultado de pruebas:</strong> {sData.pruebas_resultado_general || 'Aprobado'}
                        </p>
                        <p className="text-sm text-gray-700 mt-2">
                            Sistema de cerco eléctrico revisado y entregado. Se comprobó la continuidad del voltaje, estado del energizador y correcto funcionamiento según los parámetros nominales registrados en este documento.
                        </p>
                    </div>

                    {/* Evidencia Fotográfica */}
                    {photos && photos.length > 0 && (
                        <div className="mb-6">
                            <SectionHeader title="Evidencia Fotográfica" icon={Camera} />
                            <div className="grid grid-cols-2 gap-4 mt-4 break-inside-avoid">
                                {photos.map((photo, index) => (
                                    <div key={index} className="flex flex-col items-center">
                                        <img 
                                            src={photo.uri} 
                                            alt={`Evidencia ${index + 1}`} 
                                            className="max-h-64 object-contain border p-1 rounded bg-white shadow-sm"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer / Firmas */}
                    <div className="mt-16 pt-8 border-t-2 border-gray-200">
                        <div className="flex justify-between px-8">
                            <div className="w-64 text-center">
                                <div className="border-b border-gray-400 h-8 mb-2"></div>
                                <div className="text-xs uppercase font-bold text-gray-600">Firma del Técnico</div>
                                <div className="text-xs text-gray-500 mt-1">{sData.tecnico_nombre}</div>
                            </div>
                            <div className="w-64 text-center">
                                <div className="border-b border-gray-400 h-8 mb-2"></div>
                                <div className="text-xs uppercase font-bold text-gray-600">Firma de Conformidad (Cliente)</div>
                                <div className="text-xs text-gray-500 mt-1">{sData.cliente_nombre}</div>
                            </div>
                        </div>
                        <div className="text-center text-xs text-gray-400 mt-8">
                            Documento generado por Cotizapp Web - {company?.nombre}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ElectricFenceServiceReport;
