# Frontend review: approved_with_risks

**Scope:** `C:\Users\AMEJOR~1\AppData\Local\Temp\opencode\autogestion-usuarios-erp`  
**Frontend change reviewed:** `frontend/src/pages/Login/RegisterSidebar.tsx`  
**Date:** 2026-07-09

## Findings

- **Bajo — copy aprobado:** el diff frontend está limitado a 3 textos en `RegisterSidebar.tsx`. El nuevo copy está en español y reemplaza correctamente la expectativa de aprobación manual por validación ERP activa: contrato activo antes de habilitar la cuenta y éxito inmediato para iniciar sesión.
- **Bajo — sin regresión responsive por el cambio:** los textos nuevos se renderizan dentro de `Text` existente y en contenedores con `w-full max-w-md`/`overflow-y-auto`; el copy más largo debería envolver sin romper layout móvil.
- **Riesgo preexistente — design system:** el aviso informativo y los estados de éxito/error siguen implementados con `div` + colores Tailwind hardcodeados (`bg-blue-*`, `text-blue-*`, `bg-green-*`, `bg-red-*`) aunque existe `components/molecules/Callout.tsx`. No fue introducido por este cambio textual.
- **Riesgo preexistente — TypeScript:** `catch (err: any)` permanece en `RegisterSidebar.tsx:71`; la regla del proyecto pide `unknown` + `instanceof Error`. No fue introducido por este cambio textual.
- **Riesgo preexistente — accesibilidad modal/sidebar:** `RegisterSidebar` no declara `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, cierre con Escape ni body scroll lock. No fue modificado por este cambio.

## Required checks

- `npm run lint` desde `frontend/`: **pendiente/no verificable** en este worktree; el orquestador reportó que no pudo ejecutarse porque `eslint` no está instalado en `node_modules`.
- `npm run test` desde `frontend/`: recomendado antes de merge; no ejecutado por restricciones del subagente.
- `npm run build` desde `frontend/`: recomendado antes de merge; no ejecutado por restricciones del subagente.

## Design-system risks

- Sin nueva violación de diseño por el cambio de textos.
- Deuda existente recomendada para otro commit: reemplazar los banners inline por `Callout` y migrar colores hardcodeados a tokens/variantes del sistema.

## Blocking reasons

- Ninguno para este scope textual. Resultado: **approved_with_risks** por checks no ejecutados y deuda preexistente en el archivo tocado.
