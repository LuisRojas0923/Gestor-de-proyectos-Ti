import React, { useEffect, useRef, useState } from 'react';
import { Eye, Plus, RotateCcw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDevelopments } from './MyDevelopments/hooks/useDevelopments';
import { useNotifications } from '../components/notifications/NotificationsContext';
import { Button, Title, Text } from '../components/atoms';
import { CreateDevelopmentModal } from './MyDevelopments/CreateDevelopmentModal';
import { useColumnFilters } from '../hooks/useColumnFilters';
import { ColumnFilterPopover } from '../components/molecules/ColumnFilterPopover';
import { DevelopmentWithCurrentStatus } from '../types';

type DevelopmentRow = DevelopmentWithCurrentStatus & {
  nombre?: string;
  descripcion?: string;
  modulo?: string;
  tipo?: string;
  fecha_inicio?: string;
  fecha_estimada_fin?: string;
  responsable?: string;
  estado_general?: string;
  porcentaje_progreso?: string | number;
};

const valueOrFallback = (value?: string | number | null) => value ?? 'N/A';

const getDevelopmentName = (dev: DevelopmentRow) => dev.name ?? dev.nombre ?? '';
const getDevelopmentDescription = (dev: DevelopmentRow) => dev.description ?? dev.descripcion;
const getDevelopmentModule = (dev: DevelopmentRow) => dev.module ?? dev.modulo;
const getDevelopmentType = (dev: DevelopmentRow) => dev.type ?? dev.tipo;
const getDevelopmentStartDate = (dev: DevelopmentRow) => dev.start_date ?? dev.fecha_inicio;
const getDevelopmentEndDate = (dev: DevelopmentRow) => dev.estimated_end_date ?? dev.fecha_estimada_fin;
const getDevelopmentResponsible = (dev: DevelopmentRow) => dev.responsible ?? dev.responsable;
const getDevelopmentStatus = (dev: DevelopmentRow) => dev.general_status ?? dev.estado_general ?? '';
const getDevelopmentProgress = (dev: DevelopmentRow) => Number(dev.stage_progress_percentage ?? dev.porcentaje_progreso ?? 0);
const getProgressWidthClass = (progress: number) => {
  if (progress >= 100) return 'w-full';
  if (progress >= 75) return 'w-3/4';
  if (progress >= 50) return 'w-1/2';
  if (progress >= 25) return 'w-1/4';
  if (progress > 0) return 'w-1/12';
  return 'w-0';
};

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
    id: (dev: DevelopmentRow) => dev.id,
    name: getDevelopmentName,
    status: getDevelopmentStatus,
    progress: (dev: DevelopmentRow) => getDevelopmentProgress(dev),
    start_date: getDevelopmentStartDate,
    estimated_end_date: getDevelopmentEndDate,
    area_desarrollo: (dev: DevelopmentRow) => dev.area_desarrollo,
    analista: (dev: DevelopmentRow) => dev.analista,
    responsible: getDevelopmentResponsible,
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
      'en_progreso': 'text-blue-800 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
      'Pendiente': 'text-yellow-800 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400',
      'pendiente': 'text-yellow-800 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400',
      'Completado': 'text-green-800 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
      'completada': 'text-green-800 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
    };
    return colors[status] || 'text-gray-800 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const columns = [
    { key: 'id', label: 'ID', width: 'md:w-24' },
    { key: 'name', label: 'Proyecto', width: 'flex-1 min-w-[260px]' },
    { key: 'status', label: 'Estado', width: 'md:w-24' },
    { key: 'progress', label: 'Progreso', width: 'md:w-28' },
    { key: 'start_date', label: 'Fechas', width: 'md:w-40' },
    { key: 'area_desarrollo', label: 'Área / Analista', width: 'md:w-44' },
    { key: 'responsible', label: 'Responsable', width: 'md:w-32' }
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
              <Button
                variant="custom"
                size="xs"
                onClick={clearAllFilters}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-red-500 hover:text-red-600 transition-colors bg-red-50 dark:bg-red-900/10 px-3 py-1 rounded-full border border-red-100 dark:border-red-900/20"
              >
                <RotateCcw size={12} />
                Limpiar {activeFilterCount} filtros
              </Button>
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
      <div className="relative flex max-h-[calc(100vh-220px)] min-h-[320px] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        {/* Header de la tabla */}
        <div className="hidden md:flex shrink-0 items-stretch gap-0 bg-[var(--deep-navy)] rounded-t-2xl border-b border-[var(--color-border)] overflow-hidden z-20">
          {columns.map((col, idx) => (
            <Button
              key={col.key}
              ref={(el) => (anchorRefs.current[col.key] = el)}
              onClick={() => !col.noFilter && setActivePopover(activePopover === col.key ? null : col.key)}
              disabled={col.noFilter}
              variant="custom"
              className={`
                ${col.width} shrink-0 flex items-center py-2.5 px-4
                ${idx === 0 ? 'bg-blue-500/20 border-r border-white/10' : 'hover:bg-white/5 border-r border-white/10 transition-all duration-200'}
                ${!col.noFilter ? 'cursor-pointer outline-none group' : 'cursor-default'}
              `}
            >
              <Text as="span" variant="caption" weight="bold" color="inherit" className={`
                text-xs font-bold uppercase tracking-wider !text-[11px] transition-colors
                ${hasActiveFilter(col.key) 
                  ? 'text-yellow-400' 
                  : idx === 0 
                    ? 'text-blue-300' 
                    : 'text-white/70 group-hover:text-white'}
              `}>
                {col.label}
              </Text>
            </Button>
          ))}
          <div className="md:w-24 shrink-0 flex items-center justify-center py-2.5 px-4 bg-white/10">
            <Text as="span" variant="caption" weight="bold" color="white" className="uppercase tracking-wider !text-[11px]">
              Acciones
            </Text>
          </div>
        </div>

        {/* Contenedor con tabla */}
        <div className="min-h-0 flex-1 overflow-y-scroll custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredData.length > 0 ? (
                filteredData.map((dev: DevelopmentRow) => {
                  const description = getDevelopmentDescription(dev);
                  const progress = getDevelopmentProgress(dev);
                  const status = getDevelopmentStatus(dev);

                  return (
                  <tr 
                    key={dev.id} 
                    className="group hover:bg-[var(--color-surface-variant)] transition-colors cursor-pointer relative"
                  >
                    {/* Indicador lateral */}
                    <td className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--deep-navy)]"></td>
                    
                    <td className="md:w-24 shrink-0 pl-4 py-3">
                      <Text as="span" variant="caption" color="gray" className="font-mono whitespace-nowrap">
                        {dev.id}
                      </Text>
                    </td>
                    <td className="flex-1 min-w-[260px] py-3 px-3">
                      <Text variant="body2" weight="bold" className="truncate group-hover:text-[var(--color-primary)] transition-colors">
                        {getDevelopmentName(dev)}
                      </Text>
                      {description && (
                        <Text as="span" variant="caption" color="text-secondary" className="mt-0.5 block max-w-[560px] truncate !text-[11px]" title={description}>
                          {description}
                        </Text>
                      )}
                    </td>
                    <td className="md:w-24 shrink-0 py-3 px-3 text-center">
                      <Text as="span" variant="caption" weight="medium" color="inherit" className={`inline-flex items-center rounded-full transition-all !text-[10px] uppercase tracking-wider px-2 py-0.5 ${getStatusColor(status)} shadow-md hover:shadow-lg`}>
                        {status}
                      </Text>
                    </td>
                    <td className="md:w-28 shrink-0 py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full bg-[var(--deep-navy)] transition-all duration-500 ${getProgressWidthClass(progress)}`} />
                        </div>
                        <Text as="span" variant="caption" weight="bold" color="text-secondary" className="w-8 text-right !text-[10px]">
                          {progress}%
                        </Text>
                      </div>
                    </td>
                    <td className="md:w-40 shrink-0 py-3 px-3">
                      <div className="flex flex-col gap-0.5">
                        <Text as="span" variant="caption" weight="semibold" className="!text-[11px] text-gray-700 dark:text-gray-200">
                          {valueOrFallback(getDevelopmentStartDate(dev))}
                        </Text>
                        <Text as="span" variant="caption" color="text-secondary" className="!text-[10px]">
                          Fin: {valueOrFallback(getDevelopmentEndDate(dev))}
                        </Text>
                      </div>
                    </td>
                    <td className="md:w-44 shrink-0 py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                          {(dev.analista ?? 'A')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Text as="span" variant="caption" weight="semibold" className="block truncate !text-[11px] text-gray-700 dark:text-gray-200">
                            {dev.area_desarrollo ?? 'N/A'}
                          </Text>
                          <Text as="span" variant="caption" color="text-secondary" className="block truncate !text-[10px]">
                            {dev.analista ?? 'N/A'}
                          </Text>
                        </div>
                      </div>
                    </td>
                    <td className="md:w-32 shrink-0 py-3 px-3">
                      <Text as="span" variant="caption" color="text-secondary" className="truncate uppercase !text-[10px]">
                        {valueOrFallback(getDevelopmentResponsible(dev))}
                      </Text>
                    </td>
                    <td className="md:w-24 shrink-0 py-3 px-3 text-center">
                      <Button
                        variant="custom"
                        onClick={() => navigate(`/developments/${dev.id}?tab=bitacora`)}
                        className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20 inline-flex items-center justify-center"
                        title="Ver detalles"
                      >
                        <Eye size={14} />
                      </Button>
                    </td>
                  </tr>
                  );
                })
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
