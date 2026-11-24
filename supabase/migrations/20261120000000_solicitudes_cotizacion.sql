-- ==============================================================================
-- MIGRACIÓN: MÓDULO DE SOLICITUDES DE COTIZACIÓN (Cotizapp Web)
-- ==============================================================================

-- 1. Secuencia para folios consecutivos generados en servidor
CREATE SEQUENCE IF NOT EXISTS public.solicitudes_cotizacion_folio_seq START WITH 1;

-- 2. Crear tabla solicitudes_cotizacion
CREATE TABLE IF NOT EXISTS public.solicitudes_cotizacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio TEXT NOT NULL DEFAULT '' UNIQUE,
    servicios JSONB NOT NULL DEFAULT '[]'::jsonb,
    tipo_inmueble TEXT NOT NULL,
    direccion TEXT NOT NULL,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    correo TEXT,
    nota TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT chk_solicitudes_cotizacion_estado
        CHECK (estado IN ('pendiente', 'contactado', 'cotizado', 'cancelado', 'completado'))
);

-- 3. Trigger para folio automático
CREATE OR REPLACE FUNCTION public.set_solicitud_cotizacion_folio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.folio IS NULL OR NEW.folio = '' THEN
        NEW.folio := 'COT-' || to_char(CURRENT_DATE, 'YYYYMM') || '-' || lpad(nextval('public.solicitudes_cotizacion_folio_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_solicitud_cotizacion_folio ON public.solicitudes_cotizacion;
CREATE TRIGGER trg_set_solicitud_cotizacion_folio
    BEFORE INSERT ON public.solicitudes_cotizacion
    FOR EACH ROW
    EXECUTE FUNCTION public.set_solicitud_cotizacion_folio();

-- 4. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_solicitud_cotizacion_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_solicitudes_cotizacion_updated_at ON public.solicitudes_cotizacion;
CREATE TRIGGER trg_solicitudes_cotizacion_updated_at
    BEFORE UPDATE ON public.solicitudes_cotizacion
    FOR EACH ROW
    EXECUTE FUNCTION public.set_solicitud_cotizacion_updated_at();

-- 5. Habilitar RLS
ALTER TABLE public.solicitudes_cotizacion ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de acceso: Los administradores pueden leer y actualizar
DROP POLICY IF EXISTS "Admins can view and update solicitudes_cotizacion" ON public.solicitudes_cotizacion;
CREATE POLICY "Admins can view and update solicitudes_cotizacion"
    ON public.solicitudes_cotizacion
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
