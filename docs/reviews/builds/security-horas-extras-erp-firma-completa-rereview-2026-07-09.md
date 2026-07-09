# Security/RBAC review - HE ERP firma_calculo completa re-review

Security/RBAC review: approved_with_risks

## Blockers first

No blocking findings in the scoped read-only re-review.

## Checklist results
- Auth en endpoints: ✅
- Schemas sin dict: ✅
- PK con Field(pattern): ❌
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ✅

## Verification of requested fixes
- ✅ `backend_v2/app/services/novedades_nomina/horas_extras_erp_validacion.py:83-98` now includes `fecha_inicio`, `fecha_fin`, `ot_id`, `ot_codigo`, `observaciones`, salary/ARL/factor/value-hour and canonicalized detail amounts in the HMAC payload.
- ✅ `backend_v2/app/services/novedades_nomina/horas_extras_erp_validacion.py:101-119` signs with HMAC-SHA256 and validates with `hmac.compare_digest` before persistence.
- ✅ `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:336-342` still resolves current ERP salary/ARL and validates recalculated importes before calling persistence.
- ✅ `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PreLiquidacionView.tsx:156-172` confirms using `resultado.fecha_inicio`, `resultado.fecha_fin`, `resultado.ot_id`, `resultado.ot_codigo`, `resultado.observaciones` and `resultado.firma_calculo`, not mutable current form state.
- ✅ `testing/backend/test_erp_empleados_service.py:390-427` adds a regression test that rejects OT mutation after signing.
- ✅ Reported verification evidence: `pytest testing/backend/test_erp_empleados_service.py testing/backend/test_horas_extras_endpoint_audit.py testing/backend/test_horas_extras_s2.py -q` => 28 passed; `npm run build` and focal eslint passed.

## Findings / residual risks
- **MEDIO:** `GET /erp/empleado/{identificacion}` remains an authenticated ERP lookup returning salary-related PII and is not rate limited; a user with `nomina_horas_extras.planificar` could enumerate employees faster than necessary. CWE-200/CWE-400/CWE-770.
- **MEDIO:** Identifier fields such as `cedula`, `identificacion` and `ot_codigo` still rely mostly on length limits instead of restrictive `Field/Path(pattern=...)`; SQLAlchemy parameters reduce injection risk, but validation remains permissive. CWE-20.
- **MEDIO:** `_normalizar_nivel_riesgo` still defaults unknown/missing ARL to `I`; malformed ERP data can understate cost instead of failing closed. CWE-20/CWE-345.
- **BAJO:** `firma_calculo` reuses `config.jwt_secret_key` and has no explicit TTL/nonce. Current idempotency and ERP/importe revalidation reduce replay impact, but a separate purpose-specific HMAC key and expiration would reduce blast radius. CWE-347.
- **BAJO:** `logger.exception(...)` messages in scoped ERP paths no longer interpolate PII, but production logging should keep SQL parameter hiding/redaction enabled to avoid accidental DB parameter disclosure. CWE-532.

## RBAC/config impact
- No new RBAC manifest entry is required for this delta. `backend_v2/app/core/rbac_manifest.py` already contains `nomina_horas_extras.leer`, `.planificar`, `.confirmar`, `.compensar`, `.admin` and `requisiciones`.
- Scoped HE endpoints remain protected with `requiere_permiso_he_planificar` and `requiere_permiso_he_confirmar`.

## Blocking reasons (si aplica)
- None.

Severity: MEDIO
