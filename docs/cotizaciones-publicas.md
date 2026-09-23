# Cotizaciones públicas: Supabase, Android y Vercel

## Entrega y alcance

La ruta `/cotizacion/:token` muestra una copia publicada y permite aprobar o rechazar con confirmación y comentario. Implementación en `src/components/PublicQuote.jsx`; acceso RPC en `src/utils/publicQuoteClient.js` y `src/utils/publicQuote.js`. Conserva las tarjetas redondeadas, tonos slate/azul y estilos Tailwind existentes. No hay datos ficticios en producción.

La migración revisable es `supabase/migrations/20260923000000_public_quotes.sql`. **No se ha ejecutado en Supabase ni se ha publicado el sitio.** Se ejecutó en PostgreSQL aislado mediante PGlite, reconstruyendo el esquema de origen suministrado. PGlite no sustituye las verificaciones de PostgREST y concurrencia real de staging.

Se conservan las rutas de seguimiento, el acceso privado y los cambios preexistentes del panel/diseñador. No se reutiliza `get_service_by_token`, que devuelve filas completas de otros servicios. El nuevo cliente público usa las variables existentes, pero no hereda la sesión privada ni procesa autenticación desde la URL.

## Esquema confirmado y decisiones de compatibilidad

Fuente: catálogo de Supabase y descripción Android entregados por el propietario durante esta tarea.

| Objeto existente | Campos utilizados |
| --- | --- |
| `public.cotizaciones` | `id integer` PK; `user_id uuid`; `folio`, `nombre_cliente`, `fecha`, `fecha_vencimiento`, `ajuste_nombre`, `ajuste_tipo`, `terminos` como texto; `ajuste_porcentaje`, `total` double precision; `articulos jsonb`; `updated_at timestamptz` |
| `public.configuracion_empresa` | `user_id uuid` único; PK `(id,user_id)`; `nombre`, `direccion`, `telefono`, `correo`, `rfc` como texto |

RLS existente usa `auth.uid() = user_id`; no hay membresías en el flujo revisado. `cotizaciones.empresa` es la empresa del cliente y no autoriza acceso. Se conserva el esquema original y su trigger de `updated_at`.

La migración revoca privilegios de `anon` sobre ambas tablas de origen y revoca `TRUNCATE`, `REFERENCES`, `TRIGGER` de `authenticated`, conservando CRUD con RLS para Android. `TRUNCATE` no se filtra por RLS. Revisar otras integraciones que dependan de esos privilegios antes de aplicar. No se alteran otras tablas ni funciones de seguimiento.

## Almacenamiento y seguridad

Nueva tabla **`quote_private.publications`**, en un esquema no expuesto a la API:

| Columna | Tipo / función |
| --- | --- |
| `id` | UUID, identidad de publicación |
| `quote_id` | integer, referencia al borrador sincronizado |
| `owner_id` | UUID, propietario autenticado |
| `request_id` | UUID, idempotencia de publicación por propietario |
| `version` | entero positivo, único por `quote_id` |
| `token_hash` | bytea, SHA-256 único del token; no se almacena el token original |
| `snapshot` | JSONB con lista explícita de campos públicos |
| `source_updated_at` | timestamptz, revisión de origen |
| `published_at`, `expires_at` | timestamptz, publicación y límite exclusivo de respuesta |
| `timezone` | zona IANA usada al interpretar fechas del borrador |
| `revoked_at` | timestamptz nullable |
| `decision` | `aceptada`, `rechazada` o null |
| `responded_at`, `comment` | fecha del servidor y comentario opcional, máximo 2000 caracteres |

No hay FK con borrado en cascada al borrador o al usuario: borrar un borrador no elimina evidencia publicada. Una baja de cuenta requiere un procedimiento explícito de retención/revocación. No reutilizar manualmente IDs de cotizaciones eliminadas.

RLS está habilitada sin políticas públicas. Se revocan permisos de esquema, tabla y helpers para `PUBLIC`, `anon` y `authenticated`. Solo las cinco funciones públicas enumeradas abajo tienen permisos explícitos; usan `SECURITY DEFINER`, `search_path` vacío y objetos calificados. El trigger `quote_private.protect_publication` impide modificar la copia, versión, propietario, token o vigencia; conserva decisiones ya registradas y revocaciones. Un administrador puede alterar triggers/permisos: el mecanismo protege a visitantes y clientes de aplicación, no contra el administrador de la base.

El token tiene 64 caracteres hexadecimales minúsculos. Se deriva con SHA-256 de dos UUIDv4 criptográficamente aleatorios (244 bits aleatorios), usando funciones nativas PostgreSQL sin instalar extensiones. El ID y folio nunca autorizan la consulta. Solo el hash del token se guarda. No registrar tokens en logs, analítica, reportes de fallos ni vistas previas de enlaces.

El snapshot excluye `costoEmpresa`, `costoUnitario`, notas privadas, `user_id`, teléfono/correo privados del cliente y campos desconocidos. No se publican filas enteras. Empresa, condiciones e importes quedan congelados; se omite el logo remoto mutable para no alterar una versión histórica a través del archivo.

## Publicar desde Android

Origen público acordado: `https://app.cubiservicios.lat`, el mismo configurado en los tickets QR (`QRServiceTicket.jsx`, `ServiceReceipt.jsx` y `PrintQRModal.jsx`) para Android/Capacitor. Android debe usarlo como `origenWebPublico`. Los enlaces nuevos tendrán la forma `https://app.cubiservicios.lat/cotizacion/<token>`, sin `#/track/`. Este dominio se obtuvo de la configuración existente; la nueva ruta aún requiere desplegar los cambios y aplicar la migración antes de compartir enlaces reales.

Primero sincronizar la cotización y volver a leer `id` y `updated_at` retornados por Supabase. Enviar el timestamp completo, sin truncarlo a milisegundos si el servidor devuelve mayor precisión. Publicar con la sesión del propietario:

```json
{
  "p_quote_id": 123,
  "p_expected_updated_at": "2026-09-23T04:00:00.123456+00:00",
  "p_request_id": "47a755bf-6101-4fe4-89be-f53d46e13998",
  "p_currency": "MXN",
  "p_timezone": "America/Mexico_City",
  "p_expires_at": null
}
```

Estos valores son ejemplos de llamada; reemplazarlos por datos del registro y configuración de la empresa. No se infiere moneda desde `$`. Android debe configurar explícitamente moneda ISO de tres letras y zona horaria IANA.

Función: **`publish_quote(integer, timestamptz, uuid, text, text, timestamptz)`**. Solo `authenticated`.

```js
const { data, error } = await supabase.rpc('publish_quote', {
  p_quote_id: cotizacion.id,
  p_expected_updated_at: cotizacion.updated_at,
  p_request_id: requestIdPersistido,
  p_currency: monedaConfigurada,
  p_timezone: zonaConfigurada,
  p_expires_at: null
});
// data.status === 'published':
// { status, publication_id, version, expires_at, token, path }
const enlace = new URL(data.path, origenWebPublico).href;
```

Equivalente HTTP para el cliente Supabase Kotlin que use Android:

```http
POST https://PROJECT_REF.supabase.co/rest/v1/rpc/publish_quote
apikey: PUBLIC_SUPABASE_KEY
Authorization: Bearer USER_ACCESS_TOKEN
Content-Type: application/json
```

Enviar el JSON anterior. Usar la librería Supabase de Android para renovar la sesión. El token de usuario es privado: jamás incrustarlo en el enlace del cliente.

La función verifica propietario, bloquea la fila de cotización y configuración de empresa, compara `updated_at`, valida datos y toma la copia. No acepta conceptos/precios del solicitante como parámetros. Si Android edita mientras se publica, el bloqueo y revisión evitan mezclar versiones.

### Reintentos de publicación

Generar y guardar `p_request_id` antes del primer envío; reutilizarlo en reintentos. Una segunda llamada devuelve `{ status: 'already_published', publication_id, version, expires_at, token: null, path: null }`. No crea otra publicación ni vuelve a revelar el token.

Guardar el enlace recibido en almacenamiento seguro del dispositivo. Si la respuesta original se perdió o no se conservó, recuperar el identificador con el mismo request ID, revocar esa publicación y publicar otra usando un request ID nuevo. No crear nuevas versiones en un bucle automático de reintentos.

### Importes y fechas

Android: `ajusteTipo/ajustePorcentaje` por artículo; web existente: `descuento`. Ambos se normalizan a `descuento` porcentual público. Se rechazan campos contradictorios o impuestos antiguos por artículo cuya semántica no se conoce. Los importes almacenados se conservan; no se vuelve a descontar el total de un concepto.

Subtotal = suma de totales guardados. El único ajuste global permite `impuesto` o `descuento`, con el signo descrito por Android. Se valida la fórmula contra lo guardado con tolerancia de 0.01 unidades monetarias; no se reemplazan importes por valores recalculados. Valores no finitos, negativos, descuentos fuera de 0–100, totales inconsistentes o tipos de ajuste desconocidos impiden publicar. Corregir/revisar esos registros en Android; no reinterpretarlos silenciosamente. No se fija IVA al 16%.

`fecha` y `fecha_vencimiento` son texto. Se aceptan estrictamente `dd/MM/yyyy` e ISO `yyyy-MM-dd`, verificando fechas reales. La fecha original se muestra como texto. Vencimiento se transforma al inicio del día siguiente en `p_timezone`, límite exclusivo. `p_expires_at` permite un vencimiento anterior, pero no ampliar el del borrador. Si no hay fecha de vencimiento se exige `p_expires_at` explícito. Fechas vencidas o infinitas se rechazan. La web muestra el instante convertido a la hora local del visitante; el servidor decide cuándo vence.

Errores relevantes: `AUTH_REQUIRED`, `QUOTE_NOT_FOUND`, `SOURCE_CHANGED`, `REQUEST_ID_CONFLICT`, `COMPANY_REQUIRED`, `INVALID_SOURCE_DATE`, `INVALID_EXPIRY`, `EXPIRY_EXCEEDS_SOURCE`, `INVALID_ITEM`, `ITEM_TOTAL_MISMATCH`, `TOTAL_MISMATCH`, `UNSUPPORTED_LEGACY_ITEM_TAX`, `UNSUPPORTED_GLOBAL_ADJUSTMENT`. Ante `SOURCE_CHANGED`, volver a sincronizar y revisar antes de publicar.

## Consulta del cliente

**`get_public_quote(p_token text)`**, permitida a `anon` y `authenticated`.

```js
const { data, error } = await supabase.rpc('get_public_quote', { p_token: token });
```

Respuesta `{ status, version, expires_at, quote, response }`:

- `status`: `pending`, `expired`, `revoked`, `answered`, `invalid`.
- `invalid` y `revoked` devuelven solo `{ status }`, sin contenido.
- `quote`: `{ empresa: { nombre_empresa, direccion, telefono, correo, rfc }, folio, fecha, nombre_cliente, moneda, articulos, subtotal, ajuste, total, terminos }`.
- Concepto: `{ articulo, cantidad, precioUnitario, total, descuento }`.
- Ajuste: null o `{ nombre, tipo, porcentaje, importe }`. El importe es negativo para descuento.
- `response`: null o `{ decision: 'approved' | 'rejected', responded_at, comment }`.

Una respuesta registrada sigue visible después del vencimiento. Revocación oculta la publicación pero conserva la evidencia privada. Quien posee el enlace puede responder: el mecanismo acredita posesión del enlace, no identidad legal ni firma electrónica del cliente.

## Aprobar o rechazar

**`respond_public_quote(p_token text, p_version integer, p_decision text, p_comment text default null)`**, permitida a `anon` y `authenticated`.

```js
const { data, error } = await supabase.rpc('respond_public_quote', {
  p_token: token,
  p_version: versionMostrada,
  p_decision: 'approved', // alternativa: 'rejected'
  p_comment: comentario.trim() || null
});
```

Devuelve el mismo contrato que la consulta. Máximo 2000 caracteres, validado en servidor. No admite importes ni datos del cliente. La función bloquea la publicación, comprueba versión, revocación, respuesta previa y `clock_timestamp()` después de adquirir el bloqueo. Una segunda respuesta, aunque cambie la decisión, devuelve la respuesta original sin modificarla. Nunca hay mutaciones por GET.

Compatibilidad: `approved` ↔ `aceptada`; `rejected` ↔ `rechazada`; sin respuesta ↔ `pendiente`. `aprobada` es solo una etiqueta visual, nunca un estado almacenado de Android.

Si el envío pierde conexión, la web vuelve a consultar antes de ofrecer otro intento. Un bloqueo local evita doble clic, pero la protección definitiva está en PostgreSQL.

## Consultar decisiones y revocar desde Android

**`list_quote_publications(p_quote_id integer)`**, solo `authenticated`:

```js
const { data: versiones, error } = await supabase.rpc('list_quote_publications', {
  p_quote_id: cotizacion.id
});
```

Lista descendente por versión: `{ publication_id, version, published_at, expires_at, revoked_at, estado, responded_at, comment }`. `estado` usa `pendiente/aceptada/rechazada`. Otro propietario obtiene `[]`. No devuelve tokens. Sigue funcionando para el propietario aunque se haya eliminado el borrador.

**`revoke_quote_publication(p_publication_id uuid)`**, solo `authenticated`:

```js
const { data, error } = await supabase.rpc('revoke_quote_publication', {
  p_publication_id: publicacion.publication_id
});
// { publication_id, revoked_at }
```

Es idempotente y verifica propietario. Una decisión previa permanece en el historial, aunque el enlace ya no permita verla. No hay operación de deshacer revocación ni cambio de decisión.

### Cambios necesarios en Android

1. Añadir publicación tras sincronizar, moneda/zona configuradas y almacenamiento seguro del enlace.
2. Mostrar historial por versión y leer decisiones con `list_quote_publications` al abrir/actualizar la cotización. Puede hacerse sondeo explícito; no existe suscripción Realtime pública a la tabla privada.
3. No tratar `aceptada_rechazada` del borrador como autoridad para las publicaciones. Android sigue enviándolo al guardar; no puede sobreescribir las decisiones independientes. Evitar copiarlo de nuevo sobre una decisión publicada.
4. Editar no modifica la copia. Nueva publicación crea versión/token nuevos. Ofrecer revocación explícita de versiones pendientes sustituidas; publicar no revoca automáticamente enlaces anteriores.
5. Para ampliar vigencia, publicar versión nueva. No cambiar vencimiento/condiciones de una versión ya enviada.

## Vercel y entorno

Variables en `.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (clave anon o publishable pública). Nunca `service_role` ni claves secretas con prefijo VITE. Vite incorpora los valores al compilar; cambiar variables requiere otra compilación.

Vercel: framework Vite, raíz de este proyecto, `npm run build`, salida `dist`. La reescritura global existente hacia `index.html` se conserva. `/cotizacion/*` añade `no-store`, `no-referrer`, `noindex/nofollow/noarchive`, `nosniff` y protección contra incrustación en marcos. La ruta tiene prioridad sobre `?app=true`, localhost y subdominio `app.`. `optimizeDeps.entries` limita la exploración a `index.html` para evitar que Vite intente leer reportes generados de Android.

Pasos de despliegue, pendientes de autorización:

1. Respaldar/revisar Supabase; aplicar **solo la nueva migración** primero a staging con el esquema confirmado. No volver a ejecutar ciegamente todas las migraciones antiguas de este repositorio.
2. Verificar permisos reales, rutas RPC y pruebas de concurrencia descritas en `supabase/tests/concurrency.md`. El esquema `quote_private` no debe agregarse a los esquemas expuestos de PostgREST.
3. Configurar variables de Vercel por entorno y origen público de Android. Compilar y verificar vista previa autorizada, carga directa y recarga de enlaces.
4. Revisar encabezados HTTP reales, caché de RPC, HTTPS y ausencia de captura de tokens en analítica/logs. Configurar límites de solicitudes en la infraestructura si la exposición lo requiere.
5. Aplicar a producción/publicar solo con autorización. Primero habilitar RPC compatibles; después la web y la opción de compartir de Android.

## Pruebas reproducibles y resultados

```sh
node --test tests/publicQuote.test.mjs tests/publicQuote.database.test.mjs
npm run build
node tests/serve-public-quote.mjs
```

La última orden arranca en `127.0.0.1:5174` la aplicación real con Supabase JS apuntando a un puente RPC local y PostgreSQL en memoria. Imprime enlaces sintéticos para pendiente, rechazo, respondida, revocada y vencida. No utiliza credenciales ni datos de Supabase. Al detener el proceso se pierde la base. `tests/public-quote.html?state=error` (servidor Vite local) permite revisar error; `state=loading` permite carga. Ninguna fixture se importa desde producción.

Pruebas automatizadas: contrato del cliente, tokens inválidos/secuenciales, RPC sin consultas directas, permisos de tablas/esquema, aislamiento entre propietarios, eliminación de campos privados, snapshot estable, versionado, reintentos de publicación, respuesta inmutable, sobrescritura antigua de Android, vencimiento real del reloj SQL, revocación, parámetros inesperados y totales/fechas incompatibles.

Verificación manual local: ruta directa anónima, viewport móvil 390 × 844 y escritorio 1280 × 900, aprobación confirmada con comentario y persistencia al recargar, rechazo, cancelación sin envío, vencimiento sin acciones, revocación sin datos, enlace inválido, carga y error recuperable. Pasaron 19 pruebas automatizadas. La compilación de producción pasó; Vite advierte sobre el tamaño de algunos módulos del panel existente. El panel y el seguimiento se cargan bajo demanda para que el enlace público no inicialice el cliente de sesión privada ni descargue el panel.

Limitaciones: no se ejecutó contra el proyecto Supabase remoto, no se probó Vercel desplegado ni se modificó la aplicación Android externa. PGlite serializa operaciones en una conexión; las carreras reales entre conexiones deben verificarse en staging. Los tests reconstruyen las columnas/RLS relevantes, no todo `auth.users` ni la infraestructura Supabase.

Referencias oficiales: [Funciones y permisos de Supabase](https://supabase.com/docs/guides/database/functions), [reescrituras de Vercel](https://vercel.com/docs/routing/rewrites), [PostgreSQL local con PGlite](https://pglite.dev/docs/).
