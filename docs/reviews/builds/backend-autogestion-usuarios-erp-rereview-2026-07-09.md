# Re-revisión backend — Autogestión usuarios ERP

**Fecha:** 2026-07-09
**Build:** autogestión de usuarios activos ERP
**Worktree:** `C:\Users\AMEJOR~1\AppData\Local\Temp\opencode\autogestion-usuarios-erp`
**Modo:** re-revisión backend
**Proyecto:** Gestor-de-proyectos-Ti
**Decisión:** **approved_with_risks**

---

## 1. Alcance

Re-revisión backend posterior a la corrección de los bloqueos técnicos detectados en:

- flujo JIT de `/auth/login` ante carrera por `IntegrityError`;
- flujo `/auth/setup-password` cuando crea usuario local desde ERP activo;
- rollback/relectura segura en provisioning de usuarios desde ERP;
- cobertura backend asociada a autogestión ERP, JIT, aprobación y contraseña inicial.

No se modifica código fuente en esta persistencia; solo se deja el reporte final solicitado.

## 2. Resultado de la re-revisión

**Backend review: approved_with_risks**

Los bloqueos técnicos previos quedan resueltos para este alcance. La implementación ya no queda bloqueada por las condiciones de carrera revisadas, siempre que se mantenga el manejo explícito de `IntegrityError`, `rollback()` y relectura/idempotencia en los flujos JIT y `setup-password`.

## 3. Hallazgos

### Bloqueantes

Ninguno en esta re-revisión.

### Riesgos no bloqueantes

1. **MEDIO — `testing/backend/test_setup_password.py` pendiente en PostgreSQL válido.**
   La suite sigue marcada como pendiente ambiental por credenciales PostgreSQL locales inválidas. Debe ejecutarse en Docker/CI o en un entorno con credenciales válidas antes de merge/release, porque `/auth/setup-password` fue parte del delta revisado.

2. **MEDIO — `testing/backend/test_jit_race.py` pendiente con Docker y `ERP_TEST_CEDULA`.**
   La prueba de carrera JIT requiere entorno Docker/ERP configurado para validar concurrencia real con una cédula ERP de prueba. No bloquea esta re-revisión porque el bloqueo lógico previo fue corregido, pero es evidencia necesaria antes de liberar.

## 4. Required tests

Pendientes no bloqueantes antes de merge/release:

- `python -m pytest testing/backend/test_setup_password.py -v` en entorno PostgreSQL válido.
- `python -m pytest testing/backend/test_jit_race.py -v` dentro de Docker/entorno integrado con `ERP_TEST_CEDULA` configurada.

No se ejecutaron pruebas adicionales durante esta persistencia del reporte por restricción del encargo: no modificar código y solo escribir el reporte final si no existía.

## 5. Required docs / RBAC follow-up

- `docs/ESQUEMA_BASE_DATOS.md`: no requerido; no hay cambios de modelo/esquema en el cierre de bloqueos.
- `backend_v2/app/core/rbac_manifest.py`: no requerido; no se agregan módulos protegidos nuevos.
- `testing/CATALOGO_PRUEBAS.md` y bitácora del build: suficientes según la re-revisión docs/tests disponible.
- Mantener trazados los riesgos de seguridad funcional aceptados por autogestión pública basada en ERP activo en el reporte Security/RBAC correspondiente.

## 6. Blocking reasons

Ninguno. La decisión final es **approved_with_risks** por evidencia ambiental pendiente, no por defectos técnicos bloqueantes en el backend revisado.

---

```text
Backend review: approved_with_risks
Findings: bloqueos técnicos resueltos; quedan 2 riesgos no bloqueantes de evidencia ambiental.
Required tests: test_setup_password.py en PostgreSQL válido; test_jit_race.py con Docker/ERP_TEST_CEDULA.
Required docs/RBAC follow-up: sin cambios requeridos en ESQUEMA_BASE_DATOS.md ni rbac_manifest.py; conservar trazabilidad en bitácora/CATALOGO_PRUEBAS y reporte Security/RBAC.
Blocking reasons: ninguno.
```
