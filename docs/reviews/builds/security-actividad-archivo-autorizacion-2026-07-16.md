# Security/RBAC review: approved_with_risks

**Fecha:** 2026-07-16
**Alcance:** autorización de `POST /actividades/{actividad_id}/archivo` en `actividad_archivos_router.py` y `actividad_access_service.py`. Revisión estática, sin modificar código fuente ni ejecutar pruebas.

> Nota de trazabilidad: los dos elementos revisados no existen completos en el `HEAD` actual (`1a181780`): el router no está en el árbol de trabajo y el servicio actual no contiene `usuario_puede_modificar_actividad`. La revisión corresponde a su versión en el commit `ca5ddf76` (`feat[actividades]: permite adjuntar evidencias WBS`), localizable en el historial Git.

## Checklist results
- Auth en endpoints: ✅
- Schemas sin dict: ✅
- PK con Field(pattern): N/A — el identificador de ruta es `int`
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ✅

## Findings

### ALTO — quitar la autorización por objeto permitiría escritura cruzada (condicional)

El endpoint exige autenticación y el módulo `developments` mediante `requiere_permiso_desarrollos`, pero ese permiso es únicamente el límite funcional grueso. Las dos llamadas a `usuario_puede_modificar_actividad` son el límite por objeto: una ocurre antes de recibir/procesar el multipart y otra después, sobre la actividad bloqueada, antes de reemplazar `archivo_url`.

Si se quita esa validación sin un control equivalente, cualquier usuario autenticado cuyo rol tenga `developments` podría usar un `actividad_id` conocido o adivinado para cargar o reemplazar la evidencia de una actividad ajena. El rate limit y el bloqueo de fila no sustituyen autorización. Esto sería un IDOR/escritura horizontal y se considera bloqueante para la propuesta de retiro. CWE-862, CWE-639.

### El comportamiento actual no está limitado al creador

La actividad no tiene un campo independiente `creado_por_id`; al crearla, el router fija `delegado_por_id` al usuario autenticado. Aun así, `usuario_puede_modificar_actividad` autoriza también a:

- `responsable_id`, `asignado_a_id` o `delegado_por_id` de la actividad;
- superiores jerárquicos cuando cualquiera de esos participantes es subordinado directo o indirecto;
- creador o responsable por ID del desarrollo;
- analista, supervisor, autoridad o responsable nominal del desarrollo;
- superiores jerárquicos de cualquiera de esos participantes del desarrollo.

Por tanto, un usuario distinto tanto del creador/delegador de la actividad como del creador del desarrollo ya puede cargar si está asignado, es responsable, participa en el desarrollo o tiene alcance jerárquico. No es necesario retirar el control para habilitar ese caso.

La función no concede bypass automático a `admin` o `director`, a diferencia del permiso de lectura. Esto coincide con la política de edición de `PATCH /actividades/{id}` marcada como “sin bypass de roles”. Si se desea una excepción administrativa, debe definirse explícitamente y probarse; no debe obtenerse cambiando el control de escritura por el de lectura.

### MEDIO — las pruebas existentes no fijan la matriz de autorización

`test_endpoints_http_cubren_carga_descarga_y_eliminacion` reemplaza `usuario_puede_modificar_actividad` por un mock que siempre retorna `True` y sobrescribe la dependencia RBAC. `test_rbac_rechaza_rol_sin_permiso` solo prueba directamente la dependencia de módulo. En consecuencia, las pruebas del commit no demuestran que un participante distinto del creador sea aceptado ni que un usuario no relacionado sea rechazado por el endpoint real. CWE-693.

## Límite RBAC recomendado

Mantener la intersección de tres controles:

1. usuario autenticado;
2. permiso de módulo `developments`;
3. permiso de escritura sobre la actividad mediante `usuario_puede_modificar_actividad`, evaluado antes de procesar el cuerpo y repetido bajo bloqueo antes del commit.

El límite correcto es el mismo alcance de modificación usado por `PATCH`, no “solo creador” y tampoco “cualquier usuario con el módulo”. `developments` ya está registrado en `backend_v2/app/core/rbac_manifest.py`; no hace falta otro módulo para conservar este comportamiento. Si el negocio requiere separar evidencias de la edición general, puede añadirse un permiso de acción explícito, pero siempre combinado con la autorización por objeto.

## Pruebas necesarias

- HTTP 401 sin token.
- HTTP 403 con usuario autenticado cuyo rol no tenga `developments`.
- HTTP 404 con permiso `developments` pero sin relación con la actividad/desarrollo; verificar que no se invoque el guardado, no cambie `archivo_url` y no quede archivo temporal.
- HTTP 200 para un `asignado_a_id` distinto del creador/delegador.
- Casos positivos separados para responsable, delegador y participante del desarrollo; incluir al menos un superior de subordinado si ese alcance es política vigente.
- Caso explícito de `admin`/`director` no relacionado para fijar si continúa la política sin bypass de edición.
- Cambio de autorización entre la primera y segunda comprobación: la segunda debe rechazar, limpiar el archivo temporal y no persistir.
- Actividad anulada: 409 solo después de autorizar; un usuario no relacionado debe seguir recibiendo 404 para evitar enumeración.
- Reemplazo de evidencia existente: solo un usuario con alcance de modificación puede sustituirla.

## Impacto RBAC/config

`developments` es el módulo correcto como puerta gruesa. El servicio de acceso constituye una ACL por recurso y no debe eliminarse. No se requieren cambios de manifiesto mientras no se cree un permiso granular nuevo.

**Blocking reasons:** retirar `usuario_puede_modificar_actividad` sin control equivalente habilitaría modificación cruzada de evidencias. El comportamiento actual puede conservarse, sujeto a completar las pruebas de matriz indicadas.
**Severity:** ALTO
