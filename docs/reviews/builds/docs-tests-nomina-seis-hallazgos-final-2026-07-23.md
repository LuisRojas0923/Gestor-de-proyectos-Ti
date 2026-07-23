# Docs/tests final review — nómina, seis hallazgos

**Fecha:** 2026-07-23  
**Resultado:** `approved_with_risks`  
**Alcance:** únicamente bloqueantes atribuibles al delta de hardening de nómina.

## Evidencia aceptada

- Backend focal completo: **202 passed**.
- Frontend focal: **18 passed**.
- Health: **4 passed, 4 skipped** por dependencias opcionales de entorno.
- Build Vite, ESLint focalizado, `compileall` y `git diff --check`: **PASS**.
- La recolección independiente del host continúa no disponible por ausencia de `pytest`; los resultados anteriores son evidencia ejecutada suministrada.

`testing/CATALOGO_PRUEBAS.md` y `2026-07-23_nomina-hardening-seis-hallazgos.md` coinciden en 202/18 y describen las nuevas coberturas. El reporte consolidado también registra el intento fallido de `sync_docs.py` por ausencia de `psycopg2`.

## Cierre de gates

1. **Flujos directos y metadata:** ocho subcategorías tienen cobertura PostgreSQL concurrente y los ocho routers usan `obtener_o_crear_archivo` bajo lock de período.
2. **SALDO_FAVOR:** repetición multifila, reproceso, concurrencia, saldo agotado e historial único están cubiertos para las ocho subcategorías.
3. **Logs/useApi:** se cubren redacción completa de JWT/query/fragment, refresh terminal exitoso/fallido, cierre de loading y logout; el backend retiró detalles/trazas en los archivos semánticamente modificados.
4. **Reproceso genérico:** hay casos de éxito, fallo posterior al `DELETE` con rollback y dos sesiones PostgreSQL concurrentes.
5. **Carga/migración:** se cubren rutas físicas propias, limpieza, startup concurrente, metadata duplicada y reasignación de referencias crudas/normalizadas.
6. **ERP:** se prueban sesión propiedad del worker, cierre, timeout de ejecución, timeout de espera del semáforo y consulta Grancoop fuera del event loop.

## Bloqueantes residuales del delta

**Ninguno.** Backend y Security/RBAC también concluyen sin bloqueantes atribuibles al delta.

## Riesgos no bloqueantes

- El caso de rollback posterior al `DELETE` usa una sesión mock: demuestra la llamada a rollback y el error saneado, pero no consulta PostgreSQL para afirmar explícitamente que las filas anteriores permanecen. Es recomendable añadir esa aserción de persistencia real.
- Las pruebas de las ocho subcategorías ejercitan las primitivas compartidas y verifican estáticamente su adopción; no ejecutan los ocho endpoints completos.
- Los flujos directos no tienen una matriz específica de compensación física ante fallo de `flush`/`commit`; queda como endurecimiento de almacenamiento.
- El reporte backend conserva el conteo anterior de 190 y los reportes docs/tests previos conservan 184/198. El consolidado 202 es la fuente vigente, pero conviene marcar explícitamente esos reportes como históricos/superados.
- El reporte consolidado registra resultados, pero no el comando exacto ni la salida resumida. Añadirlos mejoraría reproducibilidad.

## Documentación

- `docs/ESQUEMA_BASE_DATOS.md` refleja la constraint y la consolidación fuera de la sección autogenerada.
- El bloqueo de `sync_docs.py` por `psycopg2` host está documentado y no constituye bloqueo del delta.
- No aplica ADR ni ADR-006; no cambiaron skills/agentes ni fronteras arquitectónicas.

```text
Docs/tests review: approved_with_risks
Findings: los gates de reproceso genérico, migración con duplicados/referencias, metadata PostgreSQL x8, SALDO_FAVOR, ERP y logs/useApi quedaron cubiertos. No quedan bloqueantes atribuibles al delta.
Required tests: ninguno bloqueante. Recomendados: verificar en PostgreSQL que rollback post-DELETE preserva filas previas; integración endpoint por familia y compensación física de flujos directos.
Required docs: ninguno bloqueante. Recomendado: registrar comando/salida de 202/18 y marcar reportes 184/190/198 como históricos frente al consolidado vigente.
Blocking reasons: ninguno.
```
