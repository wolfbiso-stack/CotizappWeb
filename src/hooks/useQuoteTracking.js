import { useEffect, useRef, useState } from 'react';
import { publicQuoteApi } from '../utils/publicQuoteClient';
import { supabase } from '../../utils/supabase';

export function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
    return 'desktop';
}

export function useQuoteTracking(token, quoteLoaded) {
    const sessionId = useRef(crypto.randomUUID());
    const deviceType = useRef(getDeviceType());
    const activeTimeMs = useRef(0);
    const lastVisibleTime = useRef(Date.now());
    const hasTrackedView = useRef(false);
    const closedSentRef = useRef(false); // Prevents multiple quote_closed
    const [isAdminPreview, setIsAdminPreview] = useState(false);
    const [checkingPreview, setCheckingPreview] = useState(true);

    // Private track function that safely calls API
    const _track = async (evento, duracion_segundos = null, metadata = {}) => {
        if (!token || isAdminPreview) return;
        try {
            await publicQuoteApi.trackEvent(token, sessionId.current, evento, duracion_segundos, deviceType.current, metadata);
        } catch (error) {
            console.error('Error tracking event:', error);
        }
    };

    // Public track function
    const track = (evento, metadata = {}) => {
        if (checkingPreview) return; // Prevent tracking before preview is resolved
        _track(evento, null, metadata);
    };

    useEffect(() => {
        const verifyAdmin = async () => {
            const previewRequested = new URLSearchParams(window.location.search).get('preview') === 'true';
            console.log("[QuotePreview] preview solicitado:", previewRequested);
            
            if (!previewRequested) {
                setCheckingPreview(false);
                return;
            }
            try {
                const { data: { session } } = await supabase.auth.getSession();
                console.log("[QuotePreview] sesión encontrada:", Boolean(session));
                console.log("[QuotePreview] usuario:", session?.user?.id);
                
                if (session) {
                    const { data: authorized, error } = await supabase.rpc('check_quote_admin', { p_token: token });
                    if (error) console.error("[QuotePreview] error check_quote_admin:", error);
                    console.log("[QuotePreview] autorizado:", authorized);
                    
                    if (authorized) {
                        setIsAdminPreview(true);
                        console.log("[QuotePreview] admin preview final:", true);
                        setCheckingPreview(false);
                        return;
                    }
                }
            } catch (e) {
                console.error("[QuotePreview] exception:", e);
            }
            console.log("[QuotePreview] admin preview final:", false);
            setCheckingPreview(false);
        };
        verifyAdmin();
    }, [token]);

    // 9. QUOTE_VIEWED
    useEffect(() => {
        if (quoteLoaded && !checkingPreview && !hasTrackedView.current && !isAdminPreview) {
            hasTrackedView.current = true;
            _track('quote_viewed');
        }
    }, [quoteLoaded, checkingPreview, isAdminPreview]);

    // 11. MEDICIÓN DE TIEMPO ACTIVO & 12. CIERRE DE SESIÓN
    useEffect(() => {
        if (checkingPreview || isAdminPreview) return;

        const handleVisibilityChange = () => {
            const now = Date.now();
            if (document.visibilityState === 'visible') {
                lastVisibleTime.current = now;
            } else {
                activeTimeMs.current += (now - lastVisibleTime.current);
            }
        };

        const handleClose = () => {
            if (closedSentRef.current) return;
            closedSentRef.current = true; // Make it idempotent

            const now = Date.now();
            if (document.visibilityState === 'visible') {
                activeTimeMs.current += (now - lastVisibleTime.current);
            }
            const duracion_segundos = Math.floor(activeTimeMs.current / 1000);
            
            if (token) {
                try {
                    publicQuoteApi.trackEventKeepAlive(token, sessionId.current, 'quote_closed', duracion_segundos, deviceType.current);
                } catch (e) {}
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleClose);
        window.addEventListener('pagehide', handleClose);
        window.addEventListener('unload', handleClose);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleClose);
            window.removeEventListener('pagehide', handleClose);
            window.removeEventListener('unload', handleClose);
            
            // En React cleanup al desmontar, intentamos enviarlo también si no se ha enviado
            handleClose();
        };
    }, [token, isAdminPreview, checkingPreview]);

    return { track, isAdminPreview };
}
