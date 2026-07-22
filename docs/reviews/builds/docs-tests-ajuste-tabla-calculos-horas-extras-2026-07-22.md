# Revisión final de pruebas — ajuste de tabla de cálculos de horas extras

**Fecha:** 2026-07-22  
**Modo:** revisión read-only  
**Alcance:** cuatro archivos frontend del ajuste de tabla

## Archivos revisados

- `frontend/src/components/molecules/DataTable.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/CalculoListView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/calculoPlanillaColumns.tsx`
- `frontend/src/tests/CalculoListView.test.tsx`

## Evidencia

Evidencia comunicada por el solicitante, no reejecutada por este subagente:

- 12 pruebas de `CalculoListView` y 14 de `DataTable`: **26 PASS**.
- TypeScript (`tsc`): **PASS**.
- ESLint: **PASS**.
- `diff-check`: **PASS**.
- Build frontend: **en curso; sin resultado final al cerrar esta revisión**.

La inspección estática confirma cobertura específica para:

- separación de los filtros de cédula y cliente en sus respectivos grupos;
- filtro de Encargados dentro de la columna agrupada Responsable;
- ausencia del icono `.lucide-funnel` en esta vista;
- filtrado por subcentro y conservación de las regresiones existentes de `DataTable`.

Este reviewer ejecutó además `git diff --check` sobre los cuatro archivos: terminó sin errores; Git solo informó advertencias de normalización LF/CRLF.

## Hallazgos

| Severidad | Cantidad | Detalle |
|---|---:|---|
| Crítica | 0 | Ninguno. |
| Alta | 1 | El build aún no tiene resultado final; la puerta de integración permanece abierta. |
| Media | 0 | Ninguno. |
| Baja | 1 | La conservación del valor predeterminado `showFilterIcon=true` se observa en código y las 14 regresiones pasan, pero no tiene una aserción directa del icono en `DataTable.test.tsx`. Es mejora recomendada, no bloqueo del ajuste. |

## Pruebas requeridas

No se requieren pruebas adicionales bloqueantes para el comportamiento solicitado. Como endurecimiento no bloqueante, puede añadirse una aserción directa de que `DataTable` conserva el embudo por defecto y lo oculta solo con `showFilterIcon={false}`.

## Documentación

No aplican cambios de esquema, modelos, RBAC ni decisiones arquitectónicas durables. No se requieren documentos funcionales, actualización de `docs/ESQUEMA_BASE_DATOS.md`, ADR ni bitácora adicional; este reporte conserva la trazabilidad de la evidencia.

## Decisión

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos`
- [x] `bloqueado`

**Único bloqueo:** falta el resultado final **PASS** del build frontend. Si el build concluye en PASS sobre este mismo snapshot, la decisión puede elevarse a **aprobado**, quedando únicamente la recomendación baja sobre el valor predeterminado del icono.
