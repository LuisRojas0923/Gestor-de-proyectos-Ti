import React, { useEffect, useState, useCallback, useImperativeHandle, useMemo, forwardRef } from 'react';
import { useApi } from '../../hooks/useApi';
import { useAppContext } from '../../context/AppContext';
import { Text, Button, ProgressBar } from '../../components/atoms';
import Skeleton from '../../components/atoms/Skeleton';
import { Trash2, ClipboardList, Pencil, Play, CirclePause, CheckCircle2, XCircle } from 'lucide-react';

import { WbsNodeModal } from './WbsNodeModal';
import { WbsTemplateSelectorModal } from './WbsTemplateSelectorModal';
import { DeleteActivityModal } from './DeleteActivityModal';
import { WbsDetailModal } from './WbsDetailModal';
import { ValidationStatusBadge } from '../../components/assignments/ValidationStatusBadge';
import { useColumnFilters } from '../../hooks/useColumnFilters';
import { DataTable, DataTableColumn } from '../../components/molecules/DataTable';

export interface WbsTabRef {
    handleAddRootTask: () => void;
    handleImportTemplate: () => void;
}

interface WbsTabProps {
    developmentId: string;
    darkMode: boolean;
}

type WbsRow = WbsActivityTree & { _rowIndex: number };



const WbsTab = forwardRef<WbsTabRef, WbsTabProps>(({ developmentId, darkMode }, ref) => {
    const { get, post, patch, put, delete: del } = useApi();
    const { state } = useAppContext();
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
    }), [tree, flattenTree, getLider]);

    const {
        filters,
        filteredData,
        uniqueValues,
        setColumnFilter,
    } = useColumnFilters(tree, columnAccessors);

    const columnOptions = useMemo(() => {
        const currentUserName = state.user?.name ?? '';
        return {
            ...uniqueValues,
            lider: currentUserName
                ? [currentUserName, ...(uniqueValues.lider ?? [])]
                : uniqueValues.lider ?? [],
        };
    }, [uniqueValues, state.user?.name]);

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
    const inProgress = allFlat.filter(n => n.estado.toLowerCase().includes('progreso') || n.estado.toLowerCase().includes('curso')).length;
    const pending = allFlat.filter(n => n.estado.toLowerCase().includes('pendiente')).length;
    const avgProgress = allFlat.length ? Math.round((completed / allFlat.length) * 100) : 0;

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

    const handleEditTask = (node: WbsActivityTree) => {
        setModalEditNode(node);
        setIsModalOpen(true);
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

    const handleResolveValidation = async (id: number, estado: 'aprobada' | 'rechazada', onAfterResolve?: () => void) => {
        if (resolvingIds.has(id)) return;
        setResolvingIds(prev => new Set([...prev, id]));
        try {
            await post(`/validaciones-asignacion/${id}/resolver`, {
                estado,
                observacion: estado === 'rechazada' ? 'Rechazado desde WBS' : 'Aprobado desde WBS',
            });
            await fetchTree();
            onAfterResolve?.();
        } catch (error) {
            console.error('Error resolving validation:', error);
        } finally {
            setResolvingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        try {
            const [y, m, d] = dateStr.split('T')[0].split('-');
            return `${d}/${m}/${y}`;
        } catch {
            return dateStr;
        }
    };

    const columns: DataTableColumn<WbsRow>[] = [
        {
            key: 'titulo',
            label: 'Tarea',
            minWidth: '160px',
            flex: true,
            filterable: true,
            render: (row) => (
                <div className="min-w-0" data-column="titulo">
                    <Text weight="bold" className="truncate">{row.titulo}</Text>
                    {row.descripcion && (
                        <Text variant="caption" color="text-secondary" className="truncate mt-0.5">
                            {row.descripcion}
                        </Text>
                    )}
                </div>
            ),
        },
        {
            key: 'fecha_inicio_estimada',
            label: 'F.Inicio',
            minWidth: '72px',
            filterable: false,
            render: (row) => (
                <Text variant="caption" className="truncate">
                    {formatDate(row.fecha_inicio_estimada || row.fecha_inicio_real)}
                </Text>
            ),
        },
        {
            key: 'fecha_fin_estimada',
            label: 'F.Fin',
            minWidth: '72px',
            filterable: false,
            render: (row) => (
                <Text variant="caption" className="truncate">
                    {formatDate(row.fecha_fin_estimada || row.fecha_fin_real)}
                </Text>
            ),
        },
        {
            key: 'lider',
            label: 'Líder',
            minWidth: '100px',
            filterable: true,
            render: (row) => (
                <div className="flex flex-col min-w-0">
                    <Text variant="caption" color="text-secondary" className="truncate text-[10px] leading-tight">
                        responsable: {getUserName(row.responsable_id)}
                    </Text>
                    <Text variant="caption" color="text-secondary" className="truncate text-[10px] leading-tight">
                        autoridad: {getUserName(row.asignado_a_id)}
                    </Text>
                </div>
            ),
        },
        {
            key: 'validacion',
            label: 'Validación',
            minWidth: '90px',
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
            filterable: true,
            render: (row) => {
                const normalizedStatus = row.estado.toLowerCase();
                const isCompleted = normalizedStatus.includes('complet');
                const isInProgress = normalizedStatus.includes('progreso') || normalizedStatus.includes('curso');

                return (
                    <div className="flex items-center gap-1">
                        {!isCompleted && !isInProgress && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); void handleQuickAction(row.id, 'play', row); }}
                                icon={Play}
                                className="h-7 w-7 !p-0 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800"
                                title="Iniciar"
                            />
                        )}
                        {isInProgress && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); void handleQuickAction(row.id, 'pause', row); }}
                                icon={CirclePause}
                                className="h-7 w-7 !p-0 text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800"
                                title="Pausar"
                            />
                        )}
                        {!isCompleted && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); void handleQuickAction(row.id, 'finish', row); }}
                                icon={CheckCircle2}
                                className="h-7 w-7 !p-0 text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-800"
                                title="Terminar"
                            />
                        )}
                    </div>
                );
            },
        },
        {
            key: 'seguimiento',
            label: 'Seguimiento',
            minWidth: '100px',
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
            minWidth: '100px',
            render: (row) => (
                <Text variant="caption" className="truncate" title={row.compromiso}>
                    {row.compromiso || '-'}
                </Text>
            ),
        },
        {
            key: 'gestion',
            label: 'Gestión',
            minWidth: '120px',
            render: (row) => {
                const normalizedStatus = row.estado.toLowerCase();
                const isCompleted = normalizedStatus.includes('complet');
                const isInProgress = normalizedStatus.includes('progreso') || normalizedStatus.includes('curso');

                return (
                    <div className="flex items-center gap-1">
                        {!isCompleted && !isInProgress && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); void handleQuickAction(row.id, 'play', row); }}
                                icon={Play}
                                className="h-7 w-7 !p-0 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:scale-110 transition-transform dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 shadow-sm"
                                title="Iniciar"
                            />
                        )}
                        {isInProgress && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); void handleQuickAction(row.id, 'pause', row); }}
                                icon={CirclePause}
                                className="h-7 w-7 !p-0 text-amber-600 bg-amber-50 hover:bg-amber-100 hover:scale-110 transition-transform dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 shadow-sm"
                                title="Pausar"
                            />
                        )}
                        {!isCompleted && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); void handleQuickAction(row.id, 'finish', row); }}
                                icon={CheckCircle2}
                                className="h-7 w-7 !p-0 text-green-600 bg-green-50 hover:bg-green-100 hover:scale-110 transition-transform dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-800 shadow-sm"
                                title="Terminar"
                            />
                        )}
                    </div>
                );
            }
        },
        {
            key: 'porcentaje_avance',
            label: 'Avance',
            minWidth: '72px',
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
    ];

    const renderRowActions = (row: WbsRow) => {
        return (
            <>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleEditTask(row); }}
                    icon={Pencil}
                    className="h-8 px-2"
                />
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(row.id); }}
                    icon={Trash2}
                    className="h-8 px-2 !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-950"
                />
            </>
        );
    };

    const statsCards = (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-variant)] p-3">
                <Text variant="caption" color="text-secondary">Tareas</Text>
                <Text variant="body1" weight="bold">{allFlat.length}</Text>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-variant)] p-3">
                <Text variant="caption" color="text-secondary">Avance</Text>
                <Text variant="body1" weight="bold">{avgProgress}%</Text>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-variant)] p-3">
                <Text variant="caption" color="text-secondary">Completadas</Text>
                <Text variant="body1" weight="bold">{completed}</Text>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-variant)] p-3">
                <Text variant="caption" color="text-secondary">Pendientes</Text>
                <Text variant="body1" weight="bold">{pending + inProgress}</Text>
            </div>
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
                        renderRowActions={renderRowActions}
                        actionsMinWidth="90px"
                        columnFilters={filters}
                        columnOptions={columnOptions}
                        onFilterChange={(key, newSet) => setColumnFilter(key, newSet)}
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
                onQuickAction={handleQuickAction}
                resolvingIds={resolvingIds}
            />
        </div>
    );
});

export default WbsTab;
