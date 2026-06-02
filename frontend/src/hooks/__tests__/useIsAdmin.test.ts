/**
 * Tests unitarios para useIsAdmin (hook de UI guard).
 *
 * useIsAdmin es un guard de UI (no autorización real). Lee el rol del
 * AppContext y lo compara con ROLES_ADMIN_PANEL.
 *
 * Contrato crítico:
 *   - admin, admin_sistemas, admin_mejoramiento, director, analyst -> true
 *   - manager, viaticante, usuario, '' (vacío) -> false
 *   - useIsAdmin nunca debe lanzar excepción (la autorizacion real es backend)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../../context/AppContext', () => ({
  useAppContext: vi.fn(),
}));

import { useAppContext } from '../../context/AppContext';
import { useIsAdmin, useRolAdmin } from '../useIsAdmin';

const mockUseAppContext = vi.mocked(useAppContext);

const mountConRol = (rol: string | null | undefined) => {
  mockUseAppContext.mockReturnValue({
    state: { user: rol == null ? null : { role: rol } },
  } as any);
};

describe('useIsAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve true para rol admin', () => {
    mountConRol('admin');
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(true);
  });

  it('devuelve true para admin_sistemas / admin_mejoramiento / director / analyst', () => {
    for (const rol of ['admin_sistemas', 'admin_mejoramiento', 'director', 'analyst']) {
      mountConRol(rol);
      const { result } = renderHook(() => useIsAdmin());
      expect(result.current, `rol=${rol}`).toBe(true);
    }
  });

  it('devuelve false para manager (punto clave: manager NO debe pasar UI guard)', () => {
    mountConRol('manager');
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });

  it('devuelve false para usuario / viaticante / roles no administrativos', () => {
    for (const rol of ['usuario', 'viaticante', 'invitado', 'desconocido']) {
      mountConRol(rol);
      const { result } = renderHook(() => useIsAdmin());
      expect(result.current, `rol=${rol}`).toBe(false);
    }
  });

  it('devuelve false cuando user es null', () => {
    mountConRol(null);
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });

  it('devuelve false cuando role es string vacío o solo espacios', () => {
    mountConRol('   ');
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });
});

describe('useRolAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve el rol normalizado si es admin-panel', () => {
    mountConRol('  ADMIN  ');
    const { result } = renderHook(() => useRolAdmin());
    expect(result.current).toBe('admin');
  });

  it('devuelve null si el rol no es admin-panel', () => {
    mountConRol('manager');
    const { result } = renderHook(() => useRolAdmin());
    expect(result.current).toBeNull();
  });
});
