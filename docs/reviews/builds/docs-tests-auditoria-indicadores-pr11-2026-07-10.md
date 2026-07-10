# Docs/tests review: blocked

**Fecha:** 2026-07-10  
**Alcance:** worktree `pr11`, reparación de indicadores de auditoría; diff actual, catálogo y evidencia previa a commit/push.  
**Modo:** revisión read-only de código; solo se persiste este reporte autorizado.

## Findings

### Alta — la suite obligatoria de infraestructura/regresión no está verde

- La evidencia persistida en `backend_v2/testing/logs/test_report_2026-07-10_11-28-53.log` registra **3 passed, 4 skipped, 1 failed**.
- Falla `test_regresiones.py::test_regresion_maestros_soporte` porque la base efímera no contiene los maestros de soporte.
- Esto explica la causa, pero no convierte el Master Health Check en aprobado: el test existe precisamente para comprobar que los catálogos básicos están disponibles.
- Antes de integrar, hay que sembrar los maestros requeridos en la base de prueba y repetir `test_infrastructure.py` + `test_regresiones.py`, o documentar y automatizar un bootstrap equivalente. No se debe cambiar el test para ocultar la ausencia del dato obligatorio.

### Alta — el límite de 90 días se puede omitir

- `validar_rango()` retorna sin validar cuando falta uno de los extremos (`servicio_estadisticas.py:18-19`) y el endpoint declara ambos filtros opcionales.
- Sin fechas, o con solo `fecha_desde`/`fecha_hasta`, las agregaciones pueden recorrer todo el historial. La evidencia focal 6/6 no cubre esas tres variantes.
- Definir una ventana predeterminada acotada o exigir/completar ambos extremos, y probar el contrato por HTTP.

### Alta — falta cobertura API y de la consulta optimizada

- Los tres casos de `test_auditoria_estadisticas.py` cubren `validar_rango()` directamente, pero no prueban que `obtener_estadisticas_auditoria()` traduzca el `ValueError` a HTTP 400 (`backend_v2/app/api/auditoria/router.py:98-113`).
- La sustitución del patrón N+1 por `row_number()` (`servicio_estadisticas.py:106-167`) no tiene una aserción focal sobre máximo cinco eventos por módulo, orden descendente y respeto del rango temporal.
- Los tests RBAC llaman la dependencia directamente; falta verificar por HTTP el rechazo 401/403 y que el servicio no se invoque sin permiso.
- `test_auditoria_stats_fallos.py` recorre el servicio, pero solo valida clasificación de fallos; no protege esos comportamientos nuevos.

### Alta — existe un bloqueo frontend independiente

- `docs/reviews/builds/frontend-auditoria-indicadores-2026-07-10.md` bloquea el build por la regresión de etiquetas técnicas/inglesas causada al retirar `humanizer.ts`.
- Ese reporte también identifica accesibilidad y checks completos pendientes. Debe resolverse antes de commit/push conjunto.

### Media — el catálogo contradice la ejecución vigente

- `testing/CATALOGO_PRUEBAS.md:21-22` marca Infra Health y Regresiones como `PASSED`, aunque la ejecución focal vigente terminó con un fallo y cuatro skips.
- Las tres suites nuevas sí están registradas en las ubicaciones correctas, pero el catálogo debe reflejar honestamente el estado condicionado/bloqueado hasta obtener una corrida verde.

### Media — falta trazabilidad de una reducción funcional durable

- El diff elimina el WebSocket del dashboard, tablas, modales, alertas y visualizaciones, además de unas 2.000 líneas de UI.
- El reporte frontend enumera la reducción, pero no deja el motivo, alcance aceptado ni criterio de producto. Registrar esa decisión en bitácora/build review; usar ADR solo si la retirada del canal en tiempo real es una decisión arquitectónica permanente.

### Baja — archivo local de Compose pendiente de decisión

- `docker-compose.test-local.yml` está no versionado y contiene puertos/container names específicos del worktree.
- Excluirlo del commit si es solo aislamiento local; si se pretende compartir, documentar el comando de uso y su propósito.

## Pruebas duplicadas y ubicación

- No se detectaron nombres ni objetivos duplicados entre `test_auditoria_estadisticas.py`, `test_auditoria_estadisticas_rbac.py`, `test_auditoria_stats_fallos.py`, `test_auditoria_acciones.py` y `test_auditoria_snapshots_orm.py`.
- Backend nuevo: ubicación correcta en `testing/backend/`.
- Frontend nuevo: ubicación válida junto a la página en `frontend/src/pages/ServicePortal/pages/AuditoriaIndicadores/index.test.tsx` y registrada en catálogo.
- Los archivos nuevos de tests siguen no versionados; deben incluirse deliberadamente en el commit.

## Evidencia verificada

- `python -m pytest --collect-only ... -q`: **6 tests collected** para las tres suites backend focales.
- Logs persistidos: `5 passed` para rango/RBAC y `1 passed` para clasificación de fallos; equivalen a la evidencia backend focal **6/6**.
- Frontend: el reporte frontend registra evidencia declarada de **3/3**, lint focal, TypeScript `noEmit` y build exitosos; no hay salida cruda persistida en este alcance.
- Infra/regresión: **3 passed, 4 skipped, 1 failed**, fallo identificado en maestros de soporte.
- `git diff --check`: sin errores; solo advertencias de normalización LF/CRLF.

## Required tests

1. Test del endpoint `/auditoria/estadisticas`: rango invertido y rango mayor a 90 días devuelven 400 con detalle; límite de 90 días sigue el camino exitoso.
2. Casos HTTP sin filtros, solo `fecha_desde` y solo `fecha_hasta`, todos con ventana efectiva máxima de 90 días.
3. Casos HTTP RBAC 401/403 que comprueben que no se ejecutan las estadísticas sin permiso.
4. Test de estadísticas por módulo: máximo cinco últimos eventos por módulo, orden descendente, filtro temporal correcto y ausencia de fan-out N+1 (o aserción equivalente sobre consultas).
5. Sembrar maestros y repetir infraestructura/regresión hasta obtener cero fallos; justificar explícitamente cualquier skip restante.
6. Tras corregir el bloqueo frontend, repetir al menos el test focal y lint focal; antes del push, preferir `npm run lint`, `npm run test -- --run`, TypeScript y build completos.

## Required docs

1. Corregir el estado de Infra Health/Regresiones en `testing/CATALOGO_PRUEBAS.md` o adjuntar una nueva corrida verde antes de conservar `PASSED`.
2. Registrar la razón y aceptación de retirar WebSocket y bloques del dashboard en bitácora o build review.
3. No se requiere regenerar `docs/ESQUEMA_BASE_DATOS.md`: el cambio en `accion_usuario.py` afecta defaults de schemas SQLModel de respuesta, no columnas/tablas ORM.
4. No cambian `.agents/skills/` ni `.opencode/agent/`; ADR-006 no requiere actualización.

## Blocking reasons

1. Master Health Check con un fallo vigente.
2. El límite de 90 días es evadible omitiendo filtros.
3. Falta cobertura HTTP (errores/rango/RBAC) y de la consulta por módulo reescrita.
4. Bloqueo frontend vigente por regresión de idioma/comprensión.

## Decisión

**blocked** — no aprobar commit/push hasta cerrar los cuatro bloqueos anteriores.
