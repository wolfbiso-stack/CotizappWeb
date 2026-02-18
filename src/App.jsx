
import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Eye, Download, User, Users, Check, Copy, Trash2, Edit2, Plus, Search, FileText, X, Settings, Sun, Moon, Building2, Zap, Share2, Phone, ArrowUpDown, ArrowUp, ArrowDown, Loader, ScrollText, Mail, ArrowLeft, ShoppingCart, LogOut, ArrowUpRight, Video, Printer, Smartphone, Monitor, Globe, RefreshCw, Image, QrCode, ChevronDown, ChevronUp, GripVertical, Calendar, Menu, ThumbsUp, ThumbsDown, AlertTriangle, Wifi, BarChart3, TrendingUp, DollarSign, Filter, Trophy } from 'lucide-react';
import Login from './components/Login';
import SupabaseConfigError from './components/SupabaseConfigError';
import { supabase } from '../utils/supabase';
import PublicRepairTracking from './components/PublicRepairTracking';
import QRServiceTicket from './components/QRServiceTicket';
import ServiceReceipt from './components/ServiceReceipt';
import PCServiceForm from './components/PCServiceForm';
import PrinterServiceForm from './components/PrinterServiceForm';
import NetworkServiceForm from './components/NetworkServiceForm';
import PhoneServiceForm from './components/PhoneServiceForm';
import CCTVServiceForm from './components/CCTVServiceForm';
import Products from './components/Products';
import SubscriptionView from './components/SubscriptionView';
import ProductAutocomplete from './components/ProductAutocomplete';
import { STATUS_OPTIONS, getStatusLabel } from './utils/statusMapper';
import { formatCurrency, formatServiceDate, formatDateForInput } from './utils/format';
import { generateToken } from './utils/token';

// --- UTILS ---
const computeFileHash = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const deleteServicePhotos = async (serviceId) => {
    try {
        const { data: photos, error: fetchError } = await supabase
            .from('servicio_fotos')
            .select('uri')
            .eq('servicio_id', serviceId);

        if (fetchError) throw fetchError;

        if (photos && photos.length > 0) {
            const paths = photos.map(photo => {
                const parts = photo.uri.split('servicio-files-v2/');
                return parts.length > 1 ? parts[1].split('?')[0] : null;
            }).filter(Boolean);

            if (paths.length > 0) {
                await supabase.storage.from('servicio-files-v2').remove(paths);
            }
            await supabase.from('servicio_fotos').delete().eq('servicio_id', serviceId);
        }
    } catch (error) {
        console.error('Error in deleteServicePhotos:', error);
    }
};

const deleteSpecificPhotos = async (photoIds) => {
    if (!photoIds || photoIds.length === 0) return;
    try {
        const { data: photos, error: fetchError } = await supabase
            .from('servicio_fotos')
            .select('uri')
            .in('id', photoIds);

        if (fetchError) throw fetchError;

        if (photos && photos.length > 0) {
            const paths = photos.map(photo => {
                const parts = photo.uri.split('servicio-files-v2/');
                return parts.length > 1 ? parts[1].split('?')[0] : null;
            }).filter(Boolean);

            if (paths.length > 0) {
                await supabase.storage.from('servicio-files-v2').remove(paths);
            }
            await supabase.from('servicio_fotos').delete().in('id', photoIds);
        }
    } catch (error) {
        console.error('Error in deleteSpecificPhotos:', error);
    }
};

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Algo salió mal.</h1>
                    <details className="whitespace-pre-wrap text-left bg-gray-100 p-4 rounded overflow-auto text-xs text-red-800">
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Recargar Página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

// --- COMPONENTS ---

const QuotationStatusToggle = ({ quotation, onStatusChange, darkMode }) => {
    const [loading, setLoading] = useState(false);
    const status = quotation.aceptada_rechazada || 'pendiente';

    const handleStatusChange = async (newStatus) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('cotizaciones')
                .update({ aceptada_rechazada: newStatus })
                .eq('id', quotation.id);

            if (error) throw error;
            onStatusChange();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error al actualizar el estado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg w-fit">
            <button
                disabled={loading}
                onClick={() => handleStatusChange(status === 'aceptada' ? 'pendiente' : 'aceptada')}
                className={`p-1.5 rounded-md transition-all ${status === 'aceptada'
                    ? 'bg-green-500 text-white shadow-sm scale-110'
                    : 'text-slate-400 hover:text-green-500'}`}
                title="Marcar como Aceptada"
            >
                <ThumbsUp className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
            </button>
            <button
                disabled={loading}
                onClick={() => handleStatusChange(status === 'rechazada' ? 'pendiente' : 'rechazada')}
                className={`p-1.5 rounded-md transition-all ${status === 'rechazada'
                    ? 'bg-red-500 text-white shadow-sm scale-110'
                    : 'text-slate-400 hover:text-red-500'}`}
                title="Marcar como Rechazada"
            >
                <ThumbsDown className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
            </button>
        </div>
    );
};

const QuotationList = ({ quotations, onCreateNew, onView, onEdit, onDelete, onDuplicate, onShare, darkMode, onStatusChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);

    const handleDeleteClick = (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta cotización?')) {
            setDeletingId(id);
            // Wait for animation to complete
            setTimeout(() => {
                onDelete(id);
            }, 400);
        }
    };

    const filteredQuotations = quotations.filter(q => {
        const search = searchTerm.toLowerCase();
        return (
            q.folio?.toString().includes(search) ||
            q.nombre_cliente?.toLowerCase().includes(search) ||
            q.empresa_cliente?.toLowerCase().includes(search) ||
            q.numero_cliente?.toLowerCase().includes(search)
        );
    });

    // Pagination logic
    const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(filteredQuotations.length / itemsPerPage);
    const paginatedQuotations = itemsPerPage === -1
        ? filteredQuotations
        : filteredQuotations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset to page 1 when search term changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, itemsPerPage]);

    return (
        <div className="w-full px-4 md:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className={`text-3xl font-extrabold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    Mis <span className="text-blue-600">Cotizaciones</span>
                </h1>
                <button
                    onClick={onCreateNew}
                    className="btn bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Cotización
                </button>
            </div>

            {/* Search Bar and Pagination Controls */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`} />
                    <input
                        type="text"
                        placeholder="Buscar por folio, nombre, empresa o teléfono..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'} focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm`}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium whitespace-nowrap ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Mostrar:</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className={`px-4 py-3 rounded-xl border transition-all font-medium ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 hover:border-slate-600 hover:bg-slate-750' : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300 hover:bg-slate-50'} focus:outline-none focus:border-blue-500 focus:ring-0 shadow-sm cursor-pointer`}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={-1}>Todos</option>
                    </select>
                </div>
            </div>

            {filteredQuotations.length === 0 ? (
                <div className={`rounded-xl shadow-lg border p-12 text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${darkMode ? 'bg-slate-600 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
                        <FileText className="w-10 h-10" />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>No hay cotizaciones guardadas</h3>
                    <p className={`max-w-md mx-auto mb-8 ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                        Las cotizaciones que guardes aparecerán aquí para que puedas editarlas o volver a descargarlas.
                    </p>
                    <button
                        onClick={onCreateNew}
                        className="text-blue-600 font-bold hover:text-blue-700 hover:underline"
                    >
                        Crear mi primera cotización
                    </button>
                </div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className={`hidden md:block rounded-xl shadow-lg border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                        <table className="w-full">
                            <thead className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50/50 border-gray-200'}`}>
                                <tr>
                                    <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Folio</th>
                                    <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Cliente</th>
                                    <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Estado</th>
                                    <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Fecha</th>
                                    <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Total</th>
                                    <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? 'divide-slate-600' : 'divide-slate-100'}`}>
                                {paginatedQuotations.map((quotation) => (
                                    <tr
                                        key={quotation.id}
                                        className={`transition-all duration-500 ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-blue-50/30'} ${deletingId === quotation.id ? 'opacity-0 transform translate-x-8' : 'opacity-100'}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-blue-600">#{quotation.folio}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-sm font-medium ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{quotation.nombre_cliente}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <QuotationStatusToggle
                                                quotation={quotation}
                                                onStatusChange={onStatusChange}
                                                darkMode={darkMode}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{quotation.fecha}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>${formatCurrency(quotation.total)}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => onView(quotation)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Ver cotización"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => onEdit(quotation)}
                                                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Editar cotización"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </button>

                                                <button
                                                    onClick={() => onDuplicate(quotation)}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Duplicar cotización"
                                                >
                                                    <Copy className="w-5 h-5" />
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteClick(quotation.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar cotización"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination Controls */}
                        {itemsPerPage !== -1 && totalPages > 1 && (
                            <div className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${darkMode ? 'border-slate-600' : 'border-slate-100'}`}>
                                <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredQuotations.length)} de {filteredQuotations.length} cotizaciones
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className={`px-3 py-2 rounded-lg font-medium transition-all ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'} ${darkMode ? 'text-slate-300 disabled:text-slate-600' : 'text-slate-700'}`}
                                    >
                                        Anterior
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                                            const showPage = page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
                                            const showEllipsis = (page === 2 && currentPage > 3) || (page === totalPages - 1 && currentPage < totalPages - 2);

                                            if (showEllipsis) {
                                                return <span key={page} className="px-2 text-slate-400">...</span>;
                                            }

                                            if (!showPage) return null;

                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`px-3 py-2 rounded-lg font-medium transition-all ${page === currentPage
                                                        ? 'bg-blue-600 text-white shadow-lg'
                                                        : darkMode
                                                            ? 'text-slate-300 hover:bg-slate-700'
                                                            : 'text-slate-700 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className={`px-3 py-2 rounded-lg font-medium transition-all ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'} ${darkMode ? 'text-slate-300 disabled:text-slate-600' : 'text-slate-700'}`}
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mobile Cards View */}
                    <div className="md:hidden space-y-4">
                        {paginatedQuotations.map((quotation) => (
                            <div
                                key={quotation.id}
                                className={`p-5 rounded-2xl border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} ${deletingId === quotation.id ? 'opacity-0 transform translate-x-8' : 'opacity-100'} transition-all duration-300`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-md mb-2">
                                            #{quotation.folio}
                                        </span>
                                        <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {quotation.nombre_cliente}
                                        </h3>
                                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {quotation.fecha}
                                        </p>
                                    </div>
                                    <QuotationStatusToggle
                                        quotation={quotation}
                                        onStatusChange={onStatusChange}
                                        darkMode={darkMode}
                                    />
                                </div>

                                <div className="flex justify-between items-end border-t border-dashed pt-4 border-slate-200 dark:border-slate-700">
                                    <div>
                                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total</p>
                                        <p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                            ${formatCurrency(quotation.total)}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onView(quotation)}
                                            className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => onEdit(quotation)}
                                            className="p-2.5 bg-slate-50 text-slate-600 rounded-xl"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => onDuplicate(quotation)}
                                            className="p-2.5 bg-green-50 text-green-600 rounded-xl"
                                        >
                                            <Copy className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(quotation.id)}
                                            className="p-2.5 bg-red-50 text-red-600 rounded-xl"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Mobile Pagination Controls */}
                        {itemsPerPage !== -1 && totalPages > 1 && (
                            <div className={`mt-6 p-4 rounded-2xl border flex flex-col items-center gap-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                                <div className={`text-sm text-center ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredQuotations.length)} de {filteredQuotations.length}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap justify-center">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'} ${darkMode ? 'text-slate-300 disabled:text-slate-600 bg-slate-700' : 'text-slate-700 bg-white border border-slate-200'}`}
                                    >
                                        ← Anterior
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let page;
                                            if (totalPages <= 5) {
                                                page = i + 1;
                                            } else if (currentPage <= 3) {
                                                page = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                page = totalPages - 4 + i;
                                            } else {
                                                page = currentPage - 2 + i;
                                            }
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`px-3 py-2 rounded-lg font-medium transition-all ${page === currentPage
                                                        ? 'bg-blue-600 text-white shadow-lg'
                                                        : darkMode
                                                            ? 'text-slate-300 bg-slate-700'
                                                            : 'text-slate-700 bg-white border border-slate-200'
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'} ${darkMode ? 'text-slate-300 disabled:text-slate-600 bg-slate-700' : 'text-slate-700 bg-white border border-slate-200'}`}
                                    >
                                        Siguiente →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};


const SettingsView = ({ companyData, onCompanyChange, onSave, darkMode, selectedTemplate, onTemplateChange }) => {
    const [activeSubTab, setActiveSubTab] = useState('company');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const menuItems = [
        { id: 'company', label: 'Configuración de la empresa' },
        { id: 'templates', label: 'Plantillas de facturas' },
    ];

    const TEMPLATES = [
        { id: 'classic', name: 'Clásica', description: 'Diseño limpio y tradicional.' },
        { id: 'modern', name: 'Moderna', description: 'Estilo audaz con encabezados llamativos.' },
        { id: 'formal', name: 'Formal', description: 'Elegante y corporativo, ideal para empresas serias.' },
        { id: 'creative', name: 'Creativa', description: 'Toque de color y diseño único.' }
    ];

    return (
        <div className={`flex flex-col md:flex-row h-full animate-in slide-in-from-right-4 duration-300 ${darkMode ? 'bg-transparent' : 'bg-transparent'}`}>
            {/* Sub-sidebar */}
            <div className={`w-full md:w-64 md:border-r border-b md:border-b-0 md:h-full flex flex-row md:flex-col shrink-0 overflow-x-auto ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                <div className={`p-4 md:p-6 border-b-0 md:border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    <h2 className={`text-xl font-bold whitespace-nowrap ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Configuración</h2>
                </div>
                <nav className="flex-1 md:overflow-y-auto p-4 flex md:flex-col gap-2 md:gap-1">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSubTab(item.id)}
                            className={`w-auto md:w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeSubTab === item.id
                                ? 'bg-blue-50 text-blue-700 md:border-l-4 border-b-4 md:border-b-0 border-blue-600'
                                : `hover:bg-opacity-50 md:border-l-4 border-b-4 md:border-b-0 border-transparent ${darkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-slate-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-12">
                {activeSubTab === 'company' && (
                    <div className="max-w-3xl">
                        <div className="mb-8">
                            <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Configuración de la empresa</h2>
                            <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Administra la información legal y de contacto de tu negocio.</p>
                        </div>

                        <div className={`space-y-8 ${darkMode ? '' : ''}`}>
                            {/* Logo Section */}
                            <div className={`flex items-start gap-8 border-b pb-8 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                                <div className="w-32">
                                    <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Logotipo</label>
                                    <div className={`w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden relative group ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-400'}`}>
                                        {previewUrl || companyData.logo_uri ? (
                                            <img src={previewUrl || companyData.logo_uri} className="w-full h-full object-contain" />
                                        ) : (
                                            <Building2 className="w-8 h-8" />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <p className="text-white text-xs font-bold text-center px-1">Cambiar Image</p>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            title="Cambiar logotipo"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">Haz clic en el logo para cambiarlo. Recomendado: 300x300px, PNG transparente.</p>
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Nombre de la empresa</label>
                                    <input
                                        type="text"
                                        value={companyData.nombre}
                                        onChange={(e) => onCompanyChange('nombre', e.target.value)}
                                        className={`w-full border rounded-lg p-3 transition-colors ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-500'}`}
                                        placeholder="Ej. Mi Empresa S.A. de C.V."
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Dirección</label>
                                    <textarea
                                        value={companyData.direccion}
                                        onChange={(e) => onCompanyChange('direccion', e.target.value)}
                                        className={`w-full border rounded-lg p-3 text-sm focus:ring-2 outline-none h-24 resize-none transition-colors ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:ring-blue-100 focus:border-blue-500'}`}
                                        placeholder="Calle, número, colonia, ciudad, estado, código postal"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>RFC</label>
                                    <input
                                        type="text"
                                        value={companyData.rfc || ''}
                                        onChange={(e) => onCompanyChange('rfc', e.target.value)}
                                        className={`w-full border rounded-lg p-3 transition-colors ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-500'}`}
                                        placeholder="RFC de la empresa"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Teléfono</label>
                                    <input
                                        type="text"
                                        value={companyData.telefono || ''}
                                        onChange={(e) => onCompanyChange('telefono', e.target.value)}
                                        className={`w-full border rounded-lg p-3 transition-colors ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-500'}`}
                                        placeholder="Ej. +52 55 1234 5678"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Correo Electrónico</label>
                                    <input
                                        type="email"
                                        value={companyData.correo || ''}
                                        onChange={(e) => onCompanyChange('correo', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Sitio Web</label>
                                    <input
                                        type="text"
                                        value={companyData.pagina_web}
                                        onChange={(e) => onCompanyChange('pagina_web', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="www.tuempresa.com"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 border-t border-slate-100">
                                <button
                                    onClick={() => onSave(selectedFile)}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                                >
                                    Guardar configuración
                                </button>
                            </div>
                        </div>
                    </div>


                )}

                {activeSubTab === 'templates' && (
                    <div className="max-w-3xl">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-slate-800 mb-2">Plantillas de facturas</h2>
                            <p className="text-slate-500">Selecciona el diseño predeterminado para tus documentos.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {TEMPLATES.map(template => (
                                <div
                                    key={template.id}
                                    onClick={() => onTemplateChange(template.id)}
                                    className={`border-2 rounded-xl overflow-hidden relative shadow-md group cursor-pointer transition-all ${selectedTemplate === template.id ? 'border-blue-600 ring-4 ring-blue-100 shadow-xl scale-[1.02]' : 'border-slate-200 hover:border-blue-400 hover:shadow-lg'} ${darkMode ? 'bg-slate-800' : 'bg-white'}`}
                                >
                                    {selectedTemplate === template.id && (
                                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full z-10 shadow-md flex items-center gap-1">
                                            <Check className="w-3 h-3" /> Activa
                                        </div>
                                    )}

                                    {selectedTemplate !== template.id && (
                                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors z-10 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <span className="bg-white/90 backdrop-blur text-slate-800 font-bold px-4 py-2 rounded-lg shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                                Seleccionar
                                            </span>
                                        </div>
                                    )}

                                    <div className="bg-slate-50/50 aspect-[3/4] border-b border-slate-200 overflow-hidden relative group">
                                        <div className="absolute top-0 left-0 origin-top-left transform scale-[0.38] w-[900px] h-[1100px] bg-white shadow-sm pointer-events-none select-none">
                                            <PrintableQuotation
                                                company={companyData || { nombre: 'Mi Empresa', direccion: 'Dirección, Ciudad', correo: 'contacto@empresa.com', telefono: '+52 55 1234 5678' }}
                                                client={{
                                                    name: 'Cliente Ejemplo',
                                                    address: 'Dirección del Cliente',
                                                    phone: '55 1234 5678',
                                                    email: 'cliente@email.com'
                                                }}
                                                items={[
                                                    { qty: 1, desc: 'Desarrollo Web Profesional', price: 15000, discount: 0, tax: 0 },
                                                    { qty: 1, desc: 'Hosting Anual', price: 2500, discount: 0, tax: 0 },
                                                    { qty: 5, desc: 'Cuentas de Correo', price: 150, discount: 0, tax: 0 }
                                                ]}
                                                terms="Términos y condiciones de ejemplo."
                                                folio="001"
                                                date="01/01/2024"
                                                dueDate="15/01/2024"
                                                includeIva={true}
                                                template={template.id}
                                            />
                                        </div>
                                    </div>
                                    <div className={`p-4 text-center transition-colors ${selectedTemplate === template.id ? 'bg-blue-50/50' : 'bg-transparent'}`}>
                                        <h3 className={`font-bold ${selectedTemplate === template.id ? 'text-blue-700' : 'text-slate-800'}`}>{template.name}</h3>
                                        <p className="text-xs text-slate-500 mt-1">{template.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
};

const ClientDetails = ({ client, onBack }) => {
    if (!client) return null;

    return (
        <div className="w-full px-4 md:px-8 py-8 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                    Detalles del <span className="text-blue-600">Cliente</span>
                </h1>
            </div>

            <div className={`rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-w-4xl mx-auto ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'}`}>
                <div className="bg-slate-50 p-8 border-b border-slate-100 flex items-center gap-6">
                    <div className="w-24 h-24 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold text-4xl shadow-lg shadow-blue-500/30">
                        {client.nombre?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800">{client.nombre}</h2>
                        {client.empresa && (
                            <div className="flex items-center gap-2 text-slate-500 mt-2 font-medium text-lg">
                                <Building2 className="w-5 h-5" />
                                {client.empresa}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Mail className="w-4 h-4" /> Correo Electrónico
                            </h3>
                            <p className="text-lg text-slate-700 font-medium">{client.correo || 'No registrado'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Phone className="w-4 h-4" /> Teléfono
                            </h3>
                            <p className="text-lg text-slate-700 font-medium">{client.numero || 'No registrado'}</p>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 h-full">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Notas / Observaciones
                        </h3>
                        <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                            {client.notas || 'Sin notas adicionales.'}
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-slate-50/50 border-t border-slate-100 text-right text-xs text-slate-400">
                    Cliente creado el: {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                </div>
            </div>


        </div>
    );
};

const ClientsList = ({ onCreateNew, darkMode }) => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ nombre: '', empresa: '', correo: '', numero: '', notas: '' });
    const [saving, setSaving] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [editingClientId, setEditingClientId] = useState(null);
    const [sortOrder, setSortOrder] = useState('date'); // 'date' | 'alpha'
    const [searchTerm, setSearchTerm] = useState('');

    const fetchClients = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.error('Error loading clients:', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleSaveClient = async () => {
        if (!formData.nombre) {
            alert('El nombre es obligatorio');
            return;
        }
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let error;

            if (editingClientId) {
                // Update existing client
                const { error: updateError } = await supabase
                    .from('clientes')
                    .update({
                        ...formData,
                        updated_at: new Date()
                    })
                    .eq('id', editingClientId);
                error = updateError;
            } else {
                // Insert new client
                const { error: insertError } = await supabase
                    .from('clientes')
                    .insert([{
                        ...formData,
                        user_id: user.id,
                        created_at: new Date()
                    }]);
                error = insertError;
            }

            if (error) throw error;

            setShowModal(false);
            setFormData({ nombre: '', empresa: '', correo: '', numero: '', notas: '' });
            setEditingClientId(null);
            fetchClients(); // Refresh list

        } catch (error) {
            console.error('Error creating client:', error);
            alert('Error al guardar cliente');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este cliente?')) return;

        try {
            const { error } = await supabase
                .from('clientes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchClients();
            if (selectedClient && selectedClient.id === id) setSelectedClient(null);
        } catch (error) {
            console.error('Error deleting client:', error);
            alert('Error al eliminar');
        }
    };

    const handleEdit = (client) => {
        setFormData({
            nombre: client.nombre,
            empresa: client.empresa || '',
            correo: client.correo || '',
            numero: client.numero || '',
            notas: client.notas || ''
        });
        setEditingClientId(client.id);
        setShowModal(true);
    };

    const handleNewClient = () => {
        setFormData({ nombre: '', empresa: '', correo: '', numero: '', notas: '' });
        setEditingClientId(null);
        setShowModal(true);
    };

    if (loading) return <div className="flex justify-center p-12"><Loader className="animate-spin w-8 h-8 text-blue-600" /></div>;

    if (selectedClient) {
        return <ClientDetails client={selectedClient} onBack={() => setSelectedClient(null)} />;
    }

    const sortedClients = [...clients].sort((a, b) => {
        if (sortOrder === 'alpha') {
            return a.nombre.localeCompare(b.nombre);
        }
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const filteredClients = sortedClients.filter(c => {
        const search = searchTerm.toLowerCase();
        return (
            c.nombre?.toLowerCase().includes(search) ||
            c.empresa?.toLowerCase().includes(search) ||
            c.correo?.toLowerCase().includes(search) ||
            c.numero?.toLowerCase().includes(search)
        );
    });

    return (
        <div className="w-full px-4 md:px-8 py-8 relative">
            <div className="flex justify-between items-center mb-8">
                <h1 className={`text-3xl font-extrabold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    Gestión de <span className="text-blue-600">Clientes</span>
                </h1>
                <button
                    onClick={handleNewClient}
                    className="btn bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Cliente
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, empresa, correo o teléfono..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'} focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm`}
                    />
                </div>
            </div>

            {/* List View */}
            {filteredClients.length === 0 ? (
                <div className={`rounded-xl shadow-lg border p-12 text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${darkMode ? 'bg-slate-600 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
                        <User className="w-10 h-10" />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>No hay clientes registrados</h3>
                    <p className={`max-w-md mx-auto mb-8 ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                        Agrega tus clientes para seleccionarlos rápidamente al crear cotizaciones.
                    </p>
                    <button
                        onClick={handleNewClient}
                        className="text-blue-600 font-bold hover:text-blue-700 hover:underline"
                    >
                        Agregar primer cliente
                    </button>
                </div>
            ) : (
                <div className={`rounded-xl shadow-lg border min-h-[500px] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    {/* List Header */}
                    <div className={`grid grid-cols-12 gap-4 p-4 border-b text-xs font-bold uppercase tracking-widest hidden md:grid ${darkMode ? 'bg-slate-600/50 border-slate-500 text-slate-200' : 'bg-gray-50/50 border-slate-100 text-slate-500'}`}>
                        <div
                            className="col-span-5 pl-2 flex items-center gap-2 cursor-pointer hover:text-blue-500 transition-colors"
                            onClick={() => setSortOrder(prev => prev === 'date' ? 'alpha' : 'date')}
                        >
                            Cliente / Empresa
                            <ArrowUpDown className="w-3 h-3" />
                        </div>
                        <div className="col-span-4">Contacto</div>
                        <div className="col-span-3 text-right pr-2">Acciones</div>
                    </div>

                    {/* List Items */}
                    <div className={`divide-y ${darkMode ? 'divide-slate-600' : 'divide-slate-100'}`}>
                        {filteredClients.map((client) => (
                            <div key={client.id} className={`grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center transition-colors group ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-blue-50/30'}`}>
                                {/* Name & Company */}
                                <div className="col-span-5 flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${darkMode ? 'bg-slate-600 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                        {client.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className={`font-bold text-sm truncate ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{client.nombre}</h3>
                                        {client.empresa && <p className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{client.empresa}</p>}
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="col-span-4 space-y-1">
                                    {client.correo && (
                                        <div className={`flex items-center gap-2 text-sm truncate ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full shrink-0"></span>
                                            <span className="truncate">{client.correo}</span>
                                        </div>
                                    )}
                                    {client.numero && (
                                        <div className="flex items-center gap-2 text-xs text-slate-400 truncate md:pl-3.5">
                                            {client.numero}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="col-span-3 flex justify-end gap-2 opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setSelectedClient(client)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        title="Ver detalles"
                                    >
                                        <FileText className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(client)}
                                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                        title="Editar"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(client.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* NEW CLIENT MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                        <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-slate-50'}`}>
                            <h3 className={`font-bold text-lg ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{editingClientId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                            <button onClick={() => setShowModal(false)} className={`hover:text-slate-600 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className={`block text-xs font-bold mb-1 uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Nombre Completo *</label>
                                <input
                                    type="text"
                                    className={`w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>
                            <div>
                                <label className={`block text-xs font-bold mb-1 uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Empresa</label>
                                <input
                                    type="text"
                                    className={`w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                                    value={formData.empresa}
                                    onChange={e => setFormData({ ...formData, empresa: e.target.value })}
                                    placeholder="Ej. Soluciones SA de CV"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Teléfono</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.numero}
                                        onChange={e => setFormData({ ...formData, numero: e.target.value })}
                                        placeholder="(00) 0000 0000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Correo</label>
                                    <input
                                        type="email"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.correo}
                                        onChange={e => setFormData({ ...formData, correo: e.target.value })}
                                        placeholder="cliente@email.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Notas</label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24"
                                    value={formData.notas}
                                    onChange={e => setFormData({ ...formData, notas: e.target.value })}
                                    placeholder="Comentarios adicionales..."
                                ></textarea>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveClient}
                                disabled={saving}
                                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
                            >
                                {saving ? <Loader className="w-4 h-4 animate-spin" /> : (editingClientId ? 'Actualizar Cliente' : 'Guardar Cliente')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CompanyForm = ({ data, onChange }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 transition-all hover:shadow-xl text-left">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" /> Datos de tu Empresa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Nombre Comercial</label>
                    <input
                        type="text"
                        placeholder="Ej. Tech Solutions S.A. de C.V."
                        value={data.name}
                        onChange={(e) => onChange('name', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block p-3 transition-all duration-200 ease-in-out hover:bg-white hover:border-blue-300 outline-none placeholder-slate-400 font-medium"
                    />
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Dirección Completa</label>
                    <input
                        type="text"
                        placeholder="Calle, Número, Colonia, Ciudad"
                        value={data.address}
                        onChange={(e) => onChange('address', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block p-3 transition-all duration-200 ease-in-out hover:bg-white hover:border-blue-300 outline-none placeholder-slate-400 font-medium"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Teléfono / WhatsApp</label>
                    <input
                        type="text"
                        placeholder="(55) 1234 5678"
                        value={data.phone}
                        onChange={(e) => onChange('phone', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block p-3 transition-all duration-200 ease-in-out hover:bg-white hover:border-blue-300 outline-none placeholder-slate-400 font-medium"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Correo Electrónico</label>
                    <input
                        type="text"
                        placeholder="contacto@tuempresa.com"
                        value={data.email}
                        onChange={(e) => onChange('email', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block p-3 transition-all duration-200 ease-in-out hover:bg-white hover:border-blue-300 outline-none placeholder-slate-400 font-medium"
                    />
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Logo URL (Opcional)</label>
                    <input
                        type="text"
                        placeholder="https://..."
                        value={data.logo}
                        onChange={(e) => onChange('logo', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block p-3 transition-all duration-200 ease-in-out hover:bg-white hover:border-blue-300 outline-none placeholder-slate-400 font-medium "
                    />
                </div>
            </div>
        </div >
    );
};

const ClientForm = ({ data, onChange }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 transition-all hover:shadow-xl text-left">
        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-green-500" /> Datos del Cliente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Nombre del Cliente</label>
                <input
                    type="text"
                    placeholder="Nombre completo o Razón Social"
                    value={data.name}
                    onChange={(e) => onChange('name', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 block p-3 transition-all duration-200 ease-in-out hover:bg-white hover:border-green-300 outline-none placeholder-slate-400 font-medium"
                />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Dirección del Cliente</label>
                <input
                    type="text"
                    placeholder="Dirección de entrega o fiscal"
                    value={data.address}
                    onChange={(e) => onChange('address', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 block p-3 transition-all duration-200 ease-in-out hover:bg-white hover:border-green-300 outline-none placeholder-slate-400 font-medium"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Teléfono</label>
                <input
                    type="text"
                    placeholder="Teléfono de contacto"
                    value={data.phone}
                    onChange={(e) => onChange('phone', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 block p-3 transition-all duration-200 ease-in-out hover:bg-white hover:border-green-300 outline-none placeholder-slate-400 font-medium"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Correo Electrónico</label>
                <input
                    type="text"
                    placeholder="correo@cliente.com"
                    value={data.email}
                    onChange={(e) => onChange('email', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 block p-3 transition-all duration-200 ease-in-out hover:bg-white hover:border-green-300 outline-none placeholder-slate-400 font-medium"
                />
            </div>
        </div>
    </div>
);

const ItemsTable = ({ items, onAddItem, onRemoveItem, onUpdateItem, onMoveItem, darkMode }) => {
    const [draggedIndex, setDraggedIndex] = React.useState(null);
    const [canDrag, setCanDrag] = React.useState(false);

    // Helpers
    const calculateRowTotal = (qty, price, discount) => {
        const sub = qty * price;
        const discAmount = sub * (discount / 100);
        return (sub - discAmount).toFixed(2);
    };

    // Calculate Global Analysis
    const totalCost = items.reduce((acc, item) => acc + (item.qty * (item.cost || 0)), 0);
    const totalSale = items.reduce((acc, item) => {
        const rowTotal = parseFloat(calculateRowTotal(item.qty, item.price, item.discount));
        return acc + rowTotal;
    }, 0);
    const totalProfit = totalSale - totalCost;
    const profitMargin = totalSale > 0 ? ((totalProfit / totalSale) * 100).toFixed(1) : 0;

    // Drag and Drop Handlers
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // HTML5 drag and drop requires setting some data
        e.dataTransfer.setData('text/plain', index);

        // Add a class for styling while dragging
        e.currentTarget.classList.add('opacity-40');
    };

    const handleDragEnd = (e) => {
        setDraggedIndex(null);
        e.currentTarget.classList.remove('opacity-40');
    };

    const handleDragOver = (e, index) => {
        e.preventDefault(); // Required to allow drop
        if (draggedIndex === null || draggedIndex === index) return;

        onMoveItem(draggedIndex, index);
        setDraggedIndex(index);
    };

    return (
        <div className={`p-6 rounded-xl shadow-lg border transition-all hover:shadow-xl text-left ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className={`font-bold flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    <ShoppingCart className="w-5 h-5 text-indigo-500" /> Artículos
                </h3>
                <button onClick={onAddItem} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                    <Plus className="w-4 h-4" /> Agregar Producto
                </button>
            </div>
            <div className="hidden md:block relative z-10">
                <table className="w-full text-sm">
                    <thead>
                        <tr className={`${darkMode ? 'bg-slate-800/50 text-slate-300' : 'bg-gray-50/50 text-slate-600'}`}>
                            <th className="p-3 text-center w-12"></th>
                            <th className="p-3 text-left rounded-l-lg w-16">Cant.</th>
                            <th className="p-3 text-left">Descripción / Producto</th>
                            <th className="p-3 text-right pr-4 w-28 text-orange-500">Precio Empresa</th>
                            <th className="p-3 text-right pr-4 w-32 text-blue-500">Precio Público</th>
                            <th className="p-3 text-right pr-4 w-32 text-indigo-500">Subtotal</th>
                            <th className="p-3 text-center text-xs w-20">% Desc</th>
                            <th className="p-3 text-center rounded-r-lg w-10"></th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                        {items.map((item, index) => (
                            <tr
                                key={item.id}
                                draggable={canDrag}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnd={(e) => {
                                    handleDragEnd(e);
                                    setCanDrag(false);
                                }}
                                onDragOver={(e) => handleDragOver(e, index)}
                                className={`transition-all group cursor-default relative focus-within:z-[60] ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50/50'} ${draggedIndex === index ? 'opacity-20 bg-indigo-50' : ''}`}
                            >
                                <td className="p-2 text-center pointer-events-none">
                                    <div
                                        className="flex justify-center cursor-grab active:cursor-grabbing pointer-events-auto"
                                        onMouseDown={() => setCanDrag(true)}
                                        onMouseUp={() => setCanDrag(false)}
                                        onMouseLeave={() => !draggedIndex && setCanDrag(false)}
                                    >
                                        <GripVertical className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                </td>
                                <td className="p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={item.qty}
                                        onChange={(e) => onUpdateItem(item.id, 'qty', Math.max(0, parseInt(e.target.value) || 0))}
                                        className={`w-16 border rounded-md p-2 text-center focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm ${darkMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                                    />
                                </td>
                                <td className="p-2 relative">
                                    <ProductAutocomplete
                                        value={item.desc}
                                        onChange={(val) => onUpdateItem(item.id, 'desc', val)}
                                        onSelect={(product) => {
                                            onUpdateItem(item.id, 'desc', product.nombre);
                                            onUpdateItem(item.id, 'price', product.precio);
                                            onUpdateItem(item.id, 'cost', product.costo || 0);
                                        }}
                                        darkMode={darkMode}
                                        placeholder="Descripción o buscar producto..."
                                        user={session?.user}
                                    />
                                </td>
                                <td className="p-2">
                                    <div className="relative flex justify-end">
                                        <span className={`absolute left-0 top-2 pl-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.cost || 0}
                                            onChange={(e) => onUpdateItem(item.id, 'cost', Math.max(0, parseFloat(e.target.value) || 0))}
                                            className={`w-28 pl-6 border rounded-md p-2 text-right focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-sm font-medium ${darkMode ? 'bg-slate-900 border-slate-600 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-700'}`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </td>
                                <td className="p-2">
                                    <div className="relative flex justify-end">
                                        <span className={`absolute left-0 top-2 pl-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.price}
                                            onChange={(e) => onUpdateItem(item.id, 'price', Math.max(0, parseFloat(e.target.value) || 0))}
                                            className={`w-32 pl-6 border rounded-md p-2 text-right focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm font-bold ${darkMode ? 'bg-slate-900 border-slate-600 text-blue-400' : 'bg-white border-slate-200 text-blue-700'}`}
                                        />
                                    </div>
                                </td>
                                <td className="p-2 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className={`font-bold ${item.discount > 0 ? 'line-through text-slate-400 text-xs' : (darkMode ? 'text-indigo-400' : 'text-indigo-600')}`}>
                                            ${formatCurrency(item.qty * item.price)}
                                        </span>
                                        {item.discount > 0 && (
                                            <span className={`italic font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                                ${formatCurrency(calculateRowTotal(item.qty, item.price, item.discount))}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={item.discount}
                                        onChange={(e) => onUpdateItem(item.id, 'discount', Math.max(0, parseFloat(e.target.value) || 0))}
                                        className={`w-full border rounded-md p-2 text-center focus:text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm text-xs ${darkMode ? 'bg-slate-900 border-slate-600 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}
                                        placeholder="0"
                                    />
                                </td>
                                <td className="p-2 text-center">
                                    <button
                                        onClick={() => onRemoveItem(item.id)}
                                        className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className={`${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                            <td colSpan="5" className="p-3 text-right font-bold text-sm text-slate-500 uppercase tracking-wide">Subtotal Venta Estimado:</td>
                            <td colSpan="3" className="p-3 text-right font-bold text-blue-600 text-lg">
                                ${formatCurrency(totalSale)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-4">
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className={`p-4 rounded-xl border relative z-0 focus-within:z-[60] ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                    <ShoppingCart className="w-4 h-4" />
                                </div>
                                <span className={`font-bold text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Artículo #{index + 1}</span>
                            </div>
                            <button
                                onClick={() => onRemoveItem(item.id)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] uppercase font-black text-slate-400 mb-1 ml-1">Descripción</label>
                                <ProductAutocomplete
                                    value={item.desc}
                                    onChange={(val) => onUpdateItem(item.id, 'desc', val)}
                                    onSelect={(product) => {
                                        onUpdateItem(item.id, 'desc', product.nombre);
                                        onUpdateItem(item.id, 'price', product.precio);
                                        onUpdateItem(item.id, 'cost', product.costo || 0);
                                    }}
                                    darkMode={darkMode}
                                    placeholder="Nombre del producto..."
                                    user={session?.user}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] uppercase font-black text-slate-400 mb-1 ml-1">Cantidad</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={item.qty}
                                        onChange={(e) => onUpdateItem(item.id, 'qty', Math.max(0, parseInt(e.target.value) || 0))}
                                        className={`w-full border rounded-lg p-3 text-sm text-center focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-black text-slate-400 mb-1 ml-1">% Descuento</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={item.discount}
                                        onChange={(e) => onUpdateItem(item.id, 'discount', Math.max(0, parseFloat(e.target.value) || 0))}
                                        className={`w-full border rounded-lg p-3 text-sm text-center focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] uppercase font-black text-slate-400 mb-1 ml-1">Precio Empresa</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-slate-400 text-xs">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.cost || 0}
                                            onChange={(e) => onUpdateItem(item.id, 'cost', Math.max(0, parseFloat(e.target.value) || 0))}
                                            className={`w-full pl-6 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all ${darkMode ? 'bg-slate-800 border-slate-600 text-orange-400' : 'bg-orange-50/50 border-orange-100 text-orange-700'}`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-black text-slate-400 mb-1 ml-1">Precio Público</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-slate-400 text-xs">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.price}
                                            onChange={(e) => onUpdateItem(item.id, 'price', Math.max(0, parseFloat(e.target.value) || 0))}
                                            className={`w-full pl-6 border rounded-lg p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all ${darkMode ? 'bg-slate-800 border-slate-600 text-blue-400' : 'bg-white border-slate-200 text-blue-700'}`}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={`p-3 rounded-xl flex justify-between items-center ${darkMode ? 'bg-slate-800' : 'bg-white border border-slate-100 shadow-sm'}`}>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Subtotal Item</span>
                                <div className="flex flex-col items-end">
                                    <span className={`font-bold ${item.discount > 0 ? 'line-through text-slate-400 text-[10px]' : (darkMode ? 'text-indigo-400' : 'text-indigo-600')}`}>
                                        ${formatCurrency(item.qty * item.price)}
                                    </span>
                                    {item.discount > 0 && (
                                        <span className={`italic font-bold text-sm ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                            ${formatCurrency(calculateRowTotal(item.qty, item.price, item.discount))}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                <div className={`p-4 rounded-xl flex justify-between items-center ${darkMode ? 'bg-slate-700/50' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'}`}>
                    <span className="font-bold text-xs uppercase tracking-widest">Total Venta Estimado:</span>
                    <span className="font-black text-xl">${formatCurrency(totalSale)}</span>
                </div>
            </div>

            {/* Profit Analysis Footer */}
            <div className={`mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex flex-col">
                    <span className="text-xs uppercase font-bold text-slate-500">Costo Total (Empresa)</span>
                    <span className="text-xl font-bold text-orange-600">${formatCurrency(totalCost)}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs uppercase font-bold text-slate-500">Venta Total (Cliente)</span>
                    <span className="text-xl font-bold text-blue-600">${formatCurrency(totalSale)}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs uppercase font-bold text-slate-500">Ganancia Neta</span>
                    <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${formatCurrency(totalProfit)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${totalProfit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {profitMargin}%
                        </span>
                    </div>
                </div>
            </div>
        </div >
    );
};

const TermsInput = ({ value, onChange, darkMode }) => (
    <div className={`p-6 rounded-xl shadow-lg border transition-all hover:shadow-xl text-left ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <h3 className={`font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            <FileText className="w-5 h-5 text-gray-500" /> Términos y Condiciones
        </h3>
        <label className={`block text-xs font-semibold mb-2 ml-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Escribe los términos legales, garantías o notas adicionales</label>
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full text-sm rounded-lg focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 block p-4 transition-all duration-200 ease-in-out outline-none h-32 leading-relaxed ${darkMode ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500 hover:bg-slate-800 hover:border-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-white hover:border-gray-300 placeholder-slate-400'}`}
            placeholder="• Garantía de servicio...&#10;• Tiempos de entrega...&#10;• Condiciones de pago..."
        ></textarea>
    </div>
);

const TemplateClassic = ({ company, client, items, terms, folio, date, dueDate, subtotal, totalDiscount, totalTax, grandTotal, isPdf, formatCurrency }) => (
    <div className="bg-white max-w-[900px] mx-auto text-gray-800 relative shadow-none" style={{ width: '900px', minHeight: isPdf ? 'auto' : '1100px' }}>
        <div className="h-4 w-full bg-gradient-to-r from-blue-600 via-purple-500 to-purple-600"></div>
        <div className="pt-12 px-12 pb-0 flex flex-col h-full justify-between">
            <div>
                <div className="flex justify-between items-start mb-16">
                    <div className="flex gap-6 items-start w-7/12">
                        {company.logo_uri ? (
                            <img src={company.logo_uri} alt="Logo" className="max-w-32 max-h-32 object-contain rounded-md" />
                        ) : (
                            <div className="w-20 h-20 bg-blue-50 rounded-md flex items-center justify-center text-blue-500">
                                <Building2 className="w-10 h-10" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 mb-1 leading-tight">{company.nombre || "NOMBRE EMPRESA"}</h1>
                            <div className="text-sm text-gray-500 space-y-1">
                                <p>{company.direccion || "Dirección de la empresa, Ciudad, Estado"}</p>
                                <p>{company.correo}</p>
                                <p>{company.telefono}</p>
                                {company.rfc && <p>RFC: {company.rfc}</p>}
                                {company.pagina_web && <p>{company.pagina_web}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="text-right w-5/12">
                        <h2 className="text-2xl font-bold text-gray-700 uppercase tracking-widest mb-6 border-b pb-2">COTIZACIÓN</h2>
                        <div className="text-sm">
                            <div className="grid grid-cols-[100px_1fr] gap-y-2 text-right">
                                <span className="font-bold text-gray-500">Folio:</span><span className="font-bold text-gray-900">#{folio}</span>
                                <span className="font-bold text-gray-500">Fecha:</span><span className="text-gray-700">{date}</span>
                                <span className="font-bold text-gray-500">Vence:</span><span className="text-gray-700">{dueDate}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-12 bg-slate-50 py-8 -mx-12 px-12 border-y border-gray-100/50">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">COTIZACIÓN PARA:</h3>
                    <div className="text-gray-800">
                        <p className="text-2xl font-bold text-slate-800 mb-1">{client.name || "Nombre del Cliente"}</p>
                        <p className="text-gray-600">{client.address}</p>
                        <div className="text-gray-500 mt-1 flex gap-4 text-sm">
                            {client.phone && <span>Tel: {client.phone}</span>}
                            {client.email && <span>Email: {client.email}</span>}
                        </div>
                    </div>
                </div>

                <div className="mb-12">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left py-2 text-xs font-bold text-gray-400 uppercase tracking-widest w-16">Cant.</th>
                                <th className="text-left py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Descripción / Producto</th>
                                <th className="text-right py-2 text-xs font-bold text-gray-400 uppercase tracking-widest w-32">Precio Público</th>
                                <th className="text-right py-2 text-xs font-bold text-gray-400 uppercase tracking-widest w-32">Importe</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {items.map((item, idx) => {
                                const total = (item.qty * item.price) - (item.qty * item.price * (item.discount || 0) / 100);
                                return (
                                    <tr key={idx}>
                                        <td className="py-2 text-sm font-medium text-gray-500 align-top">{item.qty}</td>
                                        <td className="py-2 pr-4 align-top">
                                            <p className="font-bold text-slate-800 text-sm mb-1">{item.desc}</p>
                                            {(item.discount > 0 || item.tax > 0) && (
                                                <p className="text-xs text-blue-500">
                                                    {item.discount > 0 && `Desc. ${item.discount}% `}
                                                    {item.tax > 0 && `+ IVA ${item.tax}%`}
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-2 text-right text-sm text-gray-600 align-top">${formatCurrency(item.price)}</td>
                                        <td className="py-2 text-right text-sm font-bold text-slate-700 align-top">
                                            <div className="flex flex-col items-end">
                                                <span className={item.discount > 0 ? 'line-through text-gray-400 text-xs' : ''}>
                                                    ${formatCurrency(item.qty * item.price)}
                                                </span>
                                                {item.discount > 0 && (
                                                    <span className="italic text-slate-900">
                                                        ${formatCurrency(total)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table >
                </div >
            </div >

            <div className="bg-slate-50 -mx-12 px-12 pt-10 pb-12 mt-auto border-t border-gray-100">
                <div className="flex items-start justify-between">
                    <div className="w-7/12 pr-12">
                        {terms && (
                            <div className="mb-12">
                                <h4 className="font-bold text-slate-700 text-sm mb-3">Términos y Condiciones</h4>
                                <div className="text-xs text-gray-500 leading-relaxed whitespace-pre-line">{terms}</div>
                            </div>
                        )}
                        <div className="mt-12 pt-4 border-t border-gray-100">
                            <p className="text-xs font-bold mb-1 uppercase tracking-wide text-blue-600">Atentamente:</p>
                            <p className="text-lg font-bold text-blue-600">{company.nombre || "Nombre de la Empresa"}</p>
                        </div>
                    </div>
                    <div className="w-5/12 pl-8">
                        <div className="space-y-3 text-right">
                            <div className="flex justify-between text-sm text-gray-500"><span>Subtotal:</span><span className="font-medium text-gray-700">${formatCurrency(subtotal)}</span></div>
                            {totalDiscount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Descuento:</span><span>-${formatCurrency(totalDiscount)}</span></div>}
                            {totalTax > 0 && <div className="flex justify-between text-sm text-gray-500"><span>IVA / Impuestos:</span><span className="font-medium text-gray-700">${formatCurrency(totalTax)}</span></div>}
                            <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-200">
                                <span className="text-lg font-bold text-blue-600">Total:</span>
                                <span className="text-2xl font-bold text-blue-600">${formatCurrency(grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    </div >
);

const TemplateModern = ({ company, client, items, terms, folio, date, dueDate, subtotal, totalDiscount, totalTax, grandTotal, isPdf, formatCurrency }) => (
    <div className="bg-white max-w-[900px] mx-auto text-gray-800 relative shadow-none font-sans" style={{ width: '900px', minHeight: isPdf ? 'auto' : '1100px' }}>
        <div className="flex h-full flex-col justify-between p-12">
            <div>
                <div className="flex justify-between items-end mb-12 border-b-4 border-slate-900 pb-6">
                    <div>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tight uppercase mb-6 leading-none">Cotización</h1>
                        <span className="bg-black text-white px-3 py-1 text-sm font-bold tracking-widest rounded-sm inline-block">#{folio}</span>
                    </div>
                    <div className="text-right">
                        {company.logo_uri ? (
                            <img src={company.logo_uri} alt="Logo" className="max-w-40 max-h-20 object-contain ml-auto" />
                        ) : (
                            <h2 className="text-2xl font-bold text-slate-900">{company.nombre || "TU EMPRESA"}</h2>
                        )}
                        <p className="text-sm text-slate-500 mt-2">{company.direccion}</p>
                        <p className="text-sm text-slate-500">{company.correo} | {company.telefono}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-12">
                    <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Emitido Para</h3>
                        <p className="text-2xl font-bold text-slate-900 leading-tight">{client.name || "Nombre del Cliente"}</p>
                        <p className="text-slate-600 mt-1">{client.address}</p>
                        <p className="text-slate-500 text-sm mt-2">{client.phone} • {client.email}</p>
                    </div>
                    <div className="flex justify-end gap-8">
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Fecha Emisión</h3>
                            <p className="text-lg font-bold text-slate-900">{date}</p>
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Vencimiento</h3>
                            <p className="text-lg font-bold text-red-500">{dueDate}</p>
                        </div>
                    </div>
                </div>

                <table className="w-full mb-12">
                    <thead className="bg-slate-900 text-white">
                        <tr>
                            <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider w-16">Cant</th>
                            <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider">Descripción</th>
                            <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider w-32">Precio Público</th>
                            <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider w-32">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map((item, idx) => {
                            const total = (item.qty * item.price) - (item.qty * item.price * (item.discount || 0) / 100);
                            return (
                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    <td className="py-3 px-4 text-sm font-bold text-slate-900">{item.qty}</td>
                                    <td className="py-3 px-4">
                                        <p className="text-sm font-bold text-slate-900">{item.desc}</p>
                                        {(item.discount > 0 || item.tax > 0) && <p className="text-xs text-slate-400 mt-0.5">{item.discount > 0 && `-${item.discount}%`} {item.tax > 0 && `+IVA`}</p>}
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm text-slate-600">${formatCurrency(item.price)}</td>
                                    <td className="py-3 px-4 text-right text-sm font-bold text-slate-900">
                                        <div className="flex flex-col items-end">
                                            <span className={item.discount > 0 ? 'line-through text-slate-400 text-xs font-normal' : ''}>
                                                ${formatCurrency(item.qty * item.price)}
                                            </span>
                                            {item.discount > 0 && (
                                                <span className="italic text-slate-900">
                                                    ${formatCurrency(total)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div>
                <div className="flex justify-end mb-12">
                    <div className="w-5/12 space-y-2">
                        <div className="flex justify-between text-slate-500 text-sm"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
                        {totalDiscount > 0 && <div className="flex justify-between text-green-600 text-sm"><span>Descuento</span><span>-${formatCurrency(totalDiscount)}</span></div>}
                        {totalTax > 0 && <div className="flex justify-between text-slate-500 text-sm"><span>Impuestos</span><span>${formatCurrency(totalTax)}</span></div>}
                        <div className="flex justify-between items-center text-slate-900 text-2xl font-black pt-4 border-t-2 border-slate-900 mt-4">
                            <span>TOTAL</span>
                            <span>${formatCurrency(grandTotal)}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-12 border-t border-slate-200 pt-8">
                    <div>
                        <h4 className="font-bold text-slate-900 text-sm mb-2">Términos</h4>
                        <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">{terms}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-slate-900 mb-1">Atte:</p>
                        <div className="h-12"></div>
                        <p className="text-lg font-black text-slate-900">{company.nombre}</p>
                    </div>
                </div>
            </div>
        </div>
    </div >
);

const TemplateFormal = ({ company, client, items, terms, folio, date, dueDate, subtotal, totalDiscount, totalTax, grandTotal, isPdf, formatCurrency }) => (
    <div className="bg-white max-w-[900px] mx-auto text-gray-900 relative shadow-none font-serif" style={{ width: '900px', minHeight: isPdf ? 'auto' : '1100px' }}>
        <div className="p-16 flex flex-col h-full justify-between">
            <div>
                <div className="text-center mb-12 border-b border-gray-300 pb-8">
                    {company.logo_uri ? (
                        <img src={company.logo_uri} alt="Logo" className="h-24 object-contain mx-auto mb-4" />
                    ) : (
                        <h1 className="text-3xl font-bold uppercase tracking-widest mb-2 text-gray-800">{company.nombre || "NOMBRE EMPRESA"}</h1>
                    )}
                    <p className="text-sm text-gray-600 tracking-wide">{company.direccion} | {company.telefono} | {company.correo}</p>
                    {company.rfc && <p className="text-sm text-gray-600 tracking-wide mt-1">RFC: {company.rfc}</p>}
                </div>

                <div className="flex justify-between mb-12">
                    <div className="w-1/2 pr-8">
                        <h3 className="text-xs font-bold uppercase border-b border-gray-400 pb-1 mb-3 text-gray-500">Preparado Para</h3>
                        <p className="font-bold text-xl">{client.name}</p>
                        <p className="text-gray-700 mt-1">{client.address}</p>
                        <p className="text-gray-600 text-sm mt-1">{client.phone}</p>
                        <p className="text-gray-600 text-sm">{client.email}</p>
                    </div>
                    <div className="w-1/2 pl-8 border-l border-gray-200">
                        <h3 className="text-xs font-bold uppercase border-b border-gray-400 pb-1 mb-3 text-gray-500">Detalles</h3>
                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                            <span className="text-gray-600">Número de Folio:</span>
                            <span className="font-bold text-right">#{folio}</span>
                            <span className="text-gray-600">Fecha de Emisión:</span>
                            <span className="font-bold text-right">{date}</span>
                            <span className="text-gray-600">Válido Hasta:</span>
                            <span className="font-bold text-right">{dueDate}</span>
                        </div>
                    </div>
                </div>

                <table className="w-full mb-8 border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-y border-gray-300">
                            <th className="py-2 px-3 text-left text-xs font-bold uppercase w-16 text-gray-700">Cant.</th>
                            <th className="py-2 px-3 text-left text-xs font-bold uppercase text-gray-700">Descripción</th>
                            <th className="py-2 px-3 text-right text-xs font-bold uppercase w-32 text-gray-700">Precio Público</th>
                            <th className="py-2 px-3 text-right text-xs font-bold uppercase w-32 text-gray-700">Importe</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => {
                            const total = (item.qty * item.price) - (item.qty * item.price * (item.discount || 0) / 100);
                            return (
                                <tr key={idx} className="border-b border-gray-200">
                                    <td className="py-3 px-3 text-sm">{item.qty}</td>
                                    <td className="py-3 px-3 text-sm">
                                        <div className="font-medium">{item.desc}</div>
                                        {(item.discount > 0) && <div className="text-xs text-gray-500 italic">Descuento aplicado: {item.discount}%</div>}
                                    </td>
                                    <td className="py-3 px-3 text-right text-sm">${formatCurrency(item.price)}</td>
                                    <td className="py-3 px-3 text-right text-sm font-bold">
                                        <div className="flex flex-col items-end">
                                            <span className={item.discount > 0 ? 'line-through text-gray-400 text-xs font-normal' : ''}>
                                                ${formatCurrency(item.qty * item.price)}
                                            </span>
                                            {item.discount > 0 && (
                                                <span className="italic text-gray-900">
                                                    ${formatCurrency(total)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div className="flex justify-end">
                    <div className="w-5/12">
                        <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-sm text-gray-600">Subtotal</span>
                            <span className="text-sm font-medium">${formatCurrency(subtotal)}</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div className="flex justify-between py-2 border-b border-gray-200">
                                <span className="text-sm text-gray-600">Descuento</span>
                                <span className="text-sm font-medium">-${formatCurrency(totalDiscount)}</span>
                            </div>
                        )}
                        {totalTax > 0 && (
                            <div className="flex justify-between py-2 border-b border-gray-200">
                                <span className="text-sm text-gray-600">IVA (16%)</span>
                                <span className="text-sm font-medium">${formatCurrency(totalTax)}</span>
                            </div>
                        )}
                        <div className="flex justify-between py-3 border-b-2 border-gray-800 mt-2">
                            <span className="text-base font-bold uppercase">Total MXN</span>
                            <span className="text-lg font-bold">${formatCurrency(grandTotal)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center text-sm text-gray-500 pt-8 border-t border-gray-200">
                {terms && <p className="mb-4 italic">"{terms}"</p>}
                <p className="font-bold">{company.nombre}</p>
                <p>Gracias por su preferencia.</p>
            </div>
        </div>
    </div>
);

const TemplateCreative = ({ company, client, items, terms, folio, date, dueDate, subtotal, totalDiscount, totalTax, grandTotal, isPdf, formatCurrency }) => (
    <div className="bg-white max-w-[900px] mx-auto text-gray-800 relative shadow-none overflow-hidden" style={{ width: '900px', minHeight: isPdf ? 'auto' : '1100px' }}>
        {/* Abstract Shapes */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 -translate-x-1/4"></div>

        <div className="relative z-10 p-12 flex flex-col h-full justify-between">
            <div>
                <div className="flex justify-between items-center mb-12">
                    <div className="w-1/2">
                        {company.logo_uri ? (
                            <img src={company.logo_uri} alt="Logo" className="max-w-40 max-h-32 object-contain" />
                        ) : (
                            <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-yellow-500">
                                {company.nombre || "CREATIVA"}
                            </div>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-6xl font-black text-slate-900 opacity-10 tracking-tighter">COTIZACIÓN</div>
                        <div className="text-xl font-bold text-pink-500 -mt-8 mr-1">#{folio}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-16">
                    <div className="bg-slate-50/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-100">
                        <span className="text-xs font-bold text-pink-500 uppercase tracking-widest block mb-2">De</span>
                        <p className="font-bold text-slate-800">{company.nombre}</p>
                        <p className="text-sm text-slate-500 mt-1">{company.correo}</p>
                        <p className="text-sm text-slate-500">{company.telefono}</p>
                    </div>
                    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg transform translate-y-4">
                        <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest block mb-2">Para</span>
                        <p className="font-bold text-xl">{client.name}</p>
                        <div className="h-px bg-white/20 my-3"></div>
                        <div className="flex justify-between text-sm text-slate-300">
                            <span>Fecha: {date}</span>
                            <span className="text-yellow-400 font-bold">Vence: {dueDate}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    {items.map((item, idx) => {
                        const total = (item.qty * item.price) - (item.qty * item.price * (item.discount || 0) / 100);
                        return (
                            <div key={idx} className="flex items-center mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-yellow-100 rounded-full flex items-center justify-center font-bold text-pink-600 text-lg mr-4 shrink-0">
                                    {item.qty}
                                </div>
                                <div className="flex-1 pr-4">
                                    <h4 className="font-bold text-slate-800">{item.desc}</h4>
                                    {(item.discount > 0 || item.tax > 0) && (
                                        <div className="flex gap-2 text-xs font-bold mt-1">
                                            {item.discount > 0 && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">-{item.discount}%</span>}
                                            {item.tax > 0 && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">IVA Included</span>}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-400">Precio Público</div>
                                    <div className="font-bold text-slate-700">${formatCurrency(item.price)}</div>
                                </div>
                                <div className="w-32 text-right pl-4 border-l border-slate-100 ml-4">
                                    <div className="text-xs text-pink-500 font-bold">Total</div>
                                    <div className="flex flex-col items-end">
                                        <span className={`font-bold ${item.discount > 0 ? 'line-through text-slate-400 text-xs' : 'text-slate-900'}`}>
                                            ${formatCurrency(item.qty * item.price)}
                                        </span>
                                        {item.discount > 0 && (
                                            <span className="italic font-bold text-slate-900">
                                                ${formatCurrency(total)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div>
                <div className="bg-slate-900 text-white p-8 rounded-3xl flex items-center justify-between shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-yellow-600 opacity-20"></div>
                    <div className="relative z-10 w-1/2">
                        {terms && (
                            <>
                                <h4 className="font-bold text-yellow-400 text-sm mb-2">Notas Importantes</h4>
                                <p className="text-xs text-slate-300 line-clamp-3">{terms}</p>
                            </>
                        )}
                    </div>
                    <div className="relative z-10 text-right">
                        <div className="text-sm text-slate-400">Total a Pagar</div>
                        <div className="text-4xl font-black text-white tracking-tight">${formatCurrency(grandTotal)}</div>
                        <div className="text-xs text-yellow-400 mt-1 uppercase tracking-wide font-bold">{company.nombre}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const PrintableNotaDeVenta = ({ service, company, darkMode }) => {
    if (!service) return null;

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${date.getDate()} / ${months[date.getMonth()]} / ${date.getFullYear()}`;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount || 0);
    };

    const getItems = () => {
        const items = [];
        const original = service.original || {};

        // 1. Labor / Service
        items.push({
            qty: 1,
            description: 'Mano de Obra',
            detail: original.problema_reportado || original.diagnostico_tecnico || original.diagnostico || '',
            price: original.mano_obra || 0,
            total: original.mano_obra || 0
        });

        // 2. Parts / Repuestos
        try {
            let parts = [];
            let partsData = original.repuestos_descripcion || original.inventario_materiales || original.materiales_descripcion;
            const partsCosto = original.repuestos_costo || original.costo_repuestos || original.costo_materiales || original.materiales;

            if (partsData) {
                if (typeof partsData === 'string' && partsData.trim().startsWith('[')) {
                    parts = JSON.parse(partsData);
                } else if (Array.isArray(partsData)) {
                    parts = partsData;
                } else if (typeof partsData === 'string' && partsData.trim() !== '') {
                    // Plain text description
                    items.push({
                        qty: 1,
                        description: partsData,
                        detail: '',
                        price: partsCosto || 0,
                        total: partsCosto || 0
                    });
                }
            }

            if (Array.isArray(parts) && parts.length > 0) {
                parts.forEach(p => {
                    items.push({
                        qty: p.cantidad || 1,
                        description: p.producto || p.descripcion || 'Material/Repuesto',
                        detail: p.numeroSerie ? `S/N: ${p.numeroSerie}` : '',
                        price: p.costoPublico || p.precio_publico || 0,
                        total: (p.cantidad || 1) * (p.costoPublico || p.precio_publico || 0)
                    });
                });
            }
        } catch (e) {
            console.error('Error parsing parts for Nota de Venta:', e);
        }

        return items;
    };

    const items = getItems();
    const original = service.original || {};
    const subtotal = items.reduce((acc, item) => acc + item.total, 0);
    const totalItemsCount = items.reduce((acc, item) => acc + (parseInt(item.qty) || 0), 0);
    const anticipo = original.anticipo || 0;
    const total = service.total || subtotal;
    const discount = 0;

    return (
        <div className="bg-white text-slate-900 w-[900px] min-h-[1100px] flex flex-col font-sans relative" id="nota-venta-printable">
            <style>{`
                .print-exact { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .bg-brand-900 { background-color: #0f172a !important; }
                .bg-brand-100 { background-color: #f1f5f9 !important; }
                .text-brand-900 { color: #0f172a !important; }
                .text-brand-800 { color: #1e293b !important; }
                .border-brand-900 { border-color: #0f172a !important; }
            `}</style>

            <div className="h-4 bg-brand-900 w-full print-exact"></div>

            <div className="px-10 py-6 flex justify-between items-start">
                <div className="w-1/2">
                    <div className="flex items-center gap-3 mb-4">
                        {company?.logo_uri ? (
                            <img src={company.logo_uri} alt="Logo" className="h-12 max-w-[80px] object-contain" />
                        ) : (
                            <div className="h-12 w-12 bg-brand-900 text-white flex items-center justify-center rounded-lg font-bold text-xl print-exact">
                                {company?.nombre?.substring(0, 2).toUpperCase() || 'CS'}
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-brand-900 tracking-tight">{company?.nombre || 'MI EMPRESA'}</h1>
                            <p className="text-xs text-brand-800 uppercase tracking-widest font-semibold">{company?.eslogan || 'Tecnología & Desarrollo'}</p>
                        </div>
                    </div>

                    <div className="text-sm text-gray-500 space-y-1">
                        <p className="flex items-center"><span className="w-20 font-medium text-gray-900">Dirección:</span> {company?.direccion || 'N/A'}</p>
                        <p className="flex items-center"><span className="w-20 font-medium text-gray-900">Teléfono:</span> {company?.telefono || 'N/A'}</p>
                        <p className="flex items-center"><span className="w-20 font-medium text-gray-900">Email:</span> {company?.correo || 'N/A'}</p>
                    </div>
                </div>

                <div className="text-right">
                    <h2 className="text-4xl font-extralight text-gray-300 mb-6 uppercase">NOTA DE VENTA</h2>
                    <div className="inline-block bg-brand-100 rounded-lg p-4 text-left print-exact">
                        <div className="mb-2">
                            <span className="block text-xs uppercase text-brand-800 font-bold tracking-wider">Orden #</span>
                            <span className="text-xl font-mono text-brand-900 font-bold">ORD-{service.folio || service.orden_numero}</span>
                        </div>
                        <div>
                            <span className="block text-xs uppercase text-brand-800 font-bold tracking-wider">Fecha</span>
                            <span className="text-base font-medium text-brand-900">{formatDate(service.fecha)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <hr className="border-gray-100 mx-10" />

            <div className="px-10 py-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Cliente</span>
                <h3 className="text-xl font-bold text-gray-800">{service.cliente || service.cliente_nombre || 'Cliente General'}</h3>
                {service.telefono && <p className="text-gray-500 text-sm mt-1">Tel: {service.telefono}</p>}
            </div>

            <div className="px-10 flex-1">
                <table className="w-full text-left border-collapse overflow-hidden rounded-lg">
                    <thead>
                        <tr className="bg-brand-900 text-white text-xs uppercase tracking-wider print-exact">
                            <th className="py-4 px-4 font-bold w-16 text-center">Cant.</th>
                            <th className="py-4 px-4 font-bold">Descripción / Servicio</th>
                            <th className="py-4 px-4 font-bold text-right w-32">Precio Unit.</th>
                            <th className="py-4 px-4 font-bold text-right w-32">Total</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-gray-700">
                        {items.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100">
                                <td className="py-4 px-4 text-center font-bold">{item.qty}</td>
                                <td className="py-4 px-4">
                                    <p className="font-semibold text-gray-900">{item.description}</p>
                                    {item.detail && <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>}
                                </td>
                                <td className="py-4 px-4 text-right font-mono">{formatCurrency(item.price)}</td>
                                <td className="py-4 px-4 text-right font-mono font-medium text-gray-900">{formatCurrency(item.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="px-10 py-8 flex justify-end">
                <div className="w-1/2 lg:w-1/3">

                    <div className="flex justify-between py-2 text-sm text-gray-600">
                        <span>Total Artículos/Servicios:</span>
                        <span className="font-bold">{totalItemsCount}</span>
                    </div>

                    <div className="border-t border-gray-200 my-2"></div>

                    <div className="flex justify-between py-2 text-sm text-gray-600">
                        <span>Subtotal:</span>
                        <span className="font-mono text-gray-900">{formatCurrency(subtotal)}</span>
                    </div>

                    {anticipo > 0 && (
                        <div className="flex justify-between py-2 text-sm text-blue-600">
                            <span>Anticipo:</span>
                            <span className="font-mono font-medium">- {formatCurrency(anticipo)}</span>
                        </div>
                    )}

                    {discount > 0 && (
                        <div className="flex justify-between py-2 text-sm text-green-600">
                            <span>Descuento:</span>
                            <span className="font-mono font-medium">- {formatCurrency(discount)}</span>
                        </div>
                    )}

                    <div className="flex justify-between py-4 border-t-2 border-brand-900 mt-2 items-center">
                        <span className="text-base font-bold text-brand-900 uppercase tracking-widest">Total Nota</span>
                        <span className="text-2xl font-bold text-brand-900 font-mono">{formatCurrency(total - anticipo - discount)}</span>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 px-10 py-6 border-t border-gray-200 mt-4 text-center print-exact">
                <p className="text-sm font-semibold text-gray-800">¡Gracias por su confianza!</p>
                <p className="text-xs text-gray-500 mt-1 max-w-2xl mx-auto">
                    Este documento es una nota de venta. Para cualquier duda o aclaración sobre este servicio, favor de contactarse en un lapso no mayor a 5 días hábiles.
                </p>
            </div>
        </div>
    );
};

const PrintableQuotation = ({
    company,
    client,
    items,
    terms,
    folio,
    date,
    dueDate,
    includeIva,
    isPdf = false,
    template = 'classic'
}) => {
    // Calculate totals
    const subtotal = items.reduce((acc, item) => {
        const base = item.qty * item.price;
        const discountAmount = base * (item.discount / 100);
        return acc + (base - discountAmount);
    }, 0);

    const totalDiscount = items.reduce((acc, item) => acc + (item.qty * item.price * (item.discount / 100)), 0);
    const totalTax = includeIva ? subtotal * 0.16 : 0;
    const grandTotal = subtotal + totalTax;

    // Default dates if missing
    const validDate = date || new Date().toLocaleDateString();
    const validDueDate = dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString();

    const props = { company, client, items, terms, folio, date: validDate, dueDate: validDueDate, subtotal, totalDiscount, totalTax, grandTotal, isPdf, formatCurrency };

    switch (template) {
        case 'modern': return <TemplateModern {...props} />;
        case 'formal': return <TemplateFormal {...props} />;
        case 'creative': return <TemplateCreative {...props} />;
        case 'classic':
        default:
            return <TemplateClassic {...props} />;
    }
};

// --- CONTACTO & CHANGELOG PAGES ---

const ContactoView = ({ darkMode }) => {
    return (
        <div className="w-full px-4 md:px-8 py-8">
            <h1 className={`text-3xl font-extrabold tracking-tight mb-8 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                <span className="text-blue-600">Contacto</span>
            </h1>
            <div className={`rounded-xl shadow-lg border p-12 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <p className={`text-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    Página de contacto en construcción...
                </p>
            </div>
        </div>
    );
};

const ChangelogView = ({ darkMode }) => {
    return (
        <div className="w-full px-4 md:px-8 py-8">
            <h1 className={`text-3xl font-extrabold tracking-tight mb-8 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                <span className="text-blue-600">Changelog</span>
            </h1>
            <div className={`rounded-xl shadow-lg border p-12 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <p className={`text-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    Registro de cambios en construcción...
                </p>
            </div>
        </div>
    );
};


const CCTVList = ({ darkMode, onNavigate, onViewService, onShowNotaVenta, user, refreshTrigger }) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'servicio_fecha', direction: 'desc' });
    const [showQRTicket, setShowQRTicket] = useState(false);
    const [selectedServiceForQR, setSelectedServiceForQR] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedServiceForReceipt, setSelectedServiceForReceipt] = useState(null);

    useEffect(() => {
        fetchServices();
    }, [user, refreshTrigger]);

    const fetchServices = async () => {
        if (!user) return;
        setRefreshing(true);
        try {
            const { data, error } = await supabase
                .from('servicios_cctv')
                .select('*')
                .eq('user_id', user.id)
                .order('servicio_fecha', { ascending: false });

            if (error) throw error;
            setServices(data || []);
        } catch (error) {
            console.error('Error loading CCTV services:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleShowQR = (service) => {
        setSelectedServiceForQR(service);
        setShowQRTicket(true);
    };

    const handleShowReceipt = (service) => {
        setSelectedServiceForReceipt(service);
        setShowReceipt(true);
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedServices = React.useMemo(() => {
        let sortableItems = [...services];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Check if sorting by date
                if (sortConfig.key.includes('fecha')) {
                    const parseDate = (d) => {
                        if (!d) return 0;
                        // For YYYY-MM-DD, append time to ensure local interpretation
                        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                            const date = new Date(d + 'T00:00:00');
                            if (!isNaN(date.getTime())) return date.getTime();
                        }
                        const date = new Date(d);
                        if (!isNaN(date.getTime())) return date.getTime();
                        const parts = d.split('/');
                        if (parts.length === 3) {
                            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`).getTime();
                        }
                        return 0;
                    };
                    aVal = parseDate(aVal);
                    bVal = parseDate(bVal);
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [services, sortConfig]);

    const handleDelete = async (numero) => {
        if (!window.confirm('¿Estás seguro de eliminar este servicio?')) return;
        try {
            // First get the UUID of the service to delete photos
            const { data: serviceData } = await supabase
                .from('servicios_cctv')
                .select('id')
                .eq('servicio_numero', numero)
                .single();

            if (serviceData) {
                await deleteServicePhotos(serviceData.id);
            }

            const { error } = await supabase
                .from('servicios_cctv')
                .delete()
                .eq('servicio_numero', numero);

            if (error) throw error;
            fetchServices();
            alert('Servicio eliminado correctamente');
        } catch (error) {
            console.error('Error deleting service:', error);
            alert('Error al eliminar servicio');
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader className="animate-spin w-8 h-8 text-blue-600" /></div>;

    return (
        <div className="w-full px-4 md:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h1 className={`text-3xl font-extrabold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        Servicios <span className="text-blue-600">CCTV</span>
                    </h1>
                    <button
                        onClick={fetchServices}
                        className={`p-2 rounded-full transition-all hover:scale-110 ${darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}
                        title="Actualizar lista"
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                </div>
                <button
                    onClick={() => onNavigate('servicios')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                    <ArrowLeft className="w-5 h-5" /> Regresar
                </button>
            </div>

            <div className={`rounded-xl shadow-lg border min-h-[500px] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                {services.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        No hay servicios de CCTV registrados.
                    </div>
                ) : (
                    <>
                        {/* Desktop View */}
                        <div className="hidden md:block">
                            <table className="w-full">
                                <thead className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50/50 border-gray-200'}`}>
                                    <tr>
                                        <th onClick={() => requestSort('servicio_numero')} className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-500/10 transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>
                                            <div className="flex items-center gap-1">
                                                No. Servicio
                                                {sortConfig.key === 'servicio_numero' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Cliente</th>
                                        <th onClick={() => requestSort('servicio_fecha')} className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-500/10 transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>
                                            <div className="flex items-center gap-1">
                                                Fecha
                                                {sortConfig.key === 'servicio_fecha' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Total</th>
                                        <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Estado</th>
                                        <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${darkMode ? 'divide-slate-600' : 'divide-slate-100'}`}>
                                    {sortedServices.map((service) => (
                                        <tr key={service.servicio_numero} className={`transition-colors ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-blue-50/30'}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-bold text-blue-600">#{service.servicio_numero}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-medium ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{service.cliente_nombre}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{formatServiceDate(service.servicio_fecha)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>${formatCurrency(service.total)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusDropdown
                                                    service={service}
                                                    darkMode={darkMode}
                                                    onStatusChange={fetchServices}
                                                    tableName="servicios_cctv"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {service.pagado && service.entregado ? (
                                                        <span className="hidden sm:inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-500/10 backdrop-blur-md border border-green-500/20 rounded-md mr-2">
                                                            Pagado y Entregado
                                                        </span>
                                                    ) : (
                                                        <span className="hidden sm:inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-md mr-2">
                                                            Pendiente de Entregar/Pagar
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => handleShowQR(service)}
                                                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                        title="Ver Ticket QR"
                                                    >
                                                        <QrCode className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleShowReceipt(service)}
                                                        className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Imprimir Ticket"
                                                    >
                                                        <ScrollText className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onShowNotaVenta({ ...service, type: 'CCTV', tableName: 'servicios_cctv', original: service })}
                                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Generar Nota de Venta"
                                                    >
                                                        <FileText className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onViewService(service)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Ver Servicio"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onNavigate('services-cctv-edit')}
                                                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Editar Servicio"
                                                    >
                                                        <Edit2 className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(service.servicio_numero)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar Servicio"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="md:hidden flex flex-col gap-4 p-4">
                            {sortedServices.map((service) => (
                                <div
                                    key={`mobile-cctv-${service.servicio_numero}`}
                                    className={`rounded-2xl p-5 border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 mb-2">
                                                #{service.servicio_numero}
                                            </span>
                                            <h3 className={`text-lg font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                                {service.cliente_nombre}
                                            </h3>
                                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {formatServiceDate(service.servicio_fecha)}
                                            </p>
                                        </div>
                                        <StatusDropdown
                                            service={service}
                                            darkMode={darkMode}
                                            onStatusChange={fetchServices}
                                            tableName="servicios_cctv"
                                        />
                                    </div>

                                    <div className="flex justify-between items-end border-t border-dashed pt-4 border-slate-200 dark:border-slate-700">
                                        <div>
                                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total</p>
                                            <p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                ${formatCurrency(service.total)}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleShowQR(service)}
                                                className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"
                                            >
                                                <QrCode className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleShowReceipt(service)}
                                                className="p-2.5 bg-slate-50 text-slate-600 rounded-xl"
                                            >
                                                <ScrollText className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onShowNotaVenta({ ...service, type: 'CCTV', tableName: 'servicios_cctv', original: service })}
                                                className="p-2.5 bg-blue-50 text-blue-500 rounded-xl"
                                                title="Generar Nota de Venta"
                                            >
                                                <FileText className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onViewService(service)}
                                                className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onNavigate('services-cctv-edit')}
                                                className="p-2.5 bg-slate-50 text-slate-600 rounded-xl"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(service.servicio_numero)}
                                                className="p-2.5 bg-red-50 text-red-600 rounded-xl"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* QR Ticket Modal */}
            {
                showQRTicket && selectedServiceForQR && (
                    <QRServiceTicket
                        service={selectedServiceForQR}
                        onClose={() => {
                            setShowQRTicket(false);
                            setSelectedServiceForQR(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }

            {/* Receipt Modal */}
            {
                showReceipt && selectedServiceForReceipt && (
                    <ServiceReceipt
                        service={selectedServiceForReceipt}
                        onClose={() => {
                            setShowReceipt(false);
                            setSelectedServiceForReceipt(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }
        </div>
    );
};

const CCTVServiceView = ({ service, onBack, onEdit, darkMode, company }) => {
    if (!service) return null;

    const [showQRTicket, setShowQRTicket] = useState(false);
    const [selectedServiceForQR, setSelectedServiceForQR] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedServiceForReceipt, setSelectedServiceForReceipt] = useState(null);

    const handleShowQR = (service) => {
        setSelectedServiceForQR(service);
        setShowQRTicket(true);
    };

    const handleShowReceipt = (service) => {
        setSelectedServiceForReceipt(service);
        setShowReceipt(true);
    };

    const [photos, setPhotos] = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);

    useEffect(() => {
        if (service?.id) fetchPhotos();
    }, [service]);

    const fetchPhotos = async () => {
        setLoadingPhotos(true);
        try {
            const { data, error } = await supabase
                .from('servicio_fotos')
                .select('*')
                .eq('servicio_id', service.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setPhotos(data || []);
        } catch (error) {
            console.error('Error fetching photos:', error);
        } finally {
            setLoadingPhotos(false);
        }
    };

    const formatMoney = (amount) => `$${formatCurrency(amount || 0)}`;

    return (
        <div className="w-full min-h-screen p-6 md:p-10">
            <div className="max-w-7xl mx-auto bg-white rounded-3xl overflow-hidden shadow-2xl border border-blue-100">

                {/* Header Section */}
                <div className="p-8 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-5">
                            <button onClick={onBack} className="p-3 bg-white rounded-full shadow-sm hover:shadow-md transition-all text-slate-600 hover:text-blue-600">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div className="flex items-start gap-4">
                                {company?.logo_uri ? (
                                    <img src={company.logo_uri} alt="Logo" className="w-20 h-20 object-contain p-1 rounded-xl bg-white shadow-sm" />
                                ) : (
                                    <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-blue-600/20">{company?.nombre?.charAt(0) || 'C'}</div>
                                )}
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{company?.nombre || 'Mi Empresa'}</h2>
                                    {company?.direccion && <p className="text-[10px] text-slate-500 max-w-[250px] leading-tight mt-1">{company.direccion}</p>}
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                        {company?.telefono && <p className="text-[10px] font-bold text-slate-600">Tel: {company.telefono}</p>}
                                        {company?.correo && <p className="text-[10px] font-bold text-slate-600">{company.correo}</p>}
                                        {company?.rfc && <p className="text-[10px] font-bold text-blue-600 uppercase">RFC: {company.rfc}</p>}
                                    </div>
                                    <div className="flex gap-3 mt-3 no-print">
                                        <button onClick={() => onEdit(service)} className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm">
                                            <Edit2 className="w-3.5 h-3.5" /> EDITAR REPORTE
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-left md:text-right">
                            <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-1">Servicio CCTV</span>
                            <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-2">#{service.servicio_numero}</h1>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-xl shadow-lg">
                                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-xs font-mono font-bold">{formatServiceDate(service.servicio_fecha)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="p-8 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column - 2 cols */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Cliente y Técnico */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Cliente */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <User className="w-5 h-5 text-blue-600" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600">Cliente</h3>
                                </div>
                                <p className="text-xl font-bold text-slate-800 mb-1">{service.cliente_nombre}</p>
                                <p className="text-sm text-slate-500 mb-1">{service.cliente_telefono}</p>
                                {service.cliente_correo && <p className="text-xs text-slate-500 mb-1">{service.cliente_correo}</p>}
                                <p className="text-xs text-slate-400 truncate" title={service.cliente_direccion}>{service.cliente_direccion}</p>
                            </div>

                            {/* Técnico Responsable */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-white border border-orange-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users className="w-5 h-5 text-orange-600" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600">Técnico Responsable</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                                        {service.tecnico_nombre ? service.tecnico_nombre.charAt(0) : 'I'}
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-slate-800">{service.tecnico_nombre || 'Sin asignar'}</p>
                                        <p className="text-xs text-slate-500">{service.tecnico_celular || 'Asignado al servicio'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Equipamiento y Grabador */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Detalles del Grabador */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-white border border-purple-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Video className="w-5 h-5 text-purple-600" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-purple-600">Grabador (DVR/NVR)</h3>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Marca / Tipo</p>
                                        <p className="text-sm font-bold text-slate-700">{service.marca_principal} • {service.tipo_grabador}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">IP Local</p>
                                        <p className="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded w-fit">{service.ip_grabador || 'No especificada'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Dominio / ID Nube</p>
                                        <p className="text-sm font-mono text-slate-600 truncate">{service.dominio_ddns || service.id_nube_p2p || 'No configurado'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Cámaras */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Monitor className="w-5 h-5 text-indigo-600" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600">Cámaras Instaladas</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {service.tipos_camaras?.map((cam, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 uppercase">
                                            {cam}
                                        </span>
                                    )) || <p className="text-sm text-slate-500 italic">No especificadas</p>}
                                </div>
                            </div>
                        </div>

                        {/* Credenciales - Información Sensible */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 text-white shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-blue-400" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">Acceso y Credenciales</h3>
                                </div>
                                <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Usuario</p>
                                    <p className="text-lg font-mono font-bold text-blue-300">{service.usuario || 'admin'}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Contraseña</p>
                                    <p className="text-lg font-mono font-bold text-amber-300">{service.contrasena || '****'}</p>
                                </div>
                            </div>
                            <p className="mt-4 text-[10px] text-slate-500 italic text-center">Información confidencial para el mantenimiento del sistema.</p>
                        </div>

                        {/* Garantía */}
                        {service.garantia_aplica && (
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-teal-50 to-white border border-teal-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Check className="w-5 h-5 text-teal-600" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-teal-600">Cobertura de Garantía</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-xl bg-teal-500/5 border border-teal-500/10">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Inicia</p>
                                        <p className="text-sm font-bold text-slate-700">{formatServiceDate(service.garantia_fecha_inicio)}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Vence</p>
                                        <p className="text-sm font-bold text-rose-600">{formatServiceDate(service.garantia_fecha_vencimiento)}</p>
                                    </div>
                                </div>
                                {service.garantia_detalles && (
                                    <div className="mt-4 p-3 bg-white/50 rounded-xl border border-teal-100">
                                        <p className="text-xs text-slate-600 italic">"{service.garantia_detalles}"</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Materiales Utilizados */}
                        {(service.inventario_materiales && service.inventario_materiales !== '[]') && (
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                                <div className="flex items-center gap-2 mb-4">
                                    <ShoppingCart className="w-5 h-5 text-slate-600" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Materiales Utilizados</h3>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex text-xs font-bold text-slate-500 border-b border-slate-200 pb-2 mb-2">
                                        <div className="w-12 text-center">Cant</div>
                                        <div className="flex-1">Articulo</div>
                                        <div className="w-24 text-right">Precio U.</div>
                                        <div className="w-24 text-right">Total</div>
                                    </div>
                                    {(() => {
                                        try {
                                            let parts = [];
                                            if (typeof service.inventario_materiales === 'string') {
                                                parts = JSON.parse(service.inventario_materiales);
                                            } else {
                                                parts = service.inventario_materiales;
                                            }

                                            if (Array.isArray(parts)) {
                                                return parts.map((part, i) => (
                                                    <div key={i} className="flex items-start text-sm py-1 border-b border-slate-100 last:border-0">
                                                        <div className="w-12 text-center text-slate-500">{part.cantidad || 1}</div>
                                                        <div className="flex-1 text-slate-700 font-medium">{part.producto || part.descripcion}</div>
                                                        <div className="w-24 text-right text-slate-600 font-mono">${formatCurrency(part.costoPublico || part.precio_publico || 0)}</div>
                                                        <div className="w-24 text-right text-slate-800 font-mono font-bold">${formatCurrency((part.cantidad || 1) * (part.costoPublico || part.precio_publico || 0))}</div>
                                                    </div>
                                                ));
                                            }
                                            return <p className="text-sm text-slate-700">{service.inventario_materiales}</p>;
                                        } catch (e) {
                                            return <p className="text-sm text-slate-700">{service.inventario_materiales}</p>;
                                        }
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Resumen Financiero */}
                    <div className="lg:col-span-1">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 sticky top-6">
                            <div className="flex items-center gap-2 mb-6">
                                <ShoppingCart className="w-5 h-5 text-blue-600" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600">Resumen Financiero</h3>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Mano de Obra</span>
                                    <span className="font-semibold text-slate-800">{formatMoney(service.mano_obra)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Materiales</span>
                                    <span className="font-semibold text-slate-800">{formatMoney(service.materiales)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600 font-bold">Total Servicio</span>
                                    <span className="font-bold text-slate-900">{formatMoney(service.total)}</span>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-4 mb-6">
                                <p className="text-xs text-blue-400 uppercase tracking-wider mb-2 text-center font-bold">Saldo Pendiente</p>
                                <p className={`text-4xl font-black text-center ${service.saldo > 0 ? 'text-rose-600' : 'text-green-600'}`}>
                                    {formatMoney(service.saldo)}
                                </p>
                            </div>

                            <div className="space-y-2 p-4 rounded-xl bg-white border border-slate-200">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600 font-bold uppercase text-xs">Anticipo</span>
                                    <span className="font-bold text-blue-600">-{formatMoney(service.anticipo)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed border-slate-300">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${service.pagado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {service.pagado ? 'Totalmente Pagado' : 'Pendiente de Pago'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Photo Gallery */}
                <div className="p-8 md:p-10 border-t border-slate-100 bg-slate-50/30">
                    <div className="flex items-center gap-2 mb-6">
                        <Image className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">Evidencia Fotográfica</h3>
                    </div>

                    {loadingPhotos ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                            <p className="text-sm text-slate-500 font-medium">Cargando fotografías...</p>
                        </div>
                    ) : photos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {photos.map((photo, index) => (
                                <div key={photo.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-200 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500">
                                    <img src={photo.uri} alt={`Foto ${index + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                        <button onClick={() => window.open(photo.uri, '_blank')} className="w-full py-2 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-white/40 transition-colors">
                                            Ver Imagen
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
                            <p className="text-slate-400 font-medium italic">No hay fotografías registradas para este servicio</p>
                        </div>
                    )}
                </div>

                {/* Firmas */}
                {(service.firma_tecnico_path || service.firma_cliente_path) && (
                    <div className="px-8 md:px-10 pb-8 grid grid-cols-2 gap-6">
                        {service.firma_tecnico_path && (
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                                <img src={service.firma_tecnico_path} alt="Firma Técnico" className="h-16 object-contain mb-3 mix-blend-multiply" />
                                <p className="text-xs uppercase tracking-widest text-slate-400">Firma del Técnico</p>
                            </div>
                        )}
                        {service.firma_cliente_path && (
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                                <img src={service.firma_cliente_path} alt="Firma Cliente" className="h-16 object-contain mb-3 mix-blend-multiply" />
                                <p className="text-xs uppercase tracking-widest text-slate-400">Firma de Conformidad</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* QR Ticket Modal */}
            {
                showQRTicket && selectedServiceForQR && (
                    <QRServiceTicket
                        service={selectedServiceForQR}
                        onClose={() => {
                            setShowQRTicket(false);
                            setSelectedServiceForQR(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }

            {/* Receipt Modal */}
            {
                showReceipt && selectedServiceForReceipt && (
                    <ServiceReceipt
                        service={selectedServiceForReceipt}
                        onClose={() => {
                            setShowReceipt(false);
                            setSelectedServiceForReceipt(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }
        </div>
    );
};

// Status Dropdown Component
const StatusDropdown = ({ service, darkMode, onStatusChange, tableName = 'servicios_pc' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleStatusUpdate = async (newStatus) => {
        setUpdating(true);
        try {
            // Determinar campo de ID y de Estado según la tabla
            let idField = 'id';
            let idValue = service.id;
            // Corregido: para CCTV el campo es 'status' según indicación del usuario, no 'estatus'
            const statusField = tableName === 'servicios_cctv' ? 'status' : 'status';

            const updatePayload = { [statusField]: newStatus };

            // Sincronizar estado de pago/entrega para todos los servicios (incluido CCTV)
            if (tableName === 'servicios_pc' || tableName === 'servicios_celular' || tableName === 'servicios_cctv' || tableName === 'servicios_impresora') {
                if (newStatus === 'entregado') {
                    updatePayload.pagado = true;
                    updatePayload.entregado = true;
                } else if (newStatus === 'recibido') {
                    updatePayload.pagado = false;
                    updatePayload.entregado = false;
                }
            }

            // Handle Printer Service Special Case (No status column)
            // User confirmed column "status" DOES exist now.
            if (tableName === 'servicios_impresora') {
                // No need to delete status or use workaround anymore.
                // Just ensure status is part of payload.
                updatePayload.status = newStatus;
            }

            const { error } = await supabase
                .from(tableName)
                .update(updatePayload)
                .eq(idField, idValue);

            if (error) throw error;
            onStatusChange();
            setIsOpen(false);
        } catch (error) {
            console.error(`Error updating status in ${tableName}:`, error);
            alert('Error al actualizar estado');
        } finally {
            setUpdating(false);
        }
    };

    const getStatusColorClass = (colorName) => {
        const colors = {
            black: 'bg-slate-900 text-white ring-slate-900/20 shadow-lg shadow-slate-900/10',
            yellow: 'bg-amber-400 text-amber-950 ring-amber-400/20 shadow-lg shadow-amber-400/10',
            blue: 'bg-blue-600 text-white ring-blue-600/20 shadow-lg shadow-blue-600/10',
            green: 'bg-emerald-500 text-white ring-emerald-500/20 shadow-lg shadow-emerald-500/10',
            red: 'bg-rose-500 text-white ring-rose-500/20 shadow-lg shadow-rose-500/10',
            gray: 'bg-slate-500 text-white ring-slate-500/20 shadow-lg shadow-slate-500/10'
        };
        return colors[colorName] || colors.gray;
    };

    const statusValue = (tableName === 'servicios_cctv' ? service.status : (tableName === 'servicios_impresora' ? service.status : service.status)) || 'pendiente';
    const currentStatus = STATUS_OPTIONS.find(s => s.value === statusValue.toLowerCase());
    const displayLabel = currentStatus ? currentStatus.label : (statusValue || 'Seleccionar Estado');
    const displayColor = currentStatus ? currentStatus.color : 'gray';

    return (
        <div className="relative inline-block w-full" ref={dropdownRef}>
            <button
                onClick={() => {
                    if (!isOpen && dropdownRef.current) {
                        const rect = dropdownRef.current.getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom;
                        const shouldOpenUpward = spaceBelow < 300;
                        setOpenUpward(shouldOpenUpward);
                    }
                    setIsOpen(!isOpen);
                }}
                disabled={updating}
                className={`w-full px-4 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center justify-between gap-3 group relative overflow-hidden ${getStatusColorClass(displayColor)} ${updating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95 cursor-pointer shadow-md hover:shadow-xl'} ring-1`}
            >
                {updating ? (
                    <div className="flex items-center gap-2 justify-center w-full">
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Espere...</span>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className={`w-1.5 h-1.5 rounded-full bg-white opacity-50 group-hover:opacity-100 transition-opacity animate-pulse`}></div>
                            <span className="truncate">{displayLabel}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 opacity-70 group-hover:opacity-100 transition-all duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </button>

            {isOpen && !updating && (
                <div
                    className={`absolute z-[200] w-56 rounded-md shadow-lg border overflow-hidden ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                >
                    {STATUS_OPTIONS.map((status) => (
                        <button
                            key={status.value}
                            onClick={() => handleStatusUpdate(status.value)}
                            className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-between group transition-all ${darkMode
                                ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
                                : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full shadow-sm ${status.color === 'black' ? 'bg-slate-900' :
                                    status.color === 'yellow' ? 'bg-amber-400' :
                                        status.color === 'blue' ? 'bg-blue-600' :
                                            status.color === 'green' ? 'bg-emerald-500' :
                                                status.color === 'red' ? 'bg-rose-500' : 'bg-slate-400'
                                    }`}></div>
                                <span>{status.label}</span>
                            </div>
                            {statusValue === status.value && (
                                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const PCList = ({ darkMode, onNavigate, onViewService, onCreateNew, onEdit, onShowNotaVenta, user, refreshTrigger }) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });
    const [showQRTicket, setShowQRTicket] = useState(false);
    const [selectedServiceForQR, setSelectedServiceForQR] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedServiceForReceipt, setSelectedServiceForReceipt] = useState(null);

    useEffect(() => {
        fetchServices();
    }, [user, refreshTrigger]);

    const fetchServices = async () => {
        if (!user) return;
        setRefreshing(true);
        try {
            const { data, error } = await supabase
                .from('servicios_pc')
                .select('*')
                .eq('user_id', user.id)
                .order('fecha', { ascending: false });

            if (error) throw error;
            setServices(data || []);
        } catch (error) {
            console.error('Error loading PC services:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedServices = React.useMemo(() => {
        let sortableItems = [...services];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Check if sorting by date
                if (sortConfig.key.includes('fecha')) {
                    const parseDate = (d) => {
                        if (!d) return 0;
                        // For YYYY-MM-DD, append time to ensure local interpretation
                        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                            const date = new Date(d + 'T00:00:00');
                            if (!isNaN(date.getTime())) return date.getTime();
                        }
                        const date = new Date(d);
                        if (!isNaN(date.getTime())) return date.getTime();
                        const parts = d.split('/');
                        if (parts.length === 3) {
                            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`).getTime();
                        }
                        return 0;
                    };
                    aVal = parseDate(aVal);
                    bVal = parseDate(bVal);
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [services, sortConfig]);

    // ... (rest of handlers)

    const handleShowQR = (service) => {
        setSelectedServiceForQR(service);
        setShowQRTicket(true);
    };

    const handleShowReceipt = (service) => {
        setSelectedServiceForReceipt(service);
        setShowReceipt(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este servicio?')) return;
        try {
            await deleteServicePhotos(id);
            const { error } = await supabase
                .from('servicios_pc')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setServices(services.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting service:', error);
            alert('Error al eliminar servicio');
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader className="animate-spin w-8 h-8 text-blue-600" /></div>;

    return (
        <div className="w-full px-4 md:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h1 className={`text-3xl font-extrabold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        Servicios <span className="text-blue-600">PC</span>
                    </h1>
                    <button
                        onClick={fetchServices}
                        className={`p-2 rounded-full transition-all hover:scale-110 ${darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}
                        title="Actualizar lista"
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onCreateNew}
                        className="btn bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Servicio
                    </button>
                </div>
            </div>

            <div className={`rounded-xl shadow-lg border min-h-[600px] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                {services.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        No hay servicios de PC registrados.
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block pb-64">
                            <table className="w-full">
                                <thead className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50/50 border-gray-200'}`}>
                                    <tr>
                                        <th onClick={() => requestSort('orden_numero')} className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-500/10 transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>
                                            <div className="flex items-center gap-1">
                                                No. Servicio
                                                {sortConfig.key === 'orden_numero' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Cliente</th>
                                        <th onClick={() => requestSort('fecha')} className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-500/10 transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>
                                            <div className="flex items-center gap-1">
                                                Fecha
                                                {sortConfig.key === 'fecha' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Total</th>
                                        <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Estado</th>
                                        <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${darkMode ? 'divide-slate-600' : 'divide-slate-100'}`}>
                                    {sortedServices.map((service) => (
                                        <tr key={service.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-blue-50/30'}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-bold text-blue-600">#{service.orden_numero}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-medium ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{service.cliente_nombre}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{formatServiceDate(service.fecha)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>${formatCurrency(service.total)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusDropdown
                                                    service={service}
                                                    darkMode={darkMode}
                                                    onStatusChange={fetchServices}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">

                                                    <button
                                                        onClick={() => handleShowQR(service)}
                                                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                        title="Ver QR de Seguimiento"
                                                    >
                                                        <QrCode className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleShowReceipt(service)}
                                                        className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Imprimir Ticket"
                                                    >
                                                        <ScrollText className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onShowNotaVenta({ ...service, type: 'PC', tableName: 'servicios_pc', original: service })}
                                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Generar Nota de Venta"
                                                    >
                                                        <FileText className="w-5 h-5" />
                                                    </button>

                                                    {service.pagado && service.entregado ? (
                                                        <span className="hidden sm:inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-500/10 backdrop-blur-md border border-green-500/20 rounded-md mr-2">
                                                            Pagado y Entregado
                                                        </span>
                                                    ) : (
                                                        <span className="hidden sm:inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-md mr-2">
                                                            Pendiente de Entregar/Pagar
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => onViewService(service)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Ver Servicio"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onEdit(service)}
                                                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Editar Servicio"
                                                    >
                                                        <Edit2 className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(service.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar Servicio"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="md:hidden flex flex-col gap-4 p-4 pb-24">
                            {sortedServices.map((service) => (
                                <div
                                    key={`mobile-pc-${service.id}`}
                                    className={`rounded-2xl p-5 border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 mb-2">
                                                #{service.orden_numero}
                                            </span>
                                            <h3 className={`text-lg font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                                {service.cliente_nombre}
                                            </h3>
                                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {formatServiceDate(service.fecha)}
                                            </p>
                                        </div>
                                        <StatusDropdown
                                            service={service}
                                            darkMode={darkMode}
                                            onStatusChange={fetchServices}
                                        />
                                    </div>

                                    <div className="flex justify-between items-end border-t border-dashed pt-4 border-slate-200 dark:border-slate-700">
                                        <div>
                                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total</p>
                                            <p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                ${formatCurrency(service.total)}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleShowQR(service)}
                                                className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"
                                            >
                                                <QrCode className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleShowReceipt(service)}
                                                className="p-2.5 bg-slate-50 text-slate-600 rounded-xl"
                                            >
                                                <ScrollText className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onShowNotaVenta({ ...service, type: 'PC', tableName: 'servicios_pc', original: service })}
                                                className="p-2.5 bg-blue-50 text-blue-500 rounded-xl"
                                                title="Generar Nota de Venta"
                                            >
                                                <FileText className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onViewService(service)}
                                                className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onEdit(service)}
                                                className="p-2.5 bg-slate-50 text-slate-600 rounded-xl"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(service.id)}
                                                className="p-2.5 bg-red-50 text-red-600 rounded-xl"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>


                )}
            </div>

            {/* QR Ticket Modal */}
            {
                showQRTicket && selectedServiceForQR && (
                    <QRServiceTicket
                        service={selectedServiceForQR}
                        onClose={() => {
                            setShowQRTicket(false);
                            setSelectedServiceForQR(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }

            {/* Receipt Modal */}
            {
                showReceipt && selectedServiceForReceipt && (
                    <ServiceReceipt
                        service={selectedServiceForReceipt}
                        onClose={() => {
                            setShowReceipt(false);
                            setSelectedServiceForReceipt(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }
        </div >
    );
};

const PCServiceView = ({ service, onBack, onEdit, darkMode, company }) => {
    if (!service) return null;

    const [showQRTicket, setShowQRTicket] = useState(false);
    const [selectedServiceForQR, setSelectedServiceForQR] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedServiceForReceipt, setSelectedServiceForReceipt] = useState(null);

    const handleShowQR = (service) => {
        setSelectedServiceForQR(service);
        setShowQRTicket(true);
    };

    const handleShowReceipt = (service) => {
        setSelectedServiceForReceipt(service);
        setShowReceipt(true);
    };

    const [photos, setPhotos] = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);

    useEffect(() => {
        if (service?.id) fetchPhotos();
    }, [service]);

    const fetchPhotos = async () => {
        setLoadingPhotos(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('servicio_fotos')
                .select('*')
                .eq('servicio_id', service.id)
                .eq('user_id', user.id)
                .eq('tipo_servicio', 'servicios_pc');

            if (error) throw error;

            // Map the data to ensure 'uri' property exists (assuming 'foto_url' or 'url' is used in the database if 'uri' is missing)
            const mappedPhotos = (data || []).map(photo => ({
                ...photo,
                uri: photo.foto_url || photo.url || photo.uri || ''
            }));

            setPhotos(mappedPhotos);
        } catch (error) {
            console.error('Error fetching photos:', error);
        } finally {
            setLoadingPhotos(false);
        }
    };

    const formatMoney = (amount) => `$${formatCurrency(amount || 0)}`;

    return (
        <div className="w-full min-h-screen p-6 md:p-10">
            <div className="max-w-7xl mx-auto bg-white rounded-3xl overflow-hidden shadow-2xl border border-blue-100">

                {/* Header Section */}
                <div className="p-8 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-5">
                            <button onClick={onBack} className="p-3 bg-white rounded-full shadow-sm hover:shadow-md transition-all text-slate-600 hover:text-blue-600">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div className="flex items-start gap-4">
                                {company?.logo_uri ? (
                                    <img src={company.logo_uri} alt="Logo" className="w-20 h-20 object-contain p-1 rounded-xl bg-white shadow-sm" />
                                ) : (
                                    <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-blue-600/20">{company?.nombre?.charAt(0) || 'C'}</div>
                                )}
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{company?.nombre || 'Mi Empresa'}</h2>
                                    {company?.direccion && <p className="text-[10px] text-slate-500 max-w-[250px] leading-tight mt-1">{company.direccion}</p>}
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                        {company?.telefono && <p className="text-[10px] font-bold text-slate-600">Tel: {company.telefono}</p>}
                                        {company?.correo && <p className="text-[10px] font-bold text-slate-600">{company.correo}</p>}
                                        {company?.rfc && <p className="text-[10px] font-bold text-blue-600 uppercase">RFC: {company.rfc}</p>}
                                    </div>
                                    <div className="flex gap-3 mt-3 no-print">
                                        <button onClick={() => handleShowQR(service)} className="px-4 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all flex items-center gap-2 shadow-sm">
                                            <QrCode className="w-3.5 h-3.5" /> TICKET QR
                                        </button>
                                        <button onClick={() => handleShowReceipt(service)} className="px-4 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all flex items-center gap-2 shadow-sm">
                                            <ScrollText className="w-3.5 h-3.5" /> RECIBO
                                        </button>
                                        <button onClick={() => onEdit(service)} className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm">
                                            <Edit2 className="w-3.5 h-3.5" /> EDITAR REPORTE
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-left md:text-right">
                            <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-1">Reparación de PC</span>
                            <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-2">#{service.orden_numero}</h1>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-xl shadow-lg">
                                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-xs font-mono font-bold">{formatServiceDate(service.fecha)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="p-8 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column - 2 cols */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Cliente y Técnico */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Cliente */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <User className="w-5 h-5 text-blue-600" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600">Cliente</h3>
                                </div>
                                <p className="text-xl font-bold text-slate-800 mb-1">{service.cliente_nombre}</p>
                                <p className="text-sm text-slate-500">{service.cliente_telefono}</p>
                            </div>

                            {/* Técnico Responsable */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-white border border-orange-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users className="w-5 h-5 text-orange-600" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600">Técnico Responsable</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                                        {service.tecnico_nombre ? service.tecnico_nombre.charAt(0) : 'I'}
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-slate-800">{service.tecnico_nombre || 'Sin asignar'}</p>
                                        <p className="text-xs text-slate-500">Asignado al servicio</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dispositivo */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-white border border-purple-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Monitor className="w-5 h-5 text-purple-600" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-600">Dispositivo</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Equipo</p>
                                    <p className="text-base font-semibold text-slate-800">{service.equipo_tipo} • {service.equipo_modelo}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Número de Serie</p>
                                    <p className="text-base font-mono text-slate-600">{service.equipo_serie}</p>
                                </div>
                            </div>
                        </div>

                        {/* Informe Técnico */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-50 to-white border border-cyan-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Settings className="w-5 h-5 text-cyan-600" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-600">Informe Técnico</h3>
                            </div>

                            <div className="space-y-4">
                                {/* Problema Reportado */}
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-bold">Problema Reportado</p>
                                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                                        {(service.problema_reportado || '').split('\n').map((line, i) => (
                                            line.trim() && (
                                                <div key={i} className="flex gap-2 items-start mb-1 last:mb-0">
                                                    <Check className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" strokeWidth={3} />
                                                    <span className="text-sm text-red-800">{line}</span>
                                                </div>
                                            )
                                        ))}
                                        {!service.problema_reportado && <p className="text-sm text-red-600 italic">No especificado</p>}
                                    </div>
                                </div>

                                {/* Diagnóstico */}
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-bold">Diagnóstico Realizado</p>
                                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                        {(service.diagnostico_tecnico || '').split('\n').map((line, i) => (
                                            line.trim() && (
                                                <div key={i} className="flex gap-2 items-start mb-1 last:mb-0">
                                                    <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" strokeWidth={3} />
                                                    <span className="text-sm text-blue-800">{line}</span>
                                                </div>
                                            )
                                        ))}
                                        {!service.diagnostico_tecnico && <p className="text-sm text-blue-600 italic">Diagnóstico pendiente...</p>}
                                    </div>
                                </div>

                                {/* Trabajo Realizado */}
                                {service.trabajo_realizado && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-bold">Trabajo Realizado</p>
                                        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                                            {(Array.isArray(service.trabajo_realizado) ? service.trabajo_realizado : (typeof service.trabajo_realizado === 'string' ? service.trabajo_realizado.split(',') : [])).map((item, i) => (
                                                <div key={i} className="flex gap-2 items-start mb-1 last:mb-0">
                                                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" strokeWidth={3} />
                                                    <span className="text-sm text-green-800">{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Repuestos */}
                                {(service.repuestos_descripcion && service.repuestos_descripcion !== '[]') && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-bold">Repuestos & Materiales</p>
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                            {(() => {
                                                try {
                                                    // Try to parse as JSON for new format
                                                    if (service.repuestos_descripcion && service.repuestos_descripcion.startsWith('[')) {
                                                        const parts = JSON.parse(service.repuestos_descripcion);
                                                        return (
                                                            <div className="w-full">
                                                                <div className="flex text-xs font-bold text-slate-500 border-b border-slate-200 pb-2 mb-2">
                                                                    <div className="w-12 text-center">Cant</div>
                                                                    <div className="flex-1">Articulo</div>
                                                                    <div className="w-24 text-right">Precio U.</div>
                                                                    <div className="w-24 text-right">Total</div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    {parts.map((part, i) => (
                                                                        <div key={i} className="flex items-start text-sm py-1 border-b border-slate-100 last:border-0">
                                                                            <div className="w-12 text-center text-slate-500">{part.cantidad || 1}</div>
                                                                            <div className="flex-1 text-slate-700 font-medium">{part.producto || part.descripcion}</div>
                                                                            <div className="w-24 text-right text-slate-600 font-mono">${formatCurrency(part.costoPublico || part.precio_publico || 0)}</div>
                                                                            <div className="w-24 text-right text-slate-800 font-mono font-bold">${formatCurrency((part.cantidad || 1) * (part.costoPublico || part.precio_publico || 0))}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    // Fallback for simple string
                                                    return <p className="text-sm text-slate-700">{service.repuestos_descripcion}</p>;
                                                } catch (e) {
                                                    // Fallback for string or invalid JSON
                                                    return <p className="text-sm text-slate-700">{service.repuestos_descripcion}</p>;
                                                }
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {/* Observaciones */}
                                {service.observaciones && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-bold">Observaciones</p>
                                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                                            <p className="text-sm text-amber-800 italic">"{service.observaciones}"</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Resumen Financiero */}
                    <div className="lg:col-span-1">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 sticky top-6">
                            <div className="flex items-center gap-2 mb-6">
                                <ShoppingCart className="w-5 h-5 text-blue-600" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600">Resumen Financiero</h3>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Mano de Obra</span>
                                    <span className="font-semibold text-slate-800">{formatMoney(service.mano_obra)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Repuestos</span>
                                    <span className="font-semibold text-slate-800">{formatMoney(service.repuestos_costo)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Subtotal</span>
                                    <span className="font-semibold text-slate-800">{formatMoney(service.subtotal)}</span>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-4 mb-6">
                                <p className="text-xs text-blue-400 uppercase tracking-wider mb-2 text-center font-bold">Total a Pagar</p>
                                <p className="text-4xl font-black text-center text-blue-600">
                                    {formatMoney(service.total)}
                                </p>
                            </div>

                            <div className="space-y-2 p-4 rounded-xl bg-white border border-slate-200">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600 font-bold uppercase text-xs">Anticipo</span>
                                    <span className="font-bold text-blue-600">-{formatMoney(service.anticipo)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed border-slate-300">
                                    <span className="text-slate-800 font-bold uppercase text-xs">Restante</span>
                                    <span className="font-bold text-rose-600">{formatMoney((service.total || 0) - (service.anticipo || 0))}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Firmas */}
                {(service.firma_tecnico_path || service.firma_cliente_path) && (
                    <div className="px-8 md:px-10 pb-8 grid grid-cols-2 gap-6">
                        {service.firma_tecnico_path && (
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                                <img src={service.firma_tecnico_path} alt="Firma Técnico" className="h-16 object-contain mb-3 mix-blend-multiply" />
                                <p className="text-xs uppercase tracking-widest text-slate-400">Firma del Técnico</p>
                            </div>
                        )}
                        {service.firma_cliente_path && (
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                                <img src={service.firma_cliente_path} alt="Firma Cliente" className="h-16 object-contain mb-3 mix-blend-multiply" />
                                <p className="text-xs uppercase tracking-widest text-slate-400">Firma de Conformidad</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Galería de Fotos */}
                <div className="px-8 md:px-10 pb-10">
                    <div className="flex items-center gap-2 mb-6">
                        <Image className="w-5 h-5 text-purple-600" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-purple-600">Evidencia Fotográfica</h3>
                    </div>
                    {loadingPhotos ? (
                        <div className="flex justify-center p-12">
                            <Loader className="animate-spin w-8 h-8 text-blue-500" />
                        </div>
                    ) : photos.length === 0 ? (
                        <div className="p-12 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                            No se han adjuntado fotografías a este servicio.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {photos.map((photo) => (
                                <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm cursor-pointer transition-all hover:shadow-lg hover:scale-105">
                                    <img
                                        src={photo.uri}
                                        alt={`Evidencia ${photo.id}`}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <button
                                            onClick={() => window.open(photo.uri, '_blank')}
                                            className="bg-white text-slate-800 p-3 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* QR Ticket Modal */}
            {
                showQRTicket && selectedServiceForQR && (
                    <QRServiceTicket
                        service={selectedServiceForQR}
                        onClose={() => {
                            setShowQRTicket(false);
                            setSelectedServiceForQR(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }

            {/* Receipt Modal */}
            {
                showReceipt && selectedServiceForReceipt && (
                    <ServiceReceipt
                        service={selectedServiceForReceipt}
                        onClose={() => {
                            setShowReceipt(false);
                            setSelectedServiceForReceipt(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }
        </div>
    );
};


const ServiciosView = ({ darkMode, onNavigate, setSelectedService, setEditingCCTVService, setEditingPCService, setEditingPhoneService, setEditingPrinterService, setEditingNetworkService, onShowNotaVenta, user, refreshTrigger }) => {
    const [unifiedServices, setUnifiedServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showNewServiceModal, setShowNewServiceModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });
    const [showQRTicket, setShowQRTicket] = useState(false);
    const [selectedServiceForQR, setSelectedServiceForQR] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedServiceForReceipt, setSelectedServiceForReceipt] = useState(null);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);

    const serviceCategories = [
        { id: 'cctv', title: 'CCTV', icon: Video, color: 'text-blue-500', bg: 'bg-blue-500/10', implemented: true, table: 'servicios_cctv' },
        { id: 'pc', title: 'PC', icon: Monitor, color: 'text-indigo-500', bg: 'bg-indigo-500/10', implemented: true, table: 'servicios_pc' },
        { id: 'celulares', title: 'Celulares', icon: Smartphone, color: 'text-rose-500', bg: 'bg-rose-500/10', implemented: true, table: 'servicios_celular' },
        { id: 'impresoras', title: 'Impresoras', icon: Printer, color: 'text-purple-500', bg: 'bg-purple-500/10', implemented: true, table: 'servicios_impresora' },
        { id: 'redes', title: 'Redes', icon: Wifi, color: 'text-cyan-500', bg: 'bg-cyan-500/10', implemented: true, table: 'servicios_redes' },
    ];

    const parseDate = (d) => {
        if (!d) return 0;

        // Handle YYYY-MM-DD (ISO format) - Common in DB
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
            const date = new Date(d + 'T00:00:00');
            if (!isNaN(date.getTime())) return date.getTime();
        }

        // Handle DD/MM/YYYY (Latin format) - Common in legacy/user input
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) {
            const parts = d.split('/');
            // parts[0] = day, parts[1] = month, parts[2] = year
            // Create YYYY-MM-DD
            return new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00`).getTime();
        }

        // Fallback for other formats (timestamps, full ISO strings)
        // Be careful: new Date('03/01/2026') might be parsed as March 1st (US) in some envs, 
        // but if it failed regex above, it might be something else.
        const date = new Date(d);
        if (!isNaN(date.getTime())) return date.getTime();

        return 0;
    };

    const fetchAllServices = async () => {
        if (!user) return;
        setRefreshing(true);
        try {
            // Fetch CCTV services
            const { data: cctvData } = await supabase.from('servicios_cctv').select('*').eq('user_id', user.id);
            // Fetch PC services
            const { data: pcData } = await supabase.from('servicios_pc').select('*').eq('user_id', user.id);
            // Fetch Phone services
            const { data: phoneData } = await supabase.from('servicios_celulares').select('*').eq('user_id', user.id);
            // Fetch Printer services
            const { data: printerData } = await supabase.from('servicios_impresoras').select('*').eq('user_id', user.id);
            // Fetch Network services
            const { data: networkData } = await supabase.from('servicios_redes').select('*').eq('user_id', user.id);

            // Fetch Photos ID Reference (Lightweight)
            const { data: photosData } = await supabase
                .from('servicio_fotos')
                .select('servicio_id, tipo_servicio')
                .eq('user_id', user.id);

            const photosLookup = new Set();
            photosData?.forEach(p => photosLookup.add(`${p.tipo_servicio}-${p.servicio_id}`));

            const unified = [
                ...(cctvData || []).map(s => ({
                    ...s,
                    id: s.id,
                    type: 'CCTV',
                    folio: s.servicio_numero,
                    cliente: s.cliente_nombre,
                    fecha: s.servicio_fecha || s.created_at,
                    total: s.total,
                    original: s,
                    tableName: 'servicios_cctv',
                    hasPhotos: photosLookup.has(`servicios_cctv-${s.id}`)
                })),
                ...(pcData || []).map(s => ({
                    ...s,
                    id: s.id,
                    type: 'PC',
                    folio: s.orden_numero,
                    cliente: s.cliente_nombre,
                    fecha: s.fecha,
                    total: s.total,
                    original: s,
                    tableName: 'servicios_pc',
                    hasPhotos: photosLookup.has(`servicios_pc-${s.id}`)
                })),
                ...(phoneData || []).map(s => ({
                    ...s,
                    id: s.id,
                    type: 'Celular',
                    folio: s.orden_numero,
                    cliente: s.cliente_nombre,
                    fecha: s.fecha,
                    total: s.total,
                    original: s,
                    tableName: 'servicios_celulares',
                    hasPhotos: photosLookup.has(`servicios_celulares-${s.id}`)
                })),
                ...(printerData || []).map(s => ({
                    ...s,
                    id: s.id,
                    type: 'Impresora',
                    folio: s.orden_numero,
                    cliente: s.cliente_nombre,
                    fecha: s.fecha,
                    total: s.total,
                    original: s,
                    tableName: 'servicios_impresoras',
                    hasPhotos: photosLookup.has(`servicios_impresoras-${s.id}`)
                })),
                ...(networkData || []).map(s => ({
                    ...s,
                    id: s.id,
                    type: 'Redes',
                    folio: s.orden_numero,
                    cliente: s.cliente_nombre,
                    fecha: s.fecha,
                    total: s.total,
                    original: s,
                    tableName: 'servicios_redes',
                    hasPhotos: photosLookup.has(`servicios_redes-${s.id}`)
                }))
            ].sort((a, b) => {
                const dateA = parseDate(a.fecha);
                const dateB = parseDate(b.fecha);
                return dateB - dateA;
            });

            setUnifiedServices(unified);
        } catch (error) {
            console.error('Error fetching unified services:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAllServices();
    }, [refreshTrigger]);

    const handleShowQR = (service) => {
        setSelectedServiceForQR(service.original);
        setShowQRTicket(true);
    };

    const handleShowReceipt = (service) => {
        setSelectedServiceForReceipt(service.original);
        setShowReceipt(true);
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedServices = React.useMemo(() => {
        let sortableItems = [...unifiedServices];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (sortConfig.key === 'fecha') {
                    const dateA = parseDate(aVal);
                    const dateB = parseDate(bVal);

                    // Handle invalid dates (0)
                    if (dateA === 0) return 1; // Invalid/Empty dates go to bottom
                    if (dateB === 0) return -1;

                    return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
                }

                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [unifiedServices, sortConfig]);

    const filteredServices = sortedServices.filter(s =>
        s.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.folio?.toString().includes(searchTerm) ||
        s.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination logic
    const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(filteredServices.length / itemsPerPage);
    const paginatedServices = itemsPerPage === -1
        ? filteredServices
        : filteredServices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset to page 1 when search term changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, itemsPerPage]);

    const handleDelete = async (service) => {
        if (!confirm('¿Estás seguro de eliminar este servicio?')) return;
        try {
            await deleteServicePhotos(service.id);
            const idField = 'id';
            const idValue = service.id;

            const { error } = await supabase
                .from(service.tableName)
                .delete()
                .eq(idField, idValue);

            if (error) throw error;
            fetchAllServices();
        } catch (error) {
            console.error('Error deleting service:', error);
            alert('Error al eliminar servicio');
        }
    };

    const handleViewServiceUnified = (service) => {
        if (service.type === 'CCTV') {
            setSelectedService(service.original);
            onNavigate('services-cctv-view');
        } else if (service.type === 'PC') {
            setSelectedService(service.original);
            onNavigate('services-pc-view');
        } else if (service.type === 'Celular') {
            setSelectedService(service.original);
            onNavigate('services-phone-view');
        } else if (service.type === 'Impresora') {
            setSelectedService(service.original);
            onNavigate('services-printer-view');
        } else if (service.type === 'Redes') {
            setSelectedService(service.original);
            onNavigate('services-network-view');
        }
    };

    const handleEditServiceUnifiedLocal = (service) => {
        if (service.type === 'CCTV') {
            setEditingPhoneService(null);
            setEditingPCService(null);
            setEditingPrinterService(null);
            setEditingCCTVService(service.original);
        } else if (service.type === 'PC') {
            setEditingPhoneService(null);
            setEditingCCTVService(null);
            setEditingPrinterService(null);
            setEditingPCService(service.original);
        } else if (service.type === 'Celular') {
            setEditingPCService(null);
            setEditingCCTVService(null);
            setEditingPrinterService(null);
            setEditingPhoneService(service.original);
        } else if (service.type === 'Impresora') {
            setEditingPCService(null);
            setEditingCCTVService(null);
            setEditingPhoneService(null);
            setEditingPrinterService(service.original);
        } else if (service.type === 'Redes') {
            setEditingPCService(null);
            setEditingCCTVService(null);
            setEditingPhoneService(null);
            setEditingPrinterService(null);
            setEditingNetworkService(service.original);
        }
    };

    const handleServiceSelect = (category) => {
        if (!category.implemented) return;
        setShowNewServiceModal(false);
        if (category.id === 'cctv') {
            setEditingPhoneService(null);
            setEditingPCService(null);
            setEditingPrinterService(null);
            setEditingCCTVService('new');
        } else if (category.id === 'pc') {
            setEditingPhoneService(null);
            setEditingCCTVService(null);
            setEditingPrinterService(null);
            setEditingPCService('new');
        } else if (category.id === 'celulares') {
            setEditingPCService(null);
            setEditingCCTVService(null);
            setEditingPrinterService(null);
            setEditingPhoneService('new');
        } else if (category.id === 'impresoras') {
            setEditingPCService(null);
            setEditingCCTVService(null);
            setEditingPhoneService(null);
            setEditingPrinterService('new');
        } else if (category.id === 'redes') {
            setEditingPCService(null);
            setEditingCCTVService(null);
            setEditingPhoneService(null);
            setEditingPrinterService(null);
            setEditingNetworkService('new');
        }
    };

    return (
        <div className="w-full px-4 md:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <h1 className={`text-3xl font-extrabold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        Gestión de <span className="text-blue-600">Servicios</span>
                    </h1>
                    <button
                        onClick={fetchAllServices}
                        className={`p-2 rounded-full transition-all hover:scale-110 ${darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}
                        title="Actualizar lista"
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                </div>

                <button
                    onClick={() => setShowNewServiceModal(true)}
                    className="w-full md:w-auto btn bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20 transform hover:-translate-y-1 px-8 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 text-lg"
                >
                    <Plus className="w-6 h-6 stroke-[3]" />
                    NUEVO SERVICIO
                </button>
            </div>

            {/* Search Bar and Pagination Controls */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, folio o tipo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-12 pr-4 py-4 rounded-2xl border transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'} focus:outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm`}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium whitespace-nowrap ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Mostrar:</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className={`px-4 py-4 rounded-2xl border transition-all font-medium ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 hover:border-slate-600 hover:bg-slate-750' : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300 hover:bg-slate-50'} focus:outline-none focus:border-blue-500 focus:ring-0 shadow-sm cursor-pointer`}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={-1}>Todos</option>
                    </select>
                </div>
            </div>

            <div className={`md:rounded-[2rem] md:shadow-2xl md:border min-h-[600px] ${darkMode ? 'md:bg-slate-800 md:border-slate-700' : 'md:bg-white md:border-slate-100'}`}>
                {loading && !refreshing ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-4">
                        <Loader className="w-10 h-10 animate-spin text-blue-600" />
                        <p className="text-slate-500 font-bold animate-pulse">Cargando servicios...</p>
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="p-20 text-center flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <Search className="w-10 h-10" />
                        </div>
                        <p className="text-slate-500 font-medium">No se encontraron servicios que coincidan con tu búsqueda.</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className={`${darkMode ? 'bg-slate-900/50' : 'bg-slate-50/50'} border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                                        <th onClick={() => requestSort('type')} className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-500/10 transition-colors select-none">
                                            <div className="flex items-center gap-1">
                                                Tipo
                                                {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Folio</th>
                                        <th onClick={() => requestSort('cliente')} className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-500/10 transition-colors select-none">
                                            <div className="flex items-center gap-1">
                                                Cliente
                                                {sortConfig.key === 'cliente' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th onClick={() => requestSort('fecha')} className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-500/10 transition-colors select-none">
                                            <div className="flex items-center gap-1">
                                                Fecha
                                                {sortConfig.key === 'fecha' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th onClick={() => requestSort('total')} className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-500/10 transition-colors select-none">
                                            <div className="flex items-center gap-1">
                                                Total
                                                {sortConfig.key === 'total' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Estado</th>
                                        <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                                    {paginatedServices.map((service) => (
                                        <tr key={`${service.tableName}-${service.id || service.folio}`} className={`transition-colors ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-blue-50/30'}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${service.type === 'CCTV' ? 'bg-blue-100 text-blue-800' :
                                                    service.type === 'PC' ? 'bg-indigo-100 text-indigo-800' :
                                                        service.type === 'Impresora' ? 'bg-purple-100 text-purple-800' :
                                                            service.type === 'Redes' ? 'bg-cyan-100 text-cyan-800' :
                                                                'bg-rose-100 text-rose-800'
                                                    }`}>
                                                    {service.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-blue-600">#{service.folio}</span>
                                                    {service.hasPhotos && (
                                                        <div className="bg-blue-100 p-1 rounded-full" title="Tiene evidencia fotográfica">
                                                            <Image className="w-3 h-3 text-blue-600" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-medium ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{service.cliente}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{formatServiceDate(service.fecha)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>${formatCurrency(service.total)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusDropdown
                                                    service={service.original}
                                                    darkMode={darkMode}
                                                    onStatusChange={fetchAllServices}
                                                    tableName={service.tableName}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {service.type !== 'CCTV' && service.type !== 'Redes' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleShowQR(service)}
                                                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                                title="Ver Ticket QR"
                                                            >
                                                                <QrCode className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleShowReceipt(service)}
                                                                className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                                title="Imprimir Ticket"
                                                            >
                                                                <ScrollText className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => onShowNotaVenta(service)}
                                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Generar Nota de Venta"
                                                    >
                                                        <FileText className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewServiceUnified(service)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Ver Servicio"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditServiceUnifiedLocal(service)}
                                                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Editar Servicio"
                                                    >
                                                        <Edit2 className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(service)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar Servicio"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination Controls */}
                            {itemsPerPage !== -1 && totalPages > 1 && (
                                <div className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                                    <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredServices.length)} de {filteredServices.length} servicios
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className={`px-3 py-2 rounded-lg font-medium transition-all ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'} ${darkMode ? 'text-slate-300 disabled:text-slate-600' : 'text-slate-700'}`}
                                        >
                                            Anterior
                                        </button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                                                // Show first page, last page, current page, and pages around current
                                                const showPage = page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
                                                const showEllipsis = (page === 2 && currentPage > 3) || (page === totalPages - 1 && currentPage < totalPages - 2);

                                                if (showEllipsis) {
                                                    return <span key={page} className="px-2 text-slate-400">...</span>;
                                                }

                                                if (!showPage) return null;

                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`px-3 py-2 rounded-lg font-medium transition-all ${page === currentPage
                                                            ? 'bg-blue-600 text-white shadow-lg'
                                                            : darkMode
                                                                ? 'text-slate-300 hover:bg-slate-700'
                                                                : 'text-slate-700 hover:bg-slate-100'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className={`px-3 py-2 rounded-lg font-medium transition-all ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'} ${darkMode ? 'text-slate-300 disabled:text-slate-600' : 'text-slate-700'}`}
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Cards View */}
                        <div className="md:hidden flex flex-col gap-4 p-4 pb-24">
                            {paginatedServices.map((service) => (
                                <div
                                    key={`mobile-service-${service.tableName}-${service.id || service.folio}`}
                                    className={`rounded-2xl p-6 border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold w-fit ${service.type === 'CCTV' ? 'bg-blue-100 text-blue-800' :
                                                service.type === 'PC' ? 'bg-indigo-100 text-indigo-800' :
                                                    service.type === 'Impresora' ? 'bg-purple-100 text-purple-800' :
                                                        service.type === 'Redes' ? 'bg-cyan-100 text-cyan-800' :
                                                            'bg-rose-100 text-rose-800'
                                                }`}>
                                                {service.type}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-blue-600">#{service.folio}</span>
                                                {service.hasPhotos && (
                                                    <div className="bg-blue-100 p-1 rounded-full" title="Tiene evidencia fotográfica">
                                                        <Image className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {service.type !== 'CCTV' && service.type !== 'Redes' && (
                                                <>
                                                    <button
                                                        onClick={() => handleShowQR(service)}
                                                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                        title="Ver Ticket QR"
                                                    >
                                                        <QrCode className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleShowReceipt(service)}
                                                        className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Imprimir Ticket"
                                                    >
                                                        <ScrollText className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => onShowNotaVenta(service)}
                                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Generar Nota de Venta"
                                            >
                                                <FileText className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleViewServiceUnified(service)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Ver Servicio"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleEditServiceUnifiedLocal(service)}
                                                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Editar Servicio"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(service)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar Servicio"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Cliente</p>
                                            <p className={`font-medium text-lg ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{service.cliente}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Fecha</p>
                                                <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{formatServiceDate(service.fecha)}</p>
                                            </div>
                                            <div>
                                                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total</p>
                                                <p className={`text-lg font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>${formatCurrency(service.total)}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Estado</p>
                                            <StatusDropdown
                                                service={service.original}
                                                darkMode={darkMode}
                                                onStatusChange={fetchAllServices}
                                                tableName={service.tableName}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Mobile Pagination Controls */}
                            {itemsPerPage !== -1 && totalPages > 1 && (
                                <div className={`mt-6 p-4 rounded-2xl border flex flex-col items-center gap-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                                    <div className={`text-sm text-center ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredServices.length)} de {filteredServices.length}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap justify-center">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className={`px-4 py-2 rounded-lg font-medium transition-all ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'} ${darkMode ? 'text-slate-300 disabled:text-slate-600 bg-slate-700' : 'text-slate-700 bg-white border border-slate-200'}`}
                                        >
                                            ← Anterior
                                        </button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let page;
                                                if (totalPages <= 5) {
                                                    page = i + 1;
                                                } else if (currentPage <= 3) {
                                                    page = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    page = totalPages - 4 + i;
                                                } else {
                                                    page = currentPage - 2 + i;
                                                }
                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`px-3 py-2 rounded-lg font-medium transition-all ${page === currentPage
                                                            ? 'bg-blue-600 text-white shadow-lg'
                                                            : darkMode
                                                                ? 'text-slate-300 bg-slate-700'
                                                                : 'text-slate-700 bg-white border border-slate-200'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className={`px-4 py-2 rounded-lg font-medium transition-all ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'} ${darkMode ? 'text-slate-300 disabled:text-slate-600 bg-slate-700' : 'text-slate-700 bg-white border border-slate-200'}`}
                                        >
                                            Siguiente →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Modal de Nuevo Servicio */}
            {showNewServiceModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className={`w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
                        <div className="p-6 md:p-12">
                            <div className="flex justify-between items-start md:items-center mb-8 md:mb-12 gap-4">
                                <div>
                                    <h2 className={`text-2xl md:text-4xl font-black tracking-tight mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Nuevo Servicio</h2>
                                    <p className={`text-sm md:text-lg font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Selecciona la categoría del servicio a registrar</p>
                                </div>
                                <button
                                    onClick={() => setShowNewServiceModal(false)}
                                    className={`p-4 rounded-full transition-all hover:rotate-90 ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900'}`}
                                >
                                    <X className="w-8 h-8" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {serviceCategories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => handleServiceSelect(category)}
                                        className={`relative group p-8 rounded-[2rem] border-2 transition-all text-left flex flex-col items-start gap-4 ${!category.implemented
                                            ? 'opacity-60 cursor-not-allowed border-dashed grayscale bg-slate-50 border-slate-200'
                                            : darkMode
                                                ? 'bg-slate-800 border-slate-700 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2'
                                                : 'bg-white border-slate-100 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2'
                                            }`}
                                    >
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${category.bg} ${category.color}`}>
                                            <category.icon className="w-9 h-9 stroke-[2.5]" />
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{category.title}</h3>
                                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {category.implemented ? `Registrar servicio de ${category.title.toLowerCase()}` : 'Próximamente...'}
                                            </p>
                                        </div>
                                        {!category.implemented && (
                                            <div className="absolute top-4 right-4 bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest border border-amber-200">
                                                Pendiente
                                            </div>
                                        )}
                                        {category.implemented && (
                                            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                                                <ArrowUpRight className="w-6 h-6 text-blue-500 stroke-[3]" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Ticket Modal */}
            {
                showQRTicket && selectedServiceForQR && (
                    <QRServiceTicket
                        service={selectedServiceForQR}
                        onClose={() => {
                            setShowQRTicket(false);
                            setSelectedServiceForQR(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }

            {/* Receipt Modal */}
            {
                showReceipt && selectedServiceForReceipt && (
                    <ServiceReceipt
                        service={selectedServiceForReceipt}
                        onClose={() => {
                            setShowReceipt(false);
                            setSelectedServiceForReceipt(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }
        </div>
    );
};

const PhoneList = ({ darkMode, onNavigate, onViewService, onCreateNew, onEdit, onShowNotaVenta, user, refreshTrigger }) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });
    const [showQRTicket, setShowQRTicket] = useState(false);
    const [selectedServiceForQR, setSelectedServiceForQR] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedServiceForReceipt, setSelectedServiceForReceipt] = useState(null);

    useEffect(() => {
        fetchServices();
    }, [user, refreshTrigger]);

    const fetchServices = async () => {
        if (!user) return;
        setRefreshing(true);
        try {
            const { data, error } = await supabase
                .from('servicios_celulares')
                .select('*')
                .eq('user_id', user.id)
                .order('fecha', { ascending: false });

            if (error) throw error;
            setServices(data || []);
        } catch (error) {
            console.error('Error loading Phone services:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedServices = React.useMemo(() => {
        let sortableItems = [...services];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Check if sorting by date
                if (sortConfig.key.includes('fecha')) {
                    const parseDate = (d) => {
                        if (!d) return 0;
                        // For YYYY-MM-DD, append time to ensure local interpretation
                        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                            const date = new Date(d + 'T00:00:00');
                            if (!isNaN(date.getTime())) return date.getTime();
                        }
                        const date = new Date(d);
                        if (!isNaN(date.getTime())) return date.getTime();
                        const parts = d.split('/');
                        if (parts.length === 3) {
                            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`).getTime();
                        }
                        return 0;
                    };
                    aVal = parseDate(aVal);
                    bVal = parseDate(bVal);
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [services, sortConfig]);

    const handleShowQR = (service) => {
        setSelectedServiceForQR(service);
        setShowQRTicket(true);
    };

    const handleShowReceipt = (service) => {
        setSelectedServiceForReceipt(service);
        setShowReceipt(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este servicio?')) return;
        try {
            await deleteServicePhotos(id);
            const { error } = await supabase
                .from('servicios_celulares')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setServices(services.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting service:', error);
            alert('Error al eliminar servicio');
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader className="animate-spin w-8 h-8 text-blue-600" /></div>;

    return (
        <div className="w-full px-4 md:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h1 className={`text-3xl font-extrabold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        Servicios <span className="text-rose-600">Celulares</span>
                    </h1>
                    <button
                        onClick={fetchServices}
                        className={`p-2 rounded-full transition-all hover:scale-110 ${darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}
                        title="Actualizar lista"
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-rose-600' : ''}`} />
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onCreateNew}
                        className="btn bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-500/30 transform hover:-translate-y-0.5 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Servicio
                    </button>
                </div>
            </div>

            <div className={`rounded-xl shadow-lg border min-h-[600px] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                {services.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        No hay servicios de celulares registrados.
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block pb-64">
                            <table className="w-full">
                                <thead className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50/50 border-gray-200'}`}>
                                    <tr>
                                        <th onClick={() => requestSort('orden_numero')} className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-500/10 transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>
                                            <div className="flex items-center gap-1">
                                                No. Servicio
                                                {sortConfig.key === 'orden_numero' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Cliente</th>
                                        <th onClick={() => requestSort('fecha')} className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-500/10 transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>
                                            <div className="flex items-center gap-1">
                                                Fecha
                                                {sortConfig.key === 'fecha' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Total</th>
                                        <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Estado</th>
                                        <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${darkMode ? 'divide-slate-600' : 'divide-slate-100'}`}>
                                    {sortedServices.map((service) => (
                                        <tr key={service.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-rose-50/30'}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-bold text-rose-600">#{service.orden_numero}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-medium ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{service.cliente_nombre}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{formatServiceDate(service.fecha)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>${formatCurrency(service.total)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusDropdown
                                                    service={service}
                                                    darkMode={darkMode}
                                                    onStatusChange={fetchServices}
                                                    tableName="servicios_celulares"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleShowQR(service)}
                                                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                        title="Ver QR de Seguimiento"
                                                    >
                                                        <QrCode className="w-5 h-5" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleShowReceipt(service)}
                                                        className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Imprimir Ticket"
                                                    >
                                                        <ScrollText className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onShowNotaVenta({ ...service, type: 'Celular', tableName: 'servicios_celulares', original: service })}
                                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Generar Nota de Venta"
                                                    >
                                                        <FileText className="w-5 h-5" />
                                                    </button>

                                                    {service.pagado && service.entregado ? (
                                                        <span className="hidden sm:inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-500/10 backdrop-blur-md border border-green-500/20 rounded-md mr-2">
                                                            Pagado y Entregado
                                                        </span>
                                                    ) : (
                                                        <span className="hidden sm:inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-md mr-2">
                                                            Pendiente de Entregar/Pagar
                                                        </span>
                                                    )}

                                                    <button
                                                        onClick={() => onViewService(service)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Ver Servicio"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onEdit(service)}
                                                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Editar Servicio"
                                                    >
                                                        <Edit2 className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(service.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar Servicio"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="md:hidden flex flex-col gap-4 p-4 pb-24">
                            {sortedServices.map((service) => (
                                <div
                                    key={`mobile-phone-${service.id}`}
                                    className={`rounded-2xl p-5 border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 mb-2">
                                                #{service.orden_numero}
                                            </span>
                                            <h3 className={`text-lg font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                                {service.cliente_nombre}
                                            </h3>
                                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {formatServiceDate(service.fecha)}
                                            </p>
                                        </div>
                                        <StatusDropdown
                                            service={service}
                                            darkMode={darkMode}
                                            onStatusChange={fetchServices}
                                            tableName="servicios_celulares"
                                        />
                                    </div>

                                    <div className="flex justify-between items-end border-t border-dashed pt-4 border-slate-200 dark:border-slate-700">
                                        <div>
                                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total</p>
                                            <p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                ${formatCurrency(service.total)}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleShowQR(service)}
                                                className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"
                                            >
                                                <QrCode className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleShowReceipt(service)}
                                                className="p-2.5 bg-slate-50 text-slate-600 rounded-xl"
                                            >
                                                <ScrollText className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onShowNotaVenta({ ...service, type: 'Celular', tableName: 'servicios_celulares', original: service })}
                                                className="p-2.5 bg-blue-50 text-blue-500 rounded-xl"
                                                title="Generar Nota de Venta"
                                            >
                                                <FileText className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onViewService(service)}
                                                className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onEdit(service)}
                                                className="p-2.5 bg-slate-50 text-slate-600 rounded-xl"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(service.id)}
                                                className="p-2.5 bg-red-50 text-red-600 rounded-xl"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* QR Ticket Modal */}
            {
                showQRTicket && selectedServiceForQR && (
                    <QRServiceTicket
                        service={selectedServiceForQR}
                        onClose={() => {
                            setShowQRTicket(false);
                            setSelectedServiceForQR(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }

            {/* Receipt Modal */}
            {
                showReceipt && selectedServiceForReceipt && (
                    <ServiceReceipt
                        service={selectedServiceForReceipt}
                        onClose={() => {
                            setShowReceipt(false);
                            setSelectedServiceForReceipt(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }
        </div >
    );
};

const PhoneServiceView = ({ service, onBack, onEdit, darkMode, company }) => {
    if (!service) return null;

    const [showQRTicket, setShowQRTicket] = useState(false);
    const [selectedServiceForQR, setSelectedServiceForQR] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedServiceForReceipt, setSelectedServiceForReceipt] = useState(null);

    const handleShowQR = (service) => {
        setSelectedServiceForQR(service);
        setShowQRTicket(true);
    };

    const handleShowReceipt = (service) => {
        setSelectedServiceForReceipt(service);
        setShowReceipt(true);
    };

    const [photos, setPhotos] = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);

    useEffect(() => {
        if (service?.id) fetchPhotos();
    }, [service]);

    const fetchPhotos = async () => {
        setLoadingPhotos(true);
        try {
            const { data, error } = await supabase
                .from('servicio_fotos')
                .select('*')
                .eq('servicio_id', service.id)
                .eq('tipo_servicio', 'servicios_celulares');

            if (error) throw error;
            setPhotos(data || []);
        } catch (error) {
            console.error('Error fetching photos:', error);
        } finally {
            setLoadingPhotos(false);
        }
    };

    const formatMoney = (amount) => `$${formatCurrency(amount || 0)}`;

    return (
        <div className="w-full min-h-screen p-6 md:p-10">
            <div className="max-w-7xl mx-auto bg-white rounded-3xl overflow-hidden shadow-2xl border border-rose-100">
                {/* Header Section */}
                <div className="p-8 bg-gradient-to-r from-rose-50 to-white border-b border-rose-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-5">
                            <button onClick={onBack} className="p-3 bg-white rounded-full shadow-sm hover:shadow-md transition-all text-slate-600 hover:text-rose-600">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div className="flex items-start gap-4">
                                {company?.logo_uri ? (
                                    <img src={company.logo_uri} alt="Logo" className="w-20 h-20 object-contain p-1 rounded-xl bg-white shadow-sm" />
                                ) : (
                                    <div className="w-20 h-20 bg-rose-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-rose-600/20">{company?.nombre?.charAt(0) || 'C'}</div>
                                )}
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{company?.nombre || 'Mi Empresa'}</h2>
                                    {company?.direccion && <p className="text-[10px] text-slate-500 max-w-[250px] leading-tight mt-1">{company.direccion}</p>}
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                        {company?.telefono && <p className="text-[10px] font-bold text-slate-600">Tel: {company.telefono}</p>}
                                        {company?.correo && <p className="text-[10px] font-bold text-slate-600">{company.correo}</p>}
                                        {company?.rfc && <p className="text-[10px] font-bold text-rose-600 uppercase">RFC: {company.rfc}</p>}
                                    </div>
                                    <div className="flex gap-3 mt-3 no-print">
                                        <button onClick={() => handleShowQR(service)} className="px-4 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all flex items-center gap-2 shadow-sm">
                                            <QrCode className="w-3.5 h-3.5" /> TICKET QR
                                        </button>
                                        <button onClick={() => handleShowReceipt(service)} className="px-4 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all flex items-center gap-2 shadow-sm">
                                            <ScrollText className="w-3.5 h-3.5" /> RECIBO
                                        </button>
                                        <button onClick={() => onEdit(service)} className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all flex items-center gap-2 shadow-sm">
                                            <Edit2 className="w-3.5 h-3.5" /> EDITAR REPORTE
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-left md:text-right">
                            <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-rose-400 mb-1">Reparación de Celular</span>
                            <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-2">#{service.orden_numero}</h1>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-xl shadow-lg">
                                <Calendar className="w-3.5 h-3.5 text-rose-400" />
                                <span className="text-xs font-mono font-bold">{formatServiceDate(service.fecha)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="p-8 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Info Cards Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-4 text-blue-600">
                                    <User className="w-5 h-5" />
                                    <h3 className="text-xs font-black uppercase tracking-widest">Información del Cliente</h3>
                                </div>
                                <p className="text-xl font-bold text-slate-800 mb-1">{service.cliente_nombre}</p>
                                <p className="text-sm font-medium text-slate-500">{service.cliente_telefono || "Sin teléfono"}</p>
                            </div>

                            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-4 text-orange-600">
                                    <User className="w-5 h-5" />
                                    <h3 className="text-xs font-black uppercase tracking-widest">Atendido por</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center font-black">
                                        {service.tecnico_nombre ? service.tecnico_nombre.charAt(0) : 'T'}
                                    </div>
                                    <p className="text-xl font-bold text-slate-800">{service.tecnico_nombre || "Público General"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Device Section */}
                        <div className="p-8 rounded-3xl bg-slate-900 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Smartphone className="w-32 h-32" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6 text-rose-400">
                                    <Smartphone className="w-5 h-5" />
                                    <h3 className="text-xs font-black uppercase tracking-widest">Detalles del Dispositivo</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    <div>
                                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Modelo / Equipo</p>
                                        <p className="text-xl font-bold">{service.equipo_modelo}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">IMEI de Seguridad</p>
                                        <p className="text-xl font-mono font-bold tracking-tighter text-slate-300">{service.equipo_imei || "----------------"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Acceso / Pass</p>
                                        <p className="text-xl font-bold bg-white/10 px-3 py-1 rounded-lg inline-block">{service.equipo_pass || "LIBRE"}</p>
                                    </div>
                                </div>
                                {service.estado_fisico && (
                                    <div className="mt-8 pt-6 border-t border-white/10">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado Físico Reportado</p>
                                        <p className="text-sm italic text-slate-300">"{service.estado_fisico}"</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Analysis Section */}
                        <div className="p-8 rounded-3xl border border-slate-100 bg-white shadow-sm space-y-8">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 mb-4 flex items-center gap-2">
                                    <Settings className="w-4 h-4" /> TRABAJO REALIZADO
                                </h3>
                                <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                                    <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{service.trabajo_realizado || "Sin descripción de trabajo."}</p>
                                </div>
                            </div>

                            {service.repuestos_descripcion && service.repuestos_descripcion !== '[]' && (
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-4 flex items-center gap-2">
                                        <ShoppingCart className="w-4 h-4" /> REFACCIONES UTILIZADAS
                                    </h3>
                                    <div className="overflow-hidden rounded-2xl border border-slate-100">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-5 py-3 text-center">Cant</th>
                                                    <th className="px-5 py-3 text-left">Descripción del Componente</th>
                                                    <th className="px-5 py-3 text-right">Precio</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {(() => {
                                                    try {
                                                        const p = JSON.parse(service.repuestos_descripcion);
                                                        return p.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                                <td className="px-5 py-4 text-center font-bold text-slate-400">{item.cantidad}</td>
                                                                <td className="px-5 py-4 font-bold text-slate-700">{item.producto || item.descripcion}</td>
                                                                <td className="px-5 py-4 text-right font-mono font-bold text-slate-900">${formatCurrency(item.costoPublico || item.precio_publico)}</td>
                                                            </tr>
                                                        ));
                                                    } catch { return null; }
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {service.observaciones && (
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">NOTAS ADICIONALES</h3>
                                    <p className="text-sm italic text-slate-500">{service.observaciones}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="space-y-6">
                        <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl sticky top-10">
                            <h3 className="text-xs font-black uppercase tracking-widest text-rose-400 mb-8 border-b border-white/10 pb-4">Resumen de Cuenta</h3>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Servicio / M.O.</span>
                                    <span className="font-bold">{formatMoney(service.mano_obra)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Refacciones</span>
                                    <span className="font-bold">{formatMoney(service.repuestos_costo)}</span>
                                </div>
                                {service.incluir_iva && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">IVA (16%)</span>
                                        <span className="font-bold">{formatMoney(service.iva)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-8">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-2 text-center">TOTAL NETO</p>
                                <p className="text-5xl font-black text-center tracking-tighter text-white">
                                    {formatMoney(service.total)}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Anticipo</span>
                                    <span className="font-black text-emerald-400">-{formatMoney(service.anticipo)}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 rounded-2xl bg-rose-500 shadow-lg shadow-rose-500/20">
                                    <span className="text-xs font-black text-rose-100 uppercase tracking-widest">POR LIQUIDAR</span>
                                    <span className="text-2xl font-black text-white">{formatMoney((service.total || 0) - (service.anticipo || 0))}</span>
                                </div>
                            </div>
                        </div>

                        {/* Mini Gallery */}
                        <div className="p-6 rounded-3xl border border-slate-100 bg-white">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Evidencia ({photos.length})</h3>
                            {loadingPhotos ? (
                                <Loader className="animate-spin w-5 h-5 text-slate-300 mx-auto" />
                            ) : photos.length === 0 ? (
                                <p className="text-xs text-center text-slate-300 italic py-4 font-medium">Sin fotografías adjuntas.</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {photos.map(p => (
                                        <div key={p.id} className="aspect-square rounded-2xl overflow-hidden border border-slate-100 group relative">
                                            <img src={p.uri} alt="evidencia" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <button onClick={() => window.open(p.uri, '_blank')} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Eye className="w-5 h-5 text-white" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* QR Ticket Modal */}
            {
                showQRTicket && selectedServiceForQR && (
                    <QRServiceTicket
                        service={selectedServiceForQR}
                        onClose={() => {
                            setShowQRTicket(false);
                            setSelectedServiceForQR(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }

            {/* Receipt Modal */}
            {
                showReceipt && selectedServiceForReceipt && (
                    <ServiceReceipt
                        service={selectedServiceForReceipt}
                        onClose={() => {
                            setShowReceipt(false);
                            setSelectedServiceForReceipt(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }
        </div>
    );
};


// --- SIDEBAR COMPONENT ---

const Sidebar = ({ activeTab, setActiveTab: setTabOriginal, onLogout, userEmail, currentTheme, setTheme, mobileMode, toggleMobileMode, isOpen, onClose, companyLogo, companyName }) => {
    const setActiveTab = (tab) => {
        setTabOriginal(tab);
        if (mobileMode && onClose) onClose();
    };

    const isGlass = currentTheme === 'glass';
    const isDark = currentTheme === 'dark';

    const sidebarClasses = mobileMode
        ? `fixed inset-y-0 left-0 z-50 w-64 ${isDark ? 'bg-slate-900 border-r border-slate-800' : 'bg-blue-600'} ${isGlass ? 'text-amber-900' : 'text-white'} transform transition-transform duration-300 ease-in-out shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'} no-print`
        : `fixed inset-y-0 left-0 z-20 w-72 ${isGlass ? 'text-amber-900' : 'text-white'} flex flex-col hidden md:flex ${isGlass ? 'bg-white/30 backdrop-blur-2xl border-r border-orange-200/40 rounded-r-3xl' : 'bg-transparent'} no-print`;

    const textMuted = isGlass ? 'text-amber-700/70' : 'text-blue-200';
    const textHover = isGlass ? 'hover:text-amber-950 hover:bg-amber-900/10 rounded-lg' : 'hover:text-white hover:bg-white/10 rounded-xl';
    const activeClass = isGlass ? 'font-bold text-amber-950 bg-amber-900/20 rounded-lg shadow-sm' : 'font-bold text-white bg-white/20 rounded-xl shadow-sm';
    const inactiveClass = isGlass ? 'text-amber-800' : 'text-blue-100';

    return (
        <>
            {/* Mobile Overlay */}
            {mobileMode && isOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
            )}

            <div className={sidebarClasses}>
                <div className="p-8 pb-4">
                    <div className="flex items-center gap-3 mb-1">
                        {companyLogo ? (
                            <img src={companyLogo} alt="Company Logo" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm ${isGlass ? 'bg-white/40 text-slate-800 shadow-sm' : 'bg-white/20 text-white'}`}>
                                <span className="font-bold text-xl">{companyName?.[0] || 'C'}</span>
                            </div>
                        )}
                        <div>
                            <h2 className="font-bold text-lg leading-tight">{companyName || 'Empresa'}</h2>
                            <p className={`text-xs ${textMuted}`}>{userEmail}</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8 scrollbar-hide">
                    {/* Section: MAIN MENU */}
                    <div>
                        <h3 className={`text-[10px] font-bold tracking-widest mb-4 uppercase ${textMuted}`}>Menú</h3>
                        <ul className="space-y-1">
                            {/* Cotizaciones Dropdown */}
                            <li>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => setActiveTab('cotizaciones-list')}
                                        className={`w-full flex items-center justify-between text-left py-2 px-3 transition-all ${['cotizaciones-list', 'cotizaciones-new'].includes(activeTab) ? activeClass : `${inactiveClass} ${textHover}`}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-4 h-4" />
                                            <span>Cotizaciones</span>
                                        </div>
                                    </button>


                                </div>
                            </li>

                            {/* Clients */}
                            <li>
                                <button
                                    onClick={() => setActiveTab('clientes')}
                                    className={`w-full flex items-center justify-between text-left py-2 px-3 transition-all ${activeTab === 'clientes' ? activeClass : `${inactiveClass} ${textHover}`}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <User className="w-4 h-4" />
                                        <span>Clientes</span>
                                    </div>
                                </button>
                            </li>

                            {/* Servicios */}
                            <li>
                                <button
                                    onClick={() => setActiveTab('servicios')}
                                    className={`w-full flex items-center justify-between text-left py-2 px-3 transition-all ${activeTab === 'servicios' ? activeClass : `${inactiveClass} ${textHover}`}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Settings className="w-4 h-4" />
                                        <span>Servicios</span>
                                    </div>
                                </button>
                            </li>

                            {/* Contracts */}
                            <li>
                                <button
                                    onClick={() => setActiveTab('contratos')}
                                    className={`w-full flex items-center justify-between text-left py-2 px-3 transition-all ${activeTab === 'contratos' ? activeClass : `${inactiveClass} ${textHover}`}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-4 h-4" />
                                        <span>Contratos</span>
                                    </div>
                                </button>
                            </li>

                            {/* Products */}
                            <li>
                                <button
                                    onClick={() => setActiveTab('products')}
                                    className={`w-full flex items-center justify-between text-left py-2 px-3 transition-all ${activeTab === 'products' ? activeClass : `${inactiveClass} ${textHover}`}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <ShoppingCart className="w-4 h-4" />
                                        <span>Productos</span>
                                    </div>
                                </button>
                            </li>

                            {/* Reports */}
                            <li>
                                <button
                                    onClick={() => setActiveTab('informes')}
                                    className={`w-full flex items-center justify-between text-left py-2 px-3 transition-all ${activeTab === 'informes' ? activeClass : `${inactiveClass} ${textHover}`}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <BarChart3 className="w-4 h-4" />
                                        <span>Informes</span>
                                    </div>
                                </button>
                            </li>

                            {/* Subscribe Button - Eye-catching */}
                            <li className="pt-4">
                                <button
                                    onClick={() => setActiveTab('suscripcion')}
                                    className={`w-full group relative flex items-center justify-center gap-3 py-4 px-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 shadow-xl overflow-hidden
                                        ${activeTab === 'suscripcion'
                                            ? 'bg-white text-blue-600 scale-95'
                                            : 'bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white hover:scale-105 hover:shadow-orange-500/40 active:scale-95'
                                        }`}
                                >
                                    <Zap className={`w-5 h-5 fill-current ${activeTab === 'suscripcion' ? 'animate-pulse' : 'group-hover:animate-bounce'}`} />
                                    <span>SUSCRÍBETE</span>

                                    {/* Shining effect */}
                                    <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[45deg] group-hover:left-[200%] transition-all duration-1000 ease-in-out"></div>
                                </button>
                            </li>
                        </ul>

                    </div>


                </div>

                <div className="p-8 pt-0 space-y-6">
                    {/* Settings & Logout */}
                    <div className="space-y-1">
                        <button
                            onClick={() => setActiveTab('configuracion')}
                            className={`w-full flex items-center gap-3 text-left py-2 px-3 transition-all ${activeTab === 'configuracion' ? activeClass : `${inactiveClass} ${textHover}`}`}
                        >
                            <Settings className="w-4 h-4" />
                            <span>Configuración</span>
                        </button>
                        <button
                            onClick={onLogout}
                            className={`w-full flex items-center gap-3 text-left py-2 px-3 transition-all ${inactiveClass} ${textHover}`}
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Cerrar Sesión</span>
                        </button>
                    </div>

                    <div className={`flex items-center gap-4 text-xs font-bold uppercase tracking-wider ${textMuted}`}>
                        <button onClick={() => setActiveTab('contacto')} className={`${textHover} transition-colors`}>Contacto</button>
                        <button onClick={() => setActiveTab('changelog')} className={`${textHover} transition-colors`}>Changelog</button>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-full p-1 flex items-center w-max">
                        <button
                            onClick={() => setTheme('blue')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${currentTheme === 'blue' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-200 hover:text-white'}`}
                        >
                            <span className={`w-2 h-2 rounded-full ${currentTheme === 'blue' ? 'bg-blue-600' : 'bg-transparent border border-blue-300'}`}></span>
                            Azul
                        </button>
                        <button
                            onClick={() => setTheme('glass')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${currentTheme === 'glass' ? 'bg-white text-amber-600 shadow-sm' : 'text-blue-200 hover:text-white'}`}
                        >
                            <Sun className={`w-3 h-3 ${currentTheme === 'glass' ? 'text-amber-600' : ''}`} />
                            Claro
                        </button>
                        <button
                            onClick={() => setTheme('dark')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${currentTheme === 'dark' ? 'bg-slate-700 text-white shadow-sm' : 'text-blue-200 hover:text-white'}`}
                        >
                            <Moon className={`w-3 h-3 ${currentTheme === 'dark' ? 'text-slate-300' : ''}`} />
                            Oscuro
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};


// --- MAIN APP ---

const PrinterList = ({ darkMode, onNavigate, onViewService, onCreateNew, onEdit, onShowNotaVenta, user, refreshTrigger }) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });
    const [showQRTicket, setShowQRTicket] = useState(false);
    const [selectedServiceForQR, setSelectedServiceForQR] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedServiceForReceipt, setSelectedServiceForReceipt] = useState(null);

    useEffect(() => {
        fetchServices();
    }, [user, refreshTrigger]);

    const fetchServices = async () => {
        if (!user) return;
        setRefreshing(true);
        try {
            const { data, error } = await supabase
                .from('servicios_impresoras')
                .select('*')
                .eq('user_id', user.id)
                .order('fecha', { ascending: false });

            if (error) throw error;
            setServices(data || []);
        } catch (error) {
            console.error('Error loading Printer services:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedServices = React.useMemo(() => {
        let sortableItems = [...services];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (sortConfig.key.includes('fecha')) {
                    const parseDate = (d) => {
                        if (!d) return 0;
                        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                            const date = new Date(d + 'T00:00:00');
                            if (!isNaN(date.getTime())) return date.getTime();
                        }
                        const date = new Date(d);
                        if (!isNaN(date.getTime())) return date.getTime();
                        const parts = d.split('/');
                        if (parts.length === 3) {
                            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`).getTime();
                        }
                        return 0;
                    };
                    aVal = parseDate(aVal);
                    bVal = parseDate(bVal);
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [services, sortConfig]);

    const handleShowQR = (service) => {
        setSelectedServiceForQR(service);
        setShowQRTicket(true);
    };

    const handleShowReceipt = (service) => {
        setSelectedServiceForReceipt(service);
        setShowReceipt(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este servicio?')) return;
        try {
            await deleteServicePhotos(id);
            const { error } = await supabase
                .from('servicios_impresoras')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setServices(services.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting service:', error);
            alert('Error al eliminar servicio');
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader className="animate-spin w-8 h-8 text-purple-600" /></div>;

    return (
        <div className="w-full px-4 md:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h1 className={`text-3xl font-extrabold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        Servicios <span className="text-purple-600">Impresoras</span>
                    </h1>
                    <button
                        onClick={fetchServices}
                        className={`p-2 rounded-full transition-all hover:scale-110 ${darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}
                        title="Actualizar lista"
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-purple-600' : ''}`} />
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onCreateNew}
                        className="btn bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/30 transform hover:-translate-y-0.5 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Servicio
                    </button>
                </div>
            </div>

            <div className={`rounded-xl shadow-lg border min-h-[600px] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                {services.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        No hay servicios de Impresoras registrados.
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block pb-64">
                            <table className="w-full">
                                <thead className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50/50 border-gray-200'}`}>
                                    <tr>
                                        <th onClick={() => requestSort('orden_numero')} className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-500/10 transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>
                                            <div className="flex items-center gap-1">
                                                No. Servicio
                                                {sortConfig.key === 'orden_numero' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Cliente</th>
                                        <th onClick={() => requestSort('fecha')} className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-500/10 transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>
                                            <div className="flex items-center gap-1">
                                                Fecha
                                                {sortConfig.key === 'fecha' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Total</th>
                                        <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Estado</th>
                                        <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${darkMode ? 'divide-slate-600' : 'divide-slate-100'}`}>
                                    {sortedServices.map((service) => (
                                        <tr key={service.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-purple-50/30'}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-bold text-purple-600">#{service.orden_numero}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-medium ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{service.cliente_nombre}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{formatServiceDate(service.fecha)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>${formatCurrency(service.total)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusDropdown
                                                    service={service}
                                                    tableName="servicios_impresoras"
                                                    darkMode={darkMode}
                                                    onStatusChange={fetchServices}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleShowQR(service)}
                                                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                        title="Ver QR de Seguimiento"
                                                    >
                                                        <QrCode className="w-5 h-5" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleShowReceipt(service)}
                                                        className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Imprimir Ticket"
                                                    >
                                                        <ScrollText className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onShowNotaVenta({ ...service, type: 'Impresora', tableName: 'servicios_impresoras', original: service })}
                                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Generar Nota de Venta"
                                                    >
                                                        <FileText className="w-5 h-5" />
                                                    </button>

                                                    {service.pagado && service.entregado ? (
                                                        <span className="hidden sm:inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-500/10 backdrop-blur-md border border-green-500/20 rounded-md mr-2">
                                                            Pagado y Entregado
                                                        </span>
                                                    ) : (
                                                        <span className="hidden sm:inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-md mr-2">
                                                            Pendiente de Entregar/Pagar
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => onViewService(service)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Ver Servicio"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onEdit(service)}
                                                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Editar Servicio"
                                                    >
                                                        <Edit2 className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(service.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar Servicio"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="md:hidden flex flex-col gap-4 p-4 pb-24">
                            {sortedServices.map((service) => (
                                <div
                                    key={`mobile-printer-${service.id}`}
                                    className={`rounded-2xl p-5 border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 mb-2">
                                                #{service.orden_numero}
                                            </span>
                                            <h3 className={`text-lg font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                                {service.cliente_nombre}
                                            </h3>
                                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {formatServiceDate(service.fecha)}
                                            </p>
                                        </div>
                                        <StatusDropdown
                                            service={service}
                                            darkMode={darkMode}
                                            onStatusChange={fetchServices}
                                            tableName="servicios_impresoras"
                                        />
                                    </div>

                                    <div className="flex justify-between items-end border-t border-dashed pt-4 border-slate-200 dark:border-slate-700">
                                        <div>
                                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total</p>
                                            <p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                ${formatCurrency(service.total)}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleShowQR(service)}
                                                className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"
                                            >
                                                <QrCode className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleShowReceipt(service)}
                                                className="p-2.5 bg-slate-50 text-slate-600 rounded-xl"
                                            >
                                                <ScrollText className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onShowNotaVenta({ ...service, type: 'Impresora', tableName: 'servicios_impresoras', original: service })}
                                                className="p-2.5 bg-blue-50 text-blue-500 rounded-xl"
                                                title="Generar Nota de Venta"
                                            >
                                                <FileText className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onViewService(service)}
                                                className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onEdit(service)}
                                                className="p-2.5 bg-slate-50 text-slate-600 rounded-xl"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(service.id)}
                                                className="p-2.5 bg-red-50 text-red-600 rounded-xl"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* QR Ticket Modal */}
            {
                showQRTicket && selectedServiceForQR && (
                    <QRServiceTicket
                        service={selectedServiceForQR}
                        onClose={() => {
                            setShowQRTicket(false);
                            setSelectedServiceForQR(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }

            {/* Receipt Modal */}
            {
                showReceipt && selectedServiceForReceipt && (
                    <ServiceReceipt
                        service={selectedServiceForReceipt}
                        onClose={() => {
                            setShowReceipt(false);
                            setSelectedServiceForReceipt(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }
        </div >
    );
};

const PrinterServiceView = ({ service, onBack, onEdit, darkMode, company }) => {
    if (!service) return null;

    const [showQRTicket, setShowQRTicket] = useState(false);
    const [selectedServiceForQR, setSelectedServiceForQR] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedServiceForReceipt, setSelectedServiceForReceipt] = useState(null);

    const handleShowQR = (service) => {
        setSelectedServiceForQR(service);
        setShowQRTicket(true);
    };

    const handleShowReceipt = (service) => {
        setSelectedServiceForReceipt(service);
        setShowReceipt(true);
    };

    const [photos, setPhotos] = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);

    useEffect(() => {
        if (service?.id) fetchPhotos();
    }, [service]);

    const fetchPhotos = async () => {
        setLoadingPhotos(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('servicio_fotos')
                .select('*')
                .eq('servicio_id', service.id)
                .eq('user_id', user.id)
                .eq('tipo_servicio', 'servicios_impresoras');

            if (error) throw error;

            const mappedPhotos = (data || []).map(photo => ({
                ...photo,
                uri: photo.foto_url || photo.url || photo.uri || ''
            }));

            setPhotos(mappedPhotos);
        } catch (error) {
            console.error('Error fetching photos:', error);
        } finally {
            setLoadingPhotos(false);
        }
    };

    const formatMoney = (amount) => `$${formatCurrency(amount || 0)}`;

    return (
        <div className="w-full min-h-screen p-6 md:p-10">
            <div className="max-w-7xl mx-auto bg-white rounded-3xl overflow-hidden shadow-2xl border border-purple-100">

                {/* Header Section */}
                <div className="p-8 bg-gradient-to-r from-purple-50 to-white border-b border-purple-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-5">
                            <button onClick={onBack} className="p-3 bg-white rounded-full shadow-sm hover:shadow-md transition-all text-slate-600 hover:text-purple-600">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div className="flex items-start gap-4">
                                {company?.logo_uri ? (
                                    <img src={company.logo_uri} alt="Logo" className="w-20 h-20 object-contain p-1 rounded-xl bg-white shadow-sm" />
                                ) : (
                                    <div className="w-20 h-20 bg-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-purple-600/20">{company?.nombre?.charAt(0) || 'C'}</div>
                                )}
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{company?.nombre || 'Mi Empresa'}</h2>
                                    {company?.direccion && <p className="text-[10px] text-slate-500 max-w-[250px] leading-tight mt-1">{company.direccion}</p>}
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                        {company?.telefono && <p className="text-[10px] font-bold text-slate-600">Tel: {company.telefono}</p>}
                                        {company?.correo && <p className="text-[10px] font-bold text-slate-600">{company.correo}</p>}
                                        {company?.rfc && <p className="text-[10px] font-bold text-purple-600 uppercase">RFC: {company.rfc}</p>}
                                    </div>
                                    <div className="flex gap-3 mt-3 no-print">
                                        <button onClick={() => handleShowQR(service)} className="px-4 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all flex items-center gap-2 shadow-sm">
                                            <QrCode className="w-3.5 h-3.5" /> TICKET QR
                                        </button>
                                        <button onClick={() => handleShowReceipt(service)} className="px-4 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all flex items-center gap-2 shadow-sm">
                                            <ScrollText className="w-3.5 h-3.5" /> RECIBO
                                        </button>
                                        <button onClick={() => onEdit(service)} className="px-4 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all flex items-center gap-2 shadow-sm">
                                            <Edit2 className="w-3.5 h-3.5" /> EDITAR REPORTE
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-left md:text-right">
                            <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 mb-1">Reparación de Impresora</span>
                            <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-2">#{service.orden_numero}</h1>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-xl shadow-lg">
                                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-xs font-mono font-bold">{formatServiceDate(service.fecha)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="p-8 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column - 2 cols */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Cliente y Técnico */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Cliente */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <User className="w-5 h-5 text-blue-600" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600">Cliente</h3>
                                </div>
                                <p className="text-xl font-bold text-slate-800 mb-1">{service.cliente_nombre}</p>
                                <p className="text-sm text-slate-500">{service.cliente_telefono}</p>
                            </div>

                            {/* Técnico Responsable */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-white border border-orange-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users className="w-5 h-5 text-orange-600" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600">Técnico Responsable</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                                        {service.tecnico_nombre ? service.tecnico_nombre.charAt(0) : 'I'}
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-slate-800">{service.tecnico_nombre || 'Sin asignar'}</p>
                                        <p className="text-xs text-slate-500">Asignado al servicio</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dispositivo */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-white border border-purple-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Printer className="w-5 h-5 text-purple-600" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-600">Dispositivo</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Equipo</p>
                                    <p className="text-base font-semibold text-slate-800">{service.equipo_tipo} • {service.equipo_modelo}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Número de Serie</p>
                                    <p className="text-base font-mono text-slate-600">{service.equipo_serie}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Contador</p>
                                    <p className="text-base font-mono text-slate-600">{service.equipo_contador}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Consumibles</p>
                                    <p className="text-base font-mono text-slate-600">{service.estado_consumibles}</p>
                                </div>
                            </div>
                            {service.accesorios && (
                                <div className="mt-4 pt-4 border-t border-purple-100">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Accesorios</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(() => {
                                            try {
                                                let acc = service.accesorios;
                                                if (typeof acc === 'string' && acc.startsWith('[')) acc = JSON.parse(acc);
                                                if (Array.isArray(acc)) {
                                                    return acc.map((item, i) => (
                                                        <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-medium">
                                                            {item}
                                                        </span>
                                                    ));
                                                }
                                                return <span className="text-sm text-slate-700">{service.accesorios}</span>;
                                            } catch {
                                                return <span className="text-sm text-slate-700">{service.accesorios}</span>;
                                            }
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Informe Técnico */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-50 to-white border border-cyan-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Settings className="w-5 h-5 text-cyan-600" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-600">Informe Técnico</h3>
                            </div>

                            <div className="space-y-4">
                                {/* Problema Reportado */}
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-bold">Problema Reportado</p>
                                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                                        {(service.problema_reportado || '').split('\n').map((line, i) => (
                                            line.trim() && (
                                                <div key={i} className="flex gap-2 items-start mb-1 last:mb-0">
                                                    <Check className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" strokeWidth={3} />
                                                    <span className="text-sm text-red-800">{line}</span>
                                                </div>
                                            )
                                        ))}
                                        {!service.problema_reportado && <p className="text-sm text-red-600 italic">No especificado</p>}
                                    </div>
                                </div>

                                {/* Diagnóstico */}
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-bold">Diagnóstico Realizado</p>
                                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                        {(service.diagnostico || '').split('\n').map((line, i) => (
                                            line.trim() && (
                                                <div key={i} className="flex gap-2 items-start mb-1 last:mb-0">
                                                    <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" strokeWidth={3} />
                                                    <span className="text-sm text-blue-800">{line}</span>
                                                </div>
                                            )
                                        ))}
                                        {!service.diagnostico && <p className="text-sm text-blue-600 italic">Diagnóstico pendiente...</p>}
                                    </div>
                                </div>

                                {/* Trabajo Realizado */}
                                {service.trabajo_realizado && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-bold">Trabajo Realizado</p>
                                        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                                            {(() => {
                                                try {
                                                    let items = service.trabajo_realizado;
                                                    if (typeof items === 'string' && items.startsWith('[')) items = JSON.parse(items);
                                                    if (Array.isArray(items)) {
                                                        return items.map((item, i) => (
                                                            <div key={i} className="flex gap-2 items-start mb-1 last:mb-0">
                                                                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" strokeWidth={3} />
                                                                <span className="text-sm text-green-800">{item}</span>
                                                            </div>
                                                        ));
                                                    }
                                                    return (typeof items === 'string' ? items.split(',') : []).map((item, i) => (
                                                        <div key={i} className="flex gap-2 items-start mb-1 last:mb-0">
                                                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" strokeWidth={3} />
                                                            <span className="text-sm text-green-800">{item}</span>
                                                        </div>
                                                    ));
                                                } catch {
                                                    return <p className="text-sm text-green-800">{service.trabajo_realizado}</p>;
                                                }
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {/* Repuestos */}
                                {(service.repuestos_descripcion && service.repuestos_descripcion !== '[]') && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-bold">Repuestos & Materiales</p>
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                            {(() => {
                                                try {
                                                    // Try to parse as JSON for new format
                                                    if (service.repuestos_descripcion.startsWith('[')) {
                                                        const parts = JSON.parse(service.repuestos_descripcion);
                                                        return (
                                                            <div className="w-full">
                                                                <div className="flex text-xs font-bold text-slate-500 border-b border-slate-200 pb-2 mb-2">
                                                                    <div className="w-12 text-center">Cant</div>
                                                                    <div className="flex-1">Articulo</div>
                                                                    <div className="w-20 text-right">Precio</div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    {parts.map((part, i) => (
                                                                        <div key={i} className="flex items-start text-sm py-1 border-b border-slate-100 last:border-0">
                                                                            <div className="w-12 text-center text-slate-500">{part.cantidad || 1}</div>
                                                                            <div className="flex-1 text-slate-700 font-medium">{part.producto || part.descripcion}</div>
                                                                            <div className="w-20 text-right text-slate-600 font-mono">${formatCurrency(part.costoPublico || part.precio_publico)}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    // Fallback for simple string
                                                    return <p className="text-sm text-slate-700">{service.repuestos_descripcion}</p>;
                                                } catch (e) {
                                                    // Fallback for string or invalid JSON
                                                    return <p className="text-sm text-slate-700">{service.repuestos_descripcion}</p>;
                                                }
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {/* Observaciones */}
                                {service.observaciones && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-bold">Observaciones</p>
                                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                                            <p className="text-sm text-amber-800 italic">"{service.observaciones}"</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Resumen Financiero */}
                    <div className="lg:col-span-1">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-white border border-purple-100 sticky top-6">
                            <div className="flex items-center gap-2 mb-6">
                                <ShoppingCart className="w-5 h-5 text-purple-600" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-600">Resumen Financiero</h3>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Mano de Obra</span>
                                    <span className="font-semibold text-slate-800">{formatMoney(service.mano_obra)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Repuestos</span>
                                    <span className="font-semibold text-slate-800">{formatMoney(service.costo_repuestos)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Subtotal</span>
                                    <span className="font-semibold text-slate-800">{formatMoney(service.subtotal)}</span>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-4 mb-6">
                                <p className="text-xs text-purple-400 uppercase tracking-wider mb-2 text-center font-bold">Total a Pagar</p>
                                <p className="text-4xl font-black text-center text-purple-600">
                                    {formatMoney(service.total)}
                                </p>
                            </div>

                            <div className="space-y-2 p-4 rounded-xl bg-white border border-slate-200">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600 font-bold uppercase text-xs">Anticipo</span>
                                    <span className="font-bold text-purple-600">-{formatMoney(service.anticipo)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed border-slate-300">
                                    <span className="text-slate-800 font-bold uppercase text-xs">Restante</span>
                                    <span className="font-bold text-rose-600">{formatMoney((service.total || 0) - (service.anticipo || 0))}</span>
                                </div>
                            </div>
                        </div>

                        {/* Mini Gallery */}
                        <div className="p-6 rounded-3xl border border-slate-100 bg-white mt-6">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Evidencia ({photos.length})</h3>
                            {loadingPhotos ? (
                                <Loader className="animate-spin w-5 h-5 text-slate-300 mx-auto" />
                            ) : photos.length === 0 ? (
                                <p className="text-xs text-center text-slate-300 italic py-4 font-medium">Sin fotografías adjuntas.</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {photos.map(p => (
                                        <div key={p.id} className="aspect-square rounded-2xl overflow-hidden border border-slate-100 group relative">
                                            <img src={p.uri} alt="evidencia" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <button onClick={() => window.open(p.uri, '_blank')} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Eye className="w-5 h-5 text-white" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Firmas */}
                {(service.firma_tecnico_path || service.firma_cliente_path) && (
                    <div className="px-8 md:px-10 pb-8 grid grid-cols-2 gap-6">
                        {service.firma_tecnico_path && (
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                                <img src={service.firma_tecnico_path} alt="Firma Técnico" className="h-16 object-contain mb-3 mix-blend-multiply" />
                                <p className="text-xs uppercase tracking-widest text-slate-400">Firma del Técnico</p>
                            </div>
                        )}
                        {service.firma_cliente_path && (
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                                <img src={service.firma_cliente_path} alt="Firma Cliente" className="h-16 object-contain mb-3 mix-blend-multiply" />
                                <p className="text-xs uppercase tracking-widest text-slate-400">Firma de Conformidad</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* QR Ticket Modal */}
            {
                showQRTicket && selectedServiceForQR && (
                    <QRServiceTicket
                        service={selectedServiceForQR}
                        onClose={() => {
                            setShowQRTicket(false);
                            setSelectedServiceForQR(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }

            {/* Receipt Modal */}
            {
                showReceipt && selectedServiceForReceipt && (
                    <ServiceReceipt
                        service={selectedServiceForReceipt}
                        onClose={() => {
                            setShowReceipt(false);
                            setSelectedServiceForReceipt(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }
        </div>
    );
};

const NetworkServiceView = ({ service, onBack, onEdit, darkMode, company }) => {
    if (!service) return null;

    const [showQRTicket, setShowQRTicket] = useState(false);
    const [selectedServiceForQR, setSelectedServiceForQR] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedServiceForReceipt, setSelectedServiceForReceipt] = useState(null);

    const handleShowQR = (service) => {
        setSelectedServiceForQR(service);
        setShowQRTicket(true);
    };

    const handleShowReceipt = (service) => {
        setSelectedServiceForReceipt(service);
        setShowReceipt(true);
    };

    const [photos, setPhotos] = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);

    useEffect(() => {
        if (service?.id) fetchPhotos();
    }, [service]);

    const fetchPhotos = async () => {
        setLoadingPhotos(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('servicio_fotos')
                .select('*')
                .eq('servicio_id', service.id)
                .eq('user_id', user.id)
                .eq('tipo_servicio', 'servicios_redes');

            if (error) throw error;

            const mappedPhotos = (data || []).map(photo => ({
                ...photo,
                uri: photo.foto_url || photo.url || photo.uri || ''
            }));

            setPhotos(mappedPhotos);
        } catch (error) {
            console.error('Error fetching photos:', error);
        } finally {
            setLoadingPhotos(false);
        }
    };

    const formatMoney = (amount) => `$${formatCurrency(amount || 0)}`;

    return (
        <div className="w-full min-h-screen p-6 md:p-10">
            <div className="max-w-7xl mx-auto bg-white rounded-3xl overflow-hidden shadow-2xl border border-cyan-100">

                {/* Header Section */}
                <div className="p-8 bg-gradient-to-r from-cyan-50 to-white border-b border-cyan-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-5">
                            <button onClick={onBack} className="p-3 bg-white rounded-full shadow-sm hover:shadow-md transition-all text-slate-600 hover:text-cyan-600">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div className="flex items-start gap-4">
                                {company?.logo_uri ? (
                                    <img src={company.logo_uri} alt="Logo" className="w-20 h-20 object-contain p-1 rounded-xl bg-white shadow-sm" />
                                ) : (
                                    <div className="w-20 h-20 bg-cyan-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-cyan-600/20">{company?.nombre?.charAt(0) || 'C'}</div>
                                )}
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{company?.nombre || 'Mi Empresa'}</h2>
                                    {company?.direccion && <p className="text-[10px] text-slate-500 max-w-[250px] leading-tight mt-1">{company.direccion}</p>}
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                        {company?.telefono && <p className="text-[10px] font-bold text-slate-600">Tel: {company.telefono}</p>}
                                        {company?.correo && <p className="text-[10px] font-bold text-slate-600">{company.correo}</p>}
                                        {company?.rfc && <p className="text-[10px] font-bold text-cyan-600 uppercase">RFC: {company.rfc}</p>}
                                    </div>
                                    <div className="flex gap-3 mt-3 no-print">
                                        <button onClick={() => onEdit(service)} className="px-4 py-1.5 bg-cyan-600 text-white rounded-xl text-xs font-bold hover:bg-cyan-700 transition-all flex items-center gap-2 shadow-sm">
                                            <Edit2 className="w-3.5 h-3.5" /> EDITAR REPORTE
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-left md:text-right">
                            <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-1">Servicio de Redes</span>
                            <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-2">#{service.orden_numero}</h1>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-xl shadow-lg">
                                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="text-xs font-mono font-bold">{formatServiceDate(service.fecha)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="p-8 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column - 2 cols */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Cliente y Técnico */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Cliente */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <User className="w-5 h-5 text-blue-600" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600">Cliente</h3>
                                </div>
                                <p className="text-xl font-bold text-slate-800 mb-1">{service.cliente_nombre}</p>
                                <p className="text-sm text-slate-500">{service.cliente_telefono}</p>
                            </div>

                            {/* Técnico Responsable */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-white border border-orange-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users className="w-5 h-5 text-orange-600" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600">Técnico Responsable</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                                        {service.tecnico_nombre ? service.tecnico_nombre.charAt(0) : 'I'}
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-slate-800">{service.tecnico_nombre || 'Sin asignar'}</p>
                                        <p className="text-xs text-slate-500">Asignado al servicio</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detalles de Red */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-50 to-white border border-cyan-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Wifi className="w-5 h-5 text-cyan-600" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-600">Detalles de Red</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Tipo de Servicio</p>
                                    <p className="text-base font-semibold text-slate-800">{service.tipo_servicio}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">SSID / WiFi</p>
                                    <p className="text-base font-mono text-slate-600">{service.wifi_ssid}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Password WiFi</p>
                                    <p className="text-base font-mono text-slate-600">{service.wifi_password}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Gateway IP</p>
                                    <p className="text-base font-mono text-slate-600">{service.wifi_gateway_ip}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-cyan-100">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Bajada</p>
                                    <p className="text-base font-mono font-bold text-green-600">{service.velocidad_bajada} Mbps</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Subida</p>
                                    <p className="text-base font-mono font-bold text-blue-600">{service.velocidad_subida} Mbps</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Ping</p>
                                    <p className="text-base font-mono font-bold text-orange-600">{service.velocidad_ping} ms</p>
                                </div>
                            </div>
                        </div>

                        {/* Informe Técnico */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Settings className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600">Informe Técnico</h3>
                            </div>

                            <div className="space-y-4">
                                {/* Trabajo Realizado */}
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-bold">Trabajo Realizado</p>
                                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                        {(service.trabajo_realizado || '').split('\n').map((line, i) => (
                                            line.trim() && (
                                                <div key={i} className="flex gap-2 items-start mb-1 last:mb-0">
                                                    <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" strokeWidth={3} />
                                                    <span className="text-sm text-blue-800">{line}</span>
                                                </div>
                                            )
                                        ))}
                                        {!service.trabajo_realizado && <p className="text-sm text-blue-600 italic">No especificado</p>}
                                    </div>
                                </div>

                                {/* Materiales / Repuestos */}
                                {(service.materiales_descripcion && service.materiales_descripcion !== '[]') && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-bold">Materiales Utilizados</p>
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                            {(() => {
                                                try {
                                                    // Try to parse as JSON
                                                    if (service.materiales_descripcion && service.materiales_descripcion.startsWith('[')) {
                                                        const parts = JSON.parse(service.materiales_descripcion);
                                                        return (
                                                            <div className="w-full">
                                                                <div className="flex text-xs font-bold text-slate-500 border-b border-slate-200 pb-2 mb-2">
                                                                    <div className="w-12 text-center">Cant</div>
                                                                    <div className="flex-1">Articulo</div>
                                                                    <div className="w-24 text-right">Precio U.</div>
                                                                    <div className="w-24 text-right">Total</div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    {parts.map((part, i) => (
                                                                        <div key={i} className="flex items-start text-sm py-1 border-b border-slate-100 last:border-0">
                                                                            <div className="w-12 text-center text-slate-500">{part.cantidad || 1}</div>
                                                                            <div className="flex-1 text-slate-700 font-medium">{part.producto || part.descripcion}</div>
                                                                            <div className="w-24 text-right text-slate-600 font-mono">${formatCurrency(part.costoPublico || part.precio_publico || 0)}</div>
                                                                            <div className="w-24 text-right text-slate-800 font-mono font-bold">${formatCurrency((part.cantidad || 1) * (part.costoPublico || part.precio_publico || 0))}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    // Fallback for simple string
                                                    return <p className="text-sm text-slate-700">{service.materiales_descripcion}</p>;
                                                } catch (e) {
                                                    return <p className="text-sm text-slate-700">{service.materiales_descripcion}</p>;
                                                }
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {/* Observaciones */}
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-bold">Observaciones</p>
                                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                        <p className="text-sm text-slate-700 whitespace-pre-line">{service.observaciones || 'Sin observaciones'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Evidencia Fotográfica */}
                        {photos.length > 0 && (
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                                <div className="flex items-center gap-2 mb-4">
                                    <Image className="w-5 h-5 text-slate-600" />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Evidencia Fotográfica</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {photos.map((photo, index) => (
                                        <div key={index} className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer">
                                            <img src={photo.uri} alt="Evidencia" className="w-full h-full object-cover" onClick={() => window.open(photo.uri, '_blank')} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Financials */}
                    <div className="lg:col-span-1">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-50 to-white border border-cyan-100 sticky top-6">
                            <div className="flex items-center gap-2 mb-6">
                                <ShoppingCart className="w-5 h-5 text-cyan-600" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-600">Resumen Financiero</h3>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Mano de Obra</span>
                                    <span className="font-semibold text-slate-800">{formatMoney(service.mano_obra)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Materiales</span>
                                    <span className="font-semibold text-slate-800">{formatMoney(service.costo_materiales)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600">Subtotal</span>
                                    <span className="font-semibold text-slate-800">{formatMoney(service.subtotal)}</span>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-4 mb-6">
                                <p className="text-xs text-cyan-400 uppercase tracking-wider mb-2 text-center font-bold">Total a Pagar</p>
                                <p className="text-4xl font-black text-center text-cyan-600">
                                    {formatMoney(service.total)}
                                </p>
                            </div>

                            <div className="space-y-2 p-4 rounded-xl bg-white border border-slate-200">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600 font-bold uppercase text-xs">Anticipo</span>
                                    <span className="font-bold text-cyan-600">-{formatMoney(service.anticipo)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed border-slate-300">
                                    <span className="text-slate-800 font-bold uppercase text-xs">Restante</span>
                                    <span className="font-bold text-rose-600">{formatMoney((service.total || 0) - (service.anticipo || 0))}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* QR Ticket Modal */}
            {
                showQRTicket && selectedServiceForQR && (
                    <QRServiceTicket
                        service={selectedServiceForQR}
                        onClose={() => {
                            setShowQRTicket(false);
                            setSelectedServiceForQR(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }

            {/* Receipt Modal */}
            {
                showReceipt && selectedServiceForReceipt && (
                    <ServiceReceipt
                        service={selectedServiceForReceipt}
                        onClose={() => {
                            setShowReceipt(false);
                            setSelectedServiceForReceipt(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }
        </div>
    );
};

const NetworkList = ({ darkMode, onNavigate, onViewService, onCreateNew, onEdit, onShowNotaVenta, user, refreshTrigger }) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });
    const [showQRTicket, setShowQRTicket] = useState(false);
    const [selectedServiceForQR, setSelectedServiceForQR] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedServiceForReceipt, setSelectedServiceForReceipt] = useState(null);

    useEffect(() => {
        fetchServices();
    }, [user, refreshTrigger]);

    const fetchServices = async () => {
        if (!user) return;
        setRefreshing(true);
        try {
            const { data, error } = await supabase
                .from('servicios_redes')
                .select('*')
                .eq('user_id', user.id)
                .order('fecha', { ascending: false });

            if (error) throw error;
            setServices(data || []);
        } catch (error) {
            console.error('Error loading Network services:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleShowQR = (service) => {
        setSelectedServiceForQR(service);
        setShowQRTicket(true);
    };

    const handleShowReceipt = (service) => {
        setSelectedServiceForReceipt(service);
        setShowReceipt(true);
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedServices = React.useMemo(() => {
        let sortableItems = [...services];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (sortConfig.key === 'fecha') {
                    const parseDate = (d) => {
                        if (!d) return 0;
                        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + 'T00:00:00').getTime();
                        const date = new Date(d);
                        if (!isNaN(date.getTime())) return date.getTime();
                        return 0;
                    };
                    aVal = parseDate(aVal);
                    bVal = parseDate(bVal);
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [services, sortConfig]);

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este servicio?')) return;
        try {
            await deleteServicePhotos(id);
            const { error } = await supabase
                .from('servicios_redes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setServices(services.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting service:', error);
            alert('Error al eliminar servicio');
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader className="animate-spin w-8 h-8 text-cyan-600" /></div>;

    return (
        <div className="w-full px-4 md:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h1 className={`text-3xl font-extrabold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        Servicios <span className="text-cyan-600">Redes</span>
                    </h1>
                    <button
                        onClick={fetchServices}
                        className={`p-2 rounded-full transition-all hover:scale-110 ${darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}
                        title="Actualizar lista"
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-cyan-600' : ''}`} />
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onCreateNew}
                        className="btn bg-cyan-600 text-white hover:bg-cyan-700 shadow-lg shadow-cyan-500/30 transform hover:-translate-y-0.5 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Servicio
                    </button>
                </div>
            </div>

            <div className={`rounded-xl shadow-lg border min-h-[600px] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                {services.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        No hay servicios de Redes registrados.
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block pb-64">
                            <table className="w-full">
                                <thead className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50/50 border-gray-200'}`}>
                                    <tr>
                                        <th onClick={() => requestSort('orden_numero')} className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-500/10 transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>
                                            <div className="flex items-center gap-1">
                                                No. Servicio
                                                {sortConfig.key === 'orden_numero' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Cliente</th>
                                        <th onClick={() => requestSort('fecha')} className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-500/10 transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>
                                            <div className="flex items-center gap-1">
                                                Fecha
                                                {sortConfig.key === 'fecha' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Total</th>
                                        <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Estado</th>
                                        <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                                    {sortedServices.map((service) => (
                                        <tr key={service.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-cyan-50/30'}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-bold text-cyan-600">#{service.orden_numero}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{service.cliente_nombre}</span>
                                                    <span className="text-xs text-slate-500">{service.cliente_telefono}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{formatServiceDate(service.fecha)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>${formatCurrency(service.total)}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusDropdown
                                                    service={service}
                                                    darkMode={darkMode}
                                                    onStatusChange={fetchServices}
                                                    tableName="servicios_redes"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleShowQR(service)}
                                                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                        title="Ver QR de Seguimiento"
                                                    >
                                                        <QrCode className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleShowReceipt(service)}
                                                        className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Imprimir Ticket"
                                                    >
                                                        <ScrollText className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onShowNotaVenta({ ...service, type: 'Redes', tableName: 'servicios_redes', original: service })}
                                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Generar Nota de Venta"
                                                    >
                                                        <FileText className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onViewService(service)}
                                                        className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                                        title="Ver Detalle"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onEdit(service)}
                                                        className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(service.id)}
                                                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="md:hidden flex flex-col gap-4 p-4 pb-24">
                            {sortedServices.map((service) => (
                                <div
                                    key={`mobile-network-${service.id}`}
                                    className={`rounded-2xl p-5 border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 mb-2">
                                                #{service.orden_numero}
                                            </span>
                                            <h3 className={`text-lg font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                                {service.cliente_nombre}
                                            </h3>
                                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {formatServiceDate(service.fecha)}
                                            </p>
                                        </div>
                                        <StatusDropdown
                                            service={service}
                                            darkMode={darkMode}
                                            onStatusChange={fetchServices}
                                            tableName="servicios_redes"
                                        />
                                    </div>

                                    <div className="flex justify-between items-end border-t border-dashed pt-4 border-slate-200 dark:border-slate-700">
                                        <div>
                                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total</p>
                                            <p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                ${formatCurrency(service.total)}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleShowQR(service)}
                                                className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"
                                            >
                                                <QrCode className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleShowReceipt(service)}
                                                className="p-2.5 bg-slate-50 text-slate-600 rounded-xl"
                                            >
                                                <ScrollText className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onShowNotaVenta({ ...service, type: 'Redes', tableName: 'servicios_redes', original: service })}
                                                className="p-2.5 bg-blue-50 text-blue-500 rounded-xl"
                                                title="Generar Nota de Venta"
                                            >
                                                <FileText className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onViewService(service)}
                                                className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onEdit(service)}
                                                className="p-2.5 bg-slate-50 text-slate-400 rounded-xl"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(service.id)}
                                                className="p-2.5 bg-red-50 text-red-400 rounded-xl"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* QR Ticket Modal */}
            {
                showQRTicket && selectedServiceForQR && (
                    <QRServiceTicket
                        service={selectedServiceForQR}
                        onClose={() => {
                            setShowQRTicket(false);
                            setSelectedServiceForQR(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }

            {/* Receipt Modal */}
            {
                showReceipt && selectedServiceForReceipt && (
                    <ServiceReceipt
                        service={selectedServiceForReceipt}
                        onClose={() => {
                            setShowReceipt(false);
                            setSelectedServiceForReceipt(null);
                        }}
                        darkMode={darkMode}
                    />
                )
            }
        </div>
    );
};


const ReportsView = ({ darkMode, user }) => {
    const [loading, setLoading] = useState(true);
    const [earningsData, setEarningsData] = useState([]);
    const [frequentClients, setFrequentClients] = useState([]);
    const [topSpenders, setTopSpenders] = useState([]);
    const [stats, setStats] = useState({ totalEarnings: 0, totalServices: 0, avgTicket: 0 });

    // Filters
    const [datePreset, setDatePreset] = useState('1m'); // '1w', '1m', '1y', 'custom'
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const handlePresetChange = (preset) => {
        setDatePreset(preset);
        if (preset === 'custom') return;

        let days = 30;
        if (preset === '1w') days = 7;
        if (preset === '1y') days = 365;

        setDateRange({
            start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
        });
    };
    const [serviceType, setServiceType] = useState('all');

    const fetchReportsData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const tables = [
                { name: 'servicios_cctv', dateField: 'servicio_fecha', clientField: 'cliente_nombre', partsField: 'inventario_materiales' },
                { name: 'servicios_pc', dateField: 'fecha', clientField: 'cliente_nombre', partsField: 'repuestos_descripcion' },
                { name: 'servicios_celulares', dateField: 'fecha', clientField: 'cliente_nombre', partsField: 'repuestos_descripcion' },
                { name: 'servicios_impresoras', dateField: 'fecha', clientField: 'cliente_nombre', partsField: 'repuestos_descripcion' },
                { name: 'servicios_redes', dateField: 'fecha', clientField: 'cliente_nombre', partsField: 'materiales_descripcion' }
            ];

            const promises = tables.map(t =>
                supabase.from(t.name)
                    .select(`id, total, ${t.dateField}, created_at, ${t.clientField}, ${t.partsField}`)
                    .eq('user_id', user.id)
                    .then(res => {
                        if (res.error) {
                            console.error(`Error fetching from ${t.name}:`, res.error);
                            return { data: [], error: res.error };
                        }
                        console.log(`Fetched ${res.data?.length || 0} records from ${t.name}`);
                        return res;
                    })
            );

            const results = await Promise.all(promises);

            const parsePartsExpense = (partsData) => {
                if (!partsData) return 0;
                let parts = [];
                try {
                    if (typeof partsData === 'string') {
                        if (partsData.trim().startsWith('[')) parts = JSON.parse(partsData);
                    } else if (Array.isArray(partsData)) {
                        parts = partsData;
                    }
                } catch (e) { return 0; }

                return parts.reduce((acc, p) => acc + ((Number(p.costo_empresa || p.costoEmpresa) || 0) * (Number(p.cantidad) || 1)), 0);
            };

            const normalizeDate = (d) => {
                if (!d) return '';
                const s = String(d).trim();
                if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split('T')[0];

                // Handle DD/MM/YYYY
                const parts = s.split('/');
                if (parts.length === 3) {
                    if (parts[2].length === 4) { // DD/MM/YYYY
                        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                }

                try {
                    const date = new Date(s);
                    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
                } catch (e) { }
                return s;
            };

            let allServices = [];
            results.forEach((res, index) => {
                const table = tables[index];
                if (res.data) {
                    allServices = [...allServices, ...res.data.map(s => {
                        const expense = parsePartsExpense(s[table.partsField]);
                        const total = Number(s.total) || 0;
                        const rawDate = s[table.dateField] || s.created_at;
                        return {
                            ...s,
                            type: table.name.replace('servicios_', ''),
                            date: normalizeDate(rawDate),
                            cliente_nombre: s[table.clientField],
                            expense: expense,
                            profit: total - expense
                        };
                    })];
                }
            });

            // Apply Filters
            const filtered = allServices.filter(s => {
                const dateMatch = s.date >= dateRange.start && s.date <= dateRange.end;
                const typeMatch = serviceType === 'all' || s.type === serviceType;
                return dateMatch && typeMatch;
            });

            // Calculate Stats
            const totalEarnings = filtered.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
            const totalExpenses = filtered.reduce((sum, s) => sum + (s.expense || 0), 0);
            const totalProfit = totalEarnings - totalExpenses;
            const totalServices = filtered.length;
            const avgTicket = totalServices > 0 ? totalEarnings / totalServices : 0;

            setStats({ totalEarnings, totalExpenses, totalProfit, totalServices, avgTicket });

            // Generate Continuous Timeline
            const earningsByDate = filtered.reduce((acc, s) => {
                const date = s.date;
                acc[date] = (acc[date] || 0) + (Number(s.total) || 0);
                return acc;
            }, {});

            // Fill gaps in timeline
            const timeline = [];
            let curr = new Date(dateRange.start + 'T00:00:00');
            const end = new Date(dateRange.end + 'T00:00:00');

            while (curr <= end) {
                const dateStr = curr.toISOString().split('T')[0];
                timeline.push({
                    date: dateStr,
                    amount: earningsByDate[dateStr] || 0
                });
                curr.setDate(curr.getDate() + 1);
            }

            setEarningsData(timeline);

            // Frequent Clients & Top Spenders
            const clientStats = filtered.reduce((acc, s) => {
                const name = s.cliente_nombre || 'Desconocido';
                if (!acc[name]) acc[name] = { name, count: 0, total: 0 };
                acc[name].count += 1;
                acc[name].total += (Number(s.total) || 0);
                return acc;
            }, {});

            const clientsArray = Object.values(clientStats);
            setFrequentClients([...clientsArray].sort((a, b) => b.count - a.count).slice(0, 5));
            setTopSpenders([...clientsArray].sort((a, b) => b.total - a.total).slice(0, 5));

        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReportsData();
    }, [user, dateRange, serviceType]);

    const formatMoney = (val) => `$${formatCurrency(val)}`;

    // Simple Bar Chart Component
    const MiniBarChart = ({ data }) => {
        if (!data || data.length === 0) return <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
            <BarChart2 className="w-10 h-10 mb-2 opacity-20" />
            <p className="font-bold text-sm">Sin datos para el período</p>
        </div>;

        const maxVal = Math.max(...data.map(d => d.amount), 1);

        return (
            <div className={`p-8 rounded-[2.5rem] border transition-all duration-500 ${darkMode ? 'bg-slate-800/50 border-slate-700 shadow-2xl' : 'bg-white border-slate-100 shadow-2xl shadow-blue-500/5'}`}>
                <div className="flex justify-between items-center mb-10">
                    <h3 className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Tendencia de Ingresos</h3>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">INGRESOS DIARIOS</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-end gap-1.5 h-64 w-full px-2 group/chart">
                    {data.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                            <div
                                className={`w-full ${d.amount > 0 ? 'bg-gradient-to-t from-blue-600 to-indigo-400 hover:from-blue-500 hover:to-indigo-300' : 'bg-slate-100 dark:bg-slate-800'} rounded-2xl transition-all duration-700 ease-out cursor-help relative group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] shadow-sm`}
                                style={{ height: `${(d.amount / maxVal) * 95}%`, minHeight: d.amount > 0 ? '6px' : '4px' }}
                            >
                                {d.amount > 0 && (
                                    <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-300 opacity-0 group-hover:opacity-100 z-50 transform group-hover:scale-110 translate-y-2 group-hover:translate-y-0">
                                        <div className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-[10px] font-black py-2 px-4 rounded-2xl shadow-2xl whitespace-nowrap border border-white/10 dark:border-slate-200">
                                            <div className="text-blue-400 dark:text-blue-600 mb-0.5 uppercase tracking-tighter opacity-70">{d.date}</div>
                                            <div className="text-xs">{formatMoney(d.amount)}</div>
                                        </div>
                                        <div className="w-2 h-2 bg-slate-900 dark:bg-white rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="w-full px-4 md:px-12 py-10 animate-in fade-in duration-700 bg-slate-50/30 dark:bg-transparent min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-12 gap-8">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                        <div className={`relative p-5 rounded-[1.5rem] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} border shadow-2xl`}>
                            <TrendingUp className="w-10 h-10 text-blue-600" />
                        </div>
                    </div>
                    <div>
                        <h1 className={`text-5xl font-black tracking-tight mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            Dashboard de <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent italic">Negocio</span>
                        </h1>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${darkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>PRO ANALYTICS</span>
                            <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Visualización de métricas avanzadas en tiempo real</p>
                        </div>
                    </div>
                </div>

                {/* Glass Filter Bar */}
                <div className={`p-2 rounded-[2rem] border backdrop-blur-3xl transition-all duration-500 flex flex-wrap gap-2 ${darkMode ? 'bg-slate-800/40 border-slate-700/50 shadow-2xl shadow-blue-500/5' : 'bg-white/90 border-slate-200/50 shadow-2xl shadow-blue-500/10'}`}>
                    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all ${darkMode ? 'bg-slate-700/30 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                        <Filter className="w-4 h-4 text-blue-500" />
                        <select
                            value={serviceType}
                            onChange={(e) => setServiceType(e.target.value)}
                            className="bg-transparent border-none text-sm font-black focus:ring-0 cursor-pointer outline-none pr-6"
                        >
                            <option value="all">Servicios: Todos</option>
                            <option value="pc">Equipos PC</option>
                            <option value="cctv">Sistemas CCTV</option>
                            <option value="celulares">Telefonía Celular</option>
                            <option value="impresoras">Servicio Impresoras</option>
                            <option value="redes">Infraestructura Redes</option>
                        </select>
                    </div>

                    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all ${darkMode ? 'bg-slate-700/30 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        <select
                            value={datePreset}
                            onChange={(e) => handlePresetChange(e.target.value)}
                            className="bg-transparent border-none text-sm font-black focus:ring-0 cursor-pointer outline-none pr-6"
                        >
                            <option value="1w">Semana Actual</option>
                            <option value="1m">Últimos 30 días</option>
                            <option value="1y">Año en curso</option>
                            <option value="custom">Personalizado...</option>
                        </select>

                        {datePreset === 'custom' && (
                            <div className="flex items-center gap-3 pr-2 border-l border-slate-300/40 pl-4 ml-2 animate-in fade-in zoom-in-95 duration-300">
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className={`bg-transparent border-none text-xs font-black focus:ring-0 outline-none w-28 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
                                />
                                <span className={`text-slate-300 font-thin ${darkMode ? 'opacity-20' : ''}`}>|</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    className={`bg-transparent border-none text-xs font-black focus:ring-0 outline-none w-28 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
                                />
                            </div>
                        )}
                    </div>

                    <button
                        onClick={fetchReportsData}
                        className={`p-2.5 rounded-[1.5rem] transition-all hover:scale-105 active:scale-95 ${darkMode ? 'bg-slate-700/50 hover:bg-blue-500/20 text-blue-400' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'} border border-transparent hover:border-blue-500/30`}
                        title="Actualizar datos"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[500px] gap-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                        <Loader className="w-16 h-16 animate-spin text-blue-600 relative z-10" />
                    </div>
                    <div className="text-center">
                        <p className={`text-xl font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Analizando Datos...</p>
                        <p className="text-slate-400 font-medium tracking-wide">Construyendo métricas de rendimiento</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-12 pb-20">
                    {/* Stat Cards Container */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Gross Revenue */}
                        <div className={`group relative overflow-hidden p-8 rounded-[2.5rem] border transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 ${darkMode ? 'bg-slate-800/80 border-slate-700/50 shadow-2xl shadow-blue-900/20' : 'bg-white border-slate-100 shadow-2xl shadow-blue-500/10'}`}>
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150 group-hover:bg-indigo-500/20"></div>
                            <div className="relative flex justify-between items-start mb-8">
                                <div className="p-4 bg-gradient-to-br from-indigo-500 to-blue-700 rounded-2xl text-white shadow-xl shadow-indigo-500/30 rotate-3 group-hover:rotate-0 transition-transform">
                                    <DollarSign className="w-7 h-7" />
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'bg-slate-700 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                    Bruto
                                </div>
                            </div>
                            <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 opacity-60 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Ingresos Totales</h3>
                            <p className={`text-4xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatMoney(stats.totalEarnings)}</p>
                            <div className="mt-6 h-2 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 rounded-full w-full animate-progress-glow"></div>
                            </div>
                        </div>

                        {/* Company Costs */}
                        <div className={`group relative overflow-hidden p-8 rounded-[2.5rem] border transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 ${darkMode ? 'bg-slate-800/80 border-slate-700/50 shadow-2xl shadow-rose-900/20' : 'bg-white border-slate-100 shadow-2xl shadow-rose-500/10'}`}>
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150 group-hover:bg-rose-500/20"></div>
                            <div className="relative flex justify-between items-start mb-8">
                                <div className="p-4 bg-gradient-to-br from-rose-500 to-pink-700 rounded-2xl text-white shadow-xl shadow-rose-500/30 -rotate-3 group-hover:rotate-0 transition-transform">
                                    <ShoppingCart className="w-7 h-7" />
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'bg-slate-700 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                                    Costos
                                </div>
                            </div>
                            <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 opacity-60 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Gasto Empresa</h3>
                            <p className={`text-4xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatMoney(stats.totalExpenses)}</p>
                            <div className="mt-6 h-2 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-rose-500 to-pink-600 rounded-full w-[40%]"></div>
                            </div>
                        </div>

                        {/* Net Profit */}
                        <div className={`group relative overflow-hidden p-8 rounded-[2.5rem] border transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 ${darkMode ? 'bg-slate-800/80 border-slate-700/50 shadow-2xl shadow-emerald-900/20' : 'bg-white border-slate-100 shadow-2xl shadow-emerald-500/10'}`}>
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150 group-hover:bg-emerald-500/20"></div>
                            <div className="relative flex justify-between items-start mb-8">
                                <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl text-white shadow-xl shadow-emerald-500/30 rotate-6 group-hover:rotate-0 transition-transform">
                                    <Zap className="w-7 h-7" />
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'bg-slate-700 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                    Beneficio
                                </div>
                            </div>
                            <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 opacity-60 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Ganancia Real</h3>
                            <p className={`text-4xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatMoney(stats.totalProfit)}</p>
                            <div className="mt-6 h-2 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 rounded-full w-[75%]"></div>
                            </div>
                        </div>

                        {/* Service Volume */}
                        <div className={`group relative overflow-hidden p-8 rounded-[2.5rem] border transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 ${darkMode ? 'bg-slate-800/80 border-slate-700/50 shadow-2xl shadow-purple-900/20' : 'bg-white border-slate-100 shadow-2xl shadow-slate-500/10'}`}>
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-slate-500/10 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150 group-hover:bg-slate-500/20"></div>
                            <div className="relative flex justify-between items-start mb-8">
                                <div className="p-4 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl text-white shadow-xl shadow-slate-800/40 -rotate-6 group-hover:rotate-0 transition-transform">
                                    <Users className="w-7 h-7" />
                                </div>
                            </div>
                            <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 opacity-60 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Volumen Servicios</h3>
                            <p className={`text-4xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.totalServices}</p>
                            <div className="mt-6 flex gap-1.5 h-2 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-[25%] transition-all hover:w-[35%]"></div>
                                <div className="h-full bg-indigo-500 w-[15%] transition-all hover:w-[25%]"></div>
                                <div className="h-full bg-emerald-500 w-[30%] transition-all hover:w-[40%]"></div>
                                <div className="h-full bg-rose-500 w-[30%] transition-all hover:w-[40%]"></div>
                            </div>
                        </div>
                    </div>

                    {/* Chart & Deep Insights Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Interactive Main Chart */}
                        <div className="lg:col-span-2">
                            <MiniBarChart data={earningsData} />
                        </div>

                        {/* Top Performers / Clients */}
                        <div className={`p-8 rounded-[2.5rem] border backdrop-blur-3xl transition-all duration-500 ${darkMode ? 'bg-slate-800/40 border-slate-700 shadow-2xl' : 'bg-white/80 border-slate-100 shadow-2xl shadow-blue-500/5'}`}>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
                                    <Trophy className="w-5 h-5" />
                                </div>
                                <h3 className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Top Clientes</h3>
                            </div>

                            <div className="space-y-8">
                                <section>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">💰 MAYOR FACTURACIÓN</p>
                                    <div className="space-y-4">
                                        {topSpenders.map((client, i) => (
                                            <div key={i} className="group/item flex justify-between items-center p-3 rounded-2xl transition-all hover:bg-white dark:hover:bg-slate-700 shadow-sm hover:shadow-md border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-colors ${i === 0 ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-slate-100 dark:bg-slate-700 dark:text-slate-300 text-slate-500'}`}>
                                                        {i + 1}
                                                    </div>
                                                    <span className={`text-sm font-bold truncate max-w-[140px] ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{client.name}</span>
                                                </div>
                                                <span className="text-sm font-black text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-3 py-1 rounded-lg">{formatMoney(client.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent"></div>

                                <section>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">🔄 MÁS RECURRENTES</p>
                                    <div className="space-y-4">
                                        {frequentClients.map((client, i) => (
                                            <div key={i} className="group/item flex justify-between items-center p-3 rounded-2xl transition-all hover:bg-white dark:hover:bg-slate-700 shadow-sm hover:shadow-md border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                        {i + 1}
                                                    </div>
                                                    <span className={`text-sm font-bold truncate max-w-[140px] ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{client.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                                    <span className="text-xs font-black text-indigo-600">{client.count}</span>
                                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">serv.</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const App = () => {

    // 1. Check for critical configuration errors first
    if (!supabase) {
        return <SupabaseConfigError />;
    }


    const handleLogout = async () => {
        // Clear local storage to prevent data leakage
        localStorage.removeItem('companyData');
        localStorage.removeItem('sb-access-token'); // If used custom
        localStorage.removeItem('sb-refresh-token'); // If used custom

        // Reset States
        setCompany(null);
        setSession(null);

        await supabase.auth.signOut();
    };


    // State
    const [session, setSession] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Mobile Mode State
    const [mobileMode, setMobileMode] = useState(window.innerWidth < 768);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Content Scroll Ref
    const contentRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            // Optional: Auto-switch if user resizes window, or keep manual?
            // Let's keep manual control respected if set, but initially detect.
            // For now, simple auto-detect on resize might be annoying if user manually toggled.
            // Let's just stick to initial detection on load (already in useState) 
            // and maybe update if it gets really small/large?
            // Actually, let's allow responsive auto-switching but respect manual toggle if we add a "userPreference" state.
            // For simplicity as requested: "detect when opening... integrate button".
            // So we'll update on resize to keep it responsive.
            setMobileMode(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleMobileMode = () => setMobileMode(!mobileMode);

    // Navigation State
    const [activeTab, setActiveTabState] = useState(() => {
        return localStorage.getItem('activeTab') || 'cotizaciones-list';
    });




    // Updated Company State to match DB Schema
    const [company, setCompany] = useState({
        nombre: '',
        direccion: '',
        telefono: '',
        correo: '',
        logo_uri: '',
        rfc: '',
        pagina_web: ''
    });

    const [client, setClient] = useState({ name: '', phone: '', email: '', address: '' });
    const [includeIva, setIncludeIva] = useState(false);
    // Saved Clients for Selector
    const [savedClients, setSavedClients] = useState([]);
    // Quotations from DB
    const [quotations, setQuotations] = useState([]);
    const [servicesRefreshTrigger, setServicesRefreshTrigger] = useState(0);
    const [editingQuotationId, setEditingQuotationId] = useState(null);
    const [viewingQuotation, setViewingQuotation] = useState(null);

    const [items, setItems] = useState([]);
    const [terms, setTerms] = useState('');
    const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
    const [expirationDate, setExpirationDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [showPreview, setShowPreview] = useState(false);
    const [showNotaPreview, setShowNotaPreview] = useState(false);
    const [selectedServiceForNota, setSelectedServiceForNota] = useState(null);

    // Auth State: Folio with COT-YYYY-XXX format
    const [folio, setFolio] = useState('COT-' + new Date().getFullYear() + '-100');

    const [isGenerating, setIsGenerating] = useState(false);

    // Initial State for Dirty Check (Deep Compare)
    const [initialState, setInitialState] = useState({
        client: { name: '', phone: '', email: '', address: '' },
        items: []
    });

    // Check for unsaved changes in Quotation Form
    const hasUnsavedChanges = () => {
        if (activeTab !== 'cotizaciones-new') return false;

        // Deep comparison of current state vs initial state
        const currentClientStr = JSON.stringify(client);
        const initialClientStr = JSON.stringify(initialState.client);

        const currentItemsStr = JSON.stringify(items);
        const initialItemsStr = JSON.stringify(initialState.items);

        return currentClientStr !== initialClientStr || currentItemsStr !== initialItemsStr;
    };

    // Original setter wrapped
    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        localStorage.setItem('activeTab', tab);
    };

    // Reset scroll to top on tab change
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTo(0, 0);
        }
    }, [activeTab]);

    const handleNavigation = (newTab) => {
        if (hasUnsavedChanges()) {
            if (window.confirm('Tienes cambios sin guardar en tu cotización. ¿Estás seguro de que quieres salir? Los datos no guardados se perderán.')) {
                setActiveTab(newTab);
            }
        } else {
            setActiveTab(newTab);
        }
    };

    // Handle Browser Close / Refresh
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = ''; // Chrome requires returnValue to be set
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [activeTab, items, client]);

    // --- END UNSAVED CHANGES LOGIC ---

    // Theme State
    const [currentTheme, setCurrentTheme] = useState(() => {
        return localStorage.getItem('theme') || 'blue';
    });

    const setTheme = (theme) => {
        setCurrentTheme(theme);
        localStorage.setItem('theme', theme);
    };

    // Helper for legacy dark mode support in child components
    const isDark = currentTheme === 'dark';

    // Template State
    const [selectedTemplate, setSelectedTemplate] = useState(() => {
        return localStorage.getItem('selectedTemplate') || 'classic';
    });

    // Selected Service for Details View
    const [selectedService, setSelectedService] = useState(null);

    const handleViewService = (service) => {
        setSelectedService(service);
        setActiveTab('services-cctv-view');
    };

    const handleViewPCService = (service) => {
        setSelectedService(service);
        setActiveTab('services-pc-view');
    };

    const handleTemplateChange = (templateId) => {
        setSelectedTemplate(templateId);
        localStorage.setItem('selectedTemplate', templateId);
    };

    // NEW AUTH EFFECT
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                fetchCompanySettings(session.user.id);
                fetchSavedClients(session.user.id);
                fetchQuotations(session.user.id);
            }
            setLoadingAuth(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                fetchCompanySettings(session.user.id);
                fetchSavedClients(session.user.id);
                fetchQuotations(session.user.id);
                fetchNextFolio(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (session?.user && activeTab === 'cotizaciones-list') {
            fetchQuotations(session.user.id);
        }
    }, [activeTab, session]);

    // PHONE SERVICE FORM STATE & HANDLERS
    const [editingPhoneService, setEditingPhoneService] = useState(null); // null, 'new', or service object

    const handleSavePhoneService = async (serviceData) => {
        try {
            let data, error;
            const { files, photosToDelete, ...payloadData } = serviceData;
            let payload = { ...payloadData, tecnico_celular: payloadData.tecnico_celular || '' };

            if (editingPhoneService === 'new') {
                const newOrden = await fetchNextPhoneServiceFolio(session.user.id);

                const newService = {
                    user_id: session.user.id,
                    orden_numero: newOrden,
                    token: generateToken(),
                    fecha: payloadData.fecha,
                    tecnico_nombre: payloadData.tecnico_nombre,
                    cliente_nombre: payloadData.cliente_nombre,
                    cliente_telefono: payloadData.cliente_telefono,
                    equipo_modelo: payloadData.equipo_modelo,
                    equipo_imei: payloadData.equipo_imei, // Assuming IMEI is mapped to equipo_imei
                    equipo_pass: payloadData.equipo_pass,
                    estado_fisico: payloadData.estado_fisico,
                    trabajo_realizado: payloadData.trabajo_realizado,
                    costo_total: payloadData.total, // Mapping total to costo_total as requested
                    anticipo: payloadData.anticipo,
                    incluir_iva: payloadData.incluir_iva,
                    iva: payloadData.iva,
                    total: payloadData.total,
                    observaciones: payloadData.observaciones,
                    repuestos_descripcion: typeof payloadData.repuestos_descripcion === 'string' ? payloadData.repuestos_descripcion : JSON.stringify(payloadData.repuestos_descripcion),
                    mano_obra: payloadData.mano_obra,
                    repuestos_costo: payloadData.repuestos_costo,
                    subtotal: payloadData.subtotal,
                    pagado: payloadData.pagado,
                    entregado: payloadData.entregado,
                    costo_repuestos: payloadData.repuestos_costo, // Mapping repuestos_costo to costo_repuestos as requested
                    status: payloadData.status || 'recibido'
                };

                const result = await supabase
                    .from('servicios_celulares')
                    .insert(newService)
                    .select()
                    .single();

                data = result.data;
                error = result.error;
            } else {
                // Update existing
                const updatePayload = {
                    fecha: payloadData.fecha,
                    tecnico_nombre: payloadData.tecnico_nombre,
                    cliente_nombre: payloadData.cliente_nombre,
                    cliente_telefono: payloadData.cliente_telefono,
                    equipo_modelo: payloadData.equipo_modelo,
                    equipo_imei: payloadData.equipo_imei,
                    equipo_pass: payloadData.equipo_pass,
                    estado_fisico: payloadData.estado_fisico,
                    trabajo_realizado: payloadData.trabajo_realizado,
                    costo_total: payloadData.total,
                    anticipo: payloadData.anticipo,
                    incluir_iva: payloadData.incluir_iva,
                    iva: payloadData.iva,
                    total: payloadData.total,
                    observaciones: payloadData.observaciones,
                    repuestos_descripcion: typeof payloadData.repuestos_descripcion === 'string' ? payloadData.repuestos_descripcion : JSON.stringify(payloadData.repuestos_descripcion),
                    mano_obra: payloadData.mano_obra,
                    repuestos_costo: payloadData.repuestos_costo,
                    subtotal: payloadData.subtotal,
                    pagado: payloadData.pagado,
                    entregado: payloadData.entregado,
                    costo_repuestos: payloadData.repuestos_costo,
                    status: payloadData.status
                };
                const result = await supabase
                    .from('servicios_celulares')
                    .update(updatePayload)
                    .eq('id', editingPhoneService.id)
                    .select()
                    .single();

                data = result.data;
                error = result.error;
            }

            if (error) throw error;

            // --- PHOTO DELETION LOGIC ---
            if (photosToDelete && photosToDelete.length > 0) {
                await deleteSpecificPhotos(photosToDelete);
            }

            // --- PHOTO UPLOAD LOGIC with Deduplication ---
            if (files && files.length > 0 && data) {
                const uploadPromises = files.map(async (file) => {
                    try {
                        const hash = await computeFileHash(file);
                        const { data: existingPhoto } = await supabase
                            .from('servicio_fotos')
                            .select('id')
                            .eq('servicio_id', data.id)
                            .eq('hash', hash)
                            .maybeSingle();

                        if (existingPhoto) return { success: true, skipped: true };

                        const fileExt = file.name.split('.').pop();
                        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                        const filePath = `${session.user.id}/servicio_${data.id}/${fileName}`;

                        const { error: uploadError } = await supabase.storage
                            .from('servicio-files-v2')
                            .upload(filePath, file);

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage
                            .from('servicio-files-v2')
                            .getPublicUrl(filePath);

                        const { error: dbError } = await supabase
                            .from('servicio_fotos')
                            .insert({
                                servicio_id: data.id,
                                user_id: session.user.id,
                                uri: publicUrl,
                                tipo_servicio: 'servicios_celulares',
                                hash: hash
                            });

                        if (dbError) throw dbError;
                        return { success: true };
                    } catch (err) {
                        return { success: false, error: err };
                    }
                });
                await Promise.all(uploadPromises);
            }

            setServicesRefreshTrigger(prev => prev + 1);
            alert('Servicio de celular guardado correctamente');
            setEditingPhoneService(null);
        } catch (error) {
            console.error('Error saving phone service:', error);
            alert('Error al guardar el servicio');
        }
    };

    // CCTV SERVICE FORM STATE & HANDLERS
    const [editingCCTVService, setEditingCCTVService] = useState(null);

    const fetchNextCCTVServiceFolio = async (userId) => {
        try {
            const currentYear = new Date().getFullYear();
            const folioPrefix = `T-${currentYear}-`; // T for Tecnico/CCTV

            const { data, error } = await supabase
                .from('servicios_cctv')
                .select('servicio_numero')
                .eq('user_id', userId)
                .like('servicio_numero', `${folioPrefix}%`)
                .order('id', { ascending: false })
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                const lastFolio = data[0].servicio_numero;
                const parts = lastFolio.split('-');
                const lastNumber = parseInt(parts[2]) || 99;
                return `${folioPrefix}${lastNumber + 1}`;
            }
            return `${folioPrefix}100`;
        } catch (error) {
            console.error('Error fetching next CCTV folio:', error);
            const currentYear = new Date().getFullYear();
            return `T-${currentYear}-100`;
        }
    };

    const handleSaveCCTVService = async (serviceData) => {
        try {
            let data, error;
            const { files, photosToDelete, ...payloadData } = serviceData;

            if (editingCCTVService === 'new') {
                const newOrden = await fetchNextCCTVServiceFolio(session.user.id);

                const payload = {
                    user_id: session.user.id,
                    servicio_numero: newOrden,
                    servicio_fecha: payloadData.fecha,
                    servicio_hora: new Date().toLocaleTimeString('en-GB', { hour12: false }),
                    cliente_nombre: payloadData.cliente_nombre,
                    cliente_telefono: payloadData.cliente_telefono,
                    cliente_correo: payloadData.cliente_correo || '',
                    cliente_direccion: payloadData.cliente_direccion || '',
                    tecnico_nombre: payloadData.tecnico_nombre,
                    tecnico_celular: payloadData.tecnico_celular || '',
                    tipo_servicio: 'CCTV',
                    marca_principal: payloadData.sistema_modelo,
                    tipo_grabador: payloadData.sistema_tipo,
                    materiales: payloadData.repuestos_costo,
                    inventario_materiales: typeof payloadData.repuestos_descripcion === 'string' ? payloadData.repuestos_descripcion : JSON.stringify(payloadData.repuestos_descripcion),
                    total: payloadData.total,
                    mano_obra: payloadData.mano_obra,
                    anticipo: payloadData.anticipo,
                    saldo: (parseFloat(payloadData.total) || 0) - (parseFloat(payloadData.anticipo) || 0),
                    pagado: payloadData.pagado,
                    entregado: payloadData.entregado,
                    status: payloadData.estatus,
                    // Extra fields can be added to contenido_dinamico
                    contenido_dinamico: {
                        cantidad_camaras: payloadData.cantidad_camaras,
                        ubicacion_instalacion: payloadData.ubicacion_instalacion,
                        problema_reportado: payloadData.problema_reportado,
                        diagnostico_tecnico: payloadData.diagnostico_tecnico,
                        trabajo_realizado: payloadData.trabajo_realizado,
                        observaciones: payloadData.observaciones
                    }
                };

                ({ data, error } = await supabase
                    .from('servicios_cctv')
                    .insert([payload])
                    .select());
            } else {
                const payload = {
                    servicio_fecha: payloadData.fecha,
                    cliente_nombre: payloadData.cliente_nombre,
                    cliente_telefono: payloadData.cliente_telefono,
                    cliente_correo: payloadData.cliente_correo || '',
                    cliente_direccion: payloadData.cliente_direccion || '',
                    tecnico_nombre: payloadData.tecnico_nombre,
                    tecnico_celular: payloadData.tecnico_celular || '',
                    marca_principal: payloadData.sistema_modelo,
                    tipo_grabador: payloadData.sistema_tipo,
                    materiales: payloadData.repuestos_costo,
                    inventario_materiales: typeof payloadData.repuestos_descripcion === 'string' ? payloadData.repuestos_descripcion : JSON.stringify(payloadData.repuestos_descripcion),
                    total: payloadData.total,
                    mano_obra: payloadData.mano_obra,
                    anticipo: payloadData.anticipo,
                    saldo: (parseFloat(payloadData.total) || 0) - (parseFloat(payloadData.anticipo) || 0),
                    pagado: payloadData.pagado,
                    entregado: payloadData.entregado,
                    status: payloadData.estatus,
                    contenido_dinamico: {
                        cantidad_camaras: payloadData.cantidad_camaras,
                        ubicacion_instalacion: payloadData.ubicacion_instalacion,
                        problema_reportado: payloadData.problema_reportado,
                        diagnostico_tecnico: payloadData.diagnostico_tecnico,
                        trabajo_realizado: payloadData.trabajo_realizado,
                        observaciones: payloadData.observaciones
                    }
                };

                ({ data, error } = await supabase
                    .from('servicios_cctv')
                    .update(payload)
                    .eq('id', editingCCTVService.id)
                    .select());
            }

            if (error) throw error;

            if (data && data[0]) {
                const serviceId = data[0].id;

                // Handle photos to delete
                if (photosToDelete && photosToDelete.length > 0) {
                    await deleteSpecificPhotos(photosToDelete);
                }

                // Handle new files
                if (files && files.length > 0) {
                    for (const file of files) {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                        const filePath = `${session.user.id}/servicio_${serviceId}/${fileName}`;

                        // Compute Hash
                        const hash = await computeFileHash(file);

                        const { error: uploadError } = await supabase.storage
                            .from('servicio-files-v2')
                            .upload(filePath, file);

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage
                            .from('servicio-files-v2')
                            .getPublicUrl(filePath);

                        await supabase.from('servicio_fotos').insert([{
                            servicio_id: serviceId,
                            user_id: session.user.id,
                            uri: publicUrl,
                            tipo_servicio: 'servicios_cctv',
                            hash: hash
                        }]);
                    }
                }
            }

            setServicesRefreshTrigger(prev => prev + 1);
            alert('Servicio CCTV guardado correctamente');
            setEditingCCTVService(null);
        } catch (error) {
            console.error('Error saving CCTV service:', error);
            alert('Error al guardar el servicio CCTV');
        }
    };

    // PRINTER SERVICE FORM STATE & HANDLERS
    const [editingPrinterService, setEditingPrinterService] = useState(null);
    const [editingNetworkService, setEditingNetworkService] = useState(null);

    const fetchNextPrinterServiceFolio = async (userId) => {
        try {
            const currentYear = new Date().getFullYear();
            const folioPrefix = `I-${currentYear}-`; // I for Impresora

            const { data, error } = await supabase
                .from('servicios_impresoras')
                .select('orden_numero')
                .eq('user_id', userId)
                .like('orden_numero', `${folioPrefix}%`)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                const lastFolio = data[0].orden_numero;
                const parts = lastFolio.split('-');
                const lastNumber = parseInt(parts[2]) || 99;
                return `${folioPrefix}${lastNumber + 1}`;
            }
            return `${folioPrefix}100`;
        } catch (error) {
            console.error('Error fetching next Printer folio:', error);
            const currentYear = new Date().getFullYear();
            return `I-${currentYear}-100`;
        }
    };

    const handleSavePrinterService = async (serviceData) => {
        try {
            let data, error;
            const { files, photosToDelete, ...payloadData } = serviceData;

            // Strict Schema Mapping for servicios_impresoras
            const safeJsonParse = (val) => {
                if (typeof val === 'string' && val.trim().startsWith('[')) {
                    try { return JSON.parse(val); } catch { return []; }
                }
                return Array.isArray(val) ? val : [];
            };

            const strictPayload = {
                fecha: payloadData.fecha,
                tecnico_nombre: payloadData.tecnico_nombre,
                cliente_nombre: payloadData.cliente_nombre,
                cliente_telefono: payloadData.cliente_telefono,
                equipo_modelo: payloadData.equipo_modelo,
                equipo_tipo: payloadData.equipo_tipo,
                equipo_serie: payloadData.equipo_serie,
                equipo_contador: payloadData.equipo_contador,
                accesorios: safeJsonParse(payloadData.accesorios),
                estado_consumibles: payloadData.estado_consumibles,
                problema_reportado: payloadData.problema_reportado,
                diagnostico: payloadData.diagnostico,
                trabajo_realizado: payloadData.trabajo_realizado,
                repuestos_descripcion: typeof payloadData.repuestos_descripcion === 'string' ? payloadData.repuestos_descripcion : JSON.stringify(payloadData.repuestos_descripcion),
                costo_repuestos: payloadData.costo_repuestos,
                costo_total: payloadData.total, // Mapping total to costo_total
                anticipo: payloadData.anticipo,
                incluir_iva: payloadData.incluir_iva,
                iva: payloadData.iva,
                total: payloadData.total,
                observaciones: payloadData.observaciones,
                firma_cliente_path: payloadData.firma_cliente_path,
                firma_tecnico_path: payloadData.firma_tecnico_path,
                pagado: payloadData.pagado,
                entregado: payloadData.entregado,
                mano_obra: payloadData.mano_obra,
                subtotal: payloadData.subtotal,
                status: payloadData.status || 'recibido'
            };

            if (editingPrinterService === 'new') {
                const newOrden = await fetchNextPrinterServiceFolio(session.user.id);

                const newService = {
                    ...strictPayload,
                    user_id: session.user.id,
                    orden_numero: newOrden,
                    token: generateToken(),
                };

                const result = await supabase
                    .from('servicios_impresoras')
                    .insert(newService)
                    .select()
                    .single();

                data = result.data;
                error = result.error;
            } else {
                const result = await supabase
                    .from('servicios_impresoras')
                    .update(strictPayload)
                    .eq('id', editingPrinterService.id)
                    .select()
                    .single();

                data = result.data;
                error = result.error;
            }

            if (error) throw error;

            // --- PHOTO DELETION LOGIC ---
            if (photosToDelete && photosToDelete.length > 0) {
                await deleteSpecificPhotos(photosToDelete);
            }

            // --- PHOTO UPLOAD LOGIC ---
            if (files && files.length > 0 && data) {
                const uploadPromises = files.map(async (file) => {
                    try {
                        const hash = await computeFileHash(file);

                        const { data: existingPhoto } = await supabase
                            .from('servicio_fotos')
                            .select('id')
                            .eq('servicio_id', data.id)
                            .eq('hash', hash)
                            .eq('tipo_servicio', 'servicios_impresoras')
                            .maybeSingle();

                        if (existingPhoto) return { success: true, skipped: true };

                        const fileExt = file.name.split('.').pop();
                        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                        const filePath = `${session.user.id}/servicio_${data.id}/${fileName}`;

                        const { error: uploadError } = await supabase.storage
                            .from('servicio-files-v2')
                            .upload(filePath, file);

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage
                            .from('servicio-files-v2')
                            .getPublicUrl(filePath);

                        const { error: dbError } = await supabase
                            .from('servicio_fotos')
                            .insert({
                                servicio_id: data.id,
                                user_id: session.user.id,
                                uri: publicUrl,
                                tipo_servicio: 'servicios_impresoras',
                                hash: hash
                            });

                        if (dbError) throw dbError;

                        return { success: true, url: publicUrl };
                    } catch (uploadErr) {
                        console.error('Error uploading file:', uploadErr);
                        return { success: false, error: uploadErr };
                    }
                });

                await Promise.all(uploadPromises);
            }

            setServicesRefreshTrigger(prev => prev + 1);
            alert('Servicio de Impresora guardado correctamente');
            setEditingPrinterService(null);

            if (activeTab === 'services-printer-view' && selectedService?.id === data.id) {
                setSelectedService(data);
            }

        } catch (error) {
            console.error('Error saving Printer service:', error);
            alert('Error al guardar el servicio: ' + error.message);
        }
    };

    const fetchNextNetworkServiceFolio = async (userId) => {
        const folioPrefix = `NET-${new Date().getFullYear()}-`;
        try {
            const { data, error } = await supabase
                .from('servicios_redes')
                .select('orden_numero')
                .eq('user_id', userId)
                .ilike('orden_numero', `${folioPrefix}%`)
                .order('id', { ascending: false })
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                const lastFolio = data[0].orden_numero;
                const parts = lastFolio.split('-');
                const lastNumber = parseInt(parts[2]) || 99;
                return `${folioPrefix}${lastNumber + 1}`;
            }
            return `${folioPrefix}100`;
        } catch (error) {
            console.error('Error fetching next Network folio:', error);
            const currentYear = new Date().getFullYear();
            return `NET-${currentYear}-100`;
        }
    };

    const handleSaveNetworkService = async (serviceData) => {
        try {
            let data, error;
            const { files, photosToDelete, ...payloadData } = serviceData;

            // Strict Schema Mapping for servicios_redes
            const strictPayload = {
                fecha: payloadData.fecha,
                tecnico_nombre: payloadData.tecnico_nombre,
                cliente_nombre: payloadData.cliente_nombre,
                cliente_telefono: payloadData.cliente_telefono,
                tipo_servicio: payloadData.tipo_servicio || 'Redes', // Included as per schema
                wifi_ssid: payloadData.wifi_ssid,
                wifi_password: payloadData.wifi_password,
                wifi_portal_password: payloadData.wifi_portal_password,
                wifi_gateway_ip: payloadData.wifi_gateway_ip,
                velocidad_bajada: payloadData.velocidad_bajada,
                velocidad_subida: payloadData.velocidad_subida,
                velocidad_ping: payloadData.velocidad_ping,
                trabajo_realizado: typeof payloadData.trabajo_realizado === 'string' ? payloadData.trabajo_realizado : JSON.stringify(payloadData.trabajo_realizado || []),
                materiales_descripcion: typeof payloadData.materiales_descripcion === 'string' ? payloadData.materiales_descripcion : JSON.stringify(payloadData.materiales_descripcion || []),
                costo_materiales: payloadData.costo_materiales,
                mano_obra: payloadData.mano_obra,
                subtotal: payloadData.subtotal,
                anticipo: payloadData.anticipo,
                total: payloadData.total,
                observaciones: payloadData.observaciones,
                firma_cliente_path: payloadData.firma_cliente_path,
                firma_tecnico_path: payloadData.firma_tecnico_path,
                pagado: payloadData.pagado,
                entregado: payloadData.entregado,
                status: payloadData.status || 'recibido',
                incluir_iva: payloadData.incluir_iva, // User schema says text, but usually boolean/string. Postgres handles casting often.
                iva: payloadData.iva
            };

            if (editingNetworkService === 'new') {
                const newOrden = await fetchNextNetworkServiceFolio(session.user.id);

                const newService = {
                    ...strictPayload,
                    user_id: session.user.id,
                    orden_numero: newOrden,
                };

                const result = await supabase
                    .from('servicios_redes')
                    .insert(newService)
                    .select()
                    .single();

                data = result.data;
                error = result.error;
            } else {
                const result = await supabase
                    .from('servicios_redes')
                    .update(strictPayload)
                    .eq('id', editingNetworkService.id)
                    .select()
                    .single();

                data = result.data;
                error = result.error;
            }

            if (error) throw error;

            // --- PHOTO DELETION LOGIC ---
            if (photosToDelete && photosToDelete.length > 0) {
                await deleteSpecificPhotos(photosToDelete);
            }

            // --- PHOTO UPLOAD LOGIC ---
            if (files && files.length > 0 && data) {
                const uploadPromises = files.map(async (file) => {
                    try {
                        const hash = await computeFileHash(file);

                        const { data: existingPhoto } = await supabase
                            .from('servicio_fotos')
                            .select('id')
                            .eq('servicio_id', data.id)
                            .eq('hash', hash)
                            .eq('tipo_servicio', 'servicios_redes')
                            .maybeSingle();

                        if (existingPhoto) return { success: true, skipped: true };

                        const fileExt = file.name.split('.').pop();
                        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                        const filePath = `${session.user.id}/servicio_${data.id}/${fileName}`;

                        const { error: uploadError } = await supabase.storage
                            .from('servicio-files-v2')
                            .upload(filePath, file);

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage
                            .from('servicio-files-v2')
                            .getPublicUrl(filePath);

                        const { error: dbError } = await supabase
                            .from('servicio_fotos')
                            .insert({
                                servicio_id: data.id,
                                user_id: session.user.id,
                                uri: publicUrl,
                                tipo_servicio: 'servicios_redes',
                                hash: hash
                            });

                        if (dbError) throw dbError;
                    } catch (e) {
                        console.error('Error uploading file:', e);
                    }
                });

                await Promise.all(uploadPromises);
            }

            setServicesRefreshTrigger(prev => prev + 1);
            alert('Servicio de Redes guardado correctamente');
            setEditingNetworkService(null);
            if (activeTab === 'services-network-view' && selectedService?.id === data.id) {
                setSelectedService(data);
            }

        } catch (error) {
            console.error('Error saving network service:', error);
            alert('Error al guardar servicio: ' + error.message);
        }
    };

    // PC SERVICE FORM STATE & HANDLERS
    const [editingPCService, setEditingPCService] = useState(null); // null, 'new', or service object

    const handleSavePCService = async (serviceData) => {
        try {
            let data, error;
            const { files, photosToDelete, ...payloadData } = serviceData; // Extract files and photosToDelete
            let payload = { ...payloadData, tecnico_celular: payloadData.tecnico_celular || '' };

            // Workaround for missing 'equipo_password' column in DB
            // We append it to observations to persist it without schema change
            if (payload.equipo_password) {
                const passwordNote = `[Contraseña: ${payload.equipo_password}]`;
                // Avoid duplicating if already present
                if (!payload.observaciones || !payload.observaciones.includes(passwordNote)) {
                    payload.observaciones = payload.observaciones
                        ? `${payload.observaciones}\n${passwordNote}`
                        : passwordNote;
                }
            }
            // Remove the field that causes the error
            delete payload.equipo_password;

            if (editingPCService === 'new') {
                // Generate Orden Numero logic
                const newOrden = await fetchNextPCServiceFolio(session.user.id);

                const newService = {
                    user_id: session.user.id,
                    orden_numero: newOrden,
                    fecha: payloadData.fecha,
                    tecnico_nombre: payloadData.tecnico_nombre,
                    cliente_nombre: payloadData.cliente_nombre,
                    cliente_telefono: payloadData.cliente_telefono,
                    equipo_tipo: payloadData.equipo_tipo,
                    equipo_modelo: payloadData.equipo_modelo,
                    equipo_serie: payloadData.equipo_serie,
                    problema_reportado: payloadData.problema_reportado,
                    diagnostico_tecnico: payloadData.diagnostico_tecnico,
                    trabajo_realizado: payloadData.trabajo_realizado,
                    repuestos_descripcion: typeof payloadData.repuestos_descripcion === 'string' ? payloadData.repuestos_descripcion : JSON.stringify(payloadData.repuestos_descripcion),
                    mano_obra: payloadData.mano_obra,
                    repuestos_costo: payloadData.repuestos_costo,
                    subtotal: payloadData.subtotal,
                    iva: payloadData.iva,
                    total: payloadData.total,
                    observaciones: payloadData.observaciones, // Already includes password note if any
                    anticipo: payloadData.anticipo,
                    pagado: payloadData.pagado,
                    entregado: payloadData.entregado,
                    incluir_iva: payloadData.incluir_iva,
                    token: generateToken(),
                    status: 'recibido'
                };

                const result = await supabase
                    .from('servicios_pc')
                    .insert(newService)
                    .select()
                    .single();

                data = result.data;
                error = result.error;
            } else {
                // Update existing
                const updatePayload = {
                    fecha: payloadData.fecha,
                    tecnico_nombre: payloadData.tecnico_nombre,
                    cliente_nombre: payloadData.cliente_nombre,
                    cliente_telefono: payloadData.cliente_telefono,
                    equipo_tipo: payloadData.equipo_tipo,
                    equipo_modelo: payloadData.equipo_modelo,
                    equipo_serie: payloadData.equipo_serie,
                    problema_reportado: payloadData.problema_reportado,
                    diagnostico_tecnico: payloadData.diagnostico_tecnico,
                    trabajo_realizado: payloadData.trabajo_realizado,
                    repuestos_descripcion: typeof payloadData.repuestos_descripcion === 'string' ? payloadData.repuestos_descripcion : JSON.stringify(payloadData.repuestos_descripcion),
                    mano_obra: payloadData.mano_obra,
                    repuestos_costo: payloadData.repuestos_costo,
                    subtotal: payloadData.subtotal,
                    iva: payloadData.iva,
                    total: payloadData.total,
                    observaciones: payloadData.observaciones,
                    anticipo: payloadData.anticipo,
                    pagado: payloadData.pagado,
                    entregado: payloadData.entregado,
                    incluir_iva: payloadData.incluir_iva,
                    status: payloadData.estatus // Form uses 'estatus', DB uses 'status'
                };
                const result = await supabase
                    .from('servicios_pc')
                    .update(updatePayload)
                    .eq('id', editingPCService.id)
                    .select()
                    .single();

                data = result.data;
                error = result.error;
            }

            if (error) throw error;

            // --- PHOTO DELETION LOGIC ---
            if (photosToDelete && photosToDelete.length > 0) {
                await deleteSpecificPhotos(photosToDelete);
            }

            // --- PHOTO UPLOAD LOGIC ---
            if (files && files.length > 0 && data) {
                console.log(`Uploading ${files.length} photos for service ${data.id}...`);
                const uploadPromises = files.map(async (file) => {
                    try {
                        // 1. Compute Hash
                        const hash = await computeFileHash(file);

                        // 2. Check for Duplicates
                        const { data: existingPhoto } = await supabase
                            .from('servicio_fotos')
                            .select('id')
                            .eq('servicio_id', data.id)
                            .eq('hash', hash)
                            .maybeSingle();

                        if (existingPhoto) {
                            console.log(`Duplicate photo detected (hash: ${hash}), skipping upload.`);
                            return { success: true, skipped: true };
                        }

                        // 3. Unique Photo: Proceed with upload
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                        const filePath = `${session.user.id}/servicio_${data.id}/${fileName}`;

                        const { error: uploadError } = await supabase.storage
                            .from('servicio-files-v2')
                            .upload(filePath, file);

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage
                            .from('servicio-files-v2')
                            .getPublicUrl(filePath);

                        // 4. Link to service_fotos table with HASH
                        const { error: dbError } = await supabase
                            .from('servicio_fotos')
                            .insert({
                                servicio_id: data.id,
                                user_id: session.user.id,
                                uri: publicUrl,
                                tipo_servicio: 'servicios_pc',
                                hash: hash
                            });

                        if (dbError) throw dbError;

                        return { success: true, url: publicUrl, hash: hash };
                    } catch (uploadErr) {
                        console.error('Error uploading file:', uploadErr);
                        return { success: false, error: uploadErr };
                    }
                });

                await Promise.all(uploadPromises);
            }

            setServicesRefreshTrigger(prev => prev + 1);
            alert('Servicio guardado correctamente');
            setEditingPCService(null);

            // Refresh PC List/View if needed
            if (activeTab === 'services-pc-view' && selectedService?.id === data.id) {
                // Determine if we need to fetch photos again? 
                // The PCServiceView component fetches photos on mount/update of service.id.
                // We might need to trigger a re-mount or re-fetch.
                // For now, updating selectedService might be enough to show text data, 
                // but photos are fetched separately in PCServiceView.
                setSelectedService(data);
                // Force photo refresh could be handled by a signal or just re-opening
            }

        } catch (error) {
            console.error('Error saving PC service:', error);
            alert('Error al guardar el servicio: ' + error.message);
        }
    };


    const fetchNextFolio = async (userId) => {
        try {
            const currentYear = new Date().getFullYear();
            const folioPrefix = `COT-${currentYear}-`;

            // Query for the last folio of the current year
            const { data, error } = await supabase
                .from('cotizaciones')
                .select('folio')
                .eq('user_id', userId)
                .like('folio', `${folioPrefix}%`)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Error fetching last folio:', error);
                return `${folioPrefix}100`;
            }

            if (data && data.length > 0) {
                // Extract number from folio format COT-YYYY-XXX
                const lastFolio = data[0].folio;
                const folioNumber = parseInt(lastFolio.split('-')[2]) || 99;
                const nextNumber = folioNumber + 1;
                const nextFolio = `${folioPrefix}${nextNumber}`;
                setFolio(nextFolio);
                return nextFolio;
            } else {
                // No folios for this year yet, start at 100
                const defaultFolio = `${folioPrefix}100`;
                setFolio(defaultFolio);
                return defaultFolio;
            }
        } catch (error) {
            console.error('Error generating next folio:', error);
            const currentYear = new Date().getFullYear();
            const defaultFolio = `COT-${currentYear}-100`;
            setFolio(defaultFolio);
            return defaultFolio;
        }
    };

    const fetchNextPCServiceFolio = async (userId) => {
        try {
            const currentYear = new Date().getFullYear();
            const folioPrefix = `P-${currentYear}-`;

            const { data, error } = await supabase
                .from('servicios_pc')
                .select('orden_numero')
                .eq('user_id', userId)
                .like('orden_numero', `${folioPrefix}%`)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                const lastFolio = data[0].orden_numero;
                const parts = lastFolio.split('-');
                const lastNumber = parseInt(parts[2]) || 99;
                return `${folioPrefix}${lastNumber + 1}`;
            }
            return `${folioPrefix}100`;
        } catch (error) {
            console.error('Error fetching next PC folio:', error);
            const currentYear = new Date().getFullYear();
            return `P-${currentYear}-100`;
        }
    };

    const fetchNextPhoneServiceFolio = async (userId) => {
        try {
            const currentYear = new Date().getFullYear();
            const folioPrefix = `C-${currentYear}-`;

            const { data, error } = await supabase
                .from('servicios_celulares')
                .select('orden_numero')
                .eq('user_id', userId)
                .like('orden_numero', `${folioPrefix}%`)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                const lastFolio = data[0].orden_numero;
                const parts = lastFolio.split('-');
                const lastNumber = parseInt(parts[2]) || 99;
                return `${folioPrefix}${lastNumber + 1}`;
            }
            return `${folioPrefix}100`;
        } catch (error) {
            console.error('Error fetching next Phone folio:', error);
            const currentYear = new Date().getFullYear();
            return `C-${currentYear}-100`;
        }
    };

    const fetchCompanySettings = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('configuracion_empresa')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching company settings:', error);
                return;
            }

            if (data) {
                setCompany(data);
                localStorage.setItem('companyData', JSON.stringify(data)); // Keep local backup
            }
        } catch (error) {
            console.error('Fetch error:', error);
        }
    };

    const fetchSavedClients = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('id, nombre, empresa, correo, numero')
                .eq('user_id', userId)
                .order('nombre', { ascending: true });

            if (data) setSavedClients(data);
            if (error) console.error('Error fetching clients:', error);
        } catch (error) {
            console.error('Fetch saved clients error:', error);
        }
    };

    const handleSelectClient = (clientId) => {
        const selected = savedClients.find(c => c.id === parseInt(clientId));
        if (selected) {
            setClient({
                name: selected.nombre,
                phone: selected.numero || '',
                email: selected.correo || '',
                address: ''
            });
        }
    };

    const fetchQuotations = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('cotizaciones')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (data) setQuotations(data);
            if (error) console.error('Error fetching quotations:', error);
        } catch (error) {
            console.error('Fetch quotations error:', error);
        }
    };

    const saveQuotation = async () => {
        if (!session?.user) return;

        try {
            // Calculate total
            const subtotal = items.reduce((sum, item) => {
                const itemTotal = item.qty * item.price;
                const discountAmount = (itemTotal * (item.discount || 0)) / 100;
                const taxAmount = ((itemTotal - discountAmount) * (item.tax || 0)) / 100;
                return sum + (itemTotal - discountAmount + taxAmount);
            }, 0);

            // Prepare articulos JSONB
            const articulos = items.map(item => ({
                articulo: item.desc,
                cantidad: item.qty,
                costoEmpresa: item.cost || 0,
                precioUnitario: item.price,
                total: item.qty * item.price * (1 - (item.discount || 0) / 100),
                descuento: item.discount, // Optional but good to keep
                impuesto: item.tax || 0 // Keep for legacy schema compatibility
            }));

            const quotationData = {
                user_id: session.user.id,
                folio: folio,
                nombre_cliente: client.name,
                telefono: client.phone,
                empresa: '', // TODO: Add company field to client if needed
                correo: client.email,
                fecha: quotationDate,
                fecha_vencimiento: expirationDate,
                ajuste_nombre: null,
                ajuste_porcentaje: null,
                ajuste_tipo: null,
                total: subtotal,
                terminos: terms,
                articulos: articulos,
                updated_at: new Date()
            };

            let result;
            if (editingQuotationId) {
                // Update existing
                result = await supabase
                    .from('cotizaciones')
                    .update(quotationData)
                    .eq('id', editingQuotationId)
                    .select();
            } else {
                // Insert new
                result = await supabase
                    .from('cotizaciones')
                    .insert(quotationData)
                    .select();
            }

            const { data, error } = result;
            if (error) throw error;

            // Updated initial state to prevent unsaved changes warning
            setInitialState({
                client: { ...client },
                items: JSON.parse(JSON.stringify(items))
            });

            await fetchQuotations(session.user.id);
            alert(editingQuotationId ? 'Cotización actualizada' : 'Cotización guardada');
            setEditingQuotationId(null);

            // Redirect to list to prevent duplication if saved again
            setActiveTab('cotizaciones-list');

            // Fetch next folio for new quotation
            if (!editingQuotationId) {
                await fetchNextFolio(session.user.id);
            }

        } catch (error) {
            console.error('Error saving quotation:', error);
            alert('Error al guardar cotización: ' + error.message);
        }
    };

    const deleteQuotation = async (id) => {
        try {
            const { error } = await supabase
                .from('cotizaciones')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await fetchQuotations(session.user.id);
        } catch (error) {
            console.error('Error deleting quotation:', error);
            alert('Error al eliminar cotización: ' + error.message);
        }
    };

    const duplicateQuotation = async (quotation) => {
        if (!session?.user) return;

        try {
            // Get base folio (remove existing -N suffix if any)
            const folioParts = quotation.folio.split('-');
            let baseFolio;
            if (folioParts.length > 3) {
                baseFolio = folioParts.slice(0, 3).join('-');
            } else {
                baseFolio = quotation.folio;
            }

            // Find existing versions with this base to find next suffix
            const { data, error } = await supabase
                .from('cotizaciones')
                .select('folio')
                .eq('user_id', session.user.id)
                .like('folio', `${baseFolio}%`);

            if (error) throw error;

            let nextSuffix = 1;
            if (data && data.length > 0) {
                const suffixes = data
                    .map(q => {
                        const parts = q.folio.split('-');
                        return parts.length > 3 ? parseInt(parts[3]) : 0;
                    })
                    .filter(s => !isNaN(s));

                if (suffixes.length > 0) {
                    nextSuffix = Math.max(...suffixes) + 1;
                }
            }

            const nextFolio = `${baseFolio}-${nextSuffix}`;

            // Prepare duplicated data
            const newQuotation = { ...quotation };
            delete newQuotation.id;
            delete newQuotation.created_at;

            newQuotation.folio = nextFolio;
            newQuotation.user_id = session.user.id;
            newQuotation.updated_at = new Date();

            const { error: insertError } = await supabase
                .from('cotizaciones')
                .insert([newQuotation]);

            if (insertError) throw insertError;

            await fetchQuotations(session.user.id);
            alert(`Cotización duplicada como: ${nextFolio}`);
        } catch (error) {
            console.error('Error duplicating quotation:', error);
            alert('Error al duplicar cotización: ' + error.message);
        }
    };

    const loadQuotationForEdit = (quotation) => {
        // Load quotation data into editor
        setFolio(quotation.folio);
        setClient({
            name: quotation.nombre_cliente,
            phone: quotation.telefono,
            email: quotation.correo,
            address: ''
        });

        // Convert articulos JSONB to items array
        const loadedItems = quotation.articulos.map((art, index) => ({
            id: index + 1,
            qty: art.cantidad,
            desc: art.articulo,
            price: art.precioUnitario,
            cost: art.costoEmpresa || art.costoUnitario || 0,
            discount: art.descuento || 0,
            tax: art.impuesto || 0
        }));
        setItems(loadedItems);
        setTerms(quotation.terminos || '');
        setQuotationDate(formatDateForInput(quotation.fecha));
        setExpirationDate(formatDateForInput(quotation.fecha_vencimiento));
        setEditingQuotationId(quotation.id);

        // Set Initial State for Dirty Check
        setInitialState({
            client: {
                name: quotation.nombre_cliente,
                phone: quotation.telefono,
                email: quotation.correo,
                address: ''
            },
            items: loadedItems
        });

        setActiveTab('cotizaciones-new');
    };

    const saveCompanySettings = async (logoFile) => {
        if (!session?.user) return;

        try {
            let uploadedLogoUrl = company.logo_uri;

            // Upload Logo if new file is provided
            if (logoFile) {
                const fileExt = logoFile.name.split('.').pop();
                const fileName = `${session.user.id}/empresa/logo_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('servicio-files-v2')
                    .upload(fileName, logoFile, { upsert: true });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('servicio-files-v2')
                    .getPublicUrl(fileName);

                uploadedLogoUrl = publicUrl;
                setCompany(prev => ({ ...prev, logo_uri: publicUrl }));
            }

            // Check existence first to handle missing Unique Constraint on user_id
            const { data: existingData } = await supabase
                .from('configuracion_empresa')
                .select('id')
                .eq('user_id', session.user.id)
                .maybeSingle();

            let result;
            const payload = {
                ...company,
                user_id: session.user.id,
                logo_uri: uploadedLogoUrl,
                updated_at: new Date()
            };

            // Clean up fields that shouldn't be in the payload
            delete payload.id;
            delete payload.created_at;

            // Debug logging
            console.log('Session user ID:', session.user.id);
            console.log('Payload user_id:', payload.user_id);
            console.log('Full payload:', payload);
            console.log('Existing data:', existingData);

            if (existingData) {
                result = await supabase
                    .from('configuracion_empresa')
                    .update(payload)
                    .eq('id', existingData.id)
                    .eq('user_id', session.user.id) // Strict ownership check
                    .select();
            } else {
                result = await supabase
                    .from('configuracion_empresa')
                    .insert(payload)
                    .select();
            }

            const { data, error } = result;

            if (error) throw error;

            alert('Datos de la empresa y logotipo actualizados.');
            localStorage.setItem('companyData', JSON.stringify({ ...company, logo_uri: uploadedLogoUrl }));

        } catch (error) {
            console.error('Error saving company settings:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            alert('Error al guardar datos: ' + error.message);
        }
    };

    // Load saved Company Data on mount (Local Fallback)
    useEffect(() => {
        const savedCompany = localStorage.getItem('companyData');
        if (savedCompany) {
            // Merge or set, but usually fetch takes precedence. 
            // We'll set it initially to avoid flicker if fetch is slow, 
            // but fetch will overwrite.
            setCompany(prev => ({ ...prev, ...JSON.parse(savedCompany) }));
        }

        const savedTerms = localStorage.getItem('defaultTerms');
        if (savedTerms) {
            setTerms(savedTerms);
        } else {
            setTerms("• 1 año de Garantía en todos los componentes.\n• Instalación en Domicilio Incluida.\n• Windows 11 y paquetería Office Incluida.");
        }
    }, []);

    // Remove auto-save to local storage for company, we rely on manual save to DB + load
    // But keeping it for terms is fine.
    useEffect(() => { localStorage.setItem('defaultTerms', terms); }, [terms]);

    // Preview Scaling Logic
    const previewContainerRef = useRef(null);
    const quotationRef = useRef(null);
    const [previewScale, setPreviewScale] = useState(1);
    const [previewHeight, setPreviewHeight] = useState('auto');

    useEffect(() => {
        const updateDimensions = () => {
            if (previewContainerRef.current && quotationRef.current && showPreview) {
                const containerWidth = previewContainerRef.current.offsetWidth;
                const containerHeight = window.innerHeight * 0.85;
                const targetWidth = 900;
                const scale = (containerWidth - 32) < targetWidth ? (containerWidth - 32) / targetWidth : 1;

                setPreviewScale(scale);
                setPreviewHeight(`${quotationRef.current.offsetHeight * scale}px`);
            }
        };

        if (showPreview) {
            setTimeout(updateDimensions, 10);
            window.addEventListener('resize', updateDimensions);
        }

        return () => window.removeEventListener('resize', updateDimensions);
    }, [showPreview, items, terms]);

    // Handlers
    const updateCompany = (field, value) => setCompany(prev => ({ ...prev, [field]: value }));
    const updateClient = (field, value) => setClient(prev => ({ ...prev, [field]: value }));

    const addItem = () => {
        setItems([...items, { id: Date.now(), qty: 1, desc: '', price: 0, cost: 0, discount: 0, tax: 0 }]);
    };

    const removeItem = (id) => setItems(items.filter(i => i.id !== id));
    const updateItem = (id, field, value) => {
        setItems(prevItems => prevItems.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const moveItem = (fromIndex, toIndex) => {
        const newItems = [...items];
        const [movedItem] = newItems.splice(fromIndex, 1);
        newItems.splice(toIndex, 0, movedItem);
        setItems(newItems);
    };

    const generatePDF = async () => {
        setIsGenerating(true);
        setTimeout(async () => {
            const element = document.getElementById('quotation-pdf-export');
            if (!element) {
                console.error('PDF Export element not found');
                alert('Error: No se encontró el elemento de exportación.');
                setIsGenerating(false);
                return;
            }

            try {
                console.log('Starting PDF generation...');
                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    logging: false
                });
                console.log('Canvas created successfully');

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const imgWidth = 210;
                const pageHeight = 295;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }

                pdf.save(`Cotizacion-${folio}.pdf`);
                alert('Cotización generada correctamente');
            } catch (err) {
                console.error('Error generating PDF:', err);
                alert('Error al generar el PDF. Por favor intente de nuevo.');
            } finally {
                setIsGenerating(false);
            }
        }, 500);
    };

    const generateNotaPDF = async () => {
        setIsGenerating(true);
        setTimeout(async () => {
            const element = document.getElementById('nota-venta-printable');
            if (!element) {
                console.error('Nota de Venta Export element not found');
                alert('Error: No se encontró el elemento de exportación de la nota.');
                setIsGenerating(false);
                return;
            }

            try {
                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    logging: false
                });

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const imgWidth = 210;
                const pageHeight = 295;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }

                const folioNota = selectedServiceForNota?.folio || selectedServiceForNota?.orden_numero || 'NVM';
                pdf.save(`NotaDeVenta-${folioNota}.pdf`);
                alert('Nota de Venta generada correctamente');
            } catch (err) {
                console.error('Error generating Nota PDF:', err);
                alert('Error al generar la Nota de Venta. Por favor intente de nuevo.');
            } finally {
                setIsGenerating(false);
            }
        }, 500);
    };

    const viewQuotation = (quotation) => {
        // Set viewing quotation and show preview without loading for edit
        setViewingQuotation(quotation);
        setShowPreview(true);
    };



    // --- CONTRACTS VIEW COMPONENTS ---

    const CCTVContract = ({ onBack, darkMode, company }) => {
        // Editable state for the contract
        const [clientName, setClientName] = useState('[NOMBRE DEL CLIENTE O RAZÓN SOCIAL]');
        const [totalAmount, setTotalAmount] = useState('0,000.00');
        const [advanceAmount, setAdvanceAmount] = useState('00.00');
        const [days, setDays] = useState('0');
        const [warrantyDays, setWarrantyDays] = useState('00');
        const [day, setDay] = useState(new Date().getDate().toString());
        const [month, setMonth] = useState(new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase());
        const [year, setYear] = useState(new Date().getFullYear().toString().slice(-2));
        const [reprName, setReprName] = useState('[Nombre y Firma del Responsable]');
        const [clientSignName, setClientSignName] = useState('[Nombre y Firma del Cliente]');

        const handlePrint = () => {
            window.print();
        };

        return (
            <div className={`w-full min-h-screen md:p-8 p-3 transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'} print:p-0 print:min-h-0 print:bg-white`}>
                {/* Navigation Bar (No-Print) */}
                <div className="max-w-4xl mx-auto mb-6 flex flex-wrap justify-between items-center gap-4 no-print">
                    <button
                        onClick={onBack}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
                    >
                        <ArrowLeft className="w-5 h-5" /> Regresar
                    </button>
                    <button
                        onClick={handlePrint}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Imprimir / PDF
                    </button>
                </div>

                {/* Contract Paper */}
                <div className="max-w-4xl mx-auto bg-white shadow-2xl md:rounded-xl rounded-lg border border-slate-200 print:shadow-none print:border-none print:w-full print:max-w-none print:overflow-visible print:rounded-none overflow-hidden">
                    {/* Header */}
                    <div className="bg-[#1e3a8a] md:p-10 p-6 text-white flex flex-col md:flex-row justify-between items-center gap-6 print:bg-[#1e3a8a] print:text-white print:flex-row">
                        <div className="flex flex-col items-center md:items-start gap-4">
                            <div className="relative group">
                                <div className="bg-white/10 p-2 rounded border border-dashed border-white/30 hover:border-white transition cursor-pointer">
                                    {company?.logo_uri ? (
                                        <img src={company.logo_uri} alt="Logo" className="max-h-20 md:max-h-24 w-auto object-contain" />
                                    ) : (
                                        <Building2 className="w-12 h-12 md:w-16 md:h-16 text-white" />
                                    )}
                                </div>
                            </div>
                            <p className="text-blue-400 font-medium tracking-widest text-[10px] md:text-xs uppercase">Soluciones a tu medida</p>
                        </div>
                        <div className="text-center md:text-right text-[10px] md:text-xs space-y-1 text-slate-400">
                            <p className="font-bold text-white uppercase italic">Dirección</p>
                            <p>{company?.direccion}</p>
                            <p>{company?.ciudad}</p>
                            <p>{company?.telefono && `Tel: ${company.telefono}`}</p>
                            <p>{company?.correo && `Email: ${company.correo}`}</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="md:p-10 p-5 text-gray-800 text-[12px] md:text-[13px] leading-relaxed text-justify">
                        <h2 className="text-center font-bold text-base md:text-lg mb-6 uppercase tracking-widest border-b pb-4">Contrato de Prestación de Servicios de Instalación de CCTV</h2>

                        <p className="mb-6">
                            CONTRATO DE PRESTACIÓN DE SERVICIOS DE INSTALACIÓN DE SISTEMAS DE VIDEOVIGILANCIA (CCTV) que celebran por una parte <strong>{company?.nombre}</strong>, con domicilio en <strong>{company?.direccion}, {company?.ciudad}</strong>, a quien en lo sucesivo se le denominará “EL PRESTADOR”, y por la otra <span
                                contentEditable
                                suppressContentEditableWarning
                                className="font-bold uppercase px-2 bg-green-500/10 border-b border-dashed border-blue-500 outline-none focus:bg-blue-50 transition-colors"
                            >{clientName}</span>, a quien en lo sucesivo se le denominará “EL CLIENTE”, al tenor de las siguientes declaraciones y cláusulas:
                        </p>

                        <div className="space-y-6">
                            <section>
                                <h3 className="font-bold bg-slate-100 px-3 py-1 inline-block mb-3">DECLARACIONES</h3>
                                <div className="space-y-4">
                                    <p><strong>I. Declara EL PRESTADOR que:</strong></p>
                                    <ul className="list-disc ml-6 md:ml-8 space-y-1">
                                        <li>Dedicado a la instalación, configuración y mantenimiento de sistemas de videovigilancia (CCTV).</li>
                                        <li>Cuenta con los conocimientos técnicos, herramientas y personal necesario para prestar el servicio objeto de este contrato.</li>
                                    </ul>

                                    <p><strong>II. Declara EL CLIENTE que:</strong></p>
                                    <ul className="list-disc ml-6 md:ml-8 space-y-1">
                                        <li>Es una persona física o moral con capacidad legal para contratar.</li>
                                        <li>Es propietario o cuenta con autorización expresa sobre el inmueble donde se realizará la instalación.</li>
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h3 className="font-bold bg-slate-100 px-3 py-1 inline-block mb-3">CLÁUSULAS</h3>

                                <div className="space-y-6">
                                    <div className="bg-blue-50 md:p-5 p-4 rounded-lg border border-blue-100 print:bg-blue-50 print:border-blue-100">
                                        <p><strong>TERCERA. PRECIO Y FORMA DE PAGO.</strong> EL CLIENTE se obliga a pagar la cantidad de <span className="font-bold">$</span><span contentEditable suppressContentEditableWarning className="font-bold tracking-wider italic text-blue-700 underline uppercase bg-green-500/10 px-1 border-b border-dashed border-blue-500 outline-none">{totalAmount}</span> MXN, de la siguiente forma:</p>
                                        <ul className="list-disc ml-6 md:ml-8 mt-2">
                                            <li>Anticipo de <span className="font-bold">$</span><span contentEditable suppressContentEditableWarning className="font-bold italic text-blue-700 underline uppercase bg-green-500/10 px-1 border-b border-dashed border-blue-500 outline-none">{advanceAmount}</span> al firmar el contrato.</li>
                                            <li>Saldo restante al concluir la instalación.</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <p><strong>SEXTA. GARANTÍA.</strong> EL PRESTADOR otorga una garantía de <span contentEditable suppressContentEditableWarning className="font-bold px-2 italic text-blue-700 underline uppercase bg-green-500/10 border-b border-dashed border-blue-500 outline-none">{warrantyDays}</span> días sobre la instalación realizada.</p>
                                    </div>
                                </div>
                            </section>

                            <section className="mt-6 break-inside-avoid">
                                <p className="mb-8">
                                    Leído que fue el presente contrato y enteradas las partes de su contenido y alcance legal, lo firman por duplicado en {company?.ciudad}, a <span contentEditable suppressContentEditableWarning className="px-2 font-semibold italic text-blue-700 underline uppercase bg-green-500/10 border-b border-dashed border-blue-500 outline-none">{day}</span> de <span contentEditable suppressContentEditableWarning className="px-2 font-semibold italic text-blue-700 underline uppercase bg-green-500/10 border-b border-dashed border-blue-500 outline-none">{month}</span> de 20<span contentEditable suppressContentEditableWarning className="font-semibold italic text-blue-700 underline uppercase bg-green-500/10 border-b border-dashed border-blue-500 outline-none">{year}</span>.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 text-center mt-10">
                                    <div>
                                        <div className="h-16 md:h-20 border-b border-slate-900 mx-auto w-4/5"></div>
                                        <p className="mt-4 font-bold uppercase text-xs">EL PRESTADOR</p>
                                        <p className="text-[11px]">{company?.nombre}</p>
                                        <p className="text-[11px] mt-1 italic text-blue-700" contentEditable suppressContentEditableWarning>{reprName}</p>
                                    </div>
                                    <div>
                                        <div className="h-16 md:h-20 border-b border-slate-900 mx-auto w-4/5"></div>
                                        <p className="mt-4 font-bold uppercase text-xs">EL CLIENTE</p>
                                        <p className="text-[11px] mt-1 italic text-blue-700" contentEditable suppressContentEditableWarning>{clientSignName}</p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="bg-slate-50 border-t p-6 text-center print:bg-white print:border-none">
                        <p className="text-[9px] md:text-[10px] text-slate-400 uppercase tracking-[0.3em]">Calidad • Confianza • Seguridad</p>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page { margin: 1cm; size: auto; }
                        body { background: white !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; }
                        .no-print { display: none !important; }
                        .print\\:shadow-none { box-shadow: none !important; }
                        .print\\:border-none { border: none !important; }
                        .print\\:w-full { width: 100% !important; }
                        .print\\:max-w-none { max-width: none !important; }
                        .print\\:text-white { color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .print\\:bg-\\[\\#1e3a8a\\] { background-color: #1e3a8a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .print\\:overflow-visible { overflow: visible !important; }
                        .print\\:rounded-none { border-radius: 0 !important; }
                        .print\\:min-h-0 { min-height: 0 !important; }
                        .print\\:bg-white { background-color: white !important; }
                        .print\\:p-0 { padding: 0 !important; }
                        [contenteditable] { 
                            background-color: transparent !important; 
                            border: none !important; 
                            color: black !important;
                            padding: 0 !important;
                            box-shadow: none !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .bg-green-50, .bg-slate-100, .bg-slate-50 {
                            background-color: transparent !important;
                        }
                    }
                `}} />
            </div>
        );
    };

    const PCContract = ({ onBack, darkMode, company }) => {
        // Editable state for the contract
        const [clientName, setClientName] = useState('[NOMBRE DEL CLIENTE O RAZÓN SOCIAL]');
        const [totalAmount, setTotalAmount] = useState('0,000.00');
        const [advanceAmount, setAdvanceAmount] = useState('00.00');
        const [days, setDays] = useState('0');
        const [warrantyDays, setWarrantyDays] = useState('00');
        const [day, setDay] = useState(new Date().getDate().toString());
        const [month, setMonth] = useState(new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase());
        const [year, setYear] = useState(new Date().getFullYear().toString().slice(-2));
        const [technicianName, setTechnicianName] = useState('[Nombre del Técnico]');
        const [clientSignName, setClientSignName] = useState('[Nombre y Firma del Cliente]');

        const handlePrint = () => {
            window.print();
        };

        return (
            <div className={`w-full min-h-screen md:p-8 p-3 transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'} print:p-0 print:min-h-0 print:bg-white`}>
                {/* Navigation Bar (No-Print) */}
                <div className="max-w-4xl mx-auto mb-6 flex flex-wrap justify-between items-center gap-4 no-print">
                    <button
                        onClick={onBack}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
                    >
                        <ArrowLeft className="w-5 h-5" /> Regresar
                    </button>
                    <button
                        onClick={handlePrint}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Imprimir / PDF
                    </button>
                </div>

                {/* Contract Paper */}
                <div className="max-w-4xl mx-auto bg-white shadow-2xl md:rounded-xl rounded-lg border border-slate-200 print:shadow-none print:border-none print:w-full print:max-w-none print:overflow-visible print:rounded-none overflow-hidden">
                    {/* Header */}
                    <div className="bg-[#1e3a8a] md:p-10 p-6 text-white flex flex-col md:flex-row justify-between items-center gap-6 print:bg-[#1e3a8a] print:text-white print:flex-row">
                        <div className="flex flex-col items-center md:items-start gap-4">
                            <div className="relative group">
                                <div className="bg-white/10 p-2 rounded border border-dashed border-white/30 hover:border-white transition cursor-pointer">
                                    {company?.logo_uri ? (
                                        <img src={company.logo_uri} alt="Logo" className="max-h-20 md:max-h-24 w-auto object-contain" />
                                    ) : (
                                        <Building2 className="w-12 h-12 md:w-16 md:h-16 text-white" />
                                    )}
                                </div>
                            </div>
                            <p className="text-blue-400 font-medium tracking-widest text-[10px] md:text-xs uppercase">SOLUCIONES A TU MEDIDA</p>
                        </div>
                        <div className="text-center md:text-right text-[10px] md:text-xs space-y-1 text-slate-400">
                            <p className="font-bold text-white uppercase italic">Dirección</p>
                            <p>{company?.direccion}</p>
                            <p>{company?.ciudad}</p>
                            <p>{company?.telefono && `Tel: ${company.telefono}`}</p>
                            <p>{company?.correo && `Email: ${company.correo}`}</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="md:p-10 p-5 text-gray-800 text-[12px] md:text-[13px] leading-relaxed text-justify">

                        <h2 className="text-center font-bold text-base md:text-lg mb-6 uppercase tracking-widest border-b pb-4">Contrato de Prestación de Servicios de Ensamble de Computadoras</h2>

                        <p className="mb-6">
                            CONTRATO DE PRESTACIÓN DE SERVICIOS DE ENSAMBLE, CONFIGURACIÓN Y OPTIMIZACIÓN DE EQUIPO DE CÓMPUTO que celebran por una parte <strong>{company?.nombre}</strong>, con domicilio en <strong>{company?.direccion}, {company?.ciudad}</strong>, a quien en lo sucesivo se le denominará “EL PRESTADOR”, y por la otra <span
                                contentEditable
                                suppressContentEditableWarning
                                className="font-bold uppercase px-2 bg-slate-200/50 border-b border-dashed border-blue-500 outline-none focus:bg-blue-50 transition-colors"
                            >{clientName}</span>, a quien en lo sucesivo se le denominará “EL CLIENTE”, al tenor de las siguientes declaraciones y cláusulas:
                        </p>

                        <div className="space-y-6">
                            <section>
                                <h3 className="font-bold bg-slate-100 px-3 py-1 inline-block mb-3">DECLARACIONES</h3>
                                <div className="space-y-4">
                                    <p><strong>I. Declara EL PRESTADOR que:</strong></p>
                                    <ul className="list-disc ml-6 md:ml-8 space-y-1">
                                        <li>Se dedica al ensamble, configuración, diagnóstico y optimización de hardware de cómputo de alto rendimiento.</li>
                                        <li>Cuenta con los conocimientos técnicos en arquitectura de hardware y herramientas especializadas.</li>
                                    </ul>

                                    <p><strong>II. Declara EL CLIENTE que:</strong></p>
                                    <ul className="list-disc ml-6 md:ml-8 space-y-1">
                                        <li>Es una persona física o moral con capacidad legal para contratar.</li>
                                        <li>Solicita el ensamble de equipo(s) de cómputo basado en componentes adquiridos o seleccionados.</li>
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h3 className="font-bold bg-slate-100 px-3 py-1 inline-block mb-3">CLÁUSULAS</h3>

                                <div className="space-y-6">
                                    <div className="bg-blue-50 md:p-5 p-4 rounded-lg border border-blue-100 print:bg-blue-50 print:border-blue-100">
                                        <p><strong>TERCERA. PRECIO Y FORMA DE PAGO.</strong> EL CLIENTE se obliga a pagar la cantidad de <span className="font-bold">$</span><span contentEditable suppressContentEditableWarning className="font-bold tracking-wider italic text-blue-700 underline uppercase bg-slate-200/50 px-1 border-b border-dashed border-blue-500 outline-none">{totalAmount}</span> MXN, de la siguiente forma:</p>
                                        <ul className="list-disc ml-6 md:ml-8 mt-2">
                                            <li>Anticipo por servicio: <span className="font-bold">$</span><span contentEditable suppressContentEditableWarning className="font-bold italic text-blue-700 underline uppercase bg-slate-200/50 px-1 border-b border-dashed border-blue-500 outline-none">{advanceAmount}</span>.</li>
                                            <li>Saldo restante: Al concluir el ensamble y pruebas.</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <p><strong>QUINTA. GARANTÍA.</strong> EL PRESTADOR otorga una garantía de <span contentEditable suppressContentEditableWarning className="font-bold px-2 italic text-blue-700 underline uppercase bg-slate-200/50 border-b border-dashed border-blue-500 outline-none">{warrantyDays}</span> días sobre el ensamble.</p>
                                    </div>
                                </div>
                            </section>

                            <section className="mt-6 break-inside-avoid">
                                <p className="mb-6">
                                    Leído que fue el presente contrato y enteradas las partes de su contenido y alcance legal, lo firman por duplicado en {company?.ciudad}, a <span contentEditable suppressContentEditableWarning className="px-2 font-semibold italic text-blue-700 underline uppercase bg-slate-200/50 border-b border-dashed border-blue-500 outline-none">{day}</span> de <span contentEditable suppressContentEditableWarning className="px-2 font-semibold italic text-blue-700 underline uppercase bg-slate-200/50 border-b border-dashed border-blue-500 outline-none">{month}</span> de 20<span contentEditable suppressContentEditableWarning className="font-semibold italic text-blue-700 underline uppercase bg-slate-200/50 border-b border-dashed border-blue-500 outline-none">{year}</span>.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 text-center mt-10">
                                    <div>
                                        <div className="h-16 md:h-20 border-b border-slate-900 mx-auto w-4/5"></div>
                                        <p className="mt-4 font-bold uppercase text-xs">EL PRESTADOR</p>
                                        <p className="text-[11px]">{company?.nombre} - Área Técnica</p>
                                        <p className="text-[11px] mt-1 italic text-blue-700" contentEditable suppressContentEditableWarning>{technicianName}</p>
                                    </div>
                                    <div>
                                        <div className="h-16 md:h-20 border-b border-slate-900 mx-auto w-4/5"></div>
                                        <p className="mt-4 font-bold uppercase text-xs">EL CLIENTE</p>
                                        <p className="text-[11px] mt-1 italic text-blue-700" contentEditable suppressContentEditableWarning>{clientSignName}</p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page { margin: 1cm; size: auto; }
                        body { background: white !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; }
                        .no-print { display: none !important; }
                        .print\\:shadow-none { box-shadow: none !important; }
                        .print\\:border-none { border: none !important; }
                        .print\\:w-full { width: 100% !important; }
                        .print\\:max-w-none { max-width: none !important; }
                        .print\\:text-white { color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .print\\:bg-\\[\\#1e3a8a\\] { background-color: #1e3a8a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .print\\:overflow-visible { overflow: visible !important; }
                        .print\\:rounded-none { border-radius: 0 !important; }
                        .print\\:min-h-0 { min-height: 0 !important; }
                        .print\\:bg-white { background-color: white !important; }
                        .print\\:p-0 { padding: 0 !important; }
                        .print-gradient-text {
                            background-image: none !important;
                            color: black !important;
                            -webkit-background-clip: initial !important;
                            background-clip: initial !important;
                            -webkit-text-fill-color: initial !important;
                        }
                        [contenteditable] { 
                            background-color: transparent !important; 
                            border: none !important; 
                            color: black !important;
                            padding: 0 !important;
                            box-shadow: none !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .bg-green-50, .bg-slate-100, .bg-slate-50 {
                            background-color: transparent !important;
                        }
                    }
                `}} />
            </div>
        );
    };

    const ContractsView = ({ darkMode, company }) => {
        const [selectedContract, setSelectedContract] = useState(null);

        const contractTypes = [
            { id: 'cctv', title: 'CCTV', icon: Eye, color: 'bg-blue-500' },
            { id: 'pc', title: 'PC', icon: Zap, color: 'bg-purple-500' },
            { id: 'impresoras', title: 'IMPRESORAS', icon: FileText, color: 'bg-orange-500' },
            { id: 'celulares', title: 'CELULARES', icon: Phone, color: 'bg-green-500' }, // Assuming Phone icon imported
            { id: 'redes', title: 'REDES', icon: Share2, color: 'bg-indigo-500' }, // Assuming Share2 icon imported
        ];

        if (selectedContract === 'cctv') {
            return <CCTVContract onBack={() => setSelectedContract(null)} darkMode={darkMode} company={company} />;
        }

        if (selectedContract === 'pc') {
            return <PCContract onBack={() => setSelectedContract(null)} darkMode={darkMode} company={company} />;
        }

        if (selectedContract) {
            return (
                <div className={`w-full min-h-screen p-8 flex flex-col items-center justify-center ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold mb-4">Contrato de {selectedContract.toUpperCase()}</h2>
                        <p className="text-slate-500">Esta plantilla aún no está implementada.</p>
                    </div>
                    <button
                        onClick={() => setSelectedContract(null)}
                        className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-bold transition-colors"
                    >
                        Volver
                    </button>
                </div>
            );
        }

        return (
            <div className="w-full px-4 md:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8">
                    <h1 className={`text-3xl font-extrabold tracking-tight mb-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                        Generar <span className="text-blue-600">Contratos</span>
                    </h1>
                    <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Selecciona el tipo de servicio para generar el contrato correspondiente.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contractTypes.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setSelectedContract(type.id)}
                            className={`relative overflow-hidden group p-8 rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 text-left ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 rounded-full opacity-10 transition-transform group-hover:scale-110 ${type.color}`}></div>
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-md ${type.color} text-white`}>
                                <type.icon className="w-8 h-8" />
                            </div>
                            <h3 className={`text-xl font-bold mb-2 group-hover:text-blue-500 transition-colors ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{type.title}</h3>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Generar contrato de servicio para {type.title.toLowerCase()}.</p>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    // Check for public tracking route BEFORE auth check
    // Check for public tracking route BEFORE auth check
    // Modified for GitHub Pages Hash Routing compatibility
    const urlHash = window.location.hash;
    if (urlHash.includes('#/track/')) {
        return <PublicRepairTracking />;
    }

    // Legacy support for direct paths (in case of local dev or different hosting)
    const urlPath = window.location.pathname;
    if (urlPath.includes('/track/')) {
        return <PublicRepairTracking />;
    }

    if (loadingAuth) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader className="animate-spin w-8 h-8 text-blue-600" /></div>;
    if (!session) return <Login currentTheme={currentTheme} setTheme={setTheme} />;

    // Determine background class based on theme
    const getBackgroundClass = () => {
        switch (currentTheme) {
            case 'dark': return 'bg-slate-900';
            case 'glass': return 'bg-gradient-to-br from-orange-200 via-rose-200 to-amber-100';
            case 'blue':
            default: return 'bg-blue-600';
        }
    };

    return (
        <ErrorBoundary>
            <style dangerouslySetInnerHTML={{ __html: `@media print { .no-print { display: none !important; } }` }} />
            <div className={`min-h-screen flex flex-col md:flex-row ${getBackgroundClass()} ${currentTheme === 'dark' ? 'dark' : ''} print:bg-white`}>
                <Sidebar
                    activeTab={activeTab}
                    setActiveTab={handleNavigation} // Pass the wrapper instead of direct setter
                    onLogout={async () => {
                        if (hasUnsavedChanges()) {
                            if (window.confirm('Tienes cambios sin guardar. ¿Quieres cerrar sesión?')) {
                                await handleLogout();
                            }
                        } else {
                            await handleLogout();
                        }
                    }}
                    userEmail={session.user.email}
                    currentTheme={currentTheme}
                    setTheme={setTheme}
                    companyLogo={company?.logo_uri}
                    companyName={company?.nombre}
                    mobileMode={mobileMode}
                    toggleMobileMode={toggleMobileMode}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    onCreateNew={() => {
                        // Check unsaved changes before resetting for "New"
                        if (hasUnsavedChanges()) {
                            if (!window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos e iniciar una nueva cotización?')) {
                                return;
                            }
                        }

                        const emptyClient = { name: '', phone: '', email: '', address: '' };
                        setClient(emptyClient);
                        setItems([]);

                        // Reset Initial State
                        setInitialState({
                            client: emptyClient,
                            items: []
                        });

                        setTerms(localStorage.getItem('defaultTerms') || '');
                        setQuotationDate(new Date().toISOString().split('T')[0]);
                        setExpirationDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                        setEditingQuotationId(null);
                        fetchNextFolio(session.user.id);
                        setActiveTab('cotizaciones-new');
                        if (mobileMode) setSidebarOpen(false);
                    }}
                />

                {/* Mobile Header */}
                {mobileMode && (
                    <div className={`sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b shadow-md ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-blue-600 text-white border-blue-500'} no-print`}>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className={`p-2 -ml-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-blue-500 text-white'}`}
                                aria-label="Abrir Menú"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg tracking-tight">SmartQuote</span>
                            </div>
                        </div>
                    </div>
                )}

                <main className={`flex-1 transition-all duration-300 md:p-8 p-3 ${mobileMode ? 'h-[calc(100vh-60px)]' : 'h-screen'} overflow-hidden ${mobileMode ? '' : 'ml-72'} print:ml-0 print:p-0 print:h-auto print:overflow-visible`}>
                    <div className={`w-full h-full md:rounded-[2.5rem] rounded-3xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'} print:bg-white print:rounded-none print:shadow-none`}>
                        <div ref={contentRef} className={`w-full h-full overflow-y-auto md:px-8 px-4 md:py-10 py-6 ${currentTheme === 'glass' && !isDark ? 'bg-orange-50/40 backdrop-blur-sm' : ''} print:p-0 print:h-auto print:overflow-visible`}>

                            {activeTab === 'cotizaciones-list' && (
                                <QuotationList
                                    quotations={quotations}
                                    onCreateNew={() => {
                                        setClient({ name: '', phone: '', email: '', address: '' });
                                        setItems([]);
                                        setTerms(localStorage.getItem('defaultTerms') || '');
                                        setQuotationDate(new Date().toISOString().split('T')[0]);
                                        setExpirationDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                                        setEditingQuotationId(null);
                                        fetchNextFolio(session.user.id);
                                        setActiveTab('cotizaciones-new');
                                    }}
                                    onView={viewQuotation}
                                    onEdit={loadQuotationForEdit}
                                    onDuplicate={duplicateQuotation}
                                    onDelete={deleteQuotation}
                                    darkMode={isDark}
                                    onStatusChange={() => fetchQuotations(session.user.id)}
                                />
                            )}

                            {activeTab === 'cotizaciones-new' && (
                                <div className="w-full px-4 md:px-8 py-8 pb-20">
                                    {/* Header */}
                                    <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b pb-6 ${isDark ? 'border-slate-600' : ''}`}>
                                        <div>
                                            <h1 className={`md:text-3xl text-2xl font-extrabold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                                                Generador de <span className="text-blue-600">Cotizaciones</span>
                                            </h1>
                                            <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>Crea documentos profesionales en segundos.</p>
                                        </div>
                                        <div className="flex flex-wrap md:flex-nowrap gap-2 md:gap-3 w-full md:w-auto">
                                            <button
                                                onClick={() => setShowPreview(true)}
                                                className="flex-1 md:flex-none btn bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 shadow-sm px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                                title="Vista Previa"
                                            >
                                                <Eye className="w-5 h-5" />
                                                <span className="sm:inline">Vista Previa</span>
                                            </button>
                                            <button
                                                onClick={saveQuotation}
                                                className="flex-1 md:flex-none btn bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/30 transform hover:-translate-y-0.5 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                            >
                                                <Download className="w-5 h-5" />
                                                {editingQuotationId ? 'Actualizar' : (
                                                    <>
                                                        <span className="md:hidden">Guardar</span>
                                                        <span className="hidden md:inline">Guardar</span>
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={generatePDF}
                                                disabled={isGenerating}
                                                className={`w-full md:w-auto btn bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <Download className="w-5 h-5" />
                                                {isGenerating ? 'Generando...' : 'Descargar PDF'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Full Width Editor */}
                                    <div className="w-full max-w-5xl mx-auto space-y-6">
                                        {/* Company Data Auto-filled */}
                                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="flex items-center gap-3 w-full">
                                                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm overflow-hidden p-1 shrink-0">
                                                    {company.logo_uri ? (
                                                        <img src={company.logo_uri} alt="Logo" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Building2 className="w-6 h-6" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-blue-900">Emisor: {company.nombre || 'Nombre de tu Empresa'}</p>
                                                    <p className="text-xs text-blue-700">Los datos se tomarán de tu configuración.</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setActiveTab('configuracion')} className="text-blue-600 text-xs font-bold hover:underline">Editar</button>
                                        </div>

                                        {/* Quotation Details (Folio, Date, Expiration) */}
                                        <div className={`p-6 rounded-xl shadow-lg border text-left backdrop-blur-md ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/60 border-white/50'}`}>
                                            <h3 className={`font-bold flex items-center gap-2 mb-4 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                                <FileText className="w-5 h-5 text-blue-500" /> Detalles de la Cotización
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div>
                                                    <label className={`block text-xs font-bold mb-1 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Folio</label>
                                                    <input
                                                        type="text"
                                                        value={folio}
                                                        readOnly
                                                        className={`w-full border rounded-lg p-3 text-sm font-bold text-center ${isDark ? 'bg-slate-900 border-slate-600 text-blue-400' : 'bg-slate-100 border-slate-200 text-blue-600'}`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-xs font-bold mb-1 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Fecha de Cotización</label>
                                                    <input
                                                        type="date"
                                                        value={quotationDate}
                                                        onChange={(e) => setQuotationDate(e.target.value)}
                                                        className={`w-full border rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-xs font-bold mb-1 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Fecha de Vencimiento</label>
                                                    <input
                                                        type="date"
                                                        value={expirationDate}
                                                        onChange={(e) => setExpirationDate(e.target.value)}
                                                        className={`w-full border rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Client Section with Selector */}
                                        <div className={`p-6 rounded-xl shadow-lg border transition-all hover:shadow-xl text-left backdrop-blur-md ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/50 border-white/40'}`}>
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                                                <h3 className={`font-bold flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                                    <User className="w-5 h-5 text-gray-500" /> Datos del Cliente
                                                </h3>
                                                <select
                                                    className={`border rounded-lg text-sm block p-2 outline-none w-full md:w-64 focus:ring-blue-500 focus:border-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                                                    onChange={(e) => handleSelectClient(e.target.value)}
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Seleccionar Cliente Guardado...</option>
                                                    {savedClients.map(c => (
                                                        <option key={c.id} value={c.id}>{c.nombre} {c.empresa ? `(${c.empresa})` : ''}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <input
                                                    type="text"
                                                    placeholder="Nombre del Cliente"
                                                    value={client.name}
                                                    onChange={(e) => updateClient('name', e.target.value)}
                                                    className={`border rounded-lg text-sm block w-full p-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Teléfono"
                                                    value={client.phone}
                                                    onChange={(e) => updateClient('phone', e.target.value)}
                                                    className={`border rounded-lg text-sm block w-full p-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                                                />
                                                <input
                                                    type="email"
                                                    placeholder="Correo Electrónico"
                                                    value={client.email}
                                                    onChange={(e) => updateClient('email', e.target.value)}
                                                    className={`border rounded-lg text-sm block w-full p-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Dirección / Ciudad"
                                                    value={client.address}
                                                    onChange={(e) => updateClient('address', e.target.value)}
                                                    className={`border rounded-lg text-sm block w-full p-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                                                />
                                            </div>
                                        </div>
                                        <ItemsTable
                                            items={items}
                                            onAddItem={addItem}
                                            onRemoveItem={removeItem}
                                            onUpdateItem={updateItem}
                                            onMoveItem={moveItem}
                                            darkMode={isDark}
                                        />

                                        {/* Global IVA Switch */}
                                        <div className={`p-4 rounded-xl flex items-center justify-end gap-3 backdrop-blur-md ${isDark ? 'bg-slate-800/80' : 'bg-white/60'}`}>
                                            <span className={`font-bold text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Desglosar IVA (16%)</span>
                                            <button
                                                onClick={() => setIncludeIva(!includeIva)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${includeIva ? 'bg-blue-600' : 'bg-gray-200'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeIva ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>

                                        <TermsInput value={terms} onChange={setTerms} darkMode={isDark} />
                                    </div>
                                </div>
                            )}
                            {activeTab === 'clientes' && (
                                <ClientsList onCreateNew={() => alert('Función de crear cliente próximamente...')} darkMode={isDark} />
                            )}
                            {activeTab === 'configuracion' && (
                                <SettingsView
                                    companyData={company}
                                    onCompanyChange={updateCompany}
                                    onSave={saveCompanySettings}
                                    darkMode={isDark}
                                    selectedTemplate={selectedTemplate}
                                    onTemplateChange={handleTemplateChange}
                                />
                            )}
                            {activeTab === 'products' && (
                                <Products darkMode={isDark} user={session?.user} />
                            )}
                            {activeTab === 'informes' && (
                                <ReportsView darkMode={isDark} user={session?.user} />
                            )}
                            {activeTab === 'suscripcion' && (
                                <SubscriptionView darkMode={isDark} />
                            )}
                            {activeTab === 'servicios' && (

                                <ServiciosView
                                    darkMode={isDark}
                                    onNavigate={setActiveTab}
                                    setSelectedService={setSelectedService}
                                    setEditingCCTVService={setEditingCCTVService}
                                    setEditingPCService={setEditingPCService}
                                    setEditingPhoneService={setEditingPhoneService}
                                    setEditingPrinterService={setEditingPrinterService}
                                    setEditingNetworkService={setEditingNetworkService}
                                    onShowNotaVenta={(service) => {
                                        setSelectedServiceForNota(service);
                                        setShowNotaPreview(true);
                                    }}
                                    user={session?.user}
                                    refreshTrigger={servicesRefreshTrigger}
                                />
                            )}
                            {activeTab === 'services-cctv-list' && <CCTVList key={`cctv-${servicesRefreshTrigger}`} darkMode={isDark} onNavigate={setActiveTab} onViewService={handleViewService} onShowNotaVenta={(service) => { setSelectedServiceForNota(service); setShowNotaPreview(true); }} user={session?.user} refreshTrigger={servicesRefreshTrigger} />}
                            {activeTab === 'services-cctv-view' && (
                                <CCTVServiceView
                                    service={selectedService}
                                    onBack={() => setActiveTab('servicios')}
                                    onEdit={(service) => setEditingCCTVService(service)}
                                    darkMode={isDark}
                                    company={company}
                                />
                            )}
                            {activeTab === 'services-pc-list' && (
                                <PCList
                                    key={`pc-${servicesRefreshTrigger}`}
                                    darkMode={isDark}
                                    onNavigate={setActiveTab}
                                    onViewService={handleViewPCService}
                                    onCreateNew={() => setEditingPCService('new')}
                                    onEdit={(service) => setEditingPCService(service)}
                                    onShowNotaVenta={(service) => { setSelectedServiceForNota({ ...service, type: 'PC', tableName: 'servicios_pc', original: service }); setShowNotaPreview(true); }}
                                    user={session?.user}
                                    refreshTrigger={servicesRefreshTrigger}
                                />
                            )}
                            {activeTab === 'services-pc-view' && (
                                <PCServiceView
                                    service={selectedService}
                                    onBack={() => setActiveTab('servicios')}
                                    onEdit={(service) => setEditingPCService(service)}
                                    darkMode={isDark}
                                    company={company}
                                />
                            )}
                            {activeTab === 'services-phone-list' && (
                                <PhoneList
                                    key={`phone-${servicesRefreshTrigger}`}
                                    darkMode={isDark}
                                    onNavigate={setActiveTab}
                                    onViewService={(service) => {
                                        setSelectedService(service);
                                        setActiveTab('services-phone-view');
                                    }}
                                    onCreateNew={() => setEditingPhoneService('new')}
                                    onEdit={(service) => setEditingPhoneService(service)}
                                    onShowNotaVenta={(service) => { setSelectedServiceForNota({ ...service, type: 'Celular', tableName: 'servicios_celulares', original: service }); setShowNotaPreview(true); }}
                                    user={session?.user}
                                    refreshTrigger={servicesRefreshTrigger}
                                />
                            )}
                            {activeTab === 'services-phone-view' && (
                                <PhoneServiceView
                                    service={selectedService}
                                    onBack={() => setActiveTab('servicios')}
                                    onEdit={(service) => setEditingPhoneService(service)}
                                    darkMode={isDark}
                                    company={company}
                                />
                            )}

                            {/* PC Service Form Modal */}
                            {editingPCService && (
                                <PCServiceForm
                                    service={editingPCService === 'new' ? null : editingPCService}
                                    onSave={handleSavePCService}
                                    onCancel={() => setEditingPCService(null)}
                                    darkMode={isDark}
                                />
                            )}

                            {/* CCTV Service Form Modal */}
                            {editingCCTVService && (
                                <CCTVServiceForm
                                    service={editingCCTVService === 'new' ? null : editingCCTVService}
                                    onSave={handleSaveCCTVService}
                                    onCancel={() => setEditingCCTVService(null)}
                                    darkMode={isDark}
                                />
                            )}

                            {/* Phone Service Form Modal */}
                            {editingPhoneService && (
                                <PhoneServiceForm
                                    service={editingPhoneService === 'new' ? null : editingPhoneService}
                                    onSave={handleSavePhoneService}
                                    onCancel={() => setEditingPhoneService(null)}
                                    darkMode={isDark}
                                />
                            )}

                            {activeTab === 'services-network-list' && (
                                <NetworkList
                                    key={`network-${servicesRefreshTrigger}`}
                                    darkMode={isDark}
                                    onNavigate={setActiveTab}
                                    onViewService={(service) => {
                                        setSelectedService(service);
                                        setActiveTab('services-network-view');
                                    }}
                                    onCreateNew={() => setEditingNetworkService('new')}
                                    onEdit={(service) => setEditingNetworkService(service)}
                                    onShowNotaVenta={(service) => { setSelectedServiceForNota({ ...service, type: 'Redes', tableName: 'servicios_redes', original: service }); setShowNotaPreview(true); }}
                                    user={session?.user}
                                    refreshTrigger={servicesRefreshTrigger}
                                />
                            )}
                            {activeTab === 'services-printer-list' && (
                                <PrinterList
                                    key={`printer-${servicesRefreshTrigger}`}
                                    darkMode={isDark}
                                    onNavigate={setActiveTab}
                                    onViewService={(service) => {
                                        setSelectedService(service);
                                        setActiveTab('services-printer-view');
                                    }}
                                    onCreateNew={() => setEditingPrinterService('new')}
                                    onEdit={(service) => setEditingPrinterService(service)}
                                    onShowNotaVenta={(service) => { setSelectedServiceForNota({ ...service, type: 'Impresora', tableName: 'servicios_impresoras', original: service }); setShowNotaPreview(true); }}
                                    user={session?.user}
                                    refreshTrigger={servicesRefreshTrigger}
                                />
                            )}
                            {activeTab === 'services-printer-view' && (
                                <PrinterServiceView
                                    service={selectedService}
                                    onBack={() => setActiveTab('servicios')}
                                    onEdit={(service) => setEditingPrinterService(service)}
                                    darkMode={isDark}
                                    company={company}
                                />
                            )}
                            {activeTab === 'services-network-view' && (
                                <NetworkServiceView
                                    service={selectedService}
                                    onBack={() => setActiveTab('servicios')}
                                    onEdit={(service) => setEditingNetworkService(service)}
                                    darkMode={isDark}
                                    company={company}
                                />
                            )}

                            {/* Printer Service Form Modal */}
                            {editingPrinterService && (
                                <PrinterServiceForm
                                    service={editingPrinterService === 'new' ? null : editingPrinterService}
                                    onSave={handleSavePrinterService}
                                    onCancel={() => setEditingPrinterService(null)}
                                    darkMode={isDark}
                                />
                            )}

                            {/* Network Service Form Modal */}
                            {editingNetworkService && (
                                <NetworkServiceForm
                                    service={editingNetworkService === 'new' ? null : editingNetworkService}
                                    onSave={handleSaveNetworkService}
                                    onCancel={() => setEditingNetworkService(null)}
                                    darkMode={isDark}
                                />
                            )}
                            {activeTab === 'contratos' && (
                                <ContractsView darkMode={isDark} company={company} />
                            )}

                            {/* Global Preview Modal */}
                            {showPreview && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                                    <div className={`rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                                        {/* Modal Header */}
                                        <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                            <h3 className={`font-bold text-lg flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>
                                                <Eye className="w-5 h-5 text-blue-500" /> Vista Previa del Documento
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={generatePDF}
                                                    disabled={isGenerating}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                                >
                                                    <Download className="w-4 h-4" />
                                                    {isGenerating ? 'Generando...' : 'Descargar PDF'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowPreview(false);
                                                        if (viewingQuotation) {
                                                            setViewingQuotation(null);
                                                        }
                                                    }}
                                                    className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                                                >
                                                    <X className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Modal Content - Scrollable */}
                                        <div className={`overflow-auto p-8 flex justify-center ${isDark ? 'bg-slate-900/50' : 'bg-slate-200/50'}`} ref={previewContainerRef}>
                                            <div
                                                className="bg-white shadow-xl origin-top transition-transform duration-200"
                                                style={{
                                                    transform: `scale(${previewScale})`,
                                                    width: '900px',
                                                    height: 'auto'
                                                }}
                                            >
                                                <div ref={quotationRef}>
                                                    <PrintableQuotation
                                                        company={company}
                                                        client={viewingQuotation ? {
                                                            name: viewingQuotation.nombre_cliente,
                                                            phone: viewingQuotation.telefono,
                                                            email: viewingQuotation.correo,
                                                            address: ''
                                                        } : client}
                                                        items={viewingQuotation ? viewingQuotation.articulos.map((art, index) => ({
                                                            id: index + 1,
                                                            qty: art.cantidad,
                                                            desc: art.articulo,
                                                            price: art.precioUnitario,
                                                            discount: art.descuento || 0,
                                                            tax: 0
                                                        })) : items}
                                                        terms={viewingQuotation ? viewingQuotation.terminos : terms}
                                                        folio={viewingQuotation ? viewingQuotation.folio : folio}
                                                        includeIva={includeIva}
                                                        template={selectedTemplate}
                                                    />

                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Nota de Venta Preview Modal */}
                            {showNotaPreview && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                                    <div className={`rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                                        {/* Modal Header */}
                                        <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                            <h3 className={`font-bold text-lg flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>
                                                <FileText className="w-5 h-5 text-blue-500" /> Vista Previa: Nota de Venta
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={generateNotaPDF}
                                                    disabled={isGenerating}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                                >
                                                    <Download className="w-4 h-4" />
                                                    {isGenerating ? 'Generando...' : 'Descargar PDF'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowNotaPreview(false);
                                                        setSelectedServiceForNota(null);
                                                    }}
                                                    className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                                                >
                                                    <X className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Modal Content - Scrollable */}
                                        <div className={`overflow-auto p-8 flex justify-center ${isDark ? 'bg-slate-900/50' : 'bg-slate-200/50'}`}>
                                            <div
                                                className="bg-white shadow-xl origin-top transition-transform duration-200"
                                                style={{
                                                    transform: `scale(${previewScale})`,
                                                    width: '900px',
                                                    height: 'auto'
                                                }}
                                            >
                                                <PrintableNotaDeVenta
                                                    service={selectedServiceForNota}
                                                    company={company}
                                                    darkMode={isDark}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Hidden Export Container - Global */}
                        <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
                            <div id="quotation-pdf-export" style={{ width: '900px' }}>
                                <PrintableQuotation
                                    company={company}
                                    client={viewingQuotation ? {
                                        name: viewingQuotation.nombre_cliente,
                                        phone: viewingQuotation.telefono,
                                        email: viewingQuotation.correo,
                                        address: ''
                                    } : client}
                                    items={viewingQuotation ? viewingQuotation.articulos.map((art, index) => ({
                                        id: index + 1,
                                        qty: art.cantidad,
                                        desc: art.articulo,
                                        price: art.precioUnitario,
                                        cost: art.costoEmpresa || 0,
                                        discount: art.descuento || 0,
                                        tax: 0
                                    })) : items}
                                    terms={viewingQuotation ? viewingQuotation.terminos : terms}
                                    folio={viewingQuotation ? viewingQuotation.folio : folio}
                                    includeIva={includeIva}
                                    isPdf={true}
                                    template={selectedTemplate}
                                />
                            </div>
                            <div id="nota-venta-printable" style={{ width: '900px' }}>
                                <PrintableNotaDeVenta
                                    service={selectedServiceForNota}
                                    company={company}
                                    darkMode={isDark}
                                />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </ErrorBoundary>
    );
};

export default App;
