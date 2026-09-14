import React, { useState } from 'react';
import { useDesigner } from '../context/DesignerContext';
import { Save, Download, Undo, Redo, ZoomIn, ZoomOut, Maximize, Loader, FolderOpen, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { supabase } from '../../../../utils/supabase';

const TopBar = ({ darkMode }) => {
  const { state, dispatch } = useDesigner();
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const handleZoom = (amount) => {
    dispatch({ type: 'SET_VIEW', payload: { zoom: Math.max(0.1, state.view.zoom + amount) } });
  };

  const handleUndo = () => dispatch({ type: 'UNDO' });
  const handleRedo = () => dispatch({ type: 'REDO' });

  const exportToPNG = async () => {
    setIsExporting(true);
    try {
      const svgContainer = document.getElementById('designer-svg-canvas');
      if (!svgContainer) throw new Error("No se encontró el lienzo");
      
      const canvas = await html2canvas(svgContainer.parentElement, {
        backgroundColor: darkMode ? '#0f172a' : '#f8fafc',
      });
      
      const link = document.createElement('a');
      link.download = `${state.project.name || 'cerco'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      alert("Error al exportar PNG: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const saveProject = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Debes iniciar sesión para guardar.");
        return;
      }

      const projectData = {
        name: state.project.name,
        data: {
           project: state.project,
           view: state.view,
           elements: state.elements,
           segments: state.segments,
           nodes: state.nodes,
           connections: state.connections
        }
      };

      if (state.project.id) {
         if (!window.confirm(`¿Deseas sobreescribir el proyecto "${state.project.name}" existente?`)) {
             setIsSaving(false);
             return;
         }
         const { error } = await supabase.from('cerco_projects').update(projectData).eq('id', state.project.id);
         if (error) throw error;
      } else {
         projectData.user_id = user.id;
         const { data, error } = await supabase.from('cerco_projects').insert(projectData).select();
         if (error) throw error;
         if (data && data[0]) {
             dispatch({ type: 'UPDATE_PROJECT', payload: { id: data[0].id } });
         }
      }
      alert("Proyecto guardado exitosamente");
    } catch (e) {
      console.error(e);
      alert("Error guardando proyecto: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Debes iniciar sesión para cargar proyectos.");
        return;
      }
      const { data, error } = await supabase.from('cerco_projects').select('id, name, created_at, data').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      setProjects(data || []);
      setShowLoadModal(true);
    } catch (e) {
      console.error(e);
      alert("Error al obtener la lista de proyectos: " + e.message);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const loadSelectedProject = (project) => {
      if (!project.data) return;
      dispatch({ type: 'LOAD_PROJECT', payload: {
         project: { ...(project.data.project || { dimensions: {width: 3000, height: 3000} }), id: project.id, name: project.name },
         elements: project.data.elements || [],
         segments: project.data.segments || [],
         nodes: project.data.nodes || [],
         connections: project.data.connections || [],
      }});
      setShowLoadModal(false);
  };
  
  const deleteProject = async (e, projectId, projectName) => {
      e.stopPropagation(); // Prevent loading the project
      if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el proyecto "${projectName}"?`)) {
          return;
      }
      setIsLoadingProjects(true);
      try {
         const { error } = await supabase.from('cerco_projects').delete().eq('id', projectId);
         if (error) throw error;
         setProjects(projects.filter(p => p.id !== projectId));
      } catch (err) {
         console.error(err);
         alert("Error eliminando proyecto: " + err.message);
      } finally {
         setIsLoadingProjects(false);
      }
  };

  return (
    <div className={`h-16 border-b flex items-center justify-between px-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-4">
        <h1 className="font-bold text-lg">CUBI Diseñador de Cercos</h1>
        <div className="h-6 w-px bg-slate-300 mx-2"></div>
        <input 
          type="text" 
          value={state.project.name}
          onChange={(e) => dispatch({ type: 'UPDATE_PROJECT', payload: { name: e.target.value } })}
          className={`px-3 py-1 rounded text-sm border font-medium ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}
        />

        <div className="h-6 w-px bg-slate-300 mx-2"></div>

        <div className={`flex rounded overflow-hidden text-xs font-bold border ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>
          <button 
            onClick={() => dispatch({ type: 'SET_DESIGN_MODE', payload: false })}
            className={`px-3 py-1.5 transition-colors ${!state.ui.designMode ? 'bg-blue-600 text-white' : (darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100')}`}
          >
            BOCETO / LAYOUT
          </button>
          <button 
            onClick={() => dispatch({ type: 'SET_DESIGN_MODE', payload: true })}
            className={`px-3 py-1.5 transition-colors ${state.ui.designMode ? 'bg-orange-500 text-white' : (darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100')}`}
          >
            FÍSICO / DISEÑO
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={handleUndo} disabled={state.history.past.length === 0} className="p-2 rounded hover:bg-slate-200 disabled:opacity-50">
          <Undo className="w-5 h-5" />
        </button>
        <button onClick={handleRedo} disabled={state.history.future.length === 0} className="p-2 rounded hover:bg-slate-200 disabled:opacity-50">
          <Redo className="w-5 h-5" />
        </button>

        <div className="h-6 w-px bg-slate-300 mx-2"></div>

        <button onClick={() => handleZoom(-0.1)} className="p-2 rounded hover:bg-slate-200">
          <ZoomOut className="w-5 h-5" />
        </button>
        <span className="text-sm font-mono w-12 text-center">{Math.round(state.view.zoom * 100)}%</span>
        <button onClick={() => handleZoom(0.1)} className="p-2 rounded hover:bg-slate-200">
          <ZoomIn className="w-5 h-5" />
        </button>
        <button onClick={() => dispatch({ type: 'SET_VIEW', payload: { zoom: 1, panX: 0, panY: 0 } })} className="p-2 rounded hover:bg-slate-200">
          <Maximize className="w-5 h-5" />
        </button>

        <div className="h-6 w-px bg-slate-300 mx-2"></div>
        
        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
          <input 
            type="checkbox" 
            checked={state.ui.showWireLabels} 
            onChange={() => dispatch({ type: 'TOGGLE_WIRE_LABELS' })}
            className="w-4 h-4 rounded text-blue-600"
          />
          Etiquetas Hilos
        </label>

        <div className="h-6 w-px bg-slate-300 mx-2"></div>

        <button 
          onClick={fetchProjects}
          disabled={isLoadingProjects}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-sm transition-colors disabled:opacity-50"
        >
          {isLoadingProjects ? <Loader className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
          Abrir
        </button>
        <button 
          onClick={saveProject} 
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-sm transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar
        </button>
        <button 
          onClick={exportToPNG}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors disabled:opacity-50"
        >
          {isExporting ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Exportar PNG
        </button>
      </div>

      {showLoadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-xl shadow-xl flex flex-col max-h-[80vh] ${darkMode ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-900'}`}>
            <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <h2 className="font-bold text-lg">Abrir Proyecto</h2>
              <button onClick={() => setShowLoadModal(false)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No tienes proyectos guardados.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map(proj => (
                    <div key={proj.id} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${darkMode ? 'border-slate-700 hover:bg-slate-700 hover:border-slate-600' : 'border-slate-200 hover:bg-slate-50 hover:border-blue-300'}`}>
                      <button 
                        onClick={() => loadSelectedProject(proj)}
                        className="flex-1 text-left"
                      >
                        <div className="font-bold text-base mb-1">{proj.name || 'Proyecto sin nombre'}</div>
                        <div className="text-xs text-slate-500 flex justify-between pr-2">
                          <span>{new Date(proj.created_at).toLocaleDateString()}</span>
                          <span>{proj.data?.elements?.length || 0} elementos</span>
                        </div>
                      </button>
                      <button 
                         onClick={(e) => deleteProject(e, proj.id, proj.name)}
                         className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                         title="Eliminar Proyecto"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopBar;
