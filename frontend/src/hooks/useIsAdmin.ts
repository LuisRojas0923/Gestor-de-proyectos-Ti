/**
 * Hook que indica si el usuario actual tiene rol administrativo
 * para acceder al panel maestro.
 *
 * IMPORTANTE: Esta es una validación de UI (mostrar/ocultar elementos
 * interactivos). La validación de AUTORIZACIÓN real ocurre en el
 * backend vía ServicioAuth.tiene_acceso_panel_admin() en cada request.
 *
 * Si el backend añade un nuevo rol a ROLES_ADMIN_PANEL, debes
 * actualizar:
 * 1. backend_v2/app/core/roles.py
 * 2. frontend/src/constants/roles.ts
 * 3. Este archivo (import automático)
 */
import { useAppContext } from '../context/AppContext';
import { ROLES_ADMIN_PANEL, type RolAdminPanel } from '../constants/roles';

export function useIsAdmin(): boolean {
  const { state } = useAppContext();
  const role = (state.user?.role ?? '').trim().toLowerCase();
  return (ROLES_ADMIN_PANEL as readonly string[]).includes(role);
}

export function useRolAdmin(): RolAdminPanel | null {
  const { state } = useAppContext();
  const role = (state.user?.role ?? '').trim().toLowerCase();
  if ((ROLES_ADMIN_PANEL as readonly string[]).includes(role)) {
    return role as RolAdminPanel;
  }
  return null;
}
