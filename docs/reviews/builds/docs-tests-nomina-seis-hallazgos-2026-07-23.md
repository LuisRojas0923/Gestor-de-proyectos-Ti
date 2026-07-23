# Docs/tests review — nómina, seis hallazgos

> [!NOTE]
> Instantánea histórica superada por `docs-tests-nomina-seis-hallazgos-final-2026-07-23.md` (202 backend, 18 frontend, `approved_with_risks`).

**Fecha:** 2026-07-23
**Resultado:** `blocked`
**Alcance:** cobertura PostgreSQL de flujos directos, SALDO_FAVOR, logs, reproceso, carga/migración, ERP no bloqueante, catálogo, esquema y evidencia del working tree.

## Evidencia revisada

- `backend-nomina-seis-hallazgos-2026-07-23.md` declara **184 backend**, **17 frontend** y **4 passed / 4 skipped health** como evidencia suministrada, pero no registra comandos ni salida.
- El reporte canónico `2026-07-22_pr22-hdi-final.md` conserva **143 backend** y **16 frontend** sobre `a483a075`; su comando backend no incluye `test_nomina_directos_restantes_concurrencia.py` ni `test_nomina_generico_seguro.py`.
- La recolección independiente falló: `python -m pytest --collect-only ... -q` devolvió `No module named pytest`.
- No hay log versionado de la corrida de 184/17. `testing/backend/last_run.log` corresponde a la suite histórica de regresiones, no a este alcance.
- Se informó que `sync_docs.py` se intentó y falló por ausencia de `psycopg2`; ese intento y su salida todavía no están registrados en los reportes del working tree.

Por lo anterior, los conteos 184/17 se consideran evidencia declarada, no reproducida ni trazada al estado actual.

## Matriz de los seis hallazgos

| Hallazgo | Cobertura observada | Veredicto |
|---|---|---|
| PostgreSQL por cada flujo directo | `test_nomina_directos_restantes_concurrencia.py` parametriza ocho subcategorías y usa PostgreSQL, pero llama directamente a `preparar_reemplazo_directo` y `aplicar_saldo_favor`; no ejecuta ninguno de los endpoints/routers. La única comprobación de adopción por router es búsqueda de texto. Los tres flujos CELULARES/RETENCIONES/EMBARGOS sí pasan por `NominaService.procesar_flujo`. | **Incompleto/bloqueante**: no demuestra el contrato integral de cada flujo directo. |
| Repetición, reproceso y concurrencia de SALDO_FAVOR | La prueba nueva cubre dos filas repetidas, dos sesiones concurrentes, historial único y saldo agotado para ocho etiquetas de subcategoría. La suite previa cubre el servicio compartido para tres flujos. | **Parcial**: valida la primitiva, pero no el reproceso real de los ocho endpoints ni su metadata/archivo. La restricción nueva puede fallar antes de completar el reproceso directo. |
| Logs | Backend usa aserciones estáticas limitadas a tres servicios. Frontend comprueba solo que no aparezcan los primeros 20 caracteres del JWT para una URL sin query/fragment. | **Parcial**: faltan pruebas runtime/caplog de ramas de error y redacción completa; en `useApi` faltan estado `loading` terminal, logout cuando refresh rechaza y saneamiento de query/fragment. |
| Reproceso genérico | Se cubren archivo ausente, extracción vacía, límite de lectura, proceso cancelable y rate limit. | **Incompleto/bloqueante**: falta caso feliz PostgreSQL, reemplazo idempotente, rollback ante fallo después del borrado y dos reprocesos concurrentes. |
| Carga y migración | Se verifica la `UniqueConstraint`, orden de locks y dos startups PostgreSQL. Las pruebas de compensación física están aisladas con mocks. | **Incompleto/bloqueante**: no se prueba migrar datos duplicados preservando/reasignando referencias; tampoco la carrera de carga genérica con mismo hash e identidades distintas, la recuperación real de `IntegrityError`, ni compensación de los flujos directos. |
| ERP no bloqueante | `test_consulta_erp_bulk_no_bloquea_event_loop` cubre solo el wrapper bulk. | **Incompleto/bloqueante**: Grancoop aún tiene otra consulta ERP síncrona no cubierta; falta probar timeout y propiedad/ciclo de vida de la sesión para impedir que un worker continúe usando una sesión cerrada. |

## Catálogo y esquema

### `testing/CATALOGO_PRUEBAS.md`

La fila de seguridad/concurrencia enumera las suites nuevas, pero `✅ PASSED` no está respaldado por un comando/salida del working tree. Además, su descripción sobrestima la cobertura: “PostgreSQL real ... en libranzas, fúnebres, cooperativas y Control de Descuentos” describe pruebas por etiqueta sobre la primitiva común, no ejecuciones integrales de esos routers. “Carga genérica atómica” tampoco está demostrada bajo concurrencia o fallo transaccional real.

Debe registrar el comando exacto, conteo y entorno de la corrida vigente, o marcar el estado como evidencia pendiente. La descripción debe distinguir cobertura del servicio compartido de cobertura endpoint a endpoint.

### `docs/ESQUEMA_BASE_DATOS.md`

La sección manual no autogenerada refleja correctamente:

- `uq_nomina_archivo_identidad_periodo` sobre `(hash_archivo, subcategoria, mes_fact, año_fact)`;
- consolidación previa de referencias;
- advisory lock de la migración.

No se editó indebidamente la sección autogenerada. Sin embargo, debe quedar trazado que `sync_docs.py` fue intentado y falló por `psycopg2` ausente, junto con la justificación de la actualización manual. La documentación correcta no sustituye la prueba de migración con duplicados y referencias reales.

## Gaps requeridos

1. PostgreSQL por cada endpoint directo: reprocesar dos veces el mismo binario/período y comprobar éxito, una metadata y reemplazo de registros; añadir carrera concurrente con la restricción real.
2. Ejecutar en cada flujo directo la ruta real de SALDO_FAVOR multifila, repetición y reproceso, no solo la primitiva común.
3. Reproceso genérico PostgreSQL: éxito, rollback post-borrado y concurrencia.
4. Migración PostgreSQL con duplicados preexistentes en `nomina_archivos`, referencias crudas/normalizadas, consolidación, unicidad e idempotencia.
5. Carga genérica concurrente del mismo hash con identidades distintas y fallo intercalado; compensación física en familias de flujos directos.
6. ERP: no bloqueo de la consulta completa de Grancoop y timeout con sesión propiedad del worker durante toda su ejecución.
7. Logs: pruebas runtime sin documento/PII/JWT/traceback; en frontend cubrir token completo, query/fragment, estado final y logout tanto para refresh `false` como para excepción.

## Documentación requerida

1. Reconciliar el reporte canónico: los 143/16 sobre `a483a075` no evidencian las suites ni el working tree actuales.
2. Registrar comando exacto y salida resumida de 184/17, o retirar temporalmente `PASSED` del catálogo.
3. Registrar el intento de `sync_docs.py`, el fallo por `psycopg2` ausente y que solo se actualizó manualmente la sección no autogenerada.
4. Corregir la descripción del catálogo para no presentar pruebas de primitivas como cobertura integral de endpoints.

No se requiere ADR: no cambian skills/agentes ni se introduce una decisión arquitectónica documentable distinta del endurecimiento existente. Este reporte conserva el contexto durable; no es necesaria una bitácora adicional.

```text
Docs/tests review: blocked
Findings: la cobertura PostgreSQL/SALDO_FAVOR nueva prueba una primitiva parametrizada, no cada endpoint directo; reproceso, carga/migración, logs y ERP mantienen gaps de integración y concurrencia. El esquema manual es coherente, pero la evidencia 184/17 no está trazada a comandos/salida y contradice el reporte canónico 143/16.
Required tests: endpoints directos con mismo binario secuencial/concurrente; SALDO_FAVOR real por flujo; reproceso genérico éxito/rollback/concurrencia; migración con duplicados y referencias; carreras/compensación de carga; Grancoop y timeout ERP; logs runtime y estados/logout de useApi.
Required docs: reconciliar reporte canónico y catálogo con evidencia ejecutada; registrar comando/salida vigente y el fallo de sync_docs.py por psycopg2 con la actualización manual limitada a la sección no autogenerada.
Blocking reasons: no se demuestra el reproceso integral de los flujos directos bajo la nueva unicidad; faltan gates reales de carga/migración y ERP; el catálogo marca PASSED con evidencia no reproducible ni vinculada al working tree.
```
