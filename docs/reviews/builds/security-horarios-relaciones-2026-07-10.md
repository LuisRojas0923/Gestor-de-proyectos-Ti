# Security/RBAC review — BUILD REAL horarios/relaciones

> **Estado documental:** CIERRE DEFINITIVO sobre el código actual; las revisiones
> bloqueadas posteriores se conservan abajo únicamente como historial.

**Fecha:** 2026-07-10
**Veredicto final:** **approved_with_risks**
**Alcance inspeccionado:** diff y archivos no rastreados actuales; backend, frontend, migración, RBAC, auditoría y pruebas de horarios/relaciones/GeoFace. No se revisó solo el plan abstracto.

## Confirmación final de overrides

### Veredicto vigente

**Security/RBAC review: approved_with_risks.** No quedan hallazgos de seguridad bloqueantes identificados en el build actual.

### Corrección verificada

- `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:204-218`: `POST /overrides` conserva RBAC `nomina_horas_extras.admin`, llama `autorizar_cedula` antes de mutar, sustituye el payload por la cédula canónica y responde `404` genérico ante formato inválido o fuera de alcance.
- `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:221-235`: `GET /overrides/{cedula}` conserva RBAC de lectura, autoriza y canoniza antes de consultar, no ejecuta el servicio si falla el alcance y agrega `Cache-Control: no-store, private`.
- El bypass sigue centralizado en `backend_v2/app/services/auth/alcance_empleados_service.py:69-90`: solo el rol exacto `admin` obtiene alcance global; permisos RBAC equivalentes no lo imitan.

### Pruebas inspeccionadas

- `testing/backend/test_horarios_segunda_revision.py:228-243`: POST relacionado canoniza antes de mutar.
- `testing/backend/test_horarios_segunda_revision.py:246-260`: POST no relacionado devuelve 404 y no muta.
- `testing/backend/test_horarios_segunda_revision.py:263-283`: GET relacionado y admin canonizan; verifica `no-store, private`.
- `testing/backend/test_horarios_segunda_revision.py:286-300`: GET no relacionado devuelve 404 y no consulta.

### Hallazgos restantes

No se identificaron hallazgos funcionales de Auth/RBAC, IDOR, bypass admin, PII/cache/logs, GeoFace, auditoría, bulk/idempotencia o migración dentro del alcance revisado.

### Riesgo residual

**BAJO — evidencia no reejecutada por este revisor.** Se inspeccionaron implementación y pruebas, pero no se ejecutó pytest debido a la restricción de comandos del subagente. La aprobación presupone que la evidencia verde del orquestador corresponde exactamente a este working tree.

**Severidad global vigente:** **BAJO**.

---

## Historial de revisiones bloqueadas (supersedido)

## Revisión final definitiva

### Veredicto

**Security/RBAC review: blocked.** Las correcciones solicitadas están presentes y cierran los bloqueantes anteriores, pero permanece un IDOR de lectura/escritura en los overrides de autorización HE.

### Checklist final

- Pre-liquidación y confirmación autorizan antes de ERP: ✅
- Lock concurrente por gestor/cédula: ✅
- `IntegrityError` de relaciones responde 409: ✅
- Cálculos/novedades e IDs indirectos: ✅
- GeoFace propio/equipo, RBAC y cache: ✅
- Auditoría bulk/PII y atribución: ✅
- Migración reparadora/fail-closed: ✅
- Overrides de autorización HE con alcance por empleado: ❌
- Pruebas concurrentes PostgreSQL: ✅ presentes; ejecución no repetida por este revisor

### ALTO / BLOQUEANTE — CWE-639: overrides HE fuera del alcance del gestor

- `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:204-214`: `POST /overrides` recibe `payload.cedula` y llama `crear_override_autoriza_he` sin `autorizar_cedula`. Un rol no canónico con el permiso granular `nomina_horas_extras.admin` puede crear o modificar la autorización HE de un empleado no relacionado.
- `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:217-224`: `GET /overrides/{cedula}` exige solo `nomina_horas_extras.leer` y expone el historial de overrides de cualquier cédula conocida, sin filtro de alcance ni `404` genérico.

Esto contradice la regla de `docs/specs/2026-07-10_horarios-predisenados-relaciones-empleados.md:72-81`: únicamente el rol canónico `admin` omite el filtro por filas y un permiso RBAC equivalente no otorga alcance global. Los endpoints de bolsa/compensación/costos OT permanecen fuera del alcance explícito de esta entrega y no sustentan este hallazgo; los overrides sí forman parte de la autorización individual HE.

No se encontró cobertura de estos dos endpoints en la matriz nueva (`testing/backend/test_horarios_segunda_revision.py`).

### MEDIO — CWE-525: respuesta de overrides sin política anti-cache

`backend_v2/app/api/novedades_nomina/routers/horas_extras.py:217-224` devuelve cédula, estado y vigencias de autorización sin `Cache-Control: no-store, private`. La matriz de cache cubre GeoFace y alcance administrativo, pero no esta respuesta individual con PII laboral.

### Correcciones finales verificadas

- `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:230-274,308-352` normaliza y autoriza la cédula antes de cualquier consulta ERP o persistencia de pre-liquidación.
- `backend_v2/app/services/auth/alcance_empleados_service.py:259-278` combina lock por solicitud y locks ordenados por `relacion:{gestor}:{cedula}`, evitando carrera de INSERT ausente y deadlocks por orden variable.
- `backend_v2/app/api/auth/alcance_empleados_router.py:145-168` distingue ERP caído (`503`), conflicto idempotente/`IntegrityError` (`409`) y fallo interno genérico (`500`).
- `testing/backend/test_horarios_segunda_revision.py:50-171` cubre corte IDOR antes de ERP, cédula canónica, 409, IDs indirectos, GeoFace relacionado/no relacionado, cache y dependencia RBAC.
- `testing/backend/test_relaciones_concurrencia.py:39-148` contiene concurrencia PostgreSQL real para dos UUID de relación y replay concurrente de aplicación.
- Se mantienen las correcciones ya verificadas de auditoría bulk sanitizada, redacción, `no-store`, atribución, migración reparadora, append-only y bypass exclusivo del rol exacto `admin`.

### Riesgo de evidencia

La fuente de pruebas es consistente con los controles y existe evidencia PostgreSQL real. Este revisor no ejecutó pytest por su restricción de comandos; por tanto valida código y diseño de pruebas, no certifica una salida verde independiente.

**Severidad global final:** **BLOQUEANTE**.

---

## Revisiones previas históricas

## Revisión posterior a correcciones — código real actual

**Veredicto actualizado:** **blocked**
**Motivo bloqueante restante:** los flujos legacy de pre-liquidación todavía permiten operar y consultar datos ERP de una cédula fuera del alcance del actor.

### Checklist actualizado

- Auth/RBAC en endpoints nuevos: ✅
- Alcance en listados de cálculos y novedades: ✅
- Alcance por IDs indirectos de cálculo/novedad: ✅
- Alcance al crear/confirmar cálculos legacy: ❌
- Auditoría bulk minimizada: ✅
- Redacción de cédulas y excepciones: ✅
- `Cache-Control: no-store, private`: ✅ en las respuestas PII corregidas
- Atribución de auditoría de plantillas/relaciones: ✅
- Migración reparadora/fail-closed: ✅
- Evidencia IDOR/GeoFace: ⚠️ parcial

### ALTO / BLOQUEANTE — CWE-639: pre-liquidación y confirmación permiten cédulas fuera de alcance

- `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:231-272`: `POST /pre-liquidacion` exige el permiso funcional, pero conserva el usuario en `_` y nunca llama `autorizar_cedula`. Usa directamente `payload.cedula` para consultar salario/nivel ARL en ERP, autorización HE, detalle y firma. Un planificador puede obtener información y cálculos de cualquier cédula conocida.
- `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:306-346`: `POST /pre-liquidacion/confirmar` tampoco autoriza `payload.cedula` antes de consultar ERP y persistir `NominaCalculoSemanal`, bolsa y costo OT. Un actor con permiso de confirmación puede crear efectos para un empleado no relacionado.

Las correcciones protegen correctamente consultas y mutaciones posteriores por `calculo_id`, pero no la puerta de creación del mismo recurso. No existe prueba de fuera de alcance para estos dos endpoints en `testing/backend/test_horarios_security_http.py`.

### MEDIO — CWE-362: concurrencia de relaciones con UUID distintos no está serializada por relación

- `backend_v2/app/services/auth/alcance_empleados_service.py:258-260` toma advisory lock únicamente por `solicitud_id`.
- `backend_v2/app/services/auth/alcance_empleados_service.py:278-290` usa `SELECT ... FOR UPDATE`, que no bloquea una fila aún inexistente. Dos solicitudes distintas que agreguen simultáneamente la misma pareja gestor/cédula pueden intentar el mismo INSERT; una terminará en `IntegrityError`, rollback y respuesta genérica `503` desde `backend_v2/app/api/auth/alcance_empleados_router.py:161-162`.

No debilita el alcance ni deja escritura parcial, pero la semántica bulk/idempotente bajo concurrencia sigue incompleta y no hay prueba concurrente de relaciones.

### MEDIO — evidencia de seguridad aún parcial

- `testing/backend/test_horarios_security_http.py:27-63` prueba el servicio de autorización de cálculo y filtrado, no las rutas ASGI de listado, detalle, transición e historial ni sus `404`.
- No se encontró caso equivalente para `autorizar_novedad_id` ni para las rutas de crear/editar/confirmar/anular novedades.
- `testing/backend/test_horarios_security_http.py:65-97` sí demuestra con PostgreSQL que GeoFace filtra antes de contar/paginar.
- `testing/backend/test_biometria_service.py:239-260` cubre `404` genérico y bypass admin de evidencia, pero no un caso positivo de evidencia de equipo para un gestor relacionado ni la dependencia RBAC HTTP completa.

### Correcciones verificadas

- `backend_v2/app/services/auth/alcance_empleados_service.py:103-128` resuelve cédula desde `calculo_id`/`novedad_id` y colapsa inexistencia/fuera de alcance a `LookupError` genérico.
- `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:349-487` filtra listados y protege detalle, transición e historial de cálculos.
- `backend_v2/app/api/novedades_nomina/routers/horas_extras_novedades.py:56-212` filtra listados y protege lectura/mutaciones por cédula e ID indirecto.
- `backend_v2/app/api/auth/alcance_empleados_router.py:118-122`, `backend_v2/app/api/novedades_nomina/routers/horas_extras_plantillas.py:73-75,138-140` y `backend_v2/app/api/novedades_nomina/routers/horas_extras_planificador.py:68-72` sustituyen payloads bulk por conteos.
- `backend_v2/app/services/auditoria/servicio.py:15-46,123-127` redacta claves de cédula y ya no registra `str(exc)`.
- `backend_v2/app/api/biometria/biometria_router.py:59-161` y `backend_v2/app/api/auth/alcance_empleados_router.py:49-105` agregan `no-store, private`.
- `backend_v2/app/api/novedades_nomina/routers/horas_extras_plantillas.py:37-41,67-146` atribuye módulo y entidad consistentemente.
- `backend_v2/app/core/migrations/horarios_relaciones_migration.py:81-129` repara constraints después de `create_all`; `testing/backend/test_horarios_migracion_seguridad.py:33-145` verifica constraints, append-only y propagación del fallo crítico.

**Severidad global actualizada:** **BLOQUEANTE**.

---

## Revisión inicial histórica (hallazgos ya corregidos salvo donde se indica arriba)

## Checklist results

- Auth en endpoints: ✅
- Schemas sin dict: ✅ (los `dict` observados son respuestas/snapshots, no parámetros HTTP abiertos)
- PK con `Field(pattern)`: ⚠️ (los IDs HTTP sensibles usan UUID o `Path(pattern)`, pero los modelos persistentes `str` no expresan el patrón)
- PUT/PATCH exclude_unset: ✅
- No str(e) en 500: ✅ en respuestas del build; ⚠️ permanece en logs
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ❌

## Hallazgos por severidad

### BLOQUEANTE / ALTO — CWE-639: el alcance por empleado no se aplica a recursos indirectos de Horas Extras

La nueva frontera afirma que conocer una cédula o ID indirecto no autoriza acceso, pero solo se incorporó `autorizar_cedula/lote` a horario, autorización, horario semanal y tres operaciones bulk. Continúan accesibles por permiso funcional, sin comprobar la cédula propietaria del recurso:

- `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:347-378`: listado global y `GET /calculos/{calculo_id}`.
- `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:405-462`: transición e historial por `calculo_id`.
- `backend_v2/app/api/novedades_nomina/routers/horas_extras_novedades.py:56-92`: listado de novedades sin restringir al conjunto de cédulas permitido.
- `backend_v2/app/api/novedades_nomina/routers/horas_extras_novedades.py:114-186`: lectura, edición, confirmación y anulación por `novedad_id`, sin resolver primero su cédula y autorizarla.

Un gestor con RBAC de lectura/planificación/confirmación puede consultar o mutar registros de empleados no relacionados mediante IDs directos, filtros vacíos o enumeración. Esto contradice el límite declarado en `docs/decisions/ADR-008-alcance-empleados-y-aplicacion-inmutable-horarios.md:49` y la regla de IDs indirectos en `docs/specs/2026-07-10_horarios-predisenados-relaciones-empleados.md:80`.

### BLOQUEANTE / ALTO — CWE-532 / CWE-359: las cédulas bulk se persisten completas en auditoría

- `backend_v2/app/core/middleware/auditoria_middleware.py:157-165,199-205` captura el JSON completo y lo usa como `datos_nuevos` cuando el endpoint no define un snapshot explícito.
- `backend_v2/app/services/auditoria/servicio.py:15-41,115-117` solo redacta secretos; `cedula`/`cedulas` no se enmascaran.
- `backend_v2/app/api/auth/alcance_empleados_router.py:114-120` configura conteos, pero no reemplaza `auditoria_datos_nuevos`; por tanto el body con `cedulas_agregar` y `cedulas_quitar` también queda almacenado.
- `backend_v2/app/api/novedades_nomina/routers/horas_extras_plantillas.py:127-133` presenta el mismo problema con `payload.cedulas` al aplicar una plantilla.
- `backend_v2/app/core/auditoria_manifest.py:225-228` documenta incorrectamente que la auditoría HTTP registra “solo IDs y conteos”.

La minimización declarada no existe en ejecución: hasta 200 identificadores personales por solicitud quedan duplicados en la auditoría transversal, además de los historiales de dominio necesarios.

### ALTO — CWE-532: errores nuevos pueden registrar PII y parámetros SQL sin redacción

- `backend_v2/app/api/novedades_nomina/routers/horas_extras_planificador.py:111-113` registra `str(e)` con `logger.exception`. Los errores SQLAlchemy/ERP pueden incluir el filtro `q` (admite cédula/nombre) y la lista `cedulas_permitidas` enlazada en SQL.
- `backend_v2/app/services/auditoria/servicio.py:121-122` también registra la excepción de inserción de auditoría, potencialmente con los JSONB que contienen cédulas.

Las respuestas HTTP son genéricas, pero el canal de logs no cumple la redacción de PII requerida.

### MEDIO — CWE-525: cobertura incompleta de `Cache-Control` para respuestas con PII

- `backend_v2/app/api/auth/alcance_empleados_router.py:49-56` devuelve nombres, roles e IDs de gestores sin `Cache-Control: no-store, private`; solo el catálogo ERP de `:59-105` lo fija.
- `backend_v2/app/api/biometria/biometria_router.py:82-89` devuelve el historial biométrico propio sin cabecera `no-store`; las nuevas evidencias y el listado administrativo sí están protegidos en `:99-115` y `:128-155`.

### MEDIO — CWE-778: atribución incompleta/inconsistente en auditoría HTTP de plantillas

- `backend_v2/app/api/novedades_nomina/routers/horas_extras_plantillas.py:59-70` fija el módulo granular solo al crear.
- `backend_v2/app/api/novedades_nomina/routers/horas_extras_plantillas.py:84-118` editar, desactivar y duplicar no fijan consistentemente `auditoria_modulo`, `entidad_tipo` y `entidad_id`.
- El fallback de `backend_v2/app/core/middleware/auditoria_middleware.py:218-260` termina clasificando parte de estos eventos bajo el segmento general `novedades-nomina`, aunque `backend_v2/app/core/auditoria_manifest.py:219-223` declara cobertura explícita del permiso granular.

Existe historial de dominio append-only, pero la evidencia transversal no queda uniformemente atribuida al módulo/recurso protegido.

### MEDIO — CWE-1104 / consistencia de migración: `create_all` puede crear un esquema distinto al DDL crítico

- `backend_v2/app/core/migrations/manager.py:30-34` ejecuta `SQLModel.metadata.create_all` antes de la migración crítica.
- `backend_v2/app/core/migrations/horarios_relaciones_migration.py:13-73` usa `CREATE TABLE IF NOT EXISTS`; si `create_all` ya creó las tablas, no agrega los `CHECK` y `UNIQUE` definidos dentro del `CREATE TABLE`.
- `backend_v2/app/models/novedades_nomina/plantillas_horario.py:35-49,88-100` no declara en metadatos todos los constraints del DDL (por ejemplo, par entrada/salida y `UNIQUE(solicitud_id, plantilla_id)`).
- `testing/backend/test_horarios_plantillas.py:88-101` solo comprueba reejecución y preservación de usuarios; no inspecciona constraints ni triggers resultantes.

El arranque es fail-closed para la función nueva, lo cual es positivo, pero no garantiza que una instalación creada desde cero obtenga el mismo esquema que el DDL documentado.

### MEDIO — CWE-693: evidencia de seguridad insuficiente para GeoFace/RBAC/IDOR

No hay pruebas del build que ejecuten los endpoints administrativos GeoFace, ownership de foto/evidencia, `404` indistinguible, cabeceras de cache, filtro SQL antes del conteo, ni bypass exclusivo de admin sobre datos reales. Las pruebas nuevas cubren normalización, una denegación de servicio y parte de idempotencia (`testing/backend/test_alcance_empleados.py`, `testing/backend/test_horarios_plantillas_service.py`), pero no las fronteras HTTP críticas solicitadas.

## Controles correctos observados

- Los endpoints nuevos exigen JWT y permisos RBAC; los dos permisos nuevos están en `backend_v2/app/core/rbac_manifest.py:319-331`.
- El bypass de fila está limitado al rol canónico exacto `admin` (`backend_v2/app/services/auth/alcance_empleados_service.py:34-35`) y no sustituye el permiso funcional.
- GeoFace autoservicio deriva el objetivo del JWT y ya no honra `usuario_id`; equipo usa `registro_id` y filtro por cédula (`backend_v2/app/services/biometria/biometria_service.py:134-211`).
- Las evidencias y listados administrativos nuevos usan `no-store, private` y no exponen ruta física.
- Aplicación de plantilla y relaciones usan normalización, límite 200, autorización previa, transacción, rollback, lock y ledger idempotente ligado a actor/objetivo/hash.
- La migración crítica aborta el arranque si falla y agrega triggers append-only.
- `.env` continúa ignorado en `.gitignore:31-37`; no se observaron secretos nuevos en el diff.

## RBAC/config impact

Los IDs RBAC nuevos coinciden entre dependencias y manifiesto. No se detectó bypass por un rol “equivalente” a admin. El impacto bloqueante está en la aplicación incompleta del alcance por fila a recursos indirectos y en la persistencia/logging de PII, no en la ausencia de registro RBAC.

## Blocking reasons

1. IDOR directo/indirecto todavía viable sobre cálculos y novedades de empleados fuera de relación.
2. Cédulas bulk persistidas completas en auditoría pese a la promesa explícita de solo conteos.
3. Logging de excepciones nuevas sin garantía de redacción de PII/parámetros SQL.

**Severity global:** **BLOQUEANTE**

## Veredicto

**Security/RBAC review: blocked.**

No se recomienda integrar ni desplegar este build hasta cerrar los hallazgos altos y aportar pruebas HTTP de regresión para alcance, admin bypass, GeoFace propio/equipo, cache, auditoría e idempotencia concurrente.
