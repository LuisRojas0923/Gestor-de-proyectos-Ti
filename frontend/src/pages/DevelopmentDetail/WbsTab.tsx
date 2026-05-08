import React, { useEffect, useState, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { Title, Text, Button, Badge, ProgressBar, Input, Select } from '../../components/atoms';
import Skeleton from '../../components/atoms/Skeleton';
import Checkbox from '../../components/atoms/Checkbox';
import { Trash2, Plus, Download, RotateCcw, ClipboardList } from 'lucide-react';
import { WbsNodeModal } from './WbsNodeModal';
import { WbsTemplateSelectorModal } from './WbsTemplateSelectorModal';
import { DeleteActivityModal } from './DeleteActivityModal';
import { ValidationStatusBadge } from '../../components/assignments/ValidationStatusBadge';
import { AssignableUserSelect } from '../../components/assignments/AssignableUserSelect';
import { useColumnFilters } from '../../hooks/useColumnFilters';
import { useAppContext } from '../../context/AppContext';
import { DataTable, DataTableColumn } from '../../components/molecules/DataTable';

interface WbsTabProps {
    developmentId: string;
    darkMode: boolean;
}

type WbsRow = WbsActivityTree & { _rowIndex: number };

const getStatusVariant = (estado: string): 'default' | 'success' | 'warning' | 'error' => {
    const normalized = estado.toLowerCase();
    if (normalized.includes('pendiente')) return 'error';
    if (normalized.includes('progreso') || normalized.includes('curso')) return 'warning';
    if (normalized.includes('complet')) return 'success';
    return 'default';
};

const WbsTab: React.FC<WbsTabProps> = ({ developmentId, darkMode }) => {
    const { get, post, patch, delete: del } = useApi<WbsActivityTree[]>();
    const { state } = useAppContext();
    const [tree, setTree] = useState<WbsActivityTree[]>([]);
    const [loading, setLoading] = useState(true);
    const [inlineSaving, setInlineSaving] = useState(false);
    const [inlineDraft, setInlineDraft] = useState({
        titulo: '',
        estado: 'Pendiente' as WbsActivityCreate['estado'],
        porcentaje_avance: 0,
        seguimiento: '',
        asignado_a_id: '',
        compromiso: '',
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalParentId, setModalParentId] = useState<number | null>(null);
    const [modalEditNode, setModalEditNode] = useState<WbsActivityTree | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletePreview, setDeletePreview] = useState<{
        actividad: { id: number; titulo: string; estado: string };
        hijos: { id: number; titulo: string; nivel: number; estado: string }[];
        total_eliminaciones: number;
    } | null>(null);

    const getLider = useCallback((node: WbsActivityTree) =>
        node.asignado_a_id || node.responsable_id || '(Sin asignar)', []);

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

    const columnAccessors = {
        estado: (node: WbsActivityTree) => node.estado,
        lider: (node: WbsActivityTree) => getLider(node),
        validacion: (node: WbsActivityTree) => node.estado_validacion || 'sin_validar',
    };

    const {
        filters,
        filteredData,
        uniqueValues,
        activeFilterCount,
        clearAllFilters,
        setColumnFilter,
    } = useColumnFilters(tree, columnAccessors);

    const flattenedFiltered = flattenTree(filteredData);
    const rowData: WbsRow[] = flattenedFiltered.map((n, i) => ({ ...n, _rowIndex: i + 1 }));

    const allFlat = flattenTree(tree);
    const completed = allFlat.filter(n => n.estado.toLowerCase().includes('complet')).length;
    const inProgress = allFlat.filter(n => n.estado.toLowerCase().includes('progreso') || n.estado.toLowerCase().includes('curso')).length;
    const pending = allFlat.filter(n => n.estado.toLowerCase().includes('pendiente')).length;
    const avgProgress = allFlat.length ? Math.round(allFlat.reduce((s, n) => s + (n.porcentaje_avance ?? 0), 0) / allFlat.length) : 0;

    const fetchTree = async () => {
        setLoading(true);
        try {
            const data = await get(`/actividades/desarrollo/${developmentId}/arbol`);
            if (data) setTree(data);
        } catch (error) {
            console.error('Error fetching WBS tree:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (developmentId) fetchTree();
    }, [developmentId]);

    const handleAddRootTask = () => {
        if (tree.length === 0) return;
        setModalParentId(null);
        setModalEditNode(null);
        setIsModalOpen(true);
    };

    const resetInlineDraft = () => {
        setInlineDraft({ titulo: '', estado: 'Pendiente', porcentaje_avance: 0, seguimiento: '', asignado_a_id: '', compromiso: '' });
    };

    const handleInlineSave = async () => {
        if (!inlineDraft.titulo.trim()) return;
        setInlineSaving(true);
        try {
            const payload: WbsActivityCreate = {
                desarrollo_id: developmentId,
                titulo: inlineDraft.titulo.trim(),
                estado: inlineDraft.estado,
                porcentaje_avance: inlineDraft.porcentaje_avance,
                horas_estimadas: 0,
                seguimiento: inlineDraft.seguimiento || undefined,
                asignado_a_id: inlineDraft.asignado_a_id || undefined,
                delegado_por_id: state.user?.id || undefined,
                compromiso: inlineDraft.compromiso || undefined,
            };
            await post('/actividades/', payload);
            resetInlineDraft();
            await fetchTree();
        } catch (error) {
            console.error('Error creating inline WBS task:', error);
        } finally {
            setInlineSaving(false);
        }
    };

    const handleAddSubtask = (parentId: number) => {
        setModalParentId(parentId);
        setModalEditNode(null);
        setIsModalOpen(true);
    };

    const handleEditTask = (node: WbsActivityTree) => {
        setModalParentId(node.parent_id || null);
        setModalEditNode(node);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setModalParentId(null);
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
        try {
            const newEstado = completed ? 'Completada' : 'En Progreso';
            await patch(`/actividades/${id}`, { estado: newEstado });
            await fetchTree();
        } catch (error) {
            console.error('Error toggling complete:', error);
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
            key: 'index',
            label: '#',
            minWidth: '24px',
            centered: true,
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
            render: (row) => (
                <Checkbox
                    checked={row.estado === 'Completada'}
                    disabled={(row.subactividades?.length ?? 0) > 0}
                    onChange={(e) => { e.stopPropagation(); handleToggleComplete(row.id, e.target.checked); }}
                />
            ),
        },
        {
            key: 'titulo',
            label: 'Tarea',
            minWidth: '260px',
            flex: true,
            render: (row) => (
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
            render: (row) => (
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

    const renderRowActions = (row: WbsRow) => (
        <>
            <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleEditTask(row); }}
                className="h-8 px-2 text-xs"
            >
                Editar
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleAddSubtask(row.id); }}
                icon={Plus}
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
            <div className="flex justify-between items-start gap-4">
                <div>
                    <Title variant="h5" weight="bold">Estructura de desglose del trabajo (WBS)</Title>
                    <Text variant="body2" color="text-secondary">Gestiona las tareas jerárquicas de la actividad</Text>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {activeFilterCount > 0 && (
                        <div className="flex items-center gap-2">
                            <Badge variant="warning">{activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''}</Badge>
                            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={clearAllFilters} className="h-8 text-xs">
                                Limpiar
                            </Button>
                        </div>
                    )}
                    {tree.length === 0 && (
                        <Button variant="outline" icon={Download} onClick={() => setIsTemplateModalOpen(true)}>
                            Importar Plantilla
                        </Button>
                    )}
                    {tree.length > 0 && (
                        <Button variant="primary" icon={Plus} onClick={handleAddRootTask}>
                            Agregar tarea
                        </Button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="p-4 space-y-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
            ) : tree.length === 0 ? (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-y-auto custom-scrollbar px-6 py-10 space-y-8">
                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                        <ClipboardList className="w-16 h-16 text-[var(--color-border)]" strokeWidth={1.5} />
                        <Title level={4} className="!mb-0">Sin tareas aún</Title>
                        <Text variant="body" color="text-secondary" className="max-w-md">
                            Crea la primera tarea de este desarrollo o importa una estructura desde plantilla
                        </Text>
                    </div>

                    <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-variant)] p-6 space-y-4">
                        <Input
                            label="Título de la tarea"
                            placeholder="Ej. Levantar requerimientos del proceso"
                            value={inlineDraft.titulo}
                            onChange={(e) => setInlineDraft(d => ({ ...d, titulo: e.target.value }))}
                            required
                        />
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="w-40">
                                <Select
                                    label="Estado"
                                    value={inlineDraft.estado}
                                    onChange={(e) => setInlineDraft(d => ({ ...d, estado: e.target.value as WbsActivityCreate['estado'] }))}
                                    options={[
                                        { value: 'Pendiente', label: 'Pendiente' },
                                        { value: 'En Progreso', label: 'En Progreso' },
                                        { value: 'Bloqueado', label: 'Bloqueado' },
                                        { value: 'Completada', label: 'Completada' },
                                    ]}
                                />
                            </div>
                            <div className="w-24">
                                <Input
                                    label="Avance %"
                                    type="number"
                                    value={inlineDraft.porcentaje_avance.toString()}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        if (v >= 0 && v <= 100) setInlineDraft(d => ({ ...d, porcentaje_avance: v }));
                                    }}
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <AssignableUserSelect
                                    label="Líder"
                                    value={inlineDraft.asignado_a_id}
                                    onChange={(v) => setInlineDraft(d => ({ ...d, asignado_a_id: v }))}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-2">
                            <Text variant="caption" color="text-secondary">
                                Al guardar se creará como primera tarea principal del WBS
                            </Text>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={resetInlineDraft} disabled={inlineSaving}>
                                    Limpiar
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleInlineSave}
                                    disabled={inlineSaving || !inlineDraft.titulo.trim()}
                                >
                                    {inlineSaving ? 'Guardando...' : 'Guardar'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mx-auto max-w-3xl">
                        <div className="flex-1 border-t border-[var(--color-border)]" />
                        <Text variant="caption" color="text-secondary" className="uppercase tracking-wider">o</Text>
                        <div className="flex-1 border-t border-[var(--color-border)]" />
                    </div>

                    <div className="flex justify-center">
                        <Button variant="outline" size="md" icon={Download} onClick={() => setIsTemplateModalOpen(true)}>
                            Importar Plantilla
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    {statsCards}
                    <DataTable<WbsRow>
                        columns={columns}
                        data={rowData}
                        keyExtractor={(row) => String(row.id)}
                        renderRowActions={renderRowActions}
                        actionsMinWidth="144px"
                        columnFilters={filters}
                        columnOptions={uniqueValues}
                        onFilterChange={(key, newSet) => setColumnFilter(key, newSet)}
                        isLoading={false}
                        emptyMessage="No hay tareas"
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
                parentId={modalParentId}
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
};

export default WbsTab;
