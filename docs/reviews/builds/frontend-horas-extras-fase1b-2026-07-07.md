# Frontend review — Fase 1B Horas Extras standalone frontend readiness

**Fecha:** 2026-07-07  
**Resultado:** blocked  
**Alcance revisado:** `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS`, `frontend/src/services/horasExtrasService.ts`, `frontend/src/types/horasExtras*.ts`  
**Evidencia reportada por orquestador:** `npm run test -- --run src/tests/horasExtrasService.test.ts` pasó 33 tests; `npm run build` pasó; `npm run lint` falla repo-wide por deuda no relacionada; eslint dirigido sobre `HorarioSemanaView.tsx` y `PreLiquidacionView.tsx` pasa tras remover imports no usados.  
**Ejecución propia:** revisión read-only; no ejecuté build/test/lint.

## Findings ordenados por severidad

### Blocker

1. **Tipado inconsistente en contrato principal de Horas Extras.**  
   `frontend/src/types/horasExtras.ts:185` referencia `DetalleCalculoItem[]`, pero `DetalleCalculoItem` no está declarado en el scope revisado. Además `ConfirmarDetalleItem` está declarado dos veces (`horasExtras.ts:164` y `horasExtras.ts:193`), lo que induce merging de interfaces y puede ocultar errores de contrato. `npm run build` no cubre esto porque el script actual es solo `vite build`, no `tsc --noEmit`.  
   **Impacto:** riesgo alto de falsa señal verde en build y de rotura al agregar type-check estricto o consumir `PreLiquidacionResultado.detalles`.

2. **Límite de 550 líneas incumplido.**  
   `PreLiquidacionView.tsx` tiene 600 líneas y `types/horasExtras.ts` tiene 622 líneas. Esto viola la regla de arquitectura limpia del frontend. `PlanificadorSemanalView.tsx` (544) y `EmpleadosActivosPanel.tsx` (542) quedan además muy cerca del límite.  
   **Impacto:** la fase no está lista según el estándar de modularidad; conviene extraer subcomponentes/hooks de pre-liquidación y dividir tipos por dominio.

### High

3. **A11y incompleta en diálogos/modales del flujo.**  
   `CeldaDiaEditor.tsx:144-148` usa `role="dialog"` y `aria-modal`, pero no define `aria-labelledby`, Escape, focus trap ni body scroll lock. El modal de confirmación de `PlanificadorSemanalView.tsx` delega en `components/molecules/Modal.tsx`, que bloquea scroll y usa portal, pero tampoco asocia título vía `aria-labelledby` ni implementa Escape/focus trap.  
   **Impacto:** incumple checklist obligatorio para modales y puede provocar regresiones de navegación por teclado/lectores.

4. **Cobertura de tests insuficiente para nuevas pantallas/forms/modales.**  
   La evidencia cubre el servicio HTTP (`horasExtrasService.test.ts`), pero no hay tests de interacción para `PreLiquidacionView`, `HorarioSemanaView`, `PlanificadorSemanalView`, `CeldaDiaEditor` o el modal de confirmación.  
   **Impacto:** no queda cubierto el patrón requerido tipo `AdminLoginLock.test.tsx` para formularios/modales nuevos.

### Medium

5. **Riesgos de design-system/tokens por HTML y colores crudos.**  
   Hay tablas crudas en `HorarioSemanaView.tsx:129-200`, `PreLiquidacionView.tsx:388-499` y `PreLiquidacionView.tsx:554-579`; también banners inline como advertencias en `PreLiquidacionView.tsx:537-548` en vez de `Callout`. Persisten clases Tailwind semánticas directas como `text-slate-500`, `bg-amber-50`, `text-green-600`, `bg-slate-50`, etc.  
   **Impacto:** se aparta de la regla de átomos/moléculas + variables CSS. En tablas pequeñas puede ser tolerable, pero debe documentarse o migrarse a componentes/tokens aprobados.

6. **Endpoints del módulo no están centralizados en `config/api.ts`.**  
   `horasExtrasService.ts:54` define `BASE` con el segmento `/novedades-nomina/horas-extras` y el resto de rutas se arma con strings inline; no usa `API_ENDPOINTS`.  
   **Impacto:** incumple checklist de constantes de API y dificulta auditoría/cambios de rutas.

7. **UX móvil funcional pero no óptima en formularios tabulares.**  
   `HorarioSemanaView` y `PreLiquidacionView` dependen de `overflow-x-auto` con inputs dentro de tablas. Esto evita ruptura visual, pero no es un layout mobile-first cómodo para edición frecuente en móvil.  
   **Impacto:** riesgo residual de usabilidad en pantallas pequeñas; considerar cards por día o editor por celda para móvil.

### Low / residual

8. **Estados de error parciales en datos auxiliares.**  
   En `PreLiquidacionView`, errores al cargar festivos/novedades se silencian y solo limpian arrays (`catch { setFestivosSemana([]) }`, `catch { setNovedadesSemana([]) }`).  
   **Impacto:** el usuario puede calcular sin contexto de festivos/novedades sin señal visible.

## Required checks

- Mantener los checks reportados: `npm run test -- --run src/tests/horasExtrasService.test.ts`, `npm run build`, eslint dirigido sobre archivos tocados.
- Antes de aprobar la fase, agregar/ejecutar: `npx tsc --noEmit` o script equivalente de type-check estricto, porque `vite build` no detecta el tipo faltante.
- Agregar tests de componentes/interacción para formularios y modales nuevos: carga/empty/error, validaciones, confirmar/cancelar, Escape/foco cuando aplique.
- Cuando la deuda repo-wide lo permita, `npm run lint` completo desde `frontend/`.

## Design-system risks

- Uso de tablas HTML crudas y colores Tailwind hardcoded fuera de tokens.
- Banner de advertencias reimplementado inline en vez de `Callout`.
- Modales sin checklist a11y completo.
- Páginas cerca o por encima del límite de tamaño, lo que dificulta mantener atomicidad.

## Blocking reasons

- `types/horasExtras.ts` contiene contrato de tipos inconsistente (`DetalleCalculoItem` no declarado + `ConfirmarDetalleItem` duplicado).
- `PreLiquidacionView.tsx` y `types/horasExtras.ts` exceden el límite máximo de 550 líneas.
- A11y y tests de modales/forms no cumplen aún el checklist obligatorio para readiness standalone.

## Nota de memoria sugerida

Recomiendo al orquestador registrar en `.opencode/memory/frontend-reviewer.json`: fecha `2026-07-07`, scope `HORAS_EXTRAS fase 1B`, outcome `blocked`, severidades: blocker=2, high=2, medium=3, low=1.
