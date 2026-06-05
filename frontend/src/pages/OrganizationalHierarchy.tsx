import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GitBranch, RefreshCw, Search, UserPlus, X, ArrowLeft } from 'lucide-react';
import { ReactFlow, MiniMap, Controls, Background, Edge, Position, MarkerType, Handle, useNodesState, useEdgesState } from '@xyflow/react';
import type { Node as FlowNode } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import * as dagre from 'dagre';
import { useNavigate, useLocation } from 'react-router-dom';
import { Badge, Button, Input, MaterialCard, Text, Title } from '../components/atoms';
import { useApi } from '../hooks/useApi';
import { useAppContext } from '../context/AppContext';
import { HierarchyNode, HierarchyRelation, HierarchyUser } from '../types/hierarchy';

// Configurador del auto-layout con Dagre
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 260;
const nodeHeight = 130;

const getLayoutedElements = (nodes: FlowNode[], edges: Edge[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const CustomNodeComponent = ({ data, isConnectable }: any) => {
  const { nodeData, level, selected, onSelect } = data;
  const user = nodeData.usuario;
  const isSelected = selected;
  
  const getLevelStyles = (lvl: number, isSelected: boolean) => {
    if (isSelected) return '!border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-md scale-105';
    switch (lvl) {
      case 0: return 'border-primary-500/30 bg-gradient-to-br from-primary-500/5 to-primary-600/10 dark:from-primary-900/20 dark:to-primary-800/10';
      case 1: return 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-indigo-600/10 dark:from-indigo-900/20 dark:to-indigo-800/10';
      case 2: return 'border-sky-500/30 bg-gradient-to-br from-sky-500/5 to-sky-600/10 dark:from-sky-900/20 dark:to-sky-800/10';
      default: return 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 dark:from-emerald-900/20 dark:to-emerald-800/10';
    }
  };

  const getAvatarColors = (lvl: number) => {
    switch (lvl) {
      case 0: return 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 border-primary-200 dark:border-primary-800';
      case 1: return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 2: return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      default: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
  };

  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-3 h-3 border-2 border-[var(--color-surface)] bg-neutral-300 dark:bg-neutral-600" />
      <MaterialCard
        onClick={() => onSelect(user.id)}
        className={`p-3 min-w-[240px] max-w-[260px] cursor-pointer transition-all border-2 ${getLevelStyles(level, isSelected)}`}
        elevation={isSelected ? 3 : 1}
      >
        <div className="flex flex-col items-center text-center gap-2">
          {/* Initials Avatar */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border shadow-sm ${getAvatarColors(level)}`}>
            <Text variant="h6" weight="bold" className="!m-0 leading-none tracking-tight">{getInitials(user.nombre)}</Text>
          </div>
          
          <div className="w-full">
            <Text variant="body2" weight="bold" color="text-primary" className="w-full leading-tight uppercase truncate" title={user.nombre}>
              {user.nombre}
            </Text>
            <Text variant="body2" weight="medium" color="text-secondary" className="w-full leading-tight opacity-90 truncate mt-0.5" title={user.cargo || user.rol}>
              {user.cargo || user.rol}
            </Text>
          </div>

          <div className="mt-1 flex items-center justify-center gap-1 w-full">
            <Badge variant={level === 0 ? 'primary' : 'default'} size="xs" className="!text-[9px] px-1.5 py-0 h-4.5 min-h-0 flex items-center font-bold">N{level + 1}</Badge>
            {nodeData.subordinados?.length > 0 && (
              <Badge variant="info" size="xs" className="!text-[9px] px-1.5 py-0 h-4.5 min-h-0 flex items-center font-bold">{nodeData.subordinados.length} dep.</Badge>
            )}
          </div>
        </div>
      </MaterialCard>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-3 h-3 border-2 border-[var(--color-surface)] bg-neutral-300 dark:bg-neutral-600" />
    </>
  );
};

const nodeTypes = { custom: CustomNodeComponent };

const OrganizationalHierarchy: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPortal = location.pathname.startsWith('/service-portal');
  const { get, post, delete: deleteRequest } = useApi<unknown>();
  const { state } = useAppContext();
  const currentUserId: string = (state.user as any)?.id || (state.user as any)?.usuario_id || '';
  const [tree, setTree] = useState<HierarchyNode[]>([]);
  const [relations, setRelations] = useState<HierarchyRelation[]>([]);
  const [users, setUsers] = useState<HierarchyUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedSuperiorId, setSelectedSuperiorId] = useState('');
  const [observacion, setObservacion] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
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
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const currentRelation = relations.find((relation) => relation.usuario_id === selectedUserId);

  useEffect(() => {
    if (selectedUserId) {
      setSelectedSuperiorId(currentRelation?.superior_id || '');
    }
  }, [currentRelation?.superior_id, selectedUserId]);

  const reachableUsers = useMemo(() => {
    // Si es administrador o no hay usuario actual, permitimos ver todo (o nada si no hay login)
    const isAdmin = (state.user as any)?.rol === 'admin';
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
  }, [currentUserId, relations, users, state.user]);

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

  const filteredTree = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return accessibleTree;

    const filterNodes = (nodes: HierarchyNode[]): HierarchyNode[] => nodes
      .map((node) => ({ ...node, subordinados: filterNodes(node.subordinados || []) }))
      .filter((node) => {
        const text = [node.usuario.nombre, node.usuario.cargo, node.usuario.area, node.usuario.rol]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.includes(term) || node.subordinados.length > 0;
      });

    return filterNodes(accessibleTree);
  }, [searchTerm, accessibleTree]);

  // Preparar nodos para React Flow usando Dagre
  const { initialNodes, initialEdges } = useMemo(() => {
    const rfNodes: FlowNode[] = [];
    const rfEdges: Edge[] = [];

    const traverse = (node: HierarchyNode, level: number) => {
      rfNodes.push({
        id: node.usuario_id,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          nodeData: node,
          level,
          selected: selectedUserId === node.usuario_id,
          onSelect: setSelectedUserId
        }
      });

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
    };

    filteredTree.forEach(node => traverse(node, 0));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rfNodes, rfEdges, 'TB');
    return { initialNodes: layoutedNodes, initialEdges: layoutedEdges };
  }, [filteredTree, selectedUserId]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(initialNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setFlowNodes(initialNodes);
    setFlowEdges(initialEdges);
  }, [initialNodes, initialEdges, setFlowNodes, setFlowEdges]);

  const reachableRelations = relations.filter(
    (r) => reachableUsers.some((u) => u.id === r.usuario_id)
  );
  const reachableWithoutSuperior = reachableUsers.filter(
    (user) => !reachableRelations.some((r) => r.usuario_id === user.id)
  );

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
              <div className="w-full md:max-w-[200px] scale-90 origin-right">
                <Input
                  placeholder="Filtrar árbol..."
                  icon={Search}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-7"
                  size="xs"
                />
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
                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
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
                    nodeColor={(n: any) => {
                      if (n.data?.selected) return 'var(--color-primary)';
                      return '#94a3b8';
                    }}
                    maskColor="rgba(0,0,0, 0.05)"
                  />
                  <Controls />
                </ReactFlow>
              </div>
            )}
          </div>
        </MaterialCard>
      </div>
    </div>
  );
};

const AutocompleteUserField: React.FC<{
  label: string;
  value: string;
  users: HierarchyUser[];
  onChange: (userId: string) => void;
  excludeId?: string;
  disabled?: boolean;
  compact?: boolean;
}> = ({ label, value, users, onChange, excludeId, disabled, compact }) => {
  const availableUsers = users.filter((u) => u.id !== excludeId);
  const selected = availableUsers.find((u) => u.id === value);

  const [nombreInput, setNombreInput] = useState(selected?.nombre || '');
  const [cedulaInput, setCedulaInput] = useState(selected?.cedula || '');
  const [open, setOpen] = useState(false);
  const [filterBy, setFilterBy] = useState<'nombre' | 'cedula'>('nombre');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const u = availableUsers.find((u) => u.id === value);
    setNombreInput(u?.nombre || '');
    setCedulaInput(u?.cedula || '');
  }, [value, users, excludeId]);

  const filtered = availableUsers.filter((u) => {
    if (filterBy === 'cedula') return (u.cedula || '').includes(cedulaInput.trim());
    return u.nombre.toLowerCase().includes(nombreInput.trim().toLowerCase());
  });

  const select = (user: HierarchyUser) => {
    setNombreInput(user.nombre);
    setCedulaInput(user.cedula || '');
    setOpen(false);
    onChange(user.id);
  };

  const clear = () => {
    setNombreInput('');
    setCedulaInput('');
    onChange('');
  };

  return (
    <div ref={containerRef} className={`${compact ? 'flex items-center gap-2' : 'space-y-1'}`}>
      <Text variant="caption" weight="bold" color="text-secondary" className={`uppercase tracking-wide shrink-0 ${compact ? '!text-[9px] w-14' : ''}`}>{label}</Text>
      <div className="flex flex-1 gap-2">
        <div className="w-24 shrink-0">
          <Input
            value={cedulaInput}
            disabled={disabled}
            placeholder="Cédula..."
            onChange={(e) => { setCedulaInput(e.target.value); setFilterBy('cedula'); setOpen(true); if (!e.target.value) clear(); }}
            onFocus={() => { setFilterBy('cedula'); setOpen(true); }}
            className="h-8 text-xs"
            size="xs"
          />
        </div>
        <div className="relative flex-1">
          <Input
            value={nombreInput}
            disabled={disabled}
            placeholder="Nombre del empleado..."
            onChange={(e) => { setNombreInput(e.target.value); setFilterBy('nombre'); setOpen(true); if (!e.target.value) clear(); }}
            onFocus={() => { setFilterBy('nombre'); setOpen(true); }}
            className="h-8 text-xs"
            size="xs"
          />
          {open && filtered.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl max-h-52 overflow-y-auto custom-scrollbar">
              {filtered.map((user) => (
                <Button
                  key={user.id}
                  variant="custom"
                  className="w-full px-4 py-2.5 text-left hover:bg-[var(--color-primary)]/10 transition-colors border-b border-[var(--color-border)] last:border-0"
                  onMouseDown={() => select(user)}
                >
                  <Text variant="body2" weight="semibold" color="text-primary">{user.nombre}</Text>
                  <Text variant="caption" color="text-secondary">{user.cedula} · {user.cargo || user.rol}</Text>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: string; tone?: 'default' | 'warning' | 'success' }> = ({ label, value, tone = 'default' }) => (
  <MaterialCard className="p-5" elevation={1}>
    <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-wide">{label}</Text>
    <div className="mt-2 flex items-end justify-between">
      <Title variant="h3" weight="bold" color="text-primary">{value}</Title>
      {tone !== 'default' && <Badge variant={tone} size="sm">{tone === 'warning' ? 'Revisar' : 'OK'}</Badge>}
    </div>
  </MaterialCard>
);

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
