# Frontend review: FilterDropdown fix final — 2026-06-19

## Resultado

**Frontend review: approved_with_risks**

El blocker anterior queda resuelto. La normalización actual mantiene compatibilidad entre `DOMRect` real (`DataTable`, `Formato2276DataTable`, catálogo y formularios revisados) y anchors simples como `MultiSelect` (`top` ya representa `rect.bottom`). El uso de portal + `position: fixed` sin sumar `scrollX/scrollY` es correcto.

## Alcance revisado

- `frontend/src/components/molecules/FilterDropdown.tsx`
- Consumidores directos revisados por contrato de `anchorRect`:
  - `frontend/src/components/molecules/DataTable.tsx`
  - `frontend/src/components/atoms/MultiSelect.tsx`
  - `frontend/src/pages/ServicePortal/pages/GestionHumana/Formato2276DataTable.tsx`
  - `frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/components/EmbargosForm.tsx`
  - `frontend/src/pages/ServicePortal/pages/NOVEDADES_NOMINA/components/OtrosGerenciaForm.tsx`
  - catálogo de moléculas y uso simple en `NominaTable`

## Findings

### F1 — Resuelto — Contrato compatible de `anchorRect`

- Para anchors DOMRect-like con `bottom` y `right`, `effectiveAnchor.top` usa `anchorRect.bottom`, que es la coordenada correcta de apertura inferior para `position: fixed`.
- Para objetos simples sin `right`, preserva `anchorRect.top`. Esto evita la regresión anterior en `MultiSelect`, donde `top` ya venía calculado como `rect.bottom`.
- Ya no se suman `window.scrollY/window.scrollX`, coherente con portal en `document.body` y clase `fixed`.

### F2 — Resuelto en casos normales — Apertura hacia arriba

La apertura hacia arriba ahora descuenta `triggerHeight`:

```ts
top: Math.max(viewportMargin, effectiveAnchor.top - triggerHeight - height - 8)
```

Con `effectiveAnchor.top` representando el borde inferior del trigger, esto evita el solape observado para triggers de altura equivalente al `triggerHeight` configurado.

### F3 — Baja / riesgo residual — Viewports extremadamente estrechos

El cálculo limita `dropdownWidth` a `window.innerWidth - 24` y clampa `left` con margen de 12px, resolviendo el overflow mobile principal. Riesgo menor: la clase `min-w-[280px]` aún puede imponerse sobre el ancho inline en viewports menores a ~304px CSS, reduciendo o rompiendo el margen mínimo. En móviles estándar de 320px+ no debería bloquear.

### F4 — Baja / riesgo existente — Sin reposicionamiento dinámico

El dropdown recalcula posición al abrir/cambiar anchor, pero no en `resize`, `orientationchange`, scroll de ventana o apertura de teclado móvil tras el `autoFocus`. No bloquea este fix, pero conviene endurecerlo si se quiere cerrar el comportamiento mobile al 100%.

## Checklist frontend

- Design system: usa `Text`, `Button`, `Input` y portal; no introduce nuevos primitives críticos en este fix.
- Tablas: mantiene patrón de popover Excel-like fuera de contenedores con overflow y compatible con sticky headers.
- Mobile-first: ancho clamped al viewport para móviles normales; queda riesgo residual por `min-w-[280px]` en anchos extremos.
- Accesibilidad: `Escape` agregado para cierre. `role="dialog"`/focus trap no aplica estrictamente porque es popover de filtro, no modal.
- Type safety: sin `catch (err: any)` ni endpoints hardcodeados en el alcance revisado.
- Tamaño: `FilterDropdown.tsx` queda en 408 líneas, bajo el límite de 550.
- Textos de usuario: en español dentro del componente revisado.

## Verificaciones reportadas por implementación

- `npx eslint "src/components/molecules/FilterDropdown.tsx" "src/components/molecules/DataTable.tsx" "src/components/atoms/MultiSelect.tsx" "src/pages/ServicePortal/pages/HORAS_EXTRAS/EmpleadosActivosView.tsx"`: pasó sin salida.
- `npm run build`: pasó.
- `npx vitest run src/tests/horasExtrasService.test.ts`: 33 tests pasados.
- `frontend/dist/index.html`: restaurado, sin modificación visible en `git status`.

## Required checks antes de merge

- Recomendado ejecutar/verificar desde `frontend/` si aún no se hizo completo:
  - `npm run lint`
  - `npm run test`
  - `npm run build` (ya reportado como pasado)
- Smoke manual recomendado:
  - `DataTable`: filtro de header abre bajo el botón y no se recorta.
  - `MultiSelect`: dropdown abre pegado al trigger, sin offset extra de ~40px.
  - Filtro cerca del borde inferior: abre hacia arriba sin solapar el trigger.
  - Móvil 320px: no hay overflow horizontal.

## Design-system risks

- Riesgo residual heredado: `FilterDropdown` conserva clases Tailwind con colores hardcodeados (`bg-white`, `text-slate-*`, etc.). No fue introducido por este fix, pero sigue desviándose del estándar estricto de tokens CSS.
- Si se ajusta el riesgo F3, preferir eliminar/adaptar `min-w-[280px]` mediante token/clase responsive o `minWidth` calculado, manteniendo el patrón de portal.

## Blocking reasons

Ninguno. El blocker de compatibilidad con anchors simples queda resuelto.
