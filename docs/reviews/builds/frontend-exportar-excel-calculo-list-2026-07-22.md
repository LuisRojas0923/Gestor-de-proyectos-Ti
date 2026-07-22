# Revisión frontend — Exportar Excel en CalculoListView

**Fecha:** 2026-07-22  
**Build:** Exportación de cálculos filtrados y horas por concepto

## Alcance

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/CalculoListView.tsx`
- `frontend/src/tests/CalculoListView.test.tsx`
- `testing/CATALOGO_PRUEBAS.md`

## Implementación

- El botón exporta todos los registros de `filteredData`, no solo el bloque visible.
- SheetJS se carga dinámicamente al pulsar el botón y queda en un chunk separado.
- La hoja `Registros` contiene 20 columnas con números y fechas tipadas para Excel.
- La hoja `Horas por concepto` incluye el total y el desglose filtrado.
- El archivo usa fecha local en `calculos_horas_extras_YYYY-MM-DD.xlsx`.
- El botón usa icono, spinner, bloqueo durante la generación y mensaje de error accesible.

## Revisiones

| Revisor | Decisión | Bloquea |
|---|---|---|
| `scope-reviewer` | aprobado con riesgos | No |
| `frontend-reviewer` | aprobado | No |
| `docs-tests-reviewer` | aprobado con riesgos bajos | No |
| `security-rbac-reviewer` | aprobado con riesgos | No |

## Evidencia

- 15 pruebas UI — PASS.
- 2 pruebas del servicio de planilla — PASS.
- TypeScript — PASS.
- ESLint focal — PASS.
- `git diff --check` — PASS.
- Build Vite 5.4.19, 4044 módulos — PASS.
- Chunk `xlsx` separado — confirmado.

## Riesgos aceptados

- El XLSX contiene cédulas, salarios y datos laborales; la copia descargada queda fuera del control de la aplicación.
- No existe auditoría backend porque la generación es completamente local.
- `xlsx@0.18.5` es una dependencia preexistente que conviene actualizar.
- Como endurecimiento futuro, pueden añadirse pruebas de más de 100 filas y fallo/reintento de escritura.

La exportación no amplía permisos, no hace nuevas consultas y no transfiere datos a servicios externos.

## Decisión

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

No quedan motivos bloqueantes.
