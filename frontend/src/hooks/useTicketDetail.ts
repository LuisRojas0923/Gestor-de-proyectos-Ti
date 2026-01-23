import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_CONFIG } from '../config/api';
import { useAppContext } from '../context/AppContext';

const API_BASE_URL = API_CONFIG.BASE_URL;

export type TicketStatus = 'Abierto' | 'Asignado' | 'En Proceso' | 'Pendiente Info' | 'Escalado' | 'Resuelto' | 'Cerrado';

export interface Ticket {
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
    diagnostico?: string;
    resolucion?: string;
    notas?: string;
    horas_tiempo_empleado?: number;
    fecha_creacion: string;
    fecha_cierre?: string;
    datos_extra?: Record<string, unknown>;
    desarrollo_id?: string;
}

export interface TicketHistory {
    id: number;
    accion: string;
    detalle: string;
    creado_en: string;
}

export interface TicketAttachment {
    id: number;
    nombre_archivo: string;
    tipo_mime: string;
    creado_en: string;
}

export const useTicketDetail = (ticketId: string | undefined) => {
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<TicketHistory[]>([]);
    const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
    const { dispatch } = useAppContext();

    const fetchAllData = useCallback(async () => {
        if (!ticketId) return;
        setIsLoading(true);
        try {
            const [ticketRes, historyRes, attachmentsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/soporte/${ticketId}`),
                axios.get(`${API_BASE_URL}/soporte/${ticketId}/historial`),
                axios.get(`${API_BASE_URL}/soporte/${ticketId}/adjuntos`)
            ]);
            setTicket(ticketRes.data);
            setHistory(historyRes.data);
            setAttachments(attachmentsRes.data);
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

    const updateTicket = async (updateData: Partial<Ticket>) => {
        if (!ticketId) return;
        setIsSaving(true);
        try {
            await axios.patch(`${API_BASE_URL}/soporte/${ticketId}`, updateData);
            await fetchAllData();
            notify('success', 'Éxito', 'Cambios guardados correctamente.');
        } catch (err) {
            console.error("Error al actualizar:", err);
            notify('error', 'Error', 'No se pudieron guardar los cambios.');
        } finally {
            setIsSaving(false);
        }
    };

    const downloadAttachment = async (attachmentId: number, filename: string) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/soporte/adjuntos/${attachmentId}`);
            const { contenido_base64, tipo_mime } = res.data;
            const link = document.createElement('a');
            link.href = `data:${tipo_mime};base64,${contenido_base64}`;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            notify('error', 'Error', 'No se pudo descargar el archivo.');
        }
    };

    const notify = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
        dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
                id: Math.random().toString(36).substr(2, 9),
                title,
                message,
                type,
                timestamp: new Date().toISOString(),
                read: false
            }
        });
    };

    return {
        ticket,
        isLoading,
        isSaving,
        error,
        history,
        attachments,
        updateTicket,
        downloadAttachment,
        refresh: fetchAllData
    };
};
