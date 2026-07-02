# Build - Optimizacion de rendimiento frontend

**Fecha:** 2026-07-01
**Build:** Lazy loading de rutas principales y subrutas del portal de servicios
**Autor del build:** Agente IA
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `frontend/src/components/Router.tsx`
- `frontend/src/pages/ServicePortal.tsx`
- `frontend/src/components/common/RouteLoadingFallback.tsx`
- `frontend/src/components/atoms/MultiSelect.tsx`
- `frontend/src/pages/DesignSystemCatalog/MoleculesSection.tsx`
- `frontend/src/pages/InventarioAdmin/components/MonitorMaestroTab.tsx`
- `frontend/src/pages/ServicePortal/pages/Inventario/components/FilterHeader.tsx`
- `frontend/src/pages/ServicePortal/pages/GestionHumana/Formato2276DataTable.tsx`
- `docs/reviews/plans/2026-07-01_optimizacion-rendimiento-frontend.md`
- `docs/reviews/builds/2026-07-01_optimizacion-rendimiento-frontend_build-review.md`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| graphify-searcher | completado | no | Localizo `Router.tsx`, `ServicePortal.tsx`, rutas internas y candidatos de lazy loading. |
| frontend-reviewer | no_disponible | no | No esta expuesto en la lista de agentes del arnes actual. Se aplicaron skills locales de frontend y design system. |
| docs-tests-reviewer | no_disponible | no | No esta expuesto en la lista de agentes del arnes actual. Este reporte persiste la evidencia. |

## 3. Hallazgos bloqueantes

Ninguno para build. `npm run build` pasa correctamente.

## 4. Hallazgos no bloqueantes

- `npm run lint` falla por deuda existente del frontend: 539 errores y 59 warnings, principalmente `@typescript-eslint/no-explicit-any`, imports no usados y dependencias faltantes en hooks. No se atribuye al cambio de lazy loading.
- `PlanificadorSemanalView.test.tsx` queda en 18/19 por expectativa de fecha anterior: busca `2026-06-22`, pero la pantalla renderiza `2026-06-29`. El fallo ya esta en el flujo de Horas Extras/test data, no en el enrutamiento diferido.
- El build conserva advertencia de Browserslist desactualizado.
- El build sigue mostrando assets pesados cargables bajo demanda, especialmente `jspdf.plugin.autotable` (420.14 kB), `InventarioAdmin` (356.51 kB), `ReservaSalasView` (272.97 kB), `CartesianChart` (301.47 kB) y la imagen `fondo - copia` (1,219.53 kB).

## 5. Tests / comandos ejecutados

- `cd frontend && npm run build` - PASS
- `cd frontend && npm run lint` - FAIL por deuda existente global del frontend.
- `cd frontend && npm run test -- src/tests/PlanificadorSemanalView.test.tsx --run` - FAIL, 18 passed / 1 failed por fecha esperada `2026-06-22`.

### Metricas de bundle

| Metrica | Antes | Despues | Resultado |
|---|---:|---:|---|
| JS principal sin gzip | 3,116.48 kB | 345.08 kB | -88.9% |
| JS principal gzip | 836.85 kB | 113.48 kB | -86.4% |
| CSS principal sin gzip | 180.20 kB | 176.17 kB | -2.2% |
| CSS principal gzip | 26.08 kB | 25.22 kB | -3.3% |

### Chunks diferidos relevantes generados

| Chunk | Tamano | Gzip | Nota |
|---|---:|---:|---|
| `ServicePortal-*.js` | 47.14 kB | 14.19 kB | Portal ya no entra en bundle inicial. |
| `PlanificadorSemanalView-*.js` | 51.79 kB | 14.50 kB | Horas Extras queda diferido. |
| `InventarioAdmin-*.js` | 356.51 kB | 114.87 kB | Admin inventario queda diferido. |
| `ReservaSalasView-*.js` | 272.97 kB | 79.51 kB | Reserva de salas queda diferida. |
| `CartesianChart-*.js` | 301.47 kB | 91.42 kB | Graficos quedan separados. |
| `jspdf.plugin.autotable-*.js` | 420.14 kB | 137.70 kB | Export PDF sigue como candidato a import dinamico por accion. |

## 6. Documentacion actualizada

- [x] `docs/reviews/plans/2026-07-01_optimizacion-rendimiento-frontend.md`
- [x] `docs/reviews/builds/2026-07-01_optimizacion-rendimiento-frontend_build-review.md`
- [ ] `docs/ARQUITECTURA_FRONTEND.md` pendiente si se quiere formalizar lazy loading como regla permanente.

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

El build cumple el objetivo principal de reducir el bundle inicial. Quedan riesgos no bloqueantes por deuda de lint y por una prueba focalizada con fecha esperada desactualizada.

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Corregir test de fecha en `PlanificadorSemanalView.test.tsx` o parametrizar fecha base | Frontend | 2026-07-02 |
| Evaluar imports dinamicos para exportaciones PDF/Excel (`jspdf`, `xlsx`) | Frontend | 2026-07-03 |
| Optimizar imagen `fondo - copia-CnqBxq_a.png` | Frontend/UI | 2026-07-03 |
| Definir estrategia para deuda de lint existente | Equipo | 2026-07-05 |
