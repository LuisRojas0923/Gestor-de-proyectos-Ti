import React from 'react';
import { Text } from '../../components/atoms';

import { Ticket } from './hooks/useTicketManagement';

interface TicketTooltipProps {
    ticket: Ticket;
    position: { x: number; y: number };
    visible: boolean;
}

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
                {/* Info de Hardware/Licencias (Trazabilidad) */}
                {['compra_licencias', 'perifericos'].includes(ticket.categoria_id) && (
                    <div className="mb-4 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/50 flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                            <Text variant="caption" weight="bold" className="uppercase text-[9px] tracking-widest text-blue-600 dark:text-blue-400">Item Solicitado</Text>
                            <Text variant="caption" weight="bold" className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded-full text-blue-700 dark:text-blue-300 text-[10px]">Cant: {ticket.solicitud_activo?.cantidad || ticket.datos_extra?.cantidad || 1}</Text>
                        </div>
                        <Text variant="body2" weight="bold" className="text-blue-950 dark:text-blue-100">
                            {ticket.solicitud_activo?.item_solicitado || ticket.datos_extra?.hardware_solicitado || 'No especificado'}
                        </Text>
                    </div>
                )}

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
