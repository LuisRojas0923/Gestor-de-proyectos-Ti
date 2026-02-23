import React from 'react';
import { ArrowLeft, Search, Clock, User, ChevronRight, Info, AlertTriangle } from 'lucide-react';
import { StatusBadge, TicketStatus } from './Common';
import { Button, Input, Title, Text, Icon } from '../../../components/atoms';

interface Ticket {
    id: string;
    asunto: string;
    estado: TicketStatus;
    fecha_creacion: string;
    categoria_id: string;
    asignado_a?: string;
}

interface TicketListViewProps {
    tickets: Ticket[];
    onBack: () => void;
    onViewDetail: (ticket: Ticket) => void;
}

const TicketListView: React.FC<TicketListViewProps> = ({ tickets, onBack, onViewDetail }) => {

    const statusPriority: Record<string, number> = {
        'Pendiente': 1,
        'En proceso': 2,
    };

    const sortedTickets = [...tickets].sort((a, b) => {
        // Priority 1: Status
        const pA = statusPriority[a.estado] || 99;
        const pB = statusPriority[b.estado] || 99;
        if (pA !== pB) return pA - pB;

        // Priority 2: Date (newest to oldest)
        return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
    });

    return (
        <div className="space-y-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    icon={ArrowLeft}
                    className="font-bold p-0"
                >
                    Volver
                </Button>
                <div className="w-full sm:w-64">
                    <Input
                        type="text"
                        placeholder="Buscar..."
                        icon={Search}
                        size="sm"
                    />
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Title variant="h3" weight="bold" color="text-primary">Mis Solicitudes</Title>
                    <Text as="span" variant="caption" weight="bold" className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-4 py-1.5 rounded-xl border border-[var(--color-primary)]/20 transition-all">Total: {tickets.length}</Text>
                </div>

                {tickets.length > 0 ? (
                    <div className="space-y-3">
                        {sortedTickets.map(ticket => (
                            <div
                                key={ticket.id}
                                onClick={() => onViewDetail(ticket)}
                                className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm hover:shadow-md hover:border-[var(--color-primary)]/30 transition-all duration-300 overflow-hidden group cursor-pointer"
                            >
                                <div className="p-4 sm:p-5">
                                    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4">
                                        <Text variant="body2" weight="bold" className="font-mono text-[var(--color-text-secondary)] uppercase tracking-tight bg-[var(--color-surface-variant)]/50 px-2.5 py-1 rounded-lg">
                                            {ticket.id}
                                        </Text>

                                        <Title variant="h6" weight="bold" color="text-primary" className="leading-tight group-hover:text-[var(--color-primary)] transition-colors">
                                            {ticket.asunto}
                                        </Title>

                                        <div className="hidden sm:flex items-center gap-1.5">
                                            <Icon name={User} size="sm" className="text-[var(--color-text-secondary)]/70 shrink-0" />
                                            <Text variant="body2" color="text-secondary" weight="medium">
                                                {ticket.asignado_a || 'Sin asignar'}
                                            </Text>
                                        </div>

                                        <div className="hidden sm:flex items-center gap-1.5 whitespace-nowrap">
                                            <Icon name={Clock} size="sm" className="text-[var(--color-text-secondary)]/70" />
                                            <Text variant="body2" color="text-secondary" weight="medium">
                                                {new Date(ticket.fecha_creacion).toLocaleDateString()}
                                            </Text>
                                        </div>

                                        {(() => {
                                            const creationDate = new Date(ticket.fecha_creacion);
                                            const now = new Date();
                                            const diffHours = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60);
                                            const isStalled = diffHours > 48 && ticket.estado !== 'Cerrado';

                                            if (isStalled) {
                                                return (
                                                    <div className="hidden md:flex items-center space-x-1 py-1 px-2 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-lg border border-red-100 dark:border-red-900/30">
                                                        <AlertTriangle size={12} className="animate-pulse" />
                                                        <Text variant="caption" weight="bold" className="uppercase tracking-tighter !text-[9px]">+48h</Text>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}

                                        <StatusBadge status={ticket.estado} />
                                        <div className="hidden sm:block group-hover:translate-x-1 transition-transform">
                                            <ChevronRight size={16} className="text-[var(--color-primary)]/40" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-border)] rounded-[2.5rem] p-16 text-center space-y-4 transition-colors">
                        <div className="bg-[var(--color-surface-variant)] w-20 h-20 rounded-full flex items-center justify-center mx-auto text-[var(--color-text-secondary)]/30"><Icon name={Info} size="xl" className="w-10 h-10" /></div>
                        <Text variant="body1" color="text-secondary" weight="bold">No tienes solicitudes registradas aún.</Text>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketListView;
