import React, { useState } from 'react';
import { Activity, Save, Briefcase, Plus, Link as LinkIcon } from 'lucide-react';
import { Button, Select, Textarea, Title, Text } from '../../../components/atoms';
import { Ticket } from '../../../hooks/useTicketDetail';

interface TicketManagementFormProps {
    ticket: Ticket;
    isSaving: boolean;
    onUpdate: (e: React.FormEvent<HTMLFormElement>) => void;
    developments: any[];
    onLinkDevelopment: (devId: string) => void;
}

const TicketManagementForm: React.FC<TicketManagementFormProps> = ({ ticket, isSaving, onUpdate, developments, onLinkDevelopment }) => {
    const [isLinking, setIsLinking] = useState(false);

    return (
        <form onSubmit={onUpdate} className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 lg:p-10 shadow-xl border border-neutral-100 dark:border-neutral-800 space-y-10">
            <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Activity size={24} />
                </div>
                <div>
                    <Title variant="h5" weight="bold" color="text-primary">Gestión del Analista</Title>
                    <Text variant="body2" color="text-secondary" weight="medium">Actualiza el progreso de la solicitud</Text>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Select
                    label="Estado de la Solicitud"
                    name="estado"
                    defaultValue={ticket.estado}
                    options={[
                        { value: "Nuevo", label: "Nuevo" },
                        { value: "Abierto", label: "Abierto" },
                        { value: "En Proceso", label: "En Proceso" },
                        { value: "Pendiente Info", label: "Pendiente Info" },
                        { value: "Escalado", label: "Escalado" },
                        { value: "Resuelto", label: "Resuelto" },
                        { value: "Cerrado", label: "Cerrado" },
                    ]}
                />
                <Select
                    label="Nivel de Prioridad"
                    name="prioridad"
                    defaultValue={ticket.prioridad}
                    options={[
                        { value: 'Baja', label: 'Baja' },
                        { value: 'Media', label: 'Media' },
                        { value: 'Alta', label: 'Alta' },
                        { value: 'Crítica', label: 'Crítica' },
                    ]}
                />
            </div>

            <div className="space-y-8">
                <Textarea
                    label="Respuesta / Diagnóstico"
                    name="diagnostico"
                    defaultValue={ticket.diagnostico || ''}
                    rows={4}
                    placeholder="Ingresa los detalles técnicos o respuesta inicial..."
                />
                <Textarea
                    label="Solución Definitiva"
                    name="resolucion"
                    defaultValue={ticket.resolucion || ''}
                    rows={5}
                    placeholder="Describe los pasos finales para la resolución..."
                />
            </div>

            <div className="pt-8 border-t border-neutral-50 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col space-y-4 w-full">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Briefcase size={16} className="text-[var(--color-text-secondary)]" />
                            <Text variant="caption" weight="bold" color="text-secondary">Vincular a Desarrollo Existente</Text>
                        </div>
                        {ticket.desarrollo_id ? (
                            <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-800">
                                <LinkIcon size={12} className="text-blue-500" />
                                <Text variant="caption" weight="bold" color="primary" className="uppercase tracking-widest">{ticket.desarrollo_id}</Text>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsLinking(true)}
                                    className="text-[10px] font-black text-neutral-400 hover:text-blue-500 ml-2"
                                >
                                    CAMBIAR
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsLinking(true)}
                                icon={Plus}
                                className="text-[10px] font-black text-blue-500 hover:text-blue-600 transition-colors uppercase tracking-widest"
                            >
                                Seleccionar Desarrollo
                            </Button>
                        )}
                    </div>

                    {isLinking && (
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-[0.2em] opacity-40">Seleccionar Desarrollo</Text>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsLinking(false)}
                                    className="text-[10px] font-black text-neutral-400 hover:text-red-500 transition-colors"
                                >
                                    CANCELAR
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {developments.map(dev => (
                                    <Button
                                        key={dev.id}
                                        type="button"
                                        onClick={() => {
                                            onLinkDevelopment(dev.id);
                                            setIsLinking(false);
                                        }}
                                        variant="ghost"
                                        className={`flex flex-col p-4 h-auto items-start rounded-2xl border-2 text-left transition-all ${ticket.desarrollo_id === dev.id
                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                                            : 'border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-blue-200 dark:hover:border-blue-900/50'
                                            }`}
                                    >
                                        <Text variant="caption" weight="bold" color="primary" className="uppercase tracking-widest mb-1">{dev.id}</Text>
                                        <Text variant="caption" weight="bold" color="text-primary" className="line-clamp-1">{dev.name}</Text>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <Button
                    type="submit"
                    disabled={isSaving}
                    variant="primary"
                    size="lg"
                    icon={Save}
                    className="w-full sm:w-auto"
                >
                    {isSaving ? 'PROCESANDO...' : 'GUARDAR AVANCES'}
                </Button>
            </div>
        </form>
    );
};

export default TicketManagementForm;
