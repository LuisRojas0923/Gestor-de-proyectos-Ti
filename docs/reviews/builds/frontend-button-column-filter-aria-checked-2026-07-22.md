# Revisión frontend final read-only — contrato `aria-checked`

**Fecha:** 2026-07-22  
**Build revisado:** corrección final del contrato ARIA del filtro de columnas  
**Modo:** revisión estática read-only  
**Alcance:** `frontend/src/components/atoms/Button.tsx`, `frontend/src/components/molecules/ColumnFilterPopover.tsx` y `frontend/src/components/__tests__/ConsolidatedTableById.test.tsx`  
**Resultado:** `approved_with_risks`

## 1. Veredicto

La corrección solicitada quedó verificada y no presenta bloqueos en el alcance:

- `ButtonProps` declara `'aria-checked'?: boolean | 'mixed'`.
- `ariaChecked` se desestructura y se reenvía directamente como `aria-checked={ariaChecked}` al `<button>` nativo, por lo que `false` no se pierde y `mixed` queda soportado.
- `ColumnFilterPopover.tsx` importa únicamente `Button`, `Input` y `Text`; el import muerto `Checkbox` ya no existe.
- `ConsolidatedTableById.test.tsx` comprueba en el DOM `aria-checked="true"` antes del click y `aria-checked="false"` después de desmarcar la opción.

La semántica `role="checkbox"` del consumidor es compatible con el atributo. No se alteraron el portal, posicionamiento fijo, Escape, click fuera, autofocus, foco del trigger, layout mobile-first ni los estados de la tabla. Los tres archivos revisados están por debajo del límite de 550 líneas.

## 2. Hallazgos

### Bloqueantes

Ninguno.

### No bloqueantes / riesgos

1. **Riesgo de baseline del repositorio — bajo:** la evidencia reporta fallos en `tsc -b` y en el lint global por problemas preexistentes y ajenos a estos tres archivos. Deben mantenerse identificados y resolverse en un seguimiento separado antes de exigir una puerta global completamente verde.
2. **Deuda de design system — baja y preexistente:** permanecen clases de color Tailwind heredadas en componentes relacionados; la corrección revisada solo cambia contrato ARIA/imports/prueba y no introduce deuda visual nueva.

## 3. Evidencia de checks

Evidencia proporcionada para este estado final:

- Suite frontend: **PASS — 146 passed, 2 skipped**.
- Build: **PASS**.
- Lint focalizado: **PASS**.
- `tsc -b`: **FAIL**, por problemas preexistentes ajenos al alcance.
- Lint global: **FAIL**, por problemas preexistentes ajenos al alcance.

El revisor no ejecutó npm/build por las restricciones del modo read-only; la validación estática y la evidencia indicada son coherentes con la corrección aplicada.

## 4. Decisión final

**Aprobado con riesgos (`approved_with_risks`) para los tres archivos revisados.** No hay razones bloqueantes para esta corrección. Se recomienda corregir el baseline de `tsc -b` y lint global y repetir ambas puertas en una revisión de alcance completo.
