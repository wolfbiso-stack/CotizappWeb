import React, { useState } from 'react';
import { Zap, Mail, Lock, Loader2, LogIn, Sun, Moon } from 'lucide-react';
import { supabase } from '../../utils/supabase';

const Login = ({ onLogin, currentTheme = 'blue', setTheme }) => {
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

    const getThemeStyles = () => {
        switch (currentTheme) {
            case 'dark':
                return {
                    bg: 'bg-slate-900',
                    container: 'bg-slate-800/60 backdrop-blur-xl border-slate-700 shadow-2xl shadow-black/50',
                    headerGradient: 'bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700',
                    textTitle: 'text-white',
                    textSubtitle: 'text-slate-400',
                    inputBg: 'bg-slate-900/50',
                    inputBorder: 'border-slate-600 focus:border-blue-500',
                    inputText: 'text-white placeholder-slate-500',
                    iconColor: 'text-slate-400',
                    labelColor: 'text-slate-300',
                    divider: 'border-slate-700',
                    dividerBg: 'bg-slate-800/0', // Transparent because of container blur, or handle carefully
                    dividerText: 'text-slate-500',
                    googleBtn: 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600',
                    primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                };
            case 'glass':
                return {
                    bg: 'bg-gradient-to-br from-indigo-300 via-purple-300 to-pink-300',
                    container: 'bg-white/30 backdrop-blur-2xl border-white/40 shadow-2xl shadow-purple-500/10',
                    headerGradient: 'bg-gradient-to-r from-white/40 to-white/20 border-b border-white/20',
                    textTitle: 'text-slate-900',
                    textSubtitle: 'text-slate-700',
                    inputBg: 'bg-white/50',
                    inputBorder: 'border-white/50 focus:border-purple-500 focus:bg-white/80',
                    inputText: 'text-slate-800 placeholder-slate-500',
                    iconColor: 'text-slate-600',
                    labelColor: 'text-slate-800',
                    divider: 'border-white/40',
                    dividerBg: 'bg-transparent',
                    dividerText: 'text-slate-600',
                    googleBtn: 'bg-white/60 border-white/50 text-slate-800 hover:bg-white/80',
                    primaryBtn: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-purple-500/30'
                };
            case 'blue':
            default:
                return {
                    bg: 'bg-gradient-modern',
                    container: 'bg-white/90 backdrop-blur-xl border-white/50 shadow-2xl',
                    headerGradient: 'bg-gradient-to-r from-blue-600 to-blue-700',
                    textTitle: 'text-white',
                    textSubtitle: 'text-blue-100',
                    inputBg: 'bg-slate-50',
                    inputBorder: 'border-slate-200 focus:border-blue-500',
                    inputText: 'text-slate-800 placeholder-slate-400',
                    iconColor: 'text-slate-400',
                    labelColor: 'text-slate-600',
                    divider: 'border-slate-200',
                    dividerBg: 'bg-white',
                    dividerText: 'text-slate-500',
                    googleBtn: 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                    primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'
                };
        }
    };

    const styles = getThemeStyles();

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${styles.bg}`}>

            {/* Theme Switcher */}
            <div className="absolute top-6 right-6 flex gap-2 bg-black/10 backdrop-blur-md p-1.5 rounded-full border border-white/10">
                <button
                    onClick={() => setTheme && setTheme('blue')}
                    className={`p-2 rounded-full transition-all ${currentTheme === 'blue' ? 'bg-blue-600 text-white shadow-lg scale-110' : 'text-white/70 hover:bg-white/10'}`}
                    title="Modo Azul"
                >
                    <Zap className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setTheme && setTheme('dark')}
                    className={`p-2 rounded-full transition-all ${currentTheme === 'dark' ? 'bg-slate-800 text-white shadow-lg scale-110' : 'text-white/70 hover:bg-white/10'}`}
                    title="Modo Oscuro"
                >
                    <Moon className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setTheme && setTheme('glass')}
                    className={`p-2 rounded-full transition-all ${currentTheme === 'glass' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg scale-110' : 'text-white/70 hover:bg-white/10'}`}
                    title="Modo Glass"
                >
                    <Sun className="w-4 h-4" />
                </button>
            </div>

            <div className={`w-full max-w-md overflow-hidden rounded-2xl border transition-all duration-500 ${styles.container}`}>
                {/* Header */}
                <div className={`p-8 text-center transition-colors duration-500 ${styles.headerGradient}`}>
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-4 text-white overflow-hidden shadow-inner">
                        <img
                            src="logo.png"
                            alt="Logo"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.parentNode.innerHTML = `<svg class="w-8 h-8 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>`;
                            }}
                        />
                    </div>
                    <h2 className={`text-2xl font-bold mb-1 transition-colors ${styles.textTitle}`}>CotizaApp Web</h2>
                    <p className={`text-sm tracking-widest uppercase transition-colors ${styles.textSubtitle}`}>Soluciones a tu medida</p>
                </div>

                {/* Form */}
                <div className="p-8">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className={`w-full font-bold py-3 rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 mb-8 ${styles.googleBtn}`}
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                        Continuar con Google
                    </button>

                    <div className="relative mb-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className={`w-full border-t transition-colors ${styles.divider}`}></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className={`px-4 rounded-full transition-colors ${styles.dividerText} ${currentTheme === 'glass' ? 'backdrop-blur-sm bg-white/30' : (currentTheme === 'dark' ? 'bg-slate-800' : 'bg-white')}`}>
                                O ingresa con tu correo
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleEmailLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className={`text-xs font-bold uppercase tracking-wider transition-colors ${styles.labelColor}`}>Correo Electrónico</label>
                            <div className="relative group">
                                <Mail className={`absolute left-3 top-3.5 w-5 h-5 transition-colors ${styles.iconColor} group-focus-within:text-blue-500`} />
                                <input
                                    type="email"
                                    className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all outline-none font-medium focus:ring-4 focus:ring-blue-500/10 ${styles.inputBg} ${styles.inputBorder} ${styles.inputText}`}
                                    placeholder="hola@ejemplo.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className={`text-xs font-bold uppercase tracking-wider transition-colors ${styles.labelColor}`}>Contraseña</label>
                            </div>
                            <div className="relative group">
                                <Lock className={`absolute left-3 top-3.5 w-5 h-5 transition-colors ${styles.iconColor} group-focus-within:text-blue-500`} />
                                <input
                                    type="password"
                                    className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all outline-none font-medium focus:ring-4 focus:ring-blue-500/10 ${styles.inputBg} ${styles.inputBorder} ${styles.inputText}`}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full font-bold py-3.5 rounded-xl transition-all transform hover:-translate-y-1 hover:shadow-xl flex items-center justify-center gap-2 mt-4 ${styles.primaryBtn}`}
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

            {/* Footer */}
            <div className="absolute bottom-6 text-center text-white/50 text-xs">
                &copy; {new Date().getFullYear()} WolfBiso Stack. All rights reserved.
            </div>
        </div>
    );
};

export default Login;
