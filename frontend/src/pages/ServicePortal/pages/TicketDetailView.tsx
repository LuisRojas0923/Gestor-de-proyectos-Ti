import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, FileText, ClipboardList, ShieldCheck, UserCheck, MessageCircle, History } from 'lucide-react';
import { StatusBadge, TicketStatus } from './Common';
import { Button, Title, Text, Icon } from '../../../components/atoms';
import { API_CONFIG } from '../../../config/api';
import { formatFriendlyDate } from '../../../utils/dateUtils';
import { useTicketDetail } from '../../../hooks/useTicketDetail';
import TicketChatSection from '../components/TicketChatSection';
import TicketAdditionalInfo from '../components/TicketAdditionalInfo';
import AddDetailForm from '../components/AddDetailForm';

const API_BASE_URL = API_CONFIG.BASE_URL;

interface Ticket {
    id: string;
    asunto: string;
    estado: TicketStatus;
    sub_estado?: string;
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

const TicketDetailView: React.FC<TicketDetailViewProps> = ({ selectedTicket, user, onBack }) => {
    const [lastAnalyst, setLastAnalyst] = useState<string | null>(null);

    const {
        comments,
        addComment,
        addAdditionalDetail,
        uploadAttachment,
        isSaving
    } = useTicketDetail(selectedTicket.id);


    useEffect(() => {
        const fetchLastModifier = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/soporte/${selectedTicket.id}/historial`);
                const history = res.data as any[];

                const lastHistoryItem = history.find((h: any) => h.nombre_usuario && h.nombre_usuario !== selectedTicket.nombre_creador);

                if (lastHistoryItem) {
                    setLastAnalyst(lastHistoryItem.nombre_usuario);
                } else {
                    if (selectedTicket.asignado_a && selectedTicket.asignado_a !== selectedTicket.nombre_creador) {
                        setLastAnalyst(selectedTicket.asignado_a);
                    }
                }
            } catch (err) {
                console.error("Error cargando historial para vista de usuario:", err);
            }
        };

        fetchLastModifier();
    }, [selectedTicket.id, selectedTicket.nombre_creador, selectedTicket.asignado_a]);

    return (
        <div className="space-y-6 py-4 animate-in fade-in duration-500">
            <Button
                variant="ghost"
                onClick={onBack}
                icon={ArrowLeft}
                className="font-bold p-0 hover:bg-transparent"
            >
                Volver a la lista
            </Button>

            <div className="bg-[var(--color-surface)] rounded-[2.5rem] shadow-2xl border border-[var(--color-border)] overflow-hidden transition-all duration-300">
                {/* Header Premium Compacto */}
                <div className="bg-gradient-to-r from-[var(--deep-navy)] to-[#1a2a4a] p-5 px-8 text-white">
                    <div className="flex flex-wrap items-center gap-6">
                        {/* ID y Estado Destacados */}
                        <div className="flex items-center gap-3 bg-white/10 p-1.5 px-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg">
                            <Text variant="body1" weight="bold" color="inherit" className="font-mono tracking-tighter text-blue-300">
                                #{selectedTicket.id}
                            </Text>
                            <div className="w-px h-4 bg-white/20"></div>
                            <StatusBadge status={selectedTicket.estado} />
                        </div>

                        {/* Título y Meta en una línea */}
                        <Title variant="h5" weight="bold" color="white" className="m-0 flex-1 truncate">{selectedTicket.asunto}</Title>
                        
                        <div className="flex items-center gap-3 text-white/40 border-l border-white/10 pl-6 hidden md:flex">
                            <Text variant="caption" color="inherit" weight="medium" className="uppercase tracking-widest text-[10px]">{selectedTicket.categoria_id}</Text>
                            <div className="w-1 h-1 rounded-full bg-white/20"></div>
                            <Text variant="caption" color="inherit" className="text-[10px] whitespace-nowrap">
                                {formatFriendlyDate(selectedTicket.fecha_creacion)}
                            </Text>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    {/* Grid Principal de 12 Columnas */}
                    <div className="grid grid-cols-12 gap-8 lg:gap-12">
                        
                        {/* COLUMNA IZQUIERDA (5/12): Expediente Técnico */}
                        <div className="col-span-12 lg:col-span-5 space-y-10">
                            
                            {/* Información Base */}
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                                    <Icon name={ClipboardList} size="sm" />
                                    <Title variant="h6" className="font-bold uppercase tracking-wider">Detalles Técnicos</Title>
                                    <div className="flex-grow border-t border-[var(--color-border)]"></div>
                                </div>
                                <div className="grid grid-cols-1 gap-4 bg-[var(--color-surface-variant)]/30 p-6 rounded-[2rem] border border-[var(--color-border)]">
                                    <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]/50">
                                        <Text variant="caption" color="text-secondary" weight="bold" className="uppercase">Solicitante</Text>
                                        <Text variant="body2" weight="bold" color="text-primary">{selectedTicket.nombre_creador || 'Usuario'}</Text>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]/50">
                                        <Text variant="caption" color="text-secondary" weight="bold" className="uppercase">Asignado a</Text>
                                        <Text variant="body2" weight="bold" color="text-primary">{selectedTicket.asignado_a || 'Sin asignar'}</Text>
                                    </div>
                                    {selectedTicket.fecha_entrega_ideal && (
                                        <div className="flex justify-between items-center py-2 border-b border-[var(--color-border)]/50">
                                            <Text variant="caption" color="text-secondary" weight="bold" className="uppercase">Atención Ideal</Text>
                                            <Text variant="body2" weight="bold" className="text-[var(--color-primary)]">{formatFriendlyDate(selectedTicket.fecha_entrega_ideal)}</Text>
                                        </div>
                                    )}
                                    {selectedTicket.areas_impactadas && selectedTicket.areas_impactadas.length > 0 && (
                                        <div className="py-2">
                                            <Text variant="caption" color="text-secondary" weight="bold" className="uppercase mb-2 block">Áreas Impactadas</Text>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedTicket.areas_impactadas.map((area, i) => (
                                                    <Text key={`${area.id || area.cedula || 'area'}-${i}`} as="span" weight="bold" className="px-2 py-0.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] !text-[10px] rounded-md border border-[var(--color-primary)]/20 uppercase">{area}</Text>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Problema Reportado Original */}
                            <div className="space-y-4">
                                <div className="flex items-center space-x-3 text-[var(--color-text-secondary)]/40">
                                    <Icon name={FileText} size="sm" />
                                    <Title variant="h6" className="font-bold uppercase tracking-wider">Descripción del Problema</Title>
                                    <div className="flex-grow border-t border-[var(--color-border)]"></div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                    <Text variant="body2" color="text-primary" className="leading-relaxed whitespace-pre-line" weight="medium">
                                        {selectedTicket.descripcion || 'Sin descripción.'}
                                    </Text>
                                </div>
                            </div>

                            {/* NUEVO: Historial de Ampliaciones */}
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 text-blue-500/60">
                                    <Icon name={History} size="sm" />
                                    <Title variant="h6" className="font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Información Adicional</Title>
                                    <div className="flex-grow border-t border-blue-100 dark:border-blue-900/30"></div>
                                </div>
                                
                                <TicketAdditionalInfo 
                                    ampliaciones={selectedTicket.datos_extra?.historial_ampliaciones || []} 
                                />

                                {/* Separador de acción */}
                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                        <div className="w-full border-t border-dashed border-blue-200 dark:border-blue-800/50"></div>
                                    </div>
                                    <div className="relative flex justify-center">
                                        <Text variant="caption" weight="bold" className="bg-[var(--color-surface)] px-4 !text-[9px] uppercase tracking-[0.2em] text-blue-400/60">Nueva Ampliación</Text>
                                    </div>
                                </div>

                                <AddDetailForm 
                                    onAddDetail={addAdditionalDetail}
                                    onUploadFile={uploadAttachment}
                                    isSaving={isSaving}
                                />
                            </div>

                            {/* Otros detalles específicos (Activos, Desarrollo, etc) */}
                            {/* Renderizar solo si existen para no saturar la vista */}
                            {(selectedTicket.solicitud_activo || selectedTicket.solicitud_desarrollo || selectedTicket.control_cambios) && (
                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-8">
                                    {selectedTicket.solicitud_activo && (
                                        <div className="bg-blue-50/30 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-800">
                                            <Text variant="caption" weight="bold" className="text-blue-600 uppercase mb-3 block">Detalle del Pedido</Text>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><Text variant="caption" color="text-secondary">Item</Text><Text variant="body2" weight="bold">{selectedTicket.solicitud_activo.item_solicitado}</Text></div>
                                                <div><Text variant="caption" color="text-secondary">Cantidad</Text><Text variant="body2" weight="bold">{selectedTicket.solicitud_activo.cantidad}</Text></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* COLUMNA DERECHA (7/12): Resolución y Comunicación */}
                        <div className="col-span-12 lg:col-span-7">
                            <div className="sticky top-8 space-y-8">
                                
                                {/* Respuesta TI / Diagnóstico */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center space-x-2 text-emerald-500/60">
                                            <Icon name={ShieldCheck} size="sm" />
                                            <Title variant="h6" className="font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Resolución</Title>
                                        </div>
                                        
                                        {lastAnalyst && (
                                            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 shadow-sm animate-in fade-in duration-700">
                                                <div className="bg-blue-600 p-1 rounded-lg text-white"><Icon name={UserCheck} size="xs" /></div>
                                                <Text variant="caption" weight="bold" className="text-blue-700 dark:text-blue-300 !text-[10px]">
                                                    Analista: {lastAnalyst}
                                                </Text>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {selectedTicket.diagnostico ? (
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-[2rem] border border-blue-100 dark:border-blue-800 shadow-sm">
                                                <Text variant="caption" color="primary" weight="bold" className="uppercase mb-2 block">Diagnóstico Técnico</Text>
                                                <Text variant="body2" color="text-primary" className="leading-relaxed">{selectedTicket.diagnostico}</Text>
                                            </div>
                                        ) : (
                                            <div className="bg-neutral-50 dark:bg-neutral-800/20 p-5 rounded-[2rem] border border-dashed border-neutral-200 dark:border-neutral-700 text-center">
                                                <Text variant="caption" color="text-secondary" className="italic">El equipo técnico está procesando tu solicitud.</Text>
                                            </div>
                                        )}

                                        {selectedTicket.resolucion && (
                                            <div className="bg-emerald-500 text-white p-5 rounded-[2rem] shadow-lg shadow-emerald-500/20 animate-in zoom-in duration-500">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Icon name={ShieldCheck} size="sm" />
                                                    <Text variant="caption" weight="bold" className="uppercase text-emerald-50">Resolución Final</Text>
                                                </div>
                                                <Text variant="body2" className="leading-relaxed font-medium">{selectedTicket.resolucion}</Text>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Chat de Soporte */}
                                <div className="space-y-4 flex flex-col h-[700px]">
                                    <div className="flex items-center space-x-2 text-blue-500/60">
                                        <MessageCircle size={18} />
                                        <Title variant="h6" className="font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Chat Interactivo</Title>
                                        <div className="flex-grow border-t border-blue-100 dark:border-blue-900/30 mx-4"></div>
                                    </div>

                                    <div className="flex-1 min-h-0 bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-inner overflow-hidden flex flex-col">
                                        <TicketChatSection 
                                            comments={comments}
                                            onSendComment={async (text) => {
                                                await addComment(text, false);
                                            }}
                                            currentUserId={user?.id}
                                            isAnalyst={false}
                                            isSaving={isSaving}
                                        />
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketDetailView;
