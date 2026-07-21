# Reporte de Revision de Build: Sincronizacion de perfiles ERP

**Fecha:** 2026-07-21
**Build:** Sincronizacion de perfiles laborales desde Solid ERP
**Autor del build:** OpenCode
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

## 1. Archivos modificados

- Backend ERP/auth: conexion read-only, DTOs, servicios, endpoints y refresco en login/perfil.
- Seguridad: RBAC `admin_usuarios`, rate limits, auditoria redactada y `no-store`.
- Configuracion: `.env.example` y Compose de desarrollo, Pruebas3, produccion y tests.
- Pruebas: guardas fail-closed, unitarias, PostgreSQL ERP y HTTP aisladas.
- Documentacion: ADR-011, plan, spec, bitacora, guias y catalogo.

Los archivos compartidos contienen otros cambios concurrentes ajenos. El cierre
ERP se limita a sus hunks; no incluye frontend, horas extras, notificaciones ni
bitacoras operacionales.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| `harness-router` | completado | No | Matriz backend, seguridad, docs/tests y alcance. |
| `scope-reviewer` | `approved_with_risks` | No | Alcance ERP coherente; separar hunks ajenos. |
| `backend-reviewer` | `approved` | No | Locks, frescura ORM, transacciones y parciales corregidos. |
| `security-rbac-reviewer` | `approved_with_risks` | No | Riesgo transversal de body JSON sin limite en middleware. |
| `docs-tests-reviewer` | `approved` | No | Evidencia y aislamiento coherentes. |

## 3. Hallazgos bloqueantes

Ninguno pendiente.

## 4. Hallazgos no bloqueantes

- El middleware transversal de auditoria lee JSON antes de auth. El ingress debe mantener limite de body; su correccion global queda fuera del alcance ERP.
- Cada despliegue debe provisionar `ERP_READ_DATABASE_URL` con un principal dedicado `CONNECT`/`SELECT` y repetir `docker compose config` con sus secretos.
- El teardown inicial revelo una colision de nombre Docker y retiro contenedores locales de desarrollo. La pila de tests ahora usa `name: gestor-proyectos-ti-tests`; desarrollo requiere reinicio despues de configurar la URL read-only.
- `test_setup_password.py` y `test_auth_escalation.py` siguen fuera de esta puerta porque sus fixtures heredados intentan DML sensible directo con runtime.

## 5. Tests y comandos ejecutados

- Focales sin red: `22 passed`.
- PostgreSQL ERP read-only: `1 passed`.
- HTTP aislado: `8 passed`.
- Autogestion/JIT: `16 passed`.
- Infraestructura: `2 passed`.
- Master Health Check: `6 passed`.
- Arquitectura y sintaxis AST: `PASS`.
- `docker-compose.tests.yml config --quiet`: `PASS`.
- Compose desarrollo/Pruebas3/produccion con `--no-interpolate`: `PASS`.
- `git diff --check`: `PASS`; solo avisos de normalizacion LF/CRLF.

## 6. Documentacion actualizada

- [x] `docs/decisions/ADR-011-sincronizacion-perfiles-erp-solo-lectura.md`.
- [x] `docs/bitacora/2026-07-21-sincronizacion-perfiles-usuarios-erp.md`.
- [x] `docs/GUIA_DESARROLLO.md` y `docs/GUIA_MANTENIMIENTO.md`.
- [x] `testing/CATALOGO_PRUEBAS.md`.
- [x] `docs/ESQUEMA_BASE_DATOS.md`: no aplica; no cambio el esquema persistente por este build.

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Provisionar credencial ERP read-only y validar `solid`/`solidpruebas3` por entorno | Operaciones/ERP | Antes del despliegue |
| Configurar `ERP_READ_DATABASE_URL` y reiniciar la pila local | Equipo de desarrollo | Proxima sesion local |
| Confirmar limite de body JSON en ingress o middleware transversal | Seguridad/Plataforma | Proximo hardening |
