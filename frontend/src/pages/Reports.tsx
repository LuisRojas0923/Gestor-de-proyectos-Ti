import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MaterialCard, MaterialTypography } from '../components/atoms';
import RemedyReport from './Reports/sections/RemedyReport';
import ExecutiveReport from './Reports/sections/ExecutiveReport';
import QualityReport from './Reports/sections/QualityReport';
import TeamPerformance from './Reports/sections/TeamPerformance';

const Reports: React.FC = () => {
  const { state } = useAppContext();
  const { darkMode } = state;
  
  const [activeTab, setActiveTab] = useState('remedy');

  const tabs = [
    { id: 'remedy', label: 'Casos Remedy' },
    { id: 'executive', label: 'Reporte Ejecutivo' },
    { id: 'quality', label: 'Calidad' },
    { id: 'performance', label: 'Rendimiento' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
        <MaterialCard darkMode={darkMode}>
          <MaterialCard.Header>
          <MaterialTypography variant="h4" darkMode={darkMode}>
            📊 Centro de Reportes
                </MaterialTypography>
            <MaterialTypography variant="body2" darkMode={darkMode} className="mt-2">
            Análisis completo de desarrollos, calidad y rendimiento
            </MaterialTypography>
          </MaterialCard.Header>
      </MaterialCard>

      {/* Navegación */}
      <MaterialCard darkMode={darkMode}>
          <MaterialCard.Content>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : darkMode
                    ? 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                    : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
                  </div>
                </MaterialCard.Content>
              </MaterialCard>
              
      {/* Contenido */}
      <MaterialCard darkMode={darkMode}>
                <MaterialCard.Content>
          <MaterialTypography variant="h6" darkMode={darkMode} className="mb-4">
            {tabs.find(t => t.id === activeTab)?.label}
                      </MaterialTypography>
          

          {activeTab === 'remedy' && (
            <RemedyReport darkMode={darkMode} />
          )}

          {activeTab === 'executive' && (
            <ExecutiveReport darkMode={darkMode} />
          )}

          {activeTab === 'quality' && (
            <QualityReport darkMode={darkMode} />
          )}

          {activeTab === 'performance' && (
            <TeamPerformance darkMode={darkMode} />
          )}
          </MaterialCard.Content>
        </MaterialCard>
    </div>
  );
};

export default Reports;