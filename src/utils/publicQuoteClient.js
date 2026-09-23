import { createClient } from '@supabase/supabase-js';
import { createQuoteApi } from './publicQuote';

// Deliberately independent of the private dashboard session.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const publicQuoteApi = createQuoteApi(url && key ? createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}) : null);
