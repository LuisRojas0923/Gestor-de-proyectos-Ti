import React from 'react';
import { DataTableColumn } from '../../../components/molecules/DataTable';
import { Text } from '../../../components/atoms';
import { DevelopmentWithCurrentStatus } from '../../../types';

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

export const getColumnAccessors = (resolveUserName: (val?: string | null) => string | undefined) => ({
  id:                 (dev: DevelopmentRow) => String(dev.id),
  tipo:               (dev: DevelopmentRow) => getTipoLabel(dev.tipo) || '',
  name:               getDevelopmentName,
  name_name:          getDevelopmentName,
  name_description:   (dev: DevelopmentRow) => getDevelopmentDescription(dev) ?? '(Vacío)',
  name_creator:       (dev: DevelopmentRow) => resolveUserName(dev.creado_por_id) || dev.creado_por_id || '(Vacío)',
  status:             (dev: DevelopmentRow) => getStatusLabel(getDevelopmentStatus(dev)),
  start_date:         getDevelopmentStartDate,
  estimated_end_date: getDevelopmentEndDate,
  area_desarrollo:    (dev: DevelopmentRow) => dev.area_desarrollo || '(Vacío)',
  analista:           (dev: DevelopmentRow) => resolveUserName(dev.analista) || dev.analista || '(Sin asignar)',
  area_ejecutor:      (dev: DevelopmentRow) => dev.area_ejecutor || '(Sin área)',
  supervisor:         (dev: DevelopmentRow) => resolveUserName(dev.supervisor) || dev.supervisor || '(Sin asignar)',
  authority:          (dev: DevelopmentRow) => resolveUserName(dev.authority ?? dev.autoridad) || dev.authority || dev.autoridad || '(Sin asignar)',
  responsible:        (dev: DevelopmentRow) => resolveUserName(dev.responsible ?? dev.responsable) || dev.responsible || dev.responsable || '(Sin asignar)',
});

export const getColumns = (resolveUserName: (val?: string | null) => string | undefined): DataTableColumn<DevelopmentRow>[] => [
  {
    key: 'id',
    label: 'ID',
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
    flex: true,
    minWidth: '360px',
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
    centered: true,
    filterable: true,
    render: (dev) => {
      const status = getStatusLabel(getDevelopmentStatus(dev));
      return (
        <Text as="span" variant="caption" weight="medium" color="inherit"
          className={`inline-flex items-center rounded-full !text-[10px] tracking-wider px-2 py-0.5 ${getStatusColor(status)} shadow-md`}>
          {status}
        </Text>
      );
    },
  },
  {
    key: 'progress',
    label: 'Progreso',
    minWidth: '100px',
    render: (dev) => {
      const progress = getDevelopmentProgress(dev);
      return (
        <div className="flex items-center gap-1.5 w-full">
          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full bg-green-500 transition-all duration-500 ${getProgressWidthClass(progress)}`} />
          </div>
          <Text as="span" variant="caption" weight="bold" color="text-secondary" className="w-8 text-right !text-[10px]">
            {progress}%
          </Text>
        </div>
      );
    },
  },
  {
    key: 'start_date',
    label: 'Inicio',
    minWidth: '80px',
    filterable: true,
    render: (dev) => (
      <Text as="span" variant="caption" color="text-secondary" className="!text-[11px]">
        {valueOrFallback(getDevelopmentStartDate(dev))}
      </Text>
    ),
  },
  {
    key: 'estimated_end_date',
    label: 'Fin',
    minWidth: '80px',
    filterable: true,
    render: (dev) => (
      <Text as="span" variant="caption" color="text-secondary" className="!text-[11px]">
        {valueOrFallback(getDevelopmentEndDate(dev))}
      </Text>
    ),
  },
  {
    key: 'area_desarrollo',
    label: 'Área de impacto',
    minWidth: '100px',
    filterable: true,
    render: (dev) => (
      <Text as="span" variant="caption" color="text-secondary" className="truncate !text-[11px]" title={dev.area_desarrollo ?? 'N/A'}>
        {dev.area_desarrollo ?? 'N/A'}
      </Text>
    ),
  },
  {
    key: 'area_ejecutor',
    label: 'Área Ejec.',
    minWidth: '90px',
    filterable: true,
    render: (dev) => (
      <Text as="span" variant="caption" color="text-secondary" className="truncate !text-[11px]" title={dev.area_ejecutor ?? '—'}>
        {dev.area_ejecutor ?? '—'}
      </Text>
    ),
  },
  {
    key: 'authority',
    label: 'Autoridad',
    minWidth: '90px',
    filterable: true,
    render: (dev) => (
      <Text as="span" variant="caption" color="text-secondary" className="truncate !text-[11px]" title={valueOrFallback(resolveUserName(dev.authority ?? dev.autoridad))}>
        {valueOrFallback(resolveUserName(dev.authority ?? dev.autoridad))}
      </Text>
    ),
  },
  {
    key: 'responsible',
    label: 'Líder',
    minWidth: '90px',
    filterable: true,
    render: (dev) => (
      <Text as="span" variant="caption" color="text-secondary" className="truncate !text-[11px]" title={valueOrFallback(resolveUserName(dev.responsible ?? dev.responsable))}>
        {valueOrFallback(resolveUserName(dev.responsible ?? dev.responsable))}
      </Text>
    ),
  },
  {
    key: 'supervisor',
    label: 'Supervisor',
    minWidth: '90px',
    filterable: true,
    render: (dev) => (
      <Text as="span" variant="caption" color="text-secondary" className="truncate !text-[11px]" title={valueOrFallback(resolveUserName(dev.supervisor))}>
        {valueOrFallback(resolveUserName(dev.supervisor))}
      </Text>
    ),
  },
  {
    key: 'analista',
    label: 'Ejecutor',
    minWidth: '90px',
    filterable: true,
    render: (dev) => (
      <div className="flex items-center gap-2 min-w-0" title={resolveUserName(dev.analista) ?? 'N/A'}>
        <div className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold bg-[var(--color-primary-light)] text-[var(--color-primary)]">
          {(dev.analista ?? 'A')[0].toUpperCase()}
        </div>
        <Text as="span" variant="caption" color="text-secondary" className="truncate !text-[11px]">
          {resolveUserName(dev.analista) ?? 'N/A'}
        </Text>
      </div>
    ),
  },
];
