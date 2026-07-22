import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { API_CONFIG, API_ENDPOINTS } from '../../config/api';
import { solicitarTicketWebSocket } from '../../services/notificacionesService';

export type NotificationType = 'success' | 'info' | 'error' | 'warning';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationsContextValue {
  notifications: NotificationItem[];
  addNotification: (type: NotificationType, message: string) => void;
  dismissNotification: (id: string) => void;
  darkMode: boolean;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAppContext();
  const { darkMode } = state;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback((type: NotificationType, message: string) => {
    const n: NotificationItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      message,
    };
    setNotifications(prev => [n, ...prev.slice(0, 4)]); // máximo 5 visibles
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const userId = state.user?.id;

  useEffect(() => {
    // Solicitar permiso de notificaciones nativas inmediatamente al recargar el sistema
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(err => {
        console.warn("Error al solicitar permisos de notificación:", err);
      });
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let stableConnectionTimeout: ReturnType<typeof setTimeout>;
    let isMounted = true;
    let reconnectAttempt = 0;

    const scheduleReconnect = () => {
      if (!isMounted || !localStorage.getItem('token')) return;
      clearTimeout(reconnectTimeout);
      const exponentialDelay = Math.min(30000, 1000 * (2 ** reconnectAttempt));
      const jitter = Math.floor(Math.random() * 250);
      reconnectAttempt += 1;
      reconnectTimeout = setTimeout(() => void connect(), exponentialDelay + jitter);
    };

    const connect = async () => {
      clearTimeout(reconnectTimeout);
      let ticket: string;
      try {
        ({ ticket } = await solicitarTicketWebSocket());
      } catch {
        scheduleReconnect();
        return;
      }
      if (!isMounted) return;

      const baseUrl = API_CONFIG.BASE_URL;
      let wsUrl = "";
      
      if (baseUrl.startsWith('http')) {
        wsUrl = baseUrl.replace('http', 'ws');
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}${baseUrl}`;
      }

      let nextSocket: WebSocket;
      try {
        nextSocket = new WebSocket(
          `${wsUrl}${API_ENDPOINTS.NOTIFICATIONS_WS}`,
          ['notificaciones.v1', `ticket.${ticket}`],
        );
      } catch {
        scheduleReconnect();
        return;
      }
      socket = nextSocket;

      nextSocket.onopen = () => {
        clearTimeout(stableConnectionTimeout);
        stableConnectionTimeout = setTimeout(() => {
          reconnectAttempt = 0;
        }, 10000);
      };

      nextSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // 1. Mostrar notificación interna (Toast UI)
          addNotification('info', data.mensaje);

          // 2. Mostrar notificación nativa si el navegador tiene permiso y la app está en segundo plano
          if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
            const systemNotif = new Notification(data.titulo, {
              body: data.mensaje,
              icon: '/favicon.svg'
            });

            systemNotif.onclick = () => {
              window.focus();
            };
          }
        } catch (e) {
          console.error("Error procesando mensaje de notificación:", e);
        }
      };

      nextSocket.onclose = () => {
        clearTimeout(stableConnectionTimeout);
        if (socket === nextSocket) {
          socket = null;
          scheduleReconnect();
        }
      };

      nextSocket.onerror = () => {
        nextSocket.close();
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (socket) socket.close();
      clearTimeout(reconnectTimeout);
      clearTimeout(stableConnectionTimeout);
    };
  }, [userId, addNotification]);

  const value = useMemo(() => ({ notifications, addNotification, dismissNotification, darkMode }), [notifications, addNotification, dismissNotification, darkMode]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
