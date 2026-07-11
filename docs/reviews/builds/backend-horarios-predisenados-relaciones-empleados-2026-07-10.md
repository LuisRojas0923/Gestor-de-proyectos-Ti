# Backend review: horarios prediseñados y relaciones de empleados

> **Estado documental:** CERRADO. Veredicto vigente `approved`; backend consolidado
> 154 passed y focal overrides 19 passed. Las revisiones bloqueadas se conservan
> abajo únicamente como historia.

**Fecha:** 2026-07-10
**Alcance:** build real del plan `docs/reviews/plans/2026-07-10_horarios-predisenados-relaciones-empleados.md`
**Veredicto:** `approved`

> **Revisión vigente:** segunda inspección posterior a correcciones. La sección
> “Revisión posterior a correcciones” al final reemplaza el estado de los
> hallazgos originales.

> **Actualización definitiva:** la sección “Revisión final definitiva” al final
> reemplaza todos los veredictos anteriores.

## Evidencia considerada

- Agente de implementación: **118 passed**, migración ejecutada dos veces e import de aplicación con **318 rutas**.
- Orquestador: **59 passed, 4 skipped**.
- Suite ERP local: no recolecta por ausencia de `pdfplumber`; se acepta como evidencia complementaria que el contenedor sí importa.
- Esta revisión fue estática; no se ejecutaron suites ni Docker.

La evidencia demuestra importabilidad y regresión focal favorable, pero no cubre los defectos de integridad y concurrencia siguientes.

## Hallazgos

### CRÍTICO — La migración puede instalar las tablas sin los constraints declarados

**Archivos:**

- `backend_v2/app/core/migrations/manager.py:31-34,144-146`
- `backend_v2/app/core/migrations/horarios_relaciones_migration.py:13-30,44-51`
- `backend_v2/app/models/novedades_nomina/plantillas_horario.py:15-49,88-104`

`SQLModel.metadata.create_all` corre antes de la migración crítica. Los modelos ya están importados por los routers/servicios al cargar la aplicación, por lo que `create_all` puede crear las tablas nuevas primero. Los modelos no expresan todos los constraints PostgreSQL del DDL: faltan, entre otros, los `CHECK` de `version`, rango de día/almuerzo y par de horas, además del `UNIQUE (solicitud_id, plantilla_id)` de aplicaciones. Después, `CREATE TABLE IF NOT EXISTS` no agrega esos constraints a una tabla existente.

La misma estrategia tampoco repara una tabla parcialmente creada. Por ello, ejecutar dos veces el script no prueba que el esquema resultante sea el requerido. La prueba actual (`testing/backend/test_horarios_plantillas.py:88-101`) solo verifica que no cambie el conteo de usuarios; no inspecciona constraints ni parte de un esquema previo real.

**Impacto:** el build puede arrancar exitosamente con un esquema más débil que el documentado, permitiendo datos inválidos y aplicaciones duplicadas. Esto invalida el carácter crítico/idempotente de la migración.

### ALTO — Se autoriza la cédula canónica, pero los bulk legacy mutan con el valor original

**Archivos:**

- `backend_v2/app/api/novedades_nomina/routers/horas_extras_planificador.py:145-160,180-193,209-223`
- `backend_v2/app/services/auth/alcance_empleados_service.py:27-31,91-98`
- `backend_v2/app/services/novedades_nomina/planificador_persistencia.py:118-129`

Los tres endpoints llaman `autorizar_lote`, pero descartan la lista normalizada que retorna. Luego pasan el payload original a guardado, precálculo y confirmación. Por ejemplo, una relación para `1007021351` autoriza el input `1.007.021.351`, pero `_guardar_un_empleado` solo hace `strip()` y persiste la versión con puntos.

**Impacto:** alias de una misma identidad pueden crear horarios/novedades separados, romper consultas posteriores y desacoplar el recurso autorizado del recurso realmente mutado.

### ALTO — El snapshot “anterior” de aplicar plantilla no está protegido frente a escritores concurrentes

**Archivo:** `backend_v2/app/services/novedades_nomina/plantillas_horario_service.py:303-350`

El servicio toma advisory locks propios, pero lee los días anteriores (`320-323`) antes de bloquear explícitamente la fila padre. El `upsert` del padre sucede después (`329-340`) y no existe `SELECT ... FOR UPDATE` previo. Cualquier flujo legacy que no use el mismo advisory lock puede modificar el horario entre la lectura del snapshot y los upserts.

**Impacto:** bajo concurrencia se puede guardar un `snapshot_anterior` que no corresponde al estado sobrescrito, perdiendo auditabilidad y habilitando lost updates. El plan exigía bloquear/crear el padre bajo lock antes de capturar y aplicar.

### ALTO — El bulk de borrador no conserva correctamente parciales de negocio

**Archivo:** `backend_v2/app/services/novedades_nomina/planificador_persistencia.py:85-108`

Todos los empleados comparten una transacción. Si falla uno, `session.rollback()` revierte también los empleados exitosos anteriores; sin embargo, sus contadores permanecen incrementados y el proceso continúa. El commit final puede responder éxitos que ya fueron revertidos.

**Impacto:** la respuesta no representa la persistencia real y se incumple la decisión del plan de conservar parciales legacy después de autorizar el lote completo. Se requieren savepoints por empleado o una delimitación transaccional equivalente.

### MEDIO — Una consulta ERP síncrona sigue ejecutándose en el event loop

**Archivo:** `backend_v2/app/api/novedades_nomina/routers/horas_extras_planificador.py:120-138`

`listar_ots_mano_obra` es `async`, pero llama directamente a `OrdenesTrabajoService.listar_ot_mano_obra` usando una sesión ERP síncrona. El nuevo worker de empleados sí respeta apertura/uso/cierre dentro de `run_in_threadpool`, pero el contrato global del plan para consultas ERP síncronas no se cumple en este endpoint del mismo planificador.

**Impacto:** una consulta ERP lenta bloquea el event loop y degrada todas las solicitudes concurrentes del backend.

### MEDIO — Faltan pruebas obligatorias para las garantías críticas

**Archivos:**

- `testing/backend/test_horarios_plantillas.py:88-101`
- `testing/backend/test_horarios_plantillas_service.py:110-220`
- `testing/backend/test_alcance_empleados.py:24-196`

No se encontraron pruebas que demuestren:

1. constraints del esquema resultante desde un esquema previo y desde tablas parciales;
2. fallo de migración crítica abortando startup;
3. triggers append-only rechazando `UPDATE` y `DELETE`;
4. dos solicitudes concurrentes compatibles/incompatibles para aplicación y relaciones;
5. historial/rollback/atomicidad PostgreSQL real de `cambiar_relaciones`;
6. carrera entre aplicar plantilla y escritura legacy;
7. normalización efectiva en los tres bulk legacy;
8. matriz IDOR de GeoFace administrativo y evidencia por registro;
9. parcial exitoso seguido de error de negocio en bulk legacy.

Los conteos passed reportados no sustituyen estas aserciones específicas.

### BAJO — Los contratos de facetas permanecen sin tipo concreto

**Archivos:**

- `backend_v2/app/models/auth/schemas_alcance_empleados.py:57-62`
- `backend_v2/app/models/novedades_nomina/schemas_horas_extras_planificador.py:38-46`

Ambos DTO usan `facetas: dict`. Debe existir un schema concreto para evitar respuestas arbitrarias y mantener el contrato Pydantic tipado.

## Aspectos conformes observados

- La migración nueva usa sintaxis PostgreSQL (`JSONB`, `TIMESTAMPTZ`, advisory locks, `ON CONFLICT`) y está registrada como crítica sin captura de excepción.
- Los workers nuevos de empleados ERP crean y cierran `SessionErp` dentro del threadpool.
- Las rutas y servicios nuevos permanecen async respecto a la DB local.
- `PATCH` de plantillas usa `model_dump(exclude_unset=True)`.
- RBAC y cobertura de auditoría registran los dos permisos críticos.
- La aplicación nueva usa un solo commit para ledger, horario, aplicación y snapshots, y ordena las cédulas antes de adquirir locks.
- `cruza_medianoche` se propaga por schemas, horario, planificador, cálculo y trazabilidad; el helper rechaza francos/pares/cruces inválidos.
- Los archivos backend revisados permanecen por debajo de 550 líneas (el router principal observado tiene 502).
- `docs/ESQUEMA_BASE_DATOS.md` y el catálogo de pruebas fueron actualizados.

## Pruebas requeridas para desbloquear

1. Integración PostgreSQL desde esquema previo que inspeccione todos los constraints, índices, FKs y triggers; repetir migración y probar tabla parcial.
2. Startup abortado ante fallo inducido de la migración crítica.
3. Concurrencia real para ledger, relaciones y aplicación; incluir escritor legacy concurrente sobre la misma cédula.
4. Bulk legacy con cédulas formateadas y verificación de que solo se persiste la identidad canónica.
5. Bulk legacy con éxito A/error B/éxito C, verificando DB y respuesta.
6. GeoFace administrativo: admin, gestor relacionado, gestor no relacionado, usuario sin cédula, registro inexistente y evidencia fuera de alcance.
7. Worker/thread test para toda consulta ERP síncrona del planificador.

## Seguimiento documental/RBAC

RBAC y documentación estructural están presentes. Tras corregir la migración, regenerar/verificar `docs/ESQUEMA_BASE_DATOS.md` contra el esquema PostgreSQL real y registrar las nuevas pruebas en `testing/CATALOGO_PRUEBAS.md`.

## Decisión

`blocked`: el esquema de producción puede quedar sin restricciones requeridas y existen defectos de identidad canónica, snapshots concurrentes y parciales legacy. Los resultados reportados son favorables, pero no cubren estos bloqueos.

---

## Revisión posterior a correcciones — 2026-07-10

### Correcciones confirmadas por inspección

1. **Constraints tras `create_all`: resuelto.**
   `backend_v2/app/core/migrations/horarios_relaciones_migration.py:81-116`
   agrega reparadores explícitos consultando `pg_constraint` por tabla y nombre.
   Cubre checks de versión, día, almuerzo y par de horas, y los unique de
   aplicaciones y relaciones. `testing/backend/test_horarios_migracion_seguridad.py:33-65`
   elimina los constraints de tablas existentes, vuelve a ejecutar la migración y
   verifica su recreación y el rechazo de una versión inválida. También se prueba
   que un fallo de esta migración crítica se propaga desde startup.

2. **Cédula canónica en bulk legacy: resuelto.**
   `backend_v2/app/api/novedades_nomina/routers/horas_extras_planificador.py:61-64,170-175,208-213,240-245`
   reemplaza las cédulas del payload por las devueltas por `autorizar_lote` antes
   de guardar, precalcular o confirmar. Existe prueba focal en
   `testing/backend/test_planificador_savepoints.py:19-22`.

3. **Lock antes del snapshot: resuelto.**
   `backend_v2/app/services/novedades_nomina/horario_lock_service.py:9-30`
   adquiere advisory lock, crea por upsert y bloquea la fila padre con
   `FOR UPDATE`. `plantillas_horario_service.py:304-326` ejecuta ese helper para
   todas las cédulas antes de leer snapshots. Los escritores localizados de horario
   semanal y bulk también usan el helper.

4. **Savepoints y contadores del borrador: resuelto.**
   `backend_v2/app/services/novedades_nomina/planificador_persistencia.py:86-107`
   delimita cada empleado con `begin_nested`, incrementa contadores únicamente tras
   liberar el savepoint y confirma al final. La prueba PostgreSQL
   `testing/backend/test_planificador_savepoints.py:25-68` demuestra
   éxito/error/éxito, persistencia y contadores coherentes.

5. **ERP worker OT: resuelto.**
   `backend_v2/app/services/erp/ordenes_trabajo_service.py:85-94` abre/cierra
   `SessionErp` dentro del worker y el router lo invoca mediante
   `run_in_threadpool` (`horas_extras_planificador.py:135-150`). Existe prueba de
   cierre de sesión en `test_planificador_savepoints.py:71-82`.

6. **DTO de facetas: resuelto.**
   `backend_v2/app/models/erp/schemas_empleados_horarios.py:1-10` define
   `FacetasEmpleados`, usado por ambos contratos de respuesta.

7. **Cobertura añadida parcialmente.**
   Se agregaron pruebas de constraints reparadores, append-only, fallo crítico,
   relaciones PostgreSQL y rollback, savepoints, worker OT, filtrado SQL GeoFace,
   evidencia fuera de alcance y redacción de PII. La recolección autorizada de las
   cinco suites focales encontró **32 tests**; no se ejecutaron desde esta revisión.

### Hallazgo restante

#### ALTO — Carrera al crear la misma relación con solicitudes diferentes

**Archivos:**

- `backend_v2/app/services/auth/alcance_empleados_service.py:228-260`
- `backend_v2/app/api/auth/alcance_empleados_router.py:149-160`
- `testing/backend/test_alcance_empleados.py:221-294`

`cambiar_relaciones` serializa por `solicitud_id`, no por
`(gestor_usuario_id, empleado_cedula)`. Para una relación inexistente,
`SELECT ... FOR UPDATE` no bloquea ninguna fila. Dos requests concurrentes con
UUID distintos pueden observar ausencia e intentar ambos el `INSERT`; el unique
preserva integridad física, pero el perdedor recibe `IntegrityError`. El router no
lo traduce a conflicto: cae en el `except Exception` y responde **503 “No fue
posible validar el ERP”**, aunque el ERP no falló.

No existe una prueba concurrente real de relaciones ni de aplicaciones; las nuevas
pruebas de relaciones son secuenciales. Esto deja sin demostrar una obligación
expresa de la matriz del plan.

**Corrección requerida:** serializar en orden canónico por clave de relación o usar
un upsert PostgreSQL con semántica definida; capturar `IntegrityError` después de
rollback/relectura y responder de forma determinista (`409` o replay/no-change,
según contrato). Añadir dos sesiones concurrentes con solicitudes distintas sobre
la misma relación y una prueba concurrente del ledger de aplicación.

### Riesgo adicional de cobertura

La cobertura GeoFace mejoró, pero todavía no representa toda la matriz solicitada
(admin global, gestor relacionado/no relacionado, usuario sin cédula, inexistente y
evidencia dentro/fuera de alcance a nivel HTTP). Se considera riesgo medio de
pruebas, no un defecto funcional adicional demostrado por la inspección.

### Veredicto vigente

`blocked`: los seis defectos concretos originales fueron corregidos, pero permanece
una carrera reproducible en relaciones que se reporta incorrectamente como caída
del ERP, y falta la prueba concurrente obligatoria que debía cerrar esa garantía.

---

## Revisión final definitiva — 2026-07-10

### Delta inspeccionado

1. **Carrera de relaciones corregida.**
   `backend_v2/app/services/auth/alcance_empleados_service.py:258-299` mantiene el
   lock de solicitud para replay y añade advisory locks por
   `relacion:{gestor}:{cedula}`, adquiridos en orden canónico antes de consultar o
   insertar cada relación. Dos solicitudes distintas sobre la misma relación quedan
   serializadas; la segunda relee la fila y retorna `sin_cambio`.

2. **`IntegrityError` correctamente separado de ERP.**
   `backend_v2/app/api/auth/alcance_empleados_router.py:142-168` limita el `503` a
   la frontera de validación ERP y traduce `IntegrityError` a `409`; el servicio
   hace rollback antes de propagar la excepción.

3. **Preliquidación protegida antes de ERP.**
   `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:230-257,308-342`
   autoriza y canonicaliza la cédula tanto en cálculo como confirmación antes de
   consultar el ERP. La sesión ERP síncrona se crea, usa y cierra dentro del worker
   de `horas_extras_erp_validacion.py:26-41`, invocado con `run_in_threadpool`.

4. **Carreras PostgreSQL reales cubiertas.**
   `testing/backend/test_relaciones_concurrencia.py:39-109` usa dos sesiones y UUID
   distintos sobre la misma relación, verificando una sola fila y resultados
   alta/sin-cambio. `:112-196` ejecuta dos sesiones sobre el mismo ledger de
   aplicación, verificando una aplicación y replay idempotente. La recolección
   autorizada encontró ambas pruebas y los 12 casos adicionales de segunda revisión.

5. **Pruebas focales adicionales.**
   `testing/backend/test_horarios_segunda_revision.py` cubre IDOR antes de ERP,
   canonicalización, `IntegrityError -> 409`, recursos indirectos, GeoFace con y
   sin relación, RBAC, selección determinista de jefe, ERP caído y disponibilidad
   por vacaciones/incapacidad/licencia.

### Evidencia aceptada

- Backend consolidado final: **154 passed**.
- Focal de overrides: **19 passed**.
- Carreras PostgreSQL reales: **2 passed**.
- Health reportado: **4 passed / 4 skipped**.
- Esta revisión ejecutó únicamente `pytest --collect-only` sobre las suites finales:
  **14 casos recolectados**; no reejecutó las pruebas.

### Hallazgos restantes

No se identificaron hallazgos backend bloqueantes, altos, medios o bajos en el delta
final. Las correcciones conservan PostgreSQL, async local, workers ERP, atomicidad,
idempotencia, RBAC, DTO concretos y documentación/pruebas exigidas.

### Veredicto definitivo

`approved`.
