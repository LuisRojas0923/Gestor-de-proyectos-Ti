# Build: Bitacoras operacionales - Fase tecnica 0

**Fecha:** 2026-07-21
**Alcance:** Hardening transversal previo al modulo funcional
**Especificacion:** `docs/specs/2026-07-21_bitacoras-operacionales-web.md`
**Plan:** `docs/reviews/plans/2026-07-21_bitacoras-operacionales-web.md`

## Alcance Ejecutado

- `ProtectedRoute` fail-closed, hooks incondicionales y permisos explicitos all-of.
- IDs RBAC granulares con puntos, sin comodines ni segmentos vacios.
- REST de notificaciones limitado al usuario autenticado mediante `/mias`.
- Eliminacion de la creacion publica arbitraria de notificaciones.
- Ticket WebSocket Redis aleatorio, con TTL, consumo atomico, origen y sesion vinculados.
- Ticket enviado por subprotocolo WebSocket, nunca en URL junto con usuario o JWT.
- Revalidacion de sesion antes de broadcasts y cada 30 segundos.
- Validacion DB del handshake en una sesion corta, sin retener conexiones PostgreSQL.
- Variantes de notificacion y auditoria sin commit profundo.
- Supresion de auditoria automatica cuando la ruta registra un evento manual.
- Exclusión del body de auditoria para el prefijo futuro de bitacoras.
- Correlation ID validado y normalizado como UUID.

No se registraron permisos `bitacoras_operacionales.*`, tablas, rutas funcionales, ERP, archivos, firma o PDF porque las seis decisiones funcionales bloqueantes siguen abiertas.

## Evidencia TDD

### RED

- Frontend inicial: 4 fallos de 5 casos por acceso fail-open, all-of ausente, hook condicional y WebSocket con `usuario_id`.
- Backend inicial: 7 fallos de 10 casos por regex RBAC, rutas inseguras y primitivas transaccionales/tickets inexistentes.
- Segunda revision: 8 fallos backend y 4 frontend por origen no vinculado, dependencia DB de larga vida, ticket en URL y bypasses legacy.

### GREEN

```text
py -3.12 -m pytest ..\testing\backend\test_bitacoras_operacionales_fase0.py ..\testing\backend\test_notificaciones.py ..\testing\backend\test_auditoria_acciones.py -q
38 passed, 2 warnings
```

```text
npm run test -- --run src/tests/ProtectedRoute.test.tsx src/tests/NotificationsContext.test.tsx src/tests/notificacionesService.test.ts
3 files passed, 10 tests passed
```

```text
npx eslint src/components/auth/ProtectedRoute.tsx src/components/notifications/NotificationsContext.tsx src/services/notificacionesService.ts src/config/api.ts src/tests/ProtectedRoute.test.tsx src/tests/NotificationsContext.test.tsx src/tests/notificacionesService.test.ts --quiet
PASS
```

```text
npm run build
PASS - 4040 modulos transformados
```

```text
py -3.12 -m py_compile app\api\notificaciones\router.py app\services\notificacion\servicio.py app\services\notificacion\ws_manager.py app\services\auditoria\servicio.py app\services\auth\sesion_service.py app\core\middleware\auditoria_middleware.py app\models\auth\usuario.py
PASS
```

El lint global reporta 484 errores preexistentes fuera de estos archivos. La coleccion local del backend completo requiere `pdfplumber`; las suites focales no dependen de ese import.

## Gates Funcionales Pendientes

1. Contrato real de `Aperturas OT V4`.
2. Mapeo de `Director de obra` a `Ingeniero responsable del proyecto`.
3. Matriz de consulta de bitacoras.
4. Alcance de ordenes por coordinador y columna ERP correspondiente.
5. Cardinalidad permitida por OT y fecha.
6. Codigo, fecha, version y logotipo institucionales vigentes.

## Revisiones Finales

- `backend-reviewer`: `approved_with_risks`; sin bloqueantes.
- `frontend-reviewer`: `approved_with_risks`; sin bloqueantes.
- `security-rbac-reviewer`: `approved_with_risks`; severidad residual baja.
- `docs-tests-reviewer`: `approved_with_risks`; sin evidencia bloqueante.

Los riesgos residuales recomendados son pruebas integradas de handshake WebSocket, TTL/concurrencia Redis, persistencia real entre dos usuarios y matriz completa de reconexion frontend. La revalidacion previa a cada broadcast evita entregar datos a sesiones revocadas.

## Resultado

La Fase tecnica 0 queda implementada, validada y aprobada con riesgos no bloqueantes. La fase funcional permanece bloqueada por decisiones de negocio, no por defectos tecnicos de esta fase.
