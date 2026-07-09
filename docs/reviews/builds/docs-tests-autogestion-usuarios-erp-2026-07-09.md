# Revisión docs/tests — Autogestión usuarios ERP

**Fecha:** 2026-07-09
**Build:** autogestión de usuarios contra ERP en autenticación/registro/setup-password
**Modo:** re-revisión tras agregar happy-path de `setup-password` sin usuario local
**Proyecto:** Gestor-de-proyectos-Ti
**Resultado:** **approved_with_risks**

---

## 1. Archivos revisados

- `testing/CATALOGO_PRUEBAS.md`
- `testing/backend/test_autogestion_usuarios_erp.py` (nuevo)
- `testing/backend/test_jit_approval.py`
- `testing/backend/test_jit_contrasena_eq_cedula.py`
- `testing/backend/test_jit_race.py`
- `testing/backend/test_erp_empleados_service.py`
- `testing/backend/test_setup_password.py` (suite existente impactada, solo collect-only)
- `docs/bitacora/2026-07-09-autogestion-usuarios-activos-erp.md`
- Diffs de contexto en `backend_v2/app/api/auth/login_router.py`, `backend_v2/app/api/auth/public_auth_router.py`, `backend_v2/app/services/auth/provisioning_service.py`, `backend_v2/app/services/auth/servicio.py`, `backend_v2/app/services/erp/empleados_service.py` y `frontend/src/pages/Login/RegisterSidebar.tsx`.

## 2. Evidencia revisada

- Bitácora actualizada registra:
  - `python -m pytest testing/backend/test_autogestion_usuarios_erp.py testing/backend/test_jit_approval.py testing/backend/test_jit_contrasena_eq_cedula.py testing/backend/test_erp_empleados_service.py -v` -> **26 passed**.
  - `python -m pytest testing/backend/test_setup_password.py -x -vv` -> **bloqueado localmente** por `asyncpg.exceptions.InvalidPasswordError` con usuario PostgreSQL `user`.
  - `npm run lint` en `frontend/` -> **bloqueado localmente** porque `eslint` no está instalado en el worktree.
- Verificación permitida por este revisor:
  - `python -m pytest --collect-only testing/backend/test_autogestion_usuarios_erp.py testing/backend/test_jit_approval.py testing/backend/test_jit_contrasena_eq_cedula.py testing/backend/test_erp_empleados_service.py` -> **26 tests collected**.
  - `python -m pytest --collect-only testing/backend/test_setup_password.py` -> **7 tests collected**.

## 3. Correcciones verificadas

- El bloqueo anterior queda resuelto: `testing/backend/test_autogestion_usuarios_erp.py` agrega `test_setup_password_sin_usuario_local_erp_activo_crea_usuario_habilitado`, que valida la rama endpoint-level de `/auth/setup-password` cuando no existe usuario local y se delega la creación ERP exitosa vía `ServicioAuth.crear_usuario_portal_desde_erp(...)`.
- `testing/CATALOGO_PRUEBAS.md` registra `Autogestión ERP Auth` como `✅ PASSED` y mantiene `test_setup_password.py` como `⚠️ BLOQUEADO LOCAL: credenciales PostgreSQL`, evitando evidencia stale.
- `docs/bitacora/2026-07-09-autogestion-usuarios-activos-erp.md` ya refleja **26 passed** y conserva los bloqueos locales de `test_setup_password.py` y `npm run lint`.
- La decisión operativa “ERP activo habilita autogestión/JIT; ERP ausente/no activo falla cerrado” está documentada en bitácora.
- No se detectaron cambios en modelos, migraciones, `backend_v2/app/core/rbac_manifest.py`, `.agents/skills/` ni `.opencode/agent/`; por tanto no aplica actualizar `docs/ESQUEMA_BASE_DATOS.md` ni ADR-006.

## 4. Hallazgos

No quedan hallazgos bloqueantes de docs/tests para este alcance.

### Riesgos no bloqueantes

1. **MEDIUM — `test_setup_password.py` sigue sin pase verde en entorno válido.**
   Está correctamente marcado como bloqueo local por credenciales PostgreSQL y el delta nuevo tiene cobertura enfocada, pero antes de merge/release debe ejecutarse en CI o entorno con PostgreSQL válido porque `/auth/setup-password` fue modificado.

2. **MEDIUM — `npm run lint` sigue pendiente por dependencia local faltante.**
   El cambio frontend es de copy, pero la evidencia de lint debe completarse en un entorno con dependencias instaladas.

3. **LOW — La prueba happy-path de `setup-password` valida la rama endpoint-level con el servicio mockeado.**
   Es suficiente para cerrar el bloqueo previo, pero una prueba complementaria de `crear_usuario_portal_desde_erp` happy-path con ERP mockeado fortalecería la cobertura de mapeo de campos/normalización.

## 5. Required tests

- Ya no se requiere una prueba adicional bloqueante para el happy-path de `/auth/setup-password` sin usuario local; está cubierta por `test_setup_password_sin_usuario_local_erp_activo_crea_usuario_habilitado` y respaldada por la evidencia **26 passed**.
- Pendiente no bloqueante antes de merge/release:
  - `python -m pytest testing/backend/test_setup_password.py -v` en entorno con PostgreSQL válido.
  - `npm run lint` en `frontend/` cuando `eslint`/dependencias estén disponibles.
  - Opcional: prueba service-level happy-path de `crear_usuario_portal_desde_erp` con ERP activo mockeado.

## 6. Required docs

- Sin cambios requeridos adicionales.
- `testing/CATALOGO_PRUEBAS.md`: suficiente.
- `docs/bitacora/2026-07-09-autogestion-usuarios-activos-erp.md`: suficiente.
- `docs/ESQUEMA_BASE_DATOS.md`: no aplica.
- `docs/decisions/ADR-006-protocolo-descubrimiento-agentes.md`: no aplica.
- `errors_memory.json`: no actualizado por este revisor; no se solicitó alta preaprobada.

## 7. Decisión final

**Docs/tests review: approved_with_risks**

El bloqueo docs/tests previo queda cerrado por la nueva prueba happy-path y la bitácora actualizada a **26 passed**. Persisten solo riesgos de validación ambiental (`test_setup_password.py` y lint frontend), ya trazados y no bloqueantes para esta revisión.
