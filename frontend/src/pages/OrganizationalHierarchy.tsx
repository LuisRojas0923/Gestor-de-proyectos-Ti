import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GitBranch, RefreshCw, Search, UserPlus, X } from 'lucide-react';
import { Badge, Button, Input, MaterialCard, Skeleton, Text, Textarea, Title } from '../components/atoms';
import { useApi } from '../hooks/useApi';
import { useAppContext } from '../context/AppContext';
import { HierarchyNode, HierarchyRelation, HierarchyUser } from '../types/hierarchy';

const OrganizationalHierarchy: React.FC = () => {
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

  const selectedUser = users.find((user) => user.id === selectedUserId);
  const currentRelation = relations.find((relation) => relation.usuario_id === selectedUserId);

  useEffect(() => {
    if (selectedUserId) {
      setSelectedSuperiorId(currentRelation?.superior_id || '');
    }
  }, [currentRelation?.superior_id, selectedUserId]);

  const filteredTree = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return tree;

    const filterNodes = (nodes: HierarchyNode[]): HierarchyNode[] => nodes
      .map((node) => ({ ...node, subordinados: filterNodes(node.subordinados || []) }))
      .filter((node) => {
        const text = [node.usuario.nombre, node.usuario.cargo, node.usuario.area, node.usuario.rol]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.includes(term) || node.subordinados.length > 0;
      });

    return filterNodes(tree);
  }, [searchTerm, tree]);

  const reachableUsers = useMemo(() => {
    if (!currentUserId) return [];
    const inHierarchy = relations.some((r) => r.usuario_id === currentUserId || r.superior_id === currentUserId);
    if (!inHierarchy) return [];
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
  }, [currentUserId, relations, users]);

  const usersWithoutSuperior = users.filter((user) => !relations.some((relation) => relation.usuario_id === user.id));
  const totalNodes = users.length;


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
    <div className="mx-auto max-w-[1600px] space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
            <GitBranch size={16} className="text-[var(--color-primary)]" />
            <Text variant="caption" weight="bold" color="text-secondary">Organigrama operativo</Text>
          </div>
          <Title variant="h3" weight="bold" color="text-primary">Jerarquía Organizacional</Title>
          <Text variant="body1" color="text-secondary" className="max-w-2xl">
            Administra quién reporta a quién para controlar visibilidad, asignación de tareas y aprobaciones por nivel.
          </Text>
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={fetchData} disabled={loading}>Actualizar</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Usuarios activos" value={totalNodes.toString()} />
        <SummaryCard label="Relaciones activas" value={relations.length.toString()} />
        <SummaryCard label="Sin superior" value={usersWithoutSuperior.length.toString()} tone={usersWithoutSuperior.length > 0 ? 'warning' : 'success'} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <MaterialCard className="xl:col-span-8 overflow-hidden" elevation={2}>
          <div className="border-b border-[var(--color-border)] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <Title variant="h5" weight="bold" color="text-primary">Árbol jerárquico</Title>
                <Text variant="body2" color="text-secondary">Expande visualmente la cadena gerente, director, jefe y empleado.</Text>
              </div>
              <Input
                placeholder="Buscar persona, cargo o área..."
                icon={Search}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="md:max-w-xs"
              />
            </div>
          </div>

          <div className="max-h-[calc(100vh-360px)] min-h-[420px] overflow-y-auto p-4 custom-scrollbar">
            {loading ? (
              <div className="space-y-3">
                <Skeleton height={76} />
                <Skeleton height={76} className="ml-8" />
                <Skeleton height={76} className="ml-16" />
              </div>
            ) : filteredTree.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-3">
                {filteredTree.map((node) => (
                  <HierarchyTreeNode
                    key={node.usuario_id}
                    node={node}
                    level={0}
                    selectedUserId={selectedUserId}
                    onSelect={setSelectedUserId}
                  />
                ))}
              </div>
            )}
          </div>
        </MaterialCard>

        <MaterialCard className="xl:col-span-4" elevation={2}>
          <div className="border-b border-[var(--color-border)] p-5">
            <Title variant="h5" weight="bold" color="text-primary">Gestionar relación</Title>
            <Text variant="body2" color="text-secondary">Asigna o cambia el superior directo de una persona.</Text>
          </div>

          <div className="space-y-4 p-5">
            <AutocompleteUserField
              label="Empleado"
              value={selectedUserId}
              users={reachableUsers}
              onChange={setSelectedUserId}
            />
            <AutocompleteUserField
              label="Jefe directo"
              value={selectedSuperiorId}
              users={reachableUsers}
              onChange={setSelectedSuperiorId}
              excludeId={selectedUserId}
              disabled={!selectedUserId}
            />

            {selectedUser && (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-variant)]/50 p-4">
                <Text variant="caption" weight="bold" color="text-secondary">Vista previa</Text>
                <Title variant="h6" weight="bold" color="text-primary" className="mt-1">{selectedUser.nombre}</Title>
                <Text variant="body2" color="text-secondary">{selectedUser.cargo || selectedUser.rol} · {selectedUser.area || 'Sin área'}</Text>
                {currentRelation && (
                  <Badge variant="warning" size="sm" className="mt-3">Tiene superior activo</Badge>
                )}
              </div>
            )}

            <Textarea
              label="Observación"
              placeholder="Opcional: motivo del cambio jerárquico..."
              value={observacion}
              onChange={(event) => setObservacion(event.target.value)}
            />

            <div className="flex flex-col gap-2">
              <Button variant="primary" icon={UserPlus} onClick={handleSave} disabled={saving || !selectedUserId || !selectedSuperiorId}>
                Guardar relación
              </Button>
              {currentRelation && (
                <Button variant="danger" icon={X} onClick={handleDeactivate} disabled={saving}>
                  Desactivar relación actual
                </Button>
              )}
            </div>
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
}> = ({ label, value, users, onChange, excludeId, disabled }) => {
  const availableUsers = users.filter((u) => u.id !== excludeId);
  const selected = availableUsers.find((u) => u.id === value);

  const [nombreInput, setNombreInput] = useState(selected?.nombre || '');
  const [cedulaInput, setCedulaInput] = useState(selected?.cedula || '');
  const [open, setOpen] = useState(false);
  const [filterBy, setFilterBy] = useState<'nombre' | 'cedula'>('nombre');
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div ref={containerRef} className="space-y-1.5">
      <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-wide">{label}</Text>
      <div className="flex gap-2">
        <div className="w-36 shrink-0">
          <Input
            label="Cédula"
            value={cedulaInput}
            disabled={disabled}
            placeholder="Buscar..."
            onChange={(e) => { setCedulaInput(e.target.value); setFilterBy('cedula'); setOpen(true); if (!e.target.value) clear(); }}
            onFocus={() => { setFilterBy('cedula'); setOpen(true); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
        </div>
        <div className="relative flex-1">
          <Input
            label="Nombre"
            value={nombreInput}
            disabled={disabled}
            placeholder="Buscar empleado..."
            onChange={(e) => { setNombreInput(e.target.value); setFilterBy('nombre'); setOpen(true); if (!e.target.value) clear(); }}
            onFocus={() => { setFilterBy('nombre'); setOpen(true); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
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

const HierarchyTreeNode: React.FC<{
  node: HierarchyNode;
  level: number;
  selectedUserId: string;
  onSelect: (userId: string) => void;
}> = ({ node, level, selectedUserId, onSelect }) => {
  const isSelected = selectedUserId === node.usuario_id;
  const marginClass = level === 0 ? '' : level === 1 ? 'ml-5 md:ml-8' : level === 2 ? 'ml-10 md:ml-16' : 'ml-14 md:ml-24';

  return (
    <div className={marginClass}>
      <MaterialCard
        onClick={() => onSelect(node.usuario_id)}
        className={`p-4 ${isSelected ? '!border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-md' : 'hover:!border-[var(--color-primary)]/60'}`}
        elevation={1}
        hoverable
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <Text variant="body1" weight="bold" color="text-primary" className="truncate">{node.usuario.nombre}</Text>
            <Text variant="caption" color="text-secondary" className="truncate">{node.usuario.cargo || node.usuario.rol} · {node.usuario.area || 'Sin área'}</Text>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={level === 0 ? 'primary' : 'default'} size="sm">Nivel {level + 1}</Badge>
            <Badge variant="info" size="sm">{node.subordinados?.length || 0} directos</Badge>
          </div>
        </div>
      </MaterialCard>
      {node.subordinados?.length > 0 && (
        <div className="mt-3 space-y-3 border-l border-[var(--color-border)] pl-3">
          {node.subordinados.map((child) => (
            <HierarchyTreeNode key={child.usuario_id} node={child} level={level + 1} selectedUserId={selectedUserId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

export default OrganizationalHierarchy;
