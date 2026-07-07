# Frontend re-review — Fase 1B Horas Extras

**Fecha:** 2026-07-07  
**Resultado:** blocked  
**Alcance:** `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS`, `frontend/src/services/horasExtrasService.ts`, `frontend/src/types/horasExtras.ts`, tests relacionados.  
**Ejecución propia:** revisión read-only; no ejecuté checks. Evidencia reportada por el orquestador: `npx tsc --noEmit --pretty false`, eslint dirigido, `npm run test -- --run src/tests/horasExtrasService.test.ts` (33 passed) y `npm run build` pasan; `npm run lint` repo-wide falla por deuda histórica no relacionada.

## Estado del blocker previo de contrato de tipos

**Resuelto.** `DetalleCalculoItem` ahora está declarado como tipo independiente para `PreLiquidacionResultado.detalles`, y `ConfirmarDetalleItem` queda separado para el payload de confirmación con `fuente`. Ya no veo el merging accidental/duplicación que bloqueaba el contrato.

## Blockers restantes

1. **Límite de 550 líneas aún incumplido:** `PreLiquidacionView.tsx` sigue en 600 líneas y `frontend/src/types/horasExtras.ts` en 622 líneas.
2. **A11y de diálogos/modales aún incompleta:** `CeldaDiaEditor` usa `role="dialog"`/`aria-modal`, pero falta `aria-labelledby`, Escape, focus trap y body scroll lock. El `Modal` compartido usado por la confirmación bloquea scroll y usa portal, pero aún no implementa `aria-labelledby`, Escape ni focus trap.
3. **Cobertura UI aún incompleta para readiness:** existe cobertura de `PlanificadorSemanalView`, pero siguen sin tests de interacción para `PreLiquidacionView`, `HorarioSemanaView` y el modal/editor `CeldaDiaEditor` siguiendo el patrón de `AdminLoginLock.test.tsx`.

## Riesgos restantes

- **Design-system/tokens:** persisten tablas HTML crudas en `HorarioSemanaView` y `PreLiquidacionView`, banner de advertencias inline en vez de `Callout`, y colores Tailwind hardcoded (`text-slate-*`, `bg-amber-*`, `text-green-600`, `border-slate-*`, `bg-slate-*`).
- **API constants:** `horasExtrasService.ts` mantiene `BASE` y rutas con strings inline en vez de centralizar en `API_ENDPOINTS` de `config/api.ts`.
- **Mobile-first:** las tablas editables dependen de `overflow-x-auto`; funcional, pero no óptimo para edición frecuente en móvil.
- **Errores auxiliares silenciosos:** fallos al cargar festivos/novedades en `PreLiquidacionView` se silencian y limpian arrays, con riesgo de cálculo sin contexto visible para el usuario.
