-- ==============================================================================
-- MIGRACIÓN: Tokens de servicios y consulta pública segura para Facturación
-- ==============================================================================

-- 1. Asegurar columna `token` en todas las tablas de servicios
ALTER TABLE public.servicios_cctv ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE public.servicios_pc ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE public.servicios_celulares ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE public.servicios_impresoras ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE public.servicios_redes ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE public.servicios_cercos_electricos ADD COLUMN IF NOT EXISTS token TEXT;

-- 2. Backfill de tokens para registros existentes que aún no tengan token
UPDATE public.servicios_cctv
SET token = upper(substr(md5(gen_random_uuid()::text), 1, 8))
WHERE token IS NULL OR btrim(token) = '';

UPDATE public.servicios_pc
SET token = upper(substr(md5(gen_random_uuid()::text), 1, 8))
WHERE token IS NULL OR btrim(token) = '';

UPDATE public.servicios_celulares
SET token = upper(substr(md5(gen_random_uuid()::text), 1, 8))
WHERE token IS NULL OR btrim(token) = '';

UPDATE public.servicios_impresoras
SET token = upper(substr(md5(gen_random_uuid()::text), 1, 8))
WHERE token IS NULL OR btrim(token) = '';

UPDATE public.servicios_redes
SET token = upper(substr(md5(gen_random_uuid()::text), 1, 8))
WHERE token IS NULL OR btrim(token) = '';

UPDATE public.servicios_cercos_electricos
SET token = upper(substr(md5(gen_random_uuid()::text), 1, 8))
WHERE token IS NULL OR btrim(token) = '';

-- 3. Índices para búsqueda rápida por token
CREATE INDEX IF NOT EXISTS idx_servicios_cctv_token ON public.servicios_cctv(token);
CREATE INDEX IF NOT EXISTS idx_servicios_pc_token ON public.servicios_pc(token);
CREATE INDEX IF NOT EXISTS idx_servicios_celulares_token ON public.servicios_celulares(token);
CREATE INDEX IF NOT EXISTS idx_servicios_impresoras_token ON public.servicios_impresoras(token);
CREATE INDEX IF NOT EXISTS idx_servicios_redes_token ON public.servicios_redes(token);
CREATE INDEX IF NOT EXISTS idx_servicios_cercos_electricos_token ON public.servicios_cercos_electricos(token);

-- 4. Función RPC pública (SECURITY DEFINER) que expone ÚNICAMENTE los datos
--    necesarios para el portal de facturación (sin exponer contraseñas ni datos sensibles)
CREATE OR REPLACE FUNCTION public.get_service_for_invoice_by_token(token_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    clean_token TEXT;
    result JSONB;
BEGIN
    clean_token := btrim(COALESCE(token_input, ''));
    IF clean_token = '' THEN
        RETURN NULL;
    END IF;

    -- 1. CCTV (usa servicio_numero)
    SELECT jsonb_build_object(
        'tipo_servicio', 'CCTV',
        'folio', COALESCE(t.servicio_numero::text, ''),
        'cliente_nombre', COALESCE(t.cliente_nombre, ''),
        'cliente_telefono', COALESCE(t.cliente_telefono, ''),
        'total', COALESCE(t.total, 0),
        'token', t.token
    )
    INTO result
    FROM public.servicios_cctv t
    WHERE t.token = clean_token
    LIMIT 1;
    IF result IS NOT NULL THEN RETURN result; END IF;

    -- 2. PC (usa orden_numero)
    SELECT jsonb_build_object(
        'tipo_servicio', 'PC',
        'folio', COALESCE(t.orden_numero::text, ''),
        'cliente_nombre', COALESCE(t.cliente_nombre, ''),
        'cliente_telefono', COALESCE(t.cliente_telefono, ''),
        'total', COALESCE(t.total, 0),
        'token', t.token
    )
    INTO result
    FROM public.servicios_pc t
    WHERE t.token = clean_token
    LIMIT 1;
    IF result IS NOT NULL THEN RETURN result; END IF;

    -- 3. Celulares (usa orden_numero)
    SELECT jsonb_build_object(
        'tipo_servicio', 'Celular',
        'folio', COALESCE(t.orden_numero::text, ''),
        'cliente_nombre', COALESCE(t.cliente_nombre, ''),
        'cliente_telefono', COALESCE(t.cliente_telefono, ''),
        'total', COALESCE(t.total, 0),
        'token', t.token
    )
    INTO result
    FROM public.servicios_celulares t
    WHERE t.token = clean_token
    LIMIT 1;
    IF result IS NOT NULL THEN RETURN result; END IF;

    -- 4. Impresoras (usa orden_numero)
    SELECT jsonb_build_object(
        'tipo_servicio', 'Impresora',
        'folio', COALESCE(t.orden_numero::text, ''),
        'cliente_nombre', COALESCE(t.cliente_nombre, ''),
        'cliente_telefono', COALESCE(t.cliente_telefono, ''),
        'total', COALESCE(t.total, 0),
        'token', t.token
    )
    INTO result
    FROM public.servicios_impresoras t
    WHERE t.token = clean_token
    LIMIT 1;
    IF result IS NOT NULL THEN RETURN result; END IF;

    -- 5. Redes (usa orden_numero)
    SELECT jsonb_build_object(
        'tipo_servicio', 'Redes',
        'folio', COALESCE(t.orden_numero::text, ''),
        'cliente_nombre', COALESCE(t.cliente_nombre, ''),
        'cliente_telefono', COALESCE(t.cliente_telefono, ''),
        'total', COALESCE(t.total, 0),
        'token', t.token
    )
    INTO result
    FROM public.servicios_redes t
    WHERE t.token = clean_token
    LIMIT 1;
    IF result IS NOT NULL THEN RETURN result; END IF;

    -- 6. Cercos Eléctricos (usa orden_numero)
    SELECT jsonb_build_object(
        'tipo_servicio', 'Cercos Electricos',
        'folio', COALESCE(t.orden_numero::text, ''),
        'cliente_nombre', COALESCE(t.cliente_nombre, ''),
        'cliente_telefono', COALESCE(t.cliente_telefono, ''),
        'total', COALESCE(t.total, 0),
        'token', t.token
    )
    INTO result
    FROM public.servicios_cercos_electricos t
    WHERE t.token = clean_token
    LIMIT 1;
    IF result IS NOT NULL THEN RETURN result; END IF;

    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_service_for_invoice_by_token(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.get_service_for_invoice_by_token(TEXT) TO anon, authenticated, service_role;
