import { TrendingUp, FileText, ClipboardList, Target, CheckCircle } from 'lucide-react';
import React, { useState } from 'react';
import { MetricCard, IndicatorsHeader, QualityChart, KpiDetailsModal, CalidadPrimeraEntregaModal } from '../components/molecules';
import { useAppContext } from '../context/AppContext';
import { useKpiData, useProviders } from '../hooks/useKpiData';
import { useKpiDetails, KpiDetailsResponse, CalidadPrimeraEntregaResponse } from '../hooks/useKpiDetails';


const Indicators: React.FC = () => {
  const { state } = useAppContext();
  const { darkMode } = state;
  
  // Estado local para el proveedor seleccionado
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<KpiDetailsResponse | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('');
  
  // Estado específico para el modal de calidad en primera entrega
  const [isCalidadModalOpen, setIsCalidadModalOpen] = useState(false);
  const [calidadModalData, setCalidadModalData] = useState<CalidadPrimeraEntregaResponse | null>(null);
  
  // Hooks personalizados para manejar datos
  const { kpiData, providerQualityData, loading, error } = useKpiData(selectedProvider);
  const { availableProviders } = useProviders();
  const { getDevelopmentComplianceDetails, getAnalysisComplianceDetails, getProposalComplianceDetails, getGlobalCompleteComplianceDetails, getCalidadPrimeraEntregaDetails } = useKpiDetails();

  // Visibilidad conmutable de tarjetas
  const [showAnalysisCard, setShowAnalysisCard] = useState<boolean>(true);
  const [showProposalCard, setShowProposalCard] = useState<boolean>(true);

  // Función para manejar el cambio de proveedor
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
  };

  // Función para manejar el click en la tarjeta de cumplimiento de desarrollo
  const handleDevelopmentComplianceClick = async () => {
    try {
      const details = await getDevelopmentComplianceDetails(
        selectedProvider === 'all' ? undefined : selectedProvider
      );
      setModalData(details);
      setModalTitle('Cumplimiento de Fechas Desarrollo');
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error obteniendo detalles del KPI:', error);
    }
  };

  // Función para manejar el click en la tarjeta de cumplimiento de análisis
  const handleAnalysisComplianceClick = async () => {
    try {
      const details = await getAnalysisComplianceDetails(
        selectedProvider === 'all' ? undefined : selectedProvider
      );
      setModalData(details);
      setModalTitle('Cumplimiento de Fechas Análisis');
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error obteniendo detalles del KPI:', error);
    }
  };

  // Función para manejar el click en la tarjeta de cumplimiento de propuesta
  const handleProposalComplianceClick = async () => {
    try {
      const details = await getProposalComplianceDetails(
        selectedProvider === 'all' ? undefined : selectedProvider
      );
      setModalData(details);
      setModalTitle('Cumplimiento de Fechas Propuesta');
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error obteniendo detalles del KPI:', error);
    }
  };

  // Función para manejar el click en la tarjeta de cumplimiento global completo
  const handleGlobalCompleteComplianceClick = async () => {
    try {
      const details = await getGlobalCompleteComplianceDetails(
        selectedProvider === 'all' ? undefined : selectedProvider
      );
      setModalData(details);
      setModalTitle('Cumplimiento de Fechas Global Completo');
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error obteniendo detalles del KPI:', error);
    }
  };

  // Función para manejar el click en la tarjeta de calidad en primera entrega
  const handleCalidadPrimeraEntregaClick = async () => {
    try {
      const details = await getCalidadPrimeraEntregaDetails(
        selectedProvider === 'all' ? undefined : selectedProvider
      );
      setCalidadModalData(details);
      setIsCalidadModalOpen(true);
    } catch (error) {
      console.error('Error obteniendo detalles del KPI:', error);
    }
  };

  // Función para cerrar el modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalData(null);
    setModalTitle('');
  };

  // Función para cerrar el modal de calidad
  const handleCloseCalidadModal = () => {
    setIsCalidadModalOpen(false);
    setCalidadModalData(null);
  };


  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <IndicatorsHeader
          darkMode={darkMode}
          selectedProvider={selectedProvider}
          availableProviders={availableProviders}
          loading={loading}
          error={error}
          onProviderChange={handleProviderChange}
        />
      </div>

      {/* Controles de visibilidad (switches simples) */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showAnalysisCard}
            onChange={(e) => setShowAnalysisCard(e.target.checked)}
          />
          <span className={darkMode ? 'text-neutral-200' : 'text-neutral-700'}>
            Mostrar "Cumplimiento Fechas Análisis"
          </span>
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showProposalCard}
            onChange={(e) => setShowProposalCard(e.target.checked)}
          />
          <span className={darkMode ? 'text-neutral-200' : 'text-neutral-700'}>
            Mostrar "Cumplimiento Fechas Propuesta"
          </span>
        </label>
      </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <MetricCard
                title="Cumplimiento Global Completo"
                value={`${kpiData.globalCompleteCompliance?.value || 0}%`}
                change={kpiData.globalCompleteCompliance?.change || { value: 0, type: 'increase' }}
                icon={Target}
                color="yellow"
                onClick={handleGlobalCompleteComplianceClick}
              />
              {showAnalysisCard && (
                <MetricCard
                  title="Cumplimiento Fechas Análisis"
                  value={`${kpiData.analysisCompliance?.value || 0}%`}
                  change={kpiData.analysisCompliance?.change || { value: 0, type: 'increase' }}
                  icon={ClipboardList}
                  color="blue"
                  onClick={handleAnalysisComplianceClick}
                />
              )}
              {showProposalCard && (
                <MetricCard
                  title="Cumplimiento Fechas Propuesta"
                  value={`${kpiData.proposalCompliance?.value || 0}%`}
                  change={kpiData.proposalCompliance?.change || { value: 0, type: 'increase' }}
                  icon={FileText}
                  color="blue"
                  onClick={handleProposalComplianceClick}
                />
              )}
              <MetricCard
                title="Cumplimiento Fechas Desarrollo"
                value={`${kpiData.globalCompliance?.value || 0}%`}
                change={kpiData.globalCompliance?.change || { value: 0, type: 'increase' }}
                icon={TrendingUp}
                color="green"
                onClick={handleDevelopmentComplianceClick}
              />
              <MetricCard
                title="Calidad en Primera Entrega"
                value={`${kpiData.calidadPrimeraEntrega?.value || 0}%`}
                change={kpiData.calidadPrimeraEntrega?.change || { value: 0, type: 'increase' }}
                icon={CheckCircle}
                color="green"
                onClick={handleCalidadPrimeraEntregaClick}
              />
            </div>
      
      {/* Gráfico de Calidad por Proveedor */}
      <QualityChart data={providerQualityData} darkMode={darkMode} />

      {/* Modal de detalles del KPI */}
      {modalData && (
        <KpiDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          summary={modalData.summary}
          details={modalData.details}
          title={modalTitle}
          darkMode={darkMode}
        />
      )}

      {/* Modal específico para Calidad en Primera Entrega */}
      {calidadModalData && (
        <CalidadPrimeraEntregaModal
          isOpen={isCalidadModalOpen}
          onClose={handleCloseCalidadModal}
          data={calidadModalData}
          title="Calidad en Primera Entrega"
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default Indicators;
