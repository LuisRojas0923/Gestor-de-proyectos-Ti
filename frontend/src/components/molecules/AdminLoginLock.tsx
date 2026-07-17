/**
 * AdminLoginLock - Modal de re-verificación de identidad para acceder al panel maestro.
 *
 * Características a11y:
 * - Renderizado vía createPortal (fuera del árbol DOM padre)
 * - role="dialog" + aria-modal="true" + aria-labelledby
 * - Focus-trap (foco atrapado dentro del modal mientras está abierto)
 * - Cierre con tecla Escape
 * - Bloqueo de scroll del body mientras está abierto
 * - Devuelve foco al elemento que abrió el modal al cerrarse
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { Title, Text, MaterialCard, Input, Button } from '../atoms';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../notifications/NotificationsContext';

interface AdminLoginLockProps {
  onUnlock: (password: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const MODAL_TITLE_ID = 'admin-login-lock-title';
const MODAL_DESCRIPTION_ID = 'admin-login-lock-description';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const AdminLoginLock: React.FC<AdminLoginLockProps> = ({ onUnlock, onClose, isOpen }) => {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const previousActiveElementRef = useRef<Element | null>(null);
  const { post } = useApi();
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirst = window.setTimeout(() => {
      const focusables = modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const target = (focusables && focusables[0]) || firstInputRef.current;
      target?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !modalRef.current) return;

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
      const prev = previousActiveElementRef.current as HTMLElement | null;
      if (prev && typeof prev.focus === 'function') {
        prev.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      const response = await post('/config/verify-admin', { password });
      if (response.success) {
        addNotification('success', 'Identidad verificada correctamente');
        onUnlock(password);
        setPassword('');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      addNotification('error', err.response?.data?.detail || 'Error de verificación');
    } finally {
      setIsVerifying(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={MODAL_TITLE_ID}
        aria-describedby={MODAL_DESCRIPTION_ID}
        className="w-full max-w-md animate-in zoom-in-95 duration-300"
      >
        <MaterialCard className="p-8 shadow-2xl border-2 border-[var(--color-primary)]/20">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-4 ring-8 ring-[var(--color-primary)]/5">
              <Lock size={32} />
            </div>
            <Title
              id={MODAL_TITLE_ID}
              variant="h4"
              weight="black"
              className="mb-2"
            >
              Zona Restringida
            </Title>
            <Text
              id={MODAL_DESCRIPTION_ID}
              color="text-secondary"
            >
              Se requiere re-autenticación de administrador para acceder al Panel Maestro de Módulos.
            </Text>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              ref={firstInputRef}
              type="password"
              label="Contraseña de Administrador"
              placeholder="Ingrese su contraseña"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              icon={ShieldAlert}
              required
              minLength={8}
              maxLength={128}
            />

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex gap-3">
              <AlertCircle className="text-amber-600 shrink-0" size={18} />
              <Text variant="caption" className="text-amber-700 dark:text-amber-400">
                Esta acción desbloqueará controles globales que afectan a todos los usuarios del sistema.
              </Text>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isVerifying}
              icon={CheckCircle2}
              className="!rounded-xl py-3 shadow-lg shadow-primary-500/30"
            >
              Verificar Identidad
            </Button>

            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={onClose}
              disabled={isVerifying}
            >
              Cancelar
            </Button>
          </form>
        </MaterialCard>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default AdminLoginLock;
