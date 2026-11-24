import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

// Clave oficial de prueba de Cloudflare Turnstile (pasa siempre automáticamente para desarrollo)
const DUMMY_ALWAYS_PASSES_SITEKEY = '1x00000000000000000000AA';

const TurnstileWidget = ({
    siteKey,
    onVerify,
    onError,
    onExpire,
    theme = 'auto',
    className = ''
}) => {
    const containerRef = useRef(null);
    const widgetIdRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const activeSiteKey = siteKey || import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || DUMMY_ALWAYS_PASSES_SITEKEY;

    useEffect(() => {
        // Función para renderizar el widget cuando la API esté lista
        const renderWidget = () => {
            if (!window.turnstile || !containerRef.current) return;

            // Limpiar widget anterior si existe
            if (widgetIdRef.current) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                } catch {
                    // Ignorar errores al remover
                }
                widgetIdRef.current = null;
            }

            try {
                widgetIdRef.current = window.turnstile.render(containerRef.current, {
                    sitekey: activeSiteKey,
                    theme: theme,
                    callback: (token) => {
                        if (onVerify) onVerify(token);
                    },
                    'error-callback': (err) => {
                        console.warn('Turnstile error:', err);
                        if (onError) onError(err);
                    },
                    'expired-callback': () => {
                        if (onExpire) onExpire();
                    },
                });
                setIsLoaded(true);
            } catch (e) {
                console.warn('Error al renderizar Turnstile:', e);
            }
        };

        // Si ya está el script en window, renderizar de inmediato
        if (window.turnstile) {
            renderWidget();
            return;
        }

        // Cargar script si no existe
        const scriptId = 'cf-turnstile-script';
        let script = document.getElementById(scriptId);

        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }

        const checkInterval = setInterval(() => {
            if (window.turnstile) {
                clearInterval(checkInterval);
                renderWidget();
            }
        }, 150);

        return () => {
            clearInterval(checkInterval);
            if (widgetIdRef.current && window.turnstile) {
                try {
                    window.turnstile.remove(widgetIdRef.current);
                } catch {
                    // Ignorar errores
                }
                widgetIdRef.current = null;
            }
        };
    }, [activeSiteKey, theme]);

    return (
        <div className={`my-3 flex flex-col items-center justify-center ${className}`}>
            <div ref={containerRef} className="min-h-[65px] flex items-center justify-center" />
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                <ShieldCheck className="w-3 h-3 text-[#1987C6]" />
                <span>Protegido con Cloudflare Turnstile</span>
            </div>
        </div>
    );
};

export default TurnstileWidget;
