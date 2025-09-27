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
  groupBy: 'none' | 'provider' | 'module' | 'responsible';
  setGroupBy: (group: 'none' | 'provider' | 'module' | 'responsible') => void;

  // Datos únicos para los selects
  uniqueProviders: string[];
  uniqueStatuses: string[];
  uniqueModules: string[];
  uniqueResponsibles: string[];

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
  const [groupBy, setGroupBy] = useState<'none' | 'provider' | 'module' | 'responsible'>('none');

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

  // Filtrar desarrollos
  const filteredDevelopments = useMemo(() => {
    return developments.filter(dev => {
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

      return matchesSearch && matchesProvider && matchesStatus && matchesModule && matchesResponsible;
    });
  }, [developments, searchTerm, providerFilter, statusFilter, moduleFilter, responsibleFilter]);

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
    groupBy,
    setGroupBy,
    uniqueProviders,
    uniqueStatuses,
    uniqueModules,
    uniqueResponsibles,
    filteredDevelopments,
    groupedDevelopments,
  };
};
