# Backend review — actividad delete concurrency re-review — 2026-07-06

Backend review: blocked

Scope reviewed:
- `backend_v2/app/services/desarrollos/actividad_delete_service.py`
- `backend_v2/app/api/desarrollos/actividades_router.py` (`POST /actividades/` parent lock)

Findings:
- HIGH/BLOCKING: The remaining concurrency issue is not fully closed. `DELETE` locks the root first and then attempts to lock the subtree, while `POST` under an existing descendant locks only the immediate parent first and later updates ancestors through `recalcular_porcentaje_jerarquico()` / `recalcular_progreso_desarrollo()`. Race scenario: a `POST` creates under child `C` and holds `FOR UPDATE` on `C`; concurrent `DELETE` of root `R` locks `R` then waits on `C`; the `POST` recalculation then tries to update `R` and waits on the delete transaction. This is an inverse lock-order deadlock / 500 risk under load. The fix needs deterministic locking of all affected ancestors/rows in the same order for both operations, or an equivalent transaction-level serialization strategy, before recalculation/annulment.

Required tests:
- Add a backend concurrency test that exercises `POST` under a locked descendant while deleting an ancestor and verifies no deadlock/500 and no active child remains under an annulled branch.

Required docs/RBAC follow-up:
- None for this focused concurrency re-review.

Blocking reasons:
- HIGH concurrency finding remains.
