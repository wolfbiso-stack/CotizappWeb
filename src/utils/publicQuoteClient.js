import { createClient } from '@supabase/supabase-js';
import { createQuoteApi } from './publicQuote';

// Deliberately independent of the private dashboard session.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const publicQuoteApi = createQuoteApi(url && key ? createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}) : null);

publicQuoteApi.trackEventKeepAlive = function(token, sessionId, evento, duracionSegundos, dispositivo, metadata = {}) {
    if (!url || !key || !token || !/^[a-f0-9]{64}$/.test(token)) return;
    try {
        fetch(`${url}/rest/v1/rpc/registrar_evento_cotizacion_publica`, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_token: token,
                p_session_id: sessionId,
                p_evento: evento,
                p_duracion_segundos: duracionSegundos,
                p_dispositivo: dispositivo,
                p_metadata: metadata
            }),
            keepalive: true
        }).catch(() => {});
    } catch (e) {}
};
