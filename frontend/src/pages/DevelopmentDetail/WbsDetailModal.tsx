import React, { useCallback } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import Modal from '../../components/molecules/Modal';
import { Text, Button, Badge } from '../../components/atoms';
import { ValidationStatusBadge } from '../../components/assignments/ValidationStatusBadge';
import { WbsActivityTree } from '../../types/wbs';

interface WbsDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    activity: WbsActivityTree | null;
    userMap: Map<string, string>;
    onResolveValidation?: (id: number, estado: 'aprobada' | 'rechazada') => void;
    resolvingIds?: Set<number>;
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
        const [y, m, d] = dateStr.split('T')[0].split('-');
        return `${d}/${m}/${y}`;
    } catch {
        return dateStr;
    }
};

const getStatusVariant = (estado: string): 'default' | 'success' | 'warning' | 'error' => {
    const normalized = estado.toLowerCase();
    if (normalized.includes('pendiente')) return 'error';
    if (normalized.includes('progreso') || normalized.includes('curso')) return 'warning';
    if (normalized.includes('complet')) return 'success';
    if (normalized.includes('pausa') || normalized.includes('bloqueado')) return 'warning';
    return 'default';
};

interface SectionProps {
    label: string;
    children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ label, children }) => (
    <div className="space-y-2">
        <Text variant="caption" weight="bold" className="uppercase tracking-wider text-[var(--color-text-secondary)]">
            {label}
        </Text>
        <div className="border-b border-[var(--color-border)] pb-2">
            {children}
        </div>
    </div>
);

export const WbsDetailModal: React.FC<WbsDetailModalProps> = ({
    isOpen,
    onClose,
    activity,
    userMap,
    onResolveValidation,
    resolvingIds,
}) => {
    const getUserName = useCallback((id?: string) => {
        if (!id) return '-';
        return userMap.get(id) ?? id;
    }, [userMap]);

    if (!activity) return null;

    const status = activity.estado_validacion;
    const isPending = status?.toLowerCase() === 'pendiente';
    const isResolving = resolvingIds?.has(activity.validacion_id ?? -1);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xl"
            showCloseButton
            closeOnOverlayClick
            className="max-w-2xl"
        >
            <div className="space-y-6">
                {/* Header: título de la actividad */}
                <div className="border-b border-[var(--color-border)] pb-4">
                    <Text weight="bold" className="text-base leading-tight">
                        {activity.titulo}
                    </Text>
                    {activity.descripcion && (
                        <Text variant="caption" color="text-secondary" className="mt-1 block">
                            {activity.descripcion}
                        </Text>
                    )}
                </div>

                {/* Dos columnas */}
                <div className="grid grid-cols-2 gap-6">

                    {/* Columna izquierda */}
                    <div className="space-y-5">
                        {/* ESTADO */}
                        <Section label="Estado">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={getStatusVariant(activity.estado)} size="sm">
                                    {activity.estado}
                                </Badge>
                                <Text variant="caption" weight="bold">
                                    {activity.porcentaje_avance}%
                                </Text>
                            </div>
                        </Section>

                        {/* FECHAS */}
                        <Section label="Fechas">
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <Text variant="caption" color="text-secondary">Inicio Est.</Text>
                                    <Text variant="caption">{formatDate(activity.fecha_inicio_estimada)}</Text>
                                </div>
                                <div className="flex justify-between">
                                    <Text variant="caption" color="text-secondary">Inicio Real</Text>
                                    <Text variant="caption">{formatDate(activity.fecha_inicio_real)}</Text>
                                </div>
                                <div className="flex justify-between">
                                    <Text variant="caption" color="text-secondary">Fin Est.</Text>
                                    <Text variant="caption">{formatDate(activity.fecha_fin_estimada)}</Text>
                                </div>
                                <div className="flex justify-between">
                                    <Text variant="caption" color="text-secondary">Fin Real</Text>
                                    <Text variant="caption">{formatDate(activity.fecha_fin_real)}</Text>
                                </div>
                            </div>
                        </Section>
                    </div>

                    {/* Columna derecha */}
                    <div className="space-y-5">
                        {/* LÍDER / RESPONSABLE */}
                        <Section label="Líder / Responsable">
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <Text variant="caption" color="text-secondary">Líder</Text>
                                    <Text variant="caption" className="text-right">{getUserName(activity.asignado_a_id)}</Text>
                                </div>
                                <div className="flex justify-between">
                                    <Text variant="caption" color="text-secondary">Responsable</Text>
                                    <Text variant="caption" className="text-right">{getUserName(activity.responsable_id)}</Text>
                                </div>
                            </div>
                        </Section>

                        {/* VALIDACIÓN */}
                        <Section label="Validación">
                            <div className="space-y-2">
                                <ValidationStatusBadge status={status} />
                                {isPending && activity.validacion_id && (
                                    <div className="flex gap-2 pt-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onResolveValidation?.(activity.validacion_id!, 'aprobada')}
                                            disabled={isResolving}
                                            icon={CheckCircle2}
                                            className="h-7 px-2 text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800"
                                        >
                                            Aprobar
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onResolveValidation?.(activity.validacion_id!, 'rechazada')}
                                            disabled={isResolving}
                                            icon={XCircle}
                                            className="h-7 px-2 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800"
                                        >
                                            Rechazar
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Section>
                    </div>
                </div>

                {/* SEGUIMIENTO / BITÁCORA — ocupa todo el ancho */}
                {(activity.seguimiento || activity.compromiso || activity.archivo_url) && (
                    <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
                        <Text variant="caption" weight="bold" className="uppercase tracking-wider text-[var(--color-text-secondary)]">
                            Seguimiento / Bitácora
                        </Text>
                        <div className="space-y-2">
                            {activity.seguimiento && (
                                <div>
                                    <Text variant="caption" color="text-secondary" className="mb-1 block">Seguimiento</Text>
                                    <Text variant="caption" className="block">{activity.seguimiento}</Text>
                                </div>
                            )}
                            {activity.compromiso && (
                                <div>
                                    <Text variant="caption" color="text-secondary" className="mb-1 block">Compromiso</Text>
                                    <Text variant="caption" className="block">{activity.compromiso}</Text>
                                </div>
                            )}
                            {activity.archivo_url && (
                                <div>
                                    <Text variant="caption" color="text-secondary" className="mb-1 block">Archivo</Text>
                                    <a
                                        href={activity.archivo_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[var(--color-primary)] hover:underline text-xs break-all"
                                    >
                                        {activity.archivo_url}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
