import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { Search, FileText, Check, X, Loader, User, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency } from '../utils/format';

const QuoteSelector = ({ onSelect, onClose, darkMode }) => {
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchQuotes();
    }, []);

    const fetchQuotes = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('cotizaciones')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50); // Limit to recent 50 quotes for performance

            if (error) throw error;
            setQuotes(data || []);
        } catch (error) {
            console.error('Error fetching quotes:', error);
            alert('Error al cargar cotizaciones');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (quote) => {
        // Parse items if they are stored as JSON string, though usually they are JSONb or array
        let items = quote.articulos;
        if (typeof items === 'string') {
            try {
                items = JSON.parse(items);
            } catch (e) {
                console.error('Error parsing quote items:', e);
                items = [];
            }
        }

        if (!items || !Array.isArray(items)) {
            alert('Esta cotización no contiene artículos validos.');
            return;
        }

        onSelect(items);
        onClose();
    };

    const filteredQuotes = quotes.filter(q =>
        (q.nombre_cliente && q.nombre_cliente.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (q.folio && q.folio.toString().toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-3xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>

                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50'}`}>
                    <div>
                        <h2 className={`text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                            Seleccionar Cotización
                        </h2>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Carga los productos de una cotización existente.
                        </p>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    <div className="relative">
                        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input
                            type="text"
                            placeholder="Buscar por cliente o folio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-9 pr-4 py-2 rounded-lg border text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader className="animate-spin w-8 h-8 text-blue-600" />
                        </div>
                    ) : filteredQuotes.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-slate-700' : 'text-slate-200'}`} />
                            <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                No se encontraron cotizaciones.
                            </p>
                        </div>
                    ) : (
                        filteredQuotes.map((quote) => (
                            <div
                                key={quote.id}
                                onClick={() => handleSelect(quote)}
                                className={`group flex items-center justify-between p-4 rounded-xl border border-transparent transition-all cursor-pointer ${darkMode
                                    ? 'bg-slate-700/30 hover:bg-slate-700 hover:border-slate-600'
                                    : 'bg-slate-50 hover:bg-blue-50 hover:border-blue-200'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${darkMode ? 'bg-slate-600 text-slate-300' : 'bg-white text-blue-600 shadow-sm'
                                        }`}>
                                        #{quote.folio}
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-sm mb-0.5 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                            {quote.nombre_cliente || 'Cliente sin nombre'}
                                        </h3>
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className={`flex items-center gap-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                <Calendar className="w-3 h-3" />
                                                {new Date(quote.fecha).toLocaleDateString()}
                                            </span>
                                            <span className={`flex items-center gap-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                <DollarSign className="w-3 h-3" />
                                                {formatCurrency(quote.total)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    <Check className="w-4 h-4" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuoteSelector;
