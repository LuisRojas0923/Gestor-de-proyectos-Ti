import React, { useEffect, useState, useCallback, useImperativeHandle, useMemo, forwardRef } from 'react';
import { useApi } from '../../hooks/useApi';
import { Title, Text, Button, Badge, ProgressBar, Input } from '../../components/atoms';
import Skeleton from '../../components/atoms/Skeleton';
import { Trash2, Plus, Download, RotateCcw, ClipboardList, Pencil, Play, CirclePause, CheckCircle2 } from 'lucide-react';

import { WbsNodeModal } from './WbsNodeModal';
import { WbsTemplateSelectorModal } from './WbsTemplateSelectorModal';
import { DeleteActivityModal } from './DeleteActivityModal';
import { ValidationStatusBadge } from '../../components/assignments/ValidationStatusBadge';
import { AssignableUserSelect } from '../../components/assignments/AssignableUserSelect';
import { useColumnFilters } from '../../hooks/useColumnFilters';
import { useAppContext } from '../../context/AppContext';
import { DataTable, DataTableColumn } from '../../components/molecules/DataTable';

export interface WbsTabRef {
    handleAddRootTask: () => void;
    handleImportTemplate: () => void;
}

interface WbsTabProps {
    developmentId: string;
    darkMode: boolean;
}

type WbsRow = WbsActivityTree & { _rowIndex: number; _isDraft?: boolean };

const getStatusVariant = (estado: string): 'default' | 'success' | 'warning' | 'error' => {
    const normalized = estado.toLowerCase();
    if (normalized.includes('pendiente')) return 'error';
    if (normalized.includes('progreso') || normalized.includes('curso')) return 'warning';
    if (normalized.includes('complet')) return 'success';
    if (normalized.includes('pausa') || normalized.includes('bloqueado')) return 'warning';
    return 'default';
};

const WbsTab = forwardRef<WbsTabRef, WbsTabProps>(({ developmentId, darkMode }, ref) => {
    const { get, post, patch, put, delete: del } = useApi();
    const { state } = useAppContext();
    const [tree, setTree] = useState<WbsActivityTree[]>([]);
    const [loading, setLoading] = useState(true);
    const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
    const [draftActive, setDraftActive] = useState(false);
    const [draftTitulo, setDraftTitulo] = useState('');
    const [draftAsignadoAId, setDraftAsignadoAId] = useState('');
    const [draftSaving, setDraftSaving] = useState(false);

    const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalEditNode, setModalEditNode] = useState<WbsActivityTree | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletePreview, setDeletePreview] = useState<{
        actividad: { id: number; titulo: string; estado: string };
        hijos: { id: number; titulo: string; nivel: number; estado: string }[];
        total_eliminaciones: number;
    } | null>(null);

    const getLider = useCallback((node: WbsActivityTree) => {
        const id = node.asignado_a_id || node.responsable_id;
        if (!id) return '(Sin asignar)';
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
        activeFilterCount,
        clearAllFilters,
        setColumnFilter,
    } = useColumnFilters(tree, columnAccessors);

    const flattenedFiltered = flattenTree(filteredData);
    const baseRows: WbsRow[] = flattenedFiltered.map((n, i) => ({ ...n, _rowIndex: i + 1 }));
    const draftRow: WbsRow | null = draftActive ? {
        id: -1,
        _rowIndex: baseRows.length + 1,
        _isDraft: true,
        titulo: draftTitulo,
        estado: 'Pendiente',
        porcentaje_avance: 0,
        horas_estimadas: 0,
        horas_reales: 0,
        desarrollo_id: developmentId,
        subactividades: [],
        creado_en: '',
        asignado_a_id: draftAsignadoAId || undefined,
    } : null;
    const rowData: WbsRow[] = draftRow ? [...baseRows, draftRow] : baseRows;

    useImperativeHandle(ref, () => ({
        handleAddRootTask: () => {
            if (draftActive) return;
            setDraftActive(true);
            setDraftTitulo('');
            setDraftAsignadoAId('');
        },
        handleImportTemplate: () => {
            setIsTemplateModalOpen(true);
        }
    }), [draftActive]);

    const allFlat = flattenTree(tree);
    const completed = allFlat.filter(n => n.estado.toLowerCase().includes('complet')).length;
    const inProgress = allFlat.filter(n => n.estado.toLowerCase().includes('progreso') || n.estado.toLowerCase().includes('curso')).length;
    const pending = allFlat.filter(n => n.estado.toLowerCase().includes('pendiente')).length;
    const avgProgress = allFlat.length ? Math.round((completed / allFlat.length) * 100) : 0;

    const handleQuickAction = async (id: number, action: 'play' | 'pause' | 'finish', currentNode: WbsActivityTree) => {
        let payload: any = {};
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

    const handleAddRootTask = () => {
        setDraftActive(true);
        setDraftTitulo('');
        setDraftAsignadoAId('');
    };

    const handleSaveDraft = async () => {
        if (!draftTitulo.trim()) return;
        setDraftSaving(true);
        try {
            const payload: WbsActivityCreate = {
                desarrollo_id: developmentId,
                titulo: draftTitulo.trim(),
                estado: 'Pendiente',
                porcentaje_avance: 0,
                horas_estimadas: 0,
                asignado_a_id: draftAsignadoAId || undefined,
                delegado_por_id: state.user?.id || undefined,
            };
            await post('/actividades/', payload);
            setDraftActive(false);
            await fetchTree();
        } catch (error) {
            console.error('Error creating WBS task:', error);
        } finally {
            setDraftSaving(false);
        }
    };

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

    const handleToggleComplete = async (id: number, completed: boolean) => {
        if (togglingIds.has(id)) return;
setTogglingIds(prev => new Set([...prev, id]));
        try {
            const newEstado = completed ? 'Completada' : 'En Progreso';
            await patch(`/actividades/${id}`, { estado: newEstado });
            await fetchTree();
        } catch (error) {
            console.error('Error toggling complete:', error);
        } finally {
            setTogglingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
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

    const columns: DataTableColumn<WbsRow>[] = [
        {
            key: 'titulo',
            label: 'Tarea',
            minWidth: '260px',
            flex: true,
            filterable: true,
            render: (row) => row._isDraft ? (
                <Input
                    placeholder="Título de la tarea..."
                    value={draftTitulo}
                    onChange={(e) => setDraftTitulo(e.target.value)}
                    autoFocus
                />
            ) : (
                <div className="min-w-0">
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
            key: 'porcentaje_avance',
            label: 'Avance',
            minWidth: '80px',
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
            key: 'estado',
            label: 'Estado',
            minWidth: '96px',
            filterable: true,
            render: (row) => (
                <Badge variant={getStatusVariant(row.estado)} size="sm">{row.estado}</Badge>
            ),
        },
        {
            key: 'seguimiento',
            label: 'Seguimiento',
            minWidth: '192px',
            filterable: true,
            render: (row) => (
                <Text variant="caption" className="truncate" title={row.seguimiento}>
                    {row.seguimiento || '-'}
                </Text>
            ),
        },
        {
            key: 'lider',
            label: 'Líder de actividad',
            minWidth: '144px',
            filterable: true,
            render: (row) => row._isDraft ? (
                <AssignableUserSelect
                    value={draftAsignadoAId}
                    onChange={setDraftAsignadoAId}
                />
            ) : (
                <Text variant="caption" className="truncate" title={getLider(row)}>
                    {getLider(row)}
                </Text>
            ),
        },
        {
            key: 'validacion',
            label: 'Validación',
            minWidth: '112px',
            filterable: true,
            render: (row) => <ValidationStatusBadge status={row.estado_validacion} />,
        },
        {
            key: 'index',
            label: '#',
            minWidth: '24px',
            centered: true,
            filterable: true,
            render: (row) => (
                <Text variant="caption" className="w-6 text-center text-[var(--color-text-secondary)]">
                    {row._rowIndex}
                </Text>
            ),
        },
        {
            key: 'completado',
            label: '',
            minWidth: '48px',
            centered: true,
            render: (row) => row._isDraft ? null : (
                <Button
                    variant="custom"
                    disabled={togglingIds.has(row.id)}
                    onClick={(e) => { e.stopPropagation(); handleToggleComplete(row.id, row.estado !== 'Completada'); }}
                    className={`w-5 h-5 border-2 rounded transition-all duration-200 flex items-center justify-center disabled:opacity-50 ${
                        row.estado === 'Completada'
                            ? 'bg-primary-500 border-primary-500'
                            : 'bg-white border-neutral-300 hover:border-primary-400 dark:bg-neutral-800 dark:border-neutral-600'
                    }`}
                >
                    {row.estado === 'Completada' && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </Button>
            ),
        },
        {
            key: 'gestion',
            label: 'Gestión',
            minWidth: '120px',
            render: (row) => {
                if (row._isDraft) return null;
                const normalizedStatus = row.estado.toLowerCase();
                const isCompleted = normalizedStatus.includes('complet');
                const isInProgress = normalizedStatus.includes('progreso') || normalizedStatus.includes('curso');
                const isPaused = normalizedStatus.includes('pausa');

                return (
                    <div className="flex items-center gap-1">
                        {!isCompleted && !isInProgress && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); void handleQuickAction(row.id, 'play', row); }}
                                icon={Play}
                                className="h-8 w-8 !p-0 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:scale-110 transition-transform dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 shadow-sm"
                                title="Iniciar tarea (Play)"
                            />
                        )}
                        {isInProgress && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); void handleQuickAction(row.id, 'pause', row); }}
                                icon={CirclePause}
                                className="h-8 w-8 !p-0 text-amber-600 bg-amber-50 hover:bg-amber-100 hover:scale-110 transition-transform dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 shadow-sm"
                                title="Pausar tarea"
                            />
                        )}
                        {!isCompleted && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); void handleQuickAction(row.id, 'finish', row); }}
                                icon={CheckCircle2}
                                className="h-8 w-8 !p-0 text-green-600 bg-green-50 hover:bg-green-100 hover:scale-110 transition-transform dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-800 shadow-sm"
                                title="Terminar tarea (Check)"
                            />
                        )}
                    </div>
                );
            }
        },
        {
            key: 'compromiso',
            label: 'Compromiso',
            minWidth: '192px',
            render: (row) => (
                <Text variant="caption" className="truncate" title={row.compromiso}>
                    {row.compromiso || '-'}
                </Text>
            ),
        },
        {
            key: 'archivo',
            label: 'Archivo',
            minWidth: '48px',
            centered: true,
            render: (row) => row.archivo_url ? (
                <a href={row.archivo_url} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] hover:underline">
                    <Download size={14} />
                </a>
            ) : (
                <Text variant="caption" color="text-secondary">-</Text>
            ),
        },
    ];

    const renderRowActions = (row: WbsRow) => {
        if (row._isDraft) {
            return (
                <>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); void handleSaveDraft(); }}
                        disabled={draftSaving || !draftTitulo.trim()}
                        className="h-8 px-2 text-xs"
                    >
                        {draftSaving ? '...' : 'Guardar'}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setDraftActive(false); }}
                        className="h-8 px-2 text-xs"
                    >
                        Cancelar
                    </Button>
                </>
            );
        }
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
                        keyExtractor={(row) => row._isDraft ? 'draft' : String(row.id)}
                        renderRowActions={renderRowActions}
                        actionsMinWidth="160px"
                        columnFilters={filters}
                        columnOptions={uniqueValues}
                        onFilterChange={(key, newSet) => setColumnFilter(key, newSet)}
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
        </div>
    );
});

export default WbsTab;
