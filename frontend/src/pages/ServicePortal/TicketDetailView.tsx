import { ArrowLeft, FileText, ClipboardList, ShieldCheck, Settings } from 'lucide-react';
import { StatusBadge, TicketStatus, TextAreaField } from './Common';
import { Button, Title, Text, Icon } from '../../components/atoms';

interface Ticket {
    id: string;
    asunto: string;
    estado: TicketStatus;
    fecha_creacion: string;
    categoria_id: string;
    asignado_a?: string;
    nombre_creador?: string;
    descripcion?: string;
    diagnostico?: string;
    resolucion?: string;
    horas_tiempo_empleado?: string;
    notas?: string;
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
                    <Text variant="caption" weight="medium" color="inherit" className="bg-white/10 px-3 py-1 rounded-lg font-mono uppercase tracking-widest">{selectedTicket.id}</Text>
                    <StatusBadge status={selectedTicket.estado} />
                </div>
                <Title variant="h3" weight="bold" color="white">{selectedTicket.asunto}</Title>
                <Text variant="body1" color="inherit" className="text-[var(--powder-blue)] mt-2" weight="medium">Categoría: {selectedTicket.categoria_id}</Text>
            </div>

            <div className="p-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                                <Icon name={ClipboardList} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Información Base</Title>
                                <div className="flex-grow border-t border-[var(--color-border)]"></div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 bg-[var(--color-surface-variant)]/30 p-6 rounded-3xl border border-[var(--color-border)]">
                                <div><Text variant="caption" color="text-secondary" weight="bold" className="uppercase mb-1">Solicitante</Text><Text variant="body2" weight="bold" color="text-primary">{selectedTicket.nombre_creador || 'Usuario Prueba'}</Text></div>
                                <div><Text variant="caption" color="text-secondary" weight="bold" className="uppercase mb-1">Fecha Creación</Text><Text variant="body2" weight="bold" color="text-primary">{new Date(selectedTicket.fecha_creacion).toLocaleString()}</Text></div>
                                <div><Text variant="caption" color="text-secondary" weight="bold" className="uppercase mb-1">Asignado a</Text><Text variant="body2" weight="bold" color="text-primary">{selectedTicket.asignado_a || 'Sin asignar'}</Text></div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                                <Icon name={FileText} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Problema Reportado</Title>
                                <div className="flex-grow border-t border-[var(--color-border)]"></div>
                            </div>
                            <div className="bg-[var(--color-surface-variant)]/30 p-6 rounded-3xl border border-[var(--color-border)]">
                                <Text variant="body2" color="text-primary" className="leading-relaxed" weight="medium">{selectedTicket.descripcion || 'Sin descripción detallada.'}</Text>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                                <Icon name={ShieldCheck} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider">Respuesta del Equipo TI</Title>
                                <div className="flex-grow border-t border-[var(--color-border)]"></div>
                            </div>

                            <div className="space-y-6">
                                {selectedTicket.diagnostico ? (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-800">
                                        <Text variant="caption" color="primary" weight="bold" className="uppercase mb-2 block">Diagnóstico Técnico</Text>
                                        <Text variant="body2" color="text-primary" className="leading-relaxed">{selectedTicket.diagnostico}</Text>
                                    </div>
                                ) : (
                                    <div className="bg-neutral-50 dark:bg-neutral-800/30 p-8 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-700 text-center">
                                        <Text variant="body2" color="text-secondary" className="italic">El equipo técnico está revisando tu solicitud.</Text>
                                    </div>
                                )}

                                {selectedTicket.resolucion && (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800">
                                        <Text variant="caption" className="text-emerald-600 uppercase mb-2 block" weight="bold">Resolución Final</Text>
                                        <Text variant="body2" color="text-primary" className="leading-relaxed">{selectedTicket.resolucion}</Text>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sección de retroalimentación - Solo si está pendiente de información */}
                        {selectedTicket.estado === 'Pendiente Info' && (
                            <form onSubmit={onUpdate} className="space-y-6 p-6 bg-[var(--color-surface-variant)]/30 rounded-3xl border-2 border-[var(--color-primary)]/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center space-x-3 text-[var(--color-primary)]">
                                    <Icon name={Settings} size="sm" />
                                    <Title variant="h6" className="font-bold uppercase tracking-wider">Enviar Información Solicitada</Title>
                                </div>
                                <TextAreaField
                                    label="Tu Comentario / Respuesta"
                                    name="user_response"
                                    placeholder="Escribe aquí la información que el analista solicitó..."
                                    rows={4}
                                    isRequired
                                />
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full"
                                    icon={ShieldCheck}
                                >
                                    Enviar al Analista
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default TicketDetailView;
