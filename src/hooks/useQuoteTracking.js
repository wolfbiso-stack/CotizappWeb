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
    const [isAdminPreview, setIsAdminPreview] = useState(false);
    const isCheckingAdmin = useRef(true);

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
        if (isCheckingAdmin.current) {
            // Queue it or wait, but usually quoteLoaded comes after a moment, and checkAdmin is fast
            // To be safe, we just wait a bit if still checking
            setTimeout(() => {
                if (!isAdminPreview) _track(evento, null, metadata);
            }, 500);
            return;
        }
        _track(evento, null, metadata);
    };

    useEffect(() => {
        const verifyAdmin = async () => {
            if (new URLSearchParams(window.location.search).get('preview') !== 'true') {
                isCheckingAdmin.current = false;
                return;
            }
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const { data: isAdmin } = await supabase.rpc('check_quote_admin', { p_token: token });
                    if (isAdmin) {
                        setIsAdminPreview(true);
                        console.log(`[Preview Mode] Skipped tracking.`);
                    }
                }
            } catch (e) {}
            isCheckingAdmin.current = false;
            
            // Check if we missed the quote_viewed
            if (quoteLoaded && !hasTrackedView.current && !isAdminPreview) {
                hasTrackedView.current = true;
                _track('quote_viewed');
            }
        };
        verifyAdmin();
    }, [token]);

    // 9. QUOTE_VIEWED
    useEffect(() => {
        if (quoteLoaded && !isCheckingAdmin.current && !hasTrackedView.current && !isAdminPreview) {
            hasTrackedView.current = true;
            _track('quote_viewed');
        }
    }, [quoteLoaded, isAdminPreview]);

    // 11. MEDICIÓN DE TIEMPO ACTIVO & 12. CIERRE DE SESIÓN
    useEffect(() => {
        const handleVisibilityChange = () => {
            const now = Date.now();
            if (document.visibilityState === 'visible') {
                lastVisibleTime.current = now;
            } else {
                activeTimeMs.current += (now - lastVisibleTime.current);
            }
        };

        const handleBeforeUnload = (e) => {
            if (document.visibilityState === 'visible') {
                activeTimeMs.current += (Date.now() - lastVisibleTime.current);
            }
            const duracion_segundos = Math.floor(activeTimeMs.current / 1000);
            
            // sendBeacon doesn't support custom headers easily for Supabase RPC,
            // but we can try to send it asynchronously. The browser might cancel it.
            // A common fallback is using fetch with keepalive: true
            if (token && !isAdminPreview) {
                try {
                    publicQuoteApi.trackEventKeepAlive(token, sessionId.current, 'quote_closed', duracion_segundos, deviceType.current);
                } catch (e) {}
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handleBeforeUnload);
        };
    }, [token, isAdminPreview]);

    return { track, isAdminPreview };
}
