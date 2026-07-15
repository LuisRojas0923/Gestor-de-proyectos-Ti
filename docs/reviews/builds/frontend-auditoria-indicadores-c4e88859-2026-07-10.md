# Frontend review: approved_with_risks

**Fecha:** 2026-07-10
**Alcance:** revisión final read-only del commit `c4e88859`, con verificación acumulada del frontend de indicadores de auditoría contra `origin/main`.

## Findings

No quedan hallazgos bloqueantes de frontend.

### Correcciones verificadas

- `Button` declara y reenvía `aria-expanded` y `aria-controls` al botón nativo.
- `Input` declara y reenvía `aria-label` al input nativo.
- La prueba DOM `accesibilidad.test.tsx` comprueba los nombres accesibles de ambas fechas y el cambio `false → true` de `aria-expanded`, además de `aria-controls` y el contenido expandido.
- El catálogo humaniza `service-portal`, `reserva_salas` y `gestion_humana`; `login` se presenta como “Inicio de sesión”. Se elimina el bloqueo previo de texto técnico/no español en el caso cubierto.
- El endpoint continúa centralizado en `API_ENDPOINTS.AUDIT_STATS`.

### Riesgos no bloqueantes

- **Media:** el selector “Todos los módulos” no tiene nombre accesible. `EventosPorModulo.tsx` pasa `id` a `Select`, pero el átomo `Select` no declara ni reenvía `id` y no se le proporciona `label`. Recomendación: ampliar `Select` con `id`/`aria-label` o usar su prop `label`.
- **Baja:** permanecen colores Tailwind y hexadecimales directos en `KpiCards.tsx`, `TiposFallos.tsx`, `ActividadEnTiempo.tsx` e `index.tsx`, en vez de tokens semánticos. Es deuda de conformidad con tema, no una regresión causada por la corrección puntual de `c4e88859`.
- **Baja:** durante una recarga con estadísticas ya visibles, el botón cambia de estado, pero no existe una región `role="status"` que anuncie la actualización.
- **Higiene:** el worktree ya contenía cambios no pertenecientes al commit en `.opencode/memory/docs-tests-reviewer.json` y `docs/reviews/builds/frontend-auditoria-indicadores-2026-07-10.md`; no afectan la evaluación del código de `c4e88859`.

## Required checks

Evidencia aportada por el solicitante y no reejecutada por las restricciones del revisor:

- Frontend focal total: **5/5 pasa**.
- ESLint focal: **pasa**.
- TypeScript (`tsc`): **pasa**.
- Build Vite previo: **pasa**.

Para la puerta de integración general siguen correspondiendo desde `frontend/`: `npm run lint`, `npm run test` y `npm run build`; los resultados focales y el build previo son suficientes para retirar el bloqueo revisado.

## Design-system risks

- Superficie accesible incompleta del átomo `Select` para este uso.
- Colores visuales no tokenizados.
- Falta anuncio accesible de recarga silenciosa.

## Blocking reasons

Ninguno. Los bloqueos previos de reenvío ARIA, catálogo visible y cobertura DOM quedaron corregidos en `c4e88859`.
