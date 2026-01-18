import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, Info, X, AlertTriangle } from 'lucide-react';
import { Button, Text, Icon } from '../atoms';

export interface ToastNotificationProps {
  id: string;
  type: 'success' | 'info' | 'error' | 'warning';
  message: string;
  onDismiss: (id: string) => void;
  darkMode: boolean;
}

export const NotificationToast: React.FC<ToastNotificationProps> = ({ id, type, message, onDismiss, darkMode }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showIcon, setShowIcon] = useState(true);

  const { icon, iconClasses, cardClasses, progressClasses } = useMemo(() => {
    const baseIconClasses = 'w-8 h-8 flex items-center justify-center rounded-full shrink-0';
    const baseCardClasses = 'flex items-center shadow-2xl transform transition-all duration-500 ease-in-out border';
    // Use design system variables. In dark mode, surface is dark. In light mode, surface is white.
    // We can rely on css variables directly if the app handles dark mode via class on body, 
    // but here we have explicit darkMode prop. 
    // Let's use standard variables that react to the class, assuming the container has the class or body does.
    // If darkMode prop is passed, maybe the parent doesn't set the class on this portal?
    // NotificationsContainer is usually at root.

    // Using simple conditional for now to match structure but with tokens
    const cardColor = 'bg-[var(--color-surface)] border-[var(--color-border)]';

    switch (type) {
      case 'success':
        return {
          icon: <Icon name={CheckCircle} size="sm" />,
          iconClasses: `${baseIconClasses} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`,
          cardClasses: `${baseCardClasses} ${cardColor}`,
          progressClasses: 'bg-green-500'
        };
      case 'info':
        return {
          icon: <Icon name={Info} size="sm" />,
          iconClasses: `${baseIconClasses} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`,
          cardClasses: `${baseCardClasses} ${cardColor}`,
          progressClasses: 'bg-blue-500'
        };
      case 'error':
        return {
          icon: <Icon name={X} size="sm" />,
          iconClasses: `${baseIconClasses} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`,
          cardClasses: `${baseCardClasses} ${cardColor}`,
          progressClasses: 'bg-red-500'
        };
      case 'warning':
        return {
          icon: <Icon name={AlertTriangle} size="sm" />,
          iconClasses: `${baseIconClasses} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400`,
          cardClasses: `${baseCardClasses} ${cardColor}`,
          progressClasses: 'bg-yellow-500'
        };
      default:
        return {
          icon: <Icon name={Info} size="sm" />,
          iconClasses: `${baseIconClasses} bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400`,
          cardClasses: `${baseCardClasses} ${cardColor}`,
          progressClasses: 'bg-gray-500'
        };
    }
  }, [type, darkMode]);

  const handleDismiss = useCallback(() => {
    setShowContent(false);
    // Ocultar icono durante la contracción
    setShowIcon(false);
    // Delay más largo para ocultar contenido primero
    setTimeout(() => {
      setIsExpanded(false);
      // Mostrar icono al final de la contracción con más tiempo
      setTimeout(() => {
        setShowIcon(true);
        setTimeout(() => onDismiss(id), 400);
      }, 500);
    }, 300);
  }, [id, onDismiss]);

  useEffect(() => {
    // Mostrar el icono inmediatamente
    const enteringTimeout = setTimeout(() => {
      setIsExpanded(true);
      setTimeout(() => setShowContent(true), 500);
    }, 50);

    const autoDismissTimeout = setTimeout(() => {
      handleDismiss();
    }, 2000);

    return () => {
      clearTimeout(enteringTimeout);
      clearTimeout(autoDismissTimeout);
    };
  }, [handleDismiss]);

  // MODIFICACIÓN: Mantener altura del círculo del icono para efecto píldora
  const initialClasses = 'w-12 h-12 rounded-full p-2';
  const expandedClasses = 'w-full max-w-sm h-12 rounded-full px-4 py-2';
  const currentShapeClasses = isExpanded ? expandedClasses : initialClasses;

  return (
    <div
      className={`mx-auto my-2 overflow-hidden cursor-pointer ${cardClasses} ${currentShapeClasses}`}
      role="alert"
      onClick={() => { if (isExpanded && showContent) handleDismiss(); }}
    >
      <div className={`flex items-center w-full h-full ${!isExpanded ? 'justify-center' : ''}`}>
        {/* Icono que aparece al final de la contracción */}
        {showIcon && (
          <div className={iconClasses}>{icon}</div>
        )}
        {/* Contenido que aparece después */}
        {isExpanded && (
          <div className={`ml-3 flex-grow transition-opacity duration-200 ${showContent ? 'opacity-100' : 'opacity-0'} truncate`}>
            <Text variant="body2" weight="medium" color="text-primary">{message}</Text>
          </div>
        )}
        {/* Botón de cerrar que aparece después */}
        {showContent && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className={`ml-4 p-1 rounded-full transition-colors text-[var(--color-text-secondary)] hover:bg-[var(--color-primary)]/10`}
            aria-label="Cerrar notificación"
            icon={X}
          />
        )}
      </div>
      {showContent && (
        <div className={`h-1 bg-[var(--color-border)] ${isExpanded ? 'mx-2 rounded-full overflow-hidden' : ''}`}>
          <div className={`h-full ${progressClasses} animate-progress-bar`} style={{ animationDuration: '2s' }} />
        </div>
      )}
    </div>
  );
};


