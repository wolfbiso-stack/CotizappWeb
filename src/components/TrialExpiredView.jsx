import React from 'react';
import { Clock, Zap, ShieldAlert, Rocket, CreditCard } from 'lucide-react';

const TrialExpiredView = ({ onSubscribe, darkMode }) => {
    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
            <div className={`max-w-2xl w-full p-8 md:p-12 rounded-[2.5rem] shadow-2xl text-center border relative overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full translate-y-16 -translate-x-16 blur-2xl"></div>

                <div className="relative z-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-orange-100 text-orange-600 mb-8 animate-bounce shadow-lg shadow-orange-500/20">
                        <Clock className="w-10 h-10" />
                    </div>

                    <h1 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">
                        ¡Tus 7 días de prueba han <span className="text-orange-600">terminado</span>!
                    </h1>

                    <p className={`text-lg mb-10 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Tu periodo de prueba gratuita de SmartQuote ha llegado a su fin. Para seguir disfrutando de todas nuestras herramientas premium, creadas para escalar tu negocio, necesitas activar una suscripción.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 text-left">
                        {[
                            { icon: Rocket, text: 'Gestión ilimitada', color: 'text-blue-500' },
                            { icon: Zap, text: 'Informes avanzados', color: 'text-yellow-500' },
                            { icon: CreditCard, text: 'Cotizaciones ilimitadas', color: 'text-green-500' },
                            { icon: ShieldAlert, text: 'Backup en la nube', color: 'text-purple-500' },
                        ].map((item, idx) => (
                            <div key={idx} className={`flex items-center gap-3 p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                <item.icon className={`w-5 h-5 ${item.color}`} />
                                <span className="font-bold text-sm tracking-tight">{item.text}</span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={onSubscribe}
                            className="w-full py-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-black text-lg shadow-xl shadow-blue-500/30 hover:scale-[1.02] hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                        >
                            <Zap className="w-6 h-6 fill-current" />
                            Activar Premium Ahora
                        </button>

                        <p className={`text-xs uppercase font-bold tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            Cancela en cualquier momento • Soporte 24/7
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrialExpiredView;
