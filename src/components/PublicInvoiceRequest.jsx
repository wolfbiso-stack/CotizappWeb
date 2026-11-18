import React, { useState, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import { 
    FileText, 
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
    FileCheck2
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

    // Genéricos autorizados por el SAT
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
    // Regex con captura de año, mes (01-12) y día (01-31)
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

    // Validación oficial y en tiempo real del RFC
    const rfcValidation = useMemo(() => validateRFC(formData.rfc), [formData.rfc]);

    // Detección de Persona Física / Moral según longitud de RFC
    const cleanRfc = formData.rfc.trim().toUpperCase();
    const rfcClean = cleanRfc;
    const isPersonaMoral = cleanRfc.length === 12;
    const isPersonaFisica = cleanRfc.length === 13;

    // Filtrar regímenes según tipo de persona
    const availableRegimenes = useMemo(() => {
        if (isPersonaMoral) return REGIMENES_FISCALES.filter(r => r.moral);
        if (isPersonaFisica) return REGIMENES_FISCALES.filter(r => r.fisica);
        return REGIMENES_FISCALES;
    }, [isPersonaMoral, isPersonaFisica]);

    // Filtrar usos de CFDI según tipo de persona
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

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Barra superior fina de acento azul del logo */}
            <div className="h-1 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 w-full" />

            {/* Cabecera Principal con Logotipo Grande */}
            <header className="w-full bg-white border-b border-slate-200/90 px-4 sm:px-8 py-4 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                    {/* Logotipo Grande */}
                    <div className="flex items-center gap-4">
                        <div className="h-16 sm:h-20 w-auto flex items-center justify-center py-1">
                            <img 
                                src="LogoEmpresa.png" 
                                alt="CUBI Servicios Logo" 
                                className="h-full w-auto max-h-20 object-contain drop-shadow-xs" 
                            />
                        </div>
                        <div className="border-l border-slate-200 pl-3.5 hidden sm:block">
                            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                                CUBI Servicios
                            </h1>
                            <p className="text-xs text-blue-700 font-medium mt-0.5">
                                Solicitud de Facturación Electrónica · CFDI 4.0
                            </p>
                        </div>
                    </div>

                    <a 
                        href="/" 
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 px-3.5 py-2 rounded-lg border border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Volver al inicio</span>
                        <span className="sm:hidden">Inicio</span>
                    </a>
                </div>
            </header>

            {/* Contenedor Principal */}
            <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
                {successData ? (
                    /* COMPROBANTE FORMAL DE RECEPCIÓN */
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 sm:p-9 animate-in fade-in duration-200">
                        <div className="text-center pb-6 border-b border-slate-100">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 border border-blue-200/80 rounded-full flex items-center justify-center mx-auto mb-3.5">
                                <CheckCircle2 className="w-8 h-8 text-blue-600" />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50/90 px-3 py-1 rounded-full border border-blue-200">
                                Solicitud Registrada con Éxito
                            </span>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2.5">
                                Comprobante de Recepción de Datos
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
                                Su información ha sido transmitida al departamento administrativo para la emisión de su factura.
                            </p>
                        </div>

                        {/* Recuadro de Folio con sutil acento azul */}
                        <div className="my-6 p-4 sm:p-5 rounded-xl bg-blue-50/40 border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
                                    Folio de Solicitud
                                </span>
                                <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight">
                                    {successData.folio}
                                </span>
                                <span className="text-xs text-slate-500 block mt-0.5">
                                    Fecha: {new Date(successData.created_at || Date.now()).toLocaleDateString('es-MX', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCopyFolio}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 shadow-2xs transition-colors cursor-pointer"
                                >
                                    {copiedFolio ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                                    <span>{copiedFolio ? '¡Copiado!' : 'Copiar Folio'}</span>
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 shadow-2xs transition-colors cursor-pointer"
                                >
                                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Imprimir</span>
                                </button>
                            </div>
                        </div>

                        {/* Tabla Resumen */}
                        <div className="rounded-xl border border-slate-200 overflow-hidden mb-6">
                            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                                <FileCheck2 className="w-4 h-4 text-blue-600" />
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Datos Registrados
                                </h3>
                            </div>
                            <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                                <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 bg-white">
                                    <span className="text-slate-500 text-xs font-medium">RFC Receptor:</span>
                                    <span className="sm:col-span-2 font-mono font-bold text-slate-900">{successData.rfc}</span>
                                </div>
                                <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 bg-slate-50/50">
                                    <span className="text-slate-500 text-xs font-medium">Razón Social:</span>
                                    <span className="sm:col-span-2 font-semibold text-slate-900">{successData.razon_social}</span>
                                </div>
                                <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 bg-white">
                                    <span className="text-slate-500 text-xs font-medium">Código Postal:</span>
                                    <span className="sm:col-span-2 font-mono text-slate-800">{successData.codigo_postal}</span>
                                </div>
                                <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 bg-slate-50/50">
                                    <span className="text-slate-500 text-xs font-medium">Régimen Fiscal:</span>
                                    <span className="sm:col-span-2 text-slate-800">
                                        <span className="font-semibold text-blue-700">{successData.regimen_fiscal}</span> — {REGIMENES_FISCALES.find(r => r.code === successData.regimen_fiscal)?.name || successData.regimen_fiscal}
                                    </span>
                                </div>
                                <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 bg-white">
                                    <span className="text-slate-500 text-xs font-medium">Uso de CFDI:</span>
                                    <span className="sm:col-span-2 text-slate-800">
                                        <span className="font-semibold text-blue-700">{successData.uso_cfdi}</span> — {USOS_CFDI.find(u => u.code === successData.uso_cfdi)?.name || successData.uso_cfdi}
                                    </span>
                                </div>
                                {successData.observaciones && (
                                    <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 bg-slate-50/50">
                                        <span className="text-slate-500 text-xs font-medium">Folio / Referencia:</span>
                                        <span className="sm:col-span-2 font-medium text-slate-900">{successData.observaciones}</span>
                                    </div>
                                )}
                                {successData.correo && (
                                    <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 bg-white">
                                        <span className="text-slate-500 text-xs font-medium">Correo Electrónico:</span>
                                        <span className="sm:col-span-2 font-medium text-slate-900">{successData.correo}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
                            <button
                                onClick={handleReset}
                                className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Registrar otra solicitud
                            </button>
                            <a
                                href="/"
                                className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-sm shadow-blue-500/20 text-center"
                            >
                                Concluir y regresar
                            </a>
                        </div>
                    </div>
                ) : (
                    /* FORMULARIO VERTICAL ORDENADO Y ELEGANTE */
                    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-6 sm:p-9">
                        {/* Cabecera del Formulario */}
                        <div className="pb-5 mb-6 border-b border-slate-100 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                                    Datos de Facturación
                                </h2>
                                <p className="text-xs sm:text-[13px] text-slate-500 mt-1">
                                    Complete los campos conforme a su Constancia de Situación Fiscal (SAT)
                                </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200/80 text-blue-700 font-semibold text-[11px] uppercase tracking-wide flex-shrink-0">
                                CFDI 4.0
                            </span>
                        </div>

                        {/* Aviso sutil SAT */}
                        <div className="bg-blue-50/50 border border-blue-200/60 rounded-xl p-3.5 mb-6 flex items-start gap-2.5 text-xs text-slate-700">
                            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="leading-relaxed">
                                <strong className="text-blue-900 font-semibold">Datos obligatorios SAT:</strong> El RFC, Razón Social (sin régimen societario como S.A. de C.V.), Código Postal, Régimen Fiscal y Uso de CFDI deben coincidir con su registro ante el SAT.
                            </div>
                        </div>

                        {errorMessage && (
                            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3.5 mb-6 text-xs flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                <span className="font-medium">{errorMessage}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* 1. RFC */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label htmlFor="rfc" className="text-[13px] font-semibold text-slate-700">
                                        1. RFC del Receptor <span className="text-red-500">*</span>
                                    </label>
                                    {formData.rfc && (
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border inline-flex items-center gap-1 transition-colors ${
                                            rfcValidation.valid 
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                                : rfcValidation.status === 'incomplete' 
                                                    ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                                    : 'bg-red-50 text-red-800 border-red-200'
                                        }`}>
                                            {rfcValidation.valid ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3" />}
                                            <span>{rfcValidation.type || (rfcValidation.status === 'incomplete' ? 'Incompleto' : 'Inválido')}</span>
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
                                        placeholder="Ej. GOME850101AB1 ó IMS421231I45"
                                        maxLength={13}
                                        required
                                        className={`w-full bg-white border rounded-lg px-3.5 py-2.5 text-slate-900 text-sm font-mono uppercase placeholder-slate-400 outline-none transition-all shadow-2xs ${
                                            !formData.rfc 
                                                ? 'border-slate-300 focus:border-blue-600 focus:ring-3 focus:ring-blue-100' 
                                                : rfcValidation.valid 
                                                    ? 'border-emerald-500 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-100 pr-10' 
                                                    : rfcValidation.status === 'incomplete'
                                                        ? 'border-amber-400 focus:border-amber-500 focus:ring-3 focus:ring-amber-100'
                                                        : 'border-red-400 focus:border-red-500 focus:ring-3 focus:ring-red-100'
                                        }`}
                                    />
                                    {formData.rfc && rfcValidation.valid && (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    )}
                                </div>
                                
                                {formData.rfc && !rfcValidation.valid ? (
                                    <p className="text-[11px] text-red-600 mt-1.5 flex items-start gap-1 font-medium">
                                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                        <span>{rfcValidation.message}</span>
                                    </p>
                                ) : formData.rfc && rfcValidation.valid ? (
                                    <p className="text-[11px] text-emerald-600 mt-1.5 flex items-center gap-1 font-medium">
                                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>Estructura de RFC verificada conforme a lineamientos oficiales del SAT.</span>
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-slate-500 mt-1">12 caracteres para empresas (Persona Moral) o 13 para Persona Física con homoclave.</p>
                                )}
                            </div>

                            {/* 2. Razón Social */}
                            <div>
                                <label htmlFor="razon_social" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                                    2. Razón Social o Nombre Completo <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="razon_social"
                                    type="text"
                                    name="razon_social"
                                    value={formData.razon_social}
                                    onChange={handleChange}
                                    placeholder="Ej. SERVICIOS DE LIMPIEZA AMERICA ó JUAN PEREZ LOPEZ"
                                    required
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 text-sm uppercase placeholder-slate-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-100 outline-none transition-all shadow-2xs"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">
                                    En CFDI 4.0 debe registrarse sin siglas societarias (omita <em>S.A. de C.V.</em>, <em>S. de R.L.</em>, etc.).
                                </p>
                            </div>

                            {/* 3. Código Postal */}
                            <div>
                                <label htmlFor="codigo_postal" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                                    3. Código Postal Fiscal <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="codigo_postal"
                                    type="text"
                                    name="codigo_postal"
                                    value={formData.codigo_postal}
                                    onChange={handleChange}
                                    placeholder="45170"
                                    maxLength={5}
                                    required
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 text-sm font-mono placeholder-slate-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-100 outline-none transition-all shadow-2xs"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">Debe contener 5 dígitos numéricos.</p>
                            </div>

                            {/* 4. Régimen Fiscal */}
                            <div>
                                <label htmlFor="regimen_fiscal" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                                    4. Régimen Fiscal <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        id="regimen_fiscal"
                                        name="regimen_fiscal"
                                        value={formData.regimen_fiscal}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 pr-9 text-slate-900 text-xs sm:text-sm appearance-none focus:border-blue-600 focus:ring-3 focus:ring-blue-100 outline-none transition-all shadow-2xs cursor-pointer"
                                    >
                                        <option value="" disabled className="text-slate-400">Seleccione su régimen fiscal...</option>
                                        {availableRegimenes.map(r => (
                                            <option key={r.code} value={r.code}>
                                                {r.code} — {r.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-blue-600 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            {/* 5. Uso de CFDI */}
                            <div>
                                <label htmlFor="uso_cfdi" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                                    5. Uso de CFDI <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        id="uso_cfdi"
                                        name="uso_cfdi"
                                        value={formData.uso_cfdi}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 pr-9 text-slate-900 text-xs sm:text-sm appearance-none focus:border-blue-600 focus:ring-3 focus:ring-blue-100 outline-none transition-all shadow-2xs cursor-pointer"
                                    >
                                        <option value="" disabled className="text-slate-400">Seleccione el uso que dará al CFDI...</option>
                                        {availableUsos.map(u => (
                                            <option key={u.code} value={u.code}>
                                                {u.code} — {u.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-blue-600 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            {/* 6. Folio de Cotización o Servicio (Opcional) */}
                            <div className="pt-2">
                                <label htmlFor="observaciones" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                                    Folio de cotización o servicio <span className="text-slate-400 font-normal text-xs">(opcional)</span>
                                </label>
                                <input
                                    id="observaciones"
                                    type="text"
                                    name="observaciones"
                                    value={formData.observaciones}
                                    onChange={handleChange}
                                    placeholder="Ej. Cotización #1204, Ticket #552 o Nota de Venta"
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 text-sm placeholder-slate-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-100 outline-none transition-all shadow-2xs"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">Indique el número de referencia para identificar su pago o servicio.</p>
                            </div>

                            {/* 7. Correo Electrónico (Opcional) */}
                            <div>
                                <label htmlFor="correo" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                                    Correo electrónico <span className="text-slate-400 font-normal text-xs">(opcional)</span>
                                </label>
                                <input
                                    id="correo"
                                    type="email"
                                    name="correo"
                                    value={formData.correo}
                                    onChange={handleChange}
                                    placeholder="facturacion@empresa.com"
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 text-sm lowercase placeholder-slate-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-100 outline-none transition-all shadow-2xs"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">
                                    A esta dirección enviaremos los archivos XML y PDF una vez emitida su factura.
                                </p>
                            </div>

                            {/* Botón de Envío */}
                            <div className="pt-4 border-t border-slate-100">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-all shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin text-white" />
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
                        </form>
                    </div>
                )}
            </main>

            {/* Pie de Página */}
            <footer className="w-full border-t border-slate-200/90 bg-white py-5 text-center text-xs">
                <div className="max-w-3xl mx-auto px-4 flex items-center justify-center">
                    <span className="text-blue-700 font-medium">© 2026, CUBI Servicios Facturación</span>
                </div>
            </footer>
        </div>
    );
};

export default PublicInvoiceRequest;
