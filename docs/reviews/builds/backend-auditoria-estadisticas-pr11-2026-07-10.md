# Reporte de Revisión de Build

**Fecha:** 2026-07-10  
**Build:** PR #11 — estadísticas de auditoría saneadas sobre `origin/main`  
**Autor del build:** PR #11 / saneamiento local  
**Modo:** build read-only  
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados revisados

- `backend_v2/app/api/auditoria/router.py`
- `backend_v2/app/models/auditoria/accion_usuario.py`
- `backend_v2/app/services/auditoria/servicio_estadisticas.py`
- `testing/backend/test_auditoria_estadisticas.py` (no rastreado)
- `testing/backend/test_auditoria_estadisticas_rbac.py` (no rastreado)
- `testing/backend/test_auditoria_stats_fallos.py`
- `testing/CATALOGO_PRUEBAS.md`
- `docker-compose.test-local.yml` (no rastreado; higiene de alcance)

Se inspeccionó tanto `origin/main...HEAD` como el estado no confirmado. Los cambios frontend quedan fuera de la aprobación de este revisor.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | bloqueado | Sí | Límite temporal evadible y health check obligatorio sin evidencia verde completa. |

## 3. Hallazgos bloqueantes

### B1 — El límite de 90 días se evade omitiendo uno o ambos extremos (alta)

`router.py:100-101` declara ambos parámetros opcionales y `servicio_estadisticas.py:18-19` retorna sin validar cuando falta cualquiera. Por tanto, estas peticiones son válidas y ejecutan agregaciones sin una ventana máxima garantizada:

- `/auditoria/estadisticas`
- `/auditoria/estadisticas?fecha_desde=1900-01-01T00:00:00`
- `/auditoria/estadisticas?fecha_hasta=2026-07-10T23:59:59`

El servicio puede emitir hasta 14 consultas agregadas secuenciales sobre toda `auditoria_acciones_usuario`. La protección RBAC no elimina el riesgo de consumo excesivo por un usuario autorizado. El contrato debe exigir ambos extremos o completar el extremo ausente con una ventana acotada; la ausencia de ambos debe usar un rango predeterminado de máximo 90 días. Deben añadirse pruebas de los tres casos de omisión mediante el endpoint.

### B2 — El health check obligatorio no está completamente verde (evidencia de release)

La evidencia aportada para infraestructura/regresiones es `3 passed, 4 skipped, 1 failed`. Aunque el fallo se atribuye a una base efímera sin categorías y no se observa relación causal con este diff, una suite obligatoria en rojo no permite cerrar el build. Se requiere repetirla contra una DB de pruebas inicializada canónicamente o volver el test autosuficiente respecto de sus categorías, y adjuntar resultado sin fallos. Los `skip` deben quedar identificados como esperados por diseño/entorno.

## 4. Hallazgos no bloqueantes

- **Cobertura RBAC insuficiente:** los dos tests llaman directamente `requiere_permiso_auditoria` con `ServicioAuth` simulado. Confirman la función, pero no prueban por HTTP que `GET /api/v2/auditoria/estadisticas` entregue 401/403 y que no invoque el servicio sin permiso.
- **Cobertura de consulta:** la prueba de clasificación ejecuta PostgreSQL y valida categorías, pero no verifica el resultado de la window query (máximo cinco eventos por módulo, orden y aplicación del rango), respuesta vacía, KPIs ni relleno horario/diario.
- **Modularidad:** `servicio_estadisticas.py` tiene 503 líneas, por debajo del máximo de 550 pero demasiado cerca del límite y concentra consultas, clasificación y humanización. Conviene extraer clasificación/humanización antes del próximo cambio.
- **Código residual:** `StatsPorResultado` no se usa y `fallos_map_inicial` en el test tampoco. El servicio conserva reglas específicas de viáticos dentro de la clasificación; confirmar que son parte intencional del producto saneado y no alcance tangencial remanente.
- **Higiene del worktree:** `docker-compose.test-local.yml` permanece no rastreado. No contiene secretos, pero debe excluirse del commit o justificarse/documentarse explícitamente.

## 5. Tests / comandos

- `python -m pytest --collect-only testing/backend/test_auditoria_estadisticas.py testing/backend/test_auditoria_estadisticas_rbac.py testing/backend/test_auditoria_stats_fallos.py` — **PASS**, 6 tests recolectados.
- Evidencia Docker aportada: rango/RBAC **5 passed**; clasificación de estadísticas **passed**.
- Evidencia Docker aportada: infraestructura/regresiones **3 passed, 4 skipped, 1 failed** por DB efímera sin categorías.
- No se ejecutaron tests ni Docker: el rol backend-reviewer solo autoriza colección de pytest y revisión read-only.

## 6. Arquitectura, PostgreSQL, RBAC y documentación

- Operaciones DB async con `AsyncSession` y `await`; no se introdujo acceso síncrono.
- Flujo conservado `api -> services -> models`.
- Consultas compatibles con PostgreSQL (`date_trunc`, `to_char`, window `row_number`, `ILIKE`); la prueba de clasificación reportada ejercita el servicio sobre PostgreSQL.
- El endpoint reutiliza el permiso efectivo `auditoria_sistema`; el módulo ya existe en `rbac_manifest.py`, por lo que no requiere alta RBAC nueva.
- No cambió la estructura física de la tabla; los agregados añadidos son schemas de respuesta. No aplica actualización de `docs/ESQUEMA_BASE_DATOS.md` ni blindaje/migración.
- Archivos backend revisados cumplen el máximo de 550 líneas.

## 7. Decisión final

- [ ] aprobado
- [ ] aprobado_con_riesgos
- [x] bloqueado

## 8. Seguimiento

| Acción | Responsable | Fecha objetivo |
|---|---|---|
| Cerrar la evasión del rango y probar omisiones por HTTP | Implementación backend | Antes de merge/entrega |
| Obtener health check Docker sin fallos en DB canónica | Implementación / testing | Antes de merge/entrega |
| Añadir pruebas HTTP RBAC y de window query | Implementación backend | Antes de aprobación |
| Excluir o justificar `docker-compose.test-local.yml` | Orquestador | Antes de commit |
