import React from 'react';
import {
    Download,
    Pencil,
    Copy,
    Trash2,
    CheckCircle2,
    XCircle,
    CirclePause,
    Calendar,
    CalendarCheck,
    UserCog,
    User,
    MessageSquare,
    Handshake,
    PlayCircle,
    AlertCircle,
    type LucideIcon,
} from 'lucide-react';
import { Text, Button, ProgressBar } from '../../../components/atoms';
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

const ESTADO_ICON_SIZE = 16;

const getEstadoStatusIcon = (estado: string) => {
    const n = estado.toLowerCase();
    if (n.includes('complet')) {
        return { Icon: CheckCircle2, className: 'text-green-600 dark:text-green-400', label: estado };
    }
    if (n.includes('progreso') || n.includes('curso') || n.includes('proceso')) {
        return { Icon: PlayCircle, className: 'text-amber-600 dark:text-amber-400', label: estado };
    }
    if (n.includes('pausa')) {
        return { Icon: CirclePause, className: 'text-amber-600 dark:text-amber-400', label: estado };
    }
    if (n.includes('bloqueado')) {
        return { Icon: XCircle, className: 'text-red-500 dark:text-red-400', label: estado };
    }
    if (n.includes('pendiente')) {
        return { Icon: AlertCircle, className: 'text-red-500 animate-pulse', label: estado };
    }
    return { Icon: AlertCircle, className: 'text-red-500 animate-pulse', label: estado };
};

const ESTADO_MENU_OPTIONS = [
    { value: 'Pendiente', ...getEstadoStatusIcon('Pendiente') },
    { value: 'En Proceso', ...getEstadoStatusIcon('En Proceso') },
    { value: 'Pausa', ...getEstadoStatusIcon('Pausa') },
    { value: 'Bloqueado', ...getEstadoStatusIcon('Bloqueado') },
    { value: 'Completada', ...getEstadoStatusIcon('Completada') },
] as const;

interface StackedIconRowProps {
    Icon: LucideIcon;
    iconClassName: string;
    iconTitle: string;
    value: string;
    valueTitle?: string;
}

const StackedIconRow: React.FC<StackedIconRowProps> = ({
    Icon,
    iconClassName,
    iconTitle,
    value,
    valueTitle,
}) => (
    <div className="flex items-center gap-0.5 min-w-0">
        <Text as="span" title={iconTitle} aria-label={iconTitle} className="shrink-0 inline-flex m-0">
            <Icon size={10} className={iconClassName} />
        </Text>
        <Text
            as="span"
            variant="caption"
            color="text-primary"
            weight="bold"
            className="!text-[10px] truncate min-w-0 leading-none"
            title={valueTitle ?? value}
        >
            {value}
        </Text>
    </div>
);

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
  handleQuickAction: _handleQuickAction,
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
        minWidth: '420px',
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
        key: 'fechas',
        label: 'Fechas',
        minWidth: '96px',
        maxWidth: '96px',
        cellClassName: '!px-2',
        filterable: true,
        subFilters: [
            { key: 'fecha_inicio_estimada', label: 'Fecha Inicio' },
            { key: 'fecha_fin_estimada', label: 'Fecha Fin' },
        ],
        render: (row) => (
            <div className="flex flex-col gap-0 min-w-0 overflow-hidden">
                <StackedIconRow
                    Icon={Calendar}
                    iconClassName="text-green-600 dark:text-green-400"
                    iconTitle="Fecha inicio"
                    value={formatDate(row.fecha_inicio_estimada || row.fecha_inicio_real)}
                />
                <StackedIconRow
                    Icon={CalendarCheck}
                    iconClassName="text-red-500 dark:text-red-400"
                    iconTitle="Fecha fin"
                    value={formatDate(row.fecha_fin_estimada || row.fecha_fin_real)}
                />
            </div>
        ),
    },
    {
        key: 'lider',
        label: 'Líder',
        minWidth: '180px',
        maxWidth: '180px',
        cellClassName: '!px-2',
        filterable: true,
        subFilters: [
            { key: 'lider_supervisor', label: 'Supervisor' },
            { key: 'lider_ejecutor', label: 'Ejecutor' }
        ],
        render: (row) => {
            const supervisor = getUserName(row.responsable_id);
            const ejecutor = getUserName(row.asignado_a_id);
            return (
                <div className="flex flex-col gap-0 min-w-0 overflow-hidden">
                    <StackedIconRow
                        Icon={UserCog}
                        iconClassName="text-neutral-500 dark:text-neutral-400"
                        iconTitle={`Supervisor: ${supervisor}`}
                        value={supervisor}
                        valueTitle={`Supervisor: ${supervisor}`}
                    />
                    <StackedIconRow
                        Icon={User}
                        iconClassName="text-neutral-500 dark:text-neutral-400"
                        iconTitle={`Ejecutor: ${ejecutor}`}
                        value={ejecutor}
                        valueTitle={`Ejecutor: ${ejecutor}`}
                    />
                </div>
            );
        },
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
        minWidth: '100px',
        maxWidth: '128px',
        cellClassName: '!px-2',
        filterable: true,
        subFilters: [
            { key: 'estado', label: 'Estado' },
            { key: 'porcentaje_avance', label: 'Avance' },
        ],
        render: (row) => {
            const isMenuOpen = stateMenuId === row.id;
            const { Icon: StatusIcon, className: statusClass, label: statusLabel } = getEstadoStatusIcon(row.estado);

            return (
                <div className="flex flex-col gap-0.5 min-w-0 w-full">
                    <div className="relative flex items-center w-full min-w-0 min-h-6">
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <Text
                                as="span"
                                title={statusLabel}
                                aria-label={statusLabel}
                                className="pointer-events-auto shrink-0 inline-flex items-center justify-center m-0"
                            >
                                <StatusIcon size={ESTADO_ICON_SIZE} className={statusClass} />
                            </Text>
                        </div>
                        <div className="relative z-10 ml-auto shrink-0" data-wbs-state-menu-trigger>
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
                                        setPopoverPos({ top: rect.top - 6, left: rect.left - 158 });
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
                                    ref={stateMenuRef as React.RefObject<HTMLDivElement>}
                                    className="fixed z-[99999] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-lg flex items-center gap-1"
                                >
                                    {ESTADO_MENU_OPTIONS.map(({ value, Icon, className }) => (
                                        <Button
                                            key={value}
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 !p-0"
                                            title={value}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                void handleEstadoChange(row.id, value);
                                                setStateMenuId(null);
                                                setPopoverPos(null);
                                            }}
                                        >
                                            <Icon size={ESTADO_ICON_SIZE} className={className} />
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div
                        className="flex items-center justify-center gap-0.5 min-w-0 w-full"
                        title={`Avance: ${row.porcentaje_avance}%`}
                    >
                        <Text as="span" variant="caption" weight="bold" className="!text-[9px] shrink-0 leading-none">
                            {row.porcentaje_avance}%
                        </Text>
                        <ProgressBar
                            progress={row.porcentaje_avance}
                            variant="success"
                            className="h-2 w-10 shrink-0 max-w-full"
                        />
                    </div>
                </div>
            );
        },
    },
    {
        key: 'notas',
        label: 'Notas',
        minWidth: '96px',
        maxWidth: '96px',
        cellClassName: '!px-2',
        filterable: true,
        subFilters: [
            { key: 'notas_seguimiento', label: 'Seguimiento' },
            { key: 'notas_compromiso', label: 'Compromiso' },
        ],
        render: (row) => {
            const seg = row.seguimiento || '-';
            const comp = row.compromiso || '-';
            return (
                <div className="flex flex-col gap-0 min-w-0 overflow-hidden">
                    <StackedIconRow
                        Icon={MessageSquare}
                        iconClassName="text-neutral-500 dark:text-neutral-400"
                        iconTitle="Seguimiento"
                        value={seg}
                        valueTitle={row.seguimiento || undefined}
                    />
                    <StackedIconRow
                        Icon={Handshake}
                        iconClassName="text-neutral-500 dark:text-neutral-400"
                        iconTitle="Compromiso"
                        value={comp}
                        valueTitle={row.compromiso || undefined}
                    />
                </div>
            );
        },
    },
    {
        key: 'archivo',
        label: 'Archivo',
        minWidth: '40px',
        maxWidth: '48px',
        centered: true,
        render: (row) => row.archivo_url ? (
            <a
                href={row.archivo_url}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-primary)] hover:underline inline-flex"
                title="Descargar archivo"
                onClick={(e) => e.stopPropagation()}
            >
                <Download size={14} />
            </a>
        ) : (
            <Text variant="caption" color="text-secondary">-</Text>
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
