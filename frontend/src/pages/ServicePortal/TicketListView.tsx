import React, { useState } from 'react';
import { ArrowLeft, Search, Clock, User, ChevronRight, Info, Sparkles, AlertTriangle } from 'lucide-react';
import { StatusBadge, TicketStatus } from './Common';
import { Button, Input, Title, Text, Icon } from '../../components/atoms';
import { callGeminiAPI } from '../../services/GeminiService';

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
    const [explanation, setExplanation] = useState<{ id: string, text: string } | null>(null);
    const [isExplaining, setIsExplaining] = useState(false);

    const handleExplainStatus = async (ticket: Ticket) => {
        if (explanation?.id === ticket.id) return setExplanation(null);

        setIsExplaining(true);
        setExplanation({ id: ticket.id, text: "Analizando estado..." });

        const q = `Categoría: ${ticket.categoria_id}\nAsunto: ${ticket.asunto}\nEstado: ${ticket.estado}`;
        const p = `Actúa como Asistente de TI. Explica qué significa el estado '${ticket.estado}' para este ticket de forma amable y concisa (máx 3 frases).`;

        try {
            const res = await callGeminiAPI(q, p);
            setExplanation({ id: ticket.id, text: res });
        } catch {
            setExplanation({ id: ticket.id, text: "Error al obtener explicación." });
        } finally {
            setIsExplaining(false);
        }
    };

    return (
        <div className="space-y-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    icon={ArrowLeft}
                    className="font-bold p-0"
                >
                    Ir al inicio
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
                    <div className="grid gap-4">
                        {tickets.map(ticket => (
                            <div key={ticket.id} className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all overflow-hidden group">
                                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1 flex-grow">
                                        <div className="flex items-center space-x-3">
                                            <Text variant="caption" className="font-mono text-[var(--color-text-secondary)]/50 uppercase tracking-tighter">{ticket.id}</Text>
                                            <StatusBadge status={ticket.estado} />
                                        </div>
                                        <Title variant="h6" weight="bold" color="text-primary" className="transition-colors group-hover:text-[var(--color-primary)]">{ticket.asunto}</Title>
                                        <div className="flex items-center text-xs text-[var(--color-text-secondary)] space-x-4 font-medium">
                                            <Text variant="caption" as="span" className="flex items-center"><Icon name={Clock} size="sm" className="mr-1" /> {new Date(ticket.fecha_creacion).toLocaleDateString()}</Text>
                                            <Text variant="caption" as="span" className="flex items-center"><Icon name={User} size="sm" className="mr-1" /> {ticket.asignado_a || 'Sin asignar'}</Text>
                                            {(() => {
                                                const creationDate = new Date(ticket.fecha_creacion);
                                                const now = new Date();
                                                const diffHours = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60);
                                                const isStalled = diffHours > 48 && !['Cerrado', 'Resuelto'].includes(ticket.estado);

                                                if (isStalled) {
                                                    return (
                                                        <div className="flex items-center px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg animate-pulse border border-red-200 dark:border-red-800">
                                                            <AlertTriangle size={12} className="mr-1.5" />
                                                            <Text variant="caption" weight="bold" className="uppercase tracking-tighter">SLA Vencido (+48h)</Text>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            onClick={() => handleExplainStatus(ticket)}
                                            disabled={isExplaining}
                                            variant="secondary"
                                            size="sm"
                                            icon={Sparkles}
                                            loading={isExplaining && explanation?.id === ticket.id}
                                        >
                                            {isExplaining && explanation?.id === ticket.id ? 'Analizando...' : 'Explicar ✨'}
                                        </Button>
                                        <Button
                                            onClick={() => onViewDetail(ticket)}
                                            variant="outline"
                                            size="sm"
                                            className="p-2.5"
                                        >
                                            <ChevronRight size={20} />
                                        </Button>
                                    </div>
                                </div>
                                {explanation?.id === ticket.id && (
                                    <div className="bg-[var(--color-primary-light)]/10 p-5 border-t border-[var(--color-primary)]/10 animate-in slide-in-from-top-2 duration-300">
                                        <Text variant="body2" color="text-primary" weight="medium" className="leading-relaxed flex items-start">
                                            <Icon name={Info} size="sm" className="mr-2 mt-0.5 shrink-0 text-[var(--color-primary)]" />
                                            {explanation.text}
                                        </Text>
                                    </div>
                                )}
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
