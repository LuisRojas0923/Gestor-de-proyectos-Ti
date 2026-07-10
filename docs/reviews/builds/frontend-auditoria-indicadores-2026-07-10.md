# Frontend review: blocked

**Alcance:** diff actual, incluido el archivo no versionado `frontend/src/pages/ServicePortal/pages/AuditoriaIndicadores/index.test.tsx`.

## Findings

### Alta — regresión de idioma y comprensión en actividad por módulo

- `components/EventosPorModulo.tsx:6-8,49,176-178` reemplaza el humanizador por capitalización mecánica y muestra `evento.accion` casi crudo.
- Valores reales como `auth`, `service-portal`, `login` y `logout` pasan a verse como “Auth”, “Service-portal”, “login” y “logout”, en vez de “Control de Acceso”, “Portal de Servicios TI”, “Inició sesión” y “Cerró sesión”. También se pierde el contexto detallado que antes daba `humanizarAccionDetallada`.
- Esto incumple el requisito de texto visible en español y degrada precisamente uno de los cuatro bloques que permanecen en el dashboard.
- **Bloqueo:** conservar un humanizador pequeño y específico para los módulos/acciones todavía visibles, o mover esa presentación a una utilidad reutilizable sin restaurar las tablas y modales retirados.

### Media — el acordeón no es operable con teclado

- `components/EventosPorModulo.tsx:113-123` implementa la expansión con `onClick` sobre un `div` sin `button`, `tabIndex`, evento de teclado, `aria-expanded` ni `aria-controls`.
- El detalle de actividad queda inaccesible para teclado y su estado no se anuncia a tecnologías de asistencia.
- Usar el átomo `Button` con variante visual apropiada o un control semántico equivalente.

### Media — estados asíncronos sin semántica accesible y banner reimplementado

- `index.tsx:55-62` no expone `role="alert"` para el error ni `role="status"`/`aria-live` para la carga.
- El error se construye con `MaterialCard` y colores inline, pese a existir la molécula `Callout`.
- La actualización con datos existentes conserva el contenido anterior y solo cambia el botón; conviene anunciar que la actualización está en curso.

### Media — endpoint fuera del SSOT de API

- `hooks/useAuditoriaStats.ts:28` mantiene `/auditoria/estadisticas` como string local en un archivo modificado.
- Debe agregarse una constante a `frontend/src/config/api.ts` y consumirse desde el hook.

### Media — responsive móvil frágil en filtros y gráficas

- `components/EventosPorModulo.tsx:82-97` mantiene el encabezado en una sola fila desde móvil mientras el selector solicita `w-full`; el título y el filtro pueden comprimirse o desbordarse. Debe ser `flex-col` y cambiar a fila desde `sm`.
- `components/PeriodSelector.tsx:62-77` mantiene dos inputs de fecha en una fila, con ancho automático y sin etiquetas. En viewport estrecho puede desbordar y los controles carecen de nombre accesible. Aunque no fue modificado, sigue siendo parte del flujo conservado y debe validarse/corregirse.
- Los grids principales sí siguen una progresión mobile-first (`1 → 2 → 4` KPIs y `1 → 2` gráficas).

### Baja — tokens visuales incumplidos

- `index.tsx:30,56`, `components/KpiCards.tsx:12-19,31-42,53,67` y `components/TiposFallos.tsx:14-19` usan colores Tailwind o hexadecimales directos en vez de variables/tokens semánticos.
- No es una regresión principal de este recorte, pero impide afirmar cumplimiento pleno del design system y puede producir divergencias entre temas.

### Baja — cobertura focal insuficiente para los estados conservados

- El nuevo `index.test.tsx` cubre contenido, error y actualización manual, pero no verifica loader accesible, botón deshabilitado durante carga, ausencia de los bloques retirados ni los estados vacíos/filtros/acordeón.
- No se requieren tests de modal porque este build elimina los modales y no introduce formularios nuevos.

## Aspectos conformes

- Se eliminaron WebSocket, tablas y modales opcionales sin dejar imports/estado asociados en la página y se redujo la petición a estadísticas.
- La eliminación de `useApi<any>()`, el tipado de `CustomTooltip` y el uso de `catch (e)` evitan nuevos `any` y `catch (err: any)`.
- Se reutilizan `Title`, `Text`, `Button`, `Input`, `Select`, `ProgressBar` y `MaterialCard`; no se añadieron tablas crudas.
- Hay estados visible de carga, error y vacío, aunque falta semántica accesible en carga/error.
- Todos los archivos revisados quedan por debajo de 550 líneas; la página conserva separación en componentes y hook.
- Al retirar tablas, no aplican en este alcance los requisitos de sticky header, filtros Excel-like o virtualización.
- Al retirar modales, no quedan nuevos riesgos de focus trap, Escape, scroll lock o atributos de diálogo en esta vista.

## Required checks

Evidencia declarada por el solicitante, no reejecutada por restricción read-only del revisor:

- TypeScript `noEmit`: pasa.
- Lint focal: pasa.
- Build de producción: pasa.
- 3 tests focales de `AuditoriaIndicadores`: pasan.

Antes de integrar, además corresponde confirmar desde `frontend/`: `npm run lint`, `npm run test` y `npm run build` completos, o documentar por qué el lint/test focal es suficiente.

## Design-system risks

- Colores no tokenizados.
- `Callout` no reutilizado para error.
- Control expansible construido sobre `div` no semántico.
- Etiquetas técnicas/inglesas visibles tras retirar el humanizador.

## Blocking reasons

La actividad por módulo expone etiquetas técnicas o inglesas y pierde descripciones españolas comprensibles. Debe resolverse la regresión de humanización antes de aprobar. Las observaciones de accesibilidad del acordeón y estados asíncronos deberían corregirse en el mismo ciclo por afectar funciones que permanecen en el dashboard.
