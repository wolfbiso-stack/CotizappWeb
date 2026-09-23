// Test-only entry point, outside src/public and never imported in production.
import React from 'react';
import { createRoot } from 'react-dom/client';
import PublicQuote from '../src/components/PublicQuote';
import '../src/index.css';

const scenario = new URLSearchParams(window.location.search).get('state') || 'pending';
let result = {
    status: scenario, version: 1, expires_at: '2030-01-01T23:59:59Z',
    quote: {
        empresa: { nombre_empresa: 'Empresa de prueba', direccion: 'Dirección de prueba' },
        folio: 'PRUEBA-001', fecha: '2026-09-23', nombre_cliente: 'Cliente de prueba', moneda: 'MXN',
        articulos: [{ articulo: 'Concepto de prueba', cantidad: 2, precioUnitario: 100, descuento: 10, total: 180 }],
        total: 180, terminos: 'Condiciones de prueba. No es una cotización real.',
    },
};
if (scenario === 'answered') result.response = { decision: 'rejected', responded_at: '2026-09-23T00:00:00Z', comment: 'Prueba' };
if (scenario === 'expired') result.expires_at = '2020-01-01T00:00:00Z';
if (['revoked', 'invalid'].includes(scenario)) result = { status: scenario };
const api = {
    async read() {
        if (scenario === 'error') throw new Error('Test failure');
        if (scenario === 'loading') return new Promise(() => {});
        return result;
    },
    async respond(token, version, decision, comment) {
        if (result.status !== 'pending') return result;
        result = { ...result, status: 'answered', response: { decision, comment, responded_at: new Date().toISOString() } };
        return result;
    },
};
createRoot(document.getElementById('root')).render(<PublicQuote api={api} pathname={`/cotizacion/${'a'.repeat(64)}`} />);
