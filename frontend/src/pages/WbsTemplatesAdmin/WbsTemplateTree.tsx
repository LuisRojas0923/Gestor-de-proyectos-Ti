import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Title, Text, MaterialCard } from '../../components/atoms';
import { Plus, ChevronDown, ChevronRight, Edit3, Trash2 } from 'lucide-react';
import { WbsActivityTree } from '../../types/wbs';
import { WbsTemplateModal } from './WbsTemplateModal';

interface WbsTemplateTreeProps {
    rootTemplate: WbsActivityTree;
    onRefresh: () => void;
    onClearSelection: () => void;
}

const TemplateNode: React.FC<{
    node: WbsActivityTree;
    level: number;
    isDarkMode: boolean;
    onAddSubtask: (parentId: number, rootNombre: string) => void;
    onEditNode: (node: WbsActivityTree) => void;
    onDeleteNode: (id: number) => void;
}> = ({ node, level, isDarkMode, onAddSubtask, onEditNode, onDeleteNode }) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.subactividades && node.subactividades.length > 0;

    return (
        <div className="w-full">
            <div
                className={`flex items-center p-3 border-b group transition-colors
                    ${isDarkMode ? 'border-neutral-800 hover:bg-neutral-800/80' : 'border-neutral-100 hover:bg-neutral-50'}
                    ${level === 0 ? 'pl-4' : level === 1 ? 'pl-10' : level === 2 ? 'pl-16' : level === 3 ? 'pl-24' : level === 4 ? 'pl-32' : 'pl-40'}
                `}
            >
                <div className="w-6 flex-shrink-0">
                    {hasChildren && (
                        <div
                            role="button"
                            onClick={() => setExpanded(!expanded)}
                            className={`p-1 flex items-center justify-center cursor-pointer rounded-md ${isDarkMode ? 'hover:bg-neutral-700 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-500'}`}
                        >
                            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0 pr-4">
                    <Text weight="bold" className="text-sm">{node.titulo}</Text>
                    {node.descripcion && (
                        <Text variant="caption" color="text-secondary" className="truncate mt-0.5 max-w-md">{node.descripcion}</Text>
                    )}
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="w-24 text-right">
                        <Text variant="caption" color="text-secondary">
                            {node.horas_estimadas} h est.
                        </Text>
                    </div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div role="button" onClick={() => onEditNode(node)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer" title="Editar">
                            <Edit3 size={16} />
                        </div>
                        <div role="button" onClick={() => onAddSubtask(node.id, node.nombre_plantilla || '')} className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors cursor-pointer" title="Añadir Subactividad">
                            <Plus size={16} />
                        </div>
                        <div role="button" onClick={() => onDeleteNode(node.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors cursor-pointer" title="Eliminar">
                            <Trash2 size={16} />
                        </div>
                    </div>
                </div>
            </div>

            {expanded && hasChildren && (
                <div className="w-full border-l border-neutral-200 dark:border-neutral-800 ml-4">
                    {node.subactividades.map(child => (
                        <TemplateNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            isDarkMode={isDarkMode}
                            onAddSubtask={onAddSubtask}
                            onEditNode={onEditNode}
                            onDeleteNode={onDeleteNode}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};


export const WbsTemplateTree: React.FC<WbsTemplateTreeProps> = ({ rootTemplate, onRefresh, onClearSelection }) => {
    const { get } = useApi<WbsActivityTree>();
    const [tree, setTree] = useState<WbsActivityTree | null>(null);
    const [loading, setLoading] = useState(true);

    // modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalParentId, setModalParentId] = useState<number | null>(null);
    const [modalEditNode, setModalEditNode] = useState<WbsActivityTree | null>(null);

    const isDarkMode = document.documentElement.classList.contains('dark');

    const fetchTreeInfo = async () => {
        setLoading(true);
        try {
            const data = await get(`/desarrollos/plantillas/${rootTemplate.id}/arbol`);
            if (data) setTree(data);
        } catch (error) {
            console.error('Error fetching template tree:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTreeInfo();
    }, [rootTemplate.id]);

    const handleAddSubtask = (parentId: number, _rootNombre: string) => {
        setModalParentId(parentId);
        setModalEditNode(null);
        setIsModalOpen(true);
    };

    const handleEditNode = (node: WbsActivityTree) => {
        setModalParentId(node.parent_id || null);
        setModalEditNode(node);
        // Ensure name is passed down for root edits
        setIsModalOpen(true);
    };

    const handleDeleteNode = async (_id: number) => {
        if (!window.confirm("¿Estás seguro de eliminar este nodo y todos sus descendientes?")) return;

        // TODO: Call API to delete template node
        // Implementation on backend missing, but we'll mock or leave as placeholder for now
        alert("Eliminar función no implementada en Backend aún. Se requiere DELETE /plantillas/:id");
    };

    return (
        <MaterialCard className="h-[calc(100vh-200px)] flex flex-col overflow-hidden">
            <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'border-neutral-800' : 'border-neutral-100'}`}>
                <div className="flex items-center gap-3">
                    <div role="button" tabIndex={0} onClick={onClearSelection} className="text-neutral-500 hover:text-neutral-800 dark:hover:text-white lg:hidden cursor-pointer">
                        <ChevronRight size={20} className="rotate-180" />
                    </div>
                    <div>
                        <Title variant="h5" weight="bold">{rootTemplate.nombre_plantilla}</Title>
                        <Text variant="caption" color="text-secondary">{rootTemplate.titulo}</Text>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-neutral-50/50 dark:bg-neutral-900/20">
                {loading ? (
                    <div className="p-8 text-center text-neutral-500">Cargando árbol de la plantilla...</div>
                ) : tree ? (
                    <div className="pb-8">
                        {/* Header columns */}
                        <div className={`flex items-center p-3 border-b text-xs font-bold uppercase tracking-wider text-neutral-500
                            ${isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'}
                        `}>
                            <div className="flex-1 pl-4">Jerarquía de Actividades</div>
                            <div className="w-24 text-right pr-4">Horas Est.</div>
                            <div className="w-[100px] text-center">Acciones</div>
                        </div>

                        <TemplateNode
                            node={tree}
                            level={0}
                            isDarkMode={isDarkMode}
                            onAddSubtask={handleAddSubtask}
                            onEditNode={handleEditNode}
                            onDeleteNode={handleDeleteNode}
                        />
                    </div>
                ) : (
                    <div className="p-8 text-center text-red-500">Error al cargar la plantilla</div>
                )}
            </div>

            <WbsTemplateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaved={() => {
                    fetchTreeInfo();
                    onRefresh();
                }}
                parentId={modalParentId}
                editNode={modalEditNode}
                isRoot={false} // Se asume que no crearemos raíces desde aquí
            />
        </MaterialCard>
    );
};
