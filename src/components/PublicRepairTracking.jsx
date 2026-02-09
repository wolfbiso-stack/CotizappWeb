import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { getProgressFromStatus, STATUS_OPTIONS } from '../utils/statusMapper';
import { Loader, User, Phone, Monitor, XCircle, Building2, Mail, MapPin, Wrench, CheckCircle2, Clock } from 'lucide-react';

const PublicRepairTracking = () => {
    const token = window.location.pathname.split('/track/')[1];

    const [service, setService] = useState(null);
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                        .from('empresas')
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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader className="w-10 h-10 animate-spin text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 text-sm font-medium">Cargando...</p>
                </div>
            </div>
        );
    }

    if (error || !service) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md">
                    <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-slate-800 mb-2">Error</h1>
                    <p className="text-sm text-slate-600 mb-5">{error}</p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-5 py-2.5 bg-slate-800 text-white text-sm rounded-lg font-medium hover:bg-slate-700 transition-colors"
                    >
                        Volver al inicio
                    </button>
                </div>
            </div>
        );
    }

    const currentProgress = getProgressFromStatus(service.status);
    const currentStatusIndex = STATUS_OPTIONS.findIndex(s => s.value === service.status?.toLowerCase());
    const displayStatuses = STATUS_OPTIONS.filter(s => s.value !== 'no_reparable').slice(0, 4);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top Bar with Company Info */}
            <div className="bg-slate-900 text-white px-6 py-4 shadow-lg">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {company?.logo_uri ? (
                            <img src={company.logo_uri} alt="Logo" className="h-10 w-10 object-contain bg-white rounded-lg p-1" />
                        ) : (
                            <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5" />
                            </div>
                        )}
                        <div>
                            <h1 className="font-bold text-lg">{company?.nombre || 'Mi Empresa'}</h1>
                            <div className="flex gap-3 text-xs text-slate-400">
                                {company?.telefono && <span>📞 {company.telefono}</span>}
                                {company?.correo && <span>✉️ {company.correo}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Orden de Servicio</p>
                        <p className="text-2xl font-black">#{service.orden_numero}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column - Status Timeline */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Progress Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-600" />
                                Estado del Servicio
                            </h2>

                            {/* Vertical Timeline */}
                            <div className="relative space-y-8">
                                {displayStatuses.map((status, index) => {
                                    const isCompleted = currentProgress >= status.progress;
                                    const isCurrent = currentStatusIndex === STATUS_OPTIONS.findIndex(s => s.value === status.value);

                                    return (
                                        <div key={status.value} className="relative flex items-start gap-4">
                                            {/* Vertical Line */}
                                            {index < displayStatuses.length - 1 && (
                                                <div className={`absolute left-4 top-10 w-0.5 h-10 ${isCompleted ? 'bg-blue-600' : 'bg-slate-200'
                                                    }`}></div>
                                            )}

                                            {/* Status Node */}
                                            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${isCompleted
                                                    ? status.progress === 100
                                                        ? 'bg-green-600 shadow-lg shadow-green-600/50'
                                                        : 'bg-blue-600 shadow-lg shadow-blue-600/50'
                                                    : 'bg-slate-200'
                                                }`}>
                                                {isCompleted ? (
                                                    <CheckCircle2 className="w-5 h-5 text-white" />
                                                ) : (
                                                    <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                                                )}
                                            </div>

                                            {/* Label */}
                                            <div className="flex-1 pt-1">
                                                <p className={`font-bold text-sm ${isCompleted ? 'text-slate-800' : 'text-slate-400'
                                                    }`}>
                                                    {status.label}
                                                </p>
                                                {isCurrent && (
                                                    <p className="text-xs text-blue-600 mt-1">● En proceso</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Cost Card */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-6 text-white">
                            <h3 className="text-sm font-bold uppercase tracking-wide mb-3 text-slate-300">Costo Total</h3>
                            <p className="text-4xl font-black mb-4">${formatCurrency(service.total)}</p>
                            {service.anticipo > 0 && (
                                <div className="space-y-2 pt-4 border-t border-white/10">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Anticipo</span>
                                        <span className="font-semibold">-${formatCurrency(service.anticipo)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold">
                                        <span>Por Pagar</span>
                                        <span className="text-yellow-400">${formatCurrency((service.total || 0) - (service.anticipo || 0))}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Details */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Equipment Info */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Monitor className="w-5 h-5 text-slate-600" />
                                    Información del Equipo
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tipo</p>
                                        <p className="text-base font-bold text-slate-800">{service.equipo_tipo}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Modelo</p>
                                        <p className="text-base font-bold text-slate-800">{service.equipo_modelo}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">No. Serie</p>
                                        <p className="text-base font-bold text-slate-800">{service.equipo_serie || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Client & Tech Cards Side by Side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Client */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <User className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cliente</p>
                                        <p className="text-lg font-bold text-slate-800 mb-2 truncate">{service.cliente_nombre}</p>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Phone className="w-4 h-4" />
                                            <span className="text-sm">{service.cliente_telefono}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Technician */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Wrench className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Técnico Asignado</p>
                                        <p className="text-lg font-bold text-slate-800 mb-2 truncate">{service.tecnico_nombre || 'Por asignar'}</p>
                                        {service.tecnico_celular && (
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Phone className="w-4 h-4" />
                                                <span className="text-sm">{service.tecnico_celular}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reported Failure */}
                        {service.problema_reportado && (
                            <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
                                <div className="bg-red-50 px-6 py-3 border-b border-red-200">
                                    <h3 className="text-sm font-bold text-red-700 uppercase tracking-wide">⚠️ Falla Reportada</h3>
                                </div>
                                <div className="p-6">
                                    <p className="text-slate-700 leading-relaxed">{service.problema_reportado}</p>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicRepairTracking;
