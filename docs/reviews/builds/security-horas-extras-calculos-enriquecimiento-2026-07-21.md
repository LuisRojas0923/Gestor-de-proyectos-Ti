# Security/RBAC review: approved_with_risks

> **Estado histórico:** revisión intermedia no vigente. El cierre canónico está en `2026-07-21_horas-extras-planilla-detallada-final.md`.

**Scope:** `backend_v2/app/api/novedades_nomina/routers/horas_extras_consultas.py`, `backend_v2/app/services/novedades_nomina/horas_extras_confirmacion.py`, `backend_v2/app/models/novedades_nomina/schemas_horas_extras.py` y `testing/backend/test_horas_extras_calculos_enriquecimiento.py`.

## Checklist results

- Auth en endpoints: ✅
- Schemas sin dict: ✅
- PK con Field(pattern): N/A — el cambio agrega un campo opcional de respuesta, no un PK de entrada.
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ✅

## Findings por severidad

### MEDIO — La degradación es funcional, pero no limita el costo de una caída repetida del ERP (CWE-400, CWE-770)

- `backend_v2/app/api/novedades_nomina/routers/horas_extras_consultas.py:39`
- `backend_v2/app/services/novedades_nomina/horas_extras_confirmacion.py:357-361`

Cada solicitud autorizada intenta nuevamente el enriquecimiento ERP. La excepción se absorbe de forma segura y la respuesta conserva los cálculos con `nombre_empleado=None`, pero no hay circuit breaker, caché negativa ni control focal de frecuencia. Además, la dependencia utilizada es la sesión ERP opcional genérica; el cierre en `finally` evita fuga de sesión, pero una indisponibilidad sostenida puede mantener ocupados workers hasta que termine el intento de conexión/consulta antes de degradar. Riesgo de disponibilidad, no de acceso o filtración.

### BAJO — El test nuevo no fija la frontera combinada alcance SQL → cédulas ERP (CWE-639)

- `testing/backend/test_horas_extras_calculos_enriquecimiento.py:21-22`
- `testing/backend/test_horas_extras_calculos_enriquecimiento.py:25-46`
- `backend_v2/app/services/novedades_nomina/horas_extras_confirmacion.py:332-358`

La implementación actual es correcta: aplica `cedulas_permitidas` al `SELECT`, ejecuta la consulta principal y solo deriva después el lote enviado al ERP. Sin embargo, el test usa filas prefabricadas y deja `cedulas_permitidas=None`; por ello no fallaría si una modificación futura enriqueciera cédulas fuera del alcance. Conviene añadir un caso con filas permitidas/ajenas que pruebe que el argumento bulk contiene exclusivamente las permitidas y que no se consulta ERP cuando el alcance es vacío.

## Verificaciones

- `nomina_horas_extras.leer` permanece en `Depends(requiere_permiso_he_leer)` en `horas_extras_consultas.py:40`; el permiso sigue registrado en `rbac_manifest.py:284-288`. No se requiere cambio de manifiesto.
- El alcance por cédula permanece en `horas_extras_consultas.py:42-47,56` y se aplica en SQL en `horas_extras_confirmacion.py:332-347` antes de construir el lote ERP en `:356-358`.
- Alcance vacío retorna `[]` antes de tocar DB/ERP (`horas_extras_confirmacion.py:332-334`). Sin resultados tampoco consulta ERP (`:348-349`).
- Los fallos ERP se registran con mensaje genérico, sin cédula, nombre ni excepción (`horas_extras_confirmacion.py:359-361`); no se agregan errores HTTP con detalles internos.
- La dependencia generadora cierra la sesión ERP en `backend_v2/app/database.py:173-179`, incluso si el consumidor falla. La consulta síncrona se descarga al threadpool mediante `consultar_empleados_bulk_async`.
- El contrato degradado es válido porque `nombre_empleado` es opcional (`schemas_horas_extras.py:315`).

## RBAC/config impact

RBAC intacto; sin módulo o permiso nuevo. No hay cambios de secrets/config dentro del alcance. La nueva lectura amplía el uso del ERP desde un GET protegido y scoped.

## Blocking reasons

Ninguno.

**Severity:** MEDIO

**Validación:** revisión estática; no se ejecutaron tests por las restricciones del subagente.
