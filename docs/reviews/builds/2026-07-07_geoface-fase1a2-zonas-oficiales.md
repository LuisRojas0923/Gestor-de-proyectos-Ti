# Build Review - GeoFace Fase 1A.2 Zonas Oficiales

**Fecha:** 2026-07-07
**Build:** App movil consume zonas oficiales desde backend biometrico
**Autor del build:** Agente IA (OpenCode)
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `movil/src/services/faceApi.ts` - agrega clientes `getOfficialZones`, `createOfficialZone` y `deleteOfficialZone` para `/api/v2/biometria/zonas`.
- `movil/src/services/storage.ts` - agrega `replaceZones` para cache local visual de zonas oficiales.
- `movil/src/context/AppContext.tsx` - refresca zonas oficiales desde backend, mapea campos backend -> movil y usa backend para crear/eliminar zonas.
- `movil/app/_layout.tsx` - refresca zonas oficiales al iniciar sesion autenticada.
- `backend_v2/app/api/biometria/biometria_router.py` - valida rangos de latitud, longitud y radio al crear zonas.
- `backend_v2/app/services/biometria/biometria_service.py` - valida geocerca en backend antes de leer imagen/llamar al motor y deriva la zona real mas cercana por coordenadas antes de registrar asistencia.
- `testing/backend/test_biometria_service.py` - agrega pruebas de geocerca dentro/fuera de radio, zona derivada, solapes y rechazo temprano sin leer imagen ni llamar al motor.
- `testing/CATALOGO_PRUEBAS.md` - actualiza cobertura biometrica con geocerca backend.
- `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md` - marca avances Fase 1A.2.

Los endpoints `GET/POST/DELETE /api/v2/biometria/zonas` ya existian; el cambio backend nuevo esta en la validacion de geocerca al registrar asistencia.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| graphify-searcher | parcial/stale | no | El grafo estaba desactualizado y devolvio rutas no activas; se continuo con lectura directa de `movil/`. |
| backend-reviewer | aprobado con riesgos | no | Sugirio validar antes del motor, rangos y solapes; mitigado en este build. |
| mobile-reviewer | aprobado con riesgos | no | Hallazgo alto: cache legacy puede enviar `nearestZone.id` no oficial; mitigado parcialmente porque backend deriva zona por coordenadas. |
| security-rbac-reviewer | aprobado con riesgos | no | Bloqueo de geocerca client-side levantado; quedan riesgos si no hay zonas oficiales. |
| docs-tests-reviewer | aprobado con riesgos | no | Reporte actualizado con alcance backend, conteos y evidencia. |

## 3. Hallazgos bloqueantes

Ninguno vigente antes de revisores.

## 4. Hallazgos no bloqueantes

### Media - Validacion backend de geocerca agregada, falta prueba de campo

El backend deriva la zona real por coordenadas, elige la zona mas cercana si hay solapes y rechaza asistencia fuera del radio cuando hay zonas configuradas. Falta prueba de campo en Android con GPS real.

### Media - Comportamiento sin zonas oficiales pendiente

Si el backend retorna cero zonas, la app no permite check-in porque `isInZone` queda falso. Falta decision funcional/documental sobre si esto es bloqueo esperado o si debe existir modo contingencia.

### Media - Sin prueba manual en Android todavia

El flujo requiere validacion fisica: admin crea zona backend, empleado sincroniza zonas, marca dentro de zona y `zona_id` llega real a `/biometria/asistencia`.

## 5. Tests / comandos ejecutados

- `python -m pytest testing/backend/test_biometria_service.py -q` - FAIL esperado inicial, 3 fallos por ausencia de `_resolver_zona_id_por_geocerca`.
- `python -m pytest testing/backend/test_biometria_service.py -q` - PASS, 11 passed.
- `python -m pytest testing/backend/test_biometria_service.py -q` - FAIL esperado de refuerzo, 2 fallos por solapes y validacion tardia despues del motor.
- `python -m pytest testing/backend/test_biometria_service.py -q` - PASS final, 13 passed.
- `python -m pytest testing/backend/test_biometria_engine_api.py testing/backend/test_biometria_engine_client.py testing/backend/test_biometria_service.py testing/backend/test_biometria_router_engine.py -q` - PASS final, 26 passed.
- `npm --prefix movil run typecheck` - PASS.

No se ejecutaron pruebas manuales Android en esta fase.

## 6. Documentacion actualizada

- [x] `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md` actualizado con avances Fase 1A.2.
- [x] `docs/reviews/builds/2026-07-07_geoface-fase1a2-zonas-oficiales.md` creado.
- [x] `testing/CATALOGO_PRUEBAS.md` actualizado con geocerca backend.
- N/A `docs/ESQUEMA_BASE_DATOS.md` - no hubo cambios de modelos/tablas.

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

La app deja de crear zonas locales con IDs `Date.now()` y usa IDs reales del backend. El backend valida geocerca por coordenadas antes de procesar imagen/motor y antes de registrar asistencia. Quedan riesgos operativos por validar en Android y por cerrar comportamiento sin zonas oficiales.

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Validar en Android: crear zona backend, sincronizar app, check-in dentro de zona y `zona_id` real persistido. | Mobile/QA | 2026-07-07 |
| Definir comportamiento productivo si no hay zonas oficiales. | GH/Operaciones | 2026-07-07 |
| Revisar comportamiento sin zonas oficiales y decidir si backend debe bloquear siempre. | GH/Seguridad/Backend | 2026-07-08 |
| Continuar Fase 1A.3: evidencias autenticadas. | Mobile/Backend | 2026-07-08 |
