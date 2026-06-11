import {
    CheckCircle2,
    XCircle,
    CirclePause,
    PlayCircle,
    AlertCircle,
    type LucideIcon,
} from 'lucide-react';

export const ESTADO_ICON_SIZE = 16;

export interface EstadoStatusIcon {
    Icon: LucideIcon;
    className: string;
    label: string;
}

export const getEstadoStatusIcon = (estado: string): EstadoStatusIcon => {
    const n = estado.toLowerCase();
    if (n.includes('complet')) {
        return { Icon: CheckCircle2, className: 'text-green-600 dark:text-green-400', label: estado };
    }
    if (n.includes('progreso') || n.includes('curso') || n.includes('proceso')) {
        return { Icon: PlayCircle, className: 'text-amber-600 dark:text-amber-400', label: estado };
    }
    if (n.includes('pausa')) {
        return { Icon: CirclePause, className: 'text-amber-600 dark:text-amber-400', label: estado };
    }
    if (n.includes('bloqueado')) {
        return { Icon: XCircle, className: 'text-red-500 dark:text-red-400', label: estado };
    }
    if (n.includes('pendiente')) {
        return { Icon: AlertCircle, className: 'text-red-500 animate-pulse', label: estado };
    }
    return { Icon: AlertCircle, className: 'text-red-500 animate-pulse', label: estado };
};

export const ESTADO_MENU_OPTIONS = [
    { value: 'Pendiente', ...getEstadoStatusIcon('Pendiente') },
    { value: 'En Proceso', ...getEstadoStatusIcon('En Proceso') },
    { value: 'Pausa', ...getEstadoStatusIcon('Pausa') },
    { value: 'Bloqueado', ...getEstadoStatusIcon('Bloqueado') },
    { value: 'Completada', ...getEstadoStatusIcon('Completada') },
] as const;
