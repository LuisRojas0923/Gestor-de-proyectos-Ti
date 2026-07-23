# PR2: Auditoría UI y estadísticas

**Base:** `origin/main`
**Origen de referencia:** `origin/restaurar-tablas-auditoria`
**Rama:** `feat/auditoria-ui-estadisticas`

## Alcance

- Mostrar en el portal las estadísticas REST que ya expone `GET /auditoria/estadisticas`.
- Añadir tablas de usuarios principales, rutas principales y últimos eventos.
- Mantener la presentación limitada a los campos resumidos entregados por estadísticas.
- Reutilizar `DataTable`, átomos y tokens visuales existentes.
- Centralizar el endpoint REST de eventos para futuras consultas de la pantalla administrativa.

## Fuera de alcance

- Cambios en `backend_v2/` o migraciones.
- WebSocket, JWT en URL, JTI, sesiones y cambios de autenticación.
- Snapshots JSONB, IP, User-Agent o modales de evidencia cruda.
- Reservas de salas, Docker, CI y cambios globales de comportamiento de `DataTable`; solo se añade el nombre accesible usado por estas tablas.

## Archivos

- `frontend/src/config/api.ts`
- `frontend/src/components/molecules/DataTable.tsx`
- `frontend/src/pages/AuditoriaSistema/hooks/useAuditoriaEventos.ts`
- `frontend/src/pages/ServicePortal/pages/AuditoriaIndicadores/index.tsx`
- `frontend/src/pages/ServicePortal/pages/AuditoriaIndicadores/hooks/useAuditoriaStats.ts`
- `frontend/src/pages/ServicePortal/pages/AuditoriaIndicadores/components/{TopUsuariosTable,TopRutasTable,UltimosEventosTable}.tsx`
- `frontend/src/pages/ServicePortal/pages/AuditoriaIndicadores/utils/formatters.ts`
- Pruebas asociadas junto a cada componente, hook y utilidad.
- `testing/CATALOGO_PRUEBAS.md`

## Criterios de aceptación

- La pantalla mantiene sus estados de carga, error y vacío.
- Las tres tablas nuevas se renderizan con datos y muestran estado vacío sin romper el layout móvil.
- Las filas de últimos eventos solo muestran el resumen permitido por `AuditoriaEventoResumen`.
- Las rutas de API usadas por auditoría salen de `config/api.ts`.
- No aparecen referencias a WebSocket, `/ws/dashboard` ni `token=` en los cambios de esta rama.
- Se ejecutan pruebas focalizadas, type-check y build frontend.
