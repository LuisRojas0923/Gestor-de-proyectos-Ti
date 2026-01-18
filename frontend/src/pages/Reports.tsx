import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import PortalReport from './Reports/sections/PortalReport';
import ExecutiveReport from './Reports/sections/ExecutiveReport';
import QualityReport from './Reports/sections/QualityReport';
import TeamPerformance from './Reports/sections/TeamPerformance';
import { Button, Text } from '../components/atoms';
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
          <Text as="h1" variant="h1" weight="bold" color="text-primary" className="mb-2">
            Centro de Reportes
          </Text>
          <Text as="p" variant="body1" weight="medium" color="gray">
            Análisis avanzado de desarrollos y gestión de ANS
          </Text>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            icon={Download}
            onClick={() => console.log('Exportando todo...')}
          >
            Exportar Todo
          </Button>
        </div>
      </div>

      {/* Tabs Navigation (Glassmorphism inspired) */}
      <div className="bg-[var(--color-surface-variant)]/50 backdrop-blur-md p-1.5 rounded-2xl border border-[var(--color-border)] inline-flex">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isActive ? 'primary' : 'ghost'}
              onClick={() => setActiveTab(tab.id)}
              icon={tab.icon}
              className={`px-6 py-3 rounded-xl transition-all duration-300 ${!isActive ? 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]' : ''}`}
            >
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="bg-[var(--color-surface)] rounded-[2.5rem] p-8 shadow-sm border border-[var(--color-border)] transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-variant)] flex items-center justify-center text-[var(--color-primary)]">
              {React.createElement(tabs.find(t => t.id === activeTab)?.icon || FileText, { size: 20 })}
            </div>
            <div>
              <Text as="h2" variant="h5" weight="bold">
                {tabs.find(t => t.id === activeTab)?.label}
              </Text>
              <Text as="p" variant="caption" weight="medium" color="gray" className="uppercase tracking-widest">
                Dataset: Production 2024
              </Text>
            </div>
          </div>
          <Button
            variant="ghost"
            className="p-2 text-gray-400 hover:text-[var(--color-primary)] transition-colors"
          >
            <Filter size={20} />
          </Button>
        </div>

        <div className="min-h-[500px]">
          {activeTab === 'portal' && <PortalReport />}
          {activeTab === 'executive' && <ExecutiveReport />}
          {activeTab === 'quality' && <QualityReport darkMode={darkMode} />}
          {activeTab === 'performance' && <TeamPerformance darkMode={darkMode} />}
        </div>
      </div>
    </div>
  );
};

export default Reports;