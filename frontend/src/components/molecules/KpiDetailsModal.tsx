import React from 'react';
import { KpiDetail, KpiSummary } from '../../hooks/useKpiDetails';
import Modal from './Modal';

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
        <p className={`text-sm mb-4 ${darkMode ? 'text-neutral-400' : 'text-gray-600'
          }`}>
          Detalle de cálculos y origen de datos
        </p>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`${darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-blue-50 border-blue-200'
            } border rounded-lg p-4`}>
            <p className={`text-sm font-medium ${darkMode ? 'text-neutral-400' : 'text-blue-600'
              }`}>
              Total Entregas
            </p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-blue-900'
              }`}>
              {summary.total_entregas}
            </p>
          </div>

          <div className={`${darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-green-50 border-green-200'
            } border rounded-lg p-4`}>
            <p className={`text-sm font-medium ${darkMode ? 'text-neutral-400' : 'text-green-600'
              }`}>
              A Tiempo
            </p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-green-900'
              }`}>
              {summary.entregas_a_tiempo}
            </p>
          </div>

          <div className={`${darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-red-50 border-red-200'
            } border rounded-lg p-4`}>
            <p className={`text-sm font-medium ${darkMode ? 'text-neutral-400' : 'text-red-600'
              }`}>
              Tardías
            </p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-red-900'
              }`}>
              {summary.entregas_tardias}
            </p>
          </div>

          <div className={`${darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-purple-50 border-purple-200'
            } border rounded-lg p-4`}>
            <p className={`text-sm font-medium ${darkMode ? 'text-neutral-400' : 'text-purple-600'
              }`}>
              Cumplimiento
            </p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-purple-900'
              }`}>
              {summary.porcentaje_cumplimiento}%
            </p>
          </div>
        </div>

        {/* Details Table */}
        <div className={`${darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-white border-gray-200'
          } border rounded-lg overflow-hidden`}>
          <div className={`${darkMode ? 'bg-neutral-600' : 'bg-gray-50'
            } px-6 py-3 border-b`}>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'
              }`}>
              Detalle por Desarrollo
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${darkMode ? 'bg-neutral-600' : 'bg-gray-50'
                }`}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-neutral-300' : 'text-gray-500'
                    } uppercase tracking-wider`}>
                    Desarrollo
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-neutral-300' : 'text-gray-500'
                    } uppercase tracking-wider`}>
                    Proveedor
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-neutral-300' : 'text-gray-500'
                    } uppercase tracking-wider`}>
                    Fecha Compromiso
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-neutral-300' : 'text-gray-500'
                    } uppercase tracking-wider`}>
                    Fecha Real
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-neutral-300' : 'text-gray-500'
                    } uppercase tracking-wider`}>
                    Desviación
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-neutral-300' : 'text-gray-500'
                    } uppercase tracking-wider`}>
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? 'bg-neutral-700' : 'bg-white'
                } divide-y ${darkMode ? 'divide-neutral-600' : 'divide-gray-200'
                }`}>
                {details.map((detail, index) => (
                  <tr key={`${detail.development_id}-${index}`}>
                    <td className="px-4 py-4">
                      <div>
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                          {detail.development_name}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-gray-500'
                          }`}>
                          {detail.development_id}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                          {detail.provider_homologado}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-gray-500'
                          }`}>
                          {detail.provider_original}
                        </p>
                      </div>
                    </td>
                    <td className={`px-4 py-4 text-sm ${darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                      {formatDate(
                        detail.fecha_compromiso_original ||
                        detail.fecha_analisis_comprometida ||
                        detail.fecha_propuesta_comprometida
                      )}
                    </td>
                    <td className={`px-4 py-4 text-sm ${darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                      {formatDate(
                        detail.fecha_real_entrega ||
                        detail.fecha_real_propuesta ||
                        detail.fecha_real_aprobacion
                      )}
                    </td>
                    <td className={`px-4 py-4 text-sm ${darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                      {detail.dias_desviacion > 0 ? `+${detail.dias_desviacion}` : detail.dias_desviacion} días
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 text-[10px] font-semibold uppercase rounded-full ${getStatusColor(detail.estado_entrega)}`}>
                        {detail.estado_entrega}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Period Info */}
        <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-gray-50 border-gray-200'
          } border`}>
          <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-gray-600'
            }`}>
            <strong>Período analizado:</strong> {
              summary.period_start && summary.period_end
                ? `${formatDate(summary.period_start)} - ${formatDate(summary.period_end)}`
                : 'Últimos 90 días'
            }
            {summary.provider_filter && (
              <span> | <strong>Proveedor:</strong> {summary.provider_filter}</span>
            )}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default KpiDetailsModal;
