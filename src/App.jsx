
import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Eye, Download, User, Users, Check, Copy, Trash2, Edit2, Plus, Search, FileText, X, Settings, Sun, Moon, Building2, Zap, Share2, Phone, ArrowUpDown, Loader, ScrollText, Mail, ArrowLeft, ShoppingCart, LogOut, ArrowUpRight, Video, Printer, Smartphone, Monitor, Globe, RefreshCw, Image, QrCode, ChevronDown } from 'lucide-react';
import Login from './components/Login';
import SupabaseConfigError from './components/SupabaseConfigError';
import { supabase } from '../utils/supabase';
import PublicRepairTracking from './components/PublicRepairTracking';
import QRServiceTicket from './components/QRServiceTicket';
import ServiceReceipt from './components/ServiceReceipt';
import { STATUS_OPTIONS, getStatusLabel } from './utils/statusMapper';

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

// Utility function to format currency with thousand separators
const formatCurrency = (amount) => {
    return amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// Utility function to format dates that might be in text format (DD/MM/YYYY)
const formatServiceDate = (dateString) => {
    if (!dateString) return '-';
    // Check if it's already a valid date string for parsing (e.g. ISO)
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
    }
    // Try parsing DD/MM/YYYY
    const parts = dateString.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString();
        }
    }
    return dateString; // Fallback to original string
};

// --- COMPONENTS ---

const QuotationList = ({ quotations, onCreateNew, onView, onEdit, onDelete, onShare, darkMode }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredQuotations = quotations.filter(q => {
        const search = searchTerm.toLowerCase();
        return (
            q.folio?.toString().includes(search) ||
            q.nombre_cliente?.toLowerCase().includes(search) ||
            q.empresa_cliente?.toLowerCase().includes(search) ||
            q.numero_cliente?.toLowerCase().includes(search)
        );
    });

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

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`} />
                    <input
                        type="text"
                        placeholder="Buscar por folio, nombre, empresa o teléfono..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'} focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm`}
                    />
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
                <div className={`rounded-xl shadow-lg border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <table className="w-full">
                        <thead className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50/50 border-gray-200'}`}>
                            <tr>
                                <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Folio</th>
                                <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Cliente</th>
                                <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Fecha</th>
                                <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Total</th>
                                <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-slate-600' : 'divide-slate-100'}`}>
                            {filteredQuotations.map((quotation) => (
                                <tr key={quotation.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-blue-50/30'}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-bold text-blue-600">#{quotation.folio}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`text-sm font-medium ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{quotation.nombre_cliente}</span>
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
                                                onClick={() => onDelete(quotation.id)}
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
                </div>
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
        <div className={`flex h-full animate-in slide-in-from-right-4 duration-300 ${darkMode ? 'bg-transparent' : 'bg-transparent'}`}>
            {/* Sub-sidebar */}
            {/* Sub-sidebar */}
            <div className={`w-64 border-r h-full flex flex-col shrink-0 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                <div className={`p-6 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    <h2 className={`text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Configuración</h2>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSubTab(item.id)}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeSubTab === item.id
                                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                                : `hover:bg-opacity-50 border-l-4 border-transparent ${darkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-slate-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12">
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
                        {client.nombre.charAt(0).toUpperCase()}
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
                    Cliente creado el: {new Date(client.created_at).toLocaleDateString()}
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
                <div className={`rounded-xl shadow-lg border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
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

const ItemsTable = ({ items, onAddItem, onRemoveItem, onUpdateItem, darkMode }) => {
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
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className={`${darkMode ? 'bg-slate-800/50 text-slate-300' : 'bg-gray-50/50 text-slate-600'}`}>
                            <th className="p-3 text-left rounded-l-lg w-16">Cant.</th>
                            <th className="p-3 text-left">Descripción / Producto</th>
                            <th className="p-3 text-right pr-4 w-28 text-orange-500">Costo Unit.</th>
                            <th className="p-3 text-right pr-4 w-32 text-blue-500">Precio Público</th>
                            <th className="p-3 text-center text-xs w-20">% Desc</th>
                            <th className="p-3 text-center rounded-r-lg w-10"></th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                        {items.map((item) => (
                            <tr key={item.id} className={`transition-colors group ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50/50'}`}>
                                <td className="p-2">
                                    <input
                                        type="number"
                                        value={item.qty}
                                        onChange={(e) => onUpdateItem(item.id, 'qty', parseInt(e.target.value))}
                                        className={`w-16 border rounded-md p-2 text-center focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm ${darkMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                                    />
                                </td>
                                <td className="p-2">
                                    <input
                                        type="text"
                                        value={item.desc}
                                        onChange={(e) => onUpdateItem(item.id, 'desc', e.target.value)}
                                        className={`w-full border rounded-md p-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium ${darkMode ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-700'}`}
                                        placeholder="Descripción del producto o servicio"
                                    />
                                </td>
                                <td className="p-2">
                                    <div className="relative flex justify-end">
                                        <span className={`absolute left-0 top-2 pl-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>$</span>
                                        <input
                                            type="number"
                                            value={item.cost || 0}
                                            onChange={(e) => onUpdateItem(item.id, 'cost', parseFloat(e.target.value))}
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
                                            value={item.price}
                                            onChange={(e) => onUpdateItem(item.id, 'price', parseFloat(e.target.value))}
                                            className={`w-32 pl-6 border rounded-md p-2 text-right focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm font-bold ${darkMode ? 'bg-slate-900 border-slate-600 text-blue-400' : 'bg-white border-slate-200 text-blue-700'}`}
                                        />
                                    </div>
                                </td>
                                <td className="p-2">
                                    <input
                                        type="number"
                                        value={item.discount}
                                        onChange={(e) => onUpdateItem(item.id, 'discount', parseFloat(e.target.value))}
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
                            <td colSpan="4" className="p-3 text-right font-bold text-sm text-slate-500 uppercase tracking-wide">Subtotal Venta Estimado:</td>
                            <td colSpan="2" className="p-3 text-right font-bold text-blue-600 text-lg">
                                ${formatCurrency(totalSale)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
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
                                <th className="text-right py-2 text-xs font-bold text-gray-400 uppercase tracking-widest w-32">Precio Unit.</th>
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
                                        <td className="py-2 text-right text-sm font-bold text-slate-700 align-top">${formatCurrency(total)}</td>
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
                            <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider w-32">Precio</th>
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
                                    <td className="py-3 px-4 text-right text-sm font-bold text-slate-900">${formatCurrency(total)}</td>
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
                            <th className="py-2 px-3 text-right text-xs font-bold uppercase w-32 text-gray-700">Precio</th>
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
                                    <td className="py-3 px-3 text-right text-sm font-bold">${formatCurrency(total)}</td>
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
                                    <div className="text-xs text-slate-400">Unitario</div>
                                    <div className="font-bold text-slate-700">${formatCurrency(item.price)}</div>
                                </div>
                                <div className="w-32 text-right pl-4 border-l border-slate-100 ml-4">
                                    <div className="text-xs text-pink-500 font-bold">Total</div>
                                    <div className="font-bold text-slate-900">${formatCurrency(total)}</div>
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


const CCTVList = ({ darkMode, onNavigate, onViewService }) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        setRefreshing(true);
        try {
            const { data, error } = await supabase
                .from('servicios_cctv')
                .select('*')
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

    const handleDelete = async (numero) => {
        if (!window.confirm('¿Estás seguro de eliminar este servicio?')) return;
        try {
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

            <div className={`rounded-xl shadow-lg border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                {services.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        No hay servicios de CCTV registrados.
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50/50 border-gray-200'}`}>
                            <tr>
                                <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>No. Servicio</th>
                                <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Cliente</th>
                                <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Fecha</th>
                                <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Total</th>
                                <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-slate-600' : 'divide-slate-100'}`}>
                            {services.map((service) => (
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
                )}
            </div>
        </div>
    );
};

const CCTVServiceView = ({ service, onBack, darkMode }) => {
    if (!service) return null;

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

    const SectionCard = ({ title, icon: Icon, children, color = "blue" }) => (
        <div className={`p-6 rounded-2xl shadow-lg border backdrop-blur-md transition-all hover:shadow-xl ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/60 border-white/40'}`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                <div className={`p-2 rounded-lg ${darkMode ? `bg-${color}-500/20 text-${color}-400` : `bg-${color}-100 text-${color}-600`}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {title}
            </h3>
            <div className="space-y-3">
                {children}
            </div>
        </div>
    );

    const InfoRow = ({ label, value, isMonospaced = false }) => (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-1 border-b border-dashed last:border-0 border-slate-200/50">
            <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
            <span className={`font-medium text-sm ${isMonospaced ? 'font-mono' : ''} ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{value || '-'}</span>
        </div>
    );

    const formatMoney = (amount) => `$${formatCurrency(amount || 0)}`;

    return (
        <div className="w-full px-4 md:px-8 py-8 animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className={`text-3xl font-extrabold tracking-tight flex items-center gap-3 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        Servicio <span className="text-blue-600">#{service.servicio_numero}</span>
                    </h1>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {service.tipo_servicio} • Realizado el {formatServiceDate(service.servicio_fecha)} • {service.servicio_hora || 'Hora no especificada'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${service.pagado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {service.pagado ? 'Pagado' : 'Pendiente Pago'}
                    </div>
                    <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${service.entregado ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {service.entregado ? 'Entregado' : 'En Proceso'}
                    </div>
                    <button
                        onClick={onBack}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors shadow-sm ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-white hover:bg-slate-50 text-slate-700'}`}
                    >
                        <ArrowLeft className="w-4 h-4" /> Regresar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Cliente */}
                <SectionCard title="Información del Cliente" icon={User} color="blue">
                    <InfoRow label="Nombre" value={service.cliente_nombre} />
                    <InfoRow label="Teléfono" value={service.cliente_telefono} />
                    <InfoRow label="Correo" value={service.cliente_correo} />
                    <InfoRow label="Dirección" value={service.cliente_direccion} />
                </SectionCard>

                {/* 2. Dispositivos */}
                <SectionCard title="Detalles del Equipo" icon={Video} color="indigo">
                    <InfoRow label="Marca Principal" value={service.marca_principal} />
                    <InfoRow label="Tipo Grabador" value={service.tipo_grabador} />
                    <InfoRow label="Cámaras" value={service.tipos_camaras?.join(', ')} />
                    <InfoRow label="IP Grabador" value={service.ip_grabador} isMonospaced />
                    <InfoRow label="Dominio / P2P" value={service.dominio_ddns || service.id_nube_p2p} isMonospaced />
                </SectionCard>

                {/* 3. Credenciales (Blur sensitive data logic could go here) */}
                <SectionCard title="Acceso y Credenciales" icon={Settings} color="slate">
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-2">
                        <p className="text-xs text-yellow-600 font-bold mb-1">⚠️ Información Confidencial</p>
                    </div>
                    <InfoRow label="Usuario" value={service.usuario} isMonospaced />
                    <InfoRow label="Contraseña" value={service.contrasena} isMonospaced />
                </SectionCard>

                {/* 4. Financiero */}
                <SectionCard title="Desglose Financiero" icon={ShoppingCart} color="green">
                    <InfoRow label="Mano de Obra" value={formatMoney(service.mano_obra)} />
                    <InfoRow label="Materiales" value={formatMoney(service.materiales)} />
                    <div className="my-2 border-t border-slate-300/50"></div>
                    <InfoRow label="Total" value={formatMoney(service.total)} />
                    <InfoRow label="Anticipo" value={formatMoney(service.anticipo)} />
                    <div className="p-2 rounded bg-blue-500/10 mt-2">
                        <div className="flex justify-between items-center font-bold text-blue-600">
                            <span>Saldo Pendiente</span>
                            <span>{formatMoney(service.saldo)}</span>
                        </div>
                    </div>
                </SectionCard>

                {/* 5. Garantía */}
                <SectionCard title="Garantía" icon={Check} color="teal">
                    <InfoRow label="Estado" value={service.garantia_aplica ? 'Aplica Garantía' : 'Sin Garantía'} />
                    {service.garantia_aplica && (
                        <>
                            <InfoRow label="Inicio" value={formatServiceDate(service.garantia_fecha_inicio)} />
                            <InfoRow label="Vencimiento" value={formatServiceDate(service.garantia_fecha_vencimiento)} />
                            <div className="mt-2 text-xs italic opacity-70">
                                {service.garantia_detalles}
                            </div>
                        </>
                    )}
                </SectionCard>

                {/* 6. Técnico */}
                <SectionCard title="Técnico Responsable" icon={Users} color="orange">
                    <InfoRow label="Nombre" value={service.tecnico_nombre} />
                    <InfoRow label="Celular" value={service.tecnico_celular} />
                    {/* Firma Tecnico */}
                </SectionCard>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {service.firma_tecnico_path && (
                    <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white/50 border-slate-200'}`}>
                        <img src={service.firma_tecnico_path} alt="Firma Técnico" className="h-20 object-contain mb-2 mix-blend-multiply dark:mix-blend-normal dark:invert" />
                        <p className={`text-xs uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Firma del Técnico</p>
                    </div>
                )}

                {service.firma_cliente_path && (
                    <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white/50 border-slate-200'}`}>
                        <img src={service.firma_cliente_path} alt="Firma Cliente" className="h-20 object-contain mb-2 mix-blend-multiply dark:mix-blend-normal dark:invert" />
                        <p className={`text-xs uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Firma de Conformidad</p>
                    </div>
                )}
            </div>

            {/* Photo Gallery */}
            <div className="mt-8">
                <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    <Image className="w-5 h-5 text-blue-500" /> Evidencia Fotográfica
                </h3>
                {loadingPhotos ? (
                    <div className="flex justify-center p-8">
                        <Loader className="animate-spin w-6 h-6 text-blue-600" />
                    </div>
                ) : photos.length === 0 ? (
                    <div className={`p-8 rounded-xl border text-center ${darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        No hay fotografías registradas para este servicio.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {photos.map((photo) => (
                            <div key={photo.id} className={`group relative aspect-video rounded-xl overflow-hidden border shadow-sm transition-all hover:shadow-md ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                                <img
                                    src={photo.uri}
                                    alt={`Evidencia ${photo.id}`}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <button
                                        onClick={() => window.open(photo.uri, '_blank')}
                                        className="bg-white/90 text-slate-800 p-2 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all"
                                        title="Ver imagen completa"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Status Dropdown Component
const StatusDropdown = ({ service, darkMode, onStatusChange }) => {
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
            const { error } = await supabase
                .from('servicios_pc')
                .update({ status: newStatus })
                .eq('id', service.id);

            if (error) throw error;
            onStatusChange();
            setIsOpen(false);
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error al actualizar estado');
        } finally {
            setUpdating(false);
        }
    };

    const getStatusColorClass = (colorName) => {
        const colors = {
            blue: 'bg-blue-100 text-blue-700 border-blue-300',
            yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
            green: 'bg-green-100 text-green-700 border-green-300',
            purple: 'bg-purple-100 text-purple-700 border-purple-300',
            red: 'bg-red-100 text-red-700 border-red-300',
            gray: 'bg-gray-100 text-gray-700 border-gray-300'
        };
        return colors[colorName] || colors.gray;
    };

    const currentStatus = STATUS_OPTIONS.find(s => s.value === service.status?.toLowerCase());
    const displayLabel = currentStatus ? currentStatus.label : 'Seleccionar Estado';
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
                className={`w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all flex items-center justify-between gap-2 ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${darkMode ? 'bg-slate-800 border-slate-600 text-slate-200' : 'text-slate-700'}`}
            >
                {updating ? (
                    <div className="flex items-center gap-2">
                        <Loader className="w-4 h-4 animate-spin text-blue-500" />
                        <span>Actualizando...</span>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColorClass(displayColor).split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500')}`}></span>
                            <span className="truncate">{displayLabel}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
                            className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between group transition-colors ${darkMode
                                ? 'hover:bg-slate-700 text-slate-200'
                                : 'hover:bg-slate-50 text-slate-700'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full bg-${status.color}-500`}></span>
                                <span className="font-medium">{status.label}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const PCList = ({ darkMode, onNavigate, onViewService }) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showQRTicket, setShowQRTicket] = useState(false);
    const [selectedServiceForQR, setSelectedServiceForQR] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedServiceForReceipt, setSelectedServiceForReceipt] = useState(null);

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        setRefreshing(true);
        try {
            const { data, error } = await supabase
                .from('servicios_pc')
                .select('*')
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

    const handleShowQR = async (service) => {
        // Generate public_token if it doesn't exist
        if (!service.public_token) {
            try {
                const newToken = crypto.randomUUID();
                const { data, error } = await supabase
                    .from('servicios_pc')
                    .update({ public_token: newToken })
                    .eq('id', service.id)
                    .select()
                    .single();

                if (error) throw error;

                const updatedService = { ...service, public_token: newToken };
                setSelectedServiceForQR(updatedService);
                setShowQRTicket(true);
                fetchServices(); // Refresh to get updated token
            } catch (error) {
                console.error('Error generating token:', error);
                alert('Error al generar código QR');
            }
        } else {
            setSelectedServiceForQR(service);
            setShowQRTicket(true);
        }
    };

    const handleShowReceipt = async (service) => {
        // Generate public_token if it doesn't exist (needed for QR in receipt)
        if (!service.public_token) {
            try {
                const newToken = crypto.randomUUID();
                const { data, error } = await supabase
                    .from('servicios_pc')
                    .update({ public_token: newToken })
                    .eq('id', service.id)
                    .select()
                    .single();

                if (error) throw error;

                const updatedService = { ...service, public_token: newToken };
                setSelectedServiceForReceipt(updatedService);
                setShowReceipt(true);
                fetchServices();
            } catch (error) {
                console.error('Error generating token:', error);
                alert('Error al generar ticket');
            }
        } else {
            setSelectedServiceForReceipt(service);
            setShowReceipt(true);
        }
    };


    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este servicio?')) return;
        try {
            const { error } = await supabase
                .from('servicios_pc')
                .delete()
                .eq('id', id);

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
                <button
                    onClick={() => onNavigate('servicios')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                    <ArrowLeft className="w-5 h-5" /> Regresar
                </button>
            </div>

            <div className={`rounded-xl shadow-lg border min-h-[600px] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                {services.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        No hay servicios de PC registrados.
                    </div>
                ) : (
                    <div className="overflow-x-auto pb-64">
                        <table className="w-full">
                            <thead className={`border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50/50 border-gray-200'}`}>
                                <tr>
                                    <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>No. Servicio</th>
                                    <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Cliente</th>
                                    <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Fecha</th>
                                    <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Total</th>
                                    <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Estado</th>
                                    <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-200' : 'text-slate-600'}`}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? 'divide-slate-600' : 'divide-slate-100'}`}>
                                {services.map((service) => (
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

                                                {/* QR Button */}
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
                )}
            </div>

            {/* QR Ticket Modal */}
            {showQRTicket && selectedServiceForQR && (
                <QRServiceTicket
                    service={selectedServiceForQR}
                    onClose={() => {
                        setShowQRTicket(false);
                        setSelectedServiceForQR(null);
                    }}
                    darkMode={darkMode}
                />
            )}

            {/* Receipt Modal */}
            {showReceipt && selectedServiceForReceipt && (
                <ServiceReceipt
                    service={selectedServiceForReceipt}
                    onClose={() => {
                        setShowReceipt(false);
                        setSelectedServiceForReceipt(null);
                    }}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
};

const PCServiceView = ({ service, onBack, darkMode, company }) => {
    if (!service) return null;

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
            <div className="max-w-7xl mx-auto bg-white rounded-3xl overflow-hidden">

                {/* Header */}
                <div className="p-6 md:p-8 bg-blue-50 border-b border-blue-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        {/* Left: Company Info */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="p-2 rounded-full hover:bg-white/50 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>

                            <div className="flex items-center gap-4">
                                {company?.logo_uri ? (
                                    <img src={company.logo_uri} alt="Logo" className="w-20 h-20 object-contain bg-white rounded-xl shadow-sm p-1" />
                                ) : (
                                    <div className="w-20 h-20 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                                        {company?.nombre?.charAt(0) || 'C'}
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 leading-tight">
                                        {company?.nombre || 'Mi Empresa'}
                                    </h2>
                                    <p className="text-xs text-slate-600 font-medium mt-1">
                                        {company?.telefono}
                                    </p>
                                    {company?.direccion && (
                                        <p className="text-xs text-slate-500">
                                            {company.direccion}
                                        </p>
                                    )}
                                    {company?.email && (
                                        <p className="text-xs text-slate-500">
                                            {company.email}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Service Number & Date */}
                        <div className="text-left md:text-right">
                            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 mb-1">
                                Reporte de Servicio
                            </span>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-blue-800 mb-2">
                                #{service.orden_numero}
                            </h1>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/60 rounded-lg border border-blue-100 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">FECHA:</span>
                                <span className="text-xs font-mono font-bold text-slate-700">
                                    {formatServiceDate(service.fecha)}
                                </span>
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
                                {service.repuestos_descripcion && service.repuestos_descripcion !== '[]' && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2 font-bold">Repuestos & Materiales</p>
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                            <p className="text-sm text-slate-700">{service.repuestos_descripcion}</p>
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
        </div>
    );
};

const ServiciosView = ({ darkMode, onNavigate }) => {
    const services = [
        { id: 'cctv', title: 'CCTV', icon: Video, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { id: 'pc', title: 'PC', icon: Monitor, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        { id: 'celulares', title: 'Celulares', icon: Smartphone, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        { id: 'impresoras', title: 'Impresoras', icon: Printer, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { id: 'redes', title: 'Redes', icon: Globe, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    ];

    return (
        <div className="w-full px-4 md:px-8 py-8">
            <h1 className={`text-3xl font-extrabold tracking-tight mb-8 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                Gestión de <span className="text-blue-600">Servicios</span>
            </h1>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`}>
                {services.map((service) => (
                    <button
                        key={service.id}
                        className={`p-6 rounded-2xl shadow-lg border transition-all hover:-translate-y-1 hover:shadow-xl text-left ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' : 'bg-white border-slate-100 hover:border-blue-200'}`}
                        onClick={() => {
                            if (service.id === 'cctv') {
                                onNavigate('services-cctv-list');
                            } else if (service.id === 'pc') {
                                onNavigate('services-pc-list');
                            } else {
                                alert(`Navegar a ${service.title} (Pendiente)`);
                            }
                        }}
                    >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${service.bg} ${service.color}`}>
                            <service.icon className="w-8 h-8" />
                        </div>
                        <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>{service.title}</h3>
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Administrar servicios de {service.title}...</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- SIDEBAR COMPONENT ---
// --- SIDEBAR COMPONENT ---

const Sidebar = ({ activeTab, setActiveTab, onLogout, userEmail, currentTheme, setTheme, mobileMode, toggleMobileMode, isOpen, onClose, companyLogo, companyName }) => {
    const isGlass = currentTheme === 'glass';
    const isDark = currentTheme === 'dark';

    const sidebarClasses = mobileMode
        ? `fixed inset-y-0 left-0 z-50 w-64 ${isDark ? 'bg-slate-900 border-r border-slate-800' : 'bg-blue-600'} ${isGlass ? 'text-amber-900' : 'text-white'} transform transition-transform duration-300 ease-in-out shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
        : `fixed inset-y-0 left-0 z-20 w-72 ${isGlass ? 'text-amber-900' : 'text-white'} flex flex-col hidden md:flex ${isGlass ? 'bg-white/30 backdrop-blur-2xl border-r border-orange-200/40 rounded-r-3xl' : 'bg-transparent'}`;

    const textMuted = isGlass ? 'text-amber-700/70' : 'text-blue-200';
    const textHover = isGlass ? 'hover:text-amber-950 hover:bg-amber-900/10 rounded-lg' : 'hover:text-white';
    const activeClass = isGlass ? 'font-bold text-amber-950 bg-amber-900/20 rounded-lg shadow-sm' : 'font-bold text-white';
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
                                    onClick={() => setActiveTab('items')}
                                    className={`w-full flex items-center justify-between text-left py-2 px-3 transition-all ${activeTab === 'items' ? activeClass : `${inactiveClass} ${textHover}`}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <ShoppingCart className="w-4 h-4" />
                                        <span>Productos</span>
                                    </div>
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

const App = () => {
    // 1. Check for critical configuration errors first
    if (!supabase) {
        return <SupabaseConfigError />;
    }


    const handleLogout = async () => {
        await supabase.auth.signOut();
    };


    // State
    const [session, setSession] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Mobile Mode State
    const [mobileMode, setMobileMode] = useState(window.innerWidth < 768);
    const [sidebarOpen, setSidebarOpen] = useState(false);

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

    const [activeTab, setActiveTabState] = useState(() => {
        return localStorage.getItem('activeTab') || 'cotizaciones-list';
    });

    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        localStorage.setItem('activeTab', tab);
    };

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
    const [editingQuotationId, setEditingQuotationId] = useState(null);
    const [viewingQuotation, setViewingQuotation] = useState(null);

    const [items, setItems] = useState([]);
    const [terms, setTerms] = useState('');
    const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
    const [expirationDate, setExpirationDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [showPreview, setShowPreview] = useState(false);

    // Auth State: Folio with COT-YYYY-XXX format
    const [folio, setFolio] = useState('COT-' + new Date().getFullYear() + '-100');

    const [isGenerating, setIsGenerating] = useState(false);

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

    const fetchCompanySettings = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('configuracion_empresa')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (data) {
                setCompany(data);
                localStorage.setItem('companyData', JSON.stringify(data)); // Keep local backup
            } else if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                console.error('Error fetching company settings:', error);
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

            alert(editingQuotationId ? 'Cotización actualizada' : 'Cotización guardada');
            fetchQuotations(session.user.id);
            setEditingQuotationId(null);

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
        if (!confirm('¿Estás seguro de eliminar esta cotización?')) return;

        try {
            const { error } = await supabase
                .from('cotizaciones')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert('Cotización eliminada');
            fetchQuotations(session.user.id);
        } catch (error) {
            console.error('Error deleting quotation:', error);
            alert('Error al eliminar cotización: ' + error.message);
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
        setQuotationDate(quotation.fecha || new Date().toISOString().split('T')[0]);
        setExpirationDate(quotation.fecha_vencimiento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        setEditingQuotationId(quotation.id);
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
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
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
                alert('PDF generado correctamente');
            } catch (err) {
                console.error('Error generating PDF:', err);
                alert('Error al generar el PDF. Por favor intente de nuevo.');
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
            <div className={`w-full min-h-screen p-8 transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                {/* Navigation Bar (No-Print) */}
                <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center no-print">
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
                        <Download className="w-4 h-4" /> Imprimir / Guardar PDF
                    </button>
                </div>

                {/* Contract Paper */}
                <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200 print:shadow-none print:border-none print:w-full print:max-w-none">
                    {/* Header */}
                    <div className="bg-[#1e3a8a] p-10 text-white flex justify-between items-center print:bg-[#1e3a8a] print:text-white">
                        <div className="flex items-center gap-6">
                            <div className="relative group">
                                <div className="bg-white/10 p-2 rounded border border-dashed border-white/30 hover:border-white transition cursor-pointer">
                                    {company?.logo_uri ? (
                                        <img src={company.logo_uri} alt="Logo" className="max-h-24 w-auto object-contain" />
                                    ) : (
                                        <Building2 className="w-16 h-16 text-white" />
                                    )}
                                </div>
                                <p className="text-blue-400 font-medium tracking-widest text-xs mt-1 uppercase">Soluciones a tu medida</p>
                            </div>
                        </div>
                        <div className="text-right text-xs space-y-1 text-slate-400">
                            <p className="font-bold text-white uppercase italic">Dirección</p>
                            <p>{company?.direccion}</p>
                            <p>{company?.ciudad}</p>
                            <p>{company?.telefono && `Tel: ${company.telefono}`}</p>
                            <p>{company?.correo && `Email: ${company.correo}`}</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-12 text-gray-800 text-[13px] leading-relaxed text-justify">
                        <h2 className="text-center font-bold text-lg mb-8 uppercase tracking-widest border-b pb-4">Contrato de Prestación de Servicios de Instalación de CCTV</h2>

                        <p className="mb-8">
                            CONTRATO DE PRESTACIÓN DE SERVICIOS DE INSTALACIÓN DE SISTEMAS DE VIDEOVIGILANCIA (CCTV) que celebran por una parte <strong>{company?.nombre}</strong>, con domicilio en <strong>{company?.direccion}, {company?.ciudad}</strong>, a quien en lo sucesivo se le denominará “EL PRESTADOR”, y por la otra <span
                                contentEditable
                                suppressContentEditableWarning
                                className="font-bold uppercase px-2 bg-[#52D948]/20 border-b border-dashed border-blue-500 outline-none focus:bg-blue-50 transition-colors"
                            >{clientName}</span>, a quien en lo sucesivo se le denominará “EL CLIENTE”, al tenor de las siguientes declaraciones y cláusulas:
                        </p>

                        <div className="space-y-8">
                            <section>
                                <h3 className="font-bold bg-slate-100 px-3 py-1 inline-block mb-3">DECLARACIONES</h3>
                                <div className="space-y-4">
                                    <p><strong>I. Declara EL PRESTADOR que:</strong></p>
                                    <ul className="list-disc ml-8 space-y-1">
                                        <li>Dedicado a la instalación, configuración y mantenimiento de sistemas de videovigilancia (CCTV).</li>
                                        <li>Cuenta con los conocimientos técnicos, herramientas y personal necesario para prestar el servicio objeto de este contrato.</li>
                                        <li>Su domicilio comercial es el antes mencionado.</li>
                                    </ul>

                                    <p><strong>II. Declara EL CLIENTE que:</strong></p>
                                    <ul className="list-disc ml-8 space-y-1">
                                        <li>Es una persona física o moral con capacidad legal para contratar.</li>
                                        <li>Es propietario o cuenta con autorización expresa sobre el inmueble donde se realizará la instalación.</li>
                                        <li>Proporciona información veraz y acceso necesario para la correcta ejecución del servicio.</li>
                                    </ul>

                                    <p><strong>III. Declaran ambas partes que:</strong></p>
                                    <ul className="list-disc ml-8 space-y-1">
                                        <li>Se reconocen mutuamente la personalidad con la que comparecen.</li>
                                        <li>Es su voluntad celebrar el presente contrato sin dolo, error o mala fe.</li>
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h3 className="font-bold bg-slate-100 px-3 py-1 inline-block mb-4">CLÁUSULAS</h3>

                                <div className="space-y-6">
                                    <div>
                                        <p><strong>PRIMERA. OBJETO DEL CONTRATO.</strong> EL PRESTADOR se obliga a proporcionar a EL CLIENTE el servicio de instalación y configuración de un sistema de videovigilancia (CCTV), conforme a lo acordado previamente, incluyendo número de cámaras, tipo de equipo, ubicación y funcionamiento básico.</p>
                                    </div>

                                    <div>
                                        <p><strong>SEGUNDA. ALCANCE DEL SERVICIO.</strong> El servicio incluye: Instalación física de cámaras; Configuración básica del sistema (grabación, visualización local o remota); Pruebas de funcionamiento y Explicación básica de uso al cliente.
                                            <br /><span className="italic text-gray-600 font-semibold italic text-blue-700 underline uppercase">No incluye, salvo pacto por escrito: Obras civiles adicionales, mantenimiento posterior o reposición de equipos por mal uso o fallas eléctricas.</span></p>
                                    </div>

                                    <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 print:bg-blue-50 print:border-blue-100">
                                        <p><strong>TERCERA. PRECIO Y FORMA DE PAGO.</strong> EL CLIENTE se obliga a pagar la cantidad de <span className="font-bold">$</span><span contentEditable suppressContentEditableWarning className="font-bold tracking-wider italic text-blue-700 underline uppercase bg-[#52D948]/20 px-1 border-b border-dashed border-blue-500 outline-none">{totalAmount}</span> MXN, de la siguiente forma:</p>
                                        <ul className="list-disc ml-8 mt-2">
                                            <li>Anticipo de <span className="font-bold">$</span><span contentEditable suppressContentEditableWarning className="font-bold italic text-blue-700 underline uppercase bg-[#52D948]/20 px-1 border-b border-dashed border-blue-500 outline-none">{advanceAmount}</span> al firmar el contrato.</li>
                                            <li>Saldo restante al concluir la instalación.</li>
                                        </ul>
                                        <p className="mt-2 text-[11px] uppercase font-bold text-slate-600">Ningún equipo o instalación será entregado o activado en su totalidad sin haber recibido el pago completo.</p>
                                    </div>

                                    <div>
                                        <p><strong>CUARTA. TIEMPO DE EJECUCIÓN.</strong> EL PRESTADOR realizará la instalación en un plazo estimado de <span contentEditable suppressContentEditableWarning className="font-bold px-2 italic text-blue-700 underline uppercase bg-[#52D948]/20 border-b border-dashed border-blue-500 outline-none">{days}</span> días hábiles, contados a partir del acceso al inmueble.</p>
                                    </div>

                                    <div>
                                        <p><strong>QUINTA. OBLIGACIONES DEL CLIENTE.</strong> EL CLIENTE se compromete a: Proporcionar acceso al inmueble; Contar con instalación eléctrica funcional; No manipular los equipos durante la instalación y respetar las recomendaciones técnicas.</p>
                                    </div>

                                    <div>
                                        <p><strong>SEXTA. GARANTÍA.</strong> EL PRESTADOR otorga una garantía de <span contentEditable suppressContentEditableWarning className="font-bold px-2 italic text-blue-700 underline uppercase bg-[#52D948]/20 border-b border-dashed border-blue-500 outline-none">{warrantyDays}</span> días sobre la instalación realizada.
                                            <br /><span className="text-[11px] italic">Nota: La garantía no cubre descargas eléctricas, vandalismo o manipulación por terceros. Los equipos cuentan con la garantía del fabricante.</span></p>
                                    </div>

                                    <div>
                                        <p><strong>SÉPTIMA. LIMITACIÓN DE RESPONSABILIDAD.</strong> EL PRESTADOR no se hace responsable por robos, pérdidas o delitos ocurridos antes, durante o después. El sistema es disuasivo, no una garantía absoluta de seguridad.</p>
                                    </div>

                                    <div>
                                        <p><strong>OCTAVA. CONFIDENCIALIDAD.</strong> EL PRESTADOR se compromete a guardar absoluta reserva sobre la información y datos a los que tenga acceso.</p>
                                    </div>

                                    <div>
                                        <p><strong>NOVENA. CANCELACIÓN.</strong> El anticipo no será reembolsable si ya se adquirieron equipos. Si la instalación comenzó, se cobrará el trabajo realizado proporcionalmente.</p>
                                    </div>

                                    <div>
                                        <p><strong>DÉCIMA. JURISDICCIÓN.</strong> Ambas partes se someten a las leyes y tribunales competentes de <strong>{company?.ciudad}</strong>.</p>
                                    </div>
                                </div>
                            </section>

                            <section className="mt-12 break-inside-avoid">
                                <p className="mb-12">
                                    Leído que fue el presente contrato y enteradas las partes de su contenido y alcance legal, lo firman por duplicado en {company?.ciudad}, a <span contentEditable suppressContentEditableWarning className="px-2 font-semibold italic text-blue-700 underline uppercase bg-[#52D948]/20 border-b border-dashed border-blue-500 outline-none">{day}</span> de <span contentEditable suppressContentEditableWarning className="px-2 font-semibold italic text-blue-700 underline uppercase bg-[#52D948]/20 border-b border-dashed border-blue-500 outline-none">{month}</span> de 20<span contentEditable suppressContentEditableWarning className="font-semibold italic text-blue-700 underline uppercase bg-[#52D948]/20 border-b border-dashed border-blue-500 outline-none">{year}</span>.
                                </p>

                                <div className="grid grid-cols-2 gap-20 text-center mt-16">
                                    <div>
                                        <div className="h-20 border-b border-slate-900 mx-auto w-4/5 italic text-blue-700 underline uppercase"></div>
                                        <p className="mt-4 font-bold uppercase text-xs italic text-blue-700 underline uppercase">EL PRESTADOR</p>
                                        <p className="text-[11px] italic text-blue-700 underline uppercase">{company?.nombre}</p>
                                        <p className="text-[11px] mt-1 italic text-blue-700 underline uppercase" contentEditable suppressContentEditableWarning>{reprName}</p>
                                    </div>
                                    <div>
                                        <div className="h-20 border-b border-slate-900 mx-auto w-4/5 italic text-blue-700 underline uppercase"></div>
                                        <p className="mt-4 font-bold uppercase text-xs italic text-blue-700 underline uppercase">EL CLIENTE</p>
                                        <p className="text-[11px] mt-1 italic text-blue-700 underline uppercase" contentEditable suppressContentEditableWarning>{clientSignName}</p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="bg-slate-50 border-t p-6 text-center print:bg-white print:border-none">
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em]">Calidad • Confianza • Seguridad</p>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page { margin: 0; size: auto; }
                        body { background: white; padding: 0; margin: 0; }
                        .no-print { display: none !important; }
                        .print\\:shadow-none { box-shadow: none !important; }
                        .print\\:border-none { border: none !important; }
                        .print\\:w-full { width: 100% !important; }
                        .print\\:max-w-none { max-width: none !important; }
                        .print\\:text-white { color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .print\\:bg-\\[\\#1e3a8a\\] { background-color: #1e3a8a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        [contenteditable] { background-color: transparent !important; border-bottom: none !important; }
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
            <div className={`w-full min-h-screen p-8 transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                {/* Navigation Bar (No-Print) */}
                <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center no-print">
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
                        <Download className="w-4 h-4" /> Imprimir / Guardar PDF
                    </button>
                </div>

                {/* Contract Paper */}
                <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200 print:shadow-none print:border-none print:w-full print:max-w-none">
                    {/* Header */}
                    <div className="bg-[#1e3a8a] p-10 text-white flex justify-between items-center print:bg-[#1e3a8a] print:text-white">
                        <div className="flex items-center gap-6">
                            <div className="relative group">
                                <div className="bg-white/10 p-2 rounded border border-dashed border-white/30 hover:border-white transition cursor-pointer">
                                    {company?.logo_uri ? (
                                        <img src={company.logo_uri} alt="Logo" className="max-h-24 w-auto object-contain" />
                                    ) : (
                                        <Building2 className="w-16 h-16 text-white" />
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-blue-400 font-medium tracking-widest text-xs mt-1 uppercase text-center">SOLUCIONES A TU MEDIDA</p>
                            </div>
                        </div>
                        <div className="text-right text-xs space-y-1 text-slate-400">
                            <p className="font-bold text-white uppercase italic">Dirección</p>
                            <p>{company?.direccion}</p>
                            <p>{company?.ciudad}</p>
                            <p>{company?.telefono && `Tel: ${company.telefono}`}</p>
                            <p>{company?.correo && `Email: ${company.correo}`}</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-12 text-gray-800 text-[13px] leading-relaxed text-justify">

                        <h2 className="text-center font-bold text-lg mb-8 uppercase tracking-widest border-b pb-4">Contrato de Prestación de Servicios de Ensamble de Computadoras</h2>

                        <p className="mb-8">
                            CONTRATO DE PRESTACIÓN DE SERVICIOS DE ENSAMBLE, CONFIGURACIÓN Y OPTIMIZACIÓN DE EQUIPO DE CÓMPUTO que celebran por una parte <strong>{company?.nombre}</strong>, con domicilio en <strong>{company?.direccion}, {company?.ciudad}</strong>, a quien en lo sucesivo se le denominará “EL PRESTADOR”, y por la otra <span
                                contentEditable
                                suppressContentEditableWarning
                                className="font-bold uppercase px-2 bg-[#e2e8f0] border-b border-dashed border-blue-500 outline-none focus:bg-blue-50 transition-colors"
                            >{clientName}</span>, a quien en lo sucesivo se le denominará “EL CLIENTE”, al tenor de las siguientes declaraciones y cláusulas:
                        </p>

                        <div className="space-y-8">
                            <section>
                                <h3 className="font-bold bg-slate-100 px-3 py-1 inline-block mb-3">DECLARACIONES</h3>
                                <div className="space-y-4">
                                    <p><strong>I. Declara EL PRESTADOR que:</strong></p>
                                    <ul className="list-disc ml-8 space-y-1">
                                        <li>Se dedica al ensamble, configuración, diagnóstico y optimización de hardware de cómputo de alto rendimiento.</li>
                                        <li>Cuenta con los conocimientos técnicos en arquitectura de hardware, herramientas especializadas y personal capacitado para la manipulación de componentes electrónicos sensibles.</li>
                                    </ul>

                                    <p><strong>II. Declara EL CLIENTE que:</strong></p>
                                    <ul className="list-disc ml-8 space-y-1">
                                        <li>Es una persona física o moral con capacidad legal para contratar.</li>
                                        <li>Solicita el ensamble de equipo(s) de cómputo basado en componentes adquiridos o seleccionados previamente.</li>
                                        <li>Es responsable de la legitimidad de las licencias de software que solicite instalar (Sistema Operativo, Drivers, Software de terceros).</li>
                                    </ul>

                                    <p><strong>III. Declaran ambas partes que:</strong></p>
                                    <ul className="list-disc ml-8 space-y-1">
                                        <li>Se reconocen mutuamente la personalidad con la que comparecen.</li>
                                        <li>Es su voluntad celebrar el presente contrato sin dolo ni mala fe.</li>
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h3 className="font-bold bg-slate-100 px-3 py-1 inline-block mb-4">CLÁUSULAS</h3>

                                <div className="space-y-6">
                                    <div>
                                        <p><strong>PRIMERA. OBJETO DEL CONTRATO.</strong> EL PRESTADOR se obliga a proporcionar a EL CLIENTE el servicio de ensamble físico de componentes (CPU, GPU, RAM, etc.), gestión de cables, actualización de BIOS/Firmware y configuración inicial de software, conforme a la lista de componentes acordada.</p>
                                    </div>

                                    <div>
                                        <p><strong>SEGUNDA. ALCANCE DEL SERVICIO.</strong> El servicio incluye: Montaje de hardware en gabinete; Gestión térmica (aplicación de pasta térmica y flujo de aire); Instalación de Sistema Operativo y Controladores; Pruebas de estrés para verificar estabilidad.
                                            <br /><span className="italic text-blue-700 font-semibold underline uppercase">No incluye: Recuperación de datos de discos anteriores, licencias de software no pagadas, u Overclocking extremo sin responsabilidad.</span></p>
                                    </div>

                                    <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 print:bg-blue-50 print:border-blue-100">
                                        <p><strong>TERCERA. PRECIO Y FORMA DE PAGO.</strong> EL CLIENTE se obliga a pagar la cantidad de <span className="font-bold">$</span><span contentEditable suppressContentEditableWarning className="font-bold tracking-wider italic text-blue-700 underline uppercase bg-[#e2e8f0] px-1 border-b border-dashed border-blue-500 outline-none">{totalAmount}</span> MXN, de la siguiente forma:</p>
                                        <ul className="list-disc ml-8 mt-2">
                                            <li>Anticipo por servicio de ensamble: <span className="font-bold">$</span><span contentEditable suppressContentEditableWarning className="font-bold italic text-blue-700 underline uppercase bg-[#e2e8f0] px-1 border-b border-dashed border-blue-500 outline-none">{advanceAmount}</span> al entregar/pedir componentes.</li>
                                            <li>Saldo restante: Al concluir el ensamble y pruebas de rendimiento.</li>
                                        </ul>
                                        <p className="mt-2 text-[11px] uppercase font-bold text-slate-600">El equipo no será entregado sin haber liquidado el total del servicio.</p>
                                    </div>

                                    <div>
                                        <p><strong>CUARTA. TIEMPO DE ENTREGA.</strong> EL PRESTADOR entregará el equipo en un plazo estimado de <span contentEditable suppressContentEditableWarning className="font-bold px-2 italic text-blue-700 underline uppercase bg-[#e2e8f0] border-b border-dashed border-blue-500 outline-none">{days}</span> días hábiles, sujeto a la disponibilidad de todos los componentes.</p>
                                    </div>

                                    <div>
                                        <p><strong>QUINTA. GARANTÍA DE MANO DE OBRA.</strong> EL PRESTADOR otorga una garantía de <span contentEditable suppressContentEditableWarning className="font-bold px-2 italic text-blue-700 underline uppercase bg-[#e2e8f0] border-b border-dashed border-blue-500 outline-none">{warrantyDays}</span> días exclusivamente sobre el ensamble (conexiones mal realizadas, errores de montaje).
                                            <br /><span className="text-[11px] italic">Nota: Las garantías de componentes individuales (Fallas de fábrica en procesador, GPU, etc.) deberán tramitarse directamente con el fabricante o distribuidor del hardware.</span></p>
                                    </div>

                                    <div>
                                        <p><strong>SEXTA. EXCLUSIÓN DE RESPONSABILIDAD.</strong> EL PRESTADOR no es responsable por daños derivados de: Inestabilidad eléctrica en el domicilio del cliente, manipulación posterior por terceros, o instalación de software malicioso (virus/malware) posterior a la entrega.</p>
                                    </div>

                                    <div>
                                        <p><strong>SÉPTIMA. JURISDICCIÓN.</strong> Ambas partes se someten a las leyes y tribunales competentes de <strong>{company?.ciudad}</strong>.</p>
                                    </div>
                                </div>
                            </section>

                            <section className="mt-12 break-inside-avoid">
                                <p className="mb-12">
                                    Leído que fue el presente contrato y enteradas las partes de su contenido y alcance legal, lo firman por duplicado en {company?.ciudad}, a <span contentEditable suppressContentEditableWarning className="px-2 font-semibold italic text-blue-700 underline uppercase bg-[#e2e8f0] border-b border-dashed border-blue-500 outline-none">{day}</span> de <span contentEditable suppressContentEditableWarning className="px-2 font-semibold italic text-blue-700 underline uppercase bg-[#e2e8f0] border-b border-dashed border-blue-500 outline-none">{month}</span> de 20<span contentEditable suppressContentEditableWarning className="font-semibold italic text-blue-700 underline uppercase bg-[#e2e8f0] border-b border-dashed border-blue-500 outline-none">{year}</span>.
                                </p>

                                <div className="grid grid-cols-2 gap-20 text-center mt-16">
                                    <div>
                                        <div className="h-20 border-b border-slate-900 mx-auto w-4/5 italic text-blue-700 underline uppercase"></div>
                                        <p className="mt-4 font-bold uppercase text-xs italic text-blue-700 underline uppercase">EL PRESTADOR</p>
                                        <p className="text-[11px] italic text-blue-700 underline uppercase">{company?.nombre} - Área Técnica</p>
                                        <p className="text-[11px] mt-1 italic text-blue-700 underline uppercase" contentEditable suppressContentEditableWarning>{technicianName}</p>
                                    </div>
                                    <div>
                                        <div className="h-20 border-b border-slate-900 mx-auto w-4/5 italic text-blue-700 underline uppercase"></div>
                                        <p className="mt-4 font-bold uppercase text-xs italic text-blue-700 underline uppercase">EL CLIENTE</p>
                                        <p className="text-[11px] mt-1 italic text-blue-700 underline uppercase" contentEditable suppressContentEditableWarning>{clientSignName}</p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="bg-slate-50 border-t p-6 text-center print:bg-white print:border-none">
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em]">Ensambles • Configuración • Rendimiento</p>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page { margin: 0; size: auto; }
                        body { background: white; padding: 0; margin: 0; }
                        .no-print { display: none !important; }
                        .print\\:shadow-none { box-shadow: none !important; }
                        .print\\:border-none { border: none !important; }
                        .print\\:w-full { width: 100% !important; }
                        .print\\:max-w-none { max-width: none !important; }
                        .print\\:text-white { color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .print\\:bg-\\[\\#1e3a8a\\] { background-color: #1e3a8a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .print-gradient-text {
                            background-image: linear-gradient(to right, #2563eb, #a855f7, #9333ea) !important;
                            -webkit-background-clip: text !important;
                            background-clip: text !important;
                            color: transparent !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        [contenteditable] { background-color: transparent !important; border-bottom: none !important; }
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
            <div className={`min-h-screen flex ${getBackgroundClass()} ${currentTheme === 'dark' ? 'dark' : ''}`}>
                <Sidebar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onLogout={handleLogout}
                    userEmail={session.user.email}
                    currentTheme={currentTheme}
                    setTheme={setTheme}
                    companyLogo={company.logo_uri}
                    companyName={company.nombre}
                    mobileMode={mobileMode}
                    toggleMobileMode={toggleMobileMode}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    onCreateNew={() => {
                        setClient({ name: '', phone: '', email: '', address: '' });
                        setItems([]);
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
                    <div className={`sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b shadow-sm ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-blue-600 text-white border-blue-500'}`}>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className={`p-2 -ml-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-blue-500 text-white'}`}
                            >
                                <span>Menu</span>
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg tracking-tight">SmartQuote</span>
                            </div>
                        </div>
                    </div>
                )}

                <main className={`flex-1 transition-all duration-300 p-8 h-screen overflow-hidden ${mobileMode ? '' : 'ml-72'}`}>
                    <div className={`w-full h-full rounded-[2.5rem] shadow-2xl overflow-y-auto px-8 py-10 ${isDark ? 'bg-slate-800' : currentTheme === 'glass' ? 'bg-orange-50/40 backdrop-blur-sm' : 'bg-white'}`}>

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
                                onDelete={deleteQuotation}
                                darkMode={isDark}
                            />
                        )}

                        {activeTab === 'cotizaciones-new' && (
                            <div className="w-full px-4 md:px-8 py-8 pb-20">
                                {/* Header */}
                                <div className={`flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b pb-6 ${isDark ? 'border-slate-600' : ''}`}>
                                    <div>
                                        <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                                            Generador de <span className="text-blue-600">Cotizaciones</span>
                                        </h1>
                                        <p className={`mt-1 ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>Crea documentos profesionales en segundos.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowPreview(true)}
                                            className="btn bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 shadow-sm px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                                            title="Vista Previa"
                                        >
                                            <Eye className="w-5 h-5" />
                                            <span className="hidden sm:inline">Vista Previa</span>
                                        </button>
                                        <button
                                            onClick={saveQuotation}
                                            className="btn bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/30 transform hover:-translate-y-0.5 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                                        >
                                            <Download className="w-5 h-5" />
                                            {editingQuotationId ? 'Actualizar' : 'Guardar'}
                                        </button>
                                        <button
                                            onClick={generatePDF}
                                            disabled={isGenerating}
                                            className={`btn bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <Download className="w-5 h-5" />
                                            {isGenerating ? 'Generando...' : 'Descargar PDF'}
                                        </button>
                                    </div>
                                </div>

                                {/* Full Width Editor */}
                                <div className="w-full max-w-5xl mx-auto space-y-6">
                                    {/* Company Data Auto-filled */}
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm overflow-hidden p-1">
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
                        {activeTab === 'servicios' && <ServiciosView darkMode={isDark} onNavigate={setActiveTab} />}
                        {activeTab === 'services-cctv-list' && <CCTVList darkMode={isDark} onNavigate={setActiveTab} onViewService={handleViewService} />}
                        {activeTab === 'services-cctv-view' && <CCTVServiceView service={selectedService} onBack={() => setActiveTab('services-cctv-list')} darkMode={isDark} />}
                        {activeTab === 'services-pc-list' && <PCList darkMode={isDark} onNavigate={setActiveTab} onViewService={handleViewPCService} />}
                        {activeTab === 'services-pc-view' && <PCServiceView service={selectedService} onBack={() => setActiveTab('services-pc-list')} darkMode={isDark} company={company} />}
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
                    </div>
                </main>
            </div>
        </ErrorBoundary>
    );
};

export default App;
