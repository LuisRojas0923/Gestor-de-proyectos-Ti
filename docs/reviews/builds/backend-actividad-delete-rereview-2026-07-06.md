# Reporte de Revisión de Build — backend

**Fecha:** 2026-07-06
**Build:** Re-review focalizado de anulación lógica de actividades
**Modo:** read-only
**Proyecto:** Gestor-de-proyectos-Ti

## Alcance revisado

- `backend_v2/app/api/desarrollos/actividades_router.py`
- `backend_v2/app/models/desarrollo/actividad.py`
- `backend_v2/app/services/desarrollos/actividad_delete_service.py`
- `testing/backend/test_actividad_delete.py`

## Resultado

**Backend review:** blocked

## Hallazgos blocking/high restantes

1. **HIGH** — `backend_v2/app/models/desarrollo/actividad.py:132` + `backend_v2/app/api/desarrollos/actividades_router.py:358-364`: `ActividadActualizar` aún expone `parent_id` y el PATCH lo aplica por mass assignment sin validar el padre destino. Esto permite mover una actividad activa bajo una actividad anulada, bajo otro desarrollo, o incluso crear ciclos/self-parenting, saltándose el bloqueo de creación bajo anuladas y poniendo en riesgo las rutinas recursivas de preview/anulación.

2. **HIGH** — `backend_v2/app/api/desarrollos/actividades_router.py:119-128` + `backend_v2/app/services/desarrollos/actividad_delete_service.py:70-82`: el bloqueo de crear bajo `parent.anulada` no es seguro bajo concurrencia. El POST valida el padre sin `FOR UPDATE`, mientras la anulación calcula descendientes antes de bloquear filas; un POST concurrente con DELETE puede dejar una subactividad activa bajo una rama ya anulada.

## Tests observados

- Usuario reporta `testing/backend/test_actividad_delete.py`: 13 passed.
- Revisor ejecutó solo `python -m pytest --collect-only testing/backend/test_actividad_delete.py`: 13 tests collected.

## Notas de aprobación parcial

- No se observan llamadas DB síncronas en el alcance revisado.
- La anulación lógica básica es idempotente en ejecución secuencial y preserva auditoría.
- Los campos internos de anulación y `delegado_por_id` ya no quedan expuestos por `ActividadActualizar`; POST fuerza `delegado_por_id` desde el usuario autenticado.
