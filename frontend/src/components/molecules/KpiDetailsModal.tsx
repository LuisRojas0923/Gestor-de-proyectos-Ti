import React from 'react';
import { KpiDetail, KpiSummary } from '../../hooks/useKpiDetails';
import Modal from './Modal';
import { Title, Text, MaterialCard } from '../atoms';

interface KpiDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: KpiSummary;
  details: KpiDetail[];
  title: string;
  darkMode: boolean;
}

const KpiDetailsModal: React.FC<KpiDetailsModalProps> = ({
  isOpen,
  onClose,
  summary,
  details,
  title,
  darkMode
}) => {
  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'A TIEMPO':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'TARDÍO':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'INCUMPLIMIENTO (múltiples entregas)':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      case 'SIN DESPLIEGUE':
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="full"
      showCloseButton={true}
    >
      <div className="overflow-y-auto max-h-[70vh]">
        <Text variant="body2" color="secondary" className="mb-4">
          Detalle de cálculos y origen de datos
        </Text>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <MaterialCard className={`${darkMode ? 'bg-neutral-700' : 'bg-blue-50'} !p-4`}>
            <Text variant="caption" weight="medium" color={darkMode ? 'secondary' : 'primary'}>
              Total Entregas
            </Text>
            <Title variant="h3" weight="bold">
              {summary.total_entregas}
            </Title>
          </MaterialCard>

          <MaterialCard className={`${darkMode ? 'bg-neutral-700' : 'bg-green-50'} !p-4`}>
            <Text variant="caption" weight="medium" color={darkMode ? 'secondary' : 'primary'}>
              A Tiempo
            </Text>
            <Title variant="h3" weight="bold">
              {summary.entregas_a_tiempo}
            </Title>
          </MaterialCard>

          <MaterialCard className={`${darkMode ? 'bg-neutral-700' : 'bg-red-50'} !p-4`}>
            <Text variant="caption" weight="medium" color={darkMode ? 'secondary' : 'primary'}>
              Tardías
            </Text>
            <Title variant="h3" weight="bold">
              {summary.entregas_tardias}
            </Title>
          </MaterialCard>

          <MaterialCard className={`${darkMode ? 'bg-neutral-700' : 'bg-purple-50'} !p-4`}>
            <Text variant="caption" weight="medium" color={darkMode ? 'secondary' : 'primary'}>
              Cumplimiento
            </Text>
            <Title variant="h3" weight="bold">
              {summary.porcentaje_cumplimiento}%
            </Title>
          </MaterialCard>
        </div>

        {/* Details Table */}
        <MaterialCard className="!p-0 overflow-hidden">
          <div className={`${darkMode ? 'bg-neutral-600' : 'bg-gray-50'} px-6 py-3 border-b border-neutral-200 dark:border-neutral-700`}>
            <Title variant="h4" weight="semibold">
              Detalle por Desarrollo
            </Title>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${darkMode ? 'bg-neutral-600' : 'bg-gray-50'
                }`}>
                <tr>
                  <th className="px-4 py-3 text-left">
                    <Text variant="caption" weight="medium" color="secondary" className="uppercase tracking-wider">
                      Desarrollo
                    </Text>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Text variant="caption" weight="medium" color="secondary" className="uppercase tracking-wider">
                      Proveedor
                    </Text>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Text variant="caption" weight="medium" color="secondary" className="uppercase tracking-wider">
                      Fecha Compromiso
                    </Text>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Text variant="caption" weight="medium" color="secondary" className="uppercase tracking-wider">
                      Fecha Real
                    </Text>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Text variant="caption" weight="medium" color="secondary" className="uppercase tracking-wider">
                      Desviación
                    </Text>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Text variant="caption" weight="medium" color="secondary" className="uppercase tracking-wider">
                      Estado
                    </Text>
                  </th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? 'bg-neutral-700' : 'bg-white'
                } divide-y ${darkMode ? 'divide-neutral-600' : 'divide-gray-200'
                }`}>
                {details.map((detail, index) => (
                  <tr key={`${detail.development_id}-${index}`}>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <Text weight="medium">
                          {detail.development_name}
                        </Text>
                        <Text variant="caption" color="secondary">
                          {detail.development_id}
                        </Text>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <Text>
                          {detail.provider_homologado}
                        </Text>
                        <Text variant="caption" color="secondary">
                          {detail.provider_original}
                        </Text>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Text>
                        {formatDate(
                          detail.fecha_compromiso_original ||
                          detail.fecha_analisis_comprometida ||
                          detail.fecha_propuesta_comprometida
                        )}
                      </Text>
                    </td>
                    <td className="px-4 py-4">
                      <Text>
                        {formatDate(
                          detail.fecha_real_entrega ||
                          detail.fecha_real_propuesta ||
                          detail.fecha_real_aprobacion
                        )}
                      </Text>
                    </td>
                    <td className="px-4 py-4">
                      <Text>
                        {detail.dias_desviacion > 0 ? `+${detail.dias_desviacion}` : detail.dias_desviacion} días
                      </Text>
                    </td>
                    <td className="px-4 py-4">
                      <Text as="span" variant="caption" weight="semibold" className={`inline-flex px-2 py-1 uppercase rounded-full ${getStatusColor(detail.estado_entrega)}`}>
                        {detail.estado_entrega}
                      </Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MaterialCard>

        {/* Period Info */}
        <MaterialCard className="mt-4 !p-4">
          <Text variant="body2" color="secondary">
            <strong>Período analizado:</strong> {
              summary.period_start && summary.period_end
                ? `${formatDate(summary.period_start)} - ${formatDate(summary.period_end)}`
                : 'Últimos 90 días'
            }
            {summary.provider_filter && (
              <Text as="span" variant="body2" color="secondary"> | <strong>Proveedor:</strong> {summary.provider_filter}</Text>
            )}
          </Text>
        </MaterialCard>
      </div>
    </Modal >
  );
};

export default KpiDetailsModal;
