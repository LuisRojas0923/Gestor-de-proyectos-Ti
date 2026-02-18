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
                    <div className="flex flex-col gap-3">
                        {tickets.map(ticket => (
                            <div
                                key={ticket.id}
                                onClick={() => onViewDetail(ticket)}
                                className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group cursor-pointer p-4"
                            >
                                <div className="flex flex-col sm:grid sm:grid-cols-[100px_minmax(200px,2.5fr)_1.5fr_120px_130px] sm:items-center gap-4">
                                    {/* 1. ID */}
                                    <div className="flex-shrink-0">
                                        <Text variant="caption" className="font-mono text-[var(--color-text-secondary)]/50 uppercase tracking-tighter bg-[var(--color-surface-variant)]/50 px-2 py-0.5 rounded-lg whitespace-nowrap inline-block">
                                            {ticket.id}
                                        </Text>
                                    </div>

                                    {/* 2. Asunto */}
                                    <div className="flex-grow min-w-0">
                                        <Title variant="h6" weight="bold" color="text-primary" className="leading-tight group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
                                            {ticket.asunto}
                                        </Title>
                                    </div>

                                    {/* 3. Encargado */}
                                    <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                                        <Icon name={User} size="xs" className="opacity-40" />
                                        <Text variant="caption" weight="medium" className="truncate">{ticket.asignado_a || 'Sin asignar'}</Text>
                                    </div>

                                    {/* 4. Fecha */}
                                    <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                                        <Icon name={Clock} size="xs" className="opacity-40" />
                                        <Text variant="caption" weight="medium">{new Date(ticket.fecha_creacion).toLocaleDateString()}</Text>
                                    </div>

                                    {/* 5. Estado y SLA */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3">
                                        {(() => {
                                            const creationDate = new Date(ticket.fecha_creacion);
                                            const now = new Date();
                                            const diffHours = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60);
                                            const isStalled = diffHours > 48 && ticket.estado !== 'Cerrado';

                                            if (isStalled) {
                                                return (
                                                    <div className="flex items-center" title="SLA Vencido (+48h)">
                                                        <AlertTriangle size={12} className="text-red-500 animate-pulse" />
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
