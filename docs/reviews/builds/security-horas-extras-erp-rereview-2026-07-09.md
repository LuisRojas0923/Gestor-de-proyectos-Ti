# Security/RBAC review - HE ERP re-review

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

## Verificación de correcciones declaradas
- `/api/v2/erp/empleado/{identificacion}` ahora usa `Depends(requiere_permiso_he_planificar)` y el frontend envía `Authorization: Bearer <token>` en `obtenerEmpleadoERP`.
- La consulta ERP de empleado se ejecuta con `run_in_threadpool` y ya no imprime la cédula completa en `EmpleadosService.obtener_empleado_por_cedula_sync`.
- `PreLiquidacionInput` ya no exige salario/ARL desde el cliente; el router sobreescribe salario/ARL desde ERP antes del cálculo y valida coincidencia antes de confirmar.

## Hallazgos restantes

### BLOQUEANTE
1. **El router ERP conserva endpoints API v2 sin auth y un proxy externo sin rate limiting.** `GET /erp/solicitudes`, `POST /erp/sincronizar` y especialmente `POST /erp/sync-external` no tienen dependencia de usuario/RBAC; `sync-external` además imprime errores y retorna detalles de `exc.response.text`, URL interna y `str(e)`. Archivos: `backend_v2/app/api/erp/router.py:26`, `:72`, `:81`, `:90-110`. CWE-306, CWE-862, CWE-200, CWE-209.

### ALTO / MEDIO no bloqueante del delta corregido
1. **PII en logs de HE.** `_resolver_parametros_empleado_erp` registra cédula completa en `logger.exception(... cedula=%s)` y el warning de pre-liquidación también interpola `payload.cedula`. `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:134`, `:287-289`. CWE-532.
2. **RBAC compartido puede romper menor privilegio.** `/erp/empleado/{identificacion}` quedó protegido por `nomina_horas_extras.planificar`, pero existe al menos un consumidor fuera de HE (`frontend/src/pages/InventarioAdmin/hooks/useInventarioAdmin.ts`). Esto puede forzar a dar permiso HE a usuarios de inventario o romper el flujo. CWE-863.
3. **Validación de identificadores incompleta.** `identificacion` y varios `cedula` siguen como `str` con solo longitud, sin `Field/Path(pattern=...)` para restringir caracteres especiales. CWE-20.
4. **Minimización de datos ERP pendiente.** El endpoint devuelve salario base y otros datos laborales al frontend aunque el cálculo ya es server-side; considerar DTO mínimo para UI y mantener salario solo en backend. CWE-200.
5. **ARL no reconocida cae a nivel `I`.** `_normalizar_nivel_riesgo` usa el nivel más bajo si ERP no trae dato reconocible, lo que no equivale a validar ARL contra ERP y puede subestimar costos. CWE-20, CWE-345.
6. **Falta prueba 401/403 específica para `/erp/empleado/{identificacion}`.** Hay pruebas de cálculo/confirmación, pero no evidencia automatizada de denegación sin token/sin permiso HE.

## RBAC/config impact
- `rbac_manifest.py` ya contiene `nomina_horas_extras.planificar`, `confirmar`, `leer`, `compensar`, `admin`; no se requiere módulo nuevo para el cambio HE.
- Si `/erp/empleado` seguirá siendo endpoint compartido, conviene crear permiso/endpoint específico de lectura ERP por dominio o separar DTOs por consumidor para evitar sobre-otorgar `nomina_horas_extras.planificar`.

## Blocking reasons
- Quedan rutas ERP API v2 sin autenticación/RBAC y un proxy externo sin rate limiting ni manejo seguro de errores.

Severity: BLOQUEANTE
