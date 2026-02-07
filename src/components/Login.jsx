import React, { useState } from 'react';
import { Zap, Mail, Lock, Loader2, LogIn } from 'lucide-react';
import { supabase } from '../../utils/supabase';

const Login = ({ onLogin }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const redirectUrl = window.location.hostname === "localhost"
                ? "http://localhost:5173/CotizappWeb/"
                : "https://wolfbiso-stack.github.io/CotizappWeb";

            console.log('Intentando redirigir a:', redirectUrl);

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl
                }
            });
            if (error) throw error;
        } catch (error) {
            alert('Error al iniciar con Google: ' + error.message);
            setLoading(false);
        }
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Visual simulation or placeholder for future email logic
        alert("Por favor usa el botón de Google para entrar.");
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-modern flex items-center justify-center p-4">
            <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-center">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-4 text-white overflow-hidden">
                        <img
                            src="logo.png"
                            alt="Logo"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.parentNode.innerHTML = '<svg class="w-8 h-8" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>'; // Fallback to Zap icon SVG if image fails
                            }}
                        />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">CotizaApp Web</h2>
                    <p className="text-blue-100 text-sm">SOLUCIONES A TU MEDIDA</p>
                </div>

                {/* Form */}
                <div className="p-8">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-lg shadow-sm hover:bg-slate-50 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 mb-6"
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                        Continuar con Google
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-slate-500">O ingresa con tu correo</span>
                        </div>
                    </div>

                    <form onSubmit={handleEmailLogin} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-600">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 transition-all outline-none font-medium"
                                    placeholder="hola@ejemplo.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-semibold text-slate-600">Contraseña</label>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 transition-all outline-none font-medium"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Cargando...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    Iniciar Sesión
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
