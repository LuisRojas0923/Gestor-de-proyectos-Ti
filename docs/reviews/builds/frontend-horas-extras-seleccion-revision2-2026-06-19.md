# Frontend review — horas extras selección empleados (revisión 2)

**Fecha:** 2026-06-19
**Alcance:**

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/EmpleadosActivosView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/utils/planificadorDraft.ts`
- `frontend/src/components/molecules/DataTable.tsx`

**Estado:** `approved_with_risks` — no hay bloqueos funcionales detectados en el fix principal; quedan riesgos no bloqueantes de UX/cobertura.

## Hallazgos por severidad

### Críticos / Bloqueantes

- Ninguno.

### Medios

1. **Cobertura de regresión incompleta para el caso corregido.**
   La implementación permite desmarcar un empleado no autorizado si ya estaba seleccionado (`EmpleadosActivosView.tsx:159-166`), pero no encontré test que cubra explícitamente el flujo `autoriza_he=false` previamente seleccionado → vista "NO/Todos" → checkbox habilitado → desmarcar → borrador actualizado. El mock contiene `789` no autorizado, pero no hay aserción sobre el caso corregido.

2. **Borrador robusto, pero aún acepta selecciones sin `empleadosInfo` consistente.**
   `normalizarBorradorPlanificador` normaliza tipos básicos (`planificadorDraft.ts:80-100`), pero conserva `seleccionados` aunque `empleadosInfo` venga vacío o inválido. En el planificador esto puede rehidratar cédulas sin detalle ERP, degradando validación cliente/UX hasta que backend rechace o el usuario recargue datos. No bloquea el flujo normal porque `EmpleadosActivosView` guarda `empleadosInfo` filtrado por seleccionados (`EmpleadosActivosView.tsx:138-150`).

3. **Acción masiva “Incluir visibles” puede ser no-op sin feedback.**
   Con filtro “Autorizado HE: NO” o una lista visible sin autorizados, el botón queda habilitado si hay filas (`EmpleadosActivosView.tsx:378-380`) pero `incluirVisibles` omite todos los no autorizados (`EmpleadosActivosView.tsx:179-188`). UX aceptable pero confusa: no hay mensaje ni estado deshabilitado específico.

### Bajos

1. **Texto accesible del checkbox puede ser más claro al desmarcar.**
   El `aria-label` siempre dice “Seleccionar …” (`EmpleadosActivosView.tsx:214`); el estado checked nativo ayuda, pero para TTS sería más explícito alternar “Seleccionar/Desmarcar”.

2. **Riesgo de deuda visual preexistente en tokens.**
   En archivos del alcance persisten clases hardcodeadas como `border-blue-500` en el spinner de `DataTable.tsx:251` y `red-*` en el alert de `EmpleadosActivosView.tsx:392-393`. No parecen introducidas por este fix, pero siguen fuera del estándar estricto de variables CSS/tokens.

## Verificaciones positivas

- El caso principal queda cubierto a nivel de lógica: un empleado ya seleccionado no autorizado no queda bloqueado por `disabled`, porque `puedeSeleccionarEmpleado` retorna `true` si la cédula ya está en `seleccionados`.
- La persistencia preserva el borrador existente y limpia resultados derivados (`preCalculo`, `resultado`, `erroresConfirmacion`) cuando cambia la selección.
- `DataTable` corrige el affordance visual: ya no muestra `cursor-pointer` cuando no hay `onRowClick`.
- Los tres archivos cumplen límite de 550 líneas: 435, 116 y 360 líneas respectivamente.
- La UI usa mayoritariamente átomos/moléculas existentes (`Button`, `Checkbox`, `Input`, `Select`, `Badge`, `MaterialCard`, `Text`, `Title`, `DataTable`).
- Layout mobile-first conservado (`flex-col` base con `lg:`/`sm:` para expansión).
- Estados de carga, vacío y error presentes en la vista.
- Tipado de errores correcto: `catch (e: unknown)` + `instanceof Error`.

## Required checks

No ejecutados por restricciones del subagente. Antes de merge, ejecutar desde `frontend/`:

- `npm run lint`
- `npm run test -- src/tests/PlanificadorSemanalView.test.tsx`
- `npm run test`
- `npm run build`

## Design-system risks

- No hay reimplementación nueva de botones/inputs/checkboxes fuera del sistema atómico.
- Riesgo no bloqueante: colores Tailwind semánticos hardcodeados preexistentes en spinner/alert deberían migrarse a tokens (`var(--color-*)`) en una limpieza posterior.

## Blocking reasons

- Ninguno. Estado final: `approved_with_risks`.
