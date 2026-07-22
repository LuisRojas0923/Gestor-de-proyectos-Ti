# Revisión frontend — planilla de cálculos de horas extras

> **Estado histórico:** revisión focal conservada para auditoría. El cierre canónico está en `2026-07-21_horas-extras-planilla-detallada-final.md`.

**Fecha:** 2026-07-21  
**Build:** Revisión focal final de planilla de cálculos, posterior a correcciones  
**Autor del build:** no indicado  
**Modo:** build  
**Proyecto:** Gestor-de-proyectos-Ti  
**Decisión:** **approved_with_risks**

Se revisó exclusivamente el alcance solicitado y se ignoraron los demás cambios del worktree. No se modificó código de aplicación.

## 1. Archivos revisados

- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/CalculoListView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/calculoPlanillaColumns.tsx`
- `frontend/src/services/horasExtrasPlanillaService.ts`
- `frontend/src/types/horasExtrasPlanilla.ts`
- `frontend/src/tests/CalculoListView.test.tsx`
- `frontend/src/tests/horasExtrasPlanillaService.test.ts`
- Dependencias reutilizadas consultadas para validar comportamiento: `DataTable`, `DataTableRow`, `FilterDropdown`, `useColumnFilters` y `config/api.ts`.

## 2. Hallazgos, ordenados por severidad

### Media — El endpoint nuevo no usa `API_ENDPOINTS`

`horasExtrasPlanillaService.ts:9` contiene `'/calculos/planilla'` directamente y depende de la base privada de `horasExtrasService`. No existe la ruta equivalente en `frontend/src/config/api.ts`. Esto incumple la regla del proyecto de centralizar endpoints y acopla el servicio especializado al cliente de otro dominio.

**Requerido antes de ampliar este servicio:** registrar el endpoint en `API_ENDPOINTS` y consumirlo desde el servicio o desde un cliente HTTP compartido.

### Baja — Quedan riesgos de cobertura no bloqueantes

Las pruebas ya fijan cantidad y orden exactos de las 19 columnas, loading, vacío, error, filtros acumulativos, navegación y reinicio del bloque al limpiar. No verifican todavía los valores de horas/costo/empleados después de filtrar, la navegación de fila con Enter/Espacio ni el comportamiento real de scroll a distintos tamaños de viewport. El servicio solo cubre la respuesta HTTP exitosa.

**Recomendado:** añadir esos casos cuando se amplíe la vista y mantener una comprobación responsive manual.

### Baja — El nombre del resumen sigue aplicado a un contenedor genérico

La terminología ya es coherente, pero `aria-label="Resumen de registros filtrados"` permanece en un `div` sin `role` (`CalculoListView.tsx:179`). Ese nombre puede no exponerse como agrupación en el árbol de accesibilidad. Las etiquetas y valores individuales sí conservan un orden de lectura comprensible, por lo que no bloquea.

**Recomendado:** usar `role="group"`/`role="region"` con nombre accesible, o estructurar los indicadores como una lista descriptiva.

## 3. Verificaciones satisfactorias

- El contrato operativo contiene exactamente 19 definiciones y 19 accessors, en el orden documentado: cédula, empleado, salario, base hora, aplica HE, empresa, sucursal, fecha, OT/CC, sub./subc., especialidad OT, cantidad, ubicación, novedad, cantidad de horas, observaciones, responsable, encargados y cliente.
- El DTO contiene las 19 columnas más `fila_id`, `calculo_id`, `costo_total` y `estado`, sin `any`.
- Todas las columnas ofrecen filtro categórico; los filtros son acumulativos, usan opciones en cascada y normalizan opcionales como “No disponible”.
- La carga incremental monta 100 filas inicialmente y agrega bloques de hasta 100; el límite vuelve a 100 al consultar o cambiar un filtro.
- La limpieza global de filtros también restablece el bloque visible a 100 filas y está cubierta por prueba.
- Loading, error y vacío son estados distintos. El error usa `Callout`, `role="alert"` y acción de reintento.
- La navegación de retorno va al hub de Tiempo y Asistencia y cada fila abre el detalle mediante `calculo_id`; `DataTableRow` aporta Enter/Espacio.
- La vista usa átomos/moléculas existentes, variables CSS, texto en español y estructura mobile-first. En móvil limita la tabla a `70vh`; en escritorio la integra en el alto disponible. No introduce colores legacy ni HTML interactivo crudo en los archivos focales.
- El resumen usa consistentemente la terminología “filtrados”.
- La prueba contractual compara el arreglo completo de encabezados, por lo que protege cantidad y orden exactos.
- Todos los archivos focales están por debajo del máximo de 550 líneas.

## 4. Tests y comprobaciones

Evidencia aportada por el solicitante, no reejecutada por este revisor debido a las restricciones del rol:

- 10 pruebas focales — **PASS reportado**.
- ESLint directo sobre el alcance — **PASS reportado**.
- Build Vite de producción, 4042 módulos — **PASS reportado**.

Antes de merge siguen identificados los checks de proyecto desde `frontend/`:

1. `npm run lint` completo, si el ESLint reportado fue solo focal.
2. `npm run test` completo, además de las ocho pruebas focales.
3. `npm run build` ya cuenta con evidencia PASS; repetir únicamente si cambia el código.
4. Validación manual mobile/desktop del scroll, encabezado, filtros portaled y bloques de 100 filas.

## 5. Riesgos de sistema de diseño

- No quedan incumplimientos materiales del sistema de diseño en los archivos focales.
- **Bajo:** el comportamiento responsive real y la navegación por teclado dependen de `DataTable` y no tienen una prueba focal específica en esta vista.
- **Bajo:** el contenedor del resumen tiene nombre accesible, pero no una semántica agrupadora que garantice su exposición.
- No hay riesgo de modal en este alcance.

## 6. Razones de bloqueo

Ninguna. El único hallazgo de severidad media restante es la centralización del endpoint; no altera el comportamiento verificado de la vista, pero mantiene una deuda arquitectónica explícita.

## 7. Decisión final

- [ ] `approved`
- [x] `approved_with_risks`
- [ ] `blocked`
