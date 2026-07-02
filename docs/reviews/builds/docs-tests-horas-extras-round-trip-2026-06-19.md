# Docs/tests review — round-trip selección empleados activos → planificador

**Fecha:** 2026-06-19
**Modo:** build review
**Subagente:** docs-tests-reviewer
**Resultado:** aprobado con riesgos

---

## Alcance revisado

- `frontend/src/tests/PlanificadorSemanalView.test.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/utils/planificadorDraft.ts`
- Referencias funcionales consultadas para trazabilidad:
  - `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/EmpleadosActivosView.tsx`
  - `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView.tsx`

## Hallazgos por severidad

### Alta / bloqueante

- **Sin hallazgos bloqueantes.** El bloqueo anterior queda resuelto a nivel de cobertura revisada: la suite ahora selecciona desde `EmpleadosActivosView`, vuelve/navega al planificador, monta `PlanificadorSemanalView` y valida que `Guardar borrador` envía la cédula recuperada (`456`) en el payload (`frontend/src/tests/PlanificadorSemanalView.test.tsx:349-375`).

### Media

- **Tests no ejecutados por este subagente.** No ejecuté Vitest porque `docs-tests-reviewer` no tiene autorización para `npm run test` ni comandos frontend de ejecución. La aprobación queda condicionada a que el implementador/orquestador ejecute y registre: `cd frontend && npm run test -- src/tests/PlanificadorSemanalView.test.tsx`.

### Baja / observaciones

- La cobertura directa del util quedó agregada: round-trip `guardarBorradorPlanificadorLocal`/`leerBorradorPlanificador` y lectura de JSON válido pero incompleto (`frontend/src/tests/PlanificadorSemanalView.test.tsx:190-217`). Esto cubre el punto solicitado.
- El util ahora centraliza base, normalización y escritura local (`planificadorDraft.ts:30-116`), reduciendo riesgo de shape incompleto al leer `sessionStorage`.
- Hay cambios relacionados fuera del alcance declarado (`EmpleadosActivosView.tsx`, `DataTable.tsx`) en el working tree. No bloquean esta revisión puntual, pero deben quedar cubiertos por revisión frontend si el build completo los incluye.

## Tests / comandos

- Inspección realizada: `git status --short`, `git diff -- <scope>`, lectura de archivos y diff relacionado.
- No ejecutado por permisos: `cd frontend && npm run test -- src/tests/PlanificadorSemanalView.test.tsx`.

## Documentación

- No se requieren cambios en `docs/ESQUEMA_BASE_DATOS.md`: no hay cambios de modelos/esquema.
- No se requiere ADR: no se observa decisión arquitectónica durable en el alcance.
- Esta revisión queda registrada en `docs/reviews/builds/`.

## Decisión final

- **Aprobado con riesgos (no bloqueado).** El bloqueo anterior queda resuelto por la cobertura round-trip y las pruebas directas del borrador; falta únicamente evidencia de ejecución de Vitest por un agente autorizado.
