import { useState, useMemo } from 'react';
import { DevelopmentWithCurrentStatus } from '../../../types';

export interface UseFiltersReturn {
  // Estados de filtros
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  providerFilter: string;
  setProviderFilter: (provider: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  moduleFilter: string;
  setModuleFilter: (module: string) => void;
  responsibleFilter: string;
  setResponsibleFilter: (responsible: string) => void;
  stageFilter: string;
  setStageFilter: (stage: string) => void;
  groupBy: 'none' | 'provider' | 'module' | 'responsible' | 'stage';
  setGroupBy: (group: 'none' | 'provider' | 'module' | 'responsible' | 'stage') => void;
  
  // Estados de ordenamiento
  sortBy: 'id' | 'name' | 'provider' | 'responsible' | 'status' | 'module' | 'stage';
  setSortBy: (sort: 'id' | 'name' | 'provider' | 'responsible' | 'status' | 'module' | 'stage') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Datos únicos para los selects
  uniqueProviders: string[];
  uniqueStatuses: string[];
  uniqueModules: string[];
  uniqueResponsibles: string[];
  uniqueStages: string[];

  // Datos filtrados y agrupados
  filteredDevelopments: DevelopmentWithCurrentStatus[];
  groupedDevelopments: Record<string, DevelopmentWithCurrentStatus[]>;
}

export const useFilters = (developments: DevelopmentWithCurrentStatus[]): UseFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [responsibleFilter, setResponsibleFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [groupBy, setGroupBy] = useState<'none' | 'provider' | 'module' | 'responsible' | 'stage'>('none');
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'provider' | 'responsible' | 'status' | 'module' | 'stage'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Extraer valores únicos para los selects
  const uniqueProviders = useMemo(() => {
    const providers = developments
      .map(dev => dev.provider)
      .filter((provider): provider is string => Boolean(provider))
      .filter((provider, index, arr) => arr.indexOf(provider) === index);
    return providers.sort();
  }, [developments]);

  const uniqueStatuses = useMemo(() => {
    const statuses = developments
      .map(dev => dev.general_status)
      .filter((status): status is string => Boolean(status))
      .filter((status, index, arr) => arr.indexOf(status) === index);
    return statuses.sort();
  }, [developments]);

  const uniqueModules = useMemo(() => {
    const modules = developments
      .map(dev => dev.module)
      .filter((module): module is string => Boolean(module))
      .filter((module, index, arr) => arr.indexOf(module) === index);
    return modules.sort();
  }, [developments]);

  const uniqueResponsibles = useMemo(() => {
    const responsibles = developments
      .map(dev => dev.responsible)
      .filter((responsible): responsible is string => Boolean(responsible))
      .filter((responsible, index, arr) => arr.indexOf(responsible) === index);
    return responsibles.sort();
  }, [developments]);

  const uniqueStages = useMemo(() => {
    // Crear array con stage_name y stage_code para poder ordenar por stage_code
    const stageInfo = developments
      .map(dev => {
        // Priorizar last_activity (lo que realmente se muestra)
        if (dev.last_activity?.stage_name) {
          return {
            stage_name: dev.last_activity.stage_name,
            stage_code: dev.last_activity.stage_code || dev.current_stage?.stage_code || '999'
          };
        }
        // Fallback a current_stage si no hay last_activity
        if (dev.current_stage?.stage_name) {
          return {
            stage_name: dev.current_stage.stage_name,
            stage_code: dev.current_stage.stage_code || '999'
          };
        }
        return null;
      })
      .filter((stage): stage is { stage_name: string; stage_code: string } => Boolean(stage));

    // Eliminar duplicados basándose en stage_name
    const uniqueStagesMap = new Map();
    stageInfo.forEach(stage => {
      if (!uniqueStagesMap.has(stage.stage_name)) {
        uniqueStagesMap.set(stage.stage_name, stage);
      }
    });

    // Ordenar por stage_code y extraer solo los stage_name
    return Array.from(uniqueStagesMap.values())
      .sort((a, b) => a.stage_code.localeCompare(b.stage_code, undefined, { numeric: true }))
      .map(stage => stage.stage_name);
  }, [developments]);

  // Filtrar y ordenar desarrollos
  const filteredDevelopments = useMemo(() => {
    const filtered = developments.filter(dev => {
      // Filtro de búsqueda
      const matchesSearch = !searchTerm || 
        dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dev.id.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de proveedor
      const matchesProvider = providerFilter === 'all' || dev.provider === providerFilter;

      // Filtro de estado
      const matchesStatus = statusFilter === 'all' || dev.general_status === statusFilter;

      // Filtro de módulo
      const matchesModule = moduleFilter === 'all' || dev.module === moduleFilter;

      // Filtro de responsable
      const matchesResponsible = responsibleFilter === 'all' || dev.responsible === responsibleFilter;

      // Filtro de etapa (usar la misma lógica que se muestra en la columna)
      const displayedStage = dev.last_activity?.stage_name || dev.current_stage?.stage_name;
      const matchesStage = stageFilter === 'all' || displayedStage === stageFilter;

      return matchesSearch && matchesProvider && matchesStatus && matchesModule && matchesResponsible && matchesStage;
    });

    // Aplicar ordenamiento
    return filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'provider':
          aValue = a.provider || '';
          bValue = b.provider || '';
          break;
        case 'responsible':
          aValue = a.responsible || '';
          bValue = b.responsible || '';
          break;
        case 'status':
          aValue = a.general_status || '';
          bValue = b.general_status || '';
          break;
        case 'module':
          aValue = a.module || '';
          bValue = b.module || '';
          break;
        case 'stage':
          aValue = a.last_activity?.stage_name || a.current_stage?.stage_name || '';
          bValue = b.last_activity?.stage_name || b.current_stage?.stage_name || '';
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }

      // Comparación
      let comparison = 0;
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [developments, searchTerm, providerFilter, statusFilter, moduleFilter, responsibleFilter, stageFilter, sortBy, sortOrder]);

  // Agrupar desarrollos
  const groupedDevelopments = useMemo(() => {
    if (groupBy === 'none') {
      return { 'Todos': filteredDevelopments };
    }

    const groups: Record<string, DevelopmentWithCurrentStatus[]> = {};
    
    filteredDevelopments.forEach(dev => {
      let groupKey: string;
      
      switch (groupBy) {
        case 'provider':
          groupKey = dev.provider || 'Sin Proveedor';
          break;
        case 'module':
          groupKey = dev.module || 'Sin Módulo';
          break;
        case 'responsible':
          groupKey = dev.responsible || 'Sin Responsable';
          break;
        case 'stage':
          groupKey = dev.last_activity?.stage_name || dev.current_stage?.stage_name || 'Sin Etapa';
          break;
        default:
          groupKey = 'Todos';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(dev);
    });

    return groups;
  }, [filteredDevelopments, groupBy]);

  return {
    searchTerm,
    setSearchTerm,
    providerFilter,
    setProviderFilter,
    statusFilter,
    setStatusFilter,
    moduleFilter,
    setModuleFilter,
    responsibleFilter,
    setResponsibleFilter,
    stageFilter,
    setStageFilter,
    groupBy,
    setGroupBy,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    uniqueProviders,
    uniqueStatuses,
    uniqueModules,
    uniqueResponsibles,
    uniqueStages,
    filteredDevelopments,
    groupedDevelopments,
  };
};
