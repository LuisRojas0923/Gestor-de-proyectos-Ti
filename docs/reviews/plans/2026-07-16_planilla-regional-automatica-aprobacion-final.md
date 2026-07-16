# Aprobación Final de Plan - Planilla Regional Automática

**Fecha:** 2026-07-16
**Modo:** plan
**Rama:** `Modulo_Geoface`
**SHA base de investigación:** `b210dd49efb690fb99b9fca714e9e007c6405ee4`
**SHA contractual:** pendiente de commit autorizado
**Decisión:** aprobado con riesgos no bloqueantes

## 1. Artefactos Aprobados

- `docs/specs/2026-07-15_planilla-regional-automatica.md`
- `docs/specs/2026-07-16_planilla-regional-ddl.md`
- `docs/specs/2026-07-16_planilla-regional-consulta-tabla.md`
- `docs/specs/2026-07-16_planilla-regional-seguridad-operativa.md`
- `docs/decisions/ADR-009-planilla-regional-item-versionado.md`
- `docs/reviews/plans/2026-07-16_planilla-regional-automatica-ejecucion.md`

Este reporte supersede la rerevisión bloqueante previa y los reportes intermedios generados durante la convergencia del contrato.

## 2. Bloqueantes Cerrados

- `RET`/`DXT` históricos permanecen inmutables; nuevos conceptos usan esos valores solo como códigos de salida.
- Tabla Maestra y Solid tienen proyección/mapeo canónico y permisos dedicados.
- DDL converge desde esquema parcial, usa constraints nombrados y separa expand/backfill/validate.
- ITEM/origen y snapshots son inmutables en registro global y consumidores.
- Históricos sin crudo reciben ITEM y calidad `PERSISTIDA_NO_RECONCILIABLE`; no se archivan automáticamente.
- Manifiestos multifile son durables, idempotentes y consumidos una vez.
- Backfill mantiene guard tras fallo, usa corte estable y contempla tabla vacía.
- Fase 1P retira DDL, seeds, saneamientos, bootstrap y escrituras RBAC del runtime.
- Auditoría es append-only, HMAC, execute-only, sin PII y con cutover sin huecos/duplicados.
- Activación usa función `SECURITY DEFINER`, gate/SHA persistidos y aprobación humana separada.
- Storage, worker, TLS, Redis, antimalware y cuotas tienen contrato fail-closed.
- Consulta/facetas/exportación tienen DTO exacto; ITEM BIGINT viaja como string.
- Frontend define require-all fail-closed, revocación en sesión, tabla semántica, accesibilidad y Playwright.
- Cada fase termina verde, revisada, aprobada y con SHA independiente.

## 3. Matriz de Revisión

```text
Subagente | Resultado final | Bloquea
----------|-----------------|--------
scope-reviewer | approved_with_risks | no
backend-reviewer | approved | no
frontend-reviewer | approved | no
docs-tests-reviewer | approved | no
security-rbac-reviewer | approved | no
frontend-table-specialist | approved_with_risks | no
mobile-reviewer | no aplica | no
```

## 4. Riesgos Residuales

- El commit contractual aún no existe; debe incluir solo la allowlist de Planilla Regional y excluir cambios concurrentes ajenos.
- Graphify debe regenerarse contra el SHA contractual si cambia código antes de EXECUTE.
- Fase 5 debe demostrar con Vitest/Playwright/Profiler recuperación de cursor, foco modal, búsqueda/facetas y presupuesto visual.
- Fase 1P es transversal al startup; requiere aprobación DBA/DevOps y no puede mezclarse con Fase 1A.
- Activación permanece bloqueada hasta demostrar hardening global o aislamiento total de rutas compartidas.

## 5. Evidencia

- Graphify AST: 4.756 nodos, 9.276 aristas, 347 comunidades.
- `git diff --check`: sin errores.
- Auditoría incremental: 0 violaciones de diseño, seguridad, fiabilidad o estructura.
- Todos los contratos y el plan están por debajo de 500 líneas.
- No se ejecutaron suites funcionales: aún no existe código ni pruebas de Planilla Regional, conforme a RIPER PLAN.

## 6. Decisión y Puerta

- [ ] `aprobado_sin_riesgos`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

La Fase 0 documental queda aprobada, pero no cerrada. Para cerrarla se requiere autorización explícita de commit, stage selectivo, registro del SHA resultante y regeneración/verificación de Graphify contra ese SHA. Iniciar Fase 1P requiere una segunda autorización explícita del usuario.
