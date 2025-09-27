import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, Info, X } from 'lucide-react';

export interface ToastNotificationProps {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
  onDismiss: (id: string) => void;
  darkMode: boolean;
}

export const NotificationToast: React.FC<ToastNotificationProps> = ({ id, type, message, onDismiss, darkMode }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const { icon, iconClasses, cardClasses, progressClasses } = useMemo(() => {
    const baseIconClasses = 'p-1.5 rounded-full text-white';
    const baseCardClasses = 'flex items-center shadow-2xl transform transition-all duration-500 ease-in-out';
    const cardColor = darkMode ? 'bg-neutral-700 border border-neutral-600' : 'bg-white border border-neutral-200';
    switch (type) {
      case 'success':
        return { icon: <CheckCircle size={20} />, iconClasses: `${baseIconClasses} bg-green-500`, cardClasses: `${baseCardClasses} ${cardColor}`, progressClasses: 'bg-green-500' };
      case 'info':
        return { icon: <Info size={20} />, iconClasses: `${baseIconClasses} bg-blue-500`, cardClasses: `${baseCardClasses} ${cardColor}`, progressClasses: 'bg-blue-500' };
      case 'error':
        return { icon: <X size={20} />, iconClasses: `${baseIconClasses} bg-red-500`, cardClasses: `${baseCardClasses} ${cardColor}`, progressClasses: 'bg-red-500' };
      default:
        return { icon: <Info size={20} />, iconClasses: `${baseIconClasses} bg-gray-500`, cardClasses: `${baseCardClasses} ${cardColor}`, progressClasses: 'bg-gray-500' };
    }
  }, [type, darkMode]);

  const handleDismiss = useCallback(() => {
    setShowContent(false);
    setIsExpanded(false);
    setTimeout(() => onDismiss(id), 700);
  }, [id, onDismiss]);

  useEffect(() => {
    const enteringTimeout = setTimeout(() => {
      setIsExpanded(true);
      setTimeout(() => setShowContent(true), 500);
    }, 50);

    const autoDismissTimeout = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => {
      clearTimeout(enteringTimeout);
      clearTimeout(autoDismissTimeout);
    };
  }, [handleDismiss]);

  const initialClasses = 'w-14 h-14 rounded-full p-3';
  const expandedClasses = 'w-full max-w-sm rounded-full p-4';
  const currentShapeClasses = isExpanded ? expandedClasses : initialClasses;

  return (
    <div
      className={`mx-auto my-2 overflow-hidden cursor-pointer ${cardClasses} ${currentShapeClasses}`}
      role="alert"
      onClick={() => { if (isExpanded && showContent) handleDismiss(); }}
    >
      <div className={`flex items-center w-full ${!isExpanded ? 'justify-center' : ''}`}>
        <div className={iconClasses}>{icon}</div>
        <div className={`ml-3 text-sm font-medium flex-grow transition-opacity duration-200 ${showContent ? 'opacity-100' : 'opacity-0'} ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
          {message}
        </div>
        {showContent && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className={`ml-4 p-1 rounded-full transition-colors ${darkMode ? 'text-neutral-300 hover:bg-neutral-600' : 'text-neutral-500 hover:bg-neutral-100'}`}
            aria-label="Cerrar notificación"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {showContent && (
        <div className={`h-1 bg-neutral-200 dark:bg-neutral-600 ${isExpanded ? 'mx-2 rounded-full overflow-hidden' : ''}`}>
          <div className={`h-full ${progressClasses} animate-progress-bar`} style={{ animationDuration: '5s' }} />
        </div>
      )}
    </div>
  );
};


