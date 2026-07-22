# Revisión frontend — agrupación de columnas de cálculo de planilla

**Fecha:** 2026-07-22  
**Build:** Agrupación final de columnas en cálculos de horas extras  
**Autor del build:** No indicado  
**Modo:** build / code review read-only  
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos revisados

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/calculoPlanillaColumns.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/CalculoListView.tsx`
- `frontend/src/components/molecules/DataTable.tsx`
- `frontend/src/tests/CalculoListView.test.tsx`

## 2. Subagente ejecutado

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| scope-reviewer | aprobado | No | Alcance limitado a cuatro archivos frontend. |
| frontend-reviewer | aprobado | No | Sin regresiones funcionales ni de accesibilidad. |
| frontend-table-specialist | aprobado con riesgos | No | Menor descubribilidad del filtro al ocultar el icono. |
| docs-tests-reviewer | aprobado | No | Cobertura y evidencia final verificadas. |

## 3. Hallazgos por severidad

| Severidad | Cantidad | Hallazgos |
|---|---:|---|
| Crítica | 0 | Ninguno. |
| Alta | 0 | Ninguno. |
| Media | 0 | Ninguno. |
| Baja | 0 | Ninguno. |

## 4. Evaluación frontend

- La agrupación conserva todos los datos solicitados: empleado/cédula, empresa/sucursal, contexto OT completo y responsable/encargados.
- Los `subFilters` mantienen filtros independientes sobre las claves reales y cuentan con cobertura para sucursal, subcentro, cédula, cliente y encargados.
- `maxWidth`, `min-w-0`, `overflow-hidden`, `truncate` y `title` forman un patrón coherente para controlar el ancho sin perder acceso al valor completo.
- `Text variant="caption"` resuelve el texto de 12 px mediante el átomo existente; no se introducen primitivas UI nuevas ni colores hardcodeados.
- Los campos agrupados anulables se normalizan explícitamente a `No disponible` y usan jerarquía visual secundaria.
- Se mantiene la tabla atómica existente, su contenedor con scroll, encabezado fijo, carga incremental y estados de carga/vacío/error.
- `showFilterIcon={false}` oculta el embudo solo en esta vista; los encabezados conservan la apertura de filtros y `DataTable` mantiene el icono por defecto para el resto de consumidores.
- Los cuatro archivos quedan por debajo del máximo de 550 líneas.
- No se introducen endpoints, manejo de errores con `any`, modales ni texto de interfaz fuera del español.

## 5. Validaciones

Evidencia final ejecutada:

- 27 tests focales (`CalculoListView` y `DataTable`) — PASS.
- TypeScript (`tsc`) — PASS.
- ESLint focal — PASS.
- `diff-check` — PASS.
- Build Vite 5.4.19, 4044 módulos — PASS.

Antes de integrar, los checks completos habituales siguen siendo `npm run lint`, `npm run test` y `npm run build` desde `frontend/` si la política de la rama los exige.

## 6. Riesgos de sistema de diseño y UX

Riesgo menor aceptado: ocultar el embudo reduce la descubribilidad táctil del filtro, aunque el encabezado conserva semántica de botón, estado expandido y resaltado cuando hay filtros activos. El truncado depende del `title` nativo para usuarios visuales con puntero, pero el texto completo permanece en el DOM para tecnologías de asistencia.

## 7. Decisión final

- [x] `aprobado`
- [ ] `aprobado_con_riesgos`
- [ ] `bloqueado`

No hay motivos bloqueantes ni seguimiento obligatorio dentro del alcance revisado.
