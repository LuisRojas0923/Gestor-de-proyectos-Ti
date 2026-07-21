# Security/RBAC review: blocked

**Fecha:** 2026-07-21
**Alcance:** Fase 1 de persistencia PostgreSQL para Bitacoras Operacionales FT-OPE-49: modelos, schemas de entrada, migracion, registro en el manager, verificador read-only y pruebas focales. No existen endpoints funcionales; RBAC del modulo queda deliberadamente fuera de esta revision. Se ignoraron cambios concurrentes ajenos del worktree.

**Evidencia recibida (no reejecutada por este revisor):** 14 passed sobre PostgreSQL 15 real, backend healthy con credencial runtime, migracion repetida sin error y 8 regresiones. La inspeccion fue estatica/read-only conforme al protocolo del subagente.

## Checklist results

- Auth en endpoints: N/A — no hay rutas funcionales en esta fase
- Schemas sin dict: ✅
- PK con Field(pattern): N/A — las PK nuevas son UUID/BIGINT, no `str`
- PUT/PATCH exclude_unset: N/A — no hay handlers ni servicio PATCH todavia
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ✅

## Hallazgos por severidad

### BLOQUEANTE B-01 — El propietario de un borrador es mutable en PostgreSQL

**Referencias:** `backend_v2/app/models/bitacoras_operacionales/modelos.py:102-108`; `backend_v2/app/core/migrations/bitacoras_operacionales_migration.py:8-18`; `backend_v2/app/core/migrations/manager.py:140-150`; contrato en `docs/reviews/plans/2026-07-21_bitacoras-operacionales-web.md:90-99`.

`creado_por_id` define la frontera de propiedad, pero el trigger del padre solo rechaza `DELETE` y cambios cuyo estado anterior ya sea `FINALIZADA`. Mientras la fila sea `BORRADOR`, una actualizacion puede cambiar `creado_por_id`. La igualdad `finalizado_por_id = creado_por_id` solo compara contra el propietario ya modificado, no contra el creador original. Ademas, el rol runtime recibe `UPDATE` general sobre las tablas de dominio y no hay RLS; los filtros de servicio futuros no sustituyen este invariante de persistencia.

Esto permite reasignar un borrador y luego finalizarlo como si perteneciera al nuevo actor ante un defecto de allowlist, una consulta insegura o uso indebido de la credencial runtime. Contradice expresamente el contrato de propietario inmutable. **CWE-639, CWE-862, CWE-284.**

**Accion requerida:** hacer que el trigger rechace siempre `NEW.creado_por_id IS DISTINCT FROM OLD.creado_por_id`, antes de evaluar el estado. Agregar prueba PostgreSQL con la credencial runtime que intente cambiar el propietario de un borrador y compruebe rollback.

### BLOQUEANTE B-02 — Carrera TOCTOU permite mutar o vaciar hijos despues de finalizar

**Referencias:** `backend_v2/app/core/migrations/bitacoras_operacionales_migration.py:20-70`; prueba secuencial en `testing/backend/test_bitacoras_operacionales_persistencia.py:211-301`.

El trigger de actividades/fotografias consulta el estado del padre con un `SELECT` no bloqueante. Es posible este interleaving con dos conexiones:

1. T1 elimina o modifica el ultimo hijo y su trigger observa el padre en `BORRADOR`.
2. Antes de que T1 confirme, T2 cambia el padre a `FINALIZADA`.
3. El constraint trigger diferido de T2 aun ve la version comprometida anterior del hijo y permite el commit.
4. T1 confirma sin volver a comprobar el padre, dejando un documento finalizado mutado o sin el minimo requerido.

La misma ventana permite insertar/modificar hijos despues de que una finalizacion concurrente haya comenzado. Los triggers secuenciales funcionan, pero no preservan el invariante bajo concurrencia. **CWE-367, CWE-362, CWE-667.**

**Accion requerida:** serializar toda mutacion de hijos contra la fila padre, normalmente bloqueando el padre (`SELECT ... FOR UPDATE`) dentro del trigger y evaluando el estado despues de adquirir el lock. Para movimientos entre padres, bloquear ambos de forma determinista. Agregar una prueba PostgreSQL real de dos conexiones para DELETE/UPDATE/INSERT concurrente contra finalizacion; al terminar, o la mutacion debe fallar o la finalizacion debe ver el estado final de los hijos.

### ALTO A-01 — La finalizacion acepta rutas y metadatos obligatorios vacios

**Referencias:** `backend_v2/app/models/bitacoras_operacionales/modelos.py:56-69`; `backend_v2/app/core/migrations/bitacoras_operacionales_migration.py:149-150`.

El check de finalizacion exige `NOT NULL` para `firma_ruta`, `pdf_ruta`, `nombre_firmante` y `version_constancia`, pero no exige contenido. Valores `''` o solo espacios satisfacen el constraint y permiten representar una finalizacion sin artefactos/localizacion o sin identidad textual del firmante. Los hashes si tienen formato SHA-256 estricto, pero no compensan metadatos vacios. **CWE-20, CWE-345.**

**Accion requerida:** exigir `btrim(...) <> ''` para rutas, firmante y version de constancia en la rama `FINALIZADA`; conservarlos nulos en borrador. Probar cadenas vacias y whitespace con `SET CONSTRAINTS ALL IMMEDIATE`.

### ALTO A-02 — ACL de tablas/secuencia no es convergente ni se verifica de forma exacta

**Referencias:** `backend_v2/app/core/migrations/manager.py:130-154`; `backend_v2/app/core/migrations/bitacoras_operacionales_migration.py:165-172`; `backend_v2/app/core/migrations/schema_verifier.py:287-365`.

En una base nueva, los objetos quedan bajo el owner NOLOGIN y runtime recibe CRUD sin DDL; esa topologia es correcta. Sin embargo, la migracion solo revoca `PUBLIC EXECUTE` de las funciones. No revoca privilegios preexistentes de `PUBLIC` sobre las tres tablas/secuencia ni privilegios peligrosos de runtime como `TRUNCATE`, `TRIGGER`, `REFERENCES` o grant option. El verificador confirma ownership de tablas y ACL exacta de funciones, pero no ACL exacta de estas tablas ni de `bitacora_operacional_actividades_id_seq`.

Una concesion residual de `TRUNCATE` permitiria borrar hijos sin ejecutar los row triggers, y un grant DML a `PUBLIC` eludiria la frontera del proceso runtime; ambos escenarios pueden sobrevivir a `migrate` y a un startup healthy. **CWE-732, CWE-284, CWE-693.**

**Accion requerida:** revocar explicitamente privilegios de `PUBLIC`, retirar capacidades no requeridas de runtime y volver a conceder solo CRUD/uso previstos; verificar grantees, grant options, `TRUNCATE/TRIGGER/REFERENCES`, owner y ACL de la secuencia. Incluir pruebas de corrupcion y reparacion de ACL.

### MEDIO M-01 — Migracion y verifier no convergen ni detectan FKs/defaults estructurales criticos

**Referencias:** `backend_v2/app/core/migrations/bitacoras_operacionales_migration.py:90-163`; `backend_v2/app/core/migrations/schema_verifier.py:9-35, 155-188, 279-285`.

`CREATE TABLE IF NOT EXISTS` no repara una tabla parcial. La migracion recrea checks y uniques nombrados, pero no recrea PK/FKs si ya faltan, y solo reafirma los defaults de `version` y `sin_novedad`. El verifier comprueba nombres de columnas, tres constraints de Bitacoras, triggers, funciones e indices; no valida PKs, las cuatro FKs, tipos, nulabilidad, todos los checks de hashes/coherencia, defaults o la secuencia BIGSERIAL. Por ello una FK eliminada, un default alterado o un check de hash retirado puede pasar startup; rerun de migrate tampoco repara todos esos casos.

Tambien hay drift contractual menor: el modelo declara `ON DELETE RESTRICT` en las FKs a `usuarios`, mientras el DDL explicito usa el `NO ACTION` implicito. Los UUID se describen como generados por servidor en el plan, pero el DDL no tiene `DEFAULT gen_random_uuid()`; `default_factory=uuid4` solo cubre el ORM. **CWE-754, CWE-20, CWE-703.**

**Accion requerida:** declarar/reparar FKs y defaults explicitamente con nombres estables; verificar en catalogo PK/FK, acciones de borrado, tipo/nulabilidad/defaults, checks completos y secuencia. Decidir y alinear `RESTRICT` frente a `NO ACTION`, y servidor frente a ORM para UUID. Agregar pruebas que corrompan cada objeto y demuestren fail-closed/reparacion.

### MEDIO M-02 — La evidencia focal no cubre las barreras que fallan en esta revision

**Referencias:** `testing/backend/test_bitacoras_operacionales_persistencia.py:97-196, 211-319`.

Los tres casos PostgreSQL cubren finalizacion secuencial, ausencia de hijos y fecha futura. No hay prueba de propietario inmutable, dos conexiones concurrentes, artefactos vacios, ACL/owner especificos de Bitacoras, FKs/defaults alterados, `TRUNCATE`, ACL de secuencia ni corrupcion/reparacion del verifier. El test de repetibilidad con `ConexionDDL` solo confirma que se emite dos veces la misma lista SQL; la ejecucion repetida real recibida es valiosa, pero no demuestra convergencia desde drift parcial. **CWE-362, CWE-693.**

**Accion requerida:** ampliar la suite PostgreSQL aislada con los casos anteriores y ejecutar tambien la prueba integral de roles/migracion/verifier que altera catalogo y ACL, no solo las ocho regresiones generales informadas.

## Controles verificados positivamente

- FastAPI startup invoca `verificar_esquema_runtime` y no el job mutante; `app.manage migrate` autentica como migrador y activa el owner NOLOGIN. Runtime no posee `CREATE` en `public`, no pertenece al owner y el verifier falla cerrado.
- Las cuatro funciones trigger se crean en `public`, son `SECURITY INVOKER`, usan relaciones calificadas, revocan `EXECUTE` a `PUBLIC` y el verifier compara firma, lenguaje, owner, cuerpo y grantees exactos.
- La inmutabilidad secuencial de padres finalizados y sus hijos esta implementada; el bypass encontrado es especificamente concurrente.
- La finalizacion completa es diferida y exige al menos una actividad y fotografia; los uniques de orden son `DEFERRABLE INITIALLY DEFERRED`.
- Los hashes exigen 64 hexadecimales minusculos y las dimensiones/tamanos de fotografia deben ser positivos.
- Las FKs de hijos usan `ON DELETE RESTRICT`; se permiten varias bitacoras por OT/fecha como exige el contrato.
- `estado`, `version`, `sin_novedad` y timestamps tienen defaults PostgreSQL en una creacion nueva; la fecha futura usa explicitamente `America/Bogota` y no depende de la zona horaria de sesion.
- La migracion propaga errores y esta registrada como paso fail-fast del job migrador.

## RBAC/config impact

No corresponde exigir entradas nuevas en `rbac_manifest.py`: no hay endpoints ni permisos funcionales de Bitacoras en esta fase y el diferimiento es deliberado. Antes de exponer rutas se deben registrar los permisos previstos y aplicar propiedad en cada consulta/mutacion, pero ese trabajo no forma parte del veredicto actual.

La separacion `migrador -> schema_owner` / `runtime verify-only` es consistente. El bloqueo se limita a invariantes y ACL de los nuevos objetos, no a la decision de diferir RBAC.

## Blocking reasons

1. `creado_por_id` puede cambiar mientras la bitacora esta en borrador, rompiendo la propiedad inmutable.
2. La comprobacion no bloqueante del padre permite una carrera que muta o elimina hijos de un documento finalizado.

**Severity maxima:** BLOQUEANTE
**Conteo:** BLOQUEANTE 2, ALTO 2, MEDIO 2, BAJO 0.
**Verdict:** **blocked**.

## Acciones para desbloquear

1. Inmutabilizar `creado_por_id` en PostgreSQL y probarlo con runtime.
2. Serializar mutaciones de hijos con finalizacion mediante lock del padre y agregar pruebas reales de dos conexiones.
3. Endurecer el check de artefactos finales contra strings vacios.
4. Hacer convergentes y verificables ACL, FKs, PKs, defaults, checks y secuencia de Bitacoras.
5. Reejecutar migracion doble, startup healthy, suite focal PostgreSQL y regresiones despues de las correcciones.

## Memory handoff

No se modifico `.opencode/memory/security-rbac-reviewer.json`: `_shared-discovery.md` restringe este rol a escritura bajo `docs/reviews/builds/`. Entrada propuesta para el orquestador/error-memory: fecha `2026-07-21`, scope `bitacoras-operacionales-fase1-persistencia-postgresql`, outcome `blocked`, findings `{BLOQUEANTE: 2, ALTO: 2, MEDIO: 2, BAJO: 0}`, CWE `[639, 862, 284, 367, 362, 667, 20, 345, 732, 693, 754, 703]`.
