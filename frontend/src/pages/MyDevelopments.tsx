import React, { useEffect, useRef, useState } from 'react';
import { Eye, Plus, RotateCcw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDevelopments } from './MyDevelopments/hooks/useDevelopments';
import { useNotifications } from '../components/notifications/NotificationsContext';
import { Button, Title, Text } from '../components/atoms';
import { CreateDevelopmentModal } from './MyDevelopments/CreateDevelopmentModal';
import { useColumnFilters } from '../hooks/useColumnFilters';
import { ColumnFilterPopover } from '../components/molecules/ColumnFilterPopover';

const MyDevelopments: React.FC = () => {
  const navigate = useNavigate();
  const { developments, loadDevelopments } = useDevelopments();
  const { addNotification } = useNotifications();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Cargar desarrollos al montar el componente
  useEffect(() => {
    loadDevelopments();
  }, [loadDevelopments]);

  // Configuración de accesores para filtros por columna
  const columnAccessors = {
    id: (dev: any) => dev.id,
    responsible: (dev: any) => dev.responsible,
    module: (dev: any) => dev.module,
    type: (dev: any) => dev.type,
    name: (dev: any) => dev.name,
    start_date: (dev: any) => dev.start_date,
    estimated_end_date: (dev: any) => dev.estimated_end_date,
    status: (dev: any) => dev.general_status,
    area_desarrollo: (dev: any) => dev.area_desarrollo,
    analista: (dev: any) => dev.analista,
  };

  const {
    filteredData,
    uniqueValues,
    activePopover,
    setActivePopover,
    hasActiveFilter,
    toggleOption,
    selectAll,
    clearColumnFilter,
    clearAllFilters,
    filters,
    activeFilterCount
  } = useColumnFilters(developments || [], columnAccessors);

  const anchorRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Utilidades
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'En curso': 'text-blue-800 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
      'Pendiente': 'text-yellow-800 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400',
      'Completado': 'text-green-800 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
    };
    return colors[status] || 'text-gray-800 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const columns = [
    { key: 'id', label: 'ID', width: 'md:w-24' },
    { key: 'responsible', label: 'Responsable', width: 'md:w-32' },
    { key: 'module', label: 'Área', width: 'md:w-28' },
    { key: 'count', label: '#', width: 'md:w-12 text-center', noFilter: true },
    { key: 'type', label: 'Tipo', width: 'md:w-28' },
    { key: 'name', label: 'Actividad', width: 'flex-1 min-w-0' },
    { key: 'start_date', label: 'Inicio', width: 'md:w-24' },
    { key: 'estimated_end_date', label: 'Fin', width: 'md:w-24' },
    { key: 'description', label: 'Objetivo', width: 'md:w-40', noFilter: true },
    { key: 'stage_progress_percentage', label: '%', width: 'md:w-20', noFilter: true },
    { key: 'status', label: 'Estado', width: 'md:w-24' },
    { key: 'area_desarrollo', label: 'Área Desarrollo', width: 'md:w-32' },
    { key: 'analista', label: 'Analista', width: 'md:w-32' }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-neutral-900/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-4">
          <Title variant="h1" className="m-0">
            Gestión de Actividades
          </Title>
          <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Text variant="caption" weight="bold" className="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-3 py-1 rounded-full border border-primary-100 dark:border-primary-800/50">
              {filteredData.length} Actividades
            </Text>
            {activeFilterCount > 0 && (
              <button 
                onClick={clearAllFilters}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-red-500 hover:text-red-600 transition-colors bg-red-50 dark:bg-red-900/10 px-3 py-1 rounded-full border border-red-100 dark:border-red-900/20"
              >
                <RotateCcw size={12} />
                Limpiar {activeFilterCount} filtros
              </button>
            )}
          </div>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setIsCreateModalOpen(true)}
          className="shadow-lg shadow-primary-500/20"
        >
          Nueva Actividad
        </Button>
      </div>

      {/* Tabla de Desarrollos - Contenedor de Alto Rendimiento */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        {/* Header de la tabla */}
        <div className="hidden md:flex items-stretch gap-0 bg-[var(--deep-navy)] rounded-t-2xl border-b border-[var(--color-border)] overflow-hidden sticky top-0 z-20">
          {columns.map((col, idx) => (
            <button
              key={col.key}
              ref={(el) => (anchorRefs.current[col.key] = el)}
              onClick={() => !col.noFilter && setActivePopover(activePopover === col.key ? null : col.key)}
              disabled={col.noFilter}
              className={`
                ${col.width} shrink-0 flex items-center py-2.5 px-4
                ${idx === 0 ? 'bg-blue-500/20 border-r border-white/10' : 'hover:bg-white/5 border-r border-white/10 transition-all duration-200'}
                ${!col.noFilter ? 'cursor-pointer outline-none group' : 'cursor-default'}
              `}
            >
              <span className={`
                text-xs font-bold uppercase tracking-wider !text-[11px] transition-colors
                ${hasActiveFilter(col.key) 
                  ? 'text-yellow-400' 
                  : idx === 0 
                    ? 'text-blue-300' 
                    : 'text-white/70 group-hover:text-white'}
              `}>
                {col.label}
              </span>
            </button>
          ))}
          <div className="md:w-24 shrink-0 flex items-center justify-center py-2.5 px-4 bg-white/10">
            <span className="text-xs font-bold uppercase tracking-wider !text-[11px] text-white">
              Acciones
            </span>
          </div>
        </div>

        {/* Contenedor con tabla */}
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredData.length > 0 ? (
                filteredData.map((dev) => (
                  <tr 
                    key={dev.id} 
                    className="group hover:bg-[var(--color-surface-variant)] transition-colors cursor-pointer relative"
                  >
                    {/* Indicador lateral */}
                    <td className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--deep-navy)]"></td>
                    
                    {/* ID */}
                    <td className="md:w-24 shrink-0 pl-4 py-2.5">
                      <span className="font-mono text-xs text-gray-400 whitespace-nowrap">
                        {dev.id}
                      </span>
                    </td>
                    {/* Responsable */}
                    <td className="md:w-32 shrink-0 py-2.5 px-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate uppercase text-[10px]">
                        {dev.responsible ?? 'N/A'}
                      </span>
                    </td>
                    {/* Área */}
                    <td className="md:w-28 shrink-0 py-2.5 px-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate text-[10px]">
                        {dev.module ?? 'N/A'}
                      </span>
                    </td>
                    {/* # */}
                    <td className="md:w-12 shrink-0 py-2.5 text-center">
                      <span className="text-xs text-gray-400 font-medium">1</span>
                    </td>
                    {/* Tipo */}
                    <td className="md:w-28 shrink-0 py-2.5 px-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate text-[10px]">
                        {dev.type ?? 'N/A'}
                      </span>
                    </td>
                    {/* Actividad */}
                    <td className="flex-1 min-w-0 py-2.5 px-3">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-[var(--color-primary)] transition-colors">
                        {dev.name}
                      </p>
                    </td>
                    {/* Inicio */}
                    <td className="md:w-24 shrink-0 py-2.5 px-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 text-[10px]">
                        {dev.start_date ?? 'N/A'}
                      </span>
                    </td>
                    {/* Fin */}
                    <td className="md:w-24 shrink-0 py-2.5 px-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 text-[10px]">
                        {dev.estimated_end_date ?? 'N/A'}
                      </span>
                    </td>
                    {/* Objetivo */}
                    <td className="md:w-40 shrink-0 py-2.5 px-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate text-[10px]" title={dev.description}>
                        {dev.description ?? 'N/A'}
                      </span>
                    </td>
                    {/* % Cumplimiento */}
                    <td className="md:w-20 shrink-0 py-2.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[var(--deep-navy)] transition-all duration-500" 
                            style={{ width: `${dev.stage_progress_percentage ?? 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 w-8 text-right">
                          {dev.stage_progress_percentage ?? 0}%
                        </span>
                      </div>
                    </td>
                    {/* Estado */}
                    <td className="md:w-24 shrink-0 py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center font-medium rounded-full transition-all text-[10px] uppercase tracking-wider px-2 py-0.5 ${getStatusColor(dev.general_status)} shadow-md hover:shadow-lg`}>
                        {dev.general_status}
                      </span>
                    </td>
                    {/* Área Desarrollo */}
                    <td className="md:w-32 shrink-0 py-2.5 px-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate text-[10px]">
                        {dev.area_desarrollo ?? 'N/A'}
                      </span>
                    </td>
                    {/* Analista */}
                    <td className="md:w-32 shrink-0 py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                          {(dev.analista ?? 'A')[0].toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate text-[10px]">
                          {dev.analista ?? 'N/A'}
                        </span>
                      </div>
                    </td>
                    {/* Acciones */}
                    <td className="md:w-24 shrink-0 py-2.5 px-3 text-center">
                      <button
                        onClick={() => navigate(`/developments/${dev.id}?tab=bitacora`)}
                        className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20 inline-flex items-center justify-center"
                        title="Ver detalle"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 1} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <Search size={40} />
                      <Text variant="body" weight="medium">No se encontraron actividades</Text>
                      {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                          Limpiar todos los filtros
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Popovers de Filtro */}
      {Object.keys(columnAccessors).map((key) => (
        activePopover === key && (
          <ColumnFilterPopover
            key={key}
            columnKey={key}
            title={columns.find(c => c.key === key)?.label || key}
            options={uniqueValues[key] || []}
            selectedValues={filters[key] || new Set()}
            onToggleOption={toggleOption}
            onSelectAll={selectAll}
            onClear={clearColumnFilter}
            onClose={() => setActivePopover(null)}
            anchorRef={{ current: anchorRefs.current[key] }}
          />
        )
      ))}

      {/* Modal de Creación */}
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
