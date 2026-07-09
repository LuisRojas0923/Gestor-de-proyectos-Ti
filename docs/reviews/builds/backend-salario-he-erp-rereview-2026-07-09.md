# Backend review — salario HE desde ERP (re-revisión)

**Fecha:** 2026-07-09  
**Alcance:** `backend_v2/app/api/erp/router.py`, `backend_v2/app/api/novedades_nomina/routers/horas_extras.py`, `backend_v2/app/models/novedades_nomina/schemas_horas_extras.py`, `backend_v2/app/services/erp/empleados_service.py`, `testing/backend/test_erp_empleados_service.py`, `testing/CATALOGO_PRUEBAS.md`  
**Resultado:** blocked

## Hallazgos bloqueantes restantes

1. **Alta — La confirmación sigue aceptando importes derivados del cliente sin recalcular/validar server-side.**  
   Referencias: `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:355-365`; `backend_v2/app/services/novedades_nomina/horas_extras_confirmacion.py:66-84`, `:96-104`, `:128-130`.  
   La corrección valida que `salario_base_mensual` y `nivel_riesgo_arl` coincidan con ERP, pero `factor_prestacional`, `valor_hora_ordinaria`, `detalles.valor_bruto`, `detalles.carga_prestacional`, `detalles.costo_total` y los totales persistidos se siguen derivando del payload confirmado. Un cliente manipulado o stale puede enviar salario/ARL correctos con valores monetarios alterados y el backend los persiste. Para nómina, la confirmación debe recalcular desde el motor backend vigente o comparar exhaustivamente todos los importes derivados antes de persistir. Falta prueba negativa para este caso.

## Hallazgos no bloqueantes restantes

1. **Media — Wrapper async de ERP sigue ejecutando consulta síncrona directamente.**  
   Referencias: `backend_v2/app/services/erp/empleados_service.py:139-141` y usos existentes en `auth`, `novedades_nomina` y `lineas_corporativas`.  
   Los endpoints corregidos de HE/ERP usan `run_in_threadpool`, pero `EmpleadosService.obtener_empleado_por_cedula()` conserva firma `async` y llama al método sync sin aislarlo. Esto mantiene el riesgo de bloqueo del event loop en otros call sites que lo siguen usando con `await`. Recomendación: hacer que el wrapper también use threadpool/to_thread o eliminarlo para obligar a los routers a llamar al método sync aislado explícitamente.

2. **Media — RBAC de endpoint ERP genérico queda acoplado a permiso de HE.**  
   Referencias: `backend_v2/app/api/erp/router.py:37-42`; consumidor existente `frontend/src/pages/InventarioAdmin/hooks/useInventarioAdmin.ts:469-472`.  
   `/erp/empleado/{identificacion}` ahora exige `nomina_horas_extras.planificar`, pero el endpoint ya era consumido fuera de HE. Puede romper flujos de inventario o forzar sobre-otorgamiento de permisos HE. Recomendación: separar endpoint/DTO específico para HE o definir permiso de lectura ERP compartido por dominio.

3. **Media — ARL faltante/no reconocida se normaliza silenciosamente a `I`.**  
   Referencias: `backend_v2/app/services/erp/empleados_service.py:10-37`; `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:139-145`.  
   Al resolver salario/ARL desde ERP, un `riesgoarl` vacío o no reconocible termina como nivel `I`, que puede subestimar costo prestacional. Si el contrato es “validar salario/ARL ERP”, debería rechazarse ARL ausente/no parseable para HE en lugar de aplicar el nivel más bajo.

4. **Baja/Media — Cobertura agregada no cubre resiliencia ERP ni manipulación de importes.**  
   `python -m pytest --collect-only testing/backend/test_erp_empleados_service.py` recolecta 7 tests; la suite cubre `B.salario`, sobrescritura en router y mismatch salario/ARL. Siguen sin pruebas para ERP no disponible, excepción ERP, empleado inexistente, salario nulo/cero, ARL inválida/no reconocida, 401/403 de `/erp/empleado` y confirmación con salario/ARL correctos pero importes derivados alterados.

## Verificaciones realizadas

- `git status --short` — inspección read-only.
- `git diff --stat` — inspección read-only.
- `git diff -- backend_v2 testing docs` — inspección read-only.
- `python -m pytest --collect-only testing/backend/test_erp_empleados_service.py` — 7 tests recolectados; no se ejecutó pytest por rol de revisión.
