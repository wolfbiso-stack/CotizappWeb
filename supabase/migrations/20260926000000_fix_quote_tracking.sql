begin;

-- 1. Create or replace check_quote_admin function
create or replace function public.check_quote_admin(p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return false; end if;
  if auth.uid() is null then return false; end if;
  
  select owner_id into v_owner from quote_private.publications 
    where token_hash=sha256(convert_to(p_token,'UTF8')) and revoked_at is null;
    
  return v_owner = auth.uid();
end $$;

revoke all on function public.check_quote_admin(text) from public,anon,authenticated;
grant execute on function public.check_quote_admin(text) to authenticated;


-- 2. Deduplicate existing data to prepare for unique indexes
delete from public.cotizacion_eventos a
using public.cotizacion_eventos b
where a.cotizacion_id = b.cotizacion_id
  and a.session_id = b.session_id
  and a.evento = b.evento
  and a.evento in ('quote_viewed', 'quote_closed')
  and a.id < b.id;


-- 3. Create partial unique indexes to prevent duplicate events per session
-- This ensures that events conceptually meant to be unique per session (viewed, closed)
-- cannot be duplicated accidentally by network retries or browser quirks.
create unique index if not exists idx_cotizacion_eventos_unique_viewed 
    on public.cotizacion_eventos(cotizacion_id, session_id, evento) 
    where evento = 'quote_viewed';

create unique index if not exists idx_cotizacion_eventos_unique_closed 
    on public.cotizacion_eventos(cotizacion_id, session_id, evento) 
    where evento = 'quote_closed';

-- Reload schema cache to make check_quote_admin visible immediately
notify pgrst,'reload schema';

commit;
