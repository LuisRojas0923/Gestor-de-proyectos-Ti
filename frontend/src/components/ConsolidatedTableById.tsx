import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { API_CONFIG } from '../config/api';
import { Text, Title, Button, Badge, Icon } from './atoms';

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

const COLUMNS = [
    { key: 'tarea', label: 'Tarea', width: 'flex-1 min-w-[260px]' },
    { key: 'estado', label: 'Estado', width: 'md:w-24' },
    { key: 'progreso', label: 'Progreso', width: 'md:w-28' },
    { key: 'fechas', label: 'Fechas', width: 'md:w-28' },
    { key: 'seguimiento', label: 'Seguimiento', width: 'md:w-40' },
    { key: 'acciones', label: 'Acciones', width: 'md:w-24', isActions: true },
];

const getStatusVariant = (estado: string): 'error' | 'warning' | 'success' | 'default' => {
    const lower = estado.toLowerCase();
    if (lower.includes('pendiente')) return 'error';
    if (lower.includes('progreso') || lower.includes('curso')) return 'warning';
    if (lower.includes('complet')) return 'success';
    return 'default';
};

const getProgressColor = (pct: number) => {
    if (pct >= 75) return 'bg-emerald-500';
    if (pct >= 50) return 'bg-blue-500';
    if (pct >= 25) return 'bg-yellow-500';
    if (pct > 0) return 'bg-orange-400';
    return 'bg-gray-200 dark:bg-gray-700';
};

const getProgressWidthClass = (pct: number) => {
    if (pct >= 100) return 'w-full';
    if (pct >= 75) return 'w-3/4';
    if (pct >= 50) return 'w-1/2';
    if (pct >= 25) return 'w-1/4';
    if (pct > 0) return 'w-1/12';
    return 'w-0';
};

const formatDateShort = (dateStr?: string) => {
    if (!dateStr || dateStr === 'N/A') return '—';
    try {
        return new Date(dateStr).toLocaleDateString();
    } catch {
        return dateStr;
    }
};

const ConsolidatedTableById: React.FC<{ desarrolloId: string }> = ({ desarrolloId }) => {
    const [data, setData] = useState<DesarrolloCon | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
    const [filterSearchTerm, setFilterSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
    const filterRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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

    const uniqueValues = useMemo(() => {
        if (!data) return {};
        const estadoSet = new Set(data.actividades.map((a) => a.estado));
        const progresoSet = new Set(
            data.actividades.map((a) => {
                const pct = a.porcentaje_avance ?? 0;
                if (pct === 0) return 'Sin progreso (0%)';
                if (pct <= 25) return '0-25%';
                if (pct <= 50) return '26-50%';
                if (pct <= 75) return '51-75%';
                if (pct < 100) return '76-99%';
                return 'Completado (100%)';
            })
        );
        return {
            estado: Array.from(estadoSet).sort(),
            progreso: Array.from(progresoSet),
        };
    }, [data]);

    const columnOptions = (key: string) => uniqueValues[key as keyof typeof uniqueValues] || [];

    const getProgressBucket = (pct: number): string => {
        if (pct === 0) return 'Sin progreso (0%)';
        if (pct <= 25) return '0-25%';
        if (pct <= 50) return '26-50%';
        if (pct <= 75) return '51-75%';
        if (pct < 100) return '76-99%';
        return 'Completado (100%)';
    };

    const filteredActividades = useMemo(() => {
        if (!data) return [];
        return data.actividades.filter((a) => {
            for (const [key, selected] of Object.entries(columnFilters)) {
                if (selected.size === 0) continue;
                let value: string;
                if (key === 'estado') {
                    value = a.estado;
                } else if (key === 'progreso') {
                    value = getProgressBucket(a.porcentaje_avance ?? 0);
                } else {
                    continue;
                }
                if (!selected.has(value)) return false;
            }
            return true;
        });
    }, [data, columnFilters]);

    const hasActiveFilters = Object.values(columnFilters).some((s) => s.size > 0);

    const toggleFilter = (key: string) => {
        if (activeFilter === key) {
            setActiveFilter(null);
            setAnchorRect(null);
            setFilterSearchTerm('');
        } else {
            setActiveFilter(key);
            setFilterSearchTerm('');
            const ref = filterRefs.current[key];
            if (ref) {
                setAnchorRect(ref.getBoundingClientRect());
            }
        }
    };

    const handleClearFilters = () => {
        setColumnFilters({});
    };

    if (loading)
        return (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                <Text variant="body2" color="text-secondary" weight="medium">Cargando actividades...</Text>
            </div>
        );
    if (error)
        return (
            <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-6">
                <Text variant="body2" weight="bold" className="text-red-600 dark:text-red-400">Error: {error}</Text>
            </div>
        );
    if (!data) return null;

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
                            {data.area_desarrollo ?? 'Sin área de impacto'} · {data.analista ?? 'Sin líder'}
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

            {data.actividades.length > 0 ? (
                <div className="relative flex max-h-[calc(100vh-220px)] min-h-[320px] flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                    <table className="w-full text-left border-collapse table-fixed">
                        <colgroup>
                            {COLUMNS.map((col) => (
                                <col key={col.key} className={col.width} />
                            ))}
                        </colgroup>
                        <thead className="bg-[var(--deep-navy)]">
                            <tr>
                                {COLUMNS.map((col, idx) => (
                                    col.isActions ? (
                                        <th
                                            key={col.key}
                                            className={`${col.width} shrink-0 py-2.5 px-4 bg-white/10`}
                                        >
                                            <Text as="span" variant="caption" weight="bold" color="white" className="uppercase tracking-wider !text-[11px]">
                                                {col.label}
                                            </Text>
                                        </th>
                                    ) : (
                                        <th
                                            key={col.key}
                                            className={`${col.width} shrink-0 py-2.5 px-4 ${idx === 0 ? 'bg-blue-500/20' : 'hover:bg-white/5'} transition-colors cursor-pointer group`}
                                            onClick={() => toggleFilter(col.key)}
                                            ref={(el) => { filterRefs.current[col.key] = el; }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <Text as="span" variant="caption" weight="bold" color="inherit" className={`
                                                    text-xs font-bold uppercase tracking-wider !text-[11px] transition-colors
                                                    ${idx === 0 ? 'text-blue-300' : 'text-white/70 group-hover:text-white'}
                                                `}>
                                                    {col.label}
                                                </Text>
                                                {columnFilters[col.key]?.size > 0 && (
                                                    <Text as="span" className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                                                )}
                                            </div>
                                        </th>
                                    )
                                ))}
                            </tr>
                        </thead>
                    </table>

                    <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse table-fixed">
                            <colgroup>
                                {COLUMNS.map((col) => (
                                    <col key={col.key} className={col.width} />
                                ))}
                            </colgroup>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {filteredActividades.length > 0 ? (
                                    filteredActividades.map((a) => (
                                        <tr key={`${data.id}-${a.id}`} className="group hover:bg-[var(--color-surface-variant)] transition-colors cursor-pointer relative">
                                            <td className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--deep-navy)]"></td>
                                            <td className="flex-1 min-w-[260px] py-3 px-4">
                                                <Text variant="body2" weight="bold" className="truncate leading-snug group-hover:text-[var(--color-primary)] transition-colors">
                                                    {a.titulo}
                                                </Text>
                                                {a.descripcion && (
                                                    <Text as="span" variant="caption" color="text-secondary" className="mt-0.5 block max-w-[480px] truncate !text-[11px]">
                                                        {a.descripcion}
                                                    </Text>
                                                )}
                                            </td>
                                            <td className="md:w-24 shrink-0 py-3 px-4 text-center">
                                                <Badge variant={getStatusVariant(a.estado)} size="sm" className="uppercase tracking-wider">
                                                    {a.estado || 'Sin estado'}
                                                </Badge>
                                            </td>
                                            <td className="md:w-28 shrink-0 py-3 px-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full bg-[var(--deep-navy)] transition-all duration-500 ${getProgressWidthClass(a.porcentaje_avance ?? 0)}`}
                                                        />
                                                    </div>
                                                    <Text as="span" variant="caption" weight="bold" color="text-secondary" className="w-8 text-right !text-[10px]">
                                                        {a.porcentaje_avance ?? 0}%
                                                    </Text>
                                                </div>
                                            </td>
                                            <td className="md:w-28 shrink-0 py-3 px-4">
                                                <div className="flex items-center gap-1 text-gray-400">
                                                    <Icon name={Calendar} size="xs" className="shrink-0" />
                                                    <Text as="span" variant="caption" color="text-secondary" className="!text-[11px] truncate">
                                                        {a.fecha_inicio_estimada && a.fecha_fin_estimada
                                                            ? `${formatDateShort(a.fecha_inicio_estimada)} → ${formatDateShort(a.fecha_fin_estimada)}`
                                                            : a.fecha_inicio_estimada
                                                            ? `Desde: ${formatDateShort(a.fecha_inicio_estimada)}`
                                                            : a.fecha_fin_estimada
                                                            ? `Hasta: ${formatDateShort(a.fecha_fin_estimada)}`
                                                            : '—'}
                                                    </Text>
                                                </div>
                                            </td>
                                            <td className="md:w-40 shrink-0 py-3 px-4">
                                                <Text as="span" variant="caption" color="text-secondary" className="block max-w-[200px] truncate !text-[11px]">
                                                    {a.seguimiento || a.compromiso || '—'}
                                                </Text>
                                                {a.archivo_url && (
                                                    <a
                                                        href={a.archivo_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-1 inline-block text-[11px] font-semibold text-[var(--color-primary)] hover:underline"
                                                    >
                                                        Ver archivo
                                                    </a>
                                                )}
                                            </td>
                                            <td className="md:w-24 shrink-0 py-3 px-4 text-center">
                                                <Button
                                                    variant="custom"
                                                    className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20 inline-flex items-center justify-center"
                                                    title="Ver detalles"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye" aria-hidden="true">
                                                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
                                                        <circle cx="12" cy="12" r="3"></circle>
                                                    </svg>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={COLUMNS.length} className="py-12 text-center">
                                            <Text variant="body2" color="text-secondary" weight="medium">
                                                Sin resultados para los filtros aplicados
                                            </Text>
                                            {hasActiveFilters && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleClearFilters}
                                                    className="mt-2 text-red-500"
                                                >
                                                    Limpiar filtros
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="py-12 text-center bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
                    <Text variant="body2" color="text-secondary">No hay actividades registradas para este desarrollo.</Text>
                </div>
            )}
        </div>
    );
};

export default ConsolidatedTableById;
