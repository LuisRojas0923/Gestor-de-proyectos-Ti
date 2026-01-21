import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Button, Title, MaterialCard } from '../atoms';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showCloseButton?: boolean;
    className?: string; // Para clases adicionales en el contenedor
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    className = '',
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
        full: 'max-w-full m-4',
    };

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
                onClick={onClose}
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
                    <MaterialCard.Header className="flex items-center justify-between !py-4">
                        {title && (
                            <Title variant="h4" weight="semibold">
                                {title}
                            </Title>
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
                <MaterialCard.Content className="!p-6 overflow-y-auto">
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
