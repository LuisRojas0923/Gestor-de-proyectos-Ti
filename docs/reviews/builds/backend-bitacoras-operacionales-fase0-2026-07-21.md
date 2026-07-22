# Reporte de Revisión de Build

**Fecha:** 2026-07-21
**Build:** Bitácoras Operacionales — fase técnica 0 backend, revisión final
**Autor del build:** worktree en revisión
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos revisados

- `backend_v2/app/api/notificaciones/router.py`
- `backend_v2/app/models/auth/usuario.py` (`IdentificadorModulo` solamente)
- `backend_v2/app/services/auth/sesion_service.py` (`validar_sesion_hash_activa` solamente)
- `backend_v2/app/services/notificacion/servicio.py`
- `backend_v2/app/services/notificacion/ws_manager.py`
- `backend_v2/app/services/auditoria/servicio.py`
- `backend_v2/app/core/middleware/auditoria_middleware.py`
- `testing/backend/test_bitacoras_operacionales_fase0.py`
- `testing/backend/test_notificaciones.py`
- Regresión relevante: `testing/backend/test_auditoria_acciones.py`

Se ignoraron los demás cambios concurrentes del worktree.

## 2. Resultado de la re-revisión

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | `approved_with_risks` | No | Los dos bloqueos anteriores fueron corregidos; permanecen un detalle de temporización y brechas de prueba no bloqueantes. |

## 3. Bloqueos anteriores resueltos

### B-01 — Resuelto — Ciclo de vida de PostgreSQL en WebSocket

El handler ya no inyecta `obtener_db`. La validación inicial ocurre en `router.py:137-139` dentro de un `AsyncSessionLocal` corto que termina antes de `notification_manager.connect` y antes del bucle de larga vida. Las revalidaciones de `ws_manager.py:199-211` también usan sesiones cortas y fallan cerrado.

### B-02 — Resuelto — Vínculo exacto entre ticket y Origin

La emisión valida el Origin permitido y lo persiste con usuario/hash de sesión (`router.py:86-98`, `ws_manager.py:103-112`). El handshake exige igualdad exacta con el Origin del ticket (`router.py:116-135`). El ticket se consume atómicamente con `GETDEL` y ahora viaja en `Sec-WebSocket-Protocol`, no en URL.

### Riesgos previos resueltos

- Se revalida la sesión antes de cada broadcast local y se cierra el socket revocado antes de enviar datos.
- `/ws-ticket` aplica límite `12/minute` y respuestas exitosas `no-store`/`no-cache`.
- `/mias` limita resultados entre 1 y 100.
- El patrón RBAC exige segmentos no vacíos y rechaza puntos iniciales, finales o consecutivos.
- El middleware no lee ni copia bodies del prefijo de Bitácoras Operacionales a la auditoría automática.
- Los errores Redis ya no incluyen excepciones, URLs o secretos en logs.

## 4. Hallazgos restantes no bloqueantes

### M-01 — Media — La revalidación de 30 segundos depende de inactividad entrante

`router.py:151-160` ejecuta la revalidación únicamente cuando `receive_text()` acumula 30 segundos sin recibir un mensaje. Un cliente que envíe texto con mayor frecuencia reinicia el timeout indefinidamente, por lo que el handler no garantiza literalmente una revalidación cada 30 segundos.

La confidencialidad queda protegida porque `ws_manager.py:188-195` revalida antes de cada broadcast y no envía a una sesión revocada. El riesgo restante es mantener sockets revocados y recursos ASGI abiertos más tiempo del previsto. Conviene usar un reloj/deadline independiente del tráfico entrante o una tarea periódica cancelable.

### M-02 — Media — La matriz no ejecuta el handshake WebSocket completo

Las pruebas cubren helpers, ausencia de dependencia DB, ticket/origen, Redis fail-closed y cierre antes del broadcast, pero no abren el handler `/ws` de extremo a extremo. Por ello no verifican conjuntamente negociación del subprotocolo, consumo único, igualdad de Origin, sesión DB corta, `accept`, timeout y cleanup.

Los casos HTTP nuevos son aislados y útiles para el contrato router-servicio, pero sustituyen la dependencia de autenticación y mockean el servicio/DB. Falta una regresión 401 sin override y una prueba con persistencia aislada que demuestre que un registro ajeno no cambia. Esto es seguimiento de cobertura; la implementación revisada sí aplica los filtros correctos.

### L-01 — Baja — Faltan aserciones del límite y cabeceras del ticket

No se observó un caso HTTP que pruebe `Cache-Control`, `Pragma`, 403 por Origin, 503 desde el endpoint o 429 tras el límite. Tampoco se prueban los límites HTTP `limit=0/101`. Agregar estos casos evitará regresiones del hardening recién incorporado.

## 5. Correctitud y arquitectura

- Todos los handlers y accesos a PostgreSQL son asíncronos; no se introdujo DB síncrona.
- Se conserva la separación API → servicio → modelo; las sesiones directas del WS están acotadas al handshake/revalidación.
- La creación pública arbitraria de notificaciones permanece eliminada.
- Listado y actualización usan la identidad autenticada; la mutación filtra por notificación y propietario.
- `crear_notificacion_sin_commit` y `registrar_sin_commit` hacen `flush` sin confirmar la transacción exterior.
- La marca manual suprime el evento automático duplicado.
- Los correlation IDs son UUID canónicos.
- No hay SQL de otros dialectos ni cambios estructurales de tabla en este alcance.
- Todos los archivos revisados permanecen por debajo de 550 líneas.

## 6. Tests y evidencia

- Evidencia aportada: suites backend combinadas, **38 passed**.
- Evidencia aportada: `py_compile`, **passed**.
- Ejecutado por este revisor: `python -m pytest --collect-only testing/backend/test_bitacoras_operacionales_fase0.py testing/backend/test_notificaciones.py testing/backend/test_auditoria_acciones.py` — **38 tests collected**.
- El rol no ejecutó pytest; únicamente realizó colección autorizada.

## 7. Tests de seguimiento recomendados

1. Handshake WebSocket real: éxito, Origin distinto, ticket ausente/reutilizado, sesión expirada/revocada/discordante y Redis/DB no disponibles.
2. Revalidación periódica que cierre una sesión revocada incluso si el cliente envía mensajes continuamente.
3. HTTP sin override de autenticación: 401 para `/mias`, marcado y `/ws-ticket`.
4. Persistencia aislada con dos usuarios para listado y marcado por propietario.
5. 403/503/429 y cabeceras `no-store` del endpoint de ticket; 422 para límites fuera de `1..100`.
6. Integración transaccional que revierta juntos dominio, notificación y auditoría `sin_commit` ante fallo de flush/commit.

## 8. Documentación y RBAC

- `testing/CATALOGO_PRUEBAS.md` registra la suite focal con 19 casos.
- `docs/ESQUEMA_BASE_DATOS.md` no requiere actualización porque esta fase no modifica tablas o columnas.
- Antes de habilitar el módulo aún deben registrarse exactamente `bitacoras_operacionales.leer` y `bitacoras_operacionales.gestionar` en `rbac_manifest.py`, junto con la paridad de auditoría prevista por el plan.

## 9. Decisión final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

No quedan bloqueos de correctitud, transacción, PostgreSQL o propiedad en los archivos revisados. Los riesgos restantes corresponden a la periodicidad del cierre de sockets revocados y a pruebas de integración todavía parciales.

## 10. Seguimiento

| Acción | Responsable | Prioridad |
|---|---|---|
| Hacer periódica la revalidación independientemente del tráfico entrante | Implementación backend | Media |
| Agregar handshake WebSocket e integración DB/HTTP reales | Implementación backend | Media |
| Cubrir 403/422/429/503 y cabeceras del ticket | Implementación backend | Baja |
