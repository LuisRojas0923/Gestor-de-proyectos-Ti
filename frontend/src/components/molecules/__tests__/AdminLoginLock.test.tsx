/**
 * Tests de unidad y a11y para AdminLoginLock (molecule).
 *
 * Contratos a verificar:
 *   - Renderiza null cuando isOpen=false
 *   - Renderiza portal en document.body cuando isOpen=true
 *   - role="dialog" + aria-modal="true" + aria-labelledby + aria-describedby
 *   - Cierre con tecla Escape invoca onClose
 *   - Click en backdrop invoca onClose
 *   - Submit exitoso invoca onUnlock + addNotification success
 *   - Submit fallido invoca addNotification error (no onUnlock)
 *   - Bloquea scroll del body al abrir y restaura al cerrar
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockPost = vi.fn();
vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({ post: mockPost }),
}));

const mockAddNotification = vi.fn();
vi.mock('../../notifications/NotificationsContext', () => ({
  useNotifications: () => ({ addNotification: mockAddNotification }),
}));

import AdminLoginLock from '../AdminLoginLock';

const defaultProps = {
  isOpen: true,
  onUnlock: vi.fn(),
  onClose: vi.fn(),
};

const renderModal = (overrides: Partial<typeof defaultProps> = {}) => {
  const props = { ...defaultProps, ...overrides };
  return render(<AdminLoginLock {...props} />);
};

describe('AdminLoginLock - renderizado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('renderiza null cuando isOpen=false', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renderiza el dialog en document.body (createPortal) cuando isOpen=true', () => {
    renderModal();
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
  });

  it('expone role="dialog", aria-modal="true" y referencias a title/description', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getByText('Zona Restringida')).toBeInTheDocument();
  });
});

describe('AdminLoginLock - accesibilidad e interacciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  it('cierra con la tecla Escape', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('bloquea scroll del body al abrir y restaura al desmontar', () => {
    const { unmount } = renderModal();
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('submit exitoso invoca onUnlock con la contraseña y notifica success', async () => {
    const onUnlock = vi.fn();
    mockPost.mockResolvedValueOnce({ success: true });
    renderModal({ onUnlock });

    const input = document.body.querySelector('input[type="password"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'Admin1234!' } });
    fireEvent.click(screen.getByRole('button', { name: /Verificar Identidad/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/config/verify-admin', {
        password: 'Admin1234!',
      });
      expect(onUnlock).toHaveBeenCalledWith('Admin1234!');
      expect(mockAddNotification).toHaveBeenCalledWith(
        'success',
        expect.any(String)
      );
    });
  });

  it('submit fallido notifica error y NO invoca onUnlock', async () => {
    const onUnlock = vi.fn();
    mockPost.mockRejectedValueOnce({
      response: { data: { detail: 'Contraseña incorrecta' } },
    });
    renderModal({ onUnlock });

    const input = document.body.querySelector('input[type="password"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'wrongpass1' } });
    fireEvent.click(screen.getByRole('button', { name: /Verificar Identidad/i }));

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        'error',
        'Contraseña incorrecta'
      );
      expect(onUnlock).not.toHaveBeenCalled();
    });
  });

  it('click en backdrop (fuera del modal) invoca onClose', () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    const backdrop = document.querySelector('.fixed.inset-0') as HTMLElement;
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop, { target: backdrop });
    expect(onClose).toHaveBeenCalled();
  });
});
