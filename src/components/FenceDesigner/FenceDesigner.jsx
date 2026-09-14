import React from 'react';
import { DesignerProvider } from './context/DesignerContext';
import TopBar from './components/TopBar';
import Toolbar from './components/Toolbar';
import Workspace from './components/Workspace';
import PropertiesPanel from './components/PropertiesPanel';

const FenceDesigner = ({ darkMode }) => {
  return (
    <DesignerProvider>
      <div className={`h-[calc(100vh-64px)] w-full flex flex-col ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'} overflow-hidden`}>
        <TopBar darkMode={darkMode} />
        
        <div className="flex flex-1 overflow-hidden">
          <Toolbar darkMode={darkMode} />
          <Workspace darkMode={darkMode} />
          <PropertiesPanel darkMode={darkMode} />
        </div>
      </div>
    </DesignerProvider>
  );
};

export default FenceDesigner;
