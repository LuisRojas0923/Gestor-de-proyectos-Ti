# Frontend review — horas extras final rereview — 2026-07-09

Frontend review: blocked

## Alcance revisado

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PreLiquidacionView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/hooks/useEmpleadoERP.ts`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/utils/preLiquidacionUtils.ts`
- `frontend/src/components/molecules/DataTable.tsx`
- `frontend/src/components/molecules/Modal.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/components/EmpleadosActivosPanel.tsx`
- `frontend/src/tests/PlanificadorSemanalView.test.tsx`
- `frontend/src/services/horasExtrasService.ts`
- `frontend/src/types/horasExtras.ts`

## Findings

### Blockers

1. **Límite de 550 líneas aún excedido en archivos tocados.** Medición local vía lectura directa del workspace:
   - `PreLiquidacionView.tsx`: 577 líneas.
   - `DataTable.tsx`: 551 líneas.
   - `PlanificadorSemanalView.test.tsx`: 587 líneas.
   Esto bloquea por `skill_clean_architecture`: ningún archivo debe superar 550 líneas. `PlanificadorSemanalView.tsx` queda en 529 y `EmpleadosActivosPanel.tsx` en 549, ambos dentro del límite pero cerca del tope.

2. **`useEmpleadoERP` puede dejar el cálculo bloqueado por loading stale.** Si la cédula pasa de válida a vacía/corta mientras hay una consulta ERP en vuelo, la rama `cedulaLimpia.length < 5` limpia empleado/salario/error pero no limpia `cargandoEmpleado`; el `finally` de la consulta anterior no lo limpia porque `cancel=true`. Resultado UX: “Consultando empleado en ERP...” puede quedar permanente y el botón `Calcular` queda deshabilitado. En esa rama también conviene resetear el nivel ARL mostrado para evitar dato visual stale.

### Validado sin bloqueo

- `salario` y `nivel` ahora vienen de `useEmpleadoERP(cedula)` y los campos se muestran deshabilitados/read-only.
- El payload de `ejecutarPreLiquidacion` ya no envía `salario_base_mensual` ni `nivel_riesgo_arl`; solo envía cédula, semana, registro, jornada nocturna y OT. La confirmación persiste los valores devueltos por el backend en `resultado`.
- El endpoint ERP se referencia mediante `API_ENDPOINTS.ERP_EMPLEADO(...)`, no como string hardcodeado en el servicio.
- `Modal` incorpora mejoras de accesibilidad: `role="dialog"`, `aria-modal`, `aria-labelledby`, foco inicial, trap de Tab, Escape y bloqueo de scroll del body.
- `DataTable` cubre la limpieza de búsqueda remota con test específico.

## Required checks

- No ejecutados por este subagente por restricción de solo lectura/no build.
- Evidencia reportada por el solicitante: ESLint aislado de archivos tocados sin salida y `npm run build` verde.
- Antes de merge: `cd frontend && npm run lint`, `npm run test`, `npm run build`.

## Design-system risks

- `PreLiquidacionView.tsx` conserva tablas HTML crudas y clases cromáticas Tailwind legacy (`text-slate-*`, `bg-amber-*`, `text-green-*`) en zonas tocadas; no agrego como blocker adicional porque el bloqueo principal es arquitectura/tamaño, pero al extraer conviene migrar advertencias a `Callout` y tokens CSS cuando aplique.

## Blocking reasons

- Exceso real de líneas en tres archivos tocados.
- Riesgo UX reproducible en `useEmpleadoERP` por estado de carga stale al limpiar/acortar la cédula durante una consulta.
