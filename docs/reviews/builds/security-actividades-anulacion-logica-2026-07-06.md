Security/RBAC review: blocked

## Checklist results
- Auth en endpoints: ❌
- Schemas sin dict: ✅
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: ✅
- No str(e) en 500: ❌
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ❌

Findings:
1. BLOQUEANTE — Escalada de privilegios para anular actividades: `PATCH /actividades/{id}` permite actualizar `delegado_por_id` por el schema y `setattr` masivo, y el frontend lo sobrescribe con el usuario actual al editar. Luego `DELETE /actividades/{id}` autoriza únicamente comparando `act_db.delegado_por_id == usuario.id`, por lo que cualquier usuario con permiso de edición puede convertirse en delegador y anular la actividad/cascada. Referencias: `backend_v2/app/models/desarrollo/actividad.py:116-120`, `backend_v2/app/api/desarrollos/actividades_router.py:305-312`, `frontend/src/pages/DevelopmentDetail/WbsNodeModal.tsx:97-105`, `backend_v2/app/api/desarrollos/actividades_router.py:469-478`. CWE-862, CWE-915.
2. BLOQUEANTE — `GET /actividades/{actividad_id}` autentica pero no autoriza contra el desarrollo, jerarquía ni participación; cualquier usuario autenticado puede consultar cualquier actividad por ID. La respuesta expone detalle operativo y campos de auditoría/anulación (`anulada_por_id`, fechas, asignados, archivo_url). Referencias: `backend_v2/app/api/desarrollos/actividades_router.py:225-241`, `backend_v2/app/models/desarrollo/actividad.py:136-147`. CWE-862, CWE-200.
3. ALTO — `GET /actividades/{actividad_id}/preview` aplica un chequeo más amplio que el permiso real de `DELETE` y devuelve todos los descendientes sin aplicar el filtrado de colaboración externa/ancestros usado por el árbol. Un usuario con acceso a una actividad raíz o al desarrollo puede enumerar títulos/estados de descendientes que no necesariamente están en su vista autorizada y que no podría anular. Referencias: `backend_v2/app/api/desarrollos/actividades_router.py:397-430`, `backend_v2/app/services/desarrollos/actividad_delete_service.py:33-55`. CWE-200, CWE-863.
4. MEDIO — Los endpoints revisados siguen devolviendo `str(e)` en `HTTPException` 500, lo que puede filtrar detalles internos de DB/rutas durante fallos en GET/PATCH/preview/DELETE. Referencias: `backend_v2/app/api/desarrollos/actividades_router.py:245-247`, `backend_v2/app/api/desarrollos/actividades_router.py:366-368`, `backend_v2/app/api/desarrollos/actividades_router.py:444-446`, `backend_v2/app/api/desarrollos/actividades_router.py:501-503`. CWE-209.

RBAC/config impact: no se identificó módulo RBAC nuevo; el alcance cae bajo `developments` existente, pero los endpoints de actividad no tienen `requerir_modulo` y dependen de checks locales que deben corregirse.

Blocking reasons: hallazgos 1 y 2.

Severity: BLOQUEANTE
