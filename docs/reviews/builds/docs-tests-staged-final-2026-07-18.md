# Revisión final docs/tests — índice staged

**Fecha:** 2026-07-18
**Alcance:** snapshot final staged de documentación, pruebas, almacenamiento de nómina, compose y arnés.
**Resultado:** `approved_with_risks`

## Confirmaciones

- El índice está cerrado: antes de crear este reporte no había delta unstaged ni uploads sin seguimiento.
- `testing/CATALOGO_PRUEBAS.md` registra `test_cooperativas_persistencia.py` con **3 PASSED**.
- `test_lineas_corporativas_facturas.py` contiene cuatro casos y el catálogo registra **4 PASSED**.
- Hay **11 adaptadores** Antigravity staged bajo `.agent/skills/*/SKILL.md`; el validador mantiene paridad dinámica con los agentes canónicos.
- `docs/GUIA_ALMACENAMIENTO_NOMINA.md` documenta rutas por entorno, backup conjunto PostgreSQL/volumen, restauración, retención, cuarentena de huérfanos, limpieza y controles operativos. `docs/GUIA_MANTENIMIENTO.md` enlaza la guía.
- `docker-compose.prod.yml` monta `./GestionTi_SoporteFiles/nomina:/app/uploads/nomina` y `docker-compose.Pruebas3.yml` monta `./GestionTi_SoporteFiles_Pruebas3/nomina:/app/uploads/nomina`.
- `.gitignore` excluye `backend_v2/uploads/nomina/`, `/uploads/nomina/` y el volumen productivo mediante `GestionTi_SoporteFiles/`.
- `git diff --cached --check` finaliza sin diagnósticos.
- El ajuste de `ActividadCrear`/`ActividadActualizar` es de contrato Pydantic; `archivo_url` continúa como campo de lectura y columna ya existente. No hay DDL/MER nuevo que obligue a modificar `docs/ESQUEMA_BASE_DATOS.md`.
- Los cambios del arnés están reflejados en ADR-006, ADR-007, AGENTS, CLAUDE y la guía Antigravity.

## Evidencia final comunicada por el orquestador

El revisor no reejecutó suites, builds, hooks ni `docker compose` por las restricciones del rol. Se registra la evidencia ejecutada sobre el snapshot final:

| Verificación | Resultado comunicado |
|---|---|
| Backend focal | **78 passed** |
| Frontend focal | **PASS** tras rerun de `Select` |
| TypeScript (`tsc`) | **PASS** |
| ESLint | **PASS** |
| Build frontend | **PASS** |
| Pytest del arnés Antigravity | **22 passed** |
| Validador del arnés | **PASS**, 11 adaptadores |
| Pre-commit | **PASS** |
| `docker compose ... config` prod/Pruebas3 | No completó por variables secretas obligatorias ausentes; el fallo reportado es de interpolación/configuración ambiental, no de sintaxis YAML/Compose |

Los reportes `docs-tests-merge-activo-2026-07-18.md` y `frontend-merge-activo-completo-2026-07-18.md` conservan el estado histórico anterior al cierre del índice. Este reporte documenta la revisión del snapshot staged final y su evidencia posterior.

## Hallazgos reales y riesgos residuales

### Cerrado — exclusión del bind mount de Pruebas3

`GestionTi_SoporteFiles_Pruebas3/nomina` es la ruta host versionada en el compose de Pruebas3. La exclusión exacta `GestionTi_SoporteFiles_Pruebas3/` quedó añadida a `.gitignore` antes del cierre.

### Medio — advisory locks sin aceptación PostgreSQL real

Los tres casos de cooperativas y los cuatro de facturas comprueban filesystem, metadata, normalización, orden de SQL y presencia de `pg_advisory_xact_lock` mediante dobles. No ejecutan dos sesiones PostgreSQL reales ni demuestran serialización, rollback y estado final idempotente de detalle/resumen. El catálogo de facturas describe un alcance más fuerte que el demostrado por esos cuatro tests unitarios.

### Medio — falta cobertura HTTP de rate limit 429

No se encontró un caso focal que consuma el límite de carga WBS, Beneficiar o Grancoop hasta observar `429`, `Retry-After`, aislamiento de bucket y reset determinista. La evidencia verde evita regresiones observadas, pero no cierra el contrato del limiter multiworker/Redis.

### Bajo — trazabilidad histórica del arnés

`antigravity-agent-harness-2026-07-17.md` conserva correctamente su ejecución histórica de nueve adaptadores, pero ya no representa el roster final de once. La evidencia vigente queda reconciliada en el catálogo y en este reporte; no debe usarse el conteo histórico como gate actual.

## Pruebas requeridas de seguimiento

1. Carreras reales con dos `AsyncSession` PostgreSQL para cooperativas y facturas, incluyendo error/rollback, reintento y estado final único.
2. Pruebas endpoint-level de reimportación idempotente de facturas y persistencia/reconciliación de archivos cooperativos ante fallo DB.
3. Casos HTTP `429` para WBS, Beneficiar y Grancoop con `Retry-After`, actor/IP, buckets separados y reset determinista.

## Documentación/configuración requerida de seguimiento

1. Al añadir las pruebas PostgreSQL/429, actualizar sus estados y alcance exacto en `testing/CATALOGO_PRUEBAS.md`.
2. Conservar comandos completos o logs sanitizados junto a la evidencia final si este snapshot se promueve a release.

## Razones de bloqueo

Ninguna para docs/tests del índice staged actual. Los gaps PostgreSQL y 429 son riesgos residuales explícitos; no invalidan los 78 casos backend, el frontend final, el arnés ni los checks estáticos reportados. El fallo de `docker compose config` es ambiental por secretos obligatorios ausentes, no evidencia de una sintaxis inválida.

## Decisión

**Docs/tests review: approved_with_risks.**
