import { ArrowLeft, FileText, ClipboardList, Settings, ShieldCheck } from 'lucide-react';
import { StatusBadge, TicketStatus, FormField, TextAreaField } from './Common';
import { Button, Select, Title, Text, Icon } from '../../components/atoms';

interface Ticket {
    id: string;
    subject: string;
    status: TicketStatus;
    creation_date: string;
    category: string;
    assigned_to?: string;
    creator_name?: string;
    description?: string;
    diagnostic?: string;
    resolution?: string;
    time_spent?: string;
    notes?: string;
}

interface TicketDetailViewProps {
    selectedTicket: Ticket;
    user: any;
    onBack: () => void;
    onUpdate: (e: React.FormEvent<HTMLFormElement>) => void;
}

const TicketDetailView: React.FC<TicketDetailViewProps> = ({ selectedTicket, onBack, onUpdate }) => (
    <div className="space-y-8 py-4">
        <Button
            variant="ghost"
            onClick={onBack}
            icon={ArrowLeft}
            className="font-bold p-0"
        >
            Volver a la lista
        </Button>

        <div className="bg-[var(--color-surface)] rounded-[2.5rem] shadow-xl border border-[var(--color-border)] overflow-hidden transition-all duration-300">
            <div className="bg-[var(--deep-navy)] p-8 text-white">
                <div className="flex justify-between items-start mb-4">
                    <Text variant="caption" weight="medium" className="bg-white/10 px-3 py-1 rounded-lg font-mono uppercase tracking-widest">{selectedTicket.id}</Text>
                    <StatusBadge status={selectedTicket.status} />
                </div>
                <Title variant="h3" weight="bold">{selectedTicket.subject}</Title>
                <Text variant="body1" className="text-[var(--powder-blue)] mt-2" weight="medium">Categoría: {selectedTicket.category}</Text>
            </div>

            <form onSubmit={onUpdate} className="p-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                                <Icon name={ClipboardList} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Información Base</Title>
                                <div className="flex-grow border-t border-[var(--color-border)]"></div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 bg-[var(--color-surface-variant)]/30 p-6 rounded-3xl border border-[var(--color-border)]">
                                <div><Text variant="caption" color="text-secondary" weight="bold" className="uppercase mb-1">Solicitante</Text><Text variant="body2" weight="bold" color="text-primary">{selectedTicket.creator_name || 'Usuario Prueba'}</Text></div>
                                <div><Text variant="caption" color="text-secondary" weight="bold" className="uppercase mb-1">Fecha Creación</Text><Text variant="body2" weight="bold" color="text-primary">{new Date(selectedTicket.creation_date).toLocaleString()}</Text></div>
                                <div><Text variant="caption" color="text-secondary" weight="bold" className="uppercase mb-1">Asignado a</Text><Text variant="body2" weight="bold" color="text-primary">{selectedTicket.assigned_to || 'Sin asignar'}</Text></div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                                <Icon name={FileText} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Problema Reportado</Title>
                                <div className="flex-grow border-t border-[var(--color-border)]"></div>
                            </div>
                            <div className="bg-[var(--color-surface-variant)]/30 p-6 rounded-3xl border border-[var(--color-border)]">
                                <Text variant="body2" color="text-primary" className="leading-relaxed" weight="medium">{selectedTicket.description || 'Sin descripción detallada.'}</Text>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                                <Icon name={Settings} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Gestión Técnica</Title>
                                <div className="flex-grow border-t border-[var(--color-border)]"></div>
                            </div>
                            <div className="space-y-6">
                                <TextAreaField label="Diagnóstico Técnico" name="diagnostico" placeholder="Análisis del problema..." rows={3} />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField label="Horas Estimadas" name="horas_est" type="number" placeholder="0" />
                                    <Select
                                        label="Cambiar Estado"
                                        name="nuevo_estado"
                                        defaultValue={selectedTicket.status}
                                        options={[
                                            { value: 'Abierto', label: 'Abierto' },
                                            { value: 'En Proceso', label: 'En Proceso' },
                                            { value: 'Pendiente Info', label: 'Pendiente Info' },
                                            { value: 'Cerrado', label: 'Cerrado' },
                                        ]}
                                    />
                                </div>
                                <TextAreaField label="Resolución Final" name="resolucion" placeholder="Acciones tomadas..." rows={3} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-[var(--color-border)] flex justify-end space-x-4">
                    <Button type="button" variant="ghost" onClick={onBack}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        icon={ShieldCheck}
                    >
                        Actualizar Ticket
                    </Button>
                </div>
            </form>
        </div>
    </div>
);

export default TicketDetailView;
