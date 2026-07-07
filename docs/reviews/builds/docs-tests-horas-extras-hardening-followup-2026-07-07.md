# Docs/tests follow-up — Horas Extras hardening post `0dffebe`

**Fecha:** 2026-07-07  
**Modo:** read-only follow-up  
**Subagente:** docs-tests-reviewer  
**Resultado:** approved_with_risks

## Alcance revisado

- `docs/ESQUEMA_BASE_DATOS.md`
- `testing/backend/test_horas_extras_s1.py`
- `testing/backend/test_horas_extras_s8_ot_mano_obra.py`
- `testing/CATALOGO_PRUEBAS.md`
- `docs/reviews/builds/horas-extras-fase1b-evidencia-2026-07-07.md`

## Checks

- Reportado por orquestador: `python -m pytest testing/backend/test_horas_extras_s1.py -q` → **30 passed**.
- Reportado por orquestador: `python -m pytest testing/backend/test_horas_extras_s8_ot_mano_obra.py -q` → **5 passed**.
- Ejecutado por este reviewer: `python -m pytest --collect-only testing/backend/test_horas_extras_s1.py testing/backend/test_horas_extras_s8_ot_mano_obra.py -q` → **35 tests collected**.

## Hallazgos

1. **Bloqueo documental de esquema HE: resuelto.** `docs/ESQUEMA_BASE_DATOS.md` ahora documenta tablas, campos y relaciones principales HE: catálogo, factores ARL, horario pactado/día, bolsa, movimientos, overrides, cálculo semanal/detalle, costos OT, parámetros legales, workflow, festivos, novedades y planificador OT.
2. **Brechas numéricas HEFD/HEFN: resueltas.** S1 valida horas, bruto, carga prestacional y costo total con `pytest.approx` para factores 2.05/2.55.
3. **Brecha pre-vigencia 2026-07-16: resuelta.** S1 cubre semana previa con jornada 44h y divisor 220.
4. **Brechas S8 OT: resueltas para el alcance pedido.** S8 cubre `_ot_id_desde_orden` con entero y CRC32 estable, y agrega aserciones numéricas de distribución de horas/bruto/carga por OT.
5. **Catálogo/evidencia: resueltos para este delta.** `testing/CATALOGO_PRUEBAS.md` y el build report registran la nueva cobertura y los comandos reportados.

## Riesgos / pendientes fuera del delta cerrado

- Para certificar Fase 1B completa sigue pendiente una corrida HE monolítica estable o una aceptación formal de la matriz secuencial aislada con causa/justificación del timeout.
- Si el alcance incluye readiness web, siguen faltando UI/component tests de `PreLiquidacionView`, `HorarioSemanaView`, confirmaciones, estados vacío/error/loading y permisos.
- Persisten gaps no cubiertos por este hardening: carrera/concurrencia real en confirmación/bolsa/costo OT; RN/RF debe tener prueba numérica o decisión documentada si queda deshabilitado/fuera de alcance; edge de exactamente 3 OT por día puede agregarse como cobertura de borde.

## Decisión

**Docs/tests review: approved_with_risks** para el delta de hardening post `0dffebe`. Los blockers específicos de esquema HE y las brechas pedidas quedaron cerrados; los riesgos anteriores de suite completa/UI/concurrencia no quedan cerrados por estos cambios.
