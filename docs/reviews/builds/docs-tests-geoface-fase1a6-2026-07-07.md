# Docs/tests review - GeoFace Fase 1A.6 limpieza legacy y documentacion movil

**Fecha:** 2026-07-07  
**Scope:** `geoface-fase1a6-docs-legacy`  
**Decision:** `approved_with_risks`

## Hallazgos

### MEDIO - El reporte de build aun marca revisores como pendientes

- Archivo: `docs/reviews/builds/2026-07-07_geoface-fase1a6-docs-legacy.md:22-28`.
- Impacto: si ese archivo se usa como cierre canonico de Fase 1A.6, queda desactualizado porque lista `mobile-reviewer`, `security-rbac-reviewer` y `docs-tests-reviewer` como pendientes.
- Requerido: actualizar ese reporte o enlazar los reportes finales de revisores antes de usarlo como evidencia de cierre.

### MEDIO - Legacy aislado por documentacion, pero aun ejecutable en `face-server/`

- Archivos: `movil/face-server/Dockerfile`, `movil/face-server/start.bat`, `movil/face-server/server.py`.
- Evidencia: no encontre referencias operativas en app movil TypeScript ni compose YAML; las referencias Markdown revisadas tratan `/v1/*` como historicas/no productivas.
- Riesgo: una busqueda global sigue encontrando endpoints `/v1/*` y puerto `5005` dentro del propio legado. La evidencia de grep debe aclarar que el legado se excluye o se mantiene como riesgo aceptado.
- Requerido: decidir eliminar/archivar fisicamente `movil/face-server/` o mantener advertencia explicita hasta aprobacion del equipo.

### BAJO - El legado se nombra como Flask aunque el codigo es FastAPI/Uvicorn

- Archivos docs: `movil/API_CONTRACT.md`, `movil/docs/ARQUITECTURA.md`, `movil/face-server/README.md`, `movil/docs/agents/performance-analyzer.md`.
- Evidencia codigo: `movil/face-server/server.py:7` importa `FastAPI`; `movil/face-server/requirements.txt:1-2` declara `fastapi` y `uvicorn`.
- Requerido: reemplazar "Flask" por "FastAPI/DeepFace legacy" o por "servidor legacy DeepFace" para no introducir conocimiento historico inexacto.

## Required tests

- No se requieren pruebas nuevas para Fase 1A.6 porque el scope revisado es documental/legacy y no modifica logica de backend ni modelos.
- Evidencia reportada por implementacion: `npm --prefix movil run typecheck` PASS, registrada en `docs/reviews/builds/2026-07-07_geoface-fase1a6-docs-legacy.md:44-47`.
- Verificacion de coleccion ejecutada por este reviewer: `python -m pytest --collect-only testing/backend/test_biometria_engine_api.py testing/backend/test_biometria_engine_client.py testing/backend/test_biometria_service.py testing/backend/test_biometria_router_engine.py` -> 26 tests collected; solo warnings deprecatorios.
- Para cierre productivo posterior siguen requeridos: ejecucion real de suite backend biometria, validacion owner/admin de evidencias, endpoints protegidos sin token `401`, APK preview en Android fisico.

## Required docs

- Actualizar el reporte de build si sera artefacto de cierre: reemplazar estados `pendiente` por decisiones finales o enlaces.
- Corregir la etiqueta "Flask" del legado por FastAPI/DeepFace o termino generico.
- Mantener el plan/checklist con la accion pendiente de eliminar o archivar `movil/face-server/`.
- No aplica actualizar `docs/ESQUEMA_BASE_DATOS.md`: no hay cambios de modelos/schema en esta fase.
- No aplica actualizar ADR-006: no hay cambios en `.agents/skills/` ni `.opencode/agent/`.

## Decision

`approved_with_risks`.

La documentacion movil queda alineada con `/api/v2`, `backend_v2` y `biometria-engine`, y las referencias operativas a `/v1/*` aparecen tratadas como legacy. Los riesgos aceptados son trazabilidad pendiente en el reporte de build, mantenimiento temporal de un legado ejecutable y una etiqueta tecnica inexacta sobre Flask.
