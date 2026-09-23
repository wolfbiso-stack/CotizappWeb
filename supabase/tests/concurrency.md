# Pruebas de concurrencia para Supabase local o staging

No ejecutar contra producción. Requieren dos conexiones PostgreSQL independientes a una base de pruebas con la migración aplicada. PGlite usa una sola conexión y no sustituye estas pruebas. Usar exclusivamente publicaciones sintéticas creadas por `publish_quote`; los placeholders deben reemplazarse por sus valores.

## Una sola respuesta

En conexión A, iniciar transacción y responder una publicación pendiente, sin confirmar todavía:

```sql
begin;
set local role anon;
select public.respond_public_quote('<TOKEN>', 1, 'approved', 'A');
-- Mantener la transacción abierta.
```

En conexión B:

```sql
begin;
set local role anon;
select public.respond_public_quote('<TOKEN>', 1, 'rejected', 'B');
```

B debe esperar. Ejecutar `commit` en A; B debe devolver `approved`, comentario `A` y la misma fecha que A. Confirmar B. Consultar y comprobar que la fila solo contiene una decisión. Repetir invirtiendo decisiones.

## Vencimiento mientras espera un bloqueo

Publicar con `p_expires_at` algunos segundos en el futuro. A, como administrador de pruebas:

```sql
begin;
select id from quote_private.publications where id='<PUBLICATION_UUID>' for update;
```

B inicia `respond_public_quote` como anon antes de vencer. Esperar hasta después del vencimiento y confirmar A. B debe devolver `expired`; `decision/responded_at/comment` deben permanecer null. Esta prueba detecta usos incorrectos de `now()` al inicio de transacción.

## Revocación frente a respuesta

A revoca una publicación pendiente dentro de una transacción con sesión del propietario autenticado y no confirma. B responde como anon: debe esperar. Tras confirmar A, B devuelve únicamente `revoked`. Invertir el orden: si la respuesta se confirma primero, la revocación posterior debe ocultar el enlace y conservar la decisión privada.

## Dos publicaciones y edición simultánea

A llama `publish_quote` sin confirmar; B publica el mismo borrador con request ID nuevo. Tras confirmar A, B debe producir la versión siguiente con token distinto. Con el mismo request ID, B devuelve `already_published` sin token. Si Android cambia `updated_at` antes de que publicación adquiera el bloqueo, debe fallar con `SOURCE_CHANGED`. Comprobar también que una modificación concurrente de configuración de empresa no mezcla datos dentro de una misma copia.

## Comprobación por PostgREST

Repetir el flujo con clave pública y sesión anónima real, incluyendo intentos `GET/PATCH/POST/DELETE` directos a tablas. Confirmar que no existen endpoints expuestos para `quote_private`. Enviar parámetros extra como `total`, `snapshot` o `user_id` a RPC debe fallar sin modificar filas. Dos pestañas con el mismo token deben terminar mostrando la primera decisión registrada.
