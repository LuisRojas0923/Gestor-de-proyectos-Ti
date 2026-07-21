# Revision docs/tests: Bitacoras operacionales Fase 1

**Fecha:** 2026-07-21
**Alcance:** Persistencia PostgreSQL FT-OPE-49
**Resultado:** `blocked`
**Revisor:** `docs-tests-reviewer`

## 1. Veredicto

La delimitacion funcional es correcta: el build restringe la Fase 1 a persistencia y declara expresamente fuera de alcance ERP, servicios, endpoints, RBAC funcional, archivos, firma, PDF y frontend (`docs/reviews/builds/2026-07-21_bitacoras-operacionales-fase1.md:25-36`). `docs/ESQUEMA_BASE_DATOS.md:43-61` mantiene la misma frontera. No se encontro una afirmacion de que `Aperturas OT V4`, la API o los permisos del modulo ya funcionen.

La revision queda **bloqueada**, no por esas fronteras, sino por dos condiciones de cierre: el bloque auto-generado del esquema contiene deriva masiva ajena a Bitacoras y no constituye un MER relacional fiel; ademas, la cobertura PostgreSQL real no demuestra todas las garantias de inmutabilidad que el catalogo y el build dan por cubiertas.

## 2. Evidencia revisada

| Evidencia | Resultado de revision |
|---|---|
| Coleccion focal | `python -m pytest --collect-only testing/backend/test_bitacoras_operacionales_persistencia.py -q`: **14 tests collected**. Solo se recolecto; este revisor no ejecuto suites ni builds. |
| Local | Se conserva evidencia comunicada de **11 passed / 3 skipped**. Los tres skips corresponden a los casos que exigen `db-test/project_manager_test` (`test_bitacoras_operacionales_persistencia.py:199-202,211-319`), aunque el reporte de build no explicita esa justificacion. |
| PostgreSQL 15 | Se conserva evidencia comunicada de **14 passed**. Los tres casos reales validan finalizacion con una actividad/foto, rechazo por actividad ausente y fecha futura Bogota. |
| Regresiones | Se conserva evidencia comunicada de **8 passed** para infraestructura + regresiones. No implica ERP/API/RBAC de Bitacoras; son health checks generales. |
| Startup | `backend healthy` es evidencia positiva del verificador contra el esquema presente, no una prueba de fallo cerrado al retirar cada objeto critico. |
| Migracion repetida | El build registra ejecucion repetida exitosa. Es evidencia manual util, pero no existe un test PostgreSQL automatizado que aplique dos veces la migracion sobre el mismo estado. |
| `sync_docs` | El build registra exito contra `db-test`; el documento contiene las tres tablas nuevas. Sin embargo, el diff auto-generado tambien modifica centenares de lineas de modulos ajenos. |

## 3. Hallazgos

### HIGH 1 — El esquema auto-generado no es un delta fiel y aislado de Fase 1

`docs/ESQUEMA_BASE_DATOS.md` presenta **387 adiciones y 431 eliminaciones**. Ademas de las tres tablas esperadas, el bloque generado elimina o cambia tablas, nulabilidad, tipos y defaults de modulos no relacionados; entre los ejemplos visibles en el diff estan `configuracion_seguridad_runtime`, `herramientas_informaticas`, `inventario_asignacion_personal` y `requisiciones_personal`, asi como defaults convertidos a timestamps literales en tablas de Nomina.

La causa documental es que `scripts/sync_docs.py:37-49` lee todas las tablas de la base indicada y `scripts/sync_docs.py:91-100` reemplaza por completo la seccion. No existe una barrera que demuestre que `db-test` representa el baseline canonico completo antes de publicar cambios de otros modulos. Adicionalmente, el `JOIN information_schema.columns c ON t.table_name = c.table_name` no restringe `c.table_schema = 'public'`, por lo que una tabla homonima en otro schema podria mezclar columnas.

**Impacto:** no se puede aprobar `docs/ESQUEMA_BASE_DATOS.md` como reflejo fiel de la base canonica ni mezclar ese bloque en un cambio acotado a Bitacoras.

### HIGH 2 — La cobertura PostgreSQL real no respalda “inmutabilidad de padres e hijos” completa

`testing/CATALOGO_PRUEBAS.md:48` afirma inmutabilidad de padres e hijos. El unico caso real positivo de inmutabilidad (`test_bitacoras_operacionales_persistencia.py:211-265`) intenta modificar una actividad despues de finalizar. No prueba directamente:

- `UPDATE` y `DELETE` del padre finalizado;
- `INSERT`, `UPDATE` o `DELETE` de fotografias bajo padre finalizado;
- `INSERT` o `DELETE` de actividades bajo padre finalizado;
- rechazo de finalizacion cuando existe actividad pero falta fotografia;
- igualdad obligatoria `finalizado_por_id = creado_por_id` en PostgreSQL real.

El test estatico de nombres de triggers y el backend saludable no sustituyen la ejecucion de esas ramas. Para una fase cuyo alcance es precisamente integridad persistente, la descripcion del catalogo sobrestima la evidencia disponible.

### MEDIUM 1 — La evidencia RED no es auditable

El build registra “10 fallos iniciales” y dos descubrimientos posteriores (`docs/reviews/builds/2026-07-21_bitacoras-operacionales-fase1.md:38-45`), pero no conserva comando exacto, resumen pytest, nodeids ni fragmento de salida. Esto permite reconocer una narrativa RED, pero no comprobar el orden prueba roja → implementacion → verde exigido por `skill_testing_mandate` y por el propio plan (`docs/reviews/plans/2026-07-21_bitacoras-operacionales-web.md:301`). No debe fabricarse un rojo retroactivo.

### MEDIUM 2 — La prueba automatizada llamada “repetible” no prueba idempotencia contra PostgreSQL

`test_migracion_declara_objetos_criticos_y_es_repetible` (`test_bitacoras_operacionales_persistencia.py:97-120`) usa un grabador que acepta cualquier sentencia y solo verifica que la segunda llamada duplique el numero de sentencias emitidas. Esto valida determinismo textual, no convergencia ni ausencia de errores al reaplicar DDL sobre objetos existentes. La ejecucion repetida comunicada mitiga el riesgo para este build, pero debe convertirse en regresion PostgreSQL automatizada.

### MEDIUM 3 — `sync_docs.py` no puede certificar por si solo un PASS y no genera relaciones MER

`scripts/sync_docs.py:106-107` captura cualquier excepcion, imprime el error y termina normalmente; por tanto, un codigo de salida exitoso no demuestra sincronizacion. La evidencia de este build dice haber observado el mensaje de exito, pero futuros gates pueden producir falsos verdes.

Ademas, `scripts/sync_docs.py:63-69` genera entidades y columnas, pero no consulta ni representa PK, FK, cardinalidades, UNIQUE, CHECK, indices o triggers. En particular, el Mermaid auto-generado no dibuja las relaciones de `bitacoras_operacionales` con `usuarios`, actividades y fotografias. La seccion manual resume parte de esas reglas, pero el artefacto titulado “Diagrama Entidad-Relacion Dinamico” no es un MER relacional fiel y omite longitudes `VARCHAR`.

### LOW 1 — Los tres skips locales deben quedar justificados junto al conteo

El motivo se deduce del guard de `db-test`, pero `docs/reviews/builds/2026-07-21_bitacoras-operacionales-fase1.md:48-51` solo registra `11 passed, 3 skipped`. Debe indicar expresamente que son los tres casos PostgreSQL y enlazar su ejecucion verde en PostgreSQL 15.

## 4. Trazabilidad y fidelidad confirmadas

- Las tres tablas, sus columnas principales, tipos PostgreSQL, defaults de `estado/version/sin_novedad` y timestamps aparecen en el diccionario auto-generado.
- El esquema y el plan mantienen multiples bitacoras por OT/fecha, UUID del documento/foto, BIGSERIAL de actividades, ordenes diferibles e indices no unicos.
- ADR-010 cubre la decision durable de ejecutar DDL mediante el job migrador y dejar startup en modo verify-only; no se requiere un ADR nuevo solo para esta fase.
- No hubo cambios en `.agents/skills/` ni `.opencode/agent/`; ADR-006 no requiere actualizacion.
- El reporte de build satisface la necesidad de contexto durable; una bitacora adicional es opcional para este corte.

## 5. Pruebas requeridas

1. Agregar casos PostgreSQL 15 reales para mutacion/eliminacion del padre finalizado y mutaciones de ambos tipos de hijo.
2. Agregar el caso diferido “actividad presente, fotografia ausente” y un caso de actor finalizador distinto al propietario.
3. Aplicar dos veces `migrar_bitacoras_operacionales` sobre la misma base real dentro de un test automatizado y verificar objetos, datos y conteos sin deriva.
4. Probar fallo cerrado del verificador al retirar o alterar, al menos de forma parametrizada, cada constraint, trigger, funcion e indice critico de Bitacoras.
5. Conservar en el reporte el comando/salida RED original disponible; si no existe, marcar la limitacion historica sin recrearla.

## 6. Documentacion requerida

1. Regenerar `docs/ESQUEMA_BASE_DATOS.md` desde una PostgreSQL 15 limpia, completamente migrada y demostrablemente equivalente al baseline canonico; revisar y justificar cualquier cambio ajeno a Bitacoras antes de aceptar el diff.
2. Incorporar al MER relaciones PK/FK y cardinalidades de las tres tablas, o renombrar el bloque auto-generado como inventario de columnas y mantener un MER relacional separado.
3. Hacer que `sync_docs.py` falle con codigo no cero ante error, filtre ambas partes del join por schema y evite publicar remociones/deriva no esperadas.
4. Ajustar temporalmente el catalogo a la cobertura real o ampliarla antes de conservar la frase “inmutabilidad de padres e hijos”.
5. Reconciliar el reporte final con comandos, entorno, salidas y justificacion de skips; actualizar su estado `revision_en_curso` despues de resolver los bloqueos.

## 7. Decision final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos`
- [x] `bloqueado`

**Blocking reasons:** MER auto-generado con deriva ajena y sin relaciones; cobertura PostgreSQL real insuficiente para las garantias de inmutabilidad declaradas.
