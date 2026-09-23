-- Isolated test database only: reconstructed from the catalog supplied by the owner.
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create table public.configuracion_empresa (
 id integer not null default 1, logo_uri text, nombre text default '', direccion text default '',
 telefono text default '', correo text default '', rfc text default '', pagina_web text default '',
 user_id uuid not null, created_at timestamptz default now(), updated_at timestamptz default now(),
 primary key(id,user_id), unique(user_id)
);
create table public.cotizaciones (
 id serial primary key, folio text default '', nombre_cliente text not null, telefono text not null,
 empresa text not null, correo text not null, fecha text not null, fecha_vencimiento text,
 ajuste_nombre text, ajuste_porcentaje double precision, ajuste_tipo text, total double precision not null,
 terminos text default '', user_id uuid, created_at timestamptz default now(), updated_at timestamptz default now(),
 articulos jsonb, aceptada_rechazada text default 'pendiente'
);
alter table public.cotizaciones enable row level security;
alter table public.configuracion_empresa enable row level security;
create policy own_quotes on public.cotizaciones to public using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy own_company on public.configuracion_empresa to public using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant all on public.cotizaciones,public.configuracion_empresa to anon,authenticated;
grant usage,select on sequence public.cotizaciones_id_seq to authenticated;
create function public.update_updated_at_column() returns trigger language plpgsql as $$
begin new.updated_at=timezone('utc',now()); return new; end $$;
create trigger update_cotizaciones_updated_at before update on public.cotizaciones
for each row execute function public.update_updated_at_column();
