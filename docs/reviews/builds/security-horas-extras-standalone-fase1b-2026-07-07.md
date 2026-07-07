Security/RBAC review: blocked

Scope: Fase 1B Horas Extras standalone readiness — backend endpoints/RBAC/auth and frontend token/API use.
Date: 2026-07-07
Recommendation: NO-GO for standalone production until the blocking auth gaps and audit-attribution issue are fixed.

## Checklist results
- Auth en endpoints: ❌
- Schemas sin dict: ✅
- PK con Field(pattern): ❌
- PUT/PATCH exclude_unset: ✅
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ❌

## Findings ordered by severity

### BLOQUEANTE — HE employee ERP selector is exposed without auth/RBAC
- Evidence: `backend_v2/app/api/novedades_nomina/routers/horas_extras_planificador.py:65-72` defines `GET /planificador/empleados-erp` with only `db_erp = Depends(obtener_erp_db_opcional)` and no `Depends(requiere_permiso_he)` / `Depends(obtener_usuario_actual_db)`.
- Impact: unauthenticated callers can query ERP employee data when ERP is available: `cedula`, `nombre`, `cargo`, `area`, `ciudadcontratacion`, reporting line, ARL risk, and HE authorization flag (`schemas_horas_extras_planificador.py:24-34`). This violates the project rule that API v2 routes require auth except explicit auth/health exceptions.
- CWE: CWE-862, CWE-306, CWE-200.

### BLOQUEANTE — Intended HE bolsa status endpoint lacks auth and is path-inconsistent
- Evidence: `backend_v2/app/api/novedades_nomina/routers/horas_extras_bolsa.py:63-67` defines `GET /bolsa/estado-global` without `Depends(requiere_permiso_he)`. The same sub-router has `prefix="/horas-extras"` and is included under the parent router already prefixed with `/horas-extras` (`horas_extras.py:94-108`), so the intended backend path becomes duplicated for this sub-router.
- Impact: the intended endpoint is unauthenticated at the duplicated path, while the frontend calls `/horas-extras/bolsa/estado-global` (`frontend/src/services/horasExtrasService.ts:299-304`), which can be interpreted by the existing `GET /bolsa/{cedula}` route rather than the intended status endpoint. This is both an auth gap and a standalone readiness/API contract risk.
- CWE: CWE-862, CWE-200.

### ALTO — Payroll audit attribution is client-controlled/forgeable
- Evidence: `PreLiquidacionConfirmar.usuario_confirma` is accepted from request body (`schemas_horas_extras.py:281-294`). The main confirm endpoint only overwrites it if empty (`horas_extras.py:325-327`), and the weekly planner confirm path does not pass the authenticated user to the service (`horas_extras_planificador.py:177-190`; `planificador_persistencia.py:249-263`). The persisted calculation uses this client-controlled field for `calculado_por` and `confirmado_por` (`horas_extras_confirmacion.py:71-90`). Frontend also sends local/user-controlled values (`PreLiquidacionView.tsx:284`; `PlanificadorSemanalView.tsx:384`).
- Impact: any user with HE permission can misattribute payroll confirmations and bolsa movements to another identifier, weakening non-repudiation and audit trails.
- CWE: CWE-345, CWE-639.

### ALTO — Frontend/backend API contract mismatch for HE admin/config endpoints
- Evidence: `horas_extras_parametros.py:18-20` and `horas_extras_bolsa.py:41-43` declare `prefix="/horas-extras"` while both are included by the already-prefixed parent router (`horas_extras.py:94-108`). Frontend calls non-duplicated paths such as `/parametros-calculo`, `/admin/bolsa/global`, and `/bolsa/overrides-ot` (`horasExtrasService.ts:115-130`, `307-337`).
- Impact: HE standalone production can ship with important configuration endpoints unreachable or routed incorrectly, despite isolated service tests passing. This can prevent safe operational control of calculation parameters and bolsa settings.

### MEDIO — Insufficient input patterns on sensitive string identifiers
- Evidence: many identifiers only use min/max length, not restrictive patterns: path/query `cedula` in `horas_extras.py:177-190`, `horas_extras_horario_semana.py:45-64`; body fields `cedula`, `codigo_novedad`, `ot_codigo`, `orden`, `cc/scc/sub_indice` in `schemas_horas_extras.py` and `schemas_horas_extras_planificador.py`.
- Impact: SQLAlchemy parameterization lowers SQLi risk, but unvalidated identifiers can carry special characters into logs, audit data, URLs, and error messages. This fails the required `Field(pattern=...)` control for PK/string identifiers.
- CWE: CWE-20.

### MEDIO — PII appears in logs and user-visible errors
- Evidence: `horas_extras.py:258-260` logs full `cedula`; `planificador_persistencia.py:284-290` logs and returns per-employee errors with `cedula` and raw exception text; multiple route handlers return `detail=str(e)` for domain errors.
- Impact: authorized-user errors may expose employee identifiers and internal validation state; logs are not redacted for cedula/payroll data.
- CWE: CWE-532, CWE-200.

### MEDIO — Single module permission grants high-risk HE operations
- Evidence: all HE endpoints use the same module permission `nomina_horas_extras` (`MODULO_HE`) for read, calculation, confirmation, catalog mutation, parameter updates, bolsa global config, and overrides.
- Impact: production payroll workflows lack least-privilege separation between read/planning users and payroll/admin approvers. Consider separate module/action codes or role checks for configuration/confirmation/admin endpoints.
- CWE: CWE-863.

### BAJO — Frontend token handling is consistent but not hardened for production
- Evidence: `horasExtrasService.ts` consistently sends `Authorization: Bearer ${token}` and encodes path cedulas with `encodeURIComponent`, but HE pages read JWTs from `localStorage` throughout.
- Impact: this matches current app style and no token logging was found in HE code, but localStorage increases XSS token-theft blast radius for standalone production. Prefer httpOnly/SameSite cookies or a short-lived access-token strategy plus CSP.
- CWE: CWE-522.

## RBAC/config impact
- RBAC manifest entry exists and matches frontend/backend module code: `backend_v2/app/core/rbac_manifest.py:277-282` registers `nomina_horas_extras` as critical; frontend routes use `ProtectedRoute moduleCode="nomina_horas_extras"` (`ServicePortal.tsx:127-129`, `431-445`).
- The manifest is adequate for discovery, but route-level implementation is incomplete because at least one HE endpoint bypasses `requiere_permiso_he`, one intended subrouter endpoint lacks auth, and all privileged operations share one coarse module permission.
- No direct GeoFace/biometría dependency was found in HE backend/frontend paths. Standalone without GeoFace is feasible from an integration-boundary perspective after the security/API blockers are fixed. ERP is optional in code paths, but ERP selector exposure must be authenticated before production.

## Blocking reasons
1. `GET /api/v2/novedades-nomina/horas-extras/planificador/empleados-erp` lacks auth/RBAC and can expose ERP employee PII.
2. Intended `GET /bolsa/estado-global` lacks auth and is affected by duplicated sub-router prefix/API mismatch.
3. Payroll confirmation/audit attribution trusts client-controlled `usuario_confirma` instead of deriving from the authenticated token.

Severity: BLOQUEANTE
