
import React, { useRef, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer } from 'lucide-react';
import { supabase } from '../../utils/supabase';

const ServiceReceipt = ({ service, onClose, company: companyProp, darkMode }) => {
    const [company, setCompany] = useState(companyProp || null);

    // Fetch company data if not provided (fallback)
    useEffect(() => {
        if (!companyProp) {
            const fetchCompany = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data } = await supabase
                        .from('configuracion_empresa')
                        .select('*')
                        .eq('user_id', user.id)
                        .single();
                    if (data) setCompany(data);
                }
            };
            fetchCompany();
        }
    }, [companyProp]);

    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Construct Public URL
    const basePath = document.querySelector('base')?.getAttribute('href') || '/CotizappWeb/';
    const publicUrl = `${window.location.origin}${basePath}#/track/${service.token}`;

    const remaining = (service.total || 0) - (service.anticipo || 0);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {/* Container: visible on screen, hides modal background on print */}
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">

                {/* Modal Header - No Print */}
                <div className={`p-4 border-b flex justify-between items-center no-print ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Vista Previa del Ticket</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            title="Imprimir"
                        >
                            <Printer size={20} />
                        </button>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded hover:bg-slate-200 transition ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500'}`}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Ticket Content - Scrollable on screen */}
                <div className="overflow-y-auto p-4 bg-gray-100 flex justify-center">

                    {/* The actual Receipt Paper */}
                    <div
                        id="printable-ticket"
                        className="bg-white w-[80mm] min-h-[100mm] p-2 shadow-sm text-black font-mono text-[10px] leading-tight"
                        style={{ fontFamily: "'Courier New', Courier, monospace" }}
                    >
                        {/* 1. Header: Logo & Company */}
                        <div className="text-center mb-2">
                            {company?.logo_uri && (
                                <img src={company.logo_uri} alt="Logo" className="h-12 mx-auto mb-1 object-contain grayscale" />
                            )}
                            <h2 className="font-bold text-sm uppercase">{company?.nombre || 'SERVICIO TÉCNICO'}</h2>
                            <p>{company?.direccion}</p>
                            <p>{company?.telefono}</p>
                            {company?.correo && <p>{company.correo}</p>}
                        </div>

                        {/* Separator */}
                        <div className="border-b-2 border-dashed border-black my-2"></div>

                        {/* 2. Ticket ID & Date */}
                        <div className="text-center mb-2">
                            <h3 className="font-bold text-xs">TICKET: #{service.orden_numero}</h3>
                            <p>{formatDate(new Date().toISOString())}</p>
                        </div>

                        {/* 3. Client & Equipment */}
                        <div className="mb-2">
                            <div className="flex justify-between">
                                <span className="font-bold">Cliente:</span>
                                <span className="text-right max-w-[60%] truncate">{service.cliente_nombre}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-bold">Tel:</span>
                                <span>{service.cliente_telefono}</span>
                            </div>
                            <div className="mt-1">
                                <span className="font-bold block">Equipo / Modelo:</span>
                                <span>{service.equipo_tipo} - {service.equipo_modelo}</span>
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="border-b border-black my-2"></div>

                        {/* 4. Description/Problem */}
                        <div className="mb-2">
                            <p className="font-bold">Descripción / Problema:</p>
                            <p className="whitespace-pre-wrap">{service.problema_reportado || 'Revisión general'}</p>
                        </div>

                        {/* Separator */}
                        <div className="border-b border-black my-2"></div>

                        {/* Parts List */}
                        {(() => {
                            let parts = [];
                            try {
                                parts = JSON.parse(service.repuestos_descripcion || '[]');
                                if (!Array.isArray(parts)) parts = [];
                            } catch (e) {
                                if (service.repuestos_descripcion && typeof service.repuestos_descripcion === 'string' && service.repuestos_descripcion.trim().length > 0) {
                                    parts = [{ cantidad: 1, producto: service.repuestos_descripcion, costoPublico: service.repuestos_costo || 0 }];
                                }
                            }

                            if (parts.length === 0) return null;

                            return (
                                <div className="mb-2">
                                    <p className="font-bold mb-1">Refacciones:</p>
                                    <div className="space-y-1">
                                        {parts.map((part, idx) => (
                                            <div key={idx} className="flex justify-between items-start">
                                                <span className="flex-1">
                                                    {part.cantidad} x {part.producto || part.descripcion}
                                                </span>
                                                <span className="ml-2">
                                                    {formatCurrency((part.cantidad || 0) * (part.costoPublico || part.precio_publico || 0))}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-b border-dotted border-black my-1"></div>
                                </div>
                            );
                        })()}

                        {/* 5. Cost Breakdown */}
                        <div className="mb-2 space-y-1">
                            <div className="flex justify-between">
                                <span>Precio:</span>
                                <span>{formatCurrency(service.total)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Anticipo:</span>
                                <span>{formatCurrency(service.anticipo)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-xs pt-1 border-t border-dotted border-gray-400">
                                <span>TOTAL:</span>
                                <span>{formatCurrency(service.total)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-xs">
                                <span>RESTA:</span>
                                <span>{formatCurrency(remaining)}</span>
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="border-b-2 border-dashed border-black my-4"></div>

                        {/* 6. QR Code */}
                        <div className="text-center">
                            <p className="font-bold mb-1">Escanear para seguimiento:</p>
                            <div className="flex justify-center p-1 bg-white mb-2">
                                <QRCodeSVG
                                    value={publicUrl}
                                    size={100}
                                    level="M"
                                    includeMargin={false}
                                />
                            </div>
                            <p className="text-[8px] break-all">{service.token}</p>
                        </div>

                        {/* Footer Disclaimer */}
                        <div className="mt-4 text-[8px] text-center text-justify">
                            <p>
                                GARANTÍA: 30 días en mano de obra. No cubre partes mojadas o mal uso.
                                Equipos sin reclamar causan abandono en 60 días.
                            </p>
                        </div>

                        <div className="mt-4 text-center font-bold">
                            ¡GRACIAS POR SU PREFERENCIA!
                        </div>
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
                        #printable-ticket, #printable-ticket * {
                            visibility: visible;
                        }
                        #printable-ticket {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 80mm !important; /* Force typical receipt width */
                            margin: 0;
                            padding: 2mm;
                            box-shadow: none;
                        }
                        @page {
                            size: 80mm auto; /* Variable height based on content */
                            margin: 0;
                        }
                    }
                `
            }} />
        </div>
    );
};

export default ServiceReceipt;
