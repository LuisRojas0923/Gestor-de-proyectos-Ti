# Revisión Consolidada del Plan — Acceso a Administración desde el Header

**Fecha:** 2026-06-02
**Plan revisado:** `docs/reviews/plans/2026-06-02_acceso-panel-administracion-header.md`
**Autor del plan original:** Antigravity
**Modo:** review (revisión formal por subagentes)
**Orquestador:** opencode (harness-router)
**Resultado global:** **REJECTED** (4/5 subagentes en rejected/blocked)

---

## 1. Resumen Ejecutivo

El plan tiene una intención clara y alcance acotado (mover la flecha de retroceso al logo del header + ampliar whitelist RBAC de `/verify-admin`), pero fue rechazado por 4 de 5 subagentes especializados. La convergencia de hallazgos críticos (rate limiting ausente, audit log ausente, SSOT de roles duplicado, ausencia de tests, anti-patrones de seguridad) indica que el plan necesita una **reescritura sustancial** antes de proceder a `build`.

### Veredictos por subagente

| Subagente | Veredicto | Severidad máxima |
|---|---|---|
| `harness-router` | matriz recomendada (consulta) | — |
| `scope-reviewer` | `approved_with_conditions` | HIGH |
| `security-rbac-reviewer` | **`rejected`** | **CRITICAL** |
| `backend-reviewer` | **`blocked`** | **CRITICAL** |
| `frontend-reviewer` | **`blocked`** | **CRITICAL** |
| `docs-tests-reviewer` | **`rejected`** | **CRITICAL** |

---

## 2. Hallazgos Críticos Consolidados (los 5 revisores coincidieron)

### 2.1 Seguridad
- **[CRITICAL] Sin rate limiting en `/config/verify-admin`** → vector de fuerza bruta
- **[CRITICAL] Sin bitácora de auditoría** → endpoint sensible sin trazabilidad
- **[HIGH] `sessionStorage.fromAdmin` no se limpia en logout** (3 archivos: `AppContext.tsx`, `Sidebar.tsx`, `ServicePortal.tsx`) → bypass del lock
- **[HIGH] `manager` en whitelist sin justificación** → inconsistente con `ProtectedRoute.tsx:23`
- **[HIGH] SSOT de roles duplicado** en 5+ archivos con divergencias
- **[MEDIUM] Anti-patrón `payload: dict`** en endpoint sensible

### 2.2 Backend
- **[CRITICAL] Ausencia total de tests** (viola `skill_testing_mandate`)
- **[HIGH] Whitelist hardcodeada** en lugar de derivarse del RBAC dinámico
- **[MEDIUM] bcrypt bloquea event loop** (debería usar `asyncio.to_thread`)
- **[MEDIUM] Comando de validación incorrecto** (debe ser Docker, no PowerShell host)
- **[LOW] Mensajes 500 sin try/except** global

### 2.3 Frontend
- **[CRITICAL] `<button>` raw** violando "atomic components only" de AGENTS.md
- **[CRITICAL] `AdminLoginLock` no es accesible** (sin focus-trap, `role="dialog"`, `Escape`, `createPortal`, scroll-lock)
- **[HIGH] Inversión de dependencias** (`pages/ServicePortal` importa de `pages/Settings/components/`)
- **[HIGH] Race condition de `fromAdmin`** (inicialización `useState(false)` debe ser lazy)
- **[HIGH] Regresión visual** para usuarios no-admin que vienen del admin
- **[MEDIUM] Touch target < 48dp** (Material) / < 44px (Apple HIG)

### 2.4 Documentación y Tests
- **[CRITICAL] Bitácora inexistente** (directorio `docs/bitacora/` ni siquiera existe)
- **[CRITICAL] Sin ADR** para cambio de frontera de seguridad RBAC
- **[CRITICAL] Sin trazabilidad** (issue/ticket origen, criterios de aceptación, rollback plan)
- **[HIGH] `testing/CATALOGO_PRUEBAS.md` desincronizado**

---

## 3. Matriz de Subagentes Recomendada (re-ejecución)

| Subagente | Obligatorio | Estado |
|---|---|---|
| `scope-reviewer` | ✅ | re-ejecutado (approved_with_conditions, 8 condiciones) |
| `backend-reviewer` | ✅ | re-ejecutado (blocked, 5 bloqueantes) |
| `frontend-reviewer` | ✅ | re-ejecutado (blocked, 5 bloqueantes) |
| `security-rbac-reviewer` | ✅ CRÍTICO | re-ejecutado (rejected, 11 condiciones) |
| `docs-tests-reviewer` | ✅ | re-ejecutado (rejected, 6 bloqueantes) |
| `error-memory` | opcional | no ejecutado (sin errores recurrentes aún) |

---

## 4. Condiciones Bloqueantes Consolidadas (19)

### Grupo A — Seguridad (security-rbac-reviewer + scope)
1. **[BLOQ] Rate limiting** en `/config/verify-admin` (5 intentos/5min por usuario+IP)
2. **[BLOQ] Bitácora de auditoría** para todo intento (éxito y fallo)
3. **[BLOQ] Limpiar `fromAdmin`** en `AppContext.tsx` (LOGOUT), `Sidebar.tsx`, `ServicePortal.tsx`
4. **[BLOQ] Quitar `manager` de la whitelist** o justificarlo y propagarlo a `ProtectedRoute.tsx`
5. **[BLOQ] Schema Pydantic** para `/verify-admin` (reemplazar `payload: dict`)

### Grupo B — Backend (backend-reviewer)
6. **[BLOQ] Crear `testing/backend/test_verify_admin_whitelist.py`** con ≥13 tests (TDD)
7. **[BLOQ] Servicio de autorización** (`ServicioAuth.tiene_acceso_panel_admin`) derivado del RBAC dinámico
8. **[BLOQ] Registrar suite en `testing/CATALOGO_PRUEBAS.md`**
9. **[BLOQ] Comando de validación vía Docker** (`docker compose exec backend pytest ...`)

### Grupo C — Frontend (frontend-reviewer)
10. **[BLOQ] Usar átomo `<Button>` con `aria-label`**, no `<button>` raw
11. **[BLOQ] Mover `AdminLoginLock` a `components/molecules/`** + mejorar a11y (focus-trap, portal, scroll-lock, Escape)
12. **[BLOQ] Crear `PortalLayout.test.tsx`** con ≥8 tests
13. **[BLOQ] Hook `useIsAdmin()` centralizado** + refactor de 4 archivos con listas duplicadas

### Grupo D — Documentación (docs-tests-reviewer)
14. **[BLOQ] Crear `docs/bitacora/2026-06-02-acceso-administracion-header.md`**
15. **[BLOQ] Crear `docs/decisions/ADR-005-acceso-panel-admin-via-header.md`**
16. **[BLOQ] Agregar trazabilidad**: issue/ticket, criterios de aceptación, rollback plan

### Grupo E — Scope (scope-reviewer)
17. **[BLOQ] Criterios de aceptación explícitos** (4 mínimo, uno por comportamiento)
18. **[BLOQ] Inicialización lazy de `fromAdmin`** (`useState(() => sessionStorage.getItem('fromAdmin') === 'true')`)
19. **[BLOQ] Re-ejecutar matriz de subagentes** con backend/frontend/security después de aplicar correcciones

---

## 5. Recomendación al Orquestador

**NO PROCEDER A `build`** sin resolver las 19 condiciones. Aplicar el siguiente orden de remediación:

1. Justificar `manager` o quitarlo de la whitelist
2. Crear `backend_v2/app/core/roles.py` como SSOT
3. TDD backend: crear `test_verify_admin_whitelist.py` (rojo → código → verde)
4. Refactorizar `config_router.py`: schema Pydantic + RBAC dinámico + rate limit + audit log
5. Refactorizar frontend: mover `AdminLoginLock` a `components/molecules/`, mejorarlo con portal/a11y
6. TDD frontend: crear `PortalLayout.test.tsx` con 8+ tests
7. Limpiar `fromAdmin` en 3 archivos de logout
8. Crear bitácora + ADR-005
9. Re-someter a los 5 subagentes

---

## 6. Archivos Generados

- `docs/reviews/plans/2026-06-02_acceso-panel-administracion-header_v2.md` (plan rehecho)
- `docs/reviews/plans/2026-06-02_acceso-panel-administracion-header_REVISIONES.md` (este informe)
- `docs/bitacora/2026-06-02-acceso-administracion-header.md` (bitácora de la sesión)
- `docs/decisions/ADR-005-acceso-panel-admin-via-header.md` (decisión arquitectural)

---

## 7. Firmas de los Subagentes

| Subagente | Fecha | Severidad global | Bloquea |
|---|---|---|---|
| `harness-router` | 2026-06-02 | — | No |
| `scope-reviewer` | 2026-06-02 | HIGH | No (con condiciones) |
| `security-rbac-reviewer` | 2026-06-02 | **CRITICAL** | **Sí** |
| `backend-reviewer` | 2026-06-02 | **CRITICAL** | **Sí** |
| `frontend-reviewer` | 2026-06-02 | **CRITICAL** | **Sí** |
| `docs-tests-reviewer` | 2026-06-02 | **CRITICAL** | **Sí** |
