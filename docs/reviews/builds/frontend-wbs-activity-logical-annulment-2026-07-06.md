# Frontend review: approved_with_risks

Scope: WBS activity logical annulment UI (`WbsTab.tsx`, `DeleteActivityModal.tsx/test`, `WbsDetailModal.tsx`, `components/WbsColumns.tsx`, `components/assignments/ValidationStatusBadge.tsx`, `DataTable.tsx`, `Button.tsx`, `types/wbs.ts`).

## Findings

- **High** — `frontend/src/pages/DevelopmentDetail/WbsDetailModal.tsx:109`, `frontend/src/pages/DevelopmentDetail/WbsDetailModal.tsx:160`: las actividades `anulada=true` siguen mostrando el `estado` y `estado_validacion` originales en el detalle. En filas anuladas la tabla fuerza `ValidationStatusBadge status="anulada"`, pero el modal usa `activity.estado` y `status` directamente; si `estado_validacion` viene vacío, el badge cae a “Aprobada”. Esto rompe la semántica de anulación lógica cuando el usuario abre una fila anulada desde “Anuladas” o “Todas”.
- **Medium** — `frontend/src/pages/DevelopmentDetail/DeleteActivityModal.test.tsx:7`: la cobertura nueva solo valida el copy del modal de anulación; no cubre segmentador `Activas/Anuladas/Todas`, acciones deshabilitadas en anuladas, ni que el reordenamiento/drag quede deshabilitado cuando se muestran anuladas. Riesgo de regresión en el flujo crítico solicitado.

## Required checks

- Desde `frontend/`: `npm run lint`, `npm run test`, `npm run build`.

## Design-system risks

- No se detecta bloqueo nuevo por HTML crudo en acciones principales: se usa `Button`, `Text`, `Badge`, `Modal` y `DataTable`.
- Persisten clases Tailwind semánticas directas en badges/estados (`amber`, `neutral`, `red`, etc.), alineadas con patrones existentes pero no ideales frente a tokens CSS.

## Blocking reasons

- No hay bloqueo de build confirmado en revisión read-only. La inconsistencia del detalle de anuladas debe corregirse antes de considerar UX aprobada completamente.
