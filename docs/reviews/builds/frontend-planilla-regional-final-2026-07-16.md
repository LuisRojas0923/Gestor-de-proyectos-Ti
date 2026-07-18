# Revisión frontend final — Planilla Regional

**Fecha:** 2026-07-16
**Modo:** plan, revisión read-only
**Alcance:** contratos y plan de Fase 5 de Planilla Regional

## Veredicto

**Frontend review: blocked**

## Hallazgo bloqueante

1. **Contrato salarial todavía contradictorio.** `docs/specs/2026-07-16_planilla-regional-consulta-tabla.md:120,244` exige que `salario` y `base_hora` sean claves siempre presentes con valor `null` sin capacidad salarial, coherente con `docs/reviews/plans/2026-07-16_planilla-regional-automatica-ejecucion.md:312`. Sin embargo, `docs/specs/2026-07-15_planilla-regional-automatica.md:288` aún dice “salario omitido”. Debe sustituirse por “`salario` y `base_hora` presentes en `null`”. Esta ambigüedad afecta el OpenAPI congelado y el TypeScript generado.

## Comprobaciones solicitadas

- Cursor anterior y recuperación por `CONTEXTO_CAMBIO`: definidos.
- Capacidades dedicadas Tabla Maestra/Solid y guardas `require-all` fail-closed: definidas.
- TypeScript generado desde OpenAPI, check reproducible y drift en CI: definidos para Fase 5.
- Playwright/Chromium, viewports, portal y presupuesto Profiler: definidos para Fase 5.
- Extracciones y archivos modificados por la feature `<=500` líneas: puerta explícita con evidencia de conteos.

No se exige implementación ni ejecución de pruebas en fase PLAN.

## Required checks

En Fase 5: `npm run lint`, `npm run test`, `npm run build` y `npm run test:e2e -- planilla-regional` desde `frontend/`, además del check de OpenAPI generado y conteos `<=500`.

## Design-system risks

Ningún riesgo alto adicional.

## Blocking reasons

Contrato requerido-nullable versus omitido en `docs/specs/2026-07-15_planilla-regional-automatica.md:288`.
