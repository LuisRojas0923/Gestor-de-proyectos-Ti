# Docs/tests review — re-review actividad delete

Fecha: 2026-07-06
Scope: `testing/backend/test_actividad_delete.py`, `docs/ESQUEMA_BASE_DATOS.md`, `testing/CATALOGO_PRUEBAS.md`.
Outcome: blocked

## Findings

1. **High** — `testing/backend/test_actividad_delete.py:230-307` agrega cobertura router para delegador/autorización/parent-anulada, pero aún no invoca el router `eliminar_actividad` ni el bloqueo `PATCH` sobre actividad anulada. Quedan sin prueba las ramas de `backend_v2/app/api/desarrollos/actividades_router.py:320-321` (`act_db.anulada` → 409) y `backend_v2/app/api/desarrollos/actividades_router.py:479-522` (DELETE: autorización del delegador, paso de `usuario.id` a `eliminar_actividad_cascade`, recálculos y respuesta `eliminadas`).

## Verification evidence reviewed

- `python -m pytest --collect-only testing/backend/test_actividad_delete.py` — 13 tests collected.
- Reportado por orquestador: `testing/backend/test_actividad_delete.py` — 13 passed.
- `docs/ESQUEMA_BASE_DATOS.md` ya incluye `anulada`, `anulada_en`, `anulada_por_id` en Mermaid y diccionario de `actividades`.
- `testing/CATALOGO_PRUEBAS.md` ya registra las suites frontend listadas en el alcance.

## Required tests

- Añadir al menos un test de router para `eliminar_actividad(...)` que valide delegador autorizado/no autorizado y que la respuesta/metadata use `usuario.id`.
- Añadir test de router para `actualizar_actividad(...)` sobre una actividad ya anulada, esperando HTTP 409.

## Required docs

- Sin bloqueos altos restantes en los documentos revisados.

## Blocking reasons

- Persisten ramas backend críticas de anulación expuestas por router sin prueba automatizada focal.
