import React, { useState, useEffect, useMemo } from 'react';
import {
    X,
    Receipt,
    Copy,
    Check,
    ExternalLink,
    MessageCircle,
    Phone,
    User,
    Link2,
    RotateCcw,
    Loader2
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { generateToken } from '../utils/token';

const BASE_INVOICE_URL = 'https://app.cubiservicios.lat/facturacion/solicitud';

const getExistingToken = (service) => {
    if (!service) return '';
    const raw = service.token || service.original?.token || '';
    return String(raw).trim();
};

const getFallbackCode = (service) => {
    if (!service) return generateToken(8);
    const rawFolio =
        service.folio ??
        service.orden_numero ??
        service.servicio_numero ??
        service.original?.orden_numero ??
        service.original?.servicio_numero ??
        service.id;

    if (rawFolio !== undefined && rawFolio !== null && String(rawFolio).trim()) {
        const sanitized = String(rawFolio).trim().replace(/[^a-zA-Z0-9_-]/g, '');
        if (sanitized) return sanitized;
    }
    return generateToken(8);
};

const formatWhatsAppPhone = (rawPhone) => {
    const digits = String(rawPhone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `52${digits}`;
    return digits;
};

const InvoiceInvitationModal = ({ isOpen, onClose, service, darkMode, user, onTokenGenerated }) => {
    const clientName = useMemo(() => {
        const raw =
            service?.cliente ||
            service?.cliente_nombre ||
            service?.original?.cliente_nombre ||
            '';
        return String(raw).trim() || 'Cliente';
    }, [service]);

    const initialPhone = useMemo(() => {
        const raw =
            service?.cliente_telefono ||
            service?.original?.cliente_telefono ||
            '';
        return String(raw).trim();
    }, [service]);

    const [invitationCode, setInvitationCode] = useState('');
    const [generatingToken, setGeneratingToken] = useState(false);

    useEffect(() => {
        if (!isOpen || !service) return;

        let cancelled = false;

        const ensureToken = async () => {
            const existing = getExistingToken(service);
            if (existing) {
                setInvitationCode(existing);
                setGeneratingToken(false);
                return;
            }

            const tableName = service.tableName;
            const recordId = service.id ?? service.original?.id;

            if (supabase && tableName && recordId !== undefined && recordId !== null) {
                setGeneratingToken(true);
                const newToken = generateToken(8);
                try {
                    const { error } = await supabase
                        .from(tableName)
                        .update({ token: newToken })
                        .eq('id', recordId);

                    if (!cancelled) {
                        if (!error) {
                            setInvitationCode(newToken);
                            if (typeof onTokenGenerated === 'function') {
                                onTokenGenerated(service, newToken);
                            }
                        } else {
                            console.warn('No se pudo guardar token en el servicio:', error.message);
                            setInvitationCode(getFallbackCode(service));
                        }
                    }
                } catch (err) {
                    if (!cancelled) {
                        console.warn('Excepción al generar token de servicio:', err);
                        setInvitationCode(getFallbackCode(service));
                    }
                } finally {
                    if (!cancelled) {
                        setGeneratingToken(false);
                    }
                }
            } else {
                setInvitationCode(getFallbackCode(service));
                setGeneratingToken(false);
            }
        };

        ensureToken();

        return () => {
            cancelled = true;
        };
    }, [isOpen, service]);

    const invoiceUrl = invitationCode ? `${BASE_INVOICE_URL}/${invitationCode}` : BASE_INVOICE_URL;

    const defaultMessage = useMemo(() => {
        return `Hola, ${clientName}.
Tu servicio ha sido registrado y ya puedes solicitar tu factura fiscal CFDI 4.0.
Para proporcionarnos tus datos fiscales, ingresa al siguiente enlace:
${invoiceUrl}
Una vez que completes el formulario, revisaremos tu información para continuar con la emisión de tu factura.
¡Gracias por tu preferencia!`;
    }, [clientName, invoiceUrl]);

    const [phone, setPhone] = useState(initialPhone);
    const [message, setMessage] = useState(defaultMessage);
    const [copiedMessage, setCopiedMessage] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [invitationSaved, setInvitationSaved] = useState(false);
    const [invitationSaveError, setInvitationSaveError] = useState('');

    useEffect(() => {
        if (isOpen && service) {
            setPhone(initialPhone);
            setCopiedMessage(false);
            setCopiedLink(false);
            setInvitationSaved(false);
            setInvitationSaveError('');
        }
    }, [isOpen, service, initialPhone]);

    useEffect(() => {
        if (isOpen && service) {
            setMessage(defaultMessage);
        }
    }, [isOpen, service, defaultMessage]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !service) return null;

    const cleanWhatsAppPhone = formatWhatsAppPhone(phone);
    const whatsappUrl = cleanWhatsAppPhone
        ? `https://wa.me/${cleanWhatsAppPhone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;

    const recordInvitationInSupabase = async (canal = 'whatsapp') => {
        if (!supabase || invitationSaved) return;
        setInvitationSaveError('');
        try {
            let currentUserId = user?.id || null;
            if (!currentUserId) {
                const { data: authData } = await supabase.auth.getUser();
                currentUserId = authData?.user?.id || null;
            }

            const serviceId = service.id ?? service.original?.id ?? null;
            const serviceMonto = Number(service.total ?? service.original?.total ?? 0) || 0;

            const { error } = await supabase.from('invitaciones_factura').insert([
                {
                    user_id: currentUserId,
                    tipo_servicio: service.type || 'Servicio',
                    servicio_table: service.tableName || null,
                    servicio_id: serviceId !== null ? String(serviceId) : null,
                    servicio_folio: folioLabel ? String(folioLabel) : null,
                    servicio_token: invitationCode || null,
                    cliente_nombre: clientName,
                    cliente_telefono: phone.trim() || null,
                    monto: serviceMonto,
                    enlace: invoiceUrl,
                    mensaje: message,
                    canal
                }
            ]);

            if (error) {
                console.error('Error al registrar la invitación en invitaciones_factura:', error);
                setInvitationSaveError(`No se pudo guardar en historial: ${error.message}`);
            } else {
                setInvitationSaved(true);
            }
        } catch (err) {
            console.error('Excepción al registrar invitación de factura:', err);
            setInvitationSaveError(`No se pudo guardar en historial: ${err.message}`);
        }
    };

    const handleCopyMessage = async () => {
        try {
            await navigator.clipboard.writeText(message);
            setCopiedMessage(true);
            setTimeout(() => setCopiedMessage(false), 2000);
            recordInvitationInSupabase('whatsapp');
        } catch (err) {
            console.error('Error copying message:', err);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(invoiceUrl);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
            recordInvitationInSupabase('enlace');
        } catch (err) {
            console.error('Error copying link:', err);
        }
    };

    const handleOpenWhatsApp = async () => {
        // Abrir WhatsApp inmediatamente en el gesto del usuario para evitar bloqueos de popups
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        await recordInvitationInSupabase('whatsapp');
    };

    const isEdited = message !== defaultMessage;
    const folioLabel = service.folio || service.orden_numero || service.servicio_numero || service.id;

    return (
        <div
            className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col border ${
                    darkMode
                        ? 'bg-slate-900 border-slate-800 text-slate-100'
                        : 'bg-white border-slate-200 text-slate-800'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className={`px-6 py-5 border-b flex items-center justify-between gap-4 ${
                        darkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50/70'
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className={`text-lg font-black tracking-tight truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                Invitación de Facturación
                            </h2>
                            <p className={`text-xs font-medium truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {service.type || 'Servicio'} {folioLabel ? `• #${folioLabel}` : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-2 rounded-xl transition-colors ${
                            darkMode
                                ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                : 'text-slate-400 hover:bg-slate-200/70 hover:text-slate-700'
                        }`}
                        title="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto">
                    {/* Cliente y WhatsApp */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div
                            className={`p-3.5 rounded-2xl border ${
                                darkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200/80'
                            }`}
                        >
                            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                <User className="w-3.5 h-3.5" />
                                <span>Cliente</span>
                            </div>
                            <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`} title={clientName}>
                                {clientName}
                            </p>
                        </div>

                        <div
                            className={`p-3.5 rounded-2xl border ${
                                darkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200/80'
                            }`}
                        >
                            <label
                                htmlFor="invoice-invite-phone"
                                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1"
                            >
                                <Phone className="w-3.5 h-3.5" />
                                <span>WhatsApp del Cliente</span>
                            </label>
                            <input
                                id="invoice-invite-phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Ej. 9241040806 (opcional)"
                                className={`w-full bg-transparent text-sm font-semibold focus:outline-none ${
                                    darkMode
                                        ? 'text-white placeholder-slate-500'
                                        : 'text-slate-900 placeholder-slate-400'
                                }`}
                            />
                        </div>
                    </div>

                    {/* Enlace directo */}
                    <div
                        className={`p-3.5 rounded-2xl border ${
                            darkMode ? 'bg-blue-950/20 border-blue-900/50' : 'bg-blue-50/70 border-blue-200/80'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                                <Link2 className="w-3.5 h-3.5" />
                                <span>Enlace directo al formulario (sin inicio de sesión)</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={handleCopyLink}
                                    disabled={generatingToken}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 ${
                                        darkMode
                                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                >
                                    {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                                </button>
                                <a
                                    href={invitationCode ? `/facturacion/solicitud/${invitationCode}` : '/facturacion'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                        darkMode
                                            ? 'bg-slate-800 hover:bg-slate-700 text-blue-400'
                                            : 'bg-white hover:bg-slate-100 text-blue-600 border border-slate-200'
                                    }`}
                                    title="Probar formulario en una nueva pestaña"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Probar</span>
                                </a>
                            </div>
                        </div>
                        {generatingToken ? (
                            <div className="flex items-center gap-2 text-xs text-blue-500 py-1">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Generando enlace seguro del servicio...</span>
                            </div>
                        ) : (
                            <p className={`text-xs font-mono break-all select-all ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                                {invoiceUrl}
                            </p>
                        )}
                    </div>

                    {/* Mensaje de invitación */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label
                                htmlFor="invoice-invite-message"
                                className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                            >
                                Mensaje de Invitación
                            </label>
                            <div className="flex items-center gap-2">
                                {isEdited && (
                                    <button
                                        type="button"
                                        onClick={() => setMessage(defaultMessage)}
                                        className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors ${
                                            darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Restablecer</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleCopyMessage}
                                    disabled={generatingToken}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                                        darkMode
                                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                >
                                    {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedMessage ? '¡Copiado!' : 'Copiar mensaje'}</span>
                                </button>
                            </div>
                        </div>
                        <textarea
                            id="invoice-invite-message"
                            rows={8}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={generatingToken}
                            className={`w-full p-4 rounded-2xl border text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all disabled:opacity-60 ${
                                darkMode
                                    ? 'bg-slate-950/70 border-slate-700 text-slate-100 focus:border-emerald-500'
                                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-emerald-500'
                            }`}
                        />
                        {!cleanWhatsAppPhone && (
                            <p className={`text-[11px] mt-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Sin número registrado: al abrir WhatsApp podrás elegir el contacto manualmente o escribir su número arriba.
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div
                    className={`px-6 py-4 border-t flex flex-col-reverse sm:flex-row items-center justify-between gap-3 ${
                        darkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50/70'
                    }`}
                >
                    <div className="text-xs font-semibold flex items-center gap-1.5 min-h-[20px]">
                        {invitationSaved && (
                            <span className="text-emerald-500 flex items-center gap-1.5">
                                <Check className="w-4 h-4" />
                                <span>Invitación registrada en Facturas</span>
                            </span>
                        )}
                        {!invitationSaved && invitationSaveError && (
                            <span className="text-amber-500 text-[11px] leading-tight">
                                {invitationSaveError}
                            </span>
                        )}
                    </div>
                    <div className="w-full sm:w-auto flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                                darkMode
                                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            Cerrar
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenWhatsApp}
                            disabled={generatingToken}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <MessageCircle className="w-4 h-4" />
                            <span>Abrir WhatsApp</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceInvitationModal;
