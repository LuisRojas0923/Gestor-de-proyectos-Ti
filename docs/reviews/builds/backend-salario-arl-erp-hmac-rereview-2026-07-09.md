# Plantilla — Reporte de Revisión de Build

**Fecha:** 2026-07-09  
**Build:** Salario/ARL ERP SSOT para Horas Extras + `firma_calculo` HMAC + limpieza PII + split S2  
**Autor del build:** no indicado  
**Modo:** build / re-review read-only  
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados revisados

- `backend_v2/app/api/novedades_nomina/routers/horas_extras.py`
- `backend_v2/app/services/novedades_nomina/horas_extras_erp_validacion.py`
- `backend_v2/app/services/erp/empleados_service.py`
- `backend_v2/app/models/novedades_nomina/schemas_horas_extras.py`
- `testing/backend/test_erp_empleados_service.py`
- `testing/backend/test_horas_extras_endpoint_audit.py`
- `testing/backend/test_horas_extras_s2.py`
- `testing/CATALOGO_PRUEBAS.md`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | approved_with_risks | No | Revisión estática + collect-only de pruebas objetivo. |

## 3. Hallazgos bloqueantes

Ninguno.

## 4. Hallazgos no bloqueantes / riesgos residuales

- La validación HMAC cubre empleado, año, semana, ARL, factor, salario, valor hora y detalles financieros; no firma `fecha_inicio`, `fecha_fin`, `ot_id`/`ot_codigo` ni `observaciones`. Esto no bloquea el objetivo de impedir manipulación coherente de importes, pero conviene ampliar la firma si esos campos deben quedar inmutables desde la pre-liquidación.
- `firmar_pre_liquidacion` reutiliza `config.jwt_secret_key`. Es funcional, pero queda acoplado al secreto JWT; idealmente usar secreto derivado/dedicado para firmas de cálculo y validar guardas de producción contra valores por defecto.
- La lectura ERP del endpoint se encapsula con `run_in_threadpool`, por lo que no introduce bloqueo directo del event loop en esta ruta. Persisten wrappers async existentes de ERP que invocan sesiones síncronas sin threadpool fuera de este flujo.
- La idempotencia/consolidación S2 sigue basada en check-then-insert/update a nivel de servicio; no se revisó cambio estructural de constraints/UPSERT nativo. Bajo concurrencia real, sigue siendo recomendable blindaje DB para `(cedula, anio, semana_iso)` y `(ot_id, anio, semana_iso)`.
- `_normalizar_nivel_riesgo` mantiene fallback a `I` cuando ERP no trae ARL reconocible. Para nómina, sería más seguro fallar cerrado si el ERP no provee un nivel explícito válido.

## 5. Tests / comandos ejecutados

- `python -m pytest --collect-only testing/backend/test_erp_empleados_service.py testing/backend/test_horas_extras_endpoint_audit.py testing/backend/test_horas_extras_s2.py` — PASS, 27 tests collected.
- Verificación reportada por el usuario: `python -m pytest testing/backend/test_erp_empleados_service.py testing/backend/test_horas_extras_endpoint_audit.py testing/backend/test_horas_extras_s2.py -q` — 27 passed.
- No se ejecutó pytest completo ni Docker por restricción del subagente read-only.

## 6. Documentacion actualizada

- `testing/CATALOGO_PRUEBAS.md` contiene entrada actualizada para `test_erp_empleados_service.py` y `test_horas_extras_endpoint_audit.py`.
- No aplica `docs/ESQUEMA_BASE_DATOS.md`: no se observaron cambios de modelo/DDL en el alcance revisado.
- No aplica RBAC manifest: no se agregan endpoints ni módulos protegidos nuevos; se endurece lógica de endpoints existentes.

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos` (riesgos documentados arriba)
- [ ] `bloqueado`

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Evaluar secreto dedicado para HMAC y guardas de producción contra secretos default. | Backend/Security | Próxima iteración |
| Considerar firma de fechas/OT si el frontend no debe poder alterarlas entre pre-liquidación y confirmación. | Backend | Próxima iteración |
| Considerar constraints/UPSERT DB para idempotencia bajo concurrencia. | Backend/DB | Próxima iteración |
