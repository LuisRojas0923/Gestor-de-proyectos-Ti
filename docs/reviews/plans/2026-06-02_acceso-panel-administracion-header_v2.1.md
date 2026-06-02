# Plan v2.1 — Acceso a Administración desde el Header (Definitivo)

**Fecha:** 2026-06-02
**Plan original (v1):** `2026-06-02_acceso-panel-administracion-header.md` (rechazado)
**Plan v2:** `2026-06-02_acceso-panel-administracion-header_v2.md` (aprobado condicionalmente)
**Plan v2.1:** Este documento (integra las 20 condicionales de la 2da revisión)
**Informe de revisión:** `2026-06-02_acceso-panel-administracion-header_REVISIONES.md`
**ADR relacionado:** `docs/decisions/ADR-005-acceso-panel-admin-via-header.md`
**Bitácora:** `docs/bitacora/2026-06-02-acceso-administracion-header.md`
**Modo:** ~~plan → build~~ → **REABIERTO** (build rechazado por scope-reviewer, ver build-review)
**Subagentes que aprobaron:** 5/5 sobre el plan; **4/5 rechazan el build** (backend BLOCKED, frontend REJECTED, security BLOCKED, scope REJECTED)
**Estado build:** [`rejected`](docs/reviews/builds/2026-06-02_acceso-panel-administracion-header_build-review.md) — 4 CRITICAL + 11 HIGH sin resolver

---

## 1. Objetivo

Modificar el flujo de retorno al panel de administración en el Portal de Servicios. Se eliminará el botón físico de retroceso (flecha `ArrowLeft` líneas 51-58 de `PortalLayout.tsx`) y se trasladará su funcionalidad al logotipo de barras (`LogoSolidSolutions`). Al hacer clic en el logo:

1. Si `sessionStorage.fromAdmin === 'true'` (lectura lazy), se redirige directamente al panel (`/`) **sin mostrar el modal** (reformulado: es solo UX, no auth real).
2. Si no, se despliega el modal `AdminLoginLock` (movido a `components/molecules/` con a11y completa) para verificar contraseña.
3. Solo usuarios con `useIsAdmin()` = true pueden interactuar; los demás ven `<div aria-hidden>` estático.

**Cambio de alcance (vs v1):** whitelist derivada de RBAC dinámico, `manager` fuera por defecto, 41 tests obligatorios, **3 endpoints con `payload: dict` migrados a Pydantic** (1 prioritario `/verify-admin` + 2 restantes en `config_router.py`), 5 `print()` migrados a `logger.error()`, bcrypt envuelto en `asyncio.to_thread()`, schema con `min_length=8`.

---

## 2. No-objetivos

- No se modifica el flujo de Login principal ni los tokens JWT.
- No se cambian otros modales (viáticos, reset forzado).
- No se refactorizan routers legacy fuera de `config_router.py` (deuda técnica documentada).
- No se migra el sistema de sessionStorage a cookies HttpOnly (roadmap futuro).

---

## 3. Criterios de Aceptación (medibles — 10 CAs)

| CA# | Criterio | Verificación |
|---|---|---|
| CA1 | Usuario admin autenticado, con `fromAdmin=true` en sessionStorage, hace clic en logo → navega a `/` **sin mostrar el modal `AdminLoginLock`** (reformulado: la re-validación real ocurre en cada endpoint protegido) | Test E2E + manual |
| CA2 | Usuario admin autenticado, con `fromAdmin=null`, hace clic en logo → abre `AdminLoginLock` | Test E2E + manual |
| CA3 | Usuario NO admin ve el logo como `<div aria-hidden>` estático (no `<button>`) | Vitest + axe |
| CA4 | `POST /api/v2/config/verify-admin` con rol `admin` y password válida → 200; password inválida → 401; rol `usuario` → 403 | Pytest (13 tests) |
| CA5 | `sessionStorage.fromAdmin` se limpia en logout en los 4 handlers identificados: `AppContext.tsx` (LOGOUT), `Sidebar.tsx`, `ServicePortal.tsx`, y `useEffect` cleanup de `PortalLayout` | Vitest (9 tests) |
| CA6 | El modal `AdminLoginLock` cierra con `Escape`, atrapa foco, tiene `role="dialog"` + `aria-modal="true"`, usa `createPortal`, bloquea scroll | Vitest + axe (9 tests) |
| CA7 | Rate limiting en `/verify-admin`: 5 fallos en 5 minutos → 429 (key_func combina `usuario_id:ip`) | Pytest (1 test) |
| CA8 | Cada intento (éxito/fallo) en `/verify-admin` genera registro en `auditoria_evento` con ip, user_agent, resultado, motivo. **Nunca** se loguea la contraseña | Pytest (3 tests) |
| CA9 | Touch target del logo interactivo ≥ 48dp (test con `getBoundingClientRect().height >= 48`) | Vitest (1 test) |
| CA10 | `npm run build` y `docker compose exec backend pytest` pasan sin errores | CI |

---

## 4. Trazabilidad

- **Origen:** UX-298 "Simplificar retorno al panel admin" (issue interno, creado al iniciar implementación)
- **Plan v1 rechazado:** `2026-06-02_acceso-panel-administracion-header.md`
- **Plan v2 aprobado condicionalmente:** `2026-06-02_acceso-panel-administracion-header_v2.md`
- **Decisión arquitectural:** `docs/decisions/ADR-005-acceso-panel-admin-via-header.md`
- **Informe de revisión:** `2026-06-02_acceso-panel-administracion-header_REVISIONES.md`

### Rollback plan

1. `git revert <commit-hash>` + redeploy automático
2. Mitigación backend: restaurar `if usuario_actual.rol != "admin":` en `config_router.py` (1 línea)
3. Mitigación frontend: el logo queda como `<div>` estático (no interactivo) → no hay degradación crítica

---

## 5. Archivos / módulos afectados

### 5.1 Crear (13 nuevos)

**Backend:**
- `backend_v2/app/core/roles.py` — SSOT de constantes seed (documentación, no autorización runtime)
- `backend_v2/app/models/auth/auditoria_evento.py` — modelo SQLModel
- `backend_v2/app/core/migrations/auditoria_evento_migration.py` — **NO Alembic** (N1)
- `backend_v2/app/core/migrations/manager.py` — modificar para invocar la migración
- `testing/backend/test_verify_admin_whitelist.py` — 13 tests
- `testing/backend/test_verify_admin_security.py` — 8 tests

**Frontend:**
- `frontend/src/hooks/useIsAdmin.ts` — hook centralizado
- `frontend/src/hooks/__tests__/useIsAdmin.test.ts` — 3 tests
- `frontend/src/components/molecules/AdminLoginLock.tsx` — **movido** desde `pages/Settings/components/`
- `frontend/src/components/molecules/__tests__/AdminLoginLock.test.tsx` — 9 tests
- `frontend/src/pages/ServicePortal/__tests__/PortalLayout.test.tsx` — 8 tests
- `frontend/src/constants/roles.ts` — espejo frontend del SSOT backend (N1 docs-tests)

**Docs:**
- `docs/bitacora/2026-06-02-acceso-administracion-header.md` (ya creado)
- `docs/decisions/ADR-005-acceso-panel-admin-via-header.md` (ya creado)

### 5.2 Modificar (12 archivos)

**Backend (7):**
- `backend_v2/app/api/auth/config_router.py` — schema Pydantic (5 endpoints), RBAC dinámico, rate limit, audit log, `request: Request`, `asyncio.to_thread(bcrypt)`, migrar `print()` a `logger.error()` (A1, A2, A3)
- `backend_v2/app/services/auth/servicio.py` — añadir `tiene_acceso_panel_admin`, `registrar_verificacion_panel`
- `backend_v2/app/main.py` — middleware slowapi + handler `RateLimitExceeded`
- `backend_v2/requirements.txt` — añadir `slowapi`
- `backend_v2/app/core/rbac_manifest.py` — registrar entrada de `verify-admin` y categoría `panel` (N2 docs-tests)
- `backend_v2/app/core/migrations/manager.py` — invocar migración `auditoria_evento`
- `backend_v2/app/core/config.py` (si existe) — variable `VERIFY_ADMIN_RATE_LIMIT` con default 5/5min

**Frontend (5):**
- `frontend/src/pages/ServicePortal/PortalLayout.tsx` — refactor completo (eliminar flecha líneas 51-58, añadir `<Button>` atom con aria-label, lazy init, useCallback, useEffect cleanup, touch target ≥48dp)
- `frontend/src/pages/Settings.tsx` — actualizar import de `AdminLoginLock`
- `frontend/src/components/auth/ProtectedRoute.tsx` — usar `useIsAdmin()` (eliminar `manager` por R-NEW-2)
- `frontend/src/components/Router.tsx` — usar `useIsAdmin()` (eliminar `manager` por R-NEW-2)
- `frontend/src/components/layout/Sidebar.tsx` — usar `useIsAdmin()` (eliminar `manager` por R-NEW-2) + limpiar `fromAdmin` en logout
- `frontend/src/context/AppContext.tsx` — limpiar `fromAdmin` en LOGOUT
- `frontend/src/pages/ServicePortal/ServicePortal.tsx` — limpiar `fromAdmin` en logout
- `frontend/src/components/layout/Layout.tsx` — eliminar setter legacy de `fromAdmin` línea 43 (N4 docs-tests)
- `frontend/src/components/atoms/Button.tsx` — añadir prop opcional `aria-label` (extensión mínima)

### 5.3 Eliminar (1)
- `frontend/src/pages/Settings/components/AdminLoginLock.tsx` — movido a molecules/ (commit atómico con `git mv` para preservar historial)

### 5.4 Documentación a actualizar (4)
- `docs/ESQUEMA_BASE_DATOS.md` — añadir tabla `auditoria_evento` con Mermaid (N1 docs-tests)
- `docs/ARQUITECTURA_FRONTEND.md` — documentar patrón "logo como retorno seguro"
- `testing/CATALOGO_PRUEBAS.md` — registrar 2 nuevas suites backend
- `errors_memory.json` — registrar decisión D2 (RBAC dinámico) y D4 (rate limit) como anti-deuda

---

## 6. Pasos de Implementación (orden TDD estricto)

### Fase 0 — Preparación y docs (1-2h)

1. Crear issue UX-298 en tracker
2. Crear `docs/ESQUEMA_BASE_DATOS.md` entry placeholder para `auditoria_evento` (N1 docs-tests pre-emptivo)
3. Bitácora y ADR-005 ya existen ✅

### Fase 1 — Backend (TDD, 6-8h)

4. **Verificar seed:** `manager` NO tiene permisos `categoria='panel'` ni `'analistas'` en `PermisoRol` (N15 backend) — si los tiene, quitarlos antes de continuar
5. Crear `backend_v2/app/core/roles.py` con constante `ROLES_SEED = frozenset([...])` documentada como solo-semilla (N2 backend)
6. Crear `backend_v2/app/models/auth/auditoria_evento.py` con shape:
   ```python
   class AuditoriaEvento(SQLModel, table=True):
       id: Optional[int] = Field(default=None, primary_key=True)
       timestamp: datetime = Field(default_factory=datetime.utcnow)
       usuario_id: str
       rol: str
       direccion_ip: Optional[str] = Field(max_length=45)
       agente_usuario: Optional[str] = Field(default=None, sa_column=Column(Text))
       resultado: str = Field(max_length=30)  # 'exito' | 'fallo_contrasena' | 'fallo_sin_permiso' | 'rate_limit_excedido'
       motivo: Optional[str] = Field(default=None, sa_column=Column(Text))
       endpoint: str = Field(default="/api/v2/config/verify-admin", max_length=100)
   ```
   Índice: `Index('idx_auditoria_usuario_ts', 'usuario_id', 'timestamp')` (N3 backend)
7. Crear `backend_v2/app/core/migrations/auditoria_evento_migration.py` con `crear_tabla_auditoria_evento(conn)` (N1 backend)
8. Modificar `backend_v2/app/core/migrations/manager.py` para invocar la nueva migración
9. **TDD ROJO backend RBAC:** Crear `testing/backend/test_verify_admin_whitelist.py` con 13 tests → ejecutar → ver 13 fallos
10. Añadir `ServicioAuth.tiene_acceso_panel_admin(db, usuario)` con RBAC dinámico + `ServicioAuth.registrar_verificacion_panel(db, ...)` con `try/except` que NO falla el flujo (N5 backend)
11. **TDD VERDE backend RBAC:** Refactorizar `config_router.py` con schema Pydantic `VerifyAdminRequest(password: str = Field(min_length=8, max_length=128))` + `request: Request` + RBAC dinámico + `asyncio.to_thread(bcrypt)` → ver 13 PASS (A3, A4 security)
12. **Migrar los 5 `print()` a `logger.error()`** en el mismo refactor (A2 security)
13. **Migrar los 2 `payload: dict` restantes** (líneas 114, 204) a schemas Pydantic (A1 security)
14. **TDD ROJO backend security:** Crear `testing/backend/test_verify_admin_security.py` con 8 tests → ver fallos
15. **TDD VERDE backend security:** Añadir slowapi middleware con `key_func = lambda: f"{current_user.id}:{request.client.host}"` y `RateLimitExceeded` handler → ver 8 PASS (N6 backend + A4 security)
16. Añadir `slowapi` a `requirements.txt` y variable `VERIFY_ADMIN_RATE_LIMIT` en config (N6 backend)
17. Refactorizar `rbac_manifest.py` con entrada del módulo (N2 docs-tests)

### Fase 2 — Frontend (TDD, 6-8h)

18. **Verificar que no hay otros archivos con `manager`** en listas administrativas fuera del scope (4 archivos declarados): crear ticket de seguimiento para los 5 restantes (R-NEW-1 frontend)
19. Crear `frontend/src/constants/roles.ts` exportando `ADMIN_ROLES` (espejo del backend, N1 docs-tests)
20. Crear `frontend/src/hooks/useIsAdmin.ts` con tests (3 tests)
21. **TDD ROJO a11y:** Crear `frontend/src/components/molecules/AdminLoginLock.tsx` (con `git mv` desde `pages/Settings/components/`) con a11y completa: `createPortal` + `role="dialog"` + `aria-modal="true"` + focus-trap + Escape + scroll-lock + 9 tests → ver fallos
22. **TDD VERDE a11y:** Implementar `AdminLoginLock` → ver 9 PASS
23. Actualizar import en `frontend/src/pages/Settings.tsx` (línea 13)
24. Eliminar `frontend/src/pages/Settings/components/AdminLoginLock.tsx`
25. Refactorizar 4 archivos frontend (`ProtectedRoute.tsx`, `Router.tsx`, `Sidebar.tsx`, `PortalLayout.tsx`) para usar `useIsAdmin()` — **eliminando `manager` explícitamente** (R-NEW-2 frontend)
26. **TDD ROJO PortalLayout:** Crear `frontend/src/pages/ServicePortal/__tests__/PortalLayout.test.tsx` con 9 tests (los 8 originales + touch target ≥48dp) → ver fallos
27. **TDD VERDE PortalLayout:** Refactorizar `PortalLayout.tsx`:
    - Eliminar bloque JSX de líneas 51-58 (`<Button icon={ArrowLeft}>`) (R-NEW-4 frontend)
    - Envolver `LogoSolidSolutions` en `<Button>` atom con `aria-label`, `min-h-12 min-w-12 p-2` (R-NEW-5 frontend)
    - Inicialización lazy: `useState(() => sessionStorage.getItem('fromAdmin') === 'true')`
    - `handleLogoClick` y `handleAdminUnlock` con `useCallback`
    - `useEffect(() => () => sessionStorage.removeItem('fromAdmin'), [])` cleanup (R-NEW-3 frontend)
    - Si `!isAdmin`: renderizar `<div aria-hidden>` con el logo (CA3)
    → ver 9 PASS
28. Añadir `sessionStorage.removeItem('fromAdmin')` en 4 lugares: `AppContext.tsx` LOGOUT, `Sidebar.tsx` `handleLogout`, `ServicePortal.tsx` `onLogout`, `PortalLayout.tsx` useEffect cleanup (N4 docs-tests)
29. Eliminar setter legacy en `frontend/src/components/layout/Layout.tsx:43` (N4 docs-tests)
30. Añadir prop opcional `aria-label` a `frontend/src/components/atoms/Button.tsx` (extensión mínima)

### Fase 3 — Validación y cierre (2-3h)

31. `cd frontend && npm run lint && npm run test -- --run && npm run build`
32. `docker compose exec backend pytest testing/backend/ -v`
33. Verificación manual con axe DevTools del flujo logo→modal
34. Actualizar `docs/ESQUEMA_BASE_DATOS.md` con tabla `auditoria_evento` (Mermaid) (N1 docs-tests)
35. Actualizar `docs/ARQUITECTURA_FRONTEND.md` con patrón "logo como retorno seguro"
36. Actualizar `testing/CATALOGO_PRUEBAS.md` con 2 nuevas suites (8 columnas)
37. Actualizar `errors_memory.json` con decisiones D2 (RBAC dinámico) y D4 (rate limit)
38. Cerrar bitácora con resultados de implementación + métricas finales

---

## 7. Comandos de Validación (corregidos Docker)

```bash
# Backend
docker compose up -d postgres
docker compose exec backend python -m app.core.migrations.manager init
docker compose exec backend pytest testing/backend/test_verify_admin_whitelist.py -v
docker compose exec backend pytest testing/backend/test_verify_admin_security.py -v
docker compose exec backend pytest testing/backend/ -v

# Frontend
cd frontend
npm run lint
npm run test -- --run
npm run build

# Verificación manual
# - Abrir navegador como admin, ir a /service-portal/inventario
# - Click en logo → debe abrir AdminLoginLock
# - Ingresar password válida → modal cierra, navega a /
# - Repetir con fromAdmin='true' pre-seteado → debe ir directo a /
# - axe DevTools: 0 violaciones en el flujo
```

---

## 8. Matriz de Subagentes (estado final v2.1)

| Subagente | v1 | v2 | v2.1 (final) |
|---|---|---|---|
| `scope-reviewer` | approved_with_conditions | approved_with_risks | **approved** |
| `security-rbac-reviewer` | rejected | approved_with_conditions | **approved** |
| `backend-reviewer` | blocked | approved_with_conditions | **approved** |
| `frontend-reviewer` | blocked | approved_with_risks | **approved** |
| `docs-tests-reviewer` | rejected | approved_with_conditions | **approved** |

**Resultado v2.1:** 5/5 subagentes aprueban sin bloqueantes.

---

## 9. Riesgos y Mitigaciones (consolidado final)

| # | Riesgo | Mitigación | Severidad residual |
|---|---|---|---|
| R1 | `manager` se cuele vía `categoria='analistas'` | Pre-check en Fase 1 paso 4 + 1 test explícito (`test_manager_sin_permiso_panel_rechazado_403`) | BAJA |
| R2 | `fromAdmin` no se limpia en logout | Limpieza en 4 lugares + 9 tests | BAJA |
| R3 | Sin rate limit ni audit log | slowapi + tabla `auditoria_evento` + 8 tests security | BAJA |
| R4 | `<button>` raw violando design system | Refactor con átomo `<Button>` + aria-label + focus-visible | BAJA |
| R5 | `AdminLoginLock` no accesible | createPortal + focus-trap + Escape + role/aria-modal + scroll-lock + 9 tests a11y | BAJA |
| R6 | Inversión de dependencias entre páginas | Mover a `components/molecules/` con `git mv` + actualizar import | BAJA |
| R7 | Sin tests | 41 tests nuevos (TDD obligatorio) | BAJA |
| R8 | Regresión visual usuarios no-admin | Logo envuelto en `<div aria-hidden>` cuando `!isAdmin` (CA3 + test) | BAJA |
| R9 | SSOT de roles duplicado (5+ archivos) | `backend_v2/app/core/roles.py` + `frontend/src/hooks/useIsAdmin.ts` + `frontend/src/constants/roles.ts` (refactor parcial de 4 archivos; ticket de seguimiento para los 5 restantes) | MEDIA |
| R10 | Bitácora/ADR inexistentes | Creados ANTES de implementación (Fase 0) | BAJA |
| R11 | Alembic no es el sistema de migraciones | Usar `app/core/migrations/manager.py` (N1 backend) | BAJA |
| R12 | bcrypt bloquea event loop | `asyncio.to_thread(bcrypt.checkpw)` (A3 security) | BAJA |
| R13 | `print()` y `payload: dict` en el mismo router | Migrar 5 `print()` y 2 `payload: dict` en el mismo refactor (A1+A2 security) | BAJA |
| R14 | `rbac_manifest.py` no actualizado | Paso 17 Fase 1 (N2 docs-tests) | BAJA |
| R15 | CA1 contradice ADR-005 | Reformulado: "sin mostrar el modal" (N3 docs-tests) | BAJA |
| R16 | `Layout.tsx:43` setter legacy | Eliminar en paso 29 (N4 docs-tests) | BAJA |
| R17 | Schema sin `min_length` | `Field(min_length=8, max_length=128)` (A4 security) | BAJA |
| R18 | slowapi no en `requirements.txt` | Paso 16 Fase 1 (N6 backend) | BAJA |
| R19 | `errors_memory.json` desactualizado | Paso 37 Fase 3 (N2 docs-tests) | BAJA |
| R20 | `ESQUEMA_BASE_DATOS.md` desactualizado | Pasos 2 + 34 Fase 3 (N1 docs-tests) | BAJA |

---

## 10. Decisión final

- [x] `aprobado` (5/5 subagentes aprueban sin bloqueantes)

---

## 11. Notas adicionales

- **Pre-check obligatorio:** verificar que `manager` no tenga permisos `panel`/`analistas` en `PermisoRol` antes de empezar (Fase 1 paso 4). Si los tiene, el cambio queda invalidado y se reabre la decisión D2 del ADR-005.
- **`git mv` para preservar historial:** `AdminLoginLock` se mueve con `git mv frontend/src/pages/Settings/components/AdminLoginLock.tsx frontend/src/components/molecules/AdminLoginLock.tsx` ANTES de refactorizar.
- **Commit atómico:** idealmente un solo PR con 3 commits: (1) backend, (2) frontend, (3) docs. O bien commits atómicos por capa (services, models, migrations, routers, hooks, components, tests).
- **Post-deploy:** monitorizar `/metrics` durante 24h para detectar anomalías en `/verify-admin` (picos de 401/403/429).
- **Roadmap futuro (NO en alcance):** migrar a cookies HttpOnly + CSRF tokens, 2FA para roles administrativos, token de corta duración para `/verify-admin`.
