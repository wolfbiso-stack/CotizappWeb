import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { User, Loader, X, Building2, Phone } from 'lucide-react';

const ClientAutocomplete = ({ value, onChange, onSelect, darkMode, placeholder, user }) => {
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
                .from('clientes')
                .select('*')
                .ilike('nombre', `%${query}%`)
                .eq('user_id', user?.id)
                .limit(10);

            if (error) throw error;
            setSuggestions(data || []);
            setShowSuggestions(true);
            setSelectedIndex(-1);
        } catch (error) {
            console.error('Error fetching client suggestions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        onChange(newValue);
        fetchSuggestions(newValue);
    };

    const handleSelectClient = (client) => {
        onSelect(client);
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
                handleSelectClient(suggestions[selectedIndex]);
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
                    value={value || ''}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => value?.length >= 2 && setShowSuggestions(true)}
                    className={`w-full p-3 rounded-xl border-2 transition-all outline-none font-medium ${darkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:bg-white'
                        }`}
                    placeholder={placeholder || "Nombre del cliente..."}
                    required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {loading && <Loader className="w-4 h-4 animate-spin text-blue-500" />}
                    {value && (
                        <button
                            type="button"
                            onClick={() => { onChange(''); setSuggestions([]); }}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className={`absolute z-[1000] w-full mt-2 rounded-xl shadow-2xl border overflow-hidden max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
                    }`}>
                    {suggestions.map((client, index) => (
                        <div
                            key={client.id}
                            onClick={() => handleSelectClient(client)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`p-3 cursor-pointer transition-colors flex items-center justify-between group ${selectedIndex === index
                                ? (darkMode ? 'bg-slate-700' : 'bg-blue-50')
                                : (darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50')
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${darkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'} group-hover:text-blue-600 transition-colors`}>
                                        {client.nombre}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {client.empresa && (
                                            <span className={`text-[10px] flex items-center gap-1 font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                <Building2 className="w-3 h-3" />
                                                {client.empresa}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {client.numero && (
                                <div className={`text-[10px] flex items-center gap-1 font-medium px-2 py-1 rounded-md ${darkMode ? 'bg-slate-600/50 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                    <Phone className="w-3 h-3" />
                                    {client.numero}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showSuggestions && value?.length >= 2 && !loading && suggestions.length === 0 && (
                <div className={`absolute z-[1000] w-full mt-2 p-4 rounded-xl shadow-lg border text-center ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-500'}`}>
                    <p className="text-sm font-medium">No se encontraron clientes.</p>
                </div>
            )}
        </div>
    );
};

export default ClientAutocomplete;
