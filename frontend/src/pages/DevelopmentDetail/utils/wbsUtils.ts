export const getWbsOrderStorageKey = (developmentId: string) => `wbs_tasks_order_${developmentId}`;

export const loadStoredWbsOrder = (developmentId: string) => {
    try {
        const raw = localStorage.getItem(getWbsOrderStorageKey(developmentId));
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
        return [];
    }
};

export const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
};

export const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
        const [y, m, d] = dateStr.split('T')[0].split('-');
        return `${d}/${m}/${y}`;
    } catch {
        return dateStr;
    }
};

import { WbsActivityTree } from '../../../types/wbs';

export const flattenTree = (nodes: WbsActivityTree[]): WbsActivityTree[] => {
    const result: WbsActivityTree[] = [];
    for (const node of nodes) {
        result.push(node);
        if (node.subactividades?.length) {
            result.push(...flattenTree(node.subactividades));
        }
    }
    return result;
};

export const getAvanceDeTarea = (estado: string): number => {
    const s = (estado || '').toLowerCase();
    if (s.includes('complet')) return 100;
    if (s.includes('progreso') || s.includes('proceso') || s.includes('curso')) return 50;
    if (s.includes('pausa')) return 50;
    return 0;
};

export const getStatusChipClass = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('complet'))  return 'text-green-700 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50';
    if (s.includes('progreso') || s.includes('curso')) return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/50';
    if (s.includes('pendiente')) return 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
    if (s.includes('pausa'))    return 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50';
    if (s.includes('cancel'))   return 'text-neutral-600 bg-neutral-100 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
    return 'text-neutral-600 bg-neutral-50 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
};

export const getAvanceChipClass = (pct: number) => {
    if (pct >= 100) return 'text-green-700 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50';
    if (pct >= 75)  return 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50';
    if (pct >= 50)  return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/50';
    if (pct >= 25)  return 'text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50';
    return 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
};

export const getColumnAccessors = (
    tree: WbsActivityTree[], 
    getLider: (node: WbsActivityTree) => string, 
    getUserName: (id?: string) => string
) => ({
    index: (node: WbsActivityTree) => {
        const flat = flattenTree(tree);
        const idx = flat.findIndex(n => n.id === node.id);
        return idx !== -1 ? String(idx + 1) : '(Draf)';
    },
    titulo: (node: WbsActivityTree) => node.titulo,
    titulo_titulo: (node: WbsActivityTree) => node.titulo,
    titulo_descripcion: (node: WbsActivityTree) => node.descripcion || '(Vacío)',
    porcentaje_avance: (node: WbsActivityTree) => `${node.porcentaje_avance}%`,
    estado: (node: WbsActivityTree) => node.estado,
    notas_seguimiento: (node: WbsActivityTree) => node.seguimiento || '(Sin seguimiento)',
    notas_compromiso: (node: WbsActivityTree) => node.compromiso || '(Sin compromiso)',
    lider: (node: WbsActivityTree) => getLider(node),
    lider_supervisor: (node: WbsActivityTree) => getUserName(node.responsable_id) || '(Sin asignar)',
    lider_ejecutor: (node: WbsActivityTree) => getUserName(node.asignado_a_id) || '(Sin asignar)',
    validacion: (node: WbsActivityTree) => node.estado_validacion || 'sin_validar',
    fecha_inicio_estimada: (node: WbsActivityTree) => formatDate(node.fecha_inicio_estimada || node.fecha_inicio_real),
    fecha_fin_estimada: (node: WbsActivityTree) => formatDate(node.fecha_fin_estimada || node.fecha_fin_real),
});
