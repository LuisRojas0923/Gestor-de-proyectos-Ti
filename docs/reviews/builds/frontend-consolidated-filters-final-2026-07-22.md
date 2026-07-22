# Revisión final — filtros accesibles de tabla consolidada

**Fecha:** 2026-07-22
**Rama:** `fix/frontend-syntax`
**Base:** `origin/main`
**SHA funcional validado:** `04be1f4d1f019e1e9ee5765da63de6c95532147d`
**Modo:** build
**Estado técnico:** candidato a aprobación

## Alcance aceptado

El PR implementa filtros avanzados accesibles para `ConsolidatedTableById` y `ColumnFilterPopover`. El contrato final incluye:

- selección tipo Excel con estados canónicos todos, ninguno y parcial;
- combinación de filtros por Estado y Progreso;
- ARIA observable para diálogo, checkboxes, expansión y filtro activo;
- operación con Enter y Espacio, Escape, cierre exterior, salida de foco y restauración de foco;
- tabla con seis encabezados y seis celdas por fila;
- posicionamiento contenido en `visualViewport`, scroll interno y respuesta a resize/scroll;
- reset de filtros y popover al cambiar `desarrolloId`;
- cancelación e ignorado de respuestas HTTP antiguas al cambiar de desarrollo;
- envoltura estable de traducción en `Button` sin romper el layout flex ni producir HTML inválido.

## Excepción Formal De Alcance

Se aceptan formalmente dentro de este PR cuatro ajustes `test-only` que alinean suites existentes con contratos de producción vigentes. Permanecen de forma intencional para no reintroducir fallos de baseline; no constituyen una ampliación funcional ni una dependencia del filtrado consolidado. No se contabilizan como funcionalidad ni cobertura del filtrado consolidado:

| Archivo | Justificación |
|---|---|
| `frontend/src/pages/Login/RegisterSidebar.test.tsx` | Alinea el mensaje ERP de autoactivación vigente. |
| `frontend/src/services/ActivityEvidenceService.test.ts` | Alinea la expectativa con `API_CONFIG.BASE_URL`. |
| `frontend/src/tests/MyDevelopmentsRequirements.test.tsx` | Restaura el mock de `getWithHeaders` y la acción vigente `Anular`. |
| `frontend/src/tests/MyDevelopmentsReview.test.tsx` | Restaura el contrato paginado de `getWithHeaders`. |

Decisión de alcance:

- `test-only / baseline`: los cuatro cambios modifican únicamente expectativas y mocks.
- `sin producción`: no cambian componentes, servicios ni contratos de runtime.
- `sin cobertura del feature`: no se contabilizan dentro de los casos de filtros consolidados.
- `necesarios para la suite`: retirarlos vuelve a dejar las pruebas alineadas con mensajes, endpoints, paginación y acciones obsoletas.

La deuda de aislamiento y cobertura funcional de `MyDevelopmentsReview` queda fuera de este feature y no altera producción. Cualquier refactor funcional de esos módulos debe tramitarse en una PR separada.

## Evidencia final

| Verificación | Resultado |
|---|---|
| Vitest focalizado | `22 passed` |
| Vitest completo | `157 passed, 2 skipped` |
| ESLint focalizado | PASS |
| ESLint completo | FAIL baseline: `502 errors, 56 warnings`, sin hallazgos en archivos focalizados |
| Vite build | PASS |
| `git diff --check` | PASS |
| `npx tsc -b` | FAIL externo: sintaxis preexistente en `RequirementsTab.tsx:262,272` |

La suite completa conserva advertencias preexistentes de `act(...)` en `Fase2Integration.test.tsx` y logs deliberados de error en `WbsNodeModal.test.tsx`; ninguna procede de los archivos de esta funcionalidad. El lint global conserva deuda distribuida por módulos ajenos; el lint focalizado de los cinco archivos modificados es exitoso.

Comandos ejecutados desde `frontend/` sobre el estado funcional validado:

```powershell
npm run test -- --run src/components/__tests__/ConsolidatedTableById.test.tsx src/components/__tests__/ConsolidatedTableById.regressions.test.tsx
npm run test -- --run
npx eslint src/components/atoms/Button.tsx src/components/molecules/ColumnFilterPopover.tsx src/components/ConsolidatedTableById.tsx src/components/__tests__/ConsolidatedTableById.test.tsx src/components/__tests__/ConsolidatedTableById.regressions.test.tsx
npm run build
npx tsc -b
npm run lint
```

## Revisores obligatorios

| Subagente | Resultado final | Hallazgos residuales |
|---|---|---|
| `scope-reviewer` | `approved` | Pendientes remotos separados del código local. |
| `frontend-reviewer` | `approved_with_risks` | Sin bloqueos de código; deuda visual heredada no introducida. |
| `docs-tests-reviewer` | `approved_with_risks` | Sin bloqueos de contenido; evidencia remota pendiente. |

## Documentación

- `testing/CATALOGO_PRUEBAS.md` registra las dos suites de tabla consolidada y sus 21 casos.
- Este archivo reemplaza todos los reportes intermedios de la sesión.
- `.opencode/memory/docs-tests-reviewer.json` conserva una única entrada final autoritativa para este alcance.
- No aplican MER, esquema de base de datos, ADR, RBAC ni infraestructura.

## Pendientes remotos antes del merge

1. Subir los commits locales a `origin/fix/frontend-syntax` cuando el usuario autorice `git push`.
2. Cambiar el título de la PR #21 a `feat[ui]: implementar filtrado avanzado accesible en tabla consolidada` desde una sesión GitHub autenticada.
3. Confirmar checks remotos sobre el SHA definitivo.

## Decisión

- [ ] aprobado
- [x] aprobado_con_riesgos
- [ ] bloqueado

El código y las pruebas no presentan bloqueos locales conocidos. La aprobación final de GitHub queda condicionada únicamente a publicar el SHA definitivo, corregir el título remoto y observar los checks del servidor.
