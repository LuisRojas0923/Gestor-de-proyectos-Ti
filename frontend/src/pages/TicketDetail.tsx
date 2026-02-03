import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTicketDetail, Ticket } from '../hooks/useTicketDetail';
import { useAppContext } from '../context/AppContext';

// V2 Components
import AnalystCommandHeader from './ServicePortal/components/AnalystCommandHeader';
import AnalystSidebarInfo from './ServicePortal/components/AnalystSidebarInfo';
import AnalystSidebarTimeline from './ServicePortal/components/AnalystSidebarTimeline';
import AnalystActionTabs from './ServicePortal/components/AnalystActionTabs';

import { API_CONFIG } from '../config/api';
import { useNotifications } from '../components/notifications/NotificationsContext';

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
        attachments,
        updateTicket,
        downloadAttachment,
        history
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

    // Remover renderizado condicional, usar siempre vista analista modificada
    return (
        <div className="h-screen flex flex-col bg-[var(--color-background)] dark:bg-slate-950 transition-colors overflow-hidden">
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

                <div className="col-span-12 md:col-span-9 lg:col-span-7 h-full flex flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800 bg-[var(--color-background)] dark:bg-slate-950/20 transition-colors">
                    <AnalystActionTabs
                        ticket={ticket}
                        developments={developments}
                        onLinkDevelopment={(devId) => updateTicket({ desarrollo_id: devId })}
                        formData={analystForm}
                        onFieldChange={handleAnalystFieldChange}
                        attachments={attachments}
                        onDownloadAttachment={downloadAttachment}
                    />
                </div>

                <AnalystSidebarTimeline history={history} />
            </main>
        </div>
    );
};

export default TicketDetail;
