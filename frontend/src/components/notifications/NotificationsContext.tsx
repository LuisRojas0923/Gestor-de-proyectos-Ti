import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { API_CONFIG } from '../../config/api';

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
    if (!userId) return;

    // Solicitar permiso de notificaciones nativas si el navegador lo soporta
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let isMounted = true;

    const connect = () => {
      const baseUrl = API_CONFIG.BASE_URL;
      let wsUrl = "";
      
      if (baseUrl.startsWith('http')) {
        wsUrl = baseUrl.replace('http', 'ws');
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}${baseUrl}`;
      }

      socket = new WebSocket(`${wsUrl}/notificaciones/ws/${userId}`);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // 1. Mostrar notificación interna (Toast UI)
          addNotification('info', data.mensaje);

          // 2. Mostrar notificación nativa si el navegador tiene permiso y la app está en segundo plano
          if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
            const systemNotif = new Notification(data.titulo, {
              body: data.mensaje,
              icon: '/favicon.ico'
            });

            systemNotif.onclick = () => {
              window.focus();
            };
          }
        } catch (e) {
          console.error("Error procesando mensaje de notificación:", e);
        }
      };

      socket.onclose = () => {
        if (isMounted) {
          reconnectTimeout = setTimeout(connect, 5000); // Reintentar en 5 segundos
        }
      };

      socket.onerror = () => {
        if (socket) socket.close();
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (socket) socket.close();
      clearTimeout(reconnectTimeout);
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
