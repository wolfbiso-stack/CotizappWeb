import React from 'react';
import PublicQuote from './components/PublicQuote';

const PublicRepairTracking = React.lazy(() => import('./components/PublicRepairTracking'));
const PublicInvoiceRequest = React.lazy(() => import('./components/PublicInvoiceRequest'));
const PublicLandingPage = React.lazy(() => import('./components/PublicLandingPage'));

const PublicApp = () => {
    // Determine if we are tracking a repair or requesting an invoice
    const urlHash = window.location.hash;
    const urlPath = window.location.pathname;

    if (/^\/cotizacion(?:\/|$)/.test(urlPath)) {
        return <PublicQuote />;
    }

    if (/^\/(?:facturacion|factura)(?:\/|$)/.test(urlPath) || urlHash.includes('#/facturacion') || urlHash.includes('#/factura') || urlPath.includes('/facturacion') || urlPath.includes('/factura')) {
        return (
            <React.Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Cargando formulario...</div>}>
                <PublicInvoiceRequest />
            </React.Suspense>
        );
    }

    if (urlHash.includes('#/track/') || urlPath.includes('/track/')) {
        return <PublicRepairTracking />;
    }

    // Official Corporate Landing Page
    return (
        <React.Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando CUBI Servicios...</div>}>
            <PublicLandingPage />
        </React.Suspense>
    );
};

export default PublicApp;
