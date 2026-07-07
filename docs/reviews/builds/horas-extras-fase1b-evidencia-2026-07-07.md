# Horas Extras Fase 1B - Evidencia de Build

Fecha: 2026-07-07

## Alcance

Validacion de Horas Extras standalone sin integracion obligatoria con GeoFace. Se mantiene carga manual/planificador como respaldo operativo.

## Cambios aplicados

- Se agrego RBAC al selector ERP `GET /planificador/empleados-erp`.
- Se corrigio el prefijo duplicado del subrouter de bolsa para exponer `/bolsa/estado-global` bajo `/api/v2/novedades-nomina/horas-extras`.
- Se agrego RBAC a `GET /bolsa/estado-global`.
- Se agrego `commit()` explicito en endpoints de transicion y compensacion S4.
- Se fuerza `usuario_confirma` desde el usuario autenticado, ignorando el valor enviado por cliente.
- Se fuerza `usuario_confirma` desde el usuario autenticado tambien en `planificador/confirmar`.
- Se corrigio el prefijo duplicado del subrouter de `parametros-calculo`.
- Se corrigio el contrato TypeScript separando `DetalleCalculoItem` de `ConfirmarDetalleItem`.

## Evidencia backend

- `python -m pytest testing/backend/test_horas_extras_s2.py -q`: 18 passed.
- `python -m pytest testing/backend/test_horas_extras_s4.py -q`: 16 passed.
- `python -m pytest testing/backend/test_horas_extras_s6.py -q`: 14 passed.
- `python -m pytest testing/backend/test_horas_extras_s7.py -q`: 16 passed.
- `python -m pytest testing/backend/test_horas_extras_parametros_calculo.py -q`: 4 passed.
- Casos rojos iniciales confirmados y corregidos:
  - Auditoria de confirmacion no debe aceptar usuario falsificado por cliente.
  - Transicion S4 endpoint-level debe persistir tras rollback de sesion llamadora.
  - Compensacion S4 endpoint-level debe persistir tras rollback de sesion llamadora.
  - `bolsa/estado-global` debe tener ruta sin prefijo duplicado y RBAC.
  - `planificador/empleados-erp` debe exigir permiso HE.
  - `planificador/confirmar` no debe aceptar usuario falsificado por cliente.
  - `parametros-calculo` debe tener ruta sin prefijo duplicado y RBAC.

## Evidencia frontend

- `npx tsc --noEmit --pretty false`: passed.
- `npx eslint "src/types/horasExtras.ts" "src/services/horasExtrasService.ts" "src/pages/ServicePortal/pages/HORAS_EXTRAS/HorarioSemanaView.tsx" "src/pages/ServicePortal/pages/HORAS_EXTRAS/PreLiquidacionView.tsx"`: passed.
- `npm run test -- --run src/tests/horasExtrasService.test.ts`: 33 passed.
- `npm run build`: passed.

## Evidencia previa mantenida

Las suites HE no afectadas por los cambios ya se ejecutaron aisladas/secuenciales en esta sesion:

- `test_horas_extras_s0.py`: 27 passed.
- `test_horas_extras_s1.py`: 28 passed.
- `test_horas_extras_s5_festivos.py`: 23 passed.
- `test_horas_extras_s5_novedades.py`: 22 passed.
- `test_horas_extras_s5pp_horario_semana.py`: 12 passed.
- `test_horas_extras_s5ppp_integracion.py`: 13 passed.
- `test_horas_extras_s8_ot_mano_obra.py`: 4 passed.
- `test_horas_extras_s9_reglas_gh.py`: 4 passed.
- `test_horas_extras_parametros_calculo.py`: 4 passed.

## Riesgos residuales

- La corrida monolitica de toda la suite HE sigue siendo lenta y previamente excedio timeout; se adopto matriz secuencial aislada para evitar interferencia de estado compartido.
- `npm run lint` completo sigue fallando por deuda historica fuera de HE; el lint focalizado de HE pasa.
- Pendiente ampliar evidencia UI/componente para formularios y modales HE.
- Pendiente actualizar `docs/ESQUEMA_BASE_DATOS.md` con las tablas HE para cierre documental completo.
- Pendiente endurecer concurrencia/idempotencia con pruebas dedicadas para confirmacion, bolsa y costo OT antes de produccion amplia.

## Hardening post-piloto agregado

- `docs/ESQUEMA_BASE_DATOS.md` actualizado con tablas HE: catalogo, factores ARL, horario pactado, horario diario, bolsa, movimientos, overrides, calculo semanal, detalle, costos OT, parametros legales, workflow, festivos, novedades y planificador OT.
- `python -m pytest testing/backend/test_horas_extras_s1.py -q`: 30 passed.
- `python -m pytest testing/backend/test_horas_extras_s8_ot_mano_obra.py -q`: 5 passed.
- Cobertura nueva:
  - HEFD/HEFN con `pytest.approx` sobre horas, bruto, carga prestacional y costo total.
  - Semana previa a 2026-07-16 con jornada 44h y divisor 220.
  - Reparto OT con horas y valores brutos/carga esperados por proporcion.
  - `_ot_id_desde_orden` con orden numerica y orden no numerica por CRC32 estable.
