import React from 'react';
import { AlertTriangle, Lock, Key } from 'lucide-react';

const SupabaseConfigError = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl border border-red-100 overflow-hidden">
                <div className="bg-red-600 p-6 text-white text-center">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold">Configuración Incompleta</h1>
                    <p className="text-red-100 mt-2">No se pudo conectar con Supabase</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-red-50 text-red-800 p-4 rounded-lg text-sm border border-red-200">
                        <p className="font-bold">Error Crítico:</p>
                        <p>No se encontraron las variables de entorno <code>VITE_SUPABASE_URL</code> y/o <code>VITE_SUPABASE_ANON_KEY</code>.</p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <Lock className="w-5 h-5 text-blue-600" />
                            Cómo solucionar esto en GitHub Pages:
                        </h3>

                        <ol className="list-decimal list-inside space-y-3 text-slate-600 ml-2">
                            <li>Ve a tu repositorio en <strong>GitHub</strong>.</li>
                            <li>Haz clic en la pestaña <strong>Settings</strong> (Configuración).</li>
                            <li>En el menú lateral, expande <strong>Secrets and variables</strong> y selecciona <strong>Actions</strong>.</li>
                            <li>Haz clic en el botón verde <strong>New repository secret</strong>.</li>
                            <li>Agrega las siguientes dos claves (tómalas de tu archivo <code>.env</code> local):
                                <div className="mt-2 space-y-2">
                                    <div className="flex items-center gap-2 bg-slate-100 p-2 rounded font-mono text-sm border">
                                        <Key className="w-4 h-4 text-slate-400" />
                                        <strong>VITE_SUPABASE_URL</strong>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-100 p-2 rounded font-mono text-sm border">
                                        <Key className="w-4 h-4 text-slate-400" />
                                        <strong>VITE_SUPABASE_ANON_KEY</strong>
                                    </div>
                                </div>
                            </li>
                            <li>Una vez agregadas, ve a la pestaña <strong>Actions</strong> y re-ejecuta el último workflow fallido o haz un nuevo commit.</li>
                        </ol>
                    </div>

                    <div className="border-t pt-6 text-center">
                        <p className="text-xs text-slate-400">
                            Si estás viendo esto en localhost, asegúrate de tener tu archivo <code>.env</code> correctamente configurado.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupabaseConfigError;
