import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download, QrCode as QrCodeIcon } from 'lucide-react';
import { getStatusLabel } from '../utils/statusMapper';
import { supabase } from '../../utils/supabase';

const QRServiceTicket = ({ service, company: companyProp, onClose, darkMode }) => {
    const ticketRef = useRef(null);
    const [company, setCompany] = useState(companyProp || null);

    useEffect(() => {
        // If company not provided, fetch from Supabase
        if (!companyProp) {
            fetchCompany();
        }
    }, [companyProp]);

    const fetchCompany = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('empresas')
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

    const handlePrint = () => {
        window.print();
    };

    // Get base path from document base or default to /CotizappWeb/
    const basePath = document.querySelector('base')?.getAttribute('href') || '/CotizappWeb/';
    const publicUrl = `${window.location.origin}${basePath}track/${service.public_token}`;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                {/* Header - No print */}
                <div className={`p-6 border-b flex justify-between items-center no-print ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50'}`}>
                    <h3 className={`font-bold text-lg flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        <QrCodeIcon className="w-6 h-6 text-purple-600" />
                        Ticket de Seguimiento QR
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Imprimir"
                        >
                            <Printer className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Ticket Content - Printable */}
                <div ref={ticketRef} className="p-8">
                    <div className="max-w-xl mx-auto">
                        {/* Company Header */}
                        <div className="text-center mb-8 pb-6 border-b-2 border-dashed border-slate-300">
                            {company?.logo_uri ? (
                                <img src={company.logo_uri} alt="Logo" className="h-16 mx-auto mb-4 object-contain" />
                            ) : (
                                <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
                                    {company?.nombre?.charAt(0) || 'E'}
                                </div>
                            )}
                            <h1 className="text-2xl font-black text-slate-800 mb-1">{company?.nombre || 'Mi Empresa'}</h1>
                            <p className="text-sm text-slate-600">{company?.telefono}</p>
                            {company?.direccion && <p className="text-xs text-slate-500 mt-1">{company.direccion}</p>}
                        </div>

                        {/* Service Info */}
                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 mb-6 border border-purple-200">
                            <div className="text-center mb-4">
                                <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">Orden de Servicio</p>
                                <p className="text-4xl font-black text-purple-800">#{service.orden_numero}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cliente</p>
                                    <p className="font-bold text-slate-800">{service.cliente_nombre}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Equipo</p>
                                    <p className="font-bold text-slate-800">{service.equipo_tipo}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Estado</p>
                                    <p className="font-bold text-blue-600">{getStatusLabel(service.status)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total</p>
                                    <p className="font-bold text-green-600">${formatCurrency(service.total)}</p>
                                </div>
                            </div>
                        </div>

                        {/* QR Code - Center piece */}
                        <div className="bg-white rounded-2xl p-8 mb-6 border-4 border-purple-200 shadow-lg">
                            <div className="flex flex-col items-center">
                                <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-purple-300">
                                    <QRCodeSVG
                                        value={publicUrl}
                                        size={220}
                                        level="H"
                                        includeMargin={true}
                                    />
                                </div>
                                <p className="text-center mt-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    Escanea para ver el estado de tu reparación
                                </p>
                                <p className="text-center mt-2 text-xs text-slate-400 font-mono break-all px-4">
                                    {publicUrl}
                                </p>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                            <h3 className="font-bold text-blue-800 mb-2 text-sm">📱 Instrucciones:</h3>
                            <ol className="text-xs text-blue-700 space-y-1 list-decimal ml-4">
                                <li>Abre la cámara de tu celular</li>
                                <li>Apunta al código QR</li>
                                <li>Toca la notificación que aparece</li>
                                <li>Consulta el estado de tu reparación en tiempo real</li>
                            </ol>
                        </div>

                        {/* Footer */}
                        <div className="text-center mt-6 pt-6 border-t border-dashed border-slate-300">
                            <p className="text-xs text-slate-500">Gracias por confiar en nosotros</p>
                            {company?.correo && (
                                <p className="text-xs text-slate-400 mt-1">{company.correo}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
            @page { size: auto; margin: 15mm; }
          }
        `
            }} />
        </div>
    );
};

export default QRServiceTicket;
