import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';

interface TicketWebSocketRespuesta {
  ticket: string;
  expira_en_segundos: number;
}

export async function solicitarTicketWebSocket(): Promise<TicketWebSocketRespuesta> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Sesion no autenticada');
  }
  const response = await axios.post<TicketWebSocketRespuesta>(
    `${API_CONFIG.BASE_URL}${API_ENDPOINTS.NOTIFICATIONS_WS_TICKET}`,
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return response.data;
}
