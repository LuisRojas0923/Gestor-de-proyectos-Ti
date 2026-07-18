# Docs/tests re-review — evidencias WBS — 2026-07-15

**Fecha:** 2026-07-15
**Build:** carga, descarga y persistencia privada de evidencias WBS
**Modo:** revisión final de build
**Resultado docs/tests:** **aprobado_con_riesgos**

## 1. Evidencia revisada

| Verificación | Evidencia | Resultado de revisión |
|---|---:|---|
| `testing/backend/test_actividad_archivos.py` | 10 passed comunicados | `--collect-only` confirma 10 casos: servicio, rechazos, aislamiento, schema, auditoría de ruta, middleware 413, lifecycle HTTP POST/GET/DELETE y RBAC. |
| Frontend focal | 3 passed comunicados | Dos casos de `ActivityEvidenceService.test.ts` y uno de `WbsNodeModal.test.tsx`. |
| `test_actividad_delete.py` | 16 passed comunicados previamente | Sin regresión reportada en anulación WBS. |
| `test_infrastructure.py` | 1 passed, 1 skipped comunicado previamente | Escritura física validada; ERP omitido por falta de token. |
| `test_regresiones.py` | 3 passed, 3 skipped comunicado previamente | Flujos autenticados omitidos por falta de token. |
| Build frontend | passed comunicado | Sin salida cruda reproducida por este revisor. |
| Lint focalizado de archivos nuevos | passed comunicado | Cierra el riesgo de atribuir al cambio la deuda del lint global. |

Comando ejecutado por este revisor:

```text
python -m pytest --collect-only testing/backend/test_actividad_archivos.py -q
10 tests collected.
```

Este revisor no ejecutó suites reales, build ni lint por sus permisos; los resultados se registran como evidencia comunicada.

## 2. Correcciones confirmadas

1. **Cerrado — controlador sin pruebas:** existe lifecycle HTTP para POST/GET/DELETE, rechazo 413 previo al parser y rechazo RBAC. Con 10 casos, el nuevo servicio/controlador satisface el mínimo de caso feliz, borde y error del mandato backend.
2. **Cerrado — éxito parcial frontend:** `WbsNodeModal.test.tsx` verifica mensaje explícito, refresco mediante `onSaved()` y reintento sin segundo POST de creación.
3. **Cerrado — contrato principal:** `archivo_url` figura como solo lectura y la guía explica el flujo multipart y las rutas de descarga/eliminación.
4. **Cerrado — operación del almacenamiento:** `docs/GUIA_EVIDENCIAS_WBS.md` documenta formatos, autorización, límite previo al parser, volumen, backup, retención al anular, huérfanos y despliegue multihost. El runbook es suficiente para este cambio que reutiliza el storage existente; no se exige un ADR adicional.
5. **Cerrado — configuración:** `.env.example` contiene `STORAGE_PATH`, rango de `STORAGE_MAX_SIZE_MB` y `RATE_LIMIT_ACTIVIDAD_ARCHIVO`, sin secretos.
6. **Cerrado — catálogo y lint:** las suites backend, descarga frontend y modal quedaron registradas; build y lint focalizado están reportados en verde.
7. **Sin cambio de esquema:** `archivo_url` ya existe en `docs/ESQUEMA_BASE_DATOS.md`; no hay DDL/MER nuevo.

## 3. Hallazgos restantes por severidad

### Bloqueante condicional, fuera del alcance WBS

1. `.opencode/agent/graphify-searcher.md` continúa sin seguimiento y no está alineado con el roster canónico de ocho agentes de `AGENTS.md`, `_shared-discovery.md` y ADR-006. **No bloquea evidencias WBS si se excluye del build/commit.** Si se incluye, debe actualizar protocolo, ADR-006, roster y adaptador Codex homólogo.

### Media — riesgos de cobertura y trazabilidad

1. El lifecycle HTTP usa DB falsa y reemplaza la dependencia de permiso; el RBAC se prueba directamente. Quedan sin integración HTTP específica 401, acceso por recurso denegado/404 opaco, actividad anulada/409, rollback/500, reemplazo y fallo de borrado.
2. La matriz de formatos sigue concentrada en PDF. Faltan positivos de PNG/JPEG, TXT/CSV y Office, además de vacío, MIME discordante, doble extensión y symlink. El traversal con separadores sí quedó cubierto.
3. La “auditoría de descargas” del catálogo solo prueba clasificación de ruta; no verifica la creación real del evento de auditoría en middleware.
4. Frontend cubre la recuperación tras éxito parcial, pero no carga exitosa con cierre, edición/reemplazo, `401 -> refresh`, error HTTP de descarga ni URL legada desde `ActivityEvidenceButton`.
5. Infraestructura y Master Health Check siguen parciales por skips de autenticación. No son fallo causal del cambio, pero deben completarse o aceptarse explícitamente como riesgo de release.
6. No se aportó ejecución de `python scripts/sync_docs.py`. El esquema visible está coherente y no cambió, pero el mandato Documentation Master pide registrar su ejecución o una justificación formal al tocar modelos Pydantic.
7. Los reportes finales de backend, frontend y seguridad quedaron en `approved_with_risks`, sin bloqueos.

### Baja — coherencia documental

1. La sección principal de `docs/LLM_GUIDE_CREACION_PROYECTOS.md` explica los endpoints de evidencia, pero la tabla “Endpoints de referencia” todavía no los enumera.
2. `testing/CATALOGO_PRUEBAS.md` mantiene dos secciones numeradas “3”, estados históricos imprecisos para Infra/Regresiones y una descripción de auditoría más amplia que la prueba real.
3. `.env.example` conserva la ruta de contenedor sin aclarar un ejemplo para ejecución local; el runbook sí explica el montaje Docker.

## 4. Pruebas recomendadas de seguimiento

1. HTTP/DB real: 401, 404 opaco, 409 anulada, rollback, reemplazo y fallo de `unlink`.
2. Evento de auditoría real de GET/POST/DELETE y body sin `Content-Length` sobre el middleware 413.
3. Matriz positiva/negativa de todas las familias de archivos permitidas.
4. Frontend: carga exitosa, edición/reemplazo, refresh 401 y botón de URL legada segura/insegura.
5. Repetir infraestructura/regresiones con token de prueba válido antes de release.

## 5. Documentación pendiente no bloqueante

1. Añadir los tres endpoints a la tabla de referencia de la guía LLM.
2. Registrar `sync_docs.py` sin cambios o justificar su no aplicabilidad.
3. Corregir numeración/estados del catálogo y precisar que la auditoría real aún no tiene test de integración.
4. Mantener los reportes finales junto al build para trazabilidad.

## 6. Decisión

**Aprobado_con_riesgos para docs/tests.** No queda un bloqueo obligatorio de documentación o cobertura mínima WBS: las suites están registradas, el controlador y el flujo crítico de reintento tienen pruebas, el runbook y la configuración están documentados, build/lint focalizado pasan y los revisores de backend, frontend y seguridad no reportan bloqueos. El cambio no relacionado del arnés queda excluido del commit.
