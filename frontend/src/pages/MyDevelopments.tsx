import React, { useEffect, useRef, useState } from 'react';
import { Eye, Search, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDevelopments } from './MyDevelopments/hooks/useDevelopments';
import { useFilters, UseFiltersReturn } from './MyDevelopments/hooks/useFilters';
import { useNotifications } from '../components/notifications/NotificationsContext';
import { MaterialCard, Input, Select, Button, Title, Text } from '../components/atoms';
import { CreateDevelopmentModal } from './MyDevelopments/CreateDevelopmentModal';

// Hook personalizado para persistir filtros
const usePersistedFilters = (filters: UseFiltersReturn) => {
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
        if (parsed.stageFilter) filters.setStageFilter(parsed.stageFilter);
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
        stageFilter: filters.stageFilter,
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
    filters.stageFilter,
    filters.groupBy
  ]);
};

const MyDevelopments: React.FC = () => {
  const navigate = useNavigate();
  const { developments, loadDevelopments } = useDevelopments();
  const filters = useFilters(developments);
  const { addNotification } = useNotifications();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
    filters.setStageFilter('all');
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
      addNotification('info', `${developments.length} actividades cargadas`);
      hasShownLoadNotif.current = true;
    }
  }, [developments, addNotification]);


  // Utilidades
  const getStatusColor = (status: string) => {
    const colors = {
      'En curso': 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
      'Pendiente': 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
      'Completado': 'text-green-600 bg-green-100 dark:bg-green-900/20',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
  };

  const handleColumnSort = (column: UseFiltersReturn['sortBy']) => {
    filters.setSortBy(column);
    filters.setSortOrder('asc');
  };

  // Opciones para los selects
  const groupOptions = [
    { value: 'none', label: 'Sin agrupar' },
    { value: 'module', label: 'Agrupar por Módulo' },
    { value: 'responsible', label: 'Agrupar por Responsable' },
    { value: 'stage', label: 'Agrupar por Estado Real' }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Title variant="h1">
          Gestión de Actividades
        </Title>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Nueva Actividad
        </Button>
      </div>

      {/* Panel de Filtros */}
      <MaterialCard elevation={1}>
        <MaterialCard.Header>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Title variant="h6">
                Filtros y Ordenamiento
              </Title>
              <Text as="span" variant="caption" weight="medium" className="px-2 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                {filters.filteredDevelopments.length} actividad{filters.filteredDevelopments.length !== 1 ? 'es' : ''}
              </Text>
            </div>
            <Button
              onClick={clearAllFilters}
              variant="ghost"
              size="sm"
              icon={X}
              className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              Limpiar
            </Button>
          </div>
        </MaterialCard.Header>

        <MaterialCard.Content className="space-y-3">
          {/* Todos los controles en una sola fila */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7 gap-2">
            <Input
              type="search"
              label="Búsqueda"
              placeholder="Buscar..."
              value={filters.searchTerm}
              onChange={(e) => filters.setSearchTerm(e.target.value)}
              icon={Search}
            />
            <Select
              label="Agrupación"
              value={filters.groupBy}
              onChange={(e) => filters.setGroupBy(e.target.value as UseFiltersReturn['groupBy'])}
              className="max-w-xs"
              options={groupOptions}
            />
          </div>
        </MaterialCard.Content>
      </MaterialCard>


      {/* Tabla de Desarrollos */}
      <MaterialCard elevation={1} className="overflow-hidden">
        {Object.entries(filters.groupedDevelopments).map(([groupName, groupDevelopments]) => (
          <div key={groupName}>
            {filters.groupBy !== 'none' && (
              <MaterialCard.Header>
                <Title variant="h5" as="h3">
                  {groupName}
                  <Text as="span" variant="caption" weight="medium" className="ml-2 px-2 py-1 rounded-full bg-[var(--color-surface-variant)] text-[var(--color-text-secondary)]">
                    {groupDevelopments.length} actividad{groupDevelopments.length !== 1 ? 'es' : ''}
                  </Text>
                </Title>
              </MaterialCard.Header>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--color-surface-variant)]">
                  <tr>
                    {[
                      { key: 'id', label: 'ID' },
                      { key: 'responsible', label: 'Responsable' },
                      { key: 'module', label: 'Área' },
                      { key: 'type', label: 'Tipo' },
                      { key: 'name', label: 'Actividad' },
                      { key: 'start_date', label: 'Inicio' },
                      { key: 'estimated_end_date', label: 'Fin' },
                      { key: 'description', label: 'Objetivo' },
                      { key: 'stage_progress_percentage', label: '% Cumplimiento' },
                      { key: 'status', label: 'Estado' },
                      { key: 'area_desarrollo', label: 'Área Desarrollo' },
                      { key: 'analista', label: 'Analista' }
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-[var(--color-surface-variant)]/50 transition-colors text-[var(--color-text-secondary)]"
                        onClick={() => handleColumnSort(key as UseFiltersReturn['sortBy'])}
                      >
                        {label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {groupDevelopments.map((dev) => (
                    <tr key={dev.id} className="hover:bg-[var(--color-surface-variant)]/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-bold text-[var(--color-primary)]">
                        {dev.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                        {dev.responsible ?? 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                        {dev.module ?? 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                        {dev.type ?? 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-[var(--color-text-primary)]">
                        {dev.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                        {dev.start_date ?? 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                        {dev.estimated_end_date ?? 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)] max-w-xs truncate" title={dev.description}>
                        {dev.description ?? 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                        {dev.stage_progress_percentage ?? 0}%
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Text as="span" className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(dev.general_status)
                          }`}>
                          {dev.general_status}
                        </Text>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                        {dev.area_desarrollo ?? 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                        {dev.analista ?? 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Button
                          onClick={() => navigate(`/developments/${dev.id}?tab=bitacora`)}
                          variant="ghost"
                          size="sm"
                          icon={Eye}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </MaterialCard>

      {/* Modal de Importación u otros */}
      <CreateDevelopmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={() => {
          loadDevelopments();
          addNotification('success', 'Actividad creada exitosamente');
        }}
        darkMode={document.documentElement.classList.contains('dark')} 
      />
    </div>
  );
};

export default MyDevelopments;
