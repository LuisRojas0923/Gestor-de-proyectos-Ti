import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../config/api';
import { useAppContext } from '../context/AppContext';
import { useNotifications } from '../components/notifications/NotificationsContext';

const API_BASE_URL = API_CONFIG.BASE_URL;

export type TicketStatus = 'Pendiente' | 'Proceso' | 'Cerrado';
export type TicketSubStatus = 'Asignado' | 'Proceso' | 'Pendiente Información' | 'Resuelto' | 'Escalado';

export interface Ticket {
    id: string;
    categoria_id: string;
    asunto: string;
    descripcion: string;
    estado: string;
    sub_estado?: string;
    prioridad: string;
    creador_id: string;
    nombre_creador: string;
    correo_creador: string;
    correo_verificado_creador?: boolean;
    area_creador: string;
    cargo_creador: string;
    sede_creador: string;
    asignado_a?: string;
    diagnostico?: string;
    resolucion?: string;
    causa_novedad?: string;
    notas?: string;
    horas_tiempo_empleado?: number;
    fecha_creacion: string;
    fecha_cierre?: string;
    fecha_entrega_ideal?: string;
    datos_extra?: Record<string, any>;
    desarrollo_id?: string;
    solicitud_activo?: {
        id: number;
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
}

export interface TicketHistory {
    id: number;
    accion: string;
    detalle: string;
    nombre_usuario?: string;
    creado_en: string;
}

export interface TicketAttachment {
    id: number;
    nombre_archivo: string;
    tipo_mime: string;
    ruta_archivo?: string; // [NUEVO] Para archivos en disco
    creado_en: string;
}

export interface TicketComment {
    id: number;
    comentario: string;
    es_interno: boolean;
    usuario_id?: string;
    nombre_usuario?: string;
    creado_en: string;
    leido?: boolean;
    leido_en?: string;
}

export const useTicketDetail = (ticketId: string | undefined) => {
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<TicketHistory[]>([]);
    const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
    const [comments, setComments] = useState<TicketComment[]>([]);
    const { state, dispatch } = useAppContext();
    const { addNotification } = useNotifications();
    const currentUser = state.user;

    const fetchAllData = useCallback(async () => {
        if (!ticketId) return;
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const [ticketRes, historyRes, attachmentsRes, commentsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/soporte/${ticketId}`, { headers }),
                axios.get(`${API_BASE_URL}/soporte/${ticketId}/historial`, { headers }),
                axios.get(`${API_BASE_URL}/soporte/${ticketId}/adjuntos`, { headers }),
                axios.get(`${API_BASE_URL}/soporte/${ticketId}/comentarios`, { headers })
            ]);
            setTicket(ticketRes.data);
            setHistory(historyRes.data);
            setAttachments(attachmentsRes.data);
            setComments(commentsRes.data);
        } catch (err) {
            console.error("Error cargando datos del ticket:", err);
            setError("No se pudo cargar la información del ticket.");
        } finally {
            setIsLoading(false);
        }
    }, [ticketId]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Polling silencioso para sincronización en tiempo real (Chat, Estado e Historial)
    useEffect(() => {
        if (!ticketId) return;

        const pollData = async () => {
            // Solo poll si la ventana está activa para ahorrar recursos
            if (document.visibilityState !== 'visible') return;

            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            try {
                // Fetch de datos dinámicos sin disparar isLoading global
                const [commentsRes, ticketRes, historyRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/soporte/${ticketId}/comentarios`, { headers }),
                    axios.get(`${API_BASE_URL}/soporte/${ticketId}`, { headers }),
                    axios.get(`${API_BASE_URL}/soporte/${ticketId}/historial`, { headers })
                ]);
                
                // Actualizar comentarios solo si hay cambios
                setComments(current => 
                    JSON.stringify(current) !== JSON.stringify(commentsRes.data) ? commentsRes.data : current
                );

                // Actualizar ticket (cambios de estado, prioridad, etc)
                setTicket(current => 
                    JSON.stringify(current) !== JSON.stringify(ticketRes.data) ? ticketRes.data : current
                );

                // Actualizar historial
                setHistory(current => 
                    JSON.stringify(current) !== JSON.stringify(historyRes.data) ? historyRes.data : current
                );

            } catch (err) {
                console.warn("Silent polling error:", err);
            }
        };

        const pollInterval = setInterval(pollData, 3000); // Cada 3 segundos para una experiencia "real-time"

        return () => clearInterval(pollInterval);
    }, [ticketId]);

    const updateTicket = async (updateData: Partial<Ticket>) => {
        if (!ticketId) return;
        setIsSaving(true);
        try {
            // Adjuntar información del usuario para trazabilidad
            const dataWithUser = {
                ...updateData,
                usuario_id: currentUser?.id,
                usuario_nombre: currentUser?.name
            };
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await axios.patch(`${API_BASE_URL}/soporte/${ticketId}`, dataWithUser, { headers });
            await fetchAllData();
            notify('success', 'Cambios guardados correctamente.');
        } catch (err) {
            console.error("Error al actualizar:", err);
            notify('error', 'No se pudieron guardar los cambios.');
        } finally {
            setIsSaving(false);
        }
    };

    const downloadAttachment = async (attachmentId: number, filename: string) => {
        try {
            // 1. Obtener metadatos para saber si es físico o Base64
            const res = await axios.get(`${API_BASE_URL}/soporte/adjuntos/${attachmentId}`);
            const { contenido_base64, tipo_mime, ruta_archivo } = res.data;

            if (ruta_archivo) {
                // [NUEVO] Descarga de archivo físico
                // Abrimos en una nueva pestaña o disparamos descarga directa via URL
                const downloadUrl = `${API_BASE_URL}/soporte/adjuntos/${attachmentId}/archivo`;
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = filename;
                link.target = "_blank";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else if (contenido_base64) {
                // [LEGADO] Descarga de Base64
                const link = document.createElement('a');
                link.href = `data:${tipo_mime};base64,${contenido_base64}`;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                throw new Error("No hay contenido disponible para este adjunto.");
            }
        } catch (err) {
            console.error("Error downloading attachment:", err);
            notify('error', 'No se pudo descargar el archivo.');
        }
    };

    const addComment = async (text: string, isInternal: boolean = false) => {
        if (!ticketId || !text.trim()) return;
        setIsSaving(true);
        try {
            const commentData = {
                comentario: text,
                es_interno: isInternal,
                usuario_id: currentUser?.id,
                nombre_usuario: currentUser?.name
            };
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await axios.post(`${API_BASE_URL}/soporte/${ticketId}/comentarios`, commentData, { headers });
            // Recargar solo comentarios para mayor fluidez
            const res = await axios.get(`${API_BASE_URL}/soporte/${ticketId}/comentarios`, { headers });
            setComments(res.data);
            notify('success', 'Mensaje enviado.');
        } catch (err) {
            console.error("Error al enviar comentario:", err);
            notify('error', 'No se pudo enviar el mensaje.');
        } finally {
            setIsSaving(false);
        }
    };

    const addAdditionalDetail = async (text: string) => {
        if (!ticket || !text.trim()) return;
        setIsSaving(true);
        try {
            const currentExtra = ticket.datos_extra || {};
            const history = currentExtra.historial_ampliaciones || [];
            
            const newDetail = {
                texto: text,
                usuario_nombre: currentUser?.name,
                usuario_id: currentUser?.id,
                fecha: new Date().toISOString()
            };

            const updatedExtra = {
                ...currentExtra,
                historial_ampliaciones: [...history, newDetail]
            };

            await updateTicket({ datos_extra: updatedExtra });
            notify('success', 'Ampliación registrada.');
        } catch (err) {
            console.error("Error al añadir detalle:", err);
            notify('error', 'No se pudo registrar la ampliación.');
        } finally {
            setIsSaving(false);
        }
    };

    const uploadAttachment = async (file: File) => {
        if (!ticketId) return;
        setIsSaving(true);
        try {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onload = () => {
                    const base64String = (reader.result as string).split(',')[1];
                    resolve(base64String);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const base64 = await base64Promise;
            
            const attachmentData = {
                ticket_id: ticketId,
                nombre_archivo: file.name,
                tipo_mime: file.type,
                contenido_base64: base64
            };

            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            await axios.post(`${API_BASE_URL}/soporte/${ticketId}/adjuntos`, attachmentData, { headers });
            
            const res = await axios.get(`${API_BASE_URL}/soporte/${ticketId}/adjuntos`, { headers });
            setAttachments(res.data);
            notify('success', 'Archivo adjuntado.');
        } catch (err) {
            console.error("Error al subir adjunto:", err);
            notify('error', 'No se pudo subir el archivo.');
        } finally {
            setIsSaving(false);
        }
    };

    const markCommentsAsRead = useCallback(async () => {
        if (!ticketId) return;
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            await axios.post(`${API_BASE_URL}/soporte/${ticketId}/comentarios/leido`, {}, { headers });
            // Actualización silenciosa de la UI
            setComments(current => current.map(c => 
                c.usuario_id !== currentUser?.id ? { ...c, leido: true, leido_en: new Date().toISOString() } : c
            ));
        } catch (err) {
            console.warn("Error marking comments as read:", err);
        }
    }, [ticketId, currentUser?.id]);

    // Marcar como leído automáticamente al recibir mensajes nuevos y estar viendo el ticket
    useEffect(() => {
        const hasUnread = comments.some(c => !c.leido && c.usuario_id !== currentUser?.id);
        if (hasUnread && document.visibilityState === 'visible') {
            markCommentsAsRead();
        }
    }, [comments, currentUser?.id, markCommentsAsRead]);

    const notify = (type: 'success' | 'error' | 'warning', message: string) => {
        // 1. Añadir al historial persistente (AppContext)
        dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
                id: Math.random().toString(36).substr(2, 9),
                title: type === 'error' ? 'Error' : (type === 'success' ? 'Éxito' : 'Aviso'),
                message,
                type: type === 'error' ? 'error' : (type === 'success' ? 'success' : 'warning'),
                timestamp: new Date().toISOString(),
                read: false
            }
        });

        // 2. Mostrar toast visual instantáneo
        addNotification(type === 'warning' ? 'warning' : type, message);
    };

    return {
        ticket,
        isLoading,
        isSaving,
        error,
        history,
        attachments,
        comments,
        updateTicket,
        addComment,
        addAdditionalDetail,
        uploadAttachment,
        markCommentsAsRead,
        downloadAttachment,
        refresh: fetchAllData
    };
};
