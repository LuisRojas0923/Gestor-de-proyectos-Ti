# Frontend review: blocked

## Alcance revisado

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PreLiquidacionView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/hooks/useEmpleadoERP.ts`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/utils/preLiquidacionUtils.ts`
- `frontend/src/services/horasExtrasService.ts`
- `frontend/src/config/api.ts`
- `frontend/src/types/horasExtras.ts`
- Conteo de líneas de archivos frontend modificados relevantes.

## Hallazgos bloqueantes

1. `PreLiquidacionView.tsx` no está en 547 líneas en el worktree revisado: el conteo leído por herramienta es **577 líneas**, por encima del máximo obligatorio de 550.
2. Si el alcance de merge incluye todos los archivos frontend modificados del worktree, también quedan fuera de límite:
   - `frontend/src/components/molecules/DataTable.tsx`: **551 líneas**.
   - `frontend/src/tests/PlanificadorSemanalView.test.tsx`: **587 líneas**.

## Hallazgos no bloqueantes

- La corrección principal está aplicada: `PreLiquidacionView` carga salario/nivel desde `useEmpleadoERP`, muestra salario `disabled/readOnly`, no incluye `salario_base_mensual` ni `nivel_riesgo_arl` en el payload de `ejecutarPreLiquidacion`, y `obtenerEmpleadoERP` usa `API_ENDPOINTS.ERP_EMPLEADO`.
- `useEmpleadoERP` no reinicia `nivel` cuando la cédula queda vacía o con menos de 5 caracteres; el select deshabilitado puede mostrar un nivel ARL anterior aunque salario/empleado estén limpios.
- Persisten deudas de diseño en `PreLiquidacionView`: tablas HTML crudas y colores Tailwind hardcodeados (`text-slate-*`, `bg-amber-*`, `text-green-*`, `bg-slate-*`) en lugar de componentes/tokens del sistema de diseño. No parece introducido por esta corrección, pero sigue siendo riesgo de consistencia visual.
- No vi prueba frontend nueva que cubra el flujo corregido de pre-liquidación: carga ERP, campos deshabilitados/readOnly y payload sin salario/nivel. La prueba de servicio existente todavía permite construir `PreLiquidacionInput` con esos campos opcionales.

## Required checks

- Reportados por el solicitante: ESLint aislado sobre archivos modificados sin salida; `npm run build` verde.
- Pendientes/recomendados antes de merge: `npm run test` desde `frontend/`, idealmente con cobertura específica del flujo de pre-liquidación ERP.

## Design-system risks

- Riesgo medio por deuda existente en tablas y colores hardcodeados de `PreLiquidacionView`.
- Riesgo bajo por display ARL potencialmente obsoleto al limpiar cédula.

## Blocking reasons

- Límite de 550 líneas incumplido en `PreLiquidacionView.tsx` según el worktree actual.
- Límite de 550 líneas también incumplido en `DataTable.tsx` y `PlanificadorSemanalView.test.tsx` si forman parte del mismo paquete de cambios frontend.
