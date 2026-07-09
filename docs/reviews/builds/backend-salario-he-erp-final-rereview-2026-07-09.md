# Backend review — salario HE desde ERP (re-revisión final)

**Fecha:** 2026-07-09
**Build:** salario HE desde ERP + validación server-side de importes al confirmar
**Autor del build:** no indicado
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados revisados

- `backend_v2/app/api/erp/router.py`
- `backend_v2/app/api/novedades_nomina/routers/horas_extras.py`
- `backend_v2/app/models/novedades_nomina/schemas_horas_extras.py`
- `backend_v2/app/services/erp/empleados_service.py`
- `testing/backend/test_erp_empleados_service.py`
- `testing/CATALOGO_PRUEBAS.md`
- `docs/specs/2026-06-01_modulo-horas-extras-novedades.md`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | blocked | sí | El blocker previo de importes manipulados queda corregido, pero quedan blockers de modularidad y suite relevante. |

## 3. Hallazgos bloqueantes

1. **Alta — `horas_extras.py` excede el límite obligatorio de 550 líneas.**
   - Referencia: `backend_v2/app/api/novedades_nomina/routers/horas_extras.py` tiene 579 líneas.
   - La corrección agregó helpers de resolución/validación en el router, empujándolo sobre el máximo de arquitectura limpia. Debe extraerse la lógica de `_resolver_parametros_empleado_erp`, `_casi_igual` y `_validar_importes_confirmacion` a una capa de servicio/validación para mantener `api/ -> services/ -> models/` y respetar el límite.

2. **Alta — queda una prueba backend relevante desactualizada por la nueva dependencia ERP.**
   - Referencias: `backend_v2/app/api/novedades_nomina/routers/horas_extras.py:382-406`; `testing/backend/test_horas_extras_s2.py:248-252`.
   - `confirmar_pre_liquidacion_endpoint` ahora siempre resuelve ERP antes de persistir. La prueba existente `TestConfirmarPreLiquidacionHappyPath::test_endpoint_ignora_usuario_confirma_del_cliente` invoca el endpoint directamente sin `db_erp` ni monkeypatch de `_resolver_parametros_empleado_erp`; al ejecutarse usaría el sentinel `Depends(...)` como sesión ERP y fallaría antes de validar la auditoría. Actualizar esa prueba y ejecutar la suite relevante de S2 además de `test_erp_empleados_service.py`.

## 4. Hallazgos no bloqueantes

- **Resuelto:** el blocker previo de importes manipulados queda cubierto en código: `confirmar_pre_liquidacion_endpoint` llama `_validar_importes_confirmacion`, que valida factor prestacional, valor hora y cada detalle monetario contra ERP/reglas/catálogo antes de persistir.
- **Riesgo pendiente:** `EmpleadosService.obtener_empleado_por_cedula()` conserva wrapper `async` que ejecuta la consulta sync directamente; los endpoints corregidos usan `run_in_threadpool`, pero otros call sites siguen expuestos a bloqueo del event loop.
- **Riesgo pendiente:** ARL ERP ausente/no reconocida se normaliza silenciosamente a `I`; para nómina puede subestimar carga prestacional.

## 5. Tests / comandos ejecutados

- `git status --short` — inspección read-only.
- `git diff -- backend_v2/app/api/novedades_nomina/routers/horas_extras.py testing/backend/test_erp_empleados_service.py` — inspección read-only.
- `git diff -- backend_v2/app/api/erp/router.py backend_v2/app/models/novedades_nomina/schemas_horas_extras.py backend_v2/app/services/erp/empleados_service.py testing/CATALOGO_PRUEBAS.md docs/specs/2026-06-01_modulo-horas-extras-novedades.md` — inspección read-only.
- `python -m pytest --collect-only testing/backend/test_erp_empleados_service.py testing/backend/test_horas_extras_s2.py` — 26 tests recolectados; no ejecución por rol de revisión.
- Reportado por implementación: `pytest testing/backend/test_erp_empleados_service.py -q` — 8 passed.

## 6. Documentacion actualizada

- [ ] `docs/ESQUEMA_BASE_DATOS.md` — no aplica; sin cambio de modelo/tabla local.
- [ ] ADR — no aplica.
- [x] `testing/CATALOGO_PRUEBAS.md` — actualizado para `test_erp_empleados_service.py`.
- [x] Spec del módulo HE — actualizada con contrato salario/ARL desde ERP.

## 7. Decision final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos`
- [x] `bloqueado`

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Extraer helpers de ERP/validación de importes fuera del router para bajar `horas_extras.py` a <=550 líneas. | Implementación backend | 2026-07-09 |
| Actualizar y ejecutar `testing/backend/test_horas_extras_s2.py::TestConfirmarPreLiquidacionHappyPath::test_endpoint_ignora_usuario_confirma_del_cliente` con la nueva dependencia ERP/validación. | Implementación backend | 2026-07-09 |
