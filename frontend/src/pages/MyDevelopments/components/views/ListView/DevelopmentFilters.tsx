import React from 'react';
import { Search } from 'lucide-react';
import { UseFiltersReturn } from '../../../hooks';

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
      className={`${
        darkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
      } border rounded-xl p-6`}
    >
      <div className="space-y-4">
        {/* Fila 1: Búsqueda y Agrupación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                darkMode ? 'text-neutral-400' : 'text-neutral-500'
              }`}
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar por ID o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 pr-4 py-2 w-full rounded-lg border transition-colors ${
                darkMode
                  ? 'bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400'
                  : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-500'
              } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
            />
          </div>

          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
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
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-neutral-700 border-neutral-600 text-white'
                : 'bg-neutral-50 border-neutral-300 text-neutral-900'
            } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
          >
            <option value="all">Todos los Proveedores</option>
            {uniqueProviders.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-neutral-700 border-neutral-600 text-white'
                : 'bg-neutral-50 border-neutral-300 text-neutral-900'
            } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
          >
            <option value="all">Todos los Módulos</option>
            {uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            value={responsibleFilter}
            onChange={(e) => setResponsibleFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-neutral-700 border-neutral-600 text-white'
                : 'bg-neutral-50 border-neutral-300 text-neutral-900'
            } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
          >
            <option value="all">Todos los Responsables</option>
            {uniqueResponsibles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-neutral-700 border-neutral-600 text-white'
                : 'bg-neutral-50 border-neutral-300 text-neutral-900'
            } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20`}
          >
            <option value="all">Todos los Estados</option>
             {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};
