# Reporte de Revisión de Build

> **Estado histórico:** revisión intermedia no vigente. El cierre canónico está en `2026-07-21_horas-extras-planilla-detallada-final.md`.

**Fecha:** 2026-07-21
**Build:** Enriquecimiento ERP de GET /calculos
**Autor del build:** No especificado
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados

- `backend_v2/app/models/novedades_nomina/schemas_horas_extras.py`
- `backend_v2/app/services/novedades_nomina/horas_extras_confirmacion.py`
- `backend_v2/app/api/novedades_nomina/routers/horas_extras_consultas.py`
- `testing/backend/test_horas_extras_calculos_enriquecimiento.py`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | aprobado_con_riesgos | No | Revisión limitada al alcance solicitado. |

## 3. Hallazgos bloqueantes

Ninguno.

## 4. Hallazgos no bloqueantes

1. **Media — Retención de recursos ante latencia del ERP.** En `horas_extras_confirmacion.py:346-358`, la consulta PostgreSQL local abre la transacción de `AsyncSession` y luego se espera la consulta ERP antes de finalizar la dependencia. Un ERP lento puede mantener ocupada la conexión local durante toda la espera y aumentar la presión sobre el pool. Conviene acotar la espera ERP y evitar conservar la transacción/conexión local durante I/O externo.
2. **Baja — Falta cobertura HTTP del contrato.** `test_horas_extras_calculos_enriquecimiento.py:25-69` valida el servicio con objetos sintéticos, pero no comprueba que `horas_extras_consultas.py:30-58` serialice `nombre_empleado`, preserve RBAC/alcance y responda `null` cuando falla o falta la sesión ERP. También faltan casos explícitos para `db_erp=None` y respuesta ERP parcial.
3. **Baja — Diagnóstico insuficiente de fallas ERP.** `horas_extras_confirmacion.py:359-360` degrada correctamente, pero descarta tipo y contexto de la excepción. Registrar la excepción con `exc_info=True`, sin datos sensibles, facilitaría distinguir indisponibilidad de defectos de programación.

## 5. Tests / comandos ejecutados

- `python -m pytest --collect-only testing/backend/test_horas_extras_calculos_enriquecimiento.py` — PASS; 3 tests recolectados.
- Ejecución informada por el solicitante: 12 tests backend relacionados — PASS.
- Ejecución informada por el solicitante: infraestructura/regresiones — 4 PASS / 4 SKIPPED.
- No se ejecutaron tests; el rol solo autoriza `--collect-only`.

## 6. Documentacion actualizada

- [ ] `docs/ESQUEMA_BASE_DATOS.md` — no aplica; no cambia estructura de BD.
- [ ] ADR/bitácora — no aplica para este cambio aditivo.
- [ ] `testing/CATALOGO_PRUEBAS.md` — confirmar fuera del alcance que la nueva suite esté registrada.
- RBAC: no requiere registro nuevo; la dependencia `requiere_permiso_he_leer` y el filtrado por cédulas permanecen.

## 7. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Añadir prueba HTTP de serialización, degradación y alcance/RBAC. | Implementación backend | Antes de integrar |
| Evaluar límite de espera ERP y liberación temprana de la conexión local. | Implementación backend | Antes de producción |
| Confirmar registro de la suite en `testing/CATALOGO_PRUEBAS.md`. | Orquestador | Antes de integrar |
