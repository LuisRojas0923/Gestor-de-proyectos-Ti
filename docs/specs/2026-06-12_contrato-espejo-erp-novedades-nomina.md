# Contrato Espejo ↔ ERP — Decisiones de Nómina (Opción A)

## Estado

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-06-12 |
| **Ámbito** | Módulo Novedades de Nómina (portal) ↔ consultas ERP/SIIGO |
| **Fuente** | Código en `backend_v2/app/services/novedades_nomina/`, modelos ORM, macro Excel `macros/nomina/` |
| **Propósito** | Cerrar las 4 decisiones pendientes que no se pueden inferir del Excel ni del SQL del ERP |

---

## Resumen ejecutivo

| # | Pregunta | Decisión |
|---|----------|----------|
| 1 | Literales de concepto (HED, licencias, vacaciones) | Códigos cortos del Excel con prefijo de quincena en planillas (`1Q HED`, `2Q VAC`). No nombres largos tipo SIIGO. |
| 2 | ¿`categoria_final` filtra? | No. Es metadata. El filtro operativo es `subcategoria_final` + `estado_validacion`. |
| 3 | ¿Existe catálogo de archivos de carga? | Sí: tabla `nomina_archivos` con FK real en `archivo_id`. |
| 4 | ¿Quién calcula `estado_validacion`? | El portal al procesar la carga. ERP solo lectura (empleado activo). Excepciones = workflow del portal. |

---

## 1. Concepto textual exacto (horas extras y licencias)

### Pregunta

¿El portal usa los literales propuestos (`HED`, `HEN`, `LICENCIA REMUNERADA`, `VACACIONES DISFRUTADAS`, etc.) u otros textos?

### Respuesta

El portal **no** persiste descripciones largas de nómina externa. Usa **códigos cortos** tomados de la columna `NOVEDAD` del Excel regional, normalizados a mayúsculas.

En **Planillas Regionales 1Q/2Q**, el campo `concepto` de `nomina_registros_normalizados` se construye así:

```
concepto = "{quincena} {codigo_novedad}"
```

Ejemplos reales almacenados:

| Quincena | Código Excel (`NOVEDAD`) | Valor en `concepto` |
|----------|--------------------------|---------------------|
| 1Q | `HED` | `1Q HED` |
| 1Q | `HEN` | `1Q HEN` |
| 1Q | `HEFD` | `1Q HEFD` |
| 1Q | `HEFN` | `1Q HEFN` |
| 1Q | `HF` | `1Q HF` |
| 1Q | `RN` | `1Q RN` |
| 1Q | `RF` | `1Q RF` |
| 1Q | `VAC` | `1Q VAC` |
| 1Q | `INC` | `1Q INC` |
| 2Q | `HED` | `2Q HED` |
| … | … | `2Q {código}` |

Códigos documentados en el Excel histórico `5.Formulario Reporte de Novedades Regionales` (columna `NOVEDAD`):
`SALARIO`, `HED`, `HEN`, `HEFD`, `HEFN`, `HF`, `RN`, `RF`, `VAC`, `INC`, `CMP`, `PNR`, `RET`, `AUS`, `SAN`, `DXT`, `REM`, `LIC` (estos dos últimos en el módulo futuro de cálculo automático; en el Excel analizado predominan `VAC` e `INC`).

**No se usan** literales como:

- `HORA EXTRA DIURNA`
- `LICENCIA REMUNERADA` / `LIC REM`
- `LICENCIA NO REMUNERADA`
- `VACACIONES DISFRUTADAS` / `VAC DISFR`

### Reglas del extractor de planillas

- Archivo: `backend_v2/app/services/novedades_nomina/planillas_regionales_1q_extractor.py` (análogo `_2q_`).
- Columna origen: `NOVEDAD` (mayúsculas).
- Se **excluyen** de la carga 1Q/2Q: `AUS`, `CMP`, `PNR`, `RET` (no entran a `nomina_registros_normalizados` vía planillas).
- Horas y días vienen de `CANT. HORAS` y `CANTIDAD` respectivamente.

### Otros módulos (no planillas)

Para libranzas, cooperativas, descuentos, etc., `concepto` proviene del archivo fuente (PDF/Excel) o del nombre del proveedor. En esos casos el ERP debe filtrar preferentemente por `subcategoria_final` (ej. `DAVIVIENDA LIBRANZA`, `GRANCOOP`) y usar `concepto` como detalle.

### Contrato SQL recomendado para el ERP

```sql
-- ❌ INCORRECTO — devuelve 0 filas (auditoría silenciosa)
SELECT * FROM nomina_registros_normalizados
WHERE concepto = 'HED';

-- ✅ CORRECTO — horas extra diurnas en 1Q
SELECT *
FROM nomina_registros_normalizados
WHERE subcategoria_final = 'PLANILLAS REGIONALES 1Q'
  AND concepto = '1Q HED'
  AND mes_fact = :mes
  AND año_fact = :anio;

-- ✅ CORRECTO — vacaciones en cualquier quincena del periodo
SELECT *
FROM nomina_registros_normalizados
WHERE subcategoria_final IN ('PLANILLAS REGIONALES 1Q', 'PLANILLAS REGIONALES 2Q')
  AND concepto IN ('1Q VAC', '2Q VAC')
  AND mes_fact = :mes
  AND año_fact = :anio;

-- ✅ Alternativa flexible (con precaución por falsos positivos)
SELECT *
FROM nomina_registros_normalizados
WHERE subcategoria_final IN ('PLANILLAS REGIONALES 1Q', 'PLANILLAS REGIONALES 2Q')
  AND concepto ~ '^(1Q|2Q) (HED|HEN|HEFD|HEFN|HF|RN|RF)$';
```

### Catálogo de conceptos por modo

| Modo | Tabla | Formato `concepto` | Estado |
|------|-------|-------------------|--------|
| **Legacy — Planillas 1Q/2Q** | `nomina_registros_normalizados` | `{1Q\|2Q} {CÓDIGO}` | En producción |
| **Futuro — Cálculo automático HE** | `nomina_calculo_semanal` (spec 2026-06-01) | `HED`, `HEN`, `LIC`, `VAC`, … sin prefijo | No implementado aún |

El contrato Espejo debe documentar **ambos modos** cuando el módulo de horas extras entre en producción.

### Riesgo si se ignora

`WHERE concepto = 'HED'` → 0 registros → auditoría falla sin error visible.

---

## 2. ¿`categoria_final` se usa para filtrar o es solo metadata?

### Pregunta

¿El ERP debe filtrar por `categoria_final` (ej. excluir "carga manual") o dejarla como columna informativa?

### Respuesta

**Solo metadata.** Ningún servicio del portal aplica `WHERE categoria_final = ...`. El filtro operativo es **`subcategoria_final`**.

### Valores de `categoria_final` en producción

Se asignan al momento de la carga según el módulo:

| `categoria_final` | Ejemplos de `subcategoria_final` |
|-------------------|----------------------------------|
| `NOVEDADES` | `PLANILLAS REGIONALES 1Q`, `PLANILLAS REGIONALES 2Q` |
| `LIBRANZAS` | `BOGOTA LIBRANZA`, `DAVIVIENDA LIBRANZA`, `OCCIDENTE LIBRANZA` |
| `COOPERATIVAS` | `BENEFICIAR`, `GRANCOOP` |
| `DESCUENTOS` | `CELULARES`, `RETENCIONES`, `EMBARGOS`, `CONTROL DE DESCUENTOS` |
| `FUNEBRES` | `CAMPOSANTO`, `RECORDAR` |
| `OTROS` | `OTROS GERENCIA`, `POLIZAS VEHICULOS`, `SEGUROS HDI`, `MEDICINA PREPAGADA` |

No existe el literal `"carga manual"` en `categoria_final`. La distinción entre carga batch y registro manual se hace por:

- `archivo_id` → enlace a `nomina_archivos`
- `subcategoria_final` (ej. `OTROS GERENCIA` admite entrada manual vía JSON)
- `fila_origen = 0` en registros inyectados por excepciones

### Filtros que sí usa el portal (tabla maestra y macro Excel)

| Campo | Uso |
|-------|-----|
| `mes_fact`, `año_fact` | Periodo |
| `subcategoria_final` | Agrupación, reemplazo por periodo, consolidación |
| `estado_validacion` | Inclusión/exclusión en export |
| `concepto` | Detalle por fila; filtro de quincena en retenciones |

Referencias:

- `backend_v2/app/services/novedades_nomina/tabla_maestra_service.py`
- `macros/nomina/ModuloExtraccionPlanillas1Q2Q.bas`

### Contrato para el ERP

- **No filtrar** por `categoria_final`.
- **Sí filtrar** por `subcategoria_final`, `estado_validacion`, `mes_fact`, `año_fact`.
- Usar `categoria_final` solo para agrupación visual en Consulta de Novedades.

### Riesgo si se ignora

Filtrar o excluir por `categoria_final` puede omitir o incluir registros incorrectos; el portal nunca usa esa columna para lógica de negocio.

---

## 3. Catálogo de archivos de carga (`archivo_id`)

### Pregunta

¿Existe tabla catálogo para `archivo_id` o es un número sin FK?

### Respuesta

**Sí existe catálogo.** La tabla se llama **`nomina_archivos`** (no `nomina_archivo_carga`).
`nomina_registros_normalizados.archivo_id` tiene **FK** a `nomina_archivos.id`.

### Esquema `nomina_archivos`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | SERIAL PK | Identificador de carga |
| `nombre_archivo` | VARCHAR(255) | Nombre original del archivo |
| `hash_archivo` | VARCHAR(64) | MD5 del contenido (deduplicación) |
| `tamaño_bytes` | INT | Tamaño |
| `tipo_archivo` | VARCHAR(50) | `pdf`, `xlsx`, `xls`, `csv`, `json` |
| `ruta_almacenamiento` | VARCHAR(500) | Ruta en disco (`uploads/nomina/{hash}.{ext}`) |
| `mes_fact` | INT | Mes de facturación |
| `año_fact` | INT | Año de facturación |
| `categoria` | VARCHAR(100) | Categoría del módulo |
| `subcategoria` | VARCHAR(100) | Subcategoría del módulo |
| `estado` | VARCHAR(50) | `Cargado`, `Procesando`, `Procesado`, `Error` |
| `error_log` | VARCHAR | Detalle si `estado = Error` |
| `creado_en` | TIMESTAMP | Fecha/hora de carga |
| `actualizado_en` | TIMESTAMP | Última actualización |

Modelo: `backend_v2/app/models/novedades_nomina/nomina.py` → clase `NominaArchivo`.

### Tabla relacionada: `nomina_registros_crudos`

Payload JSON original por fila, también ligado a `archivo_id`. Útil para auditoría forense.

### API e UI existentes

| Recurso | Ruta |
|---------|------|
| Historial de cargas | `GET /api/v2/novedades-nomina/historial` |
| UI | `frontend/.../NOVEDADES_NOMINA/NominaHistorialView.tsx` |

Parámetros de filtro: `mes`, `año`, `subcategoria`, paginación (`skip`, `limit`).

### Consulta para “ver carga anterior / siguiente carga”

```sql
SELECT
    a.id,
    a.nombre_archivo,
    a.subcategoria,
    a.categoria,
    a.mes_fact,
    a.año_fact,
    a.estado,
    a.creado_en,
    COUNT(r.id) AS total_registros
FROM nomina_archivos a
LEFT JOIN nomina_registros_normalizados r ON r.archivo_id = a.id
WHERE a.subcategoria = :subcategoria
  AND a.mes_fact = :mes
  AND a.año_fact = :anio
GROUP BY a.id
ORDER BY a.creado_en DESC;
```

### Gap conocido

`nomina_archivos` **no tiene columna `usuario_id` / `creado_por`**. Para “quién cargó el archivo” hoy solo está `creado_en`. Si el ERP lo requiere, es una ampliación pendiente del modelo.

### Riesgo si se ignora

Sin el JOIN a `nomina_archivos`, la funcionalidad “Ver carga anterior/siguiente” del Módulo de Consulta no puede implementarse; el catálogo ya existe y está operativo.

---

## 4. ¿Quién calcula `estado_validacion`?

### Pregunta

¿El portal calcula automáticamente + workflow, o interviene ERP/SIIGO?

### Respuesta

**El portal calcula y persiste `estado_validacion` durante el procesamiento de cada carga.**
El ERP se consulta en **solo lectura** para validar existencia y estado del empleado (`ACTIVO` / retirado).
**SIIGO no escribe** ni actualiza `estado_validacion`.

### Flujo de cálculo

```
Archivo cargado
    → Extractor (por subcategoría)
    → Consulta bulk ERP (EmpleadosService.consultar_empleados_bulk)
    → Aplicación de excepciones (tabla nomina_excepciones)
    → Persistencia en nomina_registros_normalizados con estado_validacion
```

Implementación principal: `backend_v2/app/services/novedades_nomina/nomina_helper.py` → `persistir_registros_normalizados`.

### Estados automáticos (sin excepción manual)

| `estado_validacion` | Condición |
|---------------------|-----------|
| `OK` | Empleado encontrado en ERP con `estado = ACTIVO` |
| `SIN_ESTABLECIMIENTO` | Cédula no existe en ERP; `valor` se pone en 0 |
| `RETIRADO` | Empleado en ERP pero no `ACTIVO`; `valor` se pone en 0 |

### Estados por excepción (workflow del portal)

Configuradas en `nomina_excepciones` vía UI/API (`/api/v2/novedades-nomina/excepciones`):

| `estado_validacion` | Tipo excepción (`nomina_excepciones.tipo`) |
|---------------------|--------------------------------------------|
| `EXCEPCION_PAGO_TERCERO` | `PAGO_TERCERO` |
| `EXCEPCION_EXCLUIDO` | `EXCLUSION` |
| `EXCEPCION_VALOR_FIJO` | `VALOR_FIJO` |
| `EXCEPCION_EXONERADO` | `EXONERACION` |
| `EXCEPCION_PORCENTAJE_EMPRESA` | `PORCENTAJE_EMPRESA` |
| `ERROR_PORCENTAJE_NO_ACTIVO` | `PORCENTAJE_EMPRESA` sin empleado activo |
| `EXCEPCION_AUTORIZADA` | `RETIRADO_AUTORIZADO`, `CONTRATISTAS` |
| `EXCEPCION_SALDO_FAVOR` | `SALDO_FAVOR` |

Historial de aplicación: `nomina_excepciones_historial` (mes, año, valor_aplicado, mensaje).

### Estados auxiliares / legado

| Estado | Origen |
|--------|--------|
| `PENDIENTE` | Default del modelo; raro en registros procesados |
| `NO_CLASIFICADO` | Clasificador `NominaProcessor` sin match en `nomina_conceptos` |
| `NO_COINCIDE` | Validación de clasificación |
| `ADVERTENCIA` | Bucket de warnings en algunos routers |
| `Activo`, `REDIRECCIONADO`, `EXCEPCION` | Valores legados aún aceptados en filtros de export |

### Reglas de exportación (tabla maestra / ERP)

**Incluidos** en consolidación:

```
OK, Activo, REDIRECCIONADO, EXCEPCION, EXCEPCION_PAGO_TERCERO,
EXCEPCION_VALOR_FIJO, EXCEPCION_PORCENTAJE_EMPRESA,
EXCEPCION_AUTORIZADA, EXCEPCION_SALDO_FAVOR
```

**Excluidos**:

```
RETIRADO, SIN_ESTABLECIMIENTO, EXCEPCION_EXONERADO
```

### Contrato para UI de Consulta de Novedades (ERP)

- Leer `estado_validacion` y `observaciones` desde `nomina_registros_normalizados`.
- Para el motivo de `EXCEPCION_PAGO_TERCERO` y similares, consultar también `nomina_excepciones` (por `cedula` + `subcategoria`) y `nomina_excepciones_historial`.
- No esperar que SIIGO devuelva el estado de excepción; es responsabilidad del portal.

### Riesgo si se ignora

Si el ERP asume que SIIGO calcula excepciones, la UI no podrá explicar por qué un registro está en `EXCEPCION_PAGO_TERCERO` ni mostrar el workflow de autorización.

---

## Anexo A — Diccionario de columnas clave

| Columna | Tabla | Rol en contrato Espejo |
|---------|-------|------------------------|
| `concepto` | `nomina_registros_normalizados` | Código de novedad (con prefijo quincena en planillas) |
| `subcategoria_final` | `nomina_registros_normalizados` | **Clave principal de filtro** por tipo de carga |
| `categoria_final` | `nomina_registros_normalizados` | Metadata de agrupación superior |
| `estado_validacion` | `nomina_registros_normalizados` | Resultado de validación portal + excepciones |
| `horas`, `dias` | `nomina_registros_normalizados` | Solo poblados en planillas regionales |
| `archivo_id` | `nomina_registros_normalizados` | FK → `nomina_archivos.id` |
| `observaciones` | `nomina_registros_normalizados` | Texto libre / detalle de excepción |

---

## Anexo B — Subcategorías consolidadas en tabla maestra

Base (ambas quincenas):
`BOGOTA LIBRANZA`, `DAVIVIENDA LIBRANZA`, `OCCIDENTE LIBRANZA`, `BENEFICIAR`, `GRANCOOP`, `CAMPOSANTO`, `RECORDAR`, `OTROS GERENCIA`, `POLIZAS VEHICULOS`, `SEGUROS HDI`, `MEDICINA PREPAGADA`, `CONTROL DE DESCUENTOS`, `CELULARES`, `RETENCIONES`, `EMBARGOS`.

Condicional por quincena:

- Q1: + `PLANILLAS REGIONALES 1Q`
- Q2: + `PLANILLAS REGIONALES 1Q` + `PLANILLAS REGIONALES 2Q`

Excluidas de consolidación: `GESTION EXCEPCIONES`, `COMISIONES` (comisiones se inyectan aparte en Q1).

Fuente: `backend_v2/app/services/novedades_nomina/tabla_maestra_service.py`.

---

## Anexo C — Referencias de código

| Tema | Archivo |
|------|---------|
| Modelo archivos y registros | `backend_v2/app/models/novedades_nomina/nomina.py` |
| Cálculo `estado_validacion` | `backend_v2/app/services/novedades_nomina/nomina_helper.py` |
| Extractor planillas 1Q | `backend_v2/app/services/novedades_nomina/planillas_regionales_1q_extractor.py` |
| Extractor planillas 2Q | `backend_v2/app/services/novedades_nomina/planillas_regionales_2q_extractor.py` |
| Tabla maestra / filtros export | `backend_v2/app/services/novedades_nomina/tabla_maestra_service.py` |
| API historial archivos | `backend_v2/app/api/novedades_nomina/nomina_router.py` |
| Excepciones (workflow) | `backend_v2/app/api/novedades_nomina/routers/excepciones.py` |
| Macro Excel plano | `macros/nomina/ModuloExtraccionPlanillas1Q2Q.bas` |
| Esquema BD | `docs/ESQUEMA_BASE_DATOS.md` (tablas `nomina_*`) |
| Módulo futuro HE | `docs/specs/2026-06-01_modulo-horas-extras-novedades.md` |

---

## Historial de cambios

| Fecha | Autor | Cambio |
|-------|-------|--------|
| 2026-06-12 | Equipo portal (documentado desde código) | Respuestas iniciales Opción A — 4 decisiones Espejo↔ERP |
