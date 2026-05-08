import React, { useEffect, useState, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { Title, Text, Button, Badge, ProgressBar, Input } from '../../components/atoms';
import Skeleton from '../../components/atoms/Skeleton';
import { Trash2, Plus, Download, RotateCcw, ClipboardList, Pencil } from 'lucide-react';
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

type WbsRow = WbsActivityTree & { _rowIndex: number; _isDraft?: boolean };

const getStatusVariant = (estado: string): 'default' | 'success' | 'warning' | 'error' => {
    const normalized = estado.toLowerCase();
    if (normalized.includes('pendiente')) return 'error';
    if (normalized.includes('progreso') || normalized.includes('curso')) return 'warning';
    if (normalized.includes('complet')) return 'success';
    return 'default';
};

const WbsTab: React.FC<WbsTabProps> = ({ developmentId, darkMode }) => {
    const { get, post, patch, put, delete: del } = useApi<WbsActivityTree[]>();
    const { state } = useAppContext();
    const [tree, setTree] = useState<WbsActivityTree[]>([]);
    const [loading, setLoading] = useState(true);
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

    const allFlat = flattenTree(tree);
    const completed = allFlat.filter(n => n.estado.toLowerCase().includes('complet')).length;
    const inProgress = allFlat.filter(n => n.estado.toLowerCase().includes('progreso') || n.estado.toLowerCase().includes('curso')).length;
    const pending = allFlat.filter(n => n.estado.toLowerCase().includes('pendiente')).length;
    const avgProgress = allFlat.length ? Math.round((completed / allFlat.length) * 100) : 0;

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
            key: 'titulo',
            label: 'Tarea',
            minWidth: '260px',
            flex: true,
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
                    <Button variant="outline" icon={Download} onClick={() => setIsTemplateModalOpen(true)}>
                        Importar Plantilla
                    </Button>
                    <Button variant="primary" icon={Plus} onClick={handleAddRootTask} disabled={draftActive}>
                        Agregar tarea
                    </Button>
                </div>
            </div>

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
};

export default WbsTab;
