# Plan - Horarios prediseñados y relaciones de empleados

**Fecha:** 2026-07-10
**Plan:** Catálogo de horarios y alcance gestor-empleado para Horarios y GeoFace
**Autor del plan:** OpenCode
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti
**Rama base:** `Modulo_Geoface`
**Especificación:** `docs/specs/2026-07-10_horarios-predisenados-relaciones-empleados.md`
**Estado de ejecución:** CERRADO; backend/frontend approved, security/docs-tests approved_with_risks

---

## 1. Objetivo

Implementar un catálogo auditable de horarios semanales prediseñados y una pantalla protegida para administrar relaciones muchos-a-muchos entre gestores del portal y empleados ERP. La relación limitará en backend los empleados visibles y operables en Horarios/Planificador y en la consulta administrativa de GeoFace.

## 2. No-objetivos

- No modificar `movil/`, `modulo_actividades_fork/` ni `biometria-engine/`.
- No integrar marcas GeoFace con liquidación HE en esta entrega.
- No cambiar reglas legales, bolsa, compensación ni costos OT.
- No reutilizar `relaciones_usuarios`: representa jerarquía local, no alcance ERP.
- No crear una réplica local completa de empleados ni modificar el ERP.
- No hacer propagación automática al editar una plantilla.
- No rediseñar todas las pantallas legacy de Horas Extras o Biometría.

## 3. Decisiones cerradas

| Tema | Decisión |
|---|---|
| Cardinalidad | Varios gestores pueden compartir un empleado |
| Identidad | Gestor por `usuarios.id`; empleado por cédula ERP canónica |
| Aplicación de plantilla | Copia explícita al horario pactado y snapshot inmutable |
| Edición posterior | No modifica aplicaciones previas |
| Disponibilidad | Calculada para semana ISO: activo + autorización efectiva + sin novedad bloqueante |
| Jornada nocturna | Soportada con `cruza_medianoche` |
| Bulk nuevo | Aplicación de plantilla y relaciones: atómico, máximo 200 e idempotente |
| Bulk legacy | Autoriza el lote completo antes de escribir y conserva resultados parciales de negocio |
| Bypass | Solo rol canónico `admin`; siempre conserva permiso funcional |
| Jefe | `contrato.jefe` del contrato activo más reciente |
| Migración | Scripts PostgreSQL idempotentes registrados en `core/migrations/manager.py` |
| Auditoría | Historial de dominio en la misma transacción; middleware solo complementario |

## 4. Diseño de datos PostgreSQL

### 4.1 Plantillas

Crear modelos y migración para:

#### `nomina_plantillas_horario`

- `id UUID PRIMARY KEY`.
- `nombre VARCHAR(120) NOT NULL`.
- `descripcion VARCHAR(500)`.
- `version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)`.
- `esta_activa BOOLEAN NOT NULL DEFAULT TRUE`.
- `creado_por_id` y `actualizado_por_id`, FK a `usuarios.id`.
- `creado_en` y `actualizado_en TIMESTAMPTZ`.
- Índice único funcional para nombre normalizado activo.

#### `nomina_plantillas_horario_dias`

- `plantilla_id UUID`, FK con `ON DELETE RESTRICT`.
- `dia_semana SMALLINT CHECK (dia_semana BETWEEN 1 AND 7)`.
- `hora_entrada TIME`, `hora_salida TIME`.
- `minutos_almuerzo SMALLINT CHECK (minutos_almuerzo BETWEEN 0 AND 240)`.
- `cruza_medianoche BOOLEAN NOT NULL DEFAULT FALSE`.
- PK `(plantilla_id, dia_semana)`.
- Check de par de horas: ambas nulas o ambas presentes.
- El servicio valida exactamente los días 1 a 7 dentro de la transacción.

#### `nomina_plantillas_horario_historial`

- Evento append-only de crear, editar, duplicar y desactivar.
- Snapshot `JSONB` de la plantilla y sus siete días.
- Actor JWT, versión y `creado_en TIMESTAMPTZ`.
- Sin borrado físico desde API.

#### `nomina_aplicaciones_plantilla_horario`

- `id UUID PRIMARY KEY` y referencia a la operación idempotente.
- FK a plantilla con `ON DELETE RESTRICT`.
- Versión y nombre capturados.
- Actor JWT, cantidad de empleados, estado y timestamp.

#### `nomina_aplicaciones_plantilla_empleados`

- PK `(aplicacion_id, empleado_cedula)`.
- Snapshot `JSONB` anterior y aplicado de los siete días.
- Estado final y timestamp.
- Índices por cédula y aplicación.

#### `operaciones_idempotentes`

- `solicitud_id UUID` y `tipo_operacion VARCHAR(50)`, PK compuesta.
- Actor y recurso objetivo normalizados.
- `payload_hash VARCHAR(64)` calculado sobre JSON canónico.
- Estado controlado y resultado sanitizado `JSONB` basado en IDs internos y conteos.
- `creado_en` y `finalizado_en TIMESTAMPTZ`.
- Mismo UUID, tipo, actor, objetivo y hash devuelve el resultado guardado.
- Mismo UUID con actor, objetivo o hash diferente devuelve `409`.
- La reserva, mutación y respuesta final se confirman en la misma transacción.

Agregar `cruza_medianoche BOOLEAN NOT NULL DEFAULT FALSE` a `nomina_horario_pactado_dia`. Actualizar duración: si cruza medianoche, sumar 24 horas a la salida antes de restar entrada y almuerzo.

### 4.2 Relaciones de alcance

#### `relaciones_gestor_empleado`

- `id UUID PRIMARY KEY`.
- `gestor_usuario_id VARCHAR(50)`, FK a `usuarios.id`.
- `empleado_cedula VARCHAR(50)` canónica y compatible con los contratos existentes.
- `esta_activa BOOLEAN NOT NULL DEFAULT TRUE`.
- Actor y timestamps de creación/actualización.
- `UNIQUE (gestor_usuario_id, empleado_cedula)` para reactivar la misma fila.
- Índices `(gestor_usuario_id, esta_activa)` y `(empleado_cedula, esta_activa)`.

#### `historial_relaciones_gestor_empleado`

- Evento append-only de alta, baja y reactivación.
- FK a la relación, actor, acción, estado anterior/nuevo y timestamp.
- No almacenar cuerpos bulk, nombres, cargos, fotos, coordenadas ni biometría.

Las tablas de historial, aplicaciones y detalle de aplicaciones serán append-only. La API no expondrá update/delete y la migración instalará triggers PostgreSQL que rechacen `UPDATE` o `DELETE`.

### 4.3 Concurrencia e integridad

- Normalizar cédulas con una única función compartida, patrón restrictivo y longitud máxima 50 compatible con el modelo actual.
- Bloquear horarios destino en orden canónico mediante `pg_advisory_xact_lock(hashtextextended(cedula, 0))`; después crear por upsert y bloquear la fila padre.
- Aplicar días con `INSERT ... ON CONFLICT DO UPDATE` dentro de una sola transacción.
- Bajo los mismos locks: bloquear plantilla/versión, capturar siete días anteriores canónicos, aplicar, capturar siete días resultantes y escribir operación, aplicación, snapshot e historial antes del commit único.
- Capturar `IntegrityError`, hacer rollback y responder `409` sin revelar existencia de cédulas ajenas.
- Francos se capturan con horas nulas, almuerzo 0 y `cruza_medianoche=false`.
- La migración corre en transacción PostgreSQL, se marca crítica y cualquier error se propaga para impedir el arranque. Debe probarse desde esquema previo y en una segunda ejecución idempotente.

## 5. Backend

### 5.1 Estructura propuesta

- `backend_v2/app/models/novedades_nomina/plantillas_horario.py`
- `backend_v2/app/models/novedades_nomina/schemas_plantillas_horario.py`
- `backend_v2/app/services/novedades_nomina/plantillas_horario_service.py`
- `backend_v2/app/api/novedades_nomina/routers/horas_extras_plantillas.py`
- `backend_v2/app/models/auth/relacion_gestor_empleado.py`
- `backend_v2/app/models/auth/schemas_alcance_empleados.py`
- `backend_v2/app/services/auth/alcance_empleados_service.py`
- `backend_v2/app/api/auth/alcance_empleados_router.py`
- `backend_v2/app/core/migrations/horarios_relaciones_migration.py`
- Nuevas pruebas TDD en `testing/backend/` antes de crear la lógica.

Cada archivo debe permanecer por debajo de 550 líneas y respetar router → service → model.

### 5.2 Servicio central de alcance

Implementar funciones tipadas para:

- Resolver cédulas activas permitidas para el usuario.
- Verificar una cédula sin revelar si existe fuera del alcance.
- Verificar un lote completo antes de cualquier mutación.
- Resolver `RegistroAsistencia.usuario_id → Usuario.cedula` para GeoFace.
- Aplicar bypass exclusivamente a `usuario.rol == "admin"`.

La falla de DB local o ERP será fail-closed. Para consultas ERP de gestores, obtener primero las cédulas locales y pasarlas al worker ERP como filtro `ANY`, antes de contar y paginar.

Para cada consulta ERP síncrona, una función completa dentro de `run_in_threadpool` creará `SessionErp`, consultará y cerrará en `finally`. Ningún `AsyncSession` local ni una sesión ERP creada por una dependencia del router cruzará al worker.

### 5.3 Contratos HTTP

#### Plantillas

- `GET /api/v2/novedades-nomina/horas-extras/plantillas-horario`
- `POST /api/v2/novedades-nomina/horas-extras/plantillas-horario`
- `GET /api/v2/novedades-nomina/horas-extras/plantillas-horario/{plantilla_id}`
- `PATCH /api/v2/novedades-nomina/horas-extras/plantillas-horario/{plantilla_id}`
- `POST /api/v2/novedades-nomina/horas-extras/plantillas-horario/{plantilla_id}/desactivar`
- `POST /api/v2/novedades-nomina/horas-extras/plantillas-horario/{plantilla_id}/duplicar`
- `POST /api/v2/novedades-nomina/horas-extras/plantillas-horario/{plantilla_id}/aplicaciones`

CRUD y duplicación exigen `nomina_horas_extras.plantillas_horario.administrar`. Duplicar exige nombre nuevo, crea versión 1 con siete días y evento `DUPLICADA`. Aplicación exige `nomina_horas_extras.planificar` y alcance sobre todos los empleados. `PATCH` usa schemas concretos, `version_esperada` y `exclude_unset=True`.

#### Relaciones

- `GET /api/v2/alcance-empleados/gestores`
- `GET /api/v2/alcance-empleados/gestores/{gestor_id}/empleados`
- `PUT /api/v2/alcance-empleados/gestores/{gestor_id}/relaciones`

Los tres exigen `alcance_empleados.administrar`. El GET de empleados devuelve el catálogo ERP completo, paginado y filtrable, con `relacionado` calculado respecto al `gestor_id`; esta excepción administrativa no aplica el alcance operativo del actor y no se reutiliza fuera de esta ruta. El `PUT` recibe `solicitud_id`, `cedulas_agregar` y `cedulas_quitar`, rechaza intersecciones con `422`, valida el estado ERP en lote y aplica todo o nada. Un actor no admin no puede modificar sus propias relaciones.

#### Empleados ERP y disponibilidad

Mantener dos contratos de ruta sobre un servicio ERP compartido:

- `GET /planificador/empleados-erp`: modo operativo, exige planificación, filtra por alcance del actor y no expone `relacionado`.
- `GET /alcance-empleados/gestores/{gestor_id}/empleados`: modo administrativo, exige administración de relaciones, consulta el universo ERP y calcula `relacionado` para el gestor objetivo.

En ambos contratos:

- Abrir y cerrar la sesión ERP dentro de `run_in_threadpool`.
- Filtrar alcance antes de `COUNT`, búsqueda y paginación.
- Elegir contrato activo más reciente de forma determinista.
- Exponer `jefe`, `autoriza_he`, `disponible_semana` y `motivo_no_disponible`; solo el modo administrativo expone `relacionado`.
- Aceptar `anio`, `semana_iso`, filtros, orden, `limit` y `offset`.
- Resolver facetas server-side para filtros de columna sin usar solo la página cargada.
- Devolver `503` ante indisponibilidad ERP, sin fallback global.

Antes de implementar, inspeccionar el tipo real de `contrato.jefe`; resolver nombres en lote si contiene un identificador.

La disponibilidad valida la semana con `date.fromisocalendar`. Usa contrato activo, override `ACTIVO` más reciente superpuesto o `autoriza_he_default`, y novedades `CONFIRMADO` superpuestas de categoría `VACACION`, `INCAPACIDAD` o `LICENCIA`. Motivos cerrados: `EMPLEADO_INACTIVO`, `NO_AUTORIZA_HE`, `VACACIONES`, `INCAPACIDAD`, `LICENCIA`.

### 5.4 Matriz de endpoints protegidos por alcance

| Flujo | Endpoint/operación | Control |
|---|---|---|
| Tabla de empleados | `GET /planificador/empleados-erp` | Permiso funcional + filtro de cédulas |
| Horario pactado legacy | `GET/PUT /horario/{cedula}` | Permiso funcional + alcance |
| Horario semanal | `GET/PUT /horario/{cedula}/semana` | Permiso funcional + alcance |
| Guardado masivo legacy | `POST /horario/registros/bulk` | Autorizar lote completo; conservar parciales de negocio |
| Pre-cálculo | `POST /planificador/pre-calcular` | Autorizar lote completo; no persiste ni usa ledger |
| Confirmación legacy | `POST /planificador/confirmar` | Autorizar lote completo; conservar parciales de negocio |
| Aplicar plantilla | `POST /plantillas-horario/{id}/aplicaciones` | Planificar + alcance completo |
| GeoFace propio | Estado, enrolamiento, marca e historial propio | Mantener ownership actual |
| GeoFace equipo | Nuevo `GET /biometria/admin/asistencias` | `biometria` + alcance, paginado |
| Evidencia equipo | Nuevo `GET /biometria/admin/evidencias/{registro_id}` | Resolver registro y validar alcance |

Quedan fuera de esta entrega bolsa, compensación, costos OT y otros recursos no usados por Horarios/Planificador.

Los endpoints `/autorizacion/{cedula}` usados por la tabla quedan incluidos en alcance. Overrides administrativos, bolsa, pre-liquidación independiente y costos OT quedan expresamente fuera porque no forman parte de las dos pantallas ni del flujo de aplicación de plantillas.

Validar alcance de todo el lote antes de escribir elimina parciales no autorizados, pero no cambia la semántica legacy de continuar ante errores de negocio de un empleado. Solo `PUT relaciones` y `POST aplicaciones` son atómicos e idempotentes en esta entrega.

### 5.5 Propagación de turnos nocturnos

Agregar `cruza_medianoche` a schemas de horario semanal, `PlanDiaIn`, registros diarios, modelos persistidos, snapshots y tipos frontend. Actualizar los helpers de duración usados por pre-cálculo, confirmación y trazabilidad. Costos OT permanece fuera de alcance y solo recibe los totales ya calculados por el flujo existente.

- Franco: ambas horas nulas, almuerzo 0 y flag falso.
- Turno del mismo día: salida mayor que entrada y flag falso.
- Turno cruzado: salida menor que entrada y flag verdadero.
- Entrada y salida iguales son inválidas.
- Duración efectiva debe ser mayor que cero y menor de 24 horas.

`cruza_medianoche` solo calcula el intervalo. No sustituye `es_jornada_nocturna` ni clasifica automáticamente HEN/HEFN; las reglas legales existentes siguen usando fecha y franja horaria.

### 5.6 GeoFace administrativo

- Mantener separados autoservicio y supervisión.
- Crear consulta administrativa paginada con filtros por fechas, usuario, zona y resultado.
- El empleado siempre puede ver sus propias marcas mediante el flujo actual.
- Un gestor con permiso `biometria` y relaciones activas puede ver solo su equipo.
- El administrador canónico con permiso `biometria` puede consultar todo.
- La evidencia se solicita por ID de registro, no se autoriza por filename.
- Los DTO administrativos omiten correo, salario, ARL, embeddings, coordenadas y confianza salvo que exista una necesidad aprobada posterior.
- El autoservicio deriva usuario solo del JWT; el parámetro legacy `usuario_id` deja de habilitar terceros.
- Las rutas legacy por filename quedan limitadas a ownership propio. Toda consulta de equipo, incluido admin, usa las rutas administrativas.
- Recurso inexistente, usuario sin cédula y recurso fuera de alcance responden el mismo `404` genérico.
- Evidencias y fotos usan `Cache-Control: no-store, private` y no revelan filename físico.
- Listados ERP, relaciones y asistencias administrativas con PII también usan `Cache-Control: no-store, private`.
- `GET /biometria/admin/capacidades` devuelve únicamente `{puede_supervisar_equipo}` según rol canónico o existencia de relaciones activas; el frontend usa este contrato para habilitar la vista de equipo.

### 5.7 RBAC y auditoría

Registrar en `backend_v2/app/core/rbac_manifest.py`, con `es_critico=True`:

- `nomina_horas_extras.plantillas_horario.administrar`
- `alcance_empleados.administrar`

Registrar mutaciones y lecturas sensibles en `auditoria_manifest.py`. El historial de dominio se confirma en la misma transacción que la mutación crítica; no depende del middleware HTTP fail-open. Los logs generales solo incluyen IDs internos, correlación y conteos.

Los identificadores UUID serán tipos UUID en Pydantic. Cédulas y `gestor_id` usarán `Field`/`Path` con longitud y patrón restrictivos. Access logs y auditoría registrarán plantilla de ruta, correlación, IDs internos y conteos, nunca URL completa, query string, cédula o payload.

## 6. Frontend

### 6.1 Estructura modular

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PlantillasHorario/`
- `frontend/src/pages/ServicePortal/pages/AlcanceEmpleados/`
- Cada carpeta tendrá página coordinadora, `components/`, `hooks/`, `types.ts` y pruebas.
- Extender servicios tipados y `frontend/src/config/api.ts`; no hardcodear URLs en las páginas.
- No ampliar `DataTable.tsx` (551 líneas), `EmpleadosActivosPanel.tsx` (549) ni `ServicePortal.tsx` (532). Extraer las rutas nuevas a configuración/componente modular para mantener archivos modificados por debajo de 550 líneas.

### 6.2 Editor semanal reutilizable

Extraer de `DefaultHorarioSemana` un `WeeklyScheduleEditor` controlado, sin textos de pasos ni acción específica del planificador. Debe:

- Usar átomos existentes y tokens CSS.
- Editar siete días, francos, almuerzo y `cruza_medianoche`.
- Reutilizar `TimeClockPicker` tras completar teclado, estados ARIA y restauración de foco.
- Componerse tanto en la nueva pantalla como en el flujo actual sin alterar visualmente este último.
- Todos los diálogos usan `Modal` y prueban semántica dialog, nombre accesible, trampa/restauración de foco, Escape y scroll lock. Los popovers tienen nombre accesible, Escape y retorno de foco al disparador.

### 6.3 Tabla de relaciones

Reutilizar el patrón visual actual sin crear encabezados multinivel nuevos:

- Una columna `Empleado` apila nombre, cédula y cargo.
- Una columna `Operación` apila área, ciudad y jefe.
- Una columna `HE` apila dos badges independientes: autorización y disponibilidad.
- Una columna fija de selección usa `Checkbox` con nombre accesible.

La página manejará selección por cédula fuera de la página actual, contador global, cambios pendientes y prevención de doble submit. `Seleccionar página` solo afecta resultados visibles; no se ofrecerá "seleccionar todos los resultados" en la primera entrega.

Los filtros, búsqueda, orden y facetas serán remotos. Un hook cancelará solicitudes anteriores con `AbortController` o descartará respuestas por request ID. En móvil se renderizarán tarjetas con los mismos datos y acciones táctiles de al menos 44 px.

El contrato tipado fijará codificación de búsqueda, filtros multivalor, orden, `anio`, `semana_iso`, `limit` y `offset`, y respuesta `{items, total, limit, offset, facetas}`. Relaciones tendrá skeleton, vacío, error con reintento y estados de guardado mediante `Callout` y notificaciones existentes.

`Aplicar a empleados` reutilizará un navegador presentacional de empleados con el mismo contrato operativo paginado y filtrable, selección por cédula entre páginas y tarjetas móviles; no reutilizará la lógica de administración de relaciones ni mostrará empleados fuera del alcance.

### 6.4 Navegación y permisos

- Añadir rutas lazy y tarjetas de acceso para Plantillas y Relaciones.
- Proteger Plantillas con `nomina_horas_extras.plantillas_horario.administrar`.
- Proteger Relaciones con `alcance_empleados.administrar`.
- Mostrar la vista de equipo GeoFace cuando el backend confirme relaciones activas; la API sigue siendo la autoridad.
- Corregir la ruta de Biometría para declarar su `moduleCode` existente y evitar navegación que termina en `403` inesperado.
- La acción `Aplicar a empleados` solo se muestra/habilita con `nomina_horas_extras.planificar`; administrar el catálogo no basta. El backend continúa como autoridad y un `403` tiene estado UX explícito.

## 7. Pasos de implementación TDD

1. Crear ADR para separar alcance de jerarquía, identidad por cédula y copy-on-apply con snapshot.
2. Escribir pruebas rojas de migraciones, constraints y modelos nuevos.
3. Implementar migración PostgreSQL idempotente y modelos.
4. Escribir pruebas rojas del servicio de alcance: normalización, M:N, alta/baja/reactivación, concurrencia y fail-closed.
5. Implementar relaciones, historial durable, router y RBAC.
6. Escribir pruebas rojas de plantillas: siete días, turnos nocturnos, CRUD, versión y snapshot.
7. Implementar catálogo y aplicación atómica/idempotente con locks y upsert.
8. Escribir pruebas rojas de disponibilidad semanal, jefe ERP y sesión ERP dentro del worker.
9. Implementar contratos ERP operativo y administrativo con filtros/facetas server-side y datos independientes de autorización/disponibilidad.
10. Escribir matriz roja de IDOR para todos los endpoints de Horarios/Planificador listados.
11. Integrar el servicio de alcance en esos endpoints sin ampliar el alcance a otros submódulos.
12. Escribir pruebas rojas de GeoFace propio/equipo, paginación y evidencia por registro.
13. Implementar endpoints administrativos GeoFace separados y DTO minimizado.
14. Extraer y probar `WeeklyScheduleEditor`; mantener el flujo existente estable.
15. Implementar pantalla Plantillas con servicios, hooks, validación y estados.
16. Implementar pantalla Relaciones con filtros remotos, selección persistente y versión móvil.
17. Añadir navegación y guardas de los dos permisos.
18. Ejecutar regresiones focales, suite completa, lint, typecheck y build.
19. Sincronizar esquema/documentación y producir reporte de build con evidencia.

## 8. Matriz mínima de pruebas

### Backend

- Migración inicial, preservación de datos y segunda ejecución.
- Plantilla válida, días faltantes/duplicados, horas incompletas, almuerzo inválido y nocturna válida/inválida.
- Edición incrementa versión; desactivación no borra historial.
- Aplicación actualiza siete días y conserva snapshots anterior/aplicado.
- Edición posterior no altera snapshots ni horarios ya aplicados.
- Misma `solicitud_id` no duplica; concurrencia incompatible devuelve `409`.
- Misma solicitud con hash igual devuelve resultado; hash, actor u objetivo diferente devuelve `409`.
- Fallo de una cédula revierte todo el lote.
- Relación M:N, duplicado, reactivación, baja, carrera y actor no admin modificándose a sí mismo.
- Usuario sin token `401`; sin permiso `403`; con permiso pero sin relación denegado.
- Admin con permiso ve todo; rol no admin con permisos no obtiene bypass.
- IDOR por path, query, body, registro de asistencia y evidencia.
- Totales, búsqueda, filtros y facetas excluyen empleados no relacionados.
- Empleado conserva historial propio; gestor solo equipo.
- ERP caído devuelve `503`; sesión se abre y cierra dentro del worker.
- Jefe real corresponde al contrato activo más reciente sin N+1.
- Disponibilidad semanal bloqueada por vacaciones/incapacidad/licencia superpuesta.
- Auditoría durable no contiene body bulk, fotos, coordenadas ni biometría.
- Triggers append-only rechazan update/delete de snapshots e historiales.
- Fallo de migración crítica impide el arranque.
- Bulk legacy rechaza todo antes de escribir si alguna cédula está fuera de alcance, pero conserva parciales por errores de negocio posteriores.
- Turno 22:00-06:00 se propaga por horario, planificador, pre-cálculo, confirmación y trazabilidad sin alterar clasificación legal ni ampliar costos OT.

### Frontend

- Servicios serializan filtros, semana, paginación y `solicitud_id`.
- Plantillas: loading, vacío, error/reintento, crear, editar, desactivar y aplicar.
- Editor semanal: siete días, franco, nocturna, teclado, Escape y foco.
- Relaciones: cambio de gestor, cambios pendientes, selección entre páginas, filtros, guardar y doble submit.
- `Autoriza` y `Disponible` se renderizan y filtran de forma independiente.
- Jefe ERP se muestra en `Operación`.
- Respuestas obsoletas no reemplazan datos recientes.
- Guardas de ruta independientes para los dos permisos.
- GeoFace no vuelve a filtrar localmente como fuente de verdad.
- Vista móvil y navegación por teclado.
- Formularios y modales cubren validación, foco, Escape, scroll lock, submit deshabilitado, doble submit, `403` y errores sin `any`.

## 9. Comandos de validación

- `docker compose exec backend pytest testing/backend/test_horarios_plantillas.py testing/backend/test_alcance_empleados.py testing/backend/test_alcance_horarios_geoface.py -v`
- `docker compose exec backend pytest testing/backend/test_horas_extras_s2.py testing/backend/test_horas_extras_s5pp_horario_semana.py testing/backend/test_horas_extras_s5ppp_integracion.py testing/backend/test_horas_extras_s7.py testing/backend/test_horas_extras_s9_reglas_gh.py testing/backend/test_horas_extras_s10_trazabilidad_diaria.py testing/backend/test_biometria_service.py testing/backend/test_biometria_router_engine.py -v`
- `docker compose exec backend pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -v`
- `docker compose exec backend pytest testing/backend/ -v`
- `npm --prefix frontend run test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend exec tsc -- --noEmit`
- `npm --prefix frontend run build`
- `python scripts/sync_docs.py`

Las migraciones y pruebas de constraints deben ejecutarse contra PostgreSQL real en Docker, no SQLite.

## 9.1 Skills aplicables

- Spec-Driven Development & RIPER Protocol.
- Clean Architecture & Refactoring Enforcer.
- Backend Architecture Master y Backend Testing Mandate.
- PostgreSQL Master.
- RBAC Auto-Discovery.
- Frontend Architecture Master, Design System Enforcer y High-Performance Tables.
- Documentation Master.

## 10. Impacto en documentación

- [x] Especificación funcional inicial en `docs/specs/`.
- [x] ADR de identidad, separación de jerarquía, snapshot e idempotencia.
- [x] `docs/ESQUEMA_BASE_DATOS.md` y MER.
- [x] `docs/ARQUITECTURA_FRONTEND.md`.
- [x] Contrato API de filtros, errores, paginación y alcance.
- [x] `testing/CATALOGO_PRUEBAS.md`.
- [x] `docs/bitacora/2026-07-10-horarios-relaciones-empleados.md`.
- [x] Reporte final en `docs/reviews/builds/`.

## 11. Evaluación de riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| IDOR por cédula o recurso indirecto | Alta | Permiso + alcance central en service y matriz negativa de endpoints |
| Revelación por totales/búsqueda/facetas | Alta | Aplicar alcance antes de contar, filtrar y paginar |
| Autoasignación de alcance | Media | Prohibir modificación propia salvo admin canónico y auditar actor |
| Aplicación parcial o concurrente | Media | Transacción única, `solicitud_id`, locks ordenados y `409` |
| Snapshot alterado por edición | Media | JSONB append-only capturado en la misma transacción |
| Bloqueo del event loop por ERP | Alta | Crear/cerrar sesión completa dentro del worker thread |
| Jefe ERP ambiguo | Media | Verificación de esquema previa y resolución en lote |
| Disponibilidad mal calculada | Media | Códigos bloqueantes explícitos y pruebas por solapamiento semanal |
| Duración nocturna incorrecta | Media | `cruza_medianoche`, validación y pruebas de límites |
| PII en logs/auditoría | Alta | DTO mínimo, IDs internos y conteos; no registrar body bulk |
| Archivos frontend monolíticos | Alta | Carpetas por feature; no ampliar archivos existentes al límite |

## 12. Matriz de subagentes

```text
Subagente             | Motivo                                      | Resultado final        | Observación
----------------------|---------------------------------------------|-------------------|-------------------------
scope-reviewer        | Alcance transversal y límites               | approved_with_risks   | Riesgos de alcance documentados
backend-reviewer      | Datos, transacciones, ERP y concurrencia     | approved              | Cierre definitivo tras concurrencia y overrides
frontend-reviewer     | Dos pantallas, tabla, responsive y DS        | approved              | Cierre definitivo de flujos y accesibilidad
security-rbac-reviewer| RBAC, IDOR, PII y auditoría                  | approved_with_risks   | Sin hallazgos funcionales; evidencia reportada
docs-tests-reviewer   | TDD, MER, ADR y evidencia                    | approved_with_risks   | Sin cobertura porcentual/artefacto CI
mobile-reviewer       | No se modifica móvil                        | no requerido      | Fuera de alcance
```

Los bloqueos iniciales y las dos contradicciones detectadas en el cierre se incorporaron al diseño.

## 13. Decisión final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `pendiente_de_revision_final`
- [ ] `bloqueado`

## 14. Puerta de aprobación

La puerta de PLAN y el cierre BUILD fueron completados. Permanecen como seguimiento no bloqueante:

1. Mantener separados los resultados reportados de una medición de cobertura, que no existe.
2. Resolver como deuda independiente el lint global preexistente y la dependencia local `pdfplumber`.
