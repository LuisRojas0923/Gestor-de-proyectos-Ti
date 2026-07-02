# Frontend review — /service-portal/horas-extras

Frontend review: approved_with_risks

## Alcance revisado

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/components/PlanificadorHeader.tsx` (nuevo)
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/components/TablaPlanificacion.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/components/ResumenPlan.tsx`

## Hallazgos

1. **Media — no bloquea — `TablaPlanificacion.tsx:32-35`, `:150-152`, `:195`**
   - Se mantienen clases Tailwind semánticas directas (`bg-green-*`, `text-yellow-*`, `text-red-*`) para los estados de HE/error. Aunque funcionan en claro/oscuro, no pasan por tokens del design system ni por variantes centralizadas.
   - Riesgo: deriva visual entre temas y duplicación de lógica cromática fuera de átomos/moléculas.
   - Recomendación: migrar `colorHE` a tokens CSS/variantes de `Badge` o a una utilidad semántica centralizada.

2. **Media — no bloquea — `PlanificadorSemanalView.tsx:303-306`**
   - El CTA principal `Confirmar semana` aún usa `window.confirm`. Es deuda previa, pero queda visible en el nuevo flujo UX/UI y no cumple el patrón de modal accesible del sistema.
   - Riesgo: experiencia visual inconsistente y menor control de accesibilidad/foco.
   - Recomendación: reemplazar por modal/molecule de confirmación con `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape, focus trap y body scroll lock.

3. **Baja — no bloquea — `PlanificadorHeader.tsx:93-108`**
   - Los inputs de Año/Semana usan `Input label=...`, pero el átomo `Input` actual no asocia programáticamente el label al input mediante `htmlFor`/`id`.
   - Riesgo: algunos lectores de pantalla podrían no anunciar correctamente el nombre del campo.
   - Recomendación: mejorar el átomo `Input` para generar/asociar `id`, o pasar una estrategia accesible equivalente.

4. **Baja — no bloquea — `PlanificadorHeader.tsx:99`, `:107`**
   - El parseo `Number(e.target.value) || valorActual` revierte el campo cuando el usuario lo deja vacío durante edición.
   - Riesgo: fricción menor en teclado/móvil al cambiar año o semana.
   - Recomendación: permitir estado temporal vacío o validar en `onBlur`.

## Verificaciones de checklist

- **Design system:** aprobado con riesgos. El cambio usa mayoritariamente `MaterialCard`, `Button`, `Input`, `Badge`, `Text`, `Title`, `Select`, `Textarea`, `Checkbox`. Excepción aceptable: tabla HTML semántica y celda-botón custom con `@audit-ok`; riesgo pendiente por colores directos.
- **Mobile-first:** aprobado. Grids parten de 1/2 columnas y escalan con `md/lg/xl`; tabla conserva `overflow-auto` y `min-w` para matriz densa.
- **Performance:** aprobado. Límite de selección de 200 empleados, `useMemo` para índices de pre-cálculo y tabla con `max-h` + header sticky. No se observa regresión relevante.
- **Estados UX:** aprobado. Empty state más accionable, badges de estado, loading nativo del átomo `Button`, disabled en CTAs y feedback por notificaciones.
- **Accesibilidad:** aprobado con riesgos. Hay `aria-label` en navegación/celdas/empty state y focus visible en celdas; quedan riesgos por `window.confirm` y asociación de labels del átomo `Input`.
- **Type safety:** aprobado. No hay `catch (err: any)`; se usa `unknown` + `instanceof Error`.
- **API:** aprobado. No se agregan endpoints hardcodeados; las llamadas siguen en `horasExtrasService`.
- **File size:** aprobado. Archivos revisados bajo 550 líneas (`PlanificadorSemanalView.tsx` 474, `PlanificadorHeader.tsx` 127, `TablaPlanificacion.tsx` 209, `ResumenPlan.tsx` 94).
- **Textos:** aprobado. Textos de usuario en español.

## Required checks

- Reportados por el implementador: `npm run build` pasó.
- Reportados por el implementador: `npx eslint` sobre los 4 archivos tocados pasó.
- Reportado por el implementador: `npm run lint` global falla por deuda existente fuera del cambio, sin errores en los archivos tocados.
- Recomendado antes de merge si hay suite disponible: `npm run test` desde `frontend/` o test dirigido del módulo de horas extras.

## Design-system risks

- Colores semánticos directos en celdas/errores de tabla.
- Confirmación nativa del navegador en el CTA principal.
- Label accesible depende de una limitación del átomo `Input`.

## Blocking reasons

Ninguno. La revisión queda **approved_with_risks** por deudas no bloqueantes de design-system/accesibilidad.
