import React from 'react';
import PublicRepairTracking from './components/PublicRepairTracking';
import { Rocket, MonitorSmartphone, ShieldCheck } from 'lucide-react';

const PublicApp = () => {
    // Determine if we are tracking a repair
    const urlHash = window.location.hash;
    const urlPath = window.location.pathname;
    
    if (urlHash.includes('#/track/') || urlPath.includes('/track/')) {
        return <PublicRepairTracking />;
    }

    // Default Landing Page
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
            {/* Navbar */}
            <nav className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200 fixed top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                                C
                            </div>
                            <span className="text-xl font-black tracking-tight text-slate-900">CotizApp</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <a 
                                href="https://app.cotizapp.com" 
                                onClick={(e) => {
                                    // For local testing, allow login to route back to root which is caught by main.jsx rules
                                    if (window.location.hostname === 'localhost') {
                                        e.preventDefault();
                                        window.location.href = '/?app=true';
                                    }
                                }}
                                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                            >
                                Iniciar Sesión
                            </a>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-24 pb-12 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-slate-100">
                
                <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-bold text-sm uppercase tracking-widest animate-pulse border border-blue-200">
                    <Rocket className="w-4 h-4" />
                    PRÓXIMAMENTE
                </div>

                <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-6 max-w-4xl leading-tight">
                    El sistema definitivo para <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">gestionar tus reparaciones</span>
                </h1>
                
                <p className="text-xl text-slate-600 mb-10 max-w-2xl leading-relaxed">
                    Controla tus servicios, genera cotizaciones, imprime etiquetas y mantén informados a tus clientes en tiempo real. Todo desde una sola plataforma.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mt-12">
                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                            <MonitorSmartphone className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Multidispositivo</h3>
                        <p className="text-slate-500 text-sm">Gestiona desde tu PC, tablet o celular de forma cómoda.</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                            <Rocket className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Seguimiento QR</h3>
                        <p className="text-slate-500 text-sm">Tus clientes pueden escanear su ticket para ver el estado de su equipo.</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Seguro y Privado</h3>
                        <p className="text-slate-500 text-sm">Tus datos comerciales protegidos bajo estrictos estándares.</p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-8 text-center mt-auto">
                <p className="text-slate-500 text-sm font-medium">
                    © {new Date().getFullYear()} CotizApp. Todos los derechos reservados.
                </p>
            </footer>
        </div>
    );
};

export default PublicApp;
