# Especificacion: Bitacoras operacionales web

**Fecha:** 2026-07-21
**Estado:** Borrador para aprobacion funcional
**Proceso:** Bitacoras operacionales
**Area solicitante:** OGP
**Area impactada:** Operaciones
**Lider del requerimiento:** Mendoza Ipia Jean Carlos
**Plan tecnico:** `docs/reviews/plans/2026-07-21_bitacoras-operacionales-web.md`

## 1. Objetivo

Permitir que el coordinador de obra cree, complete y firme desde el navegador de un dispositivo movil una bitacora de obra basada en el formato `FT-OPE-49`, sin editar manualmente el archivo Word ubicado en la ruta compartida.

El sistema debe consultar ordenes de trabajo abiertas, completar la informacion de la obra, recibir actividades, novedades y fotografias, y generar un PDF disponible para consulta y descarga.

## 2. Alcance Confirmado

- Version web responsive dentro del Portal de Servicios existente.
- Uso desde navegadores de escritorio, tablet y celular.
- Entre 5 y 20 usuarios estimados, con volumen documental alto.
- El coordinador de obra crea, diligencia y firma su propia bitacora.
- La orden de trabajo debe estar abierta.
- Los datos de la obra se consultan en la fuente denominada por negocio `Aperturas OT V4`.
- El PDF conserva la identificacion institucional del formato `FT-OPE-49`.
- El usuario recibe una notificacion cuando el PDF queda disponible.
- Cada coordinador puede seleccionar cualquiera de las ordenes abiertas devueltas por la fuente aprobada.
- Cada coordinador solo consulta sus propias bitacoras; no existe bandeja global OGP en el MVP.

## 3. Datos De La Bitacora

Los unicos datos funcionales de esta fase son:

| Dato | Origen | Regla inicial |
|---|---|---|
| Fecha de elaboracion | Sistema/usuario | Inicia con la fecha actual de `America/Bogota`; editable en borrador y no futura. |
| Nombre de la obra | `Aperturas OT V4` | Solo lectura y almacenado como snapshot. |
| Orden de trabajo | `Aperturas OT V4` | Seleccion obligatoria entre ordenes abiertas. |
| Ciudad | `Aperturas OT V4` | Solo lectura y almacenada como snapshot. |
| Ingeniero responsable del proyecto | `Aperturas OT V4` | Solo lectura y almacenado como snapshot. |
| Actividades del dia | Coordinador | Lista ordenada; minimo una actividad no vacia. |
| Novedades del dia | Coordinador | Texto obligatorio o seleccion explicita de `Sin novedad`. |
| Registro fotografico | Coordinador | Una o mas imagenes tomadas o seleccionadas desde el dispositivo. |
| Firma del coordinador de obra | Coordinador | Obligatoria para finalizar; se dibuja en pantalla con dedo, lapiz tactil o mouse y representa constancia operativa, no firma electronica certificada. |

El nombre de la obra, ciudad e ingeniero se conservan como snapshots para que una actualizacion posterior del ERP no cambie una bitacora historica.

## 4. Exclusiones Expresas

- Personal administrativo.
- Personal operativo.
- Acta de asistencia.
- Cedulas, cargos, horas de entrada o salida y firmas de asistentes.
- Descripciones obligatorias por fotografia.
- Flujo de aprobacion, rechazo o devolucion.
- Aplicacion React Native o cambios en `movil/` y `modulo_actividades_fork/`.
- Funcionamiento offline.
- Geolocalizacion.
- Reconocimiento OCR de documentos.
- Firma digital o electronica certificada.
- Carga de una imagen o archivo como firma.
- Escritura o actualizacion de datos en el ERP.

Los PDFs suministrados son referencias visuales. Las secciones de personal y asistencia presentes en uno de ellos no forman parte del requerimiento.

## 5. Flujo Funcional

1. El coordinador abre el modulo Bitacoras operacionales.
2. Busca y selecciona una orden de trabajo abierta.
3. El sistema completa nombre de la obra, ciudad e ingeniero responsable.
4. El sistema crea una bitacora en estado interno `BORRADOR`.
5. El coordinador registra actividades, novedades y fotografias.
6. El coordinador guarda y puede continuar editando el borrador.
7. El coordinador revisa una vista previa, dibuja su firma en el recuadro y confirma la finalizacion.
8. El backend valida nuevamente la orden, genera el PDF y cambia el estado a `FINALIZADA`.
9. La bitacora, sus fotografias, su firma y su PDF quedan bloqueados contra modificaciones.
10. El sistema notifica al coordinador y habilita la descarga del PDF.

Los estados son internos. No representan un workflow de aprobacion:

| Estado | Comportamiento |
|---|---|
| `BORRADOR` | Permite editar datos, actividades, novedades y fotografias. |
| `FINALIZADA` | Documento inmutable, firmado y con PDF generado. |

La anulacion y correccion de documentos finalizados no se incluyen hasta que negocio defina el procedimiento documental aplicable.

## 6. Reglas De Negocio

- Solo una orden abierta puede originar una bitacora nueva.
- Antes de finalizar se vuelve a validar que la orden siga abierta.
- La busqueda y resolucion exacta de una OT se limitan en servidor a ordenes abiertas; el MVP no filtra por coordinador.
- El creador solo consulta y modifica sus bitacoras, salvo un permiso administrativo futuro expresamente aprobado.
- Solo el creador puede firmar y finalizar su borrador.
- La lista de actividades conserva el orden definido por el coordinador.
- Las fotografias conservan un orden de presentacion modificable durante el borrador.
- Finalizar exige todos los campos obligatorios, al menos una actividad, al menos una fotografia y una firma valida.
- Un fallo al generar o almacenar el PDF deja la bitacora en `BORRADOR`.
- Un documento finalizado se descarga siempre desde el artefacto almacenado; no se regenera con datos actuales del ERP.
- El PDF incluye codigo, fecha y version oficiales del formato como snapshots documentales.
- La ruta de red del Word es una referencia de origen y no una dependencia de ejecucion del navegador.
- Se permiten varias bitacoras para una misma OT y fecha; cada una se identifica por UUID y hora de creacion, sin consecutivo adicional ni indice unico OT/fecha.

## 7. PDF Esperado

El PDF se genera en backend y contiene exclusivamente:

1. Encabezado institucional con logo, titulo, codigo `FT-OPE-49`, fecha del formato y version.
2. Fecha de elaboracion, obra, orden de trabajo, ciudad e ingeniero responsable.
3. Actividades del dia.
4. Novedades del dia.
5. Registro fotografico distribuido en paginas sin deformar las imagenes.
6. Firma del coordinador, nombre del firmante y fecha/hora de finalizacion.

No debe contener personal administrativo, personal operativo ni acta de asistencia. El encabezado y la numeracion de pagina deben repetirse cuando el contenido ocupe varias paginas.

## 8. Seguridad Y Trazabilidad

- Autenticacion obligatoria y permisos RBAC dedicados.
- Autorizacion por propietario aplicada antes de consultar, modificar, descargar o eliminar archivos.
- Fotografias, firma y PDF en almacenamiento privado; nunca se exponen como rutas estaticas publicas.
- Validacion real de MIME, extension, firma binaria, tamano, dimensiones, pixeles y cantidad de frames.
- Normalizacion de orientacion y re-encode sin EXIF, GPS, comentarios ni otros metadatos del original.
- Nombres fisicos aleatorios y rutas confinadas para evitar traversal o colisiones.
- Cabeceras de descarga `Cache-Control: no-store, private` y `X-Content-Type-Options: nosniff`.
- Registro de creacion, cambios, carga/eliminacion de fotografias, finalizacion y descarga sin guardar imagenes, firma ni textos completos en logs.
- Hash SHA-256 del PDF final para verificar integridad.
- La firma manuscrita capturada se presenta como constancia operativa y debe identificarse asi en la interfaz.
- La firma se captura exclusivamente mediante los trazos dibujados en el recuadro con dedo, lapiz tactil o mouse.
- La constancia registra actor, hora del servidor y version del texto aceptado; no se presenta como prueba criptografica de identidad.
- Los endpoints de notificaciones deben estar autenticados y limitados al usuario actual antes de reutilizarlos.

## 9. Criterios De Aceptacion

1. Un usuario sin permiso no puede ver ni invocar el modulo.
2. El buscador solo presenta ordenes abiertas provenientes de la fuente aprobada.
3. Seleccionar una orden completa obra, ciudad e ingeniero sin digitacion manual.
4. El coordinador puede guardar y reabrir un borrador desde escritorio o navegador movil.
5. El formulario impide finalizar sin los datos obligatorios.
6. Las actividades se guardan y aparecen en el PDF en el mismo orden.
7. `Sin novedad` queda registrado de manera explicita cuando corresponde.
8. El coordinador puede tomar o seleccionar fotografias, previsualizarlas al reabrir, ordenarlas y eliminarlas antes de finalizar.
9. Archivos falsos, vacios, peligrosos o fuera de limite son rechazados sin dejar residuos.
10. Solo el creador puede modificar, firmar o descargar su bitacora.
11. La finalizacion exige una firma dibujada en el recuadro y vuelve a comprobar que la orden permanezca abierta.
12. El PDF contiene todos los campos definidos, fotografias y firma, sin secciones de personal o asistencia.
13. Si falla la generacion del PDF, la bitacora permanece editable como borrador.
14. Una bitacora finalizada no admite cambios en datos, actividades, fotografias ni firma.
15. Cambios posteriores en el ERP no alteran el PDF ni los snapshots de una bitacora finalizada.
16. El PDF descargado coincide con el hash almacenado.
17. Al finalizar se crea una notificacion interna con enlace a la bitacora disponible.
18. La interfaz es utilizable a 360 px de ancho y permite captura mediante la camara del navegador compatible.
19. El PDF multipagina repite encabezado y numeracion sin interpretar actividades o novedades como markup.
20. Listado, detalle, fotografias y PDF se sirven sin cache y sin rutas estaticas publicas.
21. La auditoria conserva IDs, conteos, estados y hashes, pero no actividades, novedades, firma, imagenes ni nombres originales.
22. La fecha inicial y la validacion de fecha futura usan `America/Bogota`, incluso alrededor de medianoche UTC.

## 10. Decisiones De Ejecucion

| Decision | Propuesta del plan | Bloquea |
|---|---|---|
| Contrato de `Aperturas OT V4` | Pendiente documentar fuente, columnas, valores de estado y conectividad. | Integracion ERP |
| Mapeo de responsable | Confirmado: `Director de obra` corresponde a `Ingeniero responsable del proyecto`. | No |
| Matriz de consulta | Confirmado: cada coordinador solo ve sus registros; no se crea bandeja global OGP. | No |
| Alcance de OT por coordinador | Confirmado: todos los coordinadores pueden consultar todas las OT abiertas. | No |
| Cardinalidad OT/fecha | Confirmado: se admiten varias; identidad por UUID y hora de creacion, sin indice unico OT/fecha. | No |
| Formato institucional | Confirmados codigo `FT-OPE-49`, fecha `ABRIL 06 2022`, version `01` y logotipo del Word de referencia. | No |
| Canal de notificacion | Notificacion interna existente; correo queda fuera. | No |
| Limites de imagen | Propuesta: maximo 10 fotografias, 8 MB por original y normalizacion a 1920 px. | No |
| Validez tecnica de firma | Aprobar dimensiones, tamano y umbral minimo de trazo/pixeles antes de escribir pruebas de firma. | No |
| Correccion posterior | Sin anulacion en MVP; definir procedimiento antes de habilitar cambios documentales. | No |
| Retencion y respaldo | Definir retencion, cuota, backup coordinado DB/volumen, restauracion y tratamiento de huerfanos antes de produccion. | Produccion |

## 11. Fuente Documental

- Formato de referencia: `FT-OPE-49 Bitacora de Obra v1.docx`.
- Ruta informada: `\\192.168.0.3\Procesos Comunes SGI\Operaciones\Formatos\FT-OPE-49 Bitacora de Obra v1.docx`.
- Codigo mostrado: `FT-OPE-49`.
- Fecha mostrada: `ABRIL 06 2022`.
- Version mostrada: `01`.

El 2026-07-21 se confirmo que codigo, fecha, version y logotipo siguen vigentes.
