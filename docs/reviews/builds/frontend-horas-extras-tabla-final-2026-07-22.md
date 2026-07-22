# Revisión frontend final — tabla de horas extras

**Fecha:** 2026-07-22  
**Build:** Agrupación de columnas y ocultamiento opcional del icono de filtro  
**Autor del build:** No indicado  
**Modo:** build / revisión estática read-only  
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos revisados

- `frontend/src/components/molecules/DataTable.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/CalculoListView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/calculoPlanillaColumns.tsx`
- `frontend/src/tests/CalculoListView.test.tsx`

## 2. Resultado

**Frontend review: approved_with_risks**

No se identificaron regresiones funcionales, problemas de accesibilidad bloqueantes ni incumplimientos materiales del sistema de diseño. La aprobación queda condicionada únicamente al cierre satisfactorio del build que seguía en ejecución al momento de esta revisión.

## 3. Hallazgos

| Severidad | Cantidad | Hallazgos |
|---|---:|---|
| Crítica | 0 | Ninguno. |
| Alta | 0 | Ninguno. |
| Media | 0 | Ninguno. |
| Baja | 2 | Menor descubribilidad visual de filtros al ocultar el embudo; `DataTable.tsx` queda en 536 líneas, próximo al límite de 550. |

### Hallazgos no bloqueantes

1. **Descubribilidad de filtros:** `showFilterIcon={false}` oculta únicamente el `Funnel`; el encabezado continúa siendo un `Button`, abre el filtro, expone `aria-haspopup="dialog"`/`aria-expanded` y conserva el cambio de color cuando hay filtros activos. No hay regresión para tecnologías de asistencia porque el icono ya era `aria-hidden`. En pantallas táctiles, sin embargo, desaparece la pista visual más clara de que el encabezado es filtrable. Esto se acepta como decisión específica de la vista, pero se aparta del patrón visual recomendado de mostrar un indicador de filtro por columna.
2. **Margen arquitectónico:** `DataTable.tsx` cumple el máximo de 550 líneas, pero queda en 536. No bloquea este cambio; cualquier ampliación posterior debería extraer la gestión del popover/filtros antes de superar el límite.

## 4. Regresiones, UX y accesibilidad

- `showFilterIcon` tiene valor predeterminado `true`; los demás consumidores de `DataTable` mantienen el comportamiento visual previo.
- La nueva opción no altera `filterable`, `onFilterChange`, los subfiltros ni el estado activo. Las pruebas de la vista demuestran que los encabezados siguen abriendo filtros aun sin el icono.
- La agrupación reduce 19 columnas a 14 y conserva empleado/cédula, OT/subcentro/especialidad/cliente y responsable/encargados. Los filtros siguen ligados a las claves reales mediante `subFilters`.
- El ancho horizontal disminuye y se conservan `min-w-0`, truncado, texto completo en el DOM y `title`; esto mejora la densidad sin ocultar información a lectores de pantalla.
- La tabla mantiene contenedor con scroll, encabezado separado y visible, límite incremental de 100 filas y estados diferenciados de carga, vacío y error.
- El filtro existente se renderiza en portal, usa `role="dialog"`, cierra con Escape y devuelve el foco al encabezado. Al ser un popover no modal, no requiere `aria-modal` ni bloqueo de scroll.
- Las nuevas celdas usan el átomo `Text`, variables/tokens existentes y textos en español. No se introducen primitivas interactivas crudas, colores legacy ni endpoints.
- La vista conserva composición mobile-first; en móvil la tabla sigue operable mediante desplazamiento horizontal. La reducción de columnas mejora este comportamiento.

## 5. Cobertura revisada

La prueba actualizada cubre:

- los 14 encabezados agrupados;
- ausencia del icono de embudo en esta vista;
- conservación de todos los datos agrupados;
- filtrado por subcentro, cédula, cliente y encargados;
- combinación y limpieza de filtros;
- límite incremental, carga, vacío, error y navegación por fila.

No se añadió una prueba unitaria específica de `DataTable` para el valor predeterminado `showFilterIcon=true`; el riesgo es bajo porque el default es explícito y las pruebas existentes de `DataTable` continúan buscando encabezados filtrables con su comportamiento histórico.

## 6. Evidencia y checks requeridos

Evidencia informada por el solicitante, no reejecutada por este revisor read-only:

- 26 pruebas focales — **PASS**.
- TypeScript (`tsc`) — **PASS**.
- ESLint focal — **PASS**.
- `diff-check` — **PASS**; además, `git diff --check` del alcance fue inspeccionado sin errores.
- `npm run build` — **EN EJECUCIÓN** al cerrar la revisión.

Checks requeridos desde `frontend/` cuando aplique la política de integración:

- `npm run lint` — solo hay evidencia focal.
- `npm run test` — solo hay evidencia focal de 26 pruebas.
- `npm run build` — pendiente de resultado final.

## 7. Riesgos de sistema de diseño

- **Bajo:** ocultar el embudo reduce la señal visual del patrón Excel-like, aunque no elimina funcionalidad ni semántica accesible.
- **Bajo:** dependencia de `title` nativo para revelar visualmente valores truncados con puntero; el valor completo permanece disponible en el DOM.
- No hay riesgos materiales de theming, atomic design, contraste introducido, responsive layout o rendimiento.

## 8. Motivos bloqueantes

Ninguno en el código revisado. Un fallo del build sí impediría promover esta decisión a aprobación plena.

## 9. Decisión final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

Si el build en curso finaliza en **PASS**, la revisión puede considerarse **approved** sin cambios adicionales de código. Si falla, debe revisarse el error antes de integrar.
