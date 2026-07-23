# Frontend review — useApi JWT/401 (revisión posterior)

**Fecha:** 2026-07-23  
**Alcance:** `frontend/src/hooks/useApi.ts`, `frontend/src/hooks/useApi.test.tsx` (working tree)  
**Veredicto:** approved

## Findings bloqueantes residuales

Ninguno.

## Evidencia y checks

- Evidencia suministrada: **18 tests PASS, ESLint PASS, build PASS**.
- No se reejecutaron comandos; el rol de revisión no está autorizado para ejecutar tests ni build.

## Design-system risks

No aplica: el alcance contiene un hook y sus pruebas, sin renderizado ni estilos.

## Blocking reasons

Ninguno. El 401 terminal ahora cierra `loading`, establece el error y despacha logout; el rechazo del refresh sigue el mismo flujo; los logs omiten query, fragmento y detalles sensibles; las pruebas limpian mocks, globals y `localStorage`.
