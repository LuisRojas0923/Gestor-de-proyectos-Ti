# Revisión frontend — semántica de `ConsolidatedTableById`

**Fecha:** 2026-07-22  
**Build:** Corrección de seis encabezados frente a siete celdas por fila  
**Autor:** `frontend-reviewer`  
**Modo:** revisión read-only  
**Proyecto:** Gestor-de-proyectos-Ti

## Decisión

**`blocked` para el estado actual.** La propuesta evaluada es la corrección adecuada y debe aplicarse antes de aprobar el componente: retirar la celda decorativa absoluta, conservar el indicador mediante `border-left` en la primera celda real, añadir `scope="col"` a los seis encabezados y cubrir el contrato con una prueba estructural.

## Hallazgos bloqueantes

1. **Desalineación semántica de la tabla.** `COLUMNS` define seis columnas y el encabezado renderiza seis `<th>`, pero cada fila de datos agrega un séptimo `<td>` decorativo antes de las seis celdas reales. `position: absolute` lo saca del flujo visual, no del DOM ni del árbol de accesibilidad. Esto puede producir una celda vacía adicional para tecnologías asistivas y deja el modelo de filas inconsistente para CSS y herramientas que inspeccionen la tabla.
2. **Falta de asociación explícita de encabezados.** Los dos caminos de renderizado de `<th>` —acciones y columnas restantes— deben incluir `scope="col"`. Esto hace explícita la relación encabezado-celda y evita depender únicamente de la inferencia del navegador.
3. **Cobertura insuficiente del contrato estructural.** La prueba focalizada debe verificar seis `columnheader` y seis `cell` en cada fila de datos. La comprobación debe excluir la fila vacía, cuyo `colSpan={COLUMNS.length}` ya representa correctamente seis columnas.

## Evaluación de la corrección propuesta

- **Eliminar el `<td>` decorativo:** aprobado y preferible a añadir `aria-hidden`. Un elemento puramente visual no debe alterar la cantidad de celdas ni introducir una falsa columna accesible.
- **Mover el indicador a la primera celda real:** aprobado. Aplicar el borde izquierdo sobre la celda de `Tarea` conserva el marcador sin cambiar el modelo de tabla. Debe usar un token CSS existente (`var(--deep-navy)` o el token semántico elegido) y una anchura equivalente a la barra actual para evitar regresiones visuales.
- **`scope="col"`:** requerido en todos los seis `<th>`, incluido `Acciones`, no solo en los encabezados filtrables.
- **Prueba recomendada:** renderizar datos con varias actividades, obtener la tabla, comprobar `getAllByRole('columnheader')` con longitud seis y, para cada fila de datos, comprobar `getAllByRole('cell')` con longitud seis. También conviene afirmar que cada encabezado tiene `scope="col"`.

## Accesibilidad, CSS y diseño atómico

- La tabla nativa (`table`, `thead`, `tbody`, `tr`, `th`, `td`) es la elección correcta para datos tabulares; no debe sustituirse por `div` con roles para resolver este problema.
- `scope="col"` mejora la navegación de lectores de pantalla y la lectura de la tabla cuando hay filtros o columnas compactas.
- El `border-left` en la primera celda debe coexistir con `border-collapse` y `table-fixed`; validar que no cree una segunda línea, no desplace el contenido más de lo esperado y mantenga el ancho mínimo de la columna `Tarea`.
- La implementación ya reutiliza átomos para el contenido (`Text`, `Button`, `Badge`, `Icon`) y la molécula `ColumnFilterPopover`; la corrección no requiere crear otro componente visual.
- El componente (`439` líneas) y su prueba (`354` líneas) permanecen bajo el límite de `550` líneas.

## Riesgos visuales no bloqueantes

- Verificar en claro y oscuro que el borde conserve el contraste y el color del indicador anterior, además de hover de fila, scroll horizontal móvil, encabezado sticky y estado sin resultados.
- El archivo conserva clases de color Tailwind directas (`blue`, `gray`, `red`, `indigo`) y el `catch` usa una aserción `(e as Error)`; son riesgos de cumplimiento/tipado preexistentes y no cambian el veredicto específico de la estructura de la tabla.

## Checks requeridos

No se ejecutaron comandos por las restricciones read-only del revisor. Antes de aprobar el cambio, ejecutar desde `frontend/`:

- `npm run test -- src/components/__tests__/ConsolidatedTableById.test.tsx`
- `npm run lint`
- `npm run test`
- `npm run build`

## Razón del bloqueo

Mientras exista el séptimo `<td>`, la tabla no tiene una correspondencia fiable entre encabezados, celdas y columnas. La propuesta elimina directamente la causa, preserva el detalle visual mediante CSS tokenizado y añade la regresión automatizada necesaria.
