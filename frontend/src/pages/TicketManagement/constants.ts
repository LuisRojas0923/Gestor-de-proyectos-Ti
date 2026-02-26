import {
    Inbox,
    AlertCircle,
    RefreshCw,
    CheckCircle
} from 'lucide-react';

export const COLUMN_WIDTHS = {
    id: "md:w-20",
    fecha: "md:w-24",
    estado: "md:w-32",
    asunto: "flex-1",
    solicitante: "md:w-64",
    area: "md:w-48",
    prioridad: "md:w-24",
    analista: "md:w-64",
    acciones: "md:w-36"
};

export const SUB_STATUS_OPTIONS: Record<string, { value: string, label: string }[]> = {
    'Todos': [],
    'Pendiente': [
        { value: "Sin Asignar", label: "Sin Asignar" },
        { value: "Asignado", label: "Asignado" }
    ],
    'Proceso': [
        { value: "Proceso", label: "En Proceso" },
        { value: "Pendiente Información", label: "Pendiente Info" }
    ],
    'Cerrado': [
        { value: "Resuelto", label: "Resuelto" },
        { value: "Escalado", label: "Escalado" }
    ]
};

export const getStatusStyle = (status: string) => {
    switch (status) {
        case 'Pendiente': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case 'Proceso': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'Cerrado': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
};

export const getPriorityStyle = (priority: string) => {
    switch (priority) {
        case 'Alta':
        case 'Crítica': return 'text-red-500';
        case 'Media': return 'text-yellow-500';
        default: return 'text-green-500';
    }
};

export const STATS_CARDS = (counts: { total: number, pendiente: number, proceso: number, cerrado: number }) => [
    { label: 'Total Tickets', count: counts.total, color: 'blue', icon: Inbox },
    { label: 'Pendientes', count: counts.pendiente, color: 'blue', icon: AlertCircle },
    { label: 'En Proceso', count: counts.proceso, color: 'yellow', icon: RefreshCw },
    { label: 'Cerrados', count: counts.cerrado, color: 'green', icon: CheckCircle },
];
