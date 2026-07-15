# Frontend review: approved_with_risks

**Fecha:** 2026-07-15
**Modo:** revisión final tras correcciones
**Alcance:** `WbsNodeModal.tsx` y test, `ActivityEvidenceButton.tsx`, `ActivityEvidenceService.ts` y test, `api.ts`, `WbsDetailModal.tsx`, `WbsColumns.tsx`, `ConsolidatedTableById.tsx`.

## Findings

### Baja — cobertura focal aún no prueba el reintento exitoso ni el refresh de descarga

- `frontend/src/pages/DevelopmentDetail/WbsNodeModal.test.tsx:39-75` sí valida el caso crítico solicitado: comunica éxito parcial, llama `onSaved`, conserva el modal y reintenta mediante `PATCH` sin repetir el `POST`. En el segundo intento el mock vuelve a rechazar la carga; no se verifica que un reintento exitoso cierre el modal ni el reemplazo durante edición.
- `frontend/src/services/ActivityEvidenceService.test.ts:25-52` valida el bearer token, pero no el camino `401 -> refresh -> segundo fetch`.

### Baja — ubicación del componente compartido

- `frontend/src/components/ConsolidatedTableById.tsx:5` todavía importa un componente reutilizable desde `pages/DevelopmentDetail/components`. No afecta el comportamiento, pero mantiene una dependencia inversa; `ActivityEvidenceButton` encaja mejor en moléculas o en un módulo compartido de la feature.

## Correcciones verificadas

- El bloqueo por éxito parcial quedó resuelto: `WbsNodeModal.tsx:114-183` conserva el ID, llama `onSaved()`, muestra un mensaje explícito y reintenta sin crear otra actividad.
- El resultado nulo de `patch()` se trata como error y no se comunica como persistencia exitosa.
- `WbsNodeModal.tsx:198-208` usa la molécula `Modal`; hereda `role="dialog"`, `aria-modal`, nombre accesible, foco atrapado/restaurado, Escape y scroll lock. El botón propio de cierre tiene `aria-label` (`:221-227`).
- Overlay, Escape y botón de cierre quedan deshabilitados durante el guardado.
- Las rutas WBS están centralizadas en `API_ENDPOINTS` (`frontend/src/config/api.ts:84-86`) y son consumidas por modal y servicio.
- `ActivityEvidenceButton.tsx:62-66` diferencia el nombre accesible para descarga interna/apertura externa y limita el botón a `max-w-full` con `break-all`, corrigiendo el riesgo móvil de URLs legadas largas.
- La descarga interna mantiene JWT, refresh único, blob y nombre de archivo; las URLs legadas se restringen a `http/https` y se abren con `noopener,noreferrer`.
- Se reutilizan `Button`, `Text`, `FilePicker`, `Modal` y los componentes de tabla existentes. No se introducen colores hardcodeados en el diff de evidencia.
- Todos los archivos revisados permanecen por debajo de 550 líneas y no cambian sticky headers, filtros o estrategia de renderizado de tablas.

## Required checks

Evidencia declarada por el solicitante; no reejecutada por las restricciones del revisor:

- Tres tests frontend focalizados — PASS.
- `npm run build` desde `frontend/` — PASS.
- Lint de archivos nuevos — sin salida.
- Se mantiene documentada la deuda previa del lint global y de `ConsolidatedTableById.tsx`; el diff de evidencia no añade esos diagnósticos.

## Design-system risks

- No persisten riesgos bloqueantes de design system, accesibilidad modal o responsive en las correcciones revisadas.
- Queda como deuda menor mover `ActivityEvidenceButton` fuera de la carpeta de página.

## Blocking reasons

Ninguno concreto en el diff corregido. Los dos bloqueos de la revisión inicial quedaron resueltos; los hallazgos restantes son bordes no bloqueantes de contrato, cobertura y estructura.
