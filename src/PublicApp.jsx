import React, { useState, useEffect } from 'react';
import PublicRepairTracking from './components/PublicRepairTracking';
import { Rocket, Phone, MapPin } from 'lucide-react';
import { supabase } from '../utils/supabase';

const PublicApp = () => {
    const [company, setCompany] = useState(null);

    useEffect(() => {
        const fetchCompany = async () => {
            try {
                // Fetch the first company profile found
                const { data } = await supabase
                    .from('configuracion_empresa')
                    .select('*')
                    .limit(1);
                    
                if (data && data.length > 0) {
                    setCompany(data[0]);
                }
            } catch (err) {
                console.error("Error fetching company data:", err);
            }
        };
        fetchCompany();
    }, []);
    // Determine if we are tracking a repair
    const urlHash = window.location.hash;
    const urlPath = window.location.pathname;
    
    if (urlHash.includes('#/track/') || urlPath.includes('/track/')) {
        return <PublicRepairTracking />;
    }

    // Default Landing Page
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
            <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-slate-100">
                
                <div className="mb-12 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-100 text-blue-700 font-bold text-sm uppercase tracking-widest animate-pulse border border-blue-200 shadow-sm">
                    <Rocket className="w-5 h-5" />
                    PRÓXIMAMENTE
                </div>

                <div className="bg-white p-10 md:p-16 rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full flex flex-col items-center">
                    {/* Logo */}
                    <div className="mb-8 w-40 h-40 relative flex items-center justify-center bg-slate-50 rounded-2xl p-4 shadow-inner border border-slate-100">
                        <img 
                            src={company?.logo_uri || "logo.png"} 
                            alt="Logo de la Empresa" 
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>

                    {/* Nombre */}
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6">
                        {company?.nombre || "CotizApp"}
                    </h1>
                    
                    {/* Detalles de contacto */}
                    <div className="flex flex-col gap-4 text-slate-600 mt-4">
                        {company?.telefono && (
                            <div className="flex items-center justify-center gap-3 text-lg">
                                <Phone className="w-5 h-5 text-blue-500" />
                                <span className="font-medium">{company.telefono}</span>
                            </div>
                        )}
                        
                        {company?.direccion && (
                            <div className="flex items-center justify-center gap-3 text-lg">
                                <MapPin className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <span className="font-medium max-w-md">{company.direccion}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-12">
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
                        className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors underline decoration-slate-300 underline-offset-4"
                    >
                        Acceso Administrativo
                    </a>
                </div>
            </main>
        </div>
    );
};

export default PublicApp;
