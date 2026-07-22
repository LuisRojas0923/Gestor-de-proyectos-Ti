# Security/RBAC review: approved_with_risks

**Alcance:** re-revision de Fase tecnica 0 de Bitacoras Operacionales: REST/WS de notificaciones, esquema RBAC con puntos, validacion por hash de sesion, auditoria sin commit/supresion manual/correlacion UUID, `ProtectedRoute` fail-closed/all-of y pruebas relacionadas. Se ignoraron cambios concurrentes ajenos.

**Evidencia recibida (no reejecutada por este revisor):** backend combinado 38 passed; frontend 10 passed; build y lint focal passed.

## Checklist results

- Auth en endpoints: ✅
- Schemas sin dict: ✅
- PK con Field(pattern): ✅
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ✅

## Findings restantes, ordenados por severidad

### BAJO — La revalidacion de 30 segundos depende de inactividad del cliente

**Referencias:** `backend_v2/app/api/notificaciones/router.py:150-160`; cobertura relacionada en `testing/backend/test_bitacoras_operacionales_fase0.py:172-194`.

El `asyncio.wait_for(receive_text(), timeout=30)` revalida solo cuando pasan 30 segundos sin un frame de texto. Un cliente autenticado puede enviar texto antes del timeout y posponer indefinidamente el cierre periodico de un socket revocado. La barrera de confidencialidad si queda cerrada porque cada broadcast revalida la sesion antes de `send_text` (`backend_v2/app/services/notificacion/ws_manager.py:182-197`), por lo que el socket no recibe la notificacion posterior. El riesgo residual es permanencia y consumo de recursos, no fuga observada. CWE-613, CWE-400.

**Fix recomendado:** usar un reloj monotonic o una tarea periodica independiente de los frames entrantes, o cerrar/rechazar frames del cliente en este canal unidireccional. Agregar una prueba donde el cliente envie texto continuamente y aun asi el socket revocado cierre al vencer el intervalo.

### BAJO — Redis no tiene timeouts de I/O explicitos en el manager de tickets

**Referencias:** `backend_v2/app/services/notificacion/ws_manager.py:29-44`, `backend_v2/app/services/notificacion/ws_manager.py:95-126`; prueba actual `testing/backend/test_bitacoras_operacionales_fase0.py:155-169`.

El outage sin cliente Redis falla cerrado, pero `redis.from_url` no configura `socket_connect_timeout` ni `socket_timeout`. Una red que descarte paquetes puede mantener pendiente la emision/consumo del ticket antes de producir el 503/1013, y el backoff del navegador solo comienza cuando termina la solicitud. La prueba actual cubre ausencia inmediata de Redis, no un Redis bloqueado. CWE-400.

**Fix recomendado:** configurar timeouts cortos de conexion/operacion y cubrir timeout, 503/1013 y recuperacion. No debe agregarse fallback local para tickets.

## Hallazgos anteriores cerrados

- **Sesion revocada/expirada:** handshake valida con una sesion DB corta antes de aceptar (`router.py:126-149`); cada broadcast revalida y cierra antes de enviar (`ws_manager.py:182-211`); existe comprobacion periodica best-effort (`router.py:150-160`).
- **Ticket/JWT leakage:** el JWT queda solo en `Authorization`; el ticket viaja como subprotocolo, no en URL (`NotificationsContext.tsx:90-95`), se liga a Origin/sesion (`ws_manager.py:88-143`) y la respuesta usa `no-store, private` (`router.py:104-109`).
- **Replay, IDOR e identidad elegida por cliente:** ticket con TTL, clave hasheada y `GETDEL`; REST deriva `usuario.id`; mutacion filtra `notificacion_id + usuario_id` (`router.py:49-76`, `servicio.py:91-110`).
- **Origin spoofing web:** el POST de ticket y el handshake exigen allowlist exacta; el ticket conserva el Origin emisor y se compara antes de aceptar (`router.py:27-47`, `router.py:86-98`, `router.py:116-140`).
- **Redis outage y logging:** tickets fallan cerrado; endpoint limitado a 12/min; cliente aplica backoff exponencial con jitter (`router.py:79-103`, `NotificationsContext.tsx:60-77`); logs Redis son genericos (`ws_manager.py:41-67`, `ws_manager.py:174-175`).
- **ProtectedRoute:** permisos explicitos se comprueban all-of y ya no son omitidos por bypass admin/general (`ProtectedRoute.tsx:29-57`), con regresiones en `ProtectedRoute.test.tsx:107-135`.
- **Auditoria:** el prefijo futuro de bitacoras excluye el body independientemente del handler (`auditoria_middleware.py:137-147`, `auditoria_middleware.py:193-201`); no-commit, supresion manual y UUID permanecen vigentes.
- **RBAC granular:** el patron exige segmentos no vacios y rechaza wildcard, traversal, puntos iniciales/finales o repetidos (`usuario.py:17-24`; `test_bitacoras_operacionales_fase0.py:29-46`). Las comprobaciones siguen siendo exactas, sin matching por prefijo.

## RBAC/config impact

No se agregan aun rutas funcionales de Bitacoras, por lo que no corresponde registrar `bitacoras_operacionales.*` en `rbac_manifest.py` durante Fase 0. Antes de habilitar fases funcionales deben incorporarse sus IDs exactos al manifiesto y proteger cada endpoint en backend; `ProtectedRoute` sigue siendo solo defensa de UI.

## Blocking reasons

Ninguno. Los riesgos restantes afectan robustez de cierre/timeout y no reabren IDOR, replay, fuga de ticket/JWT ni entrega posterior a una sesion revocada.

**Severity maxima:** BAJO
**Conteo:** ALTO 0, MEDIO 0, BAJO 2.
**Verdict:** **approved_with_risks**.

## Memory handoff

No se modifico `.opencode/memory/security-rbac-reviewer.json`: `_shared-discovery.md` §6 restringe este rol a escritura bajo `docs/reviews/builds/`. Entrada propuesta para el orquestador/error-memory: `2026-07-21`, scope `bitacoras-fase0-notificaciones-rbac-auditoria-protected-route-rereview`, outcome `approved_with_risks`, findings `{alto:0, medio:0, bajo:2}`, CWE `[613,400]`.
