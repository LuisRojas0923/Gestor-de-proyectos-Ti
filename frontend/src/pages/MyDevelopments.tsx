import React, { useEffect, useRef } from 'react';
import { Eye, Search, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useDevelopments } from './MyDevelopments/hooks/useDevelopments';
import { useFilters } from './MyDevelopments/hooks/useFilters';
import { useModals } from './MyDevelopments/hooks/useModals';
import { ImportModal } from './MyDevelopments/components/modals/ImportModal';
import { DevelopmentWithCurrentStatus } from '../types';
import { useImportDevelopments } from './MyDevelopments/hooks/useImportDevelopments';
import { useNotifications } from '../components/notifications/NotificationsContext';

const MyDevelopments: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode } = useAppContext().state;
  const { developments, loadDevelopments } = useDevelopments();
  const filters = useFilters(developments);
  const { isImportModalOpen, setImportModalOpen } = useModals();
  const { importDevelopments } = useImportDevelopments();
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadDevelopments();
  }, [loadDevelopments]);

  const handleImport = async (importedData: Partial<DevelopmentWithCurrentStatus>[]) => {
    const ok = await importDevelopments(importedData);
    if (ok) {
      addNotification('success', 'Importación completada exitosamente');
      await loadDevelopments();
        } else {
      addNotification('error', 'Error al importar. Revisa el archivo o el backend.');
    }
    setImportModalOpen(false);
  };

  // Notificación informativa al cargar desarrollos (una sola vez)
  const hasShownLoadNotif = useRef(false);
  useEffect(() => {
    if (!hasShownLoadNotif.current && developments && developments.length > 0) {
      addNotification('info', `${developments.length} desarrollos cargados`);
      hasShownLoadNotif.current = true;
    }
  }, [developments, addNotification]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En curso': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'Pendiente': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'Completado': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  return (
        <div className="space-y-6">
      <div className="flex justify-between items-center">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
              Mis Desarrollos
            </h1>
                <button
          onClick={() => setImportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Upload size={16} />
          Importar
                </button>
              </div>
              
      {/* Filtros Avanzados */}
      <div className={`${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'} border rounded-xl p-6`}>
            <div className="space-y-4">
              {/* Fila 1: Búsqueda y Agrupación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`} size={20} />
                  <input
                    type="text"
                    placeholder="Buscar por ID o nombre..."
                value={filters.searchTerm}
                onChange={(e) => filters.setSearchTerm(e.target.value)}
                    className={`pl-10 pr-4 py-2 w-full rounded-lg border transition-colors ${
                      darkMode
                        ? 'bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400'
                        : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-500'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
                  />
                </div>

                <select
              value={filters.groupBy}
              onChange={(e) => filters.setGroupBy(e.target.value as any)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-neutral-700 border-neutral-600 text-white'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
                >
                  <option value="none">Sin agrupar</option>
                  <option value="provider">Agrupar por Proveedor</option>
                  <option value="module">Agrupar por Módulo</option>
                  <option value="responsible">Agrupar por Responsable</option>
                </select>
              </div>

              {/* Fila 2: Filtros de Organización */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <select
              value={filters.providerFilter}
              onChange={(e) => filters.setProviderFilter(e.target.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-neutral-700 border-neutral-600 text-white'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
                >
                  <option value="all">Todos los Proveedores</option>
              {filters.uniqueProviders.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <select
              value={filters.moduleFilter}
              onChange={(e) => filters.setModuleFilter(e.target.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-neutral-700 border-neutral-600 text-white'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
                >
                  <option value="all">Todos los Módulos</option>
              {filters.uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <select
              value={filters.responsibleFilter}
              onChange={(e) => filters.setResponsibleFilter(e.target.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-neutral-700 border-neutral-600 text-white'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
                >
                  <option value="all">Todos los Responsables</option>
              {filters.uniqueResponsibles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                <select
              value={filters.statusFilter}
              onChange={(e) => filters.setStatusFilter(e.target.value)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-neutral-700 border-neutral-600 text-white'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
                >
                  <option value="all">Todos los Estados</option>
              {filters.uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

      {/* Tabla de Desarrollos */}
      <div className={`${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'} border rounded-xl overflow-hidden`}>
        {Object.entries(filters.groupedDevelopments).map(([groupName, groupDevelopments]) => (
          <div key={groupName}>
            {filters.groupBy !== 'none' && (
              <div className={`px-4 py-2 ${darkMode ? 'bg-neutral-700 border-neutral-600' : 'bg-neutral-100 border-neutral-200'} border-b`}>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                  {groupName} ({groupDevelopments.length})
              </h3>
            </div>
          )}
            <table className="w-full">
              <thead className={darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-50 border-neutral-200'}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>ID</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>Nombre</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>Responsable</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>Proveedor</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>Estado</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>Acciones</th>
                            </tr>
                          </thead>
              <tbody>
                            {groupDevelopments.map((dev) => (
                  <tr key={dev.id} className={`${darkMode ? 'hover:bg-neutral-700' : 'hover:bg-neutral-100'} transition-colors`}>
                    <td className="px-4 py-3 text-sm font-medium text-primary-500">{dev.id}</td>
                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{dev.name}</td>
                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>{dev.responsible ?? 'N/A'}</td>
                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>{dev.provider ?? 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(dev.general_status)}`}>
                                    {dev.general_status}
                                  </span>
                                </td>
                    <td className="px-4 py-3 text-sm">
                      <button onClick={() => navigate(`/developments/${dev.id}?tab=bitacora`)} className={`${darkMode ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-900'} transition-colors`}>
                                      <Eye size={16} />
                                    </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                    </div>
                  ))}
                </div>

      {/* Modal de Importación */}
      <ImportModal
        isOpen={isImportModalOpen}
                          darkMode={darkMode}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
};

export default MyDevelopments;
