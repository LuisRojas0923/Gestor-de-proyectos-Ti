import React, { useEffect, useRef } from 'react';
import { Eye, Search, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useDevelopments } from './MyDevelopments/hooks/useDevelopments';
import { useFilters } from './MyDevelopments/hooks/useFilters';
import { useModals } from './MyDevelopments/hooks/useModals';
import { ImportModal } from './MyDevelopments/components/modals/ImportModal';
import { DevelopmentWithCurrentStatus } from '../types';
import { useImportDevelopments } from './MyDevelopments/hooks/useImportDevelopments';
import { useNotifications } from '../components/notifications/NotificationsContext';
import { MaterialCard, MaterialTextField, MaterialSelect, MaterialButton, MaterialTypography } from '../components/atoms';

// Hook personalizado para persistir filtros
const usePersistedFilters = (filters: any) => {
  const STORAGE_KEY = 'myDevelopments_filters';
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Cargar filtros guardados al inicializar (solo una vez)
  useEffect(() => {
    const savedFilters = localStorage.getItem(STORAGE_KEY);
    if (savedFilters && !isInitialized) {
      try {
        const parsed = JSON.parse(savedFilters);
        // Aplicar filtros guardados
        if (parsed.searchTerm !== undefined) filters.setSearchTerm(parsed.searchTerm);
        if (parsed.sortBy) filters.setSortBy(parsed.sortBy);
        if (parsed.providerFilter) filters.setProviderFilter(parsed.providerFilter);
        if (parsed.moduleFilter) filters.setModuleFilter(parsed.moduleFilter);
        if (parsed.responsibleFilter) filters.setResponsibleFilter(parsed.responsibleFilter);
        if (parsed.statusFilter) filters.setStatusFilter(parsed.statusFilter);
        if (parsed.groupBy) filters.setGroupBy(parsed.groupBy);
        console.log('Filtros cargados:', parsed); // Debug
        setIsInitialized(true);
      } catch (error) {
        console.warn('Error cargando filtros guardados:', error);
        setIsInitialized(true);
      }
    } else {
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Guardar filtros cuando cambien (solo después de la inicialización)
  useEffect(() => {
    if (isInitialized) {
      const filtersToSave = {
        searchTerm: filters.searchTerm,
        sortBy: filters.sortBy,
        providerFilter: filters.providerFilter,
        moduleFilter: filters.moduleFilter,
        responsibleFilter: filters.responsibleFilter,
        statusFilter: filters.statusFilter,
        groupBy: filters.groupBy,
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtersToSave));
      console.log('Filtros guardados:', filtersToSave); // Debug
    }
  }, [
    isInitialized,
    filters.searchTerm,
    filters.sortBy,
    filters.providerFilter,
    filters.moduleFilter,
    filters.responsibleFilter,
    filters.statusFilter,
    filters.groupBy
  ]);
};

const MyDevelopments: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode } = useAppContext().state;
  const { developments, loadDevelopments } = useDevelopments();
  const filters = useFilters(developments);
  const { isImportModalOpen, setImportModalOpen } = useModals();
  const { importDevelopments } = useImportDevelopments();
  const { addNotification } = useNotifications();

  // Persistir filtros en localStorage
  usePersistedFilters(filters);

  // Función para limpiar todos los filtros
  const clearAllFilters = () => {
    filters.setSearchTerm('');
    filters.setSortBy('id');
    filters.setProviderFilter('all');
    filters.setModuleFilter('all');
    filters.setResponsibleFilter('all');
    filters.setStatusFilter('all');
    filters.setGroupBy('none');
    addNotification('success', 'Filtros limpiados');
  };

  // Cargar desarrollos al montar el componente
  useEffect(() => {
    loadDevelopments();
  }, [loadDevelopments]);

  // Notificación informativa (solo una vez)
  const hasShownLoadNotif = useRef(false);
  useEffect(() => {
    if (!hasShownLoadNotif.current && developments?.length > 0) {
      addNotification('info', `${developments.length} desarrollos cargados`);
      hasShownLoadNotif.current = true;
    }
  }, [developments, addNotification]);

  // Manejar importación
  const handleImport = async (importedData: Partial<DevelopmentWithCurrentStatus>[]) => {
    const success = await importDevelopments(importedData);
    if (success) {
      addNotification('success', 'Importación completada exitosamente');
      await loadDevelopments();
        } else {
      addNotification('error', 'Error al importar. Revisa el archivo o el backend.');
    }
    setImportModalOpen(false);
  };

  // Utilidades
  const getStatusColor = (status: string) => {
    const colors = {
      'En curso': 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
      'Pendiente': 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
      'Completado': 'text-green-600 bg-green-100 dark:bg-green-900/20',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
  };

  const handleColumnSort = (column: string) => {
    filters.setSortBy(column as any);
    filters.setSortOrder('asc');
  };

  // Opciones para los selects
  const sortOptions = [
    { value: 'id', label: 'ID' },
    { value: 'name', label: 'Nombre' },
    { value: 'provider', label: 'Proveedor' },
    { value: 'responsible', label: 'Responsable' },
    { value: 'status', label: 'Estado' },
    { value: 'module', label: 'Módulo' }
  ];

  const groupOptions = [
    { value: 'none', label: 'Sin agrupar' },
    { value: 'provider', label: 'Agrupar por Proveedor' },
    { value: 'module', label: 'Agrupar por Módulo' },
    { value: 'responsible', label: 'Agrupar por Responsable' }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
            <MaterialTypography variant="h3" darkMode={darkMode} className="font-bold">
              Mis Desarrollos
            </MaterialTypography>
        <MaterialButton
          onClick={() => setImportModalOpen(true)}
          variant="contained"
          color="primary"
          size="medium"
          icon={Upload}
          iconPosition="left"
          darkMode={darkMode}
        >
          Importar
        </MaterialButton>
              </div>
              
      {/* Panel de Filtros */}
      <MaterialCard darkMode={darkMode} elevation={1}>
        <MaterialCard.Header darkMode={darkMode}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
             <MaterialTypography variant="h6" darkMode={darkMode} className="font-semibold">
               Filtros y Ordenamiento
             </MaterialTypography>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                darkMode 
                  ? 'bg-primary-900/20 text-primary-300 border border-primary-700/30' 
                  : 'bg-primary-100 text-primary-700 border border-primary-200'
              }`}>
                {filters.filteredDevelopments.length} desarrollo{filters.filteredDevelopments.length !== 1 ? 's' : ''}
              </span>
            </div>
            <MaterialButton
              onClick={clearAllFilters}
              variant="text"
              size="small"
              icon={X}
              iconPosition="left"
              darkMode={darkMode}
              className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              Limpiar
            </MaterialButton>
          </div>
        </MaterialCard.Header>

        <MaterialCard.Content darkMode={darkMode} className="space-y-3">
          {/* Todos los controles en una sola fila */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            <MaterialTextField
              type="search"
              label="Búsqueda"
              placeholder="Buscar..."
              value={filters.searchTerm}
              onChange={(e) => filters.setSearchTerm(e.target.value)}
              icon={Search}
              iconPosition="left"
              darkMode={darkMode}
            />
            <MaterialSelect
              label="Ordenar"
              value={filters.sortBy}
              onChange={(e) => filters.setSortBy(e.target.value as any)}
              darkMode={darkMode}
              options={sortOptions}
            />
            <MaterialSelect
              label="Proveedor"
              value={filters.providerFilter}
              onChange={(e) => filters.setProviderFilter(e.target.value)}
              darkMode={darkMode}
              options={[
                { value: 'all', label: 'Todos' },
                ...filters.uniqueProviders.map(p => ({ value: p, label: p }))
              ]}
            />
            <MaterialSelect
              label="Módulo"
              value={filters.moduleFilter}
              onChange={(e) => filters.setModuleFilter(e.target.value)}
              darkMode={darkMode}
              options={[
                { value: 'all', label: 'Todos' },
                ...filters.uniqueModules.map(m => ({ value: m, label: m }))
              ]}
            />
            <MaterialSelect
              label="Responsable"
              value={filters.responsibleFilter}
              onChange={(e) => filters.setResponsibleFilter(e.target.value)}
              darkMode={darkMode}
              options={[
                { value: 'all', label: 'Todos' },
                ...filters.uniqueResponsibles.map(r => ({ value: r, label: r }))
              ]}
            />
            <MaterialSelect
              label="Estado"
              value={filters.statusFilter}
              onChange={(e) => filters.setStatusFilter(e.target.value)}
              darkMode={darkMode}
              options={[
                { value: 'all', label: 'Todos' },
                ...filters.uniqueStatuses.map(s => ({ value: s, label: s }))
              ]}
            />
          </div>

          {/* Agrupación en su propia fila compacta */}
          <div className="flex justify-start">
            <MaterialSelect
              label="Agrupación"
              value={filters.groupBy}
              onChange={(e) => filters.setGroupBy(e.target.value as any)}
              darkMode={darkMode}
              className="max-w-xs"
              options={groupOptions}
            />
          </div>
        </MaterialCard.Content>
      </MaterialCard>

      {/* Tabla de Desarrollos */}
      <MaterialCard darkMode={darkMode} elevation={1} className="overflow-hidden">
        {Object.entries(filters.groupedDevelopments).map(([groupName, groupDevelopments]) => (
          <div key={groupName}>
            {filters.groupBy !== 'none' && (
              <MaterialCard.Header darkMode={darkMode}>
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                  {groupName}
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                    darkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-200 text-neutral-600'
                  }`}>
                    {groupDevelopments.length} desarrollo{groupDevelopments.length !== 1 ? 's' : ''}
                  </span>
              </h3>
              </MaterialCard.Header>
          )}
            
            <div className="overflow-x-auto">
            <table className="w-full">
                <thead className={darkMode ? 'bg-neutral-800' : 'bg-neutral-50'}>
                  <tr>
                    {[
                      { key: 'id', label: 'ID' },
                      { key: 'name', label: 'Nombre' },
                      { key: 'responsible', label: 'Responsable' },
                      { key: 'provider', label: 'Proveedor' },
                      { key: 'status', label: 'Estado' }
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ${
                          darkMode ? 'text-neutral-300' : 'text-neutral-600'
                        }`}
                        onClick={() => handleColumnSort(key)}
                      >
                        {label}
                      </th>
                    ))}
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                      darkMode ? 'text-neutral-300' : 'text-neutral-600'
                    }`}>
                      Acciones
                    </th>
                            </tr>
                          </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                            {groupDevelopments.map((dev) => (
                    <tr key={dev.id} className={`${
                      darkMode ? 'hover:bg-neutral-700/50' : 'hover:bg-neutral-50'
                    } transition-colors`}>
                      <td className="px-4 py-3 text-sm font-medium text-primary-600 dark:text-primary-400">
                        {dev.id}
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium ${
                        darkMode ? 'text-white' : 'text-neutral-900'
                      }`}>
                        {dev.name}
                      </td>
                      <td className={`px-4 py-3 text-sm ${
                        darkMode ? 'text-neutral-300' : 'text-neutral-600'
                      }`}>
                        {dev.responsible ?? 'N/A'}
                      </td>
                      <td className={`px-4 py-3 text-sm ${
                        darkMode ? 'text-neutral-300' : 'text-neutral-600'
                      }`}>
                        {dev.provider ?? 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          getStatusColor(dev.general_status)
                        }`}>
                          {dev.general_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <MaterialButton
                          onClick={() => navigate(`/developments/${dev.id}?tab=bitacora`)}
                          variant="text"
                          color="primary"
                          size="small"
                          icon={Eye}
                          iconPosition="left"
                          darkMode={darkMode}
                        >
                          Ver
                        </MaterialButton>
                      </td>
                    </tr>
                            ))}
                          </tbody>
                        </table>
            </div>
                    </div>
                  ))}
      </MaterialCard>

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