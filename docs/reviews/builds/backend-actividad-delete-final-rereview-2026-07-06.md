# Backend build review — actividad-delete final re-review

Fecha: 2026-07-06
Scope: `backend_v2/app/api/desarrollos/actividades_router.py`, `backend_v2/app/models/desarrollo/actividad.py`, `backend_v2/app/services/desarrollos/actividad_delete_service.py`, `testing/backend/test_actividad_delete.py`
Resultado: blocked

## Findings

### HIGH — Carrera permite crear descendientes activos durante anulación de una rama

- Archivos: `backend_v2/app/services/desarrollos/actividad_delete_service.py:70-98`, `backend_v2/app/api/desarrollos/actividades_router.py:120-131`
- El DELETE bloquea solo la raíz antes de escanear descendientes y luego bloquea cada ID ya descubierto. POST bloquea únicamente el padre inmediato. Interleaving posible: DELETE de raíz bloquea raíz y escanea IDs; antes de que bloquee un hijo/nieto ya descubierto, un POST crea una nueva subactividad bajo ese descendiente activo; el nuevo ID no estaba en `ids_a_eliminar`, por lo que queda activo bajo una rama anulada.
- Impacto: rompe la invariante de anulación lógica en cascada bajo concurrencia y deja actividades accionables/visibles dentro de ramas anuladas.
- Requerido: serializar creación/anulación sobre toda la rama o el desarrollo (por ejemplo, lock de ancestros/raíz también en POST, advisory lock por raíz/desarrollo, o estrategia transaccional equivalente) y agregar prueba concurrente que reproduzca POST bajo descendiente mientras se anula la raíz.

## Required tests

- Añadir test async concurrente para demostrar que no puede quedar una subactividad activa creada bajo cualquier descendiente de una rama anulada mientras corre DELETE.

## Required docs/RBAC follow-up

- Sin follow-up RBAC adicional para este hallazgo.

## Blocking reasons

- Riesgo alto de inconsistencia de árbol WBS bajo carga concurrente.
