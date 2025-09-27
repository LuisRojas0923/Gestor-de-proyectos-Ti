import React from 'react';
import { useNotifications } from './NotificationsContext';
import { NotificationToast } from './NotificationToast';

export const NotificationsContainer: React.FC = () => {
  const { notifications, dismissNotification, darkMode } = useNotifications();
  return (
    <>
      <style>{`
        @keyframes progress-bar { from { width: 100%; } to { width: 0%; } }
        .animate-progress-bar { animation-name: progress-bar; animation-timing-function: linear; animation-fill-mode: forwards; }
      `}</style>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm pointer-events-none">
        <div className="pointer-events-auto">
          {notifications.map(n => (
            <NotificationToast key={n.id} id={n.id} type={n.type} message={n.message} darkMode={darkMode} onDismiss={dismissNotification} />
          ))}
        </div>
      </div>
    </>
  );
};


