# Cierre de build multidominio — 2026-07-22

**Rama:** `Modulo_Geoface`  
**Base:** `d15a76a9`  
**Alcance:** Bitácoras/auditoría, Horas Extras/ERP, tickets/notificaciones, sesión/RBAC, tablas y Redis.  
**Decisión:** **approved**

## Revisiones finales

| Revisor | Veredicto | Bloqueantes |
|---|---|---:|
| backend-reviewer | approved | 0 |
| frontend-reviewer | approved | 0 |
| frontend-table-specialist | approved_with_risks | 0 |
| security-rbac-reviewer | approved | 0 |
| scope-reviewer | aprobado tras separar commits y actualizar evidencia | 0 |

## Evidencia reproducible

### Backend

```powershell
$env:PYTHONPATH = "backend_v2;$env:PYTHONPATH"
python -m pytest testing/backend/test_bitacoras_operacionales_fase0.py testing/backend/test_notificaciones.py testing/backend/test_ticket_update_errors.py testing/backend/test_ticket_background_tasks.py testing/backend/test_ticket_websocket_security.py testing/backend/test_horas_extras_calculos_planilla.py testing/backend/test_horas_extras_ot_horarios.py -m "not mutating_integration" -q
```

Resultado inicial: **75 passed, 1 skipped, 1 deselected y 2 fallos de aislamiento de pruebas**. Los dos dobles se corrigieron sin modificar la lógica productiva y el rerun parametrizado terminó con **6 passed**.

```powershell
python -m pytest testing/backend/test_horas_extras_planilla_salarios_erp.py testing/backend/test_erp_empleados_offload.py -m "not mutating_integration" -q
```

Resultado: **25 passed**. La ejecución usó el entorno Python 3.11 del proyecto, que contiene `pdfplumber`; `py -3.12` local no contiene esa dependencia.

```powershell
python -m pytest testing/backend/test_auth_rate_limit.py::TestLimiterStorageURI::test_password_redis_se_pasa_como_opcion_separada testing/backend/test_ticket_websocket_security.py -q
```

Resultado: **5 passed**. Cubre contraseña Redis separada y revocación del WebSocket antes de transmitir.

```powershell
python -m compileall -q backend_v2/app
```

Resultado: **PASS**.

### Frontend

```powershell
npm run test -- --run
npx tsc --noEmit
npm run build
```

Resultados: **357 passed, 2 skipped**; TypeScript **PASS**; build **4042 módulos transformados**.

ESLint focal sobre los archivos modificados: **0 errores, 2 warnings heredadas de Fast Refresh**.

### Infraestructura y consistencia

- `docker compose -f docker-compose.prod.yml config --quiet`: **PASS** con variables sintéticas.
- `docker compose -f docker-compose.Pruebas3.yml config --quiet`: **PASS** con variables sintéticas.
- `git diff --check`: **PASS**.
- Cinco archivos JSON de memoria: **válidos**.
- `frontend/dist/index.html` queda excluido: es un artefacto generado que referencia assets ignorados.

## Contratos cerrados

- Notificaciones privadas por propietario, tickets efímeros de un solo uso y origen WebSocket exacto.
- WebSocket de tickets autenticado, autorizado por propiedad o `ticket-management` y revalidado antes de cada evento.
- PATCH de tickets vinculado al actor autenticado y al RBAC dinámico.
- Sesión frontend fail-closed durante hidratación o indisponibilidad transitoria.
- Redis protegido con contraseña separada de la URI para evitar filtración y problemas de codificación.
- Consulta `OThorarios` protegida, paginada, sin caché y con cuota específica.
- Planilla de Horas Extras con salario ERP vigente, divisores legales y fallos cerrados documentados.
- DataTable con scroll horizontal, filtros agrupados e indicador de filtro activo.

## Riesgos no bloqueantes

- El smoke real de producción de `OThorarios` sigue opt-in y debe ejecutarse antes del despliegue.
- El lint global conserva deuda histórica fuera del alcance focal.
- `DataTable.tsx` y `horasExtrasService.ts` están próximos al límite de 550 líneas.
- Los reportes focales del 2026-07-21 se conservan únicamente como historial; este documento es el cierre canónico del snapshot.
- `backend-pr22-2026-07-22.md` corresponde a una auditoría independiente de PR #22 y conserva su veredicto bloqueado.

## Decisión final

- [x] aprobado
- [ ] aprobado_con_riesgos
- [ ] bloqueado

El snapshot puede confirmarse en commits separados por dominio y subirse a `origin/Modulo_Geoface`.
