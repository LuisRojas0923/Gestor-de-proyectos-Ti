import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';

export type NotificationType = 'success' | 'info' | 'error';

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


