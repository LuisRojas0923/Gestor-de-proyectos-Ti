# Excepción de alcance — pruebas de baseline en `1ace0497`

**Fecha:** 2026-07-22  
**Commit:** `1ace0497` (`feat[ui]: implementar filtrado avanzado responsivo en tabla consolidada con contrato ARIA`)  
**Padre:** `0c43244d`  
**Rama:** `fix/frontend-syntax`  
**Modo:** build  
**Proyecto:** Gestor-de-proyectos-Ti

## Decisión de alcance

El alcance funcional de `1ace0497` es `ConsolidatedTableById`, `ColumnFilterPopover`, su cobertura y el catálogo de pruebas. El commit también contiene cuatro ajustes de pruebas de baseline ajenos a la tabla. Se conserva el commit sin reescribir historia porque `HEAD` coincide con `origin/fix/frontend-syntax` y los ajustes hacen que las pruebas reflejen contratos de producción vigentes.

Estos cuatro archivos quedan declarados como una **excepción de mantenimiento de baseline**, no como parte de la funcionalidad de filtrado. Deben extraerse posteriormente a un PR independiente con tipo `chore(tests)`.

## Cambios ajenos justificados

| Archivo | Ajuste | Contrato alineado |
|---|---|---|
| `frontend/src/pages/Login/RegisterSidebar.test.tsx` | Actualiza el texto esperado de activación. | Mensaje ERP vigente en `RegisterSidebar.tsx`. |
| `frontend/src/services/ActivityEvidenceService.test.ts` | Usa `API_CONFIG.BASE_URL` en la URL esperada. | Endpoint actual del servicio de evidencias. |
| `frontend/src/tests/MyDevelopmentsRequirements.test.tsx` | Añade `getWithHeaders` al mock y cambia `Eliminar` por `Anular`. | Paginación y anulación lógica vigentes en MyDevelopments. |
| `frontend/src/tests/MyDevelopmentsReview.test.tsx` | Añade `getWithHeaders` al mock. | Contrato actual de paginación de MyDevelopments. |

Los cambios anteriores no modifican producción, filtros, tabla consolidada, popover, RBAC ni API. Tampoco amplían la cobertura funcional de la tabla.

## Evidencia

- Pruebas ajenas focalizadas: **4 archivos, 14 tests passed**.
- Suite frontend en el worktree actual: **151 passed, 2 skipped**.
- Build frontend en el worktree actual: **exitoso**.
- La evidencia de suite/build se obtuvo con cambios de trabajo posteriores a `1ace0497`; no se presenta como una ejecución limpia exclusiva del commit.
- No se ejecutaron cambios de base de datos, backend, esquema ni infraestructura.

## Revisores

| Subagente | Resultado | Bloquea |
|---|---|---|
| `scope-reviewer` | `approved_with_risks` | No |
| `docs-tests-reviewer` | `approved_with_risks` | No |
| `frontend-reviewer` | Aplican al feature; los cuatro ajustes son independientes | No |

## Seguimiento

Crear un PR independiente con el alcance `chore(tests): sanea contratos y aislamiento de MyDevelopments`, incluyendo limpieza de fixtures, aislamiento de `localStorage`, cobertura real del filtro `Revisado` y preferencia por constantes de endpoint en las expectativas.

No aplican actualizaciones a `docs/ESQUEMA_BASE_DATOS.md`, ADR, RBAC ni catálogo adicional; las cuatro suites ya están registradas.

## Decisión final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos` — excepción de baseline documentada
- [ ] `bloqueado`
