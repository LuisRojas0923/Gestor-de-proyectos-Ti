# Plantilla — Reporte de Revisión de Build

**Fecha:** 2026-07-09  
**Build:** Re-review HMAC `firma_calculo` horas extras ERP  
**Autor del build:** equipo/orquestador  
**Modo:** build / re-review targeted  
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `backend_v2/app/api/novedades_nomina/routers/horas_extras.py`
- `backend_v2/app/models/novedades_nomina/schemas_horas_extras.py`
- `backend_v2/app/services/novedades_nomina/horas_extras_erp_validacion.py`
- `backend_v2/app/services/erp/empleados_service.py`
- `testing/backend/test_erp_empleados_service.py`
- `testing/backend/test_horas_extras_endpoint_audit.py`
- `testing/backend/test_horas_extras_s2.py`
- `testing/CATALOGO_PRUEBAS.md`
- `docs/specs/2026-06-01_modulo-horas-extras-novedades.md`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | aprobado_con_riesgos | No | Re-review focalizado en cobertura HMAC de `firma_calculo` y tests backend HE. |

## 3. Hallazgos bloqueantes

Ninguno.

## 4. Hallazgos no bloqueantes

- Confirmado: `_datos_firma_calculo()` incluye `fecha_inicio`, `fecha_fin`, `ot_id`, `ot_codigo`, `observaciones`, `nivel_riesgo_arl`, `factor_prestacional`, `salario_base_mensual`, `valor_hora_ordinaria` y `detalles` canónicos con `codigo_novedad`, `horas`, `factor_hora_ordinaria`, `valor_bruto`, `carga_prestacional`, `costo_total`.
- Confirmado: `validar_importes_confirmacion()` compara HMAC con `hmac.compare_digest()` antes de persistir y además recalcula valor hora, factor prestacional e importes por detalle desde salario/ARL ERP y catálogo vigente.
- Confirmado: la confirmación valida salario y ARL contra ERP antes de aceptar el payload.
- Confirmado: existen tests para manipulación coherente de detalles recalculados sin firma válida y manipulación de OT sin firma válida.

## 5. Tests / comandos ejecutados

- Reportado por el orquestador: tests backend HE afectados — 28 passed.
- Ejecutado por reviewer: `python -m pytest --collect-only testing/backend/test_erp_empleados_service.py testing/backend/test_horas_extras_endpoint_audit.py testing/backend/test_horas_extras_s2.py` — 28 tests collected.

## 6. Documentacion actualizada

- [ ] `docs/ESQUEMA_BASE_DATOS.md` — no aplica en este re-review focalizado; no se identificaron nuevas tablas/columnas DB en el alcance HMAC.
- [ ] `docs/decisions/ADR-NNN-<titulo>.md` — no aplica.
- [ ] `docs/bitacora/<YYYY-MM-DD>-<tema>.md` — no verificado en este re-review.
- [ ] `errors_memory.json` — no aplica.
- [x] `docs/specs/2026-06-01_modulo-horas-extras-novedades.md` — documenta contrato salario/ARL ERP y firma de pre-liquidación.
- [x] `testing/CATALOGO_PRUEBAS.md` — registra suites afectadas.

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos` (riesgos residuales documentados abajo)
- [ ] `bloqueado`

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Añadir regresiones explícitas para manipulación de fechas y observaciones, aunque hoy queden cubiertas por la misma función canónica de firma. | Backend | Próximo hardening |
| Validar con frontend que `observaciones` no se edite después de emitir la firma, o mover su captura antes de `/pre-liquidacion` si debe quedar firmada. | Frontend/Backend | Antes de producción |
| Considerar estrategia de rotación/versionado de clave HMAC si `jwt_secret_key` cambia mientras hay pre-liquidaciones en curso. | Backend/Security | Antes de rotación de secretos |
