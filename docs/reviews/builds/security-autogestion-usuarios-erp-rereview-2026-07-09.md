Security/RBAC review: approved_with_risks

Scope: re-revisión de autogestión de usuarios activos ERP para JIT/login, registro público y setup-password tras mitigaciones. Build: `C:\Users\AMEJOR~1\AppData\Local\Temp\opencode\autogestion-usuarios-erp`.

## Checklist results
- Auth en endpoints: ❌ (rutas públicas de autogestión/registro fuera de la lista estricta; aceptado funcionalmente para este alcance)
- Schemas sin dict: ✅
- PK con Field(pattern): ❌ (preexistente: campos `str`/cédula sin `Field(pattern=...)` restrictivo)
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: ✅ en el delta revisado
- Secrets guard: ❌ (`app.config.portal_pending_pwd` conserva default público aunque `core.config` valida el literal)
- No print(): ✅ en el delta revisado de auth/ERP
- PII redacted: ❌ (mejoró auditoría de usuario desconocido, pero quedan cédulas en logs de lockout/rate limiter)

## Mitigaciones verificadas
- `login_router.py:166-177`: login valida `usuario.esta_activo` antes de `es_password_configurado`; cierra el oráculo de password pendiente para usuarios inactivos.
- `login_router.py:149-159`: auditoría de usuario desconocido usa `usuario_id="desconocido"`; ya no persiste la cédula en ese evento.
- `public_auth_router.py:74-78`: `setup-password` sin `db_erp` responde `400` genérico y no `503` específico.
- `provisioning_service.py:122-128` y `195-201`: `IntegrityError` se captura con rollback explícito en creación por setup/registro.
- `empleados_service.py:145-160`: autogestión falla cerrado si no hay ERP, si la consulta falla o si el contrato no está activo.
- Tests nuevos/actualizados cubren inactivo antes de password_set, ERP no activo, carrera por `IntegrityError` y normalización de `viaticante`.

## Findings restantes

### ALTO — SEC-R1: autogestión pública con solo cédula + contrato ERP activo
- Evidencia: `public_auth_router.py:80-86` permite crear usuario desde ERP en `setup-password`; `provisioning_service.py:83-129` crea `esta_activo=True`; `registro` crea cuenta habilitada en `public_auth_router.py:215-228`; JIT crea usuario activo en `login_router.py:93-148`.
- Impacto: conocer una cédula de empleado activo basta para iniciar el flujo de alta/primera contraseña. La mitigación actual es que ERP activo es la fuente de verdad y los roles quedan limitados a `usuario`/`viaticante`.
- Estado: riesgo aceptado para este alcance por decisión funcional indicada por el usuario; no bloquea esta re-revisión. Para producción abierta, recomendar OTP/enlace a correo corporativo ERP, invitación o aprobación admin.
- CWE: CWE-306, CWE-287, CWE-863.

### MEDIO — SEC-R2: oráculos de enumeración/estado en endpoints públicos
- Evidencia: `login_router.py:143-164` distingue ERP activo/JIT (`400` + `X-Password-Not-Set`) de inexistente/inactivo ERP (`401`); `public_auth_router.py:60-86` distingue inactivo local, password ya configurado, creación exitosa y fallo genérico; `password-status` conserva `{existe: true|false}`.
- Impacto: con rate limiting, aún permite inferir existencia local, contrato ERP activo y estado de primera contraseña.
- Estado: riesgo aceptable para el alcance por compatibilidad/autogestión, pero debe registrarse como deuda si se expone a Internet.
- CWE: CWE-203, CWE-200.

### MEDIO — SEC-R3: PII residual en logs operativos de lockout
- Evidencia: `core/rate_limiter.py:253-278` registra cédula en warnings de consulta/activación de lockout. La auditoría de usuario desconocido del login ya fue corregida.
- Impacto: cédulas pueden quedar en logs operativos ante ataques de fuerza bruta o errores de Redis.
- Estado: no bloqueante para este alcance; recomendar hash/redacción de cédula en logs.
- CWE: CWE-532, CWE-359.

### BAJO — SEC-R4: validación de schemas incompleta
- Evidencia: `models/auth/usuario.py:280-287` (`UsuarioRegistro`) usa `cedula` sin patrón y `correo` como `str` opcional; `LoginRequest.cedula` no usa `Field(pattern=...)`.
- Impacto: la normalización reduce duplicados, pero la validación formal no restringe caracteres especiales ni valida email con `EmailStr`/regex en schema.
- Estado: no bloqueante; endurecimiento recomendado.
- CWE: CWE-20.

### BAJO — SEC-R5: default público de contraseña pendiente en config legacy
- Evidencia: `app/config.py:52` mantiene `portal_pending_pwd = "PORTAL_PENDING_PWD"`; `login_router.py:109` usa `config.portal_pending_pwd`. `core/config.py:78-86` sí rechaza el literal si se configura allí, pero no elimina el default legacy.
- Impacto: no observé entrega de token con ese valor porque `es_password_configurado` lo trata como pendiente, pero incumple política de defaults no predecibles.
- Estado: no bloqueante; recomendar unificar en `core.config` y fallar en producción si queda vacío/default.
- CWE: CWE-522.

## RBAC/config impact
- No se agregan módulos ni pantallas protegidas; `rbac_manifest.py` no requiere cambios para este delta.
- Roles creados por autogestión se limitan a `usuario` o `viaticante` según ERP; `normalizar_bool_erp` evita que cadenas como `"N"` se interpreten como `True`.
- No se modifican Docker/compose/env. `.gitignore` mantiene `.env` ignorado y permite `/.env.example`.

## Blocking reasons
Ninguno para este alcance, dado que el usuario ratifica la decisión funcional de autogestión con ERP activo. Los riesgos SEC-R1/SEC-R2 serían bloqueantes si el criterio de aceptación exigiera segundo factor o no enumeración estricta en endpoints públicos.

Severity: ALTO
