# Revisión backend — Cierre del bloqueante Fase 1P

**Fecha:** 2026-07-17
**Build:** Delta final del migrador productivo
**Modo:** build, revisión read-only acotada
**Proyecto:** Gestor-de-proyectos-Ti

## Hallazgo bloqueante del delta

### B1 — La dependencia de configuración JWT continúa al ejecutar `migrate`

**Archivos/líneas:**

- `backend_v2/app/core/migrations/manager.py:45-46`
- `backend_v2/app/services/auth/__init__.py:4`
- `backend_v2/app/services/auth/servicio.py:12`
- `backend_v2/app/config.py:55-65,109-115`
- `docker-compose.prod.yml:29-39`
- `testing/backend/test_phase1p_endpoint_security.py:116-132`

La corrección en `bootstrap_admin.py:6-16,41-43` elimina correctamente su import de `ServicioAuth/config`, usa bcrypt directo y limita el bootstrap al rol `admin`. Sin embargo, el flujo real de migración importa después `app.services.auth.rbac_discovery`. Python ejecuta primero `app.services.auth.__init__`, que importa ávidamente `ServicioAuth`; este vuelve a importar `app.config` y dispara la validación productiva de `JWT_SECRET_KEY`. El servicio `migrate` no recibe dicho secreto, por lo que el comando completo todavía falla al alcanzar la sincronización RBAC.

La evidencia `manage-import-ok` solo ejecuta `import app.manage`; los imports de `manager` y `rbac_discovery` son deliberadamente diferidos hasta `ejecutar_migrate`, por lo que esa comprobación no recorre la ruta bloqueante. La aceptación PostgreSQL ejecuta bajo el entorno de pytest, que sí carga configuración JWT de pruebas, y tampoco reproduce el entorno mínimo de Compose productivo.

**Cierre requerido:** retirar el import ávido de `ServicioAuth` de `app.services.auth.__init__` o desacoplar `rbac_discovery` de ese paquete, y probar el comando completo `python -m app.manage migrate` con `ENVIRONMENT=production`, sin `JWT_SECRET_KEY`, usando las variables exactas del servicio migrador.

## Veredicto técnico

**BLOQUEADO** — el bloqueante contractual `migrate -> backend` persiste en producción.
