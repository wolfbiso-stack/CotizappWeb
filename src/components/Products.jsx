import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { Search, Plus, Edit2, Trash2, Package, Image as ImageIcon, X, Save, Loader, AlertTriangle, DollarSign, Box, Eye } from 'lucide-react';
import { formatCurrency } from '../utils/format';

const Products = ({ darkMode, user }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const [viewingProduct, setViewingProduct] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        sku: '',
        nombre: '',
        descripcion: '',
        costo: '',
        precio: '',
        stock: '',
        categoria: '',
        vendedor: ''
    });
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        if (user?.id) {
            fetchProducts();
        }
    }, [user?.id]);

    const fetchProducts = async () => {
        console.log("DEBUG: fetchProducts started");
        try {
            setLoading(true);

            if (!supabase) {
                console.error("CRITICAL: Supabase client is null/undefined");
                throw new Error("Supabase client is not initialized. Check imports and .env");
            }

            console.log("DEBUG: invoking supabase.from('productos')");
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("DEBUG: Supabase returned error", error);
                throw error;
            }

            console.log("DEBUG: Got data", data);
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
            alert('Error cargando productos: ' + (error.message || JSON.stringify(error)));
        } finally {
            console.log("DEBUG: finally block reached, setting loading false");
            setLoading(false);
        }
    };

    const handleViewProduct = (product) => {
        setViewingProduct(product);
    };

    const handlePrepareModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                sku: product.sku || '',
                nombre: product.nombre || '',
                descripcion: product.descripcion || '',
                costo: product.costo || '',
                precio: product.precio || '',
                stock: product.stock || '',
                categoria: product.categoria || '',
                vendedor: product.vendedor || ''
            });
            setImagePreview(product.foto_url);
        } else {
            setEditingProduct(null);
            setFormData({
                sku: '',
                nombre: '',
                descripcion: '',
                costo: '',
                precio: '',
                stock: '',
                categoria: '',
                vendedor: ''
            });
            setImagePreview(null);
        }
        setSelectedImage(null);
        setShowModal(true);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            let imageUrl = editingProduct?.foto_url || null;

            // 1. Upload Image if selected
            if (selectedImage) {
                const fileExt = selectedImage.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `productos/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('servicio-files-v2')
                    .upload(filePath, selectedImage);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('servicio-files-v2')
                    .getPublicUrl(filePath);

                imageUrl = publicUrl;
            }

            const { data: { user } } = await supabase.auth.getUser();

            const productData = {
                ...formData,
                costo: Math.max(0, parseFloat(formData.costo) || 0),
                precio: Math.max(0, parseFloat(formData.precio) || 0),
                stock: Math.max(0, parseInt(formData.stock) || 0),
                foto_url: imageUrl,
                user_id: user?.id
            };

            if (editingProduct) {
                // Update
                const { error } = await supabase
                    .from('productos')
                    .update(productData)
                    .eq('id', editingProduct.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from('productos')
                    .insert([productData]);
                if (error) throw error;
            }

            setShowModal(false);
            fetchProducts();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Error al guardar el producto: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, fotoUrl) => {
        if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;

        try {
            // Delete image if exists
            if (fotoUrl) {
                const path = fotoUrl.split('servicio-files-v2/')[1];
                if (path) {
                    await supabase.storage.from('servicio-files-v2').remove([path]);
                }
            }

            const { error } = await supabase
                .from('productos')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error al eliminar producto');
        }
    };

    const filteredProducts = products.filter(p =>
        p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const inputClass = `w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${darkMode
        ? 'bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-400'
        : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
        }`;

    const labelClass = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`;

    return (
        <div className="w-full px-4 md:px-8 py-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className={`text-3xl font-extrabold tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        Inventario de <span className="text-blue-600">Productos</span>
                    </h1>
                    <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Administra tu catálogo, precios y existencias.
                    </p>
                </div>
                <button
                    onClick={() => handlePrepareModal()}
                    className="btn bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Producto
                </button>
            </div>

            {/* Search and Filter */}
            <div className="mb-8">
                <div className="relative max-w-xl">
                    <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, SKU o categoría..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'} focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm`}
                    />
                </div>
            </div>

            {/* Products List */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader className="animate-spin w-8 h-8 text-blue-600" />
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className={`rounded-xl shadow-lg border p-12 text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
                        <Package className="w-10 h-10" />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-700'}`}>No hay productos encontrados</h3>
                    <p className={`max-w-md mx-auto mb-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Agrega productos a tu inventario para comenzar a gestionarlos.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map((product) => (
                        <div
                            key={product.id}
                            onClick={() => handleViewProduct(product)}
                            className={`group relative rounded-xl border overflow-hidden transition-all hover:shadow-lg duration-300 cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-blue-200'}`}
                        >
                            {/* Image Aspect ratio container */}
                            <div className="aspect-[4/3] w-full overflow-hidden bg-gray-100 relative">
                                {product.foto_url ? (
                                    <img
                                        src={product.foto_url}
                                        alt={product.nombre}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-slate-700 text-slate-500' : 'bg-slate-100 text-slate-300'}`}>
                                        <ImageIcon className="w-8 h-8" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleViewProduct(product); }}
                                        className="p-1.5 bg-white/90 backdrop-blur text-slate-700 rounded-full hover:bg-white hover:text-blue-600 shadow-sm transition-colors"
                                        title="Ver Detalles"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePrepareModal(product); }}
                                        className="p-1.5 bg-white/90 backdrop-blur text-slate-700 rounded-full hover:bg-white hover:text-blue-600 shadow-sm transition-colors"
                                        title="Editar"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(product.id, product.foto_url); }}
                                        className="p-1.5 bg-white/90 backdrop-blur text-slate-700 rounded-full hover:bg-white hover:text-red-600 shadow-sm transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                {/* Badge SKU */}
                                {product.sku && (
                                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md tracking-wider">
                                        SKU: {product.sku}
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-3">
                                <div className="mb-2">
                                    <h3 className={`font-bold text-sm leading-tight mb-1 truncate ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                        {product.nombre}
                                    </h3>
                                    <p className={`text-xs line-clamp-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {product.descripcion || 'Sin descripción'}
                                    </p>
                                </div>

                                <div className={`flex items-center justify-between pt-2 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Precio</span>
                                        <span className={`text-base font-black ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                            ${formatCurrency(product.precio)}
                                        </span>
                                    </div>
                                    <div className={`flex flex-col items-end`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Stock</span>
                                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold ${product.stock > 0
                                            ? (darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600')
                                            : (darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600')
                                            }`}>
                                            <Box className="w-3 h-3" />
                                            {product.stock}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )
            }

            {/* Modal for Add/Edit */}
            {
                showModal && (
                    <div className="fixed inset-0 z[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" style={{ zIndex: 100 }}>
                        <div className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
                            <div className={`px-8 py-6 border-b flex justify-between items-center ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                                <h2 className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                    {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                                </h2>
                                <button onClick={() => setShowModal(false)} className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6">
                                {/* Image Upload */}
                                <div className="flex justify-center mb-6">
                                    <div className="relative group cursor-pointer">
                                        <div className={`w-32 h-32 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${darkMode ? 'border-slate-600 bg-slate-700/50' : 'border-slate-300 bg-slate-50'} ${imagePreview ? 'border-solid border-blue-500' : ''}`}>
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center p-4">
                                                    <ImageIcon className={`w-8 h-8 mx-auto mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                                    <span className={`text-[10px] font-bold uppercase ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Subir Foto</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                                                <p className="text-white text-xs font-bold">Cambiar</p>
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className={labelClass}>Nombre del Producto *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.nombre}
                                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                            className={inputClass}
                                            placeholder="Ej. Disco Duro SSD 480GB"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>SKU / Código</label>
                                        <input
                                            type="text"
                                            value={formData.sku}
                                            onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                            className={inputClass}
                                            placeholder="Ej. SSD-KING-480"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Descripción</label>
                                    <textarea
                                        rows="3"
                                        value={formData.descripcion}
                                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                        className={`${inputClass} resize-none`}
                                        placeholder="Detalles técnicos, compatibilidad, etc."
                                    ></textarea>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="col-span-1">
                                        <label className={labelClass}>Costo (Empresa)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.costo}
                                                onChange={e => setFormData({ ...formData, costo: Math.max(0, parseFloat(e.target.value) || 0) })}
                                                className={`${inputClass} pl-9`}
                                                placeholder="0.00"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>Precio (Público) *</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                            <input
                                                type="number"
                                                required
                                                step="0.01"
                                                value={formData.precio}
                                                onChange={e => setFormData({ ...formData, precio: Math.max(0, parseFloat(e.target.value) || 0) })}
                                                className={`${inputClass} pl-9 font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
                                                placeholder="0.00"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>Stock Actual</label>
                                        <input
                                            type="number"
                                            value={formData.stock}
                                            onChange={e => setFormData({ ...formData, stock: Math.max(0, parseInt(e.target.value) || 0) })}
                                            className={`${inputClass} text-center font-bold`}
                                            placeholder="0"
                                            min="0"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelClass}>Categoría</label>
                                        <input
                                            type="text"
                                            value={formData.categoria}
                                            onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                                            className={inputClass}
                                            placeholder="Ej. Almacenamiento"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Vendedor / Proveedor</label>
                                    <input
                                        type="text"
                                        value={formData.vendedor}
                                        onChange={e => setFormData({ ...formData, vendedor: e.target.value })}
                                        className={inputClass}
                                        placeholder="Ej. TechData, Ingram, etc."
                                    />
                                </div>
                            </form>

                            <div className={`p-6 border-t flex justify-end gap-3 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50'}`}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className={`px-6 py-2.5 rounded-xl font-bold transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                                >
                                    {saving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    {editingProduct ? 'Actualizar' : 'Guardar Producto'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* View Product Details Modal */}
            {
                viewingProduct && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" style={{ zIndex: 9999 }}>
                        <div className={`w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>

                            {/* Image Header */}
                            <div className="relative w-full aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                                {viewingProduct.foto_url ? (
                                    <img
                                        src={viewingProduct.foto_url}
                                        alt={viewingProduct.nombre}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-slate-700 text-slate-500' : 'bg-slate-100 text-slate-300'}`}>
                                        <ImageIcon className="w-16 h-16" />
                                    </div>
                                )}
                                <button
                                    onClick={() => setViewingProduct(null)}
                                    className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                {viewingProduct.sku && (
                                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-lg tracking-wider">
                                        SKU: {viewingProduct.sku}
                                    </div>
                                )}
                            </div>

                            <div className="p-8 overflow-y-auto">
                                <div className="mb-6">
                                    <h2 className={`text-2xl font-bold leading-tight mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                        {viewingProduct.nombre}
                                    </h2>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                            {viewingProduct.categoria || 'Sin Categoría'}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${viewingProduct.stock > 0
                                            ? (darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600')
                                            : (darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600')
                                            }`}>
                                            <Box className="w-3.5 h-3.5" />
                                            Stock: {viewingProduct.stock}
                                        </span>
                                    </div>
                                    <p className={`text-base leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                        {viewingProduct.descripcion || 'Sin descripción disponible para este producto.'}
                                    </p>
                                </div>

                                <div className={`grid grid-cols-2 gap-4 p-4 rounded-xl mb-6 ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                                    <div>
                                        <span className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Precio Público</span>
                                        <span className={`text-2xl font-black ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                            ${formatCurrency(viewingProduct.precio)}
                                        </span>
                                    </div>
                                    {viewingProduct.costo > 0 && (
                                        <div>
                                            <span className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Costo Empresa</span>
                                            <span className={`text-lg font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                ${formatCurrency(viewingProduct.costo)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {viewingProduct.vendedor && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className={`font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Proveedor:</span>
                                        <span className={`${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{viewingProduct.vendedor}</span>
                                    </div>
                                )}
                            </div>

                            <div className={`p-6 border-t flex gap-3 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50'}`}>
                                <button
                                    onClick={() => {
                                        setViewingProduct(null);
                                        handlePrepareModal(viewingProduct);
                                    }}
                                    className="flex-1 btn bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 py-3 rounded-xl font-bold transition-all transform hover:-translate-y-0.5 flex justify-center items-center gap-2"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Editar
                                </button>
                                <button
                                    onClick={() => setViewingProduct(null)}
                                    className={`px-6 py-3 rounded-xl font-bold transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Products;
