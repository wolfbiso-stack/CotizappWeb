-- ==============================================================================
-- MIGRACIÓN: MÓDULO DE SOLICITUDES DE FACTURACIÓN (Cotizapp Web)
-- ==============================================================================

-- 1. Control de Roles Administrativos en public.profiles
-- Agrega columna 'role' si no existe, respetando la estructura de profiles existente.
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
  CHECK (role IN ('admin', 'staff', 'user'));

-- Función helper para verificar si el usuario autenticado tiene rol 'admin'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 2. Secuencia para folios consecutivos generados en servidor
CREATE SEQUENCE IF NOT EXISTS public.solicitudes_factura_folio_seq START WITH 1;

-- 3. Crear tabla solicitudes_factura
CREATE TABLE IF NOT EXISTS public.solicitudes_factura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio TEXT NOT NULL DEFAULT '' UNIQUE,
    rfc VARCHAR(13) NOT NULL,
    razon_social TEXT NOT NULL,
    codigo_postal VARCHAR(5) NOT NULL,
    regimen_fiscal VARCHAR(3) NOT NULL,
    uso_cfdi VARCHAR(4) NOT NULL,
    correo TEXT,
    observaciones TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    email_status TEXT NOT NULL DEFAULT 'pendiente',
    email_sent_at TIMESTAMPTZ,
    factura_uuid TEXT,
    factura_fecha TIMESTAMPTZ,
    factura_observaciones TEXT,
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Restricciones de integridad (Check Constraints)
    CONSTRAINT chk_solicitudes_factura_estado
        CHECK (estado IN ('pendiente', 'en_revision', 'facturada', 'cancelada')),
    CONSTRAINT chk_solicitudes_factura_email_status
        CHECK (email_status IN ('pendiente', 'enviado', 'error')),
    -- RFC: Persona Moral (3 letras) o Persona Física (4 letras) + 6 dígitos fecha + 3 caracteres homoclave alfanumérica
    CONSTRAINT chk_solicitudes_factura_rfc
        CHECK (rfc ~* '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$'),
    -- Código Postal: exactamente 5 dígitos
    CONSTRAINT chk_solicitudes_factura_cp
        CHECK (codigo_postal ~ '^[0-9]{5}$'),
    -- Catálogo oficial SAT CFDI 4.0: Regímenes Fiscales
    CONSTRAINT chk_solicitudes_factura_regimen
        CHECK (regimen_fiscal IN ('601','603','605','606','607','608','610','611','612','614','615','616','620','621','622','623','624','625','626')),
    -- Catálogo oficial SAT CFDI 4.0: Usos de CFDI
    CONSTRAINT chk_solicitudes_factura_uso_cfdi
        CHECK (uso_cfdi IN ('G01','G02','G03','I01','I02','I03','I04','I05','I06','I07','I08','D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','S01','CP01','CN01'))
);

-- 4. Trigger de generación obligatoria de Folio en el servidor (Inmune a manipulación del cliente)
CREATE OR REPLACE FUNCTION public.set_solicitud_factura_folio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Siempre genera el folio consecutivo seguro en formato FAC-YYYY-00001 en el servidor
    NEW.folio := 'FAC-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('public.solicitudes_factura_folio_seq')::text, 5, '0');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_solicitud_factura_folio ON public.solicitudes_factura;
CREATE TRIGGER trg_set_solicitud_factura_folio
    BEFORE INSERT ON public.solicitudes_factura
    FOR EACH ROW
    EXECUTE FUNCTION public.set_solicitud_factura_folio();

-- 5. Trigger para actualizar el campo updated_at
CREATE OR REPLACE FUNCTION public.set_solicitud_factura_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_solicitudes_factura_updated_at ON public.solicitudes_factura;
CREATE TRIGGER trg_solicitudes_factura_updated_at
    BEFORE UPDATE ON public.solicitudes_factura
    FOR EACH ROW
    EXECUTE FUNCTION public.set_solicitud_factura_updated_at();

-- 6. Trigger para auditoría de procesamiento (processed_at y processed_by)
CREATE OR REPLACE FUNCTION public.track_solicitud_factura_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.estado IN ('facturada', 'cancelada', 'en_revision') AND (OLD.estado = 'pendiente' OR OLD.estado IS NULL) THEN
        IF NEW.processed_at IS NULL THEN
            NEW.processed_at := timezone('utc'::text, now());
        END IF;
        IF NEW.processed_by IS NULL THEN
            NEW.processed_by := auth.uid();
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_solicitud_factura_processing ON public.solicitudes_factura;
CREATE TRIGGER trg_track_solicitud_factura_processing
    BEFORE UPDATE ON public.solicitudes_factura
    FOR EACH ROW
    EXECUTE FUNCTION public.track_solicitud_factura_processing();

-- 7. Índices de rendimiento
CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitudes_factura_folio ON public.solicitudes_factura(folio);
CREATE INDEX IF NOT EXISTS idx_solicitudes_factura_rfc ON public.solicitudes_factura(rfc);
CREATE INDEX IF NOT EXISTS idx_solicitudes_factura_estado ON public.solicitudes_factura(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_factura_email_status ON public.solicitudes_factura(email_status);
CREATE INDEX IF NOT EXISTS idx_solicitudes_factura_created_at ON public.solicitudes_factura(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_solicitudes_factura_processed_by ON public.solicitudes_factura(processed_by);

-- 8. Seguridad y Row Level Security (RLS)
ALTER TABLE public.solicitudes_factura ENABLE ROW LEVEL SECURITY;

-- Revocar permisos públicos y anónimos directos sobre la tabla
REVOKE ALL ON public.solicitudes_factura FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitudes_factura TO authenticated;
GRANT ALL ON public.solicitudes_factura TO service_role;

-- POLÍTICAS RLS:
-- 1) Los usuarios anónimos NO tienen permiso ni de lectura ni de escritura directa (todo entra por la Edge Function).
-- 2) Los usuarios autenticados SOLO pueden consultar si su perfil tiene rol 'admin'.
DROP POLICY IF EXISTS "Solo administradores pueden consultar solicitudes" ON public.solicitudes_factura;
CREATE POLICY "Solo administradores pueden consultar solicitudes"
    ON public.solicitudes_factura
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- 3) Solo administradores pueden actualizar solicitudes (cambiar estado, añadir UUID fiscal, etc.)
DROP POLICY IF EXISTS "Solo administradores pueden actualizar solicitudes" ON public.solicitudes_factura;
CREATE POLICY "Solo administradores pueden actualizar solicitudes"
    ON public.solicitudes_factura
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 4) Solo administradores pueden eliminar solicitudes
DROP POLICY IF EXISTS "Solo administradores pueden eliminar solicitudes" ON public.solicitudes_factura;
CREATE POLICY "Solo administradores pueden eliminar solicitudes"
    ON public.solicitudes_factura
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Comentarios explicativos
COMMENT ON TABLE public.solicitudes_factura IS 'Registro de solicitudes de facturación recibidas vía portal público o Edge Function.';
COMMENT ON COLUMN public.solicitudes_factura.folio IS 'Identificador consecutivo generado en servidor con formato FAC-YYYY-00001.';
COMMENT ON COLUMN public.solicitudes_factura.processed_by IS 'Usuario administrador que atendió o cambió el estado de la solicitud.';
