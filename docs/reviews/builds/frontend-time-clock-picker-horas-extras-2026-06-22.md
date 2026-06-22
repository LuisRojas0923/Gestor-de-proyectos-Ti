# Frontend review — TimeClockPicker circular para horas extra

**Fecha:** 2026-06-22  
**Resultado:** `approved_with_risks`  
**Alcance revisado:**

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/components/TimeClockPicker.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/components/CeldaDiaEditor.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/components/TablaPlanificacion.tsx`
- `frontend/src/components/atoms/Button.tsx`
- `frontend/src/tests/PlanificadorSemanalView.test.tsx`
- Diff asociado: eliminación de `SelectorEmpleados.tsx` y copy de estado vacío en `TablaPlanificacion`.

## Resumen

El cambio es aceptable para continuar: el nuevo `TimeClockPicker` usa componentes del sistema (`Button`, `Text`, `Badge`, `Modal`/`MaterialCard`), conserva formato `HH:mm`, elimina el `any` del átomo `Button`, mantiene el planificador bajo el límite de 550 líneas y actualiza pruebas del flujo principal. Tras la revisión inicial se mitigaron los riesgos principales: el editor de celda usa presentación inline para evitar modal anidado, el dial cambió a 12 posiciones + AM/PM, el `12` queda arriba como reloj convencional y el tamaño base se redujo para una UI más compacta.

## Hallazgos

### Riesgo mitigado — Accesibilidad y modal anidado en `CeldaDiaEditor`

Inicialmente `TimeClockPicker` abría el `Modal` compartido desde dentro de `CeldaDiaEditor`, que ya es un diálogo manual (`role="dialog"`, `aria-modal="true"`). Esto creaba un flujo de modal dentro de modal. Se mitigó agregando `presentation="inline"` en `CeldaDiaEditor`, por lo que el selector se despliega como panel inline (`MaterialCard`) dentro del mismo diálogo y no abre un segundo modal.

**Impacto residual:** `CeldaDiaEditor` sigue siendo un diálogo manual heredado sin focus trap ni `Escape`; no fue introducido por este cambio.  
**Recomendación:** migrar `CeldaDiaEditor` al `Modal` compartido o elevar una molécula `Dialog` con `aria-labelledby`, focus trap, cierre con `Escape`, retorno de foco y bloqueo de scroll stack-aware.

### Riesgo medio — Responsive móvil del dial circular

`TimeClockPicker` fue ajustado a un tamaño base `h-52 w-52` con `sm:h-56 sm:w-56` y el modal usa `contentClassName="!p-3 sm:!p-4"`. En `CeldaDiaEditor`, los campos de hora ocupan `col-span-2` para que el panel inline tenga ancho suficiente.

**Impacto residual:** el radio de posicionamiento sigue siendo fijo porque los botones del dial usan geometría dinámica; si se reutiliza en contenedores más estrechos, conviene medir visualmente.

### Riesgo medio — UX inconsistente por vistas secundarias con `type="time"`

El cambio reemplaza `type="time"` en el horario masivo del planificador y en `CeldaDiaEditor`, pero siguen apareciendo inputs nativos en:

- `HorarioSemanaView.tsx`
- `PreLiquidacionView.tsx`
- `components/DefaultHorarioSemana.tsx`

**Recomendación:** no bloquear este cambio si el alcance era el planificador de horas extra, pero planificar una migración gradual para evitar una experiencia mixta. `DefaultHorarioSemana` aún está cubierto por pruebas que editan `input type=time`, por lo que conviene decidir si queda como legacy o se actualiza con tests equivalentes del picker.

### Riesgo bajo — Tokens de color

El componente usa mayormente variables CSS (`--color-*`), pero el estado seleccionado del dial usa `text-white`. Es coherente con contraste sobre `--color-primary`, aunque la regla del proyecto prefiere tokens/variables.

**Recomendación:** cambiar a un token equivalente cuando exista (`text-[var(--color-surface)]` o variable semántica de contraste) para cumplir estrictamente el design system.

### Riesgo bajo — Granularidad de minutos

El picker muestra minutos en pasos de 5 (`00, 05, ... 55`). `parseTime` acepta cualquier `HH:mm`; si llega `07:59`, el dial marca el minuto redondeado visualmente mientras el valor confirmado sin tocar minutos puede seguir siendo `07:59`.

**Recomendación:** validar si negocio requiere cualquier minuto o múltiplos de 5. Si requiere múltiplos de 5, normalizar al abrir/confirmar; si requiere cualquier minuto, ofrecer selección de 60 minutos o entrada complementaria accesible.

## Diseño system / arquitectura

- Correcto: se reutilizan átomos/moléculas (`Button`, `Text`, `Badge`, `Input`, `Select`, `Textarea`, `MaterialCard`, `Modal`).
- Correcto: `Button` elimina `any` en `icon` y añade `style?: React.CSSProperties`, necesario para posicionamiento dinámico del dial. Vigilar que `style` no se use para colores/tema fuera de casos geométricos.
- Correcto: no se detectan `catch (err: any)` en el alcance revisado.
- Correcto: no se introducen endpoints hardcodeados; se siguen usando servicios existentes.
- Correcto: textos visibles revisados están en español.
- Correcto: archivos bajo 550 líneas: `PlanificadorSemanalView.tsx` 489, `TimeClockPicker.tsx` 142, `CeldaDiaEditor.tsx` 137, `TablaPlanificacion.tsx` 209, `Button.tsx` 150, test 380.
- Ajuste posterior: `TimeClockPicker` quedó en 198 líneas tras agregar presentación inline, 12 posiciones + AM/PM, dial compacto y controles de cancelar/limpiar/aceptar.

## Eliminación de `SelectorEmpleados`

La eliminación es coherente si la fuente de selección pasa a ser `EmpleadosActivosView`. El estado vacío de `TablaPlanificacion` ahora guía al botón **Empleados**, y las pruebas cubren recuperación de selección desde borrador. No veo regresión funcional evidente en el planificador, con la salvedad de confirmar que producto acepta retirar búsqueda inline del flujo principal.

## Checks requeridos

Reportados por el implementador:

- `npx vitest run src/tests/PlanificadorSemanalView.test.tsx` — 13 passed.
- `npx eslint` sobre archivos tocados — OK.
- `npm run build` — OK con warnings existentes de Browserslist/chunk size.
- `git diff --check` — solo warnings CRLF.

Re-ejecutado tras mitigaciones:

- `npx vitest run src/tests/PlanificadorSemanalView.test.tsx` — 13 passed.
- `npx eslint` sobre archivos tocados — OK.
- `npm run build` — OK con warnings existentes de Browserslist/chunk size.

No se re-ejecutaron comandos de build/test desde esta revisión por las restricciones del subagente; la evidencia reportada es suficiente para esta aprobación con riesgos.

## Veredicto

`approved_with_risks`

**Bloqueantes:** ninguno.  
**Antes de ampliar el patrón:** decidir si las vistas secundarias legacy también migran desde `type="time"` y si negocio requiere minutos arbitrarios o múltiplos de 5.
