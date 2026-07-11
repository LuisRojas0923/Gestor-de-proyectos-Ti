# Contrato API actual: Horarios, alcance de empleados y GeoFace administrativo

**Fecha:** 2026-07-10
**Estado:** Implementado en el working tree de `Modulo_Geoface`
**Fuente de verdad:** routers, schemas y servicios bajo `backend_v2/app/`

Todos los paths se expresan bajo `/api/v2`. Los endpoints requieren JWT. Los permisos funcionales no sustituyen el alcance por empleado.

## Plantillas de horario

Prefijo: `/novedades-nomina/horas-extras/plantillas-horario`.

| Metodo y ruta | Permiso | Entrada | Salida |
|---|---|---|---|
| `GET /` | `nomina_horas_extras.plantillas_horario.administrar` | `q`, `incluir_inactivas`, `limit<=100`, `offset` | `{items,total,limit,offset}` |
| `POST /` | mismo | nombre, descripcion y exactamente siete dias | Plantilla, `201` |
| `GET /{plantilla_id}` | mismo | UUID | Plantilla con dias |
| `PATCH /{plantilla_id}` | mismo | campos parciales y `version_esperada` | Plantilla versionada |
| `POST /{plantilla_id}/desactivar` | mismo | sin body | Plantilla inactiva |
| `POST /{plantilla_id}/duplicar` | mismo | `{nombre}` | Copia version 1, `201` |
| `POST /{plantilla_id}/aplicaciones` | `nomina_horas_extras.planificar` + alcance completo | `{solicitud_id,cedulas}` | Resultado atomico/idempotente |

Cada dia usa `dia_semana`, `hora_entrada`, `hora_salida`, `minutos_almuerzo` y `cruza_medianoche`. Un franco tiene ambas horas nulas, almuerzo cero y no cruza medianoche. El lote normalizado admite hasta 200 cedulas.

## Administracion de alcance

Prefijo: `/alcance-empleados`. Los tres endpoints requieren `alcance_empleados.administrar`.

| Metodo y ruta | Contrato |
|---|---|
| `GET /gestores` | Busca usuarios activos por nombre; `q`, `limit<=100`, `offset`; devuelve conteo de relaciones activas. |
| `GET /gestores/{gestor_id}/empleados` | Universo ERP administrativo con estado `relacionado`, disponibilidad y facetas. |
| `PUT /gestores/{gestor_id}/relaciones` | `{solicitud_id,cedulas_agregar,cedulas_quitar}`; valida ERP antes de escribir y confirma todo o nada. |

`gestor_id` acepta `A-Z`, `a-z`, digitos, guion y guion bajo, con maximo 50 caracteres. Una cedula no puede aparecer en altas y bajas. Un actor no admin no puede modificar su propio alcance.

El resultado del PUT contiene `agregadas`, `reactivadas`, `desactivadas`, `sin_cambio` e `idempotente`.

## Consulta ERP operativa

`GET /novedades-nomina/horas-extras/planificador/empleados-erp` exige `nomina_horas_extras.planificar`. Para no admin consulta solo cedulas relacionadas; `admin` conserva el universo permitido por el ERP.

Parametros compartidos con el catalogo administrativo:

- Periodo: `anio`, `semana_iso`.
- Busqueda: `q`.
- Multivalor: `cargos`, `areas`, `ciudades`, `jefes` mediante parametros repetidos.
- Booleanos: `autoriza_he`, `disponible_semana`; el modo administrativo agrega `relacionado`.
- Orden: `cedula|nombre|cargo|area|ciudad|jefe` y `direccion=asc|desc`.
- Paginacion: `limit<=100`, `offset`.

La respuesta incluye `cedula`, `nombre`, `cargo`, `area`, `ciudadcontratacion`, `jefe`, `autoriza_he`, `disponible_semana` y `motivo_no_disponible`. Solo el modo administrativo incluye `relacionado`. Los motivos cerrados son `EMPLEADO_INACTIVO`, `NO_AUTORIZA_HE`, `VACACIONES`, `INCAPACIDAD` y `LICENCIA`.

La implementacion actual carga el universo ERP permitido y aplica filtros derivados, orden, conteo y paginacion en `filtrar_paginar_empleados`. Las facetas se calculan antes de los filtros derivados sobre ese universo.

## Horarios y bulk legacy

Las rutas individuales `/novedades-nomina/horas-extras/horario/{cedula}` y `/horario/{cedula}/semana`, asi como `/autorizacion/{cedula}`, exigen permiso funcional y alcance. Los dias semanales propagan `cruza_medianoche`.

Los endpoints `POST /horario/registros/bulk`, `POST /planificador/pre-calcular` y `POST /planificador/confirmar` autorizan todas las cedulas antes de procesar. Guardado y confirmacion mantienen errores parciales de negocio; el pre-calculo no persiste. Estos tres flujos no usan el ledger nuevo.

La cedula canonica devuelta por autorizacion reemplaza el valor del payload antes de calcular o persistir. Guardado y confirmacion usan un savepoint por empleado, de modo que un error de negocio no revierte empleados anteriores ni falsea los contadores.

Los listados y recursos por ID de `/calculos` y `/novedades` tambien aplican el conjunto de cedulas permitidas. Lectura, historial y mutaciones por ID resuelven primero la cedula propietaria; inexistencia y falta de alcance responden `404` generico.

## GeoFace administrativo

Todos requieren el permiso `biometria`:

| Metodo y ruta | Contrato |
|---|---|
| `GET /biometria/admin/capacidades` | `{puede_supervisar_equipo}`; true para admin canonico o gestor con relaciones activas. |
| `GET /biometria/admin/asistencias` | Filtros `fecha_desde`, `fecha_hasta`, `usuario_id`, `zona_id`, `resultado`, `limit`, `offset`; aplica alcance por cedula. |
| `GET /biometria/admin/evidencias/{registro_id}` | Resuelve el registro, valida alcance y entrega el archivo sin autorizar por filename. |

El listado administrativo omite coordenadas, confianza y rutas fisicas. Listados con PII y evidencias responden `Cache-Control: no-store, private`. El autoservicio permanece en `/biometria/asistencias`, `/foto/{filename}` y `/evidencia/{filename}` con ownership resuelto por el servicio.

Los listados de gestores, estado/historial biometrico propio y capacidades tambien usan `Cache-Control: no-store, private`. Las mutaciones bulk sustituyen el body auditado por conteos y el servicio transversal redacta claves de cedula individuales y masivas.

## Errores e idempotencia

- `401`: JWT ausente o invalido.
- `403`: falta de permiso funcional; tambien autoedicion de alcance por no admin.
- `404`: recurso individual inexistente o empleado fuera de alcance, con respuesta generica.
- `409`: version, integridad o reutilizacion incompatible de `solicitud_id`.
- `422`: semana ISO, turno, cedula o lote invalido.
- `503`: ERP no disponible en consultas o validaciones que dependen de el.

Para aplicaciones y relaciones, el replay solo es valido con igual tipo, UUID, actor, objetivo y hash canonico. La respuesta repetida marca `idempotente=true`.
