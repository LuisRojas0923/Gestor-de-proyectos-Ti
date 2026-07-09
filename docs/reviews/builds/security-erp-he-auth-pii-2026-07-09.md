Security/RBAC review: blocked

## Blockers first
1. `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:263-265` — la advertencia de pre-liquidación registra `payload.cedula` en claro: `Pre-liquidación para {payload.cedula}...`. Incumple el alcance “no PII logs for cedula”. Requiere redacción/hash estable antes de logging. CWE-532/CWE-359.
2. `backend_v2/app/services/erp/empleados_service.py:185` — `print(f"DEBUG: Actualizando correo ERP para cedula={cedula} -> {nuevo_correo}")` expone cédula y correo en logs/stdout. `backend_v2/app/services/erp/empleados_service.py:195` además imprime excepción cruda. Requiere eliminar `print()` y usar logging con PII redactada y mensaje genérico. CWE-532/CWE-200.

## Checklist results
- Auth en endpoints: ✅
- Schemas sin dict: ✅
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ❌
- PII redacted: ❌

Findings:
- Bloqueante: PII en logs/stdout para cédula/correo en rutas/servicios del alcance.
- Verificado: `/api/v2/erp/empleado/{identificacion}` está protegido con `requiere_permiso_he_planificar`.
- Verificado: rutas ERP requisiciones (`/ots`, `/catalogo`, `/crear`, `/mis-solicitudes`) dependen de `obtener_usuario_actual_db`.
- Verificado: `/api/v2/erp/sync-external` tiene `obtener_usuario_actual_db`, `@limiter.limit("10/minute")` y respuestas genéricas sin body/URL externa.
- Verificado: pre-liquidación y confirmación resuelven salario/ARL desde ERP y validan importes antes de confirmar.

RBAC/config impact:
- No requiere cambios en `rbac_manifest.py`; los permisos granulares `nomina_horas_extras.planificar` y `nomina_horas_extras.confirmar` ya existen.
- `.gitignore` mantiene `.env` ignorado.

Residual risks:
- `obtener_empleado_erp` devuelve el dict completo del ERP, incluyendo `correocorporativo` y `salario_base_mensual`; revisar minimización si el frontend no necesita esos campos.
- ARL no reconocida/missing se normaliza a `I`, lo que puede subestimar carga prestacional; considerar fail-closed para cálculo/confirmación.
- Varios campos `cedula` mantienen solo `min_length/max_length`; no bloquea este delta, pero conviene patrón restrictivo.

Blocking reasons (si aplica): logs con PII y `print()` en archivos del alcance.

Severity: BLOQUEANTE
