-- Nueva migracion: aplicar DESPUES de 20260923000000_public_quotes.sql.
-- No cambia cotizaciones, decisiones ni snapshots existentes.
begin;
create table if not exists quote_private.quote_views (
  publication_id uuid not null references quote_private.publications(id),
  visit_id uuid not null,
  viewed_at timestamptz not null default clock_timestamp(),
  primary key (publication_id, visit_id)
);
create index if not exists quote_views_timeline on quote_private.quote_views(publication_id, viewed_at desc);
alter table quote_private.quote_views enable row level security;
revoke all on quote_private.quote_views from public, anon, authenticated;

create or replace function public.record_public_quote_view(p_token text, p_visit_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare pub uuid;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' or p_visit_id is null then return; end if;
  select id into pub from quote_private.publications
    where token_hash=sha256(convert_to(p_token,'UTF8')) and revoked_at is null for share;
  if pub is null then return; end if;
  insert into quote_private.quote_views(publication_id,visit_id) values(pub,p_visit_id)
    on conflict do nothing;
end $$;

create or replace function public.list_quote_activity(p_quote_id integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'publication_id',p.id,'version',p.version,'published_at',p.published_at,
    'expires_at',p.expires_at,'revoked_at',p.revoked_at,
    'estado',coalesce(p.decision,'pendiente'),'responded_at',p.responded_at,'comment',p.comment,
    'view_count',(select count(*) from quote_private.quote_views v where v.publication_id=p.id),
    'first_viewed_at',(select min(viewed_at) from quote_private.quote_views v where v.publication_id=p.id),
    'last_viewed_at',(select max(viewed_at) from quote_private.quote_views v where v.publication_id=p.id),
    'views',coalesce((select jsonb_agg(t.viewed_at order by t.viewed_at desc) from
      (select v.viewed_at from quote_private.quote_views v where v.publication_id=p.id
        order by v.viewed_at desc limit 50) t),'[]'::jsonb)
    ) order by p.version desc) from quote_private.publications p
    where p.quote_id=p_quote_id and p.owner_id=auth.uid()),'[]'::jsonb);
end $$;

create or replace function public.get_quote_decisions(p_quote_ids integer[])
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if coalesce(cardinality(p_quote_ids),0)>500 then raise exception 'TOO_MANY_QUOTES'; end if;
  -- The latest non-revoked publication is authoritative. New versions start pending.
  return coalesce((select jsonb_agg(jsonb_build_object('quote_id',q.quote_id,'estado',coalesce(q.decision,'pendiente')))
    from (select distinct on (quote_id) quote_id,decision from quote_private.publications
      where owner_id=auth.uid() and quote_id=any(p_quote_ids) and revoked_at is null
      order by quote_id,version desc) q),'[]'::jsonb);
end $$;
revoke all on function public.record_public_quote_view(text,uuid) from public,anon,authenticated;
revoke all on function public.list_quote_activity(integer) from public,anon,authenticated;
revoke all on function public.get_quote_decisions(integer[]) from public,anon,authenticated;
grant execute on function public.record_public_quote_view(text,uuid) to anon,authenticated;
grant execute on function public.list_quote_activity(integer) to authenticated;
grant execute on function public.get_quote_decisions(integer[]) to authenticated;
notify pgrst,'reload schema';
commit;
