-- ==============================================================================
-- MIGRACIÓN: Bandera `invitacion` y `servicio_token` en solicitudes_factura
-- ==============================================================================

ALTER TABLE public.solicitudes_factura
    ADD COLUMN IF NOT EXISTS invitacion BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS servicio_token TEXT;

CREATE INDEX IF NOT EXISTS idx_solicitudes_factura_invitacion ON public.solicitudes_factura(invitacion);
CREATE INDEX IF NOT EXISTS idx_solicitudes_factura_servicio_token ON public.solicitudes_factura(servicio_token);

COMMENT ON COLUMN public.solicitudes_factura.invitacion IS 'TRUE cuando la solicitud fue enviada desde un enlace de invitación de servicio (/facturacion/solicitud/:token); FALSE cuando fue manual desde /facturacion.';
COMMENT ON COLUMN public.solicitudes_factura.servicio_token IS 'Token del servicio vinculado cuando la solicitud proviene de una invitación.';
