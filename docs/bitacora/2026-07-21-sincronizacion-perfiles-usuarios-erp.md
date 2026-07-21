# Bitacora: Sincronizacion de perfiles de usuarios desde ERP

**Fecha:** 2026-07-21
**Estado:** Implementado y validado
**Plan:** `docs/reviews/plans/2026-07-21_sincronizacion-perfiles-usuarios-erp.md`

## Alcance ejecutado

- Conexion ERP lazy de solo lectura y validada por entorno.
- Seleccion determinista del contrato activo mas reciente.
- Sincronizacion idempotente durante login.
- Preview, sincronizacion individual y aplicacion masiva con `admin_usuarios`.
- Auditoria sin PII objetivo, rate limits y respuestas `no-store`.
- Pila Docker autonoma con DB local y ERP efimeros.

## Evidencia TDD

### RED

- Comando: `docker compose -f docker-compose.tests.yml run --rm --no-deps tests pytest testing/backend/test_sincronizacion_perfiles_erp.py -m "not erp_postgres_integration and not mutating_integration and not live_infrastructure" -v`.
- Resultado: exit code `1`, `2 failed`, cero skips/xfails objetivo.
- Fallos esperados: login no refrescaba un perfil completo; perfil ERP identico escribia e invalidaba el flujo de correo.

### GREEN focal

- Unitarias y guardas focales: `22 passed`.
- Regresiones autogestion/JIT: `16 passed`.
- PostgreSQL ERP aislado: `1 passed`; contrato vigente seleccionado, rol sin `UPDATE` y transaccion read-only.
- HTTP aislado: `8 passed`; auditoria sin PII, `401`, `403` en las tres rutas, lock masivo `409`, lock por fila acotado, `422` sin eco, rate limits independientes, apply real y login con cargo vigente.
- Infraestructura: `2 passed`.
- Master Health Check: `6 passed`.
- Arquitectura, sintaxis, `docker-compose.tests.yml config` y `git diff --check`: correctos.
- Compose de desarrollo, Pruebas3 y produccion: sintaxis valida con `--no-interpolate`.

La barrera fail-closed tambien se verifico sin opt-ins: la coleccion de pruebas
mutantes termino antes de ejecutar casos con
`mutating_integration requiere ALLOW_MUTATING_TESTS=1`.

### Comandos GREEN

- Focales: `docker compose -f docker-compose.tests.yml run --rm --no-deps tests pytest testing/backend/test_barreras_pruebas_aisladas.py testing/backend/test_sincronizacion_perfiles_erp.py testing/backend/test_perfiles_laborales_erp.py -m "not erp_postgres_integration and not mutating_integration and not live_infrastructure" -q`.
- ERP PostgreSQL: `docker compose -f docker-compose.tests.yml run --rm -e ALLOW_ERP_TEST_DB=1 tests pytest testing/backend/test_perfiles_laborales_erp.py -m erp_postgres_integration -q`.
- HTTP: `docker compose -f docker-compose.tests.yml run --rm -e ALLOW_MUTATING_TESTS=1 -e ALLOW_LIVE_INFRA_TESTS=1 tests pytest testing/backend/test_sincronizacion_perfiles_erp_http.py -q`.
- JIT: `docker compose -f docker-compose.tests.yml run --rm --no-deps tests pytest testing/backend/test_autogestion_usuarios_erp.py testing/backend/test_jit_approval.py -q`.
- Infraestructura: `docker compose -f docker-compose.tests.yml run --rm -e ALLOW_MUTATING_TESTS=1 -e ALLOW_LIVE_INFRA_TESTS=1 tests pytest testing/backend/test_infrastructure.py -m live_infrastructure -q`.
- Regresiones: `docker compose -f docker-compose.tests.yml run --rm -e ALLOW_MUTATING_TESTS=1 -e ALLOW_LIVE_INFRA_TESTS=1 tests pytest testing/backend/test_regresiones.py -m "mutating_integration and live_infrastructure" -q`.

### Aplicacion masiva real aislada

- Se forzo `CARGO ANTERIOR` en `db-test` para el usuario sintetico.
- `POST /auth/usuarios/sincronizacion-erp/aplicar` respondio `200`, evaluo cuatro usuarios y actualizo uno.
- La lectura posterior en `db-test` confirmo `CARGO VIGENTE`.

Todos los datos usados por las pruebas son sinteticos. No se ejecuto ninguna
prueba automatizada contra `solid` ni contra la base local de desarrollo.

## Observaciones no bloqueantes

- `test_setup_password.py` y `test_auth_escalation.py` no forman parte de la puerta de este cambio. Su ejecucion adicional obtuvo `5 passed`, `4 failed`, `10 errors` y `1 skipped` porque sus fixtures heredados realizan DML sensible directo con el rol runtime, correctamente bloqueado por el trigger de proteccion.
- `docker compose config` de desarrollo exige ahora `ERP_READ_DATABASE_URL`. El operador debe suministrar una credencial ERP dedicada de lectura; no se permite reutilizar `ERP_DATABASE_URL`.
- Los Compose de despliegue requieren ademas sus variables operativas y secretos preexistentes. La validacion interpolada debe repetirse en cada entorno con su gestor de secretos.
- El primer teardown detecto que la pila de tests compartia el nombre de proyecto Docker con desarrollo y elimino sus contenedores huerfanos, no sus datos productivos. `docker-compose.tests.yml` usa ahora `name: gestor-proyectos-ti-tests`; la pila local de desarrollo permanece detenida hasta configurar `ERP_READ_DATABASE_URL` y ejecutar `docker compose up -d`.
