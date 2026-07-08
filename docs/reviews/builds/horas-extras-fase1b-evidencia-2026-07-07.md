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

## Hardening RBAC granular

- Se agregaron permisos RBAC granulares para HE: `nomina_horas_extras.leer`, `nomina_horas_extras.planificar`, `nomina_horas_extras.confirmar`, `nomina_horas_extras.compensar` y `nomina_horas_extras.admin`.
- Se centralizaron dependencias backend en `horas_extras_permisos.py` y se reemplazo el chequeo coarse en routers HE.
- Se agrego migracion de arranque para copiar roles con permiso legacy `nomina_horas_extras` hacia los permisos granulares, sin aceptar el legacy en endpoints.
- La transicion `COMPENSADO` ahora exige `nomina_horas_extras.confirmar` por dependencia de ruta y `nomina_horas_extras.compensar` por validacion adicional.
- Se actualizo la proteccion frontend de rutas HE para exigir permisos granulares por pantalla.
- `python -m pytest testing/backend/test_horas_extras_rbac_granular.py -q`: 6 passed.
- `python -m pytest testing/backend/test_horas_extras_rbac_granular.py testing/backend/test_horas_extras_parametros_calculo.py::test_parametros_calculo_route_no_duplica_prefijo_y_exige_permiso_he testing/backend/test_horas_extras_s6.py::test_bolsa_estado_global_route_no_duplica_prefijo_y_exige_permiso_he testing/backend/test_horas_extras_s7.py::test_planificador_empleados_erp_exige_permiso_he testing/backend/test_audit_coverage_manifest.py -q`: 11 passed.
- `python -m pytest testing/backend/test_horas_extras_s2.py -q`: 18 passed.
- `python -m pytest testing/backend/test_audit_coverage_manifest.py -q`: 2 passed.
- `npm run test -- --run src/tests/horasExtrasService.test.ts`: 33 passed.
- `npx eslint "src/pages/ServicePortal.tsx" "src/pages/ServicePortal/pages/DashboardView.tsx" "src/pages/ServicePortal/pages/HORAS_EXTRAS/CalculoDetailView.tsx"`: passed.
- `npx tsc --noEmit --pretty false`: passed.
- `npm run build`: passed.
- `python scripts/sync_docs.py`: passed; actualizo `docs/ESQUEMA_BASE_DATOS.md` desde la base local.
- `python -m pytest testing/backend/test_horas_extras_s6.py -q`: 14 passed.
- `python -m pytest testing/backend/test_horas_extras_parametros_calculo.py testing/backend/test_horas_extras_s6.py -q`: 18 passed.
- Causa raíz del fallo S6: `test_horas_extras_parametros_calculo.py._cleanup` borraba HED del catálogo sin restaurarlo; S6 dependía de HED para acreditar bolsa. Fix: S6 ahora es autónomo con `_setup_catalogo` que hace upsert de HED/HEN; parametros_calculo hace upsert de HED y factor ARL en lugar de insert directo.

## Hardening motor de calculo HF

- Se corrigio la liquidacion de `HF` para trabajo festivo dentro de jornada ordinaria: ahora puede liquidarse aunque la semana no exceda 42h.
- En contexto festivo se separa `HF` para la porcion ordinaria y `HEFD`/`HEFN` para la porcion extra.
- El tope semanal legal se mantiene sobre HE reales; `HF` ordinaria no dispara advertencia de tope semanal aunque sea liquidable.
- Se hizo estable `test_horas_extras_s2.py` limpiando la configuracion global de bolsa antes del caso que valida bolsa deshabilitada por defecto.
- `python -m pytest testing/backend/test_horas_extras_s1.py::TestCalculoBasico::test_hora_festiva_ordinaria_hf_liquida_dentro_de_42h testing/backend/test_horas_extras_s1.py::TestCalculoBasico::test_festivo_con_extra_separa_hf_ordinaria_y_hefd_extra testing/backend/test_horas_extras_s5ppp_integracion.py::TestAplicarContextoFestivos::test_festivo_en_lunes_genera_HEFD_jornada_diurna -q`: primero 3 failed, luego 3 passed tras el fix.
- `python -m pytest testing/backend/test_horas_extras_s1.py::TestCalculoBasico::test_hf_ordinaria_no_dispara_tope_semanal_de_horas_extra -q`: primero 1 failed, luego passed tras ajustar el contador legal de HE.
- `python -m pytest testing/backend/test_horas_extras_s1.py -q`: 33 passed.
- `python -m pytest testing/backend/test_horas_extras_s5ppp_integracion.py -q`: 13 passed.
- `python -m pytest testing/backend/test_horas_extras_s2.py -q`: 18 passed.
- `python -m pytest testing/backend/test_horas_extras_s8_ot_mano_obra.py -q`: 5 passed.
- `python -m pytest testing/backend/test_horas_extras_s9_reglas_gh.py -q`: 4 passed.
- `python -m pytest testing/backend/test_horas_extras_s2.py testing/backend/test_horas_extras_s5ppp_integracion.py testing/backend/test_horas_extras_s8_ot_mano_obra.py testing/backend/test_horas_extras_s9_reglas_gh.py -q`: 40 passed.
- Riesgo residual aceptado para siguiente iteracion: `total_horas_extras` sigue representando horas liquidadas en detalles, incluyendo `HF`; se recomienda separar metricas de HE reales vs recargos ordinarios antes de produccion amplia.
