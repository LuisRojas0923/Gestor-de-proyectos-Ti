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
  
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard General' },
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
          
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              <MaterialTypography variant="body1" darkMode={darkMode}>
                Dashboard General - Aquí se mostrarán las métricas principales y KPIs del sistema.
                      </MaterialTypography>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MaterialCard darkMode={darkMode} className="bg-blue-50 dark:bg-blue-900/20">
                <MaterialCard.Content>
                    <MaterialTypography variant="h4" darkMode={darkMode} className="text-blue-600 dark:text-blue-400">
                      156
                      </MaterialTypography>
                    <MaterialTypography variant="body2" darkMode={darkMode}>
                      Total Desarrollos
                      </MaterialTypography>
                </MaterialCard.Content>
              </MaterialCard>
                <MaterialCard darkMode={darkMode} className="bg-green-50 dark:bg-green-900/20">
                <MaterialCard.Content>
                    <MaterialTypography variant="h4" darkMode={darkMode} className="text-green-600 dark:text-green-400">
                      89
                      </MaterialTypography>
                    <MaterialTypography variant="body2" darkMode={darkMode}>
                      Completados
                      </MaterialTypography>
                </MaterialCard.Content>
              </MaterialCard>
                <MaterialCard darkMode={darkMode} className="bg-yellow-50 dark:bg-yellow-900/20">
              <MaterialCard.Content>
                    <MaterialTypography variant="h4" darkMode={darkMode} className="text-yellow-600 dark:text-yellow-400">
                      2.3d
                          </MaterialTypography>
                          <MaterialTypography variant="body2" darkMode={darkMode}>
                      Tiempo Promedio
                          </MaterialTypography>
                  </MaterialCard.Content>
                </MaterialCard>
                <MaterialCard darkMode={darkMode} className="bg-purple-50 dark:bg-purple-900/20">
                  <MaterialCard.Content>
                    <MaterialTypography variant="h4" darkMode={darkMode} className="text-purple-600 dark:text-purple-400">
                      92%
                          </MaterialTypography>
                          <MaterialTypography variant="body2" darkMode={darkMode}>
                      SLA Cumplido
                          </MaterialTypography>
              </MaterialCard.Content>
            </MaterialCard>
              </div>
            </div>
          )}

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