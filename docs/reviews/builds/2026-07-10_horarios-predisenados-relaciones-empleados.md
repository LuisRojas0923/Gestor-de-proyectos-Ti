# Reporte de build: Horarios prediseñados y relaciones de empleados

**Fecha:** 2026-07-10
**Build:** Catalogo de horarios y alcance gestor-empleado
**Autor del build:** Implementacion local documentada por OpenCode
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti
**Rama:** `Modulo_Geoface` (`origin/Modulo_Geoface`)
**HEAD observado:** `52f93e115518d0e4f8c6eaf7de0c487d89d4604e` (`chore: registra cambios locales pendientes`)
**Estado:** CERRADO con riesgos residuales documentales/no funcionales
**Estado Git:** cambios de implementacion y correcciones de revisores sin commit

## 1. Archivos y capas

| Capa | Archivos principales observados |
|---|---|
| Migracion/datos | `backend_v2/app/core/migrations/horarios_relaciones_migration.py`, `manager.py`; reparacion explicita de constraints y triggers append-only |
| Modelos/schemas | Modelos de relacion, plantillas y biometria; `models/erp/schemas_empleados_horarios.py` tipa facetas |
| Servicios | Alcance, empleados ERP, plantillas y `horario_lock_service.py`; integraciones de Horas Extras, auditoria y Biometria |
| Routers | `api/auth/alcance_empleados_router.py`, `api/novedades_nomina/routers/horas_extras_plantillas.py`, routers de horario, planificador y biometria |
| Seguridad | RBAC/auditoria, autorizacion de recursos indirectos, redaccion de PII, auditoria por conteos y headers no-store |
| Frontend | 33 archivos reportados: servicios/tipos, Alcance, Plantillas, Biometria, editor/validacion de turnos, modal stack y rutas |
| Pruebas | Seis suites backend del track, helpers S7 y suites frontend nuevas/modificadas de paginas, modales, servicios y validadores |
| Documentacion | ADR-008, contrato API, bitacora, esquema, arquitectura, catalogo y este reporte |

## 2. Alcance construido

- Catalogo CRUD, duplicacion y desactivacion de plantillas versionadas.
- Turnos de siete dias con `cruza_medianoche` propagado a horario y trazabilidad.
- Aplicacion atomica con locks, copy-on-apply, snapshots y ledger.
- Relaciones M:N gestor-empleado con validacion ERP, historial y replay idempotente.
- Alcance operativo en Horarios/Planificador y consulta administrativa GeoFace.
- Pantallas web protegidas para Plantillas y Relaciones, mas vista de equipo GeoFace.

## 3. Correcciones posteriores a revision

- La migracion agrega por nombre los `CHECK` y `UNIQUE` faltantes aunque `create_all` haya creado antes las tablas; se añadieron pruebas de reparacion, datos invalidos, triggers y propagacion del fallo critico.
- Todos los escritores del horario usan `bloquear_horario_empleado`: advisory lock, creacion segura del padre y `FOR UPDATE` antes de capturar el snapshot.
- Los bulk legacy reemplazan el payload por cedulas canonicas autorizadas, usan savepoints por empleado y mantienen contadores acordes con lo persistido.
- La consulta sincrona de OT se movio a un worker que crea/cierra `SessionErp` dentro de `run_in_threadpool`.
- Calculos y novedades resuelven la cedula propietaria y aplican alcance tambien por ID indirecto; los listados reciben el conjunto permitido.
- Los bodies bulk de auditoria se sustituyen por conteos, el servicio redacta claves de cedula y los logs nuevos no incluyen la excepcion potencialmente sensible.
- Gestores y autoservicio biometrico agregan `Cache-Control: no-store, private`; las mutaciones de plantillas tienen atribucion uniforme de auditoria.
- Frontend conserva el UUID durante reintentos del mismo payload, impide doble submit y limita selecciones a 200.
- El modal compartido usa stack, un solo cierre por Escape, lock de scroll contado y restauracion de foco; se restituyo confirmacion de borrado de zona.
- Se agrego validacion compartida de turno nocturno, error/reintento de capacidades GeoFace, tabs ARIA y refresco del conteo de gestores.

## 4. Evidencia TDD

La evidencia roja inicial disponible registra esta secuencia:

1. El primer intento en Docker no encontro `testing/backend/test_horarios_plantillas.py` porque el directorio `testing` local no estaba montado dentro del contenedor. Este intento demuestra un problema de entorno, no un fallo funcional de la prueba.
2. La ejecucion local posterior si encontro la suite y fallo durante coleccion con `ModuleNotFoundError` para `app.models.novedades_nomina.schemas_plantillas_horario` y `app.services.auth.alcance_empleados_service`, que aun no existian.
3. Despues se implementaron modelos, servicios, migracion y rutas, y las suites pasaron a verde.

No se atribuye un conteo de fallos al rojo porque no fue proporcionado. La segunda ejecucion constituye evidencia TDD util: las pruebas alcanzaron el proyecto antes que los modulos de implementacion.

Suites backend nuevas/divididas:

- `testing/backend/test_horarios_plantillas.py`: validaciones de turno y migracion.
- `testing/backend/test_horarios_plantillas_service.py`: CRUD, historial, snapshots, rollback e idempotencia.
- `testing/backend/test_alcance_empleados.py`: normalizacion, M:N, filtros, permiso, replay y worker ERP.
- `testing/backend/test_horarios_migracion_seguridad.py`: constraints reparables, append-only y migracion critica.
- `testing/backend/test_horarios_security_http.py`: IDOR, alcance GeoFace, PII y no-store.
- `testing/backend/test_planificador_savepoints.py`: identidad canonica, parciales legacy y worker OT.
- `testing/backend/test_horarios_segunda_revision.py`: pre-liquidacion IDOR, frontera ERP, recursos indirectos, GeoFace, jefe contractual y disponibilidad VAC/INC/LIC.
- `testing/backend/test_relaciones_concurrencia.py`: dos carreras con sesiones PostgreSQL reales para relacion con UUID distintos y replay concurrente de aplicacion.

No se declara cobertura porcentual ni una matriz IDOR completa mas alla de los casos identificables en las suites.

## 5. Resultados reportados

Estos resultados fueron comunicados por la implementacion. No se reejecutaron en esta sesion documental.

| Ambito | Resultado reportado |
|---|---|
| Backend consolidado final | 154 passed |
| Overrides focal | 19 passed |
| Health | 4 passed, 4 skipped |
| Carreras PostgreSQL reales | 2 passed |
| Import de aplicacion en Docker | 318 rutas |
| Frontend final | 199 passed, 2 skipped |
| Frontend focal de ultimas correcciones | 10 passed, 0 failed |
| TypeScript | OK |
| Build frontend | OK |
| Lint focal post-correcciones | 0 errores, 0 warnings |
| Lint global | 531 errores, 63 warnings preexistentes |

Evidencia intermedia preservada: backend 149 y 134 passed, y frontend 196 passed/2 skipped; antes de esas correcciones, el orquestador habia reportado backend 59 passed/4 skipped y frontend 176 passed/2 skipped. Ninguno reemplaza el resultado final de esta tabla.

En esta sesion se ejecuto nuevamente `python scripts/sync_docs.py`: conecto a `project_manager`, regenero el bloque automatico y mantuvo las ocho tablas nuevas y las tres columnas `cruza_medianoche`. El diff incluye drift del esquema vivo ajeno al bloque manual; no se presenta como cambio funcional de este build.

## 6. Hallazgos y riesgos residuales

- Los conteos reportados no equivalen a cobertura de lineas, ramas o requisitos; no existe medicion de cobertura adjunta.
- Los reportes especializados conservan su historia y publican cierre vigente: backend/frontend aprobados; seguridad y docs/tests aprobados con riesgos.
- Los filtros derivados de empleados se realizan en memoria sobre el universo ERP recuperado con `sin_paginar=True`; requiere validar volumen y consumo antes de produccion amplia.
- El lint global permanece rojo con 531 errores/63 warnings reportados como preexistentes; el lint focal del delta es 0/0.
- La suite ERP no puede recolectarse localmente sin `pdfplumber`; el import de aplicacion si fue reportado desde Docker con 318 rutas.
- No existe una unica suite `test_alcance_horarios_geoface.py`; la cobertura identificable esta distribuida y no se inventan casos no observados.

## 7. Documentacion actualizada

- [x] `docs/ESQUEMA_BASE_DATOS.md` y bloque auto-generado.
- [x] `docs/decisions/ADR-008-alcance-empleados-y-aplicacion-inmutable-horarios.md`.
- [x] `docs/bitacora/2026-07-10-horarios-relaciones-empleados.md`.
- [x] `docs/ARQUITECTURA_FRONTEND.md`.
- [x] `docs/specs/2026-07-10_contrato-api-horarios-relaciones-empleados.md`.
- [x] `testing/CATALOGO_PRUEBAS.md`.

## 8. Revision

| Revisor | Veredicto final | Observacion |
|---|---|---|
| Backend | `approved` | Integridad, concurrencia, ERP y overrides cerrados. |
| Frontend | `approved` | Flujos, accesibilidad y validaciones corregidos. |
| Security/RBAC | `approved_with_risks` | Sin hallazgos funcionales; riesgo bajo por evidencia reportada. |
| Docs/tests | `approved_with_risks` | Sin cobertura porcentual ni artefacto CI adjunto. |

## 9. Decision

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

**Cierre:** build aprobado con riesgos. No quedan hallazgos funcionales bloqueantes reportados. Los riesgos residuales son cobertura no medida, lint global heredado, dependencia local ausente y evidencia verde reportada sin artefacto CI adjunto.

## 10. Seguimiento

| Accion | Responsable | Estado |
|---|---|---|
| Revisar escalabilidad del filtrado ERP en memoria | Backend reviewer | Pendiente |
| Validar UX responsive, foco y teclado | Frontend reviewer/QA | Pendiente |
| Resolver baseline de lint global y disponibilidad local de `pdfplumber` | Equipo | Pendiente |
