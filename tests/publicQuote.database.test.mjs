import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
let nextId = 0;
async function role(name = 'postgres', uid = '') {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
    if (name !== 'postgres') await db.exec(`set role ${name}`);
}
async function rpc(name, args, casts) {
    return (await db.query(`select public.${name}(${args.map((_, i) => `$${i + 1}${casts?.[i] ? `::${casts[i]}` : ''}`).join(',')}) as result`, args)).rows[0].result;
}
async function seed({ expiry = '31/12/2030', total = 2668, articles, user = owner } = {}) {
    await role();
    const id = ++nextId;
    const items = articles || [
        { articulo: 'Equipo', cantidad: 2, precioUnitario: 1000, total: 1800, ajusteTipo: 'descuento', ajustePorcentaje: 10, costoEmpresa: 600, private_note: 'SECRET' },
        { articulo: 'Instalación', cantidad: 1, precioUnitario: 500, total: 500 },
    ];
    await db.query(`insert into public.cotizaciones(id,folio,nombre_cliente,telefono,empresa,correo,fecha,fecha_vencimiento,
        ajuste_nombre,ajuste_tipo,ajuste_porcentaje,total,user_id,articulos,terminos)
        values($1,'TEST','Cliente','PRIVATE_PHONE','Cliente SA','PRIVATE_EMAIL','23/09/2026',$2,'IVA','impuesto',16,$3,$4,$5,'Condiciones')`,
    [id, expiry, total, user, JSON.stringify(items)]);
    return id;
}
async function publish(id, { user = owner, request = randomUUID(), expiry = null, revision, currency = 'MXN', timezone = 'America/Mexico_City' } = {}) {
    await role('authenticated', user);
    if (revision === undefined) revision = (await db.query('select updated_at::text as revision from public.cotizaciones where id=$1', [id])).rows[0]?.revision ?? null;
    return rpc('publish_quote', [id, revision, request, currency, timezone, expiry], ['integer', 'timestamptz', 'uuid', 'text', 'text', 'timestamptz']);
}
async function read(token) { await role('anon'); return rpc('get_public_quote', [token]); }
async function respond(token, version = 1, decision = 'approved', comment = null) {
    await role('anon'); return rpc('respond_public_quote', [token, version, decision, comment], ['text', 'integer', 'text', 'text']);
}

before(async () => {
    await db.exec(await readFile(new URL('./fixtures/supabase-schema.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/20260923000000_public_quotes.sql', import.meta.url), 'utf8'));
    await db.query("insert into public.configuracion_empresa(user_id,nombre,direccion) values ($1,'Empresa A','Dirección'),($2,'Empresa B','Dirección B')", [owner, other]);
});
after(async () => { await db.close(); });

test('publishes the Android amounts unchanged with an explicit safe allowlist', async () => {
    const publication = await publish(await seed());
    assert.match(publication.token, /^[a-f0-9]{64}$/);
    const data = await read(publication.token);
    assert.equal(data.status, 'pending');
    assert.equal(data.quote.total, 2668);
    assert.equal(data.quote.subtotal, 2300);
    assert.equal(data.quote.articulos[0].total, 1800);
    assert.equal(data.quote.articulos[0].descuento, 10);
    assert.deepEqual(data.quote.ajuste, { nombre: 'IVA', tipo: 'impuesto', porcentaje: 16, importe: 368 });
    for (const secret of ['costoEmpresa','user_id','private_note','SECRET','PRIVATE_PHONE','PRIVATE_EMAIL']) assert.equal(JSON.stringify(data).includes(secret), false);
    await role();
    const stored = (await db.query('select token_hash from quote_private.publications where id=$1', [publication.publication_id])).rows[0];
    assert.ok(stored.token_hash);
    assert.equal((await db.query("select column_name from information_schema.columns where table_schema='quote_private' and column_name='token'")).rows.length, 0);
});

test('random or sequential tokens cannot retrieve any quotation', async () => {
    for (const token of ['1', 'f'.repeat(64), null, "' OR true --"]) assert.deepEqual(await read(token), { status: 'invalid' });
});

test('anonymous visitors cannot read/write tables, publish, enumerate or call private helpers', async () => {
    await role('anon');
    for (const query of ['select * from public.cotizaciones','select * from public.configuracion_empresa',
        'select * from quote_private.publications', 'update public.cotizaciones set total=0',
        'delete from public.cotizaciones', 'truncate public.cotizaciones',
        "select quote_private.parse_date('01/01/2030')", 'select public.list_quote_publications(1)']) {
        await assert.rejects(db.exec(query), /permission denied/);
    }
    await assert.rejects(rpc('publish_quote', [1, null, randomUUID(), 'MXN', 'UTC', null], ['integer','timestamptz','uuid','text','text','timestamptz']), /permission denied/);
});

test('second owner cannot publish, revoke, enumerate decisions or alter first owner data', async () => {
    const id = await seed(); const pub = await publish(id);
    await assert.rejects(publish(id, { user: other }), /QUOTE_NOT_FOUND/);
    assert.deepEqual(await rpc('list_quote_publications', [id]), []);
    await assert.rejects(rpc('revoke_quote_publication', [pub.publication_id], ['uuid']), /PUBLICATION_NOT_FOUND/);
    assert.equal((await db.query('update public.cotizaciones set total=0 where id=$1 returning id', [id])).rows.length, 0);
    await assert.rejects(db.exec('truncate public.cotizaciones'), /permission denied/);
    await assert.rejects(db.exec('select * from quote_private.publications'), /permission denied/);
});

test('response is immutable and Android stale state cannot replace it', async () => {
    const id = await seed(); const pub = await publish(id);
    const first = await respond(pub.token, 1, 'approved', ' De acuerdo ');
    const second = await respond(pub.token, 1, 'rejected', 'Changed mind');
    assert.equal(first.status, 'answered');
    assert.deepEqual(second.response, first.response);
    assert.equal(first.response.comment, 'De acuerdo');
    await role('authenticated', owner);
    await db.query("update public.cotizaciones set aceptada_rechazada='pendiente',total=0 where id=$1", [id]);
    const decisions = await rpc('list_quote_publications', [id]);
    assert.equal(decisions[0].estado, 'aceptada');
    assert.equal((await read(pub.token)).quote.total, 2668);
    await role();
    await assert.rejects(db.query("update quote_private.publications set decision='rechazada' where id=$1", [pub.publication_id]), /IMMUTABLE_RESPONSE/);
});

test('expired quotations cannot be published or responded to', async () => {
    await assert.rejects(publish(await seed({ expiry: '01/01/2020' })), /INVALID_EXPIRY/);
    const pub = await publish(await seed(), { expiry: new Date(Date.now() + 1200).toISOString() });
    await new Promise(resolve => setTimeout(resolve, 1300));
    assert.equal((await respond(pub.token)).status, 'expired');
    await role();
    assert.equal((await db.query('select decision from quote_private.publications where id=$1', [pub.publication_id])).rows[0].decision, null);
});

test('revocation is idempotent, hides content and refuses response', async () => {
    const pub = await publish(await seed());
    const revoked = await rpc('revoke_quote_publication', [pub.publication_id], ['uuid']);
    assert.deepEqual(await rpc('revoke_quote_publication', [pub.publication_id], ['uuid']), revoked);
    assert.deepEqual(await read(pub.token), { status: 'revoked' });
    assert.deepEqual(await respond(pub.token), { status: 'revoked' });
});

test('editing quote or company cannot silently change the published version', async () => {
    const id = await seed(); const first = await publish(id); const snapshot = await read(first.token);
    await role('authenticated', owner);
    await db.query("update public.cotizaciones set terminos='Changed' where id=$1", [id]);
    await db.query("update public.configuracion_empresa set nombre='New company name' where user_id=$1", [owner]);
    assert.deepEqual(await read(first.token), snapshot);
    const second = await publish(id);
    assert.equal(second.version, 2); assert.notEqual(first.token, second.token);
    assert.equal((await read(second.token)).quote.terminos, 'Changed');
    await role();
    await assert.rejects(db.query("update quote_private.publications set snapshot='{}' where id=$1", [first.publication_id]), /IMMUTABLE_PUBLICATION/);
});

test('wrong version, oversized comment, invalid decision and extra amounts cannot write', async () => {
    const pub = await publish(await seed());
    await assert.rejects(respond(pub.token, 2), /VERSION_MISMATCH/);
    await assert.rejects(respond(pub.token, 1, 'approved', 'x'.repeat(2001)), /INVALID_RESPONSE/);
    await assert.rejects(respond(pub.token, 1, 'aprobada'), /INVALID_RESPONSE/);
    await assert.rejects(db.query('select public.respond_public_quote($1,1,$2,null,0)', [pub.token,'approved']), /does not exist/);
    assert.equal((await read(pub.token)).status, 'pending');
});

test('publication retries are idempotent and do not expose the original token', async () => {
    const id = await seed(); const request = randomUUID();
    const first = await publish(id, { request }); const retry = await publish(id, { request });
    assert.equal(retry.status, 'already_published'); assert.equal(retry.publication_id, first.publication_id);
    assert.equal(retry.token, null); assert.equal(retry.path, null);
    const different = await seed();
    await assert.rejects(publish(different, { request }), /REQUEST_ID_CONFLICT/);
});

test('invalid dates, amounts and stale source revisions fail rather than reinterpret records', async () => {
    await assert.rejects(publish(await seed({ expiry: '31/02/2030' })), /date|INVALID_SOURCE_DATE/i);
    await assert.rejects(publish(await seed({ total: 1 })), /TOTAL_MISMATCH/);
    await assert.rejects(publish(await seed(), { revision: '2000-01-01T00:00:00Z' }), /SOURCE_CHANGED/);
    await assert.rejects(publish(await seed(), { expiry: '2040-01-01T00:00:00Z' }), /EXPIRY_EXCEEDS_SOURCE/);
    await assert.rejects(publish(await seed(), { timezone: 'Invalid/Zone' }), /INVALID_PUBLICATION_PARAMETERS/);
});

test('deleting the mutable source preserves the published evidence and owner access', async () => {
    const id = await seed(); const pub = await publish(id); await respond(pub.token);
    await role('authenticated', owner);
    await db.query('delete from public.cotizaciones where id=$1', [id]);
    assert.equal((await rpc('list_quote_publications', [id]))[0].estado, 'aceptada');
    assert.equal((await read(pub.token)).status, 'answered');
});
