# Revisión docs/tests — PR3 WebSocket + auth/JTI

**Fecha:** 2026-07-24  
**Alcance:** plan de pruebas, trazabilidad y documentación para PR3  
**Modo:** review read-only  
**Decisión:** **bloqueado** hasta cerrar los gates de seguridad, pruebas y evidencia

No se modificó código ni se ejecutaron Docker, frontend, builds o servidores.

## 1. Línea base revisada

- Al iniciar la revisión, el árbol de trabajo no tenía diff pendiente.
- No existe implementación versionada del PR3 ni un contrato de producción; sí hay reportes read-only de backend/frontend no versionados en esta revisión que coinciden en el bloqueo.
- La interpretación de PR3 usada aquí es el dashboard de auditoría: `POST /api/v2/auditoria/ws-ticket` (ticket opaco) y `/api/v2/auditoria/ws/dashboard` (canal protegido con `auditoria_sistema`). Ninguno existe en el checkout actual.
- Como superficie WebSocket preexistente, también existen `/api/v2/soporte/ws/{ticket_id}` y `/api/v2/notificaciones/ws/{usuario_id}`.
- Esos routers actuales llaman `accept()` sin autenticar ni comprobar que el principal pueda ver el `ticket_id` o `usuario_id` solicitado; sirven como regresión de seguridad, no como contrato del nuevo WS de auditoría.
- Los clientes nativos de `useTicketDetail.ts` y `NotificationsContext.tsx` abren el socket sin credencial.
- `ServicioAuth.crear_token_acceso()` genera `jti`, pero el login web no lo pasa a `registrar_sesion()`. Las filas web de `sesiones` no quedan alineadas con el `jti` del JWT; la validación por JTI existente está acotada a tokens MCP.
- El refresh emite un JTI nuevo sin rotación persistente de la sesión anterior. El ticket WS debe ser opaco, de un solo uso, persistido como hash/HMAC y consumido atómicamente; reutilizar el JWT largo en query string o subprotocolo no satisface PR3.
- `docs/ESQUEMA_BASE_DATOS.md` ya refleja `sesiones.tipo_sesion`, `sesiones.jti` y `sesiones.scope`; esto no prueba que el runtime tenga el índice ni que el JTI web esté persistido correctamente.
- La colección focalizada existente se ejecutó solo en modo `--collect-only`: **76 tests collected**, con una advertencia deprecada de `app.config`; no es evidencia de tests verdes.
- No hay tests con `WebSocket`, `ws://` o `wss://` bajo `testing/` ni tests frontend específicos de WebSocket.

## 2. Hallazgos

### Bloqueantes

1. **Perímetro WebSocket inexistente/abierto.** El canal objetivo de auditoría aún no existe y las superficies WS existentes aceptan sin auth. PR3 no puede aprobarse mientras un cliente pueda conectarse sin credencial, elegir arbitrariamente el recurso de la URL o recibir eventos de un recurso ajeno. La autenticación y autorización deben ocurrir antes de aceptar la conexión.
2. **JTI web no trazable.** La revocación por JTI no puede probarse para la sesión web actual porque el `jti` del JWT no se persiste en la fila de `sesiones`. Debe definirse y probarse la relación JWT ↔ sesión, incluyendo logout, refresh y revocación.
3. **Cobertura inexistente del alcance nuevo.** No existen suites backend/frontend para ticket opaco, handshake, autorización, broadcast, invalidación HTTP, reconexión, limpieza, revocación ni fan-out multi-worker. El catálogo tampoco registra las suites MCP/JTI ya presentes ni una futura suite PR3.
4. **Evidencia Docker no reproducible con el Compose actual.** `backend_v2/Dockerfile` copia solo `backend_v2` y `docker-compose*.yml` no monta `testing/`; por ello `docker compose exec backend python -m pytest testing/backend/...` no es reproducible sin un runner/override que monte los tests. PostgreSQL/Redis y el aislamiento de la DB de pruebas deben quedar explícitos.

### Riesgos altos

5. **No hay decisión de transporte de credencial para navegador.** La API `WebSocket` nativa no permite añadir el header `Authorization` como Axios. El ADR debe elegir cookie segura, subprotocolo o ticket efímero; queda prohibido introducir JWT largo en query string o logs.
6. **Semántica de revocación incompleta.** Debe decidirse si revocar un JTI solo impide nuevos handshakes o también cierra sockets activos, y en qué plazo. Refresh actualmente emite un JTI nuevo sin actualizar/revocar explícitamente la sesión anterior.
7. **Redis/multi-worker y backpressure sin contrato probado.** Compose incluye Redis y `docker-compose.Pruebas3.yml` levanta dos workers, pero no hay prueba de entrega entre workers, aislamiento de salas, cliente lento, timeout, duplicados ni caída de Redis.

### Riesgos medios

8. La documentación MCP describe JTI para tokens MCP, pero no documenta el contrato WebSocket, el origen permitido, códigos de rechazo, límites, retención ni PII de PR3.
9. Vitest usa `jsdom` y no existe un mock/harness de `WebSocket`; tampoco hay Playwright configurado para comprobar el handshake real detrás de Vite/Nginx.
10. `testing/backend/conftest.py` puede cargar `.env` del backend como fallback. La ejecución PR3 debe abortar si `DB_NAME`, host o entorno no están inequívocamente marcados como pruebas; nunca debe usar una DB viva.

## 3. Contrato que debe aprobar el ADR antes de implementar

Recomendación: emitir desde `POST /api/v2/auditoria/ws-ticket` un **ticket WebSocket opaco, de corta duración y un solo uso**, transportado sin query string. El secreto crudo no debe persistirse; guardar hash/HMAC, usuario, JTI de sesión, propósito `auditoria_sistema`, expiración y estado de consumo. El backend debe validar y consumir atómicamente el ticket, revalidar firma/JTI, usuario activo, permiso efectivo y `Origin` antes de `accept()`.

El ADR debe fijar explícitamente:

- transporte exacto y política de no registrar tokens;
- `token_type` aceptado (por defecto, rechazar tokens MCP para sockets del navegador);
- persistencia y unicidad de JTI, incluyendo sesiones web heredadas;
- transacción única para login (JWT y fila `sesiones` con el mismo JTI), rotación de refresh y comportamiento de dos refresh concurrentes;
- consumo atómico del ticket (`UPDATE ... RETURNING` o equivalente PostgreSQL) y comportamiento de dos consumidores simultáneos;
- logout, refresh, revocación y comportamiento de conexiones ya abiertas;
- códigos de rechazo de handshake o de cierre (`401/403` HTTP o códigos WS equivalentes, pero no una mezcla indefinida);
- límite de conexiones por usuario/recurso, tamaño de mensaje, heartbeat, timeout y backoff;
- validación de `Origin` y comportamiento local, Vite, Nginx y Pruebas3;
- estrategia Redis: fan-out, fallback local, duplicados, pérdida de mensajes y cliente lento.

## 4. Suites backend obligatorias

Ubicación canónica: `testing/backend/`. Los nombres siguientes son propuesta de catálogo, no archivos existentes.

| Suite propuesta | Felices | Borde | Error/seguridad |
|---|---|---|---|
| `test_pr3_ws_handshake.py` | auditor autorizado consume ticket y conecta; `auditoria_sistema` efectivo; identidad derivada del principal | doble pestaña, ticket mínimo/máximo, ticket venciendo, límite de conexiones | sin ticket, ticket inválido/reutilizado/de otro propósito, JTI revocado, usuario inactivo, origen no permitido, permiso revocado, `accept()` nunca ocurre |
| `test_pr3_ws_jti.py` | JTI del JWT coincide con `sesiones`; login commit único; logout/revocación impide nuevo handshake | expiración exacta, skew de reloj, refresh con JTI nuevo, dos refresh concurrentes | `fin_sesion` no nulo, `expira_en` vencido, `token_type`/audiencia incorrectos, secreto rotado, commit/DB indisponible: rollback y fail-closed |
| `test_pr3_ws_ticket.py` | emisión autorizada devuelve secreto una vez con TTL y propósito correctos | TTL, usuario con varias sesiones, rate limit | hash crudo ausente en DB/logs, usuario sin permiso/inactivo, ticket ya consumido, consumo concurrente: máximo un éxito, fallo DB sin ticket parcialmente utilizable |
| `test_pr3_ws_broadcast.py` | señal de auditoría provoca una recarga HTTP agrupada del dashboard | mensaje vacío, JSON inválido, payload grande, ráfaga, reconexión y orden | no fuga a otro usuario/módulo, cliente desconectado se limpia, send timeout/exception no bloquea la mutación ni la persistencia |
| `test_pr3_ws_redis.py` | dos workers reciben un evento una vez mediante Redis | varios clientes y salas, reconexión pub/sub | Redis caído, mensaje malformado, duplicado, backpressure; fallback según ADR |
| `test_pr3_ws_http_rbac.py` | REST autenticado que crea el ticket/acción devuelve contrato válido | recurso inexistente y parámetros límite | 401, 403, suplantación de `usuario_id`/rol en body, 404/422/500 genérico, sin token en auditoría/log |

Casos transversales:

- Mantener verdes `test_auth_refresh.py`, tests MCP/JTI existentes, `test_infrastructure.py` y `test_regresiones.py`, registrándolos por separado.
- Verificar que logout invalida exactamente la sesión/JTI usada por el socket y no otras sesiones del usuario.
- Verificar que un token MCP no obtiene acceso WebSocket salvo autorización explícita de ADR y scope compatible.
- Verificar `POST /auditoria/ws-ticket` y REST de auditoría con 401/403/200, sin actor/rol/usuario confiado desde body.
- Verificar que ningún broadcast dependa de que un cliente lento responda: la operación de negocio debe terminar aunque el fan-out falle.
- Probar PostgreSQL real para `sesiones`, el índice único de JTI y timestamps con zona horaria; no sustituirlo por SQLite para revocación/concurrencia.

## 5. Suites frontend obligatorias

Ubicación canónica: `frontend/src/`, con Vitest en `jsdom`.

| Suite propuesta | Casos requeridos |
|---|---|
| `frontend/src/pages/ServicePortal/pages/AuditoriaIndicadores/hooks/__tests__/useAuditoriaDashboardSocket.test.ts` | obtiene/usa ticket aprobado; estados `disabled/connecting/connected/reconnecting/offline/unauthorized`; mensaje de invalidación; backoff fake timers; no reconecta después de desmontar/logout |
| `frontend/src/pages/ServicePortal/pages/AuditoriaIndicadores/__tests__/AuditoriaIndicadores.websocket.test.tsx` | conserva `useAuditoriaStats` como fuente HTTP; evento WS dispara como máximo una recarga agrupada; loading/error/vacío no se confunden con WS caído; estado accesible |
| `frontend/src/hooks/__tests__/useTicketDetail.websocket.test.ts` y `frontend/src/components/notifications/__tests__/NotificationsContext.websocket.test.tsx` | regresión de las superficies WS existentes: no conecta sin sesión, no fuga recurso, procesa eventos, cleanup de socket/timer y no reconecta tras logout |
| `frontend/src/services/websocketAuth.test.ts` | deriva `ws/wss` para URL relativa/HTTP/HTTPS; no expone token en URL/consola; renueva ticket; transforma 401/403/revocación en estado controlado |

Casos de UI/estado:

- **Feliz:** login → handshake → comentario/notificación → actualización una sola vez.
- **Feliz PR3:** login → `ws-ticket` → handshake de auditoría → evento de invalidación → una recarga HTTP agrupada.
- **Borde:** dos tabs, evento duplicado, fuera de orden, conexión intermitente, navegación rápida, `document.hidden`, permiso nativo denegado.
- **Error:** credencial ausente/expirada/revocada, origen/RBAC rechazado, cierre durante `CONNECTING`, parseo inválido, backend caído, logout durante reconexión.
- El smoke real debe comprobar `101 Switching Protocols` por Vite y, en Pruebas3, por Nginx; Vitest aislado no sustituye esta prueba.
- El dashboard no debe mutar estadísticas desde el socket ni crear una petición por evento; el WS es canal de invalidación.

## 6. Docker, PostgreSQL y Redis

Las pruebas de lógica pura pueden correr sin Docker. Toda prueba que valide `sesiones`, JTI, expiración, concurrencia o Redis debe declarar su dependencia y usar un entorno efímero marcado `test`.

El entorno requerido debe:

1. Levantar el stack de pruebas con secretos suministrados por el entorno, nunca pegados en logs:

   ```powershell
   docker compose up --build -d db redis backend frontend
   ```

2. Verificar health de PostgreSQL, backend y Redis. Registrar solo host/puerto, DB lógica de pruebas, SHA, versiones y estado.
3. Usar un runner Compose/override que monte `testing/` como solo lectura dentro del contenedor. No aceptar como evidencia `exec backend ... testing/backend` mientras el directorio no exista en el contenedor.
4. Ejecutar suite focalizada, health checks y suite completa; guardar logs fuera de la imagen con timestamp.
5. Para fan-out multi-worker, usar el perfil equivalente a `docker-compose.Pruebas3.yml` (PostgreSQL + Redis + dos workers) y probar Nginx en `:8083`.
6. Antes de tests que escriban, comprobar `current_database()` y un marcador inequívoco de entorno. Si host/DB no son de pruebas, abortar.

Comandos previstos después de que PR3 exista y el runner esté documentado:

```powershell
$env:PYTHONPATH = "backend_v2;" + $env:PYTHONPATH
python -m pytest --collect-only -q testing/backend/test_pr3_ws_*.py
python -m pytest -vv testing/backend/test_pr3_ws_handshake.py testing/backend/test_pr3_ws_jti.py testing/backend/test_pr3_ws_broadcast.py
python -m pytest -vv testing/backend/test_infrastructure.py testing/backend/test_regresiones.py
python -m pytest -vv testing/backend/ -ra

Push-Location frontend
npm run test -- --run src/hooks/__tests__/useTicketDetail.websocket.test.ts src/components/notifications/__tests__/NotificationsContext.websocket.test.tsx
npm run lint
npm run build
Pop-Location
```

El orquestador debe adaptar el comando backend a la ruta real del runner Docker y no ejecutar tests sobre `.env` de desarrollo.

## 7. Evidencia reproducible y criterios de aceptación

Cada ejecución debe guardar:

- SHA exacto, fecha/hora UTC, sistema operativo, Python, Node, imagen/Compose y entorno (`test`, nunca producción).
- Comando literal, código de salida, duración, `passed/failed/skipped/errors`, nodeids fallidos y razón de cada skip.
- Log focalizado y completo; colección sin duplicados.
- Evidencia de handshake permitido/rechazado, cierre por revocación, broadcast aislado, cleanup y reconexión. Para DB: conteo/estado de JTI e índice, no tokens ni PII.
- Salida Vitest `--run`, lint, build y smoke real por proxy.
- Hash truncado o identificador correlacionable del JTI; nunca JWT, contraseña, cookie, `access_token` ni dump de DB.

**Gate de aprobación:** cero fallos en suites focalizadas, health checks y regresiones; cero accesos WS anónimos o cruzados; JTI alineado y revocable; cleanup sin timers/socket huérfanos; fan-out probado en un worker y multi-worker; skips explicados; catálogo y ADR enlazados.

## 8. Catálogo y documentación requerida

### Catálogo

Añadir a `testing/CATALOGO_PRUEBAS.md` una sección **PR3 — WebSocket + auth/JTI**, con las seis suites backend y los grupos frontend anteriores, tipo (unit/integración/E2E), dependencia (PostgreSQL/Redis/browser), estado y enlace al reporte de evidencia. Registrar también las suites MCP/JTI ya existentes, que hoy no aparecen en el catálogo.

### ADR

Crear el número disponible siguiente, `docs/decisions/ADR-008-autenticacion-jti-websocket.md` (`ADR-007` ya existe). Debe contener contexto, transporte, claims/JTI, autorización por recurso, origen, límites, Redis/multi-worker, revocación activa, errores, observabilidad sin secretos, alternativas y rollback. No reutilizar `PLAN_SERVIDOR_MCP.md` como contrato WebSocket.

### Bitácora

Después de la implementación y ejecución, crear `docs/bitacora/2026-07-24-pr3-websocket-auth-jti.md` con enlaces al ADR, catálogo y este reporte; SHA, suites, resultados, skips, decisión de revocación, entorno Docker/PostgreSQL/Redis y riesgos residuales. No incluir credenciales, JWT, PII ni dumps.

### Esquema y arnés

- Si PR3 solo usa columnas existentes de `sesiones`, confirmar con `scripts/sync_docs.py` que `docs/ESQUEMA_BASE_DATOS.md` sigue sincronizado y documentar semántica en el ADR.
- Si añade tabla, columna, constraint o índice para WS, regenerar el esquema y probar migración/rollback PostgreSQL.
- No corresponde modificar ADR-006 ni su matriz salvo que PR3 cambie `.agents/skills/` o `.opencode/agent/`.
- `errors_memory.json` solo debe recibir una nueva decisión/error con aprobación del orquestador; este review no lo modifica.

## 9. Perfil del auditor PR3

**Rol:** auditor QA/seguridad de integración, independiente del implementador y con acceso read-only al código, reportes y entorno de pruebas.

**Debe disponer de:**

- SHA del PR3, ADR aprobado y matriz de endpoints/recursos.
- Usuarios de prueba separados: autorizado, autenticado sin permiso, propietario de otro recurso, inactivo, sesión expirada/revocada y token MCP.
- PostgreSQL y Redis de prueba identificables; acceso de lectura a métricas/logs sin secretos.
- Navegador/harness para handshake real por proxy, además de pytest y Vitest.

**No puede:** usar producción, copiar secretos, imprimir tokens/PII, aceptar identidad desde body/URL, declarar PASS por un skip no justificado ni aprobar solo por tests unitarios.

**Firma mínima del informe:** alcance y SHA, matriz PASS/FAIL/SKIP, evidencia de 401/403/handshake/cierre, JTI anonimizado, DB/Redis/proxy usados, riesgos residuales y decisión final. Cualquier bypass de auth, fuga de recurso, JTI no revocable, token en logs o fuga de conexiones es bloqueo automático.

## 10. Evidencia de esta revisión

Los reportes peer disponibles en esta revisión son coherentes con este resultado: `backend-pr3-2026-07-24.md` bloquea JTI transaccional, ticket opaco, RBAC/Origin y multi-worker; `frontend-pr3-auditoria-ws-2026-07-24.md` permite solo preparación aislada y bloquea la integración hasta fijar el contrato backend.

```text
python -m pytest --collect-only -q testing/backend/test_mcp_token_generation.py testing/backend/test_mcp_service.py testing/backend/test_mcp_revocation.py testing/backend/test_mcp_scope_enforcement.py testing/backend/test_mcp_scope_bypass.py testing/backend/test_mcp_rate_limit.py testing/backend/test_mcp_login_integration.py testing/backend/test_mcp_anti_orphan.py testing/backend/test_mcp_secret_rotation.py testing/backend/test_auth_refresh.py
Resultado: 76 tests collected in 6.11s; 1 warning deprecada de app.config.
```

No se ejecutó la suite runtime, Docker, PostgreSQL, Redis, Vitest, lint ni build por las restricciones del subagente y porque la revisión no modifica código. La colección no constituye aprobación funcional.

## Decisión final

**Bloqueado.** El plan puede avanzar a implementación únicamente después de aprobar ADR-008, fijar el transporte y la semántica de JTI/revocación, añadir las suites canónicas, hacer reproducible el runner Docker/DB y registrar catálogo, bitácora y evidencia.
