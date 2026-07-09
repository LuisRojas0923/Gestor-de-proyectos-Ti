# Frontend review: PreLiquidación ERP salario/ARL — 2026-07-08

Frontend review: blocked

## Findings

1. **Alta — `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PreLiquidacionView.tsx:579`**  
   El archivo queda en 579 líneas, por encima del límite obligatorio de 550. Aunque se extrajo `preLiquidacionUtils`, la página sigue violando la regla de arquitectura limpia. Extraer la tabla de jornada, el bloque de resultado/desglose o hooks de carga de festivos/novedades antes de aprobar.

2. **Media — `frontend/src/services/horasExtrasService.ts:56,199`**  
   El endpoint ERP nuevo se arma con `ERP_BASE = `${API_CONFIG.BASE_URL}/erp`` y `'/empleado/'` en el servicio. La guía exige referenciar endpoints desde `config/api.ts`; ya existe `API_ENDPOINTS.ERP_EMPLEADO`. Usar esa constante evita duplicación y drift de rutas.

3. **Media — `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PreLiquidacionView.tsx:367-378,517-523`**  
   La vista modificada conserva tabla HTML cruda y banners/listas inline con colores Tailwind hardcodeados (`text-slate-*`, `bg-amber-*`, `text-green-*`). Riesgo de incumplimiento del design system y dark mode inconsistente. Preferir componentes existentes (`DataTable`/subcomponente específico, `Callout`, tokens `var(--color-*)`).

4. **Media — `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/hooks/useEmpleadoERP.ts:29-35` y `PreLiquidacionView.tsx:481`**  
   Cuando el ERP responde empleado sin salario, el botón queda bloqueado y el guard de `handleCalcular` no puede mostrar feedback porque el usuario no puede accionarlo. El error está atado al input de cédula, pero no hay estado/callout junto a los campos de salario/ARL ni acción de reintento. Riesgo UX, especialmente en móvil si el usuario está en la zona inferior del formulario.

5. **Media — cobertura — `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/hooks/useEmpleadoERP.ts` / `PreLiquidacionView.tsx` / `horasExtrasService.ts`**  
   No se encontró test de `PreLiquidacionView`, `useEmpleadoERP` ni `obtenerEmpleadoERP`. Falta cubrir: salario inicial vacío, consulta exitosa ERP, empleado sin salario, error ERP, campos salario/ARL readOnly/disabled y botón Calcular bloqueado sin salario.

## Required checks

No ejecutados por restricción de revisión. Antes de merge:

- `cd frontend && npm run lint`
- `cd frontend && npm run test`
- `cd frontend && npm run build`
- Añadir/ejecutar tests específicos para `PreLiquidacionView` / `useEmpleadoERP` / `horasExtrasService`.

## Design-system risks

- La página sigue usando estructura tabular cruda e inline banners en vez de componentes/moléculas del sistema.
- Persisten colores Tailwind estáticos en una vista modificada; migrar a tokens CSS.
- La tabla está envuelta con `overflow-x-auto`, pero conviene validar manualmente en móvil que el error ERP y el bloqueo del botón sean visibles sin pérdida de contexto.

## Blocking reasons

- Archivo modificado supera el máximo obligatorio de 550 líneas.
- Endpoint nuevo no usa la constante existente de `config/api.ts`.
