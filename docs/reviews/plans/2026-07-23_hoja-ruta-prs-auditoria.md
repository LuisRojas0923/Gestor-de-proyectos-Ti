# Hoja de ruta de PRs de auditoría

**Objetivo:** dividir `restaurar-tablas-auditoria` en PRs pequeñas, auditables y sin mezclar WebSocket, autenticación, reservas ni migraciones.

## Reglas permanentes

- Cada rama de PR debe partir de la versión más reciente de `origin/main`.
- `restaurar-tablas-auditoria` es únicamente fuente de referencia; no es base de trabajo.
- No copiar la rama fuente completa: contiene cambios mezclados y riesgos de JWT en URL, PII y reservas.
- Cada PR debe tener un perfil propio en `C:\Users\amejoramiento2\Tools\pr-auditor\profiles.json`.
- El auditor debe ejecutarse con el worktree realmente ubicado en la rama que se está revisando. Seleccionar `Head` en la GUI calcula el diff, pero no cambia el checkout usado para ejecutar pruebas.
- No hacer `git push` desde el agente; el push lo ejecuta el usuario.
- Los errores globales baseline deben permanecer fuera de las PR funcionales y registrarse como deuda separada.

## PR1: Filtros de tabla consolidada

**Rama:** `fix/frontend-syntax`  
**Commit:** `dc7f3d14ae0ded144936706b51ddd033673c8a16`  
**Base:** `origin/main`  
**Perfil:** `filtros-tabla-consolidada`  
**Estado:** pendiente de revisión/aprobación

### Alcance

- Filtros accesibles de la tabla consolidada.
- Ajustes de componentes atómicos y popover.
- Pruebas focalizadas de la tabla.

### Pendiente

- Auditar con el worktree realmente checkoutado en `fix/frontend-syntax`.
- No usar el worktree de PR2 para ejecutar las pruebas de PR1.
- Resolver o justificar cualquier hallazgo que pertenezca realmente a PR1.
- Publicar la rama si aún no está publicada y abrir la PR contra `main`.

## PR2: UI y estadísticas de auditoría

**Rama:** `feat/auditoria-ui-estadisticas`  
**Commit:** `ec0c948e27a400a406a50f3557c881198d0ade94`  
**Base:** `origin/main`  
**Perfil:** `auditoria-ui-estadisticas`  
**Estado:** commit local listo; pendiente de push y revisión

### Incluido

- Tablas de usuarios principales, rutas principales y últimos eventos.
- Formateadores tipados y resumen sin snapshots JSONB, IP ni User-Agent.
- Integración responsive en `AuditoriaIndicadores`.
- Nombre accesible para las tablas mediante `DataTable`.
- Endpoints de auditoría centralizados en `config/api.ts`.
- Actualización manual con cache-buster no sensible.
- Pruebas focalizadas: `12 passed`.

### Verificación

- Auditor PR2: `PASS_WITH_WARNINGS`, `0 FAIL`, `2 WARN` baseline.
- Build frontend: PASS.
- ESLint focalizado: PASS.
- Worktree: limpio.

### Pendiente

- Corregir el upstream local si GitHub Desktop apunta a `origin/main`:
  `git branch --unset-upstream feat/auditoria-ui-estadisticas`.
- Publicar la rama hacia `feat/auditoria-ui-estadisticas`.
- Abrir la PR contra `main`.
- No integrar WebSocket/JWT ni reservas en esta PR.

## PR3: WebSocket y autenticación/JTI

**Rama propuesta:** `feat/auditoria-ws-auth`  
**Base:** la versión actualizada de `origin/main` después de integrar PR2  
**Perfil pendiente:** `auditoria-ws-auth`  
**Estado:** diseño pendiente; se puede adelantar backend sin integrar la UI

### Puede adelantarse antes de aprobar PR2

- Tests de sesiones, refresh, rotación y revocación de `jti`.
- Ticket opaco temporal para handshake WebSocket.
- `ws_manager` y limpieza de conexiones.
- Endpoint WebSocket backend.
- Validación de RBAC, expiración y `Origin`.

### Debe esperar a PR2

- Cambios en `useAuditoriaStats.ts`.
- Reconexión y backoff del frontend.
- Integración visual de mensajes en el dashboard.

### Reglas de seguridad

- Nunca transportar JWT en `?token=`.
- El ticket debe ser opaco, temporal, de un solo uso y validado contra la sesión/JTI.
- Rechazar origen no permitido y permisos revocados.
- No enviar snapshots JSONB ni PII técnica por WebSocket.

### Criterios de aceptación

- Login → refresh → rotación JTI → ticket → WebSocket validado.
- Casos 401, 403, ticket expirado, ticket reutilizado y sesión revocada.
- Desconexión, timeout, reconexión y limpieza sin fugas.
- Pruebas frontend sin JWT en URL.

## PR4: Reservas y migraciones PostgreSQL

**Rama propuesta:** `feat/reserva-salas-migraciones`  
**Base:** la versión actual de `origin/main`  
**Perfil pendiente:** `reserva-migraciones`  
**Estado:** independiente; se puede implementar en paralelo con PR1–PR3

### Alcance

- Protección PostgreSQL contra solapamiento concurrente de reservas.
- Migración idempotente para la restricción de exclusión.
- Extensión `btree_gist` cuando sea necesaria.
- Integración con el gestor de migraciones.
- Actualización de `docs/ESQUEMA_BASE_DATOS.md` y documentación operativa.

### Criterios de aceptación

- Migración sobre base vacía.
- Migración repetida sobre base ya migrada.
- Dos reservas concurrentes: una exitosa y otra rechazada con `409`.
- Rollback y preservación de datos.
- Fechas, zonas horarias y límites validados.
- Pruebas ejecutadas contra PostgreSQL, preferiblemente mediante Docker; no SQLite.

### Exclusiones

- WebSocket, JWT, JTI y sesiones.
- Cambios de auditoría UI.
- Cambios globales de frontend.

## Deuda separada

No mezclar con PR1–PR4:

- `RequirementsTab.tsx:262,272`: JSX inválido que bloquea TypeScript global.
- ESLint global: deuda extensa de `any`, imports sin uso, dependencias de hooks y reglas heredadas.
- Fallos heredados de `ActivityEvidenceService`, `MyDevelopments` y `RegisterSidebar`.

Crear una PR independiente de limpieza cuando las PR funcionales estén estabilizadas.

## Checklist antes de cada PR

- [ ] Rama creada desde `origin/main` actualizado.
- [ ] Perfil del auditor creado o verificado.
- [ ] Tests escritos antes de cambios backend.
- [ ] Diff limitado al manifiesto de la PR.
- [ ] Auditor ejecutado con el worktree correcto.
- [ ] Pruebas focalizadas, build y lint focalizado en verde.
- [ ] Baseline global documentado sin ocultar fallos.
- [ ] Commit revisado antes de que el usuario haga push.
