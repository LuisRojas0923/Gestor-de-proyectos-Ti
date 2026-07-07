# Build Review - Backend Horas Extras Fase 1B

**Fecha:** 2026-07-07  
**Build:** Fase 1B Horas Extras standalone - readiness backend  
**Autor del build:** n/a - revision read-only  
**Modo:** build  
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos revisados

- `backend_v2/app/api/novedades_nomina/routers/horas_extras*.py`
- `backend_v2/app/services/novedades_nomina/horas_extras*.py`
- `backend_v2/app/services/novedades_nomina/planificador_*.py`
- `backend_v2/app/services/novedades_nomina/bolsa_horas_resolver.py`
- `backend_v2/app/models/novedades_nomina/horas_extras*.py`
- `backend_v2/app/models/novedades_nomina/schemas_horas_extras*.py`
- `backend_v2/app/core/migrations/horas_extras_migration*.py`
- `backend_v2/app/core/rbac_manifest.py`
- `testing/backend/test_horas_extras*.py`
- `testing/CATALOGO_PRUEBAS.md`
- `docs/ESQUEMA_BASE_DATOS.md`

Nota de estado: `git diff -- backend_v2 testing docs/ESQUEMA_BASE_DATOS.md testing/CATALOGO_PRUEBAS.md` no mostro cambios no stageados en backend/testing/docs de este alcance. El arbol tiene cambios ajenos en frontend/memorias no revisados.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | blocked | Si | Hallazgos criticos en persistencia de endpoints workflow y RBAC de selector ERP. |

## 3. Hallazgos bloqueantes

### CRITICO - Endpoints S4 de workflow/compensacion no persisten cambios

- Archivos: `backend_v2/app/api/novedades_nomina/routers/horas_extras.py`, `backend_v2/app/services/novedades_nomina/horas_extras_workflow.py`, `backend_v2/app/database.py`.
- Detalle: `transicionar_calculo_endpoint` y `compensar_bolsa_endpoint` llaman servicios que modifican la sesion y hacen `flush()`, pero no ejecutan `commit()`. `obtener_db()` solo cierra la sesion y no hace autocommit, por lo que en request real los cambios quedan expuestos dentro de la misma sesion pero se pierden al cerrar/rollback implicito.
- Impacto: acciones productivas como `CONFIRMADO -> PAGADO`, `CONFIRMADO -> COMPENSADO`, `CONFIRMADO -> ANULADO` y compensacion manual pueden devolver 200/OK con IDs de evento/movimiento, pero no quedar persistidas. Esto afecta auditoria, bolsa, costos OT y estado del calculo.
- Por que no lo cubrieron los tests: las pruebas S4 ejercitan servicios directamente con la misma `db_session`; no hay pruebas endpoint/API que verifiquen persistencia post-request.

### ALTO - Endpoint de listado de empleados ERP del planificador no exige permiso Horas Extras

- Archivo: `backend_v2/app/api/novedades_nomina/routers/horas_extras_planificador.py`.
- Detalle: `GET /planificador/empleados-erp` usa `db_erp = Depends(obtener_erp_db_opcional)` pero no `Depends(requiere_permiso_he)`. El endpoint de OTs si lo exige.
- Impacto: expone busqueda paginada de empleados ERP (cedula, nombre, cargo, area, ciudad, quien_reporta, autoriza_he) sin el control RBAC del modulo `nomina_horas_extras`.
- Obligacion: agregar dependencia de permiso y prueba negativa 403/positiva 200.

## 4. Hallazgos no bloqueantes / riesgos residuales

### ALTO - Acceso ERP sincronico dentro de endpoints async

- Archivos: `horas_extras_planificador.py`, `database.py`, `services/erp/empleados_service.py`, `services/erp/ordenes_trabajo_service.py`.
- Detalle: endpoints async llaman sesiones SQLAlchemy sincronicas del ERP. Bajo carga puede bloquear el event loop. Para piloto con baja concurrencia es tolerable con monitoreo; para produccion general conviene mover a threadpool o cliente async.

### ALTO - Concurrencia/idempotencia basada en select-then-insert sin manejo explicito de `IntegrityError`

- Archivos: `horas_extras_confirmacion.py`, `horas_extras_bolsa.py`, `planificador_costos_ot.py`.
- Detalle: confirmacion y upserts consultan primero y luego insertan/actualizan. Las migraciones tienen indices unicos para calculo/costo OT, pero el servicio no captura `IntegrityError` ni usa `INSERT .. ON CONFLICT`. Dos requests simultaneos pueden terminar en 500 o duplicar/acumular mal saldos/costos si no hay bloqueo transaccional.

### MEDIO - Job diario HE puede fallar al cruzar fin de mes

- Archivo: `backend_v2/app/services/novedades_nomina/horas_extras_batch.py`.
- Detalle: `objetivo.replace(day=objetivo.day + 1)` rompe en ultimo dia del mes. Si falla, el task de refrescamiento diario de `horario_pactado` muere hasta reinicio.

### MEDIO - Documentacion de esquema incompleta

- Archivo: `docs/ESQUEMA_BASE_DATOS.md`.
- Detalle: no se encontraron tablas HE (`nomina_calculo_semanal`, `nomina_costo_ot`, `nomina_bolsa_horas`, etc.) en el esquema principal, pese a modelos/migraciones nuevas. Esto incumple la obligacion de documentar cambios estructurales.

### MEDIO - `testing/CATALOGO_PRUEBAS.md` no registra toda la suite HE S0-S7/S5

- Archivo: `testing/CATALOGO_PRUEBAS.md`.
- Detalle: solo aparecen S8, S9 y parametros. La suite completa reportada/colectada es de 194 tests, pero el catalogo no refleja S0-S7/S5.

### MEDIO - No hay pruebas API/RBAC/transaccion endpoint-level para HE

- Evidencia: busqueda en `testing/backend/test_horas_extras*.py` no encontro `TestClient`/`AsyncClient` para endpoints HE salvo mock de Calendarific. La cobertura es fuerte en servicios/calculo, pero insuficiente para detectar wiring, permisos y commits en routers.

### BAJO - Tipos temporales mixtos y preferencia TIMESTAMPTZ

- Archivo: `horas_extras_migration_s8.py`.
- Detalle: usa `TIMESTAMP DEFAULT now()` en `nomina_planificador_dia_ot` mientras el estandar PostgreSQL del proyecto prefiere `TIMESTAMPTZ` para fechas/horas.

## 5. Tests / comandos ejecutados

- `python -m pytest --collect-only testing/backend/test_horas_extras_s0.py ... testing/backend/test_horas_extras_parametros_calculo.py` - PASS collect-only, 194 tests colectados.
- Resultados provistos por el orquestador/usuario, no re-ejecutados por restriccion read-only: S0 27 passed; S1 28 passed; S2 isolated 17 passed; S4 14 passed; S5 festivos 23 passed; S5 novedades 22 passed; S5pp horario semana 12 passed; S5ppp integracion 13 passed; S6 13 passed; S7 14 passed; S8 OT mano obra 4 passed; S9 reglas GH 4 passed; parametros calculo 3 passed.
- Suite monolitica no validada: el contexto indica interferencia de DB/estado compartido y timeout en corrida conjunta.

## 6. Documentacion actualizada

- [ ] `docs/ESQUEMA_BASE_DATOS.md` - pendiente: tablas HE no documentadas.
- [ ] `testing/CATALOGO_PRUEBAS.md` - pendiente: registrar S0-S7/S5 completos.
- [x] `backend_v2/app/core/rbac_manifest.py` - `nomina_horas_extras` existe y es critico.

## 7. Decision final

- [ ] aprobado
- [ ] aprobado_con_riesgos
- [x] bloqueado

## 8. Seguimiento requerido

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Asegurar commit/rollback explicito en endpoints S4 o mover commit a servicios; agregar prueba API que haga request y verifique persistencia con nueva sesion. | Backend | Antes de piloto |
| Proteger `GET /planificador/empleados-erp` con `requiere_permiso_he`; agregar pruebas 403/200. | Backend/Security | Antes de piloto |
| Agregar manejo de concurrencia para confirmacion/upsert/bolsa (`IntegrityError`, `ON CONFLICT`, bloqueos o transacciones serializables segun caso). | Backend | Antes de produccion amplia |
| Documentar tablas HE en `docs/ESQUEMA_BASE_DATOS.md` y registrar suite completa en `testing/CATALOGO_PRUEBAS.md`. | Docs/Testing | Antes de cierre Fase 1B |
| Corregir calculo de proximo dia del batch mensual y aislar llamadas ERP sincronicas. | Backend | Antes de produccion amplia |

## 9. Veredicto standalone sin GeoFace

La ausencia de integracion GeoFace no bloquea el piloto standalone de Horas Extras: el backend ya calcula/preliquida con entradas manuales, festivos, novedades, bolsa, parametros y OT. Sin embargo, el backend no esta aceptable para piloto/produccion standalone hasta corregir los dos bloqueantes: persistencia real de workflow/compensacion y RBAC del selector ERP. Tras esos fixes y pruebas endpoint-level, podria habilitarse un piloto controlado sin GeoFace, manteniendo como riesgos residuales la concurrencia y la dependencia ERP sincronica.
