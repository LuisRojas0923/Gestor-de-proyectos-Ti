import React from 'react';
import { Title, Text, Badge } from '../../components/atoms';

interface TicketTooltipProps {
    ticket: {
        asunto: string;
        prioridad: string;
        descripcion?: string;
        nombre_creador: string;
        area_creador?: string;
        fecha_creacion: string;
        estado: string;
        asignado_a?: string;
    };
    position: { x: number; y: number };
    visible: boolean;
}

const getPriorityVariant = (prioridad: string): 'error' | 'warning' | 'info' => {
    const p = (prioridad || '').toLowerCase();
    if (p === 'alta') return 'error';
    if (p === 'media') return 'warning';
    return 'info';
};

const TicketTooltip: React.FC<TicketTooltipProps> = ({ ticket, position, visible }) => {
    if (!visible) return null;

    const maxWidth = 400;
    const tooltipX = Math.min(position.x, window.innerWidth - maxWidth - 20);
    const tooltipY = position.y + 12;

    return (
        <div
            ref={(el) => {
                if (el) {
                    el.style.left = `${tooltipX}px`;
                    el.style.top = `${tooltipY}px`;
                    el.style.maxWidth = `${maxWidth}px`;
                }
            }}
            className="fixed z-50 pointer-events-none opacity-100 scale-100 transition-all duration-150 ease-out"
        >
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-2xl">
                {/* Header: Asunto + Prioridad */}
                <div className="flex items-start justify-between mb-3 gap-3">
                    <Title variant="h5" weight="bold" className="line-clamp-2">
                        {ticket.asunto}
                    </Title>
                    <Badge variant={getPriorityVariant(ticket.prioridad)}>
                        {ticket.prioridad}
                    </Badge>
                </div>

                {/* Info rápida */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                    <Text variant="caption" color="text-secondary">
                        <strong>Solicitante:</strong> {ticket.nombre_creador}
                    </Text>
                    {ticket.area_creador && (
                        <Text variant="caption" color="text-secondary">
                            <strong>Área:</strong> {ticket.area_creador}
                        </Text>
                    )}
                    {ticket.asignado_a && (
                        <Text variant="caption" color="text-secondary">
                            <strong>Analista:</strong> {ticket.asignado_a}
                        </Text>
                    )}
                </div>

                {/* Descripción */}
                {ticket.descripcion && (
                    <div className="border-l-2 border-blue-500 pl-4 py-1">
                        <Text variant="body2" color="text-secondary" className="italic leading-relaxed whitespace-pre-line line-clamp-[12]">
                            {ticket.descripcion}
                        </Text>
                    </div>
                )}

                {!ticket.descripcion && (
                    <Text variant="caption" color="text-secondary" className="italic opacity-50">
                        Sin descripción disponible
                    </Text>
                )}
            </div>
        </div>
    );
};

export default TicketTooltip;
