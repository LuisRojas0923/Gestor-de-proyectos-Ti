# Plan v2 — Acceso a Administración desde el Header (Refactorizado)

**Fecha:** 2026-06-02
**Plan original:** `2026-06-02_acceso-panel-administracion-header.md` (rechazado por 4/5 subagentes)
**Informe de revisión:** `2026-06-02_acceso-panel-administracion-header_REVISIONES.md`
**Autor del plan v2:** opencode (integración de feedback de 5 subagentes)
**ADR relacionado:** `docs/decisions/ADR-005-acceso-panel-admin-via-header.md`
**Bitácora:** `docs/bitacora/2026-06-02-acceso-administracion-header.md`
**Modo:** plan → build (pendiente de aprobación de los 5 subagentes)

---

## 1. Objetivo

Modificar el flujo de retorno al panel de administración en el Portal de Servicios. Se eliminará el botón físico de retroceso (flecha `ArrowLeft`) en el header y se trasladará su funcionalidad al logotipo de barras (`LogoSolidSolutions`). Al hacer clic en el logo:

1. Si el usuario ya verificó su identidad en la sesión actual (`sessionStorage.fromAdmin === 'true'`), se redirige directamente al panel (`/`).
2. Si no, se despliega el modal de seguridad `AdminLoginLock` para verificar contraseña.
3. Solo usuarios con `useIsAdmin()` = true pueden interactuar con el logo; los demás ven el logo estático.

**Cambio de alcance (vs v1):** se reduce la whitelist de roles de 6 a 5 (se quita `manager` por inconsistencia con `ProtectedRoute.tsx`), se añade `manager` a `ProtectedRoute.tsx` solo si se justifica individualmente, se delega la decisión a RBAC dinámico via `PermisoRol.categoria='panel'`.

---

## 2. No-objetivos

- No se modifica el flujo de Login principal ni los tokens JWT.
- No se cambian otros modales (viáticos, reset forzado).
- No se introduce `manager` en el panel admin si `ProtectedRoute.tsx` no lo reconoce.

---

## 3. Criterios de Aceptación (medibles)

| CA# | Criterio | Verificación |
|---|---|---|
| CA1 | Usuario admin autenticado, con `fromAdmin=true` en sessionStorage, hace clic en logo → navega a `/` sin modal | Test E2E + manual |
| CA2 | Usuario admin autenticado, con `fromAdmin=null`, hace clic en logo → abre `AdminLoginLock` | Test E2E + manual |
| CA3 | Usuario NO admin ve el logo como elemento estático (no `<button>`) | Vitest + axe |
| CA4 | `POST /api/v2/config/verify-admin` con rol `admin` y password válida → 200; password inválida → 401; rol `usuario` → 403 | Pytest (13 tests) |
| CA5 | `sessionStorage.fromAdmin` se limpia en logout en los 3 handlers identificados | Vitest |
| CA6 | El modal `AdminLoginLock` cierra con `Escape`, atrapa foco, tiene `role="dialog"` + `aria-modal="true"`, usa `createPortal`, bloquea scroll | Vitest + axe |
| CA7 | Rate limiting en `/verify-admin`: 5 fallos en 5 minutos → 429 | Pytest |
| CA8 | Cada intento (éxito/fallo) en `/verify-admin` genera registro en `auditoria_eventos` con ip, user_agent, resultado | Pytest |
| CA9 | Touch target del logo interactivo ≥ 48dp (Material) | Inspección CSS |
| CA10 | `npm run build` y `docker compose exec backend pytest` pasan sin errores | CI |

---

## 4. Trazabilidad

- **Origen:** UX-298 "Simplificar retorno al panel admin" (issue interno pendiente de crear)
- **Plan v1 rechazado:** `2026-06-02_acceso-panel-administracion-header.md`
- **Decisión arquitectural:** `docs/decisions/ADR-005-acceso-panel-admin-via-header.md`

### Rollback plan

1. `git revert <commit-hash>` + redeploy automático
2. Mitigación en caliente: si el endpoint falla, restaurar `if usuario_actual.rol != "admin":` (1 línea) en `config_router.py`
3. Si el frontend rompe: el logo queda como `<div>` estático (no interactivo) → no hay degradación crítica

---

## 5. Archivos / módulos afectados

### 5.1 Crear (nuevos)
- `backend_v2/app/core/roles.py` — SSOT de constantes de roles
- `backend_v2/app/models/auth/auditoria_evento.py` — tabla de auditoría
- `testing/backend/test_verify_admin_whitelist.py` — 13 tests
- `testing/backend/test_verify_admin_security.py` — 8 tests de seguridad
- `frontend/src/hooks/useIsAdmin.ts` — hook centralizado
- `frontend/src/components/molecules/AdminLoginLock.tsx` — movido desde `pages/Settings/components/`
- `frontend/src/components/molecules/__tests__/AdminLoginLock.test.tsx` — 9 tests a11y
- `frontend/src/pages/ServicePortal/__tests__/PortalLayout.test.tsx` — 8 tests
- `frontend/src/hooks/__tests__/useIsAdmin.test.ts` — 3 tests
- `docs/bitacora/2026-06-02-acceso-administracion-header.md`
- `docs/decisions/ADR-005-acceso-panel-admin-via-header.md`

### 5.2 Modificar
- `backend_v2/app/api/auth/config_router.py` — schema Pydantic, RBAC dinámico, rate limit, audit log
- `backend_v2/app/services/auth/servicio.py` — método `tiene_acceso_panel_admin`, `registrar_verificacion_panel`
- `backend_v2/app/main.py` — middleware slowapi
- `backend_v2/alembic/versions/XXXX_auditoria_evento.py` — migración
- `frontend/src/pages/ServicePortal/PortalLayout.tsx` — refactor completo
- `frontend/src/pages/Settings.tsx` — actualizar import de AdminLoginLock
- `frontend/src/pages/Settings/components/AdminLoginLock.tsx` — deprecado → redirect al nuevo
- `frontend/src/components/auth/ProtectedRoute.tsx` — usar `useIsAdmin()`
- `frontend/src/components/Router.tsx` — usar `useIsAdmin()`
- `frontend/src/components/layout/Sidebar.tsx` — usar `useIsAdmin()` + limpiar `fromAdmin` en logout
- `frontend/src/context/AppContext.tsx` — limpiar `fromAdmin` en LOGOUT
- `frontend/src/pages/ServicePortal/ServicePortal.tsx` — limpiar `fromAdmin` en logout
- `testing/CATALOGO_PRUEBAS.md` — registrar nueva suite

### 5.3 Eliminar
- `frontend/src/pages/Settings/components/AdminLoginLock.tsx` (movido)
- Lista hardcodeada de roles en 4 archivos frontend + 1 backend

---

## 6. Pasos de Implementación (orden TDD)

### Fase 0 — Preparación
1. Crear `docs/bitacora/2026-06-02-acceso-administracion-header.md` con estado inicial
2. Crear `docs/decisions/ADR-005-acceso-panel-admin-via-header.md` con decisión final

### Fase 1 — Backend (TDD)
3. Crear `backend_v2/app/core/roles.py` con constantes
4. Crear modelo `AuditoriaEvento` y migración Alembic
5. **TDD ROJO**: Crear `testing/backend/test_verify_admin_whitelist.py` con 13 tests → ejecutar → ver 13 fallos
6. **TDD VERDE**: Refactorizar `config_router.py` con schema Pydantic + RBAC dinámico → ejecutar → ver 13 PASS
7. Añadir `ServicioAuth.tiene_acceso_panel_admin()` y `registrar_verificacion_panel()`
8. **TDD ROJO**: Crear `testing/backend/test_verify_admin_security.py` con 8 tests de seguridad (rate limit, audit log, sin leak de password) → ejecutar → ver fallos
9. **TDD VERDE**: Añadir middleware slowapi + integración con audit log → ejecutar → ver PASS
10. Refactorizar `admin_router.py` y otros routers para consumir `roles.ROLES_ADMINISTRATIVOS`

### Fase 2 — Frontend (TDD)
11. Crear `frontend/src/hooks/useIsAdmin.ts` con tests
12. Refactorizar `ProtectedRoute.tsx`, `Router.tsx`, `Sidebar.tsx`, `PortalLayout.tsx` para usar `useIsAdmin()`
13. **TDD ROJO**: Crear `frontend/src/components/molecules/AdminLoginLock.tsx` con a11y completa (portal, focus-trap, Escape, role, scroll-lock) y 9 tests → ver fallos
14. **TDD VERDE**: Implementar AdminLoginLock → ver PASS
15. Actualizar `Settings.tsx` para importar desde nueva ubicación
16. **TDD ROJO**: Crear `frontend/src/pages/ServicePortal/__tests__/PortalLayout.test.tsx` con 8 tests (logo interactivo, modal, navegación, lazy init) → ver fallos
17. **TDD VERDE**: Refactorizar `PortalLayout.tsx` con `<Button>` atom, `aria-label`, `useCallback`, lazy init → ver PASS
18. Añadir `sessionStorage.removeItem('fromAdmin')` en 3 lugares de logout + tests

### Fase 3 — Validación
19. `cd frontend && npm run build && npm run lint && npm run test`
20. `docker compose exec backend pytest testing/backend/ -v`
21. Verificar manualmente con axe DevTools el flujo logo + modal
22. Actualizar `testing/CATALOGO_PRUEBAS.md`
23. Cerrar bitácora con resumen + evidencia

---

## 7. Comandos de Validación (corregidos)

```bash
# Backend
docker compose up -d postgres
docker compose exec backend alembic upgrade head
docker compose exec backend pytest testing/backend/test_verify_admin_whitelist.py -v
docker compose exec backend pytest testing/backend/test_verify_admin_security.py -v
docker compose exec backend pytest testing/backend/ -v

# Frontend
cd frontend
npm run lint
npm run test
npm run build
```

---

## 8. Matriz de Subagentes (re-ejecución post-correcciones)

| Subagente | Estado esperado tras correcciones |
|---|---|
| `scope-reviewer` | `approved` |
| `backend-reviewer` | `approved_with_risks` (riesgos aceptados) |
| `frontend-reviewer` | `approved_with_risks` (riesgos aceptados) |
| `security-rbac-reviewer` | `approved_with_risks` (rate limit + audit + RBAC dinámico) |
| `docs-tests-reviewer` | `approved` (bitácora + ADR + tests + catálogo) |

---

## 9. Riesgos y Mitigaciones (actualizado)

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | `manager` en whitelist sin justificación | Se quita del plan; se documenta en ADR-005 que cualquier adición futura debe justificarse individualmente |
| R2 | `fromAdmin` no se limpia en logout | Tests en 3 archivos de logout + `useEffect` cleanup en PortalLayout |
| R3 | Sin rate limit ni audit log en `/verify-admin` | slowapi + tabla `auditoria_evento` + tests |
| R4 | `<button>` raw violando design system | Refactor con átomo `<Button>` + aria-label + focus-visible |
| R5 | `AdminLoginLock` no accesible | createPortal + focus-trap + Escape + role/aria-modal + scroll-lock |
| R6 | Inversión de dependencias entre páginas | Mover a `components/molecules/` + actualizar import en `Settings.tsx` |
| R7 | Sin tests | TDD obligatorio: 13 backend + 8 security + 8 frontend + 9 a11y + 3 hook = **41 tests** |
| R8 | Regresión visual usuarios no-admin | Logo envuelto en `<div aria-hidden>` cuando `!isAdmin` (verificable en test) |
| R9 | SSOT de roles duplicado | `backend_v2/app/core/roles.py` + `frontend/src/hooks/useIsAdmin.ts` |
| R10 | Bitácora/ADR inexistentes | Crear ANTES de la implementación (Fase 0) |

---

## 10. Decisión final

- [ ] `aprobado` (pendiente de re-revisión de los 5 subagentes)

---

## 11. Notas adicionales

- **Decisión clave:** `manager` se quita de la whitelist. Cualquier adición futura de roles administrativos debe seguir el flujo: añadir al seed `RolSistema` → asignar permisos `categoria='panel'` vía UI de admin → el endpoint los aceptará automáticamente vía RBAC dinámico. Documentado en `ADR-005`.
- **Compatibilidad:** el contrato HTTP de `/verify-admin` no cambia (request `{password: str}`, response `{success: bool, message: str}`), evitando romper clientes.
- **Migración segura:** la tabla `auditoria_evento` es nueva y no afecta flujos existentes. Se puede desplegar antes del cambio de lógica.
- **Post-deploy:** monitorizar `/metrics` para detectar picos de 401/403/429 en `/verify-admin` durante las primeras 24h.
