import React, { useEffect, useState } from 'react';
import { API_CONFIG } from '../config/api';
import { Text, Title } from './atoms';

type Actividad = {
  id: number;
  desarrollo_id: string;
  titulo: string;
  estado: string;
  porcentaje_avance: number;
  fecha_inicio_estimada?: string;
  fecha_fin_estimada?: string;
  seguimiento?: string;
  descripcion?: string;
  compromiso?: string;
  archivo_url?: string;
};

type DesarrolloCon = {
  id: string;
  nombre: string;
  area_desarrollo?: string;
  analista?: string;
  actividades: Actividad[];
};

const getStatusClass = (estado: string) => {
  const colors: Record<string, string> = {
    completada: 'text-green-700 bg-green-100 dark:bg-green-900/20 dark:text-green-300',
    en_progreso: 'text-blue-700 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300',
    pendiente: 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300',
  };

  return colors[estado] || 'text-gray-700 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-300';
};

const formatDateRange = (start?: string, end?: string) => {
  if (!start && !end) return 'Sin fechas';
  if (start && end) return `${start} -> ${end}`;
  return start || end || 'Sin fechas';
};

const getProgressWidthClass = (progress: number) => {
  if (progress >= 100) return 'w-full';
  if (progress >= 75) return 'w-3/4';
  if (progress >= 50) return 'w-1/2';
  if (progress >= 25) return 'w-1/4';
  if (progress > 0) return 'w-1/12';
  return 'w-0';
};

const ConsolidatedTableById: React.FC<{ desarrolloId: string }> = ({ desarrolloId }) => {
  const [data, setData] = useState<DesarrolloCon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!desarrolloId) return;
    setLoading(true);
    fetch(`${API_CONFIG.BASE_URL}/desarrollos_actividades/${desarrolloId}`)
      .then((r) => {
        if (!r.ok) throw new Error('No encontrado');
        return r.json();
      })
      .then((d: DesarrolloCon) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError((e as Error).message);
        setLoading(false);
      });
  }, [desarrolloId]);

  if (loading) return <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">Cargando...</div>;
  if (error) return <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">Error: {error}</div>;
  if (!data) return <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">No hay datos para este desarrollo</div>;

  const completed = data.actividades.filter((a) => a.estado === 'completada').length;
  const inProgress = data.actividades.filter((a) => a.estado === 'en_progreso').length;
  const pending = data.actividades.filter((a) => a.estado === 'pendiente').length;
  const averageProgress = data.actividades.length
    ? Math.round(data.actividades.reduce((sum, item) => sum + (item.porcentaje_avance ?? 0), 0) / data.actividades.length)
    : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Text variant="caption" weight="bold" className="uppercase tracking-wider text-[var(--color-text-secondary)]">
              {data.id}
            </Text>
            <Title variant="h4" weight="bold" className="mt-1">
              {data.nombre}
            </Title>
            <Text variant="body2" color="text-secondary" className="mt-1">
              {data.area_desarrollo ?? 'Sin area'} · {data.analista ?? 'Sin analista'}
            </Text>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:min-w-[420px]">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-variant)] p-3">
              <Text variant="caption" color="text-secondary">Tareas</Text>
              <Text variant="body" weight="bold">{data.actividades.length}</Text>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-variant)] p-3">
              <Text variant="caption" color="text-secondary">Avance</Text>
              <Text variant="body" weight="bold">{averageProgress}%</Text>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-variant)] p-3">
              <Text variant="caption" color="text-secondary">Completadas</Text>
              <Text variant="body" weight="bold">{completed}</Text>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-variant)] p-3">
              <Text variant="caption" color="text-secondary">Pendientes</Text>
              <Text variant="body" weight="bold">{pending + inProgress}</Text>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="hidden grid-cols-[minmax(320px,1fr)_120px_140px_180px_minmax(220px,0.8fr)] gap-0 bg-[var(--deep-navy)] text-white md:grid">
          <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-white/80">Tarea</div>
          <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-white/80">Estado</div>
          <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-white/80">Progreso</div>
          <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-white/80">Fechas</div>
          <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-white/80">Seguimiento</div>
        </div>
        <div className="max-h-[calc(100vh-360px)] min-h-[280px] overflow-y-auto custom-scrollbar">
          {data.actividades.map((a) => (
            <div key={`${data.id}-${a.id}`} className="grid gap-3 border-t border-[var(--color-border)] px-4 py-4 transition-colors hover:bg-[var(--color-surface-variant)] md:grid-cols-[minmax(320px,1fr)_120px_140px_180px_minmax(220px,0.8fr)] md:gap-0 md:px-0 md:py-0">
              <div className="px-0 md:px-4 md:py-3">
                <Text variant="body2" weight="bold" className="leading-snug">
                  {a.titulo}
                </Text>
                {a.descripcion && (
                  <Text variant="caption" color="text-secondary" className="mt-1 line-clamp-2">
                    {a.descripcion}
                  </Text>
                )}
              </div>
              <div className="flex items-start px-0 md:px-4 md:py-3">
                <Text as="span" variant="caption" weight="bold" color="inherit" className={`inline-flex rounded-full px-2 py-1 !text-[10px] uppercase tracking-wider ${getStatusClass(a.estado)}`}>
                  {a.estado}
                </Text>
              </div>
              <div className="px-0 md:px-4 md:py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div className={`h-full bg-[var(--deep-navy)] ${getProgressWidthClass(a.porcentaje_avance ?? 0)}`} />
                  </div>
                  <Text variant="caption" weight="bold" className="w-9 text-right">
                    {a.porcentaje_avance ?? 0}%
                  </Text>
                </div>
              </div>
              <div className="px-0 md:px-4 md:py-3">
                <Text variant="caption" color="text-secondary">
                  {formatDateRange(a.fecha_inicio_estimada, a.fecha_fin_estimada)}
                </Text>
              </div>
              <div className="px-0 md:px-4 md:py-3">
                <Text variant="caption" color="text-secondary" className="line-clamp-2">
                  {a.seguimiento || a.compromiso || 'Sin seguimiento'}
                </Text>
                {a.archivo_url && (
                  <a href={a.archivo_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] font-semibold text-[var(--color-primary)] hover:underline">
                    Ver archivo
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedTableById;
