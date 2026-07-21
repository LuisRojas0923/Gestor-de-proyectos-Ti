# Revision definitiva docs/tests: Bitacoras operacionales Fase 1

**Fecha:** 2026-07-21
**Alcance:** Persistencia PostgreSQL FT-OPE-49
**Resultado:** `approved_with_risks`
**Revisor:** `docs-tests-reviewer`

## 1. Veredicto

El bloqueo documental queda **cerrado**. El MER fue regenerado con el login migrador y `SET ROLE` al owner, sin ampliar privilegios del runtime. El documento actual incluye la tabla protegida `configuracion_seguridad_runtime`, las tres tablas de Bitacoras, sus PK/FK, longitudes y las cuatro relaciones con cardinalidad correcta para este alcance.

La Fase 1 se aprueba con riesgos menores de regresion del generador documental y una aclaracion de conteo para la suite UUID adicional. No quedan hallazgos altos ni bloqueantes.

## 2. Comprobaciones realizadas

### Script documental

- `scripts/sync_docs.py:25-27` valida `DB_ROLE` como identificador PostgreSQL.
- `scripts/sync_docs.py:39-40` compone `SET ROLE` mediante `psycopg2.sql.Identifier`; no concatena el rol en SQL crudo.
- El comando del build usa `gestor_test_migrator` y `DB_ROLE=gestor_test_owner` sobre `project_manager_test` (`docs/reviews/builds/2026-07-21_bitacoras-operacionales-fase1.md:91-94`).
- El inventario de columnas restringe ambos lados del join al schema `public`.
- PK/FK se consultan desde `pg_catalog`; las longitudes usan `character_maximum_length`.
- La excepcion se relanza, por lo que el host invalido produce codigo no cero.

### Fidelidad del MER

- `CONFIGURACION_SEGURIDAD_RUNTIME` reaparece en el diagrama y diccionario (`docs/ESQUEMA_BASE_DATOS.md:958-961,2421-2425`).
- Bitacoras declara 39 columnas con tipos y longitudes coherentes con el contrato fisico.
- `creado_por_id` es obligatorio: `USUARIOS ||--o{ BITACORAS_OPERACIONALES`.
- `finalizado_por_id` es opcional: `USUARIOS o|--o{ BITACORAS_OPERACIONALES`.
- Actividades y fotografias mantienen relacion 1:N no nullable con la bitacora.
- El diccionario publica, entre otros, `orden_trabajo character varying(50)`, `ciudad character varying(120)` y rutas `character varying(500)`.

### TDD y evidencia

- `pytest --collect-only` confirma **24 casos**: 18 de persistencia y 6 PostgreSQL avanzados.
- Evidencia comunicada y persistida: **24 passed / 3 warnings** en PostgreSQL 15, **8 passed** de infraestructura/regresiones y **30 passed** de startup/migrador.
- Los comandos RED literales y nodeids aparecen en `docs/reviews/builds/2026-07-21_bitacoras-operacionales-fase1.md:53-65`.
- La cobertura incluye doble migracion, constraint de formato, guard de `MIGRATION_DATABASE_URL`, drift, ACL, `OR TRUE`, dependencia `OWNED BY`, concurrencia e inmutabilidad completa.
- Los skips locales estan justificados por exigir `db-test/project_manager_test`.
- El alcance sigue sin afirmar ERP, API o RBAC funcional para Bitacoras.

## 3. Hallazgos no bloqueantes

### MEDIUM 1 — El generador documental carece de regresiones automatizadas propias

La salida actual y las verificaciones manuales demuestran el cierre, pero no existe una suite dedicada para `sync_docs.py` que cubra `DB_ROLE` invalido, composicion segura de `SET ROLE`, visibilidad owner, excepcion no cero, longitud `VARCHAR(n)` y cardinalidades nullable/unique. Un cambio futuro podria degradar nuevamente el MER sin que pytest lo detecte.

### LOW 1 — La regresion UUID adicional no esta reconciliada en el reporte de build

`testing/CATALOGO_PRUEBAS.md:48` incluye `test_bitacoras_schema_normalizacion.py` y dice “24 PASSED ... + regresion UUID focal”. El build lista y ejecuta solo las dos suites que suman 24; no incluye ese tercer archivo en “Archivos modificados” ni conserva su comando/resultado independiente. El caso existe y valida `public.gen_random_uuid()`, pero debe registrarse como **1 passed adicional** o excluirse de la misma fila de evidencia.

### LOW 2 — La deteccion de cardinalidad unica cubre indices de una sola columna

`scripts/sync_docs.py:76-82` deriva 1:1 solo cuando existe un indice UNIQUE no parcial de una columna. Es correcto para las cuatro relaciones de Bitacoras, pero una FK compuesta unica futura se dibujaria 1:N. Conviene documentar el limite o ampliar la consulta cuando aparezca ese contrato.

## 4. Ajustes documentales concretos

1. Actualizar el build de `revision_en_curso` a `aprobado_con_riesgos` y registrar esta revision definitiva.
2. Agregar al build el comando y resultado de `test_bitacoras_schema_normalizacion.py` —esperado `1 passed`— o retirar esa suite de la evidencia agregada del catalogo.
3. Crear posteriormente pruebas unitarias para `sync_docs.py`; no bloquean la Fase 1 actual.
4. Documentar que la cardinalidad UNIQUE automatica cubre actualmente claves simples.

## 5. Decision final

- [ ] `approved`
- [x] `approved_with_risks`
- [ ] `blocked`

**Blocking reasons:** ninguno.
**Riesgos residuales:** ausencia de tests propios del generador, evidencia UUID no reconciliada y limite futuro para FK UNIQUE compuesta.
