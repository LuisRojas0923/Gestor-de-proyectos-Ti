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

## Bitacoras Operacionales FT-OPE-49

La Fase 1 persiste borradores y documentos finalizados en PostgreSQL. La integracion ERP, archivos, firma, PDF y endpoints permanecen fuera de esta fase hasta disponer del contrato real de `Aperturas OT V4`.

| Tabla | Clave y proposito |
|---|---|
| `bitacoras_operacionales` | UUID PK; snapshots de OT/obra/ciudad/ingeniero, propietario, estado, version optimista, novedades, artefactos finales y datos vigentes del formato. |
| `bitacora_operacional_actividades` | BIGSERIAL PK; actividades ordenadas con FK restrictiva al documento. |
| `bitacora_operacional_fotografias` | UUID PK; metadatos, dimensiones, ruta privada y SHA-256 de fotografias ordenadas. |

Reglas estructurales:

- Se admiten varias bitacoras para una misma OT y fecha; no existe una clave unica OT/fecha.
- `fecha_elaboracion` no puede superar la fecha actual de `America/Bogota`.
- Un documento solo puede estar `BORRADOR` o `FINALIZADA`; la finalizacion exige propietario, firma, PDF, hashes, firmante, version de constancia, al menos una actividad y una fotografia.
- Padres finalizados y sus hijos son inmutables; tampoco se permite eliminar el documento padre.
- `version` inicia en `1` y `sin_novedad` en `false` mediante defaults PostgreSQL.
- Los ordenes de actividades y fotografias son unicos por bitacora con constraints diferibles.
- Los indices de consulta cubren propietario/fecha, OT/fecha y estado/fecha.

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
        integer id PK
        character_varying desarrollo_id FK
        integer parent_id FK
        character_varying titulo
        character_varying descripcion
        character_varying estado
        character_varying responsable_id
        character_varying asignado_a_id
        character_varying delegado_por_id
        character_varying estado_validacion
        integer validacion_id
        date fecha_inicio_estimada
        date fecha_fin_estimada
        date fecha_inicio_real
        date fecha_fin_real
        numeric horas_estimadas
        numeric horas_reales
        numeric porcentaje_avance
        text seguimiento
        text compromiso
        date compromiso_fecha
        boolean compromiso_cumplido
        character_varying archivo_url
        boolean anulada
        timestamp_without_time_zone anulada_en
        character_varying anulada_por_id
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
    }
    ACTIVIDADES_PROXIMAS {
        integer id PK
        character_varying desarrollo_id
        character_varying tipo_actividad
        character_varying titulo
        character_varying descripcion
        date fecha_vencimiento
        character_varying parte_responsable
        character_varying persona_responsable
        character_varying estado
        character_varying prioridad
        boolean alerta_enviada
        timestamp_without_time_zone completado_en
        character_varying creado_por
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
    }
    ADJUNTOS_TICKET {
        integer id PK
        character_varying ticket_id FK
        character_varying nombre_archivo
        character_varying contenido_base64
        character_varying ruta_archivo
        integer tamano_bytes
        character_varying tipo_mime
        timestamp_without_time_zone creado_en
    }
    ASIGNACIONINVENTARIO {
        integer id PK
        character_varying bodega
        character_varying bloque
        character_varying estante
        character_varying nivel
        character_varying cedula
        character_varying nombre
        character_varying cedula_companero
        character_varying nombre_companero
        integer numero_pareja
        integer ronda_vista
        character_varying cargo
        timestamp_without_time_zone creado_en
    }
    AUDITORIA_ACCIONES_USUARIO {
        integer id PK
        timestamp_without_time_zone timestamp
        character_varying usuario_id
        character_varying usuario_nombre
        character_varying rol
        character_varying modulo
        character_varying accion
        character_varying entidad_tipo
        character_varying entidad_id
        character_varying metodo_http
        character_varying ruta
        smallint codigo_respuesta
        character_varying resultado
        character_varying direccion_ip
        text agente_usuario
        character_varying correlacion_id
        jsonb datos_anteriores
        jsonb datos_nuevos
        jsonb metadatos
    }
    AUDITORIA_EVENTOS {
        integer id PK
        timestamp_with_time_zone timestamp
        character_varying_50 usuario_id
        character_varying_50 rol
        character_varying_45 direccion_ip
        text agente_usuario
        character_varying_30 resultado
        text motivo
        character_varying_100 endpoint
    }
    BITACORA_OPERACIONAL_ACTIVIDADES {
        bigint id PK
        uuid bitacora_id FK
        smallint orden
        text descripcion
    }
    BITACORA_OPERACIONAL_FOTOGRAFIAS {
        uuid id PK
        uuid bitacora_id FK
        smallint orden
        character_varying_500 ruta_relativa
        character_varying_255 nombre_original
        character_varying_100 tipo_mime
        integer tamano_bytes
        integer ancho
        integer alto
        character_varying_64 hash_sha256
        timestamp_with_time_zone creado_en
    }
    BITACORAS_OPERACIONALES {
        uuid id PK
        date fecha_elaboracion
        character_varying_50 orden_trabajo
        character_varying_255 nombre_obra
        character_varying_120 ciudad
        character_varying_255 ingeniero_responsable
        character_varying_20 estado
        integer version
        text novedades_dia
        boolean sin_novedad
        character_varying_50 creado_por_id FK
        character_varying_50 finalizado_por_id FK
        character_varying_500 firma_ruta
        character_varying_64 firma_hash
        character_varying_500 pdf_ruta
        character_varying_64 pdf_hash
        character_varying_255 nombre_firmante
        character_varying_50 version_constancia
        character_varying_30 codigo_formato
        date fecha_formato
        character_varying_20 version_formato
        timestamp_with_time_zone creado_en
        timestamp_with_time_zone actualizado_en
        timestamp_with_time_zone finalizado_en
    }
    CACHE_CONTEXTO_IA {
        integer id PK
        character_varying clave_contexto
        character_varying desarrollo_id
        character_varying tipo_contexto
        jsonb datos_contexto
        timestamp_without_time_zone expira_en
        integer conteo_accesos
        timestamp_without_time_zone ultimo_acceso_en
        timestamp_without_time_zone creado_en
    }
    CATEGORIAS_TICKET {
        character_varying id PK
        character_varying nombre
        character_varying descripcion
        character_varying icono
        character_varying tipo_formulario
        timestamp_without_time_zone creado_en
    }
    COMENTARIOS_TICKET {
        integer id PK
        character_varying ticket_id FK
        character_varying comentario
        boolean es_interno
        character_varying usuario_id
        character_varying nombre_usuario
        boolean leido
        timestamp_without_time_zone leido_en
        timestamp_without_time_zone creado_en
    }
    CONFIGURACION_SEGURIDAD_RUNTIME {
        character_varying_50 clave PK
        character_64 valor_hash
    }
    CONFIGURACIONINVENTARIO {
        integer id PK
        integer ronda_activa
        character_varying conteo_nombre
        timestamp_without_time_zone ultima_actualizacion
    }
    CONTEOHISTORICO {
        integer id PK
        integer original_id
        integer b_siigo
        character_varying bodega
        character_varying bloque
        character_varying estante
        character_varying nivel
        character_varying codigo
        character_varying descripcion
        character_varying unidad
        double_precision cantidad_sistema
        double_precision cant_c1
        double_precision cant_c2
        double_precision cant_c3
        double_precision cant_c4
        character_varying conteo
        character_varying estado
        double_precision invporlegalizar
        double_precision cantidad_final
        double_precision diferencia_total
        timestamp_without_time_zone snapshot_at
    }
    CONTEOINVENTARIO {
        integer id PK
        integer b_siigo
        character_varying bodega
        character_varying bloque
        character_varying estante
        character_varying nivel
        character_varying codigo
        character_varying descripcion
        character_varying unidad
        double_precision cantidad_sistema
        double_precision cant_c1
        character_varying obs_c1
        character_varying user_c1
        double_precision cant_c2
        character_varying obs_c2
        character_varying user_c2
        double_precision cant_c3
        character_varying obs_c3
        character_varying user_c3
        double_precision cant_c4
        character_varying obs_c4
        character_varying user_c4
        character_varying conteo
        character_varying estado
        double_precision diferencia
        double_precision invporlegalizar
        double_precision cantidad_final
        double_precision diferencia_total
        timestamp_without_time_zone fecha_creacion
    }
    CONTROL_CAMBIOS {
        integer id PK
        character_varying ticket_id FK
        character_varying desarrollo_id FK
        integer modulo_solid_id FK
        integer componente_solid_id FK
        character_varying tipo_objeto
        character_varying accion_requerida
        character_varying impacto_operativo
        text justificacion
        text descripcion_cambio
    }
    CONTROL_DESCUENTOS_ACTIVOS {
        integer id PK
        character_varying cedula
        character_varying nombre
        character_varying empresa
        character_varying cargo
        character_varying area
        character_varying concepto
        double_precision valor_descuento
        integer n_cuotas
        double_precision valor_cuota
        character_varying concepto_nomina
        date fecha_inicio
        date fecha_finalizacion
        character_varying observaciones
        timestamp_without_time_zone creado_en
    }
    CONTROL_DESCUENTOS_CONCEPTOS {
        integer id PK
        character_varying nombre
        character_varying concepto_nomina
        boolean activo
    }
    DESARROLLOS {
        character_varying id PK
        character_varying nombre
        character_varying descripcion
        character_varying modulo
        character_varying tipo
        character_varying ambiente
        character_varying enlace_portal
        character_varying proveedor
        character_varying autoridad
        character_varying responsable
        character_varying area_desarrollo
        character_varying analista
        character_varying supervisor
        character_varying area_ejecutor
        character_varying creado_por_id
        character_varying responsable_id
        character_varying estado_general
        character_varying estado_validacion
        character_varying prioridad
        character_varying validado_por_id
        integer fase_actual_id FK
        integer etapa_actual_id FK
        numeric porcentaje_progreso
        date fecha_inicio
        date fecha_estimada_fin
        date fecha_real_fin
        timestamp_without_time_zone validado_en
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
    }
    EMBEDDINGS_FACIALES {
        integer id PK
        character_varying usuario_id FK
        jsonb embedding
        boolean activo
        timestamp_without_time_zone creado_en
    }
    EMPLEADOS_LINEAS {
        character_varying documento PK
        character_varying nombre
        character_varying tipo
        character_varying cargo
        character_varying area
        character_varying centro_costo
    }
    EQUIPOS_MOVILES {
        integer id PK
        character_varying marca
        character_varying modelo
        character_varying imei
        character_varying serial
        character_varying estado_fisico
        text observaciones
    }
    ETAPAS_DESARROLLO {
        integer id PK
        integer fase_id FK
        character_varying nombre
        character_varying codigo
        integer orden
        character_varying descripcion
        integer duracion_estimada_dias
        numeric porcentaje_inicio
        numeric porcentaje_fin
        boolean esta_activa
        timestamp_without_time_zone creado_en
    }
    FACTURAS_LINEAS {
        integer id PK
        integer linea_id FK
        character_varying periodo
        character_varying documento_asignado
        character_varying centro_costo
        numeric cargo_mes
        numeric descuento_mes
        numeric impoconsumo
        numeric descuento_iva
        numeric iva_19
        numeric total
        numeric pago_empleado
        numeric pago_refridcol
        timestamp_without_time_zone created_at
    }
    FACTURAS_LINEAS_DETALLE {
        integer id PK
        character_varying periodo
        character_varying min
        character_varying nombre
        character_varying descripcion
        numeric valor
        numeric iva
        character_varying criterio
        timestamp_without_time_zone created_at
    }
    FASES_DESARROLLO {
        integer id PK
        character_varying nombre
        character_varying codigo
        integer orden
        character_varying descripcion
        character_varying color
        boolean esta_activa
        timestamp_without_time_zone creado_en
    }
    FORMATO_2276 {
        integer id PK
        integer ano_gravable
        timestamp_without_time_zone fecha_carga
        character_varying cargado_por
        character_varying entidad_informante
        character_varying tdocb
        character_varying nitb
        character_varying pap
        character_varying sap
        character_varying pno
        character_varying ono
        character_varying dir
        character_varying dpto
        character_varying mun
        character_varying pais
        double_precision pasa
        double_precision paec
        double_precision pabop
        double_precision vaex
        double_precision paho
        double_precision pase
        double_precision paco
        double_precision papre
        double_precision pavia
        double_precision paga
        double_precision patra
        double_precision vapo
        double_precision potro
        double_precision cein
        double_precision ceco
        double_precision auce
        double_precision peju
        double_precision tingbtp
        double_precision apos
        double_precision apof
        double_precision aprais
        double_precision apov
        double_precision apafc
        double_precision apavc
        double_precision vare
        double_precision ivav
        double_precision rfiva
        double_precision pagahuvt
        double_precision vilap
        character_varying tdocde
        character_varying nitde
        character_varying identfc
        character_varying tdocpcc
        character_varying nitpcc
    }
    FUNCIONALIDADES {
        integer id PK
        character_varying desarrollo_id
        character_varying nombre_funcionalidad
        character_varying codigo_funcionalidad
        character_varying descripcion
        character_varying estado
        date fecha_entrega
        integer cantidad_defectos
        character_varying nivel_complejidad
        numeric horas_estimadas
        numeric horas_reales
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
    }
    HISTORIAL_ANALISIS_IA {
        integer id PK
        character_varying desarrollo_id
        character_varying tipo_analisis
        character_varying texto_consulta
        jsonb contexto_usado
        character_varying respuesta_ia
        character_varying modelo_ia
        integer tokens_usados
        integer tiempo_respuesta_ms
        character_varying usuario_id
        numeric puntaje_confianza
        boolean fue_util
        timestamp_without_time_zone creado_en
    }
    HISTORIAL_ENTREGAS {
        integer id PK
        character_varying desarrollo_id
        character_varying version_entrega
        character_varying tipo_entrega
        date fecha_entrega
        character_varying estado_entrega
        character_varying motivo_devolucion
        integer cantidad_devoluciones
        date fecha_aprobacion
        character_varying aprobado_por
        numeric puntaje_calidad
        integer defectos_reportados
        integer defectos_resueltos
        character_varying notas_entrega
        timestamp_without_time_zone creado_en
    }
    HISTORIAL_RELACIONES_GESTOR_EMPLEADO {
        uuid id PK
        uuid relacion_id FK
        character_varying actor_usuario_id FK
        character_varying accion
        boolean estado_anterior
        boolean estado_nuevo
        timestamp_with_time_zone creado_en
    }
    HISTORIAL_RELACIONES_USUARIOS {
        integer id PK
        character_varying usuario_id
        character_varying superior_anterior_id
        character_varying superior_nuevo_id
        character_varying accion
        character_varying realizado_por_id
        character_varying observacion
        timestamp_without_time_zone creado_en
    }
    HISTORIAL_TICKET {
        integer id PK
        character_varying ticket_id FK
        character_varying usuario_id
        character_varying nombre_usuario
        character_varying accion
        character_varying detalle
        timestamp_without_time_zone creado_en
    }
    LINEAS_CORPORATIVAS {
        integer id PK
        date fecha_actualizacion
        character_varying linea
        character_varying empresa
        character_varying estatus
        character_varying estado_asignacion
        integer equipo_id FK
        character_varying documento_asignado FK
        character_varying documento_cobro FK
        character_varying nombre_plan
        character_varying convenio
        character_varying aprobado_por
        text observaciones
        double_precision cobro_fijo_coef
        double_precision cobro_especiales_coef
        numeric cfm_con_iva
        numeric cfm_sin_iva
        numeric descuento_39
        numeric vr_factura
        numeric pago_empleado
        numeric pago_empresa
        numeric primera_quincena
        numeric segunda_quincena
        timestamp_without_time_zone created_at
        timestamp_without_time_zone updated_at
    }
    LINEASOLICITUDMATERIAL {
        integer codigo PK
        integer solicitudmaterial FK
        date fecha
        character_varying especialidad
        character_varying subindice
        character_varying centrocosto
        character_varying subcentrocosto
        character_varying tipodestino
        character_varying tipoproducto
        character_varying materialde
        character_varying referenciaproducto
        character_varying descripcionproducto
        double_precision cantidad
        character_varying unidadmedida
        character_varying tipo
        character_varying clasificacion
        character_varying rotacion
        character_varying proveedorfrecuente
        character_varying observaciones
    }
    METRICAS_KPI {
        integer id PK
        character_varying desarrollo_id
        character_varying tipo_metrica
        character_varying proveedor
        date periodo_inicio
        date periodo_fin
        numeric valor
        numeric valor_objetivo
        character_varying calculado_por
        timestamp_without_time_zone calculado_en
        timestamp_without_time_zone creado_en
    }
    METRICAS_SISTEMA {
        integer id PK
        timestamp_without_time_zone timestamp
        integer usuarios_online
        integer usuarios_activos_24h
        double_precision cpu_uso_porcentaje
        double_precision ram_uso_mb
        double_precision ram_total_mb
        integer tickets_pendientes
        double_precision latencia_db_ms
        character_varying estado_servidor
    }
    MODULOS_SISTEMA {
        character_varying id PK
        character_varying nombre
        character_varying categoria
        character_varying descripcion
        boolean esta_activo
        boolean es_critico
        timestamp_without_time_zone actualizado_en
    }
    NOMINA_APLICACIONES_PLANTILLA_EMPLEADOS {
        uuid aplicacion_id PK FK
        character_varying_50 empleado_cedula PK
        jsonb snapshot_anterior
        jsonb snapshot_aplicado
        character_varying estado
        timestamp_with_time_zone creado_en
    }
    NOMINA_APLICACIONES_PLANTILLA_HORARIO {
        uuid id PK
        uuid solicitud_id
        uuid plantilla_id FK
        integer plantilla_version
        character_varying plantilla_nombre
        character_varying actor_usuario_id FK
        integer cantidad_empleados
        character_varying estado
        timestamp_with_time_zone creado_en
    }
    NOMINA_ARCHIVOS {
        integer id PK
        character_varying nombre_archivo
        character_varying hash_archivo
        integer tamaño_bytes
        character_varying tipo_archivo
        character_varying ruta_almacenamiento
        integer mes_fact
        integer año_fact
        character_varying categoria
        character_varying subcategoria
        character_varying estado
        character_varying error_log
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
    }
    NOMINA_BOLSA_HORAS {
        integer id PK
        character_varying cedula
        double_precision horas_acreditadas
        double_precision horas_consumidas
        double_precision horas_pagadas
        timestamp_without_time_zone fecha_ultimo_movimiento
        character_varying observaciones
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
    }
    NOMINA_BOLSA_HORAS_MOVIMIENTOS {
        integer id PK
        integer bolsa_id FK
        character_varying cedula
        character_varying tipo_movimiento
        double_precision horas
        timestamp_without_time_zone fecha
        integer calculo_id FK
        integer liquidacion_id
        character_varying usuario_id
        character_varying observaciones
    }
    NOMINA_BOLSA_OT_OVERRIDE {
        integer id PK
        integer ot_id
        boolean bolsa_habilitada_override
        boolean bolsa_habilitada_erp
        character_varying motivo
        character_varying autorizado_por
        character_varying autorizado_por_id
        timestamp_without_time_zone vigente_desde
        timestamp_without_time_zone vigente_hasta
        character_varying estado
        character_varying documento_soporte_url
        timestamp_without_time_zone creado_en
    }
    NOMINA_CALCULO_DIARIO_DETALLE {
        integer id PK
        integer calculo_id FK
        character_varying cedula
        integer anio
        integer semana_iso
        date fecha
        integer dia_semana
        time_without_time_zone hora_entrada
        time_without_time_zone hora_salida
        integer minutos_almuerzo
        boolean cruza_medianoche
        double_precision horas_trabajadas
        double_precision horas_ordinarias
        double_precision horas_extras
        character_varying codigo_calculado
        double_precision horas_concepto
        double_precision factor_hora_ordinaria
        double_precision valor_bruto
        double_precision carga_prestacional
        double_precision costo_total
        boolean es_festivo
        character_varying nombre_festivo
        boolean es_domingo
        boolean es_jornada_nocturna
        character_varying novedad_codigo
        integer novedad_evento_id
        character_varying fuente_horario
        integer fuente_evidencia_id
        character_varying hash_snapshot
        character_varying creado_por
        integer ot_id
        character_varying ot_codigo
        character_varying observaciones
        timestamp_without_time_zone creado_en
    }
    NOMINA_CALCULO_SEMANAL {
        integer id PK
        character_varying cedula
        integer anio
        integer semana_iso
        date fecha_inicio
        date fecha_fin
        character_varying nivel_riesgo_arl
        double_precision factor_prestacional
        double_precision salario_base_mensual
        double_precision valor_hora_ordinaria
        double_precision total_horas_extras
        double_precision total_horas_recargo_nocturno
        double_precision total_valor_bruto
        double_precision total_carga_prestacional
        double_precision total_costo_empresa
        character_varying estado
        integer ot_id
        character_varying ot_codigo
        character_varying calculado_por
        timestamp_without_time_zone calculado_en
        character_varying confirmado_por
        timestamp_without_time_zone confirmado_en
        character_varying observaciones
    }
    NOMINA_CALCULO_SEMANAL_DETALLE {
        integer id PK
        integer calculo_id FK
        character_varying codigo_novedad
        double_precision horas
        double_precision factor_hora_ordinaria
        double_precision valor_bruto
        double_precision carga_prestacional
        double_precision costo_total
        integer ot_id
        character_varying ot_codigo
        character_varying fuente
    }
    NOMINA_CALCULO_WORKFLOW_EVENTO {
        integer id PK
        integer calculo_id FK
        character_varying estado_origen
        character_varying estado_destino
        character_varying justificacion
        character_varying usuario_id
        timestamp_without_time_zone created_at
    }
    NOMINA_CATALOGO_NOVEDADES {
        integer id PK
        character_varying codigo
        character_varying descripcion_corta
        character_varying descripcion_larga
        character_varying categoria
        character_varying subcategoria
        double_precision factor_hora_ordinaria
        boolean acredita_bolsa
        boolean descuenta_bolsa
        boolean requiere_autorizacion
        character_varying unidad
        character_varying estado
        date vigente_desde
        date vigente_hasta
        character_varying observaciones
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
    }
    NOMINA_CONCEPTOS {
        integer id PK
        character_varying empresa
        character_varying concepto
        character_varying categoria
        character_varying subcategoria
        integer prioridad
        boolean es_regex
        character_varying keywords
        timestamp_without_time_zone creado_en
    }
    NOMINA_COSTO_OT {
        integer id PK
        integer ot_id
        character_varying ot_codigo
        integer anio
        integer semana_iso
        date fecha_inicio
        date fecha_fin
        integer total_empleados
        double_precision total_horas
        double_precision total_horas_hed
        double_precision total_horas_hen
        double_precision total_horas_hefd
        double_precision total_horas_hefn
        double_precision total_horas_hf
        double_precision total_valor_bruto
        double_precision total_carga_prestacional
        double_precision total_costo_empresa
        character_varying categoria_sub_indice
        character_varying cc
        character_varying scc
        character_varying sub_indice
        timestamp_without_time_zone ultima_actualizacion
        json calculo_ids
    }
    NOMINA_EXCEPCIONES {
        integer id PK
        character_varying cedula
        character_varying nombre_asociado
        character_varying subcategoria
        character_varying tipo
        character_varying estado
        double_precision valor_configurado
        double_precision saldo_actual
        character_varying pagador_cedula
        timestamp_without_time_zone fecha_inicio
        timestamp_without_time_zone fecha_fin
        character_varying observacion
        character_varying creado_por
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
    }
    NOMINA_EXCEPCIONES_HISTORIAL {
        integer id PK
        integer excepcion_id FK
        integer mes
        integer anio
        double_precision valor_aplicado
        character_varying mensaje
        timestamp_without_time_zone creado_en
    }
    NOMINA_FACTOR_PRESTACIONAL_RIESGO {
        integer id PK
        character_varying nivel_riesgo
        character_varying nivel_macro
        character_varying arl_nombre
        double_precision factor_prestacional
        double_precision porcentaje_salud
        double_precision porcentaje_pension
        double_precision porcentaje_arl
        double_precision porcentaje_caja
        double_precision porcentaje_icbf
        double_precision porcentaje_sena
        double_precision porcentaje_prima
        double_precision porcentaje_cesantia
        double_precision porcentaje_interes_cesantia
        double_precision porcentaje_vacaciones
        date vigente_desde
        date vigente_hasta
        character_varying observaciones
        timestamp_without_time_zone creado_en
    }
    NOMINA_FAVORITOS {
        integer id PK
        character_varying usuario_id FK
        character_varying cedula
        character_varying subcategoria
        timestamp_without_time_zone creado_en
    }
    NOMINA_FESTIVO_CALENDARIO {
        integer anio PK
        date fecha PK
        character_varying nombre
        character_varying fuente
        timestamp_without_time_zone created_at
    }
    NOMINA_HORARIO_PACTADO {
        integer id PK
        character_varying cedula
        integer minutos_jornada_ordinaria
        double_precision horas_semana_ordinaria
        boolean es_jornada_nocturna
        boolean autoriza_he_default
        boolean autoriza_he_override
        character_varying override_motivo
        character_varying override_autorizado_por
        timestamp_without_time_zone override_fecha
        timestamp_without_time_zone sincronizado_en
        character_varying fuente_sincronizacion
        character_varying observaciones
    }
    NOMINA_HORARIO_PACTADO_DIA {
        character_varying cedula PK FK
        integer dia_semana PK
        time_without_time_zone hora_entrada
        time_without_time_zone hora_salida
        integer minutos_almuerzo
        boolean cruza_medianoche
    }
    NOMINA_NOVEDAD_EVENTO {
        integer id PK
        character_varying cedula
        character_varying codigo_novedad FK
        date fecha_inicio
        date fecha_fin
        character_varying observaciones
        character_varying estado
        timestamp_without_time_zone created_at
        character_varying created_by
        timestamp_without_time_zone updated_at
        character_varying updated_by
        timestamp_without_time_zone confirmado_at
        character_varying confirmado_by
        timestamp_without_time_zone anulado_at
        character_varying anulado_justificacion
    }
    NOMINA_OVERRIDE_AUTORIZA_HE {
        integer id PK
        character_varying cedula
        boolean autoriza_he_erp
        boolean autoriza_he_override
        character_varying motivo
        character_varying autorizado_por
        character_varying autorizado_por_id
        timestamp_without_time_zone vigente_desde
        timestamp_without_time_zone vigente_hasta
        character_varying estado
        character_varying documento_soporte_url
        timestamp_without_time_zone creado_en
    }
    NOMINA_PARAMETROS_LEGALES {
        integer id PK
        character_varying codigo
        character_varying nombre
        character_varying valor
        character_varying tipo_dato
        character_varying norma_soporte
        date vigente_desde
        date vigente_hasta
        character_varying estado
        character_varying observaciones
        timestamp_without_time_zone creado_en
    }
    NOMINA_PLANIFICADOR_DIA_OT {
        integer id PK
        integer anio
        integer semana_iso
        character_varying cedula
        integer dia_semana
        character_varying orden
        character_varying cc
        character_varying scc
        character_varying sub_indice
        character_varying categoria_sub_indice
        character_varying descripcion
        double_precision vr_contratado
        double_precision horas
        double_precision porcentaje
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
    }
    NOMINA_PLANTILLAS_HORARIO {
        uuid id PK
        character_varying nombre
        character_varying descripcion
        integer version
        boolean esta_activa
        character_varying creado_por_id FK
        character_varying actualizado_por_id FK
        timestamp_with_time_zone creado_en
        timestamp_with_time_zone actualizado_en
    }
    NOMINA_PLANTILLAS_HORARIO_DIAS {
        uuid plantilla_id PK FK
        smallint dia_semana PK
        time_without_time_zone hora_entrada
        time_without_time_zone hora_salida
        integer minutos_almuerzo
        boolean cruza_medianoche
    }
    NOMINA_PLANTILLAS_HORARIO_HISTORIAL {
        uuid id PK
        uuid plantilla_id FK
        character_varying accion
        integer version
        character_varying actor_usuario_id FK
        jsonb snapshot
        timestamp_with_time_zone creado_en
    }
    NOMINA_REGISTROS_CRUDOS {
        integer id PK
        integer archivo_id FK
        integer fila_origen
        json payload
        timestamp_without_time_zone creado_en
    }
    NOMINA_REGISTROS_NORMALIZADOS {
        integer id PK
        integer archivo_id FK
        timestamp_without_time_zone fecha_creacion
        integer mes_fact
        integer año_fact
        character_varying cedula
        character_varying nombre_asociado
        double_precision valor
        double_precision valor_rdc
        double_precision valor_colaborador
        character_varying empresa
        character_varying concepto
        character_varying categoria_final
        character_varying subcategoria_final
        character_varying estado_validacion
        double_precision horas
        double_precision dias
        character_varying ciudad
        integer fila_origen
        character_varying observaciones
    }
    NOTIFICACIONES_USUARIO {
        integer id PK
        character_varying usuario_id FK
        character_varying titulo
        character_varying mensaje
        boolean leido
        character_varying tipo_evento
        character_varying referencia_id
        timestamp_without_time_zone creado_en
    }
    OPERACIONES_IDEMPOTENTES {
        uuid solicitud_id PK
        character_varying_50 tipo_operacion PK
        character_varying actor_usuario_id FK
        character_varying recurso_objetivo
        character_varying payload_hash
        character_varying estado
        jsonb resultado
        timestamp_with_time_zone creado_en
        timestamp_with_time_zone finalizado_en
    }
    PERMISOS_ROL {
        integer id PK
        character_varying rol
        character_varying modulo
        boolean permitido
    }
    PLANTILLAS_ACTIVIDADES {
        integer id PK
        character_varying nombre_plantilla
        integer parent_id FK
        character_varying titulo
        character_varying descripcion
        numeric horas_estimadas
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
    }
    RECOMENDACIONES_IA {
        integer id PK
        character_varying desarrollo_id
        character_varying tipo_recomendacion
        character_varying titulo
        character_varying descripcion
        character_varying prioridad
        numeric puntaje_impacto
        numeric puntaje_esfuerzo
        numeric confianza_ia
        character_varying estado
        character_varying asignado_a
        date fecha_limite
        character_varying notas_implementacion
        timestamp_without_time_zone implementado_en
        character_varying retroalimentacion_resultados
        character_varying generado_por
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
    }
    REGISTRO_ACTIVIDADES {
        integer id PK
        character_varying desarrollo_id
        integer etapa_id
        character_varying tipo_actividad
        timestamp_without_time_zone fecha_inicio
        timestamp_without_time_zone fecha_fin
        timestamp_without_time_zone proximo_seguimiento_en
        character_varying estado
        character_varying tipo_actor
        character_varying datos_dinamicos
        character_varying creado_por
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
    }
    REGISTROS_ASISTENCIA {
        integer id PK
        character_varying usuario_id FK
        integer zona_id FK
        boolean match_exitoso
        double_precision nivel_confianza
        double_precision latitud_marcada
        double_precision longitud_marcada
        character_varying evidencia_url
        timestamp_without_time_zone creado_en
    }
    RELACIONES_GESTOR_EMPLEADO {
        uuid id PK
        character_varying gestor_usuario_id FK
        character_varying empleado_cedula
        boolean esta_activa
        character_varying creado_por_id FK
        character_varying actualizado_por_id FK
        timestamp_with_time_zone creado_en
        timestamp_with_time_zone actualizado_en
    }
    RELACIONES_USUARIOS {
        integer id PK
        character_varying usuario_id FK
        character_varying superior_id FK
        character_varying tipo_relacion
        boolean esta_activa
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
    }
    REQUERIMIENTOS_DESARROLLO {
        integer id PK
        character_varying external_id
        character_varying desarrollo_id FK
        character_varying titulo
        character_varying descripcion
        character_varying prioridad
        character_varying estado
        date fecha_limite
        integer responsable_id
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
    }
    RESERVATION_AUDIT {
        integer id PK
        uuid reservation_id FK
        character_varying action
        character_varying changed_by_name
        character_varying changed_by_document
        jsonb old_data
        jsonb new_data
        timestamp_without_time_zone created_at
    }
    RESERVATION_SERIES {
        uuid id PK
        uuid room_id FK
        time_without_time_zone start_time
        time_without_time_zone end_time
        character_varying title
        character_varying pattern_type
        integer pattern_interval
        date start_date
        date end_date
        character_varying created_by_name
        character_varying created_by_document
        timestamp_without_time_zone created_at
    }
    RESERVATIONS {
        uuid id PK
        uuid room_id FK
        uuid series_id FK
        timestamp_with_time_zone start_datetime
        timestamp_with_time_zone end_datetime
        character_varying title
        character_varying status
        character_varying created_by_name
        character_varying created_by_document
        character_varying updated_by_name
        character_varying updated_by_document
        character_varying cancelled_by_name
        character_varying cancelled_by_document
        timestamp_with_time_zone created_at
        timestamp_with_time_zone updated_at
    }
    ROLES_SISTEMA {
        character_varying id PK
        character_varying nombre
        character_varying descripcion
        boolean es_sistema
        timestamp_without_time_zone creado_en
    }
    ROOMS {
        uuid id PK
        character_varying name
        integer capacity
        ARRAY resources
        boolean is_active
        text notes
        timestamp_without_time_zone created_at
        timestamp_without_time_zone updated_at
    }
    SESIONES {
        integer id PK
        character_varying usuario_id
        character_varying_1000 token_sesion
        character_varying direccion_ip
        character_varying agente_usuario
        timestamp_without_time_zone expira_en
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone ultima_actividad_en
        character_varying nombre_usuario
        character_varying rol_usuario
        timestamp_without_time_zone fin_sesion
        character_varying tipo_sesion
        character_varying jti
        character_varying scope
    }
    SOLICITUDES_ACTIVO {
        integer id PK
        character_varying ticket_id FK
        character_varying item_solicitado
        text especificaciones
        integer cantidad
        timestamp_without_time_zone creado_en
    }
    SOLICITUDES_DESARROLLO {
        integer id PK
        character_varying ticket_id FK
        character_varying que_necesita
        character_varying porque
        character_varying paraque
        character_varying justificacion_ia
        timestamp_without_time_zone creado_en
    }
    SOLICITUDMATERIAL {
        integer codigo PK
        character_varying codigosolicitud
        date fecha
        time_without_time_zone hora
        character_varying ordentrabajo
        character_varying cliente
        character_varying uen
        date fechanecesidad
        character_varying estado
        integer usuario
        character_varying nombreusuario
        character_varying observaciones
        integer anexo
    }
    SOLID_COMPONENTES {
        integer id PK
        integer modulo_id FK
        character_varying nombre
        text descripcion
        character_varying version
        timestamp_without_time_zone creado_en
    }
    SOLID_MODULOS {
        integer id PK
        character_varying nombre
        text descripcion
        character_varying version_actual
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
    }
    SOLID_OPCIONES {
        integer id PK
        integer componente_id FK
        character_varying nombre
        character_varying valor
        text descripcion
    }
    TICKETS {
        character_varying id PK
        character_varying categoria_id FK
        character_varying asunto
        character_varying descripcion
        character_varying prioridad
        character_varying estado
        character_varying sub_estado
        character_varying creador_id
        character_varying nombre_creador
        character_varying correo_creador
        character_varying area_creador
        character_varying cargo_creador
        character_varying sede_creador
        character_varying asignado_a
        character_varying diagnostico
        character_varying resolucion
        character_varying causa_novedad
        character_varying notas
        numeric horas_tiempo_empleado
        character_varying desarrollo_id
        jsonb datos_extra
        jsonb areas_impactadas
        timestamp_without_time_zone fecha_entrega_ideal
        timestamp_without_time_zone fecha_creacion
        timestamp_without_time_zone fecha_cierre
        timestamp_without_time_zone resuelto_en
        timestamp_without_time_zone atendido_en
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
    }
    TIPOS_DESARROLLO {
        integer id PK
        character_varying valor
        character_varying etiqueta
        integer orden
        boolean esta_activo
        timestamp_without_time_zone creado_en
    }
    TOKENS {
        integer id PK
        character_varying usuario_id FK
        character_varying hash_token
        character_varying tipo_token
        character_varying nombre
        timestamp_without_time_zone expira_en
        timestamp_without_time_zone ultimo_uso_en
        timestamp_without_time_zone creado_en
    }
    TRANSITO_VIATICOS {
        integer id PK
        uuid reporte_id
        character_varying estado
        timestamp_without_time_zone fecha_registro
        character_varying empleado_cedula
        character_varying empleado_nombre
        character_varying area
        character_varying cargo
        character_varying ciudad
        character_varying categoria
        date fecha_gasto
        character_varying ot
        character_varying cc
        character_varying scc
        double_precision valor_con_factura
        double_precision valor_sin_factura
        character_varying observaciones_linea
        character_varying observaciones_gral
        character_varying usuario_id
        jsonb adjuntos
    }
    TRANSITOINVENTARIO {
        integer id PK
        character_varying sku
        character_varying documento
        double_precision cantidad
        timestamp_without_time_zone fecha_proceso
    }
    USUARIOS {
        character_varying id PK
        character_varying cedula
        character_varying correo
        character_varying hash_contrasena
        character_varying nombre
        character_varying rol
        boolean esta_activo
        character_varying url_avatar
        character_varying zona_horaria
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone actualizado_en
        timestamp_without_time_zone ultimo_login
        boolean correo_actualizado
        boolean correo_verificado
        character_varying area
        character_varying cargo
        character_varying sede
        character_varying centrocosto
        boolean viaticante
        double_precision baseviaticos
        character_varying especialidades
        character_varying areas_asignadas
    }
    VALIDACIONES_ASIGNACION {
        integer id PK
        character_varying desarrollo_id FK
        integer actividad_id FK
        character_varying solicitado_por_id
        character_varying validador_id
        character_varying asignado_a_id
        character_varying estado
        character_varying motivo
        character_varying observacion
        timestamp_without_time_zone creado_en
        timestamp_without_time_zone validado_en
    }
    ZONAS_TRABAJO {
        integer id PK
        character_varying nombre
        double_precision latitud
        double_precision longitud
        double_precision radio
    }
    PLANTILLAS_ACTIVIDADES o|--o{ PLANTILLAS_ACTIVIDADES : "id a parent_id"
    USUARIOS ||--o{ NOTIFICACIONES_USUARIO : "id a usuario_id"
    USUARIOS ||--o{ RELACIONES_USUARIOS : "id a usuario_id"
    USUARIOS ||--o{ RELACIONES_USUARIOS : "id a superior_id"
    USUARIOS ||--o{ TOKENS : "id a usuario_id"
    USUARIOS ||--o{ RELACIONES_GESTOR_EMPLEADO : "id a gestor_usuario_id"
    USUARIOS ||--o{ RELACIONES_GESTOR_EMPLEADO : "id a creado_por_id"
    USUARIOS ||--o{ RELACIONES_GESTOR_EMPLEADO : "id a actualizado_por_id"
    USUARIOS ||--o| EMBEDDINGS_FACIALES : "id a usuario_id"
    USUARIOS ||--o{ REGISTROS_ASISTENCIA : "id a usuario_id"
    ZONAS_TRABAJO o|--o{ REGISTROS_ASISTENCIA : "id a zona_id"
    FASES_DESARROLLO ||--o{ ETAPAS_DESARROLLO : "id a fase_id"
    SOLICITUDMATERIAL o|--o{ LINEASOLICITUDMATERIAL : "codigo a solicitudmaterial"
    EQUIPOS_MOVILES o|--o{ LINEAS_CORPORATIVAS : "id a equipo_id"
    EMPLEADOS_LINEAS o|--o{ LINEAS_CORPORATIVAS : "documento a documento_asignado"
    EMPLEADOS_LINEAS o|--o{ LINEAS_CORPORATIVAS : "documento a documento_cobro"
    NOMINA_ARCHIVOS ||--o{ NOMINA_REGISTROS_CRUDOS : "id a archivo_id"
    NOMINA_ARCHIVOS ||--o{ NOMINA_REGISTROS_NORMALIZADOS : "id a archivo_id"
    USUARIOS ||--o{ NOMINA_FAVORITOS : "id a usuario_id"
    NOMINA_EXCEPCIONES ||--o{ NOMINA_EXCEPCIONES_HISTORIAL : "id a excepcion_id"
    NOMINA_BOLSA_HORAS ||--o{ NOMINA_BOLSA_HORAS_MOVIMIENTOS : "id a bolsa_id"
    NOMINA_CALCULO_SEMANAL o|--o{ NOMINA_BOLSA_HORAS_MOVIMIENTOS : "id a calculo_id"
    NOMINA_CALCULO_SEMANAL ||--o{ NOMINA_CALCULO_SEMANAL_DETALLE : "id a calculo_id"
    NOMINA_CALCULO_SEMANAL ||--o{ NOMINA_CALCULO_WORKFLOW_EVENTO : "id a calculo_id"
    NOMINA_CALCULO_SEMANAL ||--o{ NOMINA_CALCULO_DIARIO_DETALLE : "id a calculo_id"
    NOMINA_HORARIO_PACTADO ||--o{ NOMINA_HORARIO_PACTADO_DIA : "cedula a cedula"
    NOMINA_CATALOGO_NOVEDADES ||--o{ NOMINA_NOVEDAD_EVENTO : "codigo a codigo_novedad"
    USUARIOS ||--o{ NOMINA_PLANTILLAS_HORARIO : "id a creado_por_id"
    USUARIOS ||--o{ NOMINA_PLANTILLAS_HORARIO : "id a actualizado_por_id"
    USUARIOS ||--o{ OPERACIONES_IDEMPOTENTES : "id a actor_usuario_id"
    ROOMS ||--o{ RESERVATION_SERIES : "id a room_id"
    SOLID_MODULOS ||--o{ SOLID_COMPONENTES : "id a modulo_id"
    CATEGORIAS_TICKET o|--o{ TICKETS : "id a categoria_id"
    RELACIONES_GESTOR_EMPLEADO o|--o{ HISTORIAL_RELACIONES_GESTOR_EMPLEADO : "id a relacion_id"
    USUARIOS ||--o{ HISTORIAL_RELACIONES_GESTOR_EMPLEADO : "id a actor_usuario_id"
    FASES_DESARROLLO o|--o{ DESARROLLOS : "id a fase_actual_id"
    ETAPAS_DESARROLLO o|--o{ DESARROLLOS : "id a etapa_actual_id"
    LINEAS_CORPORATIVAS ||--o{ FACTURAS_LINEAS : "id a linea_id"
    NOMINA_PLANTILLAS_HORARIO ||--o{ NOMINA_PLANTILLAS_HORARIO_DIAS : "id a plantilla_id"
    NOMINA_PLANTILLAS_HORARIO o|--o{ NOMINA_PLANTILLAS_HORARIO_HISTORIAL : "id a plantilla_id"
    USUARIOS ||--o{ NOMINA_PLANTILLAS_HORARIO_HISTORIAL : "id a actor_usuario_id"
    NOMINA_PLANTILLAS_HORARIO o|--o{ NOMINA_APLICACIONES_PLANTILLA_HORARIO : "id a plantilla_id"
    USUARIOS ||--o{ NOMINA_APLICACIONES_PLANTILLA_HORARIO : "id a actor_usuario_id"
    ROOMS ||--o{ RESERVATIONS : "id a room_id"
    RESERVATION_SERIES o|--o{ RESERVATIONS : "id a series_id"
    SOLID_COMPONENTES ||--o{ SOLID_OPCIONES : "id a componente_id"
    TICKETS ||--o{ SOLICITUDES_DESARROLLO : "id a ticket_id"
    TICKETS ||--o{ SOLICITUDES_ACTIVO : "id a ticket_id"
    TICKETS ||--o{ COMENTARIOS_TICKET : "id a ticket_id"
    TICKETS ||--o{ HISTORIAL_TICKET : "id a ticket_id"
    TICKETS ||--o{ ADJUNTOS_TICKET : "id a ticket_id"
    DESARROLLOS ||--o{ ACTIVIDADES : "id a desarrollo_id"
    ACTIVIDADES o|--o{ ACTIVIDADES : "id a parent_id"
    DESARROLLOS ||--o{ REQUERIMIENTOS_DESARROLLO : "id a desarrollo_id"
    NOMINA_APLICACIONES_PLANTILLA_HORARIO ||--o{ NOMINA_APLICACIONES_PLANTILLA_EMPLEADOS : "id a aplicacion_id"
    RESERVATIONS ||--o{ RESERVATION_AUDIT : "id a reservation_id"
    TICKETS ||--o{ CONTROL_CAMBIOS : "id a ticket_id"
    DESARROLLOS o|--o{ CONTROL_CAMBIOS : "id a desarrollo_id"
    SOLID_MODULOS o|--o{ CONTROL_CAMBIOS : "id a modulo_solid_id"
    SOLID_COMPONENTES o|--o{ CONTROL_CAMBIOS : "id a componente_solid_id"
    DESARROLLOS o|--o{ VALIDACIONES_ASIGNACION : "id a desarrollo_id"
    ACTIVIDADES o|--o{ VALIDACIONES_ASIGNACION : "id a actividad_id"
    USUARIOS ||--o{ BITACORAS_OPERACIONALES : "id a creado_por_id"
    USUARIOS o|--o{ BITACORAS_OPERACIONALES : "id a finalizado_por_id"
    BITACORAS_OPERACIONALES ||--o{ BITACORA_OPERACIONAL_ACTIVIDADES : "id a bitacora_id"
    BITACORAS_OPERACIONALES ||--o{ BITACORA_OPERACIONAL_FOTOGRAFIAS : "id a bitacora_id"
```

### 📋 Diccionario de Datos
#### Tabla: `actividades`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('actividades_id_seq'::regclass) |
| desarrollo_id | character varying | FK | NO | - |
| parent_id | integer | FK | YES | - |
| titulo | character varying | - | NO | - |
| descripcion | character varying | - | YES | - |
| estado | character varying | - | NO | - |
| responsable_id | character varying | - | YES | - |
| asignado_a_id | character varying | - | YES | - |
| delegado_por_id | character varying | - | YES | - |
| estado_validacion | character varying | - | NO | - |
| validacion_id | integer | - | YES | - |
| fecha_inicio_estimada | date | - | YES | - |
| fecha_fin_estimada | date | - | YES | - |
| fecha_inicio_real | date | - | YES | - |
| fecha_fin_real | date | - | YES | - |
| horas_estimadas | numeric | - | NO | - |
| horas_reales | numeric | - | NO | - |
| porcentaje_avance | numeric | - | NO | - |
| seguimiento | text | - | YES | - |
| compromiso | text | - | YES | - |
| compromiso_fecha | date | - | YES | - |
| compromiso_cumplido | boolean | - | NO | - |
| archivo_url | character varying | - | YES | - |
| anulada | boolean | - | NO | - |
| anulada_en | timestamp without time zone | - | YES | - |
| anulada_por_id | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |
| actualizado_en | timestamp without time zone | - | YES | - |

#### Tabla: `actividades_proximas`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('actividades_proximas_id_seq'::regclass) |
| desarrollo_id | character varying | - | NO | - |
| tipo_actividad | character varying | - | NO | - |
| titulo | character varying | - | NO | - |
| descripcion | character varying | - | YES | - |
| fecha_vencimiento | date | - | NO | - |
| parte_responsable | character varying | - | NO | - |
| persona_responsable | character varying | - | YES | - |
| estado | character varying | - | NO | - |
| prioridad | character varying | - | NO | - |
| alerta_enviada | boolean | - | NO | - |
| completado_en | timestamp without time zone | - | YES | - |
| creado_por | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |
| actualizado_en | timestamp without time zone | - | YES | - |

#### Tabla: `adjuntos_ticket`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('adjuntos_ticket_id_seq'::regclass) |
| ticket_id | character varying | FK | NO | - |
| nombre_archivo | character varying | - | NO | - |
| contenido_base64 | character varying | - | YES | - |
| ruta_archivo | character varying | - | YES | - |
| tamano_bytes | integer | - | YES | - |
| tipo_mime | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `asignacioninventario`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('asignacioninventario_id_seq'::regclass) |
| bodega | character varying | - | NO | - |
| bloque | character varying | - | NO | - |
| estante | character varying | - | NO | - |
| nivel | character varying | - | NO | - |
| cedula | character varying | - | NO | - |
| nombre | character varying | - | NO | - |
| cedula_companero | character varying | - | YES | - |
| nombre_companero | character varying | - | YES | - |
| numero_pareja | integer | - | YES | - |
| ronda_vista | integer | - | NO | - |
| cargo | character varying | - | NO | - |
| creado_en | timestamp without time zone | - | NO | now() |

#### Tabla: `auditoria_acciones_usuario`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('auditoria_acciones_usuario_id_seq'::regclass) |
| timestamp | timestamp without time zone | - | YES | now() |
| usuario_id | character varying | - | NO | - |
| usuario_nombre | character varying | - | YES | - |
| rol | character varying | - | YES | - |
| modulo | character varying | - | NO | - |
| accion | character varying | - | NO | - |
| entidad_tipo | character varying | - | YES | - |
| entidad_id | character varying | - | YES | - |
| metodo_http | character varying | - | YES | - |
| ruta | character varying | - | YES | - |
| codigo_respuesta | smallint | - | YES | - |
| resultado | character varying | - | NO | - |
| direccion_ip | character varying | - | YES | - |
| agente_usuario | text | - | YES | - |
| correlacion_id | character varying | - | YES | - |
| datos_anteriores | jsonb | - | YES | - |
| datos_nuevos | jsonb | - | YES | - |
| metadatos | jsonb | - | YES | - |

#### Tabla: `auditoria_eventos`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('auditoria_eventos_id_seq'::regclass) |
| timestamp | timestamp with time zone | - | NO | now() |
| usuario_id | character varying(50) | - | NO | - |
| rol | character varying(50) | - | NO | - |
| direccion_ip | character varying(45) | - | YES | - |
| agente_usuario | text | - | YES | - |
| resultado | character varying(30) | - | NO | - |
| motivo | text | - | YES | - |
| endpoint | character varying(100) | - | NO | '/api/v2/config/verify-admin'::character varying |

#### Tabla: `bitacora_operacional_actividades`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | bigint | PK | NO | nextval('bitacora_operacional_actividades_id_seq'::regclass) |
| bitacora_id | uuid | FK | NO | - |
| orden | smallint | - | NO | - |
| descripcion | text | - | NO | - |

#### Tabla: `bitacora_operacional_fotografias`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | uuid | PK | NO | gen_random_uuid() |
| bitacora_id | uuid | FK | NO | - |
| orden | smallint | - | NO | - |
| ruta_relativa | character varying(500) | - | NO | - |
| nombre_original | character varying(255) | - | NO | - |
| tipo_mime | character varying(100) | - | NO | - |
| tamano_bytes | integer | - | NO | - |
| ancho | integer | - | NO | - |
| alto | integer | - | NO | - |
| hash_sha256 | character varying(64) | - | NO | - |
| creado_en | timestamp with time zone | - | NO | now() |

#### Tabla: `bitacoras_operacionales`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | uuid | PK | NO | gen_random_uuid() |
| fecha_elaboracion | date | - | NO | - |
| orden_trabajo | character varying(50) | - | NO | - |
| nombre_obra | character varying(255) | - | NO | - |
| ciudad | character varying(120) | - | NO | - |
| ingeniero_responsable | character varying(255) | - | NO | - |
| estado | character varying(20) | - | NO | 'BORRADOR'::character varying |
| version | integer | - | NO | 1 |
| novedades_dia | text | - | YES | - |
| sin_novedad | boolean | - | NO | false |
| creado_por_id | character varying(50) | FK | NO | - |
| finalizado_por_id | character varying(50) | FK | YES | - |
| firma_ruta | character varying(500) | - | YES | - |
| firma_hash | character varying(64) | - | YES | - |
| pdf_ruta | character varying(500) | - | YES | - |
| pdf_hash | character varying(64) | - | YES | - |
| nombre_firmante | character varying(255) | - | YES | - |
| version_constancia | character varying(50) | - | YES | - |
| codigo_formato | character varying(30) | - | NO | - |
| fecha_formato | date | - | NO | - |
| version_formato | character varying(20) | - | NO | - |
| creado_en | timestamp with time zone | - | NO | now() |
| actualizado_en | timestamp with time zone | - | NO | now() |
| finalizado_en | timestamp with time zone | - | YES | - |

#### Tabla: `cache_contexto_ia`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('cache_contexto_ia_id_seq'::regclass) |
| clave_contexto | character varying | - | NO | - |
| desarrollo_id | character varying | - | YES | - |
| tipo_contexto | character varying | - | NO | - |
| datos_contexto | jsonb | - | YES | - |
| expira_en | timestamp without time zone | - | NO | - |
| conteo_accesos | integer | - | NO | - |
| ultimo_acceso_en | timestamp without time zone | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `categorias_ticket`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | character varying | PK | NO | - |
| nombre | character varying | - | NO | - |
| descripcion | character varying | - | YES | - |
| icono | character varying | - | YES | - |
| tipo_formulario | character varying | - | NO | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `comentarios_ticket`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('comentarios_ticket_id_seq'::regclass) |
| ticket_id | character varying | FK | NO | - |
| comentario | character varying | - | NO | - |
| es_interno | boolean | - | NO | - |
| usuario_id | character varying | - | YES | - |
| nombre_usuario | character varying | - | YES | - |
| leido | boolean | - | NO | - |
| leido_en | timestamp without time zone | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `configuracion_seguridad_runtime`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| clave | character varying(50) | PK | NO | - |
| valor_hash | character(64) | - | NO | - |

#### Tabla: `configuracioninventario`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('configuracioninventario_id_seq'::regclass) |
| ronda_activa | integer | - | NO | - |
| conteo_nombre | character varying | - | YES | - |
| ultima_actualizacion | timestamp without time zone | - | NO | now() |

#### Tabla: `conteohistorico`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('conteohistorico_id_seq'::regclass) |
| original_id | integer | - | YES | - |
| b_siigo | integer | - | YES | - |
| bodega | character varying | - | NO | - |
| bloque | character varying | - | NO | - |
| estante | character varying | - | NO | - |
| nivel | character varying | - | NO | - |
| codigo | character varying | - | NO | - |
| descripcion | character varying | - | NO | - |
| unidad | character varying | - | NO | - |
| cantidad_sistema | double precision | - | NO | - |
| cant_c1 | double precision | - | NO | - |
| cant_c2 | double precision | - | NO | - |
| cant_c3 | double precision | - | NO | - |
| cant_c4 | double precision | - | NO | - |
| conteo | character varying | - | NO | - |
| estado | character varying | - | NO | - |
| invporlegalizar | double precision | - | NO | - |
| cantidad_final | double precision | - | NO | - |
| diferencia_total | double precision | - | NO | - |
| snapshot_at | timestamp without time zone | - | NO | now() |

#### Tabla: `conteoinventario`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('conteoinventario_id_seq'::regclass) |
| b_siigo | integer | - | YES | - |
| bodega | character varying | - | NO | - |
| bloque | character varying | - | NO | - |
| estante | character varying | - | NO | - |
| nivel | character varying | - | NO | - |
| codigo | character varying | - | YES | - |
| descripcion | character varying | - | NO | - |
| unidad | character varying | - | NO | - |
| cantidad_sistema | double precision | - | NO | - |
| cant_c1 | double precision | - | NO | - |
| obs_c1 | character varying | - | YES | - |
| user_c1 | character varying | - | YES | - |
| cant_c2 | double precision | - | NO | - |
| obs_c2 | character varying | - | YES | - |
| user_c2 | character varying | - | YES | - |
| cant_c3 | double precision | - | NO | - |
| obs_c3 | character varying | - | YES | - |
| user_c3 | character varying | - | YES | - |
| cant_c4 | double precision | - | NO | - |
| obs_c4 | character varying | - | YES | - |
| user_c4 | character varying | - | YES | - |
| conteo | character varying | - | YES | - |
| estado | character varying | - | NO | - |
| diferencia | double precision | - | NO | - |
| invporlegalizar | double precision | - | NO | - |
| cantidad_final | double precision | - | NO | - |
| diferencia_total | double precision | - | NO | - |
| fecha_creacion | timestamp without time zone | - | NO | now() |

#### Tabla: `control_cambios`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('control_cambios_id_seq'::regclass) |
| ticket_id | character varying | FK | NO | - |
| desarrollo_id | character varying | FK | YES | - |
| modulo_solid_id | integer | FK | YES | - |
| componente_solid_id | integer | FK | YES | - |
| tipo_objeto | character varying | - | YES | - |
| accion_requerida | character varying | - | NO | - |
| impacto_operativo | character varying | - | NO | - |
| justificacion | text | - | YES | - |
| descripcion_cambio | text | - | YES | - |

#### Tabla: `control_descuentos_activos`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('control_descuentos_activos_id_seq'::regclass) |
| cedula | character varying | - | NO | - |
| nombre | character varying | - | NO | - |
| empresa | character varying | - | NO | - |
| cargo | character varying | - | YES | - |
| area | character varying | - | YES | - |
| concepto | character varying | - | NO | - |
| valor_descuento | double precision | - | NO | - |
| n_cuotas | integer | - | NO | - |
| valor_cuota | double precision | - | NO | - |
| concepto_nomina | character varying | - | NO | - |
| fecha_inicio | date | - | NO | - |
| fecha_finalizacion | date | - | NO | - |
| observaciones | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | NO | - |

#### Tabla: `control_descuentos_conceptos`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('control_descuentos_conceptos_id_seq'::regclass) |
| nombre | character varying | - | NO | - |
| concepto_nomina | character varying | - | NO | - |
| activo | boolean | - | NO | - |

#### Tabla: `desarrollos`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | character varying | PK | NO | - |
| nombre | character varying | - | NO | - |
| descripcion | character varying | - | YES | - |
| modulo | character varying | - | YES | - |
| tipo | character varying | - | YES | - |
| ambiente | character varying | - | YES | - |
| enlace_portal | character varying | - | YES | - |
| proveedor | character varying | - | YES | - |
| autoridad | character varying | - | YES | - |
| responsable | character varying | - | YES | - |
| area_desarrollo | character varying | - | YES | - |
| analista | character varying | - | YES | - |
| supervisor | character varying | - | YES | - |
| area_ejecutor | character varying | - | YES | - |
| creado_por_id | character varying | - | YES | - |
| responsable_id | character varying | - | YES | - |
| estado_general | character varying | - | NO | - |
| estado_validacion | character varying | - | NO | - |
| prioridad | character varying | - | YES | - |
| validado_por_id | character varying | - | YES | - |
| fase_actual_id | integer | FK | YES | - |
| etapa_actual_id | integer | FK | YES | - |
| porcentaje_progreso | numeric | - | NO | - |
| fecha_inicio | date | - | YES | - |
| fecha_estimada_fin | date | - | YES | - |
| fecha_real_fin | date | - | YES | - |
| validado_en | timestamp without time zone | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |
| actualizado_en | timestamp without time zone | - | YES | - |

#### Tabla: `embeddings_faciales`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('embeddings_faciales_id_seq'::regclass) |
| usuario_id | character varying | FK | NO | - |
| embedding | jsonb | - | YES | - |
| activo | boolean | - | NO | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `empleados_lineas`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| documento | character varying | PK | NO | - |
| nombre | character varying | - | NO | - |
| tipo | character varying | - | NO | - |
| cargo | character varying | - | YES | - |
| area | character varying | - | YES | - |
| centro_costo | character varying | - | YES | - |

#### Tabla: `equipos_moviles`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('equipos_moviles_id_seq'::regclass) |
| marca | character varying | - | YES | - |
| modelo | character varying | - | NO | - |
| imei | character varying | - | YES | - |
| serial | character varying | - | YES | - |
| estado_fisico | character varying | - | NO | - |
| observaciones | text | - | YES | - |

#### Tabla: `etapas_desarrollo`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('etapas_desarrollo_id_seq'::regclass) |
| fase_id | integer | FK | NO | - |
| nombre | character varying | - | NO | - |
| codigo | character varying | - | NO | - |
| orden | integer | - | NO | - |
| descripcion | character varying | - | YES | - |
| duracion_estimada_dias | integer | - | YES | - |
| porcentaje_inicio | numeric | - | NO | - |
| porcentaje_fin | numeric | - | NO | - |
| esta_activa | boolean | - | NO | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `facturas_lineas`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('facturas_lineas_id_seq'::regclass) |
| linea_id | integer | FK | NO | - |
| periodo | character varying | - | NO | - |
| documento_asignado | character varying | - | NO | - |
| centro_costo | character varying | - | NO | - |
| cargo_mes | numeric | - | YES | - |
| descuento_mes | numeric | - | YES | - |
| impoconsumo | numeric | - | YES | - |
| descuento_iva | numeric | - | YES | - |
| iva_19 | numeric | - | YES | - |
| total | numeric | - | YES | - |
| pago_empleado | numeric | - | YES | - |
| pago_refridcol | numeric | - | YES | - |
| created_at | timestamp without time zone | - | NO | - |

#### Tabla: `facturas_lineas_detalle`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('facturas_lineas_detalle_id_seq'::regclass) |
| periodo | character varying | - | NO | - |
| min | character varying | - | NO | - |
| nombre | character varying | - | NO | - |
| descripcion | character varying | - | NO | - |
| valor | numeric | - | YES | - |
| iva | numeric | - | YES | - |
| criterio | character varying | - | NO | - |
| created_at | timestamp without time zone | - | NO | - |

#### Tabla: `fases_desarrollo`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('fases_desarrollo_id_seq'::regclass) |
| nombre | character varying | - | NO | - |
| codigo | character varying | - | NO | - |
| orden | integer | - | NO | - |
| descripcion | character varying | - | YES | - |
| color | character varying | - | NO | - |
| esta_activa | boolean | - | NO | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `formato_2276`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('formato_2276_id_seq'::regclass) |
| ano_gravable | integer | - | NO | - |
| fecha_carga | timestamp without time zone | - | NO | now() |
| cargado_por | character varying | - | NO | - |
| entidad_informante | character varying | - | YES | - |
| tdocb | character varying | - | NO | - |
| nitb | character varying | - | NO | - |
| pap | character varying | - | NO | - |
| sap | character varying | - | YES | - |
| pno | character varying | - | NO | - |
| ono | character varying | - | YES | - |
| dir | character varying | - | YES | - |
| dpto | character varying | - | YES | - |
| mun | character varying | - | YES | - |
| pais | character varying | - | YES | - |
| pasa | double precision | - | NO | - |
| paec | double precision | - | NO | - |
| pabop | double precision | - | NO | - |
| vaex | double precision | - | NO | - |
| paho | double precision | - | NO | - |
| pase | double precision | - | NO | - |
| paco | double precision | - | NO | - |
| papre | double precision | - | NO | - |
| pavia | double precision | - | NO | - |
| paga | double precision | - | NO | - |
| patra | double precision | - | NO | - |
| vapo | double precision | - | NO | - |
| potro | double precision | - | NO | - |
| cein | double precision | - | NO | - |
| ceco | double precision | - | NO | - |
| auce | double precision | - | NO | - |
| peju | double precision | - | NO | - |
| tingbtp | double precision | - | NO | - |
| apos | double precision | - | NO | - |
| apof | double precision | - | NO | - |
| aprais | double precision | - | NO | - |
| apov | double precision | - | NO | - |
| apafc | double precision | - | NO | - |
| apavc | double precision | - | NO | - |
| vare | double precision | - | NO | - |
| ivav | double precision | - | NO | - |
| rfiva | double precision | - | NO | - |
| pagahuvt | double precision | - | NO | - |
| vilap | double precision | - | NO | - |
| tdocde | character varying | - | YES | - |
| nitde | character varying | - | YES | - |
| identfc | character varying | - | YES | - |
| tdocpcc | character varying | - | YES | - |
| nitpcc | character varying | - | YES | - |

#### Tabla: `funcionalidades`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('funcionalidades_id_seq'::regclass) |
| desarrollo_id | character varying | - | NO | - |
| nombre_funcionalidad | character varying | - | NO | - |
| codigo_funcionalidad | character varying | - | YES | - |
| descripcion | character varying | - | YES | - |
| estado | character varying | - | NO | - |
| fecha_entrega | date | - | YES | - |
| cantidad_defectos | integer | - | NO | - |
| nivel_complejidad | character varying | - | NO | - |
| horas_estimadas | numeric | - | YES | - |
| horas_reales | numeric | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |
| actualizado_en | timestamp without time zone | - | YES | - |

#### Tabla: `historial_analisis_ia`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('historial_analisis_ia_id_seq'::regclass) |
| desarrollo_id | character varying | - | YES | - |
| tipo_analisis | character varying | - | NO | - |
| texto_consulta | character varying | - | NO | - |
| contexto_usado | jsonb | - | YES | - |
| respuesta_ia | character varying | - | NO | - |
| modelo_ia | character varying | - | NO | - |
| tokens_usados | integer | - | YES | - |
| tiempo_respuesta_ms | integer | - | YES | - |
| usuario_id | character varying | - | YES | - |
| puntaje_confianza | numeric | - | YES | - |
| fue_util | boolean | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `historial_entregas`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('historial_entregas_id_seq'::regclass) |
| desarrollo_id | character varying | - | NO | - |
| version_entrega | character varying | - | YES | - |
| tipo_entrega | character varying | - | YES | - |
| fecha_entrega | date | - | YES | - |
| estado_entrega | character varying | - | YES | - |
| motivo_devolucion | character varying | - | YES | - |
| cantidad_devoluciones | integer | - | NO | - |
| fecha_aprobacion | date | - | YES | - |
| aprobado_por | character varying | - | YES | - |
| puntaje_calidad | numeric | - | YES | - |
| defectos_reportados | integer | - | NO | - |
| defectos_resueltos | integer | - | NO | - |
| notas_entrega | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `historial_relaciones_gestor_empleado`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | uuid | PK | NO | - |
| relacion_id | uuid | FK | YES | - |
| actor_usuario_id | character varying | FK | NO | - |
| accion | character varying | - | NO | - |
| estado_anterior | boolean | - | NO | - |
| estado_nuevo | boolean | - | NO | - |
| creado_en | timestamp with time zone | - | NO | now() |

#### Tabla: `historial_relaciones_usuarios`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('historial_relaciones_usuarios_id_seq'::regclass) |
| usuario_id | character varying | - | NO | - |
| superior_anterior_id | character varying | - | YES | - |
| superior_nuevo_id | character varying | - | YES | - |
| accion | character varying | - | NO | - |
| realizado_por_id | character varying | - | YES | - |
| observacion | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `historial_ticket`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('historial_ticket_id_seq'::regclass) |
| ticket_id | character varying | FK | NO | - |
| usuario_id | character varying | - | YES | - |
| nombre_usuario | character varying | - | YES | - |
| accion | character varying | - | NO | - |
| detalle | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `lineas_corporativas`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('lineas_corporativas_id_seq'::regclass) |
| fecha_actualizacion | date | - | YES | - |
| linea | character varying | - | NO | - |
| empresa | character varying | - | NO | - |
| estatus | character varying | - | NO | - |
| estado_asignacion | character varying | - | NO | - |
| equipo_id | integer | FK | YES | - |
| documento_asignado | character varying | FK | YES | - |
| documento_cobro | character varying | FK | YES | - |
| nombre_plan | character varying | - | YES | - |
| convenio | character varying | - | YES | - |
| aprobado_por | character varying | - | YES | - |
| observaciones | text | - | YES | - |
| cobro_fijo_coef | double precision | - | NO | - |
| cobro_especiales_coef | double precision | - | NO | - |
| cfm_con_iva | numeric | - | YES | - |
| cfm_sin_iva | numeric | - | YES | - |
| descuento_39 | numeric | - | YES | - |
| vr_factura | numeric | - | YES | - |
| pago_empleado | numeric | - | YES | - |
| pago_empresa | numeric | - | YES | - |
| primera_quincena | numeric | - | YES | - |
| segunda_quincena | numeric | - | YES | - |
| created_at | timestamp without time zone | - | YES | - |
| updated_at | timestamp without time zone | - | YES | - |

#### Tabla: `lineasolicitudmaterial`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| codigo | integer | PK | NO | nextval('lineasolicitudmaterial_codigo_seq'::regclass) |
| solicitudmaterial | integer | FK | YES | - |
| fecha | date | - | NO | - |
| especialidad | character varying | - | YES | - |
| subindice | character varying | - | YES | - |
| centrocosto | character varying | - | YES | - |
| subcentrocosto | character varying | - | YES | - |
| tipodestino | character varying | - | YES | - |
| tipoproducto | character varying | - | YES | - |
| materialde | character varying | - | YES | - |
| referenciaproducto | character varying | - | YES | - |
| descripcionproducto | character varying | - | YES | - |
| cantidad | double precision | - | NO | - |
| unidadmedida | character varying | - | YES | - |
| tipo | character varying | - | YES | - |
| clasificacion | character varying | - | YES | - |
| rotacion | character varying | - | YES | - |
| proveedorfrecuente | character varying | - | YES | - |
| observaciones | character varying | - | YES | - |

#### Tabla: `metricas_kpi`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('metricas_kpi_id_seq'::regclass) |
| desarrollo_id | character varying | - | NO | - |
| tipo_metrica | character varying | - | NO | - |
| proveedor | character varying | - | YES | - |
| periodo_inicio | date | - | YES | - |
| periodo_fin | date | - | YES | - |
| valor | numeric | - | YES | - |
| valor_objetivo | numeric | - | YES | - |
| calculado_por | character varying | - | YES | - |
| calculado_en | timestamp without time zone | - | YES | now() |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `metricas_sistema`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('metricas_sistema_id_seq'::regclass) |
| timestamp | timestamp without time zone | - | NO | - |
| usuarios_online | integer | - | NO | - |
| usuarios_activos_24h | integer | - | NO | - |
| cpu_uso_porcentaje | double precision | - | NO | - |
| ram_uso_mb | double precision | - | NO | - |
| ram_total_mb | double precision | - | NO | - |
| tickets_pendientes | integer | - | NO | - |
| latencia_db_ms | double precision | - | NO | - |
| estado_servidor | character varying | - | NO | - |

#### Tabla: `modulos_sistema`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | character varying | PK | NO | - |
| nombre | character varying | - | NO | - |
| categoria | character varying | - | NO | - |
| descripcion | character varying | - | YES | - |
| esta_activo | boolean | - | NO | - |
| es_critico | boolean | - | NO | - |
| actualizado_en | timestamp without time zone | - | YES | - |

#### Tabla: `nomina_aplicaciones_plantilla_empleados`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| aplicacion_id | uuid | PK FK | NO | - |
| empleado_cedula | character varying(50) | PK | NO | - |
| snapshot_anterior | jsonb | - | NO | - |
| snapshot_aplicado | jsonb | - | NO | - |
| estado | character varying | - | NO | - |
| creado_en | timestamp with time zone | - | NO | now() |

#### Tabla: `nomina_aplicaciones_plantilla_horario`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | uuid | PK | NO | - |
| solicitud_id | uuid | - | NO | - |
| plantilla_id | uuid | FK | YES | - |
| plantilla_version | integer | - | NO | - |
| plantilla_nombre | character varying | - | NO | - |
| actor_usuario_id | character varying | FK | NO | - |
| cantidad_empleados | integer | - | NO | - |
| estado | character varying | - | NO | - |
| creado_en | timestamp with time zone | - | NO | now() |

#### Tabla: `nomina_archivos`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_archivos_id_seq'::regclass) |
| nombre_archivo | character varying | - | NO | - |
| hash_archivo | character varying | - | NO | - |
| tamaño_bytes | integer | - | NO | - |
| tipo_archivo | character varying | - | NO | - |
| ruta_almacenamiento | character varying | - | NO | - |
| mes_fact | integer | - | NO | - |
| año_fact | integer | - | NO | - |
| categoria | character varying | - | NO | - |
| subcategoria | character varying | - | NO | - |
| estado | character varying | - | NO | - |
| error_log | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | - |
| actualizado_en | timestamp without time zone | - | YES | - |

#### Tabla: `nomina_bolsa_horas`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_bolsa_horas_id_seq'::regclass) |
| cedula | character varying | - | NO | - |
| horas_acreditadas | double precision | - | NO | - |
| horas_consumidas | double precision | - | NO | - |
| horas_pagadas | double precision | - | NO | - |
| fecha_ultimo_movimiento | timestamp without time zone | - | YES | - |
| observaciones | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |
| actualizado_en | timestamp without time zone | - | YES | - |

#### Tabla: `nomina_bolsa_horas_movimientos`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_bolsa_horas_movimientos_id_seq'::regclass) |
| bolsa_id | integer | FK | NO | - |
| cedula | character varying | - | NO | - |
| tipo_movimiento | character varying | - | NO | - |
| horas | double precision | - | NO | - |
| fecha | timestamp without time zone | - | NO | - |
| calculo_id | integer | FK | YES | - |
| liquidacion_id | integer | - | YES | - |
| usuario_id | character varying | - | YES | - |
| observaciones | character varying | - | YES | - |

#### Tabla: `nomina_bolsa_ot_override`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_bolsa_ot_override_id_seq'::regclass) |
| ot_id | integer | - | NO | - |
| bolsa_habilitada_override | boolean | - | NO | - |
| bolsa_habilitada_erp | boolean | - | NO | - |
| motivo | character varying | - | NO | - |
| autorizado_por | character varying | - | NO | - |
| autorizado_por_id | character varying | - | YES | - |
| vigente_desde | timestamp without time zone | - | NO | - |
| vigente_hasta | timestamp without time zone | - | YES | - |
| estado | character varying | - | NO | - |
| documento_soporte_url | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |

#### Tabla: `nomina_calculo_diario_detalle`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_calculo_diario_detalle_id_seq'::regclass) |
| calculo_id | integer | FK | NO | - |
| cedula | character varying | - | NO | - |
| anio | integer | - | NO | - |
| semana_iso | integer | - | NO | - |
| fecha | date | - | NO | - |
| dia_semana | integer | - | NO | - |
| hora_entrada | time without time zone | - | YES | - |
| hora_salida | time without time zone | - | YES | - |
| minutos_almuerzo | integer | - | NO | - |
| cruza_medianoche | boolean | - | NO | - |
| horas_trabajadas | double precision | - | NO | - |
| horas_ordinarias | double precision | - | NO | - |
| horas_extras | double precision | - | NO | - |
| codigo_calculado | character varying | - | YES | - |
| horas_concepto | double precision | - | YES | - |
| factor_hora_ordinaria | double precision | - | YES | - |
| valor_bruto | double precision | - | NO | - |
| carga_prestacional | double precision | - | NO | - |
| costo_total | double precision | - | NO | - |
| es_festivo | boolean | - | NO | - |
| nombre_festivo | character varying | - | YES | - |
| es_domingo | boolean | - | NO | - |
| es_jornada_nocturna | boolean | - | NO | - |
| novedad_codigo | character varying | - | YES | - |
| novedad_evento_id | integer | - | YES | - |
| fuente_horario | character varying | - | NO | - |
| fuente_evidencia_id | integer | - | YES | - |
| hash_snapshot | character varying | - | YES | - |
| creado_por | character varying | - | YES | - |
| ot_id | integer | - | YES | - |
| ot_codigo | character varying | - | YES | - |
| observaciones | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | NO | - |

#### Tabla: `nomina_calculo_semanal`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_calculo_semanal_id_seq'::regclass) |
| cedula | character varying | - | NO | - |
| anio | integer | - | NO | - |
| semana_iso | integer | - | NO | - |
| fecha_inicio | date | - | NO | - |
| fecha_fin | date | - | NO | - |
| nivel_riesgo_arl | character varying | - | NO | - |
| factor_prestacional | double precision | - | NO | - |
| salario_base_mensual | double precision | - | NO | - |
| valor_hora_ordinaria | double precision | - | NO | - |
| total_horas_extras | double precision | - | NO | - |
| total_horas_recargo_nocturno | double precision | - | NO | - |
| total_valor_bruto | double precision | - | NO | - |
| total_carga_prestacional | double precision | - | NO | - |
| total_costo_empresa | double precision | - | NO | - |
| estado | character varying | - | NO | - |
| ot_id | integer | - | YES | - |
| ot_codigo | character varying | - | YES | - |
| calculado_por | character varying | - | YES | - |
| calculado_en | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |
| confirmado_por | character varying | - | YES | - |
| confirmado_en | timestamp without time zone | - | YES | - |
| observaciones | character varying | - | YES | - |

#### Tabla: `nomina_calculo_semanal_detalle`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_calculo_semanal_detalle_id_seq'::regclass) |
| calculo_id | integer | FK | NO | - |
| codigo_novedad | character varying | - | NO | - |
| horas | double precision | - | NO | - |
| factor_hora_ordinaria | double precision | - | NO | - |
| valor_bruto | double precision | - | NO | - |
| carga_prestacional | double precision | - | NO | - |
| costo_total | double precision | - | NO | - |
| ot_id | integer | - | YES | - |
| ot_codigo | character varying | - | YES | - |
| fuente | character varying | - | NO | - |

#### Tabla: `nomina_calculo_workflow_evento`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_calculo_workflow_evento_id_seq'::regclass) |
| calculo_id | integer | FK | NO | - |
| estado_origen | character varying | - | NO | - |
| estado_destino | character varying | - | NO | - |
| justificacion | character varying | - | YES | - |
| usuario_id | character varying | - | YES | - |
| created_at | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |

#### Tabla: `nomina_catalogo_novedades`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_catalogo_novedades_id_seq'::regclass) |
| codigo | character varying | - | NO | - |
| descripcion_corta | character varying | - | NO | - |
| descripcion_larga | character varying | - | YES | - |
| categoria | character varying | - | NO | - |
| subcategoria | character varying | - | NO | - |
| factor_hora_ordinaria | double precision | - | NO | - |
| acredita_bolsa | boolean | - | NO | - |
| descuenta_bolsa | boolean | - | NO | - |
| requiere_autorizacion | boolean | - | NO | - |
| unidad | character varying | - | NO | - |
| estado | character varying | - | NO | - |
| vigente_desde | date | - | NO | - |
| vigente_hasta | date | - | YES | - |
| observaciones | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |
| actualizado_en | timestamp without time zone | - | YES | - |

#### Tabla: `nomina_conceptos`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_conceptos_id_seq'::regclass) |
| empresa | character varying | - | NO | - |
| concepto | character varying | - | NO | - |
| categoria | character varying | - | NO | - |
| subcategoria | character varying | - | NO | - |
| prioridad | integer | - | NO | - |
| es_regex | boolean | - | NO | - |
| keywords | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |

#### Tabla: `nomina_costo_ot`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_costo_ot_id_seq'::regclass) |
| ot_id | integer | - | NO | - |
| ot_codigo | character varying | - | NO | - |
| anio | integer | - | NO | - |
| semana_iso | integer | - | NO | - |
| fecha_inicio | date | - | NO | - |
| fecha_fin | date | - | NO | - |
| total_empleados | integer | - | NO | - |
| total_horas | double precision | - | NO | - |
| total_horas_hed | double precision | - | NO | - |
| total_horas_hen | double precision | - | NO | - |
| total_horas_hefd | double precision | - | NO | - |
| total_horas_hefn | double precision | - | NO | - |
| total_horas_hf | double precision | - | NO | - |
| total_valor_bruto | double precision | - | NO | - |
| total_carga_prestacional | double precision | - | NO | - |
| total_costo_empresa | double precision | - | NO | - |
| categoria_sub_indice | character varying | - | YES | - |
| cc | character varying | - | YES | - |
| scc | character varying | - | YES | - |
| sub_indice | character varying | - | YES | - |
| ultima_actualizacion | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |
| calculo_ids | json | - | YES | - |

#### Tabla: `nomina_excepciones`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_excepciones_id_seq'::regclass) |
| cedula | character varying | - | NO | - |
| nombre_asociado | character varying | - | YES | - |
| subcategoria | character varying | - | NO | - |
| tipo | character varying | - | NO | - |
| estado | character varying | - | NO | - |
| valor_configurado | double precision | - | NO | - |
| saldo_actual | double precision | - | NO | - |
| pagador_cedula | character varying | - | YES | - |
| fecha_inicio | timestamp without time zone | - | NO | - |
| fecha_fin | timestamp without time zone | - | YES | - |
| observacion | character varying | - | YES | - |
| creado_por | character varying | - | NO | - |
| creado_en | timestamp without time zone | - | NO | - |
| actualizado_en | timestamp without time zone | - | YES | - |

#### Tabla: `nomina_excepciones_historial`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_excepciones_historial_id_seq'::regclass) |
| excepcion_id | integer | FK | NO | - |
| mes | integer | - | NO | - |
| anio | integer | - | NO | - |
| valor_aplicado | double precision | - | NO | - |
| mensaje | character varying | - | NO | - |
| creado_en | timestamp without time zone | - | NO | - |

#### Tabla: `nomina_factor_prestacional_riesgo`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_factor_prestacional_riesgo_id_seq'::regclass) |
| nivel_riesgo | character varying | - | NO | - |
| nivel_macro | character varying | - | NO | - |
| arl_nombre | character varying | - | YES | - |
| factor_prestacional | double precision | - | NO | - |
| porcentaje_salud | double precision | - | NO | - |
| porcentaje_pension | double precision | - | NO | - |
| porcentaje_arl | double precision | - | NO | - |
| porcentaje_caja | double precision | - | NO | - |
| porcentaje_icbf | double precision | - | NO | - |
| porcentaje_sena | double precision | - | NO | - |
| porcentaje_prima | double precision | - | NO | - |
| porcentaje_cesantia | double precision | - | NO | - |
| porcentaje_interes_cesantia | double precision | - | NO | - |
| porcentaje_vacaciones | double precision | - | NO | - |
| vigente_desde | date | - | NO | - |
| vigente_hasta | date | - | YES | - |
| observaciones | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |

#### Tabla: `nomina_favoritos`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_favoritos_id_seq'::regclass) |
| usuario_id | character varying | FK | NO | - |
| cedula | character varying | - | NO | - |
| subcategoria | character varying | - | NO | - |
| creado_en | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |

#### Tabla: `nomina_festivo_calendario`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| anio | integer | PK | NO | - |
| fecha | date | PK | NO | - |
| nombre | character varying | - | NO | - |
| fuente | character varying | - | NO | - |
| created_at | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |

#### Tabla: `nomina_horario_pactado`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_horario_pactado_id_seq'::regclass) |
| cedula | character varying | - | NO | - |
| minutos_jornada_ordinaria | integer | - | NO | - |
| horas_semana_ordinaria | double precision | - | NO | - |
| es_jornada_nocturna | boolean | - | NO | - |
| autoriza_he_default | boolean | - | NO | - |
| autoriza_he_override | boolean | - | YES | - |
| override_motivo | character varying | - | YES | - |
| override_autorizado_por | character varying | - | YES | - |
| override_fecha | timestamp without time zone | - | YES | - |
| sincronizado_en | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |
| fuente_sincronizacion | character varying | - | NO | - |
| observaciones | character varying | - | YES | - |

#### Tabla: `nomina_horario_pactado_dia`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| cedula | character varying | PK FK | NO | - |
| dia_semana | integer | PK | NO | - |
| hora_entrada | time without time zone | - | YES | - |
| hora_salida | time without time zone | - | YES | - |
| minutos_almuerzo | integer | - | NO | - |
| cruza_medianoche | boolean | - | NO | - |

#### Tabla: `nomina_novedad_evento`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_novedad_evento_id_seq'::regclass) |
| cedula | character varying | - | NO | - |
| codigo_novedad | character varying | FK | NO | - |
| fecha_inicio | date | - | NO | - |
| fecha_fin | date | - | NO | - |
| observaciones | character varying | - | YES | - |
| estado | character varying | - | NO | - |
| created_at | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |
| created_by | character varying | - | YES | - |
| updated_at | timestamp without time zone | - | YES | - |
| updated_by | character varying | - | YES | - |
| confirmado_at | timestamp without time zone | - | YES | - |
| confirmado_by | character varying | - | YES | - |
| anulado_at | timestamp without time zone | - | YES | - |
| anulado_justificacion | character varying | - | YES | - |

#### Tabla: `nomina_override_autoriza_he`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_override_autoriza_he_id_seq'::regclass) |
| cedula | character varying | - | NO | - |
| autoriza_he_erp | boolean | - | NO | - |
| autoriza_he_override | boolean | - | NO | - |
| motivo | character varying | - | NO | - |
| autorizado_por | character varying | - | NO | - |
| autorizado_por_id | character varying | - | YES | - |
| vigente_desde | timestamp without time zone | - | NO | - |
| vigente_hasta | timestamp without time zone | - | YES | - |
| estado | character varying | - | NO | - |
| documento_soporte_url | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |

#### Tabla: `nomina_parametros_legales`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_parametros_legales_id_seq'::regclass) |
| codigo | character varying | - | NO | - |
| nombre | character varying | - | NO | - |
| valor | character varying | - | NO | - |
| tipo_dato | character varying | - | NO | - |
| norma_soporte | character varying | - | YES | - |
| vigente_desde | date | - | NO | - |
| vigente_hasta | date | - | YES | - |
| estado | character varying | - | NO | - |
| observaciones | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |

#### Tabla: `nomina_planificador_dia_ot`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_planificador_dia_ot_id_seq'::regclass) |
| anio | integer | - | NO | - |
| semana_iso | integer | - | NO | - |
| cedula | character varying | - | NO | - |
| dia_semana | integer | - | NO | - |
| orden | character varying | - | NO | - |
| cc | character varying | - | YES | - |
| scc | character varying | - | YES | - |
| sub_indice | character varying | - | YES | - |
| categoria_sub_indice | character varying | - | NO | - |
| descripcion | character varying | - | YES | - |
| vr_contratado | double precision | - | YES | - |
| horas | double precision | - | YES | - |
| porcentaje | double precision | - | YES | - |
| creado_en | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |
| actualizado_en | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |

#### Tabla: `nomina_plantillas_horario`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | uuid | PK | NO | - |
| nombre | character varying | - | NO | - |
| descripcion | character varying | - | YES | - |
| version | integer | - | NO | - |
| esta_activa | boolean | - | NO | - |
| creado_por_id | character varying | FK | NO | - |
| actualizado_por_id | character varying | FK | NO | - |
| creado_en | timestamp with time zone | - | NO | now() |
| actualizado_en | timestamp with time zone | - | NO | now() |

#### Tabla: `nomina_plantillas_horario_dias`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| plantilla_id | uuid | PK FK | NO | - |
| dia_semana | smallint | PK | NO | - |
| hora_entrada | time without time zone | - | YES | - |
| hora_salida | time without time zone | - | YES | - |
| minutos_almuerzo | integer | - | NO | - |
| cruza_medianoche | boolean | - | NO | - |

#### Tabla: `nomina_plantillas_horario_historial`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | uuid | PK | NO | - |
| plantilla_id | uuid | FK | YES | - |
| accion | character varying | - | NO | - |
| version | integer | - | NO | - |
| actor_usuario_id | character varying | FK | NO | - |
| snapshot | jsonb | - | NO | - |
| creado_en | timestamp with time zone | - | NO | now() |

#### Tabla: `nomina_registros_crudos`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_registros_crudos_id_seq'::regclass) |
| archivo_id | integer | FK | NO | - |
| fila_origen | integer | - | NO | - |
| payload | json | - | YES | - |
| creado_en | timestamp without time zone | - | YES | '2026-07-21 20:40:49.117147'::timestamp without time zone |

#### Tabla: `nomina_registros_normalizados`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('nomina_registros_normalizados_id_seq'::regclass) |
| archivo_id | integer | FK | NO | - |
| fecha_creacion | timestamp without time zone | - | NO | - |
| mes_fact | integer | - | NO | - |
| año_fact | integer | - | NO | - |
| cedula | character varying | - | NO | - |
| nombre_asociado | character varying | - | YES | - |
| valor | double precision | - | NO | - |
| valor_rdc | double precision | - | NO | - |
| valor_colaborador | double precision | - | NO | - |
| empresa | character varying | - | NO | - |
| concepto | character varying | - | NO | - |
| categoria_final | character varying | - | NO | - |
| subcategoria_final | character varying | - | NO | - |
| estado_validacion | character varying | - | NO | - |
| horas | double precision | - | NO | - |
| dias | double precision | - | NO | - |
| ciudad | character varying | - | YES | - |
| fila_origen | integer | - | NO | - |
| observaciones | character varying | - | YES | - |

#### Tabla: `notificaciones_usuario`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('notificaciones_usuario_id_seq'::regclass) |
| usuario_id | character varying | FK | NO | - |
| titulo | character varying | - | NO | - |
| mensaje | character varying | - | NO | - |
| leido | boolean | - | NO | - |
| tipo_evento | character varying | - | NO | - |
| referencia_id | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `operaciones_idempotentes`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| solicitud_id | uuid | PK | NO | - |
| tipo_operacion | character varying(50) | PK | NO | - |
| actor_usuario_id | character varying | FK | NO | - |
| recurso_objetivo | character varying | - | NO | - |
| payload_hash | character varying | - | NO | - |
| estado | character varying | - | NO | - |
| resultado | jsonb | - | YES | - |
| creado_en | timestamp with time zone | - | NO | now() |
| finalizado_en | timestamp with time zone | - | YES | - |

#### Tabla: `permisos_rol`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('permisos_rol_id_seq'::regclass) |
| rol | character varying | - | NO | - |
| modulo | character varying | - | NO | - |
| permitido | boolean | - | NO | - |

#### Tabla: `plantillas_actividades`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('plantillas_actividades_id_seq'::regclass) |
| nombre_plantilla | character varying | - | NO | - |
| parent_id | integer | FK | YES | - |
| titulo | character varying | - | NO | - |
| descripcion | character varying | - | YES | - |
| horas_estimadas | numeric | - | NO | - |
| creado_en | timestamp without time zone | - | YES | now() |
| actualizado_en | timestamp without time zone | - | YES | - |

#### Tabla: `recomendaciones_ia`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('recomendaciones_ia_id_seq'::regclass) |
| desarrollo_id | character varying | - | YES | - |
| tipo_recomendacion | character varying | - | NO | - |
| titulo | character varying | - | NO | - |
| descripcion | character varying | - | NO | - |
| prioridad | character varying | - | NO | - |
| puntaje_impacto | numeric | - | YES | - |
| puntaje_esfuerzo | numeric | - | YES | - |
| confianza_ia | numeric | - | YES | - |
| estado | character varying | - | NO | - |
| asignado_a | character varying | - | YES | - |
| fecha_limite | date | - | YES | - |
| notas_implementacion | character varying | - | YES | - |
| implementado_en | timestamp without time zone | - | YES | - |
| retroalimentacion_resultados | character varying | - | YES | - |
| generado_por | character varying | - | NO | - |
| creado_en | timestamp without time zone | - | YES | now() |
| actualizado_en | timestamp without time zone | - | YES | - |

#### Tabla: `registro_actividades`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('registro_actividades_id_seq'::regclass) |
| desarrollo_id | character varying | - | YES | - |
| etapa_id | integer | - | YES | - |
| tipo_actividad | character varying | - | NO | - |
| fecha_inicio | timestamp without time zone | - | YES | - |
| fecha_fin | timestamp without time zone | - | YES | - |
| proximo_seguimiento_en | timestamp without time zone | - | YES | - |
| estado | character varying | - | NO | - |
| tipo_actor | character varying | - | YES | - |
| datos_dinamicos | character varying | - | YES | - |
| creado_por | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |
| actualizado_en | timestamp without time zone | - | YES | - |

#### Tabla: `registros_asistencia`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('registros_asistencia_id_seq'::regclass) |
| usuario_id | character varying | FK | NO | - |
| zona_id | integer | FK | YES | - |
| match_exitoso | boolean | - | NO | - |
| nivel_confianza | double precision | - | NO | - |
| latitud_marcada | double precision | - | NO | - |
| longitud_marcada | double precision | - | NO | - |
| evidencia_url | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `relaciones_gestor_empleado`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | uuid | PK | NO | - |
| gestor_usuario_id | character varying | FK | NO | - |
| empleado_cedula | character varying | - | NO | - |
| esta_activa | boolean | - | NO | - |
| creado_por_id | character varying | FK | NO | - |
| actualizado_por_id | character varying | FK | NO | - |
| creado_en | timestamp with time zone | - | NO | now() |
| actualizado_en | timestamp with time zone | - | NO | now() |

#### Tabla: `relaciones_usuarios`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('relaciones_usuarios_id_seq'::regclass) |
| usuario_id | character varying | FK | NO | - |
| superior_id | character varying | FK | NO | - |
| tipo_relacion | character varying | - | NO | - |
| esta_activa | boolean | - | NO | - |
| creado_en | timestamp without time zone | - | YES | now() |
| actualizado_en | timestamp without time zone | - | YES | - |

#### Tabla: `requerimientos_desarrollo`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('requerimientos_desarrollo_id_seq'::regclass) |
| external_id | character varying | - | NO | - |
| desarrollo_id | character varying | FK | NO | - |
| titulo | character varying | - | NO | - |
| descripcion | character varying | - | YES | - |
| prioridad | character varying | - | NO | - |
| estado | character varying | - | NO | - |
| fecha_limite | date | - | YES | - |
| responsable_id | integer | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |
| actualizado_en | timestamp without time zone | - | YES | - |

#### Tabla: `reservation_audit`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('reservation_audit_id_seq'::regclass) |
| reservation_id | uuid | FK | NO | - |
| action | character varying | - | NO | - |
| changed_by_name | character varying | - | YES | - |
| changed_by_document | character varying | - | YES | - |
| old_data | jsonb | - | YES | - |
| new_data | jsonb | - | YES | - |
| created_at | timestamp without time zone | - | YES | now() |

#### Tabla: `reservation_series`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | uuid | PK | NO | gen_random_uuid() |
| room_id | uuid | FK | NO | - |
| start_time | time without time zone | - | NO | - |
| end_time | time without time zone | - | NO | - |
| title | character varying | - | NO | - |
| pattern_type | character varying | - | NO | - |
| pattern_interval | integer | - | NO | - |
| start_date | date | - | NO | - |
| end_date | date | - | YES | - |
| created_by_name | character varying | - | NO | - |
| created_by_document | character varying | - | NO | - |
| created_at | timestamp without time zone | - | YES | now() |

#### Tabla: `reservations`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | uuid | PK | NO | gen_random_uuid() |
| room_id | uuid | FK | NO | - |
| series_id | uuid | FK | YES | - |
| start_datetime | timestamp with time zone | - | YES | - |
| end_datetime | timestamp with time zone | - | YES | - |
| title | character varying | - | NO | - |
| status | character varying | - | NO | - |
| created_by_name | character varying | - | NO | - |
| created_by_document | character varying | - | NO | - |
| updated_by_name | character varying | - | YES | - |
| updated_by_document | character varying | - | YES | - |
| cancelled_by_name | character varying | - | YES | - |
| cancelled_by_document | character varying | - | YES | - |
| created_at | timestamp with time zone | - | YES | now() |
| updated_at | timestamp with time zone | - | YES | now() |

#### Tabla: `roles_sistema`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | character varying | PK | NO | - |
| nombre | character varying | - | NO | - |
| descripcion | character varying | - | YES | - |
| es_sistema | boolean | - | NO | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `rooms`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | uuid | PK | NO | gen_random_uuid() |
| name | character varying | - | NO | - |
| capacity | integer | - | NO | - |
| resources | ARRAY | - | YES | - |
| is_active | boolean | - | NO | - |
| notes | text | - | YES | - |
| created_at | timestamp without time zone | - | YES | now() |
| updated_at | timestamp without time zone | - | YES | now() |

#### Tabla: `sesiones`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('sesiones_id_seq'::regclass) |
| usuario_id | character varying | - | NO | - |
| token_sesion | character varying(1000) | - | NO | - |
| direccion_ip | character varying | - | YES | - |
| agente_usuario | character varying | - | YES | - |
| expira_en | timestamp without time zone | - | NO | - |
| creado_en | timestamp without time zone | - | YES | now() |
| ultima_actividad_en | timestamp without time zone | - | YES | now() |
| nombre_usuario | character varying | - | YES | - |
| rol_usuario | character varying | - | YES | - |
| fin_sesion | timestamp without time zone | - | YES | - |
| tipo_sesion | character varying | - | NO | - |
| jti | character varying | - | YES | - |
| scope | character varying | - | YES | - |

#### Tabla: `solicitudes_activo`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('solicitudes_activo_id_seq'::regclass) |
| ticket_id | character varying | FK | NO | - |
| item_solicitado | character varying | - | NO | - |
| especificaciones | text | - | YES | - |
| cantidad | integer | - | NO | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `solicitudes_desarrollo`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('solicitudes_desarrollo_id_seq'::regclass) |
| ticket_id | character varying | FK | NO | - |
| que_necesita | character varying | - | YES | - |
| porque | character varying | - | YES | - |
| paraque | character varying | - | YES | - |
| justificacion_ia | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `solicitudmaterial`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| codigo | integer | PK | NO | nextval('solicitudmaterial_codigo_seq'::regclass) |
| codigosolicitud | character varying | - | NO | - |
| fecha | date | - | NO | - |
| hora | time without time zone | - | NO | - |
| ordentrabajo | character varying | - | YES | - |
| cliente | character varying | - | YES | - |
| uen | character varying | - | YES | - |
| fechanecesidad | date | - | NO | - |
| estado | character varying | - | YES | - |
| usuario | integer | - | YES | - |
| nombreusuario | character varying | - | YES | - |
| observaciones | character varying | - | YES | - |
| anexo | integer | - | YES | - |

#### Tabla: `solid_componentes`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('solid_componentes_id_seq'::regclass) |
| modulo_id | integer | FK | NO | - |
| nombre | character varying | - | NO | - |
| descripcion | text | - | YES | - |
| version | character varying | - | NO | - |
| creado_en | timestamp without time zone | - | NO | - |

#### Tabla: `solid_modulos`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('solid_modulos_id_seq'::regclass) |
| nombre | character varying | - | NO | - |
| descripcion | text | - | YES | - |
| version_actual | character varying | - | NO | - |
| creado_en | timestamp without time zone | - | NO | - |
| actualizado_en | timestamp without time zone | - | NO | - |

#### Tabla: `solid_opciones`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('solid_opciones_id_seq'::regclass) |
| componente_id | integer | FK | NO | - |
| nombre | character varying | - | NO | - |
| valor | character varying | - | NO | - |
| descripcion | text | - | YES | - |

#### Tabla: `tickets`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | character varying | PK | NO | - |
| categoria_id | character varying | FK | YES | - |
| asunto | character varying | - | YES | - |
| descripcion | character varying | - | YES | - |
| prioridad | character varying | - | NO | - |
| estado | character varying | - | NO | - |
| sub_estado | character varying | - | YES | - |
| creador_id | character varying | - | NO | - |
| nombre_creador | character varying | - | YES | - |
| correo_creador | character varying | - | YES | - |
| area_creador | character varying | - | YES | - |
| cargo_creador | character varying | - | YES | - |
| sede_creador | character varying | - | YES | - |
| asignado_a | character varying | - | YES | - |
| diagnostico | character varying | - | YES | - |
| resolucion | character varying | - | YES | - |
| causa_novedad | character varying | - | YES | - |
| notas | character varying | - | YES | - |
| horas_tiempo_empleado | numeric | - | YES | - |
| desarrollo_id | character varying | - | YES | - |
| datos_extra | jsonb | - | YES | - |
| areas_impactadas | jsonb | - | YES | - |
| fecha_entrega_ideal | timestamp without time zone | - | YES | - |
| fecha_creacion | timestamp without time zone | - | YES | now() |
| fecha_cierre | timestamp without time zone | - | YES | - |
| resuelto_en | timestamp without time zone | - | YES | - |
| atendido_en | timestamp without time zone | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |
| actualizado_en | timestamp without time zone | - | YES | - |

#### Tabla: `tipos_desarrollo`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('tipos_desarrollo_id_seq'::regclass) |
| valor | character varying | - | NO | - |
| etiqueta | character varying | - | NO | - |
| orden | integer | - | NO | - |
| esta_activo | boolean | - | NO | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `tokens`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('tokens_id_seq'::regclass) |
| usuario_id | character varying | FK | NO | - |
| hash_token | character varying | - | NO | - |
| tipo_token | character varying | - | NO | - |
| nombre | character varying | - | YES | - |
| expira_en | timestamp without time zone | - | NO | - |
| ultimo_uso_en | timestamp without time zone | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |

#### Tabla: `transito_viaticos`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('transito_viaticos_id_seq'::regclass) |
| reporte_id | uuid | - | NO | - |
| estado | character varying | - | NO | - |
| fecha_registro | timestamp without time zone | - | NO | - |
| empleado_cedula | character varying | - | NO | - |
| empleado_nombre | character varying | - | YES | - |
| area | character varying | - | YES | - |
| cargo | character varying | - | YES | - |
| ciudad | character varying | - | YES | - |
| categoria | character varying | - | YES | - |
| fecha_gasto | date | - | YES | - |
| ot | character varying | - | YES | - |
| cc | character varying | - | YES | - |
| scc | character varying | - | YES | - |
| valor_con_factura | double precision | - | NO | - |
| valor_sin_factura | double precision | - | NO | - |
| observaciones_linea | character varying | - | YES | - |
| observaciones_gral | character varying | - | YES | - |
| usuario_id | character varying | - | YES | - |
| adjuntos | jsonb | - | YES | - |

#### Tabla: `transitoinventario`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('transitoinventario_id_seq'::regclass) |
| sku | character varying | - | NO | - |
| documento | character varying | - | NO | - |
| cantidad | double precision | - | NO | - |
| fecha_proceso | timestamp without time zone | - | NO | now() |

#### Tabla: `usuarios`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | character varying | PK | NO | - |
| cedula | character varying | - | NO | - |
| correo | character varying | - | YES | - |
| hash_contrasena | character varying | - | NO | - |
| nombre | character varying | - | NO | - |
| rol | character varying | - | NO | - |
| esta_activo | boolean | - | NO | - |
| url_avatar | character varying | - | YES | - |
| zona_horaria | character varying | - | NO | - |
| creado_en | timestamp without time zone | - | YES | now() |
| actualizado_en | timestamp without time zone | - | YES | - |
| ultimo_login | timestamp without time zone | - | YES | - |
| correo_actualizado | boolean | - | NO | - |
| correo_verificado | boolean | - | NO | - |
| area | character varying | - | YES | - |
| cargo | character varying | - | YES | - |
| sede | character varying | - | YES | - |
| centrocosto | character varying | - | YES | - |
| viaticante | boolean | - | NO | - |
| baseviaticos | double precision | - | YES | - |
| especialidades | character varying | - | YES | - |
| areas_asignadas | character varying | - | YES | - |

#### Tabla: `validaciones_asignacion`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('validaciones_asignacion_id_seq'::regclass) |
| desarrollo_id | character varying | FK | YES | - |
| actividad_id | integer | FK | YES | - |
| solicitado_por_id | character varying | - | NO | - |
| validador_id | character varying | - | NO | - |
| asignado_a_id | character varying | - | NO | - |
| estado | character varying | - | NO | - |
| motivo | character varying | - | YES | - |
| observacion | character varying | - | YES | - |
| creado_en | timestamp without time zone | - | YES | now() |
| validado_en | timestamp without time zone | - | YES | - |

#### Tabla: `zonas_trabajo`
| Columna | Tipo | Clave | Nulable | Defecto |
|---------|------|-------|---------|---------|
| id | integer | PK | NO | nextval('zonas_trabajo_id_seq'::regclass) |
| nombre | character varying | - | NO | - |
| latitud | double precision | - | NO | - |
| longitud | double precision | - | NO | - |
| radio | double precision | - | NO | - |
