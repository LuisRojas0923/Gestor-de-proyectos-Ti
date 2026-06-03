/**
 * SSOT (Single Source of Truth) espejo frontend de `backend_v2/app/core/roles.py`.
 *
 * IMPORTANTE: Mantener sincronizado con el backend. Si añades un rol
 * nuevo, actualiza AMBOS archivos y el test test_roles_ssot_syncronizado
 * en el backend.
 *
 * Esta constante es DOCUMENTATIVA: la autorización real siempre se valida
 * en el backend vía ServicioAuth.tiene_acceso_panel_admin(). Esta lista
 * se usa SOLO para el guard de UI (mostrar/ocultar elementos interactivos).
 */

export const ROLES_SEED = [
  'admin',
  'admin_sistemas',
  'admin_mejoramiento',
  'director',
  'analyst',
  'manager',
  'viaticante',
  'usuario',
] as const;

export const ROLES_ADMIN_PANEL = [
  'admin',
  'admin_sistemas',
  'admin_mejoramiento',
  'director',
  'analyst',
] as const;

export type RolSeed = (typeof ROLES_SEED)[number];
export type RolAdminPanel = (typeof ROLES_ADMIN_PANEL)[number];

export function esRolValido(rol: string): rol is RolSeed {
  return (ROLES_SEED as readonly string[]).includes(rol);
}
