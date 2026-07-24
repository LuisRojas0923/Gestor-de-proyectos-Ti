# Plan de implementación PR3: WebSocket y autenticación/JTI

**Rama:** `feat/auditoria-ws-auth`  
**Base actual:** `origin/main` (`e65449c5`)  
**Perfil auditor pendiente:** `auditoria-ws-auth`  
**Dependencia:** la integración frontend final debe hacerse después de que PR2 esté integrada en `main`.

## Objetivo

Agregar actualización en tiempo real al dashboard de auditoría sin exponer JWT en URLs, sin enviar evidencia cruda y con autenticación vinculada a una sesión/JTI revocable.

## Estado actual relevante

- `ServicioAuth.crear_token_acceso()` ya genera `jti` y `token_type`.
- `Sesion` ya declara `jti`, `tipo_sesion` y `scope`.
- `structural_blindaje.py` ya crea las columnas e índice único parcial para `sesiones.jti`; PR3 no debe crear una migración duplicada.
- El login crea el JWT y registra la sesión, pero no persiste explícitamente el mismo `jti`.
- `/auth/refresh` genera un nuevo JTI, pero no rota atómicamente la sesión almacenada.
- La validación de sesión por JTI está implementada principalmente para tokens MCP, no para sesiones web.
- El router de auditoría actual solo expone REST; no existe el WebSocket de auditoría.
- Redis ya está disponible en el entorno, pero el canal de auditoría debe tener contrato y lifecycle propios.

## Cortes de alcance

### Incluido

- Persistencia y validación consistente del JTI de sesiones web.
- Rotación atómica de sesión en refresh.
- Revocación por logout, refresh, administración y expiración.
- Ticket WebSocket opaco, temporal y de un solo uso.
- Endpoint REST protegido para emitir tickets.
- Handshake WebSocket autenticado y autorizado antes de `accept()`.
- Redis para consumo atómico, revocación y broadcast entre workers.
- Mensajes de invalidación de estadísticas sin PII.
- Hook frontend separado para conexión, reconexión y cleanup.
- ADR, catálogo de pruebas, bitácora y evidencia de Docker/PostgreSQL/Redis.

### Excluido

- Reservas de salas y migraciones PostgreSQL de reservas.
- Cambios en `frontend/dist` o CI global.
- Restauración completa de `restaurar-tablas-auditoria`.
- JWT, refresh token o JTI en query string.
- Snapshots JSONB, IP, User-Agent, cédulas u otra evidencia cruda en mensajes WS.
- Nuevo módulo RBAC: debe reutilizarse `auditoria_sistema`.

## Fases

### PR3-A: Sesiones y JTI

1. Escribir primero pruebas de login, refresh, logout y concurrencia.
2. Generar un JTI antes de crear el JWT de sesión web.
3. Persistir el mismo JTI en `sesiones` junto con el token y metadatos existentes.
4. Crear un servicio async de sesión activa que valide usuario, tipo de sesión, expiración, `fin_sesion` y JTI.
5. Rotar refresh de forma transaccional con `SELECT ... FOR UPDATE`:
   - Bloquear la sesión asociada al JTI antiguo.
   - Rechazar sesiones ya finalizadas o expiradas.
   - Marcar la sesión anterior como finalizada.
   - Crear la nueva sesión con el nuevo JTI.
   - Confirmar la transacción antes de devolver el token.
6. Hacer que un refresh repetido del token anterior falle de forma controlada.
7. Publicar la revocación del JTI en Redis para cerrar conexiones WS activas.
8. Definir explícitamente la política de tokens legacy sin JTI y separar tokens MCP de sesiones web.

### PR3-B: Ticket y WebSocket backend

1. Crear `POST /auditoria/ws-ticket`, protegido por autenticación real y permiso `auditoria_sistema`.
2. Emitir un ticket aleatorio, opaco y de corta duración, por ejemplo 60 segundos.
3. No guardar el secreto crudo: guardar hash/HMAC, usuario, JTI, propósito, expiración y estado de consumo en Redis.
4. Consumir el ticket atómicamente con operación one-shot; un replay debe fallar aunque ocurra en paralelo.
5. Transportar el ticket fuera de la URL, preferiblemente mediante `Sec-WebSocket-Protocol` con protocolo constante aceptado por el servidor; nunca reflejar el secreto como subprotocolo aceptado.
6. Validar antes de `websocket.accept()`:
   - Ticket válido, vigente y no consumido.
   - JTI ligado a una sesión web activa.
   - Usuario activo.
   - Permiso `auditoria_sistema` vigente.
   - `Origin` exacto dentro de la allowlist.
7. Implementar `ws_manager` separado del manager de tickets:
   - Límite de conexiones por usuario.
   - Heartbeat y timeout.
   - Backpressure y tamaño máximo de mensaje.
   - Cleanup garantizado en desconexión, error y shutdown.
   - Pub/sub Redis para múltiples workers.
8. Emitir únicamente eventos de invalidación/coalescing, por ejemplo `auditoria.stats.invalidated`, sin datos de auditoría crudos.
9. Revalidar sesión/JTI durante la conexión y cerrar sockets cuando llegue una revocación.
10. Configurar allowlist de `Origin`, TTL, heartbeat, límites y Redis en `.env.example`; producción debe fallar cerrada si falta la configuración obligatoria.

### PR3-C: Integración frontend después de PR2

1. Crear `useAuditoriaWebSocket` separado de `useAuditoriaStats`.
2. Obtener un ticket mediante REST autenticado antes de cada conexión.
3. Derivar `ws`/`wss` desde la URL actual y centralizar rutas en `config/api.ts`.
4. No leer ni transportar el JWT en la URL del WebSocket.
5. Implementar reconexión con backoff limitado, jitter, máximo de intentos y pausa ante `401/403`.
6. Mantener HTTP como fuente de verdad; un evento WS solo dispara una recarga agrupada de estadísticas.
7. Evitar refresh concurrente mediante single-flight en el cliente de autenticación.
8. Detener socket y timers al desmontar, cerrar sesión o cambiar de usuario.
9. Integrar el hook en el dashboard solo cuando PR2 esté en `origin/main`.
10. Usar `Callout`, `Badge`, `Spinner`, `Button` y tokens existentes para estados de conexión; no comunicar estados solo por color.

## Archivos probables

### Backend

- `backend_v2/app/api/auth/login_router.py`
- `backend_v2/app/api/auth/refresh_router.py`
- `backend_v2/app/api/auth/profile_router.py`
- `backend_v2/app/api/auditoria/router.py`
- `backend_v2/app/services/auth/servicio.py`
- `backend_v2/app/services/auth/sesion_service.py`
- Nuevo `backend_v2/app/services/auditoria/ws_ticket_service.py`
- Nuevo `backend_v2/app/services/auditoria/ws_manager.py`
- Configuración de rate limits, Redis y Origin solo si es necesario
- `backend_v2/app/main.py` únicamente para startup/shutdown del manager si aplica

### Frontend

- `frontend/src/config/api.ts`
- `frontend/src/services/AuthService.ts` si se requiere single-flight
- Nuevo `frontend/src/hooks/useAuditoriaWebSocket.ts`
- Nuevo test del hook y del cliente de ticket
- `frontend/src/pages/ServicePortal/pages/AuditoriaIndicadores/` después de integrar PR2

### Pruebas

- `testing/backend/test_auth_sessions_jti.py`
- `testing/backend/test_auth_refresh.py`
- `testing/backend/test_auditoria_ws_ticket.py`
- `testing/backend/test_auditoria_ws.py`
- `testing/backend/test_auditoria_ws_redis.py`
- Tests Vitest del hook, ticket, cleanup, reconexión y estados de auth

## Tests obligatorios

### Sesiones/JTI

- Login persiste el JTI exacto presente en el JWT.
- Refresh válido rota JTI y sesión en una transacción.
- Refresh repetido del token anterior devuelve `401`.
- Dos refresh concurrentes producen como máximo una rotación válida.
- Logout revoca la sesión correcta.
- Usuario inactivo, sesión finalizada, JTI inexistente y sesión expirada devuelven `401`.
- Tokens MCP no se convierten silenciosamente en sesiones web.
- Política de tokens legacy sin JTI cubierta explícitamente.

### Ticket WebSocket

- Emisión `401`, `403` y `200` con permiso efectivo.
- Ticket expirado, alterado, inexistente y reutilizado.
- Replay concurrente: solo una conexión consume el ticket.
- Redis caído: comportamiento fail-closed.
- El ticket queda ligado a usuario, JTI y propósito.

### WebSocket

- Origin ausente, incorrecto y permitido.
- Validación de RBAC antes de aceptar.
- Usuario/JTI revocado durante la conexión.
- Broadcast entre workers mediante Redis.
- Mensaje malformado, límite de tamaño y backpressure.
- Heartbeat, timeout, desconexión, excepción y shutdown limpian recursos.
- No se emiten snapshots, IP, User-Agent ni datos personales.

### Frontend

- Ticket solicitado antes de conectar y renovar al reconectar.
- Nunca aparece JWT en URL, logs ni estado serializado.
- Mensaje WS dispara como máximo una recarga agrupada.
- Backoff, límite de intentos, logout y cleanup.
- Estados loading/error/offline accesibles.

## Documentación y evidencia

- Crear `docs/decisions/ADR-008-autenticacion-jti-websocket.md`.
- Crear `docs/bitacora/2026-07-24-pr3-websocket-auth-jti.md` después de implementar.
- Actualizar `testing/CATALOGO_PRUEBAS.md` con suites, dependencias y skips.
- Actualizar `.env.example` sin tocar secretos reales.
- Sincronizar `docs/ESQUEMA_BASE_DATOS.md` si el cambio físico de sesiones resulta necesario.
- Crear perfil externo `auditoria-ws-auth` antes de la primera auditoría de build.

## Gates antes de abrir PR3

- [ ] PR2 integrada en `main` antes de integrar cambios frontend.
- [ ] PR3-A y PR3-B pasan pruebas backend con PostgreSQL y Redis.
- [ ] No existe JWT en query string, subprotocolo reflejado, logs ni reportes.
- [ ] Ticket one-shot y rotación JTI tienen pruebas de replay/concurrencia.
- [ ] Origin y RBAC se validan antes de `accept()`.
- [ ] Revocación cierra sockets activos.
- [ ] Frontend mantiene HTTP como fuente de verdad.
- [ ] Vitest focal, pytest focal, Docker smoke, build y lint focal pasan.
- [ ] Auditor ejecutado con worktree checkoutado en la rama real, base `origin/main`, head `feat/auditoria-ws-auth` y perfil correcto.
- [ ] Diff final excluye reservas, migraciones y cambios globales no relacionados.
