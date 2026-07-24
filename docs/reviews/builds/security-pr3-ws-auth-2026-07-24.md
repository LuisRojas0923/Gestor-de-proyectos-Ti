# Security/RBAC review — plan PR3 WebSocket + autenticación/JTI

**Fecha:** 2026-07-24  
**Alcance:** sección **PR3: WebSocket y autenticación/JTI** del plan `docs/reviews/plans/2026-07-23_hoja-ruta-prs-auditoria.md` (commit `5ee9bf3c`), comparada con `origin/main`/`e65449c5` y la rama de referencia `restaurar-tablas-auditoria` (`ba87b062`).  
**Modo:** revisión read-only de plan y superficies relacionadas; no se ejecutaron servicios, Docker ni pruebas.  
**Código modificado:** ninguno.  
**Resultado:** **blocked**

## Checklist results

- Auth en endpoints: ❌
- Schemas sin dict: ❌ (el plan no define el contrato Pydantic del endpoint de ticket)
- PK con `Field(pattern)`: N/A
- PUT/PATCH `exclude_unset`: N/A
- No `str(e)` en 500: ❌
- Secrets guard: ❌
- No `print()`: ❌ (no hay criterio de logging para el flujo nuevo)
- PII redacted: ❌
- JWT en query string: ❌ como gate verificable
- Ticket opaco/temporal/one-shot/JTI: ❌ como contrato implementable
- Origin allowlist fail-closed: ❌
- RBAC efectivo y revalidación: ❌
- Rate limits y backpressure: ❌
- Pruebas negativas: ❌

## Hallazgos bloqueantes

### B1 — La prohibición de JWT en URL no tiene un gate backend suficiente

El plan declara correctamente “Nunca transportar JWT en `?token=`”, pero solo exige pruebas frontend “sin JWT en URL”. Falta exigir que el endpoint rechace cualquier `token`, `jwt` o `access_token` en query y que no exista fallback a `websocket.query_params`.

La rama de referencia todavía contiene el patrón `websocket.query_params.get("token")` en el WebSocket de auditoría y su E2E construye `.../ws/dashboard?token=<JWT>`. Por tanto, el criterio textual no basta para impedir que el riesgo conocido vuelva a entrar.

**Gate:** el JWT solo viaja en el `Authorization` del endpoint REST autenticado que emite el ticket; el handshake recibe únicamente el ticket opaco por un canal no-URL (por ejemplo, `Sec-WebSocket-Protocol`), no lo devuelve como subprotocolo aceptado y rechaza query strings de credenciales. Añadir prueba estática/integración para URL, proxy y logs de acceso.  
**CWE:** CWE-598, CWE-200.

### B2 — “Ticket opaco” no está definido con propiedades verificables

El plan no fija TTL, entropía, formato, almacenamiento, hash, consumo atómico ni qué ocurre ante dos handshakes concurrentes. Un ticket temporal sin `GETDEL`/Lua, `UPDATE ... WHERE usado_en IS NULL`, o equivalente transaccional permite replay entre workers.

Debe quedar definido que el ticket:

1. se genera con CSPRNG y entropía suficiente (mínimo 128 bits; preferible 256);
2. tiene TTL corto y explícito (por ejemplo, 30–60 s), respuesta `no-store` y no se persiste en claro;
3. se almacena como hash, ligado a `usuario_id`, `session_id`/`jti`, módulo y expiración;
4. se consume exactamente una vez mediante operación atómica compartida por todos los workers;
5. nunca se acepta si está expirado, usado, malformado, ligado a otra sesión/JTI u otro módulo;
6. falla cerrado si Redis/PostgreSQL no está disponible.

**CWE:** CWE-294, CWE-613, CWE-362, CWE-384.

### B3 — Origin no está especificado como allowlist exacta y fail-closed

“Validar `Origin`” no define una política segura. PR3 necesita una allowlist dedicada para WebSocket, con comparación exacta de esquema/host/puerto; `Origin` ausente, `null`, wildcard `*`, prefijos engañosos y valores no configurados deben rechazarse. En producción una allowlist vacía debe rechazar todo, no incorporar defaults de localhost ni regex amplia de redes privadas.

La allowlist de CORS no sustituye la de WebSocket. Debe documentarse en `.env.example`, probarse en desarrollo, tests y producción, y atravesar nginx sin normalizaciones que amplíen el conjunto permitido. La validación debe ocurrir antes de `accept()` y el error no debe revelar si el ticket era válido.

**CWE:** CWE-346, CWE-942, CWE-287.

### B4 — El ciclo de vida web del JTI no está cerrado en la base actual

En `origin/main`, el login crea un JWT con JTI (`backend_v2/app/api/auth/login_router.py:210-213`), pero la llamada a `registrar_sesion` no le pasa ese JTI (`:215-223`); el servicio sí acepta el parámetro opcional (`backend_v2/app/services/auth/sesion_service.py:49-60`). Además, `obtener_usuario_actual_db` solo consulta la sesión persistida para `token_type == "mcp"` (`backend_v2/app/api/auth/profile_router.py:48-76`) y refresh genera un JTI nuevo sin rotar la fila de sesión (`backend_v2/app/api/auth/refresh_router.py:55-61`).

El ticket no puede ligarse de forma confiable a sesión/JTI hasta que PR3 incluya, en una transacción, persistencia del JTI en login, rotación y revocación del JTI anterior en refresh, logout/desactivación y validación de sesiones web. El WebSocket no debe conservar ni revalidar el JWT persistente; debe revalidar `session_id`/JTI activo en DB y permiso efectivo. Un ticket emitido antes de refresh debe fallar después de la rotación.

**CWE:** CWE-613, CWE-384, CWE-287.

### B5 — Falta contrato de RBAC efectivo para ticket, handshake y socket activo

`auditoria_sistema` ya existe como módulo crítico en `backend_v2/app/core/rbac_manifest.py:270-275`; no se requiere crear un módulo paralelo. El plan debe exigir que el endpoint de ticket y el handshake usen exactamente ese ID y consulten `PermisoRol` + `ModuloSistema.esta_activo`, sin confiar en el rol, en `admin`, en el frontend ni en permisos incluidos en el ticket.

La autorización debe verificarse antes de `accept()` y durante la vida del socket. Revocar `auditoria_sistema`, desactivar el módulo, cambiar el rol, desactivar el usuario, cerrar sesión o revocar el JTI debe cerrar la conexión dentro del intervalo máximo de revalidación definido. La caída de DB/Redis durante revalidación debe cerrar el canal, no mantenerlo abierto por cache local.

También falta un inventario explícito de todos los WebSockets: en `origin/main` `/soporte/ws/{ticket_id}` y `/notificaciones/ws/{usuario_id}` aceptan conexiones sin una dependencia de autenticación visible. Si quedan fuera de PR3, debe declararse y prohibirse reutilizar ese patrón; si PR3 pretende endurecer la infraestructura compartida, requieren migración y pruebas negativas de aislamiento.

**CWE:** CWE-862, CWE-863, CWE-284.

## Hallazgos altos

### A1 — Rate limit, límites de conexión y backpressure no son criterios de aceptación

El plan menciona conexiones/reconexión, pero no define un límite para emitir tickets, intentos de handshake, conexiones por usuario/IP y total distribuido, ni tamaño/frecuencia de mensajes. El manager local tampoco es un límite global cuando existen múltiples workers.

Debe añadirse un rate limit específico para emisión de tickets (por usuario autenticado + IP), límite de intentos de handshake por IP, máximo de sockets por usuario y global compartido, tamaño máximo de frame, cola acotada y cierre ante ráfaga/backpressure. Redis caído debe producir `503`/cierre controlado, nunca fallback ilimitado en memoria. Probar `429`, `1013` y limpieza bajo reconexión masiva.

**CWE:** CWE-307, CWE-400, CWE-770.

### A2 — Mensajes y logs no tienen contrato de minimización/PII

“No enviar snapshots JSONB ni PII técnica” es correcto pero no comprobable sin una allowlist de mensajes. Para el dashboard, el canal debe transportar solo una señal tipada mínima (por ejemplo, tipo de actualización y versión no sensible), nunca cédula, nombre, correo, IP, User-Agent, ruta con identificadores, contenido JSONB, token, ticket o JTI.

El plan debe exigir pruebas que inspeccionen cada mensaje y los logs. No se deben loggear JWT/tickets, `Sec-WebSocket-Protocol`, query strings, cuerpos, PII ni `str(e)`/stack traces. Deben usarse mensajes genéricos de cierre y logs estructurados con correlación no sensible. El enmascarado de `ServicioAuditoria` no debe asumirse como protección automática del payload WebSocket.

**CWE:** CWE-359, CWE-532, CWE-209.

### A3 — Secretos y despliegue no están incluidos en el plan

Un ticket aleatorio no debe usar una contraseña/default público. Si se firma en vez de almacenarse, la clave debe ser dedicada, provenir del entorno/secret manager y tener guard de producción; no se debe reutilizar ni exponer `JWT_SECRET_KEY`. Si se usa Redis, el hash/ticket debe quedar protegido y su URL nunca debe aparecer en logs.

Hay inconsistencia vigente que PR3 debe resolver o dejar explícitamente fuera: `docker-compose.yml` configura Redis con contraseña y una URL con credencial, mientras `docker-compose.prod.yml` y `docker-compose.Pruebas3.yml` usan Redis sin password. El `.env.example` no documenta la allowlist WS ni parámetros del ticket. El `.gitignore` sí excluye `.env` y variantes (`.gitignore:35-40`); no debe relajarse esa regla. Nginx debe preservar `Origin`/subprotocolo, soportar el handshake y no registrar credenciales.

**CWE:** CWE-798, CWE-522, CWE-16.

### A4 — La matriz de pruebas negativas es insuficiente y la evidencia de referencia contradice PR3

El plan enumera 401/403, expiración, reutilización y revocación, pero no exige los casos que prueban las propiedades críticas:

- ausencia de `Authorization` en emisión, usuario sin `auditoria_sistema`, módulo inactivo, usuario desactivado y token/JTI revocado;
- `Origin` ausente, `null`, no permitido, wildcard, prefijo engañoso y producción sin configuración;
- query con JWT, ticket aleatorio, truncado, expirado, usado, usado concurrentemente, ligado a otro usuario/JTI/sesión/módulo;
- login → emisión → refresh/rotación antes del handshake: ticket viejo rechazado; refresh concurrente: solo una rotación válida;
- logout, reset, cambio de rol, revocación de permiso y desactivación mientras el socket está abierto;
- pérdida de Redis/DB, límite de conexiones/mensajes, backpressure, desconexión y limpieza entre workers;
- aserciones de ausencia de PII/JWT/ticket en mensajes, logs, headers de cierre y URLs;
- errores DB con rollback y HTTP 500 genérico, sin `str(e)`.

La prueba E2E de la rama de referencia usa explícitamente `?token=<JWT>`, por lo que debe retirarse y sustituirse por el flujo REST-ticket-subprotocolo antes de considerar PR3 verificable.

**CWE relacionados:** CWE-598, CWE-362, CWE-613, CWE-862, CWE-532.

## RBAC/config impact

- `auditoria_sistema` ya está en el manifiesto SSOT; conservar ese ID y probar su descubrimiento/estado activo. No crear un permiso `auditoria_ws` paralelo salvo decisión documentada y registro en `rbac_manifest.py`.
- El endpoint REST de emisión debe tener `Depends(obtener_usuario_actual_db)` y dependencia de permiso efectivo; el handshake debe validar el registro de ticket, sesión/JTI activo y permiso actual antes de `accept()`.
- La revalidación debe tener intervalo máximo explícito y cierre fail-closed. No usar el frontend `ProtectedRoute` como control de seguridad.
- Añadir configuración versionada para allowlist WS, TTL, límites y backend de tickets; actualizar `.env.example`, compose de desarrollo/producción/Pruebas3 y nginx de forma consistente. No ejecutar Docker en esta revisión.
- Mantener `.env` fuera de Git; no copiar credenciales de compose ni registrar URLs Redis con contraseña.

## Gates obligatorios antes de aprobar

1. Definir contrato de ticket: CSPRNG, TTL corto, hash, binding a `usuario_id` + `session_id`/JTI + módulo, consumo atómico one-shot y almacenamiento compartido.
2. Eliminar cualquier fallback de credencial desde query string; probar que ningún JWT aparece en URL, subprotocolo aceptado, logs o mensajes.
3. Cerrar el ciclo JTI web en login, refresh, logout y revocación; incluir pruebas transaccionales y de carrera.
4. Implementar allowlist exacta y fail-closed de `Origin`, con configuración de producción obligatoria y pruebas de ausencia/wildcard/prefijo.
5. Aplicar `auditoria_sistema` como RBAC efectivo en emisión, handshake y revalidación; probar 401/403/200 y revocación en tiempo de ejecución.
6. Añadir rate limits, límites distribuidos, backpressure y comportamiento fail-closed ante Redis/DB caído.
7. Definir mensaje mínimo sin PII y logging estructurado redactado.
8. Sustituir las pruebas de referencia que usan JWT en query por un E2E real de emisión de ticket y handshake, más la matriz negativa anterior.

## Tests / comandos ejecutados

- `git status`, `git log`, `git diff`, `git show`, lectura y búsquedas focalizadas — inspección completada.
- Auditoría, pytest, Docker/compose, servidores y red — no ejecutados por el alcance read-only y las restricciones del subagente.

## Blocking reasons

El plan no es aprobable todavía: no convierte las reglas de seguridad en un contrato verificable y la rama de referencia conserva el camino de JWT en query. Además, la persistencia/rotación JTI web actual no permite garantizar el binding exigido, y faltan fail-closed de Origin, RBAC de handshake/revalidación, límites, redacción y pruebas negativas de carrera.

**Severidad global:** BLOQUEANTE  
**Conteo:** 5 bloqueantes, 4 altos, 0 medios, 0 bajos.  
**CWE:** CWE-598, CWE-200, CWE-294, CWE-613, CWE-362, CWE-384, CWE-346, CWE-942, CWE-287, CWE-862, CWE-863, CWE-284, CWE-307, CWE-400, CWE-770, CWE-359, CWE-532, CWE-209, CWE-798, CWE-522, CWE-16.
