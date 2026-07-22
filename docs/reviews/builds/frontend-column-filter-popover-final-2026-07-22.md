# Plantilla — Reporte de Revisión de Build

**Fecha:** 2026-07-22  
**Build:** Estado final de `ColumnFilterPopover` y prueba focalizada  
**Autor del build:** Orquestador  
**Modo:** build  
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `frontend/src/components/molecules/ColumnFilterPopover.tsx`
- `frontend/src/components/__tests__/ConsolidatedTableById.test.tsx`
- `frontend/src/components/ConsolidatedTableById.tsx` (integración revisada)
- `frontend/src/components/atoms/Button.tsx` (soporte `aria-checked` revisado)

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| frontend-reviewer | aprobado | No | Revisión read-only del componente, integración y prueba focalizada. |

## 3. Hallazgos bloqueantes

Ninguno.

## 4. Hallazgos no bloqueantes

- La prueba focalizada valida explícitamente el límite superior, el ancho, el `max-height` y el registro de listeners del `visualViewport`; el límite izquierdo se verifica indirectamente mediante la implementación, no con una aserción separada de `left`.
- El componente conserva utilidades Tailwind de colores neutrales heredadas (`bg-white`, `neutral-*`, etc.). No fueron introducidas por este ajuste ni representan una regresión visual de este alcance; conviene migrarlas a tokens CSS en una tarea de deuda de diseño independiente.

## 5. Tests / comandos ejecutados

- Prueba focalizada: **15/15 PASS** (evidencia proporcionada por el orquestador).
- Suite frontend: **150 passed, 2 skipped** (evidencia proporcionada por el orquestador).
- `cd frontend && npm run lint` focalizado: **PASS / limpio** (evidencia proporcionada por el orquestador).
- `cd frontend && npm run build`: **PASS / exitoso** (evidencia proporcionada por el orquestador).
- `git diff --check` sobre el alcance revisado: **PASS**.

Los comandos de test, lint y build no se reejecutaron en esta revisión por las restricciones read-only del subagente frontend-reviewer.

## 6. Documentación actualizada

- [ ] `docs/ESQUEMA_BASE_DATOS.md` — no aplica.
- [ ] `docs/decisions/ADR-NNN-<titulo>.md` — no aplica.
- [ ] `docs/bitacora/<YYYY-MM-DD>-<tema>.md` — no aplica.
- [ ] `errors_memory.json` — no aplica.

## 7. Decisión final

- [x] `aprobado`
- [ ] `aprobado_con_riesgos`
- [ ] `bloqueado`

La implementación cumple el objetivo: usa `createPortal` y `position: fixed`, calcula dimensiones desde `visualViewport` con fallback, mantiene `top` y `left` dentro de los márgenes de los cuatro bordes, registra listeners de `resize`/`scroll` de ventana y `visualViewport`, y aplica `max-height` dependiente del viewport. El contenedor usa `flex flex-col`; la lista conserva scroll interno con `flex-1 min-h-0 overflow-y-auto`. La composición visual, textos en español, átomos (`Button`, `Input`, `Text`), búsqueda, acciones, estados de selección, Escape y cierre exterior se mantienen.

## 8. Seguimiento

| Acción | Responsable | Fecha objetivo |
|---|---|---|
| Migrar colores heredados a tokens CSS cuando se atienda la deuda de diseño | Frontend | Pendiente |
