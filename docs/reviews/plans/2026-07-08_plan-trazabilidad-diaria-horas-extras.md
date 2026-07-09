# Plan - Trazabilidad diaria de horarios y recargos de Horas Extras

**Fecha:** 2026-07-08
**Plan:** Persistir evidencia diaria del horario usado para calcular HED/HEN/HF/HEFD/HEFN
**Autor del plan:** Agente IA (OpenCode)
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Objetivo

Cerrar el hueco productivo detectado en un calculo confirmado revisado localmente: el sistema persiste el total semanal y el detalle agregado por codigo, pero no guarda el snapshot diario que explica como trabajo el empleado para producir esos recargos.

El objetivo es que todo calculo confirmado de Horas Extras pueda responder, desde base de datos y sin depender del estado actual del planificador, estas preguntas:

1. Que dia y fecha produjo cada hora ordinaria, extra o recargo.
2. Que horario se uso: entrada, salida y almuerzo.
3. Si el dia era normal, domingo o festivo nacional.
4. Si habia novedad laboral que suprimio o afecto el calculo.
5. Que codigo se aplico: `HED`, `HEN`, `HF`, `HEFD`, `HEFN`, `RN` o `RF`.
6. Que fuente respaldo el horario: manual autorizado, planificador, GeoFace, ERP/base o ajuste.
7. Quien confirmo el calculo y con que evidencia o motivo.

Este plan extiende el plan `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md`, especialmente las fases 1B, 2 y 3, con un requisito explicito de trazabilidad diaria auditable.

## 2. Hallazgo de partida

Trazabilidad consultada para un calculo confirmado de Horas Extras. Se omiten identificadores reales por contener PII y datos sensibles de nomina.

| Evidencia | Resultado |
|---|---|
| Cabecera semanal | existe, `CONFIRMADO`, empleado anonimizado, semana anonimizada y periodo semanal |
| Detalle agregado | existe, `HED`, `9h`, factor `1.25` |
| Horario diario usado | no existe en `nomina_horario_pactado_dia` para la cedula |
| Detalle por fecha | no existe asociado al calculo |
| Festivos de la semana | ninguno registrado en calendario para esa semana |
| Novedades activas | ninguna para esa semana |
| OT por dia | ninguna para esa semana |

Conclusion: el valor revisado es matematicamente consistente como `HED`, pero la base no permite reconstruir el horario diario usado ni probar por que no fue `HEFD` si el trabajo hubiera ocurrido en domingo o festivo.

## 2.1 Alcance de bloqueo productivo

Este hallazgo bloquea el cierre productivo de Horas Extras para nomina oficial, no bloquea otros modulos del sistema.

Condicion de desbloqueo: ningun calculo nuevo de HE debe confirmarse para uso oficial sin snapshot diario auditable, pruebas de clasificacion y decision GH/Nomina sobre historicos sin snapshot.

## 3. No-objetivos

- No automatizar liquidacion completa desde GeoFace sin revision humana.
- No modificar reglas legales sin validacion de Gestion Humana/Nomina.
- No recalcular masivamente historicos sin decision explicita.
- No reemplazar de inmediato el planificador manual; debe seguir existiendo como contingencia autorizada.
- No usar `nomina_horario_pactado_dia` como auditoria historica del calculo, porque representa horario pactado editable y no snapshot confirmado.

## 4. Archivos / modulos afectados

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
- `backend_v2/app/core/rbac_manifest.py` si se agregan endpoints de lectura/auditoria nuevos
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/CalculoDetailView.tsx`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView.tsx`
- `frontend/src/types/horasExtras.ts`
- `frontend/src/types/horasExtrasPlanificador.ts`
- `frontend/src/services/horasExtrasService.ts`
- `testing/backend/test_horas_extras_s5_festivos.py`
- `testing/backend/test_horas_extras_s5ppp_integracion.py`
- `testing/backend/test_horas_extras_s7.py`
- `testing/backend/test_horas_extras_s8_ot_mano_obra.py`
- `testing/backend/test_horas_extras_s9_reglas_gh.py`
- `frontend/src/tests/PlanificadorSemanalView.test.tsx`
- `docs/ESQUEMA_BASE_DATOS.md`
- `docs/reviews/builds/`

## 5. MVP obligatorio y fases posteriores

### MVP obligatorio antes de produccion HE

1. Snapshot diario inmutable por calculo confirmado.
2. Clasificacion correcta de dia normal, domingo, festivo y nocturno.
3. Equivalencia entre pre-liquidacion individual y planificador semanal.
4. Lectura frontend del snapshot diario con alerta para historicos sin snapshot.
5. Pruebas backend completas HE y pruebas frontend del detalle diario.
6. RBAC para lectura de auditoria y separacion de evidencia sensible.

### Fase posterior

1. Vinculacion completa con GeoFace como fuente primaria.
2. Visualizacion de evidencias biometricas o GPS crudas.
3. Recalculo masivo de historicos, solo si GH/Nomina lo aprueba.

## 6. Modelo de datos propuesto

Crear una tabla historica de snapshot diario, separada del horario pactado editable.

Tabla propuesta: `nomina_calculo_diario_detalle`

Principio de granularidad: separar semanticamente el dia trabajado del concepto liquidado. La implementacion puede usar dos tablas (`nomina_calculo_diario` + `nomina_calculo_diario_concepto`) o una tabla unica desnormalizada, pero debe preservar estas reglas:

1. El nivel dia contiene una sola vez `fecha`, `hora_entrada`, `hora_salida`, `minutos_almuerzo`, `horas_trabajadas`, flags de festivo/domingo/novedad y fuente.
2. El nivel concepto contiene `codigo_calculado`, `horas_concepto`, factor y valores monetarios.
3. Debe existir cobertura minima de los 7 dias de la semana en el nivel dia.
4. Si un dia genera varios conceptos, por ejemplo `HF` + `HEFD`, se guardan varios conceptos vinculados al mismo dia.
5. Los totales semanales se suman desde `horas_concepto` y valores del nivel concepto, no duplicando `horas_trabajadas` del nivel dia.

Campos minimos:

| Campo | Tipo esperado | Motivo |
|---|---|---|
| `id` | integer PK | identificador interno |
| `calculo_id` | FK a `nomina_calculo_semanal.id` | vinculo con cabecera confirmada |
| `cedula` | varchar | trazabilidad directa por empleado |
| `anio` | integer | consulta por periodo |
| `semana_iso` | integer | consulta por semana |
| `fecha` | date | dia exacto trabajado |
| `dia_semana` | integer 1..7 | Lunes a domingo |
| `hora_entrada` | time nullable | entrada usada en calculo |
| `hora_salida` | time nullable | salida usada en calculo |
| `minutos_almuerzo` | integer | descanso descontado |
| `horas_trabajadas` | numeric/decimal | salida - entrada - almuerzo |
| `horas_ordinarias` | PostgreSQL `NUMERIC(p,s)` / Pydantic `Decimal` | parte ordinaria calculada en nivel dia |
| `horas_extras` | PostgreSQL `NUMERIC(p,s)` / Pydantic `Decimal` | parte extra calculada en nivel dia |
| `codigo_calculado` | varchar nullable | `HED`, `HEN`, `HF`, `HEFD`, `HEFN`, `RN`, `RF` |
| `horas_concepto` | PostgreSQL `NUMERIC(p,s)` / Pydantic `Decimal` nullable | horas liquidadas para ese codigo, sin duplicar horas del dia |
| `factor_hora_ordinaria` | PostgreSQL `NUMERIC(p,s)` / Pydantic `Decimal` nullable | factor aplicado al codigo |
| `valor_bruto` | PostgreSQL `NUMERIC(p,s)` / Pydantic `Decimal` default 0 | valor bruto del concepto |
| `carga_prestacional` | PostgreSQL `NUMERIC(p,s)` / Pydantic `Decimal` default 0 | carga del concepto |
| `costo_total` | PostgreSQL `NUMERIC(p,s)` / Pydantic `Decimal` default 0 | costo total del concepto |
| `es_festivo` | boolean | snapshot del calendario |
| `nombre_festivo` | varchar nullable | evidencia funcional |
| `es_domingo` | boolean | domingo sin depender de tabla de festivos |
| `es_jornada_nocturna` | boolean | criterio HEN/HEFN |
| `novedad_codigo` | varchar nullable | novedad que afecto el dia |
| `novedad_evento_id` | integer nullable | vinculo si existe evento persistido |
| `fuente_horario` | varchar | `PLANIFICADOR`, `MANUAL`, `GEOFACE`, `ERP`, `AJUSTE` |
| `fuente_evidencia_id` | integer nullable | referencia interna a metadata de evidencia, no URL publica |
| `hash_snapshot` | varchar nullable | checksum de campos criticos para detectar alteracion |
| `creado_por` | varchar | actor derivado del JWT al confirmar |
| `ot_id` | integer nullable | OT asociada si aplica |
| `ot_codigo` | varchar nullable | codigo OT si aplica |
| `observaciones` | text nullable | motivo o comentario |
| `creado_en` | timestamptz | auditoria |

Indices recomendados:

1. `(calculo_id)` para detalle de calculo.
2. `(cedula, anio, semana_iso)` para auditoria de empleado/semana.
3. `(fecha)` para reportes por periodo.
4. `(codigo_calculado)` para analisis por tipo de recargo.
5. `(ot_id, anio, semana_iso)` si OT requiere trazabilidad diaria.
6. Unico parcial o equivalente para nivel concepto: `(calculo_id, fecha, codigo_calculado, coalesce(ot_id, 0), fuente_horario)` para evitar duplicados de persistencia.
7. Unico para nivel dia: `(calculo_id, fecha)` si se separan tablas.

Checks recomendados:

1. `dia_semana BETWEEN 1 AND 7`.
2. `fuente_horario IN ('PLANIFICADOR', 'MANUAL', 'GEOFACE', 'ERP', 'AJUSTE')`.
3. `codigo_calculado IN ('HED', 'HEN', 'HF', 'HEFD', 'HEFN', 'RN', 'RF') OR codigo_calculado IS NULL`.
4. Horas y valores monetarios `>= 0`.
5. `observaciones` obligatoria para `MANUAL` y `AJUSTE` cuando no exista evidencia vinculada.

Regla de integridad e inmutabilidad:

1. La tabla debe ser append-only despues de confirmar: no `UPDATE` ni `DELETE` fisico desde flujos funcionales.
2. Correcciones posteriores deben hacerse por anulacion/ajuste auditado, generando nuevo calculo o evento correctivo.
3. Borrar o anular una cabecera no debe eliminar evidencia historica. La anulacion debe conservar snapshot y estado del calculo.
4. Un calculo confirmado debe tener cobertura de 7 dias por empleado en el nivel dia, incluso si algunos dias tienen `0h`.
5. Si un dia genera ordinaria festiva y extra festiva, se guardan varios conceptos para la fecha, sin duplicar las horas trabajadas del dia.
6. Cabecera, detalle agregado, snapshot diario, bolsa y OT deben persistirse en una transaccion atomica.
7. Toda confirmacion nueva debe rechazarse si el backend no tiene contexto diario completo de 7 dias.

## 7. Contrato de seguridad y RBAC

### 7.1 Endpoints propuestos

1. Extender `GET /api/v2/nomina/horas-extras/calculos/{calculo_id}` para incluir `detalle_diario` basico sin evidencia sensible, protegido por permiso de lectura HE existente.
2. Crear endpoint separado `GET /api/v2/nomina/horas-extras/calculos/{calculo_id}/auditoria` para evidencia sensible, fuente GeoFace, GPS o metadata avanzada.

### 7.2 Permisos requeridos

1. `nomina_horas_extras.leer`: permite ver cabecera, detalle agregado y snapshot diario basico.
2. Nuevo permiso recomendado `nomina_horas_extras.auditoria`: permite ver metadata sensible de evidencia/fuentes.
3. Nuevo permiso recomendado `nomina_horas_extras.ajustar_horario`: permite confirmar ajustes `MANUAL` o `AJUSTE` con motivo obligatorio.

### 7.3 Reglas de seguridad

1. Probar `401` sin token y `403` sin permiso.
2. No exponer URLs directas de fotos biometricas ni coordenadas exactas en el detalle basico.
3. Derivar `creado_por` y actores desde JWT, no desde payload editable.
4. Validar `cedula`, `codigo_calculado`, `fuente_horario`, `novedad_codigo` y `ot_codigo` con `Enum`, `Literal` o `Field(pattern=...)`.
5. Registrar en auditoria lecturas sensibles y ajustes/anulaciones.

## 8. Cambios funcionales requeridos

### 8.1 Unificar motor de contexto festivos/novedades

El planificador semanal debe usar la misma logica de contexto que `ejecutar_pre_liquidacion`:

1. Cargar festivos de `nomina_festivo_calendario`.
2. Cargar novedades confirmadas o novedades del payload del planificador.
3. Si hay novedad de supresion (`VAC`, `LIC`, `INC`, `AUS`), el dia queda en `0h` para HE.
4. Si el dia es festivo o domingo trabajado, clasificar ordinaria festiva como `HF` y extra festiva como `HEFD` o `HEFN`.
5. Si el dia no es festivo, clasificar extra como `HED` o `HEN` segun jornada.
6. No dejar `es_festivo=False` fijo en `planificador_calculo.py`.

### 8.2 Confirmacion con snapshot diario

Al confirmar desde pre-liquidacion individual o planificador:

1. Exigir contexto diario completo de 7 dias en un DTO validado por backend o recuperar un draft server-side inmutable equivalente.
2. Recalcular en backend la clasificacion diaria y los conceptos desde ese contexto; no aceptar detalles agregados manipulados como unica fuente de verdad.
3. Rechazar confirmaciones nuevas si falta entrada diaria, fuente, festivo/novedad resuelta o motivo requerido.
4. Construir `DetalleDiarioCalculo` y `DetalleDiarioConcepto` antes de persistir la cabecera.
5. Persistir cabecera `nomina_calculo_semanal`.
6. Persistir detalle agregado `nomina_calculo_semanal_detalle` como hoy, derivado de conceptos diarios.
7. Persistir detalle diario asociado al `calculo_id`.
8. Garantizar que los totales semanales sean suma de los conceptos diarios confirmados.

### 8.3 Fuente del horario

Definir prioridad funcional y persistirla:

1. `GEOFACE`: marcas verificadas con rostro, zona y evidencia.
2. `MANUAL`: ajuste autorizado por GH/jefe/admin con motivo obligatorio.
3. `PLANIFICADOR`: carga semanal operativa antes de integrar GeoFace.
4. `ERP`: horario/base contractual usado solo como referencia o fallback.
5. `AJUSTE`: correccion posterior con motivo y usuario.

Si la fuente es `MANUAL`, `PLANIFICADOR` o `AJUSTE`, debe existir `observaciones` o motivo cuando contradiga GeoFace o cuando no exista evidencia biometrica.

### 8.4 Lectura en frontend

Actualizar `CalculoDetailView` para mostrar una seccion nueva: `Trazabilidad diaria`.

Columnas minimas:

1. Fecha y dia.
2. Entrada, salida y almuerzo.
3. Horas trabajadas, ordinarias y extras.
4. Codigo calculado y factor.
5. Festivo/domingo/novedad.
6. Fuente del horario.
7. OT/evidencia si aplica.
8. Valor bruto, carga y costo.

La pantalla debe dejar claro cuando un calculo historico no tiene snapshot diario por haber sido confirmado antes de esta mejora.

### 8.5 Contrato de historicos sin snapshot

El API debe distinguir explicitamente tres estados:

1. `detalle_diario_estado = 'DISPONIBLE'`: calculo nuevo con snapshot completo.
2. `detalle_diario_estado = 'HISTORICO_SIN_SNAPSHOT'`: calculo anterior a la mejora; no es error tecnico.
3. `detalle_diario_estado = 'INCOMPLETO'`: calculo nuevo que incumple la regla y debe bloquearse o reportarse como error.

El frontend debe mostrar alerta amarilla para `HISTORICO_SIN_SNAPSHOT` y alerta roja/bloqueante para `INCOMPLETO`.

## 9. Modularizacion frontend obligatoria

Para respetar el limite de 550 lineas y el sistema de diseno:

1. No agregar codigo nuevo a archivos ya cercanos o superiores al limite sin extraccion previa.
2. Archivos con split obligatorio antes de agregar trazabilidad:
   - `frontend/src/types/horasExtras.ts`.
   - `frontend/src/services/horasExtrasService.ts`.
   - `frontend/src/tests/PlanificadorSemanalView.test.tsx`.
   - `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/PlanificadorSemanalView.tsx` si el cambio lo hace crecer de forma relevante.
   - `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/components/EmpleadosActivosPanel.tsx` si se toca.
3. `horasExtrasService.ts` ya esta suficientemente cerca del limite; la trazabilidad debe ir en service dedicado, no condicional.
4. `horasExtras.ts` debe extraer tipos de trazabilidad a archivo dedicado antes de agregar nuevos contratos.
5. Las pruebas nuevas no deben crecer `PlanificadorSemanalView.test.tsx`; crear archivos de test especificos por componente/service.
6. No agregar tabla grande directamente en `CalculoDetailView.tsx` si supera limite.
7. Crear componente `CalculoTrazabilidadDiariaCard.tsx` o equivalente.
8. Usar `MaterialCard`, `DataTable`, `Badge`, `Callout`, `Text` y `Button`; no tablas HTML crudas nuevas si existe patron reusable.
9. Agregar fallback movil compacto por dia, con columnas criticas visibles.
10. Registrar endpoints en `frontend/src/config/api.ts` si se agregan rutas nuevas.
11. Crear tipos dedicados, por ejemplo `frontend/src/types/horasExtrasTrazabilidad.ts`, para no seguir creciendo `horasExtras.ts`.
12. Crear service dedicado, por ejemplo `horasExtrasTrazabilidadService.ts`; no agregar trazabilidad a `horasExtrasService.ts`.
13. La tarjeta debe cubrir estados `loading`, `empty`, `error`, `DISPONIBLE`, `HISTORICO_SIN_SNAPSHOT` e `INCOMPLETO`.

## 10. Pasos de implementacion

### Fase 0 - Bloqueo preventivo de produccion

1. Marcar Horas Extras como no apto para cierre productivo hasta resolver snapshot diario.
2. Documentar riesgo en `docs/reviews/builds/` con evidencia anonimizada del calculo revisado.
3. Acordar con GH/Nomina si los calculos ya confirmados sin snapshot quedan como historicos limitados o requieren anulacion/recalculo manual.

### Fase 1 - Backend modelo y migracion

1. Agregar modelo ORM `NominaCalculoDiarioDetalle`.
2. Crear migracion idempotente para `nomina_calculo_diario_detalle`.
3. Agregar schemas read/output para detalle diario.
4. Agregar endpoint o extender detalle de calculo para retornar snapshots diarios.
5. Registrar endpoint nuevo en RBAC si aplica.

### Fase 2 - Motor de calculo diario

1. Extraer funcion pura que reciba dias trabajados, festivos, novedades, jornada nocturna, catalogo y parametros.
2. Devolver dos salidas: detalles agregados semanales y detalles diarios auditables.
3. Reusar esa funcion desde pre-liquidacion individual y planificador semanal.
4. Cubrir casos normales, nocturnos, domingo/festivo y novedades de supresion.
5. Evitar duplicar reglas entre `horas_extras_service.py`, `planificador_calculo.py` y `planificador_persistencia.py`.

### Fase 3 - Persistencia de confirmacion

1. Ajustar `confirmar_pre_liquidacion` para guardar snapshots diarios.
2. Ajustar `confirmar_plan` para guardar snapshots diarios del payload confirmado.
3. Asegurar que `distribuir_costos_ot_plan` use la misma clasificacion diaria.
4. Verificar que anulacion/compensacion no destruya la trazabilidad.

### Fase 4 - Frontend

1. Agregar tipos TypeScript de snapshot diario.
2. Crear service dedicado de trazabilidad diaria; no agregar esta logica a `horasExtrasService.ts`.
3. Mostrar tabla `Trazabilidad diaria` en `CalculoDetailView`.
4. Mostrar alerta si el calculo no tiene snapshot diario.
5. En planificador, mostrar claramente si el dia es festivo/domingo antes de confirmar.

### Fase 5 - Pruebas y evidencia

1. Agregar test backend: lunes normal con 9h extra clasifica `HED` y guarda 7 snapshots.
2. Agregar test backend: domingo/festivo con horas extra clasifica `HF` + `HEFD` o `HEFN` segun jornada.
3. Agregar test backend: novedad `VAC/LIC/INC/AUS` suprime horas y queda auditada.
4. Agregar test backend: planificador y pre-liquidacion individual producen la misma clasificacion para el mismo horario.
5. Agregar test backend: calculo confirmado retorna detalle diario.
6. Agregar test frontend: `CalculoDetailView` muestra trazabilidad diaria y alerta para historicos sin snapshot.
7. Documentar comandos, resultados y riesgos residuales en `docs/reviews/builds/`.

## 11. Comandos de validacion

- `docker compose exec backend pytest testing/backend/test_horas_extras_s0.py testing/backend/test_horas_extras_s1.py testing/backend/test_horas_extras_s2.py testing/backend/test_horas_extras_s4.py testing/backend/test_horas_extras_s5_festivos.py testing/backend/test_horas_extras_s5_novedades.py testing/backend/test_horas_extras_s5pp_horario_semana.py testing/backend/test_horas_extras_s5ppp_integracion.py testing/backend/test_horas_extras_s6.py testing/backend/test_horas_extras_s7.py testing/backend/test_horas_extras_s8_ot_mano_obra.py testing/backend/test_horas_extras_s9_reglas_gh.py testing/backend/test_horas_extras_parametros_calculo.py -q`
- `docker compose exec backend pytest testing/backend/test_horas_extras_s10_trazabilidad_diaria.py -q`
- `docker compose exec backend pytest testing/backend/test_horas_extras_s5_festivos.py -q`
- `docker compose exec backend pytest testing/backend/test_horas_extras_s5ppp_integracion.py -q`
- `docker compose exec backend pytest testing/backend/test_horas_extras_s7.py -q`
- `docker compose exec backend pytest testing/backend/test_horas_extras_s8_ot_mano_obra.py -q`
- `docker compose exec backend pytest testing/backend/test_horas_extras_s9_reglas_gh.py -q`
- `docker compose exec backend pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -q`
- `cd frontend && npm run test -- --run src/tests/PlanificadorSemanalView.test.tsx`
- `cd frontend && npm run test -- --run src/tests/CalculoDetailView.test.tsx`
- `cd frontend && npm run test -- --run src/tests/horasExtrasService.test.ts`
- `cd frontend && npm run lint`
- `cd frontend && npm run test`
- `cd frontend && npx tsc --noEmit --pretty false`
- `cd frontend && npm run build`

## 12. Pruebas obligatorias nuevas

Backend sugerido: `testing/backend/test_horas_extras_s10_trazabilidad_diaria.py`.

Casos minimos:

1. Dia normal diurno con extras genera `HED` y snapshot de 7 dias.
2. Jornada nocturna normal genera `HEN`.
3. Domingo/festivo diurno genera `HF` para ordinaria y `HEFD` para extras.
4. Domingo/festivo nocturno genera `HF` y `HEFN` o regla GH equivalente documentada.
5. `VAC`, `LIC`, `INC`, `AUS` suprimen horas y quedan auditadas.
6. Planificador y pre-liquidacion individual producen mismo resultado con mismo input.
7. Totales semanales son suma de snapshots diarios.
8. Confirmacion doble es idempotente o falla con error controlado.
9. Fallo parcial hace rollback de cabecera, detalle, snapshot, bolsa y OT.
10. Anulacion/compensacion no borra snapshot diario.
11. Migracion es idempotente y crea indices/constraints.
12. RBAC `401/403/200` para lectura basica y auditoria sensible.

Frontend:

1. `CalculoDetailView` muestra `Trazabilidad diaria` cuando hay snapshot.
2. `CalculoDetailView` muestra alerta para `HISTORICO_SIN_SNAPSHOT`.
3. `CalculoDetailView` muestra error para `INCOMPLETO`.
4. Service/tipos soportan `detalle_diario`.
5. Planificador muestra indicador de festivo/domingo antes de confirmar.
6. Planificador bloquea o advierte si el pre-calculo esta desactualizado frente al payload confirmado.
7. La tarjeta de trazabilidad cubre estados loading/empty/error.

## 13. Impacto en documentacion

- [ ] `docs/ESQUEMA_BASE_DATOS.md`: agregar `nomina_calculo_diario_detalle` y relaciones.
- [ ] `docs/GUIA_DESARROLLO.md`: documentar regla de snapshot diario obligatorio en HE.
- [ ] `docs/reviews/builds/YYYY-MM-DD_horas-extras-trazabilidad-diaria.md`: evidencia de implementacion y pruebas.
- [ ] `testing/CATALOGO_PRUEBAS.md`: registrar escenarios nuevos de festivo/domingo/novedad/snapshot.
- [ ] `docs/reviews/plans/2026-07-05_plan-produccion-geoface-horas-extras.md`: marcar este plan como dependencia bloqueante de Fase 1B/Fase 3.
- [ ] ADR o spec de decision durable: fuentes de horario, historicos sin snapshot, retencion/inmutabilidad.

## 14. Evaluacion de riesgos

| Riesgo | Probabilidad | Mitigacion |
|---|---|---|
| Persistir solo totales semanales impide auditoria legal | Alta | Snapshot diario obligatorio por calculo confirmado |
| Planificador clasifica festivos como `HED` | Alta | Reusar motor comun de contexto festivos/novedades |
| Historicos existentes quedan sin evidencia diaria | Alta | Mostrar alerta y definir politica de recalculo/anulacion con GH |
| Divergencia entre pre-liquidacion individual y planificador | Media | Tests de equivalencia con el mismo input |
| Duplicidad de reglas de calculo | Media | Extraer funcion pura compartida |
| Exponer evidencia GeoFace a roles no autorizados | Media | RBAC y pruebas `403` para endpoints nuevos |
| Migracion rompe datos existentes | Media | Migracion aditiva, nullable donde aplique, sin recalculo automatico |
| OT diaria no cuadra con costos consolidados | Media | Validar suma diaria contra `NominaCostoOt` |
| Frontend supera limite de lineas o rompe design system | Media | Modularizar componente y usar `DataTable`/atomos existentes |
| PII en reportes o planes | Media | Anonimizar cedulas, calculos concretos y evidencia sensible |

## 15. Evidencia build requerida

Todo reporte de build debe incluir:

1. Commit base o estado de arbol documentado.
2. Archivos modificados intencionalmente.
3. Comandos exactos ejecutados.
4. Resultado PASS/FAIL resumido.
5. Evidencia de migracion aplicada.
6. Captura o descripcion de UI de trazabilidad diaria.
7. Riesgos residuales y decision GH/Nomina.

## 16. Matriz de subagentes

```text
Subagente | Motivo | Resultado | Bloquea
----------|--------|-----------|---------
scope-reviewer | Plan con alcance backend/frontend/docs/security | approved_with_risks | no
backend-reviewer | Modelos, migracion, servicios de calculo y persistencia | blocked en revalidacion; bloqueos incorporados en version actual | si hasta nueva validacion
frontend-reviewer | Tabla de trazabilidad y alertas en detalle de calculo/planificador | blocked en revalidacion; split obligatorio incorporado en version actual | si hasta nueva validacion
security-rbac-reviewer | Fuente manual/GeoFace, evidencia, permisos y auditoria | approved_with_risks | no
docs-tests-reviewer | Documentacion, matriz de pruebas y evidencia | approved_with_risks | no
frontend-table-specialist | Tabla de trazabilidad diaria responsive | recomendado | no
```

## 17. Decision final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos`
- [x] `bloqueado` hasta que los revisores obligatorios validen la version corregida del plan y GH/Nomina confirme la politica de historicos sin snapshot.

## 18. Criterio de salida

El plan queda listo para implementacion cuando se cumplan todos estos puntos:

1. GH/Nomina confirma que el snapshot diario propuesto cubre auditoria operacional y legal.
2. Revisores obligatorios no bloquean el alcance.
3. Se define si calculos historicos sin snapshot quedan como historicos limitados o se recalculan/anulan.
4. Se aprueba la tabla `nomina_calculo_diario_detalle` o una alternativa equivalente.
5. Se acepta que ningun calculo nuevo de HE pase a produccion sin detalle diario persistido.
