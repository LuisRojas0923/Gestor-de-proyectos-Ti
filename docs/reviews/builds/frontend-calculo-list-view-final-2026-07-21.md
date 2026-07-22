# Re-revisión frontend final — `CalculoListView`

> **Estado histórico:** revisión focal conservada para auditoría. El cierre canónico está en `2026-07-21_horas-extras-planilla-detallada-final.md`.

**Fecha:** 2026-07-21  
**Alcance exclusivo:** `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/CalculoListView.tsx`, `frontend/src/types/horasExtras.ts` y `frontend/src/tests/CalculoListView.test.tsx`.  
**Decisión:** **approved_with_risks**

Se ignoraron los demás cambios del worktree. No se modificó código de aplicación.

## Hallazgos vigentes

### Baja — El resumen todavía no expone una agrupación ARIA inequívoca

El alcance visual ya es correcto: las tarjetas dicen “visible” y el encabezado declara el máximo de 100 registros (`CalculoListView.tsx:226-239`). Sin embargo, `aria-label="Resumen de registros visibles"` está aplicado a un `div` genérico sin `role="group"`, `role="region"` ni encabezado asociado (`CalculoListView.tsx:226`). Algunos lectores pueden ignorar el nombre accesible de un contenedor genérico.

**Recomendado:** convertirlo en grupo/región nombrada o asociarlo a un encabezado mediante `aria-labelledby`. No bloquea porque las etiquetas y valores permanecen visibles y en orden de lectura.

### Baja — Queda trabajo derivado no memoizado, aunque está acotado a 100 filas

Los tres agregados recorren `filteredData` en cada render (`CalculoListView.tsx:152-154`) y el callback de fila continúa creándose inline (`CalculoListView.tsx:255-256`), lo que reduce la eficacia de `MemoDataTableRow` cuando cambia un campo remoto. El formatter monetario sí quedó correctamente reutilizado (`CalculoListView.tsx:11-16`). Con `limit: 100` (`CalculoListView.tsx:124-130`) el costo residual es bajo y no requiere virtualización.

**Recomendado:** consolidar/memoizar agregados y estabilizar `onRowClick` si la vista crece o se observa latencia.

### Baja — Falta una prueba directa de limpieza de filtros al buscar

La implementación limpia filtros antes de la búsqueda remota (`CalculoListView.tsx:142-145`) y muestra una acción global accesible (`CalculoListView.tsx:241-250`). No obstante, la prueba de búsqueda no aplica primero un filtro de columna (`CalculoListView.test.tsx:134-148`), por lo que no protege específicamente esta corrección. El caso de nombre ausente cubre `null`, pero no la omisión de la propiedad (`CalculoListView.test.tsx:99-113`).

**Recomendado:** añadir ambos casos en una iteración posterior.

## Hallazgos anteriores resueltos

- **Responsive:** altura fija y `overflow-hidden` se aplican solo desde `lg`; móvil conserva altura y scroll naturales (`CalculoListView.tsx:157,179-215,224-273`).
- **Semántica de totales:** las tarjetas declaran registros visibles y la tabla informa “hasta 100 cargados” (`CalculoListView.tsx:226-239`).
- **Filtros obsoletos:** Buscar limpia filtros; además existe conteo y limpieza global (`CalculoListView.tsx:142-145,241-250`).
- **Orden:** al excluir `id` y métricas de los accessors se preserva el orden del servicio por defecto; solo las columnas categóricas son filtrables/ordenables (`CalculoListView.tsx:29-34,36-80`). La prueba lo verifica (`CalculoListView.test.tsx:115-124`).
- **Error y accesibilidad:** se usa `Callout` con `role="alert"` y error/tabla son mutuamente excluyentes (`CalculoListView.tsx:217-224,272`). La prueba confirma que no aparece el estado vacío (`CalculoListView.test.tsx:126-132`).
- **Nombre ERP opcional:** `null`, ausencia y cadenas vacías se normalizan como “No disponible” tanto en celda como en filtro (`CalculoListView.tsx:31,46-50`; `horasExtras.ts:274-278`).
- **Formatter:** `Intl.NumberFormat` se instancia una sola vez (`CalculoListView.tsx:11-16`).
- **AND de filtros:** nombre + estado continúa cubierto (`CalculoListView.test.tsx:72-97`).

## Comprobaciones

Se acepta como evidencia reportada:

- 6 pruebas focales aprobadas.
- 30 pruebas frontend relacionadas aprobadas.
- ESLint aprobado.
- Build de producción aprobado.

El revisor no ejecutó comandos npm por restricciones del rol. Para futuros cambios, repetir desde `frontend/`: `npm run lint`, `npm run test` y `npm run build`.

## Riesgos de sistema de diseño

- No hay riesgos bloqueantes: se reutilizan `DataTable`, `Callout`, átomos y tokens CSS.
- `horasExtras.ts` permanece dentro del límite con 543 líneas, pero solo dispone de siete líneas de margen antes de requerir división por dominio.

## Razones de bloqueo

Ninguna.
