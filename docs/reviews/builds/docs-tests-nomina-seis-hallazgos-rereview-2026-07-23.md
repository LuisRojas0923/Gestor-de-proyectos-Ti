# Docs/tests re-review — nómina, seis hallazgos

> [!NOTE]
> Instantánea histórica superada por `docs-tests-nomina-seis-hallazgos-final-2026-07-23.md` (202 backend, 18 frontend, `approved_with_risks`).

**Fecha:** 2026-07-23
**Resultado:** `blocked`
**Alcance:** delta posterior con metadata PostgreSQL concurrente para ocho subcategorías, ERP ownership/timeout/Grancoop, migración concurrente, reporte consolidado y catálogo 198/18.

## Evidencia y conteos

- Evidencia declarada más reciente: **190 backend passed** antes de añadir ocho parametrizaciones de metadata.
- `test_nomina_directos_restantes_concurrencia.py` contiene **37 casos efectivos**: 8 filas vacías, 8 orden de lock, 5 ERP, 8 SALDO_FAVOR PostgreSQL y 8 metadata PostgreSQL.
- La suma **190 + 8 = 198** es coherente con el archivo actual. Frontend pasa de 16 a **18** por los dos casos terminales de `useApi`.
- `testing/CATALOGO_PRUEBAS.md` y `2026-07-23_nomina-hardening-seis-hallazgos.md` coinciden en **198 backend / 18 frontend / 4 passed y 4 skipped health**.
- La recolección independiente volvió a fallar con `No module named pytest`; este rol no ejecutó Docker.
- El reporte consolidado no conserva el comando exacto ni la salida de la corrida 190, ni explica dentro del documento la derivación 190 + 8. La evidencia es consistente, pero sigue siendo suministrada y no reproducida.

## Revisión de los seis hallazgos

| Hallazgo | Estado actual | Evaluación |
|---|---|---|
| PostgreSQL por ocho flujos directos | Ocho casos concurrentes verifican una metadata mediante `NominaService.obtener_o_crear_archivo`; los ocho routers actuales invocan esa primitiva. | **Cerrado funcionalmente con riesgo de cobertura**: las pruebas no ejecutan endpoints ni fallarían si un router dejara de usar la primitiva. |
| SALDO_FAVOR repetido/reproceso/concurrencia | Ocho casos PostgreSQL validan dos filas, dos transacciones, saldo agotado e historial único. | **Cerrado en la primitiva**; falta integración endpoint a endpoint, no bloqueante por sí sola. |
| Logs | `useApi` cubre token completo, query/fragment, refresh `null`/excepción, loading y logout. El backend amplió el saneamiento. | **Mejorado**; faltan casos runtime/caplog y los logs Axios directos quedan fuera del delta declarado. Riesgo residual. |
| Reproceso genérico | Continúan cubiertos archivo ausente/vacío, límite, rate limit y proceso cancelable. | **Bloqueante residual**: aún no hay caso feliz PostgreSQL, rollback tras comenzar el reemplazo ni dos reprocesos concurrentes. |
| Carga/migración | La carga genérica usa rutas únicas y limpia su propia ruta; la migración evita trabajo repetido, revalida bajo advisory lock, configura `lock_timeout` y tolera dos startups. | **Bloqueante residual**: no existe prueba PostgreSQL con metadata duplicada y referencias crudas/normalizadas que demuestre consolidación sin pérdida. Los flujos directos tampoco prueban compensación del archivo físico ante rollback. |
| ERP no bloqueante | Se cubren sesión propia del worker, cierre posterior, timeout sin cerrar la dependencia, espera acotada del semáforo y wrapper de empleados activos de Grancoop. | **Cerrado para el delta**. |

## Bloqueantes residuales

1. **Reproceso genérico transaccional no demostrado.** Las pruebas solo prueban rechazos previos al borrado y límites del extractor. Falta demostrar con PostgreSQL que un reproceso válido reemplaza datos y que un fallo posterior al `DELETE` hace rollback sin perder el período; también falta concurrencia del endpoint de reproceso.
2. **Migración de datos no probada.** `test_migracion_identidad_tolera_dos_startups_postgresql` instala concurrentemente la constraint sobre una tabla sin duplicados preparados. No valida el comportamiento más riesgoso del script: reasignar `nomina_registros_crudos` y `nomina_registros_normalizados`, conservar la metadata elegida y eliminar duplicados sin pérdida.

## Riesgos no bloqueantes

- Los ocho casos de metadata y SALDO_FAVOR llaman servicios compartidos, no los routers reales. Conviene añadir al menos una regresión integral por familia de router y una guarda que compruebe adopción de `obtener_o_crear_archivo` en los ocho flujos.
- Los flujos directos escriben el archivo antes de la transacción y no tienen pruebas de compensación en fallo de `flush`/`commit`; pueden dejar archivos huérfanos.
- Las aserciones backend de logs siguen siendo mayoritariamente estáticas; falta `caplog` para errores SQL/ERP con PII simulada.
- `security-nomina-hardening-2026-07-23.md` permanece en `blocked` y describe como vigentes varios estados ya corregidos —ERP, reproceso directo y migración—, mientras el consolidado solo enumera riesgos fuera del delta. Debe emitirse una re-revisión de seguridad o marcar explícitamente qué findings quedaron superados y cuáles siguen abiertos.

## Catálogo, esquema y reporte

- **Catálogo 198/18:** conteos aritméticamente coherentes. La frase “PostgreSQL real ... en [ocho flujos]” debe aclarar que es cobertura de primitivas parametrizadas, no ejecución de endpoints.
- **Esquema:** la sección manual de `docs/ESQUEMA_BASE_DATOS.md` sigue alineada con la constraint y la migración; no se tocó la sección autogenerada.
- **`sync_docs.py`:** el reporte consolidado ya registra correctamente que se intentó y quedó bloqueado por ausencia de `psycopg2` en el host. No es un bloqueo adicional mientras la sección manual permanezca fuera del bloque autogenerado.
- **Reporte consolidado:** debe añadir comando exacto, salida resumida/entorno, derivación 190 + 8 = 198 y veredicto explícito. También debe reconciliar los reportes backend/security/docs-tests anteriores para evitar conclusiones contradictorias.

```text
Docs/tests review: blocked
Findings: 198/18 es aritméticamente coherente y ERP, metadata concurrente, SALDO_FAVOR, useApi y guards de migración mejoraron. Persisten dos gates sin prueba: reproceso genérico transaccional real y consolidación de duplicados/referencias durante la migración.
Required tests: reproceso genérico PostgreSQL con éxito, rollback post-DELETE y concurrencia; migración PostgreSQL con metadata duplicada y referencias crudas/normalizadas. Recomendados: endpoints directos reales, compensación física y caplog con PII simulada.
Required docs: registrar comando/salida y derivación 190+8=198; aclarar en catálogo cobertura de primitivas; reconciliar el reporte Security bloqueado con el consolidado. sync_docs queda justificado por psycopg2 ausente.
Blocking reasons: no se demuestra que el reproceso genérico preserve/reemplace datos bajo fallo o concurrencia, ni que la migración consolide duplicados con referencias sin pérdida.
```
