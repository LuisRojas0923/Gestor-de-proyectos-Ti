import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, FileText, ClipboardList, ShieldCheck, Settings, UserCheck, Plus } from 'lucide-react';
import { StatusBadge, TicketStatus, TextAreaField } from './Common';
import { Button, Title, Text, Icon } from '../../components/atoms';
import { API_CONFIG } from '../../config/api';
import { formatFriendlyDate } from '../../utils/dateUtils';

const API_BASE_URL = API_CONFIG.BASE_URL;

interface Ticket {
    id: string;
    asunto: string;
    estado: TicketStatus;
    fecha_creacion: string;
    categoria_id: string;
    areas_impactadas?: string[];
    asignado_a?: string;
    nombre_creador?: string;
    descripcion?: string;
    diagnostico?: string;
    resolucion?: string;
    horas_tiempo_empleado?: string;
    notas?: string;
    solicitud_activo?: {
        item_solicitado: string;
        especificaciones?: string;
        cantidad: number;
    };
    solicitud_desarrollo?: {
        que_necesita: string;
        porque: string;
        paraque: string;
    };
    control_cambios?: {
        accion_requerida: string;
        impacto_operativo: string;
        justificacion: string;
        descripcion_cambio: string;
    };
    datos_extra?: Record<string, any>;
    fecha_entrega_ideal?: string;
}

interface TicketDetailViewProps {
    selectedTicket: Ticket;
    user: any;
    onBack: () => void;
    onUpdate: (e: React.FormEvent<HTMLFormElement>) => void;
}

const TicketDetailView: React.FC<TicketDetailViewProps> = ({ selectedTicket, onBack, onUpdate }) => {
    const [lastAnalyst, setLastAnalyst] = useState<string | null>(null);
    const [lastAction, setLastAction] = useState<string | null>(null);

    const formatKey = (key: string) => {
        return key.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const excludedKeys = [
        'nombre', 'area', 'sede', 'email', 'asunto', 'descripcion_detallada',
        'nivel_prioridad', 'fecha_ideal', 'justificacion_prioridad',
        'archivos_adjuntos', 'hardware_solicitado', 'especificaciones'
    ];

    useEffect(() => {
        const fetchLastModifier = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/soporte/${selectedTicket.id}/historial`);
                const history = res.data;

                // Buscar la acción más reciente que tenga un nombre_usuario y no sea el creador original
                const lastHistoryItem = history.find((h: any) => h.nombre_usuario && h.nombre_usuario !== selectedTicket.nombre_creador);

                if (lastHistoryItem) {
                    setLastAnalyst(lastHistoryItem.nombre_usuario);
                    setLastAction(lastHistoryItem.accion);
                } else {
                    // Si no hay historial con usuario, ver si el asignado es diferente al creador
                    if (selectedTicket.asignado_a && selectedTicket.asignado_a !== selectedTicket.nombre_creador) {
                        setLastAnalyst(selectedTicket.asignado_a);
                        setLastAction("Asignación");
                    }
                }
            } catch (err) {
                console.error("Error cargando historial para vista de usuario:", err);
            }
        };

        fetchLastModifier();
    }, [selectedTicket.id, selectedTicket.nombre_creador, selectedTicket.asignado_a]);

    return (
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
                        <div className="flex flex-col gap-2">
                            <Text variant="caption" weight="medium" color="inherit" className="bg-white/10 px-3 py-1 rounded-lg font-mono uppercase tracking-widest inline-block w-fit">{selectedTicket.id}</Text>
                        </div>
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
                                    <div><Text variant="caption" color="text-secondary" weight="bold" className="uppercase mb-1">Fecha Creación</Text><Text variant="body2" weight="bold" color="text-primary">{formatFriendlyDate(selectedTicket.fecha_creacion)}</Text></div>
                                    <div><Text variant="caption" color="text-secondary" weight="bold" className="uppercase mb-1">Asignado a</Text><Text variant="body2" weight="bold" color="text-primary">{selectedTicket.asignado_a || 'Sin asignar'}</Text></div>
                                    {selectedTicket.fecha_entrega_ideal && (
                                        <div><Text variant="caption" color="text-secondary" weight="bold" className="uppercase mb-1">Fecha Ideal de Atención</Text><Text variant="body2" weight="bold" className="text-[var(--color-primary)]">{formatFriendlyDate(selectedTicket.fecha_entrega_ideal)}</Text></div>
                                    )}
                                    {selectedTicket.areas_impactadas && selectedTicket.areas_impactadas.length > 0 && (
                                        <div>
                                            <Text variant="caption" color="text-secondary" weight="bold" className="uppercase mb-1 block">Áreas Impactadas</Text>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {selectedTicket.areas_impactadas.map((area, i) => (
                                                    <Text key={i} as="span" weight="bold" className="px-2 py-0.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] !text-[10px] rounded-md border border-[var(--color-primary)]/20 uppercase">{area}</Text>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {selectedTicket.datos_extra?.justificacion_prioridad && (
                                        <div className="pt-2 border-t border-[var(--color-border)]/50">
                                            <Text variant="caption" color="text-secondary" weight="bold" className="uppercase mb-1">Justificación de Prioridad</Text>
                                            <Text variant="body2" className="italic text-neutral-500">{selectedTicket.datos_extra.justificacion_prioridad}</Text>
                                        </div>
                                    )}
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

                            {selectedTicket.solicitud_activo && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-700">
                                    <div className="flex items-center space-x-3 text-blue-500/60">
                                        <Icon name={Plus} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Detalle del Pedido</Title>
                                        <div className="flex-grow border-t border-blue-100 dark:border-blue-900/30"></div>
                                    </div>
                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-800 shadow-sm transition-all hover:shadow-md">
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <Text variant="caption" weight="bold" className="text-blue-600 dark:text-blue-400 uppercase mb-1 block">Item Solicitado</Text>
                                                <Text variant="body1" weight="bold" className="text-blue-950 dark:text-blue-100">{selectedTicket.solicitud_activo.item_solicitado}</Text>
                                            </div>
                                            {selectedTicket.solicitud_activo.especificaciones && (
                                                <div className="pt-2 border-t border-blue-100/50 dark:border-blue-800/50">
                                                    <Text variant="caption" weight="bold" className="text-blue-400 dark:text-blue-500 uppercase mb-1 block">Especificaciones Técnicas</Text>
                                                    <Text variant="body2" className="text-blue-800/80 dark:text-blue-200/70 whitespace-pre-line">{selectedTicket.solicitud_activo.especificaciones}</Text>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedTicket.solicitud_desarrollo && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-700">
                                    <div className="flex items-center space-x-3 text-emerald-500/60">
                                        <Icon name={ClipboardList} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Detalles del Desarrollo</Title>
                                        <div className="flex-grow border-t border-emerald-100 dark:border-emerald-900/30"></div>
                                    </div>
                                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
                                        <div className="space-y-4">
                                            <div>
                                                <Text variant="caption" weight="bold" className="text-emerald-600 dark:text-emerald-400 uppercase mb-1 block">Contexto Adicional</Text>
                                                <Text variant="body2" className="text-emerald-800/80 dark:text-emerald-200/70 whitespace-pre-line leading-relaxed">
                                                    {selectedTicket.solicitud_desarrollo.que_necesita}
                                                </Text>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedTicket.control_cambios && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-700">
                                    <div className="flex items-center space-x-3 text-amber-500/60">
                                        <Icon name={ShieldCheck} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Control de Cambios</Title>
                                        <div className="flex-grow border-t border-amber-100 dark:border-amber-900/30"></div>
                                    </div>
                                    <div className="bg-amber-50/50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-800 shadow-sm">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <Text variant="caption" weight="bold" className="text-amber-600 dark:text-amber-400 uppercase mb-1 block">Acción</Text>
                                                <Text variant="body2" weight="bold">{selectedTicket.control_cambios.accion_requerida}</Text>
                                            </div>
                                            <div>
                                                <Text variant="caption" weight="bold" className="text-amber-600 dark:text-amber-400 uppercase mb-1 block">Impacto</Text>
                                                <Text variant="body2" weight="bold">{selectedTicket.control_cambios.impacto_operativo}</Text>
                                            </div>
                                        </div>
                                        <div className="space-y-4 pt-4 border-t border-amber-100/50 dark:border-amber-800/50">
                                            <div>
                                                <Text variant="caption" weight="bold" className="text-amber-600 dark:text-amber-400 uppercase mb-1 block">Justificación</Text>
                                                <Text variant="body2" className="text-amber-800/80 dark:text-amber-200/70">{selectedTicket.control_cambios.justificacion}</Text>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECCIÓN DE DATOS DINÁMICOS (datos_extra) */}
                            {selectedTicket.datos_extra && Object.entries(selectedTicket.datos_extra).some(([k]) => !excludedKeys.includes(k)) && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-700">
                                    <div className="flex items-center space-x-3 text-[var(--color-primary)]/60">
                                        <Icon name={Settings} size="sm" /><Title variant="h6" className="font-bold uppercase tracking-wider text-[var(--color-primary)]">Información Específica del Formulario</Title>
                                        <div className="flex-grow border-t border-[var(--color-primary)]/20"></div>
                                    </div>
                                    <div className="bg-[var(--color-primary)]/[0.03] dark:bg-[var(--color-primary)]/5 p-6 rounded-3xl border border-[var(--color-primary)]/10 shadow-sm">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                            {Object.entries(selectedTicket.datos_extra).map(([key, value]) => {
                                                const dynamicExcluded = [...excludedKeys];
                                                if (!selectedTicket.solicitud_activo) {
                                                    ['especificaciones', 'hardware_solicitado'].forEach(k => {
                                                        const idx = dynamicExcluded.indexOf(k);
                                                        if (idx > -1) dynamicExcluded.splice(idx, 1);
                                                    });
                                                }

                                                if (dynamicExcluded.includes(key) || !value) return null;

                                                let displayLabel = formatKey(key);
                                                if (key === 'especificaciones' && selectedTicket.categoria_id === 'compra_licencias') {
                                                    displayLabel = 'Producto / Licencia';
                                                }

                                                return (
                                                    <div key={key} className="space-y-1">
                                                        <Text variant="caption" weight="bold" className="text-[var(--color-primary)]/70 uppercase block tracking-wide">{displayLabel}</Text>
                                                        <Text variant="body2" color="text-primary" className="font-medium">
                                                            {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                                                        </Text>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                                        <Icon name={ShieldCheck} size="sm" />
                                        <Title variant="h6" className="font-bold uppercase tracking-wider">Respuesta del Equipo TI</Title>
                                    </div>
                                    <div className="flex-grow border-t border-[var(--color-border)] mx-4 hidden sm:block"></div>

                                    {lastAnalyst && (
                                        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 animate-in zoom-in duration-500 shadow-sm">
                                            <div className="bg-blue-600 dark:bg-blue-500 p-1.5 rounded-lg text-white">
                                                <Icon name={UserCheck} size="xs" />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <Text variant="caption" weight="bold" className="text-blue-700 dark:text-blue-300 uppercase tracking-wide !text-[10px]">
                                                    {lastAction || 'Última Actividad'}: {selectedTicket.estado}
                                                </Text>
                                                <Text variant="caption" className="text-blue-600/90 dark:text-blue-200/80 font-semibold !text-[11px]">
                                                    Analista: <Text as="span" weight="bold" className="text-blue-900 dark:text-white uppercase !text-[11px]">{lastAnalyst}</Text>
                                                </Text>
                                            </div>
                                        </div>
                                    )}
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
};

export default TicketDetailView;
