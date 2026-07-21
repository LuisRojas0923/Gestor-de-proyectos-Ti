# Revision de Plan: Bitacoras operacionales web

**Fecha:** 2026-07-21
**Plan:** Modulo web responsive para bitacoras de obra FT-OPE-49
**Autor del plan:** OpenCode
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti
**Especificacion:** `docs/specs/2026-07-21_bitacoras-operacionales-web.md`

## 1. Objetivo

Implementar un modulo full-stack web responsive para que el coordinador de obra cree borradores, consulte ordenes abiertas, registre actividades, novedades y fotografias, firme, finalice y descargue una bitacora de obra inmutable en PDF.

## 2. No-objetivos

- No incluir personal administrativo, personal operativo ni acta de asistencia.
- No modificar `movil/` ni `modulo_actividades_fork/` y no crear una aplicacion React Native.
- No implementar modo offline, geolocalizacion, OCR o sincronizacion diferida.
- No crear aprobaciones, rechazos o devoluciones.
- No implementar firma electronica certificada.
- No permitir cargar una imagen o archivo como firma.
- No escribir en el ERP ni reutilizar `OThorarios` sin demostrar que corresponde a `Aperturas OT V4`.
- No permitir cambios a documentos finalizados.
- No implementar anulacion o correccion hasta definir el procedimiento documental.

## 3. Arquitectura Y Modulos Afectados

### Backend

- `backend_v2/app/models/bitacoras_operacionales/`: modelos y schemas en espanol.
- `backend_v2/app/services/bitacoras_operacionales/`: dominio, archivos, PDF y orquestacion de finalizacion.
- `backend_v2/app/api/bitacoras_operacionales/`: router y dependencias RBAC.
- `backend_v2/app/services/erp/ordenes_trabajo_service.py`: consulta especifica de `Aperturas OT V4` mediante worker con cierre garantizado de `SessionErp`.
- `backend_v2/app/core/migrations/bitacoras_operacionales_migration.py`: migracion PostgreSQL idempotente.
- `backend_v2/app/core/migrations/manager.py`: registro fail-fast de la migracion.
- `backend_v2/app/core/migrations/schema_verifier.py`: verificacion runtime de tablas, constraints, indices y triggers criticos.
- `backend_v2/app/models/registry.py`: carga determinista de los modelos.
- `backend_v2/app/core/rbac_manifest.py`: permisos del modulo.
- `backend_v2/app/core/auditoria_manifest.py` y `backend_v2/app/core/middleware/auditoria_rutas.py`: paridad RBAC y eventos sin payload.
- `backend_v2/app/services/auditoria/servicio.py`, `backend_v2/app/core/middleware/auditoria_middleware.py` y `auditoria_resolver.py`: registro transaccional y supresion del evento automatico duplicado.
- `backend_v2/app/models/auth/usuario.py`: admitir IDs granulares con punto en la administracion RBAC y probar el contrato existente.
- `backend_v2/app/api/notificaciones/router.py` y `backend_v2/app/services/notificacion/servicio.py`: autenticacion, propiedad y variante sin commit.
- `backend_v2/app/core/config.py`, `.env.example` y archivos Compose: limites configurables y volumen persistente existente.
- `backend_v2/requirements.txt`: fijar Pillow y soporte HEIC/HEIF para decodificacion y normalizacion real de imagenes.
- `backend_v2/app/main.py`: registro del router y limite de carga.
- `backend_v2/app/resources/bitacoras_operacionales/`: logo y recursos versionados del formato aprobado.

### Frontend

- `frontend/src/pages/ServicePortal/pages/BitacorasOperacionales/`: paginas, componentes y hooks del modulo.
- `frontend/src/services/bitacorasOperacionalesService.ts`: cliente API tipado.
- `frontend/src/types/bitacorasOperacionales.ts`: contratos TypeScript.
- `frontend/src/config/api.ts`: constantes de endpoints.
- `frontend/src/pages/ServicePortal/routes/featureRoutes.tsx`: rutas protegidas.
- `frontend/src/pages/ServicePortal/pages/DashboardView.tsx`: tarjeta visible por permiso.
- `frontend/src/pages/ServicePortal.tsx`: integracion de navegacion; extraer el mapa/dispatcher si el cambio acerca el archivo al limite de 550 lineas.
- `frontend/src/pages/ServicePortal/context/BitacoraDraftSyncProvider.tsx`: cola de autosalvado que permanece montada al navegar dentro del Portal.
- `frontend/src/components/auth/ProtectedRoute.tsx`: autorizacion fail-closed cuando `permissions` no existe.
- `frontend/src/components/notifications/NotificationsContext.tsx`: WebSocket con ticket efimero y navegacion interna allowlisted.
- `frontend/src/components/atoms/Input.tsx` y `frontend/src/components/molecules/FilePicker.tsx`: soporte tipado para `capture` y `disabled`.
- `frontend/src/components/molecules/FirmaCanvas.tsx`: primitiva accesible para dibujar la firma con dedo, lapiz tactil o mouse, sin carga de archivos.
- `frontend/src/components/molecules/DataTable.tsx`: extension generica minima para renderizar un filtro controlado por columna; extraer cableado si es necesario para conservar menos de 550 lineas.
- `frontend/src/components/molecules/DataTableFilterControl.tsx` y `FilterDropdown.tsx`: cableado reutilizable y compatibilidad con filtros locales existentes.
- `frontend/src/components/molecules/RemoteFilterDropdown.tsx` y `DateRangeFilterPopover.tsx`: filtros remotos genericos con portal y carga incremental sin ampliar `DataTable`.

### Pruebas Y Documentacion

- `testing/backend/test_bitacoras_operacionales_*.py`.
- `frontend/src/tests/BitacorasOperacionales*.test.tsx`.
- `frontend/src/tests/bitacorasOperacionalesService.test.ts`.
- `testing/CATALOGO_PRUEBAS.md`.
- `docs/ESQUEMA_BASE_DATOS.md`.
- `docs/bitacora/` al ejecutar y cerrar la entrega.

## 4. Modelo De Persistencia

Crear tres tablas PostgreSQL:

### `bitacoras_operacionales`

| Campo | Tipo orientativo | Regla |
|---|---|---|
| `id` | UUID | PK generada por servidor. |
| `fecha_elaboracion` | DATE | No futura. |
| `orden_trabajo` | VARCHAR(50) | Snapshot textual; conserva ceros iniciales. |
| `nombre_obra` | VARCHAR(255) | Snapshot ERP obligatorio. |
| `ciudad` | VARCHAR(120) | Snapshot ERP obligatorio. |
| `ingeniero_responsable` | VARCHAR(255) | Snapshot ERP obligatorio. |
| `estado` | VARCHAR(20) | CHECK `BORRADOR` o `FINALIZADA`. |
| `version` | INTEGER | Control optimista; inicia en 1 y aumenta en cada PATCH aceptado. |
| `novedades_dia` | TEXT NULL | Texto no vacio cuando `sin_novedad` es falso. |
| `sin_novedad` | BOOLEAN | Evita inferir la ausencia de novedades desde texto libre. |
| `creado_por_id` | VARCHAR(50) | FK `usuarios.id`, propietario inmutable. |
| `finalizado_por_id` | VARCHAR(50) NULL | FK `usuarios.id`; debe coincidir con propietario en MVP. |
| `firma_ruta`, `firma_hash` | VARCHAR | Privados; obligatorios al finalizar. |
| `pdf_ruta`, `pdf_hash` | VARCHAR | Artefacto final privado e inmutable. |
| `nombre_firmante`, `version_constancia` | VARCHAR | Snapshots del actor y texto de constancia aceptado. |
| `codigo_formato`, `fecha_formato`, `version_formato` | VARCHAR/DATE | Snapshots del documento oficial. |
| `creado_en`, `actualizado_en`, `finalizado_en` | TIMESTAMPTZ | Auditoria en UTC. |

### `bitacora_operacional_actividades`

- `id BIGSERIAL`, `bitacora_id UUID`, `orden SMALLINT`, `descripcion TEXT`.
- FK con `ON DELETE RESTRICT`; no existe eliminacion del documento padre en MVP.
- UNIQUE `(bitacora_id, orden) DEFERRABLE INITIALLY DEFERRED` y checks de orden positivo y texto no vacio.

### `bitacora_operacional_fotografias`

- `id UUID`, `bitacora_id UUID`, `orden SMALLINT`, `ruta_relativa`, `nombre_original`, `tipo_mime`, `tamano_bytes`, `ancho`, `alto`, `hash_sha256`, `creado_en`.
- UNIQUE `(bitacora_id, orden) DEFERRABLE INITIALLY DEFERRED` y ruta relativa unica.
- No se agrega descripcion funcional porque no fue solicitada.

La migracion debe crear indices no unicos por propietario/fecha, OT/fecha, estado/fecha y las FKs. Se permiten varias bitacoras para la misma OT y fecha; cada fila se identifica por UUID y hora de creacion, sin consecutivo adicional. `novedades_dia` y `sin_novedad` usan un CHECK XOR. Los hashes usan 64 caracteres hexadecimales. Un CHECK de estado exige que firma, PDF, hashes, firmante, version de constancia y marcas de finalizacion esten ausentes en `BORRADOR` y presentes en `FINALIZADA`, con `finalizado_por_id = creado_por_id`. Triggers PostgreSQL impiden mutar o borrar padres finalizados y cualquier hijo de un padre finalizado; un constraint trigger diferido exige al menos una actividad y una foto al finalizar. La fecha no futura se valida en servicio y trigger con semantica de `America/Bogota`.

La migracion se ejecuta exclusivamente mediante `python -m app.manage migrate`, conforme a ADR-010. FastAPI solo verifica estructura y privilegios durante startup; no ejecuta DDL ni sincroniza RBAC.

## 5. Contrato De API

Prefijo: `/api/v2/bitacoras-operacionales`.

| Metodo y ruta | Permiso | Comportamiento |
|---|---|---|
| `GET /ordenes-abiertas?q&limit&offset` | `leer + gestionar` | Busca OT abiertas dentro del alcance ERP aprobado y devuelve `{items,total,limit,offset}`. |
| `GET /?q&estado&orden_trabajo&nombre_obra&fecha_desde&fecha_hasta&limit&offset` | `bitacoras_operacionales.leer` | Lista registros propios con filtros repetibles, orden estable y paginacion maxima de 100. |
| `GET /opciones-filtro?columna&q&estado&orden_trabajo&nombre_obra&fecha_desde&fecha_hasta&limit&offset` | `bitacoras_operacionales.leer` | Devuelve valores distintos paginados para `estado`, `orden_trabajo` o `nombre_obra`, respetando propietario y filtros activos. |
| `POST /` | `leer + gestionar` | Crea borrador desde una OT abierta y snapshots del servidor. |
| `GET /{id}` | `bitacoras_operacionales.leer` | Devuelve detalle solo al propietario. |
| `PATCH /{id}` | `leer + gestionar` | Actualiza solo el borrador si `version_esperada` coincide e incrementa `version`. |
| `POST /{id}/fotografias` | `leer + gestionar` | Carga multipart con validacion y almacenamiento atomico. |
| `GET /{id}/fotografias/{foto_id}` | `bitacoras_operacionales.leer` | Recupera una foto privada mediante join con bitacora propia. |
| `DELETE /{id}/fotografias/{foto_id}` | `leer + gestionar` | Elimina una fotografia propia solo en borrador. |
| `PUT /{id}/fotografias/orden` | `leer + gestionar` | Reordena IDs pertenecientes al mismo borrador. |
| `POST /{id}/finalizar` | `leer + gestionar` | Recibe firma y `version_esperada`, revalida OT, genera PDF y finaliza atomicamente. |
| `GET /{id}/pdf` | `bitacoras_operacionales.leer` | Descarga el PDF almacenado con cabeceras privadas. |

Todos los IDs se resuelven junto con `creado_por_id`; las fotografias se resuelven mediante join y nunca por `foto_id` aislado. Una respuesta no autorizada usa 404 uniforme sin revelar existencia. Los schemas usan tipos concretos, limites, `extra="forbid"`, `model_dump(exclude_unset=True)` y allowlist de PATCH; no aceptan nombre de obra, ciudad, ingeniero, propietario, estado, rutas, hashes ni datos calculados por servidor.

Creacion y carga no prometen replay idempotente en el MVP; la interfaz evita dobles envios y el servidor aplica constraints de dominio. Repetir finalizacion si es idempotente por estado: antes de analizar firma o consultar ERP se lee la bitacora propia y, si ya esta `FINALIZADA`, se devuelve el artefacto existente. Para un borrador se valida firma/ERP y luego se revalida estado/version bajo lock, sin duplicar PDF, auditoria ni notificacion. Los endpoints multipart autentican y autorizan antes de `request.form()`, aceptan una sola parte allowlisted y tienen limite ASGI aun sin `Content-Length`. Se usan 201 para creacion/carga, 204 para eliminacion, 409 para version/estado en conflicto, 422 para validacion, 404 uniforme para inexistente/ajeno, 413 para cuerpo excedido, 429 para limite de tasa y 503 generico para ERP no disponible.

`q` tiene longitud maxima, escapa comodines y busca remotamente por OT y nombre de obra. Los filtros multiseleccion se serializan como parametros repetidos; las opciones de una columna autoexcluyen solo su filtro y conservan los demas. La pagina inicial usa 25 filas y permite 25/50/100. El orden estable es `fecha_elaboracion DESC, creado_en DESC, id DESC`. Cambiar busqueda, filtros o tamano reinicia `offset`; nunca se descargan todos los registros para calcular opciones en cliente.

Busqueda ERP, carga de fotografias y finalizacion tienen rate limits configurables y fail-closed, cubiertos con pruebas 429. La consulta ERP usa `statement_timeout` del driver/servidor; una cancelacion HTTP no se considera cancelacion de PostgreSQL hasta que el worker cierre su sesion. Los errores y logs son genericos y nunca incluyen SQL, esquema, textos operacionales ni `str(e)`.

## 6. Pasos De Implementacion

1. Obtener un ejemplo real del contrato `Aperturas OT V4` sin secretos antes de ejecutar la integracion ERP del paso 5.
2. Aprobar DTOs, errores, paginacion, limites de texto/imagenes, ciclo de borrador y retencion; cardinalidad OT/fecha ya confirmada como multiple con identidad UUID/hora.
3. Fase tecnica 0 completada: notificaciones, auditoria, validacion RBAC y `ProtectedRoute` endurecidos con pruebas y revisiones.
4. Fase 1 completada: modelos/schemas, migracion PostgreSQL idempotente, ACL minima, concurrencia, registro del job y verificador fail-closed conforme a ADR-010.
5. Escribir pruebas rojas ERP; implementar `listar_ots_bitacora_worker` y `obtener_ot_bitacora_abierta_worker` con cierre garantizado, consulta parametrizada, timeout y alcance en servidor.
6. Escribir pruebas rojas de archivos; implementar almacenamiento especifico o extraccion minima del patron seguro existente, con regresiones WBS y ruta `${STORAGE_PATH}/bitacoras/{id}/`.
7. Escribir pruebas rojas de dominio/RBAC; implementar servicios async de borrador y propiedad sin commits profundos, bloqueando el mismo padre antes de alterar hijos.
8. Escribir pruebas rojas de PDF/finalizacion/notificacion; implementar normalizacion, ReportLab en `asyncio.to_thread`, saga, reconciliacion e idempotencia por estado.
9. Registrar permisos en RBAC y auditoria, proteger backend y verificar que la Fase 0 evita eventos duplicados o accesos fail-open.
10. Escribir pruebas rojas frontend; crear cliente API/tipos sin `any` y rutas con permisos all-of.
11. Construir listado y editor mobile-first con componentes atomicos: selector OT remoto, actividades, novedades, camara/galeria, firma y confirmacion final.
12. Añadir autosalvado remoto serializado en `BitacoraDraftSyncProvider`, maquina de estados, control optimista de version, `beforeunload` solo mientras existe cambio pendiente/error y prevencion de dobles envios; no migrar el router ni usar `useBlocker`.
13. Completar pruebas frontend de fotos persistidas, firma, finalizacion, listado, inmutabilidad visual y navegacion.
14. Actualizar esquema mediante `scripts/sync_docs.py`, catalogo, runbook de almacenamiento y bitacora; conservar evidencia RED/GREEN y regresiones.
15. Solicitar revisiones de build obligatorias antes de habilitar ambos permisos a coordinadores.

## 7. Estrategia De Archivos Y PDF

- Reutilizar el patron de `actividad_archivo_service.py`: streaming, limites, firma binaria, rutas confinadas, temporal, `fsync` y `os.replace`, sin refactorizar consumidores ajenos.
- No reutilizar `AttachmentService.subir_adjunto` porque decodifica Base64 completo, usa nombres proporcionados y hace commit profundo.
- Mantener almacenamiento privado en volumen persistente; la base de datos guarda metadatos y rutas relativas, no binarios.
- Exigir raiz no publica, directorios `0700`, archivos `0600`, rechazo de symlinks y rutas fisicas resueltas bajo la raiz configurada.
- Decodificar completamente, rechazar multiframe/bombas, normalizar orientacion y dimensiones, y re-encodear sin EXIF/GPS antes del PDF.
- Propuesta inicial configurable: JPEG/PNG/HEIC/HEIF de una sola imagen, hasta 10 fotografias, 8 MB por original y lado maximo de 1920 px; todo se persiste normalizado como JPEG/PNG.
- La firma se dibuja exclusivamente en el recuadro con dedo, lapiz tactil o mouse; el canvas genera un PNG que se valida con limites propios, trazo minimo, confirmacion explicita del texto, actor y `TIMESTAMPTZ` del servidor.
- El PDF se genera una vez al finalizar, se guarda por reemplazo atomico y se verifica con SHA-256 antes de exponerlo.
- Verificar hashes con `hmac.compare_digest` antes de generar/descargar; una discrepancia se audita y no entrega contenido.
- Fotos usan `Cross-Origin-Resource-Policy: same-origin`; PDF usa `application/pdf`, `Content-Disposition: attachment` con nombre seguro y las cabeceras privadas definidas en la especificacion.

Saga de finalizacion:

1. Resolver la bitacora propia sin procesar el multipart completo; si esta `FINALIZADA`, devolver su PDF existente.
2. Para `BORRADOR`, validar firma temporal y revalidar la OT mediante el worker exacto.
3. Bloquear el padre con `SELECT FOR UPDATE` y revalidar propietario, estado, `version_esperada`, actividades, fotos y sus hashes; si otro request finalizo, devolver el existente.
4. Generar firma normalizada y PDF temporal con nombres unicos en el mismo volumen.
5. Ejecutar `fsync`, calcular hashes y promover con `os.replace` sin sobrescribir rutas compartidas.
6. Actualizar metadatos, evento de auditoria y notificacion persistente en una unica transaccion DB.
7. Hacer un unico commit y solo despues emitir el WebSocket best-effort.
8. Ante fallo previo al commit, revertir DB y eliminar exclusivamente archivos creados por esa invocacion.
9. Reconciliar temporales y huerfanos tras caidas; una repeticion devuelve el PDF existente sin duplicar eventos.

La reconciliacion se expone como comando de mantenimiento con dry-run por defecto y aplicacion explicita. Usa advisory lock, procesa solo temporales/finales de mas de 24 horas, compara rutas contra DB, reporta metricas y nunca elimina un archivo reciente. El runbook define periodicidad, backup previo y pruebas de caida antes/despues del commit.

## 8. RBAC, Propiedad Y Auditoria

Registrar en `SYSTEM_MODULES_REGISTRY`:

- `bitacoras_operacionales.leer`: consulta y descarga de bitacoras propias.
- `bitacoras_operacionales.gestionar`: creacion, edicion, fotografias, firma y finalizacion propias.

La asignacion al rol o usuarios coordinadores se realiza mediante la administracion RBAC existente; no se codifica un rol `coordinador`. Ambos IDs se registran con `es_critico=True` en RBAC y auditoria. `admin` recibe los permisos por auto-discovery, pero no omite el filtro de propiedad. Tarjeta/listado usan `leer`; nueva, edicion y finalizacion requieren all-of `leer + gestionar`. `ProtectedRoute` se amplia de forma compatible para aceptar una lista all-of, tratar permisos ausentes como vacios y ejecutar hooks antes de retornos.

Auditar sin payload sensible:

- `BITACORA_CREADA`.
- `BITACORA_ACTUALIZADA`.
- `FOTOGRAFIA_AGREGADA` y `FOTOGRAFIA_ELIMINADA`.
- `BITACORA_FINALIZADA` con hash PDF.
- `PDF_DESCARGADO`.
- Intentos denegados por propiedad, estado o permiso.

Para este prefijo, el middleware no persiste bodies. Solo registra IDs, nombres de campos modificados, conteos, estados, hashes y causa categorica. `ServicioAuditoria` recibe una variante `add/flush` sin commit para la saga; la ruta marca el evento manual para suprimir el evento generico duplicado. La descarga PDF se agrega a `auditoria_rutas.py`, los rechazos por propiedad se registran como `denegado` aunque respondan 404 y el correlation ID se valida como UUID.

Las APIs de notificaciones pasan a `/mias` y no aceptan `usuario_id` controlado por cliente; no existe POST publico para crear notificaciones arbitrarias. Un endpoint autenticado emite un ticket WebSocket aleatorio, de un solo uso y corta vigencia, ligado a usuario/sesion en Redis. El navegador conecta sin `usuario_id`; el servidor consume el ticket, valida sesion, expiracion, revocacion y `Origin`. Se prohibe transportar el JWT en query string. `NotificationsContext` solo navega referencias de tipos/rutas internas allowlisted.

## 9. Pruebas Planificadas

### Backend

- Caso feliz: OT abierta, borrador completo, fotos validas, firma, PDF, hash y notificacion.
- Bordes: texto largo permitido, varias paginas, 1 y 10 fotos, orientaciones horizontal/vertical y reordenamiento.
- Errores: OT cerrada/inexistente, ERP no disponible, datos incompletos, firma vacia, MIME falso, exceso de tamano/cantidad, traversal, archivo vacio y PDF fallido.
- Seguridad: 401, permisos leer/gestionar, IDOR entre coordinadores, descarga privada, mutaciones finalizadas y campos de servidor ignorados/rechazados.
- Concurrencia: doble finalizacion y PATCH/carga simultanea contra una finalizacion.
- Infraestructura: volumen escribible, limpieza de temporales y cierre de `SessionErp` en exito/error.
- Migracion: ejecucion repetida, constraints, indices, registro de modelos y fallo cerrado del verificador al retirar cada objeto critico.
- Fallos inyectados: decoder, ReportLab, `os.replace`, `fsync`, flush, commit y reconciliacion de huerfanos.
- Notificaciones: REST y WebSocket autenticados, propiedad, insercion transaccional y broadcast posterior no fatal.
- Auditoria: sin payload sensible, paridad de manifiestos y descarga/denegaciones registradas.

### Frontend

- Servicio usa metodos, rutas y `FormData` correctos.
- Ruta y tarjeta respetan permisos.
- Selector OT completa campos de solo lectura.
- Actividades y novedades aplican validaciones confirmadas.
- Camara y galeria son acciones separadas; `capture` es una sugerencia con fallback, y los object URLs se revocan.
- Captura/seleccion de imagenes presenta preview persistida, progreso, error, orden accesible y eliminacion.
- Firma usa Pointer Events para dedo, lapiz tactil y mouse, `devicePixelRatio`, limpiar/deshacer, instrucciones accesibles, `aria-live` y controles de 44 px; no permite cargar archivos.
- Una finalizada cambia a modo lectura y habilita descarga.
- Navegacion a 360 px conserva acciones, `safe-area`, zoom 200 % y campos utilizables sin scroll horizontal.
- Borrador usa estados `cargando|limpio|modificado|guardando|guardado|error`, autosalvado remoto y accion explicita de guardar; servidor es fuente de verdad y no se usa `localStorage` como offline.
- `BitacoraDraftSyncProvider` permanece montado al cambiar de ruta, admite una sola escritura en vuelo por bitacora y coalesce cambios posteriores conservando solo la ultima version. Cada PATCH lleva `version_esperada`; un 409 obliga a recargar/reconciliar y nunca sobrescribe silenciosamente una version nueva.
- Editar y navegar inmediatamente no pierde datos: la cola continua tras desmontar el editor, conserva el ultimo snapshot en memoria, muestra error global/reintento y lo aplica al reabrir hasta recibir ACK. Finalizar ejecuta `flush`, espera la cola vacia y queda bloqueado ante error.
- Listado usa una consulta compartida, pero renderiza exclusivamente tarjetas en movil y `DataTable` en escritorio segun breakpoint; no mantiene dos arboles visibles ni duplica solicitudes.
- Busqueda remota con debounce, `AbortController`, descarte de respuestas obsoletas y resultados previos preservados durante refetch.
- `DataTable` recibe un slot generico `renderColumnFilter` en su contrato de columna. El cableado se extrae a `DataTableFilterControl` para no crecer el archivo y preservar filtros locales existentes. Bitacoras inyecta `RemoteFilterDropdown` con valores deduplicados/busqueda/cancelacion/carga incremental y `DateRangeFilterPopover` para fechas.
- Carga inicial usa `Skeleton`; refresco y opciones usan `Spinner` no destructivo; se diferencian vacio inicial, vacio por filtros y error recuperable con reintento.
- Con maximo 100 filas no se usa virtualizacion en MVP. Superar ese limite obliga a planificar virtualizacion ligera antes de ampliar el contrato.
- `FilePicker` migra sus colores `slate-*` a variables `--color-*` dentro del mismo cambio y conserva pruebas de regresion.

Particion prevista para mantener paginas coordinadoras y archivos menores de 550 lineas: `BitacorasOperacionales/index.tsx`, `BitacoraEditorPage.tsx`, `components/{BitacorasListDesktop,BitacorasListMobile,OrdenTrabajoSelector,DatosObraCard,ActividadesEditor,NovedadesEditor,FotografiasEditor,VistaPreviaBitacora,FinalizarBitacoraModal}.tsx`, `hooks/{useBitacorasListado,useBitacoraBorrador,useAutoguardadoBitacora}.ts` y `utils/validacionBitacora.ts`. El build registra el conteo de lineas; la extension de `DataTable` debe mantenerlo por debajo de 550 mediante la extraccion indicada.

## 10. Trazabilidad De Criterios A Suites

| CA | Suite y caso principal |
|---|---|
| CA 1 | `test_bitacoras_operacionales_seguridad.py` y `BitacorasOperacionalesPermisos.test.tsx`: RBAC fail-closed. |
| CA 2 | `test_bitacoras_operacionales_erp.py`: filtro de abierta y alcance aprobado. |
| CA 3 | `test_bitacoras_operacionales_api.py` y `BitacoraEditor.test.tsx`: snapshots/autocompletado. |
| CA 4 | `test_bitacoras_operacionales_api.py` y `BitacoraBorrador.test.tsx`: guardar/reabrir. |
| CA 5 | `test_bitacoras_operacionales_dominio.py` y `BitacoraEditor.test.tsx`: obligatorios. |
| CA 6 | `test_bitacoras_operacionales_pdf.py`: orden de actividades. |
| CA 7 | `test_bitacoras_operacionales_dominio.py`: XOR de novedades. |
| CA 8 | `test_bitacoras_operacionales_archivos.py` y `BitacoraFotografias.test.tsx`: CRUD/reapertura privada. |
| CA 9 | `test_bitacoras_operacionales_archivos.py`: validacion y limpieza. |
| CA 10 | `test_bitacoras_operacionales_seguridad.py`: IDOR uniforme. |
| CA 11 | `test_bitacoras_operacionales_erp.py`, `test_bitacoras_operacionales_concurrencia.py` y `BitacoraFirma.test.tsx`. |
| CA 12 | `test_bitacoras_operacionales_pdf.py`: contenido y exclusiones. |
| CA 13 | `test_bitacoras_operacionales_concurrencia.py`: rollback de finalizacion. |
| CA 14 | `test_bitacoras_operacionales_dominio.py` y triggers de migracion: inmutabilidad. |
| CA 15 | `test_bitacoras_operacionales_erp.py` y `test_bitacoras_operacionales_pdf.py`: snapshots historicos. |
| CA 16 | `test_bitacoras_operacionales_pdf.py`: hash y corrupcion. |
| CA 17 | `test_bitacoras_operacionales_notificaciones.py`: fila, enlace y WebSocket post-commit. |
| CA 18 | `BitacoraEditorResponsive.test.tsx` y acta manual Android/iOS. |
| CA 19 | `test_bitacoras_operacionales_pdf.py`: multipagina, encabezado y escape. |
| CA 20 | `test_bitacoras_operacionales_seguridad.py`: cabeceras y ausencia de estaticos. |
| CA 21 | `test_bitacoras_operacionales_auditoria.py`: redaccion y eventos. |
| CA 22 | `test_bitacoras_operacionales_dominio.py` y prueba frontend de fecha Bogota. |

Pruebas adicionales del listado: `BitacorasOperacionalesListado.test.tsx` cubre render exclusivo movil/escritorio, debounce/cancelacion, filtros multivalor, opciones remotas incrementales, paginacion 25/50/100, reinicio de offset, desempate estable y estados skeleton/refetch/vacio/error.

## 11. Comandos De Validacion

- `docker compose run --rm migrate`
- `docker compose run --rm -T -v "${PWD}:/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2 backend sh -lc "pytest testing/backend/test_bitacoras_operacionales_*.py -q"`
- `docker compose run --rm -T -v "${PWD}:/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2 backend pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -q`
- `npm --prefix frontend run test -- --run`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `py -3.12 scripts/sync_docs.py`
- Verificacion manual en Chrome Android y Safari iOS: camara, rotacion, firma tactil y descarga PDF.
- Verificacion manual iOS con fotos HEIC/HEIF y modo compatible.

## 12. Impacto En Documentacion

- [x] `docs/specs/2026-07-21_bitacoras-operacionales-web.md`
- [ ] `docs/ESQUEMA_BASE_DATOS.md` al implementar tablas.
- [ ] ADR de inmutabilidad/almacenamiento si el patron se adopta transversalmente.
- [ ] `testing/CATALOGO_PRUEBAS.md` al crear suites.
- [ ] `docs/bitacora/<YYYY-MM-DD>-bitacoras-operacionales.md` durante ejecucion y cierre.
- [ ] Guia operativa del coordinador antes del despliegue.
- [ ] Runbook de capacidad, backup/restauracion, retencion y reconciliacion de almacenamiento.
- [ ] `docs/OPERACION_MIGRACIONES_DB.md` si se amplian objetos criticos verificados.

La bitacora y el reporte de build conservan comandos, salida RED, salida GREEN, conteos, regresiones y justificacion de cualquier skip o validacion no ejecutada.

## 13. Evaluacion De Riesgos

| Riesgo | Probabilidad | Mitigacion |
|---|---|---|
| Contrato desconocido de `Aperturas OT V4` | Alta | Bloquear integracion hasta documentar fuente, campos y estados reales. |
| IDOR sobre fotos, firma o PDF | Media | RBAC y filtro por propietario antes de resolver rutas; 404 uniforme. |
| Alteracion posterior a firma | Media | Estado final inmutable, lock de fila, PDF almacenado y hash SHA-256. |
| Fotos pesadas o incompatibles desde celular | Alta | Limites, normalizacion, orientacion EXIF, preview y mensajes claros. |
| Falla entre archivos y transaccion DB | Media | Temporales, reemplazo atomico, limpieza compensatoria y pruebas de fallo. |
| Generacion PDF inconsistente | Media | Backend unico, recursos versionados, golden checks de texto/paginas y QA visual. |
| Firma confundida con firma certificada | Media | Etiqueta de constancia operativa y exclusion contractual explicita. |
| Falta de conectividad en obra | Media | Informar que MVP requiere conexion; offline se evalua en fase posterior. |
| Almacenamiento creciente | Alta | Cuotas configurables, compresion, metricas de uso, backup y retencion por definir. |
| Servicio de notificaciones hace commit profundo | Media | Añadir variante transaccional o emitir despues del commit sin comprometer finalizacion. |
| Notificaciones y WebSocket actuales sin propiedad | Alta | Endurecimiento autenticado obligatorio antes de integrar CA 17. |
| `ProtectedRoute` falla abierto sin `permissions` | Alta | Corregir fail-closed y cubrir acceso directo antes de registrar la ruta. |
| Auditoria captura cuerpos operacionales | Alta | Excluir body del prefijo y registrar DTO allowlisted sin textos ni binarios. |
| Migracion fuera del job canonico | Baja | Ejecutar solo `app.manage migrate` y ampliar `schema_verifier` conforme ADR-010. |

## 14. Matriz De Subagentes

| Subagente | Motivo | Resultado | Bloquea |
|---|---|---|---|
| `scope-reviewer` | Alcance full-stack y exclusiones | `approved_with_risks`; gates de negocio abiertos | No tecnico |
| `backend-reviewer` | PostgreSQL, ERP, archivos y PDF | `approved_with_risks`; sin defectos tecnicos bloqueantes | No tecnico |
| `frontend-reviewer` | Web responsive, diseño y firma tactil | `approved`; gates de negocio abiertos | No tecnico |
| `security-rbac-reviewer` | RBAC, IDOR, archivos, firma y privacidad | `approved` tecnico; gates de negocio abiertos | No tecnico |
| `docs-tests-reviewer` | Spec, criterios y evidencia TDD | `approved_with_risks`; gates de negocio abiertos | No tecnico |
| `frontend-table-specialist` | Listado remoto de alto volumen en escritorio | `approved` | No |
| `mobile-reviewer` | No se tocan modulos nativos | No aplica en esta fase | No |

## 15. Decision Final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

La Fase tecnica 0 esta completada y la persistencia PostgreSQL del paso 4 puede continuar con las decisiones confirmadas. La integracion ERP del paso 5 y cualquier creacion/finalizacion que dependa de validar una OT permanecen bloqueadas hasta documentar el contrato real de `Aperturas OT V4`. La autorizacion del usuario del 2026-07-21 permite continuar por fases sin inventar dicho contrato.
