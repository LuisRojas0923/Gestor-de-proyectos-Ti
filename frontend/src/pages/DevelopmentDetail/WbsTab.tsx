import { useEffect, useState, useCallback, useImperativeHandle, useMemo, forwardRef, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import { Text, Button } from '../../components/atoms';
import Skeleton from '../../components/atoms/Skeleton';
import { ClipboardList, Activity, Plus } from 'lucide-react';

import { WbsNodeModal } from './WbsNodeModal';
import { WbsTemplateSelectorModal } from './WbsTemplateSelectorModal';
import { DeleteActivityModal } from './DeleteActivityModal';
import { WbsDetailModal } from './WbsDetailModal';
import { useColumnFilters } from '../../hooks/useColumnFilters';
import { DataTable } from '../../components/molecules/DataTable';
import { WbsActivityTree } from '../../types/wbs';
import { getWbsColumns } from './components/WbsColumns';

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
        titulo_titulo: (node: WbsActivityTree) => node.titulo,
        titulo_descripcion: (node: WbsActivityTree) => node.descripcion || '(Vacío)',
        porcentaje_avance: (node: WbsActivityTree) => `${node.porcentaje_avance}%`,
        estado: (node: WbsActivityTree) => node.estado === 'En Progreso' ? 'En proceso' : node.estado,
        seguimiento: (node: WbsActivityTree) => node.seguimiento || '(Sin seguimiento)',
        lider: (node: WbsActivityTree) => getLider(node),
        lider_supervisor: (node: WbsActivityTree) => getUserName(node.responsable_id) || '(Sin asignar)',
        lider_ejecutor: (node: WbsActivityTree) => getUserName(node.asignado_a_id) || '(Sin asignar)',
        validacion: (node: WbsActivityTree) => node.estado_validacion || 'sin_validar',
        fecha_inicio_estimada: (node: WbsActivityTree) => formatDate(node.fecha_inicio_estimada || node.fecha_inicio_real),
        fecha_fin_estimada: (node: WbsActivityTree) => formatDate(node.fecha_fin_estimada || node.fecha_fin_real),
    }), [tree, flattenTree, getLider, getUserName]);

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
                onEdit={handleEditTask}
            />
        </div>
    );
});

export default WbsTab;
