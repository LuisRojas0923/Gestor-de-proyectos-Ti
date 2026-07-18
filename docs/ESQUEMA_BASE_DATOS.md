# Modelo Entidad-Relación (MER) Completo

## Tablas Biométricas

Estas tablas pertenecen al backend principal. El servicio `biometria-engine` no tiene acceso directo a base de datos.

### `embeddings_faciales`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador del perfil facial. |
| `usuario_id` | varchar(50), FK `usuarios.id`, unique | Usuario propietario del embedding activo. |
| `embedding` | JSONB | Vector facial normalizado. No debe registrarse en logs. |
| `activo` | boolean | Indica si el perfil facial esta vigente. |
| `creado_en` | timestamp | Fecha de creacion. |

### `registros_asistencia`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador del registro de asistencia. |
| `usuario_id` | varchar(50), FK `usuarios.id` | Usuario autenticado que intento registrar asistencia. |
| `zona_id` | integer, FK `zonas_trabajo.id`, nullable | Zona validada si aplica. |
| `match_exitoso` | boolean | Resultado de comparacion facial. |
| `nivel_confianza` | float | Confianza calculada por backend. |
| `latitud_marcada` | float | Latitud reportada por el cliente. |
| `longitud_marcada` | float | Longitud reportada por el cliente. |
| `evidencia_url` | varchar(255), nullable | URL protegida de evidencia fotografica. |
| `creado_en` | timestamp | Fecha del registro. |

### `zonas_trabajo`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador de zona. |
| `nombre` | varchar(100) | Nombre de la zona. |
| `latitud` | float | Coordenada central. |
| `longitud` | float | Coordenada central. |
| `radio` | float | Radio permitido en metros. |

---

## Tablas de Nomina - Horas Extras

Estas tablas soportan el modulo `nomina_horas_extras`: calculo semanal, bolsa de horas, novedades, festivos, planificador semanal y costos por OT. Los nombres fisicos siguen la convencion en espanol del backend.

### Alcance gestor-empleado e idempotencia

`relaciones_gestor_empleado` no representa jerarquia. Es una relacion M:N de alcance operativo entre `usuarios.id` y una cedula canonica del ERP; no existe FK cross-database hacia el empleado. `historial_relaciones_gestor_empleado` registra altas, bajas y reactivaciones y es append-only por trigger PostgreSQL.

| Tabla | Clave y proposito |
|---|---|
| `relaciones_gestor_empleado` | UUID PK; unique `(gestor_usuario_id, empleado_cedula)`; estado activo, actor y timestamps. |
| `historial_relaciones_gestor_empleado` | UUID PK; FK restrictiva a la relacion; actor, accion y estados anterior/nuevo. |
| `operaciones_idempotentes` | PK `(solicitud_id, tipo_operacion)`; actor, objetivo, SHA-256 del payload, estado y resultado JSONB. |

### Plantillas y aplicaciones de horario

| Tabla | Clave y proposito |
|---|---|
| `nomina_plantillas_horario` | Catalogo UUID, nombre activo unico normalizado, version y estado. |
| `nomina_plantillas_horario_dias` | PK `(plantilla_id, dia_semana)`; siete dias con horas, almuerzo y `cruza_medianoche`. |
| `nomina_plantillas_horario_historial` | Evento versionado con snapshot JSONB append-only. |
| `nomina_aplicaciones_plantilla_horario` | Cabecera append-only con solicitud, plantilla/version/nombre, actor, cantidad y estado. |
| `nomina_aplicaciones_plantilla_empleados` | PK `(aplicacion_id, empleado_cedula)`; snapshots JSONB anterior y aplicado, append-only. |

Aplicar una plantilla copia los valores a `nomina_horario_pactado` y `nomina_horario_pactado_dia`; las tablas de aplicacion conservan evidencia independiente. Los triggers `trg_*_append_only` rechazan `UPDATE` y `DELETE` de historiales y aplicaciones.

### `nomina_catalogo_novedades`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador interno del concepto. |
| `codigo` | varchar(20), unique, index | Codigo operativo: `HED`, `HEN`, `HEFD`, `HEFN`, `HF`, `RN`, `RF`, `VAC`, `INC`, etc. |
| `descripcion_corta` | varchar(100) | Nombre corto visible del concepto. |
| `descripcion_larga` | varchar(500), nullable | Descripcion extendida. |
| `categoria` | varchar(50) | Categoria funcional: hora extra, ausencia, licencia, incapacidad, vacacion. |
| `subcategoria` | varchar(50) | Clasificacion especifica: diurna, nocturna, festiva, etc. |
| `factor_hora_ordinaria` | float | Multiplicador sobre hora ordinaria. |
| `acredita_bolsa` | boolean | Indica si el concepto acredita bolsa de horas. |
| `descuenta_bolsa` | boolean | Indica si el concepto descuenta bolsa al compensar. |
| `requiere_autorizacion` | boolean | Indica si requiere autorizacion de HE. |
| `unidad` | varchar(20) | Unidad: `HORAS` o `DIAS`. |
| `estado` | varchar(20) | Estado del concepto. |
| `vigente_desde` | date | Inicio de vigencia legal/operativa. |
| `vigente_hasta` | date, nullable | Fin de vigencia. |
| `observaciones` | text, nullable | Notas operativas. |
| `creado_en` | timestamp | Fecha de creacion. |
| `actualizado_en` | timestamp, nullable | Fecha de ultima actualizacion. |

### `nomina_factor_prestacional_riesgo`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador interno. |
| `nivel_riesgo` | varchar(20), unique, index | Nivel ARL `I` a `V`. |
| `nivel_macro` | varchar(30) | Agrupacion operativa: direccion, administrativo u operativo. |
| `arl_nombre` | varchar(100), nullable | Nombre de ARL si aplica. |
| `factor_prestacional` | float | Carga prestacional efectiva aplicada al valor bruto. |
| `porcentaje_salud` | float | Componente salud. |
| `porcentaje_pension` | float | Componente pension. |
| `porcentaje_arl` | float | Componente ARL. |
| `porcentaje_caja` | float | Componente caja de compensacion. |
| `porcentaje_icbf` | float | Componente ICBF. |
| `porcentaje_sena` | float | Componente SENA. |
| `porcentaje_prima` | float | Componente prima. |
| `porcentaje_cesantia` | float | Componente cesantia. |
| `porcentaje_interes_cesantia` | float | Componente intereses de cesantia. |
| `porcentaje_vacaciones` | float | Componente vacaciones. |
| `vigente_desde` | date | Inicio de vigencia. |
| `vigente_hasta` | date, nullable | Fin de vigencia. |
| `observaciones` | text, nullable | Notas. |
| `creado_en` | timestamp | Fecha de creacion. |

### `nomina_horario_pactado`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador interno. |
| `cedula` | varchar(50), unique, index | Empleado asociado. |
| `minutos_jornada_ordinaria` | integer | Minutos ordinarios por dia. |
| `horas_semana_ordinaria` | float | Jornada semanal ordinaria vigente. |
| `es_jornada_nocturna` | boolean | Indica si su jornada ordinaria es nocturna. |
| `autoriza_he_default` | boolean | Autorizacion HE sincronizada desde ERP. |
| `autoriza_he_override` | boolean, nullable | Override manual desde portal. |
| `override_motivo` | varchar(500), nullable | Motivo del override. |
| `override_autorizado_por` | varchar(100), nullable | Persona que autoriza el override. |
| `override_fecha` | timestamp, nullable | Fecha del override. |
| `sincronizado_en` | timestamp | Ultima sincronizacion. |
| `fuente_sincronizacion` | varchar(20) | Fuente: ERP, manual u override. |
| `observaciones` | text, nullable | Notas. |

### `nomina_horario_pactado_dia`

| Columna | Tipo | Descripcion |
|---|---|---|
| `cedula` | varchar(50), PK, FK `nomina_horario_pactado.cedula` | Empleado asociado. |
| `dia_semana` | integer, PK | Dia ISO: 1 lunes a 7 domingo. |
| `hora_entrada` | time, nullable | Hora pactada de entrada; null para franco/libre. |
| `hora_salida` | time, nullable | Hora pactada de salida; null para franco/libre. |
| `minutos_almuerzo` | integer | Minutos de almuerzo, rango esperado 0 a 240. |
| `cruza_medianoche` | boolean | Indica que la salida corresponde al dia siguiente. |

### `nomina_bolsa_horas`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador de bolsa. |
| `cedula` | varchar(50), unique, index | Empleado propietario de la bolsa. |
| `horas_acreditadas` | float | Horas acumuladas por confirmaciones HE. |
| `horas_consumidas` | float | Horas compensadas con tiempo libre. |
| `horas_pagadas` | float | Horas liquidadas en dinero. |
| `fecha_ultimo_movimiento` | timestamp, nullable | Ultimo movimiento registrado. |
| `observaciones` | text, nullable | Notas. |
| `creado_en` | timestamp | Fecha de creacion. |
| `actualizado_en` | timestamp, nullable | Fecha de actualizacion. |

### `nomina_bolsa_horas_movimientos`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador del movimiento. |
| `bolsa_id` | integer, FK `nomina_bolsa_horas.id` | Bolsa afectada. |
| `cedula` | varchar(50), index | Empleado afectado. |
| `tipo_movimiento` | varchar(30) | `ACREDITACION`, `CONSUMO_TIEMPO`, `PAGO` o `AJUSTE`. |
| `horas` | float | Cantidad de horas movidas. |
| `fecha` | timestamp | Fecha efectiva del movimiento. |
| `calculo_id` | integer, FK `nomina_calculo_semanal.id`, nullable | Calculo origen si aplica. |
| `liquidacion_id` | integer, nullable | Liquidacion externa si aplica. |
| `usuario_id` | varchar(50), nullable | Usuario que registro el movimiento. |
| `observaciones` | text, nullable | Notas. |

### `nomina_override_autoriza_he`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador del override. |
| `cedula` | varchar(50), index | Empleado afectado. |
| `autoriza_he_erp` | boolean | Valor original ERP. |
| `autoriza_he_override` | boolean | Valor autorizado en portal. |
| `motivo` | varchar(500) | Justificacion. |
| `autorizado_por` | varchar(100) | Nombre de autorizador. |
| `autorizado_por_id` | varchar(50), nullable | Usuario autorizador. |
| `vigente_desde` | timestamp | Inicio de vigencia. |
| `vigente_hasta` | timestamp, nullable | Fin de vigencia. |
| `estado` | varchar(20) | `ACTIVO`, `REVOCADO` o `EXPIRADO`. |
| `documento_soporte_url` | varchar(500), nullable | Evidencia documental. |
| `creado_en` | timestamp | Fecha de creacion. |

### `nomina_calculo_semanal`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador del calculo. |
| `cedula` | varchar(50), index | Empleado calculado. |
| `anio` | integer, index | Anio ISO del calculo. |
| `semana_iso` | integer, index | Semana ISO, 1 a 53. |
| `fecha_inicio` | date | Inicio de semana. |
| `fecha_fin` | date | Fin de semana. |
| `nivel_riesgo_arl` | varchar(10) | Snapshot del nivel ARL. |
| `factor_prestacional` | float | Snapshot de carga prestacional. |
| `salario_base_mensual` | float | Salario usado para el calculo. |
| `valor_hora_ordinaria` | float | Valor hora ordinaria calculado. |
| `total_horas_extras` | float | Total de horas extras. |
| `total_horas_recargo_nocturno` | float | Total de recargos nocturnos. |
| `total_valor_bruto` | float | Total bruto calculado. |
| `total_carga_prestacional` | float | Total carga prestacional. |
| `total_costo_empresa` | float | Costo total empresa. |
| `estado` | varchar(30) | `BORRADOR`, `PENDIENTE_AUTORIZACION`, `CONFIRMADO`, `PAGADO`, `COMPENSADO` o `ANULADO`. `PENDIENTE_AUTORIZACION` no acredita bolsa hasta la autorización RBAC. |
| `ot_id` | integer, nullable, index | OT primaria si aplica. |
| `ot_codigo` | varchar(50), nullable | Codigo OT primaria. |
| `calculado_por` | varchar(50), nullable | Usuario que calculo/confirmo. |
| `calculado_en` | timestamp | Fecha de calculo. |
| `confirmado_por` | varchar(50), nullable | Usuario que confirmo. |
| `confirmado_en` | timestamp, nullable | Fecha de confirmacion. |
| `observaciones` | text, nullable | Notas. |

### `nomina_calculo_semanal_detalle`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador del detalle. |
| `calculo_id` | integer, FK `nomina_calculo_semanal.id` | Calculo padre. |
| `codigo_novedad` | varchar(20) | Codigo de novedad/concepto aplicado. |
| `horas` | float | Horas liquidadas en el concepto. |
| `factor_hora_ordinaria` | float | Factor usado. |
| `valor_bruto` | float | Valor bruto del concepto. |
| `carga_prestacional` | float | Carga prestacional del concepto. |
| `costo_total` | float | Valor bruto mas carga prestacional. |
| `ot_id` | integer, nullable | OT asociada al detalle. |
| `ot_codigo` | varchar(50), nullable | Codigo OT asociada. |
| `fuente` | varchar(20) | Fuente: portal, planilla o ERP. |

### `nomina_calculo_diario_detalle`

Snapshot diario inmutable del horario, concepto e importes usados para un calculo confirmado de Horas Extras. Permite auditar el calculo sin depender del estado actual del planificador ni de horarios editados despues de confirmar.

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador del detalle diario. |
| `calculo_id` | integer, FK `nomina_calculo_semanal.id`, index | Calculo confirmado asociado. |
| `cedula` | varchar(50), index | Empleado calculado. |
| `anio` | integer, index | Anio ISO del calculo. |
| `semana_iso` | integer, index | Semana ISO del calculo. |
| `fecha` | date, index | Fecha del dia auditado. |
| `dia_semana` | integer | Dia ISO: 1 lunes a 7 domingo. |
| `hora_entrada` | time, nullable | Hora de entrada usada en el snapshot. |
| `hora_salida` | time, nullable | Hora de salida usada en el snapshot. |
| `minutos_almuerzo` | integer | Minutos de almuerzo descontados. |
| `cruza_medianoche` | boolean | Indica que la salida del snapshot pertenece al dia siguiente. |
| `horas_trabajadas` | double precision | Horas trabajadas del dia. |
| `horas_ordinarias` | double precision | Horas ordinarias del dia. |
| `horas_extras` | double precision | Horas extra del dia. |
| `codigo_calculado` | varchar(20), nullable, index | Concepto calculado principal: `HED`, `HEN`, `HEFD`, `HEFN`, `HF`, `RN`, `RF`, etc. |
| `horas_concepto` | double precision, nullable | Horas liquidadas para el concepto. |
| `factor_hora_ordinaria` | double precision, nullable | Factor aplicado al concepto. |
| `valor_bruto` | double precision | Valor bruto calculado del concepto. |
| `carga_prestacional` | double precision | Carga prestacional calculada. |
| `costo_total` | double precision | Costo total empresa. |
| `es_festivo` | boolean | Indica si la fecha fue festiva. |
| `nombre_festivo` | varchar(150), nullable | Nombre del festivo si aplica. |
| `es_domingo` | boolean | Indica si la fecha fue domingo. |
| `es_jornada_nocturna` | boolean | Indica si el snapshot corresponde a jornada nocturna. |
| `novedad_codigo` | varchar(20), nullable | Novedad asociada si aplica. |
| `novedad_evento_id` | integer, nullable | Evento de novedad asociado si aplica. |
| `fuente_horario` | varchar(30) | Fuente del horario usado, por defecto `PLANIFICADOR`. |
| `fuente_evidencia_id` | integer, nullable | Evidencia origen si aplica. |
| `hash_snapshot` | varchar(128), nullable | Hash del registro diario persistido. |
| `creado_por` | varchar(50), nullable | Usuario que confirma/persiste el snapshot. |
| `ot_id` | integer, nullable, index | OT asociada si aplica. |
| `ot_codigo` | varchar(50), nullable | Codigo OT asociado si aplica. |
| `observaciones` | text, nullable | Actividad u observación diaria confirmada para trazabilidad; forma parte del hash del snapshot. |
| `creado_en` | timestamp | Fecha de creacion del snapshot. |

### `nomina_costo_ot`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador del consolidado. |
| `ot_id` | integer, index | OT consolidada. |
| `ot_codigo` | varchar(50), index | Codigo de OT. |
| `anio` | integer | Anio ISO. |
| `semana_iso` | integer | Semana ISO. |
| `fecha_inicio` | date | Inicio del periodo. |
| `fecha_fin` | date | Fin del periodo. |
| `total_empleados` | integer | Empleados distintos que aportaron HE. |
| `total_horas` | float | Total horas HE imputadas. |
| `total_horas_hed` | float | Total HED. |
| `total_horas_hen` | float | Total HEN. |
| `total_horas_hefd` | float | Total HEFD. |
| `total_horas_hefn` | float | Total HEFN. |
| `total_horas_hf` | float | Total HF. |
| `total_valor_bruto` | float | Total bruto. |
| `total_carga_prestacional` | float | Total carga prestacional. |
| `total_costo_empresa` | float | Total costo empresa. |
| `categoria_sub_indice` | varchar(50), nullable | Snapshot categoria subindice. |
| `cc` | varchar(50), nullable | Centro de costo. |
| `scc` | varchar(50), nullable | Subcentro de costo. |
| `sub_indice` | varchar(50), nullable | Subindice. |
| `ultima_actualizacion` | timestamp | Fecha de consolidacion. |
| `calculo_ids` | JSON, nullable | Lista de calculos que aportaron. |

### `nomina_parametros_legales`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador del parametro. |
| `codigo` | varchar(50), unique, index | Codigo funcional del parametro. |
| `nombre` | varchar(200) | Nombre descriptivo. |
| `valor` | varchar(500) | Valor serializado segun `tipo_dato`. |
| `tipo_dato` | varchar(20) | `NUMERICO`, `TEXTO`, `JSON`, `BOOLEANO`, `FECHA` o `HORA`. |
| `norma_soporte` | varchar(200), nullable | Norma o politica que soporta el valor. |
| `vigente_desde` | date | Inicio de vigencia. |
| `vigente_hasta` | date, nullable | Fin de vigencia. |
| `estado` | varchar(20) | Estado del parametro. |
| `observaciones` | text, nullable | Notas. |
| `creado_en` | timestamp | Fecha de creacion. |

### `nomina_calculo_workflow_evento`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador del evento. |
| `calculo_id` | integer, FK `nomina_calculo_semanal.id`, index | Calculo afectado. |
| `estado_origen` | varchar(30) | Estado anterior. |
| `estado_destino` | varchar(30) | Estado nuevo. |
| `justificacion` | text, nullable | Motivo del cambio. |
| `usuario_id` | varchar(50), nullable | Usuario que ejecuto la transicion. |
| `created_at` | timestamp | Fecha del evento. |

### `nomina_festivo_calendario`

| Columna | Tipo | Descripcion |
|---|---|---|
| `anio` | integer, PK | Anio del festivo. |
| `fecha` | date, PK | Fecha del festivo. |
| `nombre` | varchar(100) | Nombre del festivo. |
| `fuente` | varchar(20) | `CALENDARIFIC` o `LEY_EMILIANI`. |
| `created_at` | timestamp | Fecha de creacion. |

### `nomina_novedad_evento`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador del evento. |
| `cedula` | varchar(50), index | Empleado afectado. |
| `codigo_novedad` | varchar(20), FK `nomina_catalogo_novedades.codigo`, index | Concepto de novedad. |
| `fecha_inicio` | date | Inicio de la novedad. |
| `fecha_fin` | date | Fin de la novedad. |
| `observaciones` | varchar(500), nullable | Notas. |
| `estado` | varchar(20), index | `BORRADOR`, `CONFIRMADO` o `ANULADO`. |
| `created_at` | timestamp | Fecha de creacion. |
| `created_by` | varchar(50), nullable | Usuario creador. |
| `updated_at` | timestamp, nullable | Fecha de actualizacion. |
| `updated_by` | varchar(50), nullable | Usuario actualizador. |
| `confirmado_at` | timestamp, nullable | Fecha de confirmacion. |
| `confirmado_by` | varchar(50), nullable | Usuario confirmador. |
| `anulado_at` | timestamp, nullable | Fecha de anulacion. |
| `anulado_justificacion` | varchar(500), nullable | Motivo de anulacion. |

### `nomina_bolsa_ot_override`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador del override. |
| `ot_id` | integer, index | OT afectada. |
| `bolsa_habilitada_override` | boolean | Valor efectivo aplicado a la OT. |
| `bolsa_habilitada_erp` | boolean | Snapshot del parametro global al crear el override. |
| `motivo` | varchar(500) | Justificacion. |
| `autorizado_por` | varchar(100) | Nombre de autorizador. |
| `autorizado_por_id` | varchar(50), nullable | Usuario autorizador. |
| `vigente_desde` | timestamp | Inicio de vigencia. |
| `vigente_hasta` | timestamp, nullable | Fin de vigencia. |
| `estado` | varchar(20) | Estado: `ACTIVO` o `REVOCADO`. |
| `documento_soporte_url` | varchar(500), nullable | Evidencia documental. |
| `creado_en` | timestamp | Fecha de creacion. |

### `nomina_planificador_dia_ot`

| Columna | Tipo | Descripcion |
|---|---|---|
| `id` | integer PK | Identificador del reparto. |
| `anio` | integer | Anio ISO. |
| `semana_iso` | integer | Semana ISO, 1 a 53. |
| `cedula` | varchar(50) | Empleado planificado. |
| `dia_semana` | integer | Dia ISO: 1 lunes a 7 domingo. |
| `orden` | varchar(50) | Orden/OT capturada desde ERP o manual. |
| `cc` | varchar(50), nullable | Centro de costo. |
| `scc` | varchar(50), nullable | Subcentro de costo. |
| `sub_indice` | varchar(50), nullable | Subindice. |
| `categoria_sub_indice` | varchar(50) | Categoria del subindice. |
| `descripcion` | varchar(500), nullable | Descripcion de OT/CC. |
| `vr_contratado` | double precision, nullable | Valor contratado de referencia. |
| `horas` | double precision, nullable | Horas asignadas. |
| `porcentaje` | double precision, nullable | Porcentaje de reparto. |
| `creado_en` | timestamp | Fecha de creacion. |
| `actualizado_en` | timestamp | Fecha de actualizacion. |

### Relaciones principales de Horas Extras

| Relacion | Descripcion |
|---|---|
| `nomina_horario_pactado.cedula` -> `nomina_horario_pactado_dia.cedula` | Horario pactado semanal y detalle diario por empleado. |
| `nomina_calculo_semanal.id` -> `nomina_calculo_semanal_detalle.calculo_id` | Cabecera y detalle de conceptos liquidados. |
| `nomina_calculo_semanal.id` -> `nomina_calculo_diario_detalle.calculo_id` | Cabecera y snapshot diario auditable usado en la liquidacion. |
| `nomina_calculo_semanal.id` -> `nomina_bolsa_horas_movimientos.calculo_id` | Movimientos de bolsa originados por un calculo. |
| `nomina_bolsa_horas.id` -> `nomina_bolsa_horas_movimientos.bolsa_id` | Trazabilidad de movimientos por bolsa. |
| `nomina_calculo_semanal.id` -> `nomina_calculo_workflow_evento.calculo_id` | Historial de cambios de estado. |
| `nomina_catalogo_novedades.codigo` -> `nomina_novedad_evento.codigo_novedad` | Eventos de ausencias/licencias/vacaciones/incapacidades por concepto. |
| `nomina_calculo_semanal.ot_id` / `nomina_calculo_semanal_detalle.ot_id` -> `nomina_costo_ot.ot_id` | Consolidacion semanal de costos por OT. |
| `usuarios.id` -> `relaciones_gestor_empleado.gestor_usuario_id` | Gestor local cuyo alcance se delimita por cedulas ERP. |
| `relaciones_gestor_empleado.id` -> `historial_relaciones_gestor_empleado.relacion_id` | Estado actual e historial append-only de alcance. |
| `nomina_plantillas_horario.id` -> `nomina_plantillas_horario_dias.plantilla_id` | Cabecera versionada y patron semanal de siete dias. |
| `nomina_plantillas_horario.id` -> `nomina_aplicaciones_plantilla_horario.plantilla_id` | Catalogo y evidencia de cada copy-on-apply. |
| `nomina_aplicaciones_plantilla_horario.id` -> `nomina_aplicaciones_plantilla_empleados.aplicacion_id` | Aplicacion bulk y snapshots por cedula. |

---

### 🏗️ Diagrama del Sistema de Gestión de Proyectos TI

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           SISTEMA DE GESTIÓN DE PROYECTOS TI                        │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   AUTH_USERS     │    │   DEVELOPMENTS   │    │  ACTIVITY_LOGS   │
├──────────────────┤    ├──────────────────┤    ├──────────────────┤
│ id (PK)          │    │ id (PK)          │    │ id (PK)          │
│ email (UNIQUE)   │    │ name             │    │ development_id(FK)│
│ password_hash    │    │ description      │    │ date             │
│ name             │    │ module           │    │ description      │
│ role             │    │ type             │    │ category         │
│ is_active        │    │ start_date       │    │ user_id (FK)     │
│ email_verified   │    │ estimated_end_date│   │ created_at       │
│ avatar_url       │    │ target_closure_date│   └──────────────────┘
│ timezone         │    │ estimated_days   │              │
│ created_at       │    │ main_responsible │              │
│ updated_at       │    │ provider         │              │
│ last_login       │    │ requesting_area  │              │
└──────────────────┘    │ general_status   │              │
         │               │ current_stage    │              │
         │               │ observations     │              │
         │               │ estimated_cost   │              │
         │               │ proposal_number  │              │
         │               │ environment      │              │
         │               │ portal_link      │              │
         │               │ scheduled_delivery_date │       │
         │               │ actual_delivery_date    │       │
         │               │ returns_count    │              │
         │               │ test_defects_count│             │
         │               │ created_at       │              │
         │               │ updated_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │    INCIDENTS     │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ report_date      │              │
         │               │ resolution_date  │              │
         │               │ description      │              │
         │               │ severity         │              │
         │               │ impact           │              │
         │               │ status           │              │
         │               │ assigned_to (FK) │              │
         │               │ created_at       │              │
         │               │ updated_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │   MILESTONES     │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ title            │              │
         │               │ description      │              │
         │               │ due_date         │              │
         │               │ status           │              │
         │               │ completion_date  │              │
         │               │ created_by (FK)  │              │
         │               │ created_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │ QUALITY_CONTROLS │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ control_code     │              │
         │               │ control_name     │              │
         │               │ stage_prefix     │              │
         │               │ status           │              │
         │               │ completed_by (FK)│              │
         │               │ completed_at     │              │
         │               │ observations     │              │
         │               │ created_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │   TEST_TASKS     │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ requirement_id   │              │
         │               │ title            │              │
         │               │ description      │              │
         │               │ status           │              │
         │               │ estimated_hours  │              │
         │               │ actual_hours     │              │
         │               │ assigned_to (FK) │              │
         │               │ priority         │              │
         │               │ is_timer_active  │              │
         │               │ created_at       │              │
         │               │ updated_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │   KPI_METRICS    │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ metric_type      │              │
         │               │ provider         │              │
         │               │ period_start     │              │
         │               │ period_end       │              │
         │               │ value            │              │
         │               │ target_value     │              │
         │               │ calculated_at    │              │
         │               │ calculated_by(FK)│              │
         │               └──────────────────┘              │
         │                                                 │
         │               ┌──────────────────┐              │
         │               │  CHAT_SESSIONS   │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ user_id (FK)     │──────────────┘
         │               │ title            │
         │               │ created_at       │
         │               │ updated_at       │
         │               └──────────────────┘
         │                        │
         │                        │
         │               ┌──────────────────┐
         │               │  CHAT_MESSAGES   │
         │               ├──────────────────┤
         │               │ id (PK)          │
         │               │ session_id (FK)  │
         │               │ content          │
         │               │ sender           │
         │               │ message_type     │
         │               │ metadata         │
         │               │ created_at       │
         │               └──────────────────┘
         │
         │               ┌──────────────────┐
         │               │   AUTH_TOKENS    │
         │               ├──────────────────┤
         │               │ id (PK)          │
         │               │ user_id (FK)     │──────────────┘
         │               │ token_hash       │
         │               │ token_type       │
         │               │ name             │
         │               │ expires_at       │
         │               │ last_used_at     │
         │               │ created_at       │
         │               └──────────────────┘
         │
         │               ┌──────────────────┐
         │               │ USER_SESSIONS    │
         │               ├──────────────────┤
         │               │ id (PK)          │
         │               │ user_id (FK)     │──────────────┘
         │               │ session_token    │
         │               │ ip_address       │
         │               │ user_agent       │
         │               │ expires_at       │
         │               │ created_at       │
         │               └──────────────────┘
         │
         │               ┌──────────────────┐
         │               │ SYSTEM_SETTINGS  │
         │               ├──────────────────┤
         │               │ id (PK)          │
         │               │ user_id (FK)     │──────────────┘
         │               │ category         │
         │               │ key              │
         │               │ value            │
         │               │ created_at       │
         │               │ updated_at       │
         │               └──────────────────┘

         ┌──────────────────┐
         │   PERMISSIONS    │
         ├──────────────────┤
         │ id (PK)          │
         │ name (UNIQUE)    │
         │ description      │
         │ resource         │
         │ action           │
         └──────────────────┘
                  │
                  │
         ┌──────────────────┐
         │ ROLE_PERMISSIONS │
         ├──────────────────┤
         │ role (PK)        │
         │ permission_id(PK)│
         └──────────────────┘
```

### 🔗 Relaciones Principales

#### **1. AUTH_USERS (1:N) con múltiples tablas:**
- `AUTH_USERS` → `AUTH_TOKENS` (Un usuario puede tener múltiples tokens)
- `AUTH_USERS` → `USER_SESSIONS` (Un usuario puede tener múltiples sesiones)
- `AUTH_USERS` → `CHAT_SESSIONS` (Un usuario puede tener múltiples chats)
- `AUTH_USERS` → `SYSTEM_SETTINGS` (Un usuario puede tener múltiples configuraciones)

#### **2. DEVELOPMENTS (1:N) como entidad central:**
- `DEVELOPMENTS` → `ACTIVITY_LOGS` (Un desarrollo tiene múltiples actividades)
- `DEVELOPMENTS` → `INCIDENTS` (Un desarrollo puede tener múltiples incidencias)
- `DEVELOPMENTS` → `MILESTONES` (Un desarrollo tiene múltiples hitos)
- `DEVELOPMENTS` → `QUALITY_CONTROLS` (Un desarrollo tiene múltiples controles)
- `DEVELOPMENTS` → `TEST_TASKS` (Un desarrollo tiene múltiples tareas de testing)
- `DEVELOPMENTS` → `KPI_METRICS` (Un desarrollo genera múltiples métricas)

#### **3. Relaciones de Chat:**
- `CHAT_SESSIONS` → `CHAT_MESSAGES` (Una sesión tiene múltiples mensajes)

#### **4. Sistema de Permisos:**
- `PERMISSIONS` ↔ `ROLE_PERMISSIONS` ↔ `AUTH_USERS.role` (Many-to-Many a través de roles)

### 📋 Cardinalidades Detalladas

```
AUTH_USERS (1) ──── (N) AUTH_TOKENS
AUTH_USERS (1) ──── (N) USER_SESSIONS  
AUTH_USERS (1) ──── (N) CHAT_SESSIONS
AUTH_USERS (1) ──── (N) SYSTEM_SETTINGS
AUTH_USERS (1) ──── (N) ACTIVITY_LOGS (created_by)
AUTH_USERS (1) ──── (N) INCIDENTS (assigned_to)
AUTH_USERS (1) ──── (N) MILESTONES (created_by)
AUTH_USERS (1) ──── (N) QUALITY_CONTROLS (completed_by)
AUTH_USERS (1) ──── (N) TEST_TASKS (assigned_to)
AUTH_USERS (1) ──── (N) KPI_METRICS (calculated_by)

DEVELOPMENTS (1) ──── (N) ACTIVITY_LOGS
DEVELOPMENTS (1) ──── (N) INCIDENTS
DEVELOPMENTS (1) ──── (N) MILESTONES
DEVELOPMENTS (1) ──── (N) QUALITY_CONTROLS
DEVELOPMENTS (1) ──── (N) TEST_TASKS
DEVELOPMENTS (1) ──── (N) KPI_METRICS

CHAT_SESSIONS (1) ──── (N) CHAT_MESSAGES

PERMISSIONS (N) ──── (N) ROLES (via ROLE_PERMISSIONS)
```

### 🎯 Índices Recomendados para Performance

```sql
-- Índices para performance
CREATE INDEX idx_developments_status ON developments(general_status);
CREATE INDEX idx_developments_provider ON developments(provider);
CREATE INDEX idx_developments_dates ON developments(start_date, estimated_end_date);
CREATE INDEX idx_activity_logs_dev_date ON activity_logs(development_id, date);
CREATE INDEX idx_incidents_dev_status ON incidents(development_id, status);
CREATE INDEX idx_quality_controls_dev ON quality_controls(development_id);
CREATE INDEX idx_test_tasks_assigned ON test_tasks(assigned_to, status);
CREATE INDEX idx_auth_tokens_user ON auth_tokens(user_id, token_type);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX idx_kpi_metrics_dev_type ON kpi_metrics(development_id, metric_type);
CREATE INDEX idx_milestones_dev_status ON milestones(development_id, status);
```

### 📊 Tablas por Estado de Implementación

#### ✅ **Implementadas Actualmente:**
- `developments` - Tabla principal de desarrollos
- `activity_logs` - Bitácora de actividades
- `incidents` - Incidencias post-producción

#### 🚧 **Pendientes de Implementar:**
- `auth_users` - Sistema de autenticación
- `auth_tokens` - Tokens de API y sesiones
- `user_sessions` - Sesiones de usuario
- `permissions` - Permisos del sistema
- `role_permissions` - Relación roles-permisos
- `milestones` - Hitos del proyecto
- `quality_controls` - Controles de calidad
- `test_tasks` - Tareas de testing
- `kpi_metrics` - Métricas de rendimiento
- `chat_sessions` - Sesiones de chat
- `chat_messages` - Mensajes del chat
- `system_settings` - Configuraciones del sistema

### 🔄 Flujo de Datos Completo

```
1. AUTENTICACIÓN:
   AUTH_USERS → AUTH_TOKENS → USER_SESSIONS

2. GESTIÓN DE PROYECTOS:
   DEVELOPMENTS → ACTIVITY_LOGS + INCIDENTS + MILESTONES

3. CONTROL DE CALIDAD:
   QUALITY_CONTROLS → TEST_TASKS → KPI_METRICS

4. COMUNICACIÓN:
   CHAT_SESSIONS → CHAT_MESSAGES

5. CONFIGURACIÓN:
   SYSTEM_SETTINGS (por usuario)
```


















## 🔄 Detalles Técnicos (Auto-generado)
> [!NOTE]
> Esta sección es generada automáticamente por `scripts/sync_docs.py`. No editar manualmente.

### 📊 Diagrama Entidad-Relación Dinámico
```mermaid
erDiagram
    ACTIVIDADES {
        integer id
        character varying desarrollo_id
        integer parent_id
        character varying titulo
        character varying descripcion
        character varying estado
        character varying responsable_id
        date fecha_inicio_estimada
        date fecha_fin_estimada
        date fecha_inicio_real
        date fecha_fin_real
        numeric horas_estimadas
        numeric horas_reales
        numeric porcentaje_avance
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
        text seguimiento
        text compromiso
        character varying archivo_url
        character varying asignado_a_id
        character varying delegado_por_id
        character varying estado_validacion
        integer validacion_id
        date compromiso_fecha
        boolean compromiso_cumplido
        boolean anulada
        timestamp with time zone anulada_en
        character varying anulada_por_id
    }
    ACTIVIDADES_PROXIMAS {
        integer id
        character varying desarrollo_id
        character varying tipo_actividad
        character varying titulo
        character varying descripcion
        date fecha_vencimiento
        character varying parte_responsable
        character varying persona_responsable
        character varying estado
        character varying prioridad
        boolean alerta_enviada
        timestamp without time zone completado_en
        character varying creado_por
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    ADJUNTOS_TICKET {
        integer id
        character varying ticket_id
        character varying nombre_archivo
        character varying contenido_base64
        character varying tipo_mime
        timestamp without time zone creado_en
        character varying ruta_archivo
        integer tamano_bytes
    }
    ASIGNACIONINVENTARIO {
        integer id
        character varying bodega
        character varying bloque
        character varying estante
        character varying nivel
        character varying cedula
        character varying nombre
        character varying cedula_companero
        character varying nombre_companero
        integer numero_pareja
        integer ronda_vista
        character varying cargo
        timestamp with time zone creado_en
    }
    AUDITORIA_ACCIONES_USUARIO {
        integer id
        timestamp without time zone timestamp
        character varying usuario_id
        character varying usuario_nombre
        character varying rol
        character varying modulo
        character varying accion
        character varying entidad_tipo
        character varying entidad_id
        character varying metodo_http
        character varying ruta
        smallint codigo_respuesta
        character varying resultado
        character varying direccion_ip
        text agente_usuario
        character varying correlacion_id
        jsonb datos_anteriores
        jsonb datos_nuevos
        jsonb metadatos
    }
    AUDITORIA_EVENTOS {
        integer id
        timestamp with time zone timestamp
        character varying usuario_id
        character varying rol
        character varying direccion_ip
        text agente_usuario
        character varying resultado
        text motivo
        character varying endpoint
    }
    CACHE_CONTEXTO_IA {
        integer id
        character varying clave_contexto
        character varying desarrollo_id
        character varying tipo_contexto
        jsonb datos_contexto
        timestamp without time zone expira_en
        integer conteo_accesos
        timestamp without time zone ultimo_acceso_en
        timestamp without time zone creado_en
    }
    CATEGORIAS_TICKET {
        character varying id
        character varying nombre
        character varying descripcion
        character varying icono
        character varying tipo_formulario
        timestamp without time zone creado_en
    }
    COMENTARIOS_TICKET {
        integer id
        character varying ticket_id
        character varying comentario
        boolean es_interno
        character varying usuario_id
        character varying nombre_usuario
        timestamp without time zone creado_en
        boolean leido
        timestamp with time zone leido_en
    }
    CONFIGURACION_SEGURIDAD_RUNTIME {
        character varying clave
        character valor_hash
    }
    CONFIGURACIONINVENTARIO {
        integer id
        integer ronda_activa
        character varying conteo_nombre
        timestamp with time zone ultima_actualizacion
    }
    CONTEOHISTORICO {
        integer id
        integer original_id
        integer b_siigo
        character varying bodega
        character varying bloque
        character varying estante
        character varying nivel
        character varying codigo
        text descripcion
        character varying unidad
        double precision cantidad_sistema
        double precision invporlegalizar
        double precision cantidad_final
        double precision cant_c1
        character varying user_c1
        double precision cant_c2
        character varying user_c2
        double precision cant_c3
        character varying user_c3
        double precision cant_c4
        character varying user_c4
        character varying conteo
        character varying estado
        double precision diferencia
        double precision diferencia_total
        timestamp with time zone snapshot_at
    }
    CONTEOINVENTARIO {
        integer id
        integer b_siigo
        character varying bodega
        character varying bloque
        character varying estante
        character varying nivel
        character varying codigo
        text descripcion
        character varying unidad
        double precision cantidad_sistema
        double precision invporlegalizar
        double precision cantidad_final
        double precision cant_c1
        text obs_c1
        character varying user_c1
        double precision cant_c2
        text obs_c2
        character varying user_c2
        double precision cant_c3
        text obs_c3
        character varying user_c3
        double precision cant_c4
        text obs_c4
        character varying user_c4
        character varying conteo
        character varying estado
        double precision diferencia
        double precision diferencia_total
        timestamp with time zone fecha_creacion
    }
    CONTROL_CAMBIOS {
        integer id
        character varying ticket_id
        character varying desarrollo_id
        integer modulo_solid_id
        integer componente_solid_id
        character varying tipo_objeto
        character varying accion_requerida
        character varying impacto_operativo
        text justificacion
        text descripcion_cambio
    }
    CONTROL_DESCUENTOS_ACTIVOS {
        integer id
        character varying cedula
        character varying nombre
        character varying empresa
        character varying cargo
        character varying area
        character varying concepto
        double precision valor_descuento
        integer n_cuotas
        double precision valor_cuota
        character varying concepto_nomina
        date fecha_inicio
        date fecha_finalizacion
        character varying observaciones
        timestamp without time zone creado_en
    }
    CONTROL_DESCUENTOS_CONCEPTOS {
        integer id
        character varying nombre
        character varying concepto_nomina
        boolean activo
    }
    DESARROLLOS {
        character varying id
        character varying nombre
        character varying descripcion
        character varying modulo
        character varying tipo
        character varying ambiente
        character varying enlace_portal
        character varying proveedor
        character varying responsable
        character varying estado_general
        integer fase_actual_id
        integer etapa_actual_id
        numeric porcentaje_progreso
        date fecha_inicio
        date fecha_estimada_fin
        date fecha_real_fin
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
        character varying area_desarrollo
        character varying analista
        character varying autoridad
        character varying creado_por_id
        character varying responsable_id
        character varying estado_validacion
        character varying validado_por_id
        timestamp with time zone validado_en
        character varying supervisor
        character varying area_ejecutor
        character varying prioridad
    }
    EMBEDDINGS_FACIALES {
        integer id
        character varying usuario_id
        jsonb embedding
        boolean activo
        timestamp without time zone creado_en
    }
    EMPLEADOS_LINEAS {
        character varying documento
        character varying nombre
        character varying tipo
        character varying cargo
        character varying area
        character varying centro_costo
    }
    EQUIPOS_MOVILES {
        integer id
        character varying marca
        character varying modelo
        character varying imei
        character varying serial
        character varying estado_fisico
        text observaciones
    }
    ETAPAS_DESARROLLO {
        integer id
        integer fase_id
        character varying nombre
        character varying codigo
        integer orden
        character varying descripcion
        integer duracion_estimada_dias
        numeric porcentaje_inicio
        numeric porcentaje_fin
        boolean esta_activa
        timestamp without time zone creado_en
    }
    FACTURAS_LINEAS {
        integer id
        integer linea_id
        character varying periodo
        character varying documento_asignado
        character varying centro_costo
        numeric cargo_mes
        numeric descuento_mes
        numeric impoconsumo
        numeric descuento_iva
        numeric iva_19
        numeric total
        numeric pago_empleado
        numeric pago_refridcol
        timestamp without time zone created_at
    }
    FACTURAS_LINEAS_DETALLE {
        integer id
        character varying periodo
        character varying min
        character varying nombre
        character varying descripcion
        numeric valor
        numeric iva
        character varying criterio
        timestamp without time zone created_at
    }
    FASES_DESARROLLO {
        integer id
        character varying nombre
        character varying codigo
        integer orden
        character varying descripcion
        character varying color
        boolean esta_activa
        timestamp without time zone creado_en
    }
    FORMATO_2276 {
        integer id
        integer ano_gravable
        timestamp without time zone fecha_carga
        character varying cargado_por
        character varying entidad_informante
        character varying tdocb
        character varying nitb
        character varying pap
        character varying sap
        character varying pno
        character varying ono
        character varying dir
        character varying dpto
        character varying mun
        character varying pais
        double precision pasa
        double precision paec
        double precision pabop
        double precision vaex
        double precision paho
        double precision pase
        double precision paco
        double precision papre
        double precision pavia
        double precision paga
        double precision patra
        double precision vapo
        double precision potro
        double precision cein
        double precision ceco
        double precision auce
        double precision peju
        double precision tingbtp
        double precision apos
        double precision apof
        double precision aprais
        double precision apov
        double precision apafc
        double precision apavc
        double precision vare
        double precision ivav
        double precision rfiva
        double precision pagahuvt
        double precision vilap
        character varying tdocde
        character varying nitde
        character varying identfc
        character varying tdocpcc
        character varying nitpcc
    }
    FUNCIONALIDADES {
        integer id
        character varying desarrollo_id
        character varying nombre_funcionalidad
        character varying codigo_funcionalidad
        character varying descripcion
        character varying estado
        date fecha_entrega
        integer cantidad_defectos
        character varying nivel_complejidad
        numeric horas_estimadas
        numeric horas_reales
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    HERRAMIENTAS_INFORMATICAS {
        integer id
        character varying nombre
        character varying descripcion
        character varying funcionalidad
        character varying responsable
        character varying departamento
        character varying fecha_creacion
        character varying ultima_actualizacion
        character varying estado
        character varying version
        character varying ubicacion_archivo
        character varying fallas_comunes
        character varying fuentes
        character varying observaciones
        character varying ecosistema
        timestamp without time zone sys_fecha_creacion
        timestamp without time zone sys_ultima_modificacion
    }
    HISTORIAL_ANALISIS_IA {
        integer id
        character varying desarrollo_id
        character varying tipo_analisis
        character varying texto_consulta
        jsonb contexto_usado
        character varying respuesta_ia
        character varying modelo_ia
        integer tokens_usados
        integer tiempo_respuesta_ms
        character varying usuario_id
        numeric puntaje_confianza
        boolean fue_util
        timestamp without time zone creado_en
    }
    HISTORIAL_ENTREGAS {
        integer id
        character varying desarrollo_id
        character varying version_entrega
        character varying tipo_entrega
        date fecha_entrega
        character varying estado_entrega
        character varying motivo_devolucion
        integer cantidad_devoluciones
        date fecha_aprobacion
        character varying aprobado_por
        numeric puntaje_calidad
        integer defectos_reportados
        integer defectos_resueltos
        character varying notas_entrega
        timestamp without time zone creado_en
    }
    HISTORIAL_RELACIONES_GESTOR_EMPLEADO {
        uuid id
        uuid relacion_id
        character varying actor_usuario_id
        character varying accion
        boolean estado_anterior
        boolean estado_nuevo
        timestamp with time zone creado_en
    }
    HISTORIAL_RELACIONES_USUARIOS {
        integer id
        character varying usuario_id
        character varying superior_anterior_id
        character varying superior_nuevo_id
        character varying accion
        character varying realizado_por_id
        character varying observacion
        timestamp without time zone creado_en
    }
    HISTORIAL_TICKET {
        integer id
        character varying ticket_id
        character varying usuario_id
        character varying nombre_usuario
        character varying accion
        character varying detalle
        timestamp without time zone creado_en
    }
    INVENTARIO_ASIGNACION_PERSONAL {
        integer id
        character varying bodega
        character varying bloque
        character varying estante
        character varying nivel
        character varying cedula
        character varying nombre
        character varying cargo
        timestamp without time zone creado_en
    }
    LINEAS_CORPORATIVAS {
        integer id
        date fecha_actualizacion
        character varying linea
        character varying empresa
        character varying estatus
        character varying estado_asignacion
        integer equipo_id
        character varying documento_asignado
        character varying documento_cobro
        character varying nombre_plan
        character varying convenio
        character varying aprobado_por
        text observaciones
        double precision cobro_fijo_coef
        double precision cobro_especiales_coef
        numeric cfm_con_iva
        numeric cfm_sin_iva
        numeric descuento_39
        numeric vr_factura
        numeric pago_empleado
        numeric pago_empresa
        numeric primera_quincena
        numeric segunda_quincena
        timestamp without time zone created_at
        timestamp without time zone updated_at
    }
    LINEASOLICITUDMATERIAL {
        integer codigo
        integer solicitudmaterial
        date fecha
        character varying especialidad
        character varying subindice
        character varying centrocosto
        character varying subcentrocosto
        character varying tipodestino
        character varying tipoproducto
        character varying materialde
        character varying referenciaproducto
        character varying descripcionproducto
        double precision cantidad
        character varying unidadmedida
        character varying tipo
        character varying clasificacion
        character varying rotacion
        character varying proveedorfrecuente
        character varying observaciones
    }
    METRICAS_KPI {
        integer id
        character varying desarrollo_id
        character varying tipo_metrica
        character varying proveedor
        date periodo_inicio
        date periodo_fin
        numeric valor
        numeric valor_objetivo
        character varying calculado_por
        timestamp without time zone calculado_en
        timestamp without time zone creado_en
    }
    METRICAS_SISTEMA {
        integer id
        timestamp without time zone timestamp
        integer usuarios_online
        integer usuarios_activos_24h
        double precision cpu_uso_porcentaje
        double precision ram_uso_mb
        double precision ram_total_mb
        integer tickets_pendientes
        double precision latencia_db_ms
        character varying estado_servidor
    }
    MODULOS_SISTEMA {
        character varying id
        character varying nombre
        character varying categoria
        character varying descripcion
        boolean esta_activo
        boolean es_critico
        timestamp with time zone actualizado_en
    }
    NOMINA_APLICACIONES_PLANTILLA_EMPLEADOS {
        uuid aplicacion_id
        character varying empleado_cedula
        jsonb snapshot_anterior
        jsonb snapshot_aplicado
        character varying estado
        timestamp with time zone creado_en
    }
    NOMINA_APLICACIONES_PLANTILLA_HORARIO {
        uuid id
        uuid solicitud_id
        uuid plantilla_id
        integer plantilla_version
        character varying plantilla_nombre
        character varying actor_usuario_id
        integer cantidad_empleados
        character varying estado
        timestamp with time zone creado_en
    }
    NOMINA_ARCHIVOS {
        integer id
        character varying nombre_archivo
        character varying hash_archivo
        integer tamaño_bytes
        character varying tipo_archivo
        character varying ruta_almacenamiento
        integer mes_fact
        integer año_fact
        character varying categoria
        character varying subcategoria
        character varying estado
        character varying error_log
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    NOMINA_BOLSA_HORAS {
        integer id
        character varying cedula
        double precision horas_acreditadas
        double precision horas_consumidas
        double precision horas_pagadas
        timestamp with time zone fecha_ultimo_movimiento
        text observaciones
        timestamp with time zone creado_en
        timestamp with time zone actualizado_en
    }
    NOMINA_BOLSA_HORAS_MOVIMIENTOS {
        integer id
        integer bolsa_id
        character varying cedula
        character varying tipo_movimiento
        double precision horas
        timestamp with time zone fecha
        integer calculo_id
        integer liquidacion_id
        character varying usuario_id
        text observaciones
    }
    NOMINA_BOLSA_OT_OVERRIDE {
        integer id
        integer ot_id
        boolean bolsa_habilitada_override
        boolean bolsa_habilitada_erp
        character varying motivo
        character varying autorizado_por
        character varying autorizado_por_id
        timestamp without time zone vigente_desde
        timestamp without time zone vigente_hasta
        character varying estado
        character varying documento_soporte_url
        timestamp without time zone creado_en
    }
    NOMINA_CALCULO_DIARIO_DETALLE {
        integer id
        integer calculo_id
        character varying cedula
        integer anio
        integer semana_iso
        date fecha
        integer dia_semana
        time without time zone hora_entrada
        time without time zone hora_salida
        integer minutos_almuerzo
        double precision horas_trabajadas
        double precision horas_ordinarias
        double precision horas_extras
        character varying codigo_calculado
        double precision horas_concepto
        double precision factor_hora_ordinaria
        double precision valor_bruto
        double precision carga_prestacional
        double precision costo_total
        boolean es_festivo
        character varying nombre_festivo
        boolean es_domingo
        boolean es_jornada_nocturna
        character varying novedad_codigo
        integer novedad_evento_id
        character varying fuente_horario
        integer fuente_evidencia_id
        character varying hash_snapshot
        character varying creado_por
        integer ot_id
        character varying ot_codigo
        character varying observaciones
        timestamp without time zone creado_en
        boolean cruza_medianoche
    }
    NOMINA_CALCULO_SEMANAL {
        integer id
        character varying cedula
        integer anio
        integer semana_iso
        date fecha_inicio
        date fecha_fin
        character varying nivel_riesgo_arl
        double precision factor_prestacional
        double precision salario_base_mensual
        double precision valor_hora_ordinaria
        double precision total_horas_extras
        double precision total_horas_recargo_nocturno
        double precision total_valor_bruto
        double precision total_carga_prestacional
        double precision total_costo_empresa
        character varying estado
        character varying calculado_por
        timestamp with time zone calculado_en
        character varying confirmado_por
        timestamp with time zone confirmado_en
        text observaciones
        integer ot_id
        character varying ot_codigo
    }
    NOMINA_CALCULO_SEMANAL_DETALLE {
        integer id
        integer calculo_id
        character varying codigo_novedad
        double precision horas
        double precision factor_hora_ordinaria
        double precision valor_bruto
        double precision carga_prestacional
        double precision costo_total
        integer ot_id
        character varying ot_codigo
        character varying fuente
    }
    NOMINA_CALCULO_WORKFLOW_EVENTO {
        integer id
        integer calculo_id
        character varying estado_origen
        character varying estado_destino
        character varying justificacion
        character varying usuario_id
        timestamp without time zone created_at
    }
    NOMINA_CATALOGO_NOVEDADES {
        integer id
        character varying codigo
        character varying descripcion_corta
        character varying descripcion_larga
        character varying categoria
        character varying subcategoria
        double precision factor_hora_ordinaria
        boolean acredita_bolsa
        boolean descuenta_bolsa
        boolean requiere_autorizacion
        character varying unidad
        character varying estado
        date vigente_desde
        date vigente_hasta
        text observaciones
        timestamp with time zone creado_en
        timestamp with time zone actualizado_en
    }
    NOMINA_CONCEPTOS {
        integer id
        character varying empresa
        character varying concepto
        character varying categoria
        character varying subcategoria
        integer prioridad
        boolean es_regex
        character varying keywords
        timestamp without time zone creado_en
    }
    NOMINA_COSTO_OT {
        integer id
        integer ot_id
        character varying ot_codigo
        integer anio
        integer semana_iso
        date fecha_inicio
        date fecha_fin
        integer total_empleados
        double precision total_horas
        double precision total_horas_hed
        double precision total_horas_hen
        double precision total_horas_hefd
        double precision total_horas_hefn
        double precision total_horas_hf
        double precision total_valor_bruto
        double precision total_carga_prestacional
        double precision total_costo_empresa
        character varying categoria_sub_indice
        character varying cc
        character varying scc
        character varying sub_indice
        timestamp with time zone ultima_actualizacion
        jsonb calculo_ids
    }
    NOMINA_EXCEPCIONES {
        integer id
        character varying cedula
        character varying nombre_asociado
        character varying subcategoria
        character varying tipo
        character varying estado
        double precision valor_configurado
        double precision saldo_actual
        character varying pagador_cedula
        timestamp without time zone fecha_inicio
        timestamp without time zone fecha_fin
        character varying observacion
        character varying creado_por
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    NOMINA_EXCEPCIONES_HISTORIAL {
        integer id
        integer excepcion_id
        integer mes
        integer anio
        double precision valor_aplicado
        character varying mensaje
        timestamp without time zone creado_en
    }
    NOMINA_FACTOR_PRESTACIONAL_RIESGO {
        integer id
        character varying nivel_riesgo
        character varying nivel_macro
        character varying arl_nombre
        double precision factor_prestacional
        double precision porcentaje_salud
        double precision porcentaje_pension
        double precision porcentaje_arl
        double precision porcentaje_caja
        double precision porcentaje_icbf
        double precision porcentaje_sena
        double precision porcentaje_prima
        double precision porcentaje_cesantia
        double precision porcentaje_interes_cesantia
        double precision porcentaje_vacaciones
        date vigente_desde
        date vigente_hasta
        text observaciones
        timestamp with time zone creado_en
    }
    NOMINA_FAVORITOS {
        integer id
        character varying usuario_id
        character varying cedula
        character varying subcategoria
        timestamp without time zone creado_en
    }
    NOMINA_FESTIVO_CALENDARIO {
        integer anio
        date fecha
        character varying nombre
        character varying fuente
        timestamp with time zone created_at
    }
    NOMINA_HORARIO_PACTADO {
        integer id
        character varying cedula
        integer minutos_jornada_ordinaria
        double precision horas_semana_ordinaria
        boolean es_jornada_nocturna
        boolean autoriza_he_default
        boolean autoriza_he_override
        character varying override_motivo
        character varying override_autorizado_por
        timestamp with time zone override_fecha
        timestamp with time zone sincronizado_en
        character varying fuente_sincronizacion
        text observaciones
    }
    NOMINA_HORARIO_PACTADO_DIA {
        character varying cedula
        integer dia_semana
        time without time zone hora_entrada
        time without time zone hora_salida
        integer minutos_almuerzo
        boolean cruza_medianoche
    }
    NOMINA_NOVEDAD_EVENTO {
        integer id
        character varying cedula
        character varying codigo_novedad
        date fecha_inicio
        date fecha_fin
        character varying observaciones
        character varying estado
        timestamp without time zone created_at
        character varying created_by
        timestamp without time zone updated_at
        character varying updated_by
        timestamp without time zone confirmado_at
        character varying confirmado_by
        timestamp without time zone anulado_at
        character varying anulado_justificacion
    }
    NOMINA_OVERRIDE_AUTORIZA_HE {
        integer id
        character varying cedula
        boolean autoriza_he_erp
        boolean autoriza_he_override
        character varying motivo
        character varying autorizado_por
        character varying autorizado_por_id
        timestamp with time zone vigente_desde
        timestamp with time zone vigente_hasta
        character varying estado
        character varying documento_soporte_url
        timestamp with time zone creado_en
    }
    NOMINA_PARAMETROS_LEGALES {
        integer id
        character varying codigo
        character varying nombre
        character varying valor
        character varying tipo_dato
        character varying norma_soporte
        date vigente_desde
        date vigente_hasta
        character varying estado
        text observaciones
        timestamp with time zone creado_en
    }
    NOMINA_PLANIFICADOR_DIA_OT {
        integer id
        integer anio
        integer semana_iso
        character varying cedula
        integer dia_semana
        character varying orden
        character varying cc
        character varying scc
        character varying sub_indice
        character varying categoria_sub_indice
        character varying descripcion
        double precision vr_contratado
        double precision horas
        double precision porcentaje
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    NOMINA_PLANTILLAS_HORARIO {
        uuid id
        character varying nombre
        character varying descripcion
        integer version
        boolean esta_activa
        character varying creado_por_id
        character varying actualizado_por_id
        timestamp with time zone creado_en
        timestamp with time zone actualizado_en
    }
    NOMINA_PLANTILLAS_HORARIO_DIAS {
        uuid plantilla_id
        smallint dia_semana
        time without time zone hora_entrada
        time without time zone hora_salida
        smallint minutos_almuerzo
        boolean cruza_medianoche
    }
    NOMINA_PLANTILLAS_HORARIO_HISTORIAL {
        uuid id
        uuid plantilla_id
        character varying accion
        integer version
        character varying actor_usuario_id
        jsonb snapshot
        timestamp with time zone creado_en
    }
    NOMINA_REGISTROS_CRUDOS {
        integer id
        integer archivo_id
        integer fila_origen
        json payload
        timestamp without time zone creado_en
    }
    NOMINA_REGISTROS_NORMALIZADOS {
        integer id
        integer archivo_id
        timestamp without time zone fecha_creacion
        integer mes_fact
        integer año_fact
        character varying cedula
        character varying nombre_asociado
        double precision valor
        character varying empresa
        character varying concepto
        character varying categoria_final
        character varying subcategoria_final
        character varying estado_validacion
        double precision horas
        double precision dias
        character varying ciudad
        integer fila_origen
        character varying observaciones
        double precision valor_rdc
        double precision valor_colaborador
    }
    NOTIFICACIONES_USUARIO {
        integer id
        character varying usuario_id
        character varying titulo
        character varying mensaje
        boolean leido
        character varying tipo_evento
        character varying referencia_id
        timestamp without time zone creado_en
    }
    OPERACIONES_IDEMPOTENTES {
        uuid solicitud_id
        character varying tipo_operacion
        character varying actor_usuario_id
        character varying recurso_objetivo
        character varying payload_hash
        character varying estado
        jsonb resultado
        timestamp with time zone creado_en
        timestamp with time zone finalizado_en
    }
    PERMISOS_ROL {
        integer id
        character varying rol
        character varying modulo
        boolean permitido
    }
    PLANTILLAS_ACTIVIDADES {
        integer id
        character varying nombre_plantilla
        integer parent_id
        character varying titulo
        character varying descripcion
        numeric horas_estimadas
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    RECOMENDACIONES_IA {
        integer id
        character varying desarrollo_id
        character varying tipo_recomendacion
        character varying titulo
        character varying descripcion
        character varying prioridad
        numeric puntaje_impacto
        numeric puntaje_esfuerzo
        numeric confianza_ia
        character varying estado
        character varying asignado_a
        date fecha_limite
        character varying notas_implementacion
        timestamp without time zone implementado_en
        character varying retroalimentacion_resultados
        character varying generado_por
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    REGISTRO_ACTIVIDADES {
        integer id
        character varying desarrollo_id
        integer etapa_id
        character varying tipo_actividad
        timestamp without time zone fecha_inicio
        timestamp without time zone fecha_fin
        timestamp without time zone proximo_seguimiento_en
        character varying estado
        character varying tipo_actor
        character varying datos_dinamicos
        character varying creado_por
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    REGISTROS_ASISTENCIA {
        integer id
        character varying usuario_id
        integer zona_id
        boolean match_exitoso
        double precision nivel_confianza
        double precision latitud_marcada
        double precision longitud_marcada
        character varying evidencia_url
        timestamp without time zone creado_en
    }
    RELACIONES_GESTOR_EMPLEADO {
        uuid id
        character varying gestor_usuario_id
        character varying empleado_cedula
        boolean esta_activa
        character varying creado_por_id
        character varying actualizado_por_id
        timestamp with time zone creado_en
        timestamp with time zone actualizado_en
    }
    RELACIONES_USUARIOS {
        integer id
        character varying usuario_id
        character varying superior_id
        character varying tipo_relacion
        boolean esta_activa
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    REQUERIMIENTOS_DESARROLLO {
        integer id
        character varying external_id
        character varying desarrollo_id
        character varying titulo
        character varying descripcion
        character varying prioridad
        character varying estado
        date fecha_limite
        integer responsable_id
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    REQUISICIONES_PERSONAL {
        integer id
        character varying solicitante_nombre
        character varying solicitante_area
        character varying solicitante_sede
        character varying solicitante_email
        character varying ciudad_contratacion
        character varying orden_trabajo
        character varying nombre_proyecto
        character varying direccion_proyecto
        character varying encargado_sitio
        character varying area_destino
        character varying cargo_nombre
        integer numero_personas
        character varying trabajo_alturas
        character varying duracion_contrato
        date fecha_ingreso
        character varying centro_costo
        character varying causal_requisicion
        text perfil_o
        character varying equipos_oficina
        text equipos_detalle
        character varying equipos_tecnologicos
        text tecnologia_detalle
        character varying sim_card_requerida
        character varying sim_card_plan
        character varying programas_especiales_requeridos
        text programas_especiales_detalle
        bigint salario_asignado
        character varying horas_extra
        character varying modalidad_contratacion
        character varying tipo_contratacion
        bigint auxilio_movilizacion
        bigint auxilio_alimentacion
        bigint auxilio_vivienda
        character varying estado
        integer id_creador
        timestamp without time zone fecha_creacion
    }
    RESERVATION_AUDIT {
        integer id
        uuid reservation_id
        character varying action
        character varying changed_by_name
        character varying changed_by_document
        jsonb old_data
        jsonb new_data
        timestamp without time zone created_at
    }
    RESERVATION_SERIES {
        uuid id
        uuid room_id
        time without time zone start_time
        time without time zone end_time
        character varying title
        character varying pattern_type
        integer pattern_interval
        date start_date
        date end_date
        character varying created_by_name
        character varying created_by_document
        timestamp without time zone created_at
    }
    RESERVATIONS {
        uuid id
        uuid room_id
        uuid series_id
        timestamp with time zone start_datetime
        timestamp with time zone end_datetime
        character varying title
        character varying status
        character varying created_by_name
        character varying created_by_document
        character varying updated_by_name
        character varying updated_by_document
        character varying cancelled_by_name
        character varying cancelled_by_document
        timestamp with time zone created_at
        timestamp with time zone updated_at
    }
    ROLES_SISTEMA {
        character varying id
        character varying nombre
        character varying descripcion
        boolean es_sistema
        timestamp without time zone creado_en
    }
    ROOMS {
        uuid id
        character varying name
        integer capacity
        ARRAY resources
        boolean is_active
        text notes
        timestamp without time zone created_at
        timestamp without time zone updated_at
    }
    SESIONES {
        integer id
        character varying usuario_id
        character varying token_sesion
        character varying direccion_ip
        character varying agente_usuario
        timestamp with time zone expira_en
        timestamp with time zone creado_en
        character varying nombre_usuario
        character varying rol_usuario
        timestamp with time zone fin_sesion
        timestamp with time zone ultima_actividad_en
        character varying tipo_sesion
        character varying jti
        character varying scope
    }
    SOLICITUDES_ACTIVO {
        integer id
        character varying ticket_id
        character varying item_solicitado
        text especificaciones
        integer cantidad
        timestamp without time zone creado_en
    }
    SOLICITUDES_DESARROLLO {
        integer id
        character varying ticket_id
        character varying que_necesita
        character varying porque
        character varying paraque
        character varying justificacion_ia
        timestamp without time zone creado_en
    }
    SOLICITUDMATERIAL {
        integer codigo
        character varying codigosolicitud
        date fecha
        time without time zone hora
        character varying ordentrabajo
        character varying cliente
        character varying uen
        date fechanecesidad
        character varying estado
        integer usuario
        character varying nombreusuario
        character varying observaciones
        integer anexo
    }
    SOLID_COMPONENTES {
        integer id
        integer modulo_id
        character varying nombre
        text descripcion
        character varying version
        timestamp without time zone creado_en
    }
    SOLID_MODULOS {
        integer id
        character varying nombre
        text descripcion
        character varying version_actual
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
    }
    SOLID_OPCIONES {
        integer id
        integer componente_id
        character varying nombre
        character varying valor
        text descripcion
    }
    TICKETS {
        character varying id
        character varying categoria_id
        character varying asunto
        character varying descripcion
        character varying prioridad
        character varying estado
        character varying creador_id
        character varying nombre_creador
        character varying correo_creador
        character varying area_creador
        character varying cargo_creador
        character varying sede_creador
        character varying asignado_a
        character varying diagnostico
        character varying resolucion
        character varying causa_novedad
        character varying notas
        numeric horas_tiempo_empleado
        character varying desarrollo_id
        jsonb datos_extra
        jsonb areas_impactadas
        timestamp without time zone fecha_entrega_ideal
        timestamp without time zone fecha_creacion
        timestamp without time zone fecha_cierre
        timestamp without time zone resuelto_en
        timestamp without time zone atendido_en
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
        character varying sub_estado
    }
    TIPOS_DESARROLLO {
        integer id
        character varying valor
        character varying etiqueta
        integer orden
        boolean esta_activo
        timestamp without time zone creado_en
    }
    TOKENS {
        integer id
        character varying usuario_id
        character varying hash_token
        character varying tipo_token
        character varying nombre
        timestamp without time zone expira_en
        timestamp without time zone ultimo_uso_en
        timestamp without time zone creado_en
    }
    TRANSITO_VIATICOS {
        integer id
        uuid reporte_id
        character varying estado
        timestamp without time zone fecha_registro
        character varying empleado_cedula
        character varying empleado_nombre
        character varying area
        character varying cargo
        character varying ciudad
        character varying categoria
        date fecha_gasto
        character varying ot
        character varying cc
        character varying scc
        double precision valor_con_factura
        double precision valor_sin_factura
        character varying observaciones_linea
        character varying observaciones_gral
        character varying usuario_id
        jsonb adjuntos
    }
    TRANSITOINVENTARIO {
        integer id
        character varying sku
        character varying documento
        double precision cantidad
        timestamp with time zone fecha_proceso
    }
    USUARIOS {
        character varying id
        character varying cedula
        character varying correo
        character varying hash_contrasena
        character varying nombre
        character varying rol
        boolean esta_activo
        character varying url_avatar
        character varying zona_horaria
        timestamp without time zone creado_en
        timestamp without time zone actualizado_en
        timestamp without time zone ultimo_login
        character varying area
        character varying cargo
        character varying sede
        character varying centrocosto
        boolean viaticante
        double precision baseviaticos
        character varying especialidades
        character varying areas_asignadas
        boolean correo_actualizado
        boolean correo_verificado
    }
    VALIDACIONES_ASIGNACION {
        integer id
        character varying desarrollo_id
        integer actividad_id
        character varying solicitado_por_id
        character varying validador_id
        character varying asignado_a_id
        character varying estado
        character varying motivo
        character varying observacion
        timestamp without time zone creado_en
        timestamp without time zone validado_en
    }
    ZONAS_TRABAJO {
        integer id
        character varying nombre
        double precision latitud
        double precision longitud
        double precision radio
    }
```

### 📋 Diccionario de Datos
#### Tabla: `actividades`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('actividades_id_seq'::regclass) |
| desarrollo_id | character varying | NO | - |
| parent_id | integer | YES | - |
| titulo | character varying | NO | - |
| descripcion | character varying | YES | - |
| estado | character varying | NO | - |
| responsable_id | character varying | YES | - |
| fecha_inicio_estimada | date | YES | - |
| fecha_fin_estimada | date | YES | - |
| fecha_inicio_real | date | YES | - |
| fecha_fin_real | date | YES | - |
| horas_estimadas | numeric | NO | - |
| horas_reales | numeric | NO | - |
| porcentaje_avance | numeric | NO | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |
| seguimiento | text | YES | - |
| compromiso | text | YES | - |
| archivo_url | character varying | YES | - |
| asignado_a_id | character varying | YES | - |
| delegado_por_id | character varying | YES | - |
| estado_validacion | character varying | YES | 'aprobada'::character varying |
| validacion_id | integer | YES | - |
| compromiso_fecha | date | YES | - |
| compromiso_cumplido | boolean | YES | false |
| anulada | boolean | YES | false |
| anulada_en | timestamp with time zone | YES | - |
| anulada_por_id | character varying | YES | - |

#### Tabla: `actividades_proximas`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('actividades_proximas_id_seq'::regclass) |
| desarrollo_id | character varying | NO | - |
| tipo_actividad | character varying | NO | - |
| titulo | character varying | NO | - |
| descripcion | character varying | YES | - |
| fecha_vencimiento | date | NO | - |
| parte_responsable | character varying | NO | - |
| persona_responsable | character varying | YES | - |
| estado | character varying | NO | - |
| prioridad | character varying | NO | - |
| alerta_enviada | boolean | NO | - |
| completado_en | timestamp without time zone | YES | - |
| creado_por | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `adjuntos_ticket`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('adjuntos_ticket_id_seq'::regclass) |
| ticket_id | character varying | NO | - |
| nombre_archivo | character varying | NO | - |
| contenido_base64 | character varying | YES | - |
| tipo_mime | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| ruta_archivo | character varying | YES | - |
| tamano_bytes | integer | YES | - |

#### Tabla: `asignacioninventario`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('asignacioninventario_id_seq'::regclass) |
| bodega | character varying | NO | - |
| bloque | character varying | YES | - |
| estante | character varying | YES | - |
| nivel | character varying | YES | - |
| cedula | character varying | NO | - |
| nombre | character varying | YES | - |
| cedula_companero | character varying | YES | - |
| nombre_companero | character varying | YES | - |
| numero_pareja | integer | NO | - |
| ronda_vista | integer | YES | 1 |
| cargo | character varying | YES | - |
| creado_en | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Tabla: `auditoria_acciones_usuario`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('auditoria_acciones_usuario_id_seq'::regclass) |
| timestamp | timestamp without time zone | YES | now() |
| usuario_id | character varying | NO | - |
| usuario_nombre | character varying | YES | - |
| rol | character varying | YES | - |
| modulo | character varying | NO | - |
| accion | character varying | NO | - |
| entidad_tipo | character varying | YES | - |
| entidad_id | character varying | YES | - |
| metodo_http | character varying | YES | - |
| ruta | character varying | YES | - |
| codigo_respuesta | smallint | YES | - |
| resultado | character varying | NO | - |
| direccion_ip | character varying | YES | - |
| agente_usuario | text | YES | - |
| correlacion_id | character varying | YES | - |
| datos_anteriores | jsonb | YES | - |
| datos_nuevos | jsonb | YES | - |
| metadatos | jsonb | YES | - |

#### Tabla: `auditoria_eventos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('auditoria_eventos_id_seq'::regclass) |
| timestamp | timestamp with time zone | NO | now() |
| usuario_id | character varying | NO | - |
| rol | character varying | NO | - |
| direccion_ip | character varying | YES | - |
| agente_usuario | text | YES | - |
| resultado | character varying | NO | - |
| motivo | text | YES | - |
| endpoint | character varying | NO | '/api/v2/config/verify-admin'::character varying |

#### Tabla: `cache_contexto_ia`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('cache_contexto_ia_id_seq'::regclass) |
| clave_contexto | character varying | NO | - |
| desarrollo_id | character varying | YES | - |
| tipo_contexto | character varying | NO | - |
| datos_contexto | jsonb | YES | - |
| expira_en | timestamp without time zone | NO | - |
| conteo_accesos | integer | NO | - |
| ultimo_acceso_en | timestamp without time zone | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `categorias_ticket`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | character varying | NO | - |
| nombre | character varying | NO | - |
| descripcion | character varying | YES | - |
| icono | character varying | YES | - |
| tipo_formulario | character varying | NO | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `comentarios_ticket`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('comentarios_ticket_id_seq'::regclass) |
| ticket_id | character varying | NO | - |
| comentario | character varying | NO | - |
| es_interno | boolean | NO | - |
| usuario_id | character varying | YES | - |
| nombre_usuario | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| leido | boolean | YES | false |
| leido_en | timestamp with time zone | YES | - |

#### Tabla: `configuracion_seguridad_runtime`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| clave | character varying | NO | - |
| valor_hash | character | NO | - |

#### Tabla: `configuracioninventario`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('configuracioninventario_id_seq'::regclass) |
| ronda_activa | integer | YES | 1 |
| conteo_nombre | character varying | NO | - |
| ultima_actualizacion | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Tabla: `conteohistorico`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('conteohistorico_id_seq'::regclass) |
| original_id | integer | NO | - |
| b_siigo | integer | YES | - |
| bodega | character varying | YES | - |
| bloque | character varying | YES | - |
| estante | character varying | YES | - |
| nivel | character varying | YES | - |
| codigo | character varying | YES | - |
| descripcion | text | YES | - |
| unidad | character varying | YES | - |
| cantidad_sistema | double precision | YES | - |
| invporlegalizar | double precision | YES | - |
| cantidad_final | double precision | YES | - |
| cant_c1 | double precision | YES | - |
| user_c1 | character varying | YES | - |
| cant_c2 | double precision | YES | - |
| user_c2 | character varying | YES | - |
| cant_c3 | double precision | YES | - |
| user_c3 | character varying | YES | - |
| cant_c4 | double precision | YES | - |
| user_c4 | character varying | YES | - |
| conteo | character varying | YES | - |
| estado | character varying | YES | - |
| diferencia | double precision | YES | - |
| diferencia_total | double precision | YES | - |
| snapshot_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Tabla: `conteoinventario`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('conteoinventario_id_seq'::regclass) |
| b_siigo | integer | YES | - |
| bodega | character varying | NO | - |
| bloque | character varying | YES | - |
| estante | character varying | YES | - |
| nivel | character varying | YES | - |
| codigo | character varying | NO | - |
| descripcion | text | YES | - |
| unidad | character varying | YES | - |
| cantidad_sistema | double precision | YES | 0 |
| invporlegalizar | double precision | YES | 0 |
| cantidad_final | double precision | YES | 0 |
| cant_c1 | double precision | YES | 0 |
| obs_c1 | text | YES | - |
| user_c1 | character varying | YES | - |
| cant_c2 | double precision | YES | 0 |
| obs_c2 | text | YES | - |
| user_c2 | character varying | YES | - |
| cant_c3 | double precision | YES | 0 |
| obs_c3 | text | YES | - |
| user_c3 | character varying | YES | - |
| cant_c4 | double precision | YES | 0 |
| obs_c4 | text | YES | - |
| user_c4 | character varying | YES | - |
| conteo | character varying | NO | - |
| estado | character varying | YES | 'PENDIENTE'::character varying |
| diferencia | double precision | YES | 0 |
| diferencia_total | double precision | YES | 0 |
| fecha_creacion | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Tabla: `control_cambios`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('control_cambios_id_seq'::regclass) |
| ticket_id | character varying | NO | - |
| desarrollo_id | character varying | YES | - |
| modulo_solid_id | integer | YES | - |
| componente_solid_id | integer | YES | - |
| tipo_objeto | character varying | YES | - |
| accion_requerida | character varying | NO | - |
| impacto_operativo | character varying | NO | - |
| justificacion | text | YES | - |
| descripcion_cambio | text | YES | - |

#### Tabla: `control_descuentos_activos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('control_descuentos_activos_id_seq'::regclass) |
| cedula | character varying | NO | - |
| nombre | character varying | NO | - |
| empresa | character varying | NO | - |
| cargo | character varying | YES | - |
| area | character varying | YES | - |
| concepto | character varying | NO | - |
| valor_descuento | double precision | NO | - |
| n_cuotas | integer | NO | - |
| valor_cuota | double precision | NO | - |
| concepto_nomina | character varying | NO | - |
| fecha_inicio | date | NO | - |
| fecha_finalizacion | date | NO | - |
| observaciones | character varying | YES | - |
| creado_en | timestamp without time zone | NO | - |

#### Tabla: `control_descuentos_conceptos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('control_descuentos_conceptos_id_seq'::regclass) |
| nombre | character varying | NO | - |
| concepto_nomina | character varying | NO | - |
| activo | boolean | NO | - |

#### Tabla: `desarrollos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | character varying | NO | - |
| nombre | character varying | NO | - |
| descripcion | character varying | YES | - |
| modulo | character varying | YES | - |
| tipo | character varying | YES | - |
| ambiente | character varying | YES | - |
| enlace_portal | character varying | YES | - |
| proveedor | character varying | YES | - |
| responsable | character varying | YES | - |
| estado_general | character varying | NO | - |
| fase_actual_id | integer | YES | - |
| etapa_actual_id | integer | YES | - |
| porcentaje_progreso | numeric | NO | - |
| fecha_inicio | date | YES | - |
| fecha_estimada_fin | date | YES | - |
| fecha_real_fin | date | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |
| area_desarrollo | character varying | YES | - |
| analista | character varying | YES | - |
| autoridad | character varying | YES | - |
| creado_por_id | character varying | YES | - |
| responsable_id | character varying | YES | - |
| estado_validacion | character varying | YES | 'aprobada'::character varying |
| validado_por_id | character varying | YES | - |
| validado_en | timestamp with time zone | YES | - |
| supervisor | character varying | YES | - |
| area_ejecutor | character varying | YES | - |
| prioridad | character varying | YES | - |

#### Tabla: `embeddings_faciales`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('embeddings_faciales_id_seq'::regclass) |
| usuario_id | character varying | NO | - |
| embedding | jsonb | YES | - |
| activo | boolean | NO | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `empleados_lineas`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| documento | character varying | NO | - |
| nombre | character varying | NO | - |
| tipo | character varying | NO | - |
| cargo | character varying | YES | - |
| area | character varying | YES | - |
| centro_costo | character varying | YES | - |

#### Tabla: `equipos_moviles`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('equipos_moviles_id_seq'::regclass) |
| marca | character varying | YES | - |
| modelo | character varying | NO | - |
| imei | character varying | YES | - |
| serial | character varying | YES | - |
| estado_fisico | character varying | NO | - |
| observaciones | text | YES | - |

#### Tabla: `etapas_desarrollo`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('etapas_desarrollo_id_seq'::regclass) |
| fase_id | integer | NO | - |
| nombre | character varying | NO | - |
| codigo | character varying | NO | - |
| orden | integer | NO | - |
| descripcion | character varying | YES | - |
| duracion_estimada_dias | integer | YES | - |
| porcentaje_inicio | numeric | NO | - |
| porcentaje_fin | numeric | NO | - |
| esta_activa | boolean | NO | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `facturas_lineas`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('facturas_lineas_id_seq'::regclass) |
| linea_id | integer | NO | - |
| periodo | character varying | NO | - |
| documento_asignado | character varying | NO | - |
| centro_costo | character varying | NO | - |
| cargo_mes | numeric | YES | - |
| descuento_mes | numeric | YES | - |
| impoconsumo | numeric | YES | - |
| descuento_iva | numeric | YES | - |
| iva_19 | numeric | YES | - |
| total | numeric | YES | - |
| pago_empleado | numeric | YES | - |
| pago_refridcol | numeric | YES | - |
| created_at | timestamp without time zone | NO | - |

#### Tabla: `facturas_lineas_detalle`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('facturas_lineas_detalle_id_seq'::regclass) |
| periodo | character varying | NO | - |
| min | character varying | NO | - |
| nombre | character varying | NO | - |
| descripcion | character varying | NO | - |
| valor | numeric | YES | - |
| iva | numeric | YES | - |
| criterio | character varying | NO | - |
| created_at | timestamp without time zone | NO | - |

#### Tabla: `fases_desarrollo`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('fases_desarrollo_id_seq'::regclass) |
| nombre | character varying | NO | - |
| codigo | character varying | NO | - |
| orden | integer | NO | - |
| descripcion | character varying | YES | - |
| color | character varying | NO | - |
| esta_activa | boolean | NO | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `formato_2276`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('formato_2276_id_seq'::regclass) |
| ano_gravable | integer | NO | - |
| fecha_carga | timestamp without time zone | NO | now() |
| cargado_por | character varying | NO | - |
| entidad_informante | character varying | YES | - |
| tdocb | character varying | NO | - |
| nitb | character varying | NO | - |
| pap | character varying | NO | - |
| sap | character varying | YES | - |
| pno | character varying | NO | - |
| ono | character varying | YES | - |
| dir | character varying | YES | - |
| dpto | character varying | YES | - |
| mun | character varying | YES | - |
| pais | character varying | YES | - |
| pasa | double precision | NO | - |
| paec | double precision | NO | - |
| pabop | double precision | NO | - |
| vaex | double precision | NO | - |
| paho | double precision | NO | - |
| pase | double precision | NO | - |
| paco | double precision | NO | - |
| papre | double precision | NO | - |
| pavia | double precision | NO | - |
| paga | double precision | NO | - |
| patra | double precision | NO | - |
| vapo | double precision | NO | - |
| potro | double precision | NO | - |
| cein | double precision | NO | - |
| ceco | double precision | NO | - |
| auce | double precision | NO | - |
| peju | double precision | NO | - |
| tingbtp | double precision | NO | - |
| apos | double precision | NO | - |
| apof | double precision | NO | - |
| aprais | double precision | NO | - |
| apov | double precision | NO | - |
| apafc | double precision | NO | - |
| apavc | double precision | NO | - |
| vare | double precision | NO | - |
| ivav | double precision | NO | - |
| rfiva | double precision | NO | - |
| pagahuvt | double precision | NO | - |
| vilap | double precision | NO | - |
| tdocde | character varying | YES | - |
| nitde | character varying | YES | - |
| identfc | character varying | YES | - |
| tdocpcc | character varying | YES | - |
| nitpcc | character varying | YES | - |

#### Tabla: `funcionalidades`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('funcionalidades_id_seq'::regclass) |
| desarrollo_id | character varying | NO | - |
| nombre_funcionalidad | character varying | NO | - |
| codigo_funcionalidad | character varying | YES | - |
| descripcion | character varying | YES | - |
| estado | character varying | NO | - |
| fecha_entrega | date | YES | - |
| cantidad_defectos | integer | NO | - |
| nivel_complejidad | character varying | NO | - |
| horas_estimadas | numeric | YES | - |
| horas_reales | numeric | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `herramientas_informaticas`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('herramientas_informaticas_id_seq'::regclass) |
| nombre | character varying | NO | - |
| descripcion | character varying | YES | - |
| funcionalidad | character varying | YES | - |
| responsable | character varying | YES | - |
| departamento | character varying | YES | - |
| fecha_creacion | character varying | YES | - |
| ultima_actualizacion | character varying | YES | - |
| estado | character varying | NO | - |
| version | character varying | YES | - |
| ubicacion_archivo | character varying | YES | - |
| fallas_comunes | character varying | YES | - |
| fuentes | character varying | YES | - |
| observaciones | character varying | YES | - |
| ecosistema | character varying | YES | - |
| sys_fecha_creacion | timestamp without time zone | NO | now() |
| sys_ultima_modificacion | timestamp without time zone | NO | now() |

#### Tabla: `historial_analisis_ia`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('historial_analisis_ia_id_seq'::regclass) |
| desarrollo_id | character varying | YES | - |
| tipo_analisis | character varying | NO | - |
| texto_consulta | character varying | NO | - |
| contexto_usado | jsonb | YES | - |
| respuesta_ia | character varying | NO | - |
| modelo_ia | character varying | NO | - |
| tokens_usados | integer | YES | - |
| tiempo_respuesta_ms | integer | YES | - |
| usuario_id | character varying | YES | - |
| puntaje_confianza | numeric | YES | - |
| fue_util | boolean | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `historial_entregas`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('historial_entregas_id_seq'::regclass) |
| desarrollo_id | character varying | NO | - |
| version_entrega | character varying | YES | - |
| tipo_entrega | character varying | YES | - |
| fecha_entrega | date | YES | - |
| estado_entrega | character varying | YES | - |
| motivo_devolucion | character varying | YES | - |
| cantidad_devoluciones | integer | NO | - |
| fecha_aprobacion | date | YES | - |
| aprobado_por | character varying | YES | - |
| puntaje_calidad | numeric | YES | - |
| defectos_reportados | integer | NO | - |
| defectos_resueltos | integer | NO | - |
| notas_entrega | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `historial_relaciones_gestor_empleado`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | uuid | NO | - |
| relacion_id | uuid | NO | - |
| actor_usuario_id | character varying | NO | - |
| accion | character varying | NO | - |
| estado_anterior | boolean | NO | - |
| estado_nuevo | boolean | NO | - |
| creado_en | timestamp with time zone | NO | now() |

#### Tabla: `historial_relaciones_usuarios`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('historial_relaciones_usuarios_id_seq'::regclass) |
| usuario_id | character varying | NO | - |
| superior_anterior_id | character varying | YES | - |
| superior_nuevo_id | character varying | YES | - |
| accion | character varying | NO | - |
| realizado_por_id | character varying | YES | - |
| observacion | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `historial_ticket`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('historial_ticket_id_seq'::regclass) |
| ticket_id | character varying | NO | - |
| usuario_id | character varying | YES | - |
| nombre_usuario | character varying | YES | - |
| accion | character varying | NO | - |
| detalle | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `inventario_asignacion_personal`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('inventario_asignacion_personal_id_seq'::regclass) |
| bodega | character varying | NO | - |
| bloque | character varying | NO | - |
| estante | character varying | NO | - |
| nivel | character varying | NO | - |
| cedula | character varying | NO | - |
| nombre | character varying | NO | - |
| cargo | character varying | NO | - |
| creado_en | timestamp without time zone | NO | now() |

#### Tabla: `lineas_corporativas`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('lineas_corporativas_id_seq'::regclass) |
| fecha_actualizacion | date | YES | - |
| linea | character varying | NO | - |
| empresa | character varying | NO | - |
| estatus | character varying | NO | - |
| estado_asignacion | character varying | NO | - |
| equipo_id | integer | YES | - |
| documento_asignado | character varying | YES | - |
| documento_cobro | character varying | YES | - |
| nombre_plan | character varying | YES | - |
| convenio | character varying | YES | - |
| aprobado_por | character varying | YES | - |
| observaciones | text | YES | - |
| cobro_fijo_coef | double precision | NO | - |
| cobro_especiales_coef | double precision | NO | - |
| cfm_con_iva | numeric | YES | - |
| cfm_sin_iva | numeric | YES | - |
| descuento_39 | numeric | YES | - |
| vr_factura | numeric | YES | - |
| pago_empleado | numeric | YES | - |
| pago_empresa | numeric | YES | - |
| primera_quincena | numeric | YES | - |
| segunda_quincena | numeric | YES | - |
| created_at | timestamp without time zone | YES | - |
| updated_at | timestamp without time zone | YES | - |

#### Tabla: `lineasolicitudmaterial`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| codigo | integer | NO | nextval('lineasolicitudmaterial_codigo_seq'::regclass) |
| solicitudmaterial | integer | YES | - |
| fecha | date | NO | - |
| especialidad | character varying | YES | - |
| subindice | character varying | YES | - |
| centrocosto | character varying | YES | - |
| subcentrocosto | character varying | YES | - |
| tipodestino | character varying | YES | - |
| tipoproducto | character varying | YES | - |
| materialde | character varying | YES | - |
| referenciaproducto | character varying | YES | - |
| descripcionproducto | character varying | YES | - |
| cantidad | double precision | NO | - |
| unidadmedida | character varying | YES | - |
| tipo | character varying | YES | - |
| clasificacion | character varying | YES | - |
| rotacion | character varying | YES | - |
| proveedorfrecuente | character varying | YES | - |
| observaciones | character varying | YES | - |

#### Tabla: `metricas_kpi`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('metricas_kpi_id_seq'::regclass) |
| desarrollo_id | character varying | NO | - |
| tipo_metrica | character varying | NO | - |
| proveedor | character varying | YES | - |
| periodo_inicio | date | YES | - |
| periodo_fin | date | YES | - |
| valor | numeric | YES | - |
| valor_objetivo | numeric | YES | - |
| calculado_por | character varying | YES | - |
| calculado_en | timestamp without time zone | YES | now() |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `metricas_sistema`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('metricas_sistema_id_seq'::regclass) |
| timestamp | timestamp without time zone | NO | - |
| usuarios_online | integer | NO | - |
| usuarios_activos_24h | integer | NO | - |
| cpu_uso_porcentaje | double precision | NO | - |
| ram_uso_mb | double precision | NO | - |
| ram_total_mb | double precision | NO | - |
| tickets_pendientes | integer | NO | - |
| latencia_db_ms | double precision | NO | - |
| estado_servidor | character varying | NO | - |

#### Tabla: `modulos_sistema`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | character varying | NO | - |
| nombre | character varying | NO | - |
| categoria | character varying | NO | - |
| descripcion | character varying | YES | - |
| esta_activo | boolean | YES | true |
| es_critico | boolean | YES | false |
| actualizado_en | timestamp with time zone | YES | now() |

#### Tabla: `nomina_aplicaciones_plantilla_empleados`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| aplicacion_id | uuid | NO | - |
| empleado_cedula | character varying | NO | - |
| snapshot_anterior | jsonb | NO | - |
| snapshot_aplicado | jsonb | NO | - |
| estado | character varying | NO | - |
| creado_en | timestamp with time zone | NO | now() |

#### Tabla: `nomina_aplicaciones_plantilla_horario`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | uuid | NO | - |
| solicitud_id | uuid | NO | - |
| plantilla_id | uuid | NO | - |
| plantilla_version | integer | NO | - |
| plantilla_nombre | character varying | NO | - |
| actor_usuario_id | character varying | NO | - |
| cantidad_empleados | integer | NO | - |
| estado | character varying | NO | - |
| creado_en | timestamp with time zone | NO | now() |

#### Tabla: `nomina_archivos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_archivos_id_seq'::regclass) |
| nombre_archivo | character varying | NO | - |
| hash_archivo | character varying | NO | - |
| tamaño_bytes | integer | NO | - |
| tipo_archivo | character varying | NO | - |
| ruta_almacenamiento | character varying | NO | - |
| mes_fact | integer | NO | - |
| año_fact | integer | NO | - |
| categoria | character varying | NO | - |
| subcategoria | character varying | NO | - |
| estado | character varying | NO | - |
| error_log | character varying | YES | - |
| creado_en | timestamp without time zone | YES | - |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `nomina_bolsa_horas`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_bolsa_horas_id_seq'::regclass) |
| cedula | character varying | NO | - |
| horas_acreditadas | double precision | NO | 0.0 |
| horas_consumidas | double precision | NO | 0.0 |
| horas_pagadas | double precision | NO | 0.0 |
| fecha_ultimo_movimiento | timestamp with time zone | YES | - |
| observaciones | text | YES | - |
| creado_en | timestamp with time zone | YES | now() |
| actualizado_en | timestamp with time zone | YES | - |

#### Tabla: `nomina_bolsa_horas_movimientos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_bolsa_horas_movimientos_id_seq'::regclass) |
| bolsa_id | integer | NO | - |
| cedula | character varying | NO | - |
| tipo_movimiento | character varying | NO | - |
| horas | double precision | NO | - |
| fecha | timestamp with time zone | NO | now() |
| calculo_id | integer | YES | - |
| liquidacion_id | integer | YES | - |
| usuario_id | character varying | YES | - |
| observaciones | text | YES | - |

#### Tabla: `nomina_bolsa_ot_override`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_bolsa_ot_override_id_seq'::regclass) |
| ot_id | integer | NO | - |
| bolsa_habilitada_override | boolean | NO | - |
| bolsa_habilitada_erp | boolean | NO | - |
| motivo | character varying | NO | - |
| autorizado_por | character varying | NO | - |
| autorizado_por_id | character varying | YES | - |
| vigente_desde | timestamp without time zone | NO | - |
| vigente_hasta | timestamp without time zone | YES | - |
| estado | character varying | NO | - |
| documento_soporte_url | character varying | YES | - |
| creado_en | timestamp without time zone | YES | '2026-06-17 10:01:41.991353'::timestamp without time zone |

#### Tabla: `nomina_calculo_diario_detalle`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_calculo_diario_detalle_id_seq'::regclass) |
| calculo_id | integer | NO | - |
| cedula | character varying | NO | - |
| anio | integer | NO | - |
| semana_iso | integer | NO | - |
| fecha | date | NO | - |
| dia_semana | integer | NO | - |
| hora_entrada | time without time zone | YES | - |
| hora_salida | time without time zone | YES | - |
| minutos_almuerzo | integer | NO | - |
| horas_trabajadas | double precision | NO | - |
| horas_ordinarias | double precision | NO | - |
| horas_extras | double precision | NO | - |
| codigo_calculado | character varying | YES | - |
| horas_concepto | double precision | YES | - |
| factor_hora_ordinaria | double precision | YES | - |
| valor_bruto | double precision | NO | - |
| carga_prestacional | double precision | NO | - |
| costo_total | double precision | NO | - |
| es_festivo | boolean | NO | - |
| nombre_festivo | character varying | YES | - |
| es_domingo | boolean | NO | - |
| es_jornada_nocturna | boolean | NO | - |
| novedad_codigo | character varying | YES | - |
| novedad_evento_id | integer | YES | - |
| fuente_horario | character varying | NO | - |
| fuente_evidencia_id | integer | YES | - |
| hash_snapshot | character varying | YES | - |
| creado_por | character varying | YES | - |
| ot_id | integer | YES | - |
| ot_codigo | character varying | YES | - |
| observaciones | character varying | YES | - |
| creado_en | timestamp without time zone | NO | - |
| cruza_medianoche | boolean | NO | false |

#### Tabla: `nomina_calculo_semanal`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_calculo_semanal_id_seq'::regclass) |
| cedula | character varying | NO | - |
| anio | integer | NO | - |
| semana_iso | integer | NO | - |
| fecha_inicio | date | NO | - |
| fecha_fin | date | NO | - |
| nivel_riesgo_arl | character varying | NO | - |
| factor_prestacional | double precision | NO | - |
| salario_base_mensual | double precision | NO | - |
| valor_hora_ordinaria | double precision | NO | - |
| total_horas_extras | double precision | NO | 0.0 |
| total_horas_recargo_nocturno | double precision | NO | 0.0 |
| total_valor_bruto | double precision | NO | 0.0 |
| total_carga_prestacional | double precision | NO | 0.0 |
| total_costo_empresa | double precision | NO | 0.0 |
| estado | character varying | NO | 'BORRADOR'::character varying |
| calculado_por | character varying | YES | - |
| calculado_en | timestamp with time zone | YES | now() |
| confirmado_por | character varying | YES | - |
| confirmado_en | timestamp with time zone | YES | - |
| observaciones | text | YES | - |
| ot_id | integer | YES | - |
| ot_codigo | character varying | YES | - |

#### Tabla: `nomina_calculo_semanal_detalle`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_calculo_semanal_detalle_id_seq'::regclass) |
| calculo_id | integer | NO | - |
| codigo_novedad | character varying | NO | - |
| horas | double precision | NO | - |
| factor_hora_ordinaria | double precision | NO | - |
| valor_bruto | double precision | NO | - |
| carga_prestacional | double precision | NO | - |
| costo_total | double precision | NO | - |
| ot_id | integer | YES | - |
| ot_codigo | character varying | YES | - |
| fuente | character varying | NO | 'PORTAL'::character varying |

#### Tabla: `nomina_calculo_workflow_evento`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_calculo_workflow_evento_id_seq'::regclass) |
| calculo_id | integer | NO | - |
| estado_origen | character varying | NO | - |
| estado_destino | character varying | NO | - |
| justificacion | character varying | YES | - |
| usuario_id | character varying | YES | - |
| created_at | timestamp without time zone | YES | '2026-06-16 09:56:03.791843'::timestamp without time zone |

#### Tabla: `nomina_catalogo_novedades`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_catalogo_novedades_id_seq'::regclass) |
| codigo | character varying | NO | - |
| descripcion_corta | character varying | NO | - |
| descripcion_larga | character varying | YES | - |
| categoria | character varying | NO | - |
| subcategoria | character varying | NO | - |
| factor_hora_ordinaria | double precision | NO | 1.0 |
| acredita_bolsa | boolean | NO | false |
| descuenta_bolsa | boolean | NO | false |
| requiere_autorizacion | boolean | NO | false |
| unidad | character varying | NO | 'HORAS'::character varying |
| estado | character varying | NO | 'ACTIVO'::character varying |
| vigente_desde | date | NO | CURRENT_DATE |
| vigente_hasta | date | YES | - |
| observaciones | text | YES | - |
| creado_en | timestamp with time zone | YES | now() |
| actualizado_en | timestamp with time zone | YES | - |

#### Tabla: `nomina_conceptos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_conceptos_id_seq'::regclass) |
| empresa | character varying | NO | - |
| concepto | character varying | NO | - |
| categoria | character varying | NO | - |
| subcategoria | character varying | NO | - |
| prioridad | integer | NO | - |
| es_regex | boolean | NO | - |
| keywords | character varying | YES | - |
| creado_en | timestamp without time zone | YES | '2026-05-29 11:39:11.964409'::timestamp without time zone |

#### Tabla: `nomina_costo_ot`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_costo_ot_id_seq'::regclass) |
| ot_id | integer | NO | - |
| ot_codigo | character varying | NO | - |
| anio | integer | NO | - |
| semana_iso | integer | NO | - |
| fecha_inicio | date | NO | - |
| fecha_fin | date | NO | - |
| total_empleados | integer | NO | 0 |
| total_horas | double precision | NO | 0.0 |
| total_horas_hed | double precision | NO | 0.0 |
| total_horas_hen | double precision | NO | 0.0 |
| total_horas_hefd | double precision | NO | 0.0 |
| total_horas_hefn | double precision | NO | 0.0 |
| total_horas_hf | double precision | NO | 0.0 |
| total_valor_bruto | double precision | NO | 0.0 |
| total_carga_prestacional | double precision | NO | 0.0 |
| total_costo_empresa | double precision | NO | 0.0 |
| categoria_sub_indice | character varying | YES | - |
| cc | character varying | YES | - |
| scc | character varying | YES | - |
| sub_indice | character varying | YES | - |
| ultima_actualizacion | timestamp with time zone | YES | now() |
| calculo_ids | jsonb | YES | - |

#### Tabla: `nomina_excepciones`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_excepciones_id_seq'::regclass) |
| cedula | character varying | NO | - |
| nombre_asociado | character varying | YES | - |
| subcategoria | character varying | NO | - |
| tipo | character varying | NO | - |
| estado | character varying | NO | - |
| valor_configurado | double precision | NO | - |
| saldo_actual | double precision | NO | - |
| pagador_cedula | character varying | YES | - |
| fecha_inicio | timestamp without time zone | NO | - |
| fecha_fin | timestamp without time zone | YES | - |
| observacion | character varying | YES | - |
| creado_por | character varying | NO | - |
| creado_en | timestamp without time zone | NO | - |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `nomina_excepciones_historial`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_excepciones_historial_id_seq'::regclass) |
| excepcion_id | integer | NO | - |
| mes | integer | NO | - |
| anio | integer | NO | - |
| valor_aplicado | double precision | NO | - |
| mensaje | character varying | NO | - |
| creado_en | timestamp without time zone | NO | - |

#### Tabla: `nomina_factor_prestacional_riesgo`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_factor_prestacional_riesgo_id_seq'::regclass) |
| nivel_riesgo | character varying | NO | - |
| nivel_macro | character varying | NO | - |
| arl_nombre | character varying | YES | - |
| factor_prestacional | double precision | NO | - |
| porcentaje_salud | double precision | YES | 0.085 |
| porcentaje_pension | double precision | YES | 0.12 |
| porcentaje_arl | double precision | YES | 0.00522 |
| porcentaje_caja | double precision | YES | 0.04 |
| porcentaje_icbf | double precision | YES | 0.03 |
| porcentaje_sena | double precision | YES | 0.02 |
| porcentaje_prima | double precision | YES | 0.0833 |
| porcentaje_cesantia | double precision | YES | 0.0833 |
| porcentaje_interes_cesantia | double precision | YES | 0.01 |
| porcentaje_vacaciones | double precision | YES | 0.0417 |
| vigente_desde | date | NO | CURRENT_DATE |
| vigente_hasta | date | YES | - |
| observaciones | text | YES | - |
| creado_en | timestamp with time zone | YES | now() |

#### Tabla: `nomina_favoritos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_favoritos_id_seq'::regclass) |
| usuario_id | character varying | NO | - |
| cedula | character varying | NO | - |
| subcategoria | character varying | NO | - |
| creado_en | timestamp without time zone | YES | '2026-05-29 11:39:11.964409'::timestamp without time zone |

#### Tabla: `nomina_festivo_calendario`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| anio | integer | NO | - |
| fecha | date | NO | - |
| nombre | character varying | NO | - |
| fuente | character varying | NO | - |
| created_at | timestamp with time zone | NO | now() |

#### Tabla: `nomina_horario_pactado`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_horario_pactado_id_seq'::regclass) |
| cedula | character varying | NO | - |
| minutos_jornada_ordinaria | integer | NO | 480 |
| horas_semana_ordinaria | double precision | NO | 48.0 |
| es_jornada_nocturna | boolean | NO | false |
| autoriza_he_default | boolean | NO | false |
| autoriza_he_override | boolean | YES | - |
| override_motivo | character varying | YES | - |
| override_autorizado_por | character varying | YES | - |
| override_fecha | timestamp with time zone | YES | - |
| sincronizado_en | timestamp with time zone | YES | now() |
| fuente_sincronizacion | character varying | NO | 'ERP'::character varying |
| observaciones | text | YES | - |

#### Tabla: `nomina_horario_pactado_dia`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| cedula | character varying | NO | - |
| dia_semana | integer | NO | - |
| hora_entrada | time without time zone | YES | - |
| hora_salida | time without time zone | YES | - |
| minutos_almuerzo | integer | NO | 0 |
| cruza_medianoche | boolean | NO | false |

#### Tabla: `nomina_novedad_evento`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_novedad_evento_id_seq'::regclass) |
| cedula | character varying | NO | - |
| codigo_novedad | character varying | NO | - |
| fecha_inicio | date | NO | - |
| fecha_fin | date | NO | - |
| observaciones | character varying | YES | - |
| estado | character varying | NO | - |
| created_at | timestamp without time zone | YES | '2026-06-16 10:29:32.504188'::timestamp without time zone |
| created_by | character varying | YES | - |
| updated_at | timestamp without time zone | YES | - |
| updated_by | character varying | YES | - |
| confirmado_at | timestamp without time zone | YES | - |
| confirmado_by | character varying | YES | - |
| anulado_at | timestamp without time zone | YES | - |
| anulado_justificacion | character varying | YES | - |

#### Tabla: `nomina_override_autoriza_he`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_override_autoriza_he_id_seq'::regclass) |
| cedula | character varying | NO | - |
| autoriza_he_erp | boolean | NO | - |
| autoriza_he_override | boolean | NO | - |
| motivo | character varying | NO | - |
| autorizado_por | character varying | NO | - |
| autorizado_por_id | character varying | YES | - |
| vigente_desde | timestamp with time zone | NO | now() |
| vigente_hasta | timestamp with time zone | YES | - |
| estado | character varying | NO | 'ACTIVO'::character varying |
| documento_soporte_url | character varying | YES | - |
| creado_en | timestamp with time zone | YES | now() |

#### Tabla: `nomina_parametros_legales`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_parametros_legales_id_seq'::regclass) |
| codigo | character varying | NO | - |
| nombre | character varying | NO | - |
| valor | character varying | NO | - |
| tipo_dato | character varying | NO | 'NUMERICO'::character varying |
| norma_soporte | character varying | YES | - |
| vigente_desde | date | NO | CURRENT_DATE |
| vigente_hasta | date | YES | - |
| estado | character varying | NO | 'VIGENTE'::character varying |
| observaciones | text | YES | - |
| creado_en | timestamp with time zone | YES | now() |

#### Tabla: `nomina_planificador_dia_ot`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_planificador_dia_ot_id_seq'::regclass) |
| anio | integer | NO | - |
| semana_iso | integer | NO | - |
| cedula | character varying | NO | - |
| dia_semana | integer | NO | - |
| orden | character varying | NO | - |
| cc | character varying | YES | - |
| scc | character varying | YES | - |
| sub_indice | character varying | YES | - |
| categoria_sub_indice | character varying | NO | - |
| descripcion | character varying | YES | - |
| vr_contratado | double precision | YES | - |
| horas | double precision | YES | - |
| porcentaje | double precision | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | now() |

#### Tabla: `nomina_plantillas_horario`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | uuid | NO | - |
| nombre | character varying | NO | - |
| descripcion | character varying | YES | - |
| version | integer | NO | 1 |
| esta_activa | boolean | NO | true |
| creado_por_id | character varying | NO | - |
| actualizado_por_id | character varying | NO | - |
| creado_en | timestamp with time zone | NO | now() |
| actualizado_en | timestamp with time zone | NO | now() |

#### Tabla: `nomina_plantillas_horario_dias`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| plantilla_id | uuid | NO | - |
| dia_semana | smallint | NO | - |
| hora_entrada | time without time zone | YES | - |
| hora_salida | time without time zone | YES | - |
| minutos_almuerzo | smallint | NO | 0 |
| cruza_medianoche | boolean | NO | false |

#### Tabla: `nomina_plantillas_horario_historial`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | uuid | NO | - |
| plantilla_id | uuid | NO | - |
| accion | character varying | NO | - |
| version | integer | NO | - |
| actor_usuario_id | character varying | NO | - |
| snapshot | jsonb | NO | - |
| creado_en | timestamp with time zone | NO | now() |

#### Tabla: `nomina_registros_crudos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_registros_crudos_id_seq'::regclass) |
| archivo_id | integer | NO | - |
| fila_origen | integer | NO | - |
| payload | json | YES | - |
| creado_en | timestamp without time zone | YES | '2026-05-29 11:39:11.964409'::timestamp without time zone |

#### Tabla: `nomina_registros_normalizados`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('nomina_registros_normalizados_id_seq'::regclass) |
| archivo_id | integer | NO | - |
| fecha_creacion | timestamp without time zone | NO | - |
| mes_fact | integer | NO | - |
| año_fact | integer | NO | - |
| cedula | character varying | NO | - |
| nombre_asociado | character varying | YES | - |
| valor | double precision | NO | - |
| empresa | character varying | NO | - |
| concepto | character varying | NO | - |
| categoria_final | character varying | NO | - |
| subcategoria_final | character varying | NO | - |
| estado_validacion | character varying | NO | - |
| horas | double precision | NO | - |
| dias | double precision | NO | - |
| ciudad | character varying | YES | - |
| fila_origen | integer | NO | - |
| observaciones | character varying | YES | - |
| valor_rdc | double precision | YES | 0.0 |
| valor_colaborador | double precision | YES | 0.0 |

#### Tabla: `notificaciones_usuario`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('notificaciones_usuario_id_seq'::regclass) |
| usuario_id | character varying | NO | - |
| titulo | character varying | NO | - |
| mensaje | character varying | NO | - |
| leido | boolean | NO | - |
| tipo_evento | character varying | NO | - |
| referencia_id | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `operaciones_idempotentes`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| solicitud_id | uuid | NO | - |
| tipo_operacion | character varying | NO | - |
| actor_usuario_id | character varying | NO | - |
| recurso_objetivo | character varying | NO | - |
| payload_hash | character varying | NO | - |
| estado | character varying | NO | - |
| resultado | jsonb | YES | - |
| creado_en | timestamp with time zone | NO | now() |
| finalizado_en | timestamp with time zone | YES | - |

#### Tabla: `permisos_rol`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('permisos_rol_id_seq'::regclass) |
| rol | character varying | NO | - |
| modulo | character varying | NO | - |
| permitido | boolean | YES | true |

#### Tabla: `plantillas_actividades`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('plantillas_actividades_id_seq'::regclass) |
| nombre_plantilla | character varying | NO | - |
| parent_id | integer | YES | - |
| titulo | character varying | NO | - |
| descripcion | character varying | YES | - |
| horas_estimadas | numeric | NO | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `recomendaciones_ia`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('recomendaciones_ia_id_seq'::regclass) |
| desarrollo_id | character varying | YES | - |
| tipo_recomendacion | character varying | NO | - |
| titulo | character varying | NO | - |
| descripcion | character varying | NO | - |
| prioridad | character varying | NO | - |
| puntaje_impacto | numeric | YES | - |
| puntaje_esfuerzo | numeric | YES | - |
| confianza_ia | numeric | YES | - |
| estado | character varying | NO | - |
| asignado_a | character varying | YES | - |
| fecha_limite | date | YES | - |
| notas_implementacion | character varying | YES | - |
| implementado_en | timestamp without time zone | YES | - |
| retroalimentacion_resultados | character varying | YES | - |
| generado_por | character varying | NO | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `registro_actividades`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('registro_actividades_id_seq'::regclass) |
| desarrollo_id | character varying | YES | - |
| etapa_id | integer | YES | - |
| tipo_actividad | character varying | NO | - |
| fecha_inicio | timestamp without time zone | YES | - |
| fecha_fin | timestamp without time zone | YES | - |
| proximo_seguimiento_en | timestamp without time zone | YES | - |
| estado | character varying | NO | - |
| tipo_actor | character varying | YES | - |
| datos_dinamicos | character varying | YES | - |
| creado_por | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `registros_asistencia`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('registros_asistencia_id_seq'::regclass) |
| usuario_id | character varying | NO | - |
| zona_id | integer | YES | - |
| match_exitoso | boolean | NO | - |
| nivel_confianza | double precision | NO | - |
| latitud_marcada | double precision | NO | - |
| longitud_marcada | double precision | NO | - |
| evidencia_url | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `relaciones_gestor_empleado`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | uuid | NO | - |
| gestor_usuario_id | character varying | NO | - |
| empleado_cedula | character varying | NO | - |
| esta_activa | boolean | NO | true |
| creado_por_id | character varying | NO | - |
| actualizado_por_id | character varying | NO | - |
| creado_en | timestamp with time zone | NO | now() |
| actualizado_en | timestamp with time zone | NO | now() |

#### Tabla: `relaciones_usuarios`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('relaciones_usuarios_id_seq'::regclass) |
| usuario_id | character varying | NO | - |
| superior_id | character varying | NO | - |
| tipo_relacion | character varying | NO | - |
| esta_activa | boolean | NO | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `requerimientos_desarrollo`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('requerimientos_desarrollo_id_seq'::regclass) |
| external_id | character varying | NO | - |
| desarrollo_id | character varying | NO | - |
| titulo | character varying | NO | - |
| descripcion | character varying | YES | - |
| prioridad | character varying | NO | - |
| estado | character varying | NO | - |
| fecha_limite | date | YES | - |
| responsable_id | integer | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |

#### Tabla: `requisiciones_personal`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('requisiciones_personal_id_seq'::regclass) |
| solicitante_nombre | character varying | NO | - |
| solicitante_area | character varying | NO | - |
| solicitante_sede | character varying | NO | - |
| solicitante_email | character varying | NO | - |
| ciudad_contratacion | character varying | NO | - |
| orden_trabajo | character varying | NO | - |
| nombre_proyecto | character varying | NO | - |
| direccion_proyecto | character varying | NO | - |
| encargado_sitio | character varying | NO | - |
| area_destino | character varying | NO | - |
| cargo_nombre | character varying | NO | - |
| numero_personas | integer | NO | - |
| trabajo_alturas | character varying | NO | - |
| duracion_contrato | character varying | NO | - |
| fecha_ingreso | date | NO | - |
| centro_costo | character varying | NO | - |
| causal_requisicion | character varying | NO | - |
| perfil_o | text | YES | - |
| equipos_oficina | character varying | NO | - |
| equipos_detalle | text | YES | - |
| equipos_tecnologicos | character varying | NO | - |
| tecnologia_detalle | text | YES | - |
| sim_card_requerida | character varying | NO | - |
| sim_card_plan | character varying | YES | - |
| programas_especiales_requeridos | character varying | NO | - |
| programas_especiales_detalle | text | YES | - |
| salario_asignado | bigint | YES | - |
| horas_extra | character varying | NO | - |
| modalidad_contratacion | character varying | NO | - |
| tipo_contratacion | character varying | NO | - |
| auxilio_movilizacion | bigint | YES | - |
| auxilio_alimentacion | bigint | YES | - |
| auxilio_vivienda | bigint | YES | - |
| estado | character varying | NO | - |
| id_creador | integer | YES | - |
| fecha_creacion | timestamp without time zone | NO | now() |

#### Tabla: `reservation_audit`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('reservation_audit_id_seq'::regclass) |
| reservation_id | uuid | NO | - |
| action | character varying | NO | - |
| changed_by_name | character varying | YES | - |
| changed_by_document | character varying | YES | - |
| old_data | jsonb | YES | - |
| new_data | jsonb | YES | - |
| created_at | timestamp without time zone | YES | now() |

#### Tabla: `reservation_series`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | uuid | NO | gen_random_uuid() |
| room_id | uuid | NO | - |
| start_time | time without time zone | NO | - |
| end_time | time without time zone | NO | - |
| title | character varying | NO | - |
| pattern_type | character varying | NO | - |
| pattern_interval | integer | NO | - |
| start_date | date | NO | - |
| end_date | date | YES | - |
| created_by_name | character varying | NO | - |
| created_by_document | character varying | NO | - |
| created_at | timestamp without time zone | YES | now() |

#### Tabla: `reservations`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | uuid | NO | gen_random_uuid() |
| room_id | uuid | NO | - |
| series_id | uuid | YES | - |
| start_datetime | timestamp with time zone | YES | - |
| end_datetime | timestamp with time zone | YES | - |
| title | character varying | NO | - |
| status | character varying | NO | - |
| created_by_name | character varying | NO | - |
| created_by_document | character varying | NO | - |
| updated_by_name | character varying | YES | - |
| updated_by_document | character varying | YES | - |
| cancelled_by_name | character varying | YES | - |
| cancelled_by_document | character varying | YES | - |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

#### Tabla: `roles_sistema`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | character varying | NO | - |
| nombre | character varying | NO | - |
| descripcion | character varying | YES | - |
| es_sistema | boolean | NO | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `rooms`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | character varying | NO | - |
| capacity | integer | NO | - |
| resources | ARRAY | YES | - |
| is_active | boolean | NO | - |
| notes | text | YES | - |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

#### Tabla: `sesiones`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('sesiones_id_seq'::regclass) |
| usuario_id | character varying | NO | - |
| token_sesion | character varying | NO | - |
| direccion_ip | character varying | YES | - |
| agente_usuario | character varying | YES | - |
| expira_en | timestamp with time zone | NO | - |
| creado_en | timestamp with time zone | YES | now() |
| nombre_usuario | character varying | YES | - |
| rol_usuario | character varying | YES | - |
| fin_sesion | timestamp with time zone | YES | - |
| ultima_actividad_en | timestamp with time zone | YES | now() |
| tipo_sesion | character varying | NO | 'web'::character varying |
| jti | character varying | YES | - |
| scope | character varying | YES | - |

#### Tabla: `solicitudes_activo`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('solicitudes_activo_id_seq'::regclass) |
| ticket_id | character varying | NO | - |
| item_solicitado | character varying | NO | - |
| especificaciones | text | YES | - |
| cantidad | integer | NO | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `solicitudes_desarrollo`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('solicitudes_desarrollo_id_seq'::regclass) |
| ticket_id | character varying | NO | - |
| que_necesita | character varying | YES | - |
| porque | character varying | YES | - |
| paraque | character varying | YES | - |
| justificacion_ia | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `solicitudmaterial`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| codigo | integer | NO | nextval('solicitudmaterial_codigo_seq'::regclass) |
| codigosolicitud | character varying | NO | - |
| fecha | date | NO | - |
| hora | time without time zone | NO | - |
| ordentrabajo | character varying | YES | - |
| cliente | character varying | YES | - |
| uen | character varying | YES | - |
| fechanecesidad | date | NO | - |
| estado | character varying | YES | - |
| usuario | integer | YES | - |
| nombreusuario | character varying | YES | - |
| observaciones | character varying | YES | - |
| anexo | integer | YES | - |

#### Tabla: `solid_componentes`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('solid_componentes_id_seq'::regclass) |
| modulo_id | integer | NO | - |
| nombre | character varying | NO | - |
| descripcion | text | YES | - |
| version | character varying | NO | - |
| creado_en | timestamp without time zone | NO | - |

#### Tabla: `solid_modulos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('solid_modulos_id_seq'::regclass) |
| nombre | character varying | NO | - |
| descripcion | text | YES | - |
| version_actual | character varying | NO | - |
| creado_en | timestamp without time zone | NO | - |
| actualizado_en | timestamp without time zone | NO | - |

#### Tabla: `solid_opciones`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('solid_opciones_id_seq'::regclass) |
| componente_id | integer | NO | - |
| nombre | character varying | NO | - |
| valor | character varying | NO | - |
| descripcion | text | YES | - |

#### Tabla: `tickets`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | character varying | NO | - |
| categoria_id | character varying | NO | - |
| asunto | character varying | NO | - |
| descripcion | character varying | NO | - |
| prioridad | character varying | NO | - |
| estado | character varying | NO | - |
| creador_id | character varying | NO | - |
| nombre_creador | character varying | YES | - |
| correo_creador | character varying | YES | - |
| area_creador | character varying | YES | - |
| cargo_creador | character varying | YES | - |
| sede_creador | character varying | YES | - |
| asignado_a | character varying | YES | - |
| diagnostico | character varying | YES | - |
| resolucion | character varying | YES | - |
| causa_novedad | character varying | YES | - |
| notas | character varying | YES | - |
| horas_tiempo_empleado | numeric | YES | - |
| desarrollo_id | character varying | YES | - |
| datos_extra | jsonb | YES | - |
| areas_impactadas | jsonb | YES | - |
| fecha_entrega_ideal | timestamp without time zone | YES | - |
| fecha_creacion | timestamp without time zone | YES | now() |
| fecha_cierre | timestamp without time zone | YES | - |
| resuelto_en | timestamp without time zone | YES | - |
| atendido_en | timestamp without time zone | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |
| sub_estado | character varying | YES | 'Asignado'::character varying |

#### Tabla: `tipos_desarrollo`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('tipos_desarrollo_id_seq'::regclass) |
| valor | character varying | NO | - |
| etiqueta | character varying | NO | - |
| orden | integer | NO | - |
| esta_activo | boolean | NO | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `tokens`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('tokens_id_seq'::regclass) |
| usuario_id | character varying | NO | - |
| hash_token | character varying | NO | - |
| tipo_token | character varying | NO | - |
| nombre | character varying | YES | - |
| expira_en | timestamp without time zone | NO | - |
| ultimo_uso_en | timestamp without time zone | YES | - |
| creado_en | timestamp without time zone | YES | now() |

#### Tabla: `transito_viaticos`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('transito_viaticos_id_seq'::regclass) |
| reporte_id | uuid | NO | - |
| estado | character varying | NO | - |
| fecha_registro | timestamp without time zone | NO | - |
| empleado_cedula | character varying | NO | - |
| empleado_nombre | character varying | YES | - |
| area | character varying | YES | - |
| cargo | character varying | YES | - |
| ciudad | character varying | YES | - |
| categoria | character varying | YES | - |
| fecha_gasto | date | YES | - |
| ot | character varying | YES | - |
| cc | character varying | YES | - |
| scc | character varying | YES | - |
| valor_con_factura | double precision | NO | - |
| valor_sin_factura | double precision | NO | - |
| observaciones_linea | character varying | YES | - |
| observaciones_gral | character varying | YES | - |
| usuario_id | character varying | YES | - |
| adjuntos | jsonb | YES | - |

#### Tabla: `transitoinventario`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('transitoinventario_id_seq'::regclass) |
| sku | character varying | NO | - |
| documento | character varying | YES | - |
| cantidad | double precision | YES | 0 |
| fecha_proceso | timestamp with time zone | YES | CURRENT_TIMESTAMP |

#### Tabla: `usuarios`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | character varying | NO | - |
| cedula | character varying | NO | - |
| correo | character varying | YES | - |
| hash_contrasena | character varying | NO | - |
| nombre | character varying | NO | - |
| rol | character varying | NO | - |
| esta_activo | boolean | NO | - |
| url_avatar | character varying | YES | - |
| zona_horaria | character varying | NO | - |
| creado_en | timestamp without time zone | YES | now() |
| actualizado_en | timestamp without time zone | YES | - |
| ultimo_login | timestamp without time zone | YES | - |
| area | character varying | YES | - |
| cargo | character varying | YES | - |
| sede | character varying | YES | - |
| centrocosto | character varying | YES | - |
| viaticante | boolean | NO | - |
| baseviaticos | double precision | YES | - |
| especialidades | character varying | YES | - |
| areas_asignadas | character varying | YES | - |
| correo_actualizado | boolean | YES | false |
| correo_verificado | boolean | YES | false |

#### Tabla: `validaciones_asignacion`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('validaciones_asignacion_id_seq'::regclass) |
| desarrollo_id | character varying | YES | - |
| actividad_id | integer | YES | - |
| solicitado_por_id | character varying | NO | - |
| validador_id | character varying | NO | - |
| asignado_a_id | character varying | NO | - |
| estado | character varying | NO | - |
| motivo | character varying | YES | - |
| observacion | character varying | YES | - |
| creado_en | timestamp without time zone | YES | now() |
| validado_en | timestamp without time zone | YES | - |

#### Tabla: `zonas_trabajo`
| Columna | Tipo | Nulable | Defecto |
|---------|------|---------|---------|
| id | integer | NO | nextval('zonas_trabajo_id_seq'::regclass) |
| nombre | character varying | NO | - |
| latitud | double precision | NO | - |
| longitud | double precision | NO | - |
| radio | double precision | NO | - |
