-- Solo lectura. Ejecutar en el editor SQL y compartir los resultados sin datos personales.
-- No crea ni modifica objetos. No consulta filas de clientes ni secretos.
select table_schema, table_name, column_name, data_type, udt_name,
       is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('cotizaciones', 'configuracion_empresa')
order by table_name, ordinal_position;

select c.relname as table_name, con.conname,
       pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('cotizaciones', 'configuracion_empresa');

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('cotizaciones', 'configuracion_empresa');

select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('cotizaciones', 'configuracion_empresa');

select event_object_table, trigger_name, action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('cotizaciones', 'configuracion_empresa');

select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name ilike '%cotiza%';

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('cotizaciones', 'configuracion_empresa');
