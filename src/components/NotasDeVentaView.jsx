import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import {
    Receipt,
    Plus,
    Trash2,
    Download,
    FileText,
    Image as ImageIcon,
    Eye,
    Search,
    Building2,
    Calendar,
    User,
    Phone,
    Mail,
    MapPin,
    DollarSign,
    CheckCircle2,
    CreditCard,
    AlertCircle,
    Loader,
    RefreshCw,
    X,
    Printer,
    FileSpreadsheet
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { formatCurrency, formatDateForInput } from '../utils/format';
import { downloadPDF, downloadImageBase64 } from '../utils/downloadHelper';
import ClientAutocomplete from './ClientAutocomplete';
import ProductAutocomplete from './ProductAutocomplete';

// --- COMPONENTE IMPRIMIBLE: DISEÑO IDÉNTICO A LOS DEMÁS REPORTES/PDFs ---
const PrintableNotaDeVentaDoc = React.forwardRef(({
    nota,
    company
}, ref) => {
    if (!nota) return null;

    const formatDateDisplay = (dateString) => {
        if (!dateString) return '';
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const year = parts[0];
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            return `${day} / ${months[month] || parts[1]} / ${year}`;
        }
        return dateString;
    };

    const articulos = nota.articulos || [];
    const subtotal = Number(nota.subtotal || 0);
    const tieneIva = Boolean(nota.tiene_iva);
    const ivaMonto = Number(nota.iva_monto || 0);
    const total = Number(nota.total || 0);
    const totalItemsCount = articulos.reduce((acc, item) => acc + (parseInt(item.cantidad, 10) || 0), 0);

    return (
        <div
            ref={ref}
            className="bg-white text-slate-900 w-[900px] min-h-[1100px] flex flex-col font-sans relative shadow-none"
            style={{ width: '900px', backgroundColor: '#ffffff', color: '#0f172a' }}
        >
            <style>{`
                .print-exact { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .bg-brand-900 { background-color: #0f172a !important; }
                .bg-brand-100 { background-color: #f1f5f9 !important; }
                .text-brand-900 { color: #0f172a !important; }
                .text-brand-800 { color: #1e293b !important; }
                .border-brand-900 { border-color: #0f172a !important; }
            `}</style>

            {/* Barra superior de acento corporativo */}
            <div className="h-4 bg-brand-900 w-full print-exact"></div>

            {/* Encabezado: Datos de la Empresa y Título */}
            <div className="px-10 py-6 flex justify-between items-start">
                <div className="w-7/12">
                    <div className="flex items-center gap-4 mb-4">
                        {company?.logo_uri ? (
                            <img
                                src={company.logo_uri}
                                alt="Logo Empresa"
                                className="h-14 max-w-[120px] object-contain rounded-md"
                                crossOrigin="anonymous"
                            />
                        ) : (
                            <div className="h-14 w-14 bg-brand-900 text-white flex items-center justify-center rounded-lg font-bold text-2xl print-exact">
                                {company?.nombre ? company.nombre.substring(0, 2).toUpperCase() : 'NV'}
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-brand-900 tracking-tight leading-tight">
                                {company?.nombre || 'MI EMPRESA'}
                            </h1>
                            {company?.rfc && (
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    RFC: {company.rfc}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                        {company?.direccion && (
                            <p className="flex items-start">
                                <span className="w-20 font-bold text-slate-800">Dirección:</span>
                                <span>{company.direccion}</span>
                            </p>
                        )}
                        {company?.telefono && (
                            <p className="flex items-center">
                                <span className="w-20 font-bold text-slate-800">Teléfono:</span>
                                <span>{company.telefono}</span>
                            </p>
                        )}
                        {company?.correo && (
                            <p className="flex items-center">
                                <span className="w-20 font-bold text-slate-800">Email:</span>
                                <span>{company.correo}</span>
                            </p>
                        )}
                        {company?.pagina_web && (
                            <p className="flex items-center">
                                <span className="w-20 font-bold text-slate-800">Web:</span>
                                <span>{company.pagina_web}</span>
                            </p>
                        )}
                    </div>
                </div>

                <div className="w-5/12 flex flex-col items-end">
                    <h2
                        style={{
                            fontSize: '28px',
                            fontWeight: 300,
                            color: '#94a3b8',
                            marginBottom: '16px',
                            letterSpacing: '2px',
                            textAlign: 'right',
                            width: '100%'
                        }}
                    >
                        NOTA DE VENTA
                    </h2>
                    <div
                        style={{
                            display: 'block',
                            width: '240px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '12px',
                            padding: '16px',
                            textAlign: 'left',
                            boxSizing: 'border-box'
                        }}
                    >
                        <div style={{ marginBottom: '10px' }}>
                            <div
                                style={{
                                    color: '#334155',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    lineHeight: '14px',
                                    marginBottom: '2px',
                                    letterSpacing: '0.5px'
                                }}
                            >
                                FOLIO / NÚMERO
                            </div>
                            <div
                                style={{
                                    color: '#0f172a',
                                    fontSize: '20px',
                                    fontWeight: 800,
                                    fontFamily: 'monospace',
                                    lineHeight: '26px'
                                }}
                            >
                                {nota.folio || 'NV-0001'}
                            </div>
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <div
                                style={{
                                    color: '#334155',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    lineHeight: '14px',
                                    marginBottom: '2px',
                                    letterSpacing: '0.5px'
                                }}
                            >
                                FECHA DE EMISIÓN
                            </div>
                            <div
                                style={{
                                    color: '#0f172a',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    lineHeight: '20px'
                                }}
                            >
                                {formatDateDisplay(nota.fecha)}
                            </div>
                        </div>
                        {nota.metodo_pago && (
                            <div>
                                <div
                                    style={{
                                        color: '#334155',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        lineHeight: '14px',
                                        marginBottom: '2px',
                                        letterSpacing: '0.5px'
                                    }}
                                >
                                    MÉTODO DE PAGO
                                </div>
                                <div
                                    style={{
                                        color: '#0f172a',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        lineHeight: '18px'
                                    }}
                                >
                                    {nota.metodo_pago}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <hr className="border-slate-200 mx-10" />

            {/* Datos del Cliente */}
            <div className="px-10 py-5 bg-slate-50/70 mx-10 my-4 rounded-xl border border-slate-200 print-exact">
                <span
                    style={{
                        display: 'block',
                        color: '#64748b',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        marginBottom: '4px'
                    }}
                >
                    DATOS DEL CLIENTE
                </span>
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">
                            {nota.cliente_nombre || 'Público General'}
                        </h3>
                        {nota.cliente_direccion && (
                            <p className="text-xs text-slate-600 mt-0.5">
                                {nota.cliente_direccion}
                            </p>
                        )}
                    </div>
                    <div className="text-right text-xs text-slate-600 space-y-0.5">
                        {nota.cliente_telefono && (
                            <p>
                                <span className="font-semibold text-slate-700">Tel:</span> {nota.cliente_telefono}
                            </p>
                        )}
                        {nota.cliente_correo && (
                            <p>
                                <span className="font-semibold text-slate-700">Email:</span> {nota.cliente_correo}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabla de Artículos */}
            <div className="px-10 flex-1">
                <table className="w-full text-left border-collapse overflow-hidden rounded-xl">
                    <thead>
                        <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }} className="print-exact">
                            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, textAlign: 'center', width: '64px', letterSpacing: '0.5px' }}>CANT.</th>
                            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>DESCRIPCIÓN / ARTÍCULO</th>
                            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, textAlign: 'right', width: '144px', letterSpacing: '0.5px' }}>COSTO / P. UNIT.</th>
                            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, textAlign: 'right', width: '144px', letterSpacing: '0.5px' }}>TOTAL</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                        {articulos.map((item, idx) => {
                            const cant = Number(item.cantidad) || 0;
                            const costo = Number(item.costo) || 0;
                            const itemTotal = Number(item.total) || (cant * costo);
                            return (
                                <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                                        {cant}
                                    </td>
                                    <td className="py-3 px-4">
                                        <p className="font-semibold text-slate-800">{item.articulo || 'Sin descripción'}</p>
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                                        {formatCurrency(costo)}
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                        {formatCurrency(itemTotal)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Notas / Observaciones y Desglose Financiero */}
            <div className="px-10 py-6 flex justify-between items-start gap-8">
                {/* Notas u observaciones */}
                <div className="w-1/2">
                    {nota.notas && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 print-exact">
                            <h4
                                style={{
                                    display: 'block',
                                    color: '#64748b',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    letterSpacing: '0.5px',
                                    marginBottom: '4px'
                                }}
                            >
                                TÉRMINOS / OBSERVACIONES
                            </h4>
                            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                                {nota.notas}
                            </p>
                        </div>
                    )}
                </div>

                {/* Resumen de Costos y Totales */}
                <div className="w-1/2 max-w-sm ml-auto bg-slate-50 p-4 rounded-xl border border-slate-200 print-exact">
                    <div className="flex justify-between py-1.5 text-xs text-slate-600">
                        <span>Total de Artículos:</span>
                        <span className="font-bold text-slate-800">{totalItemsCount}</span>
                    </div>

                    <div className="border-t border-slate-200 my-1.5"></div>

                    <div className="flex justify-between py-1 text-sm text-slate-700">
                        <span>Subtotal:</span>
                        <span className="font-mono font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
                    </div>

                    {tieneIva ? (
                        <div className="flex justify-between py-1 text-sm text-slate-700">
                            <span>IVA (16%):</span>
                            <span className="font-mono font-semibold text-blue-600">+{formatCurrency(ivaMonto)}</span>
                        </div>
                    ) : (
                        <div className="flex justify-between py-1 text-xs text-slate-500">
                            <span>IVA (16%):</span>
                            <span className="italic">No aplica ($0.00)</span>
                        </div>
                    )}

                    <div className="flex justify-between py-3 border-t-2 mt-2 items-center" style={{ borderColor: '#0f172a' }}>
                        <div>
                            <span style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px' }}>
                                TOTAL NOTA
                            </span>
                            {tieneIva && <span style={{ fontSize: '10px', color: '#64748b' }}>IVA incluido</span>}
                        </div>
                        <span style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                            {formatCurrency(total)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Pie de página de agradecimiento y términos */}
            <div className="bg-slate-100 px-10 py-5 border-t border-slate-200 mt-auto text-center print-exact">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    ¡Gracias por su compra y preferencia!
                </p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xl mx-auto leading-normal">
                    Este documento es una nota de venta y comprobante de entrega. Para cualquier duda o aclaración, favor de presentar este comprobante junto con el número de folio correspondiente.
                </p>
            </div>
        </div>
    );
});

// --- COMPONENTE PRINCIPAL DE LA VISTA DE NOTAS DE VENTA ---
const NotasDeVentaView = ({
    user,
    company: companyProp,
    darkMode = false,
    pageStyle = 'Redondeados'
}) => {
    const [subTab, setSubTab] = useState('form'); // 'form' | 'historial'
    const [company, setCompany] = useState(companyProp || null);

    // Formulario de Nota de Venta
    const [folio, setFolio] = useState('');
    const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
    const [metodoPago, setMetodoPago] = useState('Efectivo');
    const [notas, setNotas] = useState('Garantía de 30 días naturales con nota original. No aplica por mal uso.');

    // Datos del Cliente
    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteTelefono, setClienteTelefono] = useState('');
    const [clienteCorreo, setClienteCorreo] = useState('');
    const [clienteDireccion, setClienteDireccion] = useState('');

    // Artículos
    const [articulos, setArticulos] = useState([
        { id: 1, articulo: '', cantidad: 1, costo: 0, total: 0 }
    ]);

    // Switch de IVA (tipo toggle)
    const [tieneIva, setTieneIva] = useState(false);

    // Estados de UI y proceso
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgressMsg, setExportProgressMsg] = useState('');
    const [previewNota, setPreviewNota] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    // Historial
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Refs para exportación
    const offscreenRef = useRef(null);
    const modalPrintRef = useRef(null);

    // Cargar empresa si no viene por props
    useEffect(() => {
        if (!companyProp && user?.id) {
            fetchCompany();
        } else if (companyProp) {
            setCompany(companyProp);
        }
    }, [companyProp, user?.id]);

    // Generar próximo folio al iniciar
    useEffect(() => {
        if (user?.id) {
            fetchNextFolio();
            fetchHistorial();
        }
    }, [user?.id]);

    const fetchCompany = async () => {
        try {
            if (!user?.id) return;
            const { data, error } = await supabase
                .from('configuracion_empresa')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!error && data) {
                setCompany(data);
            }
        } catch (error) {
            console.error('Error al cargar datos de empresa:', error);
        }
    };

    const fetchNextFolio = async () => {
        try {
            if (!user?.id) return;
            const year = new Date().getFullYear();
            const prefix = `NV-${year}-`;

            const { data, error } = await supabase
                .from('notas_venta')
                .select('folio')
                .eq('user_id', user.id)
                .like('folio', `${prefix}%`)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) {
                console.warn('Tabla notas_venta aún no existe o error en folio:', error.message);
                setFolio(`${prefix}001`);
                return;
            }

            if (data && data.length > 0) {
                const lastFolio = data[0].folio;
                const parts = lastFolio.split('-');
                const num = parseInt(parts[2], 10);
                const nextNum = isNaN(num) ? 1 : num + 1;
                setFolio(`${prefix}${String(nextNum).padStart(3, '0')}`);
            } else {
                setFolio(`${prefix}001`);
            }
        } catch (error) {
            console.error('Error calculando folio:', error);
            setFolio(`NV-${new Date().getFullYear()}-001`);
        }
    };

    const fetchHistorial = async () => {
        try {
            if (!user?.id) return;
            setLoadingHistorial(true);
            const { data, error } = await supabase
                .from('notas_venta')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('No se pudo consultar historial de notas_venta:', error.message);
                return;
            }

            setHistorial(data || []);
        } catch (error) {
            console.error('Error al cargar historial:', error);
        } finally {
            setLoadingHistorial(false);
        }
    };

    // Manejo de autocompletado de cliente
    const handleSelectClient = (client) => {
        if (!client) return;
        setClienteNombre(client.nombre || '');
        setClienteTelefono(client.numero || client.telefono || '');
        setClienteCorreo(client.correo || client.email || '');
        setClienteDireccion(client.direccion || client.empresa || '');
    };

    // Manejo de artículos
    const handleAddArticulo = () => {
        setArticulos(prev => [
            ...prev,
            { id: Date.now(), articulo: '', cantidad: 1, costo: 0, total: 0 }
        ]);
    };

    const handleRemoveArticulo = (indexToRemove) => {
        if (articulos.length === 1) {
            setArticulos([{ id: Date.now(), articulo: '', cantidad: 1, costo: 0, total: 0 }]);
            return;
        }
        setArticulos(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleArticuloChange = (index, field, value) => {
        setArticulos(prev => {
            const updated = [...prev];
            const item = { ...updated[index], [field]: value };

            if (field === 'cantidad' || field === 'costo') {
                const cant = field === 'cantidad' ? parseFloat(value) || 0 : parseFloat(item.cantidad) || 0;
                const cost = field === 'costo' ? parseFloat(value) || 0 : parseFloat(item.costo) || 0;
                item.total = cant * cost;
            }

            updated[index] = item;
            return updated;
        });
    };

    const handleProductSelect = (index, product) => {
        if (!product) return;
        setArticulos(prev => {
            const updated = [...prev];
            const currentItem = updated[index];
            const cant = parseFloat(currentItem.cantidad) || 1;
            const precio = parseFloat(product.precio) || parseFloat(product.costo) || 0;

            updated[index] = {
                ...currentItem,
                articulo: product.nombre || product.descripcion || currentItem.articulo,
                costo: precio,
                total: cant * precio
            };
            return updated;
        });
    };

    // Cálculos de Totales
    const subtotal = useMemo(() => {
        return articulos.reduce((acc, item) => {
            const cant = parseFloat(item.cantidad) || 0;
            const cost = parseFloat(item.costo) || 0;
            return acc + (cant * cost);
        }, 0);
    }, [articulos]);

    const ivaMonto = useMemo(() => {
        return tieneIva ? subtotal * 0.16 : 0;
    }, [tieneIva, subtotal]);

    const totalCosto = useMemo(() => {
        return subtotal + ivaMonto;
    }, [subtotal, ivaMonto]);

    // Construir objeto de nota actual
    const currentNotaData = useMemo(() => ({
        folio: folio || 'NV-0001',
        fecha,
        cliente_nombre: clienteNombre || 'Público General',
        cliente_telefono: clienteTelefono,
        cliente_correo: clienteCorreo,
        cliente_direccion: clienteDireccion,
        subtotal,
        tiene_iva: tieneIva,
        iva_porcentaje: 16.00,
        iva_monto: ivaMonto,
        total: totalCosto,
        metodo_pago: metodoPago,
        notas,
        articulos: articulos.map(a => ({
            articulo: a.articulo,
            cantidad: Number(a.cantidad) || 1,
            costo: Number(a.costo) || 0,
            total: (Number(a.cantidad) || 1) * (Number(a.costo) || 0)
        }))
    }), [folio, fecha, clienteNombre, clienteTelefono, clienteCorreo, clienteDireccion, subtotal, tieneIva, ivaMonto, totalCosto, metodoPago, notas, articulos]);

    // Validar datos antes de guardar
    const validateNota = () => {
        if (!clienteNombre.trim()) {
            alert('Por favor introduce el nombre del cliente.');
            return false;
        }

        const validItems = articulos.filter(a => a.articulo && a.articulo.trim() !== '');
        if (validItems.length === 0) {
            alert('Por favor agrega al menos un artículo con descripción a la nota de venta.');
            return false;
        }

        return true;
    };

    // Guardar Nota en Supabase
    const handleSaveNota = async () => {
        if (!validateNota()) return null;
        if (!user?.id) {
            alert('No hay una sesión de usuario activa.');
            return null;
        }

        setIsSaving(true);
        try {
            const payload = {
                user_id: user.id,
                folio: currentNotaData.folio,
                fecha: currentNotaData.fecha,
                cliente_nombre: currentNotaData.cliente_nombre,
                cliente_telefono: currentNotaData.cliente_telefono,
                cliente_correo: currentNotaData.cliente_correo,
                cliente_direccion: currentNotaData.cliente_direccion,
                subtotal: currentNotaData.subtotal,
                tiene_iva: currentNotaData.tiene_iva,
                iva_porcentaje: currentNotaData.iva_porcentaje,
                iva_monto: currentNotaData.iva_monto,
                total: currentNotaData.total,
                metodo_pago: currentNotaData.metodo_pago,
                notas: currentNotaData.notas,
                articulos: currentNotaData.articulos,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('notas_venta')
                .insert([payload])
                .select();

            if (error) {
                // Manejo amigable si la tabla aún no fue creada en Supabase
                if (error.code === '42P01') {
                    alert('Atención: La tabla "notas_venta" aún no ha sido creada en Supabase.\n\nPor favor ejecuta el script SQL que te proporcionamos en el SQL Editor de tu panel de Supabase para activar el guardado en base de datos.\n\nAún así, ¡puedes descargar tu PDF o imagen JPG ahora mismo!');
                    return currentNotaData;
                }
                throw error;
            }

            alert(`¡Nota de venta ${currentNotaData.folio} guardada exitosamente!`);
            fetchHistorial();
            fetchNextFolio();
            return data && data[0] ? data[0] : currentNotaData;
        } catch (error) {
            console.error('Error al guardar la nota:', error);
            alert('Error al guardar la nota: ' + (error.message || JSON.stringify(error)));
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    // Exportar a PDF
    const handleExportPDF = async (notaToExport = null) => {
        const nota = notaToExport || currentNotaData;
        setPreviewNota(nota);
        setIsExporting(true);
        setExportProgressMsg('Preparando documento PDF...');

        try {
            // Permitir que el DOM se renderice
            await new Promise(r => setTimeout(r, 200));

            if (document.fonts) {
                await document.fonts.ready;
            }

            const element = (showPreviewModal && modalPrintRef.current)
                ? modalPrintRef.current
                : (offscreenRef.current || modalPrintRef.current);

            if (!element) {
                throw new Error('No se encontró el elemento para generar el PDF.');
            }

            setExportProgressMsg('Renderizando imagen en alta definición...');
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                letterRendering: true,
                windowWidth: 1024
            });

            setExportProgressMsg('Generando archivo PDF...');
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            const pageHeight = pdf.internal.pageSize.getHeight();

            if (pdfHeight > pageHeight) {
                let heightLeft = pdfHeight;
                let position = 0;
                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;

                while (heightLeft >= 0) {
                    position = heightLeft - pdfHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
                    heightLeft -= pageHeight;
                }
            } else {
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }

            const fileName = `NotaVenta-${nota.folio || 'NV'}.pdf`;
            await downloadPDF(pdf, fileName);
        } catch (error) {
            console.error('Error generando PDF:', error);
            alert('Error al generar el PDF: ' + (error.message || 'Intente nuevamente'));
        } finally {
            setIsExporting(false);
            setExportProgressMsg('');
        }
    };

    // Exportar a Imagen JPG
    const handleExportJPG = async (notaToExport = null) => {
        const nota = notaToExport || currentNotaData;
        setPreviewNota(nota);
        setIsExporting(true);
        setExportProgressMsg('Preparando imagen JPG...');

        try {
            await new Promise(r => setTimeout(r, 200));

            if (document.fonts) {
                await document.fonts.ready;
            }

            const element = (showPreviewModal && modalPrintRef.current)
                ? modalPrintRef.current
                : (offscreenRef.current || modalPrintRef.current);

            if (!element) {
                throw new Error('No se encontró el contenedor de la nota para exportar.');
            }

            setExportProgressMsg('Capturando imagen de alta calidad...');
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                letterRendering: true,
                windowWidth: 1024
            });

            setExportProgressMsg('Descargando archivo JPG...');
            const jpgData = canvas.toDataURL('image/jpeg', 0.95);
            const fileName = `NotaVenta-${nota.folio || 'NV'}.jpg`;
            await downloadImageBase64(jpgData, fileName);
        } catch (error) {
            console.error('Error generando JPG:', error);
            alert('Error al generar la imagen JPG: ' + (error.message || 'Intente nuevamente'));
        } finally {
            setIsExporting(false);
            setExportProgressMsg('');
        }
    };

    // Eliminar nota del historial
    const handleDeleteNota = async (id, folioToDelete) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar la nota de venta ${folioToDelete}? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('notas_venta')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setHistorial(prev => prev.filter(n => n.id !== id));
            alert('Nota de venta eliminada correctamente.');
        } catch (error) {
            console.error('Error al eliminar nota:', error);
            alert('Error al eliminar: ' + error.message);
        }
    };

    // Abrir vista previa modal
    const handleOpenPreview = (nota = null) => {
        setPreviewNota(nota || currentNotaData);
        setShowPreviewModal(true);
    };

    // Limpiar formulario para nueva nota
    const handleResetForm = () => {
        fetchNextFolio();
        setFecha(new Date().toISOString().split('T')[0]);
        setClienteNombre('');
        setClienteTelefono('');
        setClienteCorreo('');
        setClienteDireccion('');
        setArticulos([{ id: Date.now(), articulo: '', cantidad: 1, costo: 0, total: 0 }]);
        setTieneIva(false);
        setMetodoPago('Efectivo');
        setNotas('Garantía de 30 días naturales con nota original. No aplica por mal uso.');
        setSubTab('form');
    };

    // Filtrar historial
    const filteredHistorial = useMemo(() => {
        if (!searchTerm.trim()) return historial;
        const term = searchTerm.toLowerCase();
        return historial.filter(n =>
            (n.folio && n.folio.toLowerCase().includes(term)) ||
            (n.cliente_nombre && n.cliente_nombre.toLowerCase().includes(term))
        );
    }, [historial, searchTerm]);

    return (
        <div className={`w-full h-full flex flex-col overflow-y-auto ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
            {/* Header de la Página */}
            <div className={`px-6 py-5 border-b shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
                        <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            Notas de Venta
                        </h1>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Emisión rápida de notas de venta, cálculo de IVA y exportación en PDF o JPG
                        </p>
                    </div>
                </div>

                {/* Pestañas / Sub-navegación */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSubTab('form')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${subTab === 'form'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                            : (darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                            }`}
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Nota
                    </button>
                    <button
                        onClick={() => { setSubTab('historial'); fetchHistorial(); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${subTab === 'historial'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                            : (darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                            }`}
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Historial ({historial.length})
                    </button>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="flex-1 p-4 md:p-8">
                {subTab === 'form' ? (
                    <div className="max-w-5xl mx-auto space-y-6">

                        {/* Banner Informativo de la Empresa Vinculada */}
                        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                            }`}>
                            <div className="flex items-center gap-3">
                                {company?.logo_uri ? (
                                    <img
                                        src={company.logo_uri}
                                        alt="Logo Empresa"
                                        className="w-12 h-12 object-contain rounded-xl border border-slate-200 bg-white p-1"
                                    />
                                ) : (
                                    <div className="w-12 h-12 bg-blue-600 text-white flex items-center justify-center rounded-xl font-bold text-lg">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {company?.nombre || 'Nombre de empresa no configurado'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                                            Empresa emisora
                                        </span>
                                    </div>
                                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {company?.telefono || company?.correo || 'Configura los datos en Ajustes de Empresa'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                <div className="text-right">
                                    <span className={`block text-[10px] font-bold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Folio Asignado
                                    </span>
                                    <input
                                        type="text"
                                        value={folio}
                                        onChange={(e) => setFolio(e.target.value)}
                                        className={`w-32 px-3 py-1.5 text-center font-mono font-bold text-sm rounded-lg border outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-blue-400' : 'bg-slate-50 border-slate-200 text-blue-600'
                                            }`}
                                        title="Puedes modificar el folio manualmente si lo deseas"
                                    />
                                </div>
                                <div className="text-right">
                                    <span className={`block text-[10px] font-bold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Fecha
                                    </span>
                                    <input
                                        type="date"
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                                            }`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sección 1: Datos del Cliente */}
                        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
                                <User className="w-5 h-5 text-blue-500" />
                                <h3 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                    1. Datos del Cliente
                                </h3>
                                <span className={`text-xs ml-auto ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Escribe o autocompleta desde tu agenda
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Nombre del Cliente *
                                    </label>
                                    <ClientAutocomplete
                                        value={clienteNombre}
                                        onChange={setClienteNombre}
                                        onSelect={handleSelectClient}
                                        user={user}
                                        darkMode={darkMode}
                                        placeholder="Nombre del cliente o razón social..."
                                    />
                                </div>

                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Teléfono de Contacto
                                    </label>
                                    <div className="relative">
                                        <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="tel"
                                            value={clienteTelefono}
                                            onChange={(e) => setClienteTelefono(e.target.value)}
                                            placeholder="Ej. (686) 123-4567"
                                            className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none transition-all ${darkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:bg-white'
                                                }`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Correo Electrónico
                                    </label>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="email"
                                            value={clienteCorreo}
                                            onChange={(e) => setClienteCorreo(e.target.value)}
                                            placeholder="cliente@ejemplo.com"
                                            className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none transition-all ${darkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:bg-white'
                                                }`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Dirección / Ubicación
                                    </label>
                                    <div className="relative">
                                        <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={clienteDireccion}
                                            onChange={(e) => setClienteDireccion(e.target.value)}
                                            placeholder="Calle, Número, Colonia, Ciudad..."
                                            className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none transition-all ${darkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:bg-white'
                                                }`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sección 2: Artículos, Costos y Totales */}
                        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-emerald-500" />
                                    <h3 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                        2. Artículos y Costos
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddArticulo}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Agregar Artículo
                                </button>
                            </div>

                            {/* Lista de Artículos */}
                            <div className="space-y-3">
                                {articulos.map((item, index) => (
                                    <div
                                        key={item.id || index}
                                        className={`p-3.5 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center gap-3 transition-all ${darkMode ? 'bg-slate-900/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                                            }`}
                                    >
                                        <div className="w-full md:w-20">
                                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                                Cant.
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={item.cantidad}
                                                onChange={(e) => handleArticuloChange(index, 'cantidad', e.target.value)}
                                                className={`w-full p-2.5 rounded-lg border text-center font-bold text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                                                    }`}
                                            />
                                        </div>

                                        <div className="flex-1">
                                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                                Artículo / Concepto
                                            </label>
                                            <ProductAutocomplete
                                                value={item.articulo}
                                                onChange={(val) => handleArticuloChange(index, 'articulo', val)}
                                                onSelect={(prod) => handleProductSelect(index, prod)}
                                                darkMode={darkMode}
                                                placeholder="Nombre o descripción del producto/servicio..."
                                                user={user}
                                            />
                                        </div>

                                        <div className="w-full md:w-36">
                                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                                Costo Unitario ($)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.costo}
                                                onChange={(e) => handleArticuloChange(index, 'costo', e.target.value)}
                                                placeholder="0.00"
                                                className={`w-full p-2.5 rounded-lg border text-right font-mono font-semibold text-sm outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                                                    }`}
                                            />
                                        </div>

                                        <div className="w-full md:w-36 text-right">
                                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                                                Total Artículo
                                            </label>
                                            <div className={`p-2.5 rounded-lg font-mono font-extrabold text-sm border text-right ${darkMode ? 'bg-slate-800/80 border-slate-700 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                                }`}>
                                                {formatCurrency((parseFloat(item.cantidad) || 0) * (parseFloat(item.costo) || 0))}
                                            </div>
                                        </div>

                                        <div className="flex items-end justify-end md:pb-1">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveArticulo(index)}
                                                className="p-2.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                title="Eliminar artículo"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={handleAddArticulo}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-dashed border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    Agregar otra fila de artículo
                                </button>
                            </div>
                        </div>

                        {/* Sección 3: Opciones y Desglose Financiero */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Opciones adicionales: Método de pago, switch de IVA y Notas */}
                            <div className={`p-6 rounded-2xl border space-y-5 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <h4 className={`font-bold text-sm uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Configuración de la Nota
                                </h4>

                                {/* SWITCH DE IVA */}
                                <div className={`p-4 rounded-xl border flex items-center justify-between ${tieneIva
                                    ? (darkMode ? 'bg-blue-950/30 border-blue-800' : 'bg-blue-50/80 border-blue-200')
                                    : (darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200')
                                    }`}>
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                ¿Desglosar e Incluir IVA (16%)?
                                            </span>
                                            {tieneIva && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                                                    Activo
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Calcula automáticamente el 16% sobre el subtotal
                                        </p>
                                    </div>

                                    {/* Componente Toggle Switch */}
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={tieneIva}
                                        onClick={() => setTieneIva(!tieneIva)}
                                        className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${tieneIva ? 'bg-blue-600' : (darkMode ? 'bg-slate-700' : 'bg-slate-300')
                                            }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${tieneIva ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* Método de Pago */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Método de Pago
                                    </label>
                                    <select
                                        value={metodoPago}
                                        onChange={(e) => setMetodoPago(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border text-sm outline-none font-medium ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                                            }`}
                                    >
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Transferencia Electrónica">Transferencia Electrónica</option>
                                        <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                                        <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Por Cobrar / Crédito">Por Cobrar / Crédito</option>
                                    </select>
                                </div>

                                {/* Términos / Observaciones */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Observaciones / Garantía en Nota
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={notas}
                                        onChange={(e) => setNotas(e.target.value)}
                                        placeholder="Términos legales, garantía o aclaraciones..."
                                        className={`w-full p-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                                            }`}
                                    />
                                </div>
                            </div>

                            {/* Cuadro de Desglose de Costo Total */}
                            <div className={`p-6 rounded-2xl border flex flex-col justify-between ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <div>
                                    <h4 className={`font-bold text-sm uppercase tracking-wider mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Desglose del Costo Total
                                    </h4>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                                                Subtotal ({articulos.length} {articulos.length === 1 ? 'artículo' : 'artículos'}):
                                            </span>
                                            <span className="font-mono font-bold text-base">
                                                {formatCurrency(subtotal)}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-1.5">
                                                <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                                                    IVA (16%):
                                                </span>
                                                {tieneIva ? (
                                                    <span className="text-[10px] font-bold text-blue-500 uppercase">Aplicado</span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 italic">Desactivado</span>
                                                )}
                                            </div>
                                            <span className={`font-mono font-bold ${tieneIva ? 'text-blue-500 text-base' : 'text-slate-400 text-sm'}`}>
                                                {tieneIva ? `+${formatCurrency(ivaMonto)}` : '$0.00'}
                                            </span>
                                        </div>

                                        <div className={`pt-4 border-t-2 mt-4 flex justify-between items-baseline ${darkMode ? 'border-slate-700' : 'border-slate-900'
                                            }`}>
                                            <div>
                                                <span className="text-sm font-black uppercase tracking-wider block">
                                                    Costo Total
                                                </span>
                                                <span className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {tieneIva ? 'Incluye IVA desgolsado' : 'Sin desglose de IVA'}
                                                </span>
                                            </div>
                                            <span className="text-3xl font-black font-mono text-blue-600 dark:text-blue-400">
                                                {formatCurrency(totalCosto)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Botonera de Exportación y Guardado */}
                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 space-y-3">
                                    <div className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                                        ¿Cómo deseas guardar / exportar esta nota?
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {/* Botón Descargar PDF */}
                                        <button
                                            type="button"
                                            onClick={() => handleExportPDF()}
                                            disabled={isExporting}
                                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
                                        >
                                            <FileText className="w-4 h-4" />
                                            Descargar PDF
                                        </button>

                                        {/* Botón Descargar JPG */}
                                        <button
                                            type="button"
                                            onClick={() => handleExportJPG()}
                                            disabled={isExporting}
                                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
                                        >
                                            <ImageIcon className="w-4 h-4" />
                                            Descargar JPG
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                        {/* Botón Vista Previa */}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenPreview()}
                                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs border transition-colors ${darkMode
                                                ? 'border-slate-600 hover:bg-slate-700 text-slate-200'
                                                : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                                                }`}
                                        >
                                            <Eye className="w-4 h-4" />
                                            Vista Previa
                                        </button>

                                        {/* Botón Guardar en Supabase */}
                                        <button
                                            type="button"
                                            onClick={handleSaveNota}
                                            disabled={isSaving}
                                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50"
                                        >
                                            {isSaving ? (
                                                <Loader className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4" />
                                            )}
                                            {isSaving ? 'Guardando...' : 'Guardar en Base de Datos'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                ) : (
                    /* Pestaña: Historial de Notas de Venta */
                    <div className="max-w-6xl mx-auto space-y-4">
                        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-center gap-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                            }`}>
                            <div className="relative w-full sm:w-96">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por folio o cliente..."
                                    className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                                        }`}
                                />
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <button
                                    onClick={fetchHistorial}
                                    className={`p-2 rounded-xl border transition-colors ${darkMode ? 'border-slate-700 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                                        }`}
                                    title="Actualizar listado"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loadingHistorial ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                    onClick={handleResetForm}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    Crear Nueva Nota
                                </button>
                            </div>
                        </div>

                        {loadingHistorial ? (
                            <div className="p-16 text-center">
                                <Loader className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
                                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Cargando notas de venta...
                                </p>
                            </div>
                        ) : filteredHistorial.length === 0 ? (
                            <div className={`p-16 rounded-2xl border text-center ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
                                <Receipt className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
                                <h3 className={`font-bold text-lg mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                    No hay notas de venta registradas
                                </h3>
                                <p className={`text-xs max-w-md mx-auto mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Las notas que guardes aparecerán aquí para que puedas consultar sus detalles, descargarlas nuevamente en PDF o en imagen JPG.
                                </p>
                                <button
                                    onClick={handleResetForm}
                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-700"
                                >
                                    Crear mi primera Nota de Venta
                                </button>
                            </div>
                        ) : (
                            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className={`border-b text-xs font-bold uppercase tracking-wider ${darkMode ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                                                }`}>
                                                <th className="py-3 px-4">Folio</th>
                                                <th className="py-3 px-4">Fecha</th>
                                                <th className="py-3 px-4">Cliente</th>
                                                <th className="py-3 px-4">Artículos</th>
                                                <th className="py-3 px-4">IVA</th>
                                                <th className="py-3 px-4 text-right">Total</th>
                                                <th className="py-3 px-4 text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-sm">
                                            {filteredHistorial.map(n => (
                                                <tr
                                                    key={n.id}
                                                    className={`transition-colors ${darkMode ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                                                        {n.folio}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs">
                                                        {n.fecha}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-medium">
                                                        {n.cliente_nombre}
                                                        {n.cliente_telefono && (
                                                            <span className="block text-xs text-slate-400">{n.cliente_telefono}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs">
                                                        {Array.isArray(n.articulos) ? n.articulos.length : 0} artículos
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        {n.tiene_iva ? (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                                16% IVA
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">Sin IVA</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right font-mono font-extrabold">
                                                        {formatCurrency(n.total)}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                onClick={() => handleOpenPreview(n)}
                                                                className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-600 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
                                                                    }`}
                                                                title="Ver detalles"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleExportPDF(n)}
                                                                className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                                title="Descargar PDF"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleExportJPG(n)}
                                                                className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                                                                title="Descargar JPG"
                                                            >
                                                                <ImageIcon className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteNota(n.id, n.folio)}
                                                                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Vista Previa y Selección de Exportación */}
            {showPreviewModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className={`rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden relative ${darkMode ? 'bg-slate-800' : 'bg-white'
                        }`}>
                        {/* Cabecera del Modal */}
                        <div className={`p-4 border-b flex flex-wrap justify-between items-center gap-3 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                            }`}>
                            <div className="flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-blue-500" />
                                <h3 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                    Vista Previa: Nota de Venta {previewNota?.folio}
                                </h3>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleExportPDF(previewNota)}
                                    disabled={isExporting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all disabled:opacity-50"
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    Descargar PDF
                                </button>
                                <button
                                    onClick={() => handleExportJPG(previewNota)}
                                    disabled={isExporting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all disabled:opacity-50"
                                >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    Descargar JPG
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${darkMode ? 'border-slate-700 hover:bg-slate-700 text-slate-200' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Imprimir
                                </button>
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    className={`p-1.5 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
                                        }`}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Contenido del Documento con Scroll */}
                        <div className={`overflow-auto p-6 flex justify-center ${darkMode ? 'bg-slate-900' : 'bg-slate-100'
                            }`}>
                            <div className="shadow-2xl origin-top" style={{ width: '900px' }}>
                                <PrintableNotaDeVentaDoc
                                    ref={modalPrintRef}
                                    nota={previewNota}
                                    company={company}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Contenedor Off-Screen para Capturas en Alta Resolución */}
            <div style={{ position: 'fixed', top: '-10000px', left: '0', width: '900px', zIndex: -1000, pointerEvents: 'none', visibility: 'visible', opacity: 1 }}>
                <PrintableNotaDeVentaDoc
                    ref={offscreenRef}
                    nota={previewNota || currentNotaData}
                    company={company}
                />
            </div>

            {/* Modal de Progreso de Exportación */}
            {isExporting && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3 max-w-xs text-center border border-slate-200 dark:border-slate-700">
                        <Loader className="w-8 h-8 animate-spin text-blue-600" />
                        <p className="font-bold text-sm text-slate-800 dark:text-white">
                            {exportProgressMsg || 'Generando documento...'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Por favor espera un momento mientras se procesa el archivo.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotasDeVentaView;

