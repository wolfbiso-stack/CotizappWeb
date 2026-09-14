import React from 'react';
import { Zap, Construction } from 'lucide-react';

const ConfigCercosView = ({ darkMode }) => {
    const bgClass = darkMode ? 'bg-slate-900' : 'bg-slate-50';
    const textClass = darkMode ? 'text-white' : 'text-slate-900';
    const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
    const cardBgClass = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';

    return (
        <div className={`p-4 md:p-8 ${bgClass} min-h-full flex flex-col items-center justify-center`}>
            <div className={`max-w-md w-full p-8 rounded-3xl border shadow-xl flex flex-col items-center text-center ${cardBgClass}`}>
                <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mb-6 shadow-inner">
                    <Zap className="w-10 h-10 text-yellow-600" />
                </div>
                
                <h1 className={`text-2xl font-black mb-3 ${textClass}`}>
                    Configuración de Cercos Eléctricos
                </h1>
                
                <p className={`mb-8 ${textMuted}`}>
                    Esta sección se encuentra actualmente en construcción. Pronto podrás configurar y gestionar tus cercos eléctricos desde aquí.
                </p>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-bold border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                    En Construcción
                </div>
            </div>
        </div>
    );
};

export default ConfigCercosView;
