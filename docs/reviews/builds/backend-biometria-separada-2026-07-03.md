# Plantilla — Reporte de Revisión de Build

**Fecha:** 2026-07-03
**Build:** separación de biometría en `biometria_engine/` + cliente/servicio backend
**Autor del build:** no indicado
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `biometria_engine/` — nuevo servicio interno FastAPI para DeepFace/OpenCV/TensorFlow.
- `backend_v2/app/api/biometria/biometria_router.py` — router adelgazado con RBAC y delegación al servicio.
- `backend_v2/app/services/biometria/biometria_service.py` — lógica de negocio, persistencia DB/archivos y comparación vectorial.
- `backend_v2/app/services/biometria/biometria_engine_client.py` — cliente HTTP async hacia el motor.
- `backend_v2/app/main.py` — elimina precarga DeepFace del backend principal y valida token del motor.
- `backend_v2/requirements.txt` — elimina dependencias DeepFace/TensorFlow/OpenCV del backend principal.
- `docker-compose.yml` — agrega servicio `biometria-engine` y red interna.
- `testing/backend/test_biometria_*.py` — nuevas pruebas de cliente, servicio, RBAC y API del motor.
- `docs/ESQUEMA_BASE_DATOS.md`, `docs/GUIA_DESARROLLO.md`, `testing/CATALOGO_PRUEBAS.md` — documentación relacionada.

Nota: el árbol de trabajo contiene otros cambios no biométricos (`novedades_nomina`, tests de horas extras, memoria mobile) que no fueron revisados como parte de este alcance.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | bloqueado | sí | Revisión estática + `pytest --collect-only` permitido. |

## 3. Hallazgos bloqueantes

### Alta — `test_biometria_engine_api.py` puede colgar la colección de tests del backend

- Evidencia: `python -m pytest --collect-only testing/backend/test_biometria_service.py testing/backend/test_biometria_engine_client.py testing/backend/test_biometria_router_engine.py testing/backend/test_biometria_engine_api.py` excedió 120 s sin salida.
- La causa probable es que `test_biometria_engine_api.py` ejecuta `pytest.importorskip("deepface")` y luego importa `biometria_engine.app.main`, lo que arrastra `face_engine`/DeepFace en fase de colección.
- Impacto: la suite biométrica no es confiable en CI/host si DeepFace está presente pero pesado; incumple la obligación de pruebas automatizadas ejecutables para el cambio.
- Requerido: aislar pruebas livianas de auth/token del motor sin importar DeepFace en colección, o condicionar explícitamente con variable/marker de integración y documentar el comando Docker del engine.

### Alta — `ON CONFLICT (usuario_id)` depende de una constraint que no está blindada

- `BiometriaService.enrolar_rostro()` usa `pg_insert(...).on_conflict_do_update(index_elements=["usuario_id"])`.
- El modelo declara `usuario_id` como `unique=True`, pero el blindaje/migración existente solo agrega columnas a `registros_asistencia`; no asegura un índice/constraint único en `embeddings_faciales(usuario_id)` para bases ya desplegadas.
- Impacto: en una DB histórica sin esa constraint, enrolamiento falla con error PostgreSQL tipo “there is no unique or exclusion constraint matching the ON CONFLICT specification”.
- Requerido: migración/blindaje idempotente PostgreSQL para crear/validar la constraint o índice único antes de usar el upsert.

### Alta — nombres de evidencia colisionan bajo concurrencia

- `BiometriaService._filename_evidencia()` usa `f"{usuario_id}_{int(time.time())}{ext}"`.
- Dos marcaciones del mismo usuario en el mismo segundo generan la misma ruta y pueden sobrescribir evidencia, dejando registros diferentes apuntando al mismo archivo.
- Impacto: pérdida/mezcla de evidencia biométrica y riesgo de auditoría bajo reintentos o doble tap móvil.
- Requerido: usar un identificador no colisionable (`uuid4`, `time_ns` + nonce, o ID DB generado antes de guardar) y validar idempotencia/reintentos.

## 4. Hallazgos no bloqueantes

### Media — E/S de archivos síncrona dentro de flujo async

- `_guardar_archivo()` usa `mkdir()` y `write_bytes()` directamente desde endpoints async; `exists()`/`unlink()` también se ejecutan en el event loop.
- Impacto: bloqueo del event loop con imágenes de hasta 6 MB y concurrencia de asistencia/enrolamiento.
- Recomendado: mover E/S a `asyncio.to_thread()` o usar una capa de storage async/worker.

### Media — backend no espera `biometria-engine` saludable

- `docker-compose.yml` define healthcheck del motor, pero `backend` no depende de `biometria-engine: condition: service_healthy`.
- Impacto: después de `docker compose up`, el backend puede aceptar `/biometria/*` mientras TensorFlow/DeepFace aún precarga, causando 503 iniciales.
- Recomendado: agregar dependencia saludable o readiness explícita documentada.

### Media — fallback puede desactivar anti-spoofing ante cualquier `TypeError`

- En `biometria_engine/app/face_engine.py`, cualquier `TypeError` de `DeepFace.represent` provoca reintento sin `anti_spoofing`.
- Impacto: un TypeError no relacionado con compatibilidad de versión puede degradar seguridad facial sin trazabilidad clara.
- Recomendado: limitar el fallback a errores conocidos de parámetro no soportado y registrar warning de degradación.

### Media — pruebas insuficientes para persistencia real y Docker

- Las pruebas actuales cubren cliente, RBAC helper y funciones unitarias, pero no ejercitan enrolamiento/asistencia contra sesión async real ni colisiones de evidencia.
- `testing/CATALOGO_PRUEBAS.md` marca las nuevas pruebas como `PENDIENTE EJECUCION`.
- Recomendado: agregar pruebas con DB async/test transaction para upsert, rollback, creación/eliminación de archivos, evidencia de mismatch y concurrencia básica; ejecutar vía Docker.

### Baja — dependencia directa a `numpy` queda implícita en backend

- `backend_v2/app/services/biometria/biometria_service.py` importa `numpy`, pero `backend_v2/requirements.txt` no lo declara directamente tras mover dependencias IA.
- Aunque puede llegar transitivamente por `pandas`, es frágil para mantenibilidad.
- Recomendado: declarar `numpy` explícitamente si el backend principal lo usa.

### Baja — artefactos `__pycache__` no deben quedar en el árbol de trabajo

- Se observan `backend_v2/app/services/biometria/__pycache__/*.pyc` como archivos no versionados.
- Recomendado: no incluirlos en commit; verificar `.gitignore` si aplica.

## 5. Tests / comandos ejecutados

- `git status --short; git diff --stat` — PASS, inspección read-only.
- `python -m pytest --collect-only testing/backend/test_biometria_service.py testing/backend/test_biometria_engine_client.py testing/backend/test_biometria_router_engine.py` — PASS, 9 tests collected.
- `python -m pytest --collect-only testing/backend/test_biometria_service.py testing/backend/test_biometria_engine_client.py testing/backend/test_biometria_router_engine.py testing/backend/test_biometria_engine_api.py` — FAIL/TIMEOUT, excedió 120 s sin salida.
- No se ejecutó `docker compose`, `pip`, ni tests reales por restricciones del subagente; solo colección de pytest está autorizada.

## 6. Documentacion actualizada

- [x] `docs/ESQUEMA_BASE_DATOS.md` actualizado con tablas biométricas.
- [x] `docs/GUIA_DESARROLLO.md` actualizado con motor biométrico interno.
- [x] `testing/CATALOGO_PRUEBAS.md` actualizado, aunque los nuevos tests figuran como pendientes de ejecución.
- [x] `docs/decisions/ADR-007-biometria-engine-interno.md` existe como nuevo ADR no revisado en profundidad en esta pasada.

## 7. Decision final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos`
- [x] `bloqueado`

Motivos: colección completa de tests biométricos no confiable, falta de blindaje para la constraint usada por `ON CONFLICT`, y colisión de archivos de evidencia bajo concurrencia.

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Aislar `test_biometria_engine_api.py` para que no importe DeepFace en colección del backend o moverlo a suite Docker/engine marcada. | Backend | 2026-07-03 |
| Agregar migración/blindaje idempotente para unique `embeddings_faciales(usuario_id)`. | Backend | 2026-07-03 |
| Reemplazar nombre de evidencia por identificador no colisionable y probar concurrencia/reintentos. | Backend | 2026-07-03 |
| Convertir E/S de archivos a ejecución fuera del event loop. | Backend | 2026-07-04 |
| Hacer que `backend` espere healthcheck de `biometria-engine` o documentar readiness operacional. | DevOps/Backend | 2026-07-04 |
