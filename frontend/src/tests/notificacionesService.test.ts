import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { solicitarTicketWebSocket } from '../services/notificacionesService';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('axios', () => ({
  default: { post: mocks.post },
}));

describe('notificacionesService', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.post.mockReset();
  });

  it('solicita el ticket con bearer sin exponerlo en la URL', async () => {
    localStorage.setItem('token', 'jwt-prueba');
    mocks.post.mockResolvedValue({
      data: { ticket: 'ticket-uno', expira_en_segundos: 30 },
    });

    const resultado = await solicitarTicketWebSocket();

    expect(resultado.ticket).toBe('ticket-uno');
    expect(mocks.post).toHaveBeenCalledWith(
      `${API_CONFIG.BASE_URL}${API_ENDPOINTS.NOTIFICATIONS_WS_TICKET}`,
      {},
      { headers: { Authorization: 'Bearer jwt-prueba' } },
    );
  });

  it('falla cerrado cuando no existe sesion local', async () => {
    await expect(solicitarTicketWebSocket()).rejects.toThrow('Sesion no autenticada');
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
