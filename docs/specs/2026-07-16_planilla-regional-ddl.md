# Contrato PostgreSQL - Planilla Regional Automática

**Fecha:** 2026-07-16
**Estado:** Aprobado contractualmente
**Especificación principal:** `docs/specs/2026-07-15_planilla-regional-automatica.md`
**ADR:** `docs/decisions/ADR-009-planilla-regional-item-versionado.md`

## 1. Principios

- PostgreSQL es la fuente de verdad; SQLModel refleja, pero no sustituye, este contrato.
- La migración converge desde esquema ausente, parcial o previo mediante inspección de `pg_catalog`.
- Todos los constraints, índices, funciones y triggers tienen nombre estable y se verifican después de crearlos.
- `btree_gist` se provisiona fuera del usuario runtime; startup solo verifica su presencia.
- Expand, backfill y validate son despliegues/checkpoints separados.
- Ningún checkpoint activa generación automática.

Cuando un objeto ya existe, la migración compara tipo, longitud, nulabilidad, default y definición normalizada obtenida de `pg_catalog`. Si una columna incompatible contiene datos, crea columna sombra, convierte con expresión explícita, compara conteos/checksum y hace swap bajo lock corto. Si no existe conversión segura, aborta antes de habilitar constraints. Constraints, funciones o triggers con el nombre correcto pero definición distinta se reemplazan únicamente en su checkpoint y se verifican con `pg_get_constraintdef`/`pg_get_functiondef`.

## 2. Preflight

Antes de expandir:

1. Verificar PostgreSQL 15 o compatible.
2. Verificar `btree_gist` con `pg_extension`; si falta, detener sin intentar `CREATE EXTENSION`.
3. Medir filas de `nomina_registros_normalizados` por período y estimar WAL/locks.
4. Verificar espacio libre, backup recuperable y ausencia de migración concurrente incompatible.
5. Tomar advisory lock transaccional estable para cada checkpoint.
6. Verificar que la conexión sea `gestor_migrador`, que runtime no tenga DDL y que startup esté en modo verify-only.

## 3. Registro Global de ITEM

```sql
CREATE SEQUENCE IF NOT EXISTS nomina_planilla_regional_item_seq AS BIGINT;

CREATE TABLE IF NOT EXISTS nomina_planilla_regional_item (
    item BIGINT PRIMARY KEY DEFAULT nextval('nomina_planilla_regional_item_seq'),
    origen VARCHAR(20) NOT NULL,
    registro_uuid UUID NOT NULL UNIQUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

La convergencia agrega de forma nombrada:

- `pk_planilla_item`: PK de `item`.
- `uq_planilla_item_uuid`: UNIQUE de `registro_uuid`.
- `ck_planilla_item_origen`: `origen IN ('ARCHIVO', 'PLANIFICADOR')`.
- `uq_planilla_item_origen`: `UNIQUE (item, origen)` para las FKs compuestas.
- `fn_planilla_item_append_only`: rechaza todo `UPDATE` y `DELETE`.
- `trg_planilla_item_append_only`: ejecuta esa función antes de mutar.

Reservar ITEM usa exclusivamente:

```sql
INSERT INTO nomina_planilla_regional_item (origen, registro_uuid)
VALUES (:origen, :registro_uuid)
RETURNING item, origen, registro_uuid;
```

## 4. Extensión Legacy

La fase expand agrega individualmente:

```sql
ALTER TABLE nomina_registros_normalizados
    ADD COLUMN IF NOT EXISTS item_planilla BIGINT,
    ADD COLUMN IF NOT EXISTS origen_planilla VARCHAR(20),
    ADD COLUMN IF NOT EXISTS clave_planilla CHAR(64),
    ADD COLUMN IF NOT EXISTS huella_planilla CHAR(64),
    ADD COLUMN IF NOT EXISTS calidad_clave_planilla VARCHAR(30),
    ADD COLUMN IF NOT EXISTS estado_planilla VARCHAR(20),
    ADD COLUMN IF NOT EXISTS activo_planilla BOOLEAN;
```

Constraints posteriores al backfill:

- `ck_normalizado_origen_planilla`: nulo o `ARCHIVO`.
- `ck_normalizado_estado_planilla`: nulo o `CONFIRMADO|ARCHIVADO|REEMPLAZADO`.
- `ck_normalizado_hashes_planilla`: hashes nulos juntos o dos valores hexadecimales SHA-256.
- `ck_normalizado_calidad_clave`: nulo, `CRUDA` o `PERSISTIDA_NO_RECONCILIABLE`.
- `ck_normalizado_activo_estado`: activo implica `CONFIRMADO`; inactivo implica `ARCHIVADO|REEMPLAZADO`.
- `fk_normalizado_item_origen`: `(item_planilla, origen_planilla)` referencia el registro global.
- `ux_nomina_normalizado_item_planilla`: ITEM único cuando no sea nulo.
- `ux_nomina_normalizado_clave_activa`: una identidad legacy activa.

`fn_planilla_vinculo_item_inmutable` rechaza cambios posteriores de `item_planilla` u `origen_planilla` cuando el valor anterior no sea nulo. El backfill se ejecuta antes de habilitar este trigger.

`ck_normalizado_item_coherente` exige que ITEM, origen, hashes, calidad, estado y activo estén todos nulos o todos poblados. La FK se declara `MATCH FULL` para rechazar vínculos parciales incluso antes de validar ese check.

```sql
CHECK (
  num_nonnulls(item_planilla, origen_planilla, clave_planilla,
               huella_planilla, calidad_clave_planilla,
               estado_planilla, activo_planilla) IN (0, 7)
),
FOREIGN KEY (item_planilla, origen_planilla) MATCH FULL
  REFERENCES nomina_planilla_regional_item (item, origen)
```

## 5. Filas Automáticas

`nomina_planilla_regional_fila` contiene:

| Grupo | Columnas y tipos |
|---|---|
| Identidad | `id UUID PK`, `item BIGINT UNIQUE`, `origen VARCHAR(20)`, `version INTEGER`, `activo BOOLEAN`, `reemplaza_item BIGINT` |
| Período | `fecha DATE`, `anio_calendario INTEGER`, `mes INTEGER`, `anio_iso INTEGER`, `semana_iso INTEGER`, `quincena VARCHAR(2)` |
| Empleado | `cedula VARCHAR(50)`, `empleado VARCHAR(200)`, `empresa VARCHAR(150)`, `sucursal VARCHAR(150)`, `encargados VARCHAR(200)` |
| Concepto | `concepto_interno VARCHAR(20)`, `codigo_salida_snapshot VARCHAR(50)`, `cantidad NUMERIC(10,4)`, `cantidad_horas NUMERIC(10,4)` |
| Distribución | `ubicacion VARCHAR(2)`, `ot_cc VARCHAR(50)`, `sub_subc VARCHAR(50)`, `especialidad_ot_snapshot VARCHAR(150)`, `cliente_snapshot VARCHAR(200)` |
| Contrato | `salario NUMERIC(16,2)`, `base_hora NUMERIC(16,6)`, `cc_contractual_snapshot VARCHAR(50)`, `aplica_he BOOLEAN`, `aplica_he_fuente_snapshot VARCHAR(20)` |
| Vigencias | `divisor_hora_snapshot NUMERIC(10,4)`, `parametro_vigente_desde_snapshot DATE`, `parametro_vigente_hasta_snapshot DATE`, `codigo_vigente_desde_snapshot DATE`, `codigo_vigente_hasta_snapshot DATE` |
| Estado | `fuente_cumplimiento VARCHAR(20)`, `estado VARCHAR(20)`, `calculo_id INTEGER`, `observaciones TEXT` |
| Auditoría | `responsable_id VARCHAR(50)`, `responsable_nombre VARCHAR(200)`, `creado_en TIMESTAMPTZ`, `actualizado_en TIMESTAMPTZ`, `confirmado_en TIMESTAMPTZ` |

Todas las columnas son `NOT NULL` salvo `reemplaza_item`, `parametro_vigente_hasta_snapshot`, `codigo_vigente_hasta_snapshot`, `especialidad_ot_snapshot`, `cliente_snapshot`, `observaciones`, `calculo_id` y `confirmado_en`. Defaults: `id=gen_random_uuid()`, `origen='PLANIFICADOR'`, `version=1`, `activo=true`, `sub_subc=''`, `creado_en/actualizado_en=now()`.

Constraints obligatorios:

- `origen = 'PLANIFICADOR'`.
- `ubicacion IN ('OT', 'CC')`.
- `fuente_cumplimiento IN ('HORARIO', 'BIOMETRIA')`.
- estados allowlisted y coherentes con `activo`.
- cantidades y valores no negativos; divisor mayor que cero.
- año, mes, quincena y semana ISO derivados de `fecha`.
- `reemplaza_item IS NULL OR reemplaza_item <> item`.
- FK compuesta de `(item, origen)` al registro global.
- FK de `reemplaza_item` al registro global y de `calculo_id` al cálculo semanal.
- `ux_planilla_identidad_version` sobre identidad base más `version`.
- `ux_planilla_borrador_identidad` parcial para un BORRADOR activo.

Nombres estables: `pk_planilla_fila`, `uq_planilla_fila_item`, `ck_planilla_fila_origen`, `ck_planilla_fila_ubicacion`, `ck_planilla_fila_fuente`, `ck_planilla_fila_estado`, `ck_planilla_fila_cantidades`, `ck_planilla_fila_periodo`, `ck_planilla_fila_activo_estado`, `ck_planilla_fila_reemplazo`, `fk_planilla_fila_item_origen`, `fk_planilla_fila_reemplazo`, `fk_planilla_fila_calculo`, `fk_planilla_fila_responsable`.

`fn_planilla_fila_columnas_mutables` rechaza desde el primer UPDATE cualquier cambio fuera de `cantidad`, `cantidad_horas`, `observaciones`, `actualizado_en`, estado/workflow y sus timestamps/FKs autorizados. ITEM, identidad y todos los snapshots son inmutables desde INSERT.

Los snapshots son inmutables desde el INSERT, incluso en BORRADOR. Un replay de la misma identidad solo puede cambiar `cantidad`, `cantidad_horas`, `observaciones` y `actualizado_en`. Si ERP/configuración cambió, el servicio conserva los snapshots originales y devuelve advertencia; aplicar fuentes nuevas exige acción explícita de regeneración, archiva el BORRADOR y crea versión/ITEM nuevos.

## 6. Asignaciones OT/CC del Planificador

La migración converge `nomina_planificador_dia_ot` con:

```sql
ALTER TABLE nomina_planificador_dia_ot
    ALTER COLUMN orden DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS ubicacion VARCHAR(2),
    ADD COLUMN IF NOT EXISTS metodo_distribucion VARCHAR(12),
    ADD COLUMN IF NOT EXISTS especialidad_ot_snapshot VARCHAR(150),
    ADD COLUMN IF NOT EXISTS cliente_snapshot VARCHAR(200),
    ADD COLUMN IF NOT EXISTS cc_contractual_snapshot VARCHAR(50),
    ADD COLUMN IF NOT EXISTS aplica_he_snapshot BOOLEAN,
    ADD COLUMN IF NOT EXISTS aplica_he_fuente_snapshot VARCHAR(20),
    ADD COLUMN IF NOT EXISTS erp_snapshot_en TIMESTAMPTZ;
```

Modelo/DTO cambian `orden` y `categoria_sub_indice` a opcionales. Durante Fases 1A-4C, `ubicacion`/`metodo_distribucion` también son opcionales: adaptador backend infiere con reglas de backfill y emite warning deprecado, preservando el payload frontend vigente. El endpoint v2 usado por Fase 5 los exige explícitamente. Tras activación, el adapter legacy permanece compatible hasta una retirada planificada; nunca se rompe entre despliegues.

También convierte mediante columnas sombra y swap verificado:

- `vr_contratado` a `NUMERIC(16,2)`.
- `horas` a `NUMERIC(10,4)`.
- `porcentaje` a `NUMERIC(7,4)`.

El backfill usa las reglas vigentes del servicio: si `orden` no está vacío, deriva `ubicacion='OT'` aunque exista `cc`; si `orden` está vacío y `cc` existe, deriva `CC`; ambos vacíos bloquean la fila. Si `horas > 0`, usa `HORAS` y anula porcentaje; en su defecto, porcentaje positivo usa `PORCENTAJE`; ambos ausentes/cero bloquean la fila para remediación. Filas nuevas rechazan `orden` y `cc` ambiguos para ubicación CC. Después se validan:

- `ubicacion IN ('OT', 'CC')`.
- `metodo_distribucion IN ('HORAS', 'PORCENTAJE')`.
- HORAS exige `horas` no nulo y porcentaje nulo.
- PORCENTAJE exige porcentaje entre 0 y 100 y horas nulas.
- OT exige orden; CC exige `orden IS NULL` y centro de costo.

Constraints nombrados: `ck_planificador_ot_ubicacion`, `ck_planificador_ot_metodo`, `ck_planificador_ot_horas`, `ck_planificador_ot_porcentaje`, `ck_planificador_ot_referencia`, `ck_planificador_ot_vr_contratado` y `ck_planificador_ot_snapshot_coherente`.

El modelo converge también `pk_planificador_dia_ot`, `ck_planificador_dia_ot_anio` (`anio BETWEEN 2020 AND 2100`), `ck_planificador_dia_ot_semana` (`semana_iso BETWEEN 1 AND 53`) y `ck_planificador_dia_ot_dia` (`dia_semana BETWEEN 1 AND 7`).

Los schemas Pydantic usan `Decimal`; nunca convierten estos campos a `float`.

## 7. Configuración y Códigos

`nomina_planilla_regional_configuracion` es singleton booleano. La fecha solo admite día 1 o 16. Un trigger permite configurar antes de activar y una única transición `FALSE -> TRUE`; después rechaza UPDATE/DELETE.

`planilla_seguridad.activar_planilla_regional(fecha,actor,sha)` es explícitamente `SECURITY DEFINER`, pertenece a owner NOLOGIN, fija `search_path=pg_catalog`, usa referencias cualificadas y valida gate/SHA/fecha. Se revoca EXECUTE a PUBLIC, se concede firma exacta al runtime y se prueba `prosecdef=true`, owner, `proconfig`, ausencia de overloads y shadowing.

`nomina_planilla_regional_cutover` singleton guarda modo, versión mínima, SHA y actor/timestamp. Función execute-only de migrador cambia modo y, en la misma transacción, inserta evento firmado `CUTOVER` append-only con modo anterior/nuevo, versión, SHA y actor. Cada request lee modo una vez y lo guarda en `request.state`.

Constraints estables: `pk_planilla_gate`, `ck_planilla_gate_singleton`, `fk_planilla_gate_actor`, `pk_planilla_cutover`, `ck_planilla_cutover_singleton`, `ck_planilla_cutover_modo` y `fk_planilla_cutover_actor`.

```sql
CREATE TABLE nomina_planilla_regional_gate (
  id BOOLEAN CONSTRAINT pk_planilla_gate PRIMARY KEY DEFAULT TRUE,
  hardening_version INTEGER NOT NULL,
  hardening_sha CHAR(40) NOT NULL,
  evidencia_digest CHAR(64) NOT NULL,
  aprobado_por VARCHAR(50) NOT NULL,
  aprobado_en TIMESTAMPTZ NOT NULL,
  vigente BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT ck_planilla_gate_singleton CHECK (id),
  CONSTRAINT fk_planilla_gate_actor FOREIGN KEY (aprobado_por) REFERENCES usuarios(id)
);
CREATE TABLE nomina_planilla_regional_cutover (
  id BOOLEAN CONSTRAINT pk_planilla_cutover PRIMARY KEY DEFAULT TRUE,
  modo_auditoria VARCHAR(10) NOT NULL DEFAULT 'GENERICA',
  version_minima VARCHAR(40) NOT NULL,
  build_sha CHAR(40) NOT NULL,
  actualizado_por VARCHAR(50) NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_planilla_cutover_singleton CHECK (id),
  CONSTRAINT ck_planilla_cutover_modo CHECK (modo_auditoria IN ('GENERICA','DEDICADA')),
  CONSTRAINT fk_planilla_cutover_actor FOREIGN KEY (actualizado_por) REFERENCES usuarios(id)
);
```

`nomina_planilla_regional_codigo` usa `EXCLUDE USING gist` para evitar vigencias solapadas por concepto. Un trigger append-only solo permite cerrar la vigencia abierta dentro de la función transaccional que inserta su sucesora.

La migración inserta `RETIRO` y `DEV_TARDANZA` si faltan. No ejecuta UPDATE sobre `RET`, `DXT` ni `nomina_novedad_evento`.

Definición mínima convergente:

```sql
CREATE TABLE IF NOT EXISTS nomina_planilla_regional_configuracion (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    fecha_activacion DATE NOT NULL CHECK (EXTRACT(DAY FROM fecha_activacion) IN (1, 16)),
    activada BOOLEAN NOT NULL DEFAULT FALSE,
    activada_por VARCHAR(50) REFERENCES usuarios(id),
    activada_en TIMESTAMPTZ,
    CHECK ((NOT activada AND activada_por IS NULL AND activada_en IS NULL)
        OR (activada AND activada_por IS NOT NULL AND activada_en IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS nomina_planilla_regional_codigo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    concepto_interno VARCHAR(20) NOT NULL CHECK (concepto_interno IN
      ('SALARIO','HED','HEN','HF','HEFD','HEFN','RN','RF','CMP','VAC','INC','LIC','REM','AUS','PNR','SAN','RETIRO','ARL','DEV_TARDANZA')),
    codigo_salida VARCHAR(50) NOT NULL,
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE,
    creado_por VARCHAR(50) NOT NULL REFERENCES usuarios(id),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (vigente_hasta IS NULL OR vigente_hasta > vigente_desde),
    EXCLUDE USING gist
      (concepto_interno WITH =, daterange(vigente_desde, vigente_hasta, '[)') WITH &&)
);
```

La migración no conserva nombres implícitos. Converge a: `pk_planilla_config`, `ck_planilla_config_singleton`, `ck_planilla_config_fecha`, `ck_planilla_config_activacion`, `pk_planilla_codigo`, `ck_planilla_codigo_concepto`, `ck_planilla_codigo_intervalo`, `ex_planilla_codigo_vigencia`, `fk_planilla_config_actor` y `fk_planilla_codigo_actor`.

## 8. Auditoría Dedicada

```sql
CREATE TABLE IF NOT EXISTS nomina_planilla_regional_auditoria (
    id UUID PRIMARY KEY,
    operacion_id UUID NOT NULL,
    evento_en TIMESTAMPTZ NOT NULL,
    version_contrato SMALLINT NOT NULL CHECK (version_contrato > 0),
    actor_id VARCHAR(50) NOT NULL REFERENCES usuarios(id),
    accion VARCHAR(40) NOT NULL CHECK (accion IN
      ('CONSULTAR','EXPORTAR','CARGAR','CONFIGURAR','ACTIVAR','DENEGAR','CUTOVER')),
    estado_evento VARCHAR(20) NOT NULL CHECK (estado_evento IN
      ('INICIADA','COMPLETADA','FALLIDA','DENEGADA')),
    cantidad INTEGER NOT NULL CHECK (cantidad >= 0),
    permisos VARCHAR(500) NOT NULL,
    correlacion_id UUID NOT NULL,
    filtros_hmac CHAR(64) NOT NULL,
    kid VARCHAR(50) NOT NULL,
    evento_hmac CHAR(64) NOT NULL,
    UNIQUE (operacion_id, estado_evento)
);
```

Nombres estables: `pk_planilla_audit`, `ck_planilla_audit_version`, `ck_planilla_audit_accion`, `ck_planilla_audit_estado`, `ck_planilla_audit_cantidad`, `uq_planilla_audit_operacion_estado`, `fk_planilla_audit_actor`, `trg_planilla_audit_update_delete` y `trg_planilla_audit_truncate`.

- `fn_planilla_auditoria_append_only` rechaza UPDATE/DELETE/TRUNCATE; runtime no recibe DML/SELECT directo sobre la tabla, solo `EXECUTE` de la función `SECURITY DEFINER` y una vista saneada cuando corresponda.
- No existen columnas de nombre, cédula, salario, observaciones, IP, user-agent o body.
- El evento canónico firmado contiene exactamente los valores almacenados: versión, `evento_en` UTC, operación, actor, acción, estado, cantidad, permisos ordenados, correlation ID y HMAC de filtros.
- La serialización es JSON UTF-8, NFC, claves ordenadas, separadores `(',', ':')`, sin espacios y sin floats.
- `filtros_hmac` usa HMAC-SHA256 keyed sobre filtros canónicos, no SHA-256 simple.
- Producción monta un secret JSON read-only `{kid: clave_base64}`; `PLANILLA_AUDIT_HMAC_KID` selecciona firma. Claves retiradas permanecen 365 días, igual que auditoría; rotación agrega clave, cambia kid, verifica firma nueva y solo retira tras vencer retención. La DB nunca guarda claves.
- Mutación DB exitosa y evento `COMPLETADA` se confirman juntos. Tras rollback se abre transacción corta para `FALLIDA`. Exportación/cuarentena crean `INICIADA` durable antes del efecto externo y luego `COMPLETADA` o `FALLIDA`; `operacion_id` correlaciona eventos. Denegaciones usan escritor dedicado fail-closed.

## 9. Hash Legacy Canónico

Antes de calcular SHA-256:

1. Normalizar texto a Unicode NFC.
2. Recortar extremos, colapsar whitespace interno y convertir a mayúsculas.
3. Representar nulo como cadena vacía.
4. Representar fechas como ISO `YYYY-MM-DD`.
5. Representar Decimal con cuatro posiciones, sin notación científica.
6. Serializar un objeto JSON con claves ordenadas, UTF-8 y separadores compactos.

El preflight inventaría cuántas filas pueden unirse a `nomina_registros_crudos.payload` por `(archivo_id, fila_origen)`. Si existe payload suficiente, usa empresa/sucursal/novedad/empleado/horas/días crudos, marca `CRUDA` y firma `clave_planilla` v1 con `{version,anio,mes,quincena,cedula,empresa_cruda,sucursal_cruda,novedad_cruda}`; la huella añade `{empleado_crudo,horas,dias}`.

Si el crudo falta por el flujo multifile histórico, asigna ITEM determinísticamente por ID, firma fallback `{version,origen:"PERSISTIDO",id,archivo_id,fila_origen}` y marca `PERSISTIDA_NO_RECONCILIABLE`. Estas filas nunca se emparejan ni archivan automáticamente por una recarga. Permanecen activas hasta remediación administrativa auditada que las vincule a una identidad cruda o las archive explícitamente. El reporte de backfill conserva conteos por calidad sin PII.

Una carga solo archiva ausentes cuando el DTO confirmado declara `modo=REEMPLAZO_COMPLETO`, identifica una única subcategoría/período y supera preview. `modo=PARCIAL` únicamente inserta/versiona presentes. El manifiesto de hasta cinco archivos se trata como un conjunto: se deduplican identidades o se rechazan conflictos, se adquiere lock por subcategoría/año/mes, se validan todas las filas, se hace upsert, luego se archivan ausentes y finalmente se audita/commit. Cualquier fallo revierte upserts y archivados.

`REEMPLAZO_COMPLETO` solo archiva filas `CRUDA`; si existen activas `PERSISTIDA_NO_RECONCILIABLE`, responde 409 con conteo y exige remediación previa. Los endpoints legacy por archivo solo admiten modo PARCIAL y nunca archivan ausentes.

## 10. Checkpoint Persistente

```sql
CREATE TABLE IF NOT EXISTS nomina_planilla_regional_migracion_checkpoint (
    nombre VARCHAR(80) PRIMARY KEY,
    version SMALLINT NOT NULL,
    id_corte BIGINT NOT NULL,
    ultimo_id BIGINT,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('PENDIENTE','EN_PROGRESO','COMPLETADO','FALLIDO','ABORTADO')),
    filas_procesadas BIGINT NOT NULL DEFAULT 0,
    checksum CHAR(64),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    detalle_error VARCHAR(500)
);
```

Constraints nombrados: `ck_planilla_checkpoint_estado`, `ck_planilla_checkpoint_progreso` (`ultimo_id IS NULL OR ultimo_id <= id_corte`) y PK `pk_planilla_checkpoint`.

Al iniciar, una transacción captura `id_corte=COALESCE(max(id),0)` y activa un trigger que rechaza nuevas filas Planilla mientras checkpoint esté `EN_PROGRESO` o `FALLIDO`; otras subcategorías operan. Cada lote procesa `id<=id_corte`. Tras rollback, transacción corta marca `FALLIDO` sin abrir el guard; reanudar conserva corte. Solo `COMPLETADO` tras verificar cero pendientes o `ABORTADO` mediante operación DBA auditada deshabilita guard.

Expand crea funciones y triggers de registro global/configuración/códigos; no habilita triggers consumidores. Validate los habilita después del backfill. Índices concurrentes usan conexión autocommit con `pg_advisory_lock` de sesión, liberan en `finally` y verifican `pg_index.indisvalid`.

## 11. Manifiestos de Carga

```sql
CREATE TABLE IF NOT EXISTS nomina_planilla_regional_manifiesto (
    id UUID PRIMARY KEY,
    solicitud_id UUID NOT NULL UNIQUE,
    actor_id VARCHAR(50) NOT NULL REFERENCES usuarios(id),
    subcategoria VARCHAR(100) NOT NULL,
    anio INTEGER NOT NULL,
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    digest CHAR(64) NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN
      ('PREVIEW','CONFIRMANDO','CONFIRMADO','EXPIRADO','ERROR')),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    expira_en TIMESTAMPTZ NOT NULL,
    confirmado_en TIMESTAMPTZ,
    resultado_digest CHAR(64)
);

CREATE TABLE IF NOT EXISTS nomina_planilla_regional_manifiesto_archivo (
    id UUID PRIMARY KEY,
    manifiesto_id UUID NOT NULL REFERENCES nomina_planilla_regional_manifiesto(id),
    orden SMALLINT NOT NULL CHECK (orden BETWEEN 1 AND 5),
    archivo_id INTEGER NOT NULL REFERENCES nomina_archivos(id),
    hash_archivo CHAR(64) NOT NULL,
    UNIQUE (manifiesto_id, orden),
    UNIQUE (manifiesto_id, hash_archivo)
);
```

Cliente genera UUIDv4 `solicitud_id` y lo envía en preview como `Idempotency-Key`; backend lo valida y persiste. Preview persiste manifest/archivos con TTL 30 minutos. Confirmación hace `SELECT ... FOR UPDATE`, valida actor/digest/TTL, transiciona PREVIEW→CONFIRMANDO y consume una vez. Replay confirmado con mismo digest devuelve resultado previo; digest distinto da 409. Dos workers esperan/releen ganador. Job expira y limpia según retención.

Constraints nombrados: `pk_planilla_manifiesto`, `uq_planilla_manifiesto_solicitud`, `ck_planilla_manifiesto_mes`, `ck_planilla_manifiesto_estado`, `fk_planilla_manifiesto_actor`, `pk_planilla_manifiesto_archivo`, `fk_planilla_manifiesto_archivo_manifest`, `fk_planilla_manifiesto_archivo_nomina`, `ck_planilla_manifiesto_archivo_orden`, `uq_planilla_manifiesto_archivo_orden` y `uq_planilla_manifiesto_archivo_hash`.

## 12. Checkpoints de Migración

### 12.1 Expand

- Crear objetos nulos/inactivos, funciones y columnas nuevas.
- No hacer backfill ni validar constraints pesados.
- Verificar doble ejecución y esquema parcial.
- Entrega verde, revisión y SHA aprobado.

### 12.2 Backfill

- Procesar lotes por rango de PK con checkpoint persistente.
- Reanudar desde el último lote confirmado.
- No archivar ni activar funcionalidad.
- Ajustar secuencia con `setval(..., GREATEST(last_value, max(item)), true)`.
- Entrega verde, métricas, revisión y SHA aprobado.

### 12.3 Validate

- Crear índices concurrentes fuera de la transacción cuando aplique.
- Agregar FKs/checks `NOT VALID` y ejecutar `VALIDATE CONSTRAINT` por separado.
- Habilitar triggers de inmutabilidad después del backfill.
- Verificar definiciones exactas en `pg_catalog`.
- Entrega verde, forward-fix probado, revisión y SHA aprobado.

## 13. Funciones de Inmutabilidad

```sql
CREATE OR REPLACE FUNCTION fn_planilla_item_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'nomina_planilla_regional_item es append-only';
END;
$$;

CREATE OR REPLACE FUNCTION fn_planilla_vinculo_item_inmutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME = 'nomina_registros_normalizados'
       AND (NEW.item_planilla, NEW.origen_planilla)
           IS DISTINCT FROM (OLD.item_planilla, OLD.origen_planilla) THEN
        RAISE EXCEPTION 'ITEM/origen legacy son inmutables';
    ELSIF TG_TABLE_NAME = 'nomina_planilla_regional_fila'
       AND (NEW.item, NEW.origen) IS DISTINCT FROM (OLD.item, OLD.origen) THEN
        RAISE EXCEPTION 'ITEM/origen automático son inmutables';
    END IF;
    RETURN NEW;
END;
$$;
```

Se crean triggers `BEFORE UPDATE OF item_planilla, origen_planilla` y `BEFORE UPDATE OF item, origen`; el registro global usa `BEFORE UPDATE OR DELETE`. Auditoría agrega además `BEFORE TRUNCATE FOR EACH STATEMENT`.

Nombres: `trg_planilla_item_append_only`, `trg_planilla_legacy_item_inmutable`, `trg_planilla_fila_item_inmutable`, `trg_planilla_fila_columnas_mutables`, `trg_planilla_config_inmutable`, `trg_planilla_codigo_inmutable`, `trg_planilla_legacy_backfill_guard`.

Índices ordinarios contractuales:

- `ix_planilla_periodo(anio_calendario, mes, quincena, item)`.
- `ix_planilla_cedula_fecha(cedula, fecha, item)`.
- `ix_planilla_estado_periodo(estado, anio_calendario, mes, quincena)`.
- `ix_planilla_origen_periodo(origen, anio_calendario, mes, quincena)`.
- `ix_planilla_reemplaza_item(reemplaza_item) WHERE reemplaza_item IS NOT NULL`.
- `ix_planilla_auditoria_operacion(operacion_id, evento_en)`.
- `ix_planilla_auditoria_actor(actor_id, evento_en)`.
- `ix_planilla_checkpoint_estado(estado, actualizado_en)`.
- `ix_normalizado_planilla_periodo(subcategoria_final, año_fact, mes_fact, activo_planilla, item_planilla)` parcial para subcategorías 1Q/2Q.
- `ix_normalizado_archivo_fila(archivo_id, fila_origen)` para unir backfill.
- `ix_crudo_archivo_fila(archivo_id, fila_origen)` único cuando el histórico lo permita; duplicados se reportan/remedian antes de crearlo.
- `ix_manifiesto_estado_expira(estado, expira_en)`.

Validate compara nombre, columnas, orden, predicado y método de acceso en `pg_index`/`pg_get_indexdef`.

## 14. Privilegios de Auditoría

La función vive en schema privado `planilla_seguridad`, pertenece a `planilla_audit_owner`, fija `search_path=pg_catalog`, referencia tablas totalmente calificadas, valida campos y persiste en una sentencia. Runtime/PUBLIC no tienen CREATE en schemas usados; default privileges revocan acceso futuro y se rechazan overloads homónimos. Despliegue ejecuta:

```sql
REVOKE ALL ON nomina_planilla_regional_auditoria FROM PUBLIC, gestor_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION registrar_auditoria_planilla(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registrar_auditoria_planilla(...) TO gestor_runtime;
```

Los objetos de dominio pertenecen a `gestor_schema_owner`; el job ejecuta `SET ROLE gestor_schema_owner` antes de DDL y verifica owner. Runtime recibe solo SELECT/INSERT/UPDATE allowlisted, DELETE donde el dominio lo requiera y `USAGE,SELECT` de la secuencia ITEM.

## 15. Pruebas Contractuales

- Tabla ausente, parcial y con tipos legacy.
- Dos ejecuciones y dos migradores concurrentes.
- Interrupción/reanudación de backfill.
- `setval` nunca disminuye.
- Ausencia de `btree_gist` falla sin crear objetos parciales.
- UPDATE/DELETE de registro ITEM falla.
- Reasignar ITEM/origen en ambas tablas consumidoras falla.
- Duplicar identidad/versión o autorreferenciar reemplazo falla.
- Conversión Decimal conserva precisión.
- `RET`/`DXT` y sus eventos permanecen idénticos.
- Auditoría no admite mutación y HMAC verifica por `kid`.
- Runtime no puede insertar auditoría directamente ni alterar objetos; la función no es ejecutable por PUBLIC.
- Manifiesto expira, consume una vez y es idempotente entre dos workers.
- Configuración acepta fecha futura 1/16, rechaza otro día y una segunda activación.
- Códigos aceptan sucesión contigua válida y rechazan solape/cambio in-place.
- Una fila válida satisface todos los constraints y conserva snapshots tras replay.
- Backfill reserva ITEM en orden determinista por ID dentro de cada lote.
