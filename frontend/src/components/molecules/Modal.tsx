import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Button, Title, MaterialCard } from '../atoms';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
    showCloseButton?: boolean;
    closeOnOverlayClick?: boolean;
    className?: string; // Para clases adicionales en el contenedor
    contentClassName?: string;
    headerClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    className = '',
    contentClassName = '',
    headerClassName = '',
}) => {
    // Prevenir scroll en el body cuando el modal está abierto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        '6xl': 'max-w-6xl',
        full: 'max-w-[95vw] w-full',
    };

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
                onClick={closeOnOverlayClick ? onClose : undefined}
                aria-hidden="true"
            />

            {/* Modal Container */}
            <MaterialCard
                elevation={4}
                className={`
          relative w-full ${sizeClasses[size]} 
          !flex flex-col
          transform transition-all animate-fade-in
          ${className}
        `}
                role="dialog"
                aria-modal="true"
            >
                {/* Header (Optional) */}
                {(title || showCloseButton) && (
                    <MaterialCard.Header className={`flex items-center justify-between !py-3 !px-4 ${headerClassName}`}>
                        {title && (
                            typeof title === 'string' ? (
                                <Title variant="h4" weight="semibold">
                                    {title}
                                </Title>
                            ) : (
                                <div className="min-w-0 flex-1">{title}</div>
                            )
                        )}
                        {showCloseButton && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                icon={X}
                                aria-label="Cerrar modal"
                                className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-1"
                            />
                        )}
                    </MaterialCard.Header>
                )}

                {/* Content */}
                <MaterialCard.Content className={`!p-6 overflow-y-auto ${contentClassName}`}>
                    {children}
                </MaterialCard.Content>
            </MaterialCard>
        </div>
    );

    // Usar portal si el root existe, sino renderizar directo (fallback)
    const root = document.getElementById('root') || document.body;

    return createPortal(modalContent, root);
};

export default Modal;
