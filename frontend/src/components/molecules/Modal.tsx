import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Button, Title, MaterialCard } from '../atoms';

const modalStack: symbol[] = [];
let scrollLocks = 0;
let previousBodyOverflow = '';

const isTopModal = (id: symbol) => modalStack[modalStack.length - 1] === id;

const lockBodyScroll = () => {
    if (scrollLocks === 0) {
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
    }
    scrollLocks += 1;
};

const unlockBodyScroll = () => {
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks === 0) document.body.style.overflow = previousBodyOverflow;
};

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
    showCloseButton?: boolean;
    closeButtonDisabled?: boolean;
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
    className?: string; // Para clases adicionales en el contenedor
    contentClassName?: string;
    headerClassName?: string;
    ariaLabel?: string;
    ariaDescribedBy?: string;
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    closeButtonDisabled = false,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    className = '',
    contentClassName = '',
    headerClassName = '',
    ariaLabel,
    ariaDescribedBy,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const modalId = useRef(Symbol('modal'));
    const openerRef = useRef<HTMLElement | null>(null);
    const titleId = useId();
    useEffect(() => {
        if (!isOpen) return undefined;
        const id = modalId.current;
        openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        modalStack.push(id);
        lockBodyScroll();
        const focusTimer = window.setTimeout(() => {
            if (!isTopModal(id)) return;
            const focusable = modalRef.current?.querySelector<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            );
            (focusable ?? modalRef.current)?.focus();
        }, 0);
        return () => {
            window.clearTimeout(focusTimer);
            const wasTop = isTopModal(id);
            const index = modalStack.lastIndexOf(id);
            if (index >= 0) modalStack.splice(index, 1);
            unlockBodyScroll();
            if (wasTop) window.setTimeout(() => openerRef.current?.focus(), 0);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && closeOnEscape && isTopModal(modalId.current)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [closeOnEscape, isOpen, onClose]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Tab' || !isTopModal(modalId.current)) return;
        const focusables = Array.from(
            modalRef.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ) ?? [],
        );
        if (focusables.length === 0) {
            event.preventDefault();
            modalRef.current?.focus();
            return;
        }
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
                onClick={closeOnOverlayClick ? () => { if (isTopModal(modalId.current)) onClose(); } : undefined}
                aria-hidden="true"
            />

            {/* Modal Container */}
            <MaterialCard
                ref={modalRef}
                elevation={4}
                className={`
          relative w-full ${sizeClasses[size]} 
          transform transition-all animate-fade-in
          ${className}
        `}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                aria-labelledby={!ariaLabel && title ? titleId : undefined}
                aria-describedby={ariaDescribedBy}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
            >
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
                                disabled={closeButtonDisabled}
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
