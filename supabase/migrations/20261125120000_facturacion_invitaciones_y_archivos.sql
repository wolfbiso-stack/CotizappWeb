-- ==============================================================================
-- MIGRACIÓN: Invitaciones de Facturación + Archivos PDF/XML en Supabase Storage
-- ==============================================================================

-- 1. Tabla para registrar las invitaciones de facturación enviadas por WhatsApp
CREATE TABLE IF NOT EXISTS public.invitaciones_factura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tipo_servicio TEXT NOT NULL DEFAULT 'Servicio',
    servicio_table TEXT,
    servicio_id TEXT,
    servicio_folio TEXT,
    servicio_token TEXT,
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT,
    monto NUMERIC DEFAULT 0,
    enlace TEXT NOT NULL,
    mensaje TEXT,
    canal TEXT NOT NULL DEFAULT 'whatsapp',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invitaciones_factura_created_at ON public.invitaciones_factura(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitaciones_factura_user_id ON public.invitaciones_factura(user_id);
CREATE INDEX IF NOT EXISTS idx_invitaciones_factura_token ON public.invitaciones_factura(servicio_token);
CREATE INDEX IF NOT EXISTS idx_invitaciones_factura_folio ON public.invitaciones_factura(servicio_folio);

ALTER TABLE public.invitaciones_factura ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.invitaciones_factura FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitaciones_factura TO authenticated;
GRANT ALL ON public.invitaciones_factura TO service_role;

DROP POLICY IF EXISTS "Usuarios autenticados pueden consultar invitaciones" ON public.invitaciones_factura;
CREATE POLICY "Usuarios autenticados pueden consultar invitaciones"
    ON public.invitaciones_factura
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Usuarios autenticados pueden registrar invitaciones" ON public.invitaciones_factura;
CREATE POLICY "Usuarios autenticados pueden registrar invitaciones"
    ON public.invitaciones_factura
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL OR public.is_admin());

DROP POLICY IF EXISTS "Administradores o dueños pueden eliminar invitaciones" ON public.invitaciones_factura;
CREATE POLICY "Administradores o dueños pueden eliminar invitaciones"
    ON public.invitaciones_factura
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- 2. Columnas para almacenar rutas y nombres de archivos PDF y XML en solicitudes_factura
ALTER TABLE public.solicitudes_factura
    ADD COLUMN IF NOT EXISTS pdf_path TEXT,
    ADD COLUMN IF NOT EXISTS pdf_filename TEXT,
    ADD COLUMN IF NOT EXISTS xml_path TEXT,
    ADD COLUMN IF NOT EXISTS xml_filename TEXT,
    ADD COLUMN IF NOT EXISTS archivos_updated_at TIMESTAMPTZ;

-- 3. Bucket privado de Supabase Storage para PDF y XML de facturas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'facturas-archivos',
    'facturas-archivos',
    false,
    10485760,
    ARRAY['application/pdf', 'application/xml', 'text/xml']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para administradores autenticados en el bucket facturas-archivos
DROP POLICY IF EXISTS "Admins pueden ver archivos de facturas" ON storage.objects;
CREATE POLICY "Admins pueden ver archivos de facturas"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'facturas-archivos' AND public.is_admin());

DROP POLICY IF EXISTS "Admins pueden subir archivos de facturas" ON storage.objects;
CREATE POLICY "Admins pueden subir archivos de facturas"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'facturas-archivos' AND public.is_admin());

DROP POLICY IF EXISTS "Admins pueden actualizar archivos de facturas" ON storage.objects;
CREATE POLICY "Admins pueden actualizar archivos de facturas"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'facturas-archivos' AND public.is_admin())
    WITH CHECK (bucket_id = 'facturas-archivos' AND public.is_admin());

DROP POLICY IF EXISTS "Admins pueden eliminar archivos de facturas" ON storage.objects;
CREATE POLICY "Admins pueden eliminar archivos de facturas"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'facturas-archivos' AND public.is_admin());
