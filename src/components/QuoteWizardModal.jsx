import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import TurnstileWidget from './TurnstileWidget';
import { sanitizeInput, isSuspiciousPayload, validatePhoneNumber, validateEmailAddress } from '../utils/security';
import {
    X,
    Camera,
    Wrench,
    Zap,
    DoorClosed,
    Monitor,
    Cpu,
    Code2,
    Wifi,
    Printer,
    Home,
    Store,
    Building2,
    GraduationCap,
    Factory,
    HelpCircle,
    MapPin,
    User,
    Phone,
    Mail,
    FileText,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Send,
    Loader2,
    Copy,
    Check,
    AlertCircle
} from 'lucide-react';

export const QUOTE_SERVICES = [
    { id: 'instalacion-cctv', label: 'Instalación de Cámaras de Seguridad', category: 'Seguridad', icon: Camera },
    { id: 'servicio-cctv', label: 'Servicio a CCTV Instalados', category: 'Seguridad', icon: Wrench },
    { id: 'cerco-electrico', label: 'Cercos Eléctricos', category: 'Seguridad', icon: Zap },
    { id: 'videoporteros', label: 'Videoporteros', category: 'Acceso', icon: DoorClosed },
    { id: 'reparacion-pc', label: 'Reparación de Computadoras', category: 'Cómputo', icon: Monitor },
    { id: 'ensamble-pc', label: 'Ensamble de Computadoras', category: 'Cómputo', icon: Cpu },
    { id: 'instalacion-software', label: 'Instalación de Software', category: 'Software', icon: Code2 },
    { id: 'redes-wifi', label: 'Redes, Routers, Mesh y Repetidores', category: 'Redes', icon: Wifi },
    { id: 'reparacion-impresoras', label: 'Reparación de Impresoras', category: 'Impresoras', icon: Printer },
];

const PROPERTY_TYPES = [
    { id: 'Casa', label: 'Casa', icon: Home },
    { id: 'Negocio', label: 'Negocio', icon: Store },
    { id: 'Oficina', label: 'Oficina', icon: Building2 },
    { id: 'Escuela', label: 'Escuela', icon: GraduationCap },
    { id: 'Industria', label: 'Industria', icon: Factory },
    { id: 'Otro', label: 'Otro', icon: HelpCircle },
];

const QuoteWizardModal = ({ isOpen, onClose, initialServiceId = null }) => {
    const [step, setStep] = useState(1);
    const [selectedServices, setSelectedServices] = useState([]);
    const [propertyType, setPropertyType] = useState('');
    const [otherPropertyType, setOtherPropertyType] = useState('');
    const [streetAddress, setStreetAddress] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [city, setCity] = useState('Acayucan, Veracruz');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resultFolio, setResultFolio] = useState('');
    const [copiedFolio, setCopiedFolio] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');
    const [honeypotField, setHoneypotField] = useState('');

    const modalBodyRef = useRef(null);
    const lastStepChangeTimeRef = useRef(0);
    const backdropMouseDownRef = useRef(false);

    // Reset or initialize when modal is opened
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setError('');
            setIsSubmitting(false);
            setResultFolio('');
            setCopiedFolio(false);
            setTurnstileToken('');
            setHoneypotField('');
            if (initialServiceId) {
                setSelectedServices([initialServiceId]);
            } else {
                setSelectedServices([]);
            }
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, initialServiceId]);

    // Scroll to top of body when step changes
    useEffect(() => {
        if (modalBodyRef.current) {
            modalBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [step]);

    if (!isOpen) return null;

    const toggleService = (id) => {
        setError('');
        setSelectedServices(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleNextStep1 = () => {
        setError('');
        if (selectedServices.length === 0) {
            setError('Por favor selecciona al menos un servicio para continuar.');
            return;
        }
        lastStepChangeTimeRef.current = Date.now();
        setStep(2);
    };

    const handleNextStep2 = () => {
        setError('');
        if (!propertyType) {
            setError('Por favor selecciona el tipo de inmueble.');
            return;
        }
        if (propertyType === 'Otro' && !otherPropertyType.trim()) {
            setError('Por favor especifica el tipo de inmueble.');
            return;
        }
        if (!streetAddress.trim()) {
            setError('Por favor ingresa la calle y número donde se requiere el servicio.');
            return;
        }
        lastStepChangeTimeRef.current = Date.now();
        setStep(3);
    };

    const handleBack = () => {
        setError('');
        lastStepChangeTimeRef.current = Date.now();
        if (step > 1) {
            setStep(prev => prev - 1);
        }
    };

    const getSelectedServiceLabels = () => {
        return selectedServices
            .map(id => QUOTE_SERVICES.find(s => s.id === id)?.label)
            .filter(Boolean);
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setError('');

        // Anti-skip guard: Prevent submitting if user is not in step 3
        if (step !== 3 || isSubmitting) {
            return;
        }

        // Anti-double-click guard: Reject submission if step 3 was reached less than 400ms ago
        if (Date.now() - lastStepChangeTimeRef.current < 400) {
            return;
        }

        if (!clientName.trim()) {
            setError('Por favor ingresa tu nombre completo.');
            return;
        }

        // 1. Detección de trampa anti-bot (Honeypot)
        if (honeypotField) {
            setIsSubmitting(true);
            setTimeout(() => {
                setIsSubmitting(false);
                setResultFolio('COT-VERIFICADA');
                setStep(4);
            }, 800);
            return;
        }

        // 2. Detección de inyecciones de código o spam automatizado
        if (isSuspiciousPayload(clientName) || isSuspiciousPayload(note) || isSuspiciousPayload(streetAddress)) {
            setError('Por razones de seguridad, el texto contiene caracteres o enlaces no permitidos.');
            return;
        }

        // 3. Validación estricta de teléfono (10 a 15 dígitos)
        if (!validatePhoneNumber(clientPhone)) {
            setError('Por favor ingresa un número de teléfono o WhatsApp válido (entre 10 y 15 dígitos).');
            return;
        }

        // 4. Validación de correo electrónico seguro
        if (clientEmail.trim() && !validateEmailAddress(clientEmail)) {
            setError('Por favor ingresa un formato de correo electrónico válido.');
            return;
        }

        const finalProperty = propertyType === 'Otro' ? `Otro (${sanitizeInput(otherPropertyType, 80)})` : propertyType;
        const fullAddress = [
            sanitizeInput(streetAddress, 150),
            sanitizeInput(neighborhood, 100),
            sanitizeInput(city, 100)
        ].filter(Boolean).join(', ');

        const payload = {
            servicios: getSelectedServiceLabels(),
            tipo_inmueble: sanitizeInput(finalProperty, 100),
            direccion: fullAddress,
            nombre: sanitizeInput(clientName, 100),
            telefono: clientPhone.replace(/\D/g, '').slice(0, 15),
            correo: clientEmail.trim() ? sanitizeInput(clientEmail, 100) : undefined,
            nota: note.trim() ? sanitizeInput(note, 1000) : undefined,
            cf_token: turnstileToken || undefined,
            hp_check: honeypotField || undefined
        };

        setIsSubmitting(true);

        try {
            let responseData = null;

            if (supabase && supabase.functions) {
                const { data, error: fnErr } = await supabase.functions.invoke('solicitar-cotizacion', {
                    body: payload
                });

                if (fnErr) {
                    throw new Error(fnErr.message || 'No fue posible comunicar con el servidor.');
                }
                responseData = data;
            } else {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                const res = await fetch(`${supabaseUrl}/functions/v1/solicitar-cotizacion`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseAnonKey,
                        'Authorization': `Bearer ${supabaseAnonKey}`
                    },
                    body: JSON.stringify(payload)
                });
                responseData = await res.json();
                if (!res.ok) {
                    throw new Error(responseData?.error || 'Error al enviar la solicitud.');
                }
            }

            if (!responseData || !responseData.success) {
                throw new Error(responseData?.error || 'No se pudo completar el registro de la cotización.');
            }

            const assignedFolio = responseData?.data?.folio || 'COT-REGISTRADA';
            setResultFolio(assignedFolio);
            setStep(4);
        } catch (err) {
            console.error('Error al procesar solicitud de cotización:', err);
            setError(err.message || 'Ocurrió un error inesperado al enviar la solicitud. Por favor intenta de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyFolio = () => {
        if (!resultFolio) return;
        navigator.clipboard.writeText(resultFolio);
        setCopiedFolio(true);
        setTimeout(() => setCopiedFolio(false), 2500);
    };

    // Safe backdrop click handlers: only close if user deliberately mousedowned AND mouseupped strictly on the backdrop
    const handleBackdropMouseDown = (e) => {
        if (e.target === e.currentTarget) {
            backdropMouseDownRef.current = true;
        } else {
            backdropMouseDownRef.current = false;
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && backdropMouseDownRef.current) {
            onClose();
        }
        backdropMouseDownRef.current = false;
    };

    const stepTitles = [
        { num: 1, label: 'Servicios' },
        { num: 2, label: 'Inmueble y Dirección' },
        { num: 3, label: 'Tus Datos' },
    ];

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm"
            onMouseDown={handleBackdropMouseDown}
            onClick={handleBackdropClick}
        >
            <div
                className="w-full max-w-2xl bg-white dark:bg-[#0F1F33] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#1E3A5F] overflow-hidden flex flex-col max-h-[92vh]"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="bg-[#122B47] text-white px-6 py-5 flex items-center justify-between shrink-0">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#38A8E8]">
                            CUBI Servicios · Cotizador en Línea
                        </p>
                        <h3 className="text-lg sm:text-xl font-bold mt-0.5">
                            {step === 1 && 'Paso 1: ¿Qué servicio necesitas?'}
                            {step === 2 && 'Paso 2: Tipo de inmueble y ubicación'}
                            {step === 3 && 'Paso 3: Tus datos de contacto'}
                            {step === 4 && '¡Solicitud lista para enviar!'}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar cotizador"
                        className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress Bar (Steps 1 to 3) */}
                {step <= 3 && (
                    <div className="px-6 py-3.5 bg-slate-50 dark:bg-[#0B1726] border-b border-slate-200 dark:border-[#1C3350] shrink-0">
                        <div className="flex items-center justify-between gap-2">
                            {stepTitles.map((s, idx) => {
                                const isActive = step === s.num;
                                const isCompleted = step > s.num;
                                return (
                                    <React.Fragment key={s.num}>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                                                    isCompleted
                                                        ? 'bg-[#1987C6] text-white'
                                                        : isActive
                                                        ? 'bg-[#1987C6] text-white ring-4 ring-[#1987C6]/20'
                                                        : 'bg-slate-200 dark:bg-[#1A314D] text-slate-500 dark:text-slate-400'
                                                }`}
                                            >
                                                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                                            </div>
                                            <span
                                                className={`text-xs font-semibold hidden sm:inline ${
                                                    isActive || isCompleted
                                                        ? 'text-[#122B47] dark:text-white'
                                                        : 'text-slate-400 dark:text-slate-500'
                                                }`}
                                            >
                                                {s.label}
                                            </span>
                                        </div>
                                        {idx < stepTitles.length - 1 && (
                                            <div
                                                className={`flex-1 h-1 rounded-full transition-colors ${
                                                    step > s.num
                                                        ? 'bg-[#1987C6]'
                                                        : 'bg-slate-200 dark:bg-[#1A314D]'
                                                }`}
                                            />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Modal Body */}
                <div ref={modalBodyRef} className="p-6 overflow-y-auto flex-1">
                    
                    {error && (
                        <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-medium flex items-center gap-2">
                            <span className="font-bold">Nota:</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* STEP 1: SELECT SERVICES */}
                    {step === 1 && (
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                                Selecciona uno o varios servicios de los que trabajamos para incluirlos en tu cotización:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {QUOTE_SERVICES.map((srv) => {
                                    const Icon = srv.icon;
                                    const selected = selectedServices.includes(srv.id);
                                    return (
                                        <button
                                            key={srv.id}
                                            type="button"
                                            onClick={() => toggleService(srv.id)}
                                            className={`flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                                selected
                                                    ? 'bg-[#E9F5FC] dark:bg-[#1987C6]/20 border-[#1987C6] ring-2 ring-[#1987C6]/25 shadow-sm'
                                                    : 'bg-white dark:bg-[#13263E] border-slate-200 dark:border-[#1E3A5F] hover:border-[#1987C6]/60'
                                            }`}
                                        >
                                            <div
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                                    selected
                                                        ? 'bg-[#1987C6] text-white'
                                                        : 'bg-slate-100 dark:bg-[#0B1726] text-[#1987C6] dark:text-[#38A8E8]'
                                                }`}
                                            >
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold leading-snug ${selected ? 'text-[#122B47] dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                                                    {srv.label}
                                                </p>
                                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                    {srv.category}
                                                </span>
                                            </div>
                                            <div
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                    selected
                                                        ? 'border-[#1987C6] bg-[#1987C6] text-white'
                                                        : 'border-slate-300 dark:border-slate-600'
                                                }`}
                                            >
                                                {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: PROPERTY TYPE & ADDRESS */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-[#122B47] dark:text-white mb-3">
                                    Tipo de inmueble <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {PROPERTY_TYPES.map((prop) => {
                                        const Icon = prop.icon;
                                        const active = propertyType === prop.id;
                                        return (
                                            <button
                                                key={prop.id}
                                                type="button"
                                                onClick={() => {
                                                    setPropertyType(prop.id);
                                                    setError('');
                                                }}
                                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all cursor-pointer ${
                                                    active
                                                        ? 'bg-[#E9F5FC] dark:bg-[#1987C6]/20 border-[#1987C6] ring-2 ring-[#1987C6]/25 text-[#122B47] dark:text-white'
                                                        : 'bg-white dark:bg-[#13263E] border-slate-200 dark:border-[#1E3A5F] text-slate-700 dark:text-slate-300 hover:border-[#1987C6]/60'
                                                }`}
                                            >
                                                <Icon className={`w-6 h-6 ${active ? 'text-[#1987C6] dark:text-[#38A8E8]' : 'text-slate-400'}`} />
                                                <span className="text-sm font-bold">{prop.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {propertyType === 'Otro' && (
                                    <div className="mt-3">
                                        <label htmlFor="quote-other-type" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                            Especifica el tipo de inmueble:
                                        </label>
                                        <input
                                            id="quote-other-type"
                                            type="text"
                                            value={otherPropertyType}
                                            onChange={(e) => setOtherPropertyType(e.target.value)}
                                            placeholder="Ej. Bodega, Rancho, Consultorio, etc."
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#244369] bg-white dark:bg-[#0B1726] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1987C6]"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-[#1C3350]">
                                <div className="flex items-center gap-2 text-sm font-bold text-[#122B47] dark:text-white">
                                    <MapPin className="w-4 h-4 text-[#1987C6]" />
                                    <span>Dirección donde se requiere el servicio</span>
                                </div>

                                <div>
                                    <label htmlFor="quote-street-address" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                                        Calle y número <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="quote-street-address"
                                        type="text"
                                        value={streetAddress}
                                        onChange={(e) => setStreetAddress(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleNextStep2();
                                            }
                                        }}
                                        placeholder="Ej. Benito Barriovero #601"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#244369] bg-white dark:bg-[#0B1726] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1987C6]"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="quote-neighborhood" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                                            Colonia o referencia
                                        </label>
                                        <input
                                            id="quote-neighborhood"
                                            type="text"
                                            value={neighborhood}
                                            onChange={(e) => setNeighborhood(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleNextStep2();
                                                }
                                            }}
                                            placeholder="Ej. Col. Centro, frente al parque"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#244369] bg-white dark:bg-[#0B1726] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1987C6]"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="quote-city" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                                            Ciudad / Municipio
                                        </label>
                                        <input
                                            id="quote-city"
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleNextStep2();
                                                }
                                            }}
                                            placeholder="Acayucan, Veracruz"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#244369] bg-white dark:bg-[#0B1726] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1987C6]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: CONTACT DETAILS & NOTE */}
                    {step === 3 && (
                        <div className="space-y-5">
                            
                            {/* Summary of Steps 1 & 2 */}
                            <div className="p-4 rounded-xl bg-[#E9F5FC]/80 dark:bg-[#0B1726] border border-[#1987C6]/30 text-xs space-y-1.5">
                                <p className="font-bold text-[#122B47] dark:text-[#38A8E8] uppercase tracking-wider text-[11px]">
                                    Resumen de tu solicitud
                                </p>
                                <p className="text-slate-700 dark:text-slate-300">
                                    <strong>Servicio(s):</strong> {getSelectedServiceLabels().join(', ')}
                                </p>
                                <p className="text-slate-700 dark:text-slate-300">
                                    <strong>Inmueble:</strong> {propertyType === 'Otro' ? otherPropertyType : propertyType} · <strong>Ubicación:</strong> {[streetAddress, neighborhood, city].filter(Boolean).join(', ')}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="quote-client-name" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 cursor-pointer">
                                        <User className="w-3.5 h-3.5 text-[#1987C6]" />
                                        <span>Nombre completo <span className="text-red-500">*</span></span>
                                    </label>
                                    <input
                                        id="quote-client-name"
                                        type="text"
                                        required
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        placeholder="Ej. Juan Pérez"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#244369] bg-white dark:bg-[#0B1726] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1987C6]"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="quote-client-phone" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 cursor-pointer">
                                        <Phone className="w-3.5 h-3.5 text-[#1987C6]" />
                                        <span>Teléfono / WhatsApp <span className="text-red-500">*</span></span>
                                    </label>
                                    <input
                                        id="quote-client-phone"
                                        type="tel"
                                        required
                                        value={clientPhone}
                                        onChange={(e) => setClientPhone(e.target.value)}
                                        placeholder="Ej. 924 104 0806"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#244369] bg-white dark:bg-[#0B1726] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1987C6]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="quote-client-email" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 cursor-pointer">
                                    <Mail className="w-3.5 h-3.5 text-[#1987C6]" />
                                    <span>Correo electrónico (opcional, para enviarte cotización formal)</span>
                                </label>
                                <input
                                    id="quote-client-email"
                                    type="email"
                                    value={clientEmail}
                                    onChange={(e) => setClientEmail(e.target.value)}
                                    placeholder="correo@ejemplo.com"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#244369] bg-white dark:bg-[#0B1726] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1987C6]"
                                />
                            </div>

                            <div>
                                <label htmlFor="quote-client-note" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 cursor-pointer">
                                    <FileText className="w-3.5 h-3.5 text-[#1987C6]" />
                                    <span>Nota o detalles adicionales</span>
                                </label>
                                <textarea
                                    id="quote-client-note"
                                    rows="3"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Cuéntanos más: cantidad aproximada de cámaras, metros de barda, falla que presenta tu equipo o el horario en que podemos contactarte..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#244369] bg-white dark:bg-[#0B1726] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1987C6]"
                                />
                            </div>

                            {/* Honeypot Anti-Bot Field (Invisible para humanos, los bots lo llenan) */}
                            <input
                                type="text"
                                name="company_security_code_hp"
                                tabIndex={-1}
                                autoComplete="off"
                                value={honeypotField}
                                onChange={(e) => setHoneypotField(e.target.value)}
                                className="hidden opacity-0 pointer-events-none absolute -left-[9999px]"
                                aria-hidden="true"
                            />

                            {/* Cloudflare Turnstile Human Verification Widget */}
                            <div className="pt-2">
                                <TurnstileWidget
                                    onVerify={(token) => setTurnstileToken(token)}
                                    onExpire={() => setTurnstileToken('')}
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 4: CONFIRMATION VIA EMAIL */}
                    {step === 4 && (
                        <div className="py-6 text-center space-y-6">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                                <CheckCircle2 className="w-9 h-9" />
                            </div>

                            <div className="max-w-md mx-auto space-y-2">
                                <h4 className="text-xl sm:text-2xl font-display font-extrabold text-[#122B47] dark:text-white">
                                    ¡Solicitud enviada con éxito!
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    Gracias, <strong className="text-slate-900 dark:text-white">{clientName}</strong>. Tu requerimiento ha sido despachado directamente al correo de nuestro equipo técnico.
                                </p>
                            </div>

                            {/* Folio Box with Copy */}
                            <div className="max-w-xs mx-auto p-4 rounded-2xl bg-[#F0F7FC] dark:bg-[#122338] border border-[#CDE3F5] dark:border-[#203D60] text-center">
                                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#1987C6] dark:text-[#4BB3EC] block">
                                    Folio de Cotización
                                </span>
                                <div className="mt-1 flex items-center justify-center gap-2">
                                    <span className="font-mono text-xl font-extrabold text-[#122B47] dark:text-white tracking-wider">
                                        {resultFolio}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyFolio}
                                        title="Copiar folio"
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#1987C6] hover:bg-white dark:hover:bg-[#1B2F49] transition-colors cursor-pointer"
                                    >
                                        {copiedFolio ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                {copiedFolio && (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block">
                                        ¡Folio copiado al portapapeles!
                                    </span>
                                )}
                            </div>

                            <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-50 dark:bg-[#0E1A29] border border-slate-200/80 dark:border-[#1E344E] text-xs text-slate-600 dark:text-slate-300 text-left space-y-1.5">
                                <p className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1987C6] shrink-0" />
                                    <span>Nos pondremos en contacto contigo al <strong>{clientPhone}</strong>.</span>
                                </p>
                                {clientEmail && (
                                    <p className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                                        <Mail className="w-3.5 h-3.5 text-[#1987C6] shrink-0" />
                                        <span>Te enviamos una copia de confirmación a <strong>{clientEmail}</strong>.</span>
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                                <a
                                    href={`https://wa.me/529241040806?text=${encodeURIComponent(`Hola CUBI Servicios, envié mi cotización en línea con el folio ${resultFolio}.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#25D366] hover:bg-[#20BA5A] transition-colors shadow-sm"
                                >
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                    </svg>
                                    <span>Escribir por WhatsApp si es urgente</span>
                                </a>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1A314D] hover:bg-slate-200 dark:hover:bg-[#234164] transition-colors cursor-pointer"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer Actions */}
                {step <= 3 && (
                    <div className="px-6 py-4 bg-slate-50 dark:bg-[#0B1726] border-t border-slate-200 dark:border-[#1C3350] flex items-center justify-between gap-3 shrink-0">
                        {step > 1 ? (
                            <button
                                key="btn-modal-back"
                                type="button"
                                onClick={handleBack}
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-[#1A314D] transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Anterior</span>
                            </button>
                        ) : (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                {selectedServices.length > 0
                                    ? `${selectedServices.length} servicio(s) seleccionado(s)`
                                    : 'Puedes elegir más de uno'}
                            </div>
                        )}

                        {step === 1 && (
                            <button
                                key="btn-step-1-next"
                                type="button"
                                onClick={handleNextStep1}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1987C6] hover:bg-[#146FA4] active:scale-95 shadow-md shadow-[#1987C6]/25 transition-all cursor-pointer"
                            >
                                <span>Siguiente</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}

                        {step === 2 && (
                            <button
                                key="btn-step-2-next"
                                type="button"
                                onClick={handleNextStep2}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1987C6] hover:bg-[#146FA4] active:scale-95 shadow-md shadow-[#1987C6]/25 transition-all cursor-pointer"
                            >
                                <span>Siguiente</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                key="btn-step-3-submit"
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all cursor-pointer ${
                                    isSubmitting
                                        ? 'bg-[#1987C6]/70 cursor-not-allowed'
                                        : 'bg-[#1987C6] hover:bg-[#146FA4] active:scale-95 shadow-md shadow-[#1987C6]/25'
                                }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Enviando cotización...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        <span>Solicitar Cotización por Correo</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuoteWizardModal;
