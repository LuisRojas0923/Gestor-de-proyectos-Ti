import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { GitBranch, RefreshCw, UserPlus, X, Filter, ChevronDown } from 'lucide-react';
import { ReactFlow, MiniMap, Controls, Background, Edge, useNodesState, useEdgesState, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import type { EdgeChange, Node as FlowNode, NodeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Input, MaterialCard, Text, Title } from '../components/atoms';
import { FilterDropdown } from '../components/molecules';
import { useApi } from '../hooks/useApi';
import { useAppContext } from '../context/AppContext';
import { HierarchyNode, HierarchyRelation, HierarchyUser } from '../types/hierarchy';

import { formatShortName, getCenterZoom, getLayoutedElements, isNodeExpanded, nodeHeight, nodeWidth } from './OrganizationalHierarchy/utils';
import { CustomNodeComponent, type CustomNodeData } from './OrganizationalHierarchy/components/CustomNodeComponent';
import { AutocompleteUserField } from './OrganizationalHierarchy/components/AutocompleteUserField';
const nodeTypes = { custom: CustomNodeComponent };

type AppUser = { id?: string; usuario_id?: string; rol?: string };

export const FlowWithFitView: React.FC<{
  nodes: FlowNode<CustomNodeData>[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  nodeTypes: typeof nodeTypes;
  selectedDirectors: string[];
  nodeToCenter: string | null;
  onCentered: () => void;
}> = ({ nodes, edges, onNodesChange, onEdgesChange, nodeTypes, selectedDirectors, nodeToCenter, onCentered }) => {
  const { fitView, setCenter } = useReactFlow();

  useEffect(() => {
    // Animación suave de recentrado al cambiar el filtro
    const timer = setTimeout(() => {
      void fitView({ duration: 400, padding: 0.1 });
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedDirectors, fitView]);

  useEffect(() => {
    if (nodeToCenter) {
      const node = nodes.find((n) => n.id === nodeToCenter);
      if (node) {
        const timer = setTimeout(() => {
          setCenter(
            node.position.x + nodeWidth / 2,
            node.position.y + nodeHeight / 2,
            { duration: 800, zoom: getCenterZoom(window.innerWidth) },
          );
          onCentered();
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [nodeToCenter, nodes, onCentered, setCenter]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      attributionPosition="bottom-right"
      minZoom={0.2}
      maxZoom={2}
    >
      <Background color="#ccc" gap={16} />
      <MiniMap 
        nodeColor={(n: FlowNode<CustomNodeData>) => {
          if (n.data?.selected) return 'var(--color-primary)';
          return '#94a3b8';
        }}
        maskColor="rgba(0,0,0, 0.05)"
      />
      <Controls />
    </ReactFlow>
  );
};

const OrganizationalHierarchy: React.FC = () => {
  const navigate = useNavigate();
  const { get, post, delete: deleteRequest } = useApi<unknown>();
  const { state } = useAppContext();
  const appUser = state.user as AppUser | null | undefined;
  const currentUserId: string = appUser?.id || appUser?.usuario_id || '';
  const [tree, setTree] = useState<HierarchyNode[]>([]);
  const [relations, setRelations] = useState<HierarchyRelation[]>([]);
  const [users, setUsers] = useState<HierarchyUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedSuperiorId, setSelectedSuperiorId] = useState('');
  const [observacion, setObservacion] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterAnchorRect, setFilterAnchorRect] = useState<DOMRect | null>(null);
  const [selectedDirectors, setSelectedDirectors] = useState<string[]>([]);
  const [tempSelectedDirectors, setTempSelectedDirectors] = useState<string[]>([]);
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggledNodes, setToggledNodes] = useState<Record<string, boolean>>({});
  const [nodeToCenter, setNodeToCenter] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [treeData, relationData, userData] = await Promise.all([
        get('/jerarquia/arbol'),
        get('/jerarquia/relaciones'),
        get('/jerarquia/usuarios-disponibles'),
      ]);
      setTree(Array.isArray(treeData) ? treeData as HierarchyNode[] : []);
      setRelations(Array.isArray(relationData) ? relationData as HierarchyRelation[] : []);
      setUsers(Array.isArray(userData) ? userData as HierarchyUser[] : []);
    } catch (error) {
      console.error('Error loading organizational hierarchy:', error);
      setTree([]);
      setRelations([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const currentRelation = relations.find((relation) => relation.usuario_id === selectedUserId);

  useEffect(() => {
    if (selectedUserId) {
      setSelectedSuperiorId(currentRelation?.superior_id || '');
    }
  }, [currentRelation?.superior_id, selectedUserId]);

  const reachableUsers = useMemo(() => {
    // Si es administrador o no hay usuario actual, permitimos ver todo (o nada si no hay login)
    const isAdmin = appUser?.rol === 'admin';
    if (isAdmin) return users;

    if (!currentUserId) return [];

    // Si el usuario no está en la jerarquía, podría ser el primero en configurarla
    const inHierarchy = relations.some((r) => r.usuario_id === currentUserId || r.superior_id === currentUserId);
    if (!inHierarchy) {
      // Si no hay relaciones en absoluto, permitimos ver a todos para empezar el árbol
      if (relations.length === 0) return users;
      // REGLA ESTRICTA: Si hay relaciones pero el usuario no está, NO debe ver a nadie
      return [];
    }

    const ids = new Set<string>([currentUserId]);
    let cursor = currentUserId;
    let safety = 0;
    while (safety++ < 50) {
      const rel = relations.find((r) => r.usuario_id === cursor);
      if (!rel) break;
      ids.add(rel.superior_id);
      cursor = rel.superior_id;
    }
    const collectSubs = (supId: string) => {
      relations.filter((r) => r.superior_id === supId).forEach((r) => {
        if (!ids.has(r.usuario_id)) { ids.add(r.usuario_id); collectSubs(r.usuario_id); }
      });
    };
    collectSubs(currentUserId);
    return users.filter((u) => ids.has(u.id));
  }, [appUser?.rol, currentUserId, relations, users]);

  const accessibleTree = useMemo(() => {
    if (reachableUsers.length === 0) return [];
    const reachableIds = new Set(reachableUsers.map((u) => u.id));
    const filterNode = (node: HierarchyNode): HierarchyNode | null => {
      if (!reachableIds.has(node.usuario_id)) return null;
      return {
        ...node,
        subordinados: (node.subordinados || [])
          .map(filterNode)
          .filter((n): n is HierarchyNode => n !== null),
      };
    };
    return tree.map(filterNode).filter((n): n is HierarchyNode => n !== null);
  }, [tree, reachableUsers]);

  const directorOptions = useMemo(() => {
    const directorsMap = new Map<string, string>();
    const traverse = (node: HierarchyNode) => {
      if (node.subordinados && node.subordinados.length > 0) {
        directorsMap.set(node.usuario_id, node.usuario.nombre);
      }
      node.subordinados?.forEach(traverse);
    };
    accessibleTree.forEach(traverse);

    return Array.from(directorsMap.entries()).map(([id, name]) => ({
      value: id,
      label: formatShortName(name),
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [accessibleTree]);

  const filteredTree = useMemo(() => {
    if (selectedDirectors.length === 0) return accessibleTree;

    const matchedNodes: HierarchyNode[] = [];
    const findNodes = (nodes: HierarchyNode[]) => {
      nodes.forEach((node) => {
        if (selectedDirectors.includes(node.usuario_id)) {
          matchedNodes.push(node);
        } else {
          findNodes(node.subordinados || []);
        }
      });
    };
    findNodes(accessibleTree);
    return matchedNodes;
  }, [selectedDirectors, accessibleTree]);

  // Preparar nodos para React Flow usando Dagre
  const { initialNodes, initialEdges } = useMemo(() => {
    const rfNodes: FlowNode<CustomNodeData>[] = [];
    const rfEdges: Edge[] = [];

    const handleToggleNode = (nodeId: string, currentState: boolean) => {
      setToggledNodes(prev => ({ ...prev, [nodeId]: !currentState }));
      setNodeToCenter(currentState ? null : nodeId);
    };

    const traverse = (node: HierarchyNode, level: number) => {
      const isExpanded = isNodeExpanded(toggledNodes, node.usuario_id, level);
      const hasChildren = node.subordinados && node.subordinados.length > 0;

      rfNodes.push({
        id: node.usuario_id,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          nodeData: node,
          level,
          selected: selectedUserId === node.usuario_id,
          onSelect: setSelectedUserId,
          isExpanded,
          hasChildren,
          onToggle: () => handleToggleNode(node.usuario_id, isExpanded)
        }
      });

      if (isExpanded) {
        node.subordinados?.forEach(child => {
          rfEdges.push({
            id: `e-${node.usuario_id}-${child.usuario_id}`,
            source: node.usuario_id,
            target: child.usuario_id,
            type: 'smoothstep',
            animated: false,
            style: { strokeWidth: 2, stroke: '#94a3b8' } // neutral-400
          });
          traverse(child, level + 1);
        });
      }
    };

    filteredTree.forEach(node => traverse(node, 0));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rfNodes, rfEdges, 'TB');
    return { initialNodes: layoutedNodes, initialEdges: layoutedEdges };
  }, [filteredTree, selectedUserId, toggledNodes]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(initialNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setFlowNodes(initialNodes);
    setFlowEdges(initialEdges);
  }, [initialNodes, initialEdges, setFlowNodes, setFlowEdges]);

  const handleSave = async () => {
    if (!selectedUserId || !selectedSuperiorId) return;
    setSaving(true);
    try {
      await post('/jerarquia/relaciones', {
        usuario_id: selectedUserId,
        superior_id: selectedSuperiorId,
        tipo_relacion: 'lineal',
        observacion: observacion || undefined,
      });
      setObservacion('');
      await fetchData();
    } catch (error) {
      console.error('Error saving hierarchy relation:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!currentRelation) return;
    setSaving(true);
    try {
      await deleteRequest(`/jerarquia/relaciones/${currentRelation.id}`);
      setSelectedSuperiorId('');
      await fetchData();
    } catch (error) {
      console.error('Error deactivating hierarchy relation:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-3 pb-6 animate-in fade-in duration-500">
      {/* Banner Header */}
      <div className="flex justify-between items-center bg-white dark:bg-neutral-900/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/service-portal/gestion-actividades')}
            className="text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-variant)] px-3 py-1.5 text-sm rounded-lg flex items-center gap-2"
          >
            ← Volver
          </Button>
          <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />
          <Title variant="h1" weight="bold" color="text-primary">Jerarquía Organizacional</Title>
          <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Text as="span" variant="caption" weight="bold" className="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-3 py-1 rounded-full border border-primary-100 dark:border-primary-800/50">
              {reachableUsers.length} Usuarios
            </Text>
          </div>
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={fetchData} disabled={loading}>
          Actualizar
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {/* Barra de Gestión estilo Toolbar */}
        <MaterialCard elevation={1} className="!p-2 bg-[var(--color-surface-variant)]/10">
          <div className="flex flex-col xl:flex-row gap-3 items-center">
            <div className="flex items-center gap-2 shrink-0 border-r border-[var(--color-border)] pr-3 mr-1 hidden xl:flex">
              <Text variant="caption" weight="bold" color="primary" className="uppercase tracking-widest !text-[10px]">Gestionar</Text>
            </div>

            <div className="flex-1 w-full flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <AutocompleteUserField
                  label="Empleado"
                  value={selectedUserId}
                  users={users}
                  onChange={setSelectedUserId}
                  compact
                />
              </div>
              <div className="flex-1">
                <AutocompleteUserField
                  label="Jefe directo"
                  value={selectedSuperiorId}
                  users={users}
                  onChange={setSelectedSuperiorId}
                  excludeId={selectedUserId}
                  disabled={!selectedUserId}
                  compact
                />
              </div>
            </div>

            <div className="w-full xl:w-[280px] flex items-center gap-2">
              <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-tighter !text-[9px] shrink-0 xl:hidden">Motivo:</Text>
              <Input
                placeholder="Observación / Motivo..."
                value={observacion}
                onChange={(event) => setObservacion(event.target.value)}
                size="xs"
                className="flex-1"
              />
            </div>

            <div className="flex gap-2 w-full xl:w-auto shrink-0">
              <Button variant="primary" size="xs" icon={UserPlus} onClick={handleSave} disabled={saving || !selectedUserId || !selectedSuperiorId} className="flex-1 xl:flex-none h-8 px-4">
                Guardar
              </Button>
              {currentRelation && (
                <Button variant="danger" size="xs" icon={X} onClick={handleDeactivate} disabled={saving} className="flex-1 xl:flex-none h-8 px-4">
                  Desactivar
                </Button>
              )}
            </div>
          </div>
        </MaterialCard>

        <MaterialCard className="overflow-hidden" elevation={2}>
          <div className="border-b border-[var(--color-border)] px-4 py-1.5 bg-[var(--color-surface-variant)]/30">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Title variant="h6" weight="bold" color="text-primary" className="m-0 !text-sm">Árbol jerárquico</Title>
                <Badge variant="info" size="xs" className="!text-[9px]">Visualización gráfica</Badge>
              </div>
              <div className="relative scale-90 origin-right">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Filter}
                  onClick={(e) => {
                    setFilterAnchorRect(e.currentTarget.getBoundingClientRect());
                    setTempSelectedDirectors([...selectedDirectors]);
                    setFilterSearchTerm('');
                    setIsFilterOpen(true);
                  }}
                  className="shadow-sm whitespace-nowrap"
                >
                  <Text as="span" className="inline-flex items-center gap-1.5">
                    Filtrar por Superior
                    {selectedDirectors.length > 0 && (
                      <Badge variant="primary" size="xs" className="px-1.5 py-0.5 rounded-full !text-[9px]">
                        {selectedDirectors.length}
                      </Badge>
                    )}
                    <ChevronDown size={14} className="opacity-60 shrink-0" />
                  </Text>
                </Button>
              </div>
            </div>
          </div>

          <div className="max-h-[calc(100vh-230px)] min-h-[500px] overflow-auto p-4 custom-scrollbar custom-scrollbar-x bg-[var(--color-surface-variant)]/5 rounded-xl relative">
            {loading ? (
              <div className="flex items-center justify-center h-full relative z-10">
                <div className="flex flex-col items-center gap-4">
                  <RefreshCw size={40} className="animate-spin text-[var(--color-primary)]" />
                  <Text variant="body2" color="text-secondary">Generando organigrama...</Text>
                </div>
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="relative z-10">
                <EmptyState />
              </div>
            ) : (
              <div className="w-full h-[600px] relative z-10 rounded-xl overflow-hidden">
                <ReactFlowProvider>
                  <FlowWithFitView
                    nodes={flowNodes}
                    edges={flowEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    selectedDirectors={selectedDirectors}
                    nodeToCenter={nodeToCenter}
                    onCentered={() => setNodeToCenter(null)}
                  />
                </ReactFlowProvider>
              </div>
            )}
          </div>
        </MaterialCard>
      </div>

      <FilterDropdown
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        anchorRect={filterAnchorRect}
        title="Filtrar por Superior"
        type="categorical"
        options={directorOptions}
        tempValue={tempSelectedDirectors}
        searchTerm={filterSearchTerm}
        onSearchChange={setFilterSearchTerm}
        onToggleOption={(val) => {
          setTempSelectedDirectors((prev) =>
            prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
          );
        }}
        onSelectAll={() => {
          const allIds = directorOptions.map((o) => o.value);
          setTempSelectedDirectors((prev) =>
            prev.length === allIds.length ? [] : allIds
          );
        }}
        isAllSelected={directorOptions.length > 0 && tempSelectedDirectors.length === directorOptions.length}
        onClearSelection={() => setTempSelectedDirectors([])}
        onApply={() => {
          setSelectedDirectors(tempSelectedDirectors);
          setIsFilterOpen(false);
        }}
        placeholder="Buscar superior..."
      />
    </div>
  );
};




const EmptyState: React.FC = () => (
  <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
    <div className="mb-4 rounded-3xl bg-[var(--color-surface-variant)] p-5 text-[var(--color-primary)]">
      <GitBranch size={34} />
    </div>
    <Title variant="h5" weight="bold" color="text-primary">Aún no hay árbol configurado</Title>
    <Text variant="body2" color="text-secondary" className="max-w-md">
      Selecciona una persona y su superior directo para empezar a construir la jerarquía organizacional.
    </Text>
  </div>
);

// Nodo estático eliminado en favor de React Flow CustomNode

export default OrganizationalHierarchy;
