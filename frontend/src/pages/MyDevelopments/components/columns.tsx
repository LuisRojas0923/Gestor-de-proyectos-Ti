import React from 'react';
import { DataTableColumn } from '../../../components/molecules/DataTable';
import { Checkbox, Text } from '../../../components/atoms';
import { DevelopmentWithCurrentStatus } from '../../../types';
import { 
  Clock, 
  PlayCircle, 
  CheckCircle2, 
  PauseCircle, 
  AlertCircle, 
  ArrowUp, 
  ArrowRight, 
  ArrowDown 
} from 'lucide-react';

export type DevelopmentRow = DevelopmentWithCurrentStatus & {
  nombre?: string;
  descripcion?: string;
  modulo?: string;
  tipo?: string;
  fecha_inicio?: string;
  fecha_estimada_fin?: string;
  autoridad?: string;
  autoridad_id?: string;
  responsable?: string;
  responsable_id?: string;
  estado_general?: string;
  porcentaje_progreso?: string | number;
  area_desarrollo?: string;
  area_ejecutor?: string;
  analista?: string;
  supervisor?: string;
};

export const valueOrFallback = (value?: string | number | null) => value ?? 'N/A';

export const getDevelopmentName = (dev: DevelopmentRow) => dev.name ?? dev.nombre ?? '';
export const getDevelopmentDescription = (dev: DevelopmentRow) => dev.description ?? dev.descripcion;
export const getDevelopmentStartDate = (dev: DevelopmentRow) => dev.start_date ?? dev.fecha_inicio;
export const getDevelopmentEndDate = (dev: DevelopmentRow) => dev.estimated_end_date ?? dev.fecha_estimada_fin;

export const getDevelopmentStatus = (dev: DevelopmentRow) =>
  dev.estado_general ?? 'Pendiente';

export const getStatusLabel = (status: string) => {
  if (status === 'En curso') return 'En Proceso';
  return status;
};

export const getDevelopmentProgress = (dev: DevelopmentRow) =>
  Number(dev.porcentaje_progreso ?? dev.stage_progress_percentage ?? 0);

export const getStatusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('pendiente')) return 'text-red-800 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
  if (s.includes('progreso') || s.includes('proceso') || s.includes('curso')) return 'text-yellow-800 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
  if (s.includes('complet')) return 'text-green-800 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
  return 'text-gray-800 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
};

export const getPrioridadColor = (prioridad?: string) => {
  if (!prioridad) return 'text-gray-800 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
  const p = prioridad.toLowerCase();
  if (p === 'alta') return 'text-red-800 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
  if (p === 'media') return 'text-orange-800 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400';
  if (p === 'baja') return 'text-blue-800 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400';
  return 'text-gray-800 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
};

export const TIPO_LABELS: Record<string, string> = {
  'Mejora': 'Mejora',
  'Actividad frecuente': 'Actividad frecuente',
  'Actividad Puntual': 'Actividad',
  'Actividad': 'Actividad',
};

export const getTipoLabel = (tipo?: string) =>
  tipo ? (TIPO_LABELS[tipo] ?? tipo) : '';

export const getProgressWidthClass = (p: number) => {
  if (p >= 100) return 'w-full';
  if (p >= 75) return 'w-3/4';
  if (p >= 50) return 'w-1/2';
  if (p >= 25) return 'w-1/4';
  if (p > 0) return 'w-1/12';
  return 'w-0';
};

export const getColumnAccessors = (
  resolveUserName: (val?: string | null) => string | undefined,
  reviewedIds?: Set<string>
) => ({
  id:                 (dev: DevelopmentRow) => String(dev.id),
  tipo:               (dev: DevelopmentRow) => getTipoLabel(dev.tipo) || '',
  name:               getDevelopmentName,
  name_name:          getDevelopmentName,
  name_description:   (dev: DevelopmentRow) => getDevelopmentDescription(dev) ?? '(Vacío)',
  name_creator:       (dev: DevelopmentRow) => resolveUserName(dev.creado_por_id) || dev.creado_por_id || '(Vacío)',
  status:             (dev: DevelopmentRow) => getStatusLabel(getDevelopmentStatus(dev)),
  prioridad:          (dev: DevelopmentRow) => dev.prioridad || '',
  start_date:         getDevelopmentStartDate,
  estimated_end_date: getDevelopmentEndDate,
  area_desarrollo:    (dev: DevelopmentRow) => dev.area_desarrollo || '(Vacío)',
  analista:           (dev: DevelopmentRow) => resolveUserName(dev.analista) || dev.analista || '(Sin asignar)',
  area_ejecutor:      (dev: DevelopmentRow) => dev.area_ejecutor || '(Sin área)',
  supervisor:         (dev: DevelopmentRow) => resolveUserName(dev.supervisor) || dev.supervisor || '(Sin asignar)',
  authority:          (dev: DevelopmentRow) => resolveUserName(dev.authority ?? dev.autoridad) || dev.authority || dev.autoridad || '(Sin asignar)',
  responsible:        (dev: DevelopmentRow) => resolveUserName(dev.responsible ?? dev.responsable) || dev.responsible || dev.responsable || '(Sin asignar)',
  __review__:         (dev: DevelopmentRow) => reviewedIds?.has(String(dev.id)) ? 'Revisado' : 'No revisado',
});

export const getColumns = (
  resolveUserName: (val?: string | null) => string | undefined,
  reviewed?: { ids: Set<string>; toggle: (id: string) => void }
): DataTableColumn<DevelopmentRow>[] => {
  const reviewColumn: DataTableColumn<DevelopmentRow> = {
    key: '__review__',
    label: '✓',
    minWidth: '36px',
    centered: true,
    filterable: true,
    cellClassName: '!px-2',
    render: (dev) => (
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-center"
        data-testid={`review-${dev.id}`}
      >
        <Checkbox
          checked={reviewed?.ids.has(String(dev.id)) ?? false}
          onChange={() => reviewed?.toggle(String(dev.id))}
          aria-label={`Marcar actividad ${dev.id} como revisada`}
        />
      </div>
    ),
  };

  return [
    ...(reviewed ? [reviewColumn] : []),
    {
      key: 'id',
      label: 'ID',
      minWidth: '90px',
      filterable: true,
      subFilters: [
        { key: 'id', label: 'ID' },
        { key: 'tipo', label: 'Tipo' }
      ],
      render: (dev) => (
        <div className="flex flex-col items-start gap-1">
          <Text as="span" variant="caption" color="gray" className="font-mono whitespace-nowrap">
            {dev.id}
          </Text>
          {dev.tipo && (
            <Text as="span" variant="caption" color="text-secondary" className="!text-[10px]">
              {getTipoLabel(dev.tipo)}
            </Text>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Proyecto',
      minWidth: '360px',
      maxWidth: '360px',
      filterable: true,
      subFilters: [
        { key: 'name_name', label: 'Nombre' },
        { key: 'name_description', label: 'Descripción' },
        { key: 'name_creator', label: 'Creado por' }
      ],
      render: (dev) => {
        const description = getDevelopmentDescription(dev);
        return (
          <div className="min-w-0">
            <Text variant="body2" weight="bold" className="truncate group-hover:text-[var(--color-primary)] transition-colors" title={getDevelopmentName(dev)}>
              {getDevelopmentName(dev)}
            </Text>
            {description && (
              <Text as="span" variant="caption" color="text-secondary" className="mt-0.5 block truncate !text-[11px]" title={description}>
                {description}
              </Text>
            )}
            {dev.creado_por_id && (
              <Text as="span" variant="caption" color="text-secondary" className="mt-0.5 block truncate !text-[10px] font-medium opacity-80">
                Creado por: {resolveUserName(dev.creado_por_id) || dev.creado_por_id}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Estado',
      minWidth: '100px',
      filterable: true,
      render: (dev) => {
        const status = getStatusLabel(getDevelopmentStatus(dev));
        const progress = getDevelopmentProgress(dev);
        
        let IconComponent = Clock;
        let iconColor = 'text-yellow-500';
        const s = status.toLowerCase();
        
        if (s.includes('pendiente')) {
          IconComponent = AlertCircle;
          iconColor = 'text-red-500 animate-pulse';
        } else if (s.includes('progreso') || s.includes('proceso') || s.includes('curso')) {
          IconComponent = PlayCircle;
          iconColor = 'text-blue-500';
        } else if (s.includes('complet')) {
          IconComponent = CheckCircle2;
          iconColor = 'text-green-500';
        } else if (s.includes('paus') || s.includes('pausa') || s.includes('pausado')) {
          IconComponent = PauseCircle;
          iconColor = 'text-orange-500';
        }
        
        return (
          <div className="flex items-center gap-2 w-full" title={status}>
            <IconComponent size={15} className={`${iconColor} shrink-0`} />
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full bg-green-500 transition-all duration-500 ${getProgressWidthClass(progress)}`} />
              </div>
              <Text as="span" variant="caption" weight="bold" color="text-secondary" className="!text-[9px] shrink-0">
                {progress}%
              </Text>
            </div>
          </div>
        );
      },
    },
    {
      key: 'prioridad',
      label: 'Prioridad',
      minWidth: '60px',
      centered: true,
      filterable: true,
      render: (dev) => {
        const p = dev.prioridad;
        if (!p) return <Text as="span" className="text-gray-400 dark:text-gray-600">—</Text>;
        const pLower = p.toLowerCase();
        let IconComponent = ArrowRight;
        let colorClass = 'text-orange-500';
        if (pLower === 'alta' || pLower === 'crítica' || pLower === 'critica') {
          IconComponent = ArrowUp;
          colorClass = 'text-red-500';
        } else if (pLower === 'baja') {
          IconComponent = ArrowDown;
          colorClass = 'text-blue-500';
        }
        return (
          <div className="flex items-center justify-center" title={`Prioridad: ${p}`}>
            <IconComponent size={16} className={`${colorClass} stroke-[2.5]`} />
          </div>
        );
      },
    },
    {
      key: 'start_date',
      label: 'Cronograma',
      minWidth: '100px',
      filterable: true,
      subFilters: [
        { key: 'start_date', label: 'Fecha Inicio' },
        { key: 'estimated_end_date', label: 'Fecha Fin' }
      ],
      render: (dev) => {
        const start = getDevelopmentStartDate(dev);
        const end = getDevelopmentEndDate(dev);
        return (
          <div className="flex flex-col gap-0.5 text-left">
            <div className="flex items-center gap-1.5">
              <Text as="span" className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="Fecha Inicio" />
              <Text as="span" variant="caption" color="text-primary" className="!text-[11px] font-medium whitespace-nowrap">
                {valueOrFallback(start)}
              </Text>
            </div>
            <div className="flex items-center gap-1.5">
              <Text as="span" className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title="Fecha Estimada Fin" />
              <Text as="span" variant="caption" color="text-secondary" className="!text-[10px] whitespace-nowrap">
                {valueOrFallback(end)}
              </Text>
            </div>
          </div>
        );
      },
    },
    {
      key: 'area_desarrollo',
      label: 'AREAS',
      minWidth: '75px',
      maxWidth: '75px',
      filterable: true,
      subFilters: [
        { key: 'area_desarrollo', label: 'Área de impacto' },
        { key: 'area_ejecutor', label: 'Área Ejecutora' }
      ],
      render: (dev) => {
        const imp = dev.area_desarrollo ?? 'N/A';
        const ejec = dev.area_ejecutor ?? '—';
        return (
          <div className="flex flex-col text-left min-w-0">
            <Text as="span" variant="caption" color="text-primary" className="truncate !text-[11px] font-medium" title={`Área de impacto: ${imp}`}>
              {imp}
            </Text>
            <Text as="span" variant="caption" color="text-secondary" className="truncate !text-[10px]" title={`Área Ejecutora: ${ejec}`}>
              {ejec}
            </Text>
          </div>
        );
      },
    },
    {
      key: 'authority',
      label: 'Equipo',
      minWidth: '360px',
      maxWidth: '360px',
      filterable: true,
      subFilters: [
        { key: 'authority', label: 'Autoridad' },
        { key: 'responsible', label: 'Líder' },
        { key: 'supervisor', label: 'Supervisor' },
        { key: 'analista', label: 'Ejecutor' }
      ],
      render: (dev) => {
        const aut = resolveUserName(dev.authority ?? dev.autoridad) || dev.authority || dev.autoridad || 'N/A';
        const lid = resolveUserName(dev.responsible ?? dev.responsable) || dev.responsible || dev.responsable || 'N/A';
        const sup = resolveUserName(dev.supervisor) || dev.supervisor || 'N/A';
        const eje = resolveUserName(dev.analista) || dev.analista || 'N/A';
        
        return (
          <div className="flex flex-col gap-0.5 text-left py-1 min-w-0">
            <div className="truncate !text-[10px] flex items-center" title={`Autoridad: ${aut}`}>
              <Text as="span" variant="caption" color="text-secondary" className="font-semibold w-[70px] shrink-0 !text-[10px]">Autoridad:</Text>
              <Text as="span" variant="caption" color="text-primary" className="truncate">{aut}</Text>
            </div>
            <div className="truncate !text-[10px] flex items-center" title={`Líder: ${lid}`}>
              <Text as="span" variant="caption" color="text-secondary" className="font-semibold w-[70px] shrink-0 !text-[10px]">Líder:</Text>
              <Text as="span" variant="caption" color="text-secondary" className="truncate">{lid}</Text>
            </div>
            <div className="truncate !text-[10px] flex items-center" title={`Supervisor: ${sup}`}>
              <Text as="span" variant="caption" color="text-secondary" className="font-semibold w-[70px] shrink-0 !text-[10px]">Supervisor:</Text>
              <Text as="span" variant="caption" color="text-secondary" className="truncate">{sup}</Text>
            </div>
            <div className="truncate !text-[10px] flex items-center" title={`Ejecutor: ${eje}`}>
              <Text as="span" variant="caption" color="text-secondary" className="font-semibold w-[70px] shrink-0 !text-[10px]">Ejecutor:</Text>
              <Text as="span" variant="caption" color="text-secondary" className="truncate">{eje}</Text>
            </div>
          </div>
        );
      },
    },
  ];
};
