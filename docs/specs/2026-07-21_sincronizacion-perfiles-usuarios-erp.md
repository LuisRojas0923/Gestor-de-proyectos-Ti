# Especificacion: Sincronizacion de perfiles de usuarios desde ERP

**Fecha:** 2026-07-21
**Estado:** Implementado y validado en pila aislada
**Proceso:** Administracion de usuarios
**Fuente de verdad:** Solid ERP configurado por entorno
**Plan tecnico:** `docs/reviews/plans/2026-07-21_sincronizacion-perfiles-usuarios-erp.md`

## 1. Objetivo

Mantener actualizados en el portal los datos laborales de los usuarios registrados cuando cambie su contrato activo en Solid ERP.

La solucion debe corregir el comportamiento actual, que solo intenta sincronizar un perfil cuando faltan `area` o `sede`. Esa condicion deja obsoletos cambios posteriores de cargo y otros datos aunque el ERP ya tenga la informacion vigente.

El caso reportado fue validado el 2026-07-21 mediante consultas `SELECT` contra el portal y contra la base de produccion `solid`: el portal conservaba un cargo anterior mientras el contrato activo mas reciente del ERP ya contenia uno diferente. La especificacion no persiste la cedula ni otros identificadores personales usados en esa comprobacion.

## 2. Alcance

- Sincronizacion automatica de un usuario local despues de autenticar correctamente sus credenciales.
- Sincronizacion administrativa individual bajo el permiso existente `admin_usuarios`.
- Previsualizacion y aplicacion administrativa masiva sobre usuarios locales activos.
- Consulta del contrato activo mas reciente de cada cedula, con desempate determinista.
- Comparacion normalizada e idempotente: solo se escriben campos cuyo valor cambio.
- Resumen de resultados y auditoria sin valores personales en logs.
- Tolerancia a fallos del ERP durante login: el usuario puede ingresar con el ultimo perfil local disponible.

## 3. Fuente De Datos Por Entorno

- La sincronizacion usa exclusivamente `ERP_READ_DATABASE_URL` del despliegue, con una credencial ERP dedicada a `CONNECT` y `SELECT`.
- `ERP_DATABASE_URL` se conserva para flujos existentes que escriben correo en el ERP; no se reutiliza para esta lectura.
- `ERP_READ_EXPECTED_DATABASE` declara el nombre permitido sin contener host ni credenciales.
- `ENVIRONMENT` normalizado en `development`, `desarrollo`, `pruebas3`, `test` o `tests` exige exactamente `ERP_READ_EXPECTED_DATABASE=solidpruebas3`.
- `ENVIRONMENT` normalizado en `production` o `produccion` exige exactamente `ERP_READ_EXPECTED_DATABASE=solid`.
- Para esta integracion, `ENVIRONMENT` de `app.config` es la fuente del entorno; `ENTORNO` continua atendiendo la configuracion core hasta su migracion general.
- Los endpoints no aceptan nombres de base, hosts, URLs ni una opcion para cambiar de fuente.
- Las pruebas automatizadas usan dobles de prueba o una base aislada; nunca consultan `solid`.
- La implementacion no modifica archivos `.env` ni incluye credenciales en codigo, respuestas, auditoria o documentacion.

Una fabrica lazy analiza el path de `ERP_READ_DATABASE_URL` antes de crear el engine. Si no coincide con la matriz y con `ERP_READ_EXPECTED_DATABASE`, no crea engine/sessionmaker, marca la integracion degradada y permite que el portal inicie. Antes de cualquier consulta, el worker vuelve a comparar `current_database()` con el esperado y verifica `transaction_read_only=on`. El worker siempre falla cerrado ante una fuente distinta.

La consulta puntual realizada durante la investigacion contra `solid` fue una validacion manual de solo lectura y no cambia la configuracion normal de desarrollo.

## 4. Datos Sincronizados

| Campo local | Campo ERP | Regla |
|---|---|---|
| `nombre` | `establecimiento.nombre` | `None`/vacio conserva el local; texto mayor a 255 invalida el perfil. |
| `cargo` | `contrato.cargo` | `None`/vacio limpia a `None`; texto mayor a 255 invalida el perfil. |
| `area` | `contrato.area` | `None`/vacio limpia a `None`; texto mayor a 255 invalida el perfil. |
| `sede` | `contrato.ciudadcontratacion` | `None`/vacio limpia a `None`; texto mayor a 255 invalida el perfil. |
| `centrocosto` | `contrato.centrocosto` | `None`/vacio limpia a `None`; texto mayor a 255 invalida el perfil. |
| `viaticante` | `establecimiento.viaticante` | Valor reconocido se convierte; `None` conserva el local; valor desconocido invalida el perfil. |
| `baseviaticos` | `establecimiento.baseviaticos` | `None` limpia a `None`; valor no numerico, negativo o no finito invalida el perfil. |
| `correo` | `establecimiento.correocorporativo` | `None`/vacio conserva el local; formato/tamano invalido omite solo correo; valor distinto usa el servicio protegido. |
| `actualizado_en` | reloj del portal | Cambiar solo cuando exista al menos una diferencia aplicada. |

No se sincronizan:

- `rol`.
- `esta_activo`.
- `hash_contrasena`.
- permisos RBAC.
- especialidades o areas asignadas administrativamente.
- estado de sesiones.

Si el correo ERP coincide con el local, se conservan `correo_actualizado` y `correo_verificado`. Si cambia, se aplica el flujo protegido vigente y el nuevo correo queda pendiente de verificacion segun la politica actual.

## 5. Seleccion Del Contrato

Para cada cedula se toma unicamente un contrato que cumpla `contrato.estado = 'Activo'`.

El orden debe ser determinista:

1. `fechainicio DESC NULLS LAST`.
2. `numerocontrato DESC NULLS LAST` como desempate.

La consulta conserva el establecimiento aunque no tenga contrato activo y devuelve `cantidad_contratos_activos`. Las cedulas solicitadas sin fila de establecimiento se clasifican como `no_encontrado_erp`; una fila de establecimiento con conteo cero se clasifica como `sin_contrato_activo`. Si el conteo es mayor que uno, se incrementa una metrica/advertencia agregada sin cedula y se usa el primero segun el orden anterior.

## 6. Reglas De Sincronizacion

- El ERP se consulta fuera del event loop mediante `run_in_threadpool`.
- El worker crea, usa, revierte y cierra `SessionErpLectura` dentro del mismo hilo; ninguna `Session` cruza el limite del threadpool.
- La lectura ejecuta `SET TRANSACTION READ ONLY`, `SET LOCAL statement_timeout = '5s'` para login o `15s` para lotes y `SET LOCAL lock_timeout = '2s'` antes del primer `SELECT`.
- El engine de lectura usa `connect_timeout=3s` y `pool_timeout=2s`; el await del worker se limita a 8 segundos en login y 20 segundos por lote.
- La sincronizacion nunca escribe en tablas de Solid.
- Se obtiene primero el snapshot ERP y despues se abre/aplica la transaccion local; no se simula una transaccion distribuida.
- Los valores de texto se comparan despues de `strip`; no se cambia mayuscula/minuscula porque el ERP conserva la presentacion oficial.
- Una segunda ejecucion con los mismos datos devuelve `sin_cambios` y no genera un `UPDATE` innecesario.
- Un empleado no encontrado, sin contrato activo o con ERP no disponible no es desactivado ni pierde datos locales.
- Una cuenta local inactiva no se reactiva. Solo puede sincronizarse individualmente por un actor autorizado y sin cambiar `esta_activo`.
- La ejecucion masiva pagina cuentas locales activas por clave estable en lotes de hasta 100; cada lote genera su propia consulta ERP y relectura local.
- Antes de modificar, cuenta hasta 1001 usuarios activos. Si supera 1000, falla cerrado con `409 limite_operativo_excedido`; nunca trunca ni aplica solo los primeros 1000.
- Antes de aplicar, cada usuario se relee con `SELECT ... FOR UPDATE` y se recalculan diferencias para evitar carreras.
- Cada usuario usa un savepoint. Un error de usuario revierte solo ese savepoint; si falla el commit final, todos los exitos provisionales del lote se reclasifican como `fallido`.
- Un rollback limpia la sesion y el lote siguiente relee sus objetos; no se reutilizan instancias ORM expiradas.

## 7. Disparadores

### Login

Despues de validar la contrasena y antes de construir la respuesta de login, el backend intenta actualizar el perfil aunque `area` y `sede` ya tengan valor.

- Error ERP o fuente no autorizada: rollback local, relectura del usuario, warning sin PII y login exitoso con datos locales.
- Perfil ERP inexistente/inactivo: login exitoso sin cambios locales.
- Perfil diferente: commit local y respuesta con los datos nuevos.

La dependencia general `obtener_usuario_actual_db` conserva su recuperacion actual para campos faltantes. No se sincroniza en cada request autenticado, porque esa dependencia es reutilizada por gran parte de la API.

### Administracion

Prefijo existente: `/api/v2/auth`.

| Metodo y ruta | Permiso | Comportamiento |
|---|---|---|
| `POST /usuarios/sincronizacion-erp/individual` | `admin_usuarios` | Recibe un `usuario_id` validado y sincroniza una cuenta local, activa o inactiva, sin cambiar su estado. |
| `GET /usuarios/sincronizacion-erp/previsualizacion` | `admin_usuarios` | Compara todos los usuarios locales activos y devuelve resumen/diferencias sin escribir. |
| `POST /usuarios/sincronizacion-erp/aplicar` | `admin_usuarios` | Repite la lectura vigente y aplica diferencias por lotes. |

Las rutas usan una dependencia autenticada sin sincronizacion ERP, actualizacion de actividad ni commits y rechazan tokens MCP. La previsualizacion no funciona como bloqueo del snapshot: la aplicacion vuelve a consultar el ERP para evitar escribir datos ya obsoletos. Sus respuestas incluyen cantidades y frecuencias de campos, sin cedulas, nombres, correos, IDs locales ni valores anteriores/nuevos. La unica escritura permitida durante previsualizacion es su evento append-only de auditoria en una sesion separada.

## 8. Resultado Operacional

Estados por usuario:

- `actualizado`.
- `sin_cambios`.
- `no_encontrado_erp`.
- `sin_contrato_activo`.
- `fallido`.
- `dato_erp_invalido`.

Estados globales cerrados: `completo`, `parcial` y `parcial_timeout`. `completo` exige que todos los lotes hayan terminado sin fallos de infraestructura/commit, aunque existan usuarios no sincronizables; cualquier lote fallido despues de progreso produce `parcial`, incluso si los lotes posteriores continuan. Los fallos previos se representan solo mediante HTTP `409`, `500` o `503`, no mediante otro estado global.

Resumen masivo:

- cantidad evaluada.
- cantidad actualizada.
- cantidad sin cambios.
- cantidad no sincronizable.
- cantidad fallida.
- frecuencia agregada de campos modificados.
- cantidad de lotes completados y fallidos.

Codigos HTTP administrativos:

- `200`: resultado individual, previsualizacion o ejecucion completa/parcial estructurada.
- `401`/`403`: autenticacion o permiso insuficiente.
- `404`: usuario local individual inexistente.
- `409`: ya existe una aplicacion masiva activa o se excede el limite operativo antes de modificar.
- `422`: respuesta fija de validacion local que nunca refleja `usuario_id`, campos extra ni valores recibidos.
- `429`: rate limit, con `Retry-After`.
- `503`: ERP no disponible o fuente ERP no autorizada antes de iniciar cambios.
- `500`: fallo local no recuperable, con mensaje fijo y correlation ID.

| Escenario | Estado/codigo |
|---|---|
| Todos los lotes se evaluaron, aunque existan usuarios no sincronizables | `200 completo` |
| Falla ERP/worker/commit despues de al menos un lote confirmado o evaluado | `200 parcial` |
| Vence el deadline entre lotes despues de trabajo confirmado/evaluado | `200 parcial_timeout` |
| Fuente/ERP falla antes del primer lote, tambien durante preview | `503`, sin estado por usuario ni cambios |
| Falla local no recuperable antes de confirmar algun lote | `500`, rollback y mensaje fijo |
| Fuente no autorizada, limite >1000 o lock ocupado | `503` o `409` antes de modificar |

## 9. Seguridad Y Auditoria

- Autenticacion obligatoria.
- El acceso administrativo se decide por el permiso `admin_usuarios`, no por un nombre de rol hardcodeado.
- Se reutiliza el modulo RBAC existente; no se crea un permiso duplicado.
- Las operaciones individual, previsualizacion y aplicacion tienen limites independientes (`10/minute`, `2/hour` y `1/hour`) con clave distribuida por hash del actor autenticado e IP efectiva.
- La aplicacion masiva mantiene una `AsyncConnection` dedicada abierta durante toda la operacion, adquiere/libera en ella el advisory lock de sesion y usa sesiones separadas para los commits por lote. Devuelve `409` si otra ejecucion esta activa.
- La ejecucion se limita a 100 usuarios por lote, maximo 1000 usuarios activos, 180 segundos monotonicos totales y detalle agregado acotado. El deadline se evalua entre lotes, nunca durante un commit; al vencer devuelve `parcial_timeout` con lo ya confirmado y un reintento idempotente comienza de nuevo.
- El middleware de auditoria recibe `modulo=admin_usuarios`, `entidad_tipo=sincronizacion_perfiles_erp` y metadatos agregados.
- Las tres rutas usan exclusivamente el middleware central. La previsualizacion se agrega a la allowlist GET sensible y el middleware se ajusta para auditar exactamente una vez respuestas `200`, `401`, `403`, `404`, `409`, `422`, `429`, `500` y `503`, usando actor autenticado cuando exista o `anonimo` cuando no. Los handlers no llaman auditoria explicita. Auditoria y logs guardan la identidad normal del actor, cantidades, resultado, duracion y nombres de campos, pero no identidad ni valores del usuario objetivo.
- La ruta auditada se guarda como plantilla y `usuario_id` se agrega a las claves sensibles del middleware.
- Las respuestas usan `Cache-Control: no-store, private` y no incluyen identificadores personales.
- Los errores publicos no incluyen SQL, URLs, host, nombre de base ni excepciones del driver.
- La ejecucion manual contra produccion se realiza solo desde un despliegue cuya configuracion autorizada ya apunte a `solid`.

## 10. No-Objetivos

- Crear o actualizar empleados en Solid ERP.
- Cambiar dinamicamente entre `solidpruebas3` y `solid` desde la API.
- Programar un job periodico en esta fase.
- Crear una pantalla frontend nueva en esta fase.
- Reactivar o desactivar cuentas segun el estado ERP.
- Cambiar roles por `viaticante` u otro dato laboral.
- Sincronizar relaciones jerarquicas o jefes.
- Modificar el esquema de `usuarios` o crear tablas nuevas.
- Resolver historicos incorrectos de contratos dentro de Solid.
- Unificar globalmente `app.config` y `app.core.config`; solo se documenta cual controla esta integracion.

## 11. Criterios De Aceptacion

1. Un usuario con cargo local obsoleto recibe el cargo del contrato activo mas reciente despues de un login exitoso.
2. La sincronizacion funciona aunque `area` y `sede` ya tengan valor.
3. Repetir la sincronizacion sin cambios no ejecuta escrituras locales.
4. Desarrollo solo autoriza `solidpruebas3` y produccion solo autoriza `solid`, ambos mediante la URL de lectura configurada y sin selector por request.
5. La consulta de sincronizacion no ejecuta `INSERT`, `UPDATE` ni `DELETE` en ERP.
6. Un fallo ERP no impide el login de un usuario local valido.
7. Un usuario inexistente o sin contrato activo en ERP conserva sus datos y estado locales.
8. La ejecucion masiva solo considera usuarios locales activos.
9. La ejecucion individual sobre una cuenta inactiva no la reactiva.
10. Rol, permisos, contrasena, especialidades y sesiones no cambian.
11. Un usuario sin `admin_usuarios` recibe `403` en las tres operaciones administrativas.
12. La previsualizacion no modifica filas de negocio; solo crea su auditoria append-only separada.
13. La aplicacion masiva informa actualizados, sin cambios, no sincronizables y fallidos.
14. Logs y auditoria no contienen cedulas, nombres, correos ni secretos de conexion.
15. Un correo sin cambios conserva su verificacion; un correo realmente cambiado sigue el flujo protegido vigente.
16. La sesion ERP nace y muere en el mismo worker y reporta `transaction_read_only=on`.
17. Un error de sincronizacion durante login hace rollback/relectura y no impide registrar la sesion local.
18. Dos aplicaciones masivas concurrentes producen una ejecucion y un `409`.
19. Mas de 1000 usuarios activos produce `409 limite_operativo_excedido` antes de cualquier cambio y nunca trunca silenciosamente.
20. Cada operacion administrativa genera exactamente un evento de auditoria y un `422` nunca refleja el identificador recibido.

## 12. Decisiones Cerradas

| Decision | Resolucion |
|---|---|
| Fuente ERP | URL de lectura y nombre esperado configurados por entorno; no se seleccionan por request. |
| Momento automatico | Login exitoso, no cada request autenticado. |
| Alcance masivo | Usuarios locales activos. |
| Cuentas inactivas | Solo sincronizacion individual; nunca reactivacion. |
| Escritura ERP | Prohibida para este flujo. |
| RBAC | Reutilizar `admin_usuarios`. |
| Job periodico | Fuera de esta fase. |
| Migracion DB | No requerida. |
| Credencial ERP | Separada y de solo lectura para sincronizacion. |
| Auditoria de preview | Middleware central allowlisted y append-only; no cuenta como mutacion de negocio. |
