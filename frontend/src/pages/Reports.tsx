import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import PortalReport from './Reports/sections/PortalReport';
import ExecutiveReport from './Reports/sections/ExecutiveReport';
import QualityReport from './Reports/sections/QualityReport';
import TeamPerformance from './Reports/sections/TeamPerformance';
import {
  BarChart3,
  FileText,
  ShieldCheck,
  Users,
  Download,
  Filter
} from 'lucide-react';

const Reports: React.FC = () => {
  const { state } = useAppContext();
  const { darkMode } = state;

  const [activeTab, setActiveTab] = useState('portal');

  const tabs = [
    { id: 'portal', label: 'Tickets del Portal', icon: FileText },
    { id: 'executive', label: 'Reporte Ejecutivo', icon: BarChart3 },
    { id: 'quality', label: 'Calidad', icon: ShieldCheck },
    { id: 'performance', label: 'Rendimiento', icon: Users },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-4xl font-black ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            Centro de Reportes
          </h1>
          <p className="text-gray-500 font-medium">Análisis avanzado de desarrollos y gestión de ANS</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className={`flex items-center space-x-2 px-4 py-2 rounded-xl border ${darkMode ? 'border-neutral-700 hover:bg-neutral-800' : 'border-gray-200 hover:bg-gray-50'} transition-all text-sm font-bold`}>
            <Download size={18} />
            <span>Exportar Todo</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation (Glassmorphism inspired) */}
      <div className={`${darkMode ? 'bg-neutral-800/50' : 'bg-white/50'} backdrop-blur-md p-1.5 rounded-2xl border ${darkMode ? 'border-neutral-700' : 'border-gray-100'} inline-flex`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300 ${isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                }`}
            >
              <Icon size={18} />
              <span className="font-bold text-sm">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className={`${darkMode ? 'bg-neutral-800' : 'bg-white'} rounded-[2.5rem] p-8 shadow-sm border ${darkMode ? 'border-neutral-700' : 'border-gray-100'} transition-all animate-in fade-in slide-in-from-bottom-4 duration-500`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              {React.createElement(tabs.find(t => t.id === activeTab)?.icon || FileText, { size: 20 })}
            </div>
            <div>
              <h2 className="text-xl font-bold">{tabs.find(t => t.id === activeTab)?.label}</h2>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Dataset: Production 2024</p>
            </div>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Filter size={20} />
          </button>
        </div>

        <div className="min-h-[500px]">
          {activeTab === 'portal' && <PortalReport darkMode={darkMode} />}
          {activeTab === 'executive' && <ExecutiveReport darkMode={darkMode} />}
          {activeTab === 'quality' && <QualityReport darkMode={darkMode} />}
          {activeTab === 'performance' && <TeamPerformance darkMode={darkMode} />}
        </div>
      </div>
    </div>
  );
};

export default Reports;