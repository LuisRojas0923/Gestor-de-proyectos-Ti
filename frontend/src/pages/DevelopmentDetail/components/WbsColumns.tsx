import React from 'react';
import { Download, Pencil, Copy, Trash2, CheckCircle2, XCircle, Play, CirclePause } from 'lucide-react';
import { Text, Button, Badge, ProgressBar } from '../../../components/atoms';
import { ValidationStatusBadge } from '../../../components/assignments/ValidationStatusBadge';
import { DataTableColumn } from '../../../components/molecules/DataTable';
import { WbsActivityTree } from '../../../types/wbs';

type WbsRow = WbsActivityTree & { _rowIndex: number };

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
        const [y, m, d] = dateStr.split('T')[0].split('-');
        return `${d}/${m}/${y}`;
    } catch {
        return dateStr;
    }
};

interface GetWbsColumnsArgs {
  getUserName: (id?: string) => string;
  resolvingIds: Set<number>;
  handleResolveValidation: (id: number, estado: 'aprobada' | 'rechazada') => void;
  stateMenuId: number | null;
  setStateMenuId: (id: number | null) => void;
  popoverPos: { top: number; left: number } | null;
  setPopoverPos: (pos: { top: number; left: number } | null) => void;
  handleQuickAction: (id: number, action: 'play' | 'pause' | 'finish', currentNode: WbsActivityTree) => void;
  handleEstadoChange: (id: number, newEstado: string) => void;
  handleEditTask: (node: WbsActivityTree) => void;
  handleCopyTask: (node: WbsActivityTree) => void;
  handleDeleteClick: (id: number) => void;
  stateMenuRef: React.RefObject<HTMLDivElement | null>;
}

export const getWbsColumns = ({
  getUserName,
  resolvingIds,
  handleResolveValidation,
  stateMenuId,
  setStateMenuId,
  popoverPos,
  setPopoverPos,
  handleQuickAction,
  handleEstadoChange,
  handleEditTask,
  handleCopyTask,
  handleDeleteClick,
  stateMenuRef,
}: GetWbsColumnsArgs): DataTableColumn<WbsRow>[] => [
    {
        key: 'index',
        label: '#',
        minWidth: '32px',
        centered: true,
        filterable: true,
        render: (row) => (
            <Text variant="caption" className="w-6 text-center text-[var(--color-text-secondary)]">
                {row._rowIndex}
            </Text>
        ),
    },
    {
        key: 'titulo',
        label: 'Tarea',
        minWidth: '360px',
        flex: true,
        filterable: true,
        subFilters: [
            { key: 'titulo_titulo', label: 'Título' },
            { key: 'titulo_descripcion', label: 'Descripción' }
        ],
        render: (row) => (
            <div className="min-w-0" data-column="titulo">
                <Text weight="bold" className="block truncate" title={row.titulo}>{row.titulo}</Text>
                {row.descripcion && (
                    <Text variant="caption" color="text-secondary" className="block truncate mt-0.5" title={row.descripcion}>
                        {row.descripcion}
                    </Text>
                )}
            </div>
        ),
    },
    {
        key: 'fecha_inicio_estimada',
        label: 'F.Inicio',
        minWidth: '58px',
        filterable: true,
        render: (row) => (
            <Text variant="caption" className="truncate">
                {formatDate(row.fecha_inicio_estimada || row.fecha_inicio_real)}
            </Text>
        ),
    },
    {
        key: 'fecha_fin_estimada',
        label: 'F.Fin',
        minWidth: '58px',
        filterable: true,
        render: (row) => (
            <Text variant="caption" className="truncate">
                {formatDate(row.fecha_fin_estimada || row.fecha_fin_real)}
            </Text>
        ),
    },
    {
        key: 'lider',
        label: 'Líder',
        minWidth: '80px',
        filterable: true,
        subFilters: [
            { key: 'lider_supervisor', label: 'Supervisor' },
            { key: 'lider_ejecutor', label: 'Ejecutor' }
        ],
        render: (row) => (
            <div className="flex flex-col min-w-0">
                <Text variant="caption" color="text-secondary" className="truncate text-[10px] leading-tight">
                    Supervisor: {getUserName(row.responsable_id)}
                </Text>
                <Text variant="caption" color="text-secondary" className="truncate text-[10px] leading-tight">
                    Ejecutor: {getUserName(row.asignado_a_id)}
                </Text>
            </div>
        ),
    },
    {
        key: 'validacion',
        label: 'Validación',
        minWidth: '72px',
        filterable: true,
        render: (row) => {
            const status = row.estado_validacion;
            const isPending = status?.toLowerCase() === 'pendiente';
            const isResolving = resolvingIds.has(row.validacion_id ?? -1);
            if (isPending && row.validacion_id) {
                return (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); void handleResolveValidation(row.validacion_id!, 'aprobada'); }}
                            disabled={isResolving}
                            className="h-6 w-6 !p-0 text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800"
                            title="Aprobar"
                        >
                            <CheckCircle2 size={12} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); void handleResolveValidation(row.validacion_id!, 'rechazada'); }}
                            disabled={isResolving}
                            className="h-6 w-6 !p-0 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800"
                            title="Rechazar"
                        >
                            <XCircle size={12} />
                        </Button>
                    </div>
                );
            }
            return <ValidationStatusBadge status={status} />;
        },
    },
    {
        key: 'estado',
        label: 'Estado',
        minWidth: '120px',
        filterable: true,
        render: (row) => {
            const n = row.estado.toLowerCase();
            const isCompleted = n.includes('complet');
            const isInProgress = n.includes('progreso') || n.includes('curso') || n.includes('proceso');
            const isPaused = n.includes('pausa');
            const isBlocked = n.includes('bloqueado');
            const isMenuOpen = stateMenuId === row.id;

            const badgeVariant = isCompleted
                ? 'success'
                : isInProgress
                ? 'warning'
                : isBlocked
                ? 'error'
                : 'default';

            const badgeClassName = `whitespace-nowrap ${
                isPaused
                    ? '!bg-amber-100 !text-amber-800 dark:!bg-amber-900/20 dark:!text-amber-400'
                    : (!isCompleted && !isInProgress && !isBlocked)
                    ? 'dark:!bg-neutral-800 dark:!text-neutral-400'
                    : ''
            }`;

            return (
                <div className="flex items-center gap-1 w-full relative pr-5">
                    <Badge
                        variant={badgeVariant}
                        size="sm"
                        className={badgeClassName}
                    >
                        {row.estado === 'En Progreso' ? 'En proceso' : row.estado}
                    </Badge>
                    {!isCompleted && !isInProgress && !isPaused && !isBlocked && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); void handleQuickAction(row.id, 'play', row); }}
                            icon={Play}
                            className="h-7 w-7 !p-0 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                            title="Iniciar"
                        />
                    )}
                    {isInProgress && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); void handleQuickAction(row.id, 'pause', row); }}
                            icon={CirclePause}
                            className="h-7 w-7 !p-0 text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                            title="Pausar"
                        />
                    )}
                    {isPaused && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); void handleQuickAction(row.id, 'play', row); }}
                            icon={Play}
                            className="h-7 w-7 !p-0 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                            title="Reanudar"
                        />
                    )}
                    {isBlocked && (
                        <Text className="text-base" title="Bloqueado" aria-label="Bloqueado">🔒</Text>
                    )}
                    {(isInProgress || isPaused) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); void handleQuickAction(row.id, 'finish', row); }}
                            icon={CheckCircle2}
                            className="h-7 w-7 !p-0 text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                            title="Terminar"
                        />
                    )}
                    {isCompleted && (
                        <Text className="text-green-600 dark:text-green-400" aria-label="Completada">
                            <CheckCircle2 size={18} />
                        </Text>
                    )}
                    <div className="relative ml-auto">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isMenuOpen) {
                                    setStateMenuId(null);
                                    setPopoverPos(null);
                                } else {
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    setPopoverPos({ top: rect.top - 6, left: rect.left - 126 });
                                    setStateMenuId(row.id);
                                }
                            }}
                            className="h-6 w-6 !p-0 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                            title="Cambiar estado"
                        >
                            ⋮
                        </Button>
                        {isMenuOpen && popoverPos && (
                            <div
                                ref={stateMenuRef}
                                className="fixed z-[99999] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-lg flex items-center gap-1"
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 !p-0"
                                    title="Pendiente"
                                    onClick={(e) => { e.stopPropagation(); void handleEstadoChange(row.id, 'Pendiente'); setStateMenuId(null); setPopoverPos(null); }}
                                >
                                    <Play size={14} className="text-blue-600 dark:text-blue-400" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 !p-0"
                                    title="En proceso"
                                    onClick={(e) => { e.stopPropagation(); void handleEstadoChange(row.id, 'En Progreso'); setStateMenuId(null); setPopoverPos(null); }}
                                >
                                    <CirclePause size={14} className="text-amber-600 dark:text-amber-400" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 !p-0"
                                    title="Bloqueado"
                                    onClick={(e) => { e.stopPropagation(); void handleEstadoChange(row.id, 'Bloqueado'); setStateMenuId(null); setPopoverPos(null); }}
                                >
                                    <XCircle size={14} className="text-red-500 dark:text-red-400" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 !p-0"
                                    title="Completada"
                                    onClick={(e) => { e.stopPropagation(); void handleEstadoChange(row.id, 'Completada'); setStateMenuId(null); setPopoverPos(null); }}
                                >
                                    <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="absolute right-[-16px] top-1/2 -translate-y-1/2 h-5 w-[1px] bg-neutral-200 dark:bg-neutral-700/60" />
                </div>
            );
        },
    },
    {
        key: 'seguimiento',
        label: 'Seguimiento',
        minWidth: '120px',
        maxWidth: '120px',
        filterable: true,
        render: (row) => (
            <Text variant="caption" className="truncate" title={row.seguimiento}>
                {row.seguimiento || '-'}
            </Text>
        ),
    },
    {
        key: 'compromiso',
        label: 'Compromiso',
        minWidth: '90px',
        maxWidth: '90px',
        render: (row) => (
            <Text variant="caption" className="truncate" title={row.compromiso}>
                {row.compromiso || '-'}
            </Text>
        ),
    },
    {
        key: 'archivo',
        label: '📎',
        minWidth: '40px',
        centered: true,
        render: (row) => row.archivo_url ? (
            <a href={row.archivo_url} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] hover:underline">
                <Download size={14} />
            </a>
        ) : (
            <Text variant="caption" color="text-secondary">-</Text>
        ),
    },
    {
        key: 'porcentaje_avance',
        label: 'Avance',
        minWidth: '58px',
        filterable: true,
        render: (row) => (
            <div className="w-full text-right">
                <Text variant="caption">{row.porcentaje_avance}%</Text>
                <ProgressBar
                    progress={row.porcentaje_avance}
                    variant={row.porcentaje_avance === 100 ? 'success' : 'primary'}
                    className="h-1 mt-1"
                />
            </div>
        ),
    },
    {
        key: 'acciones',
        label: 'Acciones',
        minWidth: '110px',
        centered: true,
        render: (row) => (
            <div className="flex items-center justify-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleEditTask(row); }}
                    icon={Pencil}
                    className="h-7 w-7 !p-0 text-neutral-600 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 shadow-sm"
                    title="Editar"
                />
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); void handleCopyTask(row); }}
                    icon={Copy}
                    className="h-7 w-7 !p-0 text-primary-500 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/40 border border-primary-200 dark:border-primary-800 shadow-sm"
                    title="Copiar tarea"
                />
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); void handleDeleteClick(row.id); }}
                    icon={Trash2}
                    className="h-7 w-7 !p-0 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 shadow-sm"
                    title="Eliminar"
                />
            </div>
        )
    },
];
