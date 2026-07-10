# Revisión frontend read-only — dos ramas antes de merge

**Fecha:** 2026-07-10
**Comparaciones solicitadas:**

- `origin/main...origin/NOVEDADES_NOMINA_V2`
- `origin/main...origin/indicadores_auditoria_del_sistema`

**Resultado global:** `blocked`
**Ejecución:** inspección estática; por restricción del revisor no se ejecutaron lint, tests ni build.

## Resumen por rama

| Rama | Resultado | Frontend observado en triple-dot | Decisión |
|---|---|---:|---|
| `NOVEDADES_NOMINA_V2` | `approved_with_risks` | 2 archivos, +11/-10 | Puede integrarse después de rebase/merge de `origin/main` y checks verdes. |
| `indicadores_auditoria_del_sistema` | `blocked` | 35 archivos frontend, incluida `frontend/dist/index.html`, +~2.6k líneas netas | No integrar hasta corregir compilación, restaurar UX de auditoría, tipado, a11y y pruebas. |

## Hallazgos

### Bloqueantes — `indicadores_auditoria_del_sistema`

1. **El nuevo dashboard no compila por contrato inconsistente del hook.** `AuditoriaIndicadores/index.tsx:24-31` extrae `setEstadisticas`, `setIsLoading` y `setError`, pero `hooks/useAuditoriaStats.ts:128-146` no devuelve esas propiedades. TypeScript debe rechazar esas desestructuraciones.

2. **Tipado incompatible en metadatos.** `UltimosEventosTable.tsx:38-43` y `:285-290` entrega `row.metadatos.cedula_consultada` (`unknown`, porque `metadatos` es `Record<string, unknown>`) a `String.prototype.includes`. Debe existir un type guard/modelo explícito. El archivo también usa `as any` en variantes de `Badge` (`:261`, `:295`), y el módulo acumula `useApi<any>`, arreglos `any[]`, `timeoutId: any`, callbacks `any` y `humanizarAccionDetallada(row: any)`.

3. **Regresión funcional en la auditoría existente.** `AuditoriaSistema/index.tsx` elimina `AuditoriaEventosTable`, `useColumnFilters`, filtros en cascada, ordenamiento, indicador global y limpieza de filtros, reemplazándolos por `UltimosEventosTable`. La nueva tabla usa filtros globales parciales, no filtros Excel-like por columna. Esto contradice el patrón aprobado de `DataTable`/`useColumnFilters` y reduce las capacidades del módulo existente.

4. **Carga no conectada a la tabla.** `UltimosEventosTable` recibe y desestructura `isLoading` (`:8`, `:138`) pero no lo pasa a ninguna instancia de `DataTable`. En carga inicial o al abrir `UserEventsModal`/`RouteEventsModal`, el usuario puede ver prematuramente el estado vacío en vez del skeleton/spinner.

5. **Endpoints fuera del SSOT.** `useAuditoriaStats.ts:34-39`, `KpiUsersModal.tsx:36`, `UserEventsModal.tsx:39`, `RouteEventsModal.tsx:39` y `useAuditoriaEventos.ts:33` construyen literalmente `/auditoria/...`; los WebSockets se construyen con `/api/v2/auditoria/ws/dashboard` y `localhost:8000` en dos hooks. Deben existir constantes en `config/api.ts`, incluida una resolución configurable de WebSocket.

6. **A11y insuficiente en las nuevas interacciones.** Aunque se reutiliza `Modal`, el componente compartido solo aporta portal, `role="dialog"`, `aria-modal` y scroll lock; no implementa `aria-labelledby`, focus trap, foco inicial/restauración ni cierre con Escape. Además, las KPI cards y filas/acordeones son `MaterialCard`/`div` con `onClick`, sin semántica de botón, teclado, `aria-expanded` ni foco. Los tres modales nuevos requieren pruebas equivalentes al patrón `AdminLoginLock.test.tsx`.

7. **No hay pruebas frontend nuevas.** Se agregan tres modales, filtros de período, tablas, gráficas, WebSocket/reconexión y lógica de severidad/humanización, pero el diff no agrega ningún `*.test.tsx`/`*.test.ts`. No hay cobertura de éxito, error, vacío, carga, fechas, filtros, teclado, modal o reconexión.

### Altos — `indicadores_auditoria_del_sistema`

8. **La reconexión WebSocket puede sobrevivir al desmontaje.** En ambos hooks, el cleanup llama `socket.close()` antes de que `onclose` programe el nuevo timeout; ese callback puede ejecutarse después del `clearTimeout` y reconectar una vista desmontada. Falta bandera de cierre intencional, cancelación robusta y pruebas con timers falsos.

9. **Design system inconsistente.** Hay abundantes colores Tailwind hardcodeados (`bg-white`, `neutral-*`, `blue-*`, `red-*`, `emerald-*`, `amber-*`, hex en gráficas) en vez de tokens semánticos. El error de `index.tsx:70-72` recrea un banner con `Card` en lugar de `Callout`; los spinners se reimplementan con `div`/`Loader2` en vez de `Spinner`/`Skeleton`. También hay múltiples primitivas interactivas crudas.

10. **Responsive móvil de tablas y filtros no está resuelto.** En `UltimosEventosTable`, los controles tienen anchos fijos `w-56`/`w-48` dentro de un `flex-wrap`, y la tabla conserva siete columnas de alta densidad sin vista de tarjetas/priorización móvil. En `PeriodSelector`, las dos fechas están en una fila sin `flex-col` móvil. Debe validarse 320/375 px, zoom 200 % y scroll horizontal sin doble scroll dentro de modales.

11. **Filas y keys inestables.** El modo agrupado usa `group.usuario_id || Math.random().toString()` como key. Debe ser determinista. `TopRutasTable` y `TopUsuariosTable` pasan extractores con segundo parámetro aunque el contrato de `DataTable` declara `keyExtractor: (row: T) => string`; verificar/corregir con TypeScript estricto.

12. **Riesgo de datos y UX al cambiar período.** Mientras ocurre una recarga, se conserva el dashboard anterior sin indicador claro de actualización. En período personalizado no hay validación visible de fechas requeridas, `desde <= hasta`, ni deshabilitado del refresh. Los errores de los modales solo van a consola; el usuario recibe una lista vacía indistinguible de “sin resultados”.

13. **Archivos nuevos sin integración.** `AlertasSeguridad.tsx`, `DistribucionHorarios.tsx`, `OrigenDispositivo.tsx` y `SemaforoRiesgo.tsx` se agregan pero no son importados/renderizados por `AuditoriaIndicadores/index.tsx`. Son alcance muerto y aumentan mantenimiento sin funcionalidad visible.

14. **Hardcodes y textos abreviados.** Aparecen “usr/usrs”, “evts”, “N/A”, rutas/endpoints y comentarios de producto incrustados. Los textos operativos deben permanecer claros y en español; etiquetas técnicas solo donde aporten valor.

### Riesgos — `NOVEDADES_NOMINA_V2`

15. **La rama ya fue integrada parcialmente.** `origin/main` contiene el merge PR #9 (`e88dc525`), mientras la rama conserva dos commits posteriores (`7b28a55a`, `e4cffce7`) y no contiene el merge commit. El triple-dot solicitado muestra correctamente solo dos archivos, pero debe sincronizarse con `origin/main` antes de integrar para evitar una historia/conflicto engañosos.

16. **Cast que oculta un contrato incompleto.** `AutocompleteUserField.tsx:91` usa `user as unknown as { cargo?: string }`; `CustomNodeComponent.tsx:70-71` amplía el tipo mediante cast. Preferible corregir `HierarchyUser` como SSOT si `cargo` es parte real de la respuesta, en vez de duplicar casts.

17. **La limitación a 50 sugerencias necesita UX verificable.** `AutocompleteUserField.tsx:41` mejora rendimiento, pero no avisa que existen más coincidencias ni ofrece búsqueda remota/paginada. Validar que el usuario pueda encontrar registros fuera de las primeras 50 coincidencias y que el orden sea determinista.

18. **Calidad menor.** `git diff --check` detecta whitespace final en `CustomNodeComponent.tsx:26`. No hay tests nuevos para valores nulos ni límite de autocompletado.

## Discrepancias de alcance y archivos generados

- El triple-dot de auditoría mezcla la funcionalidad de indicadores con cambios en Auditoría general, Líneas Corporativas, Inventario, Viáticos, Reserva de Salas, Estado de Cuenta, `DataTable`, tipos compartidos y numerosos archivos backend. El nombre de rama no refleja este alcance transversal.
- `frontend/dist/index.html` está modificado y apunta a nuevos hashes de assets, pero el diff no agrega esos assets. Es un artefacto generado, no fuente; retirarlo del PR o versionar el bundle completo conforme a la política del repositorio. En su estado actual puede dejar un `dist/` inconsistente.
- La rama de auditoría incluye scripts diagnósticos en raíz/backend (`check_*.py`, `clear_logs.py`), tests duplicados en `backend_v2/` y `testing/backend/`, y `testing/backend/.env.test`. Requiere revisión de alcance, seguridad y docs-tests antes del merge.
- La rama de auditoría está muy detrás de `origin/main`. El diff de dos puntos (`origin/main..rama`) muestra cerca de 130 archivos, incluidas eliminaciones de tests, documentación, componentes de jerarquía, memoria de revisores y archivos móviles. Aunque no forman parte del triple-dot solicitado, serán riesgo real de merge. **Rebase/merge de main y nueva revisión son obligatorios.**
- Ningún archivo nuevo supera 550 líneas (`UltimosEventosTable.tsx` llega a 436), pero debe evitarse que crezca; severidad, parseo de user-agent y definición de columnas deberían extraerse. `ServicePortal.tsx` continúa como punto de integración monolítico y merece control de tamaño tras sincronizar ramas.

## Matriz de pruebas por merge

### Merge 1 recomendado: `NOVEDADES_NOMINA_V2`

| Momento | Tipo | Prueba | Criterio |
|---|---|---|---|
| Antes | Sincronización | Rebase/merge de `origin/main`; revisar nuevamente `origin/main...rama` | Solo quedan los dos fixes intencionales; sin reintroducciones del PR ya fusionado. |
| Antes | Estática | `npm run lint` desde `frontend/` | 0 errores; corregir whitespace/casts reportados por reglas. |
| Antes | Tipos/build | `npm run build` | 0 errores TypeScript/Vite. |
| Antes | Unitarias | `npm run test -- --run` y tests focales del organigrama | Nulos en `id/nombre/cargo`, fallback a `rol`, búsqueda por nombre/cédula, tope 50. |
| Antes | Manual desktop | Organigrama: seleccionar, expandir/contraer, vacantes, búsqueda >50 resultados | Sin textos `undefined`, nodos seleccionables y resultado localizable. |
| Antes | Manual responsive | 320, 375, 768, 1024 y desktop; claro/oscuro | Dropdown no se recorta, teclado/foco funciona, no hay overflow inesperado. |
| Después | Smoke integrado | Login → Portal → Jerarquía; repetir selección y búsqueda | Sin regresión con `main` ni errores de consola. |
| Después | Regresión | `npm run lint`, `npm run test -- --run`, `npm run build` sobre commit merge | Los tres verdes; diff final sin `dist/` accidental. |

### Merge 2: `indicadores_auditoria_del_sistema` (solo tras desbloqueo)

| Momento | Tipo | Prueba | Criterio |
|---|---|---|---|
| Antes | Sincronización/alcance | Rebase/merge sobre main ya actualizado; revisar triple-dot y two-dot | Sin borrados/reversiones ajenos; retirar scripts/artefactos no aprobados. |
| Antes | Estática | `npm run lint` | 0 errores, imports sin uso, `any`/casts y hooks conformes. |
| Antes | Tipos/build | `npm run build` | 0 errores; corrige contrato de `useAuditoriaStats`, metadatos y extractores. |
| Antes | Suite | `npm run test -- --run` | Suite completa verde y sin timers/sockets abiertos. |
| Antes | Unitarias hook | `useAuditoriaStats` y `useAuditoriaEventos` con fetch/WS mock | éxito/error, fechas, refresco silencioso, mensaje inválido, error WS, reconexión y cleanup sin reconectar. |
| Antes | Unitarias UI | Dashboard, período, KPIs, tablas y humanizer | carga/vacío/error/datos; filtros; orden; severidad; fechas/zonas; claves desconocidas; no mutar props. |
| Antes | Modales/a11y | KPI/User/Route + detalle, siguiendo `AdminLoginLock.test.tsx` | `dialog`, nombre accesible, foco atrapado/restaurado, Escape, overlay, scroll lock, carga/error/vacío. |
| Antes | Regresión tabla | Auditoría general y `DataTable` | sticky header, filtros Excel-like por columna, indicador/limpieza, sort, paginación y click/foco de fila. |
| Antes | Manual responsive | 320/375/768/1024/1440, zoom 200 %, claro/oscuro | Sin clipping/doble scroll; fechas y controles apilables; gráficas legibles; alternativa/tabla accesible. |
| Antes | Manual RBAC | admin con permiso, usuario sin permiso, módulo deshabilitado, URL directa | Tarjeta/ruta coherentes; sin flash ni acceso visual indebido; 403 manejado en español. |
| Antes | Manual red | API lenta, 401/403/500, offline, WS caído/reconectado | Feedback visible, datos viejos identificables, sin bucle de reconexión ni spam de toasts. |
| Antes | Manual flujos tocados | PDF/XLSX de viáticos, inventario, reserva, envío/eliminación de gastos | Acción principal no falla si falla auditoría; no duplica evento; auth y descarga conservadas. |
| Después | Smoke integrado | Portal → tarjeta Auditoría → filtros → KPI → los tres modales → detalle → paginación | Flujo completo estable, teclado y móvil incluidos. |
| Después | Regresión automatizada | `npm run lint`, `npm run test -- --run`, `npm run build` en commit merge | Los tres verdes. |
| Después | Artefactos | Revisar `git diff` y despliegue | Sin `dist/index.html` huérfano; assets/build corresponden exactamente al commit si se versionan. |

## Condiciones para aprobación

1. Sincronizar ambas ramas con `origin/main` y repetir revisión del diff resultante.
2. Corregir los bloqueantes de TypeScript y obtener lint, tests y build verdes.
3. Restaurar o justificar formalmente los filtros por columna/ordenamiento de Auditoría general.
4. Centralizar endpoints y WebSocket en configuración.
5. Completar a11y de `Modal` e interacciones clicables, con tests.
6. Agregar cobertura frontend para hooks, filtros, modales, estados y reconexión.
7. Limpiar archivos generados, scripts diagnósticos, duplicados y componentes no integrados.
