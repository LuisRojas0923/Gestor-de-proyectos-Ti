# Fase 1P - Migraciones fuera del runtime

**Rama:** `Modulo_Geoface`
**SHA contractual:** `990a697d`
**Estado RIPER:** REVIEW - implementación y evidencia técnica completas

## Alcance aprobado

Separar las mutaciones de base de datos del arranque de FastAPI. El proceso
runtime solo verifica el esquema y RBAC; un job explicito ejecuta migraciones,
saneamientos, seeds y sincronizacion RBAC con credenciales dedicadas.

## Inventario de mutaciones actual

- `app.main.startup_event`: llama `init_db` y `sincronizar_manifiesto_rbac`.
- `app.database.init_db`: delega al manager usando el engine runtime.
- `manager.init_db_process`: ejecuta `SQLModel.metadata.create_all`.
- `manager.init_db_process`: altera columnas de `registros_asistencia`.
- `ejecutar_blindaje_estructural`: crea/altera objetos y sanea datos.
- `reparar_todas_las_secuencias`: ejecuta reparaciones con `setval`.
- Migraciones de auditoria, Horas Extras y relaciones de horarios: crean y
  alteran tablas, constraints, funciones y triggers.
- Saneamientos de inventario: ejecutan tres `UPDATE`.
- `ejecutar_seeds`: crea admin, sala y tipos de desarrollo; el admin usa la
  credencial predecible `admin/admin123`.
- `seed_horas_extras_completo`: inserta catalogos y parametros usando el
  `AsyncSessionLocal` runtime global.
- `sincronizar_manifiesto_rbac`: hace upsert de modulos, repara permisos admin
  y migra permisos granulares de Horas Extras.
- Los tres Compose arrancan `uvicorn` directamente y no tienen job migrador.

## Checklist atomico

1. [x] Crear y ejecutar en rojo `test_startup_migration_roles.py`.
2. [x] Crear comando explicito `python -m app.manage migrate`.
3. [x] Exigir `MIGRATION_DATABASE_URL` al proceso migrador.
4. [x] Serializar dos migradores mediante advisory lock PostgreSQL.
5. [x] Hacer que cualquier fallo del job se propague y produzca exit no cero.
6. [x] Mover sincronizacion RBAC al job migrador.
7. [x] Convertir startup a verificacion read-only y fail-closed.
8. [x] Verificar esquema y RBAC sin DDL, DML, commit ni reparaciones.
9. [x] Eliminar el bootstrap `admin/admin123` y usar secreto montado una vez.
10. [x] Inyectar el session factory migrador en seeds de Horas Extras.
11. [x] Agregar job `migrate` y dependencia `service_completed_successfully` a
    desarrollo, Pruebas3 y produccion.
12. [x] Separar variables runtime/migrador en `.env.example` y Compose.
13. [x] Registrar la suite verde en `testing/CATALOGO_PRUEBAS.md`.
14. [x] Ejecutar pruebas focales, PostgreSQL, infraestructura y regresiones.
15. [x] Obtener aprobación final backend, seguridad/RBAC y docs/tests.
16. [x] Waiver ERP temporal autorizado por el usuario el 2026-07-17; ejecutar
    los cuatro casos en destino antes de producción.
17. [x] Registrar SHA de Fase 1P tras aprobación humana: `7f699853`.

## Puerta de salida

- El startup runtime no ejecuta DDL, DML, seeds ni sincronizacion RBAC.
- Un esquema o manifiesto RBAC incompleto bloquea el arranque con error saneado.
- El job migrador es idempotente, exclusivo y falla de forma observable.
- La credencial migradora no se entrega al servicio backend runtime.
- No existe bootstrap con password predecible.
- Todo código fuente y prueba modificados por la fase quedan en 500 lineas o menos.
