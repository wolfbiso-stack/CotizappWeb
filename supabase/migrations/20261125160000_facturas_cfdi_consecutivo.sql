-- ==============================================================================
-- MIGRACIÓN: Consecutivo interno Factura N° (F-YYYY-100, F-YYYY-101, ...)
-- ==============================================================================

ALTER TABLE public.facturas_cfdi
    ADD COLUMN IF NOT EXISTS factura_numero TEXT;

-- Backfill para facturas ya importadas ordenadas por fecha de importación
WITH numbered AS (
    SELECT
        id,
        'F-' || to_char(COALESCE(fecha_emision, imported_at, now()), 'YYYY') || '-' ||
        (99 + row_number() OVER (
            PARTITION BY to_char(COALESCE(fecha_emision, imported_at, now()), 'YYYY')
            ORDER BY imported_at ASC, id ASC
        ))::text AS gen_num
    FROM public.facturas_cfdi
    WHERE factura_numero IS NULL OR btrim(factura_numero) = ''
)
UPDATE public.facturas_cfdi f
SET factura_numero = n.gen_num
FROM numbered n
WHERE f.id = n.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_facturas_cfdi_factura_numero
    ON public.facturas_cfdi (factura_numero)
    WHERE factura_numero IS NOT NULL;

-- Trigger de respaldo: si un INSERT no envía factura_numero, asigna el siguiente F-YYYY-NNN (>= 100)
CREATE OR REPLACE FUNCTION public.assign_factura_cfdi_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    yr TEXT;
    prefix TEXT;
    max_num INTEGER;
BEGIN
    IF NEW.factura_numero IS NOT NULL AND btrim(NEW.factura_numero) <> '' THEN
        RETURN NEW;
    END IF;

    yr := to_char(COALESCE(NEW.fecha_emision, timezone('utc'::text, now())), 'YYYY');
    prefix := 'F-' || yr || '-';

    SELECT COALESCE(
        MAX(NULLIF(regexp_replace(factura_numero, '^F-[0-9]{4}-', ''), '')::INTEGER),
        99
    )
    INTO max_num
    FROM public.facturas_cfdi
    WHERE factura_numero LIKE prefix || '%'
      AND factura_numero ~ '^F-[0-9]{4}-[0-9]+$';

    NEW.factura_numero := prefix || GREATEST(max_num + 1, 100)::TEXT;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_factura_cfdi_numero ON public.facturas_cfdi;
CREATE TRIGGER trg_assign_factura_cfdi_numero
    BEFORE INSERT ON public.facturas_cfdi
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_factura_cfdi_numero();

COMMENT ON COLUMN public.facturas_cfdi.factura_numero IS 'Folio interno consecutivo por año en formato F-YYYY-100, F-YYYY-101, etc.';
