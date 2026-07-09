# Security/RBAC review - HE ERP final re-review

Security/RBAC review: blocked

## Checklist results
- Auth en endpoints: ❌
- Schemas sin dict: ✅
- PK con Field(pattern): ❌
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ❌
- Secrets guard: N/A
- No print(): ❌
- PII redacted: ❌

## Verificación de blockers declarados como corregidos
- ✅ `GET /erp/solicitudes`, `POST /erp/sincronizar` y `POST /erp/sync-external` ahora declaran `Depends(obtener_usuario_actual_db)`.
- ✅ `POST /erp/sync-external` ya no imprime URL, `response.text` ni `str(e)` en `detail`; los mensajes de error al cliente son genéricos.
- ✅ `/erp/empleado/{identificacion}` permanece protegido por `Depends(requiere_permiso_he_planificar)`.
- ✅ La confirmación HE compara salario, nivel ARL, factor prestacional, valor hora e importes de cada detalle contra valores derivados en backend antes de persistir.

## Findings

### BLOQUEANTE
1. **El proxy externo `/erp/sync-external` sigue sin rate limiting.** Aunque ya exige usuario autenticado y los errores fueron saneados, el checklist exige auth + rate limiting para proxies a servicios externos. No hay `@limiter.limit(...)` ni configuración equivalente en `backend_v2/app/api/erp/router.py:87-119`. CWE-400 / CWE-770.
2. **El router ERP importado conserva endpoints API v2 sin autenticación.** `backend_v2/app/api/erp/requisiciones_router.py` se incluye bajo `/api/v2/erp/requisiciones`; `GET /ots` y `GET /catalogo` no declaran `Depends(obtener_usuario_actual_db)` ni permiso RBAC (`requisiciones_router.py:18-23`, `:38-44`). `testing/backend/test_requisiciones.py:14-23` además codifica que se llamen sin token. CWE-306, CWE-862.

### No bloqueante pero pendiente
- PII en logs: `_resolver_parametros_empleado_erp` registra cédula completa (`horas_extras.py:137`) y el warning de pre-liquidación interpola `payload.cedula` (`:332-334`). CWE-532.
- Validación de identificadores incompleta: `identificacion` y varios `cedula` siguen aceptando `str` con longitud pero sin `Path/Field(pattern=...)` restrictivo. CWE-20.
- El subrouter de requisiciones mantiene `print()` y `detail=f"... {str(e)}"` en errores (`requisiciones_router.py:34`, `:55`, `:97-103`, `:132-138`). CWE-209, CWE-532.

## RBAC/config impact
- `rbac_manifest.py` ya contiene permisos granulares de `nomina_horas_extras.*`; no se requiere módulo nuevo para los cambios HE revisados.
- Para `/erp/requisiciones/ots` y `/erp/requisiciones/catalogo`, usar al menos usuario autenticado y preferiblemente permiso del módulo `requisiciones`/submódulo correspondiente.
- Para `/erp/sync-external`, añadir rate limit con SlowAPI/config de entorno y prueba 429 focal.

## Blocking reasons
- Queda un proxy externo autenticado pero sin rate limiting.
- Quedan endpoints ERP API v2 importados bajo el mismo router sin autenticación.

Severity: BLOQUEANTE
