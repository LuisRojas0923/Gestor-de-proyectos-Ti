# Revisión docs/tests — exportación XLSX filtrada

**Fecha:** 2026-07-22  
**Alcance:** `CalculoListView`, suite Vitest y catálogo

## Cobertura

La prueba de exportación valida:

1. Aplicación del filtro `NOVEDAD = HED`.
2. Exportación de los dos registros filtrados.
3. Valores numéricos y fechas `Date` con formato `dd/mm/yyyy`.
4. Resumen `TOTAL = 3,5` y `HED = 3,5`.
5. Hojas `Registros` y `Horas por concepto`.
6. Nombre local `calculos_horas_extras_YYYY-MM-DD.xlsx` y compresión.

## Evidencia

- 17 pruebas — PASS (15 UI + 2 servicio).
- TypeScript — PASS.
- ESLint focal — PASS.
- `git diff --check` — PASS.
- Build Vite 5.4.19, 4044 módulos — PASS.
- `testing/CATALOGO_PRUEBAS.md` actualizado.

## Decisión

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

Riesgos bajos no bloqueantes: faltan casos de más de 100 filas y fallo/reintento XLSX.
