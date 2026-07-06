import { useEffect, useState, useCallback, useImperativeHandle, useMemo, forwardRef, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import { Text, Button } from '../../components/atoms';
import Skeleton from '../../components/atoms/Skeleton';
import { ClipboardList, Activity, Plus, ShieldAlert } from 'lucide-react';

import { WbsNodeModal } from './WbsNodeModal';
import { WbsTemplateSelectorModal } from './WbsTemplateSelectorModal';
import { DeleteActivityModal } from './DeleteActivityModal';
import { WbsDetailModal } from './WbsDetailModal';
import Modal from '../../components/molecules/Modal';
import { useColumnFilters } from '../../hooks/useColumnFilters';
import { DataTable } from '../../components/molecules/DataTable';
import { WbsActivityTree } from '../../types/wbs';
import { getWbsColumns } from './components/WbsColumns';
import { 
    getWbsOrderStorageKey, 
    loadStoredWbsOrder, 
    moveItem, 
    formatDate, 
    flattenTree, 
    getAvanceDeTarea, 
    getStatusChipClass, 
    getAvanceChipClass,
    getColumnAccessors
} from './utils/wbsUtils';


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
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [customOrder, setCustomOrder] = useState<string[]>(() => loadStoredWbsOrder(developmentId));
    const stateMenuRef = useRef<HTMLDivElement>(null);

    const showError = useCallback((err: unknown, defaultMsg: string) => {
        const msg = err instanceof Error ? err.message : defaultMsg;
        setErrorMessage(msg);
        setErrorModalOpen(true);
    }, []);

    const getLider = useCallback((node: WbsActivityTree) => {
        const id = node.asignado_a_id || node.responsable_id;
        if (!id) return '(Sin asignar)';
        return userMap.get(id) ?? id;
    }, [userMap]);

    const getUserName = useCallback((id?: string) => {
        if (!id) return '-';
        return userMap.get(id) ?? id;
    }, [userMap]);
    const columnAccessors = useMemo(() => getColumnAccessors(tree, getLider, getUserName), [tree, getLider, getUserName]);

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

    const hasActiveFilters = useMemo(
        () => Object.values(filters).some(filter => filter && filter.size > 0),
        [filters]
    );

    const orderedRowData = useMemo(() => {
        if (customOrder.length === 0 || sortState?.key || hasActiveFilters) return rowData;
        const orderMap = new Map(customOrder.map((id, index) => [id, index]));
        const originalIndex = new Map(rowData.map((row, index) => [String(row.id), index]));
        return [...rowData].sort((a, b) => {
            const aOrder = orderMap.get(String(a.id));
            const bOrder = orderMap.get(String(b.id));
            if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
            if (aOrder !== undefined) return -1;
            if (bOrder !== undefined) return 1;
            return (originalIndex.get(String(a.id)) ?? 0) - (originalIndex.get(String(b.id)) ?? 0);
        }).map((row, index) => ({ ...row, _rowIndex: index + 1 }));
    }, [customOrder, hasActiveFilters, rowData, sortState?.key]);

    const canReorderRows = orderedRowData.length > 1 && !sortState?.key && !hasActiveFilters;

    const handleRowsReorder = useCallback((fromIndex: number, toIndex: number) => {
        const reorderedVisible = moveItem(orderedRowData, fromIndex, toIndex).map(row => String(row.id));
        const knownIds = rowData.map(row => String(row.id));
        const hiddenIds = knownIds.filter(id => !reorderedVisible.includes(id));
        const nextOrder = [...reorderedVisible, ...hiddenIds];
        setCustomOrder(nextOrder);
        localStorage.setItem(getWbsOrderStorageKey(developmentId), JSON.stringify(nextOrder));
    }, [developmentId, orderedRowData, rowData]);

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
    const totalAvance = allFlat.reduce((sum, n) => sum + Number(n.porcentaje_avance ?? 0), 0);
    const avgProgress = allFlat.length ? Math.round(totalAvance / allFlat.length) : 0;

    const statusGroups = allFlat.reduce<Record<string, number>>((acc, n) => {
        const s = n.estado || 'Sin estado';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {});

    const handleQuickAction = useCallback(async (id: number, action: 'play' | 'pause' | 'finish', currentNode: WbsActivityTree) => {
        let payload: Partial<WbsActivityTree> = {};
        const now = new Date().toISOString().split('T')[0];

        if (action === 'play') {
            payload = {
                estado: 'En Proceso',
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
            showError(error, `Error al aplicar la acción rápida ${action} en la actividad.`);
        }
    }, [fetchTree, patch, showError]);

    const handleEstadoChange = useCallback(async (id: number, newEstado: string) => {
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
            showError(error, 'Error al cambiar el estado de la actividad.');
        }
    }, [fetchTree, patch, showError]);

    const fetchTree = useCallback(async () => {
        setLoading(true);
        try {
            const data = await get(`/actividades/desarrollo/${developmentId}/arbol`);
            if (Array.isArray(data)) setTree(data as WbsActivityTree[]);
        } catch (error) {
            console.error('Error fetching WBS tree:', error);
        } finally {
            setLoading(false);
        }
    }, [developmentId, get]);

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
    }, [developmentId, fetchTree, fetchUsers]);

    useEffect(() => {
        setCustomOrder(loadStoredWbsOrder(developmentId));
    }, [developmentId]);

    useEffect(() => {
        if (!developmentId || tree.length === 0) return;
        const flat = flattenTree(tree);
        const totalProg = flat.reduce((sum, n) => sum + getAvanceDeTarea(n.estado), 0);
        const pct = flat.length ? Math.round(totalProg / flat.length) : 0;
        void put(`/desarrollos/${developmentId}`, { porcentaje_progreso: pct });
    }, [tree, developmentId, put]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (stateMenuRef.current?.contains(target)) return;
            if ((target as Element).closest?.('[data-wbs-state-menu-trigger]')) return;
            setStateMenuId(null);
            setPopoverPos(null);
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

    const handleEditTask = useCallback((node: WbsActivityTree) => {
        setModalEditNode(node);
        setIsModalOpen(true);
    }, []);

    const handleCopyTask = useCallback(async (node: WbsActivityTree) => {
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
            showError(err, 'Error al copiar la actividad.');
        }
    }, [fetchTree, post, showError]);

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
            showError(error, 'Error al aplicar la plantilla en el WBS.');
            throw error;
        }
    };

    const handleDeleteClick = useCallback(async (id: number) => {
        try {
            const preview = await get(`/actividades/${id}/preview`);
            setDeletePreview(preview as typeof deletePreview);
            setDeleteModalOpen(true);
        } catch (error) {
            console.error('Error fetching delete preview:', error);
            showError(error, 'Error al obtener la vista previa de eliminación.');
        }
    }, [get, showError]);

    const handleConfirmDelete = async () => {
        if (!deletePreview) return;
        try {
            await del(`/actividades/${deletePreview.actividad.id}`);
            await fetchTree();
            setDeleteModalOpen(false);
            setDeletePreview(null);
        } catch (error) {
            console.error('Error deleting activity:', error);
            showError(error, 'Error al eliminar la actividad.');
        }
    };

    const handleResolveValidation = useCallback(async (id: number, estado: 'aprobada' | 'rechazada') => {
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
            showError(error, 'Error al resolver la validación de asignación.');
        } finally {
            setResolvingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        }
    }, [fetchTree, post, resolvingIds, showError]);

    const columns = useMemo(() => getWbsColumns({
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
    }), [
        getUserName,
        resolvingIds,
        handleResolveValidation,
        stateMenuId,
        popoverPos,
        handleQuickAction,
        handleEstadoChange,
        handleEditTask,
        handleCopyTask,
        handleDeleteClick,
    ]);

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
                    {statsCards}
                    <DataTable<WbsRow>
                        columns={columns}
                        data={orderedRowData}
                        keyExtractor={(row) => String(row.id)}
                        isRowDraggable={canReorderRows}
                        onRowsReorder={handleRowsReorder}
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
                onEdit={handleEditTask}
            />

            <Modal
                isOpen={errorModalOpen}
                onClose={() => setErrorModalOpen(false)}
                title={
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <ShieldAlert className="w-5 h-5" />
                        <Text as="span" variant="body1" weight="bold" color="inherit">
                            Acceso Restringido
                        </Text>
                    </div>
                }
                size="sm"
            >
                <div className="space-y-4 py-2">
                    <Text variant="body2" className="text-gray-700 dark:text-gray-300">
                        {errorMessage}
                    </Text>
                    <div className="flex justify-end pt-2">
                        <Button
                            variant="secondary"
                            onClick={() => setErrorModalOpen(false)}
                            className="bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-800 dark:text-gray-200 px-4 py-1.5 text-xs rounded-lg font-medium"
                        >
                            Entendido
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
});

export default WbsTab;
