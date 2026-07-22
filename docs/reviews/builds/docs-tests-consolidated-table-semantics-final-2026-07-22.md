# Revisión docs/tests final — semántica de tabla consolidada

**Fecha:** 2026-07-22  
**Alcance:** `frontend/src/components/__tests__/ConsolidatedTableById.test.tsx`  
**Modo:** revisión estática read-only  
**Resultado:** `approved_with_risks`

## Veredicto

La prueba `mantiene seis columnas sin celda adicional para la franja` verifica el contrato solicitado:

- obtiene seis `columnheader` dentro de la tabla;
- exige `scope="col"` en cada encabezado;
- recorre las filas del `tbody` y exige seis celdas (`role="cell"`) por fila;
- verifica la franja mediante la clase `border-l-[6px]` en la primera celda de datos.

La implementación acompaña estas aserciones: declara `scope="col"` en los seis `th` y conserva la franja como borde CSS de la primera celda, sin una séptima celda tabular.

## Evidencia

- Vitest: **150 passed / 2 skipped**, evidencia proporcionada por el orquestador.
- Build frontend: **exitoso**, evidencia proporcionada por el orquestador.
- Este revisor no ejecutó npm, Vitest ni build por las restricciones read-only.
- `testing/CATALOGO_PRUEBAS.md` ya registra la suite de `ConsolidatedTableById`.
- No aplican cambios de esquema/MER, backend, RBAC ni ADR para este alcance.

## Bloqueos restantes

1. **Ninguno dentro del contrato semántico revisado.**
2. Si la integración exige una puerta TypeScript global verde, permanece el fallo preexistente observado en `frontend/src/components/development/RequirementsTab.tsx:257-272`; es ajeno a esta prueba y a la tabla consolidada.
3. Hardening no bloqueante: la prueba verifica el borde en la primera fila; podría recorrer todas las filas si se quiere proteger explícitamente la franja en cada registro.
