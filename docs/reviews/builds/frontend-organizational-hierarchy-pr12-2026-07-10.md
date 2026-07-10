# Revisión frontend final — organigrama PR 12

**Fecha:** 2026-07-10
**Comparación:** worktree `pr12` contra `origin/main`, incluidos cambios sin commit
**Modo:** revisión estática read-only del código fuente
**Resultado:** `approved`

## Archivos revisados

- `frontend/src/pages/OrganizationalHierarchy.tsx`
- `frontend/src/pages/OrganizationalHierarchy/components/CustomNodeComponent.tsx`
- `frontend/src/pages/OrganizationalHierarchy/components/CustomNodeComponent.test.tsx`
- `frontend/src/pages/OrganizationalHierarchy/FlowWithFitView.test.tsx`
- `frontend/src/pages/OrganizationalHierarchy/utils.ts`
- `frontend/src/pages/OrganizationalHierarchy/utils.test.ts`

## Resultado de la revisión final

No quedan hallazgos bloqueantes en el alcance frontend revisado.

El bloqueo anterior queda corregido:

- El control de expansión detiene la propagación de `keydown` y de clic, por lo que `Enter`, espacio y clic no seleccionan la tarjeta.
- La tarjeta usa `aria-pressed` con semántica compatible con su estado de selección.
- El botón de rama mantiene nombre accesible en español, `aria-expanded` y objetivo táctil mínimo de `44 × 44 px`.
- La cobertura focal verifica teclado en la tarjeta y ausencia de selección colateral al operar la expansión con `Enter` y espacio.

También se verificó por inspección:

- El recentrado solo se solicita al expandir, usa `setCenter` con zoom móvil `0.7` y limpia la solicitud mediante `onCentered`.
- Las dimensiones del nodo se comparten entre layout y recentrado.
- Dagre crea un grafo nuevo por invocación; la prueba compara coordenadas antes y después de otro layout para descartar estado residual.
- Los estilos modificados de niveles, avatares y expansión usan tokens CSS y componentes del sistema de diseño.
- La página conserva estructura mobile-first, estados de carga y vacío, y permanece bajo el máximo de 550 líneas (507).
- No se introducen tablas, modales, `any`, `catch (err: any)` ni endpoints nuevos en este delta.

## Evidencia y checks requeridos

Evidencia comunicada por el solicitante, no reejecutada por este revisor debido a las restricciones del rol:

- 11/11 pruebas focales — PASS.
- ESLint — PASS.
- TypeScript (`tsc`) — PASS.
- Build final — PASS.

Checks aplicables antes de integrar:

- `cd frontend && npm run test -- src/pages/OrganizationalHierarchy`
- `cd frontend && npm run lint`
- comprobación TypeScript configurada por el proyecto
- `cd frontend && npm run build`

Los dos archivos de prueba nuevos están actualmente sin seguimiento en Git; deben incluirse en el cambio final para conservar la evidencia revisada.

## Riesgos del sistema de diseño

- Sin riesgos bloqueantes introducidos por este delta.
- Permanecen colores hardcodeados preexistentes en elementos de React Flow (`Background`, `MiniMap`, aristas y handles); quedan como deuda previa fuera del alcance de esta corrección.
- La tarjeta seleccionable aún contiene el botón de expansión como control interactivo descendiente. La propagación defectuosa está cubierta y corregida, pero separar ambos targets sería una mejora estructural futura de accesibilidad.

## Decisión

`approved`: el defecto funcional y semántico que bloqueaba la revisión fue corregido y la nueva cobertura focal verifica los escenarios solicitados. No se identifican regresiones frontend bloqueantes.
