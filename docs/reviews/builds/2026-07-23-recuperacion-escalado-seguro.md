# Reporte de Revision de Build

**Fecha:** 2026-07-23
**Build:** Recuperacion, escalado y sesiones web seguras
**Autor del build:** OpenCode
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

## 1. Archivos modificados

- `backend_v2/app/api/auth/`
- `backend_v2/app/services/auth/`
- `backend_v2/app/models/auth/usuario.py`
- `frontend/src/services/AuthService.ts`
- `testing/backend/test_auth_recuperacion_segura.py`
- Suites heredadas de auth y `testing/CATALOGO_PRUEBAS.md`
- `docs/decisions/ADR-008-recuperacion-y-sesiones-web-seguras.md`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| harness-router | matriz emitida | no | backend, security y docs/tests requeridos |
| scope-reviewer | alcance ampliado | no | incluyo backend y frontend auth |
| backend-reviewer | approved | no | cierre sin bloqueantes |
| security-rbac-reviewer | approved_with_risks | no | sin bloqueantes de seguridad/RBAC |
| frontend-reviewer | approved | no | single-flight aislado por sesion |
| docs-tests-reviewer | approved_with_risks | no | evidencia y memoria reconciliadas |
| scope-reviewer | approved_with_risks | no | cambios de nomina excluidos del alcance |
| graphify-searcher | parcial | no | complementado con lectura directa |

## 3. Hallazgos bloqueantes

Ninguno pendiente antes de la rerevision final. Se corrigieron doble refresh,
tokens de recuperacion simultaneos, reset a cedula, sesiones revocadas no
verificadas y aprovisionamiento de analistas sin autenticacion.

## 4. Hallazgos no bloqueantes

- El lint global conserva 548 hallazgos preexistentes fuera del alcance. El
  lint focal de `AuthService.ts` y su prueba pasa.
- Vite mantiene el warning conocido por chunks superiores a 500 kB.
- Las 18 omisiones de la matriz corresponden a casos condicionales de entorno
  ya declarados por las suites de verificacion administrativa.

## 5. Tests / comandos ejecutados

- TDD backend focal inicial: 5 fallos reproducidos.
- Backend focal final de auth/correo: `29 passed, 1 skipped`.
- `docker compose run --rm --no-deps -e PYTHONPATH=/app -e TEST_BASE_URL=http://backend:8000/api/v2 -v "${PWD}\\testing:/testing" -v "${PWD}\\pytest.ini:/pytest.ini" backend pytest -c /pytest.ini -o asyncio_mode=auto <14 suites auth/admin> -q`: `118 passed, 18 skipped`.
- Infraestructura y regresiones: `4 passed, 4 skipped`.
- `docker compose exec -T frontend npm run test -- --run src/services/AuthService.test.ts src/hooks/useApi.test.tsx src/services/nominaApi.test.ts`: `12 passed`.
- `npx eslint src/services/AuthService.ts src/services/AuthService.test.ts`: PASS.
- `npm run build`: PASS.
- `python -m compileall ...`: PASS.
- `git diff --check ...`: PASS.

## 6. Documentacion actualizada

- [x] `testing/CATALOGO_PRUEBAS.md`
- [x] `docs/decisions/ADR-008-recuperacion-y-sesiones-web-seguras.md`
- [x] reporte de build
- [x] memoria de errores: `PRE-2026-06-02-1`, `DEC-001` y `ERR-022` a `ERR-025`

No cambio el esquema fisico: se reutilizan las tablas existentes `tokens` y
`sesiones`.

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

El riesgo residual se limita a deuda global de lint y warnings de build no
introducidos por este cambio. La decision se actualizara si la rerevision final
encuentra un bloqueante nuevo.

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Reducir deuda global de lint | Equipo frontend | Backlog |
