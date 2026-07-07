# Docs/tests review — Fase 1B Horas Extras standalone readiness

**Fecha:** 2026-07-07  
**Modo:** build review read-only  
**Subagente:** docs-tests-reviewer  
**Resultado:** bloqueado

---

## Alcance revisado

- `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md`
- `docs/reviews/builds/2026-07-06_geoface-horas-extras-fase0-baseline.md`
- `docs/reviews/builds/docs-tests-horas-extras-*.md`
- `docs/ESQUEMA_BASE_DATOS.md`
- `testing/CATALOGO_PRUEBAS.md`
- `testing/backend/test_horas_extras*.py`
- `frontend/src/tests/horasExtrasService.test.ts`
- `frontend/src/tests/PlanificadorSemanalView.test.tsx` (localizado como cobertura UI parcial)
- Diffs actuales de `HorarioSemanaView.tsx` y `PreLiquidacionView.tsx` solo para entender alcance HE web.

## Evidencia conocida / reportada

- Reportado por orquestador/implementador: todos los archivos backend HE pasan en modo aislado/secuencial.
- Reportado: suite monolítica HE combinada agotó timeout; ejecución anterior de `s2` mostró interferencia bajo ejecución concurrente/combinada, aunque pasa aislada.
- Reportado: `frontend/src/tests/horasExtrasService.test.ts` pasó 33 tests.
- Reportado: build frontend pasó.
- Reportado: lint completo falla por deuda repo-wide no relacionada; ESLint dirigido a HE pasó.
- Ejecutado por este reviewer: `python -m pytest --collect-only ...test_horas_extras... -q` → **194 tests collected**.

Este reviewer no ejecutó suites reales backend ni comandos npm por alcance read-only/autorizaciones del subagente.

## Hallazgos por severidad

### Críticos / bloqueantes

1. **La evidencia actual no certifica una suite HE completa estable en una sola ejecución.**  
   La Fase 1B exige “Suite HE backend completa pasa” y el plan contiene el comando monolítico de validación. El pase aislado/secuencial es valioso, pero el timeout combinado y la interferencia previa de `s2` dejan riesgo real de contaminación de estado, fixtures globales o dependencia de orden. Para readiness standalone productivo, esto bloquea hasta tener una corrida combinada estable o una matriz secuencial oficialmente documentada con causa raíz y aceptación explícita del riesgo.

2. **`docs/ESQUEMA_BASE_DATOS.md` está desactualizado frente a los modelos HE existentes.**  
   La documentación de esquema solo muestra tablas legacy de nómina (`nomina_archivos`, `nomina_conceptos`, `nomina_registros_*`, etc.), pero los modelos actuales declaran tablas HE como `nomina_catalogo_novedades`, `nomina_factor_prestacional_riesgo`, `nomina_horario_pactado`, `nomina_bolsa_horas`, `nomina_bolsa_horas_movimientos`, `nomina_override_autoriza_he`, `nomina_calculo_semanal`, `nomina_calculo_semanal_detalle`, `nomina_costo_ot`, `nomina_parametros_legales`, `nomina_calculo_workflow_evento`, `nomina_festivo_calendario`, `nomina_horario_pactado_dia`, `nomina_novedad_evento`, `nomina_planificador_dia_ot` y `nomina_bolsa_ot_override`. Esto incumple el SSOT documental requerido para cambios de modelos/schema.

### Altos

3. **`testing/CATALOGO_PRUEBAS.md` no registra la suite HE completa.**  
   El catálogo solo lista S8, S9 y parámetros de cálculo. Faltan S0, S1, S2, S4, S5 festivos, S5 novedades, S5pp horario semana, S5ppp integración, S6, S7 y las pruebas frontend relevantes. Según el mandato de testing, toda suite nueva debe quedar registrada con propósito y estado.

4. **El plan Fase 1B sigue sin reflejar la evidencia ya obtenida ni los riesgos residuales.**  
   `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md` mantiene sin marcar las tareas de pruebas backend, pruebas frontend, concurrencia, migraciones/seeds, flujo web manual y RBAC/auditoría. Falta un build report de Fase 1B que registre comandos exactos, salidas, timeout monolítico, estrategia secuencial y resultados frontend/build/lint.

### Medios

5. **No se observa cobertura de carrera/concurrencia real para bolsa/confirmación.**  
   La colección muestra cobertura amplia de idempotencia y flujo secuencial, pero no tests tipo `asyncio.gather`, race o sesiones paralelas para confirmar la misma semana o actualizar bolsa/costos OT de forma concurrente. El plan tiene “Revisar concurrencia en bolsa de horas” pendiente y el antecedente de interferencia en `s2` aumenta el riesgo.

6. **La cobertura frontend automatizada está concentrada en cliente HTTP y planificador, no en todo el flujo standalone.**  
   `horasExtrasService.test.ts` cubre URLs, headers, payloads y errores del service; `PlanificadorSemanalView.test.tsx` cubre parte del planificador. Para readiness Fase 1B siguen faltando pruebas o evidencia manual trazable de `HorarioSemanaView`, `PreLiquidacionView`, confirmación, bolsa, costos OT, estados vacíos/errores y permisos UI.

### Bajos

7. **La evidencia de lint/build necesita quedar desambiguada.**  
   Full lint falla por deuda no relacionada y targeted HE ESLint pasa, pero esa separación todavía no está en un reporte trazable. Registrar comandos exactos evita que el fallo repo-wide bloquee falsamente HE o que se ignore una regresión real de HE.

## Required tests

- Repetir y guardar evidencia del comando monolítico HE o definir una matriz secuencial oficial con causa raíz del timeout/interferencia.
- Agregar o justificar pruebas de concurrencia para `confirmar_pre_liquidacion`, bolsa y costo OT con sesiones separadas.
- Ejecutar y registrar `python -m pytest testing/backend/test_horas_extras_*.py` según matriz aprobada.
- Ejecutar y registrar frontend HE: `horasExtrasService.test.ts`, `PlanificadorSemanalView.test.tsx` y/o pruebas/manual QA para horario semanal, pre-liquidación, confirmación, bolsa, costos OT y errores.
- Registrar targeted ESLint HE y build frontend con comandos exactos y salidas resumidas.

## Required docs

- Actualizar `docs/ESQUEMA_BASE_DATOS.md` con las tablas HE reales, preferiblemente vía proceso de sincronización documental del proyecto.
- Actualizar `testing/CATALOGO_PRUEBAS.md` para incluir todas las suites HE backend y frontend con estado actual.
- Crear/actualizar build report Fase 1B con evidencia de comandos, timeout monolítico, ejecución secuencial aislada y riesgos aceptados.
- Marcar o comentar las tareas correspondientes en el plan de producción GeoFace + HE cuando el orquestador autorice editarlo.
- No se requiere ADR nueva salvo que se decida formalmente aceptar “secuencial-only” como estrategia durable o cambiar la política de aislamiento de tests.

## Blocking reasons

- Suite HE completa combinada aún no tiene pase estable documentado.
- MER/schema documental está desactualizado frente a modelos HE.
- Catálogo de pruebas no refleja la cobertura HE real.
- Evidencia Fase 1B no está persistida en plan/build report con comandos y salidas.

## Decisión final

**Docs/tests review: blocked** para certificar Fase 1B standalone productivo. La cobertura existente es amplia y el pase aislado/secuencial reduce riesgo funcional, pero la readiness necesita cerrar estabilidad combinada o aceptación explícita de matriz secuencial, más actualización de esquema/catálogo/evidencia.
