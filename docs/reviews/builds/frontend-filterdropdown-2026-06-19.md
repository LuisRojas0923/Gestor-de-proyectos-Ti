# Frontend review: FilterDropdown positioning fix — 2026-06-19

## Resultado

**Frontend review: blocked**

El ajuste corrige la causa principal reportada para `DataTable` cuando recibe un `DOMRect` de `getBoundingClientRect()` (usar `bottom` y no sumar `scrollX/scrollY` es coherente con `position: fixed` + portal). Sin embargo, el cambio introduce regresiones de contrato en usos controlados existentes de `FilterDropdown` y deja riesgos de edge detection/mobile.

## Alcance revisado

- `frontend/src/components/molecules/FilterDropdown.tsx`
- `frontend/src/components/molecules/DataTable.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/EmpleadosActivosView.tsx`
- Usos existentes relacionados: `MultiSelect`, `Formato2276DataTable`, `ConsolidatedTableById`, catálogo de moléculas.

## Findings

### F1 — Alta / bloqueante — Regresión en modo controlado con anchors custom sin `bottom`

`FilterDropdown` ahora normaliza anchors controlados así:

```ts
top: anchorRect.bottom ?? anchorRect.top + triggerHeight
```

Esto es correcto para callers que pasan un `DOMRect` real, como `DataTable`, porque `bottom` existe. Pero rompe callers que ya pasaban `top` como coordenada de apertura inferior del trigger.

Caso existente:

- `frontend/src/components/atoms/MultiSelect.tsx` calcula `dropdownPos.top = rect.bottom` y no incluye `bottom`.
- Con la nueva normalización queda `rect.bottom + triggerHeight` y luego `+ 4`, desplazando el dropdown ~44px hacia abajo.

Impacto: regresión visible en `MultiSelect` y cualquier uso controlado que haya seguido el contrato anterior `{ top, left, width }` con `top` como punto de apertura. Bloquea porque `FilterDropdown` es compartido y el cambio no migró todos los consumidores ni preservó compatibilidad.

Recomendación: normalizar a `{ triggerTop, triggerBottom, left, width }`; para `DOMRect` usar `top/bottom`, y para anchors custom preservar el contrato anterior o migrar explícitamente los callers para que envíen `bottom`. Evitar interpretar `top` de forma distinta sin actualización de todos los consumidores.

### F2 — Media — Apertura hacia arriba usa la coordenada inferior como si fuera superior

Al abrir hacia arriba, el cálculo actual usa `effectiveAnchor.top`, que ahora representa el `bottom` del trigger. Resultado: el popover puede solaparse con el botón/encabezado por aproximadamente la altura del trigger.

```ts
top: Math.max(viewportMargin, effectiveAnchor.top - height - 8)
```

Para un `DOMRect`, debería usar `anchorRect.top - height - 8` al abrir hacia arriba y `anchorRect.bottom + 4` al abrir hacia abajo. No bloquea por sí solo el caso de empleados si el header queda con espacio inferior, pero es una regresión probable en filtros cercanos al borde inferior.

### F3 — Media — Clamp horizontal incompleto en mobile / anchors anchos

El nuevo clamp limita `left`, pero no limita `width`:

```ts
const dropdownWidth = Math.max(effectiveAnchor.width, 280);
left: Math.max(12, Math.min(position.left, window.innerWidth - dropdownWidth - 12));
width: dropdownWidth;
```

Si `effectiveAnchor.width > window.innerWidth - 24` (frecuente en selects full-width mobile), el popover queda con `left: 12` pero se sale por la derecha. Riesgo mobile-first. Recomendación: `width = Math.min(Math.max(anchorWidth, 280), window.innerWidth - 24)` o usar `maxWidth: calc(100vw - 24px)` manteniendo `min-width` adaptable.

### F4 — Baja / riesgo existente — Sin reposicionamiento al redimensionar o cambiar viewport mientras está abierto

El cálculo se ejecuta al abrir/cambiar anchor, pero no escucha `resize`, `orientationchange` ni scroll de ventana. Con el input autofocus, el teclado móvil puede cambiar `innerHeight` y dejar el popover fuera de lugar. No bloquea este fix, pero conviene cubrirlo si se endurece el comportamiento mobile.

## Validación de checklist

- Design system: usa `Text`, `Button`, `Input` y portal; sin endpoints/API involucrados.
- Tablas: el fix mejora el caso `DataTable` con `DOMRect` + `fixed`, pero introduce regresión en otros consumidores controlados.
- Mobile-first: riesgo por ancho no clamped y viewport dinámico.
- Accesibilidad: `Escape` agregado correctamente para cierre de popover; no aplica `role="dialog"` porque es popover/filtro, no modal.
- Type safety: sin `catch (err: any)` en los archivos revisados del fix.
- Tamaño de archivos revisados: bajo el límite de 550 líneas (`FilterDropdown` 406, `DataTable` 360, `EmpleadosActivosView` 316).

## Verificaciones reportadas

- ESLint focalizado en `FilterDropdown.tsx`, `DataTable.tsx`, `EmpleadosActivosView.tsx`: pasado sin salida.
- `npm run build`: pasado.
- `npx vitest run src/tests/horasExtrasService.test.ts`: 33 tests pasados.
- `frontend/dist/index.html`: restaurado sin diff.

## Required checks antes de merge

- Corregir F1 y revalidar manualmente:
  - `DataTable` en empleados activos: filtro abre debajo del header correcto.
  - `MultiSelect`: dropdown abre pegado al trigger, no ~40px abajo.
  - Un filtro cerca del borde inferior abre hacia arriba sin solapar el trigger.
  - Vista móvil estrecha: no hay overflow horizontal del popover.
- Ejecutar desde `frontend/`:
  - `npm run lint`
  - `npm run test`
  - `npm run build`

## Design-system risks

- Mantener portal + `fixed` es correcto para evitar recortes por `overflow` en tablas.
- El contrato de `anchorRect` debe quedar explícito; hoy mezcla `DOMRect` y objeto parcial con semánticas diferentes para `top`.

## Blocking reasons

- F1 bloquea: el fix cambia la semántica de `anchorRect.top` para objetos custom y desplaza `MultiSelect`/consumidores controlados existentes.
