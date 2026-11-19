import React, { useState, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import {
    CheckCircle2,
    AlertCircle,
    Copy,
    Check,
    ArrowLeft,
    ChevronDown,
    Send,
    Loader2,
    ShieldCheck,
    Printer,
    FileCheck2,
    Phone,
    FileText,
    Mail
} from 'lucide-react';

// Catálogos oficiales SAT CFDI 4.0
const REGIMENES_FISCALES = [
    { code: '601', name: 'General de Ley Personas Morales', moral: true, fisica: false },
    { code: '603', name: 'Personas Morales con Fines no Lucrativos', moral: true, fisica: false },
    { code: '605', name: 'Sueldos y Salarios e Ingresos Asimilados a Salarios', moral: false, fisica: true },
    { code: '606', name: 'Arrendamiento', moral: false, fisica: true },
    { code: '607', name: 'Régimen de Enajenación o Adquisición de Bienes', moral: false, fisica: true },
    { code: '608', name: 'Demás ingresos', moral: false, fisica: true },
    { code: '610', name: 'Residentes en el Extranjero sin Establecimiento Permanente en México', moral: true, fisica: true },
    { code: '611', name: 'Ingresos por Dividendos (socios y accionistas)', moral: false, fisica: true },
    { code: '612', name: 'Personas Físicas con Actividades Empresariales y Profesionales', moral: false, fisica: true },
    { code: '614', name: 'Ingresos por intereses', moral: false, fisica: true },
    { code: '615', name: 'Régimen de los ingresos por obtención de premios', moral: false, fisica: true },
    { code: '616', name: 'Sin obligaciones fiscales', moral: false, fisica: true },
    { code: '620', name: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', moral: true, fisica: false },
    { code: '621', name: 'Incorporación Fiscal (RIF)', moral: false, fisica: true },
    { code: '622', name: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', moral: true, fisica: true },
    { code: '623', name: 'Opcional para Grupos de Sociedades', moral: true, fisica: false },
    { code: '624', name: 'Coordinados', moral: true, fisica: false },
    { code: '625', name: 'Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', moral: false, fisica: true },
    { code: '626', name: 'Régimen Simplificado de Confianza (RESICO)', moral: true, fisica: true }
];

const USOS_CFDI = [
    { code: 'G01', name: 'Adquisición de mercancías', moral: true, fisica: true },
    { code: 'G02', name: 'Devoluciones, descuentos o bonificaciones', moral: true, fisica: true },
    { code: 'G03', name: 'Gastos en general', moral: true, fisica: true },
    { code: 'I01', name: 'Construcciones', moral: true, fisica: true },
    { code: 'I02', name: 'Mobiliario y equipo de oficina por inversiones', moral: true, fisica: true },
    { code: 'I03', name: 'Equipo de transporte', moral: true, fisica: true },
    { code: 'I04', name: 'Equipo de cómputo y accesorios', moral: true, fisica: true },
    { code: 'I05', name: 'Dados, troqueles, moldes, matrices y herramental', moral: true, fisica: true },
    { code: 'I06', name: 'Comunicaciones telefónicas', moral: true, fisica: true },
    { code: 'I07', name: 'Comunicaciones satelitales', moral: true, fisica: true },
    { code: 'I08', name: 'Otra maquinaria y equipo', moral: true, fisica: true },
    { code: 'D01', name: 'Honorarios médicos, dentales y gastos hospitalarios', moral: false, fisica: true },
    { code: 'D02', name: 'Gastos médicos por incapacidad o discapacidad', moral: false, fisica: true },
    { code: 'D03', name: 'Gastos funerales', moral: false, fisica: true },
    { code: 'D04', name: 'Donativos', moral: false, fisica: true },
    { code: 'D05', name: 'Intereses reales por créditos hipotecarios', moral: false, fisica: true },
    { code: 'D06', name: 'Aportaciones voluntarias al SAR', moral: false, fisica: true },
    { code: 'D07', name: 'Primas por seguros de gastos médicos', moral: false, fisica: true },
    { code: 'D08', name: 'Gastos de transportación escolar obligatoria', moral: false, fisica: true },
    { code: 'D09', name: 'Depósitos en cuentas especiales para el ahorro', moral: false, fisica: true },
    { code: 'D10', name: 'Pagos por servicios educativos (colegiaturas)', moral: false, fisica: true },
    { code: 'S01', name: 'Sin efectos fiscales', moral: true, fisica: true },
    { code: 'CP01', name: 'Pagos', moral: true, fisica: true },
    { code: 'CN01', name: 'Nómina', moral: false, fisica: true }
];

// Validador estricto de RFC oficial SAT (CFDI 4.0)
export const validateRFC = (rawRfc) => {
    if (!rawRfc || !rawRfc.trim()) {
        return { valid: false, status: 'empty', message: 'Ingrese el RFC de 12 o 13 caracteres.' };
    }
    const clean = rawRfc.trim().toUpperCase();

    if (clean === 'XAXX010101000') {
        return { valid: true, status: 'valid', type: 'Genérico Nacional', message: 'RFC Genérico Nacional (Público en General)' };
    }
    if (clean === 'XEXX010101000') {
        return { valid: true, status: 'valid', type: 'Genérico Extranjero', message: 'RFC Genérico Extranjero' };
    }

    if (clean.length < 12) {
        return {
            valid: false,
            status: 'incomplete',
            message: `RFC incompleto: tiene ${clean.length} de 12 (moral) o 13 (física) caracteres.`
        };
    }

    if (clean.length > 13) {
        return {
            valid: false,
            status: 'invalid',
            message: 'El RFC no debe exceder de 13 caracteres.'
        };
    }

    const isMoral = clean.length === 12;
    const regex = isMoral
        ? /^[A-ZÑ&]{3}([0-9]{2})(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$/
        : /^[A-ZÑ&]{4}([0-9]{2})(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{3}$/;

    const match = clean.match(regex);
    if (!match) {
        if (isMoral && !/^[A-ZÑ&]{3}/.test(clean)) {
            return { valid: false, status: 'invalid', message: 'Los primeros 3 caracteres deben ser letras para Persona Moral.' };
        }
        if (!isMoral && !/^[A-ZÑ&]{4}/.test(clean)) {
            return { valid: false, status: 'invalid', message: 'Los primeros 4 caracteres deben ser letras para Persona Física.' };
        }
        const datePart = isMoral ? clean.slice(3, 9) : clean.slice(4, 10);
        if (!/^[0-9]{6}$/.test(datePart)) {
            return { valid: false, status: 'invalid', message: 'La sección de fecha debe contener 6 números en formato AAMMDD.' };
        }
        return { valid: false, status: 'invalid', message: 'Estructura o fecha inválida. Verifique año, mes (01-12) y día (01-31).' };
    }

    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (month === 2 && day > 29) {
        return { valid: false, status: 'invalid', message: 'Día inválido para febrero en la fecha del RFC.' };
    }
    if ([4, 6, 9, 11].includes(month) && day === 31) {
        return { valid: false, status: 'invalid', message: 'El mes indicado en el RFC solo cuenta con 30 días.' };
    }

    return {
        valid: true,
        status: 'valid',
        type: isMoral ? 'Persona Moral' : 'Persona Física',
        message: `RFC Válido (${isMoral ? 'Persona Moral - 12 car.' : 'Persona Física - 13 car.'})`
    };
};

const PublicInvoiceRequest = () => {
    const [formData, setFormData] = useState({
        rfc: '',
        razon_social: '',
        codigo_postal: '',
        regimen_fiscal: '',
        uso_cfdi: '',
        observaciones: '',
        correo: ''
    });

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successData, setSuccessData] = useState(null);
    const [copiedFolio, setCopiedFolio] = useState(false);

    const rfcValidation = useMemo(() => validateRFC(formData.rfc), [formData.rfc]);

    const cleanRfc = formData.rfc.trim().toUpperCase();
    const isPersonaMoral = cleanRfc.length === 12;
    const isPersonaFisica = cleanRfc.length === 13;

    const availableRegimenes = useMemo(() => {
        if (isPersonaMoral) return REGIMENES_FISCALES.filter(r => r.moral);
        if (isPersonaFisica) return REGIMENES_FISCALES.filter(r => r.fisica);
        return REGIMENES_FISCALES;
    }, [isPersonaMoral, isPersonaFisica]);

    const availableUsos = useMemo(() => {
        if (isPersonaMoral) return USOS_CFDI.filter(u => u.moral);
        if (isPersonaFisica) return USOS_CFDI.filter(u => u.fisica);
        return USOS_CFDI;
    }, [isPersonaMoral, isPersonaFisica]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'rfc') {
            const val = value.toUpperCase().replace(/[^A-ZÑ&0-9]/g, '').slice(0, 13);
            setFormData(prev => ({ ...prev, rfc: val }));
        } else if (name === 'codigo_postal') {
            const val = value.replace(/\D/g, '').slice(0, 5);
            setFormData(prev => ({ ...prev, codigo_postal: val }));
        } else if (name === 'razon_social') {
            setFormData(prev => ({ ...prev, razon_social: value.toUpperCase() }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        const rfc = formData.rfc.trim().toUpperCase();
        const rfcValidationResult = validateRFC(rfc);
        if (!rfcValidationResult.valid) {
            setErrorMessage(rfcValidationResult.message || 'El RFC ingresado no es válido conforme a la estructura oficial del SAT.');
            const rfcInput = document.getElementById('rfc');
            if (rfcInput) rfcInput.focus();
            return;
        }

        if (!formData.razon_social.trim()) {
            setErrorMessage('Por favor ingrese la Razón Social o Nombre completo del receptor.');
            return;
        }

        if (formData.codigo_postal.trim().length !== 5) {
            setErrorMessage('El Código Postal fiscal debe contener exactamente 5 dígitos numéricos.');
            return;
        }

        if (!formData.regimen_fiscal) {
            setErrorMessage('Por favor seleccione el Régimen Fiscal.');
            return;
        }

        if (!formData.uso_cfdi) {
            setErrorMessage('Por favor seleccione el Uso de CFDI.');
            return;
        }

        if (formData.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo.trim())) {
            setErrorMessage('El formato del correo electrónico ingresado no es válido.');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                rfc,
                razon_social: formData.razon_social.trim(),
                codigo_postal: formData.codigo_postal.trim(),
                regimen_fiscal: formData.regimen_fiscal,
                uso_cfdi: formData.uso_cfdi,
                correo: formData.correo.trim() || null,
                observaciones: formData.observaciones.trim() || null
            };

            let responseData = null;

            if (supabase && supabase.functions) {
                const { data, error } = await supabase.functions.invoke('solicitar-factura', {
                    body: payload
                });

                if (error) {
                    throw new Error(error.message || 'No fue posible comunicar con el servidor.');
                }
                responseData = data;
            } else {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                const res = await fetch(`${supabaseUrl}/functions/v1/solicitar-factura`, {
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
                    throw new Error(responseData?.error || 'Error al procesar la solicitud.');
                }
            }

            if (!responseData || !responseData.success) {
                throw new Error(responseData?.error || 'No se pudo completar el registro fiscal.');
            }

            setSuccessData({
                ...responseData.data,
                regimen_fiscal: formData.regimen_fiscal,
                uso_cfdi: formData.uso_cfdi,
                correo: formData.correo,
                codigo_postal: formData.codigo_postal,
                observaciones: formData.observaciones
            });
        } catch (err) {
            console.error('Error al registrar solicitud fiscal:', err);
            setErrorMessage(err.message || 'Ocurrió un problema de comunicación al registrar su solicitud. Por favor intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyFolio = () => {
        if (successData?.folio) {
            navigator.clipboard.writeText(successData.folio);
            setCopiedFolio(true);
            setTimeout(() => setCopiedFolio(false), 2000);
        }
    };

    const handleReset = () => {
        setFormData({
            rfc: '',
            razon_social: '',
            codigo_postal: '',
            regimen_fiscal: '',
            uso_cfdi: '',
            observaciones: '',
            correo: ''
        });
        setSuccessData(null);
        setErrorMessage('');
    };

    // Clases base de alto contraste para inputs y selects
    const baseInputClass =
        'w-full bg-[#F4F7FA] border-[1.5px] border-slate-300 rounded-lg px-4 py-3 text-[#0F2A47] text-[14.5px] font-medium placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-[#1982C4] focus:ring-4 focus:ring-[#1982C4]/15 outline-none transition-all';

    return (
        <div className="min-h-screen bg-[#E8EEF4] text-[#0F2A47] flex flex-col font-sans selection:bg-[#1982C4]/20 selection:text-[#0F2A47]">
            {/* Barra de Navegación Superior (Blanca para integración natural del logotipo) */}
            <header className="w-full bg-white border-b border-slate-300/80 px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-[0_2px_10px_rgba(15,42,71,0.05)]">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <img
                            src="LogoEmpresa.png"
                            alt="CUBI Servicios"
                            className="h-14 sm:h-16 w-auto object-contain"
                        />
                    </div>

                    <a
                        href="/"
                        className="inline-flex items-center gap-2 text-xs sm:text-[13px] font-semibold text-[#0F2A47] hover:text-[#1982C4] px-3.5 py-2 rounded-lg border border-slate-300 hover:border-[#1982C4] bg-slate-50 hover:bg-[#1982C4]/5 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Volver al inicio</span>
                        <span className="sm:hidden">Inicio</span>
                    </a>
                </div>
            </header>

            {/* Franja Corporativa en Azul Marino del Logotipo (#0F2A47) */}
            <section className="w-full bg-[#0F2A47] text-white pt-8 pb-20 sm:pt-10 sm:pb-24 px-4 sm:px-8 border-b-4 border-[#1982C4]">
                <div className="max-w-5xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-widest text-sky-200 mb-3">
                        <span className="w-2 h-2 rounded-xs bg-[#78B833]" />
                        <span>Facturación Electrónica · CFDI 4.0</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Solicitud de Factura
                    </h1>
                    <p className="text-sm sm:text-[15px] text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                        Registra tus datos exactamente como aparecen en tu Constancia de Situación Fiscal vigente emitida por el SAT.
                    </p>
                </div>
            </section>

            {/* Contenedor Principal superpuesto suavemente sobre la franja */}
            <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 -mt-12 sm:-mt-14 pb-12 z-10">
                {successData ? (
                    /* COMPROBANTE FORMAL DE RECEPCIÓN */
                    <div className="max-w-3xl mx-auto bg-white border border-slate-300/90 rounded-2xl shadow-[0_8px_30px_rgba(15,42,71,0.10)] overflow-hidden">
                        {/* Encabezado del Comprobante */}
                        <div className="bg-[#F4F7FA] border-b border-slate-200 px-6 sm:px-9 py-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#78B833]/15 border border-[#78B833]/40 text-[#4F7D1E] flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="w-7 h-7" />
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F7D1E]">
                                        Solicitud Registrada
                                    </span>
                                    <h2 className="text-xl font-bold text-[#0F2A47] mt-0.5">
                                        Comprobante de Recepción
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                                        Tus datos fueron enviados al departamento administrativo.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 sm:p-9">
                            {/* Folio Destacado */}
                            <div className="p-5 rounded-xl bg-[#0F2A47] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-widest text-sky-300 block">
                                        Folio de Seguimiento
                                    </span>
                                    <span className="text-2xl sm:text-3xl font-bold font-mono tracking-wider block mt-0.5">
                                        {successData.folio}
                                    </span>
                                    <span className="text-xs text-slate-300 block mt-1">
                                        Registrado el{' '}
                                        {new Date(successData.created_at || Date.now()).toLocaleDateString('es-MX', {
                                            day: '2-digit',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2.5">
                                    <button
                                        onClick={handleCopyFolio}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-lg bg-[#1982C4] hover:bg-[#146CA3] text-white transition-colors cursor-pointer"
                                    >
                                        {copiedFolio ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        <span>{copiedFolio ? '¡Copiado!' : 'Copiar Folio'}</span>
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors cursor-pointer"
                                    >
                                        <Printer className="w-4 h-4" />
                                        <span>Imprimir</span>
                                    </button>
                                </div>
                            </div>

                            {/* Resumen de Datos */}
                            <div className="rounded-xl border border-slate-300 overflow-hidden mb-7">
                                <div className="bg-[#F1F5F9] px-5 py-3 border-b border-slate-300 flex items-center gap-2">
                                    <FileCheck2 className="w-4 h-4 text-[#1982C4]" />
                                    <h3 className="text-xs font-bold text-[#0F2A47] uppercase tracking-wider">
                                        Resumen Fiscal Registrado
                                    </h3>
                                </div>
                                <div className="divide-y divide-slate-200 text-sm">
                                    <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-1 bg-white">
                                        <span className="text-slate-600 font-medium text-xs sm:text-sm">RFC Receptor</span>
                                        <span className="sm:col-span-2 font-mono font-bold text-[#0F2A47]">{successData.rfc}</span>
                                    </div>
                                    <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-1 bg-[#F8FAFC]">
                                        <span className="text-slate-600 font-medium text-xs sm:text-sm">Razón Social</span>
                                        <span className="sm:col-span-2 font-semibold text-[#0F2A47]">{successData.razon_social}</span>
                                    </div>
                                    <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-1 bg-white">
                                        <span className="text-slate-600 font-medium text-xs sm:text-sm">Código Postal</span>
                                        <span className="sm:col-span-2 font-mono font-semibold text-[#0F2A47]">{successData.codigo_postal}</span>
                                    </div>
                                    <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-1 bg-[#F8FAFC]">
                                        <span className="text-slate-600 font-medium text-xs sm:text-sm">Régimen Fiscal</span>
                                        <span className="sm:col-span-2 text-[#0F2A47] font-medium">
                                            <span className="font-bold text-[#1982C4]">{successData.regimen_fiscal}</span> — {REGIMENES_FISCALES.find(r => r.code === successData.regimen_fiscal)?.name || successData.regimen_fiscal}
                                        </span>
                                    </div>
                                    <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-1 bg-white">
                                        <span className="text-slate-600 font-medium text-xs sm:text-sm">Uso de CFDI</span>
                                        <span className="sm:col-span-2 text-[#0F2A47] font-medium">
                                            <span className="font-bold text-[#1982C4]">{successData.uso_cfdi}</span> — {USOS_CFDI.find(u => u.code === successData.uso_cfdi)?.name || successData.uso_cfdi}
                                        </span>
                                    </div>
                                    {successData.observaciones && (
                                        <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-1 bg-[#F8FAFC]">
                                            <span className="text-slate-600 font-medium text-xs sm:text-sm">Folio / Referencia</span>
                                            <span className="sm:col-span-2 font-medium text-[#0F2A47]">{successData.observaciones}</span>
                                        </div>
                                    )}
                                    {successData.correo && (
                                        <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-1 bg-white">
                                            <span className="text-slate-600 font-medium text-xs sm:text-sm">Correo Electrónico</span>
                                            <span className="sm:col-span-2 font-medium text-[#1982C4]">{successData.correo}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
                                <button
                                    onClick={handleReset}
                                    className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold rounded-lg border-[1.5px] border-slate-300 text-[#0F2A47] hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                    Registrar otra solicitud
                                </button>
                                <a
                                    href="/"
                                    className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold rounded-lg bg-[#0F2A47] hover:bg-[#1982C4] text-white transition-colors cursor-pointer text-center"
                                >
                                    Finalizar
                                </a>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* DISEÑO EDITORIAL DE 2 COLUMNAS (FORMULARIO + GUÍA LATERAL) */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Columna Principal: Formulario */}
                        <div className="lg:col-span-8 bg-white border border-slate-300/90 rounded-2xl shadow-[0_6px_28px_rgba(15,42,71,0.08)] overflow-hidden">
                            <form onSubmit={handleSubmit}>
                                {/* Sección 1: Datos Fiscales Obligatorios (SAT) */}
                                <div className="p-6 sm:p-8">
                                    <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <span className="w-1.5 h-6 rounded-full bg-[#1982C4]" />
                                            <div>
                                                <h2 className="text-base sm:text-lg font-bold text-[#0F2A47]">
                                                    Datos Fiscales Obligatorios
                                                </h2>
                                                <p className="text-xs text-slate-600">
                                                    Campos requeridos por el SAT para timbrado CFDI 4.0
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md hidden sm:inline-block">
                                            * Obligatorio
                                        </span>
                                    </div>

                                    {errorMessage && (
                                        <div className="bg-red-50 border-[1.5px] border-red-300 text-red-900 rounded-xl p-4 mb-6 text-xs sm:text-sm flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            <span className="font-semibold leading-snug">{errorMessage}</span>
                                        </div>
                                    )}

                                    <div className="space-y-5">
                                        {/* 1. RFC */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5 gap-2">
                                                <label htmlFor="rfc" className="text-[13.5px] font-bold text-[#0F2A47]">
                                                    1. RFC del Receptor <span className="text-red-600">*</span>
                                                </label>
                                                {formData.rfc && (
                                                    <span
                                                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border inline-flex items-center gap-1.5 ${
                                                            rfcValidation.valid
                                                                ? 'bg-[#78B833]/15 text-[#3F6814] border-[#78B833]/40'
                                                                : rfcValidation.status === 'incomplete'
                                                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                                                    : 'bg-red-50 text-red-800 border-red-300'
                                                        }`}
                                                    >
                                                        {rfcValidation.valid ? (
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-[#5D9124]" />
                                                        ) : (
                                                            <AlertCircle className="w-3.5 h-3.5" />
                                                        )}
                                                        <span>
                                                            {rfcValidation.type || (rfcValidation.status === 'incomplete' ? 'Incompleto' : 'Inválido')}
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input
                                                    id="rfc"
                                                    type="text"
                                                    name="rfc"
                                                    value={formData.rfc}
                                                    onChange={handleChange}
                                                    placeholder="Ej. GOME850101AB1 o IMS421231I45"
                                                    maxLength={13}
                                                    required
                                                    className={`w-full rounded-lg px-4 py-3 text-[15px] font-mono font-semibold uppercase placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal outline-none transition-all border-[1.5px] ${
                                                        !formData.rfc
                                                            ? 'bg-[#F4F7FA] border-slate-300 text-[#0F2A47] focus:bg-white focus:border-[#1982C4] focus:ring-4 focus:ring-[#1982C4]/15'
                                                            : rfcValidation.valid
                                                                ? 'bg-white border-[#78B833] text-[#0F2A47] focus:ring-4 focus:ring-[#78B833]/15 pr-11'
                                                                : rfcValidation.status === 'incomplete'
                                                                    ? 'bg-amber-50/30 border-amber-400 text-[#0F2A47] focus:bg-white focus:ring-4 focus:ring-amber-200/40'
                                                                    : 'bg-red-50/30 border-red-400 text-red-900 focus:bg-white focus:ring-4 focus:ring-red-200/40'
                                                    }`}
                                                />
                                                {formData.rfc && rfcValidation.valid && (
                                                    <CheckCircle2 className="w-5 h-5 text-[#5D9124] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                )}
                                            </div>

                                            {formData.rfc && !rfcValidation.valid ? (
                                                <p className="text-xs text-red-700 mt-1.5 flex items-start gap-1.5 font-medium">
                                                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                                    <span>{rfcValidation.message}</span>
                                                </p>
                                            ) : formData.rfc && rfcValidation.valid ? (
                                                <p className="text-xs text-[#4F7D1E] mt-1.5 flex items-center gap-1.5 font-medium">
                                                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                                    <span>Estructura de RFC verificada correctamente.</span>
                                                </p>
                                            ) : (
                                                <p className="text-xs text-slate-600 mt-1.5">
                                                    12 caracteres para empresas (Persona Moral) o 13 para Persona Física con homoclave.
                                                </p>
                                            )}
                                        </div>

                                        {/* 2. Razón Social */}
                                        <div>
                                            <label htmlFor="razon_social" className="block text-[13.5px] font-bold text-[#0F2A47] mb-1.5">
                                                2. Razón Social o Nombre Completo <span className="text-red-600">*</span>
                                            </label>
                                            <input
                                                id="razon_social"
                                                type="text"
                                                name="razon_social"
                                                value={formData.razon_social}
                                                onChange={handleChange}
                                                placeholder="Ej. COMERCIALIZADORA DEL SUR o JUAN PEREZ LOPEZ"
                                                required
                                                className={`${baseInputClass} uppercase`}
                                            />
                                            <p className="text-xs text-slate-600 mt-1.5">
                                                Escríbelo sin régimen societario (omite <strong className="text-[#0F2A47]">S.A. de C.V.</strong>, <strong className="text-[#0F2A47]">S. de R.L.</strong>, etc.).
                                            </p>
                                        </div>

                                        {/* 3. Código Postal */}
                                        <div>
                                            <label htmlFor="codigo_postal" className="block text-[13.5px] font-bold text-[#0F2A47] mb-1.5">
                                                3. Código Postal Fiscal <span className="text-red-600">*</span>
                                            </label>
                                            <input
                                                id="codigo_postal"
                                                type="text"
                                                name="codigo_postal"
                                                value={formData.codigo_postal}
                                                onChange={handleChange}
                                                placeholder="Ej. 96000"
                                                maxLength={5}
                                                required
                                                className={`${baseInputClass} font-mono tracking-wider sm:max-w-xs`}
                                            />
                                            <p className="text-xs text-slate-600 mt-1.5">
                                                5 dígitos del domicilio fiscal registrado en tu constancia del SAT.
                                            </p>
                                        </div>

                                        {/* 4. Régimen Fiscal */}
                                        <div>
                                            <label htmlFor="regimen_fiscal" className="block text-[13.5px] font-bold text-[#0F2A47] mb-1.5">
                                                4. Régimen Fiscal <span className="text-red-600">*</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    id="regimen_fiscal"
                                                    name="regimen_fiscal"
                                                    value={formData.regimen_fiscal}
                                                    onChange={handleChange}
                                                    required
                                                    className={`w-full bg-[#F4F7FA] border-[1.5px] border-slate-300 rounded-lg px-4 py-3 pr-11 text-[14px] appearance-none focus:bg-white focus:border-[#1982C4] focus:ring-4 focus:ring-[#1982C4]/15 outline-none transition-all cursor-pointer ${
                                                        formData.regimen_fiscal ? 'text-[#0F2A47] font-semibold' : 'text-slate-500 font-normal'
                                                    }`}
                                                >
                                                    <option value="" disabled>
                                                        — Selecciona tu régimen fiscal —
                                                    </option>
                                                    {availableRegimenes.map(r => (
                                                        <option key={r.code} value={r.code} className="text-[#0F2A47] bg-white font-medium">
                                                            {r.code} — {r.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded bg-[#0F2A47]/5 flex items-center justify-center">
                                                    <ChevronDown className="w-4 h-4 text-[#0F2A47]" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 5. Uso de CFDI */}
                                        <div>
                                            <label htmlFor="uso_cfdi" className="block text-[13.5px] font-bold text-[#0F2A47] mb-1.5">
                                                5. Uso de CFDI <span className="text-red-600">*</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    id="uso_cfdi"
                                                    name="uso_cfdi"
                                                    value={formData.uso_cfdi}
                                                    onChange={handleChange}
                                                    required
                                                    className={`w-full bg-[#F4F7FA] border-[1.5px] border-slate-300 rounded-lg px-4 py-3 pr-11 text-[14px] appearance-none focus:bg-white focus:border-[#1982C4] focus:ring-4 focus:ring-[#1982C4]/15 outline-none transition-all cursor-pointer ${
                                                        formData.uso_cfdi ? 'text-[#0F2A47] font-semibold' : 'text-slate-500 font-normal'
                                                    }`}
                                                >
                                                    <option value="" disabled>
                                                        — Selecciona el uso de CFDI —
                                                    </option>
                                                    {availableUsos.map(u => (
                                                        <option key={u.code} value={u.code} className="text-[#0F2A47] bg-white font-medium">
                                                            {u.code} — {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded bg-[#0F2A47]/5 flex items-center justify-center">
                                                    <ChevronDown className="w-4 h-4 text-[#0F2A47]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sección 2: Datos Opcionales (Fondo suavemente diferenciado) */}
                                <div className="bg-[#F4F7FA] border-t border-slate-200 p-6 sm:p-8 space-y-5">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="w-1.5 h-5 rounded-full bg-slate-400" />
                                        <div>
                                            <h3 className="text-sm sm:text-[15px] font-bold text-[#0F2A47]">
                                                Referencia y Entrega Digital <span className="text-slate-500 font-normal text-xs">(opcional)</span>
                                            </h3>
                                        </div>
                                    </div>

                                    {/* 6. Folio de cotización o servicio */}
                                    <div>
                                        <label htmlFor="observaciones" className="block text-[13.5px] font-bold text-[#0F2A47] mb-1.5">
                                            Folio de cotización o servicio
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="observaciones"
                                                type="text"
                                                name="observaciones"
                                                value={formData.observaciones}
                                                onChange={handleChange}
                                                placeholder="Ej. Cotización #1204, Ticket #552 o Nota de Venta"
                                                className="w-full bg-white border-[1.5px] border-slate-300 rounded-lg pl-10 pr-4 py-3 text-[#0F2A47] text-[14.5px] font-medium placeholder:text-slate-400 placeholder:font-normal focus:border-[#1982C4] focus:ring-4 focus:ring-[#1982C4]/15 outline-none transition-all"
                                            />
                                            <FileText className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1.5">
                                            Ayuda a identificar rápidamente tu pago, servicio o nota de venta.
                                        </p>
                                    </div>

                                    {/* 7. Correo electrónico */}
                                    <div>
                                        <label htmlFor="correo" className="block text-[13.5px] font-bold text-[#0F2A47] mb-1.5">
                                            Correo electrónico
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="correo"
                                                type="email"
                                                name="correo"
                                                value={formData.correo}
                                                onChange={handleChange}
                                                placeholder="facturacion@empresa.com"
                                                className="w-full bg-white border-[1.5px] border-slate-300 rounded-lg pl-10 pr-4 py-3 text-[#0F2A47] text-[14.5px] font-medium lowercase placeholder:text-slate-400 placeholder:font-normal focus:border-[#1982C4] focus:ring-4 focus:ring-[#1982C4]/15 outline-none transition-all"
                                            />
                                            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1.5">
                                            Enviaremos los archivos <strong className="text-[#0F2A47]">XML y PDF</strong> a esta dirección en cuanto se timbre tu factura.
                                        </p>
                                    </div>

                                    {/* Botón de Envío */}
                                    <div className="pt-3">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-3.5 px-6 rounded-xl bg-[#0F2A47] hover:bg-[#1982C4] active:bg-[#146CA3] text-white font-bold text-[15px] transition-colors shadow-md shadow-[#0F2A47]/15 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                                                    <span>Registrando solicitud...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    <span>Enviar Datos para Facturación</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Columna Lateral: Guía y Soporte */}
                        <aside className="lg:col-span-4 space-y-5">
                            <div className="bg-white border border-slate-300/90 rounded-2xl shadow-[0_6px_28px_rgba(15,42,71,0.06)] p-6">
                                <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-slate-200">
                                    <div className="w-8 h-8 rounded-lg bg-[#0F2A47] text-white flex items-center justify-center">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-sm font-bold text-[#0F2A47]">
                                        Antes de enviar tus datos
                                    </h3>
                                </div>

                                <ul className="space-y-4 text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                                    <li className="flex items-start gap-2.5">
                                        <span className="w-5 h-5 rounded-full bg-[#1982C4]/15 text-[#0F2A47] font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                            1
                                        </span>
                                        <span>
                                            Ten a la mano tu <strong className="text-[#0F2A47]">Constancia de Situación Fiscal</strong> actualizada.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <span className="w-5 h-5 rounded-full bg-[#1982C4]/15 text-[#0F2A47] font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                            2
                                        </span>
                                        <span>
                                            En <strong className="text-[#0F2A47]">CFDI 4.0</strong> el Nombre o Razón Social debe ir sin régimen societario (sin S.A. de C.V.).
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <span className="w-5 h-5 rounded-full bg-[#1982C4]/15 text-[#0F2A47] font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                            3
                                        </span>
                                        <span>
                                            Al finalizar recibirás un <strong className="text-[#0F2A47]">folio de seguimiento</strong> para cualquier aclaración.
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-[#0F2A47] text-white rounded-2xl p-6 shadow-[0_6px_24px_rgba(15,42,71,0.12)]">
                                <h4 className="text-sm font-bold text-white mb-1">
                                    ¿Necesitas ayuda con tu factura?
                                </h4>
                                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                                    Si tienes dudas sobre tus datos fiscales o el estatus de tu comprobante, contáctanos directamente.
                                </p>
                                <a
                                    href="https://wa.me/529241040806"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1982C4] hover:bg-[#146CA3] text-white text-xs font-bold transition-colors"
                                >
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>WhatsApp: 924 104 0806</span>
                                </a>
                            </div>
                        </aside>
                    </div>
                )}
            </main>

            {/* Pie de Página */}
            <footer className="w-full border-t border-slate-300/80 bg-white py-5 text-center text-xs">
                <div className="max-w-5xl mx-auto px-4 flex items-center justify-center">
                    <span className="text-[#1982C4] font-semibold">© 2026, CUBI Servicios Facturación</span>
                </div>
            </footer>
        </div>
    );
};

export default PublicInvoiceRequest;
