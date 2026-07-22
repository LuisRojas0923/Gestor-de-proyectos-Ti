# Revisión frontend — Bitácoras Operacionales, fase técnica 0

**Fecha:** 2026-07-21
**Alcance:** `ProtectedRoute.tsx`, `NotificationsContext.tsx`, `notificacionesService.ts`, sus tres pruebas focales y las constantes de notificaciones añadidas en `config/api.ts`.
**Decisión:** **blocked**

Se ignoraron los cambios concurrentes ajenos al alcance indicado.

## Hallazgos

### Alta — Los bypasses legacy pueden omitir la nueva lista `permissions`

`ProtectedRoute` une `moduleCode` y `permissions` en `requiredPermissions` (`ProtectedRoute.tsx:33-36`), pero después permite el acceso completo mediante `hasBypass` (`ProtectedRoute.tsx:41-52`). Además, el retorno temprano de administradores para `dashboard` y `control-tower` ocurre antes de evaluar la lista (`ProtectedRoute.tsx:27-31`).

Por tanto, una ruta como `moduleCode="contabilidad" permissions={["bitacoras_operacionales.gestionar"]}` se admite sin el permiso explícito, y un administrador omite cualquier lista adicional si el `moduleCode` es `dashboard` o `control-tower`. Esto contradice el contrato solicitado: cuando `permissions` está presente, todos sus valores exactos deben ser obligatorios. La compatibilidad legacy de `moduleCode` no debe neutralizar restricciones nuevas declaradas por separado.

**Requerido:** validar `permissions` como una restricción all-of independiente y fail-closed antes de aplicar excepciones exclusivas de `moduleCode`, o limitar cada bypass únicamente a la validación legacy que le corresponde. Añadir pruebas negativas para las combinaciones con módulos de acceso general y con los bypasses administrativos.

### Media — La reconexión no está protegida contra todas las carreras o fallos de apertura

La adquisición fallida del ticket sí programa un reintento y el desmontaje impide abrir el socket después de resolver una solicitud pendiente. Sin embargo:

- `scheduleReconnect` puede registrar más de un temporizador y solo conserva/limpia el último identificador (`NotificationsContext.tsx:55-63,121-125`).
- `connect` no comprueba `isMounted` antes de iniciar la solicitud ni permite cancelarla.
- Una excepción síncrona de `new WebSocket(...)` queda como rechazo no manejado y corta el ciclo de reconexión (`NotificationsContext.tsx:65-85,119`).
- `onerror` cierra la variable compartida `socket`, no el socket concreto que emitió el evento (`NotificationsContext.tsx:114-116`); ante conexiones solapadas, un evento tardío puede cerrar la conexión nueva.

**Requerido:** hacer idempotente la programación del reintento, usar una referencia local por intento, capturar errores de construcción/apertura, comprobar actividad al entrar y después del ticket, y cancelar o invalidar explícitamente solicitudes pendientes durante logout/cambio de usuario. Mantener un único socket y un único temporizador activos.

### Media — Las siete pruebas focales no demuestran reconexión segura ni compatibilidad legacy

`NotificationsContext.test.tsx` solo cubre la URL del primer intento exitoso. No prueba fallo de ticket, cierre/error del socket, temporizador único, reintento con ticket nuevo, desmontaje/logout durante una solicitud pendiente ni descarte de eventos de un socket anterior. `ProtectedRoute.test.tsx` cubre fail-closed, all-of básico y hooks incondicionales, pero no acepta `allowedRoles` en su helper y no verifica los consumidores legacy de `moduleCode`, los bypasses existentes ni las combinaciones que descubren el hallazgo de severidad alta. Tampoco existe un caso negativo de coincidencia parcial/prefijo para documentar la exactitud.

**Requerido:** ampliar ambas suites con fake timers y sockets controlables, y con una matriz de rutas legacy/nuevas. Las pruebas deben fallar antes de corregir las carreras y el bypass.

### Baja — La prueba del contexto deja estado global sin restaurar

`NotificationsContext.test.tsx:40,44` sustituye `WebSocket` y escribe el JWT en `localStorage`, pero no ejecuta `vi.unstubAllGlobals()` ni limpia el almacenamiento. El `setup.ts` global solo desmonta React. Esto puede contaminar casos futuros ejecutados en el mismo entorno.

**Requerido:** restaurar globals y limpiar `localStorage` en `afterEach`.

## Verificaciones satisfactorias

- `useIsAdmin` ahora se ejecuta antes de cualquier retorno de `ProtectedRoute`; se corrige la infracción de Rules of Hooks.
- Permisos ausentes se tratan como `[]`, y la comparación implementada con `includes` es exacta y sensible a mayúsculas/minúsculas.
- El servicio obtiene el JWT desde almacenamiento local y lo envía solo en `Authorization`; el WebSocket usa un ticket codificado y ya no incorpora usuario ni JWT en la URL.
- El ticket se solicita nuevamente en cada intento de conexión y una resolución posterior al desmontaje no crea un WebSocket.
- Los endpoints revisados están centralizados en `API_ENDPOINTS`; no hay rutas API nuevas hardcodeadas fuera de `config/api.ts`.
- No se introducen primitivas visuales, estilos, tablas ni textos de interfaz; no hay impacto mobile-first o de sistema de diseño.
- Todos los archivos revisados permanecen por debajo de 550 líneas y no se añadió `catch (err: any)`.

## Evidencia y comprobaciones requeridas

Se acepta como evidencia reportada, no reejecutada por este revisor: **7 pruebas focales aprobadas**, ESLint dirigido aprobado y build de producción aprobado. El lint global conserva **484 errores preexistentes fuera del alcance**; no se atribuyen a este cambio, pero deben mantenerse documentados como deuda separada.

Después de corregir los hallazgos:

1. Ejecutar las tres suites focales con los nuevos casos de carrera y compatibilidad.
2. Ejecutar ESLint sobre todos los archivos revisados.
3. Ejecutar desde `frontend/`: `npm run test`, `npm run lint` y `npm run build`; si el lint global continúa fallando únicamente por la línea base, adjuntar comparación que confirme cero errores nuevos en el alcance.

## Riesgos de sistema de diseño

Ninguno en el alcance actual. Los riesgos son de autorización de navegación, ciclo de vida asíncrono y suficiencia de pruebas.

## Razones de bloqueo

1. La propiedad nueva `permissions` no es obligatoria en todas las combinaciones y puede ser anulada por bypasses legacy.
2. El ciclo de reconexión no garantiza un único intento/socket y puede dejar de reintentar ante una excepción al construir el WebSocket.
3. La evidencia focal no cubre los escenarios de reconexión y compatibilidad que constituyen el objetivo principal de la fase técnica 0.
