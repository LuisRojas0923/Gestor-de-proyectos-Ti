# Revisión frontend — ajuste de anchos en cálculos de planilla

**Fecha:** 2026-07-22  
**Build:** Densidad y truncado de la tabla de cálculos de horas extras  
**Autor del build:** No indicado  
**Modo:** build / code review read-only  
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos revisados

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/CalculoListView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/calculoPlanillaColumns.tsx`
- `frontend/src/components/molecules/DataTable.tsx` (contrato relacionado)
- `frontend/src/components/molecules/DataTableRow.tsx` (aplicación de anchos y padding)
- `frontend/src/tests/CalculoListView.test.tsx` (cobertura relacionada)

## 2. Resultado

**Frontend review: blocked**

La reducción de ancho es técnicamente coherente, pero el diff actual contra `HEAD` elimina de la tabla y de sus filtros el dato `ubicacion`, cambio funcional que no forma parte del ajuste de densidad descrito. También se oculta el indicador visual obligatorio de filtros por columna.

## 3. Hallazgos bloqueantes

### Alta — regresión de información en `ubicacion`

- `calculoPlanillaColumns.tsx:21-40` ya no declara el accessor `ubicacion`.
- `calculoPlanillaColumns.tsx:145-204` no renderiza ni agrupa el campo bajo ninguna columna.
- El DTO aún lo exige en `frontend/src/types/horasExtrasPlanilla.ts:16` y la prueba conserva `ubicacion: 'CC'` en el fixture, pero no comprueba que el usuario pueda verla o filtrarla.
- Contra `HEAD`, desaparecen la columna `UBICACIÓN`, su valor y su filtro. Esto contradice el alcance declarado —reducir anchos/padding y truncar— y puede ocultar contexto operativo de cada registro.

Debe restaurarse `ubicacion` en una columna o grupo y en `CALCULO_PLANILLA_ACCESSORS`, o aportar una decisión funcional explícita que autorice eliminarla y actualizar la prueba para reflejar ese requisito.

### Media — se elimina la señal visual aprobada para filtros

- `CalculoListView.tsx:220` establece `showFilterIcon={false}`.
- El encabezado sigue siendo un botón con `aria-haspopup` y `aria-expanded`, por lo que la operación por teclado no se rompe; sin embargo, en táctil desaparece la única pista permanente de que cada encabezado abre un filtro.
- Esto se aparta del patrón obligatorio de tablas Excel-like: icono visible por columna e indicador visual del filtro activo. Ocultar el embudo tampoco fue parte del ajuste de anchos descrito.

Debe mantenerse el icono o documentarse/aprobarse una excepción de UX con una señal visual equivalente.

## 4. Hallazgos no bloqueantes

1. **Bajo — divulgación de valores truncados:** `truncate` funciona con las pistas de grid/flex y `min-w-0`, y el contenido completo permanece en el DOM para lectores de pantalla. No obstante, `title` nativo depende de hover y no ofrece una divulgación consistente a usuarios táctiles o de teclado. El acceso al detalle por fila mitiga el riesgo, pero conviene validar los valores largos en móvil y con zoom.
2. **Bajo — acoplamiento de estilos:** `[&_[role=cell]]:!px-2` y `[&_[role=columnheader]>button]:!px-2` son variantes Tailwind válidas y locales, pero dependen de la estructura interna de `DataTable` y de `!important`. Si esta densidad se reutiliza, debería evolucionar a una prop del componente (`density="compact"`) en vez de multiplicar selectores descendientes.

## 5. Sistema de diseño, Tailwind y accesibilidad

- Se reutilizan `DataTable` y el átomo `Text`; no se introducen primitivas interactivas crudas.
- No aparecen colores hardcodeados ni estilos que rompan tema claro/oscuro. Los valores en píxeles se limitan al layout de columnas.
- `minWidth`/`maxWidth`, `min-w-0`, `overflow-hidden` y `truncate` son compatibles con el grid de `DataTable` y reducen el ancho mínimo aproximado de la tabla.
- La tabla conserva scroll controlado, encabezado visible, render incremental de 100 filas y estados de carga, vacío y error.
- La reducción mejora el desplazamiento horizontal en móvil, pero no elimina la necesidad de validación visual en viewport estrecho.
- No hay modales nuevos; los requisitos de focus trap, `aria-modal` y bloqueo de scroll no aplican.
- Ambos archivos objetivo permanecen por debajo del límite de 550 líneas.

## 6. Tests y checks

Evidencia informada por el solicitante, no reejecutada por este revisor:

- 13 tests — **PASS**.
- TypeScript (`tsc`) — **PASS**.
- ESLint — **PASS**.
- Diff-check — **PASS**. Además, `git diff --check` focal fue inspeccionado sin errores.
- Build — **EN CURSO**.

Antes de integrar:

- el build debe finalizar en **PASS**;
- debe añadirse o restaurarse una aserción que garantice la presencia y filtrabilidad de `ubicacion`, salvo eliminación funcional aprobada;
- cuando aplique la política de rama, ejecutar desde `frontend/`: `npm run lint`, `npm run test` y `npm run build`.

## 7. Documentación actualizada

No aplica documentación funcional mientras el cambio se limite a densidad visual. Si se decide retirar `ubicacion` o exceptuar el patrón de iconos de filtro, esa decisión sí debe quedar registrada en el alcance/criterios de aceptación.

## 8. Decisión final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos`
- [x] `bloqueado`

## 9. Seguimiento

| Acción | Responsable | Fecha objetivo |
|---|---|---|
| Restaurar o aprobar explícitamente la eliminación de `ubicacion`, con prueba correspondiente | Implementación frontend / producto | Antes de integrar |
| Restaurar el embudo o aprobar una señal visual equivalente | Implementación frontend / UX | Antes de integrar |
| Confirmar resultado del build | Orquestador | Antes de integrar |
