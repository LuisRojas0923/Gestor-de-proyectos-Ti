# Revisión frontend — horas por concepto en cálculos de planilla

**Fecha:** 2026-07-22  
**Build:** Resumen filtrable «Horas por concepto»  
**Modo:** build / code review

## Archivos revisados

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/CalculoListView.tsx`
- `frontend/src/tests/CalculoListView.test.tsx`
- `testing/CATALOGO_PRUEBAS.md`

## Implementación

- Agrupa `cantidad_horas` por `novedad` sobre todos los registros de `filteredData`.
- Ordena los conceptos de mayor a menor cantidad de horas.
- Mantiene los cuatro indicadores existentes y añade una franja horizontal de altura estable.
- Actualiza el desglose al aplicar o limpiar filtros de columna.
- Diferencia carga, vacío y datos disponibles.
- Expone una región accesible con encabezado, estado ocupado y anuncio de actualizaciones.
- Evita crecimiento vertical con `overflow-x-auto` y tarjetas de concepto de ancho controlado.

## Revisores

| Revisor | Decisión | Bloquea |
|---|---|---|
| `scope-reviewer` | aprobado | No |
| `frontend-reviewer` | aprobado | No |
| `frontend-table-specialist` | aprobado con riesgos menores | No |
| `docs-tests-reviewer` | aprobado | No |

Riesgos menores aceptados: carga textual en lugar de skeleton y menor descubribilidad de filtros por la ocultación explícitamente solicitada de sus iconos.

## Evidencia

- 14 pruebas de `CalculoListView` — PASS.
- 2 pruebas de `horasExtrasPlanillaService` — PASS.
- TypeScript (`tsc --noEmit`) — PASS.
- ESLint focal — PASS.
- `git diff --check` focal — PASS.
- Build Vite 5.4.19, 4044 módulos — PASS.

La cobertura valida suma por concepto, orden descendente, reacción a filtros y estados de carga/vacío.

## Decisión

- [x] `aprobado`
- [ ] `aprobado_con_riesgos`
- [ ] `bloqueado`

No quedan motivos bloqueantes.
