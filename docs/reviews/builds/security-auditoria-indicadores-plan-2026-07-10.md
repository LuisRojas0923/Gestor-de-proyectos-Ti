# Security/RBAC review — plan de indicadores de auditoría

**Fecha:** 2026-07-10
**Alcance:** `origin/main...origin/indicadores_auditoria_del_sistema`
**Modo:** revisión read-only de plan/diff; no se ejecutaron servicios ni pruebas
**Resultado:** **blocked**

## Checklist results

- Auth en endpoints: ❌
- Schemas sin dict: ✅
- PK con `Field(pattern)`: N/A
- PUT/PATCH `exclude_unset`: N/A
- No `str(e)` en 500: ❌
- Secrets guard: ❌
- No `print()`: ❌
- PII redacted: ❌

## Findings

### BLOQUEANTE — WebSocket y endpoints de inventario sin autenticación/RBAC

- `backend_v2/app/api/auditoria/router.py:112-126`: `/api/v2/auditoria/ws/dashboard` acepta conexiones antes de autenticar, no verifica `auditoria_sistema`, no valida `Origin` y no limita conexiones ni mensajes. Aunque hoy solo emite una señal, expone actividad del sistema y permite agotar memoria, sockets y fan-out de cada inserción.
- `backend_v2/app/api/inventario/router.py:468-485`: los tres nuevos POST de auditoría carecen de `Depends(obtener_usuario_actual_db)` y permiso de módulo. Además responden éxito aunque no registren de forma confiable el evento.

**CWE:** CWE-306, CWE-862, CWE-770.

### BLOQUEANTE — El middleware permite suplantar al actor de auditoría

- `backend_v2/app/core/middleware/auditoria_middleware.py:173-178` toma `usuario_id`, nombre y rol del body cuando no logra resolver un principal autenticado. Un cliente puede atribuir una mutación a otra persona o inventar su rol. Esto afecta directamente la integridad y valor probatorio del log.
- El riesgo es explotable en rutas sin autenticación que ya reciben `usuario_id`, por ejemplo viáticos. Los datos declarados por el cliente nunca deben convertirse en identidad del actor.

**CWE:** CWE-345, CWE-290, CWE-117.

### BLOQUEANTE — Se debilita el rate limit de login

- `backend_v2/app/core/config.py:57` cambia `5/minute;20/hour` por `5minute;20/hour`. La primera expresión no cumple la sintaxis esperada de `limits`/SlowAPI y puede impedir el arranque o dejar el control de fuerza bruta inválido.

**CWE:** CWE-307, CWE-400.

### BLOQUEANTE — Se incorpora una utilidad destructiva para borrar evidencia

- `backend_v2/clear_logs.py:1-18` elimina todos los eventos de viáticos sin confirmación, guard de entorno, autorización operacional, retención ni trazabilidad. No debe integrarse ni distribuirse con la aplicación.

**CWE:** CWE-284, CWE-778.

### ALTO — Los eventos manuales son falsificables, pierden eventos y guardan PII sin protección

- `backend_v2/app/api/viaticos/router.py:222-333` registra una afirmación del frontend, no la descarga efectiva ni su resultado. Cualquier usuario autenticado puede enviar cédula/nombre arbitrarios y contaminar auditoría.
- El primer endpoint omite todas las descargas del mismo actor/tipo durante 4 h 30 min; el segundo no tiene rate limiting. El patrón `SELECT` seguido de `INSERT` tampoco evita carreras.
- Se escribe cédula y nombre directamente en JSONB, eludiendo `_enmascarar_datos`, sin límites de longitud ni política de minimización/retención.

**CWE:** CWE-345, CWE-400, CWE-359, CWE-362.

### ALTO — Credenciales y aislamiento de pruebas inseguros

- `check_nulls.py:5` incorpora credenciales hardcodeadas y consulta/imprime datos de auditoría.
- `backend_v2/conftest.py:48-51` intenta cargar el `.env` real como fallback; las pruebas de integración usan una DB/servidor externos y ejecutan `DELETE`/`commit`, por lo que una configuración equivocada puede modificar datos no aislados.
- `backend_v2/conftest.py:1188-1199` incluye credenciales predecibles por defecto y puede imprimir cuerpos de respuesta de auth. `testing/backend/.env.test` ya contiene valores sensibles versionados; el cambio además corrompe su codificación. Aunque varios valores preexistían en la base, no deben tratarse como secretos válidos.

**CWE:** CWE-798, CWE-532, CWE-1188.

### ALTO — Rango temporal no acotado permite consumo excesivo

- `backend_v2/app/services/auditoria/servicio_estadisticas.py:248-280` materializa cada hora/día entre fechas suministradas sin validar orden ni duración. Un usuario autorizado puede solicitar rangos extremos y forzar millones de iteraciones/respuestas.
- La misma operación ejecuta múltiples agregaciones y hasta 50 consultas adicionales para últimos eventos por módulo. Falta presupuesto de consulta, timeout y límite de rango.

**CWE:** CWE-400, CWE-770.

### MEDIO — Exposición de errores y PII en logs

- `backend_v2/app/api/viaticos/router.py:284,333` devuelve `str(e)` en HTTP 500.
- `backend_v2/app/services/auth/servicio.py:199-201`, `backend_v2/app/services/auditoria/servicio.py` y `ws_manager.py` registran excepciones completas.
- Los nuevos scripts `check_db.py`, `check_latest_viaticos.py`, `check_today_logs.py` y `check_nulls.py` imprimen nombres, identificadores y metadatos de auditoría sin redacción.

**CWE:** CWE-209, CWE-532.

### MEDIO — Pérdida de cobertura y pruebas de seguridad insuficientes

- El middleware excluye `/auth/refresh` y dos rutas operativas adicionales sin evidencia de un registro equivalente y verificable.
- Las pruebas nuevas cubren caminos felices y clasificación, pero no auth ausente, RBAC denegado, WebSocket, spoofing, límites, carreras, PII, rangos hostiles ni fallo de DB. Hay copias duplicadas bajo `backend_v2/` y `testing/backend/`.

**CWE:** CWE-778.

## RBAC/config impact

- `auditoria_sistema` ya existe en `backend_v2/app/core/rbac_manifest.py`, está marcado crítico y coincide con `ProtectedRoute` y `requiere_permiso_auditoria`: esa parte es consistente.
- `GET /auditoria/estadisticas` sí exige autenticación y permiso `auditoria_sistema`.
- El WebSocket no reutiliza esa política y constituye un bypass del perímetro del módulo.
- Los eventos manuales de viáticos solo exigen sesión, no un permiso de viáticos ni autorización sobre la cédula consultada.
- No hay cambio Docker/Compose que justifique nuevas variables. La regresión de `rate_limit_login` rompe la consistencia de configuración.

## Gates obligatorios para aprobar e integrar

1. **Perímetro:** todos los endpoints nuevos, incluido WS, deben autenticar y aplicar el permiso correcto. El WS debe validar origen, usar credencial/ticket de corta vida no expuesto en logs, limitar conexiones/mensajes y cerrar con código apropiado ante 401/403.
2. **Rate limit:** restaurar una expresión válida para login y demostrar en test que la configuración se parsea y que el exceso retorna 429; fallo de storage debe continuar fail-closed.
3. **Actor confiable:** eliminar por completo el fallback de identidad desde body. El actor debe derivarse exclusivamente del principal validado; eventos anónimos deben usar un actor controlado por servidor y no campos del cliente.
4. **Auditoría server-side:** registrar la descarga dentro de la operación real, con resultado real, mediante `ServicioAuditoria.registrar`; no usar endpoints “fantasma”. Definir deduplicación solo si no destruye eventos requeridos y hacerla atómica.
5. **Append-only y retención:** retirar `clear_logs.py` y cualquier utilidad destructiva sin procedimiento privilegiado, guard de entorno, aprobación, backup y evento de auditoría independiente.
6. **PII:** minimizar/seudonimizar cédula y nombre, aplicar redacción central, límites de longitud y política de acceso/retención. Ningún script o log debe imprimir snapshots o identificadores completos.
7. **Errores/logging:** respuestas 500 genéricas; logs estructurados con identificador de correlación, sin `str(e)`, token, cédula, nombres ni estructura de DB.
8. **Consultas:** validar `fecha_desde <= fecha_hasta`, fijar rango máximo, límite de respuesta y timeout; eliminar N+1 o probar un presupuesto de consultas estable.
9. **Pruebas aisladas:** usar DB efímera inequívocamente marcada como test; prohibir fallback a `.env` real y abortar si host/DB no son de test. Retirar credenciales hardcodeadas y scripts ad hoc.
10. **RBAC SSOT:** conservar `auditoria_sistema` como único ID y añadir pruebas backend que verifiquen 401 sin token, 403 sin módulo y 200 solo con permiso efectivo.

## Pruebas negativas necesarias

- HTTP anónimo a cada endpoint nuevo: 401; rol autenticado sin módulo: 403; token revocado/expirado/MCP: rechazo.
- Handshake WS sin credencial, con token inválido/revocado, sin permiso y con `Origin` no permitido: rechazo antes de `accept`; prueba de límite de conexiones/mensajes y reconexión masiva.
- POST anónimo/autenticado con `usuario_id`, `rol` o nombre falsos en body: nunca cambia el actor persistido.
- Descarga fallida/cancelada: no debe quedar como éxito; dos descargas reales consecutivas deben producir trazabilidad conforme a la política; concurrencia no debe duplicar ni perder eventos indebidamente.
- Payloads de PII vacíos, sobredimensionados, con controles/markup y cédulas ajenas: validación y autorización; confirmar redacción en DB, API y logs.
- Fechas invertidas, sin timezone, extremas y rango superior al máximo: 422/400 estable, sin consulta costosa ni respuesta masiva.
- Excepción DB deliberada: rollback, mensaje 500 genérico y log sin datos internos/PII.
- Parser de todos los límites y ráfaga sobre `/auth/login`: 429 al quinto intento según política; Redis caído: 503 fail-closed.
- Ejecución de tests con configuración no-test o DB no efímera: aborta antes de cualquier `DELETE`/`commit`.
- Usuario sin `auditoria_sistema` no puede obtener eventos, estadísticas ni señales WS; admin con permiso sí puede.

## Blocking reasons

La rama no puede integrarse mientras permita conexiones/endpoints sin auth, actor falsificado en logs, rate limit de login inválido y borrado irrestricto de evidencia. Estos defectos afectan controles preventivos y la integridad del propio sistema de auditoría.

**Severidad global:** BLOQUEANTE
**Conteo:** 4 bloqueantes, 3 altos, 2 medios, 0 bajos.
