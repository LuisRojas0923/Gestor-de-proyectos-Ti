# Docs/tests re-review — Fase 1B Horas Extras después de fixes

**Fecha:** 2026-07-07  
**Modo:** re-review read-only  
**Subagente:** docs-tests-reviewer  
**Resultado:** blocked

## Alcance revisado

- `testing/CATALOGO_PRUEBAS.md`
- `docs/reviews/builds/horas-extras-fase1b-evidencia-2026-07-07.md`
- Diffs actuales en routers HE y tests S2/S4/S6/S7 solo para verificar trazabilidad de pruebas.
- `docs/ESQUEMA_BASE_DATOS.md` contra modelos/migraciones HE existentes.
- Evidencia previa en reportes backend/frontend/security Fase 1B.

## Checks ejecutados por este reviewer

- `python -m pytest --collect-only testing/backend/test_horas_extras_s2.py testing/backend/test_horas_extras_s4.py testing/backend/test_horas_extras_s6.py testing/backend/test_horas_extras_s7.py -q` → **63 tests collected**.

No ejecuté suites reales backend, npm, build ni lint por alcance/autorizaciones del subagente. La evidencia de ejecución real queda tomada del reporte `horas-extras-fase1b-evidencia-2026-07-07.md`.

## Blockers resueltos

1. **Catálogo backend HE:** resuelto para S0-S9/parámetros. `testing/CATALOGO_PRUEBAS.md` ahora lista S0, S1, S2, S4, S5 festivos, S5 novedades, S5'' horario semana, S5''' integración, S6, S7, S8, S9 y parámetros de cálculo.
2. **Evidencia Fase 1B:** resuelta como reporte trazable. `docs/reviews/builds/horas-extras-fase1b-evidencia-2026-07-07.md` registra comandos/resultados backend, frontend, suites HE previas y riesgos residuales.

## Hallazgos restantes

### Crítico / bloqueante

1. **`docs/ESQUEMA_BASE_DATOS.md` sigue desactualizado frente a las tablas HE.**  
   El esquema principal no documenta las tablas reales declaradas en modelos/migraciones HE (`nomina_catalogo_novedades`, `nomina_horario_pactado`, `nomina_bolsa_horas`, `nomina_bolsa_horas_movimientos`, `nomina_calculo_semanal`, `nomina_calculo_semanal_detalle`, `nomina_costo_ot`, `nomina_parametros_legales`, `nomina_festivo_calendario`, `nomina_novedad_evento`, `nomina_horario_pactado_dia`, `nomina_planificador_dia_ot`, `nomina_bolsa_ot_override`, etc.). Esto mantiene bloqueado el cierre documental por SSOT de base de datos.

### Altos

2. **La suite HE monolítica completa sigue sin pase estable o aceptación formal de matriz secuencial.**  
   La evidencia nueva documenta pases aislados/secuenciales y el riesgo de timeout/interferencia, pero no registra causa raíz ni aceptación explícita del riesgo como criterio oficial de salida. Para cerrar Fase 1B se necesita una corrida combinada estable o una decisión documentada que apruebe la matriz secuencial aislada.

3. **Faltan pruebas UI/componentes para el flujo web HE.**  
   La evidencia frontend cubre `tsc`, ESLint focalizado, service test de 33 pruebas y build, pero no hay tests de interacción para `PreLiquidacionView`, `HorarioSemanaView` ni modales/confirmaciones/estados vacíos-error-permisos. Si el alcance de Fase 1B incluye readiness web, esto sigue siendo un blocker de cobertura.

### Medios

4. **Cobertura de concurrencia/idempotencia real aún no está cerrada.**  
   Los fixes agregan pruebas útiles de auditoría, commit endpoint-level y wiring RBAC/rutas, pero sigue faltando prueba de carrera con sesiones/requests paralelos para confirmación, bolsa y costo OT.

5. **Pruebas RBAC endpoint-level son mayormente de wiring/introspección.**  
   S6/S7 verifican presencia de dependencias y rutas, lo cual cubre regresiones de prefijo/dependency, pero sería mejor agregar pruebas HTTP 403/200 con usuario sin/con permiso para cerrar seguridad operativa.

## Required tests

- Mantener evidencia de S2/S4/S6/S7 passing reportada: 18/16/14/15.
- Cerrar suite HE completa: monolítica estable o matriz secuencial oficialmente aceptada con causa/justificación.
- Agregar UI/component tests para HE web: pre-liquidación, horario semanal, confirmación/cancelación, estados loading/empty/error y permisos.
- Agregar concurrencia/race tests para confirmación, bolsa y costo OT.
- Agregar pruebas HTTP RBAC 403/200 para endpoints corregidos cuando sea posible.

## Required docs

- Actualizar `docs/ESQUEMA_BASE_DATOS.md` con las tablas/campos/relaciones HE reales.
- Si se adopta matriz secuencial como política durable, documentar la decisión en reporte/ADR o actualizar el plan con aceptación explícita.
- Opcional antes de cierre: marcar/comentar tareas de Fase 1B en `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md` para que el plan no quede visualmente stale.

## Blocking reasons

- Esquema DB documental sigue stale.
- Suite HE completa no tiene pase monolítico ni excepción formal aceptada.
- Cobertura UI/componentes HE sigue ausente para readiness web.

## Decisión final

**Docs/tests review: blocked.** Catálogo y evidencia quedaron resueltos; los bloqueos restantes son esquema DB, estrategia oficial para la suite HE completa y cobertura UI si se pretende cerrar Fase 1B web/productiva.
