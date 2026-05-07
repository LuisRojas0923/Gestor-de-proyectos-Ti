import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { Title, Text, Button, Badge, ProgressBar, Input, Select, Textarea } from '../../components/atoms';
import Skeleton from '../../components/atoms/Skeleton';
import Checkbox from '../../components/atoms/Checkbox';
import { Trash2, Plus, ChevronDown, ChevronRight, Download, RotateCcw, Filter, ClipboardList } from 'lucide-react';
import { WbsNodeModal } from './WbsNodeModal';
import { WbsTemplateSelectorModal } from './WbsTemplateSelectorModal';
import { DeleteActivityModal } from './DeleteActivityModal';
import { ValidationStatusBadge } from '../../components/assignments/ValidationStatusBadge';
import { AssignableUserSelect } from '../../components/assignments/AssignableUserSelect';
import { ColumnFilterPopover } from '../../components/molecules/ColumnFilterPopover';
import { useColumnFilters } from '../../hooks/useColumnFilters';
import { useAppContext } from '../../context/AppContext';

interface WbsTabProps {
    developmentId: string;
    darkMode: boolean;
}

const getStatusVariant = (estado: string): 'default' | 'success' | 'warning' | 'error' => {
    const normalized = estado.toLowerCase();
    if (normalized.includes('pendiente')) return 'error';
    if (normalized.includes('progreso') || normalized.includes('curso')) return 'warning';
    if (normalized.includes('complet')) return 'success';
    return 'default';
};

const WbsNode = React.memo<{
    node: WbsActivityTree;
    darkMode: boolean;
    level: number;
    onAddSubtask: (parentId: number) => void;
    onEditTask: (node: WbsActivityTree) => void;
    displayIndex: number;
    getLider: (node: WbsActivityTree) => string;
    onToggleComplete: (id: number, completed: boolean) => void;
    onDeleteActivity: (id: number) => void;
}>(({ node, darkMode, level, onAddSubtask, onEditTask, displayIndex, getLider, onToggleComplete, onDeleteActivity }) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.subactividades && node.subactividades.length > 0;

    const plMap: Record<number, string> = { 0: 'pl-4', 1: 'pl-10', 2: 'pl-16', 3: 'pl-24', 4: 'pl-32', 5: 'pl-40' };
    const plClass = plMap[level] || 'pl-40';

    return (
        <div className="w-full">
            <div className="group relative flex items-stretch border-b border-[var(--color-border)] hover:bg-[var(--color-surface-variant)] transition-colors cursor-pointer">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--deep-navy)]" />

                <div className={`w-6 shrink-0 flex items-center justify-center py-3 px-2 ${plClass}`}>
                    {hasChildren ? (
                        <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setExpanded(!expanded)}
                            className="!p-1 flex items-center justify-center cursor-pointer !rounded-md hover:bg-[var(--color-surface)]"
                            icon={expanded ? ChevronDown : ChevronRight}
                        />
                    ) : (
                        <Text variant="caption" className="w-6 text-center text-[var(--color-text-secondary)]">{displayIndex}</Text>
                    )}
                </div>

                <div className="w-12 shrink-0 flex items-center justify-center py-3 px-2">
                    <Checkbox
                        checked={node.estado === 'Completada'}
                        disabled={(node.subactividades?.length ?? 0) > 0}
                        onChange={(e) => {
                            e.stopPropagation();
                            onToggleComplete(node.id, e.target.checked);
                        }}
                    />
                </div>

                <div className="flex-1 min-w-[260px] py-3 px-3 flex flex-col justify-center min-w-0">
                    <Text weight="bold" className="truncate">{node.titulo}</Text>
                    {node.descripcion && (
                        <Text variant="caption" color="text-secondary" className="truncate mt-0.5">{node.descripcion}</Text>
                    )}
                </div>

                <div className="w-20 shrink-0 px-2 py-3 flex flex-col justify-center text-right">
                    <Text variant="caption">{node.porcentaje_avance}%</Text>
                    <ProgressBar
                        progress={node.porcentaje_avance}
                        variant={node.porcentaje_avance === 100 ? 'success' : 'primary'}
                        className="h-1 mt-1"
                    />
                </div>

                <div className="w-24 shrink-0 px-2 py-3 flex items-center">
                    <Badge variant={getStatusVariant(node.estado)} size="sm">
                        {node.estado}
                    </Badge>
                </div>

                <div className="w-48 shrink-0 px-2 py-3 flex items-center">
                    <Text variant="caption" className="truncate" title={node.seguimiento}>
                        {node.seguimiento || '-'}
                    </Text>
                </div>

                <div className="w-36 shrink-0 px-2 py-3 flex items-center">
                    <Text variant="caption" className="truncate" title={getLider(node)}>
                        {getLider(node) || '-'}
                    </Text>
                </div>

                <div className="w-28 shrink-0 px-2 py-3 flex items-center">
                    <ValidationStatusBadge status={node.estado_validacion} />
                </div>

                <div className="w-48 shrink-0 px-2 py-3 flex items-center">
                    <Text variant="caption" className="truncate" title={node.compromiso}>
                        {node.compromiso || '-'}
                    </Text>
                </div>

                <div className="w-12 shrink-0 px-2 py-3 flex items-center justify-center">
                    {node.archivo_url ? (
                        <a href={node.archivo_url} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] hover:underline">
                            <Download size={14} />
                        </a>
                    ) : (
                        <Text variant="caption" color="text-secondary">-</Text>
                    )}
                </div>

                <div className="w-36 shrink-0 px-2 py-3 flex gap-1 items-center justify-center">
                    <Button variant="ghost" size="sm" onClick={() => onEditTask(node)} className="h-8 px-2 text-xs">Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => onAddSubtask(node.id)} icon={Plus} className="h-8 px-2" />
                    <Button variant="ghost" size="sm" onClick={() => onDeleteActivity(node.id)} icon={Trash2} className="h-8 px-2 !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-950" />
                </div>
            </div>

            {expanded && hasChildren && (
                <div className="w-full">
                    {node.subactividades.map((child, idx) => (
                        <WbsNode
                            key={child.id}
                            node={child}
                            darkMode={darkMode}
                            level={level + 1}
                            onAddSubtask={onAddSubtask}
                            onEditTask={onEditTask}
                            displayIndex={idx + 1}
                            getLider={getLider}
                            onToggleComplete={onToggleComplete}
                            onDeleteActivity={onDeleteActivity}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

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

    // Refs por columna para anclar popovers (estado, líder, validación)
    const headerRefs = useRef<Record<string, React.RefObject<HTMLElement>>>({});

    // Garantiza que exista un Ref estable para la clave dada y lo devuelve
    const ensureAnchorRef = (key: string): React.RefObject<HTMLElement> => {
        if (!headerRefs.current[key]) {
            headerRefs.current[key] = React.createRef<HTMLElement>();
        }
        return headerRefs.current[key];
    };

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
        activePopover,
        setActivePopover,
        hasActiveFilter,
        activeFilterCount,
        toggleOption,
        selectAll,
        clearColumnFilter,
        clearAllFilters,
    } = useColumnFilters(tree, columnAccessors);

    const flattenedFiltered = flattenTree(filteredData);
    const completed = tree.length ? flattenTree(tree).filter(n => n.estado.toLowerCase().includes('complet')).length : 0;
    const inProgress = tree.length ? flattenTree(tree).filter(n => n.estado.toLowerCase().includes('progreso') || n.estado.toLowerCase().includes('curso')).length : 0;
    const pending = tree.length ? flattenTree(tree).filter(n => n.estado.toLowerCase().includes('pendiente')).length : 0;
    const avgProgress = tree.length ? Math.round(flattenTree(tree).reduce((s, n) => s + (n.porcentaje_avance ?? 0), 0) / flattenTree(tree).length) : 0;

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

    const COLUMNS = [
        { key: 'index', label: '#', width: 'w-6', filterable: false },
        { key: 'completado', label: '', width: 'w-12', filterable: false },
        { key: 'tarea', label: 'Tarea', width: 'flex-1 min-w-[260px]', filterable: false },
        { key: 'avance', label: 'Avance', width: 'w-20', filterable: false },
        { key: 'estado', label: 'Estado', width: 'w-24', filterable: true },
        { key: 'seguimiento', label: 'Seguimiento', width: 'w-48', filterable: false },
        { key: 'lider', label: 'Líder de actividad', width: 'w-36', filterable: true },
        { key: 'validacion', label: 'Validación', width: 'w-28', filterable: true },
        { key: 'compromiso', label: 'Compromiso', width: 'w-48', filterable: false },
        { key: 'archivo', label: 'Archivo', width: 'w-12', filterable: false },
        {key: 'acciones', label: 'Acciones', width: 'w-36', filterable: false },
    ];

    const statsCards = (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-variant)] p-3">
                <Text variant="caption" color="text-secondary">Tareas</Text>
                <Text variant="body1" weight="bold">{flattenTree(tree).length}</Text>
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

            <div className="relative flex max-h-[calc(100vh-300px)] min-h-[320px] flex-col overflow-x-auto overflow-y-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                {loading ? (
                    <div className="p-4 space-y-3">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                    </div>
                ) : tree.length === 0 ? (
                    <>
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--color-surface)] px-6 py-10 space-y-8">
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
                    </>
                ) : (
                    <>
                        {/* Header fijo fuera del scroll — misma estructura que MyDevelopments */}
                        <div className="shrink-0 flex min-w-[1180px] items-stretch gap-0 bg-[var(--deep-navy)] rounded-t-2xl border-b border-[var(--color-border)] overflow-hidden z-20">
                            {COLUMNS.map((col, idx) => (
                                col.key === 'acciones' ? (
                                    <div key={col.key} className="w-36 shrink-0 flex items-center justify-center py-2.5 px-4 bg-white/10">
                                        <Text as="span" variant="caption" weight="bold" color="white" className="uppercase tracking-wider !text-[11px]">
                                            Acciones
                                        </Text>
                                    </div>
                                ) : (
                                    <Button
                                        key={col.key}
                                        ref={col.filterable ? ensureAnchorRef(col.key) as React.RefObject<HTMLButtonElement> : undefined}
                                        variant="custom"
                                        disabled={!col.filterable}
                                        onClick={() => col.filterable && setActivePopover(activePopover === col.key ? null : col.key)}
                                        className={`
                                            ${col.width} shrink-0 flex items-center py-2.5 px-4
                                            ${idx === 0 ? 'bg-blue-500/20 border-r border-white/10' : 'border-r border-white/10 transition-all duration-200'}
                                            ${col.filterable ? 'hover:bg-white/5 cursor-pointer outline-none group' : 'cursor-default'}
                                        `}
                                    >
                                        <Text as="span" variant="caption" weight="bold" color="inherit" className={`
                                            text-xs font-bold uppercase tracking-wider !text-[11px] transition-colors
                                            ${hasActiveFilter(col.key)
                                                ? 'text-yellow-400'
                                                : idx === 0
                                                    ? 'text-blue-300'
                                                    : 'text-white/70 group-hover:text-white'}
                                        `}>
                                            {col.label}
                                        </Text>
                                        {col.filterable && (
                                            <Filter size={12} className={`ml-1 ${hasActiveFilter(col.key) ? 'text-yellow-400' : 'text-white/50 group-hover:text-white/80'}`} />
                                        )}
                                    </Button>
                                )
                            ))}
                        </div>

                        {/* Body con scroll vertical */}
                        <div className="flex-1 min-h-0 overflow-y-scroll overflow-x-hidden custom-scrollbar">
                            <div className="flex min-w-[1180px] flex-col pb-4">
                                {flattenedFiltered.map((node, idx) => (
                                    <WbsNode
                                        key={node.id}
                                        node={node}
                                        darkMode={darkMode}
                                        level={0}
                                        onAddSubtask={handleAddSubtask}
                                        onEditTask={handleEditTask}
                                        displayIndex={idx + 1}
                                        getLider={getLider}
                                        onToggleComplete={handleToggleComplete}
                                        onDeleteActivity={handleDeleteClick}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {(['estado', 'lider', 'validacion'] as const).map(colKey => (
                activePopover === colKey ? (
                    <ColumnFilterPopover
                        key={colKey}
                        columnKey={colKey}
                        title={COLUMNS.find(c => c.key === colKey)?.label || colKey}
                        options={uniqueValues[colKey] || []}
                        selectedValues={filters[colKey] ?? new Set<string>()}
                        onToggleOption={toggleOption}
                        onSelectAll={selectAll}
                        onClear={clearColumnFilter}
                        onClose={() => setActivePopover(null)}
                        anchorRef={ensureAnchorRef(colKey)}
                    />
                ) : null
            ))}

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
