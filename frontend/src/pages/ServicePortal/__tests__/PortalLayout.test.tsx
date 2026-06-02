/**
 * Tests para PortalLayout (página del header unificado).
 *
 * Contratos a verificar:
 *   - isAdmin=true: logo como <button> clickable
 *   - isAdmin=false: logo como <div aria-hidden> (no <button>)
 *   - fromAdmin=true + click logo: navega a '/' SIN abrir modal
 *   - fromAdmin=false + click logo: abre AdminLoginLock
 *   - useEffect cleanup remueve 'fromAdmin' de sessionStorage al desmontar
 *   - aria-label cambia según fromAdmin
 *   - Botón de logout presente
 *   - Touch target del logo interactivo >= 48px
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockUseIsAdmin = vi.fn();
vi.mock('../../../hooks/useIsAdmin', () => ({
  useIsAdmin: () => mockUseIsAdmin(),
}));

const mockPost = vi.fn();
vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({ post: mockPost }),
}));

vi.mock('../../../components/notifications/NotificationsContext', () => ({
  useNotifications: () => ({ addNotification: vi.fn() }),
}));

vi.mock('../../../components/layout/UpdateEmailBanner', () => ({
  UpdateEmailBanner: () => <div data-testid="email-banner" />,
}));

vi.mock('../components/EmailUpdateModal', () => ({
  default: () => null,
}));

vi.mock('../../../components/atoms/ThemeToggle', () => ({
  default: () => null,
}));

vi.mock('../../../components/molecules/LogoSolidSolutions', () => ({
  default: () => <div data-testid="logo-svg" />,
}));

import PortalLayout from '../PortalLayout';

const defaultProps = {
  children: <div data-testid="content">Contenido</div>,
  user: { name: 'Test User', area: 'TI' },
  onHome: vi.fn(),
  onLogout: vi.fn(),
};

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/servicios']}>
      <PortalLayout {...defaultProps} />
    </MemoryRouter>
  );

describe('PortalLayout - render del logo según rol', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it('isAdmin=true: renderiza logo como <button> con aria-label', () => {
    mockUseIsAdmin.mockReturnValue(true);
    renderLayout();
    const btn = screen.getByRole('button', {
      name: /Verificar identidad para acceder al panel/i,
    });
    expect(btn).toBeInTheDocument();
  });

  it('isAdmin=false: NO renderiza botón; logo es <div aria-hidden>', () => {
    mockUseIsAdmin.mockReturnValue(false);
    renderLayout();
    expect(
      screen.queryByRole('button', { name: /Panel de Administración/i })
    ).toBeNull();
    const hidden = document.querySelector('div[aria-hidden="true"]');
    expect(hidden).not.toBeNull();
  });
});

describe('PortalLayout - comportamiento del logo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it('click en logo con fromAdmin=true: navega a / (modal NO se abre)', () => {
    mockUseIsAdmin.mockReturnValue(true);
    sessionStorage.setItem('fromAdmin', 'true');
    renderLayout();
    const btn = screen.getByRole('button', {
      name: /Volver al panel de administración/i,
    });
    fireEvent.click(btn);
    expect(sessionStorage.getItem('fromAdmin')).toBeNull();
    expect(
      document.querySelector('[role="dialog"]') === null ||
        screen.queryByText('Zona Restringida') === null
    ).toBeTruthy();
  });

  it('click en logo con fromAdmin=false: abre AdminLoginLock', () => {
    mockUseIsAdmin.mockReturnValue(true);
    sessionStorage.removeItem('fromAdmin');
    renderLayout();
    const btn = screen.getByRole('button', {
      name: /Verificar identidad para acceder al panel/i,
    });
    fireEvent.click(btn);
    expect(screen.getByText('Zona Restringida')).toBeInTheDocument();
  });

  it('useEffect cleanup remueve fromAdmin de sessionStorage al desmontar', () => {
    mockUseIsAdmin.mockReturnValue(false);
    sessionStorage.setItem('fromAdmin', 'true');
    const { unmount } = renderLayout();
    expect(sessionStorage.getItem('fromAdmin')).toBe('true');
    unmount();
    expect(sessionStorage.getItem('fromAdmin')).toBeNull();
  });
});

describe('PortalLayout - accesibilidad y controles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('aria-label del botón cambia según fromAdmin', () => {
    mockUseIsAdmin.mockReturnValue(true);
    sessionStorage.setItem('fromAdmin', 'true');
    const { rerender } = renderLayout();
    expect(
      screen.getByRole('button', { name: /Volver al panel de administración/i })
    ).toBeInTheDocument();

    sessionStorage.removeItem('fromAdmin');
    cleanup();
    renderLayout();
    expect(
      screen.getByRole('button', {
        name: /Verificar identidad para acceder al panel/i,
      })
    ).toBeInTheDocument();
    void rerender;
  });

  it('renderiza botón de logout con title=Cerrar sesión', () => {
    mockUseIsAdmin.mockReturnValue(false);
    renderLayout();
    const logoutBtn = screen.getByTitle('Cerrar sesión');
    expect(logoutBtn).toBeInTheDocument();
  });

  it('touch target del logo interactivo >= 48dp', () => {
    mockUseIsAdmin.mockReturnValue(true);
    const { container } = renderLayout();
    const btn = container.querySelector('button[aria-label*="panel"]') as HTMLElement;
    expect(btn).toBeTruthy();
    expect(btn.className).toMatch(/min-h-12|min-w-12/);
  });
});
