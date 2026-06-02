# Build Review — Acceso a Administración desde el Header (Delta v2.1 → Real)

**Fecha:** 2026-06-02
**Build:** Refactor header portal — logo como retorno seguro + RBAC dinámico `/verify-admin`
**Plan aprobado:** `docs/reviews/plans/2026-06-02_acceso-panel-administracion-header_v2.1.md`
**Bitácora:** `docs/bitacora/2026-06-02-acceso-administracion-header.md`
**Subagente:** `scope-reviewer` (segunda pasada, modo build)
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Resumen ejecutivo

El plan v2.1 (5/5 subagentes aprobaron) **NO se implementó fielmente**. El build ejecutado entre 12:00-13:40 del 2026-06-02 parcheó 3 bugs runtime y reportó "8 tests unitarios PASAN + 17 E2E SKIPPED + build frontend OK", pero la auditoría de código y los 4 subagentes especializados revelaron que:

- **2 hallazgos CRÍTICOS** nuevos no resueltos (rate limit inerte, manager pasa por `analistas`).
- **4 hallazgos HIGH** nuevos (dead code, ModuloToggleRequest sin min_length, 3 archivos FE no refactorizados, fromAdmin cleanup race).
- **6 hallazgos MEDIUM** (enum drift, barrel index, useCallback, ServicePortal.tsx inexistente, etc.).
- **0/20 tests frontend** (los archivos de test no existen).
- **Bitácora inflada**: "8 PASS" es engañoso (3 son stubs `pytest.skip` con la misma firma).

**Veredicto scope-reviewer:** `rejected` (reabrir a `plan` y resolver bloqueantes antes de merge).

---

## 2. Tabla consolidada de hallazgos por subagente

### 2.1 Backend-reviewer (BLOCKED)

| # | Hallazgo | Severidad | Estado real |
|---|---|---|---|
| B1 | Schema Pydantic con `min_length=8` | HIGH | ✅ Resuelto (`VerificarAccesoRequest`) |
| B2 | `ModuloToggleRequest.password_verificacion: str` sin `min_length` | HIGH | ❌ **Sigue sin min_length** (línea 246 de `usuario.py`) |
| B3 | `key_func` siempre devuelve `"anonimo:ip"` porque `request.state.usuario_id` nunca se setea | **CRITICAL** | ❌ **Sigue roto** (`_verify_admin_key_func` lee `getattr(request.state, "usuario_id", "anonimo")` que SIEMPRE es "anonimo") |
| B4 | `pass` muerto en `toggle_modulo_global` (líneas 202-203) | HIGH | ❌ **Sigue ahí** (código confirmado: `if modulo.es_critico and not payload.esta_activo: pass`) |
| B5 | Migración 5 `print()` → `logger.error()` | HIGH | ✅ Resuelto (0 `print()` en `config_router.py`) |
| B6 | Migrar 2 `payload: dict` restantes | MEDIUM | ✅ Resuelto (3 schemas Pydantic nuevos en `config_router.py`) |
| B7 | `headers_enabled=False` no documentado | MEDIUM | ⚠️ Parcial (está en código pero sin doc en plan) |

### 2.2 Frontend-reviewer (REJECTED)

| # | Hallazgo | Severidad | Estado real |
|---|---|---|---|
| F1 | `fromAdmin` flag inerte por race entre SET y cleanup | **CRITICAL** | ❌ **Sigue roto** (cleanup fires on unmount → puede borrar flag recién seteado en React StrictMode dev) |
| F2 | 3 archivos FE (ProtectedRoute, Router, Sidebar) sin refactor — `manager` sigue presente | HIGH | ❌ **Sigue ahí** (`grep` confirma `manager` en los 3 + 6 archivos más) |
| F3 | `Settings.tsx` no usa `useIsAdmin()` (usa `user?.role === 'admin'`) | HIGH | ❌ **Sigue así** (líneas 102, 109 de `Settings.tsx`) |
| F4 | 0/21 tests frontend (AdminLoginLock, useIsAdmin, PortalLayout) | HIGH | ❌ **No existen archivos de test** (no hay `__tests__` en `frontend/src/`) |
| F5 | `useCallback` faltante en `onClose` de `AdminLoginLock` | HIGH | ❌ **Sigue así** (`onClose={() => setIsAdminLockOpen(false)}` se recrea cada render) |
| F6 | `AdminLoginLock` no exportado en barrel `molecules/index.ts` | MEDIUM | ❌ **Sigue sin exportar** (verificado en `index.ts`) |
| F7 | Cleanup documentado pero con riesgo de interpretación | MEDIUM | ⚠️ Parcial (cleanup existe pero dispara en unmount, no en beforeunload como se asumió) |
| F8 | `<button>` raw violando design system | HIGH | ✅ Resuelto (PortalLayout usa `<Button>` atom con `aria-label`) |
| F9 | `AdminLoginLock` sin a11y (portal, focus-trap, role, scroll-lock, Escape) | CRITICAL | ✅ Resuelto (modal con createPortal, role="dialog", aria-modal, focus-trap, Escape) |

### 2.3 Security-rbac-reviewer (BLOCKED)

| # | Hallazgo | Severidad | Estado real |
|---|---|---|---|
| S1 | Rate limit no aplica a requests sin token (decorador evaluado después de auth) | **CRITICAL** | ⚠️ **Matiz**: la afirmación literal es falsa (sin token → 401 antes de rate limit). Pero el bug REAL es B3 (key_func siempre "anonimo:ip") — mismo riesgo combinado. |
| S2 | `request.state.usuario_id` nunca se setea → key siempre "anonimo:ip" | **CRITICAL** | ❌ **Sigue roto** (mismo bug que B3) |
| S3 | `manager` pasa verify-admin por `categoria='analistas'` contradiciendo ADR-005 | HIGH | ❌ **Sigue roto** (`tiene_acceso_panel_admin` consulta `categoria.in_(["panel", "analistas"])` — manager con permiso `dashboard` o `ticket-management` pasa) |
| S4 | `str(e)` en `HTTPException.detail` filtra internos | HIGH | ❌ **Sigue así** en otros archivos (no en config_router, pero sí en `profile_router.py:78`, `login_router.py`, etc.) |
| S5 | 3 archivos FE no refactorizados (ProtectedRoute, Router, Sidebar) | HIGH | ❌ **Mismo que F2** |
| S6 | 13 `print()` con PII en backend | MEDIUM | ⚠️ Los 5 de config_router.py están migrados; 115 `print()` siguen en otros archivos (fuera de scope del plan, pero documentados) |
| S7 | Rate limiter sin backend Redis (in-memory) | MEDIUM | ⚠️ Aceptable para single-instance (no en scope, roadmap) |
| S8 | JWT 8h de expiración | MEDIUM | ⚠️ No en scope (deuda técnica pre-existente) |
| S9 | Slowapi Limiter `headers_enabled=False` no documentado | LOW | ⚠️ Presente pero no documentado |
| S10 | Audit log usa 2 valores (`exito`/`fallo`) en lugar de 4 especificados | MEDIUM | ❌ **Drift confirmado** (servicio.py:330) |

### 2.4 Docs-tests-reviewer (approved_with_conditions)

| # | Hallazgo | Severidad | Estado real |
|---|---|---|---|
| G1 | 0/20 tests frontend | HIGH | ❌ **No existen archivos de test frontend** |
| G2 | 3 archivos FE no refactorizados (ProtectedRoute, Router, Sidebar) | HIGH | ❌ **Mismo que F2/S5** |
| G3 | 6 archivos adicionales FE con `manager` no refactorizados (fuera de scope declarado) | MEDIUM | ❌ **Sigue ahí**: RoomsPage, ViaticosManagement, ReservaSalasCalendarView, ReservationDetailModal, PermissionsMatrix, roles.ts |
| G4 | `useIsAdmin` no usado en Settings.tsx | HIGH | ❌ **Mismo que F3** |
| G5 | `ServicePortal.tsx` no existe (solo PortalLayout.tsx) | MEDIUM | ❌ **Confirmado** (grep solo encuentra PortalLayout, portalMetadata, PortalWrappers) |
| G6 | `rbac_manifest.py` sin entrada `verify-admin` (módulo no registrado) | MEDIUM | ❌ **Sigue sin entrada** (verify-admin es endpoint, no módulo — interpretación ambigua) |
| G7 | Drift en enum `resultado` (2 vs 4 valores) | MEDIUM | ❌ **Sigue drift** (servicio.py:330: `"exito" if exitosa else "fallo"`) |
| G8 | Discrepancia en documentación de cleanup | MEDIUM | ⚠️ Cleanup existe pero dispara en unmount, no beforeunload |
| G9 | Bitácora cerrada prematuramente (métricas infladas) | HIGH | ❌ **Sigue inflada**: "8 PASS" = 3 unit + 5 stubs `pytest.skip` |

---

## 3. Hallazgos transversales (consenso entre 2+ subagentes)

Estos son los hallazgos que **múltiples subagentes detectaron de forma independiente**, indicando consenso técnico y maximizando la probabilidad de impacto real:

| ID | Hallazgo transversal | Detectado por | Severidad consenso |
|---|---|---|---|
| **T1** | **Rate limit INERTE**: key_func siempre devuelve `"anonimo:ip"` → todos los usuarios desde la misma IP comparten budget. Defensa contra fuerza bruta queda neutralizada para usuarios distintos. | backend (B3) + security (S1, S2) | **CRITICAL** |
| **T2** | **manager pasa verify-admin** vía `categoria='analistas'` → contradice ADR-005 (D1) y Plan v2.1 R1. Cualquier rol con permiso `dashboard`/`ticket-management` queda con acceso al panel maestro. | security (S3) + scope (implícito en R1) | **HIGH→CRITICAL** (rompe invariante arquitectural) |
| **T3** | **3 archivos FE no refactorizados**: ProtectedRoute.tsx, Router.tsx, Sidebar.tsx siguen con `manager` en listas hardcodeadas + bypass case en línea 41 de ProtectedRoute. | frontend (F2) + security (S5) + docs (G2) | HIGH |
| **T4** | **`Settings.tsx` no usa `useIsAdmin()`** — sigue con comparación directa `user?.role === 'admin'`. | frontend (F3) + docs (G4) | HIGH |
| **T5** | **0 tests frontend** — archivos `__tests__` no existen en `frontend/src/`. Plan v2.1 prometía 9+8+3=20 tests frontend. | frontend (F4) + docs (G1) | HIGH |
| **T6** | **Bitácora inflada**: 8 "PASS" reportados = 3 unit reales + 5 stubs `pytest.skip` con misma firma (E2E requieren `EJECUTAR_E2E=1`). | docs (G9) + scope (validación cruzada) | HIGH |
| **T7** | **Frontend AdminLoginLock**: (a) `useCallback` faltante en `onClose` (deps array se invalida cada render → focus-trap se reinicia); (b) no exportado en barrel `molecules/index.ts`. | frontend (F5, F6) | MEDIUM (convergente) |
| **T8** | **Drift documental vs código**: (a) `resultado` schema (4 valores) vs impl (2 valores); (b) `rbac_manifest.py` sin entrada `verify-admin`; (c) `ServicePortal.tsx` referenciado en bitácora pero no existe. | docs (G5, G6, G7) + scope (validación) | MEDIUM |
| **T9** | **fromAdmin race condition**: cleanup `useEffect` fires on unmount (no on `beforeunload`) → puede borrar flag recién seteado en React StrictMode dev. | frontend (F1) | MEDIUM (con impacto real solo en dev) |

---

## 4. Delta plan v2.1 vs build real

### 4.1 Archivos del plan — implementados vs faltantes

| Plan v2.1 (declarado) | Estado real | Notas |
|---|---|---|
| `backend_v2/app/core/roles.py` (SSOT) | ✅ Existe | Verificar contenido |
| `backend_v2/app/models/auth/auditoria_evento.py` | ✅ Existe | Tabla creada en PostgreSQL |
| `backend_v2/app/core/migrations/auditoria_evento_migration.py` | ✅ Existe | Migración ejecutada |
| `backend_v2/app/core/migrations/manager.py` (modificado) | ✅ Modificado | |
| `testing/backend/test_verify_admin_whitelist.py` (13 tests) | ⚠️ **STUBS** | 13 tests = 13 `pytest.skip` (no validan nada) |
| `testing/backend/test_verify_admin_security.py` (8 tests) | ⚠️ **MEZCLA** | 5 stubs E2E + 3 unit reales |
| `frontend/src/hooks/useIsAdmin.ts` | ✅ Existe | Sin tests |
| `frontend/src/hooks/__tests__/useIsAdmin.test.ts` (3 tests) | ❌ **No existe** | G1 |
| `frontend/src/components/molecules/AdminLoginLock.tsx` | ✅ Movido | Sin tests + no exportado en barrel |
| `frontend/src/components/molecules/__tests__/AdminLoginLock.test.tsx` (9 tests) | ❌ **No existe** | G1 |
| `frontend/src/pages/ServicePortal/__tests__/PortalLayout.test.tsx` (8 tests) | ❌ **No existe** | G1 |
| `frontend/src/constants/roles.ts` | ✅ Existe | |
| `backend_v2/app/api/auth/config_router.py` (refactor) | ✅ Parcial | 3 schemas + rate limit decorator, PERO sin setear `request.state.usuario_id` |
| `backend_v2/app/services/auth/servicio.py` (métodos nuevos) | ✅ Implementado | `tiene_acceso_panel_admin` + `registrar_verificacion_panel` |
| `backend_v2/app/main.py` (slowapi) | ✅ Implementado | |
| `backend_v2/requirements.txt` (`slowapi`) | ✅ Modificado | |
| `backend_v2/app/core/rbac_manifest.py` (entrada verify-admin) | ❌ **No añadido** | G6 |
| `backend_v2/app/core/config.py` (`VERIFY_ADMIN_RATE_LIMIT`) | ✅ Implementado | |
| `frontend/src/pages/ServicePortal/PortalLayout.tsx` (refactor) | ⚠️ Parcial | Logo + a11y OK, PERO useCallback onClose, fromAdmin race, cleanup semantics |
| `frontend/src/pages/Settings.tsx` (import + useIsAdmin) | ⚠️ Parcial | Import OK, PERO no usa `useIsAdmin()` |
| `frontend/src/components/auth/ProtectedRoute.tsx` (useIsAdmin) | ❌ **No refactorizado** | `manager` sigue en línea 41, sigue con `isAdminRole` hardcoded |
| `frontend/src/components/Router.tsx` (useIsAdmin) | ❌ **No refactorizado** | `manager` sigue en líneas 38, 53, 55 |
| `frontend/src/components/layout/Sidebar.tsx` (useIsAdmin) | ❌ **No refactorizado** | `manager` sigue en línea 89 |
| `frontend/src/context/AppContext.tsx` (LOGOUT cleanup) | ✅ Implementado | Línea 159: `sessionStorage.removeItem('fromAdmin')` |
| `frontend/src/pages/ServicePortal/ServicePortal.tsx` (cleanup) | ❌ **Archivo no existe** | G5 — solo PortalLayout.tsx |
| `frontend/src/components/layout/Layout.tsx` (eliminar setter legacy) | ⚠️ No verificado | |
| `frontend/src/components/atoms/Button.tsx` (aria-label) | ✅ Implementado | |
| `docs/ESQUEMA_BASE_DATOS.md` (tabla auditoria_evento) | ⚠️ No verificado | |
| `docs/ARQUITECTURA_FRONTEND.md` (patrón logo) | ⚠️ No verificado | |
| `testing/CATALOGO_PRUEBAS.md` (2 suites) | ⚠️ No verificado | |
| `errors_memory.json` (D2, D4) | ⚠️ Existe el archivo, contenido no verificado | |

### 4.2 Comandos de validación — ejecutados vs pendientes

| Comando del plan | Ejecutado | Resultado |
|---|---|---|
| `cd backend_v2 && python -m pytest testing/backend/test_verify_admin_whitelist.py` | ✅ | "8 passed, 17 skipped" (engañoso: 13 son stubs skip) |
| `cd backend_v2 && python -m pytest testing/backend/test_verify_admin_security.py` | ✅ | Igual que arriba |
| `cd frontend && npm run build` | ✅ | "✓ built in 32.77s" |
| `cd frontend && npm run test` | ❌ | NO ejecutado (0 archivos de test) |
| `cd frontend && npm run lint` | ❌ | NO ejecutado |
| `docker compose exec backend pytest` (E2E con Docker) | ❌ | NO ejecutado (por eso 17 skip) |
| `EJECUTAR_E2E=1 pytest` | ❌ | NO ejecutado |
| Verificación manual con axe DevTools | ❌ | NO ejecutada |
| `docker compose exec backend python -m app.core.migrations.manager init` | ✅ Implícito | Tabla `auditoria_eventos` existe |

### 4.3 Métricas reportadas vs realidad

| Métrica (bitácora) | Realidad | Delta |
|---|---|---|
| "8 tests unitarios PASAN" | 3 unit reales + 5 stubs `pytest.skip` | -5 |
| "17 E2E skip con EJECUTAR_E2E=1" | Confirma que NINGÚN flujo crítico está validado (rate limit, audit log, manager rechazado) | -17 |
| "Endpoints payload:dict → Pydantic: 3" | ✅ Confirmado | OK |
| "Líneas migradas print→logger: 5" | ✅ Confirmado en config_router.py (0 print restantes) | OK |
| "Tests pendientes (E2E): 17" | 0 realmente validados | OK (declarado honestamente) |
| "Archivos frontend modificados: 5" | 3 archivos DEBERÍAN estar modificados y NO lo fueron (ProtectedRoute, Router, Sidebar) | -2 reales |
| "Frontend tests pendientes" | 0 archivos de test existen, no "pendientes" | Discrepancia |

---

## 5. Plan de remediación priorizado

### P0 — Bloqueantes de merge (reabrir)

| # | Acción | Esfuerzo | Resuelve |
|---|---|---|---|
| **P0.1** | En `obtener_usuario_actual_db` (profile_router.py), añadir `request.state.usuario_id = usuario.id` antes de retornar. Modificar `verificar_password_admin` para aceptar `Request` y setear state si no se hizo. | 30 min | **T1** (B3+S1+S2) |
| **P0.2** | En `ServicioAuth.tiene_acceso_panel_admin`, cambiar `categoria.in_(["panel", "analistas"])` por `categoria == "panel"`. Migrar manager explícitamente a `panel` o documentar excepción. Actualizar tests E2E. | 1-2 h | **T2** (S3) |
| **P0.3** | Implementar los 20 tests frontend (useIsAdmin, AdminLoginLock, PortalLayout) — incluso si son smoke tests, validan que el código compila y los mocks funcionan. Sin tests, no hay red de seguridad para refactors futuros. | 4-6 h | **T5** (F4+G1) |
| **P0.4** | Reemplazar los 13 stubs `pytest.skip` en `test_verify_admin_whitelist.py` con tests reales usando `TestClient` + `app.dependency_overrides` para no requerir servidor backend. | 3-4 h | **T6** (G9) |

### P1 — HIGH (mergeable con fix post-merge inmediato)

| # | Acción | Esfuerzo | Resuelve |
|---|---|---|---|
| P1.1 | Refactorizar `ProtectedRoute.tsx`, `Router.tsx`, `Sidebar.tsx` para usar `useIsAdmin()`. Quitar `manager` de las 3 listas hardcodeadas. | 2 h | **T3** (F2+S5+G2) |
| P1.2 | Refactorizar `Settings.tsx` para usar `useIsAdmin()` (reemplazar `user?.role === 'admin'`). | 30 min | **T4** (F3+G4) |
| P1.3 | Implementar `__tests__/PortalLayout.test.tsx` con 8+ tests (race conditions, cleanup, click handlers). | 3 h | **T5** parcial |
| P1.4 | Añadir `min_length=8, max_length=128` a `ModuloToggleRequest.password_verificacion` (línea 246 de usuario.py). | 5 min | B2 |
| P1.5 | Reemplazar `pass` muerto en `toggle_modulo_global` (líneas 202-203) por `raise HTTPException(409, "Módulos críticos no se pueden desactivar")`. | 5 min | B4 |
| P1.6 | Implementar `useCallback` en `onClose` de `AdminLoginLock` (mover a PortalLayout o usar `useCallback` envuelto). | 30 min | F5 |
| P1.7 | Exportar `AdminLoginLock` en `frontend/src/components/molecules/index.ts`. | 1 min | F6 |

### P2 — MEDIUM/LOW (tickets de seguimiento, no bloquea merge)

| # | Acción | Esuelve |
|---|---|---|
| P2.1 | Refactorizar 6 archivos FE adicionales que aún tienen `manager`: RoomsPage, ViaticosManagement, ReservaSalasCalendarView, ReservationDetailModal, PermissionsMatrix, roles.ts. | G3, R9 del plan |
| P2.2 | Alinear `resultado` enum: usar 4 valores (`exito`, `fallo_contrasena`, `fallo_sin_permiso`, `rate_limit_excedido`) en `registrar_verificacion_panel`. | G7 |
| P2.3 | Corregir bitácora:ServicePortal.tsx → PortalLayout.tsx. | G5 |
| P2.4 | Añadir entrada `verify-admin` (o documentar como endpoint no-módulo) en `rbac_manifest.py`. | G6 |
| P2.5 | Documentar `headers_enabled=False` en `rate_limiter.py` y ADR-005. | S9 |
| P2.6 | Migrar 110 `print()` restantes a `logger.*` (deuda técnica global, ticket). | S6 |
| P2.7 | Validar `npm run lint` y `npm run test` (ahora 0/0 porque no hay tests). | G1 |

---

## 6. Decisión final

**Scope-reviewer veredicto:** `rejected` (reabrir a modo `plan` para resolver P0 antes de merge).

**Justificación:**

1. **2 hallazgos CRITICAL** no resueltos (T1 rate limit inerte, T2 manager pasa por analistas) invalidan la promesa de seguridad del feature.

2. **El plan v2.1 declaraba 5/5 aprobación** pero la auditoría de código revela que la mitad de los work items declarados en `5.1 Crear (13 nuevos)` y `5.2 Modificar (12 archivos)` no se completaron. La aprobación fue sobre PLAN, no sobre BUILD.

3. **La métrica "8 tests PASAN" es engañosa**: 5 de ellos son `pytest.skip` stubs con la misma firma. Sin E2E con Docker, los flujos críticos (rate limit, audit log, manager rechazo) NO están validados.

4. **3 archivos FE del refactor prometido NO se tocaron** (ProtectedRoute, Router, Sidebar) — divergencia material entre plan y build.

5. **0 tests frontend** — el plan prometía 20, no hay ninguno. Esto es violación directa de `skill_testing_mandate`.

---

## 7. Recomendación al orquestador

**REABRIR** el build a modo `plan` y resolver P0 antes de merge.

**Pasos concretos:**

1. **Aplicar P0.1** (1 línea: setear `request.state.usuario_id` en `obtener_usuario_actual_db` o en el endpoint).
2. **Aplicar P0.2** (1 línea: cambiar `categoria.in_(["panel", "analistas"])` a `categoria == "panel"`).
3. **Implementar P0.3** (al menos 3 tests smoke para cada archivo: useIsAdmin, AdminLoginLock, PortalLayout).
4. **Reescribir P0.4** (los 13 stubs como tests reales con `TestClient`).
5. **Re-ejecutar `pytest` + `npm run build` + `docker compose exec backend pytest` con `EJECUTAR_E2E=1`**.
6. **Re-ejecutar los 5 subagentes** con build actualizado.
7. **Actualizar bitácora** con métricas honestas (3 PASS reales + 0 stubs + 17 E2E pendientes reales).
8. **Solo entonces proceder a merge** + tickets P1/P2 como post-merge.

**NO** proceder a merge directo. El build actual tiene huecos de seguridad críticos que invalidan el feature.

---

## 8. Seguimiento

| Acción | Responsable | Fecha objetivo | Estado |
|---|---|---|---|
| P0.1 rate limit key_func | backend-reviewer | 2026-06-02 EOD | Pendiente |
| P0.2 manager bypass via analistas | backend-reviewer | 2026-06-02 EOD | Pendiente |
| P0.3 20 tests frontend | frontend-reviewer | 2026-06-03 | Pendiente |
| P0.4 13 tests backend reales | backend-reviewer | 2026-06-03 | Pendiente |
| P1.1-P1.7 refactors HIGH | frontend+backend | 2026-06-04 | Pendiente |
| P2.1-P2.7 MEDIUM/LOW | varios | 2026-06-15 | Pendiente |
| Re-revisión 5 subagentes | scope-reviewer | post-P0 | Pendiente |
| Merge a main | usuario (decisión explícita) | post-aprobación | Bloqueado |

---

## 9. Firmas

| Subagente | Veredicto | Severidad | Bloquea |
|---|---|---|---|
| `scope-reviewer` (1ra pasada, plan) | `approved_with_conditions` | HIGH | No (con condiciones) |
| `backend-reviewer` (build) | **`blocked`** | **CRITICAL** | **Sí** |
| `frontend-reviewer` (build) | **`rejected`** | **CRITICAL** | **Sí** |
| `security-rbac-reviewer` (build) | **`blocked`** | **CRITICAL** | **Sí** |
| `docs-tests-reviewer` (build) | `approved_with_conditions` | HIGH | No (con condiciones) |
| `scope-reviewer` (2da pasada, delta build) | **`rejected`** | **CRITICAL** | **Sí — reabrir** |

**Resultado global:** 2 subagentes CRITICAL bloquean + 2 subagentes HIGH con condiciones. El build no está listo para merge.
