import React, { useState } from 'react';
import { Briefcase, Plus } from 'lucide-react';
import { Title, Text, Button, Select, Textarea } from '../../../components/atoms';
import { Ticket } from '../../../hooks/useTicketDetail';

interface AnalystActionTabsProps {
    ticket: Ticket;
    developments: any[];
    onLinkDevelopment: (devId: string) => void;
    // Props para el formulario
    formData: any;
    onFieldChange: (field: string, value: string) => void;
}

const AnalystActionTabs: React.FC<AnalystActionTabsProps> = ({
    ticket,
    developments,
    onLinkDevelopment,
    formData,
    onFieldChange
}) => {
    const [activeTab, setActiveTab] = useState<'diagnostico' | 'archivos' | 'vinculos'>('diagnostico');
    const [isLinking, setIsLinking] = useState(false);

    return (
        <section className="col-span-12 lg:col-span-7 flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 p-4 overflow-hidden transition-colors">
            {/* Detalle Ticket Principal */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 mb-4 shrink-0 shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                    <Title variant="h5" weight="bold" color="text-primary">{ticket.asunto}</Title>
                    <Text
                        variant="caption"
                        weight="bold"
                        className={`px-2 py-1 rounded tracking-widest ${ticket.prioridad === 'Alta' || ticket.prioridad === 'Crítica'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-blue-100 text-blue-600'
                            }`}
                    >
                        {(ticket.prioridad || 'MEDIA').toUpperCase()}
                    </Text>
                </div>
                <div className="border-l-2 border-blue-500 pl-4 py-1">
                    <Text variant="body2" color="text-secondary" className="italic leading-relaxed">
                        "{ticket.descripcion}"
                    </Text>
                </div>
            </div>

            {/* Tabs de Acción */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex gap-1 mb-0 z-10">
                    <TabButton
                        active={activeTab === 'diagnostico'}
                        onClick={() => setActiveTab('diagnostico')}
                        label="Diagnóstico"
                    />
                    <TabButton
                        active={activeTab === 'archivos'}
                        onClick={() => setActiveTab('archivos')}
                        label={`Archivos (${0})`}
                    />
                    <TabButton
                        active={activeTab === 'vinculos'}
                        onClick={() => setActiveTab('vinculos')}
                        label="Vínculos"
                    />
                </div>

                <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-b-2xl rounded-tr-2xl p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar shadow-sm transition-all">
                    {activeTab === 'diagnostico' && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Select
                                        label="Cambiar Estado"
                                        value={formData.estado || ticket.estado}
                                        onChange={(e) => onFieldChange('estado', e.target.value)}
                                        options={[
                                            { value: 'Nuevo', label: 'Nuevo' },
                                            { value: 'Abierto', label: 'Abierto' },
                                            { value: 'En Proceso', label: 'En Proceso' },
                                            { value: 'Pendiente Info', label: 'Pendiente Info' },
                                            { value: 'Escalado', label: 'Escalado' },
                                            { value: 'Resuelto', label: 'Resuelto' },
                                            { value: 'Cerrado', label: 'Cerrado' },
                                        ]}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Select
                                        label="Asignar a"
                                        value={formData.asignado_a || ticket.asignado_a || ''}
                                        onChange={(e) => onFieldChange('asignado_a', e.target.value)}
                                        options={[
                                            { value: '', label: 'Sin Asignar' },
                                            { value: ticket.asignado_a || 'L. Rojas (Yo)', label: ticket.asignado_a || 'L. Rojas (Yo)' },
                                            { value: 'Soporte Nivel 2', label: 'Soporte Nivel 2' },
                                            { value: 'Desarrollo TI', label: 'Desarrollo TI' },
                                        ]}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col space-y-1.5">
                                <Textarea
                                    label="Notas Técnicas Internas"
                                    placeholder="Escribe el diagnóstico técnico para el equipo..."
                                    value={formData.diagnostico || ''}
                                    onChange={(e) => onFieldChange('diagnostico', e.target.value)}
                                    rows={4}
                                    className="flex-1"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Textarea
                                    label="Respuesta al Solicitante"
                                    rows={2}
                                    placeholder="Este mensaje será enviado al usuario tras resolver..."
                                    value={formData.resolucion || ''}
                                    onChange={(e) => onFieldChange('resolucion', e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {activeTab === 'vinculos' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Text variant="body2" weight="bold" color="text-primary">Vínculo a Desarrollo</Text>
                                    <Text variant="caption" color="text-secondary" className="opacity-60">Asocia este ticket a un proyecto o módulo de desarrollo pasivo.</Text>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon={isLinking ? undefined : Plus}
                                    onClick={() => setIsLinking(!isLinking)}
                                    className="text-[10px] font-black uppercase tracking-widest"
                                >
                                    {isLinking ? 'Cerrar' : ticket.desarrollo_id ? 'Cambiar Vínculo' : 'Vincular Proyecto'}
                                </Button>
                            </div>

                            {ticket.desarrollo_id && !isLinking && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl flex items-center gap-4">
                                    <div className="p-3 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20">
                                        <Briefcase size={20} />
                                    </div>
                                    <div>
                                        <Text variant="caption" weight="bold" className="uppercase text-blue-500 tracking-widest">{ticket.desarrollo_id}</Text>
                                        <Text variant="body2" weight="bold" color="text-primary">Proyecto TI Vinculado</Text>
                                    </div>
                                </div>
                            )}

                            {isLinking && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar animate-in fade-in slide-in-from-top-2">
                                    {developments.length > 0 ? developments.map(dev => (
                                        <Button
                                            key={dev.id}
                                            variant="custom"
                                            onClick={() => {
                                                onLinkDevelopment(dev.id);
                                                setIsLinking(false);
                                            }}
                                            className={`flex flex-col p-4 text-left rounded-2xl border-2 transition-all h-auto items-start ${ticket.desarrollo_id === dev.id
                                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-md'
                                                : 'border-slate-100 dark:border-slate-800 hover:border-blue-200 bg-white dark:bg-slate-900 shadow-sm'
                                                }`}
                                        >
                                            <Text variant="caption" weight="bold" className="uppercase text-blue-500 mb-1">{dev.id}</Text>
                                            <Text variant="caption" weight="bold" color="text-primary" className="line-clamp-1 text-left">{dev.nombre || dev.name}</Text>
                                        </Button>
                                    )) : (
                                        <div className="col-span-2 p-10 text-center opacity-40 italic">No hay desarrollos disponibles.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'archivos' && (
                        <div className="p-20 text-center bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
                            <Text variant="caption" className="text-slate-400 italic">No hay documentos cargados en esta vista.</Text>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
    <Button
        variant="custom"
        onClick={onClick}
        className={`px-4 py-2 uppercase tracking-wider transition-all rounded-t-lg border-t-2 ${active
            ? 'bg-[var(--color-surface)] dark:bg-slate-800 border-blue-500 dark:text-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)]'
            : 'text-slate-400 hover:text-slate-600 border-transparent bg-transparent'
            }`}
    >
        <Text variant="caption" weight="bold" color="inherit">{label}</Text>
    </Button>
);

export default AnalystActionTabs;
