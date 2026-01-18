import React from 'react';
import { CalidadPrimeraEntregaResponse } from '../../hooks/useKpiDetails';
import Modal from './Modal';

interface CalidadPrimeraEntregaModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CalidadPrimeraEntregaResponse;
  title: string;
  darkMode: boolean;
}

const CalidadPrimeraEntregaModal: React.FC<CalidadPrimeraEntregaModalProps> = ({
  isOpen,
  onClose,
  data,
  title,
  darkMode
}) => {
  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'SIN DEVOLUCIONES':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'CON DEVOLUCIONES':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
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
          Detalle de entregas y devoluciones
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
              {data.summary.total_entregas}
            </p>
          </div>

          <div className={`${darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-green-50 border-green-200'
            } border rounded-lg p-4`}>
            <p className={`text-sm font-medium ${darkMode ? 'text-neutral-400' : 'text-green-600'
              }`}>
              Sin Devoluciones
            </p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-green-900'
              }`}>
              {data.summary.entregas_sin_devoluciones}
            </p>
          </div>

          <div className={`${darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-red-50 border-red-200'
            } border rounded-lg p-4`}>
            <p className={`text-sm font-medium ${darkMode ? 'text-neutral-400' : 'text-red-600'
              }`}>
              Con Devoluciones
            </p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-red-900'
              }`}>
              {data.summary.entregas_con_devoluciones}
            </p>
          </div>

          <div className={`${darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-purple-50 border-purple-200'
            } border rounded-lg p-4`}>
            <p className={`text-sm font-medium ${darkMode ? 'text-neutral-400' : 'text-purple-600'
              }`}>
              Calidad
            </p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-purple-900'
              }`}>
              {data.summary.porcentaje_calidad}%
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
                    Fecha Entrega
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-neutral-300' : 'text-gray-500'
                    } uppercase tracking-wider`}>
                    Fecha Devolución
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-neutral-300' : 'text-gray-500'
                    } uppercase tracking-wider`}>
                    Estado Calidad
                  </th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? 'bg-neutral-700' : 'bg-white'
                } divide-y ${darkMode ? 'divide-neutral-600' : 'divide-gray-200'
                }`}>
                {data.details.map((detail, index) => (
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
                      {formatDate(detail.fecha_entrega)}
                    </td>
                    <td className={`px-4 py-4 text-sm ${darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                      {formatDate(detail.fecha_devolucion)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 text-[10px] font-semibold uppercase rounded-full ${getStatusColor(detail.estado_calidad)}`}>
                        {detail.estado_calidad}
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
              data.summary.period.start && data.summary.period.end
                ? `${formatDate(data.summary.period.start)} - ${formatDate(data.summary.period.end)}`
                : 'Últimos 90 días'
            }
            {data.summary.provider_filter && (
              <span> | <strong>Proveedor:</strong> {data.summary.provider_filter}</span>
            )}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default CalidadPrimeraEntregaModal;
