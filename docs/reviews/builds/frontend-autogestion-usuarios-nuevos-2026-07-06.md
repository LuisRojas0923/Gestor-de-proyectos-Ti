# Frontend review: autogestión de usuarios nuevos

**Fecha:** 2026-07-06
**Resultado:** `approved_with_risks`
**Alcance revisado:**

- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Login/RegisterSidebar.tsx`
- `frontend/src/components/molecules/PasswordSetupModal.tsx`
- `frontend/src/context/AppContext.tsx`
- `frontend/src/config/api.ts`, `frontend/src/hooks/useApi.ts`, `frontend/src/utils/errors.ts`

## Findings

1. **[Media] Mensajes obsoletos en registro.** `RegisterSidebar.tsx` aún comunica que la cuenta queda “pendiente de aprobación” (líneas 121 y 139). Con autoactivación backend para usuarios confirmados activos en ERP/establecimiento, esos textos deben cambiarse antes del despliegue para no contradecir el flujo real.
2. **[Media] Manejo de errores no type-safe en registro.** `RegisterSidebar.tsx` usa `catch (err: any)` (línea 71). Si el archivo se toca para este plan, debe migrarse a `unknown` + `getErrorMessage`.
3. **[Media] Riesgo de mensajes crudos o genéricos ante 400/403/429.** `Login.tsx` y `RegisterSidebar.tsx` dependen de `detail` sin normalización robusta. Si el backend devuelve `detail` como arreglo, body vacío o rate-limit sin detalle, el usuario puede ver mensajes pobres o no específicos.
4. **[Baja] Deuda de design system en `RegisterSidebar`.** El banner informativo y errores reimplementan bloques con `div` + colores hardcodeados (`bg-blue-50`, `text-blue-800`, `bg-red-50`, `text-red-600`, etc.) en vez de `Callout` y tokens CSS. Evitar ampliar ese patrón.
5. **[Baja] A11y del drawer de registro.** `RegisterSidebar` se comporta como modal/drawer, pero no declara `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, Escape ni bloqueo de scroll. Si el plan cambia comportamiento del drawer, conviene cerrar esta deuda con pruebas.
6. **[Baja] `AppContext.tsx` usa `/auth/yo` hardcodeado.** No requiere cambio para este plan, pero si se toca por datos nuevos de usuario debe usar `API_ENDPOINTS.AUTH_ME`.

## Cambios mínimos de UI/mensajes necesarios

- En `RegisterSidebar.tsx`, reemplazar los textos de “pendiente de aprobación” por un copy alineado con autoactivación. Propuesta mínima:
  - Banner inicial: “Completa el formulario para registrarte en el portal. Validaremos tu identificación con ERP/establecimiento y, si estás activo, tu cuenta quedará habilitada automáticamente.”
  - Éxito: título “Cuenta creada” o “¡Cuenta activada!”; cuerpo “Tu cuenta fue creada y habilitada correctamente. Ya puedes iniciar sesión con tu identificación y contraseña.”
- No tocar `PasswordSetupModal` salvo que el backend cambie el contrato de `/auth/setup-password`; el texto actual de primera configuración sigue siendo compatible.
- No tocar `Login.tsx` salvo que el plan elimine el flujo “cédula en ambos campos” para contraseña no configurada. Si sigue existiendo, el aviso actual puede mantenerse.
- Si el backend devuelve una respuesta de registro con estado diferenciado (`activada`, `pendiente`, `rechazada`), renderizar mensajes específicos; no mostrar un éxito único que prometa activación cuando hubo 403/inactivo.

## Posibles errores de manejo 400/403/429

- **400:** validaciones, duplicados o contraseña inválida deben mostrar `detail` si es string; si `detail` es arreglo de FastAPI, aplanarlo a texto español. Evitar `Unexpected end of JSON input` si el body viene vacío.
- **403:** para usuario no activo/no autorizado por ERP/establecimiento, mostrar un `Callout` claro: “No fue posible activar tu cuenta porque tu usuario no figura activo en ERP/establecimiento. Verifica tus datos o contacta al administrador.” No debe disparar logout global.
- **429:** mostrar mensaje específico de rate limit: “Demasiados intentos. Espera unos minutos antes de intentarlo nuevamente.” `useApi` preserva `detail` string, pero `HTTP_STATUS` no incluye 429 y el fallback actual puede terminar como error desconocido si no hay detalle.

## Tests frontend necesarios o no necesarios

- **Solo cambio de textos:** no es estrictamente necesario crear pruebas nuevas, pero sí actualizar snapshots/queries si existieran tests del texto anterior.
- **Si se ajusta manejo de respuestas o estados de registro:** agregar `RegisterSidebar.test.tsx` con mocks de `fetch` para éxito autoactivado, 400, 403 y 429.
- **Si se toca accesibilidad del drawer:** cubrir `role="dialog"`, `aria-modal`, `aria-labelledby`, cierre con Escape, click fuera, focus trap y body scroll lock, siguiendo el patrón de `AdminLoginLock.test.tsx`.
- **Si se cambia `PasswordSetupModal`:** agregar tests equivalentes para submit exitoso, error de API, Escape, backdrop y scroll lock.

## Required checks

No ejecutados por modo read-only. Para implementar este plan, correr desde `frontend/`:

- `npm run lint`
- `npm run test`
- `npm run build`

## Design-system risks

- No introducir nuevos banners inline: usar `Callout`.
- No agregar colores hardcodeados; usar tokens `var(--color-*)`.
- Mantener textos en español.
- Mantener archivos bajo 550 líneas: los archivos revisados están bajo el límite actualmente.
- Sin impacto en tablas de alto rendimiento.

## Blocking reasons

No hay bloqueo frontend para el plan backend si se actualizan los dos textos de `RegisterSidebar` y se evita cambiar contratos sin mensajes específicos para 400/403/429. Resultado: `approved_with_risks`.
