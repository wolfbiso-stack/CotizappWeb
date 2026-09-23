import React, { useEffect, useRef, useState } from 'react';
import { Loader, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { publicQuoteApi } from '../utils/publicQuoteClient';
import { quoteToken } from '../utils/publicQuote';

const messages = {
    invalid: 'Enlace inválido. Solicita a la empresa un enlace vigente.',
    revoked: 'Este enlace fue revocado. Contacta a la empresa para obtener la versión vigente.',
    expired: 'Esta cotización ha vencido y ya no admite respuestas. Solicita una nueva versión.',
};
const dateTime = value => new Date(value).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
const button = 'rounded-xl px-5 py-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed';

export default function PublicQuote({ api = publicQuoteApi, pathname = window.location.pathname }) {
    const token = quoteToken(pathname);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [decision, setDecision] = useState(null);
    const [comment, setComment] = useState('');
    const [sending, setSending] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [retry, setRetry] = useState(0);
    const locked = useRef(false);
    const confirmation = useRef(null);

    useEffect(() => {
        let active = true;
        setLoading(true); setError(''); setResult(null); setDecision(null); setComment('');
        api.read(token).then(data => { if (active) setResult(data); })
            .catch(() => { if (active) setError('No pudimos cargar la cotización. Intenta de nuevo en unos momentos.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [api, token, retry]);

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);
    useEffect(() => { if (decision) confirmation.current?.focus(); }, [decision]);

    const status = result?.status === 'pending' && Date.parse(result.expires_at) <= now ? 'expired' : result?.status;
    const q = result?.quote;
    const money = value => new Intl.NumberFormat('es-MX', {
        style: 'currency', currency: q?.moneda || 'MXN',
    }).format(value);

    async function respond(event) {
        event.preventDefault();
        if (locked.current || status !== 'pending' || !decision) return;
        locked.current = true; setSending(true); setError('');
        try {
            const updated = await api.respond(token, result.version, decision, comment);
            setResult(updated); setDecision(null);
        } catch {
            setDecision(null);
            try {
                const updated = await api.read(token);
                setResult(updated);
                if (updated.status === 'pending') setError('No se confirmó el envío. Revisa tu decisión e intenta nuevamente.');
            } catch {
                setResult(null);
                setError('No pudimos verificar si tu respuesta se registró. Vuelve a consultar antes de responder.');
            }
        } finally { locked.current = false; setSending(false); }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm flex flex-col items-center gap-4">
                    <Loader className="w-8 h-8 animate-spin text-blue-600" aria-hidden="true" />
                    <p className="text-slate-600 font-medium">Cargando cotización…</p>
                </div>
            </div>
        );
    }

    if (error && !result) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full text-center">
                    <p className="text-red-600 mb-6">{error}</p>
                    <button className={`${button} bg-slate-900 text-white w-full`} onClick={() => setRetry(n => n + 1)}>Volver a consultar</button>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#f3f4f6] py-8 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
            <div className="max-w-[850px] mx-auto space-y-6">
                
                {/* Status Messages */}
                {messages[status] && (
                    <div className="bg-white rounded-xl shadow-sm border-l-4 border-amber-500 p-4 flex items-start gap-3">
                        <Clock className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" aria-hidden="true" />
                        <p className="text-amber-800 font-medium">{messages[status]}</p>
                    </div>
                )}
                {error && result && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-xl shadow-sm border border-red-100">
                        {error}
                    </div>
                )}

                {/* The Document Area */}
                {q && (
                    <div className="bg-white shadow-xl shadow-slate-200/50 overflow-hidden relative">
                        {/* Top Gradient Bar */}
                        <div className="h-2 w-full bg-gradient-to-r from-[#4d3df7] via-[#8651f8] to-[#c66efb]"></div>
                        
                        <div className="p-8 sm:p-12">
                            {/* Header Section */}
                            <header className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
                                {/* Left Side: Logo and Company Info */}
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                                    <div className="w-32 h-20 flex-shrink-0 flex items-center justify-center bg-white p-1">
                                        <img src="/LogoEmpresa.png" alt="CUBI Servicios Logo" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                                    </div>
                                    <div className="text-center sm:text-left mt-2">
                                        <h1 className="text-2xl font-bold text-slate-900 mb-1">{q.empresa?.nombre_empresa || 'CUBI Servicios'}</h1>
                                        {q.empresa?.direccion && <p className="text-[13px] text-slate-500 mb-0.5">{q.empresa.direccion}</p>}
                                        {q.empresa?.correo && <p className="text-[13px] text-slate-500 mb-0.5">{q.empresa.correo}</p>}
                                        {q.empresa?.telefono && <p className="text-[13px] text-slate-500 mb-0.5">{q.empresa.telefono}</p>}
                                        {q.empresa?.rfc && <p className="text-[13px] text-slate-500">{q.empresa.rfc}</p>}
                                    </div>
                                </div>

                                {/* Right Side: Title and Details */}
                                <div className="w-full md:w-auto text-center md:text-right border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-8">
                                    <h2 className="text-2xl sm:text-3xl font-bold tracking-widest text-slate-700 uppercase mb-6">Cotización</h2>
                                    
                                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px] text-right">
                                        <span className="font-bold text-slate-600">Folio:</span>
                                        <span className="font-bold text-slate-900">#{q.folio}</span>
                                        
                                        <span className="font-bold text-slate-600">Fecha:</span>
                                        <span className="text-slate-700">{q.fecha}</span>
                                        
                                        <span className="font-bold text-slate-600">Vence:</span>
                                        <span className="text-slate-700">{new Date(result.expires_at).toLocaleDateString('es-MX')}</span>
                                    </div>
                                </div>
                            </header>

                            {/* Client Info Section */}
                            <section className="bg-[#f8fafc] -mx-8 sm:-mx-12 px-8 sm:px-12 py-6 mb-10">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Cotización Para:</h3>
                                <div className="text-xl font-bold text-slate-800">{q.nombre_cliente}</div>
                                {q.cliente_telefono && <div className="text-[13px] text-slate-500 mt-1">Tel: {q.cliente_telefono}</div>}
                                {q.cliente_correo && <div className="text-[13px] text-slate-500 mt-0.5">Correo: {q.cliente_correo}</div>}
                            </section>

                            {/* Items Table */}
                            <section className="mb-10">
                                <div className="hidden sm:grid grid-cols-[60px_1fr_120px_120px] gap-4 pb-3 border-b-2 border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <div>Cant.</div>
                                    <div>Descripción / Producto</div>
                                    <div className="text-right">Precio Público</div>
                                    <div className="text-right">Importe</div>
                                </div>
                                
                                <div className="divide-y divide-slate-50">
                                    {q.articulos.map((item, index) => (
                                        <div key={index} className="py-4 flex flex-col sm:grid sm:grid-cols-[60px_1fr_120px_120px] gap-2 sm:gap-4 items-start sm:items-center">
                                            <div className="text-[13px] text-slate-600 font-medium sm:block hidden">{item.cantidad}</div>
                                            
                                            <div className="text-[13px] font-bold text-slate-800 pr-4">
                                                <div className="sm:hidden text-xs font-normal text-slate-500 mb-1">Cant: {item.cantidad}</div>
                                                {item.articulo}
                                                {item.descuento != null && <div className="text-xs font-normal text-amber-600 mt-0.5">Descuento: {item.descuento}%</div>}
                                                {item.impuesto_texto && <div className="text-xs font-normal text-slate-400 mt-0.5">{item.impuesto_texto}</div>}
                                            </div>
                                            
                                            <div className="text-[13px] text-slate-500 sm:text-right w-full sm:w-auto">
                                                <span className="sm:hidden font-medium mr-2">Precio:</span>
                                                {money(item.precioUnitario)}
                                            </div>
                                            
                                            <div className="text-[13px] font-bold text-slate-800 sm:text-right w-full sm:w-auto">
                                                <span className="sm:hidden font-medium mr-2">Importe:</span>
                                                {money(item.total)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Footer Info (Terms & Totals) */}
                            <div className="flex flex-col md:flex-row gap-10 md:gap-4 justify-between border-t border-slate-100 pt-8 mt-8">
                                {/* Left Side: Terms */}
                                <div className="md:w-[50%]">
                                    {q.terminos && (
                                        <div className="mb-8">
                                            <h3 className="text-[11px] font-bold text-slate-800 mb-2">Términos y Condiciones</h3>
                                            <p className="text-[12px] text-slate-500 whitespace-pre-wrap leading-relaxed">{q.terminos}</p>
                                        </div>
                                    )}
                                    
                                    <div>
                                        <h3 className="text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-1">Atentamente:</h3>
                                        <p className="text-[14px] font-bold text-blue-700">{q.empresa?.nombre_empresa || 'CUBI Servicios'}</p>
                                    </div>
                                </div>

                                {/* Right Side: Totals */}
                                <div className="md:w-[280px] self-start md:self-auto w-full">
                                    <div className="space-y-3 text-[13px]">
                                        {q.subtotal != null && (
                                            <div className="flex justify-between text-slate-600">
                                                <span>Subtotal:</span>
                                                <span>{money(q.subtotal)}</span>
                                            </div>
                                        )}
                                        {q.ajuste && (
                                            <div className="flex justify-between text-slate-600">
                                                <span>{q.ajuste.nombre} ({q.ajuste.porcentaje}%):</span>
                                                <span>{money(q.ajuste.importe)}</span>
                                            </div>
                                        )}
                                        {q.ajuste_texto && <p className="text-xs text-slate-400 text-right">{q.ajuste_texto}</p>}
                                        {q.impuestos_texto && <p className="text-xs text-slate-400 text-right">{q.impuestos_texto}</p>}
                                        
                                        <div className="pt-3 mt-3 flex justify-between items-end">
                                            <span className="font-bold text-blue-600 text-base">Total:</span>
                                            <span className="text-2xl font-bold text-blue-600">{money(q.total)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Interaction Section */}
                {status === 'answered' && (
                    <section className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 border border-slate-200 text-center" role="status">
                        <div className="flex justify-center mb-4">
                            {result.response.decision === 'approved' 
                                ? <CheckCircle2 className="w-12 h-12 text-green-500" aria-hidden="true" /> 
                                : <XCircle className="w-12 h-12 text-red-500" aria-hidden="true" />
                            }
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">
                            Cotización {result.response.decision === 'approved' ? 'Aprobada' : 'Rechazada'}
                        </h2>
                        <p className="text-slate-600 mb-4">Respuesta registrada el {dateTime(result.response.responded_at)}.</p>
                        
                        {result.response.comment && (
                            <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-100 max-w-lg mx-auto mb-6">
                                <p className="text-sm font-semibold text-slate-700 mb-1">Comentario adjunto:</p>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap">{result.response.comment}</p>
                            </div>
                        )}
                        <p className="text-sm text-slate-500">Esta versión ya fue respondida. Contacta a la empresa si necesitas algún cambio.</p>
                    </section>
                )}

                {status === 'pending' && (
                    <section className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 border border-slate-200" aria-labelledby="respuesta">
                        <h2 id="respuesta" className="text-lg font-bold text-slate-800 mb-6 text-center sm:text-left">¿Deseas aceptar esta cotización?</h2>
                        
                        {!decision ? (
                            <div className="grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto sm:mx-0">
                                <button disabled={sending} onClick={() => setDecision('approved')} className={`${button} bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 transition-all`}>
                                    Aprobar cotización
                                </button>
                                <button disabled={sending} onClick={() => setDecision('rejected')} className={`${button} bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 transition-all`}>
                                    Rechazar cotización
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={respond} className="space-y-5 bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <h3 ref={confirmation} tabIndex={-1} className="font-semibold text-slate-800 text-lg">
                                    Confirmar {decision === 'approved' ? 'aprobación' : 'rechazo'} (Versión {result.version})
                                </h3>
                                <p className="text-sm text-slate-600">Tu decisión quedará registrada y no podrá modificarse desde este enlace.</p>
                                
                                <label className="block mt-4">
                                    <span className="text-sm font-medium text-slate-700 mb-2 block">Agregar comentario (opcional)</span>
                                    <textarea 
                                        disabled={sending} 
                                        maxLength={2000} 
                                        value={comment} 
                                        onChange={e => setComment(e.target.value)} 
                                        placeholder={decision === 'approved' ? "Ej. Todo de acuerdo, procedan..." : "Ej. El precio es mayor a lo esperado..."}
                                        className="block w-full min-h-[120px] rounded-xl border-slate-300 p-4 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm resize-none" 
                                    />
                                </label>
                                
                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <button disabled={sending} type="submit" className={`${button} bg-blue-600 text-white flex-1`}>
                                        {sending ? 'Registrando respuesta…' : 'Confirmar y enviar respuesta'}
                                    </button>
                                    <button disabled={sending} type="button" onClick={() => setDecision(null)} className={`${button} bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex-1 sm:flex-none`}>
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>
                )}
                
                <footer className="text-center text-xs text-slate-400 py-6">
                    Enlace privado de consulta. Compártelo únicamente con las personas autorizadas.
                </footer>
            </div>
        </main>
    );
}
