Security/RBAC review: approved_with_risks

Scope: Fase 1B Horas Extras standalone — re-review after auth/RBAC/audit fixes.
Date: 2026-07-07
Mode: read-only re-review; no source edits; tests reported by orchestrator/user: S2/S4/S6/S7 with new auth/audit route tests passing.

Go/no-go:
- Standalone controlled pilot: GO WITH RISKS, only with `nomina_horas_extras` assigned to a small trusted payroll/admin cohort and with planner-confirm audit spoofing accepted or the planner confirmation path disabled until fixed.
- Broad production: NO-GO until the remaining ALTO security/RBAC items are closed.

## Checklist results
- Auth en endpoints: ✅
- Schemas sin dict: ✅
- PK con Field(pattern): ❌
- PUT/PATCH exclude_unset: ✅
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ❌

## Findings ordered by severity

### Resolved from prior blocking review
1. `GET /api/v2/novedades-nomina/horas-extras/planificador/empleados-erp` now has `Depends(requiere_permiso_he)` (`horas_extras_planificador.py:65-73`), and S7 includes route dependency coverage.
2. `GET /api/v2/novedades-nomina/horas-extras/bolsa/estado-global` now has `Depends(requiere_permiso_he)` and the duplicated `horas-extras` prefix was removed from the bolsa sub-router (`horas_extras_bolsa.py:41-67`), with S6 route coverage.
3. Direct `POST /pre-liquidacion/confirmar` now overwrites `payload.usuario_confirma` from the authenticated token user (`horas_extras.py:307-326`), and S2 covers client-forged audit input.

### ALTO — Planner bulk confirmation still accepts forgeable audit attribution
- Evidence: `confirmar_plan_endpoint` obtains `usuario: Usuario = Depends(requiere_permiso_he)` but does not pass it to the service (`horas_extras_planificador.py:178-190`). The service builds `PreLiquidacionConfirmar(usuario_confirma=payload.usuario_confirma)` (`planificador_persistencia.py:249-265`). The frontend still sends `usuario_confirma` from `localStorage.getItem('user_cedula') || 'portal'` (`PlanificadorSemanalView.tsx:384`).
- Impact: any user with HE permission can misattribute bulk payroll confirmations created through the planner path. Direct pre-liquidation confirmation is fixed; planner confirmation is not.
- CWE: CWE-345, CWE-639.
- Blocks: broad production. For pilot, acceptable only if access is restricted to trusted operators or planner confirmation is not used.

### ALTO — Coarse RBAC grants read, planning, confirmation, compensation and admin config through one module
- Evidence: HE routers use the single module code `nomina_horas_extras` for employee/ERP reads, pre-calculation, confirmation, workflow transitions, compensation, bolsa global config and override operations (`horas_extras*.py`). RBAC manifest contains the module and marks it critical (`rbac_manifest.py:277-282`).
- Impact: least-privilege separation is not available for payroll/admin operations. A user who can view/use HE can also reach high-risk mutation/config endpoints if assigned this module.
- CWE: CWE-863.
- Blocks: broad production; acceptable for pilot only with a very small trusted role assignment.

### MEDIO — HE calculation parameters route still appears path-inconsistent
- Evidence: `horas_extras_parametros.py` declares `router = APIRouter(prefix="/horas-extras", ...)` while it is included by the parent `horas_extras.py` router that already has `prefix="/horas-extras"`; frontend calls `/parametros-calculo` under the base `/horas-extras` (`horasExtrasService.ts:115-129`). Bolsa prefix was fixed, but parametros was not.
- Impact: operational config UI/API may be unreachable at the frontend path, reducing safe control of production calculation parameters.
- Blocks: not a security blocker for controlled pilot if defaults/seeds are validated, but must be fixed before broad production.

### MEDIO — Sensitive identifiers lack restrictive patterns
- Evidence: HE schemas and path params still use `min_length`/`max_length` without `Field(pattern=...)` for `cedula`, `codigo_novedad`, `ot_codigo`, `orden`, `cc/scc/sub_indice`, etc. (`schemas_horas_extras.py`, `schemas_horas_extras_planificador.py`).
- Impact: SQLAlchemy parameterization reduces SQLi risk, but untrusted identifier text can enter logs, audit rows and error messages.
- CWE: CWE-20.

### MEDIO — PII and raw exception text remain in logs/responses
- Evidence: full `cedula` is logged or returned in HE error paths, e.g. `logger.warning("Error confirmando %s: %s", emp_in.cedula, e)` and `errores.append(... motivo=str(e))` in `planificador_persistencia.py:284-290`; direct pre-liquidation warning logs `payload.cedula` (`horas_extras.py:258-260`).
- Impact: payroll employee identifiers and internal validation details can be exposed to logs or authorized-client error payloads.
- CWE: CWE-532, CWE-200.

### BAJO — Frontend token storage remains localStorage-based
- Evidence: HE pages consistently use bearer tokens, but retrieve them from `localStorage`; no token logging found in reviewed HE frontend paths.
- Impact: consistent with current app style, but increases XSS token theft blast radius for production.
- CWE: CWE-522.

## RBAC/config impact
- RBAC manifest remains adequate for discovery: `nomina_horas_extras` exists and matches backend/frontend module code.
- The original unauthenticated ERP selector and unauthenticated bolsa status blockers are closed.
- Remaining RBAC issue is authorization granularity, not missing manifest registration.
- No direct GeoFace dependency was found in HE backend/frontend paths; HE standalone pilot is feasible from an integration-boundary perspective.

## Blocking reasons (si aplica)
- No remaining BLOQUEANTE for a tightly controlled standalone pilot after the stated fixes.
- Broad production remains blocked by: (1) planner bulk confirmation audit spoofing, (2) coarse RBAC for high-risk payroll/admin operations, and (3) unresolved config route mismatch for calculation parameters.

Severity: ALTO
