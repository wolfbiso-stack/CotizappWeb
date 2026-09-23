// Public API contract. Never pass a database row straight through this boundary.
export const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
export const PUBLIC_QUOTE_STATES = ['pending', 'expired', 'revoked', 'answered', 'invalid'];

export function quoteToken(pathname) {
    return /^\/cotizacion\/([a-f0-9]{64})\/?$/.exec(pathname)?.[1] || null;
}

export function validatePublicQuote(result) {
    if (!result || !PUBLIC_QUOTE_STATES.includes(result.status)) throw new Error('Invalid response');
    if (['invalid', 'revoked'].includes(result.status)) return { status: result.status };
    const q = result.quote;
    const number = value => typeof value === 'number' && Number.isFinite(value);
    if (!q || typeof q.folio !== 'string' || typeof q.nombre_cliente !== 'string'
        || !Number.isInteger(result.version) || result.version < 1
        || !number(q.total) || typeof q.moneda !== 'string' || !/^[A-Z]{3}$/.test(q.moneda)
        || !Array.isArray(q.articulos) || !q.articulos.length
        || !q.articulos.every(item => typeof item.articulo === 'string'
            && number(item.cantidad) && number(item.precioUnitario) && number(item.total)
            && (item.descuento == null || number(item.descuento)))
        || (q.subtotal != null && !number(q.subtotal))
        || (q.ajuste != null && (typeof q.ajuste.nombre !== 'string'
            || !number(q.ajuste.porcentaje) || !number(q.ajuste.importe)))
        || !result.expires_at || !Number.isFinite(Date.parse(result.expires_at))) {
        throw new Error('Invalid response');
    }
    if (result.status === 'answered' && (!['approved', 'rejected'].includes(result.response?.decision)
        || !Number.isFinite(Date.parse(result.response?.responded_at)))) throw new Error('Invalid response');
    return result;
}

export function createQuoteApi(client) {
    async function call(name, params) {
        if (!client) throw new Error('Missing configuration');
        const { data, error } = await client.rpc(name, params);
        if (error) throw new Error('Quote service unavailable');
        return validatePublicQuote(data);
    }
    return {
        read(token) {
            if (!TOKEN_PATTERN.test(token || '')) return Promise.resolve({ status: 'invalid' });
            return call('get_public_quote', { p_token: token });
        },
        respond(token, version, decision, comment) {
            if (!TOKEN_PATTERN.test(token || '') || !['approved', 'rejected'].includes(decision)
                || !Number.isInteger(version) || version < 1 || typeof comment !== 'string' || comment.length > 2000) {
                throw new Error('Invalid response parameters');
            }
            return call('respond_public_quote', {
                p_token: token, p_version: version, p_decision: decision, p_comment: comment.trim() || null,
            });
        },
    };
}
