# Especificacion: Planilla Regional automatica

**Fecha:** 2026-07-15
**Estado:** Propuesta para aprobacion
**Modulo:** Novedades de Nomina / Horas Extras

## 1. Objetivo

Alimentar automaticamente las pantallas existentes:

- `/service-portal/novedades-nomina/NOVEDADES/PLANILLAS REGIONALES 1Q`
- `/service-portal/novedades-nomina/NOVEDADES/PLANILLAS REGIONALES 2Q`

Las filas se generan desde el Planificador semanal al guardar un borrador. Las cargas Excel historicas siguen disponibles y se muestran junto con las filas automaticas, sin dual-write ni eliminacion cruzada.

## 2. Reglas Confirmadas

- `ITEM` es un consecutivo numerico global, permanente e inmutable.
- Se aceptan huecos en ITEM por rollback o concurrencia; nunca se reutiliza un numero.
- Dias 1 a 15 alimentan `1Q`; dias 16 a fin de mes alimentan `2Q`.
- Solo se generan datos automaticos desde la activacion de la funcionalidad; no se reconstruye historia.
- La fila aparece al guardar el borrador con estado `BORRADOR`.
- El usuario ve el estado en la aplicacion.
- El Excel oficial solo contiene filas `CONFIRMADO` o posteriores; nunca `BORRADOR`.
- Si cambia novedad u OT/CC, la fila anterior se archiva y la nueva recibe otro `ITEM`.
- Inicialmente el cumplimiento proviene del horario registrado. La fuente se guarda para permitir integrar biometria en una fase posterior.
- `SALARIO` usa las horas pactadas del dia.
- `CMP`, `VAC`, `INC`, `LIC`, `REM`, `AUS`, `PNR`, `SAN`, `RET`, `ARL` y `DXT` reemplazan `SALARIO` ese dia.
- `BASE HORA = SALARIO / divisor legal vigente`, resuelto desde parametros del backend.
- Varias OT/CC se prorratean segun horas asignadas. La suma debe cuadrar con las horas del dia; de lo contrario se bloquea el guardado.
- Sin OT/CC explicita se usa el centro de costo contractual del ERP.
- `ENCARGADOS` corresponde al area contractual del empleado.
- `SUCURSAL` corresponde a la ciudad de contratacion.
- `RESPONSABLE` es el usuario autenticado que guarda el plan.
- `CLIENTE` se obtiene de la OT en `basegeneralcostos`; para CC sin cliente queda vacio.
- La tabla es una vista funcional de la aplicacion, no solamente una exportacion.
- La aplicacion muestra 22 columnas: las 20 originales mas `ESTADO` y `ORIGEN`.
- El Excel oficial conserva exactamente las 20 columnas originales.
- Las cargas manuales no pueden solaparse con fechas cubiertas por la generacion automatica.
- Los historicos incompletos muestran los campos disponibles y dejan vacios los datos que el extractor anterior no conservo.
- Un registro oficial no se modifica: un cambio posterior crea una correccion BORRADOR con nuevo ITEM.
- Los codigos de salida son parametrizables; los conceptos internos del motor permanecen estables.

## 3. Grano De Datos

Una fila activa representa:

```text
cedula + fecha + ubicacion(OT|CC) + referencia + novedad
```

Cambios de cantidad u observacion sobre la misma identidad actualizan el mismo `ITEM`. Cambios de novedad, referencia o ubicacion archivan la fila anterior y crean una nueva.

## 4. Modelo De Persistencia

### 4.1 Registro Global De ITEM

Crear `nomina_planilla_regional_item_seq` y `nomina_planilla_regional_item` en PostgreSQL.

- `nomina_planilla_regional_item` contiene `item BIGINT PRIMARY KEY DEFAULT nextval(...)`, `origen VARCHAR(20)`, `registro_uuid UUID UNIQUE` y `UNIQUE (item, origen)` para soportar la FK compuesta PostgreSQL.
- Legacy y automatico usan FK compuesta `(item, origen)` hacia el registro global; el origen tiene CHECK y no puede cambiar.
- Los historicos 1Q/2Q reciben ITEM una sola vez, en orden determinista por ID.
- La migracion ejecuta bajo advisory lock `setval(secuencia, GREATEST(last_value, max(item)), true)`; nunca reduce la secuencia.
- Las futuras cargas manuales y automaticas reservan ITEM con `INSERT ... RETURNING`.
- Otras categorias de nomina no consumen ITEM.
- La aplicacion no acepta ITEM suministrado por el cliente y no permite actualizarlo.

### 4.2 Extension Legacy

Agregar a `nomina_registros_normalizados`:

| Campo | Tipo | Uso |
|---|---|---|
| `item_planilla` | `BIGINT NULL` | ITEM visible y permanente para planillas regionales. |
| `origen_planilla` | `VARCHAR(20)` | `ARCHIVO`; permite union y evita borrado cruzado. |
| `clave_planilla` | `VARCHAR(180) NULL` | Identidad agregada legacy para conservar ITEM en recargas. |
| `estado_planilla` | `VARCHAR(20)` | `CONFIRMADO`, `ARCHIVADO` o `REEMPLAZADO`. |
| `activo_planilla` | `BOOLEAN` | Excluye versiones legacy archivadas sin perder ITEM. |

`item_planilla` es unico cuando no es NULL. `clave_planilla` tiene unicidad parcial `WHERE activo_planilla`. Las recargas manuales comparan la clave legacy `(periodo, cedula, empresa, sucursal, novedad)`. Una recarga identica conserva ITEM. Un cambio crea una nueva version/ITEM y marca la anterior `REEMPLAZADO`; una fila ausente queda `ARCHIVADO`. Toda quincena cuyo inicio sea igual o posterior a `FECHA_ACTIVACION_PLANILLA_REGIONAL` queda bloqueada para carga manual.

### 4.3 Filas Automaticas

Crear `nomina_planilla_regional_fila` con:

| Grupo | Campos principales |
|---|---|
| Identidad | `id UUID`, `item BIGINT`, `version INTEGER`, `activo BOOLEAN`, `reemplaza_item BIGINT NULL` |
| Origen | `origen`, `fuente_cumplimiento`, `estado`, `anio_calendario`, `mes`, `anio_iso`, `semana_iso`, `quincena` |
| Empleado | `cedula`, `empleado`, `salario`, `base_hora`, `aplica_he`, `empresa`, `sucursal` |
| Jornada | `fecha`, `cantidad`, `cantidad_horas`, `concepto_interno`, `codigo_salida_snapshot`, `divisor_hora_snapshot`, `parametro_vigente_desde_snapshot`, `parametro_vigente_hasta_snapshot`, `observaciones` |
| Distribucion | `ot_cc`, `sub_subc`, `especialidad_ot`, `ubicacion`, `cliente` |
| Trazabilidad | `responsable_id`, `responsable_nombre`, `encargados`, `calculo_id`, `creado_en`, `actualizado_en`, `confirmado_en` |

Claves y restricciones:

- `id UUID PRIMARY KEY` y `item BIGINT UNIQUE NOT NULL` con FK al registro global.
- `reemplaza_item` referencia el registro global de ITEM; `calculo_id` referencia el calculo semanal cuando exista.
- La identidad canonica usa columnas: `(cedula, fecha, ubicacion, ot_cc, sub_subc, concepto_interno, version)`; `sub_subc` es `NOT NULL DEFAULT ''` para evitar duplicados por semantica NULL.
- `CHECK (ubicacion IN ('OT', 'CC'))`.
- `CHECK (origen = 'PLANIFICADOR')` y `CHECK (quincena IN ('1Q', '2Q'))`.
- `CHECK (estado IN ('BORRADOR', 'CONFIRMADO', 'PAGADO', 'COMPENSADO', 'ANULADO', 'ARCHIVADO', 'REEMPLAZADO'))`.
- Checks de cantidades no negativas y coherencia entre `activo` y estados archivados.
- Checks derivados garantizan que año calendario, mes, quincena, año ISO y semana ISO coincidan con `fecha`.
- Indice unico parcial para una sola version BORRADOR activa por identidad base.
- Indices por `(anio, mes, quincena)`, `cedula`, `fecha`, `estado` y `origen`.
- Salario usa `NUMERIC(16,2)`, base hora `NUMERIC(16,6)` y cantidades `NUMERIC(10,4)`; schemas y dominio usan `Decimal`.
- Fechas de auditoria usan `TIMESTAMPTZ`.

La fecha efectiva se persiste en `nomina_planilla_regional_configuracion`, singleton auditado. Solo puede ser dia 1 o 16 y, si el despliegue ocurre a mitad de quincena, se usa el siguiente limite. Se vuelve inmutable en la misma transaccion que activa la funcionalidad, antes de generar filas. Cada fecha diaria se compara individualmente para soportar semanas que crucen activacion, quincena, mes o anio.

### 4.4 DDL Contractual

La migracion implementa el siguiente contrato PostgreSQL completo:

```sql
CREATE SEQUENCE IF NOT EXISTS nomina_planilla_regional_item_seq AS BIGINT;

CREATE TABLE IF NOT EXISTS nomina_planilla_regional_item (
    item BIGINT PRIMARY KEY DEFAULT nextval('nomina_planilla_regional_item_seq'),
    origen VARCHAR(20) NOT NULL CHECK (origen IN ('ARCHIVO', 'PLANIFICADOR')),
    registro_uuid UUID NOT NULL UNIQUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (item, origen)
);

ALTER TABLE nomina_registros_normalizados
    ADD COLUMN IF NOT EXISTS item_planilla BIGINT,
    ADD COLUMN IF NOT EXISTS origen_planilla VARCHAR(20),
    ADD COLUMN IF NOT EXISTS clave_planilla VARCHAR(180),
    ADD COLUMN IF NOT EXISTS estado_planilla VARCHAR(20),
    ADD COLUMN IF NOT EXISTS activo_planilla BOOLEAN;

CREATE UNIQUE INDEX IF NOT EXISTS ux_nomina_normalizado_item_planilla
    ON nomina_registros_normalizados (item_planilla)
    WHERE item_planilla IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_nomina_normalizado_clave_activa
    ON nomina_registros_normalizados (clave_planilla)
    WHERE activo_planilla IS TRUE;

CREATE TABLE IF NOT EXISTS nomina_planilla_regional_fila (
    id UUID PRIMARY KEY,
    item BIGINT NOT NULL UNIQUE,
    origen VARCHAR(20) NOT NULL DEFAULT 'PLANIFICADOR' CHECK (origen = 'PLANIFICADOR'),
    version INTEGER NOT NULL CHECK (version > 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    reemplaza_item BIGINT NULL,
    fuente_cumplimiento VARCHAR(20) NOT NULL CHECK (fuente_cumplimiento IN ('HORARIO', 'BIOMETRIA')),
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('BORRADOR', 'CONFIRMADO', 'PAGADO', 'COMPENSADO', 'ANULADO', 'ARCHIVADO', 'REEMPLAZADO')),
    anio_calendario INTEGER NOT NULL,
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    anio_iso INTEGER NOT NULL,
    semana_iso INTEGER NOT NULL CHECK (semana_iso BETWEEN 1 AND 53),
    quincena VARCHAR(2) NOT NULL CHECK (quincena IN ('1Q', '2Q')),
    cedula VARCHAR(50) NOT NULL,
    empleado VARCHAR(200) NOT NULL,
    aplica_he BOOLEAN NOT NULL,
    empresa VARCHAR(150) NOT NULL,
    sucursal VARCHAR(150) NOT NULL,
    fecha DATE NOT NULL,
    ubicacion VARCHAR(2) NOT NULL CHECK (ubicacion IN ('OT', 'CC')),
    ot_cc VARCHAR(50) NOT NULL,
    sub_subc VARCHAR(50) NOT NULL DEFAULT '',
    concepto_interno VARCHAR(20) NOT NULL CHECK (concepto_interno IN
        ('SALARIO','HED','HEN','HF','HEFD','HEFN','RN','RF','CMP','VAC','INC','LIC','REM','AUS','PNR','SAN','RET','ARL','DXT')),
    codigo_salida_snapshot VARCHAR(50) NOT NULL,
    cantidad NUMERIC(10,4) NOT NULL CHECK (cantidad >= 0),
    cantidad_horas NUMERIC(10,4) NOT NULL CHECK (cantidad_horas >= 0),
    salario NUMERIC(16,2) NOT NULL CHECK (salario >= 0),
    base_hora NUMERIC(16,6) NOT NULL CHECK (base_hora >= 0),
    divisor_hora_snapshot NUMERIC(10,4) NOT NULL CHECK (divisor_hora_snapshot > 0),
    parametro_vigente_desde_snapshot DATE NOT NULL,
    parametro_vigente_hasta_snapshot DATE NULL,
    especialidad_ot VARCHAR(150),
    cliente VARCHAR(200),
    observaciones TEXT,
    responsable_id VARCHAR(50) NOT NULL REFERENCES usuarios(id),
    responsable_nombre VARCHAR(200) NOT NULL,
    encargados VARCHAR(200) NOT NULL,
    calculo_id INTEGER REFERENCES nomina_calculo_semanal(id),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmado_en TIMESTAMPTZ,
    FOREIGN KEY (item, origen)
        REFERENCES nomina_planilla_regional_item (item, origen),
    FOREIGN KEY (reemplaza_item)
        REFERENCES nomina_planilla_regional_item (item),
    CHECK (anio_calendario = EXTRACT(YEAR FROM fecha)),
    CHECK (mes = EXTRACT(MONTH FROM fecha)),
    CHECK (anio_iso = EXTRACT(ISOYEAR FROM fecha)),
    CHECK (semana_iso = EXTRACT(WEEK FROM fecha)),
    CHECK (quincena = CASE WHEN EXTRACT(DAY FROM fecha) <= 15 THEN '1Q' ELSE '2Q' END),
    CHECK ((activo AND estado IN ('BORRADOR', 'CONFIRMADO', 'PAGADO', 'COMPENSADO'))
        OR (NOT activo AND estado IN ('ARCHIVADO', 'REEMPLAZADO', 'ANULADO')))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_planilla_borrador_identidad
    ON nomina_planilla_regional_fila
       (cedula, fecha, ubicacion, ot_cc, sub_subc, concepto_interno)
    WHERE activo IS TRUE AND estado = 'BORRADOR';

CREATE INDEX IF NOT EXISTS ix_planilla_periodo
    ON nomina_planilla_regional_fila (anio_calendario, mes, quincena);
CREATE INDEX IF NOT EXISTS ix_planilla_cedula ON nomina_planilla_regional_fila (cedula);
CREATE INDEX IF NOT EXISTS ix_planilla_fecha ON nomina_planilla_regional_fila (fecha);
CREATE INDEX IF NOT EXISTS ix_planilla_estado ON nomina_planilla_regional_fila (estado);
CREATE INDEX IF NOT EXISTS ix_planilla_origen ON nomina_planilla_regional_fila (origen);

ALTER TABLE nomina_registros_normalizados
    ADD CONSTRAINT ck_normalizado_origen_planilla
        CHECK (origen_planilla IS NULL OR origen_planilla = 'ARCHIVO'),
    ADD CONSTRAINT ck_normalizado_estado_planilla
        CHECK (estado_planilla IS NULL OR estado_planilla IN ('CONFIRMADO', 'ARCHIVADO', 'REEMPLAZADO')),
    ADD CONSTRAINT ck_normalizado_item_coherente
        CHECK ((item_planilla IS NULL AND origen_planilla IS NULL AND clave_planilla IS NULL
                AND estado_planilla IS NULL AND activo_planilla IS NULL)
            OR (item_planilla IS NOT NULL AND origen_planilla = 'ARCHIVO'
                AND clave_planilla IS NOT NULL AND estado_planilla IS NOT NULL
                AND activo_planilla IS NOT NULL)),
    ADD CONSTRAINT ck_normalizado_activo_estado
        CHECK (activo_planilla IS NULL OR (activo_planilla AND estado_planilla = 'CONFIRMADO')
            OR (NOT activo_planilla AND estado_planilla IN ('ARCHIVADO', 'REEMPLAZADO'))),
    ADD CONSTRAINT fk_normalizado_item_origen
        FOREIGN KEY (item_planilla, origen_planilla)
        REFERENCES nomina_planilla_regional_item (item, origen);

CREATE TABLE nomina_planilla_regional_configuracion (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    fecha_activacion DATE NOT NULL CHECK (EXTRACT(DAY FROM fecha_activacion) IN (1, 16)),
    activada BOOLEAN NOT NULL DEFAULT FALSE,
    activada_por VARCHAR(50) REFERENCES usuarios(id),
    activada_en TIMESTAMPTZ,
    CHECK ((NOT activada AND activada_por IS NULL AND activada_en IS NULL)
        OR (activada AND activada_por IS NOT NULL AND activada_en IS NOT NULL))
);

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE nomina_planilla_regional_codigo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    concepto_interno VARCHAR(20) NOT NULL CHECK (concepto_interno IN
        ('SALARIO','HED','HEN','HF','HEFD','HEFN','RN','RF','CMP','VAC','INC','LIC','REM','AUS','PNR','SAN','RET','ARL','DXT')),
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

Los `ALTER TABLE ... ADD CONSTRAINT` se ejecutan tras el backfill mediante bloques idempotentes que consultan `pg_constraint`. Un trigger `BEFORE UPDATE OR DELETE` de configuracion rechaza cambios cuando `OLD.activada`; la unica transicion permitida es `FALSE -> TRUE`. En codigos, un trigger solo permite cerrar una vigencia abierta sin cambiar concepto, codigo, inicio ni auditoria; prohibe DELETE y cualquier otra mutacion. La misma funcion transaccional cierra la vigencia y crea la sucesora. La migracion valida constraints, indices y triggers contra `pg_catalog`; SQLModel no es la fuente de verdad del DDL.

## 5. Contrato De Las Columnas

| Columna | Regla |
|---|---|
| ITEM | Secuencia compartida y permanente. |
| CEDULA | Cedula canonica. |
| EMPLEADO | Nombre ERP. |
| SALARIO | `beneficio.salario` del contrato activo. |
| BASE HORA | Salario dividido por divisor legal vigente. |
| APLICA HE | ERP mas override auditado del horario. |
| EMPRESA | Contrato ERP activo. |
| SUCURSAL | Ciudad de contratacion. |
| FECHA | Fecha calendario derivada de semana ISO y dia. |
| OT / CC | Referencia seleccionada o CC contractual de respaldo. |
| SUB. / SUBC. | `scc` o `sub_indice` ERP. |
| ESPECIALIDAD OT | Clasificacion de la combinacion ERP seleccionada. |
| CANTIDAD | Unidad del concepto: dias para `SALARIO` y ausencias; horas para HE/recargos. |
| UBICACION | `OT` o `CC`. |
| NOVEDAD | `codigo_salida_snapshot`; el concepto interno nunca se expone como etiqueta editable. |
| CANT. HORAS | Horas normalizadas; para unidad dias usa horas pactadas del dia. |
| OBSERVACIONES | Novedad o anotacion del plan. |
| RESPONSABLE | Usuario autenticado que guarda el borrador. |
| ENCARGADOS | Area contractual ERP. |
| CLIENTE | Cliente ERP de la OT; vacio para CC sin cliente. |
| ESTADO | Columna adicional visible y filtrable en la aplicacion. |
| ORIGEN | `ARCHIVO` o `PLANIFICADOR`; solo visible en la aplicacion. |

Las filas legacy activas se proyectan con su `estado_planilla` (`CONFIRMADO` por defecto), `ORIGEN = ARCHIVO` y valores vacios en columnas que no fueron conservadas por el extractor historico. Consulta y exportacion excluyen siempre `activo_planilla = false`; las versiones inactivas solo aparecen en historial. No se intenta deduplicarlas fila a fila contra datos automaticos porque carecen de fecha y referencia.

## 5.1 Parametrizacion De Codigos

Los conceptos internos son constantes (`SALARIO`, `HED`, `HEN`, `HF`, `HEFD`, `HEFN`, `RN`, `RF`, `CMP`, `VAC`, `INC`, `LIC`, `REM`, `AUS`, `PNR`, `SAN`, `RET`, `ARL`, `DXT`). La salida usa `nomina_planilla_regional_codigo`, una tabla versionada por vigencia con exclusion de intervalos solapados. Todos los conceptos tienen codigo de salida configurable; la tabla siguiente destaca los calculados por horario:

| Campo visible de configuracion | Valor inicial |
|---|---|
| Codigo de salario | `SALARIO` |
| Codigo de hora extra diurna | `HED` |
| Codigo de hora extra nocturna | `HEN` |
| Codigo de hora festiva | `HF` |
| Codigo de hora extra festiva diurna | `HEFD` |
| Codigo de hora extra festiva nocturna | `HEFN` |
| Codigo de recargo nocturno | `RN` |
| Codigo de recargo festivo | `RF` |
| Codigo de compensatorio | `CMP` |

Las novedades `VAC`, `INC`, `LIC`, `REM`, `AUS`, `PNR`, `SAN`, `RET`, `ARL` y `DXT` se siembran con el mismo codigo interno como valor de salida inicial. `RET` significa retiro de la empresa, `ARL` accidente laboral y `DXT` devuelto por tardanza. Las tres se registran en dias crudos, sin distribuir por OT y atribuidas al CC contractual para respetar el contrato de la planilla; el sistema de nomina destino aplica su liquidacion legal.

La migracion corrige idempotentemente el catalogo operativo existente: `RET` pasa de retardo a retiro de empresa con unidad `DIAS`, categoria `AUSENCIA` y subcategoria `RETIRO`; `DXT` pasa de descanso por tratamiento a devuelto por tardanza con unidad `DIAS`, categoria `AUSENCIA` y subcategoria `TARDANZA`. `seed_horas_extras.py` adopta esas mismas definiciones para instalaciones nuevas. Planilla Regional no usa `factor_hora_ordinaria` para liquidarlas ni calcula efectos legales.

La pantalla de configuracion presenta los codigos junto a `Inicio jornada nocturna` y `Fin jornada nocturna`. Cambiar un codigo cierra la vigencia anterior y crea otra; solo afecta nuevas salidas. Cada fila guarda `concepto_interno`, `codigo_salida_snapshot`, divisor legal aplicado y vigencias usadas, por lo que no reinterpreta historicos.

## 6. Generacion Y Prorrateo

1. Resolver empleados y datos contractuales ERP en lote, fuera de la transaccion PostgreSQL; prohibido N+1.
2. Calcular la fecha real de cada dia de la semana ISO.
3. Validar jornada y distribucion OT/CC antes de persistir.
4. Generar `SALARIO` si existe jornada y no hay novedad de reemplazo.
5. Generar conceptos de HE/recargo usando un clasificador diario unico compartido por borrador, precalculo y confirmacion: `HED`, `HEN`, `HF`, `HEFD`, `HEFN`, `RN`, `RF`.
6. Mantener novedades de ausencia/compensacion con su unidad correspondiente.
7. Prorratear `cantidad` y `cantidad_horas` por `horas_ot / horas_totales_asignadas`; salario mensual y base hora se repiten como snapshots informativos, no se prorratean.
8. Redondear a cuatro decimales con `ROUND_HALF_UP` y aplicar el residuo a la ultima asignacion ordenada por `(ubicacion, ot_cc, sub_subc)`.
9. Si no hay OT, crear una distribucion unica al CC contractual.
10. Usar advisory lock por empleado/semana, savepoint por empleado y upsert PostgreSQL para evitar versiones concurrentes.
11. Upsert de identidad BORRADOR sin cambiar ITEM; archivar identidades que desaparecieron.
12. Si existe una version oficial, crear correccion BORRADOR con nuevo ITEM. Al confirmarla, la anterior pasa a `REEMPLAZADO` y queda almacenada para auditoria.

`guardar_borrador_plan`, `confirmar_plan` y los workflows de pago/compensacion/anulacion se refactorizan para que el orquestador exterior sea el unico propietario de `commit`/`rollback`. Invocan respectivamente `sincronizar_filas_sin_commit`, `confirmar_filas_sin_commit` y `transicionar_filas_sin_commit`; estos hooks solo usan `flush` y savepoints y tienen prohibido ejecutar `commit`.

La obtencion de ITEM y el alta de la fila ocurren en una sola transaccion. Un `IntegrityError` por concurrencia relee la version ganadora bajo lock; nunca reserva otro ITEM para la misma version logica.

Si salario, contrato activo o centro de costo de respaldo no pueden resolverse, el empleado queda en error y no genera filas incompletas.

## 7. Estados

| Evento | Estado resultante |
|---|---|
| Guardar horario | `BORRADOR` |
| Ejecutar precalculo | Conserva `BORRADOR`; el precalculo sigue sin persistir estado. |
| Confirmar calculo | `CONFIRMADO` |
| Workflow de pago | `PAGADO` |
| Compensacion | `COMPENSADO` |
| Anulacion | `ANULADO` |
| Cambio de identidad | anterior `ARCHIVADO`, nueva fila en estado correspondiente |
| Correccion de oficial | nueva `BORRADOR`; al confirmar, anterior `REEMPLAZADO` |

La confirmacion actualiza `calculo_id`, estado y reemplazos dentro del mismo savepoint que crea `nomina_calculo_semanal`. Los servicios de workflow `PAGADO`, `COMPENSADO` y `ANULADO` actualizan las filas relacionadas en la misma transaccion. Una falla revierte calculo y Planilla Regional conjuntamente.

## 8. API

### Consulta combinada

```http
POST /api/v2/novedades-nomina/planillas-regionales/{quincena}/consultar
```

El body contiene arrays multivalor para `estado`, `origen`, `empresa`, `sucursal`, `novedad` y filtros opcionales de fecha/identificador opaco, ademas de `limit`, `offset`, `orden`, `direccion` y busqueda global. La cedula cruda no viaja en URL.

Las facetas se calculan despues de aplicar alcance y filtros base, incluyen conteos, soportan busqueda remota y limitan valores de alta cardinalidad. La respuesta incluye filas, total, facetas, resumen y advertencias. Debe usar `Cache-Control: no-store, private` en exito y error.

### Exportacion oficial

```http
POST /api/v2/novedades-nomina/planillas-regionales/{quincena}/exportar
```

- Formato XLSX.
- Allowlist exacta: `CONFIRMADO`, `PAGADO`, `COMPENSADO`. Excluye `BORRADOR`, `ANULADO`, `ARCHIVADO` y `REEMPLAZADO`.
- Respeta filtros del usuario.
- Conserva exactamente las 20 columnas originales.
- Registra auditoria de exportacion sin payload ni PII en logs.
- Neutraliza formulas XLSX, limita filas, aplica rate limit y genera el archivo en memoria con limpieza garantizada.
- Incluye `Cache-Control: no-store, private` y `X-Content-Type-Options: nosniff`.

### Contrato Tipado De Consulta

`PlanillaRegionalConsultaIn`:

- `mes: int`, `anio: int`, `limit: 1..100`, `offset >= 0`.
- `estados`, `origenes`, `empresas`, `sucursales`, `novedades`: listas de hasta 50 valores.
- `fecha_desde`, `fecha_hasta`, `item`, `busqueda` de maximo 100 caracteres.
- `orden`: allowlist de columnas; `direccion`: `asc|desc`.
- `faceta_campo` opcional y `faceta_busqueda` para buscar valores remotos, maximo 100 resultados.

`PlanillaRegionalConsultaOut`:

- `filas: PlanillaRegionalFilaRead[]`.
- `total`, `limit`, `offset`.
- `facetas: Record[campo, [{valor, conteo}]]`.
- `resumen: {filas, empleados, horas, dias}` calculado despues del alcance.
- `advertencias: [{codigo, mensaje}]` sin PII.

El endpoint de exportacion recibe el mismo schema de filtros sin `limit/offset`, devuelve `Content-Disposition` y limita a 50.000 filas. Rate limit inicial: 5 exportaciones por minuto por usuario.

### Configuracion

```http
GET  /api/v2/novedades-nomina/planillas-regionales/configuracion
POST /api/v2/novedades-nomina/planillas-regionales/configuracion/codigos
POST /api/v2/novedades-nomina/planillas-regionales/configuracion/activar
```

La activacion exige fecha futura 1/16, es de una sola ejecucion y queda auditada. Los codigos se crean por nueva vigencia; no se actualizan en sitio.

## 9. RBAC Y Seguridad

Registrar en el manifiesto:

- `nomina_horas_extras.planilla_regional.consultar`.
- `nomina_horas_extras.planilla_regional.exportar`.
- `nomina_horas_extras.planilla_regional.salario.consultar`.
- `nomina_horas_extras.planilla_regional.cargar`.
- `nomina_horas_extras.planilla_regional.configurar`.

La consulta exige autenticacion y permiso `consultar`. El alcance por cedula se aplica antes de union, facetas, resumen, paginacion y exportacion; un alcance vacio devuelve cero filas. Sin permiso salarial se omiten `SALARIO` y `BASE HORA` del JSON y las celdas muestran `Restringido`. La exportacion exige la interseccion de consultar, exportar y salario. La carga manual exige `cargar`. Se crea una dependencia require-all; no se reutiliza el helper OR actual.

El adaptador ERP usa `ERP_PLANILLA_DATABASE_URL`, engine y sesion exclusivos, creados/cerrados dentro del worker, transaccion `READ ONLY`, timeout y consultas SELECT allowlisted. Produccion falla cerrado si esa DSN no corresponde a una credencial dedicada de solo lectura. Se actualizan `config.py`, `database.py`, `.env.example` y archivos Compose. No se cachean salarios fuera del request ni se guardan datos de nomina en almacenamiento del navegador.

La auditoria append-only registra actor interno, accion, resultado, cantidad, permisos efectivos, correlation ID y HMAC de filtros con clave separada. No registra cedulas, nombres, salarios, observaciones, query strings ni contenido XLSX. Accesos por ITEM resuelven ITEM a cedula y responden 404 uniforme si no existe o no esta autorizado.

Los endpoints legacy `datos`, `preview`, archivos, historial, `subcategorias/{subcat}`, `subcategorias/resumen` y `exportar-solid` quedan autenticados, con RBAC, alcance, `no-store` y errores saneados; no devuelven `str(e)`. La descarga del XLSX original no puede filtrarse por cedula y por ello exige simultaneamente `cargar` y rol administrativo. El resumen y exportar-solid aplican alcance antes de agregar/exportar.

Matriz obligatoria para solicitudes cuya categoria/subcategoria sea Planilla Regional:

| Metodo y ruta | Permisos require-all | Alcance y tratamiento |
|---|---|---|
| `GET planillas_regionales_1q|2q/datos` | `consultar` | Alcance antes de filas/resumen; sin permiso salario omite ambos campos. |
| `POST planillas_regionales_1q|2q/preview` | `consultar + cargar` | Valida alcance de todas las cedulas antes de persistir. |
| `POST /archivos` | `cargar` | Solo admite categoria/subcategoria autorizada y limites de archivo. |
| `POST /archivos/{id}/procesar` | `consultar + cargar` | Resuelve primero categoria del archivo y luego autoriza. |
| `GET /archivos/{id}/preview` | `consultar + cargar + rol admin` | El original no es segmentable; no se entrega a gestores parciales. |
| `GET /archivos/{id}/descargar` | `cargar + rol admin` | Descarga original completa, auditada y `no-store`. |
| `GET /subcategorias/{subcat}` | `consultar` | Alcance antes de filas, totales y paginacion. |
| `GET /subcategorias/resumen` | `consultar` | Solo agrega las cedulas autorizadas. |
| `GET /historial` | `consultar` | Alcance previo; versiones inactivas solo para usuarios autorizados. |
| `POST /exportar-solid` | `consultar + exportar + salario.consultar` | Alcance y allowlist antes de generar salida. |
| `POST planillas-regionales/{q}/consultar` | `consultar` | Alcance previo; salario omitido sin permiso salarial. |
| `POST planillas-regionales/{q}/exportar` | `consultar + exportar + salario.consultar` | Alcance previo y Excel oficial. |
| `GET/POST planillas-regionales/configuracion/*` | `configurar` | Solo administradores funcionales; auditoria append-only. |

Las rutas genericas conservan su autorizacion actual para otras categorias; la dependencia category-aware añade esta matriz cuando detecta `PLANILLAS REGIONALES 1Q/2Q`.

`PLANILLA_AUDIT_HMAC_KEY` es un secreto independiente de minimo 32 bytes, obligatorio y fail-closed en produccion; admite clave actual/anterior durante rotacion y nunca reutiliza JWT. Se incorpora a config, `.env.example` y Compose.

La carga manual acepta maximo 5 archivos `.xlsm`/`.xlsx`, 20 MB por archivo y 50 MB por request; valida extension, MIME, firma ZIP, cantidad/tamaño descomprimido, timeout de procesamiento y rechaza ZIP bombs. Los archivos se almacenan fuera de rutas servidas publicamente. `backend_v2/storage/` queda excluido de Git y nunca forma parte del commit.

## 10. Interfaz

- Reutilizar las rutas actuales de 1Q y 2Q.
- Extraer una vista compartida `PlanillaRegionalView` para evitar duplicacion.
- Conservar carga manual en un panel secundario identificado como origen `ARCHIVO`.
- Tabla principal con 22 columnas en pantalla y filtros remotos multivalor tipo Excel.
- Orden UI exacto: ITEM, CEDULA, EMPLEADO, SALARIO, BASE HORA, APLICA HE, EMPRESA, SUCURSAL, FECHA, OT/CC, SUB./SUBC., ESPECIALIDAD OT, CANTIDAD, UBICACION, NOVEDAD, CANT. HORAS, OBSERVACIONES, RESPONSABLE, ENCARGADOS, CLIENTE, ESTADO, ORIGEN.
- Columnas `CEDULA` y `EMPLEADO` fijadas; scroll horizontal para el resto.
- Paginacion remota para limitar el render; exportacion siempre desde backend.
- Estados de carga, error, vacio inicial y vacio por filtros.
- Mostrar `ESTADO` y `ORIGEN` como badges, aunque `ORIGEN` puede permanecer fuera del orden contractual del Excel.
- En movil se priorizan ITEM, CEDULA, EMPLEADO, FECHA, NOVEDAD, HORAS y ESTADO; las demas quedan disponibles por scroll/selector de columnas.
- CEDULA/EMPLEADO son sticky desde `md`; en movil no son sticky para no consumir el viewport.
- `SALARIO` y `BASE HORA` son opcionales en el DTO y muestran `Restringido` sin permiso.

Estructura frontend prevista:

- `PlanillaRegional/types.ts`.
- `PlanillaRegional/columns.tsx`.
- `PlanillaRegional/hooks/usePlanillaRegional.ts`.
- `PlanillaRegional/services/planillaRegionalService.ts`.
- `PlanillaRegional/components/PlanillaRegionalTable.tsx`.
- `PlanillaRegional/components/PlanillaRegionalToolbar.tsx`.
- `PlanillaRegional/components/PlanillaRegionalResumen.tsx`.
- `PlanillaRegional/components/PlanillaRegionalLegacyPanel.tsx`.
- `PlanillaRegional/PlanillaRegionalView.tsx`.

Los wrappers 1Q/2Q solo pasan `quincena`. Los endpoints se registran en `config/api.ts`. Se reutilizan `FilterDropdown`, `Button`, `Input`, `Select`, `Badge`, `MaterialCard`, `Callout` y `Skeleton/Spinner`, sin copiar HTML/colores legacy.

## 11. Convivencia Con Legacy

- No se modifican ni eliminan archivos historicos.
- No se reconstruyen periodos anteriores a la activacion.
- La consulta combina `ARCHIVO` y `PLANIFICADOR`, pero no intenta deduplicar historicos que perdieron fecha/OT.
- Se bloquean cargas manuales que se solapen con la fecha de activacion automatica.
- La recarga de periodos legacy conserva ITEM mediante su clave agregada.

## 12. Criterios De Aceptacion

1. Guardar un borrador genera filas visibles en la quincena correspondiente.
2. Repetir el mismo guardado conserva ITEM.
3. Cambiar novedad u OT archiva el ITEM anterior y crea uno nuevo.
4. Una ausencia de reemplazo no genera SALARIO.
5. Varias OT cuadradas conservan el total exacto tras prorrateo.
6. Una distribucion descuadrada bloquea el empleado.
7. Sin OT se utiliza el CC contractual ERP.
8. Salario/base hora usan ERP y divisor legal, nunca valores estimados.
9. La consulta respeta alcance y permisos.
10. El Excel rechaza borradores y exporta solo filas oficiales.
11. Las cargas legacy continúan funcionando sin borrar filas automaticas.
12. 1Q y 2Q se resuelven automaticamente por fecha.
13. Cantidad u observacion cambian sin alterar ITEM; novedad u OT crean nueva version.
14. Ninguna fecha anterior a activacion genera fila automatica.
15. Las filas legacy se proyectan como confirmadas y con campos faltantes vacios.
16. Consulta, facetas, resumen y exportacion no filtran datos fuera del alcance autorizado.
17. Los codigos parametrizados aparecen en nuevas filas y los historicos conservan su snapshot.
18. El XLSX contiene 20 columnas, neutraliza formulas y solo usa la allowlist oficial.
19. Cambiar despues salario/empresa/ciudad/area/CC en ERP, metadata OT, divisor o codigo configurado no altera ningun snapshot historico.
20. Los hooks `*_sin_commit` no confirman transacciones y una falla revierte conjuntamente horario, calculo y planilla.

### 12.1 Trazabilidad CA A Pruebas

En la columna comando, `B` equivale a `docker compose run --rm -T -v "${PWD}:/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2 backend pytest`.

| CA | Archivo y test | Comando focal |
|---|---|---|
| CA_01 | `test_planilla_regional_persistencia.py::test_ca_01_guardar_borrador_genera_filas_visibles` | `B testing/backend/test_planilla_regional_persistencia.py::test_ca_01_guardar_borrador_genera_filas_visibles -q` |
| CA_02 | `test_planilla_regional_persistencia.py::test_ca_02_replay_conserva_item` | `B testing/backend/test_planilla_regional_persistencia.py::test_ca_02_replay_conserva_item -q` |
| CA_03 | `test_planilla_regional_persistencia.py::test_ca_03_cambio_identidad_archiva_y_crea_item` | `B testing/backend/test_planilla_regional_persistencia.py::test_ca_03_cambio_identidad_archiva_y_crea_item -q` |
| CA_04 | `test_planilla_regional_dominio.py::test_ca_04_ausencias_reemplazan_salario` | `B testing/backend/test_planilla_regional_dominio.py::test_ca_04_ausencias_reemplazan_salario -q` |
| CA_05 | `test_planilla_regional_dominio.py::test_ca_05_prorrateo_conserva_total` | `B testing/backend/test_planilla_regional_dominio.py::test_ca_05_prorrateo_conserva_total -q` |
| CA_06 | `test_planilla_regional_dominio.py::test_ca_06_descuadre_bloquea_empleado` | `B testing/backend/test_planilla_regional_dominio.py::test_ca_06_descuadre_bloquea_empleado -q` |
| CA_07 | `test_planilla_regional_erp.py::test_ca_07_sin_ot_usa_cc_contractual` | `B testing/backend/test_planilla_regional_erp.py::test_ca_07_sin_ot_usa_cc_contractual -q` |
| CA_08 | `test_planilla_regional_erp.py::test_ca_08_salario_y_base_hora_desde_fuentes` | `B testing/backend/test_planilla_regional_erp.py::test_ca_08_salario_y_base_hora_desde_fuentes -q` |
| CA_09 | `test_planilla_regional_http_security.py::test_ca_09_consulta_aplica_alcance_y_permisos` | `B testing/backend/test_planilla_regional_http_security.py::test_ca_09_consulta_aplica_alcance_y_permisos -q` |
| CA_10 | `test_planilla_regional_exportacion.py::test_ca_10_exporta_solo_estados_oficiales` | `B testing/backend/test_planilla_regional_exportacion.py::test_ca_10_exporta_solo_estados_oficiales -q` |
| CA_11 | `test_planilla_regional_legacy.py::test_ca_11_legacy_no_borra_automaticas` | `B testing/backend/test_planilla_regional_legacy.py::test_ca_11_legacy_no_borra_automaticas -q` |
| CA_12 | `test_planilla_regional_dominio.py::test_ca_12_fecha_resuelve_quincena` | `B testing/backend/test_planilla_regional_dominio.py::test_ca_12_fecha_resuelve_quincena -q` |
| CA_13 | `test_planilla_regional_persistencia.py::test_ca_13_cambio_no_identitario_conserva_item` | `B testing/backend/test_planilla_regional_persistencia.py::test_ca_13_cambio_no_identitario_conserva_item -q` |
| CA_14 | `test_planilla_regional_legacy.py::test_ca_14_antes_activacion_no_genera` | `B testing/backend/test_planilla_regional_legacy.py::test_ca_14_antes_activacion_no_genera -q` |
| CA_15 | `test_planilla_regional_legacy.py::test_ca_15_proyeccion_legacy_campos_faltantes` | `B testing/backend/test_planilla_regional_legacy.py::test_ca_15_proyeccion_legacy_campos_faltantes -q` |
| CA_16 | `test_planilla_regional_http_security.py::test_ca_16_agregados_y_exportacion_sin_fugas` | `B testing/backend/test_planilla_regional_http_security.py::test_ca_16_agregados_y_exportacion_sin_fugas -q` |
| CA_17 | `test_planilla_regional_dominio.py::test_ca_17_codigo_versionado_conserva_snapshot` | `B testing/backend/test_planilla_regional_dominio.py::test_ca_17_codigo_versionado_conserva_snapshot -q` |
| CA_18 | `test_planilla_regional_exportacion.py::test_ca_18_xlsx_columnas_formulas_y_allowlist` | `B testing/backend/test_planilla_regional_exportacion.py::test_ca_18_xlsx_columnas_formulas_y_allowlist -q` |
| CA_19 | `test_planilla_regional_erp.py::test_ca_19_snapshots_inmutables_tras_cambio_fuentes` | `B testing/backend/test_planilla_regional_erp.py::test_ca_19_snapshots_inmutables_tras_cambio_fuentes -q` |
| CA_20 | `test_planilla_regional_persistencia.py::test_ca_20_hooks_sin_commit_y_rollback_conjunto` | `B testing/backend/test_planilla_regional_persistencia.py::test_ca_20_hooks_sin_commit_y_rollback_conjunto -q` |

La suite `testing/backend/test_planilla_regional_erp.py` añade `test_erp_dsn_dedicada_es_distinta`, `test_erp_transaccion_read_only`, `test_erp_timeout_aplicado`, `test_erp_queries_allowlist`, `test_erp_resuelve_lote_sin_n_plus_one`, `test_erp_cierra_recursos_en_exito` y `test_erp_cierra_recursos_en_error`. Su comando es `B testing/backend/test_planilla_regional_erp.py -q`.

`testing/backend/test_planilla_regional_migracion.py` añade `test_catalogo_operativo_migra_ret_dxt_idempotente`. `test_ca_04_ausencias_reemplazan_salario` parametriza todas las novedades de reemplazo, incluido `DXT`; `test_dxt_genera_una_fila_dias_en_cc_contractual_sin_prorrateo_ot` verifica que varias OT no distribuyan DXT. El snapshot de CA_17 cubre que cambiar su codigo de salida no reescriba historicos.

## 13. Fuera De Alcance

- Escribir datos en el ERP.
- Recalcular cargas historicas.
- Eliminar el cargador Excel legacy.
- Activar biometria como fuente obligatoria en esta entrega.
- Aplicaciones moviles.
