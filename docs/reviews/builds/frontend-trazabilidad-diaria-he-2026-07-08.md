# Frontend review — trazabilidad diaria HE

**Fecha:** 2026-07-08  
**Plan revisado:** `docs/reviews/plans/2026-07-08_plan-trazabilidad-diaria-horas-extras.md`  
**Alcance frontend:** `CalculoDetailView`, `PlanificadorSemanalView`, tipos/services, tabla de trazabilidad diaria, alerta para históricos y pruebas.  
**Decisión:** `blocked`

## Hallazgos por severidad

### Bloqueantes

1. **Arquitectura / límite de 550 líneas no resuelto antes de ampliar archivos críticos.**  
   El plan propone agregar tipos, services y UI directamente sobre archivos ya grandes o al límite: `PlanificadorSemanalView.tsx` está en 529 líneas, `horasExtras.ts` ya supera el límite, `horasExtrasService.ts` está en 525 líneas, `EmpleadosActivosPanel.tsx` queda al borde y `PlanificadorSemanalView.test.tsx` ya supera el límite. La fase frontend debe exigir extracción previa: `TrazabilidadDiariaSection/Table`, tipos en archivo dedicado y service segmentado.

2. **Contrato de datos insuficiente para la alerta de históricos.**  
   El plan indica mostrar alerta si el cálculo no tiene snapshot diario, pero no define un campo inequívoco para distinguir histórico sin snapshot, respuesta incompleta, error de carga o cálculo con 0h. Requiere contrato explícito: por ejemplo `detalle_diario: CalculoDiarioDetalleRead[]`, `snapshot_diario_estado: 'COMPLETO' | 'HISTORICO_SIN_SNAPSHOT' | 'INCOMPLETO'`, y mensaje funcional auditable.

3. **Tabla de trazabilidad no especifica patrón aprobado de design system / tablas.**  
   La implementación no debe replicar una tabla HTML ad hoc en `CalculoDetailView`. Debe usar componente reutilizable (`DataTable` o componente de tabla del módulo con atoms `Text`, `Badge`, `MaterialCard`), contenedor `max-height` + `overflow-auto`, header sticky, estados loading/empty/error y layout mobile-first. La alerta histórica debe ser `Callout` warning, no banner inline.

### Mayores

1. **Planificador: festivo/domingo “antes de confirmar” no tiene fuente de datos definida.**  
   Domingo puede derivarse de `dia_semana === 7`, pero festivos requieren `listarFestivos(anio)` o que el pre-cálculo devuelva `nombre_festivo`/`es_domingo`. Si la UI depende de `preCalculo`, debe bloquear o advertir cuando el pre-cálculo esté desactualizado antes de confirmar.

2. **Services/endpoints no quedan alineados con `config/api.ts`.**  
   Si se agrega endpoint para detalle diario, debe registrarse en `API_ENDPOINTS` y consumirse desde el service, evitando strings hardcodeados nuevos.

3. **Cobertura frontend necesita criterios más concretos.**  
   Además de crear `CalculoDetailView.test.tsx`, actualizar `PlanificadorSemanalView.test.tsx` o dividir sus suites. Casos mínimos: render de filas de trazabilidad diaria, alerta histórico sin snapshot, no mostrar alerta con snapshot completo, badges domingo/festivo/novedad en planificador, confirmación con pre-cálculo vigente, loading/error/empty de detalle diario.

4. **Accesibilidad de modales si se toca el editor diario.**  
   `CeldaDiaEditor` usa modal manual. Si se modifica para mostrar contexto festivo/evidencia, conviene migrarlo al `Modal` compartido o cubrir `aria-labelledby`, Escape, foco atrapado y bloqueo de scroll.

### Menores

1. Mantener todos los textos de UI en español con acentos: “Cálculo”, “históricos”, “Trazabilidad diaria”, “Festivo”, “Domingo”.
2. Evitar duplicar tipos de planificador entre `horasExtras.ts` y `horasExtrasPlanificador.ts`; agregar tipos de trazabilidad en archivo dedicado o re-export controlado.
3. Usar variables CSS/tokens (`var(--color-*)`) y variantes de `Badge`/`Callout`; no introducir `bg-slate-*`, `text-red-*` o colores Tailwind hardcodeados nuevos.

## Cambios sugeridos al plan

- Insertar una fase frontend previa de modularización:
  - `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/components/TrazabilidadDiariaSection.tsx`
  - `.../components/trazabilidadDiariaColumns.tsx` o equivalente
  - `frontend/src/types/horasExtrasTrazabilidad.ts`
  - service dedicado o split de `horasExtrasService.ts` antes de superar 550 líneas.
- Definir contrato backend/frontend para snapshot diario y estado histórico.
- Exigir `Callout` para alerta de históricos y `DataTable`/tabla reusable con sticky header y mobile fallback.
- En planificador, definir origen de festivos y política de pre-cálculo vigente antes de confirmar.
- Dividir tests grandes y agregar los escenarios frontend descritos arriba.

## Required checks

No ejecutados por restricciones del revisor. Deben correr desde `frontend/` al implementar:

- `npm run lint`
- `npm run test -- --run src/tests/CalculoDetailView.test.tsx`
- `npm run test -- --run src/tests/PlanificadorSemanalView.test.tsx`
- `npm run test`
- `npm run build`

## Design-system risks

- Alto riesgo de tabla ad hoc con tags HTML y colores hardcodeados si el plan no obliga a componente reutilizable.
- Alto riesgo de superar límites de tamaño por añadir lógica en `PlanificadorSemanalView`, `horasExtras.ts` y `horasExtrasService.ts`.
- Riesgo UX en móvil por tabla con muchas columnas sin fallback compacto.

## Blocking reasons

El plan no está listo para implementación frontend hasta cerrar: modularización por límite de líneas, contrato explícito de histórico/snapshot, patrón de tabla/alerta design-system y fuente/gating de festivos antes de confirmar.

Frontend review: blocked
