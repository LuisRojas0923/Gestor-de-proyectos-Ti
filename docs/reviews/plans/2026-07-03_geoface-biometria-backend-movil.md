# Plan - Correccion de biometria GeoFace movil/backend

**Fecha:** 2026-07-03
**Plan:** Resolver `503 Service Unavailable` en biometria movil y alinear URL/configuracion del backend.
**Autor del plan:** Agente IA (OpenCode)
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Objetivo

Restablecer el flujo de biometria de la app movil GeoFace contra el backend principal, asegurando que:

1. El contenedor backend tenga disponibles las dependencias runtime de biometria (`cv2`, `deepface`, `tf_keras`).
2. `/api/v2/biometria/asistencia` y `/api/v2/biometria/enrolar` no devuelvan `503` por dependencias faltantes cuando el backend esta correctamente construido.
3. La app movil use por defecto la IP LAN del equipo host con puerto `:8000`, no `localhost` ni `:8001`, y conserve la capacidad de configurar servidor manualmente.
4. Las llamadas protegidas desde movil envien `Authorization: Bearer <token>` sin debilitar seguridad/RBAC en backend.
5. La evidencia de validacion quede documentada antes de reconstruir o dar por cerrado el incidente.

### Evidencia actual

| Evidencia | Resultado |
|---|---|
| `docker compose ps` | `backend` arriba en `0.0.0.0:8000`; DB healthy |
| `GET /api/v2/health` | `200 OK` |
| `POST /api/v2/biometria/asistencia` | `503 Service Unavailable` |
| Import check en contenedor | `{'cv2': False, 'deepface': False}` |
| `backend_v2/requirements.txt` | declara `deepface==0.0.86`, `tf-keras==2.16.0`, `opencv-python-headless==4.9.0.80` |
| App movil `faceApi.ts` | default `http://192.168.0.21:8001/api/v2` |
| Logs backend | `/auth/login` 200, `/auth/yo` 200, `/auth/analistas` 401, biometria 503 |

## 2. No-objetivos

- No desactivar autenticacion ni RBAC para resolver el `401` de `/auth/analistas`.
- No quitar el guard de `503` del backend; debe permanecer como modo degradado cuando falten dependencias.
- No cambiar esquema de base de datos salvo hallazgo nuevo justificado.
- No tocar modulos no relacionados como nomina/horas extras o frontend web.
- No migrar la app a HTTPS/productivo en esta fase, salvo dejar documentado el riesgo.
- No instalar dependencias sin reconstruccion verificable del contenedor backend.

## 3. Archivos / modulos afectados

- `backend_v2/requirements.txt`
- `backend_v2/Dockerfile` o archivo Docker equivalente si el rebuild no instala dependencias declaradas
- `backend_v2/app/api/biometria/biometria_router.py`
- `backend_v2/app/main.py` solo si se ajusta precarga/health de biometria
- `testing/backend/test_biometria_runtime.py` o tests equivalentes nuevos
- `testing/CATALOGO_PRUEBAS.md` si se agregan pruebas nuevas
- `movil/src/services/faceApi.ts`
- `movil/src/services/auth.ts`
- `movil/src/screens/LoginScreen.tsx`
- `movil/app.json` solo si se parametriza URL por `extra`/EAS
- `docs/reviews/builds/` para reporte de implementacion

## 4. Pasos de implementacion

1. Congelar alcance y estado inicial.
   - Registrar `docker compose ps`, logs relevantes y resultado del import check de `cv2`, `deepface`, `tf_keras`.
   - Confirmar que el backend activo es el contenedor expuesto en `:8000`.
   - Excluir cambios no relacionados de nomina/horas extras del build de esta correccion.

2. Corregir runtime de biometria en backend.
   - Ejecutar rebuild real del backend con cache limpia para instalar dependencias declaradas.
   - Verificar dentro del contenedor: `import cv2`, `from deepface import DeepFace`, `import tf_keras`.
   - Si el rebuild no basta, revisar Dockerfile, librerias del sistema y compatibilidad TensorFlow/Keras.
   - Mantener `opencv-python-headless`; no usar OpenCV GUI.
   - Mantener el guard de `503` para dependencia ausente.

3. Agregar o ajustar pruebas backend solo si hay cambios de codigo.
   - Mockear `DeepFace.represent` para no depender de modelos pesados en tests.
   - Cubrir dependencia ausente -> `503`.
   - Cubrir usuario sin embedding -> `404`.
   - Cubrir imagen invalida -> `400` o `422`.
   - Cubrir llamada sin token -> `401`.
   - Evitar logs con imagenes, embeddings o datos sensibles.

4. Alinear configuracion movil de servidor.
    - Cambiar `DEFAULT_SERVER_PORT` de `8001` a `8000` si la app debe usar el backend principal.
    - Usar la IP LAN del equipo host, por ejemplo `http://192.168.0.21:8000/api/v2`; desde el movil no usar `localhost` porque resolveria al propio dispositivo.
    - Asegurar que `setServerAddress()` infiera `:8000` cuando se ingresa solo una IP.
   - No mutar permanentemente `API_BASE` cuando se prueba una conexion y falla o se cancela el modal.
   - Mantener compatibilidad con valores guardados en `@server_ip`, incluyendo IP con puerto explicito.
   - Evaluar una accion de UX para restaurar servidor por defecto.

5. Corregir uso de token en llamadas moviles protegidas.
   - Revisar `getStoredAccounts()` y cualquier llamada a `/auth/analistas` para enviar `Authorization: Bearer <token>`.
   - No cambiar backend para hacer publico `/auth/analistas`.
   - Confirmar que `/auth/analistas` sin token siga retornando `401`.

6. Revisar seguridad minima del flujo biometrico.
   - Confirmar que enrolamiento, asistencia, historial y evidencias requieren usuario autenticado.
   - No aceptar `userId` del cliente como identidad autoritativa.
   - Revisar si `/biometria/foto/{filename}` y `/biometria/evidencia/{filename}` requieren auth/ownership/admin.
   - Remover o planear remocion de `token_sesion` en query params del heartbeat; no bloquear esta correccion si queda como deuda separada, pero documentar riesgo.

7. Validar extremo a extremo.
   - Backend import check OK.
    - Health OK en `:8000` desde host y desde la IP LAN usada por el movil.
   - Login movil OK.
   - `/auth/yo` OK con token.
   - `/auth/analistas` OK o `403` segun rol con token, `401` sin token.
   - `/biometria/asistencia` deja de retornar `503` por dependencia ausente.
   - App movil persiste servidor y conserva config tras reinicio.

8. Registrar build review.
   - Crear reporte en `docs/reviews/builds/YYYY-MM-DD_geoface-biometria-backend-movil.md`.
   - Incluir comandos ejecutados, evidencia de logs, resultado de import check y pruebas manuales moviles.

## 5. Comandos de validacion

### Backend / Docker

- `docker compose ps`
- `docker compose logs --tail=250 backend`
- `docker compose build --no-cache backend`
- `docker compose up -d backend`
- `docker compose exec backend python -c "import cv2; from deepface import DeepFace; import tf_keras; print({'cv2': cv2.__version__, 'deepface': DeepFace is not None, 'tf_keras': tf_keras.__version__})"`
- `curl http://localhost:8000/api/v2/health`
- `curl http://<IP_LAN_HOST>:8000/api/v2/health` para validar la misma URL que usara el movil

### Backend tests si cambia codigo

- `docker compose exec backend python -m pytest testing/backend/test_biometria_runtime.py -v`
- `docker compose exec backend python -m pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -v`

### Mobile

- `cd movil && npm run typecheck` si existe script o se agrega.
- `cd movil && npm run lint` si existe script o se agrega.
- Validacion manual en app:
  - instalar/abrir sin `@server_ip` guardado.
  - guardar `192.168.0.21` y confirmar que usa `:8000`.
  - guardar `192.168.0.21:8000`.
  - guardar URL con `/api/v2` y confirmar que no duplica path.
  - probar conexion fallida y confirmar que no queda persistida accidentalmente.
  - login, enrolamiento, asistencia e historial.

## 6. Impacto en documentacion

- [x] `docs/reviews/plans/2026-07-03_geoface-biometria-backend-movil.md`
- [ ] `docs/reviews/builds/2026-07-03_geoface-biometria-backend-movil.md` con evidencia final.
- [ ] `testing/CATALOGO_PRUEBAS.md` si se agregan tests backend.
- [ ] `docs/GUIA_DESARROLLO.md` si se formaliza el puerto `8000` para la app movil GeoFace.
- [ ] `docs/decisions/ADR-NNN-*.md` no requerido salvo que se adopte una politica durable de biometria/HTTPS/token handling.

## 7. Evaluacion de riesgos

| Riesgo | Probabilidad | Mitigacion |
|---|---|---|
| Rebuild sin `--no-cache` conserva imagen sin `cv2/deepface` | M | Usar build limpio y validar imports dentro del contenedor |
| DeepFace/TensorFlow falla por compatibilidad o librerias del sistema | M | Verificar import runtime, revisar Dockerfile y pins antes de tocar negocio |
| Primer uso descarga modelos o consume mucha memoria | M | Probar preload y endpoint con logs, documentar tiempo/memoria |
| App movil sigue usando `:8001` por valor guardado antiguo | M | Mantener override explicito, agregar reset/default y pruebas con `@server_ip` viejo |
| `handleTestConnection()` deja `API_BASE` apuntando a servidor fallido | M | Probar candidato sin persistir o restaurar valor previo si falla/cancela |
| Se intenta resolver `401` bajando seguridad | B | Mantener backend protegido y corregir headers en cliente |
| Tokens en query params quedan en logs | A | No ampliar ese patron; planear migracion de heartbeat a header Authorization |
| Evidencias/fotos biometricas quedan accesibles sin control | M | Revisar auth/ownership/admin antes de cerrar build |
| Cambios se mezclan con modificaciones no relacionadas | M | Limitar commit/build a archivos listados en este plan |

## 8. Matriz de subagentes

```text
Subagente | Motivo | Resultado | Bloquea
----------|--------|-----------|---------
harness-router | Recomendar matriz para plan backend/movil/security | required: scope, backend, mobile, security; docs-tests en build | no
scope-reviewer | Validar alcance y fronteras del plan | approved_with_risks | no
backend-reviewer | Revisar dependencias runtime, FastAPI y validacion Docker | approved_with_risks | no
mobile-reviewer | Revisar URL base, persistencia y pruebas moviles | approved_with_risks | no
security-rbac-reviewer | Revisar auth, RBAC, PII y tokens | approved_with_risks | no
docs-tests-reviewer | Revisar evidencia y catalogo de pruebas en build | pendiente | no para plan; si para cierre build
```

## 9. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos` (riesgos documentados arriba)
- [ ] `bloqueado` (motivos en columna "Bloquea")

## 10. Criterios de aceptacion

| Criterio | Meta |
|---|---|
| Backend health | `GET /api/v2/health` responde `200` |
| Imports biometricos | `cv2`, `DeepFace`, `tf_keras` importan dentro del contenedor backend |
| Biometria runtime | `/api/v2/biometria/asistencia` no retorna `503` por dependencias faltantes |
| Auth protegida | Endpoints protegidos sin token retornan `401` |
| Cliente movil | Default y configuracion manual apuntan a la IP LAN del host con `:8000` cuando no hay puerto explicito; no usan `localhost` |
| `/auth/analistas` | Envia `Authorization` desde movil; sin token sigue `401` |
| Evidencia | Build review con logs, comandos y resultado manual movil |

## 11. Notas adicionales

- El `503` actual es un sintoma correcto del guard defensivo agregado en backend. El arreglo no debe ocultar ese error, sino asegurar que el contenedor tenga las dependencias instaladas.
- La advertencia `REDIS_PASSWORD` vacia no bloquea biometria, pero debe tratarse como hardening separado.
- Los valores de CPU mayores a 100% en metricas parecen medicion multicore/contenedor; no forman parte de esta correccion.
