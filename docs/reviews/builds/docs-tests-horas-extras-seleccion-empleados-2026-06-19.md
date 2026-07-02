# Docs/tests review — selección de empleados en horas extras

**Fecha:** 2026-06-19
**Modo:** build review
**Subagente:** docs-tests-reviewer
**Resultado:** bloqueado

---

## Alcance revisado

- `frontend/src/tests/PlanificadorSemanalView.test.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/utils/planificadorDraft.ts`
- Referencias funcionales consultadas para trazabilidad:
  - `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView.tsx`
  - `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/EmpleadosActivosView.tsx`

## Hallazgos por severidad

### Alta / bloqueante

1. **La prueba nueva no cierra el flujo completo de la regresión empleados activos → planificador.**
   La cobertura añadida verifica que `EmpleadosActivosView` permite filtrar/seleccionar y que escribe `seleccionados`/`empleadosInfo` en `sessionStorage` (`frontend/src/tests/PlanificadorSemanalView.test.tsx:285-311`). Sin embargo, no valida el paso crítico de retorno/recuperación: `PlanificadorSemanalView` lee el borrador (`PlanificadorSemanalView.tsx:73`, `PlanificadorSemanalView.tsx:99-101`) y debe renderizar/usar esa selección al volver desde el botón `Volver al planificador` (`EmpleadosActivosView.tsx:320-324`).
   **Impacto:** una regresión donde el borrador se escriba pero el planificador no lo consuma seguiría pasando. Para la regresión reportada, falta una aserción round-trip: seleccionar `456`, volver o montar `PlanificadorSemanalView` con ese borrador, y comprobar contador/tabla o payload de guardar/precalcular con la cédula recuperada.

### Media

2. **El util de borrador cambiado no tiene pruebas directas.**
   Se agregaron `crearBorradorPlanificadorBase` y `guardarBorradorPlanificadorLocal` (`planificadorDraft.ts:24-32`, `planificadorDraft.ts:57-59`), pero el test actual solo importa la key y parsea manualmente el storage (`PlanificadorSemanalView.test.tsx:46`, `PlanificadorSemanalView.test.tsx:280`, `PlanificadorSemanalView.test.tsx:308`).
   **Riesgo:** quedan sin proteger defaults del borrador base, round-trip `guardar`/`leer`, JSON inválido y comportamiento dependiente de fecha en `calcularSemanaIsoActual` (`planificadorDraft.ts:24-28`).

### Baja / observación de aislamiento

3. **No veo contaminación efectiva entre tests en el estado actual, pero la limpieza es solo posterior.**
   La suite limpia `localStorage` y `sessionStorage` en `afterEach` (`PlanificadorSemanalView.test.tsx:221-224`), lo cual evita que el nuevo draft contamine pruebas siguientes. Como las pruebas previas del archivo no escriben `sessionStorage`, no hay contaminación observable hoy.
   **Riesgo residual:** al no limpiar también antes de cada test sensible al borrador, una futura prueba previa o estado residual del entorno podría afectar la inicialización que lee `sessionStorage` al montar (`PlanificadorSemanalView.tsx:73`, `EmpleadosActivosView.tsx:49`).

## Tests / comandos

- No ejecuté Vitest: este subagente no tiene autorización para `npm run test` ni comandos frontend de ejecución.
- Requerido por el orquestador/implementador tras corregir cobertura: `cd frontend && npm run test -- src/tests/PlanificadorSemanalView.test.tsx`.

## Documentación

- No se requieren cambios en `docs/ESQUEMA_BASE_DATOS.md`: no hay cambios de modelos/esquema.
- No se requiere ADR: no se observa decisión arquitectónica durable en el alcance.
- Esta revisión queda registrada en `docs/reviews/builds/`.

## Decisión final

- **Bloqueado** hasta cubrir el round-trip de la regresión y añadir o justificar pruebas directas del util de borrador.
