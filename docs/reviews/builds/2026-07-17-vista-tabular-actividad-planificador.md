# Revisión de Build: Vista Tabular y Actividad del Planificador

**Fecha:** 2026-07-17
**Build:** Vista tabular de jornadas y actividad diaria
**Autor del build:** OpenCode
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

## 1. Alcance

- Vista tabular separada de la matriz semanal, sin duplicar el estado del plan.
- Columnas de cédula, empleado, fecha, cliente, actividad, OT/CC, jornada, total y novedades.
- Filtros por columna, orden, paginación de 100 jornadas y edición accesible.
- Aplicación masiva e individual de actividad diaria.
- Borrador local ligado al usuario y snapshot durable al confirmar.
- Cliente ERP como dato de presentación no autoritativo.
- Validación backend de días únicos por empleado.
- Se excluyen los cambios concurrentes ajenos del worktree.

## 2. Archivos principales

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/components/VistaTabularHorarios.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/components/SelectorVistaHorario.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/components/CeldaDiaEditor.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/hooks/usePersistirBorradorPlanificador.ts`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/utils/planificadorDraft.ts`
- `backend_v2/app/models/novedades_nomina/schemas_horas_extras_planificador.py`
- `backend_v2/app/services/novedades_nomina/horas_extras_trazabilidad.py`
- `testing/backend/test_horas_extras_planificador_festivos.py`
- `frontend/src/tests/PlanificadorSemanalFestivos.test.tsx`

## 3. Revisiones

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| `harness-router` | matriz aplicada | no | Frontend, backend y docs/tests obligatorios |
| `frontend-reviewer` | `approved_with_risks` | no | Bloqueos de persistencia, modal y escala corregidos |
| `backend-reviewer` | `approved_with_risks` | no | Semántica local/snapshot documentada; días duplicados rechazados |
| `docs-tests-reviewer` | `approved_with_risks` | no | Contrato, catálogo, esquema y smoke actualizados |
| `scope-reviewer` | `approved_with_risks` | no | Slice aislado conceptualmente del worktree concurrente |
| `security-rbac-reviewer` | `approved_with_risks` | no | Borrador ligado al usuario; sin endpoint ni permiso nuevo |
| `frontend-table-specialist` | `approved_with_risks` | no | Paginación y cardinalidad diaria resuelven el bloqueo de escala |

## 4. Hallazgos corregidos

- Autosave completo del borrador, incluida actividad, OT y días destino.
- Invalidación de resultados obsoletos al editar.
- Modal compartido con foco, Escape, scroll lock y límite de viewport.
- Una fila estable por empleado/día; OT, cliente y CC se agregan sin duplicar el total diario.
- Paginación de 100 filas para el máximo de 200 empleados.
- Filtros limpiables, valores obsoletos podados y orden secundario por fecha.
- Acción Editar con nombre contextual y sin doble propagación del clic.
- Feedback ante fallos de búsqueda OT.
- Borrador local descartado si cambia el usuario de la sesión.
- Límite de 500 caracteres para actividad y rechazo de `dia_semana` duplicado.

## 5. Evidencia

- Vitest focal: **33 passed** en cuatro suites.
- Suite global frontend: **298 passed, 2 skipped, 2 failed** antes del último test de aislamiento; los dos fallos son expectativas ajenas en MyDevelopments y RegisterSidebar.
- Build Vite: **PASS**, 4032 módulos transformados.
- ESLint focal: **PASS**.
- `python -m compileall -q backend_v2/app`: **PASS**.
- Validaciones backend puras: **2 passed**.
- Prueba DB de actividad: pasó en una ejecución focal previa; la reejecución actual falla al conectar por `WinError 64` antes de ejecutar la lógica.
- `git diff --check`: **PASS**.

## 6. Documentación

- [x] `docs/specs/2026-06-17_sprint-S7-planificador-semanal.md`
- [x] `docs/ESQUEMA_BASE_DATOS.md`
- [x] `testing/CATALOGO_PRUEBAS.md`
- [x] Reporte de build actual
- [ ] ADR nuevo: no aplica; la semántica se documenta en la especificación S7 existente.

## 7. Riesgos residuales

- Falta reejecutar los 13 casos DB del planificador cuando PostgreSQL esté estable.
- Los valores múltiples de OT/cliente/CC se muestran como resumen agregado; la edición conserva el detalle completo.
- Los tipos de salida backend para conceptos/estados siguen siendo más amplios que las uniones TypeScript.
- La lista OT del editor vive dentro del scroll del modal y puede requerir portal si se detecta recorte visual en dispositivos muy bajos.

## 8. Decisión

- [x] `aprobado_con_riesgos`

No quedan bloqueantes atribuibles a la vista tabular o la actividad diaria. La integración final debe mantener aislados los archivos del slice frente a los cambios concurrentes del worktree.
