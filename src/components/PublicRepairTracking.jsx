import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { getProgressFromStatus, STATUS_OPTIONS } from '../utils/statusMapper';
import { Loader, User, Phone, Monitor, XCircle, Building2, Mail, MapPin, Wrench } from 'lucide-react';

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

            // Fetch service
            const { data: serviceData, error: serviceError } = await supabase
                .from('servicios_pc')
                .select('*, user_id')
                .eq('public_token', token)
                .single();

            if (serviceError) throw serviceError;
            if (!serviceData) throw new Error('Servicio no encontrado');

            setService(serviceData);

            // Fetch company data using user_id from service
            try {
                if (serviceData.user_id) {
                    const { data: companyData, error: companyError } = await supabase
                        .from('empresas')
                        .select('*')
                        .eq('user_id', serviceData.user_id)
                        .single();

                    if (!companyError && companyData) {
                        setCompany(companyData);
                    }
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
            <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 text-center">
                    <Loader className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
                    <p className="text-slate-600 text-sm font-medium">Cargando...</p>
                </div>
            </div>
        );
    }

    if (error || !service) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 text-center max-w-md">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h1 className="text-xl font-bold text-slate-800 mb-2">Error</h1>
                    <p className="text-sm text-slate-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-5 py-2 bg-blue-600 text-white text-sm rounded-xl font-bold hover:bg-blue-700 transition-colors"
                    >
                        Volver al inicio
                    </button>
                </div>
            </div>
        );
    }

    const currentProgress = getProgressFromStatus(service.status);
    const currentStatusIndex = STATUS_OPTIONS.findIndex(s => s.value === service.status?.toLowerCase());

    // Only show first 4 statuses (exclude "No fue posible reparar")
    const displayStatuses = STATUS_OPTIONS.filter(s => s.value !== 'no_reparable').slice(0, 4);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 py-6 px-4">
            <div className="max-w-4xl mx-auto space-y-4">

                {/* Company Header - Compact & Elegant */}
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-5">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        {/* Logo */}
                        {company?.logo_uri ? (
                            <img src={company.logo_uri} alt="Logo" className="h-14 w-14 object-contain rounded-lg flex-shrink-0" />
                        ) : (
                            <div className="h-14 w-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-7 h-7 text-white" />
                            </div>
                        )}

                        {/* Company Info */}
                        <div className="flex-1 text-center md:text-left min-w-0">
                            <h1 className="text-xl font-black text-slate-800 mb-1 truncate">
                                {company?.nombre || 'Mi Empresa'}
                            </h1>
                            <div className="flex flex-wrap gap-3 text-xs text-slate-600 justify-center md:justify-start">
                                {company?.direccion && (
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{company.direccion}</span>
                                    </div>
                                )}
                                {company?.telefono && (
                                    <div className="flex items-center gap-1">
                                        <Phone className="w-3 h-3 flex-shrink-0" />
                                        <span>{company.telefono}</span>
                                    </div>
                                )}
                                {company?.correo && (
                                    <div className="flex items-center gap-1">
                                        <Mail className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{company.correo}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Order Number */}
                        <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white px-5 py-3 rounded-xl text-center flex-shrink-0">
                            <p className="text-[10px] opacity-90 uppercase tracking-wider mb-0.5">Orden</p>
                            <p className="text-2xl font-black">#{service.orden_numero}</p>
                        </div>
                    </div>
                </div>

                {/* Equipment Card - Compact */}
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-5">
                    <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Monitor className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-slate-800 mb-2">Equipo Recibido</h2>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-0.5">Tipo</p>
                                    <p className="text-sm font-bold text-slate-800 truncate">{service.equipo_tipo}</p>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-0.5">Modelo</p>
                                    <p className="text-sm font-bold text-slate-800 truncate">{service.equipo_modelo}</p>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-0.5">Serie</p>
                                    <p className="text-sm font-bold text-slate-800 truncate">{service.equipo_serie || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Client and Technician Cards - Elegant & Compact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Client Card */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 border border-white/50">
                        <div className="flex items-start gap-3">
                            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Cliente</p>
                                <p className="text-base font-bold text-slate-800 mb-1 truncate">{service.cliente_nombre}</p>
                                <div className="flex items-center gap-1.5 text-slate-600">
                                    <Phone className="w-3 h-3 flex-shrink-0" />
                                    <span className="text-xs font-medium">{service.cliente_telefono}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Technician Card */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 border border-white/50">
                        <div className="flex items-start gap-3">
                            <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Wrench className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1">Técnico</p>
                                <p className="text-base font-bold text-slate-800 mb-1 truncate">{service.tecnico_nombre || 'Por asignar'}</p>
                                {service.tecnico_celular && (
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                        <Phone className="w-3 h-3 flex-shrink-0" />
                                        <span className="text-xs font-medium">{service.tecnico_celular}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Tracker - Elegant */}
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 text-center">Estado de Reparación</h2>

                    {/* Progress Steps */}
                    <div className="relative">
                        {/* Progress Line */}
                        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 rounded-full" style={{ marginLeft: '1.5rem', marginRight: '1.5rem' }} />
                        <div
                            className="absolute top-5 left-0 h-0.5 rounded-full transition-all duration-1000 ease-out"
                            style={{
                                width: `calc(${currentProgress}% - 3rem)`,
                                marginLeft: '1.5rem',
                                background: currentProgress === 100
                                    ? 'linear-gradient(to right, #3b82f6, #10b981)'
                                    : currentProgress >= 80
                                        ? 'linear-gradient(to right, #3b82f6, #86efac)'
                                        : 'linear-gradient(to right, #3b82f6, #fbbf24)'
                            }}
                        />

                        {/* Steps */}
                        <div className="relative flex justify-between items-start px-6">
                            {displayStatuses.map((status, index) => {
                                const isCompleted = currentProgress >= status.progress;
                                const isCurrent = currentStatusIndex === STATUS_OPTIONS.findIndex(s => s.value === status.value);

                                return (
                                    <div key={status.value} className="flex flex-col items-center" style={{ flex: 1 }}>
                                        {/* Dot */}
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-md ${isCompleted
                                                    ? status.progress === 100
                                                        ? 'bg-gradient-to-br from-green-500 to-green-600 scale-105'
                                                        : status.progress === 80
                                                            ? 'bg-gradient-to-br from-green-400 to-green-500'
                                                            : 'bg-gradient-to-br from-blue-500 to-blue-600'
                                                    : 'bg-slate-200'
                                                } ${isCurrent ? 'ring-3 ring-blue-200' : ''}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full ${isCompleted ? 'bg-white' : 'bg-slate-400'}`} />
                                        </div>

                                        {/* Label */}
                                        <p className={`mt-2 text-center text-[11px] font-bold transition-colors leading-tight ${isCompleted ? 'text-slate-800' : 'text-slate-400'
                                            }`}>
                                            {status.label}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Reported Failure and Total Cost - Compact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Reported Failure */}
                    {service.problema_reportado && (
                        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-5">
                            <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-3">Falla Reportada</h3>
                            <p className="text-sm text-slate-700 leading-relaxed">{service.problema_reportado}</p>
                        </div>
                    )}

                    {/* Total Cost */}
                    <div className="bg-gradient-to-br from-blue-600 to-purple-600 backdrop-blur-xl rounded-2xl shadow-xl p-5 text-white">
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-3 opacity-90">Costo Total</h3>
                        <p className="text-4xl font-black mb-2">${formatCurrency(service.total)}</p>
                        {service.anticipo > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/30 space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="opacity-90">Anticipo:</span>
                                    <span className="font-bold">-${formatCurrency(service.anticipo)}</span>
                                </div>
                                <div className="flex justify-between text-base font-bold">
                                    <span>Restante:</span>
                                    <span>${formatCurrency((service.total || 0) - (service.anticipo || 0))}</span>
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
