# Security/RBAC review - HE ERP PII/HMAC re-review

Security/RBAC review: approved_with_risks

## Blockers first

No blocking findings in the scoped re-review.

## Checklist results
- Auth en endpoints: ✅
- Schemas sin dict: ✅
- PK con Field(pattern): ❌
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ✅

## Verification of previous blockers
- ✅ `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:263-265` no longer logs `payload.cedula`; the warning now includes only authorization source.
- ✅ `backend_v2/app/services/erp/empleados_service.py:81,185,195` no longer prints cédula/correo; stdout `print()` was replaced with logger calls whose messages do not interpolate PII.
- ✅ `backend_v2/app/services/novedades_nomina/horas_extras_erp_validacion.py:89-107` adds HMAC signing with `hmac.compare_digest`; `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:331-337` verifies salary/ARL and recalculated importes before confirmation.
- ✅ ERP scoped routes remain authenticated: `/erp/solicitudes`, `/erp/sincronizar`, `/erp/sync-external`, `/erp/requisiciones/*`, and `/erp/empleado/{identificacion}`.
- ✅ `/erp/sync-external` keeps `@limiter.limit("10/minute")` and generic client-facing errors.

## Findings / residual risks
- **ALTO:** `firma_calculo` protects the financial calculation fields but does not cover `fecha_inicio`, `fecha_fin`, `ot_id`, `ot_codigo` or `observaciones`; if these fields are persisted from the confirmation payload, a user with confirmation permission could alter OT/date allocation without invalidating the HMAC. CWE-345/CWE-347.
- **MEDIO:** `GET /erp/empleado/{identificacion}` returns a broad ERP dict including salary and corporate email; consider a minimal DTO for HE planning. CWE-200.
- **MEDIO:** `cedula`/`identificacion` parameters still rely mostly on length limits, not restrictive `Path/Field(pattern=...)`. CWE-20.
- **MEDIO:** `_normalizar_nivel_riesgo` defaults unknown ARL to `I`; safer fail-closed behavior would avoid understating employer cost when ERP data is malformed. CWE-20/CWE-345.
- **BAJO:** `logger.exception(...)` messages no longer contain explicit PII, but exception formatting can still include SQL/driver parameters if engine logging is not configured with hidden parameters; verify production logging sinks/redaction. CWE-532.

## RBAC/config impact
- No new RBAC manifest entry is required for this delta; `rbac_manifest.py` already contains `nomina_horas_extras.leer`, `.planificar`, `.confirmar`, `.compensar`, `.admin`, and `requisiciones`.
- `/erp/empleado/{identificacion}` remains coupled to `nomina_horas_extras.planificar`; acceptable for this HE flow, but split permission/DTO if reused by non-HE modules.

## Blocking reasons (si aplica)
- None.

Severity: ALTO
