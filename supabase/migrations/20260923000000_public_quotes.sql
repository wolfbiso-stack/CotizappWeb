-- REVIEW BEFORE APPLYING. Based on the catalog supplied on 2026-09-23.
-- No production execution is performed by this repository.
begin;

-- Refuse incompatible source types rather than silently adapting production data.
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='cotizaciones' and column_name='id' and data_type='integer')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='cotizaciones' and column_name='articulos' and data_type='jsonb')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='cotizaciones' and column_name='user_id' and data_type='uuid')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='cotizaciones' and column_name='fecha_vencimiento' and data_type='text')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='configuracion_empresa' and column_name='nombre' and data_type='text') then
    raise exception 'SOURCE_SCHEMA_MISMATCH';
  end if;
end $$;

create schema quote_private;
revoke all on schema quote_private from public, anon, authenticated;

create table quote_private.publications (
  id uuid primary key default gen_random_uuid(),
  -- Deliberately no cascading FK: deleting a mutable draft must not delete evidence.
  quote_id integer not null,
  owner_id uuid not null,
  request_id uuid not null,
  version integer not null check (version > 0),
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  source_updated_at timestamptz,
  published_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  timezone text not null,
  revoked_at timestamptz,
  decision text check (decision in ('aceptada', 'rechazada')),
  responded_at timestamptz,
  comment text check (char_length(comment) <= 2000),
  unique (quote_id, version),
  unique (owner_id, request_id),
  check (expires_at > published_at),
  check ((decision is null and responded_at is null and comment is null)
      or (decision is not null and responded_at is not null))
);
create index publications_owner_quote on quote_private.publications(owner_id, quote_id);
alter table quote_private.publications enable row level security;
-- No public policies: all access is through the narrowly scoped functions below.
revoke all on all tables in schema quote_private from public, anon, authenticated;
alter default privileges in schema quote_private revoke execute on functions from public;

create function quote_private.protect_publication() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_PUBLICATION'; end if;
  if (to_jsonb(new) - array['decision','responded_at','comment','revoked_at'])
     is distinct from (to_jsonb(old) - array['decision','responded_at','comment','revoked_at']) then
    raise exception 'IMMUTABLE_PUBLICATION';
  end if;
  if old.revoked_at is not null and new is distinct from old then raise exception 'REVOKED_PUBLICATION'; end if;
  if old.decision is not null and row(new.decision,new.responded_at,new.comment)
      is distinct from row(old.decision,old.responded_at,old.comment) then raise exception 'IMMUTABLE_RESPONSE'; end if;
  if old.decision is null and new.decision is not null and
      (old.revoked_at is not null or old.expires_at <= clock_timestamp()) then raise exception 'CLOSED_PUBLICATION'; end if;
  return new;
end $$;
create trigger protect_publication before update or delete on quote_private.publications
for each row execute function quote_private.protect_publication();

create function quote_private.parse_date(value text) returns date
language plpgsql set search_path = '' as $$
declare result date; pattern text;
begin
  if value is null or btrim(value) = '' then return null; end if;
  pattern := case when value ~ '^\d{2}/\d{2}/\d{4}$' then 'DD/MM/YYYY'
                  when value ~ '^\d{4}-\d{2}-\d{2}$' then 'YYYY-MM-DD' else null end;
  if pattern is null then raise exception 'INVALID_SOURCE_DATE'; end if;
  result := to_date(value, pattern);
  if to_char(result, pattern) <> value then raise exception 'INVALID_SOURCE_DATE'; end if;
  return result;
end $$;

create function quote_private.public_result(p quote_private.publications) returns jsonb
language plpgsql set search_path = '' as $$
declare state text;
begin
  if p.id is null then return jsonb_build_object('status','invalid'); end if;
  if p.revoked_at is not null then return jsonb_build_object('status','revoked'); end if;
  state := case when p.decision is not null then 'answered'
                when p.expires_at <= clock_timestamp() then 'expired' else 'pending' end;
  return jsonb_build_object('status',state,'version',p.version,'expires_at',p.expires_at,
    'quote',p.snapshot,'response',case when p.decision is null then null else
      jsonb_build_object('decision',case p.decision when 'aceptada' then 'approved' else 'rejected' end,
        'responded_at',p.responded_at,'comment',p.comment) end);
end $$;

create function public.publish_quote(
  p_quote_id integer, p_expected_updated_at timestamptz, p_request_id uuid,
  p_currency text, p_timezone text, p_expires_at timestamptz
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  q public.cotizaciones%rowtype;
  company public.configuracion_empresa%rowtype;
  existing quote_private.publications%rowtype;
  publication quote_private.publications%rowtype;
  actor uuid := auth.uid();
  raw_token text;
  items jsonb := '[]'::jsonb;
  item jsonb;
  discount numeric;
  quantity numeric;
  price numeric;
  line_total numeric;
  subtotal numeric := 0;
  percentage numeric;
  adjustment numeric;
  expiry_date date;
  expiry timestamptz;
  next_version integer;
  snapshot jsonb;
begin
  if actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if p_request_id is null or p_currency is null or p_currency !~ '^[A-Z]{3}$'
     or p_timezone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then
    raise exception 'INVALID_PUBLICATION_PARAMETERS';
  end if;
  -- Serializes version allocation and snapshot creation against Android updates.
  select * into q from public.cotizaciones where id=p_quote_id and user_id=actor for update;
  if not found then raise exception 'QUOTE_NOT_FOUND' using errcode='42501'; end if;
  select * into existing from quote_private.publications where owner_id=actor and request_id=p_request_id;
  if found then
    if existing.quote_id <> p_quote_id then raise exception 'REQUEST_ID_CONFLICT'; end if;
    return jsonb_build_object('status','already_published','publication_id',existing.id,
      'version',existing.version,'expires_at',existing.expires_at,'token',null,'path',null);
  end if;
  if q.updated_at is distinct from p_expected_updated_at then raise exception 'SOURCE_CHANGED'; end if;
  select * into company from public.configuracion_empresa where user_id=actor for share;
  if not found or nullif(btrim(company.nombre),'') is null then raise exception 'COMPANY_REQUIRED'; end if;
  if nullif(btrim(q.folio),'') is null or nullif(btrim(q.nombre_cliente),'') is null then raise exception 'INCOMPLETE_QUOTE'; end if;
  if quote_private.parse_date(q.fecha) is null then raise exception 'INVALID_SOURCE_DATE'; end if;
  expiry_date := quote_private.parse_date(q.fecha_vencimiento);
  if expiry_date is not null then
    -- Exclusive boundary: start of the next local day (handles daylight saving time).
    expiry := (expiry_date + 1)::timestamp at time zone p_timezone;
    if p_expires_at is not null then
      if p_expires_at > expiry then raise exception 'EXPIRY_EXCEEDS_SOURCE'; end if;
      expiry := p_expires_at;
    end if;
  else expiry := p_expires_at;
  end if;
  if expiry is null or not isfinite(expiry) or expiry <= clock_timestamp() then raise exception 'INVALID_EXPIRY'; end if;
  if q.total::text in ('NaN','Infinity','-Infinity') or q.total < 0 then raise exception 'INVALID_TOTAL'; end if;
  if jsonb_typeof(q.articulos) is distinct from 'array' then raise exception 'INVALID_ITEMS'; end if;
  if jsonb_array_length(q.articulos) < 1 or jsonb_array_length(q.articulos) > 1000 then raise exception 'INVALID_ITEMS'; end if;
  for item in select value from jsonb_array_elements(q.articulos) loop
    if jsonb_typeof(item->'articulo') is distinct from 'string' or nullif(btrim(item->>'articulo'),'') is null
       or jsonb_typeof(item->'cantidad') is distinct from 'number'
       or jsonb_typeof(item->'precioUnitario') is distinct from 'number'
       or jsonb_typeof(item->'total') is distinct from 'number' then raise exception 'INVALID_ITEM'; end if;
    quantity := (item->>'cantidad')::numeric; price := (item->>'precioUnitario')::numeric; line_total := (item->>'total')::numeric;
    if quantity < 0 or price < 0 or line_total < 0 or greatest(quantity,price,line_total) > 1e15 then raise exception 'INVALID_ITEM'; end if;
    if item->>'ajusteTipo' is not null and item->>'ajusteTipo' <> 'descuento' then raise exception 'UNSUPPORTED_ITEM_ADJUSTMENT'; end if;
    if coalesce((item->>'impuesto')::numeric,0) <> 0 then raise exception 'UNSUPPORTED_LEGACY_ITEM_TAX'; end if;
    if item->>'ajustePorcentaje' is not null and item->>'ajusteTipo' is distinct from 'descuento' then raise exception 'INVALID_ITEM_ADJUSTMENT'; end if;
    discount := coalesce((item->>'ajustePorcentaje')::numeric,(item->>'descuento')::numeric,0);
    if discount < 0 or discount > 100 or discount::text in ('NaN','Infinity','-Infinity') then raise exception 'INVALID_DISCOUNT'; end if;
    if item->>'ajustePorcentaje' is not null and item->>'descuento' is not null
       and (item->>'ajustePorcentaje')::numeric <> (item->>'descuento')::numeric then raise exception 'AMBIGUOUS_DISCOUNT'; end if;
    if abs(line_total - quantity*price*(1-discount/100)) > 0.01 then raise exception 'ITEM_TOTAL_MISMATCH'; end if;
    -- Explicit allowlist. Never include costoEmpresa, costoUnitario or future private fields.
    items := items || jsonb_build_array(jsonb_build_object('articulo',item->>'articulo',
      'cantidad',quantity,'precioUnitario',price,'total',line_total,'descuento',discount));
    subtotal := subtotal + line_total;
  end loop;
  percentage := coalesce(q.ajuste_porcentaje,0)::numeric;
  if percentage::text in ('NaN','Infinity','-Infinity') then raise exception 'INVALID_ADJUSTMENT'; end if;
  if percentage <> 0 and coalesce(q.ajuste_tipo,'') not in ('impuesto','descuento') then raise exception 'UNSUPPORTED_GLOBAL_ADJUSTMENT'; end if;
  adjustment := q.total::numeric - subtotal;
  if abs(adjustment - subtotal * abs(percentage) / 100 * case when q.ajuste_tipo='descuento' then -1 else 1 end) > 0.01 then
    raise exception 'TOTAL_MISMATCH';
  end if;
  snapshot := jsonb_build_object(
    'empresa',jsonb_build_object('nombre_empresa',company.nombre,'direccion',company.direccion,
      'telefono',company.telefono,'correo',company.correo,'rfc',company.rfc),
    'folio',q.folio,'fecha',q.fecha,'nombre_cliente',q.nombre_cliente,'moneda',p_currency,
    'articulos',items,'subtotal',subtotal,'total',q.total,'terminos',q.terminos,
    'ajuste',case when percentage=0 then null else jsonb_build_object('nombre',coalesce(nullif(q.ajuste_nombre,''),q.ajuste_tipo),
      'tipo',q.ajuste_tipo,'porcentaje',abs(percentage),'importe',adjustment) end);
  if octet_length(snapshot::text) > 1048576 then raise exception 'QUOTE_TOO_LARGE'; end if;
  select coalesce(max(version),0)+1 into next_version from quote_private.publications where quote_id=q.id;
  -- Two independent cryptographic UUIDv4 values provide 244 random bits.
  -- SHA-256 gives a uniform 64-character URL token without requiring pgcrypto installation.
  raw_token := encode(sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text,'UTF8')),'hex');
  insert into quote_private.publications(quote_id,owner_id,request_id,version,token_hash,snapshot,source_updated_at,expires_at,timezone)
    values(q.id,actor,p_request_id,next_version,sha256(convert_to(raw_token,'UTF8')),snapshot,q.updated_at,expiry,p_timezone)
    returning * into publication;
  return jsonb_build_object('status','published','publication_id',publication.id,'version',publication.version,
    'expires_at',expiry,'token',raw_token,'path','/cotizacion/' || raw_token);
end $$;

create function public.get_public_quote(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p quote_private.publications%rowtype;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return jsonb_build_object('status','invalid'); end if;
  select * into p from quote_private.publications where token_hash=sha256(convert_to(p_token,'UTF8'));
  return quote_private.public_result(p);
end $$;

create function public.respond_public_quote(p_token text, p_version integer, p_decision text, p_comment text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p quote_private.publications%rowtype;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return jsonb_build_object('status','invalid'); end if;
  if p_decision is null or p_decision not in ('approved','rejected') or p_version is null or p_version < 1
     or char_length(p_comment) > 2000 then raise exception 'INVALID_RESPONSE'; end if;
  select * into p from quote_private.publications where token_hash=sha256(convert_to(p_token,'UTF8')) for update;
  if not found then return jsonb_build_object('status','invalid'); end if;
  if p.version <> p_version then raise exception 'VERSION_MISMATCH'; end if;
  -- clock_timestamp() is evaluated AFTER acquiring the row lock.
  if p.revoked_at is not null or p.decision is not null or p.expires_at <= clock_timestamp() then
    return quote_private.public_result(p);
  end if;
  update quote_private.publications set decision=case p_decision when 'approved' then 'aceptada' else 'rechazada' end,
    responded_at=clock_timestamp(), comment=nullif(btrim(p_comment),'') where id=p.id returning * into p;
  return quote_private.public_result(p);
end $$;

create function public.list_quote_publications(p_quote_id integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('publication_id',id,'version',version,
    'published_at',published_at,'expires_at',expires_at,'revoked_at',revoked_at,
    'estado',coalesce(decision,'pendiente'),'responded_at',responded_at,'comment',comment) order by version desc)
    from quote_private.publications where quote_id=p_quote_id and owner_id=auth.uid()),'[]'::jsonb);
end $$;

create function public.revoke_quote_publication(p_publication_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p quote_private.publications%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  select * into p from quote_private.publications where id=p_publication_id and owner_id=auth.uid() for update;
  if not found then raise exception 'PUBLICATION_NOT_FOUND' using errcode='42501'; end if;
  if p.revoked_at is null then
    update quote_private.publications set revoked_at=clock_timestamp() where id=p.id returning * into p;
  end if;
  return jsonb_build_object('publication_id',p.id,'revoked_at',p.revoked_at);
end $$;

revoke all on all functions in schema quote_private from public, anon, authenticated;
revoke all on function public.publish_quote(integer,timestamptz,uuid,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.get_public_quote(text) from public,anon,authenticated;
revoke all on function public.respond_public_quote(text,integer,text,text) from public,anon,authenticated;
revoke all on function public.list_quote_publications(integer) from public,anon,authenticated;
revoke all on function public.revoke_quote_publication(uuid) from public,anon,authenticated;
grant execute on function public.publish_quote(integer,timestamptz,uuid,text,text,timestamptz) to authenticated;
grant execute on function public.list_quote_publications(integer) to authenticated;
grant execute on function public.revoke_quote_publication(uuid) to authenticated;
grant execute on function public.get_public_quote(text) to anon,authenticated;
grant execute on function public.respond_public_quote(text,integer,text,text) to anon,authenticated;

-- Existing RLS remains in place for Android. Remove unnecessary anonymous privileges.
-- TRUNCATE is not filtered by RLS, so also remove it (and DDL-like privileges) from authenticated.
revoke all on public.cotizaciones, public.configuracion_empresa from anon;
revoke truncate, references, trigger on public.cotizaciones, public.configuracion_empresa from authenticated;
notify pgrst, 'reload schema';
commit;
