# Backend review — PR #22 HDI reparado

**Fecha:** 2026-07-22
**Resultado:** `approved_with_risks`

## Hallazgos restantes

### Media — Los rechazos fatales del extractor se exponen como error 500

`backend_v2/app/services/novedades_nomina/hdi_extractor.py:186-195,281-289` lanza `ValueError` correctamente ante un TIPO inválido o una cardinalidad de titular distinta de uno. Sin embargo, `NominaService.procesar_flujo` no transforma esos errores de entrada en una respuesta HTTP 4xx. Un XLS/XLSX estructuralmente válido con esos defectos termina como error interno no controlado, aunque se aborta antes de escribir o borrar datos. Falta una prueba del endpoint que compruebe rechazo 4xx y preservación del periodo para ambos casos.

### Media — La limpieza del archivo propio no cubre cancelación de la coroutine

`backend_v2/app/services/novedades_nomina/nomina_service.py:150-168,249-257` publica una ruta final única mediante temporal + `os.replace` y elimina su propio archivo ante excepciones ordinarias previas al commit. No obstante, el bloque externo captura `Exception`, mientras `asyncio.CancelledError` hereda de `BaseException`. Si la petición se cancela durante/después de `to_thread(_guardar_archivo)`, el hilo puede publicar el archivo sin que `ruta_creada` llegue a marcarse y sin ejecutar rollback/limpieza compensatoria, dejando un huérfano. Tampoco hay pruebas focales de escritura parcial, fallo de commit, rutas distintas para contenido idéntico ni cancelación.

### Media — Los cálculos monetarios siguen usando `float`

`backend_v2/app/services/novedades_nomina/hdi_extractor.py:201-203,292-301,320-345` conserva aritmética binaria y redondeos por etapas para valores COP. Sigue pendiente una política con `Decimal` y cuantización explícita que garantice el invariante `valor == valor_rdc + valor_colaborador` al consolidar múltiples certificados.

## Evidencia

- Evidencia suministrada: backend HDI `23 passed`.
- La recolección local no pudo repetirse porque el Python host no dispone de `pytest`.
- Verificación estática: cada hoja se carga una sola vez en el extractor; la validación y la extracción se ejecutan con `asyncio.to_thread`; cada CERT agrupado exige exactamente un titular; las rutas físicas incorporan UUID por transacción y se publican con temporal + `os.replace`.

## Veredicto

`approved_with_risks`: los dos bloqueos de integridad anteriores —titular ambiguo y ruta compartida susceptible de borrado cruzado— quedaron corregidos. Permanecen riesgos medios de contrato HTTP, cancelación/huérfanos y precisión monetaria, además de sus pruebas focales.
