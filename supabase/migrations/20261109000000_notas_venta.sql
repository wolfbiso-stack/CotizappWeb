-- ==============================================================================
-- MIGRACIÓN PARA MÓDULO DE NOTAS DE VENTA (CotizappWeb)
-- Ejecutar este script en el SQL Editor de tu panel de Supabase
-- ==============================================================================

-- 1. Crear tabla de notas de venta
CREATE TABLE IF NOT EXISTS public.notas_venta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folio TEXT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT,
    cliente_correo TEXT,
    cliente_direccion TEXT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tiene_iva BOOLEAN NOT NULL DEFAULT false,
    iva_porcentaje NUMERIC(5, 2) NOT NULL DEFAULT 16.00,
    iva_monto NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    metodo_pago TEXT DEFAULT 'Efectivo',
    notas TEXT,
    articulos JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.notas_venta ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas de seguridad para que cada usuario solo administre sus propias notas
DROP POLICY IF EXISTS "Users can view own sales notes" ON public.notas_venta;
CREATE POLICY "Users can view own sales notes"
    ON public.notas_venta
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sales notes" ON public.notas_venta;
CREATE POLICY "Users can insert own sales notes"
    ON public.notas_venta
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sales notes" ON public.notas_venta;
CREATE POLICY "Users can update own sales notes"
    ON public.notas_venta
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sales notes" ON public.notas_venta;
CREATE POLICY "Users can delete own sales notes"
    ON public.notas_venta
    FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Crear índices para búsquedas y ordenamiento eficiente
CREATE INDEX IF NOT EXISTS idx_notas_venta_user_id ON public.notas_venta(user_id);
CREATE INDEX IF NOT EXISTS idx_notas_venta_fecha ON public.notas_venta(user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_notas_venta_folio ON public.notas_venta(user_id, folio);

