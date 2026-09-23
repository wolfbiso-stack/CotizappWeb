// Optional local end-to-end harness. No Supabase credentials, network DB or persisted data.
// Starts the real web app against the actual migration in in-memory PostgreSQL.
import { PGlite } from '@electric-sql/pglite';
import { createServer } from 'vite';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const db = new PGlite();
await db.exec(await readFile(new URL('./fixtures/supabase-schema.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/20260923000000_public_quotes.sql', import.meta.url), 'utf8'));
const owner = '11111111-1111-4111-8111-111111111111';
await db.query("insert into public.configuracion_empresa(user_id,nombre,direccion) values ($1,'Empresa de prueba local','Datos sintéticos, sin valor comercial')", [owner]);
const links = {};
for (const state of ['pending', 'reject', 'answered', 'revoked', 'expired']) {
    await db.exec('reset role');
    const q = (await db.query(`insert into public.cotizaciones(folio,nombre_cliente,telefono,empresa,correo,fecha,fecha_vencimiento,
      total,user_id,articulos,terminos,ajuste_nombre,ajuste_tipo,ajuste_porcentaje)
      values($1,'Cliente de prueba','','','','23/09/2026','31/12/2030',2668,$2,$3,'Prueba local sin efectos comerciales.','IVA','impuesto',16)
      returning id,updated_at::text`, ['TEST-' + state, owner, JSON.stringify([
        { articulo: 'Equipo de demostración', cantidad: 2, precioUnitario: 1000, total: 1800, ajusteTipo: 'descuento', ajustePorcentaje: 10, costoEmpresa: 600 },
        { articulo: 'Instalación', cantidad: 1, precioUnitario: 500, total: 500 },
      ])])).rows[0];
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
    await db.exec('set role authenticated');
    const p = (await db.query("select public.publish_quote($1,$2,$3,'MXN','America/Mexico_City',null) as result", [q.id,q.updated_at,randomUUID()])).rows[0].result;
    if (state === 'answered') await db.query("select public.respond_public_quote($1,1,'approved','Respuesta previa de prueba')", [p.token]);
    if (state === 'revoked') await db.query('select public.revoke_quote_publication($1)', [p.publication_id]);
    if (state === 'expired') {
        // Insert a historical publication into the isolated fixture, keeping the immutability trigger intact.
        await db.exec('reset role');
        await db.query(`insert into quote_private.publications(quote_id,owner_id,request_id,version,token_hash,snapshot,published_at,expires_at,timezone)
          select quote_id,owner_id,$1,2,sha256(convert_to($2,'UTF8')),snapshot,'2020-01-01','2020-01-02',timezone
          from quote_private.publications where id=$3`, [randomUUID(),'e'.repeat(64),p.publication_id]);
        p.token = 'e'.repeat(64); p.path = '/cotizacion/' + p.token;
    }
    links[state] = 'http://127.0.0.1:5174' + p.path;
}
await db.exec('reset role');
await db.query("select set_config('request.jwt.claim.sub','',false)");
await db.exec('set role anon');

const server = await createServer({
    server: { host: '127.0.0.1', port: 5174, strictPort: true },
    define: {
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:5174'),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('local-test-public-key'),
    },
    plugins: [{ name: 'isolated-quote-rpc-test', configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith('/rest/v1/rpc/')) return next();
            res.setHeader('Content-Type','application/json');
            res.setHeader('Cache-Control','no-store');
            try {
                if (req.method !== 'POST') throw new Error('POST only');
                let body = '';
                for await (const chunk of req) { body += chunk; if (body.length > 8192) throw new Error('Too large'); }
                const input = JSON.parse(body);
                const name = req.url.split('/').pop();
                let value;
                if (name === 'get_public_quote' && Object.keys(input).every(key => key === 'p_token')) {
                    value = await db.query('select public.get_public_quote($1) as result',[input.p_token]);
                } else if (name === 'respond_public_quote' && Object.keys(input).every(key => ['p_token','p_version','p_decision','p_comment'].includes(key))) {
                    value = await db.query('select public.respond_public_quote($1,$2,$3,$4) as result',[input.p_token,input.p_version,input.p_decision,input.p_comment]);
                } else throw new Error('Unknown RPC or parameters');
                res.end(JSON.stringify(value.rows[0].result));
            } catch (error) { res.statusCode = 400; res.end(JSON.stringify({ message: error.message })); }
        });
    } }],
});
await server.listen();
console.log(JSON.stringify(links,null,2));
async function stop() { await server.close(); await db.close(); process.exit(0); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
