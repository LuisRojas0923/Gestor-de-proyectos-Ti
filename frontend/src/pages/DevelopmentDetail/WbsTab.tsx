import { useEffect, useState, useCallback, useImperativeHandle, useMemo, forwardRef, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import { Text, Button, Badge, ProgressBar } from '../../components/atoms';
import Skeleton from '../../components/atoms/Skeleton';
import { Trash2, Download, ClipboardList, Pencil, Play, CirclePause, CheckCircle2, XCircle, Activity, Copy, Plus } from 'lucide-react';

import { WbsNodeModal } from './WbsNodeModal';
import { WbsTemplateSelectorModal } from './WbsTemplateSelectorModal';
import { DeleteActivityModal } from './DeleteActivityModal';
import { WbsDetailModal } from './WbsDetailModal';
import { ValidationStatusBadge } from '../../components/assignments/ValidationStatusBadge';
import { useColumnFilters } from '../../hooks/useColumnFilters';
import { DataTable, DataTableColumn } from '../../components/molecules/DataTable';
import { WbsActivityTree } from '../../types/wbs';

export interface WbsTabRef {
    handleAddRootTask: () => void;
    handleImportTemplate: () => void;
}

interface WbsTabProps {
    developmentId: string;
    darkMode: boolean;
}

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



const WbsTab = forwardRef<WbsTabRef, WbsTabProps>(({ developmentId, darkMode }, ref) => {
    const { get, post, patch, put, delete: del } = useApi();
    const [tree, setTree] = useState<WbsActivityTree[]>([]);
    const [loading, setLoading] = useState(true);
    const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
    const [resolvingIds, setResolvingIds] = useState<Set<number>>(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalEditNode, setModalEditNode] = useState<WbsActivityTree | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletePreview, setDeletePreview] = useState<{
        actividad: { id: number; titulo: string; estado: string };
        hijos: { id: number; titulo: string; nivel: number; estado: string }[];
        total_eliminaciones: number;
    } | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<WbsActivityTree | null>(null);
    const [stateMenuId, setStateMenuId] = useState<number | null>(null);
    const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
    const stateMenuRef = useRef<HTMLDivElement>(null);

    const getLider = useCallback((node: WbsActivityTree) => {
        const id = node.asignado_a_id || node.responsable_id;
        if (!id) return '(Sin asignar)';
        return userMap.get(id) ?? id;
    }, [userMap]);

    const getUserName = useCallback((id?: string) => {
        if (!id) return '-';
        return userMap.get(id) ?? id;
    }, [userMap]);

    const flattenTree = useCallback((nodes: WbsActivityTree[]): WbsActivityTree[] => {
        const result: WbsActivityTree[] = [];
        for (const node of nodes) {
            result.push(node);
            if (node.subactividades?.length) {
                result.push(...flattenTree(node.subactividades));
            }
        }
        return result;
    }, []);

    const columnAccessors = useMemo(() => ({
        index: (node: WbsActivityTree) => {
            // Buscamos el nodo en el árbol aplanado original para obtener su índice real
            const flat = flattenTree(tree);
            const idx = flat.findIndex(n => n.id === node.id);
            return idx !== -1 ? String(idx + 1) : '(Draf)';
        },
        titulo: (node: WbsActivityTree) => node.titulo,
        porcentaje_avance: (node: WbsActivityTree) => `${node.porcentaje_avance}%`,
        estado: (node: WbsActivityTree) => node.estado,
        seguimiento: (node: WbsActivityTree) => node.seguimiento || '(Sin seguimiento)',
        lider: (node: WbsActivityTree) => getLider(node),
        validacion: (node: WbsActivityTree) => node.estado_validacion || 'sin_validar',
        fecha_inicio_estimada: (node: WbsActivityTree) => formatDate(node.fecha_inicio_estimada || node.fecha_inicio_real),
        fecha_fin_estimada: (node: WbsActivityTree) => formatDate(node.fecha_fin_estimada || node.fecha_fin_real),
    }), [tree, flattenTree, getLider]);

    const {
        filters,
        filteredData,
        uniqueValues,
        setColumnFilter,
        sortState,
        setSort,
    } = useColumnFilters(tree, columnAccessors, `wbs_${developmentId}`);

    const flattenedFiltered = flattenTree(filteredData);
    const rowData: WbsRow[] = flattenedFiltered.map((n, i) => ({ ...n, _rowIndex: i + 1 }));

    useImperativeHandle(ref, () => ({
        handleAddRootTask: () => {
            setModalEditNode(null);
            setIsModalOpen(true);
        },
        handleImportTemplate: () => {
            setIsTemplateModalOpen(true);
        }
    }), []);

    const allFlat = flattenTree(tree);
    const completed = allFlat.filter(n => n.estado.toLowerCase().includes('complet')).length;
    const avgProgress = allFlat.length ? Math.round((completed / allFlat.length) * 100) : 0;

    const statusGroups = allFlat.reduce<Record<string, number>>((acc, n) => {
        const s = n.estado || 'Sin estado';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {});

    const getStatusChipClass = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('complet'))  return 'text-green-700 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50';
        if (s.includes('progreso') || s.includes('curso')) return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/50';
        if (s.includes('pendiente')) return 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
        if (s.includes('pausa'))    return 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50';
        if (s.includes('cancel'))   return 'text-neutral-600 bg-neutral-100 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
        return 'text-neutral-600 bg-neutral-50 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
    };

    const getAvanceChipClass = (pct: number) => {
        if (pct >= 100) return 'text-green-700 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50';
        if (pct >= 75)  return 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50';
        if (pct >= 50)  return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/50';
        if (pct >= 25)  return 'text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50';
        return 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
    };

    const handleQuickAction = async (id: number, action: 'play' | 'pause' | 'finish', currentNode: WbsActivityTree) => {
        let payload: Partial<WbsActivityTree> = {};
        const now = new Date().toISOString().split('T')[0];

        if (action === 'play') {
            payload = {
                estado: 'En Progreso',
                fecha_inicio_real: currentNode.fecha_inicio_real || now
            };
        } else if (action === 'pause') {
            payload = { estado: 'Pausa' };
        } else if (action === 'finish') {
            payload = {
                estado: 'Completada',
                porcentaje_avance: 100,
                fecha_fin_real: now
            };
        }

        try {
            await patch(`/actividades/${id}`, payload);
            await fetchTree();
        } catch (error) {
            console.error(`Error applying quick action ${action}:`, error);
        }
    };

    const handleEstadoChange = async (id: number, newEstado: string) => {
        try {
            const payload: Record<string, unknown> = { estado: newEstado };
            if (newEstado === 'Completada') {
                payload.porcentaje_avance = 100;
                payload.fecha_fin_real = new Date().toISOString().split('T')[0];
            }
            await patch(`/actividades/${id}`, payload);
            await fetchTree();
        } catch (error) {
            console.error('Error changing estado:', error);
        }
    };

    const fetchTree = async () => {
        setLoading(true);
        try {
            const data = await get(`/actividades/desarrollo/${developmentId}/arbol`);
            if (Array.isArray(data)) setTree(data as WbsActivityTree[]);
        } catch (error) {
            console.error('Error fetching WBS tree:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = useCallback(async () => {
        try {
            const users = await get('/jerarquia/usuarios-disponibles');
            if (Array.isArray(users)) {
                setUserMap(new Map((users as { id: string; nombre: string }[]).map((u) => [u.id, u.nombre])));
            }
        } catch (error) {
            console.error('Error fetching users for map:', error);
        }
    }, [get]);

    useEffect(() => {
        void fetchTree();
        void fetchUsers();
    }, [developmentId]);

    useEffect(() => {
        if (!developmentId || tree.length === 0) return;
        const flat = flattenTree(tree);
        const comp = flat.filter(n => n.estado.toLowerCase().includes('complet')).length;
        const pct = flat.length ? Math.round((comp / flat.length) * 100) : 0;
        void put(`/desarrollos/${developmentId}`, { porcentaje_progreso: pct });
    }, [tree, developmentId]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (stateMenuRef.current && !stateMenuRef.current.contains(e.target as Node)) {
                setStateMenuId(null);
                setPopoverPos(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (stateMenuRef.current && popoverPos) {
            stateMenuRef.current.style.top = `${popoverPos.top}px`;
            stateMenuRef.current.style.left = `${popoverPos.left}px`;
        }
    }, [popoverPos]);

    const handleEditTask = (node: WbsActivityTree) => {
        setModalEditNode(node);
        setIsModalOpen(true);
    };

    const handleCopyTask = async (node: WbsActivityTree) => {
        try {
            await post('/actividades/', {
                desarrollo_id: node.desarrollo_id,
                parent_id: node.parent_id,
                titulo: `${node.titulo} (copia)`,
                descripcion: node.descripcion,
                estado: 'Pendiente',
                responsable_id: node.responsable_id,
                asignado_a_id: node.asignado_a_id,
                fecha_inicio_estimada: node.fecha_inicio_estimada,
                fecha_fin_estimada: node.fecha_fin_estimada,
                horas_estimadas: node.horas_estimadas ?? 0,
                porcentaje_avance: 0,
                seguimiento: node.seguimiento,
                compromiso: node.compromiso,
            });
            await fetchTree();
        } catch (err) {
            console.error('Error copying task:', err);
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setModalEditNode(null);
    };

    const handleApplyTemplate = async (plantillaRaizId: number) => {
        try {
            await post('/desarrollos/plantillas/aplicar', { plantilla_raiz_id: plantillaRaizId, desarrollo_id: developmentId });
            await fetchTree();
        } catch (error) {
            console.error('Error applying template:', error);
            throw error;
        }
    };

    const handleDeleteClick = async (id: number) => {
        try {
            const preview = await get(`/actividades/${id}/preview`);
            setDeletePreview(preview as typeof deletePreview);
            setDeleteModalOpen(true);
        } catch (error) {
            console.error('Error fetching delete preview:', error);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletePreview) return;
        try {
            await del(`/actividades/${deletePreview.actividad.id}`);
            await fetchTree();
            setDeleteModalOpen(false);
            setDeletePreview(null);
        } catch (error) {
            console.error('Error deleting activity:', error);
        }
    };

    const handleResolveValidation = async (id: number, estado: 'aprobada' | 'rechazada') => {
        if (resolvingIds.has(id)) return;
        setResolvingIds(prev => new Set([...prev, id]));
        try {
            await post(`/validaciones-asignacion/${id}/resolver`, {
                estado,
                observacion: estado === 'rechazada' ? 'Rechazado desde WBS' : 'Aprobado desde WBS',
            });
            await fetchTree();
        } catch (error) {
            console.error('Error resolving validation:', error);
        } finally {
            setResolvingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        }
    };


    const columns: DataTableColumn<WbsRow>[] = [
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
                const isInProgress = n.includes('progreso') || n.includes('curso');
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
                            {row.estado}
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
                                        title="En Progreso"
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
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(row.id); }}
                        icon={Trash2}
                        className="h-7 w-7 !p-0 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 shadow-sm"
                        title="Eliminar"
                    />
                </div>
            )
        },
    ];

    const statsCards = (
        <div className="flex justify-between items-center w-full flex-wrap gap-3">
            <div className="flex flex-wrap gap-2">
                {/* Total */}
                <Text as="span" className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-variant)] text-[var(--color-text-secondary)]">
                    <ClipboardList size={11} />
                    <Text as="span" className="text-[var(--color-text-primary)] font-bold">{allFlat.length}</Text>
                    tareas
                </Text>
                {/* Avance dinámico */}
                <Text as="span" className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${getAvanceChipClass(avgProgress)}`}>
                    <Activity size={11} />
                    Avance: {avgProgress}%
                </Text>
                {/* Un chip por estado */}
                {Object.entries(statusGroups).map(([status, count]) => (
                    <Text as="span" key={status} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${getStatusChipClass(status)}`}>
                        {status}
                        <Text as="span" className="font-bold">{count}</Text>
                    </Text>
                ))}
            </div>
            <Button
                variant="primary"
                icon={Plus}
                onClick={() => {
                    setModalEditNode(null);
                    setIsModalOpen(true);
                }}
            >
                Tarea
            </Button>
        </div>
    );

    return (
        <div className="space-y-4">
            {loading ? (
                <div className="p-4 space-y-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
            ) : (
                <>
                    {allFlat.length > 0 && statsCards}
                    <DataTable<WbsRow>
                        columns={columns}
                        data={rowData}
                        keyExtractor={(row) => String(row.id)}
                        columnFilters={filters}
                        columnOptions={uniqueValues}
                        onFilterChange={(key, newSet) => setColumnFilter(key, newSet)}
                        activeSortKey={sortState?.key ?? null}
                        activeSortDir={sortState?.dir ?? null}
                        onSort={setSort}
                        onRowClick={(row) => { setSelectedActivity(row); setDetailModalOpen(true); }}
                        isLoading={false}
                        emptyMessage="Sin tareas aún. Usa «Agregar tarea» para comenzar."
                        emptyIcon={<ClipboardList size={40} className="opacity-40" />}
                        maxHeight="max-h-[calc(100vh-300px)]"
                    />
                </>
            )}

            <WbsNodeModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSaved={fetchTree}
                developmentId={developmentId}
                editNode={modalEditNode}
                darkMode={darkMode}
            />

            <WbsTemplateSelectorModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                onApply={handleApplyTemplate}
            />

            <DeleteActivityModal
                isOpen={deleteModalOpen}
                preview={deletePreview}
                onClose={() => { setDeleteModalOpen(false); setDeletePreview(null); }}
                onConfirm={handleConfirmDelete}
            />

            <WbsDetailModal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                activity={selectedActivity}
                userMap={userMap}
                onResolveValidation={handleResolveValidation}
                resolvingIds={resolvingIds}
            />
        </div>
    );
});

export default WbsTab;
