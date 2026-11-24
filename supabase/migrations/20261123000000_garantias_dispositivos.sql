-- ==============================================================================
-- MIGRACIÓN: REGISTRO DE DISPOSITIVOS PARA GARANTÍAS (CotizappWeb)
-- Ejecutar este script en el SQL Editor de tu panel de Supabase
-- ==============================================================================

-- 1. Crear tabla de garantías de dispositivos
CREATE TABLE IF NOT EXISTS public.garantias_dispositivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    servicio_id TEXT NOT NULL,
    tipo_servicio TEXT NOT NULL DEFAULT 'CCTV',
    servicio_numero TEXT,
    cliente_nombre TEXT,
    cliente_telefono TEXT,
    fecha_venta DATE NOT NULL DEFAULT CURRENT_DATE,
    nombre_producto TEXT NOT NULL,
    modelo TEXT,
    numero_serie TEXT NOT NULL,
    codigo_barras TEXT,
    qr_raw TEXT,
    notas TEXT,
    estado TEXT NOT NULL DEFAULT 'vigente',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.garantias_dispositivos ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de seguridad (cada usuario solo administra sus propias garantías)
DROP POLICY IF EXISTS "Users can view own device warranties" ON public.garantias_dispositivos;
CREATE POLICY "Users can view own device warranties"
    ON public.garantias_dispositivos
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own device warranties" ON public.garantias_dispositivos;
CREATE POLICY "Users can insert own device warranties"
    ON public.garantias_dispositivos
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own device warranties" ON public.garantias_dispositivos;
CREATE POLICY "Users can update own device warranties"
    ON public.garantias_dispositivos
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own device warranties" ON public.garantias_dispositivos;
CREATE POLICY "Users can delete own device warranties"
    ON public.garantias_dispositivos
    FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Índices para búsquedas rápidas por número de serie, código de barras, modelo y orden
CREATE INDEX IF NOT EXISTS idx_garantias_user_id
    ON public.garantias_dispositivos(user_id);

CREATE INDEX IF NOT EXISTS idx_garantias_servicio
    ON public.garantias_dispositivos(user_id, tipo_servicio, servicio_id);

CREATE INDEX IF NOT EXISTS idx_garantias_numero_serie
    ON public.garantias_dispositivos(user_id, lower(numero_serie));

CREATE INDEX IF NOT EXISTS idx_garantias_codigo_barras
    ON public.garantias_dispositivos(user_id, lower(codigo_barras));

CREATE INDEX IF NOT EXISTS idx_garantias_modelo
    ON public.garantias_dispositivos(user_id, lower(modelo));
