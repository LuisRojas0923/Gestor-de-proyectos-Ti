# Reporte de revisión backend final

**Fecha:** 2026-07-10
**Alcance:** commit `f7334736` contra `origin/main`, worktree `pr11`
**Modo:** revisión read-only del diff; evidencia de ejecución aportada por el solicitante

## Decisión

**Backend review: approved_with_risks**

No se identificó un defecto bloqueante en el flujo backend incorporado por el diff. Los bloqueos backend previos están corregidos: el rango omitido queda acotado, el endpoint tiene contrato HTTP focal, la consulta de últimos eventos usa una window query y el servicio queda en 499 líneas.

## Archivos backend y pruebas revisados

- `backend_v2/app/api/auditoria/router.py`
- `backend_v2/app/models/auditoria/accion_usuario.py`
- `backend_v2/app/services/auditoria/clasificador_fallos.py`
- `backend_v2/app/services/auditoria/servicio_estadisticas.py`
- `testing/backend/test_auditoria_estadisticas.py`
- `testing/backend/test_auditoria_estadisticas_http.py`
- `testing/backend/test_auditoria_estadisticas_rbac.py`
- `testing/backend/test_auditoria_stats_fallos.py`
- `testing/CATALOGO_PRUEBAS.md`

## Findings

### Riesgo medio — combinaciones de datetimes naive/aware pueden producir 500

`normalizar_rango()` y `validar_rango()` operan directamente con los `datetime` recibidos (`servicio_estadisticas.py:21-26, 33-46`). FastAPI acepta valores ISO con offset y sin offset. Si el cliente mezcla ambos formatos, la comparación o resta de Python genera `TypeError`; el router solo traduce `ValueError`, por lo que la petición puede terminar en 500. El frontend actual envía ambos límites sin offset y no activa el problema en el flujo normal.

**Seguimiento recomendado:** normalizar ambos límites a una política temporal única o rechazar explícitamente la mezcla con HTTP 400, y añadir un caso HTTP.

### Riesgo medio — la window query nueva carece de aserción de regresión específica

La implementación usa `row_number() over (partition by modulo order by timestamp desc)` y filtra `fila <= 5` (`servicio_estadisticas.py:151-183`), eliminando el fan-out N+1 previo. Sin embargo, los 12 tests focales no afirman explícitamente máximo cinco eventos por módulo, orden descendente ni exclusión por rango. El test PostgreSQL de fallos recorre el servicio completo, pero sus aserciones solo cubren clasificación.

**Seguimiento recomendado:** añadir una prueba PostgreSQL con más de cinco eventos, dos módulos y un evento fuera del rango. Agregar `id DESC` como desempate también haría determinista el orden cuando varios eventos comparten timestamp.

### Riesgo bajo — el DTO reduce datos sensibles, pero no es libre de PII

`AuditoriaEventoResumen` ya no expone IP, user-agent, correlación ni payloads JSON, lo cual corrige la exposición amplia anterior. Conserva `usuario_id` y `usuario_nombre` (`accion_usuario.py:98-99`), que son identificadores personales. Esto es coherente con la vista de auditoría protegida por `auditoria_sistema`, pero debe describirse como minimización de PII, no eliminación total.

### Riesgo bajo — evidencia master health no completamente verde

La evidencia reportada es `3 pass / 4 skip / 1 fail`, con el único fallo causado por ausencia de categorías maestras en la DB efímera. No hay cambio de categorías, seeds, modelos físicos ni migraciones en este diff, por lo que no se considera bloqueo causal de `f7334736`. Sigue siendo una deuda de preparación del entorno y una puerta de release que el responsable de integración debe cerrar o aceptar expresamente.

## Verificaciones conformes

- Handlers y acceso DB permanecen async (`AsyncSession`, `await db.execute`).
- Se conserva la separación `api -> services -> models`; no hay acceso DB síncrono.
- SQL compatible con PostgreSQL: `ILIKE`, `date_trunc`, `to_char`, `row_number()` y agregados.
- El rango por defecto es 30 días; al omitir un solo extremo se completa una ventana máxima de 90 días.
- El endpoint reutiliza el permiso existente `auditoria_sistema`; no requiere alta nueva en `rbac_manifest.py`.
- No hay cambio estructural de tabla, por lo que no aplican migración, blindaje ni actualización de `docs/ESQUEMA_BASE_DATOS.md`.
- No hay PATCH/PUT, escrituras, commits ni rollback nuevos.
- Archivos backend bajo el máximo de 550 líneas; el servicio principal tiene 499.
- Schemas de respuesta usan tipos concretos; no se incorpora un campo genérico `datos: dict`.
- Se añadieron pruebas backend y registro en `testing/CATALOGO_PRUEBAS.md`.
- Colección local autorizada: **12 tests collected**. Ejecución focal Docker declarada: **12/12 passed**.

## Required tests

No hay test bloqueante adicional para aprobar este diff. Como seguimiento:

1. Cobertura específica de la window query: límite 5, orden, desempate y filtro temporal.
2. Caso HTTP con límites temporalmente incompatibles (naive/aware) y respuesta 400.
3. Repetir master health con categorías maestras sembradas para obtener cero fallos antes del release general.

## Required docs/RBAC follow-up

- RBAC: ninguno; `auditoria_sistema` ya existe y protege el endpoint.
- Esquema DB: ninguno; solo se agregan DTOs de lectura.
- Documentar la corrida master health verde o la aceptación explícita de su fallo ambiental antes del release.

## Blocking reasons

Ninguno atribuible al diff backend `origin/main...f7334736`.

Nota de higiene: el worktree ya contiene una modificación ajena al commit en `.opencode/memory/docs-tests-reviewer.json`; no fue alterada por esta revisión.
