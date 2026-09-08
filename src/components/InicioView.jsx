import React, { useState, useEffect, useMemo } from 'react';
import { UserPlus, ClipboardList, FileText, Settings, Users, Box, User } from 'lucide-react';
import { formatDateForInput, formatCurrency } from '../utils/format';

const StatCard = ({ title, subtitle, icon: Icon, colorClass, borderClass, bgClass, iconColor, mainStats, subStats, darkMode }) => (
    <div className={`rounded-xl border flex flex-col relative overflow-hidden transition-all duration-300 ${darkMode ? `bg-[#1e2330] ${borderClass}` : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className={`h-1 w-full absolute top-0 left-0 ${bgClass}`}></div>
        
        <div className="p-5">
            <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-xl ${bgClass} ${iconColor} bg-opacity-20`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center mb-6">
                {mainStats.map((stat, i) => (
                    <div key={i}>
                        <p className={`text-[10px] mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{stat.label}</p>
                        <p className={`text-lg font-bold ${stat.colorClass || (darkMode ? 'text-white' : 'text-slate-800')}`}>{stat.value}</p>
                    </div>
                ))}
            </div>
            
            <div className={`h-px w-full ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'} mb-5`}></div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                {subStats.map((stat, i) => (
                    <div key={i}>
                        <p className={`text-[9px] uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
                        <p className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{stat.value}</p>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const InicioView = ({ services = [], savedClients = [], quotations = [], products = [], citas = [], darkMode = false, pageStyle = 'Redondeados' }) => {

    const [recentActivity, setRecentActivity] = useState([]);
    const [latestClients, setLatestClients] = useState([]);

    useEffect(() => {
        const activities = [];

        // Helper to parse dates correctly
        const parseDateVal = (d) => {
            if (!d) return 0;
            if (typeof d === 'string') {
                if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                    const date = new Date(d + 'T00:00:00');
                    if (!isNaN(date.getTime())) return date.getTime();
                }
                if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) {
                    const parts = d.split('/');
                    return new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00`).getTime();
                }
            }
            const dateObj = new Date(d);
            if (!isNaN(dateObj.getTime())) return dateObj.getTime();
            return 0;
        };

        // 1. Process Services
        services.forEach(s => {
            const timeVal = parseDateVal(s.fecha || s.created_at);
            if (timeVal > 0) {
                activities.push({
                    type: 'order',
                    id: s.folio || s.id,
                    title: `Orden ORD-${s.folio || 'N/A'} • ${s.cliente || 'Sin cliente'}`,
                    date: timeVal,
                    icon: ClipboardList,
                    color: 'bg-blue-500',
                    bg: 'bg-blue-50 text-blue-500'
                });
            }
        });

        // 2. Process Quotations
        quotations.forEach(q => {
            const timeVal = parseDateVal(q.fecha || q.created_at);
            if (timeVal > 0) {
                activities.push({
                    type: 'quote',
                    id: q.folio || q.id,
                    title: `Cotización ${q.folio || 'N/A'} • ${q.nombre_cliente || 'Sin cliente'}`,
                    date: timeVal,
                    icon: FileText,
                    color: 'bg-purple-500',
                    bg: 'bg-purple-50 text-purple-500'
                });
            }
        });

        // 3. Process Citas
        (citas || []).forEach(c => {
            const timeVal = parseDateVal(c.fecha || c.created_at);
            if (timeVal > 0) {
                activities.push({
                    type: 'appointment',
                    id: c.id,
                    title: `Cita Programada • ${c.cliente || 'Sin cliente'}`,
                    date: timeVal,
                    icon: UserPlus,
                    color: 'bg-amber-500',
                    bg: 'bg-amber-50 text-amber-500'
                });
            }
        });

        // Sort by date DESC
        activities.sort((a, b) => b.date - a.date);
        setRecentActivity(activities.slice(0, 6));

        // Get Latest Clients
        const sortedClients = [...savedClients].sort((a, b) => {
            return parseDateVal(b.created_at) - parseDateVal(a.created_at);
        });
        setLatestClients(sortedClients.slice(0, 6));

    }, [services, quotations, savedClients, citas]);

    const getDaysAgoText = (timestamp) => {
        if (!timestamp) return 'Reciente';
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - timestamp);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 0) {
            const date = new Date(timestamp);
            return `Hoy, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
        }
        if (diffDays === 1) return 'Ayer';
        return `Hace ${diffDays} días`;
    };

    const getFormattedDate = (timestamp) => {
        if (!timestamp) return '';
        const d = new Date(timestamp);
        return `${d.toLocaleDateString('es-ES')} ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    };

    // Calculate Metrics
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Clientes Metrics
    const clientesEsteMes = savedClients.filter(c => {
        const d = new Date(c.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const clientOrderCounts = {};
    services.forEach(s => {
        const clientName = s.cliente_nombre || s.cliente;
        if (clientName) {
            clientOrderCounts[clientName] = (clientOrderCounts[clientName] || 0) + 1;
        }
    });
    const clientesConCompras = Object.keys(clientOrderCounts).length;
    const clientesFrecuentes = Object.values(clientOrderCounts).filter(count => count > 1).length;
    const clientesEmpresas = savedClients.filter(c => c.empresa && c.empresa.trim() !== '').length;
    const clientesParticulares = savedClients.length - clientesEmpresas;

    // Órdenes Metrics
    const normalizeStatus = (st) => (st || '').toLowerCase().trim().replace(/\s+/g, '_');
    
    let ordenesEnProceso = 0;
    let ordenesListas = 0;
    let ordenesEntregadas = 0;
    let ordenesFallidas = 0;

    services.forEach(s => {
        const st = normalizeStatus(s.status);
        if (st === 'entregado') {
            ordenesEntregadas++;
        } else if (st === 'listo_para_entregar' || st === 'listo_para_entrega' || st === 'pendiente_de_entrega') {
            ordenesListas++;
        } else if (st === 'no_reparable' || st === 'no_fue_posible_reparar' || st === 'cancelado' || st === 'cancelada') {
            ordenesFallidas++;
        } else {
            // Treat anything else (recibido, diagnosticado, pendiente, en_proceso, revisado, reparado) as En Proceso
            ordenesEnProceso++;
        }
    });

    const ingresosTotales = services.reduce((acc, s) => acc + (Number(s.total) || Number(s.precio) || 0), 0);

    // Cotizaciones Metrics
    const cotPendientes = quotations.filter(q => (q.aceptada_rechazada || 'pendiente').toLowerCase() === 'pendiente').length;
    const cotAceptadas = quotations.filter(q => (q.aceptada_rechazada || '').toLowerCase() === 'aceptada').length;
    const cotRechazadas = quotations.filter(q => (q.aceptada_rechazada || '').toLowerCase() === 'rechazada').length;
    const tasaConversionCot = quotations.length ? Math.round((cotAceptadas / quotations.length) * 100) + '%' : '0%';

    // Productos Metrics
    const conStock = products.filter(p => (Number(p.stock) || 0) > 0).length;
    const sinStock = products.filter(p => (Number(p.stock) || 0) <= 0).length;
    const categoriasCount = new Set(products.map(p => p.categoria).filter(c => c)).size;

    return (
        <div className={`w-full px-4 md:px-8 py-8 animate-in fade-in duration-300 min-h-screen ${darkMode ? 'bg-[#151923] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
            
            <div className="mb-8">
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Dashboard Resumen</h1>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Resumen general del sistema</p>
            </div>

            {/* Top Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Clientes Card */}
                <StatCard 
                    title="Clientes"
                    subtitle="Directorio de clientes"
                    icon={Users}
                    darkMode={darkMode}
                    colorClass="text-blue-500"
                    bgClass="bg-blue-500"
                    borderClass="border-blue-900/50"
                    iconColor="text-blue-500"
                    mainStats={[
                        { label: 'Total', value: savedClients.length, colorClass: 'text-blue-500' },
                        { label: 'Nuevos Mes', value: clientesEsteMes, colorClass: 'text-emerald-500' },
                        { label: 'Con Compras', value: clientesConCompras, colorClass: 'text-slate-400' }
                    ]}
                    subStats={[
                        { label: 'Frecuentes (>1)', value: clientesFrecuentes },
                        { label: 'Particulares', value: clientesParticulares },
                        { label: 'Empresas', value: clientesEmpresas }
                    ]}
                />

                {/* Órdenes Card */}
                <StatCard 
                    title="Órdenes"
                    subtitle="Control de servicios"
                    icon={ClipboardList}
                    darkMode={darkMode}
                    colorClass="text-emerald-500"
                    bgClass="bg-emerald-500"
                    borderClass="border-emerald-900/50"
                    iconColor="text-emerald-500"
                    mainStats={[
                        { label: 'En Proceso', value: ordenesEnProceso, colorClass: 'text-blue-500' },
                        { label: 'P. Entrega', value: ordenesListas, colorClass: 'text-amber-500' },
                        { label: 'Entregadas', value: ordenesEntregadas, colorClass: 'text-emerald-500' }
                    ]}
                    subStats={[
                        { label: 'No Rep/Canc', value: ordenesFallidas },
                        { label: 'Total Servicios', value: services.length },
                        { label: 'Ingresos Hist.', value: formatCurrency(ingresosTotales) }
                    ]}
                />

                {/* Cotizaciones Card */}
                <StatCard 
                    title="Cotizaciones"
                    subtitle="Propuestas comerciales"
                    icon={FileText}
                    darkMode={darkMode}
                    colorClass="text-purple-500"
                    bgClass="bg-purple-500"
                    borderClass="border-purple-900/50"
                    iconColor="text-purple-500"
                    mainStats={[
                        { label: 'Pendientes', value: cotPendientes, colorClass: 'text-purple-500' },
                        { label: 'Aceptadas', value: cotAceptadas, colorClass: 'text-emerald-500' },
                        { label: 'Rechazadas', value: cotRechazadas, colorClass: 'text-rose-500' }
                    ]}
                    subStats={[
                        { label: 'Total Emitidas', value: quotations.length },
                        { label: 'Tasa Conversión', value: tasaConversionCot },
                        { label: 'Destacadas', value: '0' }
                    ]}
                />

                {/* Prod/Serv Card */}
                <StatCard 
                    title="Prod / Serv"
                    subtitle="Catálogo e inventario"
                    icon={Box}
                    darkMode={darkMode}
                    colorClass="text-cyan-500"
                    bgClass="bg-cyan-500"
                    borderClass="border-cyan-900/50"
                    iconColor="text-cyan-500"
                    mainStats={[
                        { label: 'Total', value: products.length, colorClass: 'text-cyan-500' },
                        { label: 'Con Stock', value: conStock, colorClass: 'text-emerald-500' },
                        { label: 'Sin Stock', value: sinStock, colorClass: 'text-rose-500' }
                    ]}
                    subStats={[
                        { label: 'Productos', value: products.length },
                        { label: 'Servicios', value: services.length },
                        { label: 'Categorías', value: categoriasCount }
                    ]}
                />
            </div>

            {/* Bottom Lists Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Actividad Reciente */}
                <div className={`rounded-xl border flex flex-col ${darkMode ? 'bg-[#1e2330] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className={`p-5 border-b ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}`}>
                        <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Actividad Reciente</h3>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Últimas actividades del sistema</p>
                    </div>
                    <div className="p-5 space-y-3">
                        {recentActivity.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">No hay actividad reciente</p>
                        ) : (
                            recentActivity.map((act, i) => (
                                <div key={i} className={`flex items-center gap-4 p-3 rounded-xl ${darkMode ? 'bg-[#252b3b]' : 'bg-slate-50 border border-slate-100'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${act.bg} bg-opacity-20`}>
                                        <act.icon className={`w-5 h-5 ${act.bg.split(' ')[1]}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold truncate ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{act.title}</p>
                                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{getFormattedDate(act.date)}</p>
                                    </div>
                                    <div className={`text-xs px-2 py-1 rounded-md font-medium ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                                        {getDaysAgoText(act.date)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Últimos Clientes */}
                <div className={`rounded-xl border flex flex-col ${darkMode ? 'bg-[#1e2330] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className={`p-5 border-b ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}`}>
                        <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Últimos Clientes</h3>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Clientes recientemente registrados</p>
                    </div>
                    <div className="p-5 space-y-3">
                        {latestClients.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">No hay clientes registrados</p>
                        ) : (
                            latestClients.map((client, i) => (
                                <div key={i} className={`flex items-center gap-4 p-3 rounded-xl ${darkMode ? 'bg-[#252b3b]' : 'bg-slate-50 border border-slate-100'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                        {client.nombre ? client.nombre.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold truncate ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{client.nombre || 'Cliente sin nombre'}</p>
                                        <p className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{client.correo || client.telefono || 'Sin contacto'}</p>
                                    </div>
                                    <div className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold ${darkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                        Nuevo
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default InicioView;
