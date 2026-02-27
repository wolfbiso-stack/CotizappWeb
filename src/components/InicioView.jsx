import React, { useState, useEffect, useMemo } from 'react';
import { UserPlus, ClipboardList, FileText, Settings, ArrowUpRight, Clock, Plus, PenTool, CheckCircle, Wrench, RotateCcw, Monitor, Printer, Smartphone, Calendar } from 'lucide-react';
import { formatDateForInput } from '../utils/format';

const InicioView = ({ services = [], savedClients = [], quotations = [], products = [], citas = [], darkMode = false }) => {

    // Chart Data States
    const [chartData, setChartData] = useState({
        ingresos: [0, 0, 0], // [Month-2, Month-1, CurrentMonth]
        cotizaciones: [0, 0, 0],
        labels: []
    });

    const [recentActivity, setRecentActivity] = useState([]);

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

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const getMonthOffset = (timestamp) => {
            if (!timestamp) return -1;
            const d = new Date(timestamp);
            return (currentYear - d.getFullYear()) * 12 + (currentMonth - d.getMonth());
        };

        let tempIngresos = [0, 0, 0];
        let tempCotizaciones = [0, 0, 0];

        // 1. Process Services
        services.forEach(s => {
            const timeVal = parseDateVal(s.fecha || s.created_at);
            if (timeVal > 0) {
                activities.push({
                    type: 'order',
                    id: s.folio || s.id,
                    title: `Nueva orden creada: ORD-${s.folio || 'N/A'}`,
                    date: timeVal,
                    icon: ClipboardList,
                    color: 'bg-blue-500',
                    bg: 'bg-blue-50 text-blue-500'
                });

                // Chart Logic: sum totals for last 3 months
                const offset = getMonthOffset(timeVal);
                if (offset >= 0 && offset <= 2) {
                    tempIngresos[2 - offset] += (Number(s.total) || Number(s.precio) || 0); // Assuming total or precio exists
                }
            }
        });

        // 2. Process Quotations
        quotations.forEach(q => {
            const timeVal = parseDateVal(q.fecha || q.created_at);
            if (timeVal > 0) {
                activities.push({
                    type: 'quote',
                    id: q.folio || q.id,
                    title: `Cotización enviada: ${q.folio || 'N/A'}`,
                    date: timeVal,
                    icon: FileText,
                    color: 'bg-yellow-500',
                    bg: 'bg-yellow-50 text-yellow-500'
                });

                // Chart Logic
                const offset = getMonthOffset(timeVal);
                if (offset >= 0 && offset <= 2) {
                    tempCotizaciones[2 - offset] += 1;
                }
            }
        });

        // 3. Process Clients
        savedClients.forEach((c, idx) => {
            const timeVal = parseDateVal(c.created_at);
            if (timeVal > 0) {
                activities.push({
                    type: 'client',
                    id: c.id || `client-fallback-${idx}`,
                    title: `Cliente registrado: ${c.name || 'Desconocido'}`,
                    date: timeVal,
                    icon: UserPlus,
                    color: 'bg-emerald-500',
                    bg: 'bg-emerald-50 text-emerald-500'
                });
            }
        });

        // Sort by date DESC
        activities.sort((a, b) => b.date - a.date);

        // Keep top 4 for widget
        setRecentActivity(activities.slice(0, 4));

        // Prepare chart labels
        const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
        const labels = [
            monthNames[(currentMonth - 2 + 12) % 12],
            monthNames[(currentMonth - 1 + 12) % 12],
            monthNames[currentMonth]
        ];

        setChartData({
            ingresos: tempIngresos,
            cotizaciones: tempCotizaciones,
            labels
        });

    }, [services, quotations, savedClients]);

    // Format days ago using a fixed 'now' to prevent jumping
    const getDaysAgoText = (timestamp) => {
        if (!timestamp) return 'Reciente';
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - timestamp);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Ayer';
        return `hace ${diffDays} días`;
    };

    // Calculate Y points for an SVG chart given an array of 3 values and an available height (e.g., 0 to 100)
    const getChartPoints = (data, maxY) => {
        const peak = Math.max(...data, maxY || 1) * 1.2; // Add 20% padding top
        // map data to Y coordinates: 100 is bottom, 0 is top
        const mapped = data.map(val => 100 - ((val / peak) * 100));
        return {
            points: [mapped[0], mapped[1], mapped[2]],
            peak,
            // Calculate intermediate y-axis labels
            labels: [
                peak.toFixed(0),
                (peak * 0.75).toFixed(0),
                (peak * 0.5).toFixed(0),
                (peak * 0.25).toFixed(0),
                0
            ]
        };
    };

    const ingresosFormat = (val) => val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val}`;
    const ingresosData = getChartPoints(chartData.ingresos, 2000);
    const cotizacionesChartData = getChartPoints(chartData.cotizaciones, 5);

    // Dynamic Citas logic
    const { citasHoy, citasManana } = useMemo(() => {
        const todayStr = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD' depending on tz

        const dtManana = new Date();
        dtManana.setDate(dtManana.getDate() + 1);
        const mananaStr = dtManana.toLocaleDateString('en-CA');

        let hoy = 0;
        let manana = 0;

        if (citas && Array.isArray(citas)) {
            citas.forEach(c => {
                if (c.estatus !== 'Cancelada') {
                    // Safe parsing to standard YYYY-MM-DD for comparison
                    const parsedFecha = formatDateForInput(c.fecha);
                    if (parsedFecha === todayStr) hoy++;
                    if (parsedFecha === mananaStr) manana++;
                }
            });
        }
        return { citasHoy: hoy, citasManana: manana };
    }, [citas]);

    // Component Base Style
    const baseCard = `rounded-2xl shadow-sm border p-6 flex flex-col ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`;

    return (
        <div className="w-full px-4 md:px-8 py-8 animate-in fade-in duration-300">
            {/* Top Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

                {/* Clientes */}
                <div className={`rounded-xl shadow-sm border p-6 flex justify-between items-start relative overflow-hidden group ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity bg-gradient-to-bl from-emerald-400 to-transparent w-full h-full pointer-events-none rounded-xl" />
                    <div>
                        <h3 className={`text-4xl font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{savedClients.length}</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Clientes</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-500">
                        <UserPlus className="w-5 h-5" />
                    </div>
                </div>

                {/* Órdenes */}
                <div className={`rounded-xl shadow-sm border p-6 flex justify-between items-start relative overflow-hidden group ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity bg-gradient-to-bl from-blue-400 to-transparent w-full h-full pointer-events-none rounded-xl" />
                    <div>
                        <h3 className={`text-4xl font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{services.length}</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Órdenes</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-blue-50 text-blue-500">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                </div>

                {/* Cotizaciones */}
                <div className={`rounded-xl shadow-sm border p-6 flex justify-between items-start relative overflow-hidden group ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity bg-gradient-to-bl from-purple-400 to-transparent w-full h-full pointer-events-none rounded-xl" />
                    <div>
                        <h3 className={`text-4xl font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{quotations.length}</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Cotizaciones</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-purple-50 text-purple-500">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>

                {/* Prod / Serv */}
                <div className={`rounded-xl shadow-sm border p-6 flex justify-between items-start relative overflow-hidden group ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity bg-gradient-to-bl from-amber-400 to-transparent w-full h-full pointer-events-none rounded-xl" />
                    <div>
                        <h3 className={`text-4xl font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{products.length}</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Prod/Serv</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-50 text-amber-500">
                        <Settings className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Actividades Recientes */}
                <div className={`lg:col-span-1 ${baseCard}`}>
                    <h3 className={`text-sm font-bold text-center mb-6 pb-4 border-b ${darkMode ? 'text-slate-200 border-slate-700' : 'text-slate-700 border-slate-100'}`}>
                        Actividades Recientes
                    </h3>

                    <div className="space-y-4 flex-1">
                        {recentActivity.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-sm">No hay actividades recientes</div>
                        ) : (
                            recentActivity.map((act, i) => (
                                <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${act.bg}`}>
                                        <act.icon className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-bold truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{act.title}</p>
                                        <p className={`text-[10px] text-center mt-1 w-fit ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{getDaysAgoText(act.date)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Middle Column */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    {/* Citas */}
                    <div className={baseCard}>
                        <h3 className={`text-sm font-bold text-center mb-6 pb-4 border-b ${darkMode ? 'text-slate-200 border-slate-700' : 'text-slate-700 border-slate-100'}`}>
                            Citas
                        </h3>

                        <div className="grid grid-cols-2 gap-4 flex-1 items-stretch">
                            <div className={`rounded-xl flex flex-col items-center justify-center p-4 ${darkMode ? 'bg-blue-900/20 text-blue-100' : 'bg-blue-50 text-blue-900'}`}>
                                <p className="text-xs font-bold mb-1">Hoy</p>
                                <p className="text-[10px] opacity-70 mb-2">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')}</p>
                                <span className={`text-4xl font-black ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{citasHoy}</span>
                                <p className="text-[10px] font-bold tracking-widest uppercase mt-2 opacity-60">CITAS</p>
                            </div>

                            <div className={`rounded-xl flex flex-col items-center justify-center p-4 ${darkMode ? 'bg-emerald-900/20 text-emerald-100' : 'bg-emerald-50 text-emerald-900'}`}>
                                <p className="text-xs font-bold mb-1">Mañana</p>
                                <p className="text-[10px] opacity-70 mb-2">{new Date(Date.now() + 86400000).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')}</p>
                                <span className={`text-4xl font-black ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{citasManana}</span>
                                <p className="text-[10px] font-bold tracking-widest uppercase mt-2 opacity-60">CITAS</p>
                            </div>
                        </div>
                    </div>

                    {/* Ingresos últimos 3 meses (Mock Chart) */}
                    <div className={baseCard}>
                        <h3 className={`text-sm font-bold text-center mb-6 pb-4 border-b ${darkMode ? 'text-slate-200 border-slate-700' : 'text-slate-700 border-slate-100'}`}>
                            Ingresos últimos 3 meses
                        </h3>

                        <div className="flex-1 flex flex-col justify-end min-h-[140px] px-4 relative mt-4">
                            {/* Y Axis Guides */}
                            <div className="absolute inset-0 flex flex-col justify-between pt-2 pb-6 px-1">
                                {ingresosData.labels.map((val, i) => (
                                    <div key={i} className={`border-b border-dashed border-slate-200 dark:border-slate-700 w-full relative ${val == 0 ? 'border-solid border-slate-200' : ''}`}>
                                        <span className="absolute -left-4 -top-2.5 text-[10px] text-slate-400">{ingresosFormat(val)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Fake SVG Line */}
                            <div className="w-full h-full relative z-10 flex items-end ml-4 pb-6">
                                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                    <path
                                        d={`M 10,${ingresosData.points[0]} L 50,${ingresosData.points[1]} L 90,${ingresosData.points[2]}`}
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    {/* Points */}
                                    <circle cx="10" cy={ingresosData.points[0]} r="4" fill="#3b82f6" className="ring-2 ring-white dark:ring-slate-800" />
                                    <circle cx="50" cy={ingresosData.points[1]} r="4" fill="#3b82f6" className="ring-2 ring-white dark:ring-slate-800" />
                                    <circle cx="90" cy={ingresosData.points[2]} r="4" fill="#3b82f6" className="ring-2 ring-white dark:ring-slate-800" />
                                </svg>
                            </div>

                            {/* X Axis Labels */}
                            <div className="flex justify-between w-full mt-2 ml-4 px-2 text-[10px] font-bold text-slate-400">
                                <span>{chartData.labels[0]}</span>
                                <span>{chartData.labels[1]}</span>
                                <span>{chartData.labels[2]}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    {/* Cotizaciones convertidas (Mock Chart) */}
                    <div className={baseCard}>
                        <h3 className={`text-sm font-bold text-center mb-6 pb-4 border-b ${darkMode ? 'text-slate-200 border-slate-700' : 'text-slate-700 border-slate-100'}`}>
                            Cotizaciones convertidas
                        </h3>

                        <div className="flex-1 flex flex-col justify-end min-h-[140px] px-4 relative mt-4">
                            {/* Y Axis Guides */}
                            <div className="absolute inset-0 flex flex-col justify-between pt-2 pb-6 px-1">
                                {cotizacionesChartData.labels.map((val, i) => (
                                    <div key={i} className={`border-b border-dashed border-slate-100 dark:border-slate-800 w-full relative ${val == 0 ? 'border-solid border-slate-200' : ''}`}>
                                        <span className="absolute -left-6 -top-2.5 text-[10px] text-slate-400 w-4 text-right">{val}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Fake SVG Line */}
                            <div className="w-full h-full relative z-10 flex items-end ml-2 pb-6">
                                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                    <path
                                        d={`M 10,${cotizacionesChartData.points[0]} L 50,${cotizacionesChartData.points[1]} L 90,${cotizacionesChartData.points[2]}`}
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    {/* Points */}
                                    <circle cx="10" cy={cotizacionesChartData.points[0]} r="3" fill="#10b981" className="ring-2 ring-white dark:ring-slate-800" />
                                    <circle cx="50" cy={cotizacionesChartData.points[1]} r="3" fill="#10b981" className="ring-2 ring-white dark:ring-slate-800" />
                                    <circle cx="90" cy={cotizacionesChartData.points[2]} r="3" fill="#10b981" className="ring-2 ring-white dark:ring-slate-800" />
                                </svg>
                            </div>

                            {/* X Axis Labels */}
                            <div className="flex justify-between w-full mt-2 text-[10px] font-bold text-slate-400 ml-2">
                                <span>{chartData.labels[0]}</span>
                                <span>{chartData.labels[1]}</span>
                                <span>{chartData.labels[2]}</span>
                            </div>
                        </div>
                    </div>

                    {/* Clock/Date */}
                    <div className={`${baseCard} items-center justify-center min-h-[200px]`}>
                        <div className="text-center">
                            <p className={`text-[10px] font-black tracking-widest uppercase mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                                {new Date().toLocaleDateString('es-ES', { month: 'short', weekday: 'short' }).replace('.', '')}
                            </p>
                            <h2 className={`text-6xl font-black tracking-tighter mb-4 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                {new Date().getDate()}
                            </h2>
                            <p className={`text-lg font-medium text-slate-500 font-mono`}>
                                {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default InicioView;
