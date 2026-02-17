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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tickets.map(ticket => (
                            <div
                                key={ticket.id}
                                onClick={() => onViewDetail(ticket)}
                                className="bg-[var(--color-surface)] rounded-[2rem] border border-[var(--color-border)] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col h-full"
                            >
                                <div className="p-6 flex flex-col h-full space-y-4">
                                    <div className="flex justify-between items-start">
                                        <Text variant="caption" className="font-mono text-[var(--color-text-secondary)]/50 uppercase tracking-tighter bg-[var(--color-surface-variant)]/50 px-2 py-0.5 rounded-lg">{ticket.id}</Text>
                                        <StatusBadge status={ticket.estado} />
                                    </div>

                                    <div className="flex-grow">
                                        <Title variant="h6" weight="bold" color="text-primary" className="leading-tight group-hover:text-[var(--color-primary)] transition-colors line-clamp-2 min-h-[3rem]">
                                            {ticket.asunto}
                                        </Title>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-[var(--color-border)]/50">
                                        <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
                                            <div className="flex items-center text-[10px] font-bold uppercase tracking-wider opacity-60">
                                                <Icon name={Clock} size="xs" className="mr-1.5" />
                                                {new Date(ticket.fecha_creacion).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center text-[10px] font-bold uppercase tracking-wider opacity-60">
                                                <Icon name={User} size="xs" className="mr-1.5" />
                                                {ticket.asignado_a || 'Sin asignar'}
                                            </div>
                                        </div>

                                        {(() => {
                                            const creationDate = new Date(ticket.fecha_creacion);
                                            const now = new Date();
                                            const diffHours = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60);
                                            const isStalled = diffHours > 48 && ticket.estado !== 'Cerrado';

                                            if (isStalled) {
                                                return (
                                                    <div className="flex items-center justify-center space-x-2 py-2 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-xl border border-red-100 dark:border-red-900/30">
                                                        <AlertTriangle size={14} className="animate-pulse" />
                                                        <Text variant="caption" weight="bold" className="uppercase tracking-tighter !text-[10px]">SLA Vencido (+48h)</Text>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}

                                        <div className="flex items-center justify-end group-hover:translate-x-1 transition-transform">
                                            <Text variant="caption" weight="bold" className="text-[var(--color-primary)] uppercase tracking-widest text-[10px] flex items-center">
                                                Ver detalle <ChevronRight size={14} className="ml-1" />
                                            </Text>
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
