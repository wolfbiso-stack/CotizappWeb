import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { formatCurrency } from '../utils/format';
import ImportXmlModal from './ImportXmlModal';
import CfdiImportedPanel from './CfdiImportedPanel';
import { parseAndNormalizeCfdi } from '../utils/cfdi/xmlParser';
import { generateCfdiPdf, loadImageAsDataUrl } from '../utils/cfdi/pdfGenerator';
import { getNextFacturaNumero, saveImportedCfdi } from '../utils/cfdi/cfdiStorageService';
import {
    FileCheck,
    Search,
    RefreshCw,
    Copy,
    Check,
    ExternalLink,
    Clock,
    CheckCircle2,
    XCircle,
    Eye,
    Edit3,
    Building2,
    X,
    ShieldAlert,
    Loader2,
    MessageCircle,
    FileText,
    FileCode2,
    Upload,
    Download,
    Inbox,
    Send,
    Receipt,
    Trash2
} from 'lucide-react';

const INVOICE_BUCKET = 'facturas-archivos';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const REGIMENES_CATALOG = {
    '601': 'General de Ley Personas Morales',
    '603': 'Personas Morales con Fines no Lucrativos',
    '605': 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
    '606': 'Arrendamiento',
    '607': 'Régimen de Enajenación o Adquisición de Bienes',
    '608': 'Demás ingresos',
    '610': 'Residentes en el Extranjero sin Establecimiento Permanente en México',
    '611': 'Ingresos por Dividendos (socios y accionistas)',
    '612': 'Personas Físicas con Actividades Empresariales y Profesionales',
    '614': 'Ingresos por intereses',
    '615': 'Régimen de los ingresos por obtención de premios',
    '616': 'Sin obligaciones fiscales',
    '620': 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos',
    '621': 'Incorporación Fiscal (RIF)',
    '622': 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
    '623': 'Opcional para Grupos de Sociedades',
    '624': 'Coordinados',
    '625': 'Actividades Empresariales con Plataformas Tecnológicas',
    '626': 'Régimen Simplificado de Confianza (RESICO)'
};

const USOS_CATALOG = {
    'G01': 'Adquisición de mercancías',
    'G02': 'Devoluciones, descuentos o bonificaciones',
    'G03': 'Gastos en general',
    'I01': 'Construcciones',
    'I02': 'Mobiliario y equipo de oficina por inversiones',
    'I03': 'Equipo de transporte',
    'I04': 'Equipo de cómputo y accesorios',
    'I05': 'Dados, troqueles, moldes, matrices y herramental',
    'I06': 'Comunicaciones telefónicas',
    'I07': 'Comunicaciones satelitales',
    'I08': 'Otra maquinaria y equipo',
    'D01': 'Honorarios médicos, dentales y gastos hospitalarios',
    'D02': 'Gastos médicos por incapacidad o discapacidad',
    'D03': 'Gastos funerales',
    'D04': 'Donativos',
    'D05': 'Intereses reales por créditos hipotecarios',
    'D06': 'Aportaciones voluntarias al SAR',
    'D07': 'Primas por seguros de gastos médicos',
    'D08': 'Gastos de transportación escolar obligatoria',
    'D09': 'Depósitos en cuentas especiales para el ahorro',
    'D10': 'Pagos por servicios educativos (colegiaturas)',
    'S01': 'Sin efectos fiscales',
    'CP01': 'Pagos',
    'CN01': 'Nómina'
};

const formatWhatsAppPhone = (rawPhone) => {
    const digits = String(rawPhone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `52${digits}`;
    return digits;
};

const sanitizeFileName = (name) =>
    String(name || 'archivo')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');

const normalizeRef = (val) =>
    String(val || '')
        .trim()
        .replace(/^#/, '')
        .toUpperCase();

const findSolicitudForInvitation = (inv, solicitudesList) => {
    if (!inv || !Array.isArray(solicitudesList) || solicitudesList.length === 0) return null;

    const invToken = normalizeRef(inv.servicio_token);
    const invFolio = normalizeRef(inv.servicio_folio);

    // 1. Coincidencia exacta por servicio_token si existe en ambos
    if (invToken) {
        const byToken = solicitudesList.find(
            (s) =>
                (s.servicio_token && normalizeRef(s.servicio_token) === invToken) ||
                (s.observaciones && normalizeRef(s.observaciones) === invToken)
        );
        if (byToken) return byToken;
    }

    // 2. Coincidencia exacta por folio de servicio en observaciones (bloqueado al entrar por token)
    if (invFolio) {
        const byExactFolio = solicitudesList.find(
            (s) => s.observaciones && normalizeRef(s.observaciones) === invFolio
        );
        if (byExactFolio) return byExactFolio;

        // 3. Coincidencia cuando observaciones incluye el folio como referencia (ej. "Solicitud de servicio: 105")
        const escaped = invFolio.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const tokenBoundaryRegex = new RegExp(`(^|[^A-Z0-9])${escaped}($|[^A-Z0-9])`);
        const byContainedFolio = solicitudesList.find(
            (s) => s.observaciones && tokenBoundaryRegex.test(normalizeRef(s.observaciones))
        );
        if (byContainedFolio) return byContainedFolio;
    }

    return null;
};

const FacturasAdminView = ({ darkMode, user, clients = [], quotations = [], services = [] }) => {
    const isDark = darkMode;

    const [activeSection, setActiveSection] = useState('solicitudes'); // 'solicitudes' | 'invitaciones' | 'facturas' | 'cfdi'
    const [solicitudes, setSolicitudes] = useState([]);
    const [invitaciones, setInvitaciones] = useState([]);
    const [cfdiList, setCfdiList] = useState([]);
    const [cfdiError, setCfdiError] = useState(null);
    const [isImportXmlOpen, setIsImportXmlOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('todas');
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [copiedData, setCopiedData] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [copiedInviteId, setCopiedInviteId] = useState(null);
    const [permissionError, setPermissionError] = useState(null);
    const [invitacionesError, setInvitacionesError] = useState(null);
    const [uploadingKey, setUploadingKey] = useState(null); // `${solicitudId}-xml`
    const [fileActionKey, setFileActionKey] = useState(null);
    const [deletingFacturaId, setDeletingFacturaId] = useState(null);
    const [uploadNotice, setUploadNotice] = useState(null); // { type: 'success'|'error', text: string }

    // Hidden file input ref para subir PDF/XML directamente desde la tabla o el modal
    const fileInputRef = useRef(null);
    const pendingUploadTargetRef = useRef(null); // { solicitud, fileType: 'pdf' | 'xml' }

    const [editForm, setEditForm] = useState({
        estado: 'pendiente',
        factura_uuid: '',
        factura_observaciones: '',
        factura_fecha: ''
    });

    const fetchAllData = async () => {
        if (!supabase) return;
        setRefreshing(true);
        setPermissionError(null);
        setInvitacionesError(null);
        setCfdiError(null);

        try {
            const [solicitudesRes, invitacionesRes, cfdiRes] = await Promise.all([
                supabase
                    .from('solicitudes_factura')
                    .select('*')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('invitaciones_factura')
                    .select('*')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('facturas_cfdi')
                    .select('*')
                    .order('fecha_emision', { ascending: false })
            ]);

            if (solicitudesRes.error) {
                console.error('Error al consultar solicitudes:', solicitudesRes.error);
                setPermissionError(solicitudesRes.error.message);
                setSolicitudes([]);
            } else {
                setSolicitudes(solicitudesRes.data || []);
            }

            if (invitacionesRes.error) {
                console.warn('Error al consultar invitaciones:', invitacionesRes.error.message);
                setInvitacionesError(invitacionesRes.error.message);
                setInvitaciones([]);
            } else {
                setInvitaciones(invitacionesRes.data || []);
            }

            if (cfdiRes.error) {
                console.warn('Error al consultar facturas CFDI:', cfdiRes.error.message);
                setCfdiError(cfdiRes.error.message);
                setCfdiList([]);
            } else {
                setCfdiList(cfdiRes.data || []);
            }
        } catch (err) {
            console.error('Excepción al cargar datos de facturación:', err);
            setPermissionError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const showTempNotice = (type, text) => {
        setUploadNotice({ type, text });
        setTimeout(() => {
            setUploadNotice(prev => (prev?.text === text ? null : prev));
        }, 4000);
    };

    const webSolicitudesList = useMemo(
        () => solicitudes.filter(s => s.invitacion !== true && !s.servicio_token),
        [solicitudes]
    );

    const facturadasList = useMemo(
        () => solicitudes.filter(s => s.estado === 'facturada'),
        [solicitudes]
    );

    const pendingCount = useMemo(
        () => webSolicitudesList.filter(s => s.estado === 'pendiente').length,
        [webSolicitudesList]
    );

    const filteredSolicitudes = useMemo(() => {
        const baseList = activeSection === 'facturas' ? facturadasList : webSolicitudesList;
        return baseList.filter(s => {
            const matchesStatus =
                activeSection === 'facturas' || statusFilter === 'todas' || s.estado === statusFilter;
            const term = searchTerm.toLowerCase().trim();
            const matchesSearch =
                !term ||
                (s.folio && s.folio.toLowerCase().includes(term)) ||
                (s.rfc && s.rfc.toLowerCase().includes(term)) ||
                (s.razon_social && s.razon_social.toLowerCase().includes(term)) ||
                (s.correo && s.correo.toLowerCase().includes(term)) ||
                (s.codigo_postal && s.codigo_postal.includes(term)) ||
                (s.factura_uuid && s.factura_uuid.toLowerCase().includes(term)) ||
                (s.observaciones && s.observaciones.toLowerCase().includes(term));

            return matchesStatus && matchesSearch;
        });
    }, [webSolicitudesList, facturadasList, activeSection, statusFilter, searchTerm]);

    const enrichedInvitaciones = useMemo(() => {
        const matchedSolicitudIds = new Set();

        const fromTable = invitaciones.map((inv) => {
            const matched = findSolicitudForInvitation(inv, solicitudes);
            if (matched?.id) matchedSolicitudIds.add(matched.id);
            return {
                ...inv,
                solicitud: matched
            };
        });

        // Incluir también cualquier solicitud marcada con invitacion = true (o servicio_token)
        // que no tenga aún una fila en invitaciones_factura
        const fromSolicitudes = solicitudes
            .filter((s) => (s.invitacion === true || Boolean(s.servicio_token)) && !matchedSolicitudIds.has(s.id))
            .map((s) => ({
                id: `sol-${s.id}`,
                created_at: s.created_at,
                tipo_servicio: 'Invitación',
                servicio_folio: s.observaciones || s.folio,
                servicio_token: s.servicio_token || null,
                cliente_nombre: s.razon_social,
                cliente_telefono: null,
                monto: 0,
                enlace: s.servicio_token
                    ? `https://app.cubiservicios.lat/facturacion/solicitud/${s.servicio_token}`
                    : 'https://app.cubiservicios.lat/facturacion',
                mensaje: null,
                solicitud: s
            }));

        return [...fromTable, ...fromSolicitudes].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }, [invitaciones, solicitudes]);

    const answeredInvitationsCount = useMemo(
        () => enrichedInvitaciones.filter((inv) => Boolean(inv.solicitud)).length,
        [enrichedInvitaciones]
    );

    const filteredInvitaciones = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        return enrichedInvitaciones.filter(inv => {
            if (!term) return true;
            const sol = inv.solicitud;
            return (
                (inv.cliente_nombre && inv.cliente_nombre.toLowerCase().includes(term)) ||
                (inv.cliente_telefono && inv.cliente_telefono.toLowerCase().includes(term)) ||
                (inv.servicio_folio && inv.servicio_folio.toLowerCase().includes(term)) ||
                (inv.tipo_servicio && inv.tipo_servicio.toLowerCase().includes(term)) ||
                (inv.servicio_token && inv.servicio_token.toLowerCase().includes(term)) ||
                (sol?.rfc && sol.rfc.toLowerCase().includes(term)) ||
                (sol?.razon_social && sol.razon_social.toLowerCase().includes(term)) ||
                (sol?.folio && sol.folio.toLowerCase().includes(term))
            );
        });
    }, [enrichedInvitaciones, searchTerm]);

    const handleOpenDetail = (solicitud) => {
        setSelectedSolicitud(solicitud);
        setEditForm({
            estado: solicitud.estado,
            factura_uuid: solicitud.factura_uuid || '',
            factura_observaciones: solicitud.factura_observaciones || '',
            factura_fecha: solicitud.factura_fecha
                ? solicitud.factura_fecha.split('T')[0]
                : new Date().toISOString().split('T')[0]
        });
        setIsEditModalOpen(true);
    };

    const handleSaveStatus = async (e) => {
        e.preventDefault();
        if (!selectedSolicitud || !supabase) return;

        setSaving(true);
        try {
            const updates = {
                estado: editForm.estado,
                factura_uuid: editForm.estado === 'facturada' ? editForm.factura_uuid.trim() || null : null,
                factura_observaciones: editForm.factura_observaciones.trim() || null,
                factura_fecha:
                    editForm.estado === 'facturada' && editForm.factura_fecha
                        ? new Date(editForm.factura_fecha).toISOString()
                        : null,
                processed_at: new Date().toISOString(),
                processed_by: user?.id || null
            };

            const { data, error } = await supabase
                .from('solicitudes_factura')
                .update(updates)
                .eq('id', selectedSolicitud.id)
                .select()
                .single();

            if (error) throw error;

            setSolicitudes(prev => prev.map(s => (s.id === selectedSolicitud.id ? data : s)));
            setSelectedSolicitud(data);
            setIsEditModalOpen(false);
        } catch (err) {
            console.error('Error al actualizar solicitud:', err);
            alert('Error al guardar los cambios: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // --- ELIMINAR SOLICITUD / FACTURA DE LA BASE DE DATOS Y STORAGE ---
    const handleDeleteFactura = async (solicitud) => {
        if (!solicitud?.id || !supabase) return;
        const confirmed = window.confirm(
            `¿Estás seguro de eliminar el registro ${solicitud.folio || ''} (${solicitud.razon_social || solicitud.rfc})? Se eliminará permanentemente de la base de datos junto con sus archivos PDF y XML.`
        );
        if (!confirmed) return;

        setDeletingFacturaId(solicitud.id);
        try {
            const pathsToRemove = [solicitud.pdf_path, solicitud.xml_path].filter(Boolean);

            // Buscar si existe un registro relacionado en facturas_cfdi por solicitud_id o UUID
            const linkedCfdi = cfdiList.find(
                (c) =>
                    c.solicitud_id === solicitud.id ||
                    (solicitud.factura_uuid &&
                        c.uuid &&
                        c.uuid.toUpperCase() === solicitud.factura_uuid.toUpperCase())
            );

            if (linkedCfdi) {
                if (linkedCfdi.pdf_path) pathsToRemove.push(linkedCfdi.pdf_path);
                if (linkedCfdi.xml_path) pathsToRemove.push(linkedCfdi.xml_path);
                if (Array.isArray(linkedCfdi.pdf_history)) {
                    for (const h of linkedCfdi.pdf_history) {
                        if (h?.path) pathsToRemove.push(h.path);
                    }
                }
            }

            const uniquePaths = Array.from(new Set(pathsToRemove));
            if (uniquePaths.length > 0) {
                await supabase.storage.from(INVOICE_BUCKET).remove(uniquePaths);
            }

            const { error } = await supabase
                .from('solicitudes_factura')
                .delete()
                .eq('id', solicitud.id);

            if (error) throw error;

            if (linkedCfdi) {
                await supabase.from('facturas_cfdi').delete().eq('id', linkedCfdi.id);
                setCfdiList((prev) => prev.filter((c) => c.id !== linkedCfdi.id));
            }

            setSolicitudes((prev) => prev.filter((s) => s.id !== solicitud.id));
            if (selectedSolicitud?.id === solicitud.id) {
                setIsEditModalOpen(false);
                setSelectedSolicitud(null);
            }
            showTempNotice('success', `Registro ${solicitud.folio || ''} eliminado de la base de datos.`);
        } catch (err) {
            console.error('Error al eliminar registro:', err);
            showTempNotice('error', `Error al eliminar: ${err.message}`);
        } finally {
            setDeletingFacturaId(null);
        }
    };

    // --- SUBIDA DE XML CON GENERACIÓN AUTOMÁTICA DE PDF CORPORATIVO CUBI ---
    const triggerFileUpload = (solicitud, fileType = 'xml') => {
        pendingUploadTargetRef.current = { solicitud, fileType: 'xml' };
        if (fileInputRef.current) {
            fileInputRef.current.accept = '.xml,application/xml,text/xml';
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileSelected = async (e) => {
        const file = e.target.files?.[0];
        const target = pendingUploadTargetRef.current;
        if (!file || !target || !supabase) return;

        const { solicitud } = target;
        const lowerName = file.name.toLowerCase();

        if (!lowerName.endsWith('.xml') && file.type !== 'application/xml' && file.type !== 'text/xml') {
            showTempNotice('error', 'Por favor selecciona un archivo XML CFDI válido (.xml).');
            return;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            showTempNotice('error', 'El archivo excede el límite permitido de 10 MB.');
            return;
        }

        const key = `${solicitud.id}-xml`;
        setUploadingKey(key);

        try {
            // 1. Leer e interpretar el XML timbrado exactamente igual que en Importar XML
            const xmlText = await file.text();
            const parsed = parseAndNormalizeCfdi(xmlText);
            if (!parsed.valid || !parsed.data) {
                throw new Error(parsed.errors?.[0] || 'El XML no es un CFDI timbrado válido.');
            }

            const cfdi = parsed.data;
            const uuid = cfdi.timbre.uuid.toUpperCase();

            // 2. Generar automáticamente el PDF corporativo CUBI Servicios con consecutivo F-YYYY-NNN
            const nextFacturaNum = await getNextFacturaNumero(cfdi.fecha, supabase);
            const logoDataUrl = await loadImageAsDataUrl('/LogoEmpresa.png');
            const pdfResult = await generateCfdiPdf(cfdi, {
                logoDataUrl,
                facturaNumero: nextFacturaNum
            });

            if (!pdfResult?.blob) {
                throw new Error('No se pudo generar la representación impresa PDF.');
            }

            // 3. Subir XML intacto + PDF generado al bucket privado
            const ts = Date.now();
            const safeXmlName = sanitizeFileName(file.name);
            const xmlStoragePath = `${solicitud.id}/xml_${ts}_${safeXmlName}`;
            const pdfStoragePath = `${solicitud.id}/pdf_${ts}_${sanitizeFileName(pdfResult.filename)}`;

            const xmlBlob = new Blob([xmlText], { type: 'application/xml' });
            const { error: xmlUploadErr } = await supabase.storage
                .from(INVOICE_BUCKET)
                .upload(xmlStoragePath, xmlBlob, { contentType: 'application/xml', upsert: false });
            if (xmlUploadErr) throw xmlUploadErr;

            const { error: pdfUploadErr } = await supabase.storage
                .from(INVOICE_BUCKET)
                .upload(pdfStoragePath, pdfResult.blob, { contentType: 'application/pdf', upsert: false });
            if (pdfUploadErr) {
                await supabase.storage.from(INVOICE_BUCKET).remove([xmlStoragePath]);
                throw pdfUploadErr;
            }

            const oldPaths = [solicitud.xml_path, solicitud.pdf_path].filter(Boolean);
            const nowIso = new Date().toISOString();

            const dbUpdates = {
                xml_path: xmlStoragePath,
                xml_filename: file.name,
                pdf_path: pdfStoragePath,
                pdf_filename: pdfResult.filename,
                factura_uuid: uuid,
                factura_fecha: cfdi.fecha ? new Date(cfdi.fecha).toISOString() : (solicitud.factura_fecha || nowIso),
                archivos_updated_at: nowIso
            };

            const { data: updatedRow, error: updateError } = await supabase
                .from('solicitudes_factura')
                .update(dbUpdates)
                .eq('id', solicitud.id)
                .select()
                .single();

            if (updateError) {
                await supabase.storage.from(INVOICE_BUCKET).remove([xmlStoragePath, pdfStoragePath]);
                throw updateError;
            }

            if (oldPaths.length > 0) {
                await supabase.storage.from(INVOICE_BUCKET).remove(oldPaths);
            }

            // Sincronizar también en facturas_cfdi si ese UUID no existía (sin bloquear si ya existe o falta migración)
            try {
                const insertedCfdi = await saveImportedCfdi({
                    normalized: cfdi,
                    xmlText,
                    xmlFilename: file.name,
                    pdfBlob: pdfResult.blob,
                    pdfFilename: pdfResult.filename,
                    facturaNumero: nextFacturaNum,
                    user,
                    linkedSolicitudId: null,
                    client: supabase
                });
                if (insertedCfdi) {
                    setCfdiList((prev) => [insertedCfdi, ...prev]);
                }
            } catch (cfdiSyncErr) {
                if (cfdiSyncErr?.code !== 'DUPLICATE_UUID') {
                    console.warn('Sincronización opcional con facturas_cfdi omitida:', cfdiSyncErr?.message);
                }
            }

            setSolicitudes((prev) => prev.map((s) => (s.id === solicitud.id ? updatedRow : s)));
            if (selectedSolicitud?.id === solicitud.id) {
                setSelectedSolicitud(updatedRow);
                setEditForm((prev) => ({
                    ...prev,
                    factura_uuid: uuid,
                    factura_fecha: cfdi.fecha ? cfdi.fecha.split('T')[0] : prev.factura_fecha
                }));
            }

            showTempNotice(
                'success',
                `XML procesado y PDF corporativo (${nextFacturaNum}) generado automáticamente.`
            );
        } catch (err) {
            console.error('Error al procesar XML y generar PDF:', err);
            showTempNotice('error', `Error al procesar XML: ${err.message}`);
        } finally {
            setUploadingKey(null);
            pendingUploadTargetRef.current = null;
        }
    };

    const handleViewInvoiceFile = async (solicitud, fileType) => {
        const path = fileType === 'pdf' ? solicitud.pdf_path : solicitud.xml_path;
        if (!path || !supabase) return;

        const key = `view-${solicitud.id}-${fileType}`;
        setFileActionKey(key);
        try {
            const { data, error } = await supabase.storage
                .from(INVOICE_BUCKET)
                .createSignedUrl(path, 3600);

            if (error || !data?.signedUrl) {
                throw error || new Error('No se pudo generar el enlace temporal.');
            }
            window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        } catch (err) {
            console.error(`Error al abrir ${fileType.toUpperCase()}:`, err);
            showTempNotice('error', `No se pudo abrir el ${fileType.toUpperCase()}: ${err.message}`);
        } finally {
            setFileActionKey(null);
        }
    };

    const handleDownloadInvoiceFile = async (solicitud, fileType) => {
        const path = fileType === 'pdf' ? solicitud.pdf_path : solicitud.xml_path;
        const filename =
            (fileType === 'pdf' ? solicitud.pdf_filename : solicitud.xml_filename) ||
            `${solicitud.folio || 'factura'}.${fileType}`;

        if (!path || !supabase) return;

        const key = `download-${solicitud.id}-${fileType}`;
        setFileActionKey(key);
        try {
            const { data, error } = await supabase.storage
                .from(INVOICE_BUCKET)
                .download(path);

            if (error || !data) {
                throw error || new Error('No se pudo descargar el archivo.');
            }

            const blobUrl = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        } catch (err) {
            console.error(`Error al descargar ${fileType.toUpperCase()}:`, err);
            showTempNotice('error', `No se pudo descargar el ${fileType.toUpperCase()}: ${err.message}`);
        } finally {
            setFileActionKey(null);
        }
    };

    // Copiar formato estructurado para SAT
    const handleCopySatData = (solicitud) => {
        const text = `RFC: ${solicitud.rfc}
Nombre/Razón Social: ${solicitud.razon_social}
Código Postal: ${solicitud.codigo_postal}
Régimen Fiscal: ${solicitud.regimen_fiscal} - ${REGIMENES_CATALOG[solicitud.regimen_fiscal] || ''}
Uso de CFDI: ${solicitud.uso_cfdi} - ${USOS_CATALOG[solicitud.uso_cfdi] || ''}
Correo: ${solicitud.correo || 'No especificado'}
Observaciones: ${solicitud.observaciones || 'Ninguna'}`;

        navigator.clipboard.writeText(text);
        setCopiedData(true);
        setTimeout(() => setCopiedData(false), 2500);
    };

    const handleCopyPublicUrl = () => {
        let domain = window.location.hostname;
        if (domain.startsWith('app.')) {
            domain = domain.replace(/^app\./, '');
        }
        const port = window.location.port ? `:${window.location.port}` : '';
        const protocol = window.location.protocol;
        const url = `${protocol}//${domain}${port}/facturacion`;
        navigator.clipboard.writeText(url);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2500);
    };

    const handleCopyInviteLink = (inv) => {
        if (!inv?.enlace) return;
        navigator.clipboard.writeText(inv.enlace);
        setCopiedInviteId(inv.id);
        setTimeout(() => setCopiedInviteId(null), 2000);
    };

    const handleResendWhatsApp = (inv) => {
        const cleanPhone = formatWhatsAppPhone(inv.cliente_telefono);
        const text =
            inv.mensaje ||
            `Hola, ${inv.cliente_nombre}.\nTu servicio ha sido registrado y ya puedes solicitar tu factura fiscal CFDI 4.0.\nPara proporcionarnos tus datos fiscales, ingresa al siguiente enlace:\n${inv.enlace}\nUna vez que completes el formulario, revisaremos tu información para continuar con la emisión de tu factura.\n¡Gracias por tu preferencia!`;
        const url = cleanPhone
            ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
            : `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const getEstadoBadge = (estado) => {
        switch (estado) {
            case 'pendiente':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        Pendiente
                    </span>
                );
            case 'en_revision':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <Edit3 className="w-3 h-3" />
                        En Revisión
                    </span>
                );
            case 'facturada':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Facturada
                    </span>
                );
            case 'cancelada':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                        <XCircle className="w-3 h-3" />
                        Cancelada
                    </span>
                );
            default:
                return <span>{estado}</span>;
        }
    };

    // Control reutilizable de icono PDF (generado automáticamente) y XML (subir / ver / descargar / reemplazar)
    const renderInvoiceFileControl = (solicitud, fileType) => {
        const isPdf = fileType === 'pdf';
        const path = isPdf ? solicitud.pdf_path : solicitud.xml_path;
        const filename = isPdf ? solicitud.pdf_filename : solicitud.xml_filename;
        const isUploading = uploadingKey === `${solicitud.id}-xml`;
        const isViewing = fileActionKey === `view-${solicitud.id}-${fileType}`;
        const isDownloading = fileActionKey === `download-${solicitud.id}-${fileType}`;

        if (!path) {
            // Ya no existe botón "Subir PDF": el PDF se genera automáticamente al subir el XML
            if (isPdf) return null;

            return (
                <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => triggerFileUpload(solicitud, 'xml')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-dashed transition-all disabled:opacity-50 ${
                        isDark
                            ? 'border-sky-500/40 text-sky-400 hover:bg-sky-500/10'
                            : 'border-sky-300 text-sky-700 hover:bg-sky-50'
                    }`}
                    title="Subir XML CFDI (genera el PDF automáticamente)"
                >
                    {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{isUploading ? 'Generando PDF...' : 'Subir XML'}</span>
                </button>
            );
        }

        return (
            <div
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border ${
                    isPdf
                        ? isDark
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        : isDark
                            ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                            : 'bg-sky-50 border-sky-200 text-sky-700'
                }`}
                title={filename || `Archivo ${fileType.toUpperCase()}`}
            >
                <button
                    type="button"
                    disabled={isViewing}
                    onClick={() => handleViewInvoiceFile(solicitud, fileType)}
                    className="inline-flex items-center gap-1 pr-1.5 font-bold text-[11px] hover:underline disabled:opacity-50"
                    title={`Ver ${fileType.toUpperCase()}${filename ? `: ${filename}` : ''}`}
                >
                    {isViewing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isPdf ? (
                        <FileText className="w-3.5 h-3.5" />
                    ) : (
                        <FileCode2 className="w-3.5 h-3.5" />
                    )}
                    <span>{fileType.toUpperCase()}</span>
                </button>

                <span className={`h-3.5 w-px ${isPdf ? 'bg-rose-400/30' : 'bg-sky-400/30'}`} />

                <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => handleDownloadInvoiceFile(solicitud, fileType)}
                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                    title={`Descargar ${fileType.toUpperCase()}`}
                >
                    {isDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Download className="w-3.5 h-3.5" />
                    )}
                </button>

                {!isPdf && (
                    <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => triggerFileUpload(solicitud, 'xml')}
                        className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                        title="Reemplazar XML y regenerar PDF"
                    >
                        {isUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Upload className="w-3 h-3 opacity-75" />
                        )}
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className={`w-full min-h-screen p-4 sm:p-6 md:p-8 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {/* Input oculto para subir PDF / XML */}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelected}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <FileCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight">Facturas</h1>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Gestiona solicitudes web, invitaciones enviadas por WhatsApp y facturas emitidas con PDF y XML
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setIsImportXmlOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0F2A47] hover:bg-[#1982C4] text-white shadow-md shadow-blue-900/20 transition-all"
                        title="Importar CFDI XML timbrado y generar PDF corporativo CUBI"
                    >
                        <FileCode2 className="w-4 h-4" />
                        <span>Importar factura XML</span>
                    </button>

                    <button
                        onClick={handleCopyPublicUrl}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            isDark
                                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'
                        }`}
                        title="Copiar enlace del portal público para clientes"
                    >
                        {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-blue-500" />}
                        <span>{copiedUrl ? '¡Enlace Copiado!' : 'Copiar URL /facturacion'}</span>
                    </button>

                    <a
                        href="/facturacion"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            isDark
                                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'
                        }`}
                    >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        <span>Abrir Formulario</span>
                    </a>

                    <button
                        onClick={fetchAllData}
                        disabled={refreshing}
                        className={`p-2.5 rounded-xl border transition-all ${
                            isDark
                                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'
                        } disabled:opacity-50`}
                        title="Recargar información"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-500' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Banner de notificación de subida de archivos */}
            {uploadNotice && (
                <div
                    className={`mb-6 p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 ${
                        uploadNotice.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                            : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-300'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {uploadNotice.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        ) : (
                            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span>{uploadNotice.text}</span>
                    </div>
                    <button onClick={() => setUploadNotice(null)} className="opacity-70 hover:opacity-100">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Banner de advertencia si no tiene permisos de administrador */}
            {permissionError && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
                    <div className="text-xs space-y-1.5">
                        <p className="font-bold">Permiso de Administrador Requerido</p>
                        <p>
                            Las políticas de seguridad (RLS) impiden consultar la tabla <code>solicitudes_factura</code> sin rol de administrador.
                        </p>
                        <div className="p-2 rounded-lg bg-black/20 font-mono text-[11px] select-all">
                            UPDATE public.profiles SET role = 'admin' WHERE email = '{user?.email || 'tu_correo@ejemplo.com'}';
                        </div>
                    </div>
                </div>
            )}

            {/* TARJETAS PRINCIPALES: SOLICITUDES | INVITACIONES | FACTURAS | CFDI XML */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Tarjeta 1: SOLICITUDES */}
                <button
                    type="button"
                    onClick={() => {
                        setActiveSection('solicitudes');
                        setSearchTerm('');
                    }}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                        activeSection === 'solicitudes'
                            ? isDark
                                ? 'bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/25 shadow-lg shadow-blue-500/10'
                                : 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                            : isDark
                                ? 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
                                : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 shadow-sm'
                    }`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-500 block">
                                Solicitudes
                            </span>
                            <span className={`text-3xl font-black mt-1 block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {webSolicitudesList.length}
                            </span>
                            <span className={`text-xs mt-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {pendingCount > 0 ? `${pendingCount} pendientes de revisión` : 'Solicitudes desde la web'}
                            </span>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center flex-shrink-0">
                            <Inbox className="w-5 h-5" />
                        </div>
                    </div>
                </button>

                {/* Tarjeta 2: INVITACIONES */}
                <button
                    type="button"
                    onClick={() => {
                        setActiveSection('invitaciones');
                        setSearchTerm('');
                    }}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                        activeSection === 'invitaciones'
                            ? isDark
                                ? 'bg-violet-950/30 border-violet-500 ring-2 ring-violet-500/25 shadow-lg shadow-violet-500/10'
                                : 'bg-violet-50/70 border-violet-500 ring-2 ring-violet-500/20 shadow-md'
                            : isDark
                                ? 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
                                : 'bg-white border-slate-200 hover:border-violet-300 hover:bg-slate-50 shadow-sm'
                    }`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-violet-500 block">
                                Invitaciones
                            </span>
                            <span className={`text-3xl font-black mt-1 block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {enrichedInvitaciones.length}
                            </span>
                            <span className={`text-xs mt-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {enrichedInvitaciones.length > 0
                                    ? `${answeredInvitationsCount} con datos recibidos · ${enrichedInvitaciones.length - answeredInvitationsCount} pendientes`
                                    : 'Enviadas por WhatsApp'}
                            </span>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-violet-500/15 text-violet-500 flex items-center justify-center flex-shrink-0">
                            <Send className="w-5 h-5" />
                        </div>
                    </div>
                </button>

                {/* Tarjeta 3: FACTURAS */}
                <button
                    type="button"
                    onClick={() => {
                        setActiveSection('facturas');
                        setSearchTerm('');
                    }}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                        activeSection === 'facturas'
                            ? isDark
                                ? 'bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/25 shadow-lg shadow-emerald-500/10'
                                : 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                            : isDark
                                ? 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
                                : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50 shadow-sm'
                    }`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-500 block">
                                Facturas
                            </span>
                            <span className={`text-3xl font-black mt-1 block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {facturadasList.length}
                            </span>
                            <span className={`text-xs mt-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Facturadas con PDF y XML
                            </span>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0">
                            <Receipt className="w-5 h-5" />
                        </div>
                    </div>
                </button>

                {/* Tarjeta 4: CFDI IMPORTADOS (XML -> PDF CUBI) */}
                <button
                    type="button"
                    onClick={() => {
                        setActiveSection('cfdi');
                        setSearchTerm('');
                    }}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                        activeSection === 'cfdi'
                            ? isDark
                                ? 'bg-sky-950/30 border-[#1982C4] ring-2 ring-[#1982C4]/25 shadow-lg shadow-sky-500/10'
                                : 'bg-sky-50/80 border-[#1982C4] ring-2 ring-[#1982C4]/20 shadow-md'
                            : isDark
                                ? 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
                                : 'bg-white border-slate-200 hover:border-sky-300 hover:bg-slate-50 shadow-sm'
                    }`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#1982C4] block">
                                CFDI XML
                            </span>
                            <span className={`text-3xl font-black mt-1 block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {cfdiList.length}
                            </span>
                            <span className={`text-xs mt-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Representaciones PDF CUBI
                            </span>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-[#1982C4]/15 text-[#1982C4] flex items-center justify-center flex-shrink-0">
                            <FileCode2 className="w-5 h-5" />
                        </div>
                    </div>
                </button>
            </div>

            {/* Barra de Filtros y Búsqueda (ocultar en pestaña CFDI que tiene sus propios filtros avanzados) */}
            {activeSection !== 'cfdi' && (
            <div
                className={`p-4 rounded-2xl border mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${
                    isDark ? 'bg-slate-800/40 border-slate-700/70' : 'bg-white border-slate-200 shadow-sm'
                }`}
            >
                <div className="relative w-full sm:w-96">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={
                            activeSection === 'invitaciones'
                                ? 'Buscar por Cliente, Teléfono, Folio o Servicio...'
                                : activeSection === 'facturas'
                                    ? 'Buscar por Folio, RFC, Razón Social o UUID SAT...'
                                    : 'Buscar por Folio, RFC, Razón Social o Correo...'
                        }
                        className={`w-full pl-10 pr-8 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDark
                                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                        }`}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Sub-filtro de estado solo en SOLICITUDES */}
                {activeSection === 'solicitudes' && (
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                        {['todas', 'pendiente', 'en_revision', 'facturada', 'cancelada'].map((st) => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                                    statusFilter === st
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : isDark
                                            ? 'text-slate-400 hover:bg-slate-700/60'
                                            : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {st === 'todas' ? 'Todas' : st.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                )}

                {activeSection === 'invitaciones' && (
                    <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Mostrando {filteredInvitaciones.length} de {enrichedInvitaciones.length} invitaciones
                    </span>
                )}

                {activeSection === 'facturas' && (
                    <span className={`text-xs font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        Mostrando {filteredSolicitudes.length} facturas emitidas
                    </span>
                )}
            </div>
            )}

            {/* CONTENIDO SEGÚN TARJETA ACTIVA */}
            <div
                className={`rounded-2xl border overflow-hidden shadow-sm ${
                    isDark ? 'bg-slate-800/40 border-slate-700/70' : 'bg-white border-slate-200'
                }`}
            >
                {loading ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-xs">Cargando información de facturación...</span>
                    </div>
                ) : activeSection === 'cfdi' ? (
                    <CfdiImportedPanel
                        cfdiList={cfdiList}
                        darkMode={isDark}
                        user={user}
                        clients={clients}
                        quotations={quotations}
                        services={services}
                        errorMessage={cfdiError}
                        onCfdiUpdated={(updated) => {
                            setCfdiList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                        }}
                        onCfdiDeleted={(deletedId) => {
                            setCfdiList((prev) => prev.filter((c) => c.id !== deletedId));
                        }}
                        onNotify={showTempNotice}
                    />
                ) : activeSection === 'invitaciones' ? (
                    /* ================= SECCIÓN INVITACIONES ================= */
                    invitacionesError && filteredInvitaciones.length === 0 ? (
                        <div className="p-10 text-center">
                            <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-amber-500" />
                            <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                Tabla de invitaciones pendiente de migración
                            </h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                                Ejecuta la migración <code>20261125120000_facturacion_invitaciones_y_archivos.sql</code> en Supabase para habilitar el registro de invitaciones enviadas por WhatsApp.
                            </p>
                        </div>
                    ) : filteredInvitaciones.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <h3 className={`text-base font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                No hay invitaciones registradas
                            </h3>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                {searchTerm
                                    ? 'No se encontraron invitaciones para tu búsqueda.'
                                    : 'Cada vez que envíes una invitación de factura por WhatsApp desde un servicio, aparecerá aquí.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr
                                        className={`border-b ${
                                            isDark
                                                ? 'border-slate-700/80 bg-slate-900/60 text-slate-400'
                                                : 'border-slate-200 bg-slate-50 text-slate-600'
                                        }`}
                                    >
                                        <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Fecha envío</th>
                                        <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Servicio / Folio</th>
                                        <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Cliente / Monto</th>
                                        <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Datos Enviados por el Cliente</th>
                                        <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-700/60' : 'divide-slate-200'}`}>
                                    {filteredInvitaciones.map((inv) => {
                                        const sol = inv.solicitud;
                                        return (
                                        <tr
                                            key={inv.id}
                                            className={`transition-colors ${
                                                isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50/80'
                                            }`}
                                        >
                                            <td className={`py-3 px-4 whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                {new Date(inv.created_at).toLocaleString('es-MX', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-violet-500/15 text-violet-500">
                                                        {inv.tipo_servicio || 'Servicio'}
                                                    </span>
                                                    {inv.servicio_folio && (
                                                        <span className="font-mono font-bold text-blue-500">
                                                            #{inv.servicio_folio}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                                    {inv.cliente_nombre}
                                                </div>
                                                {inv.cliente_telefono && (
                                                    <div className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {inv.cliente_telefono}
                                                    </div>
                                                )}
                                                <div className={`text-[11px] font-mono font-bold mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                                    ${formatCurrency(inv.monto || 0)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                {sol ? (
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                Datos recibidos
                                                            </span>
                                                            {getEstadoBadge(sol.estado)}
                                                            <span className="font-mono text-[11px] font-bold text-blue-500">
                                                                {sol.folio}
                                                            </span>
                                                        </div>
                                                        <div className={`font-mono font-bold text-xs ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                                            {sol.rfc} <span className={`font-sans font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>— {sol.razon_social}</span>
                                                        </div>
                                                        <div className={`text-[11px] flex flex-wrap items-center gap-x-3 gap-y-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                            <span>CP: <strong className="font-mono">{sol.codigo_postal}</strong></span>
                                                            <span>Régimen: <strong>{sol.regimen_fiscal}</strong></span>
                                                            <span>Uso: <strong>{sol.uso_cfdi}</strong></span>
                                                            {sol.correo && <span className="text-blue-500">{sol.correo}</span>}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                                                        isDark
                                                            ? 'bg-slate-800 border-slate-700 text-slate-400'
                                                            : 'bg-slate-100 border-slate-200 text-slate-500'
                                                    }`}>
                                                        <Clock className="w-3 h-3" />
                                                        Esperando datos del cliente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {sol && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopySatData(sol)}
                                                                className={`p-2 rounded-lg transition-all ${
                                                                    isDark
                                                                        ? 'hover:bg-slate-700 text-slate-300'
                                                                        : 'hover:bg-slate-200 text-slate-600'
                                                                }`}
                                                                title="Copiar datos fiscales para SAT"
                                                            >
                                                                <Copy className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenDetail(sol)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all"
                                                                title="Ver datos completos y gestionar factura"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                                <span>Ver datos</span>
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyInviteLink(inv)}
                                                        className={`p-2 rounded-lg transition-all ${
                                                            isDark
                                                                ? 'hover:bg-slate-700 text-slate-300'
                                                                : 'hover:bg-slate-200 text-slate-600'
                                                        }`}
                                                        title="Copiar enlace de invitación"
                                                    >
                                                        {copiedInviteId === inv.id ? (
                                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                        ) : (
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleResendWhatsApp(inv)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all"
                                                        title="Reenviar invitación por WhatsApp"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                        <span>WhatsApp</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : activeSection === 'facturas' ? (
                    /* ================= SECCIÓN FACTURAS (STATUS = FACTURADA) ================= */
                    filteredSolicitudes.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <h3 className={`text-base font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                No hay facturas emitidas
                            </h3>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                {searchTerm
                                    ? 'No se encontraron facturas para tu búsqueda.'
                                    : 'Cuando marques una solicitud con estado "Facturada", aparecerá aquí para subir y consultar su PDF y XML.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr
                                        className={`border-b ${
                                            isDark
                                                ? 'border-slate-700/80 bg-slate-900/60 text-slate-400'
                                                : 'border-slate-200 bg-slate-50 text-slate-600'
                                        }`}
                                    >
                                        <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Folio / Fecha</th>
                                        <th className="py-3.5 px-4 font-bold uppercase tracking-wider">RFC / Razón Social</th>
                                        <th className="py-3.5 px-4 font-bold uppercase tracking-wider">UUID SAT</th>
                                        <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Archivos (PDF / XML)</th>
                                        <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-700/60' : 'divide-slate-200'}`}>
                                    {filteredSolicitudes.map((s) => (
                                        <tr
                                            key={s.id}
                                            className={`transition-colors ${
                                                isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50/80'
                                            }`}
                                        >
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <div className="font-mono font-bold text-emerald-500">{s.folio}</div>
                                                <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {new Date(s.factura_fecha || s.created_at).toLocaleDateString('es-MX', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </div>
                                            </td>

                                            <td className="py-3 px-4">
                                                <div className={`font-mono font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                                    {s.rfc}
                                                </div>
                                                <div
                                                    className={`truncate max-w-[220px] font-medium ${
                                                        isDark ? 'text-slate-400' : 'text-slate-600'
                                                    }`}
                                                    title={s.razon_social}
                                                >
                                                    {s.razon_social}
                                                </div>
                                                {s.observaciones && (
                                                    <div className="text-[11px] text-blue-500 truncate max-w-[220px]">
                                                        Ref: {s.observaciones}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-3 px-4">
                                                {s.factura_uuid ? (
                                                    <span
                                                        className={`font-mono text-[11px] block max-w-[180px] truncate ${
                                                            isDark ? 'text-slate-300' : 'text-slate-700'
                                                        }`}
                                                        title={s.factura_uuid}
                                                    >
                                                        {s.factura_uuid}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] italic text-slate-400">Sin UUID</span>
                                                )}
                                            </td>

                                            <td className="py-3 px-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {renderInvoiceFileControl(s, 'pdf')}
                                                    {renderInvoiceFileControl(s, 'xml')}
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => handleCopySatData(s)}
                                                        className={`p-2 rounded-lg transition-all ${
                                                            isDark
                                                                ? 'hover:bg-slate-700 text-slate-300'
                                                                : 'hover:bg-slate-200 text-slate-600'
                                                        }`}
                                                        title="Copiar datos para SAT"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleOpenDetail(s)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>Gestionar</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={deletingFacturaId === s.id}
                                                        onClick={() => handleDeleteFactura(s)}
                                                        className={`p-2 rounded-lg transition-all disabled:opacity-50 ${
                                                            isDark
                                                                ? 'hover:bg-red-500/20 text-red-400'
                                                                : 'hover:bg-red-50 text-red-600'
                                                        }`}
                                                        title="Eliminar factura"
                                                    >
                                                        {deletingFacturaId === s.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : filteredSolicitudes.length === 0 ? (
                    /* ================= SECCIÓN SOLICITUDES (VACÍA) ================= */
                    <div className="p-12 text-center text-slate-400">
                        <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <h3 className={`text-base font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            No hay solicitudes
                        </h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            {searchTerm || statusFilter !== 'todas'
                                ? 'No se encontraron resultados para los filtros seleccionados.'
                                : 'Aún no se han recibido solicitudes desde el portal público (/facturacion).'}
                        </p>
                    </div>
                ) : (
                    /* ================= SECCIÓN SOLICITUDES (TABLA) ================= */
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr
                                    className={`border-b ${
                                        isDark
                                            ? 'border-slate-700/80 bg-slate-900/60 text-slate-400'
                                            : 'border-slate-200 bg-slate-50 text-slate-600'
                                    }`}
                                >
                                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Folio</th>
                                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Fecha</th>
                                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider">RFC / Razón Social</th>
                                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Régimen & Uso</th>
                                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Estado</th>
                                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-slate-700/60' : 'divide-slate-200'}`}>
                                {filteredSolicitudes.map((s) => (
                                    <tr
                                        key={s.id}
                                        className={`transition-colors ${
                                            isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50/80'
                                        }`}
                                    >
                                        <td className="py-3 px-4 font-mono font-bold text-blue-500 whitespace-nowrap">
                                            {s.folio}
                                        </td>

                                        <td className={`py-3 px-4 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {new Date(s.created_at).toLocaleDateString('es-MX', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </td>

                                        <td className="py-3 px-4">
                                            <div className={`font-mono font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                                {s.rfc}
                                            </div>
                                            <div
                                                className={`truncate max-w-[220px] font-medium ${
                                                    isDark ? 'text-slate-400' : 'text-slate-600'
                                                }`}
                                                title={s.razon_social}
                                            >
                                                {s.razon_social}
                                            </div>
                                            {s.correo && (
                                                <div className="text-[11px] text-blue-500 truncate max-w-[220px]">
                                                    {s.correo}
                                                </div>
                                            )}
                                        </td>

                                        <td className="py-3 px-4">
                                            <div className="font-semibold">
                                                {s.regimen_fiscal} - {REGIMENES_CATALOG[s.regimen_fiscal]?.slice(0, 25) || ''}...
                                            </div>
                                            <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Uso: {s.uso_cfdi}
                                            </div>
                                        </td>

                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {getEstadoBadge(s.estado)}
                                        </td>

                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => handleCopySatData(s)}
                                                    className={`p-2 rounded-lg transition-all ${
                                                        isDark
                                                            ? 'hover:bg-slate-700 text-slate-300'
                                                            : 'hover:bg-slate-200 text-slate-600'
                                                    }`}
                                                    title="Copiar datos para SAT"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>

                                                <button
                                                    onClick={() => handleOpenDetail(s)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>Gestionar</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={deletingFacturaId === s.id}
                                                    onClick={() => handleDeleteFactura(s)}
                                                    className={`p-2 rounded-lg transition-all disabled:opacity-50 ${
                                                        isDark
                                                            ? 'hover:bg-red-500/20 text-red-400'
                                                            : 'hover:bg-red-50 text-red-600'
                                                    }`}
                                                    title="Eliminar solicitud de la base de datos"
                                                >
                                                    {deletingFacturaId === s.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL DE DETALLE Y GESTIÓN */}
            {isEditModalOpen && selectedSolicitud && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className={`max-w-2xl w-full rounded-3xl p-6 sm:p-8 border shadow-2xl overflow-y-auto max-h-[90vh] ${
                            isDark
                                ? 'bg-slate-900 border-slate-700 text-white'
                                : 'bg-white border-slate-200 text-slate-800'
                        }`}
                    >
                        {/* Cabecera Modal */}
                        <div className={`flex items-center justify-between border-b pb-4 mb-6 ${isDark ? 'border-slate-700/60' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                                    <FileCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Solicitud {selectedSolicitud.folio}</h3>
                                    <span className="text-xs text-slate-400">
                                        Registrada el {new Date(selectedSolicitud.created_at).toLocaleString('es-MX')}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className={`p-2 rounded-xl transition-colors ${
                                    isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'
                                }`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tarjeta de Datos Fiscales del Cliente */}
                        <div
                            className={`p-5 rounded-2xl border mb-6 ${
                                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}
                        >
                            <div className={`flex items-center justify-between mb-4 pb-2 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-blue-400" />
                                    Datos Fiscales Receptor
                                </span>
                                <button
                                    onClick={() => handleCopySatData(selectedSolicitud)}
                                    className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-400 px-2.5 py-1 rounded-lg bg-blue-500/10 transition-colors"
                                >
                                    {copiedData ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedData ? '¡Copiado!' : 'Copiar para SAT'}</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-slate-400 block text-[11px]">RFC:</span>
                                    <span className="font-mono font-bold text-sm text-blue-500">{selectedSolicitud.rfc}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[11px]">Código Postal Fiscal:</span>
                                    <span className="font-mono font-bold text-sm">{selectedSolicitud.codigo_postal}</span>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-slate-400 block text-[11px]">Nombre o Razón Social:</span>
                                    <span className="font-bold text-sm">{selectedSolicitud.razon_social}</span>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-slate-400 block text-[11px]">Régimen Fiscal:</span>
                                    <span className="font-medium">
                                        {selectedSolicitud.regimen_fiscal} - {REGIMENES_CATALOG[selectedSolicitud.regimen_fiscal] || 'No identificado'}
                                    </span>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-slate-400 block text-[11px]">Uso de CFDI:</span>
                                    <span className="font-medium">
                                        {selectedSolicitud.uso_cfdi} - {USOS_CATALOG[selectedSolicitud.uso_cfdi] || 'No identificado'}
                                    </span>
                                </div>
                                {selectedSolicitud.correo && (
                                    <div className="sm:col-span-2">
                                        <span className="text-slate-400 block text-[11px]">Correo Electrónico:</span>
                                        <span className="font-medium text-blue-500">{selectedSolicitud.correo}</span>
                                    </div>
                                )}
                                {selectedSolicitud.observaciones && (
                                    <div className="sm:col-span-2">
                                        <span className="text-slate-400 block text-[11px]">Folio / Referencia del Cliente:</span>
                                        <p className={`p-2.5 rounded-lg mt-1 font-mono font-semibold ${isDark ? 'bg-black/20 text-slate-300' : 'bg-white border border-slate-200 text-slate-700'}`}>
                                            {selectedSolicitud.observaciones}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Archivos PDF y XML (cuando está facturada o se está marcando como facturada) */}
                        {(selectedSolicitud.estado === 'facturada' || editForm.estado === 'facturada') && (
                            <div
                                className={`p-4 rounded-2xl border mb-6 ${
                                    isDark ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-emerald-50/60 border-emerald-200'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
                                        Archivos de Factura (PDF generado desde XML)
                                    </span>
                                    <span className="text-[11px] text-slate-400">Sube el XML y el PDF se genera automáticamente</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    {renderInvoiceFileControl(selectedSolicitud, 'pdf')}
                                    {renderInvoiceFileControl(selectedSolicitud, 'xml')}
                                </div>
                            </div>
                        )}

                        {/* Formulario de Atención y Timbrado */}
                        <form onSubmit={handleSaveStatus} className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Actualizar Estado de la Solicitud
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={`text-xs font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Estado
                                    </label>
                                    <select
                                        value={editForm.estado}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, estado: e.target.value }))}
                                        className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                                        }`}
                                    >
                                        <option value="pendiente">Pendiente</option>
                                        <option value="en_revision">En Revisión</option>
                                        <option value="facturada">Facturada</option>
                                        <option value="cancelada">Cancelada</option>
                                    </select>
                                </div>

                                {editForm.estado === 'facturada' && (
                                    <div>
                                        <label className={`text-xs font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Fecha de Factura
                                        </label>
                                        <input
                                            type="date"
                                            value={editForm.factura_fecha}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, factura_fecha: e.target.value }))}
                                            className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                                            }`}
                                        />
                                    </div>
                                )}
                            </div>

                            {editForm.estado === 'facturada' && (
                                <div>
                                    <label className={`text-xs font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Folio Fiscal / UUID SAT (36 caracteres)
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.factura_uuid}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, factura_uuid: e.target.value }))}
                                        placeholder="Ej: A1B2C3D4-E5F6-7A8B-9C0D-1E2F3A4B5C6D"
                                        className={`w-full px-3 py-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            isDark
                                                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                                                : 'bg-white border-slate-300 text-slate-800'
                                        }`}
                                    />
                                </div>
                            )}

                            <div>
                                <label className={`text-xs font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Notas Internas de Facturación
                                </label>
                                <textarea
                                    rows={2}
                                    value={editForm.factura_observaciones}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, factura_observaciones: e.target.value }))}
                                    placeholder="Anotaciones para el equipo administrativo..."
                                    className={`w-full px-3 py-2.5 rounded-xl border text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        isDark
                                            ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                                            : 'bg-white border-slate-300 text-slate-800'
                                    }`}
                                />
                            </div>

                            <div className={`flex items-center justify-end gap-3 pt-4 border-t ${isDark ? 'border-slate-700/60' : 'border-slate-200'}`}>
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                                        isDark
                                            ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                                            : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                                    }`}
                                >
                                    Cerrar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    <span>Guardar Cambios</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* MODAL IMPORTAR FACTURA XML */}
            <ImportXmlModal
                isOpen={isImportXmlOpen}
                onClose={() => setIsImportXmlOpen(false)}
                darkMode={isDark}
                user={user}
                solicitudes={solicitudes}
                onImported={(newCfdi) => {
                    setCfdiList((prev) => [newCfdi, ...prev]);
                    setActiveSection('cfdi');
                    showTempNotice(
                        'success',
                        `CFDI ${newCfdi.uuid} importado y representación PDF CUBI guardada correctamente.`
                    );
                }}
            />
        </div>
    );
};

export default FacturasAdminView;
