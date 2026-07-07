# Backend re-review - Horas Extras Fase 1B standalone

Fecha: 2026-07-07

## Resultado

Backend review: blocked

## Estado de bloqueantes previos


- RESUELTO: CRITICO backend previo — `transicionar_calculo_endpoint` y `compensar_bolsa_endpoint` ahora hacen `await db.commit()` tras servicio exitoso.
- RESUELTO: ALTO backend previo — `GET /planificador/empleados-erp` ahora depende de `requiere_permiso_he`.
- RESUELTO: BLOQUEANTE security previo — `GET /bolsa/estado-global` ya no duplica prefijo y ahora depende de `requiere_permiso_he`.
- RESUELTO PARCIAL: ALTO security previo — `confirmar_pre_liquidacion_endpoint` ya deriva `usuario_confirma` desde usuario autenticado, pero `POST /planificador/confirmar` sigue usando `payload.usuario_confirma`.

## Hallazgos restantes

### BLOQUEANTE - Planificador confirmar mantiene auditoria falsificable

- Archivo: `backend_v2/app/api/novedades_nomina/routers/horas_extras_planificador.py`, `backend_v2/app/services/novedades_nomina/planificador_persistencia.py`.
- Evidencia: `confirmar_plan_endpoint` recibe `usuario` autenticado pero no lo pasa al servicio; `confirmar_plan()` construye `PreLiquidacionConfirmar(... usuario_confirma=payload.usuario_confirma)`.
- Impacto: cualquier usuario con permiso HE puede atribuir confirmaciones masivas a otro identificador desde el cliente.
- Requerido: derivar usuario en el endpoint y pasarlo al servicio, o sobrescribir `payload.usuario_confirma` antes de llamar `confirmar_plan`; agregar test endpoint/service que pruebe que el valor del cliente se ignora.

### BLOQUEANTE - Subrouter de parametros mantiene prefijo duplicado

- Archivo: `backend_v2/app/api/novedades_nomina/routers/horas_extras_parametros.py`.
- Evidencia: el subrouter conserva `prefix="/horas-extras"` y se incluye dentro del router padre que ya tiene `prefix="/horas-extras"`.
- Impacto: los endpoints reales quedan bajo `/api/v2/novedades-nomina/horas-extras/horas-extras/parametros-calculo`, mientras el frontend llama `/api/v2/novedades-nomina/horas-extras/parametros-calculo`; la configuracion legal de calculo queda inaccesible por contrato normal.
- Requerido: quitar prefijo del subrouter y agregar test de rutas sin duplicado para parametros.

### MEDIO - `test_horas_extras_s7.py` supera limite de 550 lineas

- Evidencia: el archivo reporta 584 lineas.
- Requerido: dividir la suite S7 en archivos/modulos por responsabilidad.

### MEDIO - Documentacion de esquema HE sigue pendiente

- Archivo: `docs/ESQUEMA_BASE_DATOS.md`.
- Impacto: tablas HE actuales no estan reflejadas en el esquema principal.

## Riesgos residuales ya conocidos

- Concurrencia/idempotencia: confirmacion/upserts/bolsa aun dependen de select-then-insert/update sin `IntegrityError`, `ON CONFLICT` o bloqueo explicito.
- ERP sincronico dentro de endpoints async sigue siendo riesgo bajo carga.
- Job batch HE conserva riesgo de fallo al cruzar fin de mes.

## Verificacion read-only

- `python -m pytest --collect-only testing/backend/test_horas_extras_s2.py testing/backend/test_horas_extras_s4.py testing/backend/test_horas_extras_s6.py testing/backend/test_horas_extras_s7.py`: 63 tests collected.
- Evidencia de ejecucion provista por el usuario: S2 18 passed, S4 16 passed, S6 14 passed, S7 15 passed.
