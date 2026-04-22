import React, { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { Title, Text, Button, Badge, ProgressBar } from '../../components/atoms';
import { WbsActivityTree } from '../../types/wbs';
import { Plus, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { WbsNodeModal } from './WbsNodeModal';
import { WbsTemplateSelectorModal } from './WbsTemplateSelectorModal';

interface WbsTabProps {
    developmentId: string;
    darkMode: boolean;
}

const WbsNode: React.FC<{
    node: WbsActivityTree;
    darkMode: boolean;
    level: number;
    onAddSubtask: (parentId: number) => void;
    onEditTask: (node: WbsActivityTree) => void;
}> = ({ node, darkMode, level, onAddSubtask, onEditTask }) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.subactividades && node.subactividades.length > 0;

    const plMap: Record<number, string> = {
        0: 'pl-4',
        1: 'pl-10',
        2: 'pl-16',
        3: 'pl-24',
        4: 'pl-32',
        5: 'pl-40'
    };
    const plClass = plMap[level] || 'pl-40';

    return (
        <div className="w-full">
            <div
                className={`flex items-center p-3 border-b ${darkMode ? 'border-neutral-700 hover:bg-neutral-700/50' : 'border-neutral-200 hover:bg-neutral-50'} transition-colors ${plClass}`}
            >
                <div className="w-6 flex-shrink-0">
                    {hasChildren && (
                        <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setExpanded(!expanded)}
                            className={`!p-1 flex items-center justify-center cursor-pointer !rounded-md ${darkMode ? 'hover:bg-neutral-600' : 'hover:bg-neutral-200'}`}
                            icon={expanded ? ChevronDown : ChevronRight}
                        />
                    )}
                </div>

                <div className="flex-1 min-w-0 pr-4">
                    <Text weight="bold" className="truncate">{node.titulo}</Text>
                    {node.descripcion && (
                        <Text variant="caption" color="text-secondary" className="truncate mt-0.5">{node.descripcion}</Text>
                    )}
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="w-20 text-right">
                        <Text variant="caption" color="text-secondary">{node.porcentaje_avance}%</Text>
                        <ProgressBar 
                            progress={node.porcentaje_avance} 
                            variant={node.porcentaje_avance === 100 ? 'success' : 'primary'} 
                            className="h-1 mt-1" 
                        />
                    </div>

                    <div className="w-24">
                        <Badge
                            variant={
                                node.estado === 'Completada' ? 'success' :
                                    node.estado === 'En Progreso' ? 'primary' :
                                        node.estado === 'Bloqueado' ? 'error' : 'default'
                            }
                            size="sm"
                        >
                            {node.estado}
                        </Badge>
                    </div>

                    <div className="w-48">
                        <Text variant="caption" className="truncate" title={node.seguimiento}>
                            {node.seguimiento || '-'}
                        </Text>
                    </div>

                    <div className="w-48">
                        <Text variant="caption" className="truncate" title={node.compromiso}>
                            {node.compromiso || '-'}
                        </Text>
                    </div>

                    <div className="w-12 flex justify-center">
                        {node.archivo_url ? (
                            <a href={node.archivo_url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">
                                <Download size={14} />
                            </a>
                        ) : (
                            <Text variant="caption" color="text-secondary">-</Text>
                        )}
                    </div>

                    <div className="flex gap-2 w-24 justify-center">
                        <Button variant="ghost" size="sm" onClick={() => onEditTask(node)} className="h-8 px-2 text-xs">Editar</Button>
                        <Button variant="ghost" size="sm" onClick={() => onAddSubtask(node.id)} icon={Plus} className="h-8 px-2" />
                    </div>
                </div>
            </div>

            {expanded && hasChildren && (
                <div className="w-full">
                    {node.subactividades.map(child => (
                        <WbsNode
                            key={child.id}
                            node={child}
                            darkMode={darkMode}
                            level={level + 1}
                            onAddSubtask={onAddSubtask}
                            onEditTask={onEditTask}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const WbsTab: React.FC<WbsTabProps> = ({ developmentId, darkMode }) => {
    const { get } = useApi<WbsActivityTree[]>();
    const [tree, setTree] = useState<WbsActivityTree[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalParentId, setModalParentId] = useState<number | null>(null);
    const [modalEditNode, setModalEditNode] = useState<WbsActivityTree | null>(null);

    // Template Modal State
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const { post } = useApi();

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
        setModalParentId(null);
        setModalEditNode(null);
        setIsModalOpen(true);
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
            await post('/desarrollos/plantillas/aplicar', {
                plantilla_raiz_id: plantillaRaizId,
                desarrollo_id: developmentId
            });
            await fetchTree();
        } catch (error) {
            console.error('Error applying template:', error);
            throw error; // Let modal handle loading state if error happens
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Title variant="h5" weight="bold">Work Breakdown Structure (WBS)</Title>
                    <Text variant="body2" color="text-secondary">Gestiona las tareas jerárquicas de la actividad</Text>
                </div>
                <div className="flex gap-2">
                    {tree.length === 0 && (
                        <Button variant="outline" icon={Download} onClick={() => setIsTemplateModalOpen(true)}>
                            Importar Plantilla
                        </Button>
                    )}
                    <Button variant="primary" icon={Plus} onClick={handleAddRootTask}>
                        Nueva Tarea
                    </Button>
                </div>
            </div>

            <div className={`rounded-xl border ${darkMode ? 'border-neutral-700 bg-neutral-800/50' : 'border-neutral-200 bg-white'} overflow-hidden`}>
                {loading ? (
                    <div className="p-8 text-center"><Text color="text-secondary">Cargando árbol de tareas...</Text></div>
                ) : tree.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-neutral-800 text-neutral-500' : 'bg-neutral-100 text-neutral-400'}`}>
                            <Plus size={32} />
                        </div>
                        <Text weight="bold" className="mb-2">No hay tareas registradas</Text>
                        <Text variant="body2" color="text-secondary" className="mb-6 max-w-sm">
                            Crea la primera tarea principal para comenzar a planificar la estructura de trabajo de este proyecto.
                        </Text>
                        <div className="flex gap-3">
                            <Button variant="outline" icon={Download} onClick={() => setIsTemplateModalOpen(true)}>
                                Importar desde Plantilla
                            </Button>
                            <Button variant="primary" icon={Plus} onClick={handleAddRootTask}>
                                Crear Tarea Inicial
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col w-full">
                        {/* Cabecera de tabla */}
                        <div className={`flex items-center p-3 border-b ${darkMode ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
                            <div className="flex-1 font-bold text-xs uppercase tracking-wider text-neutral-500">Tarea</div>
                            <div className="w-20 font-bold text-xs uppercase tracking-wider text-neutral-500 text-right pr-4">Avance</div>
                            <div className="w-24 font-bold text-xs uppercase tracking-wider text-neutral-500">Estado</div>
                            <div className="w-48 font-bold text-xs uppercase tracking-wider text-neutral-500">Seguimiento</div>
                            <div className="w-48 font-bold text-xs uppercase tracking-wider text-neutral-500">Compromiso</div>
                            <div className="w-12 font-bold text-xs uppercase tracking-wider text-neutral-500 text-center">Archivo</div>
                            <div className="w-24 font-bold text-xs uppercase tracking-wider text-neutral-500 text-center">Acciones</div>
                        </div>
                        <div className="flex flex-col w-full pb-4">
                            {tree.map(node => (
                                <WbsNode
                                    key={node.id}
                                    node={node}
                                    darkMode={darkMode}
                                    level={0}
                                    onAddSubtask={handleAddSubtask}
                                    onEditTask={handleEditTask}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

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
        </div>
    );
};

export default WbsTab;
