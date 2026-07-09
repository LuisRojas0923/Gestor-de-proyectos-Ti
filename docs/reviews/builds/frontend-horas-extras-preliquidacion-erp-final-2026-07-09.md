# Frontend review — Horas Extras / Pre-liquidación ERP

Fecha: 2026-07-09  
Revisor: frontend-reviewer  
Alcance declarado:

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PreLiquidacionView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/hooks/useEmpleadoERP.ts`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/hooks/useContextoPreLiquidacion.ts`
- `frontend/src/services/horasExtrasService.ts`
- `frontend/src/types/horasExtras.ts`

Archivo relacionado inspeccionado por import directo: `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/utils/preLiquidacionUtils.ts`.

## Resultado

Frontend review: **approved_with_risks**

## Bloqueadores

Ninguno.

## Hallazgos

- Sin hallazgos bloqueantes.
- `PreLiquidacionView.tsx:111-121` construye `PreLiquidacionInput` sin `salario_base_mensual` ni `nivel_riesgo_arl`; el frontend deja de enviar salario/ARL como fuente de verdad para `ejecutarPreLiquidacion`.
- `PreLiquidacionView.tsx:227-240` muestra salario y ARL como campos deshabilitados/read-only, con texto de fuente ERP.
- `useEmpleadoERP.ts:27-37` carga empleado/salario desde `obtenerEmpleadoERP` y no conserva salario hardcodeado por defecto.
- `horasExtrasService.ts:194-216` consume el endpoint ERP mediante `API_ENDPOINTS.ERP_EMPLEADO`, sin string hardcodeado nuevo para esta ruta.
- `PreLiquidacionView.tsx:86-87`, `:130-131`, `:181-182` y `useEmpleadoERP.ts:38-42` mantienen `catch (e: unknown)` + `instanceof Error`, sin `catch (err: any)` nuevo en el alcance.

## Riesgos residuales no bloqueantes

1. `frontend/src/types/horasExtras.ts` tiene 633 líneas, por encima del límite de 550. El archivo ya estaba grande y este cambio lo incrementa; conviene dividir tipos de pre-liquidación/planificador en archivos por dominio.
2. `useEmpleadoERP.ts:8`, `:17`, `:30` conserva fallback visual de ARL (`III`/`I`). No afecta la fuente de verdad del cálculo porque `ejecutarPreLiquidacion` ya no envía ARL, pero si UX exige mostrar únicamente valores explícitos del ERP, debería representarse ARL ausente como “No disponible”.
3. `useEmpleadoERP.ts:23-31` mantiene brevemente el empleado/salario anterior durante el debounce de 400 ms al cambiar una cédula válida. Riesgo UX bajo: podría verse información anterior hasta iniciar la nueva consulta; el backend sigue validando la fuente de verdad.
4. `PreLiquidacionView.tsx:281-391` y `:447-471` mantienen tablas HTML directas y clases de color Tailwind como `text-slate-*`/`bg-amber-*`. Es patrón existente del módulo, no introducido por el cambio ERP, pero sigue siendo deuda frente a design-system/tokens.
5. `horasExtrasService.ts:55` mantiene el `BASE` de Horas Extras como string de ruta. La ruta ERP nueva sí usa `API_ENDPOINTS`, pero queda deuda previa respecto a centralizar endpoints del módulo.

## Required checks

- Reportado por el solicitante: `npm run build` desde `frontend/` pasó.
- Reportado por el solicitante: ESLint focalizado sobre archivos tocados pasó.
- Recomendado antes de merge: `npm run test` desde `frontend/`, idealmente con cobertura focalizada de `PreLiquidacionView`/`useEmpleadoERP` para estados: cargando ERP, salario ausente, error ERP y payload sin salario/ARL.
- Recomendado si el alcance se integra con otros cambios frontend pendientes: `npm run lint` completo desde `frontend/`.

## Design-system risks

- No se observan regresiones nuevas en uso de átomos para inputs, select, botones, badges y tarjetas en el cambio de salario/ARL.
- Permanece deuda existente de tablas/raw HTML y colores Tailwind no tokenizados en la vista.

## Blocking reasons

N/A.
