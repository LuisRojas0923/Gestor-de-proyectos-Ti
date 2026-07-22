import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsProvider } from '../components/notifications/NotificationsContext';
import { Text } from '../components/atoms';

const mocks = vi.hoisted(() => ({
  solicitarTicket: vi.fn(),
  sockets: [] as string[],
  protocols: [] as string[][],
  instances: [] as WebSocketFalso[],
}));

vi.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    state: {
      darkMode: false,
      user: { id: 'USR-1' },
    },
  }),
}));

vi.mock('../services/notificacionesService', () => ({
  solicitarTicketWebSocket: mocks.solicitarTicket,
}));

class WebSocketFalso {
  static lanzarError = false;
  onmessage = null;
  onclose = null;
  onerror = null;
  onopen = null;

  constructor(url: string, protocols: string[] = []) {
    if (WebSocketFalso.lanzarError) {
      WebSocketFalso.lanzarError = false;
      throw new Error('WebSocket no disponible');
    }
    mocks.sockets.push(url);
    mocks.protocols.push(protocols);
    mocks.instances.push(this);
  }

  close() {}
}

describe('NotificationsProvider', () => {
  beforeEach(() => {
    mocks.sockets.length = 0;
    mocks.protocols.length = 0;
    mocks.instances.length = 0;
    mocks.solicitarTicket.mockReset();
    mocks.solicitarTicket.mockResolvedValue({ ticket: 'ticket-efimero' });
    WebSocketFalso.lanzarError = false;
    vi.stubGlobal('WebSocket', WebSocketFalso);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('abre el WebSocket con ticket efimero y sin usuario ni JWT en la URL', async () => {
    localStorage.setItem('token', 'jwt-no-debe-ir-en-url');

    render(
      <NotificationsProvider>
        <Text>contenido</Text>
      </NotificationsProvider>,
    );

    await waitFor(() => expect(mocks.sockets).toHaveLength(1));
    expect(mocks.solicitarTicket).toHaveBeenCalledOnce();
    expect(mocks.sockets[0]).toContain('/notificaciones/ws');
    expect(mocks.sockets[0]).not.toContain('ticket-efimero');
    expect(mocks.sockets[0]).not.toContain('USR-1');
    expect(mocks.sockets[0]).not.toContain('jwt-no-debe-ir-en-url');
    expect(mocks.protocols[0]).toEqual([
      'notificaciones.v1',
      'ticket.ticket-efimero',
    ]);
  });

  it('reintenta si el constructor WebSocket falla', async () => {
    vi.useFakeTimers();
    localStorage.setItem('token', 'jwt-prueba');
    WebSocketFalso.lanzarError = true;

    render(
      <NotificationsProvider>
        <Text>contenido</Text>
      </NotificationsProvider>,
    );

    await vi.waitFor(() => expect(mocks.solicitarTicket).toHaveBeenCalledOnce());
    await vi.advanceTimersByTimeAsync(2000);
    await vi.waitFor(() => expect(mocks.sockets).toHaveLength(1));
  });

  it('conserva backoff creciente si la conexion se abre y cae de inmediato', async () => {
    vi.useFakeTimers();
    localStorage.setItem('token', 'jwt-prueba');

    render(
      <NotificationsProvider>
        <Text>contenido</Text>
      </NotificationsProvider>,
    );

    await vi.waitFor(() => expect(mocks.instances).toHaveLength(1));
    mocks.instances[0].onopen?.(new Event('open'));
    mocks.instances[0].onclose?.(new CloseEvent('close'));
    await vi.advanceTimersByTimeAsync(1500);
    await vi.waitFor(() => expect(mocks.instances).toHaveLength(2));

    mocks.instances[1].onopen?.(new Event('open'));
    mocks.instances[1].onclose?.(new CloseEvent('close'));
    await vi.advanceTimersByTimeAsync(1500);

    expect(mocks.instances).toHaveLength(2);
  });
});
