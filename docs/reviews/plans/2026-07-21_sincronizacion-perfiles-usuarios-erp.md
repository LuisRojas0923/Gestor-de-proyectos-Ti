# Revision de Plan: Sincronizacion de perfiles de usuarios desde ERP

**Fecha:** 2026-07-21
**Plan:** Sincronizacion individual y masiva de perfiles desde Solid ERP
**Autor del plan:** OpenCode
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti
**Especificacion:** `docs/specs/2026-07-21_sincronizacion-perfiles-usuarios-erp.md`

## 1. Objetivo

Corregir la obsolescencia de datos laborales del portal mediante una sincronizacion idempotente desde el contrato activo mas reciente del ERP configurado en cada entorno.

El plan incorpora dos mecanismos complementarios:

- Refresco de un usuario despues de un login exitoso.
- Operacion administrativa individual y masiva con previsualizacion, RBAC y auditoria.

## 2. Evidencia Y Causa Raiz

- `backend_v2/app/services/auth/servicio.py:339-385` ya copia datos ERP al usuario local.
- `backend_v2/app/api/auth/login_router.py:203-207` solo invoca esa funcion cuando falta `area` o `sede`.
- `backend_v2/app/api/auth/profile_router.py:115-120` repite la misma condicion dentro de una dependencia usada por multiples endpoints.
- `backend_v2/app/services/erp/empleados_service.py:85-145` obtiene el cargo desde `contrato.cargo` y selecciona por fecha de inicio.
- La comparacion manual de solo lectura realizada el 2026-07-21 contra `solid` confirmo un cargo local obsoleto frente al contrato activo vigente.
- Desarrollo apunta deliberadamente a `solidpruebas3`; esa configuracion no es un defecto y no debe cambiarse en este trabajo.

Causa raiz: la existencia de `area` y `sede` se usa como proxy de frescura, pero no indica si `cargo` u otros datos cambiaron posteriormente.

## 3. No-Objetivos

- No modificar `.env` ni cambiar desarrollo de `solidpruebas3` a `solid`.
- No permitir seleccionar la base ERP mediante payload, query param o header.
- No escribir en el ERP.
- No cambiar rol, permisos, contrasena, estado de cuenta, especialidades o sesiones.
- No crear migraciones ni tablas.
- No agregar un job periodico; la exclusion concurrente se limita a la ejecucion manual masiva.
- No crear UI frontend en esta fase.
- No sincronizar jerarquias, jefes ni relaciones de usuarios.
- No consultar produccion desde pruebas automatizadas.

## 4. Arquitectura Y Archivos Afectados

### Backend

- Nuevo `backend_v2/app/services/auth/sincronizacion_perfiles_service.py`: comparacion pura, aplicacion individual, locks locales, savepoints y orquestacion masiva.
- `backend_v2/app/services/auth/servicio.py`: mover la implementacion existente de sincronizacion al nuevo servicio, no agregar una delegacion que deje el archivo por encima del limite automatizado de 500 lineas.
- Nuevo `backend_v2/app/services/erp/perfiles_laborales_service.py`: DTO ERP, worker de lectura, consulta bulk y validacion de fuente. No ampliar `empleados_service.py` (441 lineas).
- Nuevo `backend_v2/app/api/auth/sincronizacion_perfiles_router.py`: autenticacion sin mutaciones, RBAC y endpoints individual, previsualizacion y aplicacion.
- `backend_v2/app/api/auth/router.py`: registrar el sub-router.
- Nuevo `backend_v2/app/models/auth/sincronizacion_perfil.py`: schemas de resultado y resumen, sin tablas.
- `backend_v2/app/api/auth/login_router.py`: sincronizar tras validar credenciales aunque el perfil ya este completo.
- `backend_v2/app/api/auth/profile_router.py`: conservar el fallback actual para campos faltantes; no convertirlo en sincronizacion por request.
- `backend_v2/app/config.py`: URL ERP de lectura, nombre esperado y validacion `ENVIRONMENT` para esta integracion.
- `backend_v2/app/database.py`: fabrica lazy `obtener_sessionmaker_erp_lectura`; una configuracion invalida no crea engine ni aborta el portal.
- `backend_v2/app/core/config.py`: tres rate limits administrativos tipados.
- `backend_v2/app/core/rate_limiter.py`: key por hash de actor autenticado e IP efectiva.
- `backend_v2/app/core/middleware/auditoria_rutas.py` y `auditoria_middleware.py`: allowlist del GET y auditoria central unica incluso para denegados/anonimos.
- `backend_v2/app/services/auditoria/servicio.py`: incluir `usuario_id` entre claves sensibles de payload objetivo, sin ocultar la identidad normal del actor.
- `backend_v2/app/core/auditoria_manifest.py`: documentar cobertura explicita/middleware bajo `admin_usuarios`.
- `backend_v2/app/main.py`: chequeo no bloqueante de salud de la fuente ERP al arrancar, sin imprimir configuracion.
- `.env.example`, `docker-compose.yml`, `docker-compose.Pruebas3.yml` y `docker-compose.prod.yml`: propagar URL/nombre esperado y rate limits de sus despliegues. `docker-compose.Pruebas3.yml` solo cambia configuracion runtime; no participa en la ejecucion automatizada de tests.
- Nuevo `docker-compose.tests.yml` autonomo: `db-test`, `erp-test`, `redis-test`, `backend-test` y `tests`, sin reutilizar ningun servicio o volumen de los otros archivos Compose.

### RBAC

- `backend_v2/app/core/rbac_manifest.py`: sin cambio previsto porque ya existe `admin_usuarios`.
- La nueva dependencia debe consultar permisos dinamicos mediante `ServicioAuth.obtener_permisos_por_rol` y exigir `admin_usuarios`.

### Pruebas Y Documentacion

- Nuevos `testing/backend/test_barreras_pruebas_aisladas.py`, `testing/backend/test_sincronizacion_perfiles_erp.py` y `testing/backend/test_sincronizacion_perfiles_erp_http.py`.
- Nuevo `testing/backend/test_perfiles_laborales_erp.py` para worker, `READ ONLY`, fuente y seleccion de contrato.
- Pruebas focales de login, especialmente `testing/backend/test_autogestion_usuarios_erp.py` y las suites que mockean ERP.
- `testing/backend/conftest.py`, `testing/backend/test_infrastructure.py` y `pytest.ini`: barrera fail-closed y marcador `live_infrastructure`.
- Nuevo `testing/backend/fixtures/erp/001_perfiles_laborales.sql`: esquema/datos minimos del PostgreSQL ERP aislado usado para probar `READ ONLY`, nunca contra Solid.
- `testing/backend/test_regresiones.py`, ejecutado solo contra la pila autonoma `docker-compose.tests.yml`.
- `testing/CATALOGO_PRUEBAS.md`.
- `docs/bitacora/2026-07-21-sincronizacion-perfiles-usuarios-erp.md` al ejecutar/cerrar.
- `docs/GUIA_MANTENIMIENTO.md`: runbook para validar fuente, previsualizar, aplicar, interpretar parciales y reintentar.
- Nuevo `docs/decisions/ADR-011-sincronizacion-perfiles-erp-solo-lectura.md`: credencial separada, validacion fail-closed por entorno y politica de refresco en login.

## 5. Contratos Propuestos

### Servicio ERP

```python
class EstadoPerfilERP(str, Enum):
    ENCONTRADO_ACTIVO = "encontrado_activo"
    SIN_CONTRATO_ACTIVO = "sin_contrato_activo"
    NO_ENCONTRADO = "no_encontrado_erp"

class ResultadoPerfilERP(BaseModel):
    estado: EstadoPerfilERP
    perfil: PerfilLaboralERP | None
    cantidad_contratos_activos: int

class EstadoSincronizacion(str, Enum):
    ACTUALIZADO = "actualizado"
    SIN_CAMBIOS = "sin_cambios"
    NO_ENCONTRADO = "no_encontrado_erp"
    SIN_CONTRATO_ACTIVO = "sin_contrato_activo"
    DATO_ERP_INVALIDO = "dato_erp_invalido"
    FALLIDO = "fallido"

class EstadoEjecucion(str, Enum):
    COMPLETO = "completo"
    PARCIAL = "parcial"
    PARCIAL_TIMEOUT = "parcial_timeout"

def consultar_perfiles_laborales_worker(
    cedulas: list[str],
    *,
    timeout_ms: int,
) -> dict[str, ResultadoPerfilERP]: ...

async def consultar_perfiles_laborales_bulk_async(
    cedulas: list[str],
    *,
    timeout_ms: int,
) -> dict[str, ResultadoPerfilERP]: ...
```

La fabrica lazy valida una matriz exacta: `development|desarrollo|pruebas3|test|tests -> solidpruebas3` y `production|produccion -> solid`; el path de `ERP_READ_DATABASE_URL` debe coincidir con `ERP_READ_EXPECTED_DATABASE`. Si falla, devuelve integracion no disponible sin crear engine y el portal continua degradado. El worker crea y cierra la sesion en el mismo hilo. Antes del primer `SELECT`, activa `READ ONLY`, timeouts locales, verifica `current_database()` y `transaction_read_only`. La consulta lateral conserva establecimientos sin contrato activo, cuenta contratos activos y selecciona uno por `fechainicio`/`numerocontrato`. Las cedulas solicitadas sin fila se inicializan como `NO_ENCONTRADO`.

### Servicio De Perfil

```python
def calcular_cambios_perfil(
    usuario: Usuario,
    perfil_erp: PerfilLaboralERP,
) -> CambiosPerfil: ...

async def sincronizar_usuario_desde_erp(
    db: AsyncSession,
    usuario: Usuario,
    *,
    aplicar: bool = True,
) -> ResultadoSincronizacionPerfil: ...

async def sincronizar_usuarios_activos_desde_erp(
    db: AsyncSession,
    *,
    aplicar: bool,
    tamano_lote: int = 100,
) -> ResumenSincronizacionPerfiles: ...
```

`PerfilLaboralERP`, `CambiosPerfil`, `ResultadoSincronizacionPerfil` y `ResumenSincronizacionPerfiles` son DTO tipados con los enums cerrados anteriores. El resultado individual contiene `estado`, `campos_modificados` y warnings sin valores. El resumen contiene conteos por estado, frecuencia de campos, lotes completados/fallidos, duracion y `estado_general`, sin identidad objetivo. `fuente_erp_no_autorizada` y `limite_operativo_excedido` son errores globales previos (`503`/`409`), nunca estados por usuario.

`calcular_cambios_perfil` es puro y aplica exactamente la tabla de nulos/invalidos de la especificacion. Los commits, rollbacks, `FOR UPDATE`, savepoints y refresh pertenecen al orquestador.

### API Administrativa

| Metodo y ruta | Respuesta |
|---|---|
| `POST /api/v2/auth/usuarios/sincronizacion-erp/individual` | Body estricto `{usuario_id}`; `200`, `404`, `422`, `429` o `503`. |
| `GET /api/v2/auth/usuarios/sincronizacion-erp/previsualizacion` | Resumen agregado; sin mutaciones de negocio. |
| `POST /api/v2/auth/usuarios/sincronizacion-erp/aplicar` | Resumen de lotes aplicados y fallidos. |

Las tres rutas requieren autenticacion web, rechazan tokens MCP y exigen `admin_usuarios`. Usan `Cache-Control: no-store, private`; no aceptan URL ERP ni listas de cedulas. La ruta individual lee JSON como `Request`, valida localmente un schema `extra="forbid"`, `max_length=50` y patron `^[A-Za-z0-9_-]+$`, y devuelve un `422` fijo sin eco ante cualquier error. Los limites son individual `10/minute`, preview `2/hour` y apply `1/hour`, con `429`/`Retry-After`.

Las tres rutas dependen exclusivamente del middleware central; ningun handler llama al servicio explicito. El GET entra en la allowlist sensible. El middleware registra exactamente un evento para `200/401/403/404/409/422/429/500/503`, con actor autenticado o `anonimo`, ruta plantilla, modulo `admin_usuarios`, entidad sin ID objetivo y metadatos agregados. La identidad normal del actor se conserva para trazabilidad; la identidad del objetivo y sus valores no se persisten.

| Momento del fallo | Respuesta |
|---|---|
| Antes del primer lote por ERP/fuente | `503` fijo, cero cambios. |
| Antes del primer commit por fallo local no recuperable | `500` fijo, rollback. |
| Despues de algun lote confirmado/evaluado | `200 PARCIAL`, conteos confirmados. |
| Deadline entre lotes | `200 PARCIAL_TIMEOUT`, conteos confirmados. |
| Todos los lotes alcanzados sin fallos de lote | `200 COMPLETO`, aunque existan estados de usuario no sincronizables. |
| Algun lote falla y el proceso continua con lotes posteriores | `200 PARCIAL`. |
| Lock ocupado o mas de 1000 activos | `409` antes de modificar. |

## 6. Reglas Transaccionales

1. Abrir una `AsyncConnection` dedicada, adquirir alli el advisory lock de sesion para `aplicar`, mantenerla fijada durante todos los commits y liberar el lock en esa misma conexion dentro de `finally`; si no se obtiene, devolver `409`. Preview no adquiere el lock de aplicacion.
2. Contar hasta 1001 usuarios activos antes de modificar. Si hay mas de 1000, devolver `409 limite_operativo_excedido` sin cambios. En caso contrario, paginar por `id` estable, maximo 100 por lote, sin cargar todos los ORM en memoria.
3. Enviar solo las cedulas del lote al worker. El worker crea/usa/cierra `SessionErpLectura`, siempre hace rollback al terminar la lectura y nunca devuelve una sesion.
4. Calcular cambios sobre DTOs durante preview, sin mutar ORM, `flush`, procedimiento protegido ni commit de negocio.
5. En apply, releer cada usuario del lote con `SELECT ... FOR UPDATE`, confirmar `esta_activo` y recalcular diferencias.
6. Aplicar cada usuario dentro de `begin_nested()`, ejecutar `flush` para detectar conflictos y revertir solo su savepoint si falla.
7. Hacer un commit local por lote. Si el commit final falla, hacer rollback, reclasificar todos los exitos provisionales de ese lote como `fallido`, limpiar la sesion y continuar con una relectura fresca del lote siguiente.
8. Actualizar `actualizado_en` solo para usuarios con cambios efectivos y hacer `refresh` despues del commit cuando el caller necesita devolver el perfil.
9. En login, cualquier error ERP o local de esta sincronizacion obliga a `rollback` y relectura del usuario antes de continuar permisos/registro de sesion con el ultimo estado confirmado.
10. No compensar ERP porque este flujo nunca escribe alli y no hacer commits dentro de `calcular_cambios_perfil` ni del worker ERP.

Presupuestos: `connect_timeout=3s`, `pool_timeout=2s`, ERP `statement_timeout=5s` en login/`15s` en bulk, ERP `lock_timeout=2s`, espera async del worker `8s`/`20s`, lock local `3s` y deadline monotonic total `180s`. El deadline se comprueba solo entre lotes. Si vence, no se cancela un commit en curso: se confirma/revierte ese lote y se devuelve `PARCIAL_TIMEOUT`; reintentar desde el inicio es seguro por idempotencia.

Para el correo se usa `actualizar_correo_protegido` solo despues del `FOR UPDATE` y solo si el valor todavia cambia. Un correo invalido se omite sin bloquear otros campos; un `IntegrityError` revierte el usuario/savepoint. Esto evita reiniciar `correo_verificado` en cada login y protege frente a carreras con una verificacion concurrente.

## 7. Pasos De Implementacion

1. Crear la pila autonoma `docker-compose.tests.yml` y la barrera previa a `load_dotenv`: `db-test`, `erp-test`, `redis-test`, `backend-test`, URLs internas exactas, sin fallback a `.env` normal y marcadores/opt-ins para cada clase de prueba.
2. Escribir tests TDD de fuente, contrato, comparacion, concurrencia, rollback, correo, auditoria y endpoints; registrar RED significativo antes de tocar `backend_v2/`.
3. Agregar configuracion `ERP_READ_DATABASE_URL`/`ERP_READ_EXPECTED_DATABASE` y credenciales de ejemplo sin secretos; exigir valores en compose compartidos y produccion.
4. Crear `SessionErpLectura` y el worker en `perfiles_laborales_service.py`, con ownership de hilo, `READ ONLY`, timeouts, validacion de fuente y cierre garantizado.
5. Implementar la consulta lateral parametrizada que distingue inexistente/sin contrato, cuenta activos y selecciona deterministamente.
6. Implementar DTOs y `calcular_cambios_perfil` con la politica exacta de nulos, tamanos, booleanos, numeros y correo.
7. Extraer la implementacion de `ServicioAuth.sincronizar_perfil_desde_erp` a `sincronizacion_perfiles_service.py` y actualizar sus consumidores directos; no conservar compatibilidad sin consumidor.
8. Implementar unidad individual con `FOR UPDATE`, savepoint, procedimiento de correo, commit/rollback y refresh.
9. Cambiar `login_router.py` para sincronizar siempre despues de credenciales validas; ante cualquier fallo de frescura, rollback/relectura y continuar sin serializar la excepcion.
10. Mantener en `profile_router.py` solo el fallback condicionado para evitar consultas ERP por request.
11. Crear la dependencia administrativa sin mutaciones ni soporte MCP y probar que preview no cambia filas de negocio.
12. Implementar preview paginado y agregado, cubierto solo por auditoria central, timeout total y sin detalle personal.
13. Implementar apply por lotes/savepoints con una conexion dedicada al advisory lock, limite fail-closed de 1000, deadline entre lotes, resultados parciales y reintento idempotente.
14. Añadir tres rate limits, claves actor+IP hasheadas, `Retry-After`, no-store y codigos HTTP cerrados.
15. Extender la auditoria central para las tres rutas, incluidos denegados/anonimos, ruta plantilla y redaccion de `usuario_id`; probar exactamente un evento, logs y filas persistidas con valores señuelo.
16. Verificar `admin_usuarios` en `rbac_manifest.py` sin agregar otra entrada.
17. Documentar runbook, variables, catalogo y evidencia RED/GREEN.
18. Ejecutar unitarias, infraestructura y regresiones solo en la pila autonoma de tests despues de que la barrera certifique destinos no productivos.

## 8. Estrategia TDD

### Servicio ERP

- Selecciona el contrato `Activo` mas reciente.
- Desempata contratos con igual fecha por `numerocontrato`.
- Distingue cedula inexistente de establecimiento sin contrato activo.
- Cuenta multiples contratos activos y emite warning agregado sin PII.
- Parametriza cedulas y no concatena valores en SQL.
- Crea y cierra la sesion dentro del worker aun ante error.
- Verifica `current_database`, `transaction_read_only`, timeouts y rechazo de DML en PostgreSQL aislado.
- La prueba unitaria sustituye `SessionErpLectura` y no abre red.

### Comparacion Y Persistencia

- Cargo diferente produce exactamente un cambio de `cargo`.
- Perfil identico devuelve `sin_cambios` y no hace commit/update.
- Espacios externos no producen falsos cambios.
- Valores nulos siguen las reglas de autoridad definidas en la especificacion.
- `viaticante` interpreta `N`, `False`, `0`, `S`, `True`, `1`, conserva ante `None` y rechaza desconocidos.
- Numeros no finitos/negativos y textos mayores al modelo producen `dato_erp_invalido` sin escrituras.
- Correo igual conserva `correo_verificado`.
- Correo distinto usa el servicio protegido y queda sujeto a verificacion.
- Correo invalido se omite y correo duplicado revierte el usuario sin dejar cambios parciales.
- Dos sincronizaciones concurrentes recalculan bajo `FOR UPDATE` y no revierten una verificacion nueva.
- Rol, estado, hash, permisos, especialidades y sesiones permanecen intactos.
- Usuario ERP ausente/inactivo conserva el perfil local.

### Login

- Perfil completo pero obsoleto se actualiza despues de credenciales validas.
- ERP no disponible no impide login local ni expone el error del driver.
- Fuente ERP no autorizada no impide login local ni ejecuta la consulta de perfiles.
- `IntegrityError`/fallo de commit hace rollback, relectura y permite registrar la sesion local.
- Credenciales invalidas no disparan sincronizacion ERP.
- La respuesta de login contiene el perfil actualizado cuando hubo exito.

### Administracion Y Seguridad

- No autenticado obtiene `401`.
- Autenticado sin `admin_usuarios` obtiene `403`.
- Un rol con permiso dinamico puede ejecutar sin depender del literal `admin`.
- Previsualizacion no muta filas de negocio, no hace `flush` ni llama procedimientos; la auditoria central cubre exito y denegacion.
- Masivo excluye usuarios locales inactivos.
- Individual puede evaluar un inactivo pero no cambia `esta_activo`.
- `test_individual_inactivo_no_reactiva` verifica de forma aislada la cuenta inactiva.
- Fallo de savepoint afecta un usuario; fallo de commit reclasifica todos los exitos provisionales del lote y el siguiente lote se relee.
- Una segunda aplicacion concurrente devuelve `409`; los tres endpoints aplican sus rate limits por actor+IP.
- Payload/respuesta no aceptan ni revelan URLs o nombres de base configurables.
- Auditoria y logs conservan el actor cuando existe pero no contienen identidad/valores del objetivo; GET autorizado/denegado queda auditado una vez y las rutas se almacenan como plantilla.
- Errores `422`/`503` y warnings no incluyen URL, host, base, excepcion del driver ni el input objetivo.
- Las tres respuestas incluyen `Cache-Control: no-store, private`.

## 9. Matriz Criterio A Prueba

| CA | Test exacto propuesto | Capa / aislamiento | Escritura permitida | Resultado esperado |
|---|---|---|---|---|
| 1-3 | `test_login_refresca_cargo_completo`, `test_perfil_identico_no_escribe` | Unitario, ERP fake y AsyncSession fake | Ninguna externa | Cargo cambia; segunda corrida no hace UPDATE. |
| 4 | `test_fuente_erp_permitida_por_entorno`, `test_api_rechaza_selector_fuente` | Unitario de config/API | Ninguna | Dev solo pruebas, prod solo `solid`, payload extra `422`. |
| 5, 16 | `test_worker_activa_read_only_y_rechaza_dml`, `test_worker_crea_y_cierra_sesion_en_mismo_hilo_en_exito_y_error` | PostgreSQL ERP aislado + unitario | DML intentado y rechazado en DB efimera | Read-only; cero DML; ownership/cierre comprobado. |
| 6, 17 | `test_login_erp_caido_hace_rollback_y_continua`, `test_login_conflicto_correo_continua` | Unitario de login | DB local fake | Login `200`, usuario reconsultado, sesion registrable. |
| 7 | `test_estados_no_encontrado_y_sin_contrato_no_mutan` | ERP fake | Ninguna | Estados distintos; perfil local intacto. |
| 8-10 | `test_bulk_excluye_inactivos_y_preserva_seguridad`, `test_individual_inactivo_no_reactiva` | Servicio con DB de tests | Solo perfiles permitidos | Estado/rol/hash/permisos/sesiones intactos. |
| 11 | `test_tres_rutas_exigen_401_403_y_permiso_dinamico` | API con overrides | Ninguna sin permiso | Matriz parametrizada de las tres rutas. |
| 12 | `test_preview_solo_escribe_auditoria_separada` | API/servicio | Solo auditoria append-only | Sin flush/commit/procedimiento sobre DB de negocio. |
| 13 | `test_resumen_parcial_reclasifica_lote_revertido`, `test_matriz_estado_global_por_momento_del_fallo` | Servicio con DB de tests | Lotes confirmados | Conteos exactos y mapeo completo/parcial/timeout/500/503. |
| 14 | `test_logs_auditoria_y_errores_redactan_objetivo_y_conexion` | Captura logs + DB auditoria test | Auditoria sanitizada | Sin PII, URL, host, base ni excepcion driver. |
| 15 | `test_correo_igual_preserva_verificacion`, `test_correo_cambiado_usa_proteccion` | Unitario/DB tests | Solo correo realmente distinto | Flags conservados o reiniciados conforme politica. |
| 18 | `test_apply_concurrente_devuelve_409` | PostgreSQL local aislado | Advisory lock | Una aplicacion y un `409`. |
| 19 | `test_mas_de_1000_falla_antes_de_modificar` | Servicio con DB de tests | Ninguna | `409 limite_operativo_excedido`, cero cambios. |
| 20 | `test_auditoria_exactamente_un_evento_y_422_sin_eco` parametrizado sobre tres rutas y exito/denegado/fallo | API + auditoria test | Un evento sanitizado | Delta exacto de uno; input ausente del `422`. |

La evidencia RED/GREEN se registra en la bitacora con timestamp, comando exacto, entorno sanitizado, exit code, conteos y fallo esperado. Un error de importacion/coleccion no satisface RED. GREEN repite los mismos test IDs/comandos del RED, exige exit code `0` y cero `skip`/`xfail` de los objetivos. No se modifica codigo de aplicacion hasta obtener al menos un RED funcional de cada corte: ERP, comparacion/login y API/bulk.

## 10. Criterios De Aceptacion

- Se cumplen los 20 criterios de la especificacion vinculada.
- El caso funcional de un cargo cambiado en el contrato activo queda corregido al siguiente login o mediante sincronizacion administrativa.
- No hay consultas ERP por cada request autenticado.
- La operacion masiva es idempotente y reporta resultados parciales.
- No hay migraciones, cambios de rol/estado ni escrituras ERP.
- Desarrollo continua usando su ERP de pruebas y produccion usa su configuracion propia.

## 11. Barreras Y Comandos De Validacion

Antes de importar `app.config` o cargar dotenv, `conftest.py` inspecciona los marcadores seleccionados y falla cerrado salvo que:

- la base local sea exactamente `project_manager_test` en host `db-test`;
- el path parseado de `ERP_READ_DATABASE_URL` y `ERP_READ_EXPECTED_DATABASE` sean exactamente `solidpruebas3`, nunca `solid`;
- para `erp_postgres_integration`, el host ERP sea exactamente `erp-test` y `ALLOW_ERP_TEST_DB=1`;
- para `mutating_integration`/`live_infrastructure`, `TEST_BASE_URL` sea exactamente `http://backend-test:8000/api/v2` y existan sus opt-ins;
- la barrera se ejecute antes de cualquier `load_dotenv`; las suites marcadas no cargan `backend_v2/.env` como fallback.

`docker-compose.tests.yml` es autonomo y usa solo credenciales no productivas declaradas en el propio archivo: `db-test`, `erp-test`, `redis-test`, `backend-test` y `tests` en una red exclusiva. `tests` monta `.:/workspace` en modo escritura para permitir `testing/logs`/cache, usa `working_dir=/workspace` y `PYTHONPATH=/workspace/backend_v2`; no usa `${PWD}`, `.env` normal ni servicios persistentes. `backend-test` apunta exclusivamente a `db-test` y `erp-test`. El servicio no se despliega con produccion.

`pytest.ini` registra `erp_postgres_integration`, `mutating_integration` y `live_infrastructure`. La barrera valida el opt-in/destino de cada marcador incluso si aparece solo; las suites HTTP mutantes llevan simultaneamente los dos ultimos.

Comandos:

- Smoke del runner: `docker compose -f docker-compose.tests.yml run --rm --no-deps tests python -c "import app; print('test-runner-ok')"`.
- Unitarias sin red: `docker compose -f docker-compose.tests.yml run --rm --no-deps tests pytest testing/backend/test_barreras_pruebas_aisladas.py testing/backend/test_sincronizacion_perfiles_erp.py testing/backend/test_perfiles_laborales_erp.py -m "not erp_postgres_integration and not mutating_integration and not live_infrastructure" -v`.
- Login focal con overrides ERP: `docker compose -f docker-compose.tests.yml run --rm --no-deps tests pytest testing/backend/test_autogestion_usuarios_erp.py testing/backend/test_jit_approval.py -m "not mutating_integration and not live_infrastructure" -v`.
- ERP PostgreSQL aislado, incluido CA5/16: `docker compose -f docker-compose.tests.yml run --rm -e ALLOW_ERP_TEST_DB=1 tests pytest testing/backend/test_perfiles_laborales_erp.py -m erp_postgres_integration -v`.
- Levantar backend aislado: `docker compose -f docker-compose.tests.yml up -d backend-test`.
- Integracion HTTP mutante: `docker compose -f docker-compose.tests.yml run --rm -e ALLOW_MUTATING_TESTS=1 -e ALLOW_LIVE_INFRA_TESTS=1 tests pytest testing/backend/test_sincronizacion_perfiles_erp_http.py -v`. Los casos HTTP mutantes deben llevar ambos marcadores.
- Infraestructura live aislada: `docker compose -f docker-compose.tests.yml run --rm -e ALLOW_MUTATING_TESTS=1 -e ALLOW_LIVE_INFRA_TESTS=1 tests pytest testing/backend/test_infrastructure.py -m live_infrastructure -v`.
- Arquitectura, con lista explicita que incluye nuevos/staged/no staged: `py -3.12 scripts/enforce_architecture.py backend_v2/app/config.py backend_v2/app/database.py backend_v2/app/main.py backend_v2/app/core/config.py backend_v2/app/core/rate_limiter.py backend_v2/app/core/auditoria_manifest.py backend_v2/app/core/middleware/auditoria_rutas.py backend_v2/app/core/middleware/auditoria_middleware.py backend_v2/app/services/auditoria/servicio.py backend_v2/app/services/auth/servicio.py backend_v2/app/services/auth/sincronizacion_perfiles_service.py backend_v2/app/services/erp/perfiles_laborales_service.py backend_v2/app/api/auth/sincronizacion_perfiles_router.py backend_v2/app/api/auth/router.py backend_v2/app/api/auth/login_router.py backend_v2/app/api/auth/profile_router.py backend_v2/app/models/auth/sincronizacion_perfil.py testing/backend/conftest.py testing/backend/test_sincronizacion_perfiles_erp.py testing/backend/test_perfiles_laborales_erp.py testing/backend/test_autogestion_usuarios_erp.py testing/backend/test_infrastructure.py testing/backend/test_regresiones.py`.
- Teardown: `docker compose -f docker-compose.tests.yml down -v --remove-orphans`.
- Verificacion manual en desarrollo: previsualizar, aplicar, repetir y confirmar `sin_cambios`.
- Puerta de despliegue en produccion: el health check sanitizado debe confirmar fuente autorizada `solid`, usuario ERP de solo lectura y `transaction_read_only=on` antes de habilitar el endpoint masivo.

No se ejecutan tests automatizados ni escrituras de validacion contra `solid`.

## 12. Impacto En Documentacion

- [x] `docs/specs/2026-07-21_sincronizacion-perfiles-usuarios-erp.md`.
- [x] `testing/CATALOGO_PRUEBAS.md` al crear la suite.
- [x] `docs/bitacora/2026-07-21-sincronizacion-perfiles-usuarios-erp.md` durante ejecucion y cierre.
- [x] `docs/GUIA_DESARROLLO.md` para variables, aislamiento de tests y configuracion por entorno.
- [x] `docs/GUIA_MANTENIMIENTO.md` para previsualizacion, apply, parciales, reintentos y verificacion de fuente.
- [x] `.env.example` para URL/nombre esperado de lectura y tres rate limits, nunca valores reales.
- [x] `docs/ESQUEMA_BASE_DATOS.md`: no aplica porque no cambio el modelo persistente.
- [x] `docs/decisions/ADR-011-sincronizacion-perfiles-erp-solo-lectura.md` por la nueva conexion separada y politica fail-closed durable.

## 13. Evaluacion De Riesgos

| Riesgo | Probabilidad | Mitigacion |
|---|---|---|
| Produccion apunta accidentalmente a una base ERP atrasada | Media | Credencial/URL de lectura separada, nombre esperado, validacion por worker y puerta de despliegue. |
| Login se vuelve dependiente del ERP | Media | Timeout corto, threadpool y fallo no bloqueante con perfil local. |
| Consulta ERP por cada request | Alta si se cambia la dependencia comun | Sincronizar siempre solo en login; conservar fallback condicionado en `profile_router.py`. |
| Sobrescritura de seguridad local | Alta | Allowlist cerrada; excluir rol, estado, hash, permisos y sesiones. |
| Correo verificado se invalida en cada login | Alta | Invocar actualizacion protegida solo si el correo cambia realmente. |
| Multiples contratos activos producen datos ambiguos | Media | Orden determinista y warning operativo sin PII. |
| N+1 sobre ERP en ejecucion masiva | Alta | Consulta bulk parametrizada y procesamiento local por lotes. |
| Fallo a mitad de sincronizacion masiva | Media | Savepoint por usuario, commit/rollback por lote, reclasificacion del lote e idempotencia. |
| PII en logs o auditoria | Media | Solo cantidades, campos y codigos; pruebas de redaccion. |
| Uso indebido del endpoint masivo | Media | `admin_usuarios`, autenticacion, rate limit y auditoria. |
| ERP se modifica por error | Baja/alto impacto | Rol ERP `SELECT` separado, `READ ONLY`, prueba de DML rechazado y SQL allowlisted. |
| Tests alcanzan destinos productivos | Media/critica | Marcadores opt-in y barrera fail-closed para DB local, ERP y `TEST_BASE_URL`. |
| Dos masivos compiten | Media | Advisory lock de sesion, timeout total y `409`. |

## 14. Matriz De Subagentes

| Subagente | Motivo | Resultado | Bloquea |
|---|---|---|---|
| `harness-router` | Recomendar matriz por alcance | Completado | No |
| `graphify-searcher` | Localizar flujo ERP, auth, jobs, auditoria y RBAC | Completado con fallback | No |
| `scope-reviewer` | Validar alcance, limites y coherencia SDD | `approved` tras incorporar bloqueos | No |
| `backend-reviewer` | Revisar FastAPI, SQLAlchemy, ERP, transacciones y TDD | `approved` tras incorporar bloqueos | No |
| `security-rbac-reviewer` | Revisar RBAC, PII, configuracion y produccion | `approved` tras incorporar bloqueos | No |
| `docs-tests-reviewer` | Revisar trazabilidad, pruebas y evidencia | `approved_with_risks` | No |
| `frontend-reviewer` | Sin cambios frontend | No aplica | No |
| `mobile-reviewer` | Sin cambios mobile | No aplica | No |

## 15. Decision Final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

El plan fue ejecutado tras autorizacion humana. Compose aislado, credencial separada obligatoria, barrera previa a carga de dotenv, ADR-011, runbook, timeout de locks y pruebas quedaron implementados y verificados. Permanece el riesgo operativo de provisionar la credencial read-only y los secretos de cada despliegue.

La aprobacion tecnica del plan no autoriza por si sola cambios de codigo de aplicacion. Conforme a RIPER, la ejecucion comienza unicamente tras aprobacion humana explicita y debe mostrar evidencia RED antes de modificar `backend_v2/`.
