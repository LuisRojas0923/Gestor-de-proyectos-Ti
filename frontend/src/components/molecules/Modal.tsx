import React, { useEffect, useId, useRef } from 'react';
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
    const modalRef = useRef<HTMLDivElement>(null);
    const titleId = useId();

    // Prevenir scroll en el body cuando el modal está abierto
    useEffect(() => {
        const elementoActivo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.setTimeout(() => {
                const focusable = modalRef.current?.querySelector<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
                );
                (focusable ?? modalRef.current)?.focus();
            }, 0);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            elementoActivo?.focus();
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Tab') return;
        const focusables = Array.from(
            modalRef.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ) ?? [],
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

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
                onClick={closeOnOverlayClick ? onClose : undefined}
                aria-hidden="true"
            />

            {/* Modal Container */}
            <div
                ref={modalRef}
                className={`
          relative w-full ${sizeClasses[size]} 
          transform transition-all animate-fade-in
          ${className}
        `}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
            >
                <MaterialCard elevation={4} className="!flex w-full flex-col">
                {/* Header (Optional) */}
                {(title || showCloseButton) && (
                    <MaterialCard.Header className={`flex items-center justify-between !py-3 !px-4 ${headerClassName}`}>
                        {title && (
                            typeof title === 'string' ? (
                                <Title id={titleId} variant="h4" weight="semibold">
                                    {title}
                                </Title>
                            ) : (
                                <div id={titleId} className="min-w-0 flex-1">{title}</div>
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
        </div>
    );

    // Usar portal si el root existe, sino renderizar directo (fallback)
    const root = document.getElementById('root') || document.body;

    return createPortal(modalContent, root);
};

export default Modal;
