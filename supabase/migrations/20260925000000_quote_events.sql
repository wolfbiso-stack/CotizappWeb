begin;

create table if not exists public.cotizacion_eventos (
    id uuid primary key default gen_random_uuid(),
    cotizacion_id integer not null references public.cotizaciones(id) on delete cascade,
    session_id uuid not null,
    evento text not null check (evento in (
        'quote_viewed', 'quote_closed', 'pdf_downloaded',
        'whatsapp_clicked', 'approve_clicked', 'approved',
        'reject_clicked', 'rejected', 'comment_submitted'
    )),
    fecha timestamptz not null default clock_timestamp(),
    duracion_segundos integer check (duracion_segundos is null or duracion_segundos >= 0),
    dispositivo text check (dispositivo in ('mobile', 'tablet', 'desktop', 'unknown')),
    metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_cotizacion_eventos_cotizacion_id on public.cotizacion_eventos(cotizacion_id);
create index if not exists idx_cotizacion_eventos_fecha on public.cotizacion_eventos(fecha desc);
create index if not exists idx_cotizacion_eventos_evento on public.cotizacion_eventos(evento);
create index if not exists idx_cotizacion_eventos_session_id on public.cotizacion_eventos(session_id);

alter table public.cotizacion_eventos enable row level security;
revoke all on public.cotizacion_eventos from public, anon, authenticated;

-- Solamente lectura para el propietario de la cotización
create policy "Propietario puede ver eventos"
    on public.cotizacion_eventos for select
    using ( exists (select 1 from public.cotizaciones c where c.id = cotizacion_id and c.user_id = auth.uid()) );

create or replace function public.registrar_evento_cotizacion_publica(
  p_token text,
  p_session_id uuid,
  p_evento text,
  p_duracion_segundos integer default null,
  p_dispositivo text default 'unknown',
  p_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_quote_id integer;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return; end if;
  if p_session_id is null then return; end if;
  if p_evento not in ('quote_viewed', 'quote_closed', 'pdf_downloaded', 'whatsapp_clicked', 'approve_clicked', 'approved', 'reject_clicked', 'rejected', 'comment_submitted') then return; end if;
  if p_dispositivo not in ('mobile', 'tablet', 'desktop', 'unknown') then p_dispositivo := 'unknown'; end if;
  if p_duracion_segundos is not null and p_duracion_segundos < 0 then p_duracion_segundos := 0; end if;
  if p_metadata is not null and octet_length(p_metadata::text) > 1024 then p_metadata := '{}'::jsonb; end if;

  select quote_id into v_quote_id from quote_private.publications
    where token_hash=sha256(convert_to(p_token,'UTF8')) and revoked_at is null;
    
  if v_quote_id is null then return; end if;

  insert into public.cotizacion_eventos(cotizacion_id, session_id, evento, duracion_segundos, dispositivo, metadata)
    values(v_quote_id, p_session_id, p_evento, p_duracion_segundos, p_dispositivo, p_metadata);
exception when others then
  return; -- Silently fail for tracking
end $$;

revoke all on function public.registrar_evento_cotizacion_publica(text,uuid,text,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.registrar_evento_cotizacion_publica(text,uuid,text,integer,text,jsonb) to anon,authenticated;

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

notify pgrst,'reload schema';
commit;
