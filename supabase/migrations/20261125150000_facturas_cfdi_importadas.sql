-- ==============================================================================
-- MIGRACIÓN: Módulo de Facturas CFDI Importadas y Representaciones Impresas PDF
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.facturas_cfdi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid TEXT NOT NULL UNIQUE,
    version TEXT NOT NULL DEFAULT '4.0',
    serie TEXT,
    folio TEXT,
    tipo_comprobante TEXT NOT NULL,
    fecha_emision TIMESTAMPTZ NOT NULL,
    fecha_timbrado TIMESTAMPTZ,

    -- Emisor
    rfc_emisor VARCHAR(13) NOT NULL,
    nombre_emisor TEXT NOT NULL,
    regimen_emisor TEXT,

    -- Receptor
    rfc_receptor VARCHAR(13) NOT NULL,
    nombre_receptor TEXT NOT NULL,
    regimen_receptor TEXT,
    uso_cfdi TEXT,
    cp_receptor TEXT,

    -- Importes declarados exactamente en el XML
    subtotal NUMERIC(18,6) NOT NULL DEFAULT 0,
    descuento NUMERIC(18,6) NOT NULL DEFAULT 0,
    total_impuestos_trasladados NUMERIC(18,6) NOT NULL DEFAULT 0,
    total_impuestos_retenidos NUMERIC(18,6) NOT NULL DEFAULT 0,
    total NUMERIC(18,6) NOT NULL DEFAULT 0,
    moneda VARCHAR(5) NOT NULL DEFAULT 'MXN',
    tipo_cambio NUMERIC(18,6),
    metodo_pago TEXT,
    forma_pago TEXT,
    lugar_expedicion TEXT,

    -- Almacenamiento privado (bucket facturas-archivos)
    xml_path TEXT NOT NULL,
    xml_filename TEXT NOT NULL,
    xml_sha256 TEXT,
    pdf_path TEXT,
    pdf_filename TEXT,
    pdf_version INTEGER NOT NULL DEFAULT 1,
    pdf_regenerated_at TIMESTAMPTZ,
    pdf_history JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Snapshot normalizado del XML para consulta rápida
    datos_normalizados JSONB NOT NULL DEFAULT '{}'::jsonb,
    estado TEXT NOT NULL DEFAULT 'vigente',

    -- Relaciones opcionales con registros existentes de Cotizapp
    solicitud_id UUID REFERENCES public.solicitudes_factura(id) ON DELETE SET NULL,
    cliente_id TEXT,
    cliente_nombre_asociado TEXT,
    cotizacion_id TEXT,
    cotizacion_folio_asociado TEXT,
    servicio_table TEXT,
    servicio_id TEXT,
    servicio_folio_asociado TEXT,

    -- Auditoría
    imported_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT chk_facturas_cfdi_tipo
        CHECK (tipo_comprobante IN ('I', 'E', 'P', 'T', 'N')),
    CONSTRAINT chk_facturas_cfdi_estado
        CHECK (estado IN ('vigente', 'cancelada')),
    CONSTRAINT chk_facturas_cfdi_uuid_format
        CHECK (uuid ~* '^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_facturas_cfdi_uuid_upper ON public.facturas_cfdi (UPPER(uuid));
CREATE INDEX IF NOT EXISTS idx_facturas_cfdi_fecha_emision ON public.facturas_cfdi (fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_facturas_cfdi_rfc_receptor ON public.facturas_cfdi (rfc_receptor);
CREATE INDEX IF NOT EXISTS idx_facturas_cfdi_tipo ON public.facturas_cfdi (tipo_comprobante);
CREATE INDEX IF NOT EXISTS idx_facturas_cfdi_solicitud ON public.facturas_cfdi (solicitud_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cfdi_cliente ON public.facturas_cfdi (cliente_id);

CREATE OR REPLACE FUNCTION public.set_facturas_cfdi_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_facturas_cfdi_updated_at ON public.facturas_cfdi;
CREATE TRIGGER trg_facturas_cfdi_updated_at
    BEFORE UPDATE ON public.facturas_cfdi
    FOR EACH ROW
    EXECUTE FUNCTION public.set_facturas_cfdi_updated_at();

ALTER TABLE public.facturas_cfdi ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.facturas_cfdi FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facturas_cfdi TO authenticated;
GRANT ALL ON public.facturas_cfdi TO service_role;

DROP POLICY IF EXISTS "Solo administradores pueden consultar facturas CFDI" ON public.facturas_cfdi;
CREATE POLICY "Solo administradores pueden consultar facturas CFDI"
    ON public.facturas_cfdi
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Solo administradores pueden insertar facturas CFDI" ON public.facturas_cfdi;
CREATE POLICY "Solo administradores pueden insertar facturas CFDI"
    ON public.facturas_cfdi
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Solo administradores pueden actualizar facturas CFDI" ON public.facturas_cfdi;
CREATE POLICY "Solo administradores pueden actualizar facturas CFDI"
    ON public.facturas_cfdi
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Solo administradores pueden eliminar facturas CFDI" ON public.facturas_cfdi;
CREATE POLICY "Solo administradores pueden eliminar facturas CFDI"
    ON public.facturas_cfdi
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

COMMENT ON TABLE public.facturas_cfdi IS 'Registro de CFDI importados desde XML timbrados y sus representaciones impresas PDF corporativas.';
