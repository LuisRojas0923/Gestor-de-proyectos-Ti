# Plantilla — Reporte de Revisión de Build

**Fecha:** 2026-07-09  
**Build:** Salario base y ARL de Horas Extras desde ERP  
**Autor del build:** no indicado  
**Modo:** build / read-only backend review  
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `backend_v2/app/api/erp/router.py`
- `backend_v2/app/api/erp/requisiciones_router.py`
- `backend_v2/app/api/novedades_nomina/routers/horas_extras.py`
- `backend_v2/app/services/novedades_nomina/horas_extras_erp_validacion.py`
- `backend_v2/app/services/erp/empleados_service.py`
- `backend_v2/app/models/novedades_nomina/schemas_horas_extras.py`
- `testing/backend/test_erp_empleados_service.py`
- `testing/backend/test_horas_extras_s2.py`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | bloqueado | sí | Revisión read-only; se cargaron referencias obligatorias de backend, PostgreSQL, testing, RBAC y arquitectura limpia. |

## 3. Hallazgos bloqueantes

1. **La confirmación aún permite manipular horas/códigos de detalle si el cliente recalcula importes coherentes.**  
   - `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:331-337` solo obtiene salario/ARL del ERP, compara esos campos y delega la validación al payload recibido.  
   - `backend_v2/app/services/novedades_nomina/horas_extras_erp_validacion.py:70-85` recalcula `valor_bruto`, `carga_prestacional` y `costo_total` usando `detalle.horas` y `detalle.codigo_novedad` enviados por el cliente. No existe comparación contra una pre-liquidación server-side, un hash/firma, un identificador de cálculo temporal ni los inputs originales (`horas_por_dia`, `codigos_por_dia`, `registro_diario`) para recomputar el conjunto completo.  
   - `backend_v2/app/models/novedades_nomina/schemas_horas_extras.py:279-299` confirma únicamente detalles agregados; por tanto un cliente puede cambiar `horas`, agregar/eliminar códigos válidos y ajustar importes para pasar la validación. Esto no cumple el objetivo de rechazar manipulación del detalle computado.

2. **Archivo de test en alcance excede el límite obligatorio de 550 líneas.**  
   - `testing/backend/test_horas_extras_s2.py:593` queda por encima del máximo del proyecto. El cambio añade lógica a un archivo ya sobredimensionado; debe dividirse antes de aprobar el build.

## 4. Hallazgos no bloqueantes

- `backend_v2/app/api/erp/requisiciones_router.py:21-138` conserva handlers `def` síncronos con `Session` ERP síncrona. Parece preexistente y no es parte directa del objetivo salario/ARL; mantenerlo como deuda/riesgo porque el estándar del backend pide handlers async o aislamiento explícito en threadpool.
- `backend_v2/app/services/erp/empleados_service.py:140-141` mantiene un wrapper `async` que ejecuta consulta síncrona sin `run_in_threadpool`; los nuevos flujos revisados usan el helper sync vía threadpool, pero otros llamadores existentes siguen expuestos a bloqueo del event loop.
- La selección de `beneficio.salario` depende de `DISTINCT ON (E.nrocedula)` ordenado por contrato (`C.fechainicio`) pero sin desempate de beneficio activo si hubiera más de una fila activa por contrato.

## 5. Tests / comandos ejecutados

- `python -m pytest --collect-only testing/backend/test_erp_empleados_service.py testing/backend/test_horas_extras_s2.py` — PASS, 26 tests collected.
- Verificación reportada por el usuario: `pytest testing/backend/test_erp_empleados_service.py testing/backend/test_horas_extras_s2.py::TestConfirmarPreLiquidacionHappyPath::test_endpoint_ignora_usuario_confirma_del_cliente -q` — 9 passed.
- No ejecuté pytest completo ni Docker por alcance read-only del subagente.

## 6. Documentacion actualizada

- [x] `testing/CATALOGO_PRUEBAS.md` ya referencia `test_erp_empleados_service.py` y `test_horas_extras_s2.py`.
- [ ] `docs/ESQUEMA_BASE_DATOS.md` — no aplica; no se observaron cambios de modelo/DB en el alcance.
- [ ] ADR/bitácora — no obligatorio para este ajuste salvo que se adopte token/firma server-side para confirmación.

## 7. Decision final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos`
- [x] `bloqueado`

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Endurecer confirmación para recomputar desde inputs originales o validar contra pre-liquidación server-side firmada/almacenada; comparar conjunto completo de detalles (`codigo`, `horas`, factores e importes). | Backend | Antes de merge |
| Agregar test negativo donde el cliente cambia `horas`/agrega un código y recalcula importes coherentes; debe retornar 400. | Backend | Antes de merge |
| Dividir `testing/backend/test_horas_extras_s2.py` para dejar cada archivo <= 550 líneas. | Backend/testing | Antes de merge |
