Security/RBAC review: approved_with_risks

## Checklist results
- Auth en endpoints: ✅
- Schemas sin dict: ✅
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ✅

Findings:
- ✅ Bloqueo previo resuelto: `marcar_asistencia` ya no confía en la geocerca calculada por cliente. Ahora llama a `_resolver_zona_id_por_geocerca`, lista `ZonaTrabajo`, calcula distancia Haversine, deriva el `zona_id` real por coordenadas y rechaza con `400` si existen zonas oficiales y ninguna contiene la coordenada.
- MEDIO: si no existen zonas en `zonas_trabajo`, `_resolver_zona_id_por_geocerca` retorna `None` y permite marcar asistencia sin geocerca oficial. Riesgo operativo/configuración: producción debe tener al menos una zona oficial o un guard fail-closed. CWE-693/CWE-840.
- MEDIO: `ZonaCreate` acepta `latitud`, `longitud` y `radio` como `float` sin límites; aunque crear/eliminar zonas está restringido a `admin`, un radio excesivo o coordenadas inválidas pueden volver la geocerca demasiado permisiva. Recomendada validación: latitud [-90,90], longitud [-180,180], radio > 0 y máximo razonable. CWE-20.
- BAJO: la cobertura nueva prueba el helper de geocerca, pero no un flujo completo de `marcar_asistencia` que asegure que una coordenada fuera de zona no persiste asistencia/evidencia. Recomendado test de integración de servicio para ese caso.

RBAC/config impact:
- Nuevo endpoint `GET /api/v2/biometria/estado` está protegido por `Depends(requerir_permiso_biometria)`, que a su vez depende de `obtener_usuario_actual_db` y valida permiso del módulo `biometria`.
- El módulo `biometria` ya existe en `backend_v2/app/core/rbac_manifest.py` como crítico; no se requiere nuevo ID RBAC para esta corrección.
- Endpoints de zonas (`GET/POST/DELETE /biometria/zonas`) siguen protegidos por permiso `biometria`; `POST/DELETE` agregan restricción `usuario_actual.rol == "admin"`.

Blocking reasons (si aplica): ninguno. El bloqueo específico de geocerca solo en cliente queda levantado.

Severity: MEDIO

Notas de verificación:
- Revisión estática sobre diff y archivos: `backend_v2/app/services/biometria/biometria_service.py`, `backend_v2/app/api/biometria/biometria_router.py`, `testing/backend/test_biometria_service.py`, `testing/backend/test_biometria_router_engine.py`, `backend_v2/app/core/rbac_manifest.py`.
- El usuario reporta biometría completa PASS 24; no se reejecutó pytest por alcance autorizado del subagente.
