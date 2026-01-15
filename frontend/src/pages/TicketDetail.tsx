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

const API_BASE_URL = API_CONFIG.BASE_URL;

type TicketStatus = 'NUEVO' | 'ASIGNADO' | 'EN_ANALISIS' | 'ESPERA_CLIENTE' | 'RESUELTO' | 'CERRADO';

interface Ticket {
    id: string;
    category_id: string;
    subject: string;
    description: string;
    status: TicketStatus;
    priority: string;
    creator_id: string;
    creator_name: string;
    creator_email: string;
    creator_area: string;
    creator_cargo: string;
    creator_sede: string;
    assigned_to?: string;
    diagnostic?: string;
    resolution?: string;
    notes?: string;
    time_spent_hours?: number;
    creation_date: string;
    close_date?: string;
    extra_data?: Record<string, unknown>;
    development_id?: string;
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

    const stages: TicketStatus[] = ['NUEVO', 'ASIGNADO', 'EN_ANALISIS', 'ESPERA_CLIENTE', 'RESUELTO', 'CERRADO'];

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
            status: formData.get('status'),
            priority: formData.get('priority'),
            assigned_to: formData.get('assigned_to'),
            diagnostic: formData.get('diagnostic'),
            resolution: formData.get('resolution'),
            notes: formData.get('notes'),
            time_spent_hours: formData.get('time_spent_hours') ? parseFloat(formData.get('time_spent_hours') as string) : undefined
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
            await axios.patch(`${API_BASE_URL}/soporte/${ticketId}`, { development_id: devId });
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
                status: 'EN_ANALISIS',
                notes: (ticket.notes || '') + '\n\n[SISTEMA] El usuario ha rechazado la solución propuesta.'
            });
            const response = await axios.get(`${API_BASE_URL}/soporte/${ticketId}`);
            setTicket(response.data);

            // Add notification
            dispatch({
                type: 'ADD_NOTIFICATION',
                payload: {
                    id: Math.random().toString(36).substr(2, 9),
                    title: 'Solución Rechazada',
                    message: `El ticket ${ticketId} ha vuelto a estado EN ANÁLISIS.`,
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

    const currentStageIndex = stages.indexOf(ticket.status as TicketStatus);

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header Acciones */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 font-bold hover:text-black dark:hover:text-white transition-colors">
                        <ArrowLeft size={20} className="mr-2" /> Volver a la gestión
                    </button>
                    <div className="flex items-center space-x-3">
                        {ticket.status === 'RESUELTO' && (
                            <button
                                onClick={() => handleRejectSolution()}
                                className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-black border border-red-100 dark:bg-red-900/10 dark:border-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
                            >
                                Rechazar Solución
                            </button>
                        )}
                        <span className={`px-5 py-2 rounded-full text-xs font-black border tracking-widest ${getContentStatusStyle(ticket.status)}`}>
                            {ticket.status.toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Horizontal Timeline */}
                <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Ciclo de Vida del Ticket</h3>
                        <span className="text-[10px] font-bold text-blue-500 uppercase">Tiempo transcurrido: 4.2h</span>
                    </div>

                    <div className="relative flex items-center justify-between px-4">
                        <div className="absolute left-10 right-10 h-0.5 bg-neutral-100 dark:bg-neutral-800 top-1/2 -translate-y-1/2 -z-0"></div>
                        <div className="absolute left-10 h-0.5 bg-blue-500 top-1/2 -translate-y-1/2 -z-0 transition-all duration-700" style={{ width: `${(currentStageIndex / (stages.length - 1)) * 80}%` }}></div>

                        {stages.map((stage, idx) => (
                            <div key={stage} className="relative z-10 flex flex-col items-center group">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${idx <= currentStageIndex
                                    ? 'bg-blue-500 border-blue-100 dark:border-blue-900/30'
                                    : 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700'
                                    }`}>
                                    {idx < currentStageIndex ? (
                                        <CheckCircle size={16} className="text-white" />
                                    ) : (
                                        <span className={`text-xs font-black ${idx <= currentStageIndex ? 'text-white' : 'text-neutral-400'}`}>0{idx + 1}</span>
                                    )}
                                </div>
                                <span className={`absolute -bottom-8 whitespace-nowrap text-[10px] font-black tracking-widest ${idx <= currentStageIndex ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'
                                    }`}>
                                    {stage.replace('_', ' ')}
                                </span>
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
                                <span className="text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg font-mono text-xs font-bold tracking-widest leading-none">{ticket.id}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700"></span>
                                <span className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">{new Date(ticket.creation_date).toLocaleString()}</span>
                            </div>
                            <h1 className="text-4xl font-black text-neutral-900 dark:text-white mb-8 leading-tight">{ticket.subject}</h1>

                            <div className="p-8 bg-neutral-50 dark:bg-neutral-800/50 rounded-3xl border border-neutral-100 dark:border-neutral-700/50 italic text-neutral-700 dark:text-neutral-300 text-lg leading-relaxed shadow-inner">
                                "{ticket.description}"
                            </div>

                            {ticket.extra_data && (
                                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(ticket.extra_data).map(([key, value]) => {
                                        if (typeof value === 'string' && value.length > 0 && !['nombre', 'email', 'asunto', 'descripcion_detallada'].includes(key)) {
                                            return (
                                                <div key={key} className="p-5 border border-neutral-100 dark:border-neutral-800 rounded-2xl bg-white dark:bg-neutral-900 shadow-sm transition-all hover:shadow-md">
                                                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">{key.replace(/_/g, ' ')}</p>
                                                    <p className="text-sm text-neutral-800 dark:text-neutral-200 font-bold line-clamp-3 leading-relaxed">{value}</p>
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
                                    <h2 className="text-2xl font-black text-neutral-900 dark:text-white">Gestión del Analista</h2>
                                    <p className="text-sm text-neutral-400 font-medium">Actualiza el progreso de la solicitud</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Estado de la Solicitud</label>
                                    <select name="status" defaultValue={ticket.status} className="w-full px-5 py-4 rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white font-bold focus:bg-white dark:focus:bg-neutral-800 focus:border-blue-500/50 transition-all outline-none appearance-none cursor-pointer">
                                        {stages.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nivel de Prioridad</label>
                                    <select name="priority" defaultValue={ticket.priority} className="w-full px-5 py-4 rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white font-bold focus:bg-white dark:focus:bg-neutral-800 focus:border-blue-500/50 transition-all outline-none appearance-none cursor-pointer">
                                        <option>Baja</option>
                                        <option>Media</option>
                                        <option>Alta</option>
                                        <option>Crítica</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Respuesta / Diagnóstico</label>
                                    <textarea name="diagnostic" defaultValue={ticket.diagnostic || ''} rows={4} className="w-full px-6 py-5 rounded-3xl border-2 border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white font-medium focus:bg-white dark:focus:bg-neutral-800 focus:border-blue-500/50 transition-all outline-none resize-none" placeholder="Ingresa los detalles técnicos o respuesta inicial..."></textarea>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Solución Definitiva</label>
                                    <textarea name="resolution" defaultValue={ticket.resolution || ''} rows={5} className="w-full px-6 py-5 rounded-3xl border-2 border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white font-medium focus:bg-white dark:focus:bg-neutral-800 focus:border-blue-500/50 transition-all outline-none resize-none" placeholder="Describe los pasos finales para la resolución..."></textarea>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-neutral-50 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex flex-col space-y-4 w-full">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2 text-neutral-400">
                                            <Briefcase size={16} />
                                            <span className="text-xs font-bold">Vincular a Desarrollo Existente</span>
                                        </div>
                                        {ticket.development_id ? (
                                            <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-800">
                                                <LinkIcon size={12} className="text-blue-500" />
                                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{ticket.development_id}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsLinking(true)}
                                                    className="text-[10px] font-black text-neutral-400 hover:text-blue-500 ml-2"
                                                >
                                                    CAMBIAR
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setIsLinking(true)}
                                                className="text-[10px] font-black text-blue-500 hover:text-blue-600 transition-colors uppercase tracking-widest flex items-center"
                                            >
                                                <Plus size={14} className="mr-1" /> Seleccionar Desarrollo
                                            </button>
                                        )}
                                    </div>

                                    {isLinking && (
                                        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 animate-in fade-in slide-in-from-top-4 duration-300">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Seleccionar Desarrollo</h4>
                                                <button type="button" onClick={() => setIsLinking(false)} className="text-[10px] font-black text-neutral-400 hover:text-red-500 transition-colors">CANCELAR</button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                {developments.map(dev => (
                                                    <button
                                                        key={dev.id}
                                                        type="button"
                                                        onClick={() => handleLinkDevelopment(dev.id)}
                                                        className={`flex flex-col p-4 rounded-2xl border-2 text-left transition-all ${ticket.development_id === dev.id
                                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                                                            : 'border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-blue-200 dark:hover:border-blue-900/50'
                                                            }`}
                                                    >
                                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{dev.id}</span>
                                                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 line-clamp-1">{dev.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button type="submit" disabled={isSaving} className="w-full sm:w-auto bg-neutral-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white px-12 py-5 rounded-2xl font-black shadow-xl shadow-blue-500/10 flex items-center justify-center disabled:opacity-50 transition-all transform active:scale-95">
                                    <Save className="mr-3" size={24} />
                                    {isSaving ? 'PROCESANDO...' : 'GUARDAR AVANCES'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Columna Lateral: Info Solicitante */}
                    <div className="space-y-8">
                        <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 text-neutral-400">
                                    <User size={20} />
                                    <h3 className="font-black text-xs uppercase tracking-widest">Solicitante</h3>
                                </div>
                                <Mail size={16} className="text-blue-500 cursor-pointer" />
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center space-x-5">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-neutral-800 dark:to-neutral-700 rounded-[1.5rem] flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-2xl shadow-inner">
                                        {ticket.creator_name[0]}
                                    </div>
                                    <div>
                                        <p className="font-black text-xl text-neutral-900 dark:text-white leading-tight">{ticket.creator_name}</p>
                                        <p className="text-xs text-neutral-400 font-bold uppercase tracking-tighter mt-1">ID: {ticket.creator_id}</p>
                                    </div>
                                </div>
                                <div className="space-y-4 pt-6 border-t border-neutral-50 dark:border-neutral-800">
                                    <InfoItem icon={<Briefcase size={16} />} label="Área" value={ticket.creator_area} />
                                    <InfoItem icon={<HistoryIcon size={16} />} label="Cargo" value={ticket.creator_cargo} />
                                    <InfoItem icon={<MapPin size={16} />} label="Sede" value={ticket.creator_sede} />
                                    <div className="pt-2">
                                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Contacto</p>
                                        <p className="text-sm font-bold text-blue-500 truncate">{ticket.creator_email}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Card */}
                        <div className="bg-neutral-900 dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl text-white space-y-8 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <div className="flex items-center space-x-3 relative z-10">
                                <HistoryIcon size={20} className="text-blue-400" />
                                <h3 className="font-black text-xs uppercase tracking-widest">Actividad</h3>
                            </div>
                            <div className="space-y-8 relative z-10">
                                <ActivityNode date="Ahora mismo" label="Analista está editando" status="info" />
                                <ActivityNode date="Hace 2 horas" label="Cambio de estado a EN ANALISIS" status="success" />
                                <ActivityNode date={new Date(ticket.creation_date).toLocaleTimeString()} label="Apertura del ticket" status="success" />
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
        <span className="text-neutral-400 group-hover:text-blue-500 flex items-center transition-colors">
            {icon} <span className="ml-3 font-bold text-[10px] uppercase tracking-wider">{label}</span>
        </span>
        <span className="font-black text-neutral-700 dark:text-neutral-300">{value}</span>
    </div>
);

const ActivityNode: React.FC<{ date: string, label: string, status: string }> = ({ date, label, status }) => (
    <div className="flex items-start space-x-4 border-l-2 border-neutral-800 pl-6 relative">
        <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${status === 'success' ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]' : 'bg-neutral-600'}`}></div>
        <div className="space-y-1">
            <p className="text-xs font-black text-neutral-100">{label}</p>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-tighter">{date}</p>
        </div>
    </div>
);


const getContentStatusStyle = (status: string) => {
    switch (status) {
        case 'NUEVO': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/10 dark:text-blue-400 dark:border-blue-900/20';
        case 'ASIGNADO': return 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/10 dark:text-indigo-400 dark:border-indigo-900/20';
        case 'EN_ANALISIS': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/10 dark:text-amber-400 dark:border-amber-900/20';
        case 'ESPERA_CLIENTE': return 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/10 dark:text-purple-400 dark:border-purple-900/20';
        case 'RESUELTO': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-900/20';
        case 'CERRADO': return 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700';
        default: return 'bg-white text-neutral-400 border-neutral-100 dark:bg-neutral-900 dark:border-neutral-800';
    }
};

export default TicketDetail;
