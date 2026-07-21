# Revisión backend final — Bitácoras Operacionales Fase 1

**Fecha:** 2026-07-21
**Build:** Persistencia PostgreSQL de Bitácoras Operacionales FT-OPE-49
**Autor del build:** OpenCode
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti
**Revisor:** backend-reviewer
**Veredicto:** `approved_with_risks`

---

## 1. Archivos revisados

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
- Secciones relacionadas de `testing/CATALOGO_PRUEBAS.md`, `docs/ESQUEMA_BASE_DATOS.md`, especificación, plan y reporte del build.

El alcance sigue limitado a persistencia PostgreSQL. No se revisó como funcionalidad implementada API, ERP, archivos, firma, PDF, frontend ni RBAC del módulo.

## 2. Cierre de hallazgos bloqueantes anteriores

### Cerrado — Carrera entre finalización y mutaciones de hijos

**Código:** `backend_v2/app/core/migrations/bitacoras_operacionales_migration.py:24-50`.
**Pruebas:** `testing/backend/test_bitacoras_operacionales_persistencia.py:404-469` y `testing/backend/test_bitacoras_operacionales_postgres.py:239-265`.

Toda mutación hija bloquea ahora la fila padre con `SELECT ... FOR UPDATE`; el reparenting se rechaza. Esto serializa correctamente ambos órdenes:

- finalización primero: la mutación espera y luego falla al observar `FINALIZADA`;
- mutación primero: la finalización espera y el constraint trigger diferido valida el conjunto de hijos ya confirmado.

La matriz secuencial cubre padre y las tres operaciones sobre actividades/fotografías. No queda bloqueante de concurrencia en esta fase.

### Cerrado — Propietario mutable

**Código:** `backend_v2/app/core/migrations/bitacoras_operacionales_migration.py:8-21`.
**Prueba:** `testing/backend/test_bitacoras_operacionales_postgres.py:184-236`.

El trigger padre rechaza `NEW.creado_por_id IS DISTINCT FROM OLD.creado_por_id` antes de permitir cualquier actualización del borrador. La frontera de propiedad queda persistida y no depende del futuro servicio.

### Cerrado — Drift físico, defaults, FKs y ACL incompletamente verificados

**Código:**

- Contrato físico: `backend_v2/app/core/migrations/bitacoras_operacionales_schema.py:14-113,120-197`.
- Defaults/FKs nombradas: `backend_v2/app/core/migrations/bitacoras_operacionales_migration.py:140-180`.
- ACL convergente: `backend_v2/app/core/migrations/manager.py:140-166`.
- Integración fail-closed: `backend_v2/app/core/migrations/schema_verifier.py:155-173,297-341`.

Se verifican exactamente las 39 columnas —tipo, longitud, nulabilidad y default—, las PK/FK/checks/uniques esperadas, secuencia, ownership y ACL directa mínima. Los índices, triggers y cuerpos/ACL de funciones continúan verificados por el verificador central. El runtime permanece read-only respecto de DDL y falla cerrado ante drift.

### Cerrado — Cobertura PostgreSQL insuficiente

**Pruebas:** `testing/backend/test_bitacoras_operacionales_persistencia.py` y `testing/backend/test_bitacoras_operacionales_postgres.py`.

Ahora existen dos conexiones reales, ambos órdenes concurrentes, doble migración, reparación de defaults/FKs/ACL, sabotaje de check/index/trigger/function, detección de tipo/nulabilidad, defaults UUID, propietario, matriz de inmutabilidad y constraints de hijos.

## 3. Hallazgos residuales no bloqueantes

### MEDIA — Los snapshots oficiales del formato todavía admiten texto vacío

**Referencias:** `backend_v2/app/models/bitacoras_operacionales/modelos.py:44-47,140-142`; `backend_v2/app/core/migrations/bitacoras_operacionales_migration.py:159`; contrato en `docs/reviews/plans/2026-07-21_bitacoras-operacionales-web.md:98`.

`codigo_formato` y `version_formato` son `NOT NULL`, pero no participan en el check de snapshots no vacíos. Una fila, incluso finalizada, puede conservar `''` o solo espacios para esos dos snapshots documentales. No bloquea Fase 1 porque todavía no existe una API y ambos valores serán controlados por servidor, pero conviene cerrar la invariancia antes de generar PDFs.

**Acción recomendada:** incluir ambos campos en el check `ck_bitacora_snapshots_no_vacios` y agregar una prueba PostgreSQL que rechace blanco/vacío.

### BAJA — La verificación semántica de constraints usa fragmentos, no definición canónica completa

**Referencias:** `backend_v2/app/core/migrations/bitacoras_operacionales_schema.py:65-113,153-162`.

El verificador exige nombres exactos y fragmentos relevantes, pero una definición debilitada que mantenga esos fragmentos —por ejemplo agregando `OR TRUE`— podría superar la verificación. La migración reescribe las definiciones exactas y solo el owner puede alterarlas, por lo que no constituye un bloqueante operativo actual.

**Acción recomendada:** comparar definiciones normalizadas completas para checks/FKs/uniques críticos y añadir una prueba que sustituya un check por una versión semánticamente debilitada.

### BAJA — Los tests DDL validan la URL runtime aislada, pero no la URL migradora

**Referencias:** `testing/backend/test_bitacoras_operacionales_postgres.py:13-16,29-39`; barrera general en `testing/backend/conftest.py:60-74`.

`_requiere_postgres_aislado()` comprueba `DATABASE_URL`, mientras `_owner_engine()` toma independientemente `MIGRATION_DATABASE_URL` y ejecuta DDL. La evidencia fue obtenida correctamente en `db-test/project_manager_test`, pero una configuración mixta accidental no queda bloqueada por el helper.

**Acción recomendada:** validar que ambas URLs apuntan a `db-test/project_manager_test` y marcar esta suite como mutante o aplicar una barrera equivalente antes de abrir la conexión owner.

## 4. Validaciones satisfactorias

- Operaciones PostgreSQL completamente async; no se introdujo acceso DB síncrono.
- Orden canónico correcto: registry antes de `SQLModel.metadata.create_all()`, migración especializada después y verificación read-only en runtime.
- PostgreSQL exclusivo: UUID, `gen_random_uuid()`, `TIMESTAMPTZ`, PL/pgSQL, constraints diferibles y locks de fila.
- UUID de padre/fotografía con default PostgreSQL y default de aplicación alineados.
- FKs nombradas y `ON DELETE RESTRICT` alineadas entre SQLModel y DDL.
- Metadatos finales de firma/PDF/firmante/constancia no vacíos; hashes SHA-256 estructurales.
- Constraint trigger diferido exige actividad y fotografía al finalizar.
- Propietario, padres finalizados e hijos finalizados inmutables; documento padre no eliminable.
- ACL sin `PUBLIC`, sin `TRUNCATE` runtime y sin grant option; secuencia limitada a `SELECT, USAGE`.
- Migración fail-fast, transaccional e idempotente; el manager propaga fallos.
- Schemas concretos y estrictos; no usan `datos: dict` ni exponen campos controlados.
- Ningún archivo revisado supera 550 líneas; el mayor focal tiene 497 líneas.
- No se añadió RBAC funcional ni otras capas excluidas.

## 5. Tests y evidencia

- Ejecutado por este revisor: `python -m pytest --collect-only testing/backend/test_bitacoras_operacionales_persistencia.py testing/backend/test_bitacoras_operacionales_postgres.py -q` — **24 tests collected**.
- Evidencia fresca suministrada: **24 passed** focales en PostgreSQL 15, **8 passed** regresiones, **30 passed** de startup/migration roles, backend-test `healthy`, `py_compile` PASS y `git diff --check` PASS.
- El revisor no reejecutó Docker ni pytest funcional porque su rol solo autoriza `pytest --collect-only`.

## 6. Documentación y RBAC

- [x] `docs/ESQUEMA_BASE_DATOS.md` incluye UUID/defaults y relaciones de las tres tablas.
- [x] `testing/CATALOGO_PRUEBAS.md` registra ambos archivos y los 24 casos.
- [x] No existe alcance funcional que requiera registrar todavía permisos del módulo.
- [ ] Antes de habilitar API, registrar permisos exactos, aplicar ownership en servicios y cerrar los snapshots oficiales vacíos.

## 7. Decisión final

- [ ] `approved`
- [x] `approved_with_risks`
- [ ] `blocked`

No quedan bloqueantes para cerrar Fase 1 de persistencia. Los tres riesgos residuales son de endurecimiento previo a la fase funcional y no invalidan la evidencia PostgreSQL actual.

## 8. Seguimiento

| Acción | Responsable | Momento límite |
|---|---|---|
| Rechazar `codigo_formato`/`version_formato` vacíos | Backend | Antes de PDF/API |
| Endurecer comparación semántica de constraints | Backend | Antes de producción |
| Validar también `MIGRATION_DATABASE_URL` en tests DDL | Testing | Antes de reutilizar la suite fuera de Compose aislado |
| Obtener contrato real de `Aperturas OT V4` | Equipo ERP/usuario | Antes de integración ERP |
