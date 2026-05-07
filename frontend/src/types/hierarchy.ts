export interface HierarchyUser {
  id: string;
  cedula: string;
  nombre: string;
  rol: string;
  area?: string | null;
  cargo?: string | null;
}

export interface HierarchyNode {
  usuario_id: string;
  superior_id?: string | null;
  tipo_relacion?: string | null;
  usuario: HierarchyUser;
  subordinados: HierarchyNode[];
}

export interface AssignableUserOption {
  id: string;
  label: string;
  description: string;
  isDirect: boolean;
}

export interface AssignmentValidation {
  id: number;
  desarrollo_id?: string | null;
  actividad_id?: number | null;
  solicitado_por_id: string;
  validador_id: string;
  asignado_a_id: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada' | string;
  motivo?: string | null;
  observacion?: string | null;
  creado_en?: string | null;
  validado_en?: string | null;
}

export interface HierarchyRelation {
  id: number;
  usuario_id: string;
  superior_id: string;
  tipo_relacion: string;
  esta_activa: boolean;
  creado_en?: string | null;
  actualizado_en?: string | null;
  usuario?: HierarchyUser | null;
  superior?: HierarchyUser | null;
}

export interface HierarchyRelationPayload {
  usuario_id: string;
  superior_id: string;
  tipo_relacion?: string;
  observacion?: string;
}

export const flattenHierarchy = (nodes: HierarchyNode[], directOnly = false): AssignableUserOption[] => {
  const output: AssignableUserOption[] = [];

  const walk = (items: HierarchyNode[], level: number) => {
    items.forEach((node) => {
      const isDirect = level === 1;
      if (!directOnly || isDirect) {
        output.push({
          id: node.usuario.id,
          label: node.usuario.nombre,
          description: [node.usuario.cargo, node.usuario.area, isDirect ? 'Directo' : 'Indirecto']
            .filter(Boolean)
            .join(' · '),
          isDirect,
        });
      }
      walk(node.subordinados || [], level + 1);
    });
  };

  walk(nodes, 1);
  return output;
};
