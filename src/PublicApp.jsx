import React from 'react';
import PublicRepairTracking from './components/PublicRepairTracking';
import { Rocket, MapPin } from 'lucide-react';

const PublicApp = () => {
    // Determine if we are tracking a repair
    const urlHash = window.location.hash;
    const urlPath = window.location.pathname;
    
    if (urlHash.includes('#/track/') || urlPath.includes('/track/')) {
        return <PublicRepairTracking />;
    }

    // Default Landing Page - Serious Tech Style
    return (
        <div className="min-h-screen bg-[#0f172a] font-sans text-slate-200 flex flex-col relative overflow-hidden">
            {/* Tech Background Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5NGExYjIiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djI2aDJWMzRoLzJ6bS0yLThWMGgtMnYyNmgyeiIvPjwvZz48L2c+PC9zdmc+')] pointer-events-none"></div>

            <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 relative z-10">
                
                {/* PRÓXIMAMENTE Badge */}
                <div className="mb-12 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-500/10 text-blue-400 font-bold text-xs sm:text-sm uppercase tracking-[0.2em] border border-blue-500/20 backdrop-blur-md shadow-[0_0_20px_rgba(59,130,246,0.15)] animate-pulse">
                    <Rocket className="w-4 h-4" />
                    PRÓXIMAMENTE
                </div>

                <div className="bg-slate-900/60 backdrop-blur-2xl p-10 md:p-14 rounded-3xl shadow-2xl border border-slate-700/50 max-w-2xl w-full flex flex-col items-center ring-1 ring-white/5">
                    
                    {/* Logo (With white background since original logo has dark text) */}
                    <div className="mb-8 w-64 h-48 sm:w-80 sm:h-56 relative flex items-center justify-center bg-white rounded-2xl p-6 shadow-xl border border-slate-800">
                        <img 
                            src="LogoEmpresa.png" 
                            alt="CUBI Servicios Logo" 
                            className="w-full h-full object-contain"
                        />
                    </div>

                    {/* Nombre */}
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-8 drop-shadow-md">
                        CUBI Servicios
                    </h1>
                    
                    {/* Detalles de contacto */}
                    <div className="flex flex-col gap-5 text-slate-300 mt-2 w-full max-w-sm">
                        
                        {/* WhatsApp / Phone */}
                        <a 
                            href="https://wa.me/529241040806" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-4 text-lg bg-slate-800/50 hover:bg-slate-800 p-4 rounded-xl border border-slate-700/50 transition-colors group cursor-pointer"
                        >
                            {/* WhatsApp SVG Icon */}
                            <svg className="w-6 h-6 text-[#25D366] group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                            </svg>
                            <span className="font-bold tracking-wide font-mono text-xl">924 104 0806</span>
                        </a>
                        
                        {/* Address */}
                        <div className="flex items-center justify-center gap-4 text-lg bg-slate-800/30 p-4 rounded-xl border border-slate-700/30">
                            <MapPin className="w-6 h-6 text-blue-400 flex-shrink-0" />
                            <span className="font-medium text-base text-left">Benito Barriovero 601, Acayucan, Ver.</span>
                        </div>

                    </div>
                </div>

                <div className="mt-16">
                    <a 
                        href="#" 
                        onClick={(e) => {
                            e.preventDefault();
                            const hostname = window.location.hostname;
                            
                            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                                window.location.href = '/?app=true';
                            } else if (hostname.includes('github.io')) {
                                window.location.href = '/CotizappWeb/';
                            } else {
                                const parts = hostname.split('.');
                                const rootDomain = parts.slice(-2).join('.');
                                window.location.href = `https://app.${rootDomain}`;
                            }
                        }}
                        className="px-6 py-3 text-sm font-semibold text-slate-500 hover:text-white transition-colors relative group"
                    >
                        <span className="relative z-10">Acceso al Sistema</span>
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-blue-500 group-hover:w-1/2 transition-all duration-300"></div>
                    </a>
                </div>
            </main>
        </div>
    );
};

export default PublicApp;
