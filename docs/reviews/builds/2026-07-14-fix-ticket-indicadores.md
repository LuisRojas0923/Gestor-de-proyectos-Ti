# Reporte de Revisión de Build

**Fecha:** 2026-07-14
**Build:** Corrección de actualización de tickets y dimensiones de indicadores
**Autor del build:** OpenCode
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `backend_v2/app/api/tickets/router.py`
- `backend_v2/app/services/ticket/servicio.py`
- `frontend/src/pages/Indicators/IndicatorsVolumeView.tsx`
- `frontend/src/tests/IndicatorsVolumeView.test.tsx`
- `testing/backend/test_ticket_update_errors.py`
- `testing/CATALOGO_PRUEBAS.md`
- `errors_memory.json` (entradas `ERR-004` a `ERR-006`)
- `.opencode/memory/error-memory.json` (índice resumido de errores)
- `docs/reviews/builds/2026-07-14-fix-ticket-indicadores.md`

Los demás cambios presentes en el worktree son ajenos a este build y no fueron revertidos ni incluidos en su alcance.

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| harness-router | Revisión mixta requerida | No | Solicitó frontend, backend, pruebas y seguridad. |
| graphify-searcher | Sin resultado util | No | Se continuó con búsqueda directa. |
| error-memory | Sin coincidencias previas | No | No existían incidentes equivalentes. |
| backend-reviewer | Aprobado con riesgos | No | Detectó y se corrigió el riesgo WebSocket posterior al rollback. |
| frontend-reviewer | Aprobado con riesgos | No | Confirmó `initialDimension` y responsividad. |
| docs-tests-reviewer | Aprobado con riesgos | No | Solicitó persistir evidencia y cubrir fallo de notificación. |
| security-rbac-reviewer | Aprobado con riesgos | No | El diff sanea errores; persisten riesgos previos de autenticación. |
| scope-reviewer | Bloqueado antes del cierre | Sí, resuelto | Faltaban prueba de notificación y este reporte. |

## 3. Hallazgos bloqueantes

Ninguno pendiente dentro del alcance del bugfix.

## 4. Hallazgos no bloqueantes

- `PATCH /api/v2/soporte/{ticket_id}` continúa sin autenticación/RBAC; es un riesgo preexistente que requiere separar actualización de analista y feedback del propietario.
- `usuario_id` y `usuario_nombre` todavía llegan desde el cliente y pueden falsear la identidad de auditoría.
- El lint focal del componente reporta 15 violaciones preexistentes (`any`, variables sin uso); las líneas añadidas no agregan violaciones y el nuevo test pasa lint.
- La suite HTTP omite cuatro casos dependientes de credenciales de prueba no disponibles en este entorno.

## 5. Tests / comandos ejecutados

- `docker compose run --rm -T -v "${PWD}:/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2 backend pytest testing/backend/test_ticket_update_errors.py testing/backend/test_ticket_background_tasks.py::test_actualizar_ticket_uses_background_tasks -q` - PASS, 5 passed.
- `docker compose exec -T frontend npm run test -- --run src/tests/IndicatorsVolumeView.test.tsx` - PASS, 1 passed.
- `docker compose run --rm -T -v "${PWD}:/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2 -e TEST_BASE_URL=http://backend:8000/api/v2 backend pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -q` - PASS parcial, 4 passed y 4 skipped por credenciales.
- `docker compose exec -T frontend npm run build` - PASS, 4027 módulos transformados.
- `docker compose exec -T frontend npx eslint src/tests/IndicatorsVolumeView.test.tsx` - PASS.
- `docker compose exec -T frontend npx eslint src/pages/Indicators/IndicatorsVolumeView.tsx src/tests/IndicatorsVolumeView.test.tsx` - FAIL por 15 errores preexistentes del componente.
- `curl.exe -X PATCH http://127.0.0.1:8000/api/v2/soporte/TKT-NO-EXISTE ...` - PASS, el endpoint preservó HTTP 404.
- `git diff --check` - PASS; solo avisos de conversión LF/CRLF.

## 6. Documentación actualizada

- [x] `testing/CATALOGO_PRUEBAS.md`
- [x] `errors_memory.json` y `.opencode/memory/error-memory.json`
- [x] Reporte de build actual
- [ ] `docs/ESQUEMA_BASE_DATOS.md` - no aplica; no cambiaron modelos ni esquema.
- [ ] ADR - no aplica; no se introdujo una decisión arquitectónica durable.

## 7. Decisión final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

## 8. Seguimiento

| Acción | Responsable | Fecha objetivo |
|---|---|---|
| Diseñar endpoints separados y protegidos para gestión de analista y feedback del solicitante. | Equipo backend/seguridad | Por definir |
| Derivar la identidad de auditoría exclusivamente del usuario autenticado. | Equipo backend/seguridad | Por definir |
| Reducir la deuda de tipado y lint de `IndicatorsVolumeView.tsx`. | Equipo frontend | Por definir |
