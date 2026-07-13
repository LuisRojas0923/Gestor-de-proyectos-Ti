# Build - Optimizacion Vite en plantillas de horario

**Fecha:** 2026-07-13
**Plan:** `docs/reviews/plans/2026-07-12_optimizacion-rendimiento-aplicacion.md`
**Estado:** mejora parcial implementada; fase 1 no cerrada

El usuario autorizo expresamente proceder con la correccion el 2026-07-13. Esta autorizacion permitio aplicar la remediacion parcial, pero no sustituye la aprobacion de la linea base completa ni habilita las fases backend posteriores.

## Problema reproducido

La navegacion inicial a Plantillas de horario mostraba modulos TypeScript de 0.2 kB con tiempos de 2 a 3 segundos. Los recursos respondian `304`, por lo que el tiempo correspondia a espera y transformacion en Vite, no a transferencia de red.

## Cambios

- Polling de Vite configurable mediante `VITE_USE_POLLING` y `VITE_POLLING_INTERVAL_MS`.
- Intervalo local aumentado a 2000 ms porque el bind mount Windows/Linux no propaga eventos nativos de forma confiable.
- Exclusion de `dist` y `coverage` del watcher.
- `optimizeDeps.holdUntilCrawlEnd=false` para no retener las primeras respuestas hasta terminar el escaneo completo.
- Warmup limitado a cuatro raices de Plantillas de horario y sus dependencias transitivas; se descarto un warmup amplio porque produjo una espera cercana a 30 segundos.
- Imports directos de componentes atomicos en el subgrafo de Plantillas de horario para evitar cargar todo el archivo barril.
- Consulta de `version.json` desactivada en desarrollo.
- Compose de desarrollo fija `ENVIRONMENT=development` para no heredar reglas de produccion desde `.env`.

No se retiro `StrictMode` y no se modificaron autenticacion, RBAC ni consultas del endpoint de plantillas.

## Comparacion

### CPU frontend en reposo

30 muestras por escenario.

| Escenario | p50 | p95 | max |
|---|---:|---:|---:|
| Antes | 38.81 % | 43.67 % | 43.67 % |
| Despues | 17.67 % | 21.21 % | 21.63 % |
| Reduccion | 54.5 % | 51.4 % | 50.5 % |

Evidencia cruda posterior: `docs/reviews/builds/evidence/2026-07-13_rendimiento-frontend-post.json`.

La reduccion es material, pero la meta inicial de CPU p50 menor a 10 % todavia no se cumple.

### Modulos calientes del baseline reproducible

5 warmups y 50 muestras por recurso.

| Recurso | p50 | p95 | max |
|---|---:|---:|---:|
| Configuracion HE | 4.70 ms | 36.53 ms | 110.29 ms |
| Calculadora HE | 6.08 ms | 15.82 ms | 24.02 ms |
| Alcance | 4.02 ms | 5.49 ms | 6.60 ms |
| Modal | 3.77 ms | 6.01 ms | 468.46 ms |

La mediana mejora o se mantiene baja, pero Configuracion y Modal presentan outliers que requieren navegacion real y HAR antes de atribuir una mejora integral a toda la aplicacion.

## Validacion

- 18/18 pruebas frontend focales aprobadas: 8 de versionado, 2 de configuracion Vite y 8 de Plantillas de horario.
- 2/2 pruebas del script de baseline aprobadas.
- ESLint focal aprobado.
- Build de produccion aprobado: 4025 modulos.
- `docker compose config --quiet` aprobado.
- Precedencia validada con `ENVIRONMENT=production` en el host: backend y motor biometrico conservan `development` en el Compose local.
- Backend restaurado y `/health` responde 200.
- HMR verificado en el host actual mediante eventos registrados por Vite.
- Pruebas biometricas independientes: engine API 6/6, client 4/4 y router 3/3. La suite de servicio ejecuto sus 14 casos, pero el proceso excedio 120 segundos durante el cierre y no se contabiliza como aprobada.

## Pendiente

- Medir `GET /plantillas-horario` con token de prueba e instrumentacion backend antes de optimizar SQL o RBAC.
- Validar en DevTools una navegacion real con cache desactivada y guardar HAR anonimizado.
- Validar rutas lazy adicionales por el riesgo de reoptimizacion con `holdUntilCrawlEnd=false`.
- La fase 0 completa sigue pendiente por ausencia de evidencia autenticada.
- La fase 1 sigue abierta porque CPU p50 no alcanza 10 % y HMR puede tardar hasta el intervalo de polling configurado.
