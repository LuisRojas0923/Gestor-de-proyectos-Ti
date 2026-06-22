# Security/RBAC review - ciberseguridad: revocacion JWT web

**Fecha:** 2026-06-22  
**Rama:** `ciberseguridad`  
**Resultado:** blocked

## Checklist results

- Auth en endpoints: ❌
- Schemas sin dict: N/A
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ❌
- Secrets guard: N/A
- No print(): ❌
- PII redacted: ❌

## Hallazgos

### BLOQUEANTE - Revocacion JWT no se aplica globalmente

`profile_router.obtener_usuario_actual_db()` y `POST /auth/refresh` ahora validan `sesiones.jti`, `fin_sesion`, expiracion y usuario activo, lo cual es correcto para rutas que usan esa dependencia. Sin embargo, el middleware deny-by-default (`backend_v2/app/core/security_policy.py`) solo valida firma/claims del JWT y no consulta la sesion activa. Rutas `/api/v2` que dependen solo del middleware siguen aceptando un JWT web firmado aunque su sesion en DB este revocada/cerrada.

Ejemplos observados de rutas sensibles sin `Depends(obtener_usuario_actual_db)` en su handler: `backend_v2/app/api/erp/router.py`, `backend_v2/app/api/ia/router.py`, partes de `inventario/router.py`, `panel_control/router.py`, `alertas/router.py`, `desarrollos/plantillas_router.py`, `desarrollos/reporte_router.py`, `kpis/router.py`, entre otras. Esto deja un bypass directo de revocacion hasta que la validacion de sesion se centralice en el middleware o todas las rutas queden protegidas por la dependencia/RBAC.

**CWE:** CWE-613, CWE-287, CWE-862.

### MEDIO - Rotacion de refresh no atomica

`POST /auth/refresh` valida sesion activa, emite token nuevo, marca fin de la sesion anterior y luego llama `registrar_sesion()`. Esta ultima funcion abre otra `AsyncSessionLocal()` e ignora el `db` recibido; ademas captura excepciones y solo loguea warning. Si el registro nuevo falla, el endpoint puede devolver un token sin sesion activa. Tambien hay ventana TOCTOU para refresh concurrente del mismo token: dos peticiones pueden pasar la validacion antes de que una cierre la sesion anterior.

**CWE:** CWE-367.

### MEDIO - Cobertura de pruebas aun incompleta para el objetivo de revocacion

La suite nueva cubre sesion revocada, token sin sesion, usuario inactivo y refresh revocado. Faltan pruebas especificas para: sesion expirada, login registra `jti` real, refresh exitoso rota sesion y deja invalido el token anterior, refresh concurrente, y revoked-token contra una ruta que no use `obtener_usuario_actual_db` para evidenciar que no haya bypass global.

### BAJO/MEDIO - Deuda existente en funcion tocada: `print()` y `str(e)`

`profile_router.py` conserva `print(f"DEBUG: ... {e}")` y `HTTPException(500, detail=f"... {str(e)}")` en rutas/funciones de auth. Aunque no es lo principal del corte, sigue violando la regla de no exponer detalles internos ni PII/estructura de DB en respuestas/logs.

**CWE:** CWE-209, CWE-532.

## Regresiones y compatibilidad

- Mejora real: tokens web sin sesion o con sesion cerrada quedan rechazados en `/auth/yo`, `/auth/password`, `/auth/update-email`, `/auth/resend-verification`, rutas que importan `obtener_usuario_actual_db`, y `/auth/refresh`.
- Cambio intencional/impacto: JWT antiguos sin `jti` quedan invalidados por la nueva barrera de sesion, lo cual favorece seguridad pero fuerza re-login.
- Posible regresion funcional: se elimino el fallback ERP en `obtener_usuario_actual_db` para usuarios no persistidos localmente. Si aun existen tokens de usuarios ERP no materializados en `usuarios`, ahora responderan 401.

## RBAC/config impact

- No se agregan modulos ni pantallas; `backend_v2/app/core/rbac_manifest.py` no requiere cambios para este corte.
- No hay cambios Docker/env/secrets/dependencias.
- RBAC granular backend sigue pendiente; la revocacion de sesion no sustituye autorizacion por modulo/accion/objeto.

## Decision

**Security/RBAC review: blocked**

Bloquea cerrar el objetivo como “revocacion JWT web efectiva” porque hay bypass en rutas `/api/v2` protegidas solo por middleware. La correccion recomendada es fail-closed central: validar en middleware que `token_type=session`, `jti` existe, usuario existe/activo y `sesiones` contiene una sesion web activa no expirada/no cerrada, o exigir `Depends(obtener_usuario_actual_db)`/`requerir_modulo(...)` en absolutamente todas las rutas sensibles y cubrirlo con test automatizado.

**Severity:** BLOQUEANTE
