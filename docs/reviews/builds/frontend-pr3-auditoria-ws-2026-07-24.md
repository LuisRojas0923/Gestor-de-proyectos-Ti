# Revisión frontend del plan PR3 — WebSocket de indicadores de auditoría

**Fecha:** 2026-07-24  
**Plan:** Integración posterior a PR2 del WebSocket en el dashboard de auditoría  
**Autor del plan:** Orquestador / solicitud de revisión  
**Modo:** plan  
**Proyecto:** Gestor-de-proyectos-Ti

## Resultado

**Frontend review: approved_with_risks** para la preparación aislada. La integración en la página y cualquier contrato de autenticación WebSocket quedan **bloqueados hasta que PR2 esté en `main`** y su contrato final esté verificado.

## 1. Base revisada

- El checkout está limpio y alineado con `origin/main` en `e65449c5`.
- `frontend/src/pages/ServicePortal/pages/AuditoriaIndicadores/hooks/useAuditoriaStats.ts` mantiene actualmente una responsabilidad HTTP: carga estadísticas, periodo, fechas, error y recarga.
- `useAuditoriaStats` ya consume `API_ENDPOINTS.AUDIT_STATS`; no debe mezclarse con una conexión WebSocket ni cambiarse su contrato de retorno de forma implícita.
- `AuditoriaIndicadores/index.tsx` ya separa la página, los componentes visuales y el hook HTTP, aunque el loader usa directamente `Loader2` y todavía hay clases visuales no tokenizadas en el encabezado.
- El router backend presente en `main` expone `/auditoria/estadisticas`, pero no contiene todavía el endpoint WebSocket del dashboard. Por tanto, el path, handshake, esquema de mensajes, códigos de cierre y política de reconexión de PR2 no son una dependencia disponible en esta base.
- `frontend/vite.config.ts` habilita `ws: true` para `/api/v2`, pero esto no sustituye la validación del endpoint detrás de Nginx/staging.

## 2. Arquitectura recomendada

1. Mantener `useAuditoriaStats` como **fuente de verdad HTTP**. El WebSocket debe ser un canal de invalidación/notificación, no una segunda fuente de datos.
2. Crear un hook separado, por ejemplo `useAuditoriaDashboardSocket`, que exponga un estado tipado (`disabled`, `connecting`, `connected`, `reconnecting`, `offline`, `unauthorized`) y una señal de actualización validada.
3. Ante un mensaje válido de actualización, ejecutar una sola recarga HTTP silenciosa y agrupada. No mutar `estadisticas` desde el socket ni iniciar una petición por cada mensaje.
4. Si la recarga silenciosa requiere una nueva superficie (`recargarSilencioso`, `onInvalidate` o single-flight), añadirla únicamente después de integrar PR2 y comprobar su contrato. No duplicar coalescing ni control de carreras dentro del hook WebSocket.
5. Centralizar el endpoint y el resolvedor de URL WebSocket en `frontend/src/config/api.ts`. El hook no debe contener `/api/v2/auditoria/ws/dashboard`, `localhost:8000` ni URLs literales.
6. El formato de autenticación debe consumir exactamente el contrato aprobado por PR2. No enviar JWT en `?token=` por defecto: expone credenciales en URLs, logs y telemetría. La opción final puede ser cookie de sesión o subprotocolo acordado, pero debe coincidir con backend, proxy y pruebas.

## 3. Qué puede prepararse ahora sin tocar archivos de PR2

Estas piezas pueden desarrollarse como cambios nuevos y aislados, sin modificar `useAuditoriaStats.ts`, `AuditoriaIndicadores/index.tsx` ni los archivos backend de PR2:

- Diseñar el contrato TypeScript del evento de invalidación y un parser/runtime guard que ignore JSON inválido o tipos de mensaje desconocidos.
- Preparar un hook nuevo con `WebSocket` inyectable/factory, endpoint configurable, cleanup explícito y callbacks (`onInvalidate`, `onStatusChange`). Debe permanecer sin conexión efectiva hasta que el endpoint y handshake de PR2 estén confirmados.
- Extraer un helper puro de backoff con límites configurables. Propuesta: 1 s, 2 s, 4 s, 8 s, 16 s y máximo 30 s, con máximo de intentos definido y reintento manual; si se añade jitter, debe ser inyectable para probarlo determinísticamente.
- Preparar pruebas unitarias del hook nuevo con fake timers y un WebSocket mock, usando el contrato como fixture reemplazable, no una URL inventada.
- Preparar un componente visual aislado de estado de conexión que reutilice `Badge`, `Text`, `Button`, `Spinner` y `Callout`, con tokens CSS y textos en español. No debe conectarse ni renderizarse aún desde la página.
- Añadir pruebas de regresión nuevas para confirmar que el hook HTTP sigue formando `API_ENDPOINTS.AUDIT_STATS`, conserva parámetros de fecha, maneja respuesta vacía/error y permite recarga manual. Añadir archivos de test no obliga a editar el hook HTTP.
- Documentar en el plan/ADR o build report el contrato pendiente: endpoint, autenticación, origen permitido, envelope de mensaje, códigos de cierre, TTL/revalidación, límite de conexiones y comportamiento multi-worker.

La adición final de una constante en `config/api.ts` puede prepararse en una rama separada solo si PR2 no modifica ese archivo; su valor definitivo debe esperar al path real y a la estrategia de base URL aprobada.

## 4. Qué debe esperar a que PR2 entre a `main`

| Trabajo | Motivo de espera | Puerta requerida |
|---|---|---|
| Conectar el hook desde `AuditoriaIndicadores/index.tsx` | La página debe conocer el contrato estable del evento y del estado de autorización. | PR2 integrado, diff rebasado y build verde. |
| Modificar `useAuditoriaStats.ts` para recarga silenciosa, abort/coalescing o single-flight | Es un archivo sensible de PR2; editarlo antes puede reintroducir carreras, romper su API HTTP o producir conflictos. | Tests HTTP existentes/nuevos y revisión del diff post-merge. |
| Fijar `AUDIT_DASHBOARD_WS` y el resolvedor de URL | El backend actual en `main` no ofrece aún ese endpoint y la base puede ser relativa o absoluta. | Contrato PR2 + verificación local con Vite y staging con Nginx. |
| Implementar el handshake de auth | El navegador no permite añadir libremente `Authorization` a `new WebSocket`; query string no debe asumirse. | Decisión de seguridad de PR2, 401/403/1008 probados y token no expuesto en URL. |
| Mapear `unauthorized`, `offline`, `reconnecting` y cierre permanente | Los códigos/reasons deben distinguir permiso revocado de fallo de red para no crear loops ni cerrar sesión indebidamente. | Tabla de códigos de cierre acordada y pruebas backend/frontend. |
| Conectar invalidación a recargas HTTP | Requiere saber si PR2 emite un evento por mutación, si existe payload o solo señal, y qué frecuencia soporta el backend. | Prueba de ráfaga, debounce/coalescing y ausencia de peticiones concurrentes. |
| Validación E2E y smoke integrado | El proxy WebSocket, `Origin`, auth y múltiples workers no se pueden certificar desde la UI aislada. | PR2 en `main`, staging operativo y evidencia sobre el SHA integrado. |

## 5. Requisitos funcionales y UX

### HTTP y actualización en tiempo real

- La carga inicial conserva `loading`; durante una actualización silenciosa se mantiene visible el último dashboard válido y se muestra un indicador no bloqueante de “Actualizando…”.
- Un error HTTP inicial muestra `Callout` con acción de reintento. Un error durante una recarga conserva los datos anteriores, identifica que están desactualizados y no los confunde con un estado vacío.
- “Sin conexión en tiempo real” debe ser un estado del WebSocket, no un error HTTP. El dashboard debe seguir utilizable y actualizable manualmente por HTTP.
- Mensajes repetidos deben agruparse en una ventana corta y dejar como máximo una recarga pendiente mientras otra está en curso. No debe haber tormenta de requests ni respuestas antiguas sobrescribiendo datos nuevos.
- El estado vacío debe depender de un payload HTTP válido sin eventos (`total_eventos === 0`/colecciones vacías), no de una caída del WebSocket ni de un error de red.
- Al cerrar sesión, cambiar de ruta o desmontar, se cancelan debounce/backoff, se anulan callbacks del socket y no se abre una conexión nueva.

### Reconexión y red

- `connecting` y `reconnecting` deben tener feedback visible y textual; nunca depender solo del color.
- Cierres intencionales, cierre normal y cierres de autorización/permanentes no deben reintentarse automáticamente.
- Fallos transitorios usan backoff exponencial acotado, con límite de intentos y botón de reintento manual. El contador se reinicia solo tras una conexión estable, no inmediatamente en `onopen`.
- `offline` del navegador pausa reintentos; `online` inicia un intento controlado. Se debe distinguir `navigator.onLine` de un socket cerrado por el servidor.
- Una respuesta HTTP 401 debe seguir el flujo existente de auth; una negativa WebSocket no debe hacer logout ni mostrar una cascada de toasts sin una decisión explícita de PR2.

### Responsive

- Conservar la progresión mobile-first existente del encabezado y `PeriodSelector` (`flex-col`/`grid-cols-1`, expansión desde `sm`/`lg`).
- El indicador de conexión debe poder envolver en 320/375 px y no desplazar ni comprimir el botón “Actualizar”. Usar `min-w-0`, `flex-wrap` y anchos fluidos; no introducir `w-*` fijo para el estado.
- Validar 320, 375, 768, 1024 y 1440 px, zoom 200 %, claro/oscuro y `prefers-reduced-motion`.
- Si PR3 agrega una tabla de eventos, debe reutilizar `DataTable`/componentes aprobados, mantener contenedor scrollable y encabezado sticky, y definir una estrategia móvil; no añadir una tabla cruda ni filtros inline improvisados.

### Accesibilidad y sistema de diseño

- Estado de conexión: `role="status"`, `aria-live="polite"`, `aria-atomic="true"` y texto español; no comunicar éxito/fallo solo mediante color o icono.
- Error accionable: `Callout` con `role="alert"`; reintento mediante el átomo `Button` con nombre accesible y estados hover/active/disabled/loading.
- Carga: reutilizar `Spinner`/`Skeleton` y anunciarla sin duplicar mensajes para lectores de pantalla. El loader actual con `Loader2` directo debe normalizarse si se modifica esa zona.
- Usar `Badge`, `Text`, `Title`, `MaterialCard`, `Callout` y tokens `var(--color-*)`. No añadir `bg-white`, `text-black`, colores semánticos Tailwind ni hexadecimales en el nuevo flujo.
- Los iconos decorativos deben tener `aria-hidden`; las acciones deben ser botones reales del sistema, nunca `div` con `onClick`.
- PR3 no necesita modal. Si se incorpora uno, debe seguir el patrón de `AdminLoginLock`: portal, `role="dialog"`, `aria-modal`, `aria-labelledby`, foco inicial/trap/restauración, Escape y bloqueo de scroll, con test equivalente.

## 6. Hallazgos del plan

### Alto — dependencia de contrato PR2 no cerrada

El `main` revisado no contiene el endpoint WebSocket de auditoría. Sin contrato final de ruta, auth, `Origin`, mensajes y cierres no es seguro cablear el dashboard. **Bloquea la integración, no la preparación aislada.**

### Alto — riesgo de romper o duplicar HTTP

Acoplar el socket dentro de `useAuditoriaStats` o llamar `recargar` por cada mensaje puede causar requests concurrentes, respuestas fuera de orden y carga excesiva. La separación de hooks y la invalidación agrupada son requisitos, no una optimización opcional.

### Alto — autenticación WebSocket indefinida

No se debe copiar una implementación histórica que construya `localhost:8000` o añada el JWT a la query. El handshake debe esperar a PR2 y a la revisión de seguridad; la URL debe salir de `config/api.ts`.

### Medio — estados mezclados

`HTTP error`, `datos vacíos`, `WS caído` y `datos desactualizados` son estados distintos. El plan debe mantenerlos separados para no ocultar datos válidos ni presentar una pantalla vacía como error silencioso.

### Medio — cobertura actual insuficiente

El test actual de `AuditoriaIndicadores` cubre datos, error y actualización manual, pero no cubre hook HTTP, socket, backoff, offline, cleanup, mensajes inválidos, accesibilidad del estado ni responsive. PR3 debe agregar cobertura focalizada antes de integrar.

### Bajo — normalización visual pendiente

La página conserva algunos estilos directos (`bg-white`, `dark:bg-neutral-800`, `border-slate-*`) y usa `Loader2` en vez del átomo `Spinner`. No bloquea la preparación del hook, pero cualquier edición de esa zona debe corregirlo para no ampliar la deuda de tokens.

## 7. Matriz de pruebas obligatoria

### Hook WebSocket

- Sin token/sesión: no conecta o queda `disabled` según el contrato final.
- URL y handshake provenientes de configuración; nunca `localhost` hardcodeado ni JWT en query.
- `onopen` → `connected`; cierre transitorio → `reconnecting` y backoff esperado.
- Cierre normal, permanente o autorización (`1008` si PR2 lo adopta) → sin loop de reconexión.
- Límite de intentos, backoff máximo, jitter determinista si aplica y reintento manual.
- Mensaje válido de actualización, mensaje desconocido, JSON inválido y ráfaga de mensajes.
- `offline`/`online`, cambio de token si aplica, desmontaje con fake timers y socket en `CONNECTING`.
- Cero reconexiones o callbacks después del cleanup.

### Integración HTTP/UI

- Carga inicial, recarga silenciosa, error inicial, error con datos previos, vacío y éxito.
- El evento WS provoca como máximo una recarga HTTP agrupada y no modifica el contrato de `useAuditoriaStats`.
- Periodos `hoy`, `7dias`, `30dias` y personalizado; fechas incompletas/invertidas según el contrato HTTP.
- Botón “Actualizar” con loading/disabled y reintento de conexión con nombre accesible.
- Estados de conexión anunciados con `role=status`/`aria-live`; error con `role=alert`.
- 320/375/768/1024/1440 px, teclado, zoom 200 %, tema claro/oscuro y movimiento reducido.

No hay un modal nuevo en este alcance; por ello el patrón `AdminLoginLock.test.tsx` solo aplica si el diseño futuro introduce un diálogo.

## 8. Checks requeridos

No se ejecutaron comandos de frontend por la restricción read-only del revisor y porque se solicitó revisión de plan, no build.

Desde `frontend/`, después de integrar PR2 y el wiring de PR3:

- `npm run lint`
- `npm run test -- --run` (incluye tests del hook, estados HTTP/WS, timers y accesibilidad)
- `npm run build`

Además: smoke con login autorizado/no autorizado, proxy WebSocket, reconexión, actualización HTTP posterior al evento, logout/desmontaje y funcionamiento offline. La evidencia debe corresponder al SHA integrado, no a una rama anterior.

## 9. Documentación y seguimiento

- Documentar contrato WS, autenticación, códigos de cierre, `Origin`, límite de conexiones, multi-worker y envelope de mensajes en una ADR o documento equivalente si PR2 lo hace durable.
- Registrar en el build report las suites, timers falsos, casos de 401/403/1008, offline y evidencia detrás del proxy.
- No cambiar `docs/ESQUEMA_BASE_DATOS.md` salvo que PR2 agregue DDL/migraciones.
- Mantener todos los textos visibles nuevos en español.

## Decisión final

- [ ] aprobado sin riesgos
- [x] aprobado con riesgos: preparación aislada permitida
- [ ] bloqueado como plan

**Condición de integración:** no conectar el hook al dashboard ni cerrar el contrato de endpoint/auth hasta que PR2 esté en `main`, se revise el diff resultante y pasen lint, tests y build. La revisión de PR3 debe repetirse sobre esa base.
