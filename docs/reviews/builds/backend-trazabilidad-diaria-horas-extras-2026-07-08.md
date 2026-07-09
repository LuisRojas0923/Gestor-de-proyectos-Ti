# Plantilla — Reporte de Revisión de Build

**Fecha:** 2026-07-08
**Build:** Plan trazabilidad diaria de horarios y recargos de Horas Extras
**Autor del build:** backend-reviewer
**Modo:** build
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos modificados/revisados

- `docs/reviews/plans/2026-07-08_plan-trazabilidad-diaria-horas-extras.md`
- `backend_v2/app/models/novedades_nomina/horas_extras.py`
- `backend_v2/app/models/novedades_nomina/schemas_horas_extras.py`
- `backend_v2/app/models/novedades_nomina/schemas_horas_extras_planificador.py`
- `backend_v2/app/services/novedades_nomina/horas_extras_service.py`
- `backend_v2/app/services/novedades_nomina/horas_extras_calculo.py`
- `backend_v2/app/services/novedades_nomina/horas_extras_confirmacion.py`
- `backend_v2/app/services/novedades_nomina/planificador_calculo.py`
- `backend_v2/app/services/novedades_nomina/planificador_persistencia.py`
- `backend_v2/app/services/novedades_nomina/planificador_costos_ot.py`
- `backend_v2/app/core/migrations/horas_extras_migration*.py`
- `backend_v2/app/core/migrations/manager.py`
- `backend_v2/app/core/rbac_manifest.py`
- `testing/backend/test_horas_extras_s5_festivos.py`
- `testing/backend/test_horas_extras_s5_novedades.py`
- `testing/backend/test_horas_extras_s7.py`

## 2. Subagentes ejecutados

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | bloqueado | si | Revisión de plan backend FastAPI/SQLAlchemy async/PostgreSQL. |

## 3. Hallazgos bloqueantes

### CRITICO — `confirmar_pre_liquidacion` no tiene datos suficientes para persistir el snapshot diario

El plan exige construir `DetalleDiarioCalculo` al confirmar, pero el contrato actual `PreLiquidacionConfirmar` solo trae totales/detalles agregados (`detalles`) y no trae `registro_diario`, hora entrada/salida, minutos de almuerzo, fuente, evidencia, festivo/novedad ni OT por día. Con el contrato actual no es posible responder “qué horario se usó” desde la confirmación individual. Además, confirmar con importes enviados por cliente mantiene riesgo de manipulación.

**Cambio requerido:** antes de implementar, definir uno de estos caminos:

1. `PreLiquidacionConfirmar` debe incluir un DTO diario tipado (7 días) con horario/fuente/evidencia y el backend debe recalcular agregados y detalle diario server-side antes de persistir; o
2. crear una pre-liquidación/draft server-side con ID y confirmar por referencia, recalculando desde el contexto guardado.

El endpoint debe rechazar confirmaciones nuevas sin contexto diario suficiente.

### CRITICO — Modelo `nomina_calculo_diario_detalle` ambiguo para días con múltiples conceptos

El plan propone “una fila por fecha y código” pero incluye campos de día (`hora_entrada`, `hora_salida`, `horas_trabajadas`, `horas_ordinarias`) y campos monetarios por concepto en la misma fila. En un domingo/festivo con `HF` + `HEFD` se duplicaría el horario y podrían duplicarse totales si alguien suma columnas de día.

**Cambio requerido:** normalizar en dos niveles, o documentar explícitamente la semántica:

- Recomendado: `nomina_calculo_diario` (1 fila por cálculo+fecha) con horario/contexto/festivo/novedad/fuente, y `nomina_calculo_diario_concepto` (N filas por día) con `codigo_novedad`, `horas_concepto`, factor y costos.
- Si se conserva una sola tabla, agregar `horas_concepto`, `secuencia`, reglas de suma y constraints/índices que eviten duplicados por `(calculo_id, fecha, codigo_calculado, ot_id, secuencia)`.

### CRITICO — Falta definir retención/auditoría e idempotencia en migración

El plan deja abierto si la FK debe usar cascade o conservar evidencia. Para una tabla de auditoría legal, `ON DELETE CASCADE` destruiría trazabilidad al eliminar/anular la cabecera. También faltan constraints para `dia_semana`, horas no negativas, fuente/código, índices únicos de idempotencia y política para históricos sin snapshot.

**Cambio requerido:** fijar en el plan:

- No borrado físico de cálculos confirmados; anulación lógica por workflow.
- FK de snapshot sin cascade destructivo (`RESTRICT`/`NO ACTION`) o política explícita equivalente.
- Constraints PostgreSQL: `CHECK (dia_semana BETWEEN 1 AND 7)`, `CHECK (minutos_almuerzo BETWEEN 0 AND 240)`, horas/costos `>= 0`, fuente en catálogo cerrado, FK lógica o real a catálogo de novedades.
- Índice único/idempotente para no duplicar snapshots por retry.
- Migración idempotente registrada en `manager.py` y blindaje estructural/documentación en `docs/ESQUEMA_BASE_DATOS.md`.

### CRITICO — Transacciones, concurrencia y OT no quedan atómicas

El flujo actual de confirmación hace `commit()` dentro de `confirmar_pre_liquidacion`; luego `confirmar_plan` llama `distribuir_costos_ot_plan`, que también hace `commit()`. Si falla la distribución OT o la persistencia diaria después de la cabecera, puede quedar un cálculo confirmado parcial. Además, la idempotencia actual depende de un `SELECT` previo y puede sufrir carrera hasta el `UNIQUE` de DB.

**Cambio requerido:** el plan debe exigir una unidad transaccional por empleado: cabecera, detalle agregado, detalle diario, bolsa y costo OT. Capturar `IntegrityError` del índice único y responder 409 con rollback. La distribución OT debe ser idempotente por `calculo_id` y no sumar dos veces en reintentos.

## 4. Hallazgos no bloqueantes / riesgos altos

### ALTO — Motor común aún no está especificado como contrato único

El plan acierta al pedir una función pura compartida, pero debe definir entrada/salida concreta: fechas ISO, horarios, minutos, fuente/evidencia, novedades confirmadas/payload, festivos, domingo, jornada nocturna, OT y parámetros legales. Debe reemplazar las rutas divergentes actuales (`ejecutar_pre_liquidacion`, `pre_calcular_plan`, `_construir_detalles_confirmacion`, `distribuir_costos_ot_plan`) para evitar reglas duplicadas.

### ALTO — Domingo debe tratarse independiente del calendario de festivos

El plan menciona `es_domingo`, pero la implementación prevista debe clasificar domingo por `fecha.isoweekday() == 7` aunque `nomina_festivo_calendario` no tenga fila. Tests deben cubrir domingo no festivo y festivo entre semana.

### ALTO — Novedades del planificador requieren estado/fuente explícitos

`ejecutar_pre_liquidacion` usa novedades `CONFIRMADO`; el planificador puede enviar novedades en payload o guardar `BORRADOR`. El plan debe definir si una novedad de payload suprime horas al confirmar, si se auto-confirma, o si solo queda como snapshot no vinculante. Guardar `novedad_evento_id`, `novedad_codigo` y estado/fuente evita ambigüedad.

### ALTO — Costos OT por día deben reconciliar contra `NominaCostoOt`

El plan debe exigir que la suma diaria/concepto por OT cuadre con `NominaCostoOt`. Además, revisar el índice único existente de costo OT antes de ampliar por CC/SCC/subíndice, porque la lógica consulta más dimensiones que el índice único original.

### ALTO — Tipos PostgreSQL/Pydantic para dinero y horas

El plan dice `numeric/float`. Para dinero/costos y horas auditables usar PostgreSQL `NUMERIC(p,s)` y Pydantic `Decimal`; evitar `float` en nuevos campos monetarios. `creado_en` debe ser `TIMESTAMPTZ NOT NULL DEFAULT NOW()` o `datetime.now(timezone.utc)`.

### MEDIO — RBAC y PII/GeoFace

Si se extiende `GET /calculos/{id}` con detalle diario, puede bastar `nomina_horas_extras.leer`. Si se crea endpoint nuevo o se expone evidencia GeoFace/biométrica, debe registrarse o mapearse en RBAC y tener tests 403. No exponer URLs/evidencia biométrica a roles de solo lectura operativa sin decisión de seguridad.

### MEDIO — Tamaño de archivos de pruebas

`testing/backend/test_horas_extras_s7.py` ya supera 550 líneas. No agregar más escenarios allí. Crear archivos nuevos, por ejemplo `testing/backend/test_horas_extras_s10_trazabilidad_diaria.py` y `testing/backend/test_horas_extras_s10_concurrencia.py`.

## 5. Tests / comandos ejecutados

- No se ejecutaron tests por instrucción de revisión solo lectura.
- Inspección read-only con lectura de plan, servicios, modelos, migraciones, RBAC y tests existentes.

## 6. Documentacion actualizada

- [ ] `docs/ESQUEMA_BASE_DATOS.md` debe agregarse al criterio de salida con campos, relaciones, constraints e índices reales.
- [ ] `testing/CATALOGO_PRUEBAS.md` debe registrar la nueva suite.
- [ ] Considerar ADR o decisión durable para política de históricos sin snapshot y retención/no borrado.

## 7. Decision final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos`
- [x] `bloqueado` (motivos en hallazgos bloqueantes)

## 8. Seguimiento

| Accion | Responsable | Fecha objetivo |
|---|---|---|
| Redefinir contrato de confirmación para incluir/recalcular contexto diario server-side. | Backend | 2026-07-08 |
| Normalizar o precisar el modelo diario/concepto con constraints PostgreSQL e idempotencia. | Backend/DB | 2026-07-08 |
| Diseñar transacción única por empleado y manejo `IntegrityError`/rollback. | Backend | 2026-07-08 |
| Completar matriz de tests backend: migración, domingo/festivo, novedad, equivalencia plan/pre-liquidación, rollback, concurrencia, OT y RBAC 403. | Backend/QA | 2026-07-08 |

---

Backend review: blocked

Findings: 4 críticos, 5 altos, 2 medios.

Required tests: nueva suite backend para snapshot diario, migración/constraints, confirmación individual y planificador, domingo/festivo, novedades, equivalencia de motor común, idempotencia/concurrencia, rollback parcial, reconciliación OT y RBAC 403 si hay endpoint/evidencia nueva.

Required docs/RBAC follow-up: actualizar `docs/ESQUEMA_BASE_DATOS.md`, `testing/CATALOGO_PRUEBAS.md`; definir política de históricos sin snapshot; confirmar si el detalle diario queda bajo `nomina_horas_extras.leer` o requiere permiso nuevo por evidencia GeoFace.

Blocking reasons: el plan no garantiza que `confirmar_pre_liquidacion` tenga el contexto diario necesario, el modelo propuesto puede duplicar semántica en días con varios conceptos, la migración no fija retención/idempotencia/constraints, y la persistencia cabecera-detalle-diario-bolsa-OT no está definida como transacción atómica con manejo de concurrencia.
