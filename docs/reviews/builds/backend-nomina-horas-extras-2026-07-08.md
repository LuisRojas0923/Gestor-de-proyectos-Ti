# Plantilla — Reporte de Revisión de Build

**Fecha:** 2026-07-08
**Build:** nómina/horas extras — salario y ARL desde ERP
**Autor del build:** no indicado
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `backend_v2/app/api/novedades_nomina/routers/horas_extras.py`
- `backend_v2/app/services/erp/empleados_service.py`
- `testing/backend/test_erp_empleados_service.py`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | blocked | sí | Revisión de FastAPI, SQLAlchemy async/sync, ERP y pruebas. |

## 3. Hallazgos bloqueantes

1. **Alta — I/O síncrono de ERP dentro de endpoints async.**  
   `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:120-128`, `:261-287`, `:331-360`; `backend_v2/app/services/erp/empleados_service.py:75-111`.  
   Los endpoints async `/pre-liquidacion` y `/pre-liquidacion/confirmar` ahora llaman a `EmpleadosService.obtener_empleado_por_cedula`, que está declarado `async` pero ejecuta `db_erp.execute(...)` sobre `sqlalchemy.orm.Session` síncrona. Bajo latencia/timeout del ERP, esto bloquea el event loop de FastAPI. Debe aislarse con `run_in_threadpool`/servicio sync explícito fuera del loop o migrarse a acceso async compatible.

2. **Alta — La validación de confirmación no protege la integridad monetaria del cálculo.**  
   `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:350-355`; `backend_v2/app/services/novedades_nomina/horas_extras_confirmacion.py:66-84`.  
   `/pre-liquidacion/confirmar` valida que `salario_base_mensual` y `nivel_riesgo_arl` coincidan con ERP, pero persiste `factor_prestacional`, `valor_hora_ordinaria`, `detalles` y totales enviados por el cliente sin recalcular ni comparar contra el motor backend vigente. Un cliente stale o manipulado puede confirmar costos incorrectos manteniendo salario/nivel correctos. Para nómina, la confirmación debe recalcular server-side o validar exhaustivamente los importes derivados antes de persistir.

3. **Alta — El contrato de `/pre-liquidacion` todavía exige salario y nivel ARL en el body aunque el router los resuelve desde ERP.**  
   `backend_v2/app/models/novedades_nomina/schemas_horas_extras.py:185-186`; `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:276-278`.  
   FastAPI/Pydantic valida el payload antes de entrar al router; por tanto, un cliente que omita `salario_base_mensual`/`nivel_riesgo_arl` recibe 422 aunque esos datos luego se sobrescriban desde ERP. Esto contradice el comportamiento esperado de resolución ERP y obliga al frontend a enviar valores dummy/stale.

4. **Alta — Cobertura de pruebas insuficiente para los cambios de router y resiliencia ERP.**  
   `testing/backend/test_erp_empleados_service.py:128-139` solo valida que la consulta incluye `B.salario` y mapea `salario_base_mensual`. No hay pruebas backend para `/pre-liquidacion` ni `/pre-liquidacion/confirmar` que cubran: ERP no disponible (`db_erp is None`), excepción/timeout de ERP, empleado inexistente, salario nulo/cero, sobrescritura de salario/nivel en pre-liquidación, rechazo por mismatch en confirmación y no persistencia ante error. Dado que cambia lógica de nómina y una dependencia externa, las pruebas son obligatorias.

## 4. Hallazgos no bloqueantes

1. **Media — Acoplamiento fuerte a columna ERP `beneficio.salario`.**  
   `backend_v2/app/services/erp/empleados_service.py:82-109`.  
   La consulta de empleado por cédula ahora falla completamente si el ERP no expone `beneficio.salario`, afectando también consumidores existentes de `EmpleadosService` fuera de horas extras. Si la columna no está garantizada por contrato ERP, conviene hacer detección de columna o consulta dedicada para parámetros de nómina.

2. **Baja — Archivo cerca del límite de modularidad.**  
   `backend_v2/app/api/novedades_nomina/routers/horas_extras.py` tiene 528 líneas. Sigue bajo el límite de 550, pero el nuevo helper y dependencias ERP acercan el router al máximo; cualquier expansión debería moverse a un servicio/helper dedicado.

## 5. Tests / comandos ejecutados

- `git status --short` — PASS, inspección read-only.
- `git diff --stat` — PASS, inspección read-only.
- `git diff -- backend_v2/app/api/novedades_nomina/routers/horas_extras.py backend_v2/app/services/erp/empleados_service.py testing/backend/test_erp_empleados_service.py` — PASS, inspección read-only.
- `python -m pytest --collect-only testing/backend/test_erp_empleados_service.py` — PASS, 5 tests recolectados. No se ejecutaron tests por restricción de subagente/revisión solo lectura.

## 6. Documentacion actualizada

- [ ] `docs/ESQUEMA_BASE_DATOS.md` — no aplica; no hay cambio de modelo/DB local.
- [ ] `docs/decisions/ADR-NNN-<titulo>.md` — no aplica salvo que se formalice la decisión de depender de salario ERP en línea.
- [ ] `testing/CATALOGO_PRUEBAS.md` — pendiente si se agregan nuevas pruebas de endpoints/ERP.
- [ ] `errors_memory.json` — no aplica.

## 7. Decision final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos`
- [x] `bloqueado` (motivos en hallazgos bloqueantes)

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Evitar I/O ERP síncrono en el event loop de los endpoints async. | Backend | 2026-07-08 |
| Recalcular o validar server-side importes completos antes de confirmar nómina. | Backend | 2026-07-08 |
| Ajustar contrato de `PreLiquidacionInput` si salario/ARL vienen exclusivamente de ERP. | Backend | 2026-07-08 |
| Agregar pruebas de router para éxito, ERP no disponible, empleado inexistente, salario inválido y mismatch en confirmación. | Backend/QA | 2026-07-08 |
