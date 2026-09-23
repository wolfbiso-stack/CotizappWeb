import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuoteApi, quoteToken, validatePublicQuote } from '../src/utils/publicQuote.js';

const token = 'a'.repeat(64);
// Synthetic contract fixtures live only in tests and are never imported by the app.
const pending = {
    status: 'pending', version: 1, expires_at: '2030-01-01T00:00:00Z',
    quote: { folio: 'TEST', nombre_cliente: 'Prueba', moneda: 'MXN', total: 100,
        articulos: [{ articulo: 'Prueba', cantidad: 1, precioUnitario: 100, total: 100 }] },
};

test('route accepts only the full random token, never a sequential ID', () => {
    assert.equal(quoteToken(`/cotizacion/${token}`), token);
    assert.equal(quoteToken(`/cotizacion/${token}/`), token);
    for (const path of ['/cotizacion/1', '/cotizacion/', `/cotizacion/${token}/extra`, `/x/cotizacion/${token}`, '/cotizacion/%']) {
        assert.equal(quoteToken(path), null);
    }
});

test('invalid tokens never reach the backend', async () => {
    const api = createQuoteApi({ rpc() { assert.fail('Unexpected RPC'); } });
    assert.deepEqual(await api.read('1'), { status: 'invalid' });
    assert.deepEqual(await api.read(null), { status: 'invalid' });
});

test('reads only through RPC and decision payload cannot carry prices or customer data', async () => {
    const calls = [];
    const api = createQuoteApi({ async rpc(name, params) { calls.push({ name, params }); return { data: pending }; } });
    assert.deepEqual(await api.read(token), pending);
    await api.respond(token, 1, 'approved', '  De acuerdo  ');
    assert.deepEqual(calls, [
        { name: 'get_public_quote', params: { p_token: token } },
        { name: 'respond_public_quote', params: { p_token: token, p_version: 1, p_decision: 'approved', p_comment: 'De acuerdo' } },
    ]);
});

test('invalid decision, version and oversized comment are rejected', () => {
    const api = createQuoteApi(null);
    assert.throws(() => api.respond(token, 1, 'other', ''));
    assert.throws(() => api.respond(token, 0, 'approved', ''));
    assert.throws(() => api.respond(token, 1, 'approved', 'x'.repeat(2001)));
});

test('missing configuration and RPC failures fail closed without table fallback', async () => {
    await assert.rejects(createQuoteApi(null).read(token));
    await assert.rejects(createQuoteApi({ async rpc() { return { error: { message: 'secret database details' } }; } }).read(token),
        error => !error.message.includes('secret'));
});

test('recognizes terminal states and drops quote data on revoked or invalid links', () => {
    for (const status of ['invalid', 'revoked']) {
        assert.deepEqual(validatePublicQuote({ status, quote: pending.quote }), { status });
    }
    assert.equal(validatePublicQuote({ ...pending, status: 'expired' }).status, 'expired');
    assert.equal(validatePublicQuote({ ...pending, status: 'answered', response: {
        decision: 'rejected', responded_at: '2026-09-23T00:00:00Z', comment: null,
    } }).status, 'answered');
});

test('malformed responses do not silently display fabricated prices or enable decisions', () => {
    for (const data of [null, {}, { status: 'pending' }, { ...pending, expires_at: null },
        { ...pending, status: 'answered' }, { ...pending, quote: { ...pending.quote, total: null } }]) {
        assert.throws(() => validatePublicQuote(data));
    }
});


test('opening tracking uses a dedicated RPC without sending visitor personal data', async () => {
    const calls = [];
    const api = createQuoteApi({ async rpc(name, params) { calls.push({ name, params }); return { data: null }; } });
    const id = '11111111-1111-4111-8111-111111111111';
    await api.recordView('bad', id);
    await api.recordView(token, id);
    assert.deepEqual(calls, [{ name: 'record_public_quote_view', params: { p_token: token, p_visit_id: id } }]);
});
