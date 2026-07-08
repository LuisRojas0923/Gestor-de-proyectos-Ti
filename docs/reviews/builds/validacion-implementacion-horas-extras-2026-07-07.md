# Reporte de Validación — Implementación Horas Extras (Fase 1B)

**Fecha:** 2026-07-07
**Build:** Módulo Horas Extras — Fase 1B (rama `Modulo_Geoface`)
**Autor del build:** equipo desarrollo Geoface/HE
**Modo:** validación read-only (auditoría de tests y cobertura)
**Proyecto:** Gestor-de-proyectos-Ti
**Modelo LLM:** `opencode-go/glm-5.2` (glm-5.2)
**Subagente delegado:** docs-tests-reviewer

---

## 1. Archivos inspeccionados

- `testing/backend/test_horas_extras_s0.py` … `test_horas_extras_s9_reglas_gh.py`
- `testing/backend/test_horas_extras_parametros_calculo.py`
- `frontend/src/tests/horasExtrasService.test.ts`
- `frontend/src/tests/horarioUtils.test.ts`
- `frontend/src/tests/PlanificadorSemanalView.test.tsx`
- `docs/reviews/builds/docs-tests-horas-extras-fase1b-rereview-2026-07-07.md`
- `docs/reviews/builds/horas-extras-fase1b-evidencia-2026-07-07.md`
- `testing/CATALOGO_PRUEBAS.md`
- Servicios: `backend_v2/app/services/novedades_nomina/horas_extras_calculo.py`, `planificador_costos_ot.py`, `bolsa_horas_resolver.py`, `festivos_service.py`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| docs-tests-reviewer | approved_with_risks | No (riesgos documentados) | Auditoría de cobertura y calidad de tests |

## 3. Estado general

- **Cobertura real estimada:** 70–78% de lógica de servicio
- **Ratio test/impl:** ≈ 2.0 (~3.700 LOC tests vs ~1.900 LOC servicios HE)
- **Aserciones triviales detectadas:** 0 (`assert True`, `pytest.skip`, `pass`-only) salvo mocks `httpx`
- **Casos declarados en CATALOGO_PRUEBAS:** 138; `--collect-only` s2+s4 = 34 OK
- **Ejecución local:** `pytest s2 s4 -q` colgó en fixture `db_session` (DB Docker no levantada); collect-only OK. Reporte Fase 1B documenta pases 18/16/14/15 **solo con DB disponible**.

## 4. Suites sólidas (criterio numérico real, sin sobreajuste)

- **S1** (`test_horas_extras_s1.py`): `_calcular_horas_extras_semanales`, `_distribuir_horas_por_codigos` con `pytest.approx(rel=1e-6)` sobre valor_hora, bruto, carga, costo_empresa. Cubre HEN inferido, códigos explícitos, topes como advertencia, reparto 50/50.
- **S2** (`test_horas_extras_s2.py`): `confirmar_pre_liquidacion` + persistencia + idempotencia + UPSERT `NominaCostoOt` + auditoría. Verifica `total_horas_hed`, `total_horas_hen`, `total_empleados` con `approx`.
- **S4** (`test_horas_extras_s4.py`): workflow PAGADO/COMPENSADO/ANULADO con reversión de bolsa, resta de costo_ot, compensación parcial/insuficiente, transiciones inválidas. **El más estricto del módulo.**
- **S5-festivos**: Pascua 2024–2030 con fechas canónicas, 18 festivos/año, traslados a lunes (San Pedro 2025, Todos los Santos 2026), sincronización Calendarific mockeada ok/5xx/vacío. Algoritmo Emiliani validado.
- **S6**: `resolver_bolsa_habilitada` — 5 ramas explícitas (default, global true/false, override activo, override revocado). Ejemplo a imitar.
- **S7**: planificador masivo, idempotencia, novedad INC suprime, totales agregados, errores parciales, RBAC `planificador/empleados-erp`, bolsa desactivada no bloquea.
- **S5pp / S5ppp**: cross-midnight raises, francos, reordenamiento, novedad BORRADOR no suprime, festivo vs novedad gana novedad.
- **`horarioUtils.test.ts`**: espejo puro de `_aplicar_registro_diario` con casos reales (07:30→17:00, 30 min → 9h, 45 min, salida ≤ entrada → 0).
- **`horasExtrasService.test.ts`**: stubs `fetch` y valida URL/método/headers/body exactos. Patrón correcto para cliente HTTP.

## 5. Suites con baja calidad o "hechas para pasar"

- **`test_horas_extras_s9_reglas_gh.py`** (4 tests, 74 LOC): solo afirma constantes `HORA_NOCTURNA_INICIO == 19` y `FIN == 6`. No valida que un turno 18:30→19:30 se clasifique mixto/dominical. **Sobreajuste afirmativo.**
- **`TestConstantes` en S1** (4 asserts de literales): útiles contra ediciones erróneas del seed, pero inflan cobertura del motor de cálculo.
- **`test_horas_extras_parametros_calculo.py`** (4 tests): solo 1 verifica cálculo numérico (`valor_hora_ordinaria == 15_000` tras editar divisor=200); los otros 3 solo afirman listas de rutas/strings `"20:00"`.
- **`PlanificadorSemanalView.test.tsx`**: mock total del servicio → contract/shape coverage. No ejercita lógica de presentación de errores parciales completos.

## 6. Brechas críticas (lógica sin cubrir)

1. **HEFD/HEFN sin verificación numérica**: S5ppp comprueba reasignación a `["HEFD"]`/`["HEFN"]`, pero **ningún test** verifica `valor_bruto = horas * valor_hora * 2.05/2.55`, ni `carga_prestacional`, ni `costo_total` para festivos.
2. **RN (recargo nocturno 1.35) y RF (recargo dominical/festivo)**: presentes en catálogo S0 (factor afirmado), pero el motor `calcular_pre_liquidacion` no produce estos códigos → 0% cobertura operativa. Declarar en ADR si son features deshabilitadas.
3. **`planificador_costos_ot.distribuir_costos_ot_plan`**: solo integración indirecta (S8) afirmando `costos[0].total_horas < costos[1].total_horas` (relativo). **Sin aserción numérica de `horas_ot = round(horas_ext * proporcion, 2)`** para proporción conocida. Upsert segunda semana sin test.
4. **`_ot_id_desde_orden` (CRC32 de `zlib` para órdenes no numéricas)**: **cero cobertura**. Rama crítica: orden ERP `"OT-1007"` deriva ID por hash CRC32 — riesgo silencioso de colisión.
5. **Pre-vigencia 2026-07-16 (44h, divisor 220)**: sin test numérico (S1/S9 usan solo semanas post-16/07).
6. **Concurrencia/idempotencia de confirmación**: solo bloqueo por `(cédula, año, semana)` pre-existente; sin race test de dos confirms concurrentes.
7. **Límite "máximo 3 OT por empleado/día"**: S8 solo valida `ValidationError` con 4 asignaciones. Sin edge case de exactamente 3 OK + novedad supresora liberando capacidad.
8. **UI web**: sin tests de interacción para `PreLiquidacionView`/`HorarioSemanaView` (loading/empty/error/permisos).
9. **Documentación**: `docs/ESQUEMA_BASE_DATOS.md` sigue **sin las ~13 tablas HE** (`nomina_calculo_semanal`, `nomina_bolsa_horas`, `nomina_costo_ot`, `nomina_parametros_legales`, `nomina_festivo_calendario`, `nomina_novedad_evento`, etc.).

## 7. Tests / comandos ejecutados

- `pytest testing/backend/test_horas_extras_s2.py testing/backend/test_horas_extras_s4.py --collect-only -q` → 34 collected OK
- `pytest testing/backend/test_horas_extras_s2.py testing/backend/test_horas_extras_s4.py -q` → **HANG** en `db_session` (DB Docker no levantada; asyncpg espera indefinida a `postgresql+asyncpg://user:password_segur…`)
- No se ejecutaron npm/lint/build por alcance read-only de esta validación
- Evidencia de pases taken from `horas-extras-fase1b-evidencia-2026-07-07.md` (18/16/14/15 con DB disponible)

## 8. Documentación actualizada

- [ ] `docs/ESQUEMA_BASE_DATOS.md` — **pendiente**: sin tablas HE (bloqueo documental Fase 1B)
- [ ] `docs/decisions/ADR-NNN-RN-RF.md` — pendiente si RN/RF son features deshabilitadas
- [x] `testing/CATALOGO_PRUEBAS.md` — ya lista S0-S9 y parámetros
- [x] `docs/reviews/builds/horas-extras-fase1b-evidencia-2026-07-07.md` — existe

## 9. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos` (brechas HEFD/HEFN numéricos, RN/RF, CRC32 OT, concurrencia, doc esquema)
- [ ] `bloqueado`

**Conclusión:** el trabajo **no está hecho "para pasar"** en sentido peyorativo (aserciones reales con `pytest.approx`, mocks bien delimitados al perímetro, edge cases de error 409/422/ValueError). Las debilidades son **gaps de cobertura**, no pruebas triviales vestidas de pruebas. Fase 1B sigue `blocked` por `ESQUEMA_BASE_DATOS.md` stale y suite monolítica sin pase estable.

## 10. Seguimiento

| Acción | Responsable | Fecha objetivo |
|---|---|---|
| Test parametrizado HEFD/HEFN con `pytest.approx` en S1 | backend | 2026-07-09 |
| Unit tests `distribuir_costos_ot_plan` + `_ot_id_desde_orden` (string no numérico) | backend | 2026-07-09 |
| RN/RF: test numérico o ADR declarando exclusión | backend | 2026-07-10 |
| Pre-vigencia 2026-07-16 (44h, divisor 220) con HE | backend | 2026-07-10 |
| Race test confirmación/bolsa/costo OT | backend | 2026-07-11 |
| `docs/ESQUEMA_BASE_DATOS.md` con tablas HE | docs | 2026-07-09 |
| Timeout explícito en `db_session` (no colgar sin Docker) | backend | 2026-07-09 |
| UI tests `PreLiquidacionView`/`HorarioSemanaView` | frontend | 2026-07-11 |

---

**Auditoría generada por `opencode-go/glm-5.2` (glm-5.2) vía subagente `docs-tests-reviewer`.**
