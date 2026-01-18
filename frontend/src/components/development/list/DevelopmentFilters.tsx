import React from 'react';
import { Search } from 'lucide-react';
import { UseFiltersReturn } from '../../../pages/MyDevelopments/hooks';
import { Input, Select } from '../../atoms';

interface DevelopmentFiltersProps {
  filters: UseFiltersReturn;
  darkMode: boolean;
}

export const DevelopmentFilters: React.FC<DevelopmentFiltersProps> = ({
  filters,
  darkMode,
}) => {
  const {
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
  } = filters;

  return (
    <div
      className={`${darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
        } border rounded-xl p-6`}
    >
      <div className="space-y-4">
        {/* Fila 1: Búsqueda y Agrupación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <Input
              type="text"
              placeholder="Buscar por ID o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
              className="w-full"
            />
          </div>

          <Select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            options={[
              { value: "none", label: "Sin agrupar" },
              { value: "provider", label: "Agrupar por Proveedor" },
              { value: "module", label: "Agrupar por Módulo" },
              { value: "responsible", label: "Agrupar por Responsable" }
            ]}
          />
        </div>

        {/* Fila 2: Filtros de Organización */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            options={[
              { value: "all", label: "Todos los Proveedores" },
              ...uniqueProviders.map(p => ({ value: p, label: p }))
            ]}
          />

          <Select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            options={[
              { value: "all", label: "Todos los Módulos" },
              ...uniqueModules.map(m => ({ value: m, label: m }))
            ]}
          />

          <Select
            value={responsibleFilter}
            onChange={(e) => setResponsibleFilter(e.target.value)}
            options={[
              { value: "all", label: "Todos los Responsables" },
              ...uniqueResponsibles.map(r => ({ value: r, label: r }))
            ]}
          />

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "Todos los Estados" },
              ...uniqueStatuses.map(s => ({ value: s, label: s }))
            ]}
          />
        </div>
      </div>
    </div>
  );
};
