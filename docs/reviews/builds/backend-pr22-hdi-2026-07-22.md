# Backend build review — PR #22 HDI

**Fecha:** 2026-07-22
**Resultado:** `blocked`

## Alcance efectivo revisado

Diff de `main` contra el árbol de trabajo actual, incluyendo los archivos no rastreados `backend_v2/app/services/novedades_nomina/validacion_excel_hdi.py` y `testing/backend/test_hdi_excel_security.py`. Se revisaron en particular el router HDI, el extractor XLS/XLSX, el flujo compartido de nómina, hash/almacenamiento, rollback y pruebas backend.

## Hallazgos

### Alta — La extracción no exige exactamente un titular por certificado

`backend_v2/app/services/novedades_nomina/hdi_extractor.py:272-301`

Un grupo sin `P` se acepta tomando la primera persona dependiente como titular; un grupo con varios `P` toma el primero y cobra los demás como dependientes al 100 %. Ambos casos convierten una entrada estructuralmente ambigua en descuentos válidos y pueden asignar valores a la cédula equivocada. El contrato estricto debe rechazar/omitir el grupo completo salvo que exista exactamente un titular, con una decisión explícita y probada.

### Alta — El almacenamiento content-addressed y su rollback no son seguros ante fallos o concurrencia

`backend_v2/app/services/novedades_nomina/nomina_service.py:131-140,235-241`

`ruta_creada` solo pasa a `True` después de terminar `write/flush/fsync`; un error intermedio deja un archivo parcial que no se limpia y una operación posterior lo reutiliza porque solo comprueba `exists`. Además, dos operaciones con el mismo SHA-256 pueden producir `FileExistsError`, y una operación que creó el archivo y luego hace rollback puede borrarlo mientras otra operación concurrente ya lo reutilizó y confirmó una referencia DB. Se requiere publicación atómica mediante temporal + rename, tratamiento idempotente del archivo ya existente y ownership/refcount o una política de limpieza que nunca invalide referencias confirmadas.

### Media — Validación XLS/XLSX síncrona dentro del handler async

`backend_v2/app/api/novedades_nomina/routers/otros_hdi.py:39-47`; `backend_v2/app/services/novedades_nomina/validacion_excel_hdi.py:60-124,127-143`

El handler ejecuta directamente CRC/descompresión de hasta 50 MiB y parseo con openpyxl/xlrd. Aunque la extracción posterior sí usa `asyncio.to_thread`, esta validación bloquea el event loop y permite que cargas costosas degraden otras solicitudes. Debe ejecutarse fuera del event loop, conservando rate limit y propagación controlada de `ArchivoHdiInvalido`.

### Media — Cálculos monetarios con `float` y redondeos parciales

`backend_v2/app/services/novedades_nomina/hdi_extractor.py:28-74,286-301,320-349`

Las primas COP se convierten a `float`; titular 24/76, dependientes y consolidaciones se redondean en etapas distintas. Esto expone resultados de nómina a representación binaria y diferencias de centavo según agrupación. Debe definirse y probarse una política única con `Decimal` y cuantización explícita, incluyendo el invariante `valor == valor_rdc + valor_colaborador` y consolidaciones de múltiples certificados.

### Media — La suite no demuestra los controles de seguridad y límites reclamados

`testing/backend/test_hdi_excel_security.py:55-72,120-130,133-184`; `testing/backend/test_hdi_extractor_grupos.py:54-88,119-158,191-212`

Los tests rechazan dimensiones por encima del máximo, pero no aceptan exactamente 10 MiB/5000 filas/50 columnas/10 hojas. No hay pruebas de límite de entradas, tamaño por miembro, total descomprimido, ratio de compresión, CRC corrupto, rutas internas, cifrado, MIME ni ZIP bomb. Tampoco cubren rollback después de crear el archivo, escritura parcial, reutilización/concurrencia por hash, SHA-256 persistido, ni grupos con cero/múltiples titulares. Las aserciones COP incluyen una comprobación débil `> 100000`.

## Evidencia considerada

- Reportada por el orquestador: backend focalizado `21 passed`; health `4 passed / 4 skipped`; `py_compile` correcto.
- `testing/CATALOGO_PRUEBAS.md` registra la suite HDI.
- La recolección local no pudo repetirse porque el Python host no tiene `pytest`; no se ejecutaron suites fuera de Docker.
- Sin cambios de modelo/esquema PostgreSQL. No se requiere actualización de `docs/ESQUEMA_BASE_DATOS.md`.
- El router reutiliza `requiere_permiso_nomina_novedades`; no introduce un módulo RBAC nuevo.
- Archivos revisados permanecen bajo el límite de 550 líneas.

## Pruebas requeridas antes de aprobar

1. Cero, uno y múltiples titulares por CERT, con rechazo inequívoco de grupos ambiguos.
2. Aceptación exacta y rechazo en `máximo + 1` para bytes, hojas, filas y columnas.
3. ZIP/XLSX adversarial: entradas, miembro, total, ratio, CRC, traversal/backslash, cifrado y ZIP genérico.
4. Validación concurrente que evidencie que el event loop sigue respondiendo.
5. Éxito de persistencia con SHA-256 completo, nombre saneado, tamaño y ruta correctos.
6. Fallo durante escritura, después de escritura y durante commit; ausencia de archivos parciales y preservación de archivos compartidos.
7. Dos solicitudes concurrentes con contenido idéntico y con el mismo periodo/subcategoría.
8. COP con `Decimal`, decimales límite, múltiples dependientes/certificados e invariantes de centavos.

## Veredicto

`blocked`: la evidencia verde no cubre dos riesgos de corrección/integridad altos: cardinalidad del titular y lifecycle concurrente/rollback del archivo.
