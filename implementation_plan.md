# Plan de Implementación: Renombramiento de Módulo y Roles

Se ha identificado una inconsistencia en el nombre del módulo. El módulo debe llamarse **"Certificado de Ingresos y Retenciones"**, mientras que **"Contabilidad"** debe reservarse exclusivamente para el nombre del **rol de usuario** con permisos administrativos sobre este módulo.

## User Review Required

> [!IMPORTANT]
> El ID interno del módulo seguirá siendo `contabilidad` para mantener la compatibilidad con el sistema de rutas y roles ya implementado, pero el **Nombre Visible** cambiará en toda la interfaz.

## Proposed Changes

### Backend

#### [MODIFY] [rbac_manifest.py](file:///c:/Users/amejoramiento6/Gestor-de-proyectos-Ti/backend_v2/app/core/rbac_manifest.py)
- Cambiar el campo `"nombre"` del módulo con ID `contabilidad` de `"Contabilidad"` a `"Certificado de Ingresos y Retenciones"`.

### Frontend

#### [MODIFY] [DashboardView.tsx](file:///c:/Users/amejoramiento6/Gestor-de-proyectos-Ti/frontend/src/pages/ServicePortal/pages/DashboardView.tsx)
- Actualizar el título de la tarjeta de navegación de `"Contabilidad e Impuestos"` a `"Certificado de Ingresos y Retenciones"`.

#### [MODIFY] [index.tsx](file:///c:/Users/amejoramiento6/Gestor-de-proyectos-Ti/frontend/src/pages/ServicePortal/pages/Contabilidad/index.tsx)
- Cambiar los títulos internos de la página y las etiquetas que hagan referencia a "Contabilidad" como nombre del módulo.
- Asegurar que el mensaje de contacto ("contacta al departamento de contabilidad") sea claro respecto al rol/departamento.

## Verification Plan

### Automated Tests
- Verificar que el `rbac_manifest.py` sea descubierto correctamente por el backend al iniciar.
- Comprobar que el componente `ProtectedRoute` siga validando correctamente el ID `contabilidad`.

### Manual Verification
- Entrar con un usuario de rol `usuario` y verificar que el título de la tarjeta sea "Certificado de Ingresos y Retenciones".
- Entrar con un usuario de rol `contabilidad` y verificar que tenga acceso a las funciones de carga de datos exógenos bajo el nuevo título del módulo.
