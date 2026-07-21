# Revision final docs/tests: Bitacoras operacionales Fase 1

**Fecha:** 2026-07-21
**Alcance:** Persistencia PostgreSQL FT-OPE-49
**Resultado:** `blocked`
**Revisor:** `docs-tests-reviewer`

## 1. Veredicto

Las correcciones de TDD y persistencia cierran el bloqueo previo de cobertura. Se recolectan exactamente **24 casos**: 18 en `test_bitacoras_operacionales_persistencia.py` y 6 en `test_bitacoras_operacionales_postgres.py`. La evidencia comunicada de **24 passed en PostgreSQL 15**, **8 regresiones** y **30 startup** es coherente con los comandos, el catalogo y los archivos actuales.

La revision documental permanece **bloqueada** por fidelidad del MER global. `sync_docs.py` se ejecuto con `gestor_test_runtime`, pero `information_schema.tables` solo expone objetos visibles para ese rol. El documento resultante omite al menos una tabla canonica deliberadamente inaccesible al runtime, `configuracion_seguridad_runtime`, aunque el verificador de startup la exige. Por tanto, una base limpia y migrada no basta para afirmar que el MER generado por esa credencial es completo.

## 2. Cierres confirmados

- La frontera sigue limitada a persistencia. `docs/reviews/builds/2026-07-21_bitacoras-operacionales-fase1.md:41` excluye ERP, servicios, endpoints, RBAC funcional, archivos, firma, PDF y frontend.
- `testing/CATALOGO_PRUEBAS.md:48` registra las dos suites y **24 PASSED**; el conteo coincide con `pytest --collect-only`.
- La nueva suite PostgreSQL prueba doble migracion real, reparacion de default/FK, sabotaje de ACL, drift de tipo/nulabilidad, falta de fotografia, actor distinto, inmutabilidad de padre y todas las mutaciones de ambos hijos.
- La concurrencia real cubre ambos ordenes: finalizacion antes de insertar hijo y mutacion hija antes de finalizar.
- `sync_docs.py` ahora respeta `DB_HOST`, restringe el join de columnas a `public`, relanza excepciones y genera salida no cero ante conexion invalida.
- El bloque de Bitacoras contiene 39 columnas, PK/FK y las cuatro relaciones esperadas; defaults, nulabilidad y tipos base coinciden con `COLUMNAS_BITACORAS`.
- Los skips quedan justificados como casos exclusivos de `db-test/project_manager_test`.

## 3. Hallazgos

### HIGH 1 — El MER global sigue incompleto por visibilidad de la credencial runtime

El comando documentado usa `DB_USER=gestor_test_runtime` (`docs/reviews/builds/2026-07-21_bitacoras-operacionales-fase1.md:77-80`). `scripts/sync_docs.py:37-49` obtiene el inventario desde `information_schema.tables`; PostgreSQL limita esa vista a tablas que el usuario puede ver. La tabla `configuracion_seguridad_runtime` no aparece en `docs/ESQUEMA_BASE_DATOS.md`, pero es creada/protegida por las migraciones y es obligatoria para startup (`schema_verifier.py:343-375`). Precisamente debe carecer de acceso runtime.

La misma limitacion puede explicar otras eliminaciones del bloque anterior. El diff del esquema todavia presenta **2432 adiciones y 2404 eliminaciones**, incluyendo cambios reales ajenos al formato PK/FK y la desaparicion de tablas previamente documentadas. El build no conserva una reconciliacion objeto por objeto ni demuestra que cada eliminacion sea una baja canonica.

**Impacto:** no puede afirmarse que `docs/ESQUEMA_BASE_DATOS.md` sea el MER completo de una PostgreSQL totalmente migrada mientras su inventario dependa de la visibilidad parcial del rol runtime.

### MEDIUM 1 — Las cardinalidades Mermaid son genericas, no derivadas del contrato

`scripts/sync_docs.py:114-118` emite `||--o{` para toda FK sin consultar nulabilidad ni unicidad. En Bitacoras, `finalizado_por_id` es nullable (`docs/ESQUEMA_BASE_DATOS.md:2365`), pero la relacion se dibuja como obligatoria (`docs/ESQUEMA_BASE_DATOS.md:2206`). En otros modulos, una FK nullable o UNIQUE tambien recibe la misma cardinalidad 1:N.

El diagrama ya muestra relaciones, pero la afirmacion “genera ... cardinalidades Mermaid” del build debe matizarse como relaciones FK genericas o el script debe calcular cardinalidad desde nulabilidad y constraints UNIQUE.

### MEDIUM 2 — El diccionario omite longitudes y reglas fisicas detalladas

El contrato verificable distingue `VARCHAR(50)`, `VARCHAR(255)`, `VARCHAR(500)`, etc. (`bitacoras_operacionales_schema.py:14-62`), mientras el diccionario solo publica `character varying` (`docs/ESQUEMA_BASE_DATOS.md:2354-2377`). PK/FK ya estan presentes, pero longitudes, checks, uniques, indices y triggers dependen de la descripcion manual resumida y no quedan trazados objeto por objeto.

Esto no invalida las pruebas, pero impide calificar el diccionario auto-generado como reflejo fisico exhaustivo.

### LOW 1 — La evidencia RED mejoro, pero aun no conserva comandos exactos

El build identifica los resultados rojos y las causas (`2 failed, 1 passed` y `1 failed`) en `docs/reviews/builds/2026-07-21_bitacoras-operacionales-fase1.md:45-51`. Es trazabilidad util y no corresponde recrear el rojo. Sin embargo, “el comando focal concurrente” no incluye el comando literal ni los nodeids de los dos fallos. Debe conservarse esa limitacion historica o agregar el transcript original si existe.

## 4. Evidencia revisada

| Evidencia | Revision |
|---|---|
| Coleccion focal | **24 tests collected** por este revisor; no se ejecutaron suites. |
| PostgreSQL 15 | **24 passed / 3 warnings** comunicados y registrados. Conteo reconciliado. |
| Infraestructura + regresiones | **8 passed / 3 warnings** comunicados y registrados. |
| Startup/migrador | **30 passed / 2 warnings** comunicados y registrados. |
| Migracion | Doble ejecucion real automatizada y comando `migrate-test` repetido. |
| `sync_docs` error | Fallo esperado con `OperationalError` y codigo no cero registrado. |
| Alcance funcional | Sin afirmaciones de ERP/API/RBAC funcional para Fase 1. |

## 5. Ajustes documentales requeridos

1. Generar el inventario con una credencial de metadatos que pueda enumerar todas las tablas `public` —por ejemplo, el rol owner durante el job documental— o usar `pg_catalog` para el inventario completo sin conceder acceso runtime a tablas protegidas.
2. Verificar que `configuracion_seguridad_runtime` y todos los objetos canonicos reaparezcan; reconciliar y justificar las tablas eliminadas y los cambios ajenos a Bitacoras antes de aceptar el MER global.
3. Derivar la cardinalidad desde nulabilidad/UNIQUE o cambiar el texto del build de “cardinalidades” a “relaciones FK genericas”. Para `finalizado_por_id`, representar la participacion opcional.
4. Incluir `character_maximum_length` en el diccionario para tipos `character varying`.
5. Si existe, añadir al RED el comando literal y nodeids; si no, declarar que solo se conserva evidencia narrativa contemporanea.
6. Tras resolver el bloqueo y recibir las revisiones finales, cambiar `revision_en_curso` por la decision consolidada.

## 6. Decision final

- [ ] `approved`
- [ ] `approved_with_risks`
- [x] `blocked`

**Blocking reason:** el MER global generado con una credencial runtime de visibilidad parcial omite objetos canonicos y conserva deriva ajena sin reconciliar. La cobertura TDD/PostgreSQL de Bitacoras queda aprobada.
