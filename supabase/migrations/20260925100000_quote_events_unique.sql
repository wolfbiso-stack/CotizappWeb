begin;

-- Create partial unique indexes to prevent duplicate events per session
-- This ensures that events conceptually meant to be unique per session (viewed, closed)
-- cannot be duplicated accidentally by network retries or browser quirks.

-- 1. Deduplicate existing data first
delete from public.cotizacion_eventos a
using public.cotizacion_eventos b
where a.cotizacion_id = b.cotizacion_id
  and a.session_id = b.session_id
  and a.evento = b.evento
  and a.evento in ('quote_viewed', 'quote_closed')
  and a.id < b.id;

create unique index if not exists idx_cotizacion_eventos_unique_viewed 
    on public.cotizacion_eventos(cotizacion_id, session_id, evento) 
    where evento = 'quote_viewed';

create unique index if not exists idx_cotizacion_eventos_unique_closed 
    on public.cotizacion_eventos(cotizacion_id, session_id, evento) 
    where evento = 'quote_closed';

commit;
