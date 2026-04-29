import { API_CONFIG } from '../config/api';

export interface ChatHistoryItem {
    role: 'user' | 'assistant';
    content: string;
}

export interface AIChatResponse {
    respuesta: string;
    ticket_data?: any;
    ticket_id?: string;
}

export const IAService = {
    chatTicket: async (mensaje: string, historial: ChatHistoryItem[]): Promise<AIChatResponse> => {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/ia/chat-ticket`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ mensaje, historial })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error en el asistente de IA');
        }

        return await response.json();
    }
};
