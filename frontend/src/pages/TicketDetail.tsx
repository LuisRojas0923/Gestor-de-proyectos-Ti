import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Activity } from 'lucide-react';
import { useTicketDetail, TicketStatus, Ticket } from '../hooks/useTicketDetail';
import { useAppContext } from '../context/AppContext';
import { Button, Title, Text } from '../components/atoms';
import TicketTimeline from './ServicePortal/components/TicketTimeline';
import TicketSidebar from './ServicePortal/components/TicketSidebar';

// V2 Components
import AnalystCommandHeader from './ServicePortal/components/AnalystCommandHeader';
import AnalystSidebarInfo from './ServicePortal/components/AnalystSidebarInfo';
import AnalystSidebarTimeline from './ServicePortal/components/AnalystSidebarTimeline';
import AnalystActionTabs from './ServicePortal/components/AnalystActionTabs';

import { API_CONFIG } from '../config/api';
import { useNotifications } from '../components/notifications/NotificationsContext';
import { formatFriendlyDate } from '../utils/dateUtils';

const TicketDetail: React.FC = () => {
    const { ticketId } = useParams<{ ticketId: string }>();
    const navigate = useNavigate();
    const { state } = useAppContext();
    const { addNotification } = useNotifications();
    const { user } = state;
    const [developments, setDevelopments] = useState([]);

    const {
        ticket,
        isLoading,
        isSaving,
        error,
        history,
        attachments,
        updateTicket,
        downloadAttachment
    } = useTicketDetail(ticketId);

    // Estado local para el formulario de analista (V2)
    const [analystForm, setAnalystForm] = useState<Partial<Ticket>>({});

    useEffect(() => {
        if (ticket) {
            setAnalystForm({
                estado: ticket.estado,
                prioridad: ticket.prioridad,
                diagnostico: ticket.diagnostico,
                resolucion: ticket.resolucion,
                causa_novedad: ticket.causa_novedad,
                notas: ticket.notas,
                asignado_a: ticket.asignado_a
            });
        }
    }, [ticket]);

    const handleAnalystFieldChange = (field: string, value: string) => {
        setAnalystForm((prev: Partial<Ticket>) => ({ ...prev, [field]: value }));
    };

    const isAnalyst = user?.role === 'analyst' || user?.role === 'admin';
    const stages: TicketStatus[] = ['Asignado', 'En Proceso', 'Pendiente Info', 'Escalado', 'Resuelto', 'Cerrado'];

    const handleAnalystSave = () => {
        if (!ticket) return;

        // Lógica de validación de flujo solicitada por el usuario
        if (analystForm.estado === 'Cerrado' && ticket.estado !== 'Resuelto') {
            addNotification('error', 'Un ticket debe pasar por el estado "Resuelto" antes de ser Cerrado.');
            return;
        }

        // Validación adicional: Para pasar a Resuelto debe estar En Proceso o Escalado
        if (analystForm.estado === 'Resuelto') {
            if (!['En Proceso', 'Escalado'].includes(ticket.estado)) {
                addNotification('warning', 'El ticket debe estar "En Proceso" o "Escalado" antes de ser Resuelto.');
                return;
            }
            if (!analystForm.causa_novedad) {
                addNotification('error', 'Debe seleccionar una "Causa de la Novedad" para resolver el ticket.');
                return;
            }
        }

        updateTicket(analystForm);
    };

    useEffect(() => {
        const fetchDevelopments = async () => {
            try {
                const res = await axios.get(`${API_CONFIG.BASE_URL}/desarrollos/`);
                setDevelopments(res.data);
            } catch (err) {
                console.error("Error cargando desarrollos:", err);
            }
        };
        if (isAnalyst) fetchDevelopments();
    }, [isAnalyst]);

    if (isLoading) return <div className="p-10 text-center font-sans">Cargando ticket...</div>;
    if (error || !ticket) return <div className="p-10 text-center text-red-500 font-bold font-sans">{error || "Error"}</div>;

    const handleRejectSolution = () => {
        updateTicket({
            estado: 'En Proceso',
            notas: (ticket.notas || '') + '\n\n[SISTEMA] El usuario ha rechazado la solución propuesta.'
        });
    };

    if (isAnalyst) {
        return (
            <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden">
                <AnalystCommandHeader
                    ticketId={ticket.id}
                    status={ticket.estado}
                    onBack={() => navigate(-1)}
                    onSave={handleAnalystSave}
                    isSaving={isSaving}
                />
                <main className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
                    <AnalystSidebarInfo
                        user={{
                            name: ticket.nombre_creador,
                            id: ticket.creador_id,
                            area: ticket.area_creador,
                            cargo: ticket.cargo_creador,
                            sede: ticket.sede_creador,
                            prioridad: ticket.prioridad
                        }}
                        createdAt={ticket.fecha_creacion}
                        idealDate={ticket.datos_extra?.fecha_ideal || ticket.fecha_entrega_ideal}
                        prioridadJustificacion={ticket.datos_extra?.justificacion_prioridad}
                    />

                    <AnalystActionTabs
                        ticket={ticket}
                        developments={developments}
                        onLinkDevelopment={(devId) => updateTicket({ desarrollo_id: devId })}
                        formData={analystForm}
                        onFieldChange={handleAnalystFieldChange}
                        attachments={attachments}
                        onDownloadAttachment={downloadAttachment}
                    />

                    <AnalystSidebarTimeline history={history} />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Button variant="ghost" onClick={() => navigate(-1)} icon={ArrowLeft} className="font-bold p-0">
                        Volver a mis solicitudes
                    </Button>
                    <div className="flex items-center space-x-3">
                        {ticket.estado === 'Resuelto' && (
                            <Button variant="danger" size="sm" onClick={handleRejectSolution}>Rechazar Solución</Button>
                        )}
                        <Text variant="caption" weight="bold" className={`px-5 py-2 rounded-full border tracking-widest ${getStatusStyle(ticket.estado)}`}>
                            {(ticket.estado || 'NUEVO').toUpperCase()}
                        </Text>
                    </div>
                </div>

                {/* Timeline section */}
                <TicketTimeline status={ticket.estado} stages={stages} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Main info section */}
                        <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 lg:p-10 shadow-sm border border-neutral-100 dark:border-neutral-800">
                            <div className="flex items-center space-x-3 mb-6">
                                <Text variant="caption" weight="bold" color="primary" className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg font-mono tracking-widest leading-none">{ticket.id}</Text>
                                <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest opacity-40">{formatFriendlyDate(ticket.fecha_creacion)}</Text>
                            </div>
                            <Title variant="h2" weight="bold" color="text-primary" className="mb-8 leading-tight">{ticket.asunto}</Title>
                            <div className="p-8 bg-neutral-50 dark:bg-neutral-800/50 rounded-3xl border border-neutral-100 dark:border-neutral-700/50 italic text-neutral-700 dark:text-neutral-300 text-lg leading-relaxed shadow-inner">
                                "{ticket.descripcion}"
                            </div>
                        </div>

                        {/* Analysis / Management section (User View Only - Feedback) */}
                        <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 lg:p-10 shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-8">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                    <Activity size={24} />
                                </div>
                                <Title variant="h5" weight="bold">Respuesta del Equipo de TI</Title>
                            </div>
                            {ticket.diagnostico ? (
                                <div className="space-y-6">
                                    <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                                        <Text variant="caption" weight="bold" color="primary">DIAGNÓSTICO</Text>
                                        <Text variant="body1" className="leading-relaxed mt-2">{ticket.diagnostico}</Text>
                                    </div>

                                    {ticket.resolucion && (
                                        <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                                            <div className="flex justify-between items-start mb-2">
                                                <Text variant="caption" weight="bold" className="text-emerald-600">SOLUCIÓN</Text>
                                                {ticket.causa_novedad && (
                                                    <Text variant="caption" weight="bold" className="bg-emerald-100 dark:bg-emerald-800/40 px-2 py-0.5 rounded-md text-emerald-700">
                                                        Causa: {ticket.causa_novedad}
                                                    </Text>
                                                )}
                                            </div>
                                            <Text variant="body1" className="leading-relaxed mt-2">{ticket.resolucion}</Text>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Text className="p-8 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-dashed border-neutral-200 text-center italic text-neutral-500">
                                    Tu solicitud está siendo atendida. Recibirás una respuesta pronto.
                                </Text>
                            )}
                        </div>
                    </div>

                    {/* Sidebar section */}
                    <div className="lg:col-span-1">
                        <TicketSidebar
                            ticket={ticket}
                            history={history}
                            attachments={attachments}
                            onDownloadAttachment={downloadAttachment}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
        'Asignado': 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20',
        'En Proceso': 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20',
        'Pendiente Info': 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20',
        'Escalado': 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20',
        'Resuelto': 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20',
        'Cerrado': 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800'
    };
    return styles[status] || 'bg-white text-neutral-400 border-neutral-100';
};

export default TicketDetail;
