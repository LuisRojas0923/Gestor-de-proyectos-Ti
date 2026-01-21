import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowLeft,
    User,
    Save,
    Activity,
    History as HistoryIcon,
    Briefcase,
    Mail,
    MapPin,
    CheckCircle,
    Plus,
    Link as LinkIcon
} from 'lucide-react';
import { API_CONFIG } from '../config/api';
import { useAppContext } from '../context/AppContext';
import { DevelopmentWithCurrentStatus } from '../types/development';
import { Button, Select, Textarea, Title, Text } from '../components/atoms';

const API_BASE_URL = API_CONFIG.BASE_URL;

type TicketStatus = 'Nuevo' | 'Abierto' | 'En Proceso' | 'Pendiente Info' | 'Escalado' | 'Resuelto' | 'Cerrado';

interface Ticket {
    id: string;
    categoria_id: string;
    asunto: string;
    descripcion: string;
    estado: string;
    prioridad: string;
    creador_id: string;
    nombre_creador: string;
    correo_creador: string;
    area_creador: string;
    cargo_creador: string;
    sede_creador: string;
    asignado_a?: string;
    diagnosis?: string;
    resolucion?: string;
    notas?: string;
    tiempo_horas?: number;
    fecha_creacion: string;
    fecha_cierre?: string;
    datos_extra?: Record<string, unknown>;
    desarrollo_id?: string;
}

const TicketDetail: React.FC = () => {
    const { ticketId } = useParams<{ ticketId: string }>();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [developments, setDevelopments] = useState<DevelopmentWithCurrentStatus[]>([]);
    const [isLinking, setIsLinking] = useState(false);
    const { dispatch } = useAppContext();

    const stages: TicketStatus[] = ['Nuevo', 'Abierto', 'En Proceso', 'Pendiente Info', 'Escalado', 'Resuelto', 'Cerrado'];

    useEffect(() => {
        const fetchTicket = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/soporte/${ticketId}`);
                setTicket(response.data);
            } catch (err) {
                console.error("Error cargando ticket:", err);
                setError("Ticket no encontrado");
            } finally {
                setIsLoading(false);
            }
        };
        fetchTicket();

        const fetchDevelopments = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/desarrollos/`);
                setDevelopments(response.data);
            } catch (err) {
                console.error("Error cargando desarrollos:", err);
            }
        };
        fetchDevelopments();
    }, [ticketId]);

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!ticket) return;

        setIsSaving(true);
        const formData = new FormData(e.currentTarget);

        const updateData = {
            estado: formData.get('estado'),
            prioridad: formData.get('prioridad'),
            asignado_a: formData.get('asignado_a'),
            diagnosis: formData.get('diagnosis'),
            resolucion: formData.get('resolucion'),
            notas: formData.get('notas'),
            tiempo_horas: formData.get('tiempo_horas') ? parseFloat(formData.get('tiempo_horas') as string) : undefined
        };

        try {
            await axios.patch(`${API_BASE_URL}/soporte/${ticketId}`, updateData);
            const response = await axios.get(`${API_BASE_URL}/soporte/${ticketId}`);
            setTicket(response.data);
        } catch (err) {
            console.error("Error actualizando ticket:", err);
            setError("No se pudo guardar los cambios");
        } finally {
            setIsSaving(false);
        }
    };

    const handleLinkDevelopment = async (devId: string) => {
        if (!ticket) return;
        setIsSaving(true);
        try {
            await axios.patch(`${API_BASE_URL}/soporte/${ticketId}`, { desarrollo_id: devId });
            const response = await axios.get(`${API_BASE_URL}/soporte/${ticketId}`);
            setTicket(response.data);
            setIsLinking(false);

            // Add notification
            dispatch({
                type: 'ADD_NOTIFICATION',
                payload: {
                    id: Math.random().toString(36).substr(2, 9),
                    title: 'Vínculo Exitoso',
                    message: `Ticket ${ticketId} vinculado al desarrollo ${devId}`,
                    type: 'success',
                    timestamp: new Date().toISOString(),
                    read: false
                }
            });
        } catch (err) {
            console.error("Error vinculando desarrollo:", err);
            setError("No se pudo vincular el desarrollo");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRejectSolution = async () => {
        if (!ticket) return;
        setIsSaving(true);
        try {
            await axios.patch(`${API_BASE_URL}/soporte/${ticketId}`, {
                estado: 'En Proceso',
                notas: (ticket.notas || '') + '\n\n[SISTEMA] El usuario ha rechazado la solución propuesta.'
            });
            const response = await axios.get(`${API_BASE_URL}/soporte/${ticketId}`);
            setTicket(response.data);

            // Add notification
            dispatch({
                type: 'ADD_NOTIFICATION',
                payload: {
                    id: Math.random().toString(36).substr(2, 9),
                    title: 'Solución Rechazada',
                    message: `El ticket ${ticketId} ha vuelto a estado EN PROCESO.`,
                    type: 'warning',
                    timestamp: new Date().toISOString(),
                    read: false
                }
            });
        } catch (err) {
            console.error("Error rechazando solución:", err);
            setError("No se pudo rechazar la solución");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center font-sans">Cargando ticket...</div>;
    if (error || !ticket) return <div className="p-10 text-center text-red-500 font-bold font-sans">{error || "Error"}</div>;

    const currentStageIndex = stages.indexOf(ticket.estado as any);

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header Acciones */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        icon={ArrowLeft}
                        className="font-bold p-0"
                    >
                        Volver a la gestión
                    </Button>
                    <div className="flex items-center space-x-3">
                        {ticket.estado === 'Resuelto' && (
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleRejectSolution()}
                            >
                                Rechazar Solución
                            </Button>
                        )}
                        <Text variant="caption" weight="bold" className={`px-5 py-2 rounded-full border tracking-widest ${getContentStatusStyle(ticket.estado)}`}>
                            {(ticket.estado || 'NUEVO').toUpperCase()}
                        </Text>
                    </div>
                </div>

                {/* Horizontal Timeline */}
                <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between mb-8">
                        <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-[0.2em] opacity-40">Ciclo de Vida del Ticket</Text>
                        <Text variant="caption" weight="bold" color="primary" className="uppercase">Tiempo transcurrido: 4.2h</Text>
                    </div>

                    <div className="relative flex items-center justify-between px-4">
                        <div className="absolute left-10 right-10 h-0.5 bg-neutral-100 dark:bg-neutral-800 top-1/2 -translate-y-1/2 -z-0"></div>
                        {(() => {
                            const progressWidth = `${(currentStageIndex >= 0 ? (currentStageIndex / (stages.length - 1)) * 80 : 0)}%`;
                            const progressBarStyle = { width: progressWidth };
                            return (
                                <div className="absolute left-10 h-0.5 bg-blue-500 top-1/2 -translate-y-1/2 -z-0 transition-all duration-700" style={progressBarStyle}></div>
                            );
                        })()}

                        {stages.map((stage, idx) => (
                            <div key={stage} className="relative z-10 flex flex-col items-center group">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${idx <= currentStageIndex
                                    ? 'bg-blue-500 border-blue-100 dark:border-blue-900/30'
                                    : 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700'
                                    }`}>
                                    {idx < currentStageIndex ? (
                                        <CheckCircle size={16} className="text-white" />
                                    ) : (
                                        <Text variant="caption" weight="bold" color="white" className={`${idx <= currentStageIndex ? '' : 'text-neutral-400'}`}>0{idx + 1}</Text>
                                    )}
                                </div>
                                <Text variant="caption" weight="bold" className={`absolute -bottom-8 whitespace-nowrap tracking-widest ${idx <= currentStageIndex ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'
                                    }`}>
                                    {stage.replace('_', ' ')}
                                </Text>
                            </div>
                        ))}
                    </div>
                    <div className="h-10"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Columna Principal: Gestión */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Info Ticket */}
                        <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 lg:p-10 shadow-sm border border-neutral-100 dark:border-neutral-800">
                            <div className="flex items-center space-x-3 mb-6">
                                <Text variant="caption" weight="bold" color="primary" className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg font-mono tracking-widest leading-none">{ticket.id}</Text>
                                <Text as="span" className="w-1.5 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700">{''}</Text>
                                <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest opacity-40">{new Date(ticket.fecha_creacion).toLocaleString()}</Text>
                            </div>
                            <Title variant="h2" weight="bold" color="text-primary" className="mb-8 leading-tight">{ticket.asunto}</Title>

                            <div className="p-8 bg-neutral-50 dark:bg-neutral-800/50 rounded-3xl border border-neutral-100 dark:border-neutral-700/50 italic text-neutral-700 dark:text-neutral-300 text-lg leading-relaxed shadow-inner">
                                "{ticket.descripcion}"
                            </div>

                            {ticket.datos_extra && (
                                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(ticket.datos_extra).map(([key, value]) => {
                                        if (typeof value === 'string' && value.length > 0 && !['nombre', 'email', 'asunto', 'descripcion_detallada'].includes(key)) {
                                            return (
                                                <div key={key} className="p-5 border border-neutral-100 dark:border-neutral-800 rounded-2xl bg-white dark:bg-neutral-900 shadow-sm transition-all hover:shadow-md">
                                                    <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest opacity-40 mb-2">{key.replace(/_/g, ' ')}</Text>
                                                    <Text variant="body2" weight="bold" color="text-primary" className="line-clamp-3 leading-relaxed">{value}</Text>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Formulario de Gestión */}
                        <form onSubmit={handleUpdate} className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 lg:p-10 shadow-xl border border-neutral-100 dark:border-neutral-800 space-y-10">
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
                                    name="diagnosis"
                                    defaultValue={ticket.diagnosis || ''}
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
                                                        onClick={() => handleLinkDevelopment(dev.id)}
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
                    </div>

                    {/* Columna Lateral: Info Solicitante */}
                    <div className="space-y-8">
                        <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <User size={20} className="text-[var(--color-text-secondary)]" />
                                    <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest opacity-40">Solicitante</Text>
                                </div>
                                <Mail size={16} className="text-blue-500 cursor-pointer" />
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center space-x-5">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-neutral-800 dark:to-neutral-700 rounded-[1.5rem] flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-2xl shadow-inner">
                                        {ticket.nombre_creador ? ticket.nombre_creador[0] : 'U'}
                                    </div>
                                    <div>
                                        <Title variant="h5" weight="bold" color="text-primary" className="leading-tight">{ticket.nombre_creador}</Title>
                                        <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-tighter mt-1">ID: {ticket.creador_id}</Text>
                                    </div>
                                </div>
                                <div className="space-y-4 pt-6 border-t border-neutral-50 dark:border-neutral-800">
                                    <InfoItem icon={<Briefcase size={16} />} label="Área" value={ticket.area_creador} />
                                    <InfoItem icon={<HistoryIcon size={16} />} label="Cargo" value={ticket.cargo_creador} />
                                    <InfoItem icon={<MapPin size={16} />} label="Sede" value={ticket.sede_creador} />
                                    <div className="pt-2">
                                        <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest opacity-40 mb-1">Contacto</Text>
                                        <Text variant="body2" weight="bold" color="primary" className="truncate">{ticket.correo_creador}</Text>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Card */}
                        <div className="bg-neutral-900 dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl text-white space-y-8 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <div className="flex items-center space-x-3 relative z-10">
                                <HistoryIcon size={20} className="text-blue-400" />
                                <Text variant="caption" weight="bold" className="text-blue-300 uppercase tracking-widest">Actividad</Text>
                            </div>
                            <div className="space-y-8 relative z-10">
                                <ActivityNode date="Ahora mismo" label="Analista está editando" status="info" />
                                <ActivityNode date="Hace 2 horas" label="Cambio de estado a EN ANALISIS" status="success" />
                                <ActivityNode date={new Date(ticket.fecha_creacion).toLocaleTimeString()} label="Apertura del ticket" status="success" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoItem: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
    <div className="flex items-center justify-between text-sm group">
        <Text variant="caption" weight="bold" color="text-secondary" className="group-hover:text-[var(--color-primary)] flex items-center transition-colors">
            {icon} <Text as="span" className="ml-3 uppercase tracking-wider">{label}</Text>
        </Text>
        <Text variant="body2" weight="bold" color="text-primary">{value}</Text>
    </div>
);

const ActivityNode: React.FC<{ date: string, label: string, status: string }> = ({ date, label, status }) => (
    <div className="flex items-start space-x-4 border-l-2 border-neutral-800 pl-6 relative">
        <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${status === 'success' ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]' : 'bg-neutral-600'}`}></div>
        <div className="space-y-1">
            <Text variant="body2" weight="bold" className="text-neutral-100">{label}</Text>
            <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-tighter">{date}</Text>
        </div>
    </div>
);


const getContentStatusStyle = (status: string) => {
    switch (status) {
        case 'Nuevo':
        case 'Abierto': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/10 dark:text-blue-400 dark:border-blue-900/20';
        case 'En Proceso': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/10 dark:text-amber-400 dark:border-amber-900/20';
        case 'Pendiente Info': return 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/10 dark:text-purple-400 dark:border-purple-900/20';
        case 'Escalado': return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/20';
        case 'Resuelto': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-900/20';
        case 'Cerrado': return 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
        default: return 'bg-white text-neutral-400 border-neutral-100 dark:bg-neutral-900 dark:border-neutral-800';
    }
};

export default TicketDetail;
