# Revisión frontend — `CalculoListView`

> **Estado histórico:** veredicto bloqueado supersedido. El cierre canónico está en `2026-07-21_horas-extras-planilla-detallada-final.md`.

**Fecha:** 2026-07-21
**Alcance exclusivo:** `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/CalculoListView.tsx`, `frontend/src/types/horasExtras.ts` y `frontend/src/tests/CalculoListView.test.tsx`.
**Decisión:** **blocked**

Se ignoraron los demás cambios del worktree. No se modificó código de aplicación.

## Hallazgos

### Alta — La composición de altura fija recorta la tabla en móvil

El contenedor raíz fija `h-[calc(100vh-170px)]` y `overflow-hidden` (`CalculoListView.tsx:149`). A la vez, el encabezado y el formulario no encogen (`CalculoListView.tsx:150,171`), el formulario pasa a cuatro filas en móvil (`CalculoListView.tsx:172-205`), el resumen conserva dos filas de tarjetas de al menos 88 px (`CalculoListView.tsx:88-96,209-214`) y la tabla exige al menos 260 px (`CalculoListView.tsx:223-240`). En viewports móviles cortos, la suma excede el alto disponible y no existe scroll vertical de página; la tabla queda parcial o totalmente inaccesible.

**Requerido:** permitir altura y scroll naturales en móvil y reservar la composición de altura fija para breakpoints amplios; verificar al menos 320×568, 375×667 y 390×844.

### Media — Los totales aparentan ser globales, pero solo agregan hasta 100 filas cargadas

La consulta impone `limit: 100` (`CalculoListView.tsx:121-129`), mientras los indicadores agregan exclusivamente `filteredData` (`CalculoListView.tsx:144-146`) y se presentan sin calificador como “Cálculos procesados”, “Empleados”, “Horas extra” y “Costo empresa” (`CalculoListView.tsx:209-214`). Si existen más de 100 resultados, especialmente “Costo empresa”, el resumen puede inducir decisiones basadas en un subtotal no identificado.

**Requerido:** usar totales/paginación suministrados por backend o nombrar explícitamente los indicadores como resumen de registros visibles/cargados. Exponer además una agrupación semántica accesible para las parejas etiqueta/valor.

### Media — Los filtros de columna quedan obsoletos después de una nueva búsqueda remota

`useColumnFilters` conserva su estado mientras `cargar` reemplaza `calculos` (`CalculoListView.tsx:108-115,117-130`). La tabla vuelve a aplicar esos conjuntos al nuevo resultado (`CalculoListView.tsx:230-246`), pero la vista no ofrece conteo global ni acción “Limpiar filtros”. Si el nuevo conjunto no contiene el valor previamente seleccionado, una búsqueda válida termina en una tabla vacía por un filtro antiguo difícil de descubrir.

**Requerido:** definir y probar el contrato al recargar: limpiar filtros de columna, podar selecciones inexistentes o conservarlos con un indicador global y una acción clara para eliminarlos.

### Media — El orden predeterminado cambia silenciosamente a `id` ascendente

Al registrar `id` como accessor y usar `useColumnFilters` (`CalculoListView.tsx:24-25,108-115`), se activa el fallback existente del hook a `id` ascendente cuando `sortState` es nulo. Sin embargo, la tabla recibe `activeSortKey` y `activeSortDir` nulos (`CalculoListView.tsx:244-246`), por lo que no muestra ni anuncia el orden efectivo. “Quitar orden” vuelve al mismo fallback y no restaura el orden del servicio, que antes se preservaba.

**Requerido:** establecer un orden inicial explícito y visible —previsiblemente reciente primero para un historial— o preservar el orden del servicio; cubrir orden numérico, período y ciclo ascendente/descendente/sin orden.

### Media — El estado de error no es accesible y compite con estados de datos válidos

Ante un fallo se vacían los datos (`CalculoListView.tsx:131-133`), se muestran resúmenes en cero (`CalculoListView.tsx:209-214`), un banner construido con `MaterialCard` sin `role="alert"`/`aria-live` (`CalculoListView.tsx:216-220`) y, simultáneamente, el estado vacío “No hay cálculos…” de la tabla (`CalculoListView.tsx:230-247`). Esto mezcla “consulta fallida” con “consulta exitosa sin resultados” y el error asíncrono puede no anunciarse a tecnologías de asistencia.

**Requerido:** usar la molécula existente `Callout` o semántica equivalente de alerta, y hacer mutuamente excluyentes error, vacío y resumen válido.

### Baja — El valor ausente del nombre tiene dos etiquetas distintas

El accessor entrega `null`/`undefined` (`CalculoListView.tsx:27`), que `useColumnFilters` presenta como “(Vacío)”, pero la celda muestra “No disponible” (`CalculoListView.tsx:46-50`). El usuario no encuentra en el filtro la misma etiqueta que observa en la tabla.

**Requerido:** normalizar ambos lados a una única etiqueta española y añadir una prueba con `nombre_empleado: null` y otra con la propiedad ausente. La adición tipada en `horasExtras.ts:274-278` sí representa correctamente ambos casos.

### Baja — El memo de filas se invalida y se repite trabajo derivado en cada pulsación

`fmtCurrency` construye un `Intl.NumberFormat` por invocación (`CalculoListView.tsx:10-11`), los tres resúmenes recorren nuevamente `filteredData` en cada render (`CalculoListView.tsx:144-146`) y `onRowClick` se crea inline (`CalculoListView.tsx:233-234`), invalidando la comparación memoizada de las filas de `DataTable`. El límite de 100 registros acota el impacto, pero escribir en los filtros remotos vuelve a renderizar y formatear toda la tabla.

**Requerido:** reutilizar el formatter, memoizar agregados y estabilizar el callback de fila. No se requiere virtualización mientras el límite real permanezca en 100.

### Baja — Las pruebas no cubren las regresiones anteriores

La prueba AND valida nombre + estado sobre el mismo conjunto (`CalculoListView.test.tsx:72-96`), pero la prueba denominada “conserva filtros” solo cambia el filtro remoto sin haber aplicado un filtro de columna (`CalculoListView.test.tsx:98-112`). Tampoco existen casos para nombre ausente, renovación con filtro activo, orden, alcance de resúmenes ni error/reintento accesible (`CalculoListView.test.tsx:57-112`).

## Verificaciones satisfactorias

- El nombre ERP opcional está tipado como `string | null | undefined` (`horasExtras.ts:274-278`) y la celda tiene fallback visible.
- Los filtros independientes se delegan al hook compartido y la prueba demuestra combinación AND para nombre y estado.
- Se reutilizan `DataTable`, átomos y tokens CSS; no se introducen colores legacy en la página.
- La tabla conserva contenedor scrollable, encabezado fijo dentro de la composición y filas memoizadas; con `limit: 100` no requiere virtualización.
- Los tres archivos respetan el máximo de 550 líneas. `horasExtras.ts` queda en 543 líneas y solo conserva siete líneas de margen, por lo que el próximo crecimiento debería dividir tipos por dominio.
- Se acepta como evidencia reportada: 27 pruebas frontend relacionadas aprobadas, ESLint focal aprobado y build de producción aprobado. El revisor no ejecutó comandos npm por restricciones del rol.

## Comprobaciones requeridas

Después de corregir los hallazgos:

1. Ampliar `CalculoListView.test.tsx` con nombre nulo/ausente, recarga con filtro activo, orden, error accesible y semántica/alcance del resumen.
2. Validar manualmente teclado y lector de pantalla: apertura/cierre de filtros, Escape, retorno de foco, anuncio de error y navegación de filas.
3. Validar los viewports móviles indicados y scroll horizontal/vertical sin recortes.
4. Ejecutar desde `frontend/`: `npm run lint`, `npm run test` y `npm run build`.

## Riesgos de sistema de diseño

- **Bloqueante:** la altura fija contradice el patrón mobile-first.
- **Medio:** el error reimplementa un banner con `MaterialCard` en lugar de la molécula `Callout` y carece de semántica de alerta.
- **Bajo:** `horasExtras.ts` está a siete líneas del límite arquitectónico.

## Razones de bloqueo

1. La tabla puede quedar inaccesible en móvil por recorte vertical sin scroll.
2. Los totales monetarios no declaran que agregan como máximo 100 registros.
3. Filtros obsoletos y orden implícito pueden ocultar o reordenar datos sin una señal clara.
