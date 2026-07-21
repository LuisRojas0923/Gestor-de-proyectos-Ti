# ADR-011: Sincronizacion de perfiles ERP con conexion de solo lectura

**Estado:** Aceptado
**Fecha:** 2026-07-21
**Plan:** `docs/reviews/plans/2026-07-21_sincronizacion-perfiles-usuarios-erp.md`
**Especificacion:** `docs/specs/2026-07-21_sincronizacion-perfiles-usuarios-erp.md`

## Contexto

Los perfiles locales solo se refrescaban cuando faltaban `area` o `sede`. Un
cambio posterior de cargo en el contrato activo del ERP quedaba obsoleto en el
portal. La conexion ERP existente tambien soporta escrituras de correo y no es
una frontera adecuada para una sincronizacion masiva de lectura.

## Decision

1. Solid ERP es la fuente de verdad de nombre y datos laborales; roles, estado,
   contrasena, permisos, especialidades y sesiones siguen siendo locales.
2. La sincronizacion usa `ERP_READ_DATABASE_URL`, una credencial separada con
   `CONNECT` y `SELECT`, y ejecuta ademas `SET TRANSACTION READ ONLY`.
3. `ERP_READ_EXPECTED_DATABASE` y `ENVIRONMENT` se validan antes de crear el
   engine: desarrollo/tests solo autorizan `solidpruebas3` y produccion `solid`.
4. El engine de lectura se crea de forma lazy. Una configuracion incorrecta
   degrada la integracion, pero no impide iniciar ni autenticar contra el portal.
5. Cada login valido intenta refrescar el perfil. Un fallo hace rollback y
   relectura local; nunca invalida unas credenciales locales correctas.
6. La aplicacion administrativa reutiliza `admin_usuarios`, procesa lotes de
   100, limita el alcance total, usa `FOR UPDATE`, savepoints y advisory lock.
7. Preview y apply no aceptan URLs, nombres de base ni listas de cedulas.
8. Auditoria y respuestas exponen solo resultados agregados y campos cambiados,
   nunca identidad ni valores del usuario objetivo.
9. Los tests de integracion usan `docker-compose.tests.yml`, PostgreSQL ERP
   efimero y guardas que rechazan cualquier destino productivo.

## Consecuencias

- Produccion debe provisionar y rotar una credencial ERP de lectura separada.
- Un login puede conservar temporalmente datos locales obsoletos si ERP esta
  degradado, pero queda un warning operacional sin PII.
- La ejecucion masiva es reintentable e idempotente; no actualiza el estado de
  cuentas ni desactiva usuarios ausentes del ERP.
- No se requiere migracion del esquema local.
