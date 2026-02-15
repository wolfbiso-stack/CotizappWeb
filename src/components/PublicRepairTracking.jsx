import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { getProgressFromStatus, STATUS_OPTIONS } from '../utils/statusMapper';
import { Loader, User, Phone, Monitor, XCircle, Building2, Mail, MapPin, Wrench, CheckCircle2, Clock, Package } from 'lucide-react';

const PublicRepairTracking = () => {
    // Modified for Hash Routing compatibility
    const getToken = () => {
        let token = null;
        
        // Priority 1: Check Hash (e.g., #/track/TOKEN)
        // Some mobile browsers might encode the hash or handle it differently
        const hash = decodeURIComponent(window.location.hash);
        
        if (hash.includes('/track/')) {
            // Split by '/track/' and take the last part
            const parts = hash.split('/track/');
            if (parts.length > 1) {
                token = parts[1];
            }
        } 
        
        // Priority 2: Check Pathname (e.g., /track/TOKEN)
        if (!token) {
            const path = decodeURIComponent(window.location.pathname);
            if (path.includes('/track/')) {
                const parts = path.split('/track/');
                if (parts.length > 1) {
                    token = parts[1];
                }
            }
        }


        // Clean token from query params, extra hashes, trailing slashes, and common social media tracking params
        if (token) {
            // Remove query parameters starting with ?
            token = token.split('?')[0]; 
            
            // Remove hash fragments starting with # (if any remain)
            token = token.split('#')[0]; 
            
            // Remove trailing slash
            if (token.endsWith('/')) {
                token = token.slice(0, -1); 
            }

            // Remove common tracking parameters (fbclid, etc.) if they somehow got into the path
            if (token.includes('&')) {
                token = token.split('&')[0];
            }
        }
        
        // Debugging log (visible in console)
        console.log('Extracted Token:', token);
        
        return token;
    };

    const token = getToken();

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

            // Check all service tables
            const tables = ['servicios_pc', 'servicios_impresoras', 'servicios_celulares', 'servicios_cctv', 'servicios_redes'];
            let foundService = null;
            
            for (const table of tables) {
                const { data, error } = await supabase
                    .from(table)
                    .select('*, user_id')
                    .eq('token', token)
                    .single();
                
                if (data && !error) {
                    foundService = data;
                    break;
                }
            }

            if (!foundService) throw new Error('Servicio no encontrado');

            setService(foundService);

            try {
                if (foundService.user_id) {
                    const { data: companyDataArray } = await supabase
                        .from('configuracion_empresa')
                        .select('*')
                        .eq('user_id', foundService.user_id);

                    if (companyDataArray && companyDataArray.length > 0) {
                        setCompany(companyDataArray[0]);
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
            <div className="min-h-screen bg-slate-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-slate-100 flex items-center justify-center p-4">
                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/50 text-center">
                    <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium animate-pulse">Cargando información del servicio...</p>
                    {/* Debugging info visible during loading */}
                    <div className="mt-4 p-2 bg-slate-100 rounded text-[10px] text-slate-500 font-mono text-left max-w-xs overflow-auto max-h-32">
                        <p>Token: {token || 'null'}</p>
                        <p>Hash: {window.location.hash}</p>
                        <p>Path: {window.location.pathname}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !service) {
        return (
            <div className="min-h-screen bg-slate-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-50 via-slate-50 to-slate-100 flex items-center justify-center p-4">
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-10 text-center max-w-md border border-white/50">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <XCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Servicio No Encontrado</h1>
                    <p className="text-slate-600 mb-8 leading-relaxed">{error || 'No pudimos encontrar la información de este servicio. Verifica que el enlace sea correcto.'}</p>
                    
                    {/* Debugging Section for User */}
                    <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-left">
                        <p className="text-xs font-bold text-red-800 mb-1">Información de Depuración:</p>
                        <div className="text-[10px] font-mono text-slate-600 space-y-1 break-all">
                            <p><span className="font-bold">Token Intentado:</span> {token || 'No detectado'}</p>
                            <p><span className="font-bold">URL Hash:</span> {window.location.hash}</p>
                            <p><span className="font-bold">URL Path:</span> {window.location.pathname}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full px-6 py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    const currentProgress = getProgressFromStatus(service.status);
    const currentStatusIndex = STATUS_OPTIONS.findIndex(s => s.value === service.status?.toLowerCase());
    const displayStatuses = STATUS_OPTIONS.filter(s => s.value !== 'no_reparable').slice(0, 4);

    return (
        <div className="min-h-screen bg-slate-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-slate-100 py-4 px-3 sm:py-8 sm:px-6 lg:px-8 font-sans text-slate-800 pb-20">
            {/* Main Container */}
            <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8">

                {/* Header Card (Glass) - Company Info & Order Number */}
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl border border-white/40 overflow-hidden relative group hover:bg-white/80 transition-all duration-500">
                    {/* Decorative top gradient line */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

                    <div className="p-5 sm:p-10 flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 relative z-10">
                        {/* Company Info */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto text-center sm:text-left">
                            {company?.logo_uri ? (
                                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl shadow-md p-2 flex items-center justify-center flex-shrink-0 border border-slate-100">
                                    <img src={company.logo_uri} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                            ) : (
                                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center flex-shrink-0 text-white">
                                    <Building2 className="w-8 h-8 sm:w-10 sm:h-10" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight mb-2 leading-tight">{company?.nombre || 'Centro de Reparaciones'}</h1>
                                <div className="space-y-1 flex flex-col items-center sm:items-start text-sm">
                                    {company?.telefono && (
                                        <div className="flex items-center gap-2 text-slate-600 font-medium">
                                            <div className="p-1 bg-blue-100 rounded-full text-blue-600"><Phone className="w-3 h-3" /></div>
                                            {company.telefono}
                                        </div>
                                    )}
                                    {company?.correo && (
                                        <div className="flex items-center gap-2 text-slate-600 font-medium break-all">
                                            <div className="p-1 bg-blue-100 rounded-full text-blue-600"><Mail className="w-3 h-3" /></div>
                                            {company.correo}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Order Number Badge */}
                        <div className="bg-slate-50/50 backdrop-blur-md px-6 py-3 sm:px-8 sm:py-5 rounded-xl sm:rounded-2xl border border-slate-200/60 text-center transform transition-transform group-hover:scale-105 duration-300 shadow-sm w-full md:w-auto">
                            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Orden de Servicio</p>
                            <p className="text-3xl sm:text-5xl font-black text-slate-800 tracking-tight">#{service.orden_numero}</p>
                        </div>
                    </div>
                </div>

                {/* Status Timeline - Horizontal */}
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-lg border border-white/40 p-5 sm:p-10">
                    {service.status === 'no_reparable' ? (
                        <h2 className="text-lg sm:text-xl font-bold text-red-600 mb-6 sm:mb-10 flex items-center gap-3">
                            <div className="p-2 sm:p-2.5 bg-red-100 rounded-xl text-red-600 shadow-sm">
                                <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            NO se pudo reparar
                        </h2>
                    ) : (
                        <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-6 sm:mb-10 flex items-center gap-3">
                            <div className="p-2 sm:p-2.5 bg-green-100 rounded-xl text-green-600 shadow-sm">
                                <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            Estado del Servicio
                        </h2>
                    )}

                    <div className="relative py-2 sm:py-4">
                        {/* Background Track */}
                        <div className="absolute top-1/2 left-0 right-0 h-2 sm:h-3 bg-slate-100 rounded-full -translate-y-1/2 z-0"></div>

                        {/* Progress Fill */}
                        <div
                            className={`absolute top-1/2 left-0 h-2 sm:h-3 rounded-full -translate-y-1/2 z-0 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(34,197,94,0.4)] ${service.status === 'no_reparable' ? 'bg-red-500 shadow-red-500/40' : 'bg-green-500 shadow-green-500/40'}`}
                            style={{ width: `${currentProgress}%` }}
                        ></div>

                        <div className="flex justify-between items-center relative z-10 w-full">
                            {displayStatuses.map((status, index) => {
                                const isCompleted = currentProgress >= status.progress;
                                const isCurrent = currentStatusIndex === STATUS_OPTIONS.findIndex(s => s.value === status.value);
                                const isUnrepairable = service.status === 'no_reparable';

                                return (
                                    <div key={status.value} className="flex flex-col items-center gap-2 sm:gap-3 relative group flex-1">
                                        {/* Status Node */}
                                        <div className={`w-8 h-8 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-500 z-10 border-2 sm:border-4 ${isCompleted
                                            ? isUnrepairable ? 'bg-red-500 border-red-500 shadow-md scale-110' : 'bg-green-500 border-green-500 shadow-md scale-110'
                                            : 'bg-white border-slate-200'
                                            }`}>
                                            {isCompleted ? (
                                                isUnrepairable ? <XCircle className="w-5 h-5 sm:w-8 sm:h-8 text-white" strokeWidth={3} /> : <CheckCircle2 className="w-5 h-5 sm:w-8 sm:h-8 text-white" strokeWidth={3} />
                                            ) : (
                                                <div className="w-2 h-2 sm:w-4 sm:h-4 rounded-full bg-slate-200"></div>
                                            )}
                                        </div>

                                        {/* Label */}
                                        <div className={`text-center transition-all duration-300 absolute top-full mt-2 sm:mt-4 w-20 sm:w-32 ${isCompleted ? 'opacity-100' : 'opacity-40'}`}>
                                            <p className={`font-bold text-[10px] sm:text-sm uppercase tracking-wide leading-tight ${isCurrent ? (isUnrepairable ? 'text-red-600' : 'text-green-600') : 'text-slate-500'}`}>
                                                {status.label}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 mt-8 sm:mt-0">
                    {/* Left Column (Details) - Spans 8 */}
                    <div className="lg:col-span-8 space-y-4 sm:space-y-8 order-2 lg:order-1 pt-6 sm:pt-0">
                        {/* Equipment Card */}
                        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                            <div className="bg-slate-50/50 px-8 py-5 border-b border-white/50 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                        <Monitor className="w-5 h-5" />
                                    </div>
                                    Información del Equipo
                                </h2>
                                <span className="px-3 py-1 bg-slate-200/50 text-slate-600 text-xs font-bold rounded-full uppercase tracking-wide">
                                    ID: {service.id}
                                </span>
                            </div>
                            <div className="p-8">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</p>
                                        <p className="text-lg font-bold text-slate-800">{service.equipo_tipo}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Modelo</p>
                                        <p className="text-lg font-bold text-slate-800">{service.equipo_modelo}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">N/S</p>
                                        <p className="text-lg font-bold text-slate-800 font-mono bg-slate-100 inline-block px-2 py-0.5 rounded text-sm">{service.equipo_serie || 'No reg.'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Parts Used Section */}
                        {service.repuestos_descripcion && service.repuestos_descripcion.startsWith('[') && (
                            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                                <div className="bg-slate-50/50 px-8 py-5 border-b border-white/50">
                                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                                            <Package className="w-5 h-5" />
                                        </div>
                                        Repuestos Utilizados
                                    </h2>
                                </div>
                                <div className="p-8">
                                    <div className="w-full">
                                        <div className="flex text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-2 mb-2">
                                            <div className="w-16 text-center">Cant</div>
                                            <div className="flex-1">Artículo</div>
                                            <div className="w-24 text-right">Precio</div>
                                        </div>
                                        <div className="space-y-1">
                                            {JSON.parse(service.repuestos_descripcion).map((part, i) => (
                                                <div key={i} className="flex items-center text-sm py-2 border-b border-slate-100 last:border-0">
                                                    <div className="w-16 text-center text-slate-500 font-bold">{part.cantidad || 1}</div>
                                                    <div className="flex-1 text-slate-700 font-medium">{part.producto || part.descripcion}</div>
                                                    <div className="w-24 text-right text-slate-600 font-mono">${formatCurrency(part.costoPublico || part.precio_publico)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Two Columns Grid for Client/Tech */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Client */}
                            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 p-6 flex items-start gap-5 hover:shadow-2xl transition-shadow duration-300 group">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 text-white group-hover:scale-110 transition-transform">
                                    <User className="w-7 h-7" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Propietario</p>
                                    <p className="text-lg font-bold text-slate-800 truncate mb-1">{service.cliente_nombre}</p>
                                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                        <Phone className="w-3.5 h-3.5" />
                                        {service.cliente_telefono}
                                    </div>
                                </div>
                            </div>

                            {/* Technician */}
                            <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 p-6 flex items-start gap-5 hover:shadow-2xl transition-shadow duration-300 group">
                                <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20 text-white group-hover:scale-110 transition-transform">
                                    <Wrench className="w-7 h-7" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Técnico Asignado</p>
                                    <p className="text-lg font-bold text-slate-800 truncate mb-1">{service.tecnico_nombre || 'Pendiente'}</p>
                                    {service.tecnico_celular && (
                                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                            <Phone className="w-3.5 h-3.5" />
                                            {service.tecnico_celular}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Reported Failure */}
                        {service.problema_reportado && (
                            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-red-100 overflow-hidden relative group">
                                <div className="absolute left-0 top-0 bottom-0 w-2 bg-red-400 group-hover:w-3 transition-all"></div>
                                <div className="p-8 pl-10">
                                    <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <XCircle className="w-4 h-4" />
                                        Reporte de Falla
                                    </h3>
                                    <p className="text-slate-700 text-lg leading-relaxed font-medium italic">"{service.problema_reportado}"</p>
                                </div>
                            </div>
                        )}

                        {/* Footer Info */}
                        <div className="text-center text-slate-400 text-sm font-medium pt-8 pb-12">
                            <p>Esta es una página pública de seguimiento. No requiere inicio de sesión.</p>
                            <p className="mt-2 text-xs opacity-60">© {new Date().getFullYear()} CotizApp - Sistema de Gestión</p>
                        </div>
                    </div>

                    {/* Right Column (Cost) - Spans 4 */}
                    <div className="lg:col-span-4 space-y-8 order-1 lg:order-2">
                        {/* Cost Card (Glass Light) */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 relative overflow-hidden group hover:bg-white/90 transition-all duration-300">
                            {/* Decorative Background Blob */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                            <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-slate-500 flex items-center gap-2">
                                Costo Estimado
                            </h3>
                            <div className="flex items-baseline gap-1 mb-8 relative z-10">
                                <span className="text-6xl font-black tracking-tight text-slate-800">${formatCurrency(service.total).split('.')[0]}</span>
                                <span className="text-2xl font-bold text-slate-400">.{formatCurrency(service.total).split('.')[1]}</span>
                            </div>

                            {service.anticipo > 0 && (
                                <div className="space-y-4 pt-6 border-t border-slate-100 relative z-10">
                                    <div className="flex justify-between text-sm items-center">
                                        <span className="text-slate-500 font-medium">Anticipo realizado</span>
                                        <span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">-${formatCurrency(service.anticipo)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg items-center pt-2">
                                        <span className="font-bold text-slate-700">Restante por pagar</span>
                                        <span className="font-black text-blue-600 text-xl">
                                            ${formatCurrency((service.total || 0) - (service.anticipo || 0))}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicRepairTracking;
