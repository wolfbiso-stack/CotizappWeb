import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { Search, Package, Box, Loader, X } from 'lucide-react';

const ProductAutocomplete = ({ value, onChange, onSelect, darkMode, placeholder, user }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSuggestions = async (query) => {
        if (!query || query.length < 2) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .ilike('nombre', `%${query}%`)
                .eq('user_id', user?.id)
                .limit(10);

            if (error) throw error;
            setSuggestions(data || []);
            setShowSuggestions(true);
            setSelectedIndex(-1);
        } catch (error) {
            console.error('Error fetching product suggestions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        onChange(newValue);
        fetchSuggestions(newValue);
    };

    const handleSelectProduct = (product) => {
        onSelect(product);
        setShowSuggestions(false);
    };

    const handleKeyDown = (e) => {
        if (!showSuggestions) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                e.preventDefault();
                handleSelectProduct(suggestions[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => value.length >= 2 && setShowSuggestions(true)}
                    className={`w-full border rounded-md p-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium ${darkMode ? 'bg-slate-900 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                    placeholder={placeholder || "Descripción del producto / SKU..."}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {loading && <Loader className="w-4 h-4 animate-spin text-indigo-500" />}
                    {value && (
                        <button
                            type="button"
                            onClick={() => { onChange(''); setSuggestions([]); }}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className={`absolute z-[1000] w-full mt-1 rounded-xl shadow-2xl border overflow-hidden max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
                    }`}>
                    {suggestions.map((product, index) => (
                        <div
                            key={product.id}
                            onClick={() => handleSelectProduct(product)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`p-3 cursor-pointer transition-colors flex items-center justify-between group ${selectedIndex === index
                                ? (darkMode ? 'bg-slate-700' : 'bg-indigo-50')
                                : (darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50')
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {product.foto_url ? (
                                        <img src={product.foto_url} className="w-full h-full object-cover rounded-lg" alt="" />
                                    ) : (
                                        <Package className="w-4 h-4" />
                                    )}
                                </div>
                                <div>
                                    <h4 className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'} group-hover:text-indigo-600 transition-colors`}>
                                        {product.nombre}
                                    </h4>
                                    <p className={`text-[10px] uppercase font-bold tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        SKU: {product.sku || 'N/A'} • {product.categoria || 'Sin cat.'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className={`text-sm font-black ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                    ${product.precio}
                                </span>
                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${product.stock > 0
                                    ? (darkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600')
                                    : (darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600')
                                    }`}>
                                    <Box className="w-3 h-3" />
                                    {product.stock}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showSuggestions && value.length >= 2 && !loading && suggestions.length === 0 && (
                <div className={`absolute z-10 w-full mt-1 p-4 rounded-xl shadow-lg border text-center ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-500'}`}>
                    <p className="text-xs font-medium">No se encontraron productos coincidentes.</p>
                </div>
            )}
        </div>
    );
};

export default ProductAutocomplete;
