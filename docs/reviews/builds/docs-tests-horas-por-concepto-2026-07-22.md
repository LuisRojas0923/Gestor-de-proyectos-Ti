# Revisión docs/tests — resumen Horas por concepto

**Fecha:** 2026-07-22  
**Alcance:** `CalculoListView`, servicio de planilla y catálogo de pruebas

## Cobertura

La prueba del resumen valida:

1. `SALARIO` con 8 horas.
2. Dos registros `HED` que suman 3,5 horas.
3. Orden descendente por total de horas.
4. Actualización al filtrar `NOVEDAD = HED`.
5. Estado de carga sin falso vacío.
6. Estado vacío después de completar una consulta sin resultados.

El cálculo usa `filteredData`, por lo que considera todos los registros filtrados y no solo el bloque visible de la tabla.

## Evidencia

- 16 pruebas focales — PASS (14 UI + 2 servicio).
- TypeScript — PASS.
- ESLint focal — PASS.
- `git diff --check` — PASS.
- Build Vite 5.4.19, 4044 módulos — PASS.
- `testing/CATALOGO_PRUEBAS.md` actualizado a 12 columnas y 16 pruebas.

## Decisión

- [x] `aprobado`
- [ ] `aprobado_con_riesgos`
- [ ] `bloqueado`

No quedan pruebas ni documentos bloqueantes.
