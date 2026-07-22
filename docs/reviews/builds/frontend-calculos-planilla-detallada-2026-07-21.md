# Revisión frontend — tabla detallada de cálculos de planilla

> **Estado histórico:** veredicto bloqueado supersedido. El cierre canónico está en `2026-07-21_horas-extras-planilla-detallada-final.md`.

**Fecha:** 2026-07-21  
**Build:** Tabla detallada de cálculos de horas extras  
**Autor del build:** no indicado  
**Modo:** build  
**Proyecto:** Gestor-de-proyectos-Ti  
**Decisión:** **blocked**

Se revisó exclusivamente el alcance solicitado y se ignoró el resto del worktree. No se modificó código de aplicación.

## 1. Archivos revisados

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/CalculoListView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/calculoPlanillaColumns.tsx`
- `frontend/src/services/horasExtrasPlanillaService.ts`
- `frontend/src/services/horasExtrasService.ts` — solo la exportación necesaria para el servicio nuevo
- `frontend/src/types/horasExtrasPlanilla.ts`
- `frontend/src/tests/CalculoListView.test.tsx`
- `frontend/src/tests/horasExtrasPlanillaService.test.ts`

## 2. Hallazgos, ordenados por severidad

### Alta — El límite de 100 aplica a cálculos, no a filas expandidas, y toda la grilla se monta de una vez

La consulta pide `limit: 100` y la propia interfaz aclara “hasta 100 cálculos cargados” (`CalculoListView.tsx:63-69,173-179`). Cada cálculo se expande a filas por empleado + fecha + OT + novedad, pero `DataTable` recibe y renderiza el arreglo completo sin paginación, carga incremental ni virtualización (`CalculoListView.tsx:192-206`). Con siete días, varias OT y novedades, 100 cálculos pueden producir cientos o más de mil filas; las 19 columnas generan decenas de miles de celdas (`calculoPlanillaColumns.tsx:53-73`). Además, los cuatro agregados recorren el conjunto en cada render y `onRowClick` se recrea inline, por lo que escribir en los filtros superiores puede invalidar la memoización de todas las filas (`CalculoListView.tsx:91-94,196`). La prueba de vista solo usa una fila y no detecta la degradación (`CalculoListView.test.tsx:13-37,55-79`).

**Requerido:** imponer paginación/límite sobre filas o virtualización/carga incremental; memoizar el resumen y estabilizar el callback de navegación. Perfilar el peor caso real de 100 cálculos expandidos antes de aprobar.

### Media — “Horas visibles” mezcla conceptos que no representan un total único de horas trabajadas o extra

El indicador suma indiscriminadamente `cantidad_horas` de todas las filas (`CalculoListView.tsx:91,169`). La tabla contiene `SALARIO`, horas extra, recargos y otras novedades (`CalculoPlanilla` expone `novedad` y `cantidad_horas` en `horasExtrasPlanilla.ts:17-18`); varias de esas filas pueden referirse a las mismas horas del día. Por tanto, “Horas visibles” puede parecer un total operativo cuando en realidad es la suma contable de la columna y puede contar categorías superpuestas. “Costo visible” también agrega un campo que no está entre las 19 columnas visibles, por lo que el usuario no puede reconciliarlo fila a fila (`CalculoListView.tsx:92,170`; `horasExtrasPlanilla.ts:23`). Las pruebas solo comprueban las etiquetas, no los valores ni su semántica (`CalculoListView.test.tsx:59-62`).

**Requerido:** etiquetar inequívocamente como “Suma CANT. HORAS de filas visibles” y aclarar el alcance del costo, o reemplazar ambos por agregados de backend con semántica de negocio explícita. Añadir casos con `SALARIO` + HE/recargo y filtros activos.

### Media — Dos encabezados no coinciden con el orden de etiquetas declarado como exacto

Las columnas usan `OT / CC` y `SUB. / SUBC.` (`calculoPlanillaColumns.tsx:62-63`), mientras la especificación de orden UI exacto usa `OT/CC` y `SUB./SUBC.` (`docs/specs/2026-07-15_planilla-regional-automatica.md:303-305`). El test replica las variantes con espacios y, además, solo verifica presencia: no comprueba que existan exactamente 19 encabezados ni que estén en el orden solicitado (`CalculoListView.test.tsx:63-71`).

**Requerido:** confirmar la lista contractual con producto y usarla literalmente; hacer que la prueba compare el arreglo completo de nombres accesibles y su longitud/orden.

### Baja — La cobertura no protege varios criterios centrales de aceptación

No hay pruebas para: exactamente 19 encabezados en orden; filtro categórico funcional en cada encabezado; dos filas de igual empleado/fecha con OT o novedad distintas; formatos de salario, base hora, `APLICA HE`, cantidad y horas; valores de los resúmenes después de filtrar; loading, vacío, reintento; navegación de fila con Enter/Espacio; ni volumen alto. El servicio solo cubre la respuesta exitosa y no el error HTTP (`CalculoListView.test.tsx:55-156`; `horasExtrasPlanillaService.test.ts:9-26`).

**Requerido:** ampliar pruebas de contrato/UX, especialmente conteo y orden exactos, grano de fila, las 19 aperturas de filtro, agregados y teclado.

### Baja — El endpoint nuevo no está centralizado en `config/api.ts`

`listarCalculosPlanilla` incorpora directamente `'/calculos/planilla'` (`horasExtrasPlanillaService.ts:9`) y depende de que el helper exportado desde `horasExtrasService.ts` le anteponga su base interna. Esto incumple la regla del frontend de registrar endpoints en `API_ENDPOINTS` y acopla el servicio nuevo a detalles internos de otro servicio.

**Requerido:** registrar una constante de endpoint en `frontend/src/config/api.ts` y consumirla desde el servicio, o extraer el cliente HTTP compartido a una capa de infraestructura explícita.

### Baja — El nombre accesible del resumen está sobre un contenedor sin semántica

`aria-label="Resumen de registros visibles"` está aplicado a un `div` genérico (`CalculoListView.tsx:166`). Sin `role="group"`, `role="region"` o `aria-labelledby`, el nombre puede no exponerse como agrupación en lectores de pantalla.

**Requerido:** dar semántica de grupo/región y cubrir el nombre accesible.

## 3. Verificaciones satisfactorias

- Hay 19 definiciones de columna y 19 accessors correspondientes; todas están marcadas como categóricas/filtrables (`calculoPlanillaColumns.tsx:21-41,53-73`).
- La vista no agrupa ni colapsa filas: conserva el grano entregado por el servicio y usa `fila_id` como clave (`CalculoListView.tsx:193-196`).
- El click de fila navega al detalle mediante `calculo_id` (`CalculoListView.tsx:196`), y existe cobertura básica de navegación (`CalculoListView.test.tsx:142-156`).
- La composición es mobile-first: altura fija y recorte vertical se reservan para `lg`; la tabla reutilizable aporta overflow horizontal y encabezado sincronizado (`CalculoListView.tsx:97,173-206`).
- Se distinguen carga, vacío y error; el error usa `Callout` con `role="alert"` y acción de reintento (`CalculoListView.tsx:157-209`).
- Se reutilizan átomos, `DataTable`, `Callout` y tokens CSS; no se introducen colores legacy en los archivos de aplicación revisados.
- No aparece `any`, el texto visible está en español y todos los archivos cumplen el máximo de 550 líneas. `horasExtrasService.ts` queda en 545 líneas, con margen arquitectónico mínimo.

## 4. Tests y comprobaciones

Evidencia reportada por el solicitante, no ejecutada por este revisor debido a las restricciones del rol:

- 31 pruebas relacionadas — **PASS reportado**.
- ESLint focal — **PASS reportado**.
- Build de producción, 4042 módulos — **PASS reportado**.

Comprobaciones requeridas tras corregir hallazgos, desde `frontend/`:

1. `npm run lint`
2. `npm run test`
3. `npm run build`
4. Perfil de render con 100 cálculos expandidos y validación manual en 320×568, 375×667 y escritorio.
5. Validación por teclado/lector: los 19 filtros, Escape/retorno de foco, scroll horizontal y Enter/Espacio sobre filas.

## 5. Riesgos de sistema de diseño

- **Alto:** la tabla reutilizable es correcta, pero el consumidor no controla el volumen real de filas expandidas.
- **Bajo:** el resumen carece de semántica de agrupación inequívoca.
- **Bajo:** `horasExtrasService.ts` está a cinco líneas del límite de 550; nuevos crecimientos deben extraerse por dominio.
- No se introdujeron modales ni HTML interactivo crudo en el alcance.

## 6. Razones de bloqueo

1. No existe un límite/paginación/virtualización a nivel de las filas reales; 100 cálculos expandidos pueden montar miles de filas × 19 columnas y degradar severamente la interacción.
2. Los resúmenes de horas/costo no tienen una semántica suficientemente precisa para evitar interpretación operativa errónea.

## 7. Seguimiento

| Acción | Responsable | Fecha objetivo |
|---|---|---|
| Acotar o virtualizar filas y perfilar el peor caso | Implementación frontend/backend | Antes de merge |
| Corregir semántica y pruebas de resúmenes | Implementación frontend | Antes de merge |
| Confirmar etiquetas exactas y endurecer pruebas de 19 columnas/filtros | Producto + frontend | Antes de merge |
