# Bitacora: Horarios prediseñados y relaciones de empleados

**Fecha:** 2026-07-10
**Rama:** `Modulo_Geoface`
**Commit base observado:** `52f93e115518d0e4f8c6eaf7de0c487d89d4604e`
**Estado:** CERRADO; backend/frontend aprobados y security/docs-tests aprobados con riesgos

## Objetivo

Registrar el estado real del catalogo de plantillas semanales, el alcance gestor-empleado y su integracion con Horarios y GeoFace. Esta sesion solo modifica documentacion; no modifica codigo de aplicacion ni pruebas.

## Implementacion observada

- Se crearon relaciones M:N locales entre `usuarios.id` y cedulas ERP canonicas, con alta, baja, reactivacion e historial.
- Se centralizaron normalizacion, bypass exclusivo de `admin`, autorizacion individual y por lote, y capacidad de supervision.
- Se agrego un catalogo versionado de plantillas de siete dias con turnos que pueden cruzar medianoche.
- Aplicar una plantilla hace copy-on-apply sobre el horario pactado y guarda snapshots anterior/aplicado por empleado.
- Relaciones y aplicaciones usan UUID de solicitud, hash canonico, advisory locks y ledger idempotente en la misma transaccion.
- Historiales y aplicaciones tienen triggers append-only contra `UPDATE` y `DELETE`.
- Horarios/Planificador autorizan el lote antes de guardar, pre-calcular o confirmar. Los errores de negocio legacy conservan su tratamiento parcial.
- GeoFace mantiene autoservicio separado y agrega capacidades, listado administrativo y evidencia por `registro_id` con alcance por cedula.
- El frontend agrega rutas lazy protegidas, pantallas modulares de Plantillas y Alcance, editor semanal reutilizable, tabla desktop y tarjetas moviles.

## Diferencias frente al plan

- Las nuevas pruebas backend quedaron divididas en `test_horarios_plantillas.py`, `test_horarios_plantillas_service.py` y `test_alcance_empleados.py`; no existe la suite propuesta `test_alcance_horarios_geoface.py`.
- Los filtros derivados de empleados se aplican en memoria mediante `filtrar_paginar_empleados` despues de consultar el universo ERP permitido con `sin_paginar=True`; no todos se traducen a SQL ERP.
- El contrato administrativo usa `ciudadcontratacion` en el item y `ciudades` en query/facetas.
- La aplicacion de plantilla valida alcance local, pero el servicio observado no vuelve a validar contra ERP la actividad de cada cedula en ese endpoint.

## Correcciones de revisores

- Migracion endurecida para reparar constraints ausentes tras `create_all`, probar triggers append-only y propagar fallos criticos de startup.
- Lock compartido entre plantilla, horario semanal y planificador antes de leer/escribir el horario pactado.
- Savepoints por empleado e identidad canonica efectiva en bulk legacy; worker ERP de OT fuera del event loop.
- Alcance agregado a calculos y novedades por ID indirecto y a sus listados.
- Auditoria minimizada a conteos, redaccion de cedulas y logs sin excepciones con PII; headers no-store ampliados.
- Frontend corregido para reintento idempotente, doble submit, limite 200, modal stack, validacion nocturna, confirmacion destructiva y errores/tabs GeoFace.
- Se agregaron suites especificas de migracion/seguridad HTTP/savepoints y pruebas frontend de las pantallas y modales corregidos.

## TDD y validaciones reportadas

Evidencia roja inicial disponible:

1. Un primer intento Docker no encontro `testing/backend/test_horarios_plantillas.py` porque `testing` local no estaba montado. Fue un fallo de entorno, no del comportamiento probado.
2. La ejecucion local posterior fallo en coleccion con `ModuleNotFoundError` para `app.models.novedades_nomina.schemas_plantillas_horario` y `app.services.auth.alcance_empleados_service`.
3. La implementacion posterior creo esos modulos y llevo las suites a verde.

No se conoce el conteo exacto del rojo, por lo que no se inventa. La coleccion fallida por modulos inexistentes deja evidencia de que la suite precedio a esa implementacion.

Resultados finales post-correcciones comunicados para el build, no reejecutados durante esta sesion documental:

- Backend consolidado: 154 passed.
- Overrides focal: 19 passed.
- Health: 4 passed, 4 skipped.
- Carreras PostgreSQL reales: 2 passed.
- Import de app en Docker: 318 rutas.
- Frontend: 199 passed, 2 skipped.
- Frontend focal de ultimas correcciones: 10 passed, 0 failed.
- TypeScript y build: OK.
- Lint focal: 0 errores, 0 warnings.
- Lint global: 531 errores y 63 warnings reportados como preexistentes.

Como historia intermedia se conservan backend 149 y 134 passed, y frontend 196 passed/2 skipped. Antes de esas correcciones, el orquestador habia reportado backend 59 passed/4 skipped y frontend 176 passed/2 skipped. No hay medicion de cobertura.

Veredictos de cierre: backend `approved`, frontend `approved`, security `approved_with_risks` sin hallazgos funcionales y docs/tests `approved_with_risks`.

La suite ERP no recolecta en el entorno local por ausencia de `pdfplumber`; el import de aplicacion fue reportado desde Docker.

## Documentacion producida

- `docs/decisions/ADR-008-alcance-empleados-y-aplicacion-inmutable-horarios.md`.
- `docs/specs/2026-07-10_contrato-api-horarios-relaciones-empleados.md`.
- `docs/reviews/builds/2026-07-10_horarios-predisenados-relaciones-empleados.md`.
- Actualizacion de esquema, arquitectura frontend y catalogo de pruebas.
- `python scripts/sync_docs.py` ejecutado nuevamente con exito contra `project_manager`; la seccion automatica conserva las tablas nuevas y `cruza_medianoche`.
- No se repitio `sync_docs.py` en el ultimo cierre porque las correcciones finales solo modifican autorizacion ERP y pruebas; no hay delta nuevo de modelo o migracion desde la sincronizacion anterior.

## Pendientes

- Mantener separado el lint focal 0/0 del baseline global rojo.
- Instalar o disponer `pdfplumber` en el entorno local si se requiere recolectar la suite ERP fuera de Docker.
- Realizar prueba manual responsive, teclado y foco de los flujos nuevos.
- No se creo commit ni se hizo push.
