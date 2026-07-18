# Reporte de Revisión de Build — Backend PR #17

**Fecha:** 2026-07-17
**Build:** PR #17 `dbb5eb5e4c03cec29a2ce0c178b750ae6e946af6`
**Autor del build:** PR #17
**Modo:** build — re-revisión estática
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Alcance y referencias verificadas

- Base exacta: `f0d3a78ba2698426cf08d0400a885accb5ab6d61`.
- Head exacto vía `refs/pr/17`: `dbb5eb5e4c03cec29a2ce0c178b750ae6e946af6`.
- Corte previamente revisado: `ac93bce944b2dfcd798aca697a0ac9ef093c01bd`.
- Worktree confiable inspeccionado: `C:\Users\AMEJOR~1\AppData\Local\Temp\opencode\gestor-antigravity-main`.
- Revisión exclusivamente estática; no se hizo checkout, ejecución ni edición del candidato.
- Archivos backend revisados: WebSocket de auditoría, autenticación/sesiones, worker manager, estadísticas/DTO, reserva de salas, middleware de auditoría, CI y pruebas backend asociadas.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | Bloqueado | Sí | CI remoto rojo y defectos funcionales/de seguridad pendientes. |

## 3. Hallazgos corregidos después de `ac93bce9`

1. **Ciclo de vida de sesión DB del WebSocket — corregido parcialmente.** La sesión inicial y las sesiones de revalidación ahora son contextos cortos (`backend_v2/app/api/auditoria/router.py:152-154,174-177`); ya no se mantiene una conexión DB durante toda la vida del socket.
2. **Reflexión del JWT como subprotocolo — corregida.** Se acepta `auth`, no el token (`router.py:159-161`).
3. **Backpressure — implementado.** Hay límite por proceso, cola acotada y worker con timeout (`backend_v2/app/services/auditoria/ws_manager.py:9-59`).
4. **Top 50 — corregido.** La consulta de eventos recientes se restringe a los módulos retornados por el top 50 (`backend_v2/app/services/auditoria/servicio_estadisticas.py:112-128`).
5. **DTO de respuesta — corregido parcialmente.** `AuditoriaEventoResumen` ya no expone ruta, datos nuevos ni metadatos (`backend_v2/app/models/auditoria/accion_usuario.py:92-102`).
6. **Reserva de salas — RBAC/PII mejorados.** Los endpoints usan permisos del manifiesto (`backend_v2/app/api/reserva_salas/dependencies.py:10-36`) y `ReservationRead` omite documentos (`backend_v2/app/models/reserva_salas/schemas.py:64-79`). Los IDs `reserva_salas` y `reserva_salas_admin` ya existen en el manifiesto.

## 4. Hallazgos bloqueantes

### B1 — Crítico — Los tokens web reales no pueden abrir el WebSocket

`ServicioAuth.validar_token_ws` exige encontrar el `jti` del JWT en `sesiones` (`backend_v2/app/services/auth/servicio.py:483-499`), pero login genera internamente el `jti` y registra la sesión sin pasarlo (`backend_v2/app/api/auth/login_router.py:210-223`); `registrar_sesion` persiste entonces `jti=None`. Los tests WS construyen/mokean una sesión con `jti`, por lo que no cubren el flujo real login → sesión → WebSocket.

**Decisión:** bloquea. Generar un único `jti`, usarlo en JWT y sesión, y probar el flujo sin mockear `validar_token_ws`.

### B2 — Crítico — Origin y revalidación WS son eludibles

- La regex de origen usa `match` sin ancla final (`backend_v2/app/api/auditoria/router.py:115-131`): acepta prefijos como `http://localhost.ejemplo-malicioso`. Además, permite cualquier origen de redes privadas y no usa la configuración de despliegue; un origen productivo legítimo puede ser rechazado.
- La revalidación solo ocurre tras 60 segundos sin mensajes (`router.py:168-178`). Un cliente puede enviar texto antes de cada timeout y conservar indefinidamente una sesión revocada o un permiso retirado.

**Decisión:** bloquea. Usar allowlist exacta configurada/full match y un temporizador de revalidación independiente del tráfico entrante.

### B3 — Alto — Estadísticas siguen rotas por mezcla naive/aware

La falla remota informada en `test_auditoria_stats_fallos` coincide con el ordenamiento Python de entidades (`backend_v2/app/services/auditoria/servicio_estadisticas.py:145-149`) cuyos timestamps pueden mezclar objetos naive recién insertados y valores aware de PostgreSQL. Además, `normalizar_rango` crea `datetime.utcnow()` naive y lo compara directamente con filtros ISO aware (`servicio_estadisticas.py:27-34`), y las agrupaciones usan la zona de sesión de PostgreSQL en vez de `America/Bogota` (`servicio_estadisticas.py:299-305,383-398`). La columna física es `TIMESTAMPTZ`, pero el modelo no declara explícitamente `DateTime(timezone=True)` (`backend_v2/app/models/auditoria/accion_usuario.py:30-33`).

**Decisión:** bloquea. Normalizar a UTC aware, ordenar en SQL, declarar el tipo ORM coherente y convertir explícitamente a Bogotá para agrupaciones.

### B4 — Alto — La auditoría de reserva no está garantizada

El CI remoto reporta que `test_reserva_auditoria_middleware` no encuentra evento. El endpoint sí deja el DTO serializable en `request.state` (`backend_v2/app/api/reserva_salas/router.py:279-287`), pero el middleware puede omitir silenciosamente cuando no resuelve actor (`backend_v2/app/core/middleware/auditoria_middleware.py:176-188`) y `ServicioAuditoria.registrar` absorbe fallos de persistencia (`backend_v2/app/services/auditoria/servicio.py:170-175`). La prueba mezcla una sesión fixture con `AsyncSessionLocal`, por lo que tampoco aísla de forma determinista el repositorio de auditoría.

**Decisión:** bloquea. Determinar la causa con logs, hacer observable el resultado de persistencia y dejar una prueba determinista que demuestre el evento y su PII enmascarada.

### B5 — Alto — El DTO no evita cargar PII desde PostgreSQL

Aunque la respuesta pública ya es reducida, la consulta vuelve a seleccionar entidades completas de `AuditoriaAccionUsuario` (`backend_v2/app/services/auditoria/servicio_estadisticas.py:115-140`), incluyendo ruta, IP, user-agent y JSONB sensibles. La base seleccionaba solo columnas seguras; el candidato regresa esos datos al proceso y aumenta memoria/I/O.

**Decisión:** bloquea para este dashboard de seguridad. Restaurar una proyección SQL explícita al DTO seguro.

### B6 — Alto — El RBAC de reserva carece de pruebas y persiste la carrera de doble reserva

No hay pruebas nuevas para 403 de lectura, administración de salas, propietario/no propietario ni ausencia de documentos en respuestas. Además, el patrón check-then-insert (`backend_v2/app/api/reserva_salas/router.py:260-277,289-303`) permite dos reservas simultáneas solapadas; no hay constraint de exclusión PostgreSQL ni manejo de `IntegrityError`.

**Decisión:** bloquea hasta cubrir RBAC/PII; la garantía de no solapamiento requiere constraint/transacción y prueba concurrente.

### B7 — Gate de CI — Rojo

Resultado remoto aportado: **76 failed, 346 passed, 31 skipped, 2 errors**. Dos fallos son específicos del candidato (B3 y B4); no se atribuyen estáticamente los demás sin sus trazas. Además, el catálogo marca esas suites como `PASSED` (`testing/CATALOGO_PRUEBAS.md:46-48`) y el workflow ejecuta inicialización, Uvicorn y pytest directamente en host (`.github/workflows/ci.yml:55-73`), contrario al mandato Docker del proyecto.

**Decisión:** bloquea. El catálogo no puede declarar verde mientras el chequeo remoto esté rojo.

## 5. Hallazgos no bloqueantes

1. **Shutdown incompleto:** `AuditoriaWSManager.shutdown` cancela tareas pero no las espera (`backend_v2/app/services/auditoria/ws_manager.py:61-63`); puede dejar tareas pendientes. La prueba compensa con `sleep(0.01)`.
2. **Coalescing parcial:** una cola de tamaño 2 admite dos señales idénticas; es backpressure, no coalescing estricto.
3. **Límite local:** `max_connections=100` es por proceso, no global entre workers.
4. **Higiene:** `git diff --check` reporta whitespace en backend, tests y CI.
5. **Cumplimientos:** no se detectó SQL de otro dialecto; handlers y DB continúan async; los archivos backend modificados permanecen por debajo de 550 líneas.

## 6. Tests requeridos

- Integración real login → `jti` persistido → handshake WS; logout/revocación debe cerrar el socket.
- Revalidación por tiempo absoluto aunque el cliente envíe mensajes periódicos.
- Origins exactos: producción configurada, sin origin, origen hostil y `localhost.evil`.
- Estadísticas con mezcla naive/aware, filtro unilateral ISO `Z`, límites de día Bogotá y top 50 sin cargar columnas sensibles.
- Auditoría de reserva determinista: evento exitoso, fallo de persistencia observable y datos/documentos redactados.
- Matriz RBAC de reserva: permiso base, permiso admin, propietario, tercero sin admin y tercero con admin.
- Dos creaciones concurrentes para la misma sala/franja: exactamente una debe persistir y la otra devolver 409.
- Worker: cola llena, timeout, desconexión simultánea y shutdown que espera todas las tareas.
- Suite backend completa verde en el entorno canónico Docker/PostgreSQL.

## 7. Documentación / RBAC

- RBAC: no se requiere un ID nuevo; `reserva_salas` y `reserva_salas_admin` ya están registrados. Falta evidencia automatizada de permisos.
- Corregir `testing/CATALOGO_PRUEBAS.md` hasta disponer de evidencia verde real.
- Si se añade constraint de exclusión o se corrigen tipos timezone, actualizar blindaje/migración y `docs/ESQUEMA_BASE_DATOS.md`.

## 8. Tests / comandos ejecutados

- Solo inspección estática con `git status`, `git log`, `git diff`, `git show` y lectura de archivos.
- No se ejecutó el candidato ni `pytest`, por instrucción expresa.
- Se tomó como evidencia el resultado remoto informado por el solicitante.

## 9. Decisión final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos`
- [x] `bloqueado`

## 10. Seguimiento

| Acción | Responsable | Fecha objetivo |
|---|---|---|
| Corregir B1-B7 y publicar CI backend verde | Autor del PR | Antes de merge |
| Re-revisión estática del nuevo head exacto | backend-reviewer | Tras nuevo head |
