# Re-revisión frontend final — Bitácoras Operacionales, fase técnica 0

**Fecha:** 2026-07-21
**Alcance:** `ProtectedRoute.tsx`, `NotificationsContext.tsx`, `notificacionesService.ts`, sus tres pruebas focales y las constantes de notificaciones añadidas en `config/api.ts`.
**Decisión:** **approved_with_risks**

Se ignoraron los cambios concurrentes ajenos al alcance indicado. Los bloqueos del informe inicial `frontend-bitacoras-operacionales-fase0-2026-07-21.md` están corregidos.

## Hallazgos restantes

### Baja — La cobertura aún no fija todas las garantías del ciclo de reconexión

La implementación actual mantiene un único socket/temporizador, obtiene un ticket por intento, descarta cierres de sockets obsoletos, aplica backoff exponencial con jitter, captura fallos del constructor y deja de programar reintentos cuando no hay token (`NotificationsContext.tsx:55-147`). Sin embargo, `NotificationsContext.test.tsx` solo prueba la apertura inicial y el reintento tras una excepción del constructor.

No quedan cubiertos explícitamente el cierre normal, `onerror`, el descarte de un `onclose` tardío, la ausencia de token, el límite de un temporizador, el reinicio del backoff tras `onopen`, el desmontaje durante una solicitud pendiente ni que cada reintento solicite un ticket diferente. La lógica revisada es correcta, por lo que este déficit no bloquea la fase, pero deja más exposición a regresiones futuras.

**Recomendado:** añadir esos casos con fake timers y sockets controlables antes de ampliar el canal de notificaciones.

### Baja — Las pruebas focales no restauran completamente globals, timers y almacenamiento

`NotificationsContext.test.tsx` sustituye `WebSocket`, escribe tokens y cambia a fake timers, pero no tiene un `afterEach` que ejecute `vi.unstubAllGlobals()`, `vi.useRealTimers()` y `localStorage.clear()`. La restauración de timers solo ocurre al final del caso feliz de reintento, por lo que una aserción fallida puede contaminar pruebas posteriores. El `setup.ts` compartido solo desmonta React.

**Recomendado:** centralizar esa limpieza en `afterEach`.

### Baja — Falta una regresión positiva de compatibilidad legacy

Las nuevas pruebas demuestran que los bypasses de `contabilidad` y `dashboard` no neutralizan `permissions`. El código también conserva `allowedRoles`, el permiso por `moduleCode` y los bypasses legacy cuando no hay permisos explícitos (`ProtectedRoute.tsx:27-90`), pero no existen casos focales positivos para esas rutas históricas ni un caso negativo de coincidencia parcial/prefijo.

**Recomendado:** añadir una pequeña matriz que documente `allowedRoles`, `moduleCode`, bypass administrativo/general y exactitud negativa.

## Verificaciones satisfactorias

- Todos los hooks de `ProtectedRoute` se ejecutan incondicionalmente.
- `permissions` se valida de forma independiente, exacta, all-of y fail-closed; los bypasses solo satisfacen la comprobación legacy de `moduleCode`.
- `moduleCode` y `allowedRoles` conservan su comportamiento histórico en el código revisado.
- El JWT se utiliza únicamente en la solicitud HTTP autenticada del ticket.
- La URL WebSocket ya no contiene usuario, JWT ni ticket; el ticket efímero se transporta como subprotocolo solicitado.
- Cada reconexión solicita un ticket nuevo y el backoff se reinicia al abrirse la conexión.
- Los callbacks usan la instancia local `nextSocket`; un cierre obsoleto no afecta la conexión activa.
- El desmontaje invalida callbacks, cierra el socket activo y elimina el temporizador.
- Los endpoints permanecen centralizados en `config/api.ts`, no se introducen `any` explícitos y todos los archivos están por debajo de 550 líneas.
- No hay cambios visuales, de layout, tablas o sistema de diseño en este alcance.

## Evidencia y comprobaciones

Se acepta como evidencia reportada, no reejecutada por este revisor: **10 pruebas focales aprobadas**, ESLint dirigido aprobado y build de producción aprobado. Los 484 errores del lint global continúan siendo deuda preexistente fuera del alcance.

Antes de integrar, conservar como checks requeridos desde `frontend/`:

1. Las tres suites focales.
2. ESLint sobre los archivos revisados.
3. `npm run test`, `npm run lint` y `npm run build`; el fallo global conocido solo es aceptable con evidencia de cero errores nuevos en el alcance.

## Riesgos de sistema de diseño

Ninguno. La fase modifica autorización y transporte de notificaciones, sin introducir UI, estilos ni regresiones responsive.

## Razones de bloqueo

Ninguna. Los hallazgos restantes son mejoras de aislamiento y cobertura de regresión.
