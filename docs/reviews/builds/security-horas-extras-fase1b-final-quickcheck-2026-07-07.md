Security/RBAC review: approved_with_risks

Scope: HE Fase 1B final quick check after additional fixes.
Date: 2026-07-07
Mode: read-only security/RBAC verification; no source edits. Tests reported by user: S7 16 passed; parametros 4 passed; S2/S4/S6 passed earlier with security cases.

Go/no-go:
- Controlled standalone pilot: GO, restricted to a small trusted payroll/admin cohort with `nomina_horas_extras` only.
- Broad production: NO-GO until least-privilege RBAC/action separation for HE high-risk operations is implemented and residual validation/logging hardening is closed.

## Checklist results
- Auth en endpoints: ✅
- Schemas sin dict: ✅
- PK con Field(pattern): ❌
- PUT/PATCH exclude_unset: ✅
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ❌

Findings:
- No remaining BLOQUEANTE security issue found in the reviewed HE delta.
- Prior blocking auth gaps remain closed: `planificador/empleados-erp` and `bolsa/estado-global` now require `requiere_permiso_he`.
- Prior audit spoofing blocker is closed for both direct confirmation and planner confirmation: endpoints overwrite `payload.usuario_confirma` from the authenticated token-derived user before calling services.
- Prior parametros route mismatch is closed: sub-router no longer adds a duplicated `/horas-extras` prefix, and route tests check the non-duplicated path plus RBAC dependency.
- Remaining ALTO: HE still uses one coarse module permission (`nomina_horas_extras`) for read, planning, confirmation, compensation, overrides, and global/admin parameter changes; this is acceptable only for a controlled pilot with trusted users, not broad production.
- Remaining MEDIO/BAJO hardening: sensitive string identifiers still lack restrictive `Field(pattern=...)`; HE logs/errors still expose cedula/raw domain text in some service paths; frontend token storage remains localStorage-based.

RBAC/config impact:
- `backend_v2/app/core/rbac_manifest.py` contains `nomina_horas_extras` and frontend routes use the same module code, so discovery/visibility alignment is intact.
- Security concern is authorization granularity, not missing manifest registration.

Blocking reasons (si aplica):
- Controlled standalone pilot: none at BLOQUEANTE severity.
- Broad production: blocked by ALTO least-privilege/RBAC granularity gap for payroll/admin HE operations.

Severity: ALTO
