/**
 * useModalA11y - Hook compartido para accesibilidad de modales.
 *
 * Implementa los contratos a11y que se esperan de cualquier modal en la app:
 * - Bloqueo de scroll del body mientras el modal está abierto
 * - Cierre con tecla Escape
 * - Focus-trap: el foco no puede escapar del modal
 * - Devuelve el foco al elemento que abrió el modal al cerrarse
 * - Foco automático al primer elemento focuseable (o `initialFocusRef` si se da)
 *
 * Uso:
 *   const modalRef = useRef<HTMLDivElement | null>(null);
 *   const firstInputRef = useRef<HTMLInputElement | null>(null);
 *   useModalA11y({ isOpen, onClose, modalRef, initialFocusRef: firstInputRef });
 *
 *   return createPortal(
 *     <div ref={modalRef} role="dialog" aria-modal="true" ...>
 *       <input ref={firstInputRef} ... />
 *     </div>,
 *     document.body
 *   );
 */
import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface UseModalA11yOptions {
  isOpen: boolean;
  onClose: () => void;
  modalRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  trapFocus?: boolean;
}

export function useModalA11y({
  isOpen,
  onClose,
  modalRef,
  initialFocusRef,
  closeOnEscape = true,
  trapFocus = true,
}: UseModalA11yOptions): void {
  useEffect(() => {
    if (!isOpen) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirst = window.setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }
      const focusables = modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const target = (focusables && focusables[0]) || null;
      target?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (!trapFocus || e.key !== 'Tab' || !modalRef.current) return;

      const focusables = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusFirst);
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus();
      }
    };
  }, [isOpen, onClose, modalRef, initialFocusRef, closeOnEscape, trapFocus]);
}
