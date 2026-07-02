Frontend review: approved_with_risks

## Alcance revisado

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/components/SelectorEmpleados.tsx` eliminado
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/components/TablaPlanificacion.tsx`
- `frontend/src/tests/PlanificadorSemanalView.test.tsx`
- Verificación de flujo relacionado: `EmpleadosActivosView.tsx`, `PlanificadorHeader.tsx`, `planificadorDraft.ts`, `TablaPlanificacion.tsx`

## Hallazgos

- **Bloqueantes:** 0
- **Mayores:** 0
- **Menores / riesgos:** 1
  1. La acción de limpiar toda la selección ya no queda disponible en el planificador; ahora se realiza desde `EmpleadosActivosView` mediante “Limpiar selección” o quitando filas una por una desde la tabla. Es consistente con centralizar la selección fuera del planificador, pero es un pequeño riesgo de fricción si hay muchos empleados seleccionados.
- **Riesgo corregido durante implementación:** el empty state de la tabla ya dirige al botón **Empleados** en vez de mencionar una búsqueda local eliminada.

## Validación de diseño y UX

- El selector/card lateral fue removido sin eliminar el botón **Empleados** del header (`PlanificadorHeader` conserva `onAbrirEmpleados`).
- La pantalla queda más simple y mobile-first: desaparece el grid `xl:grid-cols-[360px_minmax(0,1fr)]` y el bloque “Horario masivo” ocupa una sola tarjeta responsiva.
- No se introducen nuevos colores hardcodeados ni componentes UI nuevos fuera del sistema atómico en los cambios revisados.
- Estados de selección vacía, carga/errores de empleados y tabla de empleados activos se mantienen cubiertos por componentes existentes.

## Imports muertos / referencias rotas

- `SelectorEmpleados` ya no aparece referenciado en `frontend/src`.
- `PlanificadorSemanalView.tsx` no conserva imports muertos del selector eliminado.
- `PlanificadorSemanalView.tsx` no conserva setters muertos tras eliminar la selección local.
- `buscarEmpleadosERP` sigue usado en tests por la cobertura de `EmpleadosActivosView`, no es import muerto.

## Flujo EmpleadosActivosView / draft

- `navegarAEmpleados` guarda `PLANIFICADOR_DRAFT_KEY` con selección, `empleadosInfo`, overrides, días destino, plantilla y estados de precálculo/confirmación antes de navegar a `/service-portal/horas-extras/empleados`.
- `EmpleadosActivosView` recupera el draft, permite seleccionar/quitar empleados autorizados y persiste cambios con `guardarBorradorPlanificadorLocal`.
- El regreso al planificador remonta la vista y `leerBorradorPlanificador()` repuebla `seleccionados` y `empleadosInfo`.
- Los tests cubren navegación al botón **Empleados**, recuperación de selección desde empleados activos, selección/quitar no autorizado y payloads de guardar/confirmar.

## Required checks

- Reportados por el implementador:
  - `npx vitest run src/tests/PlanificadorSemanalView.test.tsx` = 13 passed.
  - `npx eslint src/pages/ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView.tsx src/pages/ServicePortal/pages/HORAS_EXTRAS/components/TablaPlanificacion.tsx src/tests/PlanificadorSemanalView.test.tsx` = OK.
  - `npm run build` = OK con warnings existentes de Browserslist/chunk size.
  - `git diff --check` = solo warnings CRLF.
- Check global ejecutado:
  - `npm run lint` falla por deuda existente amplia del repo; no quedan errores reportados en los archivos tocados tras corregir `setEmpleadosInfo` sin uso.

## Design-system risks

- Riesgo bajo: existen elementos HTML crudos heredados (`div`, tabla custom y botón auditado en `TablaPlanificacion`), pero el cambio revisado no introduce una nueva implementación paralela ni nuevos hardcodes de color.
- Riesgo de copy/descubrimiento corregido: el planificador ahora indica que se use **Empleados** para seleccionar y volver al planificador.

## Blocking reasons

- Ninguno.
