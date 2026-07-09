# Frontend review — preliquidación firma cálculo rereview — 2026-07-09

Frontend review: approved_with_risks

## No blocking findings

No encontré bloqueos en el alcance re-revisado.

## Alcance revisado

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PreLiquidacionView.tsx`
- `frontend/src/types/horasExtras.ts`
- `frontend/src/types/horasExtrasPlanificador.ts`
- `frontend/src/services/horasExtrasService.ts`
- Contexto leído por imports: `useEmpleadoERP.ts`, `useContextoPreLiquidacion.ts`, `preLiquidacionUtils.ts`.

## Findings

- **Validado — firma de cálculo:** `PreLiquidacionView.tsx` construye la confirmación con `firma_calculo: resultado.firma_calculo`, preservando la firma devuelta por el backend.
- **Validado — tipos sincronizados:** `PreLiquidacionResultado` y `PreLiquidacionConfirmar` declaran `firma_calculo: string`, por lo que el contrato frontend exige el campo tanto al recibir como al confirmar.
- **Validado — tamaño de archivos:** los archivos del alcance quedan bajo el máximo de 550 líneas: `PreLiquidacionView.tsx` 494, `horasExtras.ts` 514, `horasExtrasPlanificador.ts` 169, `horasExtrasService.ts` 524.
- **Validado — endpoint ERP:** `obtenerEmpleadoERP` referencia `API_ENDPOINTS.ERP_EMPLEADO(...)` desde `config/api.ts`; no introduce ruta ERP hardcodeada nueva.
- **Validado — stale loading previo:** el hook contextual `useEmpleadoERP` limpia `cargandoEmpleado`, `salario`, `empleadoERP`, `nivel` y `errorEmpleado` cuando la cédula queda vacía/corta, resolviendo el riesgo de botón bloqueado por loading obsoleto.

## Residual risks

- **Diseño/DS:** `PreLiquidacionView` conserva tablas HTML crudas y clases Tailwind cromáticas legacy (`text-slate-*`, `bg-amber-*`, `text-green-*`, `bg-slate-*`) en la tabla de jornada, advertencias y desglose. No lo bloqueo en esta re-revisión porque no parece introducido por la corrección focal, pero conviene migrar gradualmente a tokens CSS, `Callout` y/o componentes tabulares aprobados.
- **Tipos:** aún existe duplicación menor de `EmpleadoERPRead` / `EmpleadoERPListResponse` entre `horasExtras.ts` y `horasExtrasPlanificador.ts`; el servicio ya importa la versión del planificador, pero queda riesgo bajo de drift si se editan ambos.
- **Arquitectura:** `horasExtras.ts` (514) y `horasExtrasService.ts` (524) están dentro del límite, pero cerca del tope; futuras adiciones deberían extraerse por dominio para no reincidir.
- **Cobertura:** no vi evidencia de test específico nuevo para `PreLiquidacionView` / `useEmpleadoERP` / `obtenerEmpleadoERP` que cubra firma, empleado ERP sin salario y campos readOnly/disabled.

## Required checks

- Reportados por el solicitante: build verde y ESLint focal verde.
- No ejecutados por este subagente por restricción read-only/no build.
- Recomendados antes de merge: `cd frontend && npm run lint`, `npm run test`, `npm run build`, más test focal del flujo de pre-liquidación si aún no existe.

## Design-system risks

- Riesgo medio por deuda existente de tablas/banners inline y colores hardcodeados en `PreLiquidacionView`.
- Riesgo bajo por duplicación residual de tipos ERP del planificador.

## Blocking reasons

- Ninguno.
