# Plantilla — Reporte de Revisión de Build

**Fecha:** 2026-07-06
**Build:** Anulación lógica de actividades WBS
**Autor del build:** no especificado
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `backend_v2/app/models/desarrollo/actividad.py`
- `backend_v2/app/services/desarrollos/actividad_delete_service.py`
- `backend_v2/app/api/desarrollos/actividades_router.py`
- `backend_v2/app/services/desarrollos/porcentaje_service.py`
- `backend_v2/app/core/migrations/structural_blindaje.py`
- `testing/backend/test_actividad_delete.py`
- `docs/ESQUEMA_BASE_DATOS.md`
- `testing/CATALOGO_PRUEBAS.md`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | bloqueado | sí | Revisión read-only del alcance backend solicitado. |

## 3. Hallazgos bloqueantes

1. **CRITICAL** — `backend_v2/app/services/desarrollos/actividad_delete_service.py:80-91`: la anulación no es idempotente bajo concurrencia. Dos DELETE simultáneos pueden leer `anulada=False`, ambos contar la fila como anulada y el último sobrescribir `anulada_en/anulada_por_id`. Requiere `UPDATE ... WHERE COALESCE(anulada,FALSE)=FALSE RETURNING` o bloqueo de filas (`FOR UPDATE`) dentro de la transacción.
2. **HIGH** — `backend_v2/app/api/desarrollos/actividades_router.py:225-241`: `GET /{actividad_id}` autentica pero no autoriza por jerarquía/desarrollo. Cualquier usuario autenticado puede enumerar IDs y leer actividades, incluidas anuladas y metadatos de anulación. Debe reutilizar las validaciones de acceso de árbol/preview/PATCH.
3. **HIGH** — `backend_v2/app/api/desarrollos/actividades_router.py:81-91`: `POST /` no valida que `parent_id` exista, pertenezca al mismo `desarrollo_id` y no esté `anulada`. Como la anulación lógica conserva IDs, se pueden crear subactividades activas debajo de una actividad anulada, rompiendo cascada y porcentajes.

## 4. Hallazgos no bloqueantes

1. **MEDIUM** — `backend_v2/app/core/migrations/structural_blindaje.py:105-107` y `backend_v2/app/services/desarrollos/actividad_delete_service.py:80`: los nuevos campos de auditoría usan `TIMESTAMP` y `datetime.utcnow()` naive. Para trazabilidad PostgreSQL consistente deberían ser `TIMESTAMPTZ` y datetime aware.
2. **MEDIUM** — `testing/backend/test_actividad_delete.py:85-244`: faltan pruebas de endpoint para rechazo PATCH sobre anuladas, recalculo de porcentaje/progreso excluyendo anuladas, permisos de `GET /{actividad_id}` y bloqueo de creación bajo padre anulado.

## 5. Tests / comandos ejecutados

- `git status --short` — PASS
- `git diff -- <alcance backend/docs/tests>` — PASS
- `python -m pytest --collect-only testing/backend/test_actividad_delete.py` — PASS, 9 tests collected

No se ejecutó pytest real por modo read-only de revisión; solo `--collect-only` está autorizado para este subagente.

## 6. Documentacion actualizada

- [x] `docs/ESQUEMA_BASE_DATOS.md` actualizado parcialmente con columnas nuevas.
- [x] `testing/CATALOGO_PRUEBAS.md` actualizado.

Observación: revisar tipo `TIMESTAMPTZ` y nulabilidad/default real antes de cerrar documentación.

## 7. Decision final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos` (riesgos documentados arriba)
- [x] `bloqueado` (motivos en hallazgos bloqueantes)

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Hacer anulación atómica/idempotente bajo concurrencia. | Implementador backend | 2026-07-06 |
| Añadir autorización jerárquica a `GET /{actividad_id}`. | Implementador backend | 2026-07-06 |
| Bloquear creación de hijos bajo actividades anuladas. | Implementador backend | 2026-07-06 |
| Añadir pruebas de endpoint/permisos/porcentajes. | Implementador backend | 2026-07-06 |
