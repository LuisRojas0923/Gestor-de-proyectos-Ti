# Build: Bitacoras operacionales - Fase 1 persistencia

**Fecha:** 2026-07-21
**Build:** Persistencia PostgreSQL de bitacoras operacionales FT-OPE-49
**Autor del build:** OpenCode
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti
**Especificacion:** `docs/specs/2026-07-21_bitacoras-operacionales-web.md`
**Plan:** `docs/reviews/plans/2026-07-21_bitacoras-operacionales-web.md`

## 1. Archivos modificados

- `backend_v2/app/models/bitacoras_operacionales/modelos.py`
- `backend_v2/app/models/bitacoras_operacionales/schemas.py`
- `backend_v2/app/models/bitacoras_operacionales/__init__.py`
- `backend_v2/app/core/migrations/bitacoras_operacionales_migration.py`
- `backend_v2/app/core/migrations/bitacoras_operacionales_schema.py`
- `backend_v2/app/core/migrations/manager.py`
- `backend_v2/app/core/migrations/schema_verifier.py`
- `backend_v2/app/models/registry.py`
- `testing/backend/test_bitacoras_operacionales_persistencia.py`
- `testing/backend/test_bitacoras_operacionales_postgres.py`
- `testing/backend/test_bitacoras_schema_normalizacion.py`
- `testing/CATALOGO_PRUEBAS.md`
- `docs/ESQUEMA_BASE_DATOS.md`
- `scripts/sync_docs.py`

## 2. Alcance ejecutado

- Tres tablas PostgreSQL con nombres y campos en espanol.
- UUID para documento y fotografia; BIGSERIAL para actividades.
- Constraints de estado, snapshots, novedades, hashes, ordenes y artefactos finales.
- Triggers de fecha Bogota, finalizacion completa e inmutabilidad de padre e hijos.
- Indices por propietario/fecha, OT/fecha y estado/fecha, sin unicidad OT/fecha.
- Defaults PostgreSQL para `estado`, `version`, `sin_novedad` y timestamps.
- Schemas Pydantic estrictos con limites, `extra="forbid"` y validacion de fecha.
- Registro determinista de modelos, migracion fail-fast y verificacion read-only de startup.
- Locks de fila padre que serializan finalizacion y mutaciones concurrentes de hijos.
- Propietario inmutable, metadatos finales no vacios y ACL exacta sin `PUBLIC` ni `TRUNCATE` runtime.
- Verificacion exhaustiva de 39 columnas, PK, FK, checks, uniques, secuencia, indices, triggers, funciones y privilegios.

ERP, servicios funcionales, endpoints, RBAC del modulo, archivos, firma, PDF y frontend siguen fuera de alcance hasta recibir el contrato real de `Aperturas OT V4`.

## 3. Evidencia TDD

### RED

- `10` fallos iniciales por ausencia de modelos, schemas, migracion y registro runtime.
- La primera ejecucion PostgreSQL real detecto ausencia de defaults de servidor cuando `SQLModel.metadata.create_all()` precede a la migracion.
- El primer startup aislado detecto que el verificador no reconocia la representacion canonica PostgreSQL de la igualdad entre dos `VARCHAR`.
- Revision inicial de build: el comando focal concurrente produjo `2 failed, 1 passed`; el `INSERT` de hijo no esperaba el lock de finalizacion y el cambio de propietario no generaba error.
- Prueba estructural roja: `test_migracion_blinda_propiedad_concurrencia_y_acl` produjo `1 failed` por ausencia de `FOR UPDATE`.

Comandos RED conservados durante la correccion:

```text
py -3.12 -m pytest ..\testing\backend\test_bitacoras_operacionales_persistencia.py -q -k migracion_blinda_propiedad_concurrencia_y_acl
FAILED test_migracion_blinda_propiedad_concurrencia_y_acl
```

```text
docker compose -f docker-compose.tests.yml run --rm --no-deps tests pytest testing/backend/test_bitacoras_operacionales_persistencia.py -q -k "serializa_finalizacion or mutacion_hijo_antes or cambio_propietario"
FAILED test_postgres_serializa_finalizacion_antes_de_insert_hijo
FAILED test_postgres_rechaza_cambio_propietario_y_metadatos_vacios
1 passed, 2 failed
```

### GREEN

```text
py -3.12 -m pytest ..\testing\backend\test_bitacoras_operacionales_persistencia.py -q -k migracion_blinda_propiedad_concurrencia_y_acl
1 passed, 17 deselected
```

Los casos PostgreSQL se omiten localmente de forma intencional porque exigen exclusivamente `db-test/project_manager_test`; su ejecucion completa aparece a continuacion.

```text
docker compose -f docker-compose.tests.yml run --rm tests pytest testing/backend/test_bitacoras_operacionales_persistencia.py testing/backend/test_bitacoras_operacionales_postgres.py -q
24 passed, 3 warnings
```

```text
docker compose -f docker-compose.tests.yml run --rm -e ALLOW_MUTATING_TESTS=1 -e ALLOW_LIVE_INFRA_TESTS=1 tests pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -q
8 passed, 3 warnings
```

```text
docker compose -f docker-compose.tests.yml run --rm migrate-test
PASS; ejecutado repetidamente sin error
```

```text
docker compose -f docker-compose.tests.yml run --rm --no-deps -e DB_HOST=db-test -e DB_PORT=5432 -e DB_USER=gestor_test_migrator -e DB_PASS=migrator_test_only -e DB_NAME=project_manager_test -e DB_ROLE=gestor_test_owner tests python scripts/sync_docs.py
PASS; documentacion sincronizada con visibilidad completa del owner sobre project_manager_test
```

```text
py -3.12 -m pytest ..\testing\backend\test_startup_migration_roles.py -q
30 passed, 2 warnings
```

```text
docker compose ... -e DB_HOST=host-inexistente tests python scripts/sync_docs.py
FAIL esperado con psycopg2.OperationalError y codigo no cero
```

```text
py -3.12 -m pytest ..\testing\backend\test_bitacoras_schema_normalizacion.py -q
1 passed, 2 warnings
```

```text
docker compose -f docker-compose.tests.yml run --rm tests pytest testing/backend/test_bitacoras_operacionales_persistencia.py testing/backend/test_bitacoras_operacionales_postgres.py testing/backend/test_bitacoras_schema_normalizacion.py -q
25 passed, 3 warnings
```

El backend aislado alcanzo estado `healthy`, lo que valida el verificador runtime con el rol restringido. Las advertencias corresponden a deprecaciones preexistentes de `app.config`, Pydantic y `python_multipart`.

## 4. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | `approved_with_risks` final | No | Sin bloqueantes; riesgos menores de checks y barrera migradora corregidos despues. |
| security-rbac-reviewer | `approved_with_risks` final | No | Sin bypass runtime; riesgo `OR TRUE` y secuencia corregidos despues. |
| docs-tests-reviewer | `approved_with_risks` definitivo | No | MER completo; recomienda tests propios del generador. |

## 5. Hallazgos

- Corregido: defaults de `version` y `sin_novedad` ausentes cuando `create_all` creaba la tabla antes del job especifico.
- Corregido: falso negativo de startup por casts `::text` introducidos por PostgreSQL en `pg_get_constraintdef`.
- Corregido: carrera TOCTOU mediante `SELECT ... FOR UPDATE` sobre el padre en toda mutacion hija.
- Corregido: `creado_por_id` inmutable y finalizacion con rutas/firmante/version no vacios.
- Corregido: ACL convergente y verificada para tablas y secuencia de Bitacoras.
- Corregido: verificador exhaustivo y pruebas de sabotaje/reparacion estructural.
- Corregido: `sync_docs.py` filtra schema, falla con codigo no cero y genera PK/FK/cardinalidades Mermaid.
- Corregido: inventario documental generado con `SET ROLE` seguro al owner, incluyendo tablas protegidas como `configuracion_seguridad_runtime`.
- Corregido: cardinalidad derivada de nulabilidad/unicidad y tipos `VARCHAR(n)` visibles.
- Corregido: formato oficial no vacio, sabotaje `OR TRUE`, barrera para URL migradora y dependencia `OWNED BY` de la secuencia.
- Pendiente externo: contrato real de `Aperturas OT V4`; no bloquea esta fase de persistencia.

## 6. Documentacion actualizada

- [x] `docs/ESQUEMA_BASE_DATOS.md`
- [x] `testing/CATALOGO_PRUEBAS.md`
- [x] Reporte de build de Fase 1
- [x] Reportes finales de revisores

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `revision_en_curso`

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Agregar pruebas unitarias dedicadas para `sync_docs.py` | Backend/Documentacion | Deuda no bloqueante |
| Ampliar cardinalidad automatica si aparece una FK UNIQUE compuesta | Backend/Documentacion | Cuando exista el contrato |
| Obtener contrato `Aperturas OT V4` antes de la integracion ERP | Equipo ERP/usuario | Pendiente externo |
