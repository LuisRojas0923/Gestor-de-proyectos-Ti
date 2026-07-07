# Build Review - GeoFace Fase 1A.1 Estado Biometrico

**Fecha:** 2026-07-06
**Build:** Backend como fuente de verdad de enrolamiento biometrico
**Autor del build:** Agente IA (OpenCode)
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `backend_v2/app/api/biometria/biometria_router.py` - agrega `GET /api/v2/biometria/estado` protegido por permiso `biometria`.
- `backend_v2/app/services/biometria/biometria_service.py` - agrega consulta de estado biometrico del usuario actual.
- `testing/backend/test_biometria_service.py` - agrega pruebas para estado enrolado, sin perfil e inactivo.
- `testing/backend/test_biometria_router_engine.py` - agrega prueba de delegacion del handler de estado.
- `testing/CATALOGO_PRUEBAS.md` - actualiza cobertura biometrica.
- `movil/src/services/faceApi.ts` - agrega cliente `getBiometricStatus()`.
- `movil/src/types/index.ts` - agrega tipo `BiometricStatus`.
- `movil/src/context/AppContext.tsx` - conserva estado biometrico backend-source y aplica fail-closed al enrolar/actualizar foto.
- `movil/app/_layout.tsx` - `AuthGate` deja de usar perfiles locales como autoridad de enrolamiento.
- `movil/package.json` - agrega script `typecheck`.
- `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md` - marca avances de Fase 1A.1.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| harness-router | completado | no | Recomendo `backend-reviewer`, `mobile-reviewer`, `security-rbac-reviewer` y `docs-tests-reviewer`. |
| backend-reviewer | aprobado con riesgos | no | Sin bloqueantes; pide Docker/regresiones, response model y tests HTTP reales. |
| mobile-reviewer | aprobado con riesgos | no | Sin bloqueantes; pide typecheck, pruebas manuales y mitigacion de cache/retry. |
| security-rbac-reviewer | aprobado con riesgos | no | Revision inline sin reporte persistido; pide refresco de cache, validacion de `fotoUrl` y tests HTTP 401/403. |
| docs-tests-reviewer | bloqueado inicialmente | no | Bloqueo de `typecheck` resuelto tras `npm ci`; queda validacion manual pendiente como riesgo. |

## 3. Hallazgos bloqueantes

Ninguno vigente.

## 4. Hallazgos no bloqueantes

### Media - Fase 1A.1 no cubre aun zonas oficiales ni evidencias autenticadas

Este build cierra el primer bloque de fuente de verdad de enrolamiento. Siguen pendientes Fase 1A.2 zonas oficiales backend y Fase 1A.3 evidencias autenticadas.

### Media - Validacion manual de storage local pendiente

Queda pendiente probar en dispositivo/emulador que borrar storage local con usuario ya enrolado en backend no obliga a enrolar si `/biometria/estado` responde `enrolado=true`.

### Media - Vulnerabilidades moderadas en dependencias moviles

`npm --prefix movil audit --audit-level=moderate` reporta 13 vulnerabilidades moderadas. `js-yaml` tiene fix disponible con `npm audit fix`; la cadena de `uuid` requiere revisar dependencias Expo y `npm audit fix --force` propondria cambios potencialmente rompientes.

## 5. Tests / comandos ejecutados

- `python -m pytest testing/backend/test_biometria_service.py -q` - FAIL esperado inicial: 3 fallos por ausencia de `obtener_estado_biometrico`.
- `python -m pytest testing/backend/test_biometria_service.py -q` - PASS inicial, 7 passed; tras mitigacion `fotoUrl` la suite biometrica completa confirma 21 passed.
- `python -m pytest testing/backend/test_biometria_service.py testing/backend/test_biometria_router_engine.py -q` - PASS inicial, 10 passed; tras mitigacion la suite completa confirma 21 passed.
- `python -m pytest testing/backend/test_biometria_service.py testing/backend/test_biometria_router_engine.py testing/backend/test_biometria_engine_client.py -q` - PASS, 14 passed antes de la mitigacion final.
- `python -m pytest testing/backend/test_biometria_engine_api.py testing/backend/test_biometria_engine_client.py testing/backend/test_biometria_service.py testing/backend/test_biometria_router_engine.py -q` - PASS final, 21 passed.
- `npm --prefix movil run typecheck` - FAIL, `tsc` no reconocido porque no hay dependencias instaladas.
- `npm --prefix movil ci` - PASS, dependencias restauradas desde `package-lock.json`; npm reporto 13 vulnerabilidades moderadas existentes en el arbol.
- `npm --prefix movil run typecheck` - PASS.
- `npm --prefix movil audit --audit-level=moderate` - FAIL esperado por 13 vulnerabilidades moderadas en dependencias transitivas (`js-yaml`, `uuid`/Expo toolchain).

## 6. Documentacion actualizada

- [x] `testing/CATALOGO_PRUEBAS.md` actualizado con cobertura de estado biometrico.
- [x] `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md` actualizado con avances Fase 1A.1.
- [x] `docs/reviews/builds/2026-07-06_geoface-fase1a1-estado-biometrico.md` creado.
- N/A `docs/ESQUEMA_BASE_DATOS.md` - no hubo cambios de modelos/tablas.

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

El backend queda probado y el movil queda ajustado con `typecheck` aprobado. La decision queda aprobada con riesgos porque falta validacion manual en dispositivo/emulador del flujo storage local vacio + backend `enrolado=true`, y quedan vulnerabilidades moderadas npm por revisar en el arbol de dependencias.

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Revisar vulnerabilidades moderadas reportadas por `npm ci` en `movil/`. | Mobile/Seguridad | 2026-07-07 |
| Validar manualmente storage local borrado con backend `enrolado=true`. | Mobile/QA | 2026-07-07 |
| Ejecutar revalidacion docs-tests si se requiere cierre formal del reporte. | Equipo tecnico | 2026-07-07 |
| Continuar Fase 1A.2: zonas oficiales desde backend. | Mobile/Backend | 2026-07-07 |
