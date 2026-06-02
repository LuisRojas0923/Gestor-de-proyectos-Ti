# Reporte de Revisión de Plan — Acceso a Administración desde el Header

**Fecha:** 2026-06-02
**Plan:** acceso-panel-administracion-header
**Autor del plan:** Antigravity
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Objetivo

Modificar el flujo de retorno al panel de administración en el Portal de Servicios. Se eliminará el botón físico de retroceso (flecha de retroceso) en el header y se trasladará su funcionalidad al logotipo de barras (`LogoSolidSolutions`). Al hacer clic en el logo:
1. Si el usuario ya verificó su identidad en la sesión actual (`sessionStorage.getItem('fromAdmin') === 'true'`), se le redirigirá directamente al panel (`/`).
2. Si no ha verificado su identidad, se desplegará el modal de seguridad `AdminLoginLock` para solicitar y verificar su contraseña.
3. Solo los usuarios con roles administrativos autorizados (`isAdmin`) tendrán esta capacidad interactiva sobre el logo; para los demás usuarios, el logo será estático y no ejecutará ninguna acción.

## 2. No-objetivos

- No se modifica el flujo de inicio de sesión (Login) principal ni los tokens JWT de sesión.
- No se cambian otros modales de seguridad del sistema (como los de viáticos o reseteo forzado de contraseña).

## 3. Archivos / módulos afectados

- `backend_v2/app/api/auth/config_router.py`: Se actualiza la lógica del endpoint `/verify-admin` para que permita la verificación de contraseña a cualquier rol administrativo válido.
- `frontend/src/pages/ServicePortal/PortalLayout.tsx`: Se remueve el botón físico `ArrowLeft`, se implementa la envoltura interactiva para el logotipo de barras bajo la condición `isAdmin`, se integra el componente `AdminLoginLock` y se maneja su estado.

## 4. Pasos de implementación

1. **Backend**: Modificar la validación en `verificar_password_admin` de `config_router.py` para permitir el acceso a los roles `["admin", "analyst", "director", "manager", "admin_sistemas", "admin_mejoramiento"]`.
2. **Frontend - Importación**: Importar `AdminLoginLock` en `PortalLayout.tsx`.
3. **Frontend - Estado**: Declarar el estado `isAdminLockOpen` en `PortalLayout.tsx`.
4. **Frontend - Layout**:
   - Quitar el condicional y el componente `Button` que renderea la flecha `ArrowLeft`.
   - Condicionar el renderizado de `LogoSolidSolutions` para que, si el usuario tiene rol administrativo (`isAdmin`), se envuelva en un `<button>` con estilos interactivos y de escala.
5. **Frontend - Lógica**:
   - Programar el manejador `handleLogoClick` que verifica `sessionStorage.getItem('fromAdmin')`. Si es verdadero, navega a `/`; si no, abre el modal de verificación.
   - Pasar a `AdminLoginLock` la función de callback `onUnlock` para marcar `sessionStorage.setItem('fromAdmin', 'true')` y redirigir.

## 5. Comandos de validacion

- Validar tipos y empaquetado del frontend:
  `cd frontend && npm run build`
- Ejecutar pruebas automatizadas locales:
  `$env:PYTHONPATH="backend_v2"; pytest testing/backend/test_infrastructure.py`

## 6. Impacto en documentacion

- [ ] `docs/ESQUEMA_BASE_DATOS.md` (Sin cambios)
- [ ] `docs/decisions/ADR-NNN-<titulo>.md` (Sin cambios)
- [x] `docs/bitacora/2026-06-02-acceso-administracion-header.md` (Se documentará al finalizar la sesión)
- [ ] `README.md` (Sin cambios)

## 7. Evaluacion de riesgos

| Riesgo | Probabilidad | Mitigacion |
|---|---|---|
| Que un usuario no administrativo intente hacer clic | Baja | El logo permanece como un elemento DOM estático no clickeable (div sin eventos) si `isAdmin` es falso. |
| Fallo en la verificación en el backend para roles distintos a admin | Media | Se amplió la lista de roles permitidos en el endpoint de verificación del backend. |

## 8. Matriz de subagentes

```text
Subagente | Motivo | Resultado | Bloquea
----------|--------|-----------|---------
scope-reviewer | Validación del plan local | approved | no
```

## 9. Decision final

- [x] `aprobado`

## 10. Notas adicionales

El cambio simplifica la UI del portal, eliminando elementos visuales redundantes para los administradores y unificando el acceso al panel maestro desde la marca del ecosistema.
