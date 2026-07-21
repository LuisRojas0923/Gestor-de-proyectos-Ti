# Revisión backend — Bitácoras Operacionales Fase 1

**Fecha:** 2026-07-21
**Build:** Persistencia PostgreSQL de Bitácoras Operacionales FT-OPE-49
**Autor del build:** OpenCode
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti
**Revisor:** backend-reviewer
**Veredicto:** `blocked`

---

## 1. Archivos revisados

- `backend_v2/app/models/bitacoras_operacionales/modelos.py`
- `backend_v2/app/models/bitacoras_operacionales/schemas.py`
- `backend_v2/app/models/bitacoras_operacionales/__init__.py`
- `backend_v2/app/core/migrations/bitacoras_operacionales_migration.py`
- `backend_v2/app/core/migrations/manager.py`
- `backend_v2/app/core/migrations/schema_verifier.py`
- `backend_v2/app/models/registry.py`
- `testing/backend/test_bitacoras_operacionales_persistencia.py`
- Secciones relacionadas de `docs/ESQUEMA_BASE_DATOS.md`, `testing/CATALOGO_PRUEBAS.md`, la especificación y el plan técnico.

Quedaron expresamente fuera de revisión e implementación API, ERP, almacenamiento físico, firma, PDF, frontend y RBAC funcional.

## 2. Resultado general

La base es consistente con PostgreSQL y con la separación de migrador/runtime: modelos registrados antes de `create_all`, DDL posterior dentro de `async_engine.begin()`, funciones y triggers PL/pgSQL, tipos `UUID`/`TIMESTAMPTZ`, constraints diferibles y fallos DDL propagados. No se introdujo acceso síncrono a PostgreSQL ni lógica funcional fuera del alcance. Los archivos revisados permanecen por debajo de 550 líneas.

El build no puede aprobarse todavía porque la inmutabilidad de hijos presenta una carrera real entre la finalización y una mutación concurrente, y el blindaje/verificador no cubre todo el contrato físico que declara proteger.

## 3. Hallazgos bloqueantes

### ALTA — La inmutabilidad de hijos se puede violar por concurrencia

**Referencias:** `backend_v2/app/core/migrations/bitacoras_operacionales_migration.py:20-47`, `:50-69`, `:175-177`; cobertura actual en `testing/backend/test_bitacoras_operacionales_persistencia.py:211-265`.

El trigger de hijos consulta el estado del padre mediante un `SELECT` ordinario. No toma un lock sobre la fila padre. En `READ COMMITTED` es posible este intercalado:

1. T1 cambia el padre de `BORRADOR` a `FINALIZADA` y conserva el lock de la fila sin confirmar.
2. T2 elimina, actualiza o inserta un hijo; su trigger todavía observa la versión confirmada `BORRADOR` y permite la operación.
3. El constraint trigger diferido de T1 todavía puede observar el hijo no confirmado de T2 o los hijos previos y aprobar la finalización.
4. T1 confirma y luego T2 confirma, dejando hijos alterados o eliminados después de que el documento quedó finalizado.

La prueba PostgreSQL existente solo modifica un hijo secuencialmente después de hacer visible la finalización en la misma sesión; no cubre dos transacciones físicas ni los dos órdenes de commit.

**Acción requerida:** serializar finalización y mutaciones de hijos mediante locks de la fila padre. Para cambios de `bitacora_id`, bloquear ambos padres en orden determinista para evitar deadlocks. Añadir pruebas PostgreSQL con dos `AsyncSession`/conexiones independientes para `INSERT`, `UPDATE` y `DELETE` de actividades y fotografías concurrentes con la finalización, verificando que como máximo una operación confirme y que la invariancia final se conserve.

### ALTA — El blindaje y el verificador runtime permiten drift físico crítico

**Referencias:** `backend_v2/app/core/migrations/bitacoras_operacionales_migration.py:92-139`, `backend_v2/app/core/migrations/schema_verifier.py:9-35`, `:171-188`, `:294-300`; cobertura actual en `testing/backend/test_bitacoras_operacionales_persistencia.py:138-184`.

`CREATE TABLE IF NOT EXISTS` no converge una tabla parcial o alterada. La migración solo repara explícitamente los defaults de `version` y `sin_novedad`; no repara ni valida tipos, nulabilidad, longitudes, FKs, acciones `ON DELETE`, secuencia, ni los defaults de `estado` y timestamps.

El verificador general compara únicamente nombres de columnas (`columnas <= columnas_rows`). Para Bitácoras solo exige tres constraints: estado/artefactos y los dos órdenes únicos. No comprueba los checks de estado, versión, snapshots, novedades, hashes, órdenes/dimensiones, ruta única, FKs ni sus acciones. Por ello el runtime puede declararse saludable con un `TIMESTAMP` sin zona, un default ausente o una FK/constraint crítica retirada.

**Acción requerida:** hacer convergente el DDL crítico o fallar explícitamente ante drift no reparable, y ampliar el verificador con catálogos PostgreSQL para tipos/longitudes, nulabilidad, defaults, FKs/acciones, secuencia y todos los constraints de las tres tablas. Añadir pruebas de sabotaje sobre cada clase de objeto, no solo sobre el cuerpo de una función.

## 4. Hallazgos no bloqueantes

### MEDIA — `creado_por_id` no es inmutable durante el borrador

**Referencias:** contrato en `docs/reviews/plans/2026-07-21_bitacoras-operacionales-web.md:93`; implementación en `backend_v2/app/core/migrations/bitacoras_operacionales_migration.py:8-18` y `backend_v2/app/models/bitacoras_operacionales/modelos.py:56-69,102-115`.

El trigger padre solo rechaza `DELETE` o un `UPDATE` cuyo estado anterior ya era `FINALIZADA`. En borrador se puede cambiar `creado_por_id`; incluso se pueden cambiar creador y finalizador en la misma sentencia de finalización y satisfacer el CHECK de igualdad. Los schemas reducen la exposición futura, pero no cumplen por sí solos la regla persistente de propietario inmutable.

**Acción requerida:** rechazar en PostgreSQL cualquier cambio de `creado_por_id` y probar tanto la transferencia de un borrador como el cambio simultáneo al finalizar.

### MEDIA — La suite focal no demuestra toda la matriz de persistencia prometida

**Referencias:** `testing/backend/test_bitacoras_operacionales_persistencia.py:97-120`, `:138-184`, `:211-319`; obligación del plan en `docs/reviews/plans/2026-07-21_bitacoras-operacionales-web.md:221`.

La “repetición” automatizada usa una conexión recolectora que siempre acepta texto; no ejecuta dos migraciones reales. En PostgreSQL solo se cubren finalización completa, falta de actividad, fecha futura y un `UPDATE` secuencial de actividad. Faltan aserciones directas de defaults, falta de fotografía, hashes, positivos, órdenes/rutas únicas, FKs, inmutabilidad del padre, fotografías y operaciones `INSERT`/`DELETE`, commit/rollback real y sabotaje fail-closed del verificador para cada objeto crítico.

La evidencia manual informada —14 focales, 8 regresiones, backend healthy y migración repetida— es valiosa, pero no sustituye estas regresiones automatizadas.

**Acción requerida:** ampliar la suite focal PostgreSQL y registrar una prueba automática de segunda ejecución sobre el mismo esquema.

## 5. Validaciones satisfactorias

- Arquitectura async: todas las operaciones nuevas usan `await conn.execute(...)` dentro de conexiones/transacciones async.
- Orden de despliegue canónico: `app.manage` carga el registry antes de `SQLModel.metadata.create_all()` y luego ejecuta la migración especializada (`manage.py:61-65`; `manager.py:161-164,291-293`).
- Transacciones: la fase especializada usa `async_engine.begin()` y propaga fallos; no silencia DDL.
- PostgreSQL: no se encontró SQL de SQLite/MySQL; se usan UUID, `TIMESTAMPTZ`, PL/pgSQL, regex PostgreSQL y constraints diferibles.
- Modelos/schemas: tipos concretos, `extra="forbid"`, límites de texto y fecha Bogotá; no existe `datos: dict` ni superficie PATCH de campos controlados por servidor.
- Cardinalidad: no se impone unicidad OT/fecha, conforme al contrato.
- Defaults frescos: `estado`, `version`, `sin_novedad` y timestamps sí tienen defaults PostgreSQL en creación normal; el riesgo es su convergencia/verificación ante drift.
- Documentación: la sección específica de `docs/ESQUEMA_BASE_DATOS.md` y el catálogo de pruebas incluyen Fase 1.
- Alcance: es correcto no registrar todavía RBAC funcional al no existir rutas ni funcionalidad habilitada.

## 6. Tests y evidencia

- Ejecutado por este revisor: `python -m pytest --collect-only testing/backend/test_bitacoras_operacionales_persistencia.py -q` — **14 tests collected**.
- Evidencia suministrada y documentada por el build: **14 passed** en PostgreSQL 15 aislado; **8 regresiones passed**; backend `healthy`; migración repetida sin error.
- El revisor no reejecutó Docker/pytest funcional porque el rol `backend-reviewer` no autoriza `docker compose` ni ejecución de tests, salvo `--collect-only`.

## 7. Documentación y RBAC

- [x] Sección de Bitácoras Fase 1 en `docs/ESQUEMA_BASE_DATOS.md`.
- [x] Suite registrada en `testing/CATALOGO_PRUEBAS.md`.
- [x] Sin API/ERP/archivos/PDF/frontend/RBAC funcional en esta fase.
- [ ] En una fase funcional posterior, registrar los permisos exactos acordados y proteger backend; no anticiparlo en este build de persistencia.

## 8. Decisión final

- [ ] `approved`
- [ ] `approved_with_risks`
- [x] `blocked`

## 9. Seguimiento obligatorio

| Acción | Responsable | Prioridad |
|---|---|---|
| Serializar mutaciones de hijos contra finalización y agregar pruebas concurrentes reales | Backend | Bloqueante |
| Completar convergencia/verificación de tipos, defaults, FKs y constraints | Backend | Bloqueante |
| Blindar `creado_por_id` como inmutable | Backend | Alta |
| Automatizar migración real repetida y matriz de constraints/defaults/rollback | Backend/Testing | Alta |
| Reejecutar 14 focales, regresiones y startup healthy en PostgreSQL 15 aislado | Orquestador | Tras correcciones |
