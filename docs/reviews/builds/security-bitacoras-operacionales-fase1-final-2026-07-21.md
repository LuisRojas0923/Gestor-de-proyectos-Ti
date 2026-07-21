# Security/RBAC review: approved_with_risks

**Fecha:** 2026-07-21
**Alcance:** segunda revision de la Fase 1 de persistencia PostgreSQL para Bitacoras Operacionales FT-OPE-49. Incluye modelos, migracion, manager de privilegios, verificador read-only, helper de contrato fisico y pruebas PostgreSQL. No hay endpoints funcionales; el RBAC del modulo permanece correctamente diferido.

**Evidencia fresca recibida (no reejecutada por este revisor):** 24 focales sobre PostgreSQL 15, 8 regresiones, 30 pruebas de startup/migracion y backend aislado `healthy` con rol runtime restringido.

## Checklist results

- Auth en endpoints: N/A — no existen rutas funcionales en esta fase
- Schemas sin dict: ✅
- PK con Field(pattern): N/A — las PK nuevas son UUID/BIGINT
- PUT/PATCH exclude_unset: N/A — no hay handlers ni servicio PATCH
- No str(e) en 500: ✅
- Secrets guard: N/A
- No print(): ✅
- PII redacted: ✅

## Cierre de hallazgos anteriores

### B-01 — Cerrado — Propietario inmutable

`proteger_bitacora_operacional_inmutable()` rechaza `NEW.creado_por_id IS DISTINCT FROM OLD.creado_por_id` antes de permitir cualquier actualizacion del borrador (`bitacoras_operacionales_migration.py:8-22`). La prueba PostgreSQL intenta transferir un borrador usando runtime y exige error (`test_bitacoras_operacionales_postgres.py:184-236`). La igualdad finalizador/creador permanece en el check de estado.

### B-02 — Cerrado — Serializacion entre finalizacion y mutaciones hijas

Toda mutacion de actividades o fotografias toma `FOR UPDATE` sobre el padre y comprueba su estado despues de adquirir el lock (`bitacoras_operacionales_migration.py:24-51`). El cambio de `bitacora_id` queda prohibido, por lo que cada operacion bloquea un solo padre y no introduce el orden ambiguo de dos locks.

Las pruebas cubren los dos ordenes relevantes con conexiones fisicas independientes:

- finalizacion primero: el `INSERT` hijo espera y luego falla al observar `FINALIZADA` (`test_bitacoras_operacionales_persistencia.py:404-433`);
- mutacion hija primero: el finalizador espera, ve que se elimino la ultima foto y revierte, conservando `BORRADOR` (`test_bitacoras_operacionales_persistencia.py:436-469`).

No se encontro un bypass runtime residual mediante `INSERT`, `UPDATE`, `DELETE`, cambio de padre o reordenamiento de commits. Un deadlock eventual en operaciones masivas sobre varios padres produciria rollback de una transaccion por PostgreSQL, no corrupcion del invariante.

### A-01 — Cerrado — Metadatos finales no vacios

La rama `FINALIZADA` exige contenido tras `btrim` para firma, PDF, firmante y version de constancia, ademas de hashes SHA-256 validos y campos no nulos (`modelos.py:62-77`; migracion `:162-163`). Existe regresion con cadenas vacias y whitespace (`test_bitacoras_operacionales_persistencia.py:472-497`).

### A-02 — Cerrado — ACL exacta y sin bypass por TRUNCATE

El job revoca todo privilegio de `PUBLIC` y runtime sobre las tres tablas y la secuencia, y reconcede exclusivamente CRUD de tablas y `USAGE, SELECT` de secuencia (`manager.py:141-162`). El helper compara owner, grantees, privilegios efectivos de ACL y grant option; cualquier rol ajeno o privilegio extra hace fallar startup (`bitacoras_operacionales_schema.py:164-197`).

La prueba introduce `TRUNCATE` runtime, `SELECT` a `PUBLIC` y `UPDATE` de secuencia, comprueba fallo cerrado y luego reparacion (`test_bitacoras_operacionales_postgres.py:152-181`). Runtime sigue sin DDL, membresias, bypass RLS ni pertenencia al owner. No se observo via residual para desactivar triggers, usar `TRUNCATE` o auto-concederse privilegios.

### M-01 — Cerrado — FKs, defaults y contrato fisico

La migracion instala UUID de servidor, reafirma defaults y recrea cuatro FKs nombradas con `ON DELETE RESTRICT` (`bitacoras_operacionales_migration.py:140-180`). El helper compara exactamente las 39 columnas esperadas —tipo, longitud, nulabilidad y default—, exige el conjunto de PK/FK/CHECK/UNIQUE/constraint trigger y valida owner/ACL de objetos (`bitacoras_operacionales_schema.py:14-197`).

Las pruebas aplican la migracion dos veces y sabotean defaults, FK, checks, indices, trigger, funcion, tipo y nulabilidad, verificando fallo cerrado y reparacion/restauracion (`test_bitacoras_operacionales_postgres.py:119-181,268-315`).

### M-02 — Cerrado — Cobertura focal

La matriz actual agrega concurrencia en ambos ordenes, propiedad, defaults UUID, actor finalizador, ausencia de foto, mutaciones completas de padre/hijos, checks de hijos, ACL y sabotaje/reparacion estructural. La evidencia combinada aumento de 14 a 24 casos focales PostgreSQL y se acompana de 8 regresiones, 30 pruebas de startup y backend healthy.

## Riesgos residuales

### MEDIO R-01 — El verifier acepta checks semanticamente debilitados que conserven fragmentos

**Referencias:** `backend_v2/app/core/migrations/bitacoras_operacionales_schema.py:65-113,144-162`; `backend_v2/app/core/migrations/schema_verifier.py:81-95`.

El helper exige nombres, tabla, validacion y conjunto exacto de constraints, pero para la definicion usa presencia de fragmentos. Un owner podria reemplazar, por ejemplo, un check por la expresion original seguida de `OR TRUE`; todos los fragmentos esperados seguirian presentes y startup podria aceptarlo. Las pruebas cubren ausencia y alteraciones evidentes, pero no una debilitacion que preserve tokens.

Esto no es un bypass disponible para runtime: runtime no tiene DDL, membresia del owner, grant option ni `BYPASSRLS`, y ejecutar `migrate` reinstala las definiciones correctas. El riesgo es de deteccion incompleta ante drift privilegiado o una migracion defectuosa. **CWE-693, CWE-754.**

**Accion recomendada:** comparar la forma canonica completa de `pg_get_constraintdef`/`pg_get_expr(c.conbin, ...)` para los checks de seguridad y agregar una prueba que sustituya temporalmente un check por `(<regla>) OR TRUE`.

### BAJO R-02 — La secuencia se verifica por nombre/owner/ACL/default, no por configuracion interna

**Referencias:** `backend_v2/app/core/migrations/bitacoras_operacionales_schema.py:42-45,164-197`.

El contrato comprueba que el default de actividad usa la secuencia esperada y que el objeto tiene owner/ACL exactos, pero no valida explicitamente `relkind`, dependencia `OWNED BY`, incremento, ciclo o limites en `pg_sequence`. Una alteracion privilegiada de `MAXVALUE`, `CYCLE` o dependencia podria pasar startup y causar colisiones bloqueadas por la PK o indisponibilidad al agotar la secuencia. No permite omitir PK/FK ni modificar datos finalizados con runtime. **CWE-400, CWE-754.**

**Accion recomendada:** verificar `relkind='S'`, `pg_get_serial_sequence`, dependencia con `id` y parametros seguros de `pg_sequence` cuando se endurezca el contrato operacional.

### BAJO R-03 — Constantes documentales y marcas temporales dependen del servicio futuro

`codigo_formato` y `version_formato` son `NOT NULL`, pero la base aun admite strings vacios; `finalizado_en` tampoco se liga por constraint al reloj del servidor. No hay endpoint que permita explotar esto y los schemas actuales no aceptan esos campos del cliente, pero la fase funcional debera derivar codigo/fecha/version, firmante y hora exclusivamente en servidor y probarlos antes de exponer el modulo.

Este riesgo no reabre A-01: las rutas y metadatos necesarios para representar un artefacto final ya rechazan vacios. Es seguimiento de integridad documental para el servicio/PDF futuro. **CWE-20, CWE-345.**

## Controles confirmados

- Startup web es read-only y falla cerrado; DDL/ACL solo se ejecutan mediante `app.manage migrate` bajo el owner NOLOGIN.
- Funciones trigger en `public`, `SECURITY INVOKER`, cuerpo/firma/owner/ACL exactos y sin `EXECUTE` de `PUBLIC` o runtime.
- Triggers habilitados con tipo, tabla y funcion esperados; constraint trigger de completitud diferido.
- Inmutabilidad secuencial y concurrente de documentos finalizados preservada.
- Hashes SHA-256, dimensiones, ordenes, rutas unicas, novedades y snapshots ERP protegidos por constraints.
- FKs nombradas `ON DELETE RESTRICT`, PKs y defaults UUID/timestamps verificados.
- ACL exacta impide `PUBLIC`, `TRUNCATE`, `TRIGGER`, `REFERENCES`, `UPDATE` de secuencia y grant options no autorizados.
- La fecha futura se calcula explicitamente en `America/Bogota`.

## RBAC/config impact

No corresponde registrar aun `bitacoras_operacionales.leer` ni `bitacoras_operacionales.gestionar` en `rbac_manifest.py`: no existen rutas funcionales. Antes de exponer endpoints, backend debera derivar `creado_por_id` del usuario autenticado, filtrar siempre por propietario y aplicar ambos permisos segun el contrato; la UI nunca sustituira esas comprobaciones.

La separacion de roles PostgreSQL, defaults y configuracion del job/runtime es consistente con ADR-010.

## Blocking reasons

Ninguno. Los seis hallazgos de la revision inicial quedaron cerrados. Los riesgos residuales requieren DDL privilegiado o pertenecen a la fase funcional futura; no ofrecen un bypass con la credencial runtime actual.

**Severity maxima residual:** MEDIO
**Conteo residual:** BLOQUEANTE 0, ALTO 0, MEDIO 1, BAJO 2.
**Verdict:** **approved_with_risks**.

## Acciones de seguimiento

1. Endurecer la comparacion semantica completa de checks y probar `OR TRUE`.
2. Verificar configuracion/dependencia interna de la secuencia BIGSERIAL.
3. En la fase funcional, derivar en servidor constantes del formato, firmante, propietario y timestamps; registrar RBAC antes de crear rutas.
4. Mantener las pruebas concurrentes, de ACL y sabotaje como gates PostgreSQL obligatorios.

## Memory handoff

No se modifico `.opencode/memory/security-rbac-reviewer.json`: `_shared-discovery.md` restringe este rol a escritura bajo `docs/reviews/builds/`. Entrada propuesta para el orquestador/error-memory: fecha `2026-07-21`, scope `bitacoras-operacionales-fase1-persistencia-final`, outcome `approved_with_risks`, findings `{BLOQUEANTE: 0, ALTO: 0, MEDIO: 1, BAJO: 2}`, CWE `[693, 754, 400, 20, 345]`.
