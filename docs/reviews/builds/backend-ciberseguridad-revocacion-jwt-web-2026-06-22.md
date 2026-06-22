# Revisión backend — Revocación JWT web

**Fecha:** 2026-06-22  
**Build:** corte corregido de revocación JWT web  
**Autor del build:** no especificado  
**Modo:** build  
**Proyecto:** Gestor-de-proyectos-Ti  
**Resultado:** `blocked`

---

## 1. Archivos modificados revisados

- `backend_v2/app/api/auth/login_router.py`
- `backend_v2/app/api/auth/profile_router.py`
- `backend_v2/app/api/auth/refresh_router.py`
- `backend_v2/app/core/security_policy.py`
- `backend_v2/app/services/auth/servicio.py`
- `backend_v2/app/services/auth/sesion_service.py`
- `testing/backend/test_security_jwt_revocation.py`
- `testing/CATALOGO_PRUEBAS.md`
- `docs/bitacora/2026-06-22-mitigacion-ciberseguridad-portal.md`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---:|---|
| backend-reviewer | `blocked` | Sí | Regresión MCP por middleware global y refresh no serializable bajo concurrencia. |

## 3. Hallazgos bloqueantes

### B1 — El middleware global bloquea tokens MCP antes de la dependencia MCP-aware

`backend_v2/app/core/security_policy.py` valida todas las rutas protegidas con `payload_es_sesion_web()`, que exige `token_type="session"` y ausencia de `scope`. Por tanto, un token `token_type="mcp"` válido queda rechazado por el middleware antes de llegar a `obtener_usuario_actual_db()`, aunque `profile_router.py` conserva la rama explícita de validación MCP.

Esto contradice el contrato existente documentado y testeado en `testing/backend/test_mcp_login_integration.py`: `/auth/yo` y endpoints que usan `obtener_usuario_actual_db` deben aceptar tokens MCP activos y rechazar solo los revocados/expirados. La suite reportada como pasada incluye `test_mcp_revocation.py` unitario, pero no cubre esta integración HTTP, por lo que la regresión queda sin detectar.

Impacto: ruptura funcional de tokens MCP en rutas `/api/v2` y del servidor MCP que consume el backend con Bearer MCP.

## 4. Hallazgos no bloqueantes / riesgos

### R1 — Rotación de refresh no es segura ante doble petición concurrente

`POST /auth/refresh` valida la sesión activa con un `SELECT`, genera un token nuevo, marca `fin_sesion` e inserta la nueva sesión en el mismo `AsyncSession`. Esto mejora la atomicidad respecto al corte anterior, pero no bloquea la fila antigua ni usa un `UPDATE ... WHERE fin_sesion IS NULL ... RETURNING`. Dos refresh concurrentes del mismo JWT pueden leer la sesión como activa antes del primer commit y terminar generando dos sesiones nuevas válidas.

Recomendación: serializar con `SELECT ... FOR UPDATE` dentro de la transacción o hacer una transición atómica con `UPDATE sesiones SET fin_sesion = ahora WHERE jti = :jti AND fin_sesion IS NULL RETURNING id`, y cubrir con prueba de concurrencia.

### R2 — Compatibilidad legacy cambia a fail-closed

Tokens antiguos sin `jti` o sin fila correspondiente en `sesiones` ya no son compatibles: el middleware, `/auth/yo` y `/auth/refresh` devuelven 401. Es seguro para revocación, pero debe asumirse como cierre de sesión forzado y quedar documentado/avisado al frontend.

### R3 — Coste de rendimiento del middleware

Cada request protegida realiza al menos dos consultas extra (`usuarios` por cédula y `sesiones` por `jti`) en una `AsyncSessionLocal` independiente; rutas que además usan `obtener_usuario_actual_db` repiten la validación con otra sesión. Con índice único parcial en `sesiones(jti)` el lookup de sesión es razonable, pero hay duplicidad y presión adicional de pool/DB.

Recomendación: compartir resultado en `request.state` o ajustar la dependencia para no repetir validación ya realizada por el middleware; agregar métrica/observabilidad de latencia y pool.

### R4 — Evidencia de tests parcial para el riesgo nuevo

Se reportan `5/8/9/7 passed` y se verificó `--collect-only` de esas suites: 29 tests recolectados. Falta ejecutar o adaptar pruebas MCP HTTP (`test_mcp_login_integration.py`) y una prueba de refresh concurrente. La ejecución final de pytest/alembic debería ser vía Docker antes de merge, conforme reglas del proyecto.

## 5. Tests / comandos ejecutados

- `python -m pytest --collect-only testing/backend/test_security_jwt_revocation.py testing/backend/test_security_openapi_auth_rbac.py testing/backend/test_auth_refresh.py testing/backend/test_mcp_revocation.py` — 29 tests recolectados, sin ejecución.
- Evidencia reportada por el build: `test_security_jwt_revocation.py` 5 passed, `test_security_openapi_auth_rbac.py` 8 passed, `test_auth_refresh.py` 9 passed, `test_mcp_revocation.py` 7 passed.

## 6. Documentación / RBAC

- No hay alta de módulo nuevo; `rbac_manifest.py` no aplica para este corte.
- `testing/CATALOGO_PRUEBAS.md` fue actualizado con la suite de revocación JWT web.
- Falta documentar explícitamente el comportamiento fail-closed de tokens legacy y el contrato final web/MCP del middleware global.

## 7. Decisión final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos`
- [x] `bloqueado`

## 8. Seguimiento requerido

| Acción | Responsable | Fecha objetivo |
|---|---|---|
| Ajustar middleware para validar sesión activa de tokens web sin romper tokens MCP activos, o separar allow/validación MCP explícita. | Backend | Inmediato |
| Agregar prueba HTTP que demuestre que un token MCP activo puede llamar `/auth/yo` y que uno revocado recibe 401 bajo el middleware global. | Backend/QA | Inmediato |
| Hacer rotación de refresh concurrente-safe con bloqueo/`UPDATE ... RETURNING` y test de carrera. | Backend | Antes de exposición externa |
| Documentar invalidez intencional de tokens legacy sin `jti`/sesión. | Docs/Backend | Antes de merge |
