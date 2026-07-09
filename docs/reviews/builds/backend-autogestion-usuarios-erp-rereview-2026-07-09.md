# Plantilla — Reporte de Revisión de Build

**Fecha:** 2026-07-09  
**Build:** re-revisión autogestión de usuarios activos ERP  
**Autor del build:** worktree `C:\Users\AMEJOR~1\AppData\Local\Temp\opencode\autogestion-usuarios-erp`  
**Modo:** build  
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `backend_v2/app/api/auth/login_router.py`
- `backend_v2/app/api/auth/public_auth_router.py`
- `backend_v2/app/services/auth/provisioning_service.py`
- `backend_v2/app/services/auth/servicio.py`
- `backend_v2/app/services/erp/empleados_service.py`
- `testing/backend/test_autogestion_usuarios_erp.py`
- `testing/backend/test_jit_approval.py`
- `testing/backend/test_jit_contrasena_eq_cedula.py`
- `testing/backend/test_jit_race.py`
- `testing/backend/test_erp_empleados_service.py`
- `testing/backend/test_setup_password.py` (impactado, sin cambios observados)
- `testing/CATALOGO_PRUEBAS.md`
- `docs/bitacora/2026-07-09-autogestion-usuarios-activos-erp.md`
- `frontend/src/pages/Login/RegisterSidebar.tsx` (fuera del alcance backend)

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | approved_with_risks | No por código backend | Los dos bloqueos backend previos quedaron corregidos; quedan validaciones de entorno/tests y revisión security/docs-tests. |

## 3. Hallazgos bloqueantes

Ninguno nuevo desde backend.

### Resolución de bloqueos previos

1. **Resuelto — JIT `IntegrityError` ya no cae a 401 tras relectura.**  
   En `login_router.py:131-149`, si `commit()` lanza `IntegrityError`, se hace `rollback()`, se re-lee `usuario` y solo se audita/retorna 401 cuando sigue sin existir (`if not usuario`). Si el usuario concurrente existe, el flujo sale de la rama de creación y evalúa `esta_activo` y `password_set`, por lo que el caso pendiente retorna `400` + `X-Password-Not-Set` como corresponde. La prueba `test_integrity_error_hace_rollback_y_relee_usuario` ahora exige ese resultado exacto.

2. **Resuelto — `crear_usuario_portal_desde_erp` maneja duplicados concurrentes.**  
   En `provisioning_service.py:122-128`, el `add/commit` está protegido con `except IntegrityError`, ejecuta `rollback()` y mapea a `ValueError`. `public_auth_router.py:80-86` convierte ese error en HTTP 400 controlado, evitando 500 y sesión transaccional rota.

3. **Resuelto — cuentas inactivas se validan antes de `password_set`.**  
   `login_router.py:166-177` y `public_auth_router.py:60-72` rechazan `usuario.esta_activo == False` antes de exponer estado de contraseña pendiente. Hay cobertura en `test_login_usuario_inactivo_con_password_pendiente_no_filtra_password_not_set` y `test_setup_password_usuario_inactivo_rechaza_sin_cambiar_contrasena`.

4. **Resuelto — auditoría de usuario desconocido no persiste la cédula en `usuario_id`.**  
   `login_router.py:149-159` usa `usuario_id="desconocido"` para el fallo `usuario_no_encontrado`.

## 4. Hallazgos no bloqueantes

1. **MEDIA — Falta pase verde verificable de `testing/backend/test_setup_password.py` en entorno válido.**  
   El endpoint `/auth/setup-password` fue modificado y la suite contractual sigue reportada como bloqueada por `asyncpg.exceptions.InvalidPasswordError` del PostgreSQL local. Las pruebas unitarias nuevas cubren inactivo e `IntegrityError`, pero antes de merge se debe ejecutar la suite en Docker o en una DB con credenciales correctas.

2. **MEDIA — Consultas ERP síncronas siguen ejecutándose dentro de handlers/servicios `async`.**  
   Es un patrón existente del conector ERP (`Session` síncrona), pero el cambio lo deja en rutas públicas críticas (`login`, `setup-password`, `registro`). Recomiendo ticket técnico para aislar con executor/timeouts o migrar el cliente ERP a async.

3. **BAJA — La carrera real JIT sigue pendiente de ejecución end-to-end.**  
   `testing/backend/test_jit_race.py` recolecta correctamente, pero por su propia naturaleza requiere backend levantado, DB y `ERP_TEST_CEDULA`. Mantenerlo como prueba obligatoria de entorno antes de liberar.

4. **BAJA — Riesgo de diseño de seguridad queda fuera de esta aprobación backend.**  
   La habilitación pública por contrato ERP activo es una decisión documentada en bitácora, pero el reporte previo de `security-rbac-reviewer` quedó bloqueado por segundo factor/oráculos. Debe re-revisarse por security-rbac antes de aprobar el build completo.

## 5. Tests / comandos ejecutados

- `git status --short` en worktree temporal — PASS (inspección; hay cambios esperados no commiteados).
- `git diff --stat` y `git diff -- ...` — PASS (inspección).
- `python -m pytest --collect-only testing/backend/test_autogestion_usuarios_erp.py testing/backend/test_jit_approval.py testing/backend/test_jit_contrasena_eq_cedula.py testing/backend/test_erp_empleados_service.py testing/backend/test_jit_race.py` — PASS, **27 tests collected**.

Evidencia reportada por el solicitante:

- `pytest test_autogestion_usuarios_erp.py test_jit_approval.py test_jit_contrasena_eq_cedula.py test_erp_empleados_service.py -v` — **25 passed**.
- `collect-only` con `test_jit_race` — reportado como **22 collected** por el solicitante; mi recolección con los cinco archivos listados devolvió **27 collected**.
- `test_setup_password.py` — bloqueado localmente por `InvalidPasswordError` de PostgreSQL.

No ejecuté pytest real, Docker, npm ni servicios externos por restricciones del subagente.

## 6. Documentacion actualizada

- [ ] `docs/ESQUEMA_BASE_DATOS.md` — No aplica; no hay cambios de modelo/esquema.
- [ ] `docs/decisions/ADR-NNN-<titulo>.md` — No obligatorio desde backend, aunque la decisión puede ameritar ADR si se mantiene como política de seguridad durable.
- [x] `docs/bitacora/2026-07-09-autogestion-usuarios-activos-erp.md` — Existe y documenta decisión/cambios/evidencia.
- [x] `testing/CATALOGO_PRUEBAS.md` — Registra la suite de autogestión y marca `test_setup_password.py` como bloqueada local por credenciales PostgreSQL.

RBAC: no hay endpoint nuevo ni módulo nuevo; no requiere `rbac_manifest.py`. Los endpoints públicos revisados conservan rate limiting existente (`login`, `setup-password`, `registro`, `forgot-password`).

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

**Motivo:** los hallazgos bloqueantes backend previos quedaron resueltos y no observé nuevos bloqueos de arquitectura/async DB/PostgreSQL/transacción en el delta. La aprobación queda condicionada a validación de pruebas en entorno correcto y re-revisión de seguridad/docs-tests para el build completo.

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Ejecutar `testing/backend/test_setup_password.py -v` en Docker o DB PostgreSQL válida. | Backend/testing | 2026-07-09 |
| Ejecutar `testing/backend/test_jit_race.py -v` en entorno con backend, DB y `ERP_TEST_CEDULA`. | Backend/testing | 2026-07-09 |
| Solicitar re-revisión de `security-rbac-reviewer` por el diseño de autogestión pública y oráculos. | Orquestador/security | 2026-07-09 |
| Considerar ticket técnico para aislar consultas ERP síncronas en rutas auth. | Backend | Backlog |
