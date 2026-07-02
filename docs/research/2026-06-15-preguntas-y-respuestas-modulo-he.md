# Módulo de Horas Extras — Preguntas y Respuestas (Q&A de trabajo)

**Fecha de apertura:** 2026-06-15
**Propósito:** Documento vivo de trabajo para resolver las decisiones pendientes del módulo de Horas Extras y Novedades antes de iniciar el Sprint S0. Cada pregunta se marca con su estado (`Pendiente`, `En análisis`, `Resuelta`).
**Origen:** Investigación legal + investigación técnica ERP.
**Estado global:** 🟢 23 resueltas / 🔴 0 pendientes / 🟠 0 en análisis. **🎉 Todas las preguntas cerradas.**

**Última actualización:** 2026-06-15 — Análisis del archivo Excel `11.Formulario Reporte de Novedades Regionales 6 DE JUNIO -20 DE JUNIO.xlsm` (regional CAMILA BAHOZ, 1Q de junio 2026). Se descubrió la hoja `Novedades` que ES el catálogo de reglas actual de la regional, y se confirman 4 decisiones de modelado (CMP-bolsa, OT/CC, catálogo, fuente OTs).

---

## Sección A — Parámetros legales (Ley 2466/2025 y CST)

### A1. ¿La jornada nocturna de 19:00-06:00 está vigente al 2026-06-15? ✅ RESUELTA

**Respuesta:** Sí (o prácticamente vigente según la fuente del usuario). La spec confirma este valor.

**Acción:** En el seed de `nomina_parametros_legales` para 2026-07-01 (próximo periodo), usar `hora_nocturna_inicio='19:00:00'`. Si se necesita un periodo de transición (regla 21:00-06:00 hasta fecha X), se crea una versión con `vigencia_hasta`.

**Fuente:** Spec del proyecto + confirmación del usuario en sesión 2026-06-15.

---

### A2. ¿Todos los parámetros legales deben ser configurables, incluso los de bolsa de horas? ✅ RESUELTA

**Respuesta:** **SÍ**. Todos los parámetros (incluyendo `bolsa_ratio_credito`, `bolsa_vigencia_semanas`, recargos, límites de HE, jornada) deben ser configurables desde la tabla `nomina_parametros_legales`. El sistema NO debe tener reglas hardcoded en el motor.

**Implicación:** El motor `calcular_horas_extras` lee **todos** sus parámetros de `nomina_parametros_legales`. No se permiten constantes literales en el código.

**Pendiente menor:** Definir la versión inicial (semilla) de cada parámetro. Valores por defecto sugeridos:

| Parámetro | Default propuesto | Fuente |
|---|---|---|
| `jornada_semanal_h` | 42 (vigente desde 16-jul-2026) | Ley 2101/2021 + Ley 2466/2025 |
| `recargo_dominical_pct` | 80 (jul25-jun26) | Ley 2466/2025 art. 25 |
| `recargo_nocturno_pct` | 35 | CST art. 160 |
| `hora_nocturna_inicio` | 19:00 | Ley 2466/2025 |
| `hora_nocturna_fin` | 06:00 | Ley 2466/2025 |
| `limite_he_diario_min` | 120 | CST art. 167A |
| `limite_he_semanal_min` | 720 (12 h) | Recomendación operativa (ver A3) |
| `bolsa_ratio_credito` | 1.5 | A confirmar (ver A4) |
| `bolsa_vigencia_semanas` | 4 | Ley 2466/2025 (provisional) |

---

### A3. ¿El límite semanal de 12 h de HE (720 min) es regla legal o recomendación operativa? ✅ RESUELTA

**Respuesta:** **Es regla legal.** Confirmado por el usuario en sesión 2026-06-15.

**Justificación legal:** El CST art. 167A establece el tope de **2 horas extras diarias**. En Colombia la jornada ordinaria se distribuye típicamente en **6 días a la semana** (lunes a sábado). Por aritmética legal:

```
2 h/día × 6 días/sem = 12 h/sem  →  720 min/sem
```

Este es un **tope semanal derivado** de la aplicación de la regla diaria sobre la jornada típica colombiana, no un artículo independiente del CST. La spec debe documentarlo así: "12 h/sem derivado de 2 h/día × 6 días (jornada ordinaria en Colombia)".

**Implicación para el motor:**

- Mantener `limite_he_diario_min=120` (2 h/día) como regla legal primaria.
- Mantener `limite_he_semanal_min=720` (12 h/sem) como regla legal derivada.
- Ambos aplican como `WARNING` (no bloquean el cálculo, igual que el Excel actual).
- Si la empresa tiene jornada de **5 días** (lunes a viernes), el límite semanal derivado sería 10 h/sem — esto NO aplica como regla, porque la empresa trabaja 6 días. **El parámetro queda en 12 h/sem por defecto**.

**Acción:** Confirmar en la spec que ambos límites son regla legal. Marcar como "derivado de art. 167A CST aplicado a jornada de 6 días".

---

### A4. ¿La bolsa de horas con ratio 1.5:1 viene de la Ley 2466/2025 o es política interna de la empresa? ✅ RESUELTA

**Respuesta (confirmada por el usuario en sesión 2026-06-15):**
**La bolsa de horas debe ser totalmente parametrizable.** Esto aplica para:
- `bolsa_ratio_credito` (default 1.5)
- `bolsa_vigencia_semanas` (default 4)
- Cualquier otro parámetro futuro que la empresa quiera configurar

**Implementación:** Todos los parámetros de la bolsa de horas viven en `nomina_parametros_legales` y son versionados (`vigencia_desde` / `vigencia_hasta`). El motor `bolsa_horas_service` los lee en runtime — no hay constantes hardcoded.

**Pendiente menor:** Validar con RRHH si la empresa ya tiene una convención colectiva que establezca un ratio distinto a 1.5:1. Si es así, ajustar el valor inicial del seed.

---

### A5. ¿Cuál es la jornada semanal vigente en Colombia en 2026? ✅ RESUELTA

**Respuesta (confirmada por el usuario en sesión 2026-06-15):**
**La jornada semanal debe ser totalmente parametrizable.** Esto aplica para:
- `jornada_semanal_h` (valor legal vigente)
- Cualquier otro parámetro de jornada

**Implementación:** `jornada_semanal_h` vive en `nomina_parametros_legales` y es versionado. El motor lo lee en runtime.

**Semilla propuesta (basada en la spec del 2026-06-01, sin contradecir al usuario):**

| Periodo | `vigencia_desde` | `jornada_semanal_h` | `vigencia_hasta` | Fuente |
|---|---|---|---|---|
| 2026 H1 | 2026-01-01 | 44 | 2026-07-15 | Ley 2466/2025 (transitorio) |
| 2026 H2 | 2026-07-16 | 42 | NULL (vigente) | Ley 2101/2021 + Ley 2466/2025 |

Si el usuario confirma más adelante que la jornada ya es 42h desde antes, ajustamos el seed. Por ahora, esta tabla representa la lectura de la spec.

---

### A6. ¿Cómo se manejan los trabajadores de dirección/confianza/manejo? (CST art. 162) ✅ RESUELTA (gracias al descubrimiento de B1)

**Respuesta:** El ERP ya tiene el flag `beneficio.autorizacionhorasextras` que indica si el empleado puede recibir HE. La empresa usa este flag en lugar de inferirlo por el nombre del cargo.

**Regla del motor (ver B3):** Si el flag es `FALSE`, no se calculan HE pero SÍ se calculan los recargos (nocturno, dominical/festivo) sobre la jornada ordinaria. Esto es coherente con CST art. 162 (no tienen derecho a HE) y la jurisprudencia (sí tienen derecho a recargo nocturno y dominical).

**No se requiere:**
- Campo `aplica_he` en `nomina_horario_pactado` (el flag se consulta en runtime del ERP).
- Lógica de inferencia por nombre de cargo.
- Catálogo local de "tipos de cargo".

**Sí se requiere:**
- Documentar en la spec que la decisión viene del ERP.
- El endpoint `/api/v2/horas-extras/empleado/{cedula}/autorizado` debe cachear la respuesta del ERP (no consultar en cada cálculo) para no degradar performance.

---

## Sección B — Integración con ERP (Solid ERP)

### B1. ¿En qué tabla y campo del ERP está el flag "autorizado para horas extras"? ✅ RESUELTA

**Respuesta:** El campo está en la tabla **`beneficio`**, NO en `contrato` ni en `establecimiento` como pensábamos inicialmente.

**Campo:** `beneficio.autorizacionhorasextras` (boolean, nullable).

**Descubrimiento (consulta directa a `192.168.0.21:5432/solidpruebas3` el 2026-06-15):**

| Tabla | Campo | Tipo | Nullable | Notas |
|---|---|---|---|---|
| `establecimiento` | (ninguno relacionado con HE) | — | — | Solo datos personales del empleado |
| `contrato` | (ninguno relacionado con HE) | — | — | Solo datos del contrato |
| **`beneficio`** | **`autorizacionhorasextras`** | **BOOLEAN** | NULL | **Fuente de verdad** |
| `beneficio` | `autorizacionrodamiento` | BOOLEAN | NULL | (relevante también, mismo patrón) |
| `beneficio` | `salario` | DOUBLE PRECISION | NULL | Útil para auditoría del cálculo |
| `beneficio` | `fechainicio` | DATE | NOT NULL | Vigencia desde |
| `beneficio` | `fechafin` | DATE | NOT NULL | Vigencia hasta (puede ser futura) |

**Relación entre tablas (validada con datos reales):**

```
establecimiento                       contrato                          beneficio
┌──────────────┐                      ┌──────────────────┐              ┌────────────────────────┐
│ nrocedula ◄──┼──────────────────────┼─ establecimiento │              │ contrato                │
│              │                      │ numerocontrato ──┼──────────────┤► autorizacionhorasextras│
│              │                      │ codigo           │              │ salario                 │
│              │                      │ estado           │              │ fechainicio / fechafin  │
└──────────────┘                      │ cargo, area...   │              └────────────────────────┘
                                      └──────────────────┘
```

- `beneficio.contrato` (TEXT) referencia a `contrato.numerocontrato` (TEXT) — formato `cedula-N` (e.g. `1042355367-3`).
- `contrato.establecimiento` (TEXT) referencia a `establecimiento.nrocedula` (TEXT).
- **No usar `contrato.codigo` ni `beneficio.codigo` para JOIN** — son SERIAL internos.

**Distribución actual (354 beneficios vigentes en pruebas3):**

| `autorizacionhorasextras` | n |
|---|---|
| `TRUE` | 206 |
| `FALSE` | 148 |

**Validación con caso real:**

| Cédula | Nombre | Cargo | `autorizacionhorasextras` |
|---|---|---|---|
| `1004343552` | **BAHOZ BOLAÑOS ASTRID CAMILA** | COORDINADOR ADMINISTRATIVO ADN | **`FALSE`** |

> **¡Es la regional del Excel original!** Su flag es FALSE, lo que confirma que la lógica de la spec (no pagar HE a coordinadores) es coherente con el ERP.

**Caso de flag variable entre contratos:** El flag PUEDE cambiar entre contratos del mismo empleado (verificado: `VASQUEZ MOSQUERA ANDRES FELIPE` tiene un contrato con `TRUE` y otro con `FALSE`). **Regla:** tomar el flag del **contrato vigente** (más reciente por `fechainicio`).

**Implicación para la spec:** NO se necesita lógica de "inferir si es dirección/confianza/manejo por nombre de cargo". El flag del ERP es la fuente de verdad. La pregunta A6 queda resuelta automáticamente.

---

### B2. ¿Qué endpoint(s) del backend deben devolver el flag `autoriza_he`? ✅ RESUELTA

**Respuesta:** Todos los endpoints que devuelven datos de empleados del ERP deben incluir el flag, ya que es relevante para:
- Búsqueda de empleados (filtrar autorizados para HE).
- Cálculo de HE (si no está autorizado, no se calculan HE).
- UI de registro de marcas (mostrar advertencia si la marca genera HE para un empleado no autorizado).

**Endpoints afectados:**

| Endpoint actual | Acción |
|---|---|
| `EmpleadosService.obtener_empleado_por_cedula` (`backend_v2/app/services/erp/empleados_service.py:9`) | Añadir `LEFT JOIN beneficio B ON TRIM(B.contrato) = TRIM(C.numerocontrato) AND (B.fechafin IS NULL OR B.fechafin >= CURRENT_DATE)` y seleccionar `B.autorizacionhorasextras AS "autoriza_he"` y `B.salario AS "salario_base"`. |
| `EmpleadosService.consultar_empleados_bulk` (`:60`) | Igual al anterior pero conservando el `DISTINCT ON`. |
| `GET /api/v2/empleados/buscar` (router) | Pasar el flag al response. |
| `GET /api/v2/lineas-corporativas/alertas` (router) | **No requiere cambio** (es para alertas de inactividad, no HE). |

**Nuevo query propuesto para `obtener_empleado_por_cedula`:**

```sql
SELECT DISTINCT ON (E.nrocedula)
    E.nrocedula,
    E.nombre,
    C.cargo,
    C.area,
    C.estado,
    C.empresa,
    C.ciudadcontratacion,
    E.viaticante,
    E.baseviaticos,
    C.centrocosto,
    C.jefe,
    C.fecharetiro,
    E.correocorporativo,
    -- NUEVOS CAMPOS
    B.autorizacionhorasextras AS "autoriza_he",
    B.salario                AS "salario_base",
    B.fechainicio            AS "beneficio_vigente_desde",
    B.fechafin               AS "beneficio_vigente_hasta"
FROM establecimiento E
LEFT JOIN contrato C
    ON TRIM(CAST(C.establecimiento AS TEXT)) = TRIM(CAST(E.nrocedula AS TEXT))
    {estado_filtro}
LEFT JOIN beneficio B
    ON TRIM(CAST(B.contrato AS TEXT)) = TRIM(CAST(C.numerocontrato AS TEXT))
    AND (B.fechafin IS NULL OR B.fechafin >= CURRENT_DATE)
WHERE TRIM(E.nrocedula) = :cedula
ORDER BY E.nrocedula, C.fechainicio DESC NULLS LAST
```

**Nuevo endpoint propuesto (S2 del plan):**

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/v2/horas-extras/empleado/{cedula}/autorizado` | GET | Devuelve `{autorizado: bool, fuente: 'ERP'\|'NO_AUTORIZADO', motivo?: str}` |

---

### B3. ¿Cómo manejar el caso de un empleado que la ley excluye de HE pero el ERP lo marca como autorizado? ✅ RESUELTA (gracias al descubrimiento de B1)

**Respuesta:** El flag del ERP es **la única fuente de verdad** para "el empleado puede recibir HE". La ley colombiana (CST art. 162) y la lógica interna de la empresa se reflejan en este flag.

**Regla del motor:**

```python
# En el servicio calculo_horas_service.py
def calcular_horas_extras(marca, horario, parametros, empleado):
    resultado = {
        "minutos_ordinarios": 0,
        "minutos_hed": 0,
        "minutos_hen": 0,
        "minutos_hefd": 0,
        "minutos_hefn": 0,
        "minutos_hf": 0,    # Recargo festivo
        "minutos_rn": 0,    # Recargo nocturno
        "minutos_rf": 0,    # Recargo festivo nocturno
    }

    # 1. SIEMPRE calcular minutos ordinarios y recargos (rango de jornada)
    # 2. SOLO si el empleado está autorizado, calcular HE
    if empleado.autoriza_he:
        # cortar contra horario, detectar tramo nocturno, festivo, etc.
        # ... (motor puro)
        pass
    else:
        # Warning: empleado no autorizado para HE
        resultado["warnings"] = [{
            "codigo": "EMPLEADO_NO_AUTORIZADO_HE",
            "detalle": f"Empleado {empleado.nombre} no autorizado para HE según ERP"
        }]
        # Los minutos ordinarios SÍ se computan, los recargos también
        # Las HE (HED/HEN/HEFD/HEFN) se quedan en 0

    return resultado
```

**Pendiente menor:** Definir si el "no autorizado" debe ser un **WARNING** (visible en UI) o un **ERROR** (bloquea el cálculo). Recomendación: **WARNING** por ahora, alineado con la política de la spec de no bloquear por excepciones.

---

### B2. ¿Qué endpoint(s) del backend deben devolver el flag `autoriza_he`? ✅ RESUELTA (parcial)

**Respuesta:** Todos los endpoints que devuelven datos de empleados del ERP deben incluir el flag, ya que es relevante para:
- Búsqueda de empleados (filtrar autorizados para HE).
- Cálculo de HE (si no está autorizado, no se calculan HE).
- UI de registro de marcas (mostrar advertencia si la marca genera HE para un empleado no autorizado).

**Endpoints afectados:**

| Endpoint actual | Acción |
|---|---|
| `EmpleadosService.obtener_empleado_por_cedula` | Añadir `autoriza_he` al SELECT y al dict retornado |
| `EmpleadosService.consultar_empleados_bulk` | Añadir `autoriza_he` al SELECT y al dict retornado |
| `GET /api/v2/empleados/buscar` (router) | Pasar el flag al response |
| `GET /api/v2/lineas-corporativas/alertas` (router) | **No requiere cambio** (es para alertas de inactividad, no HE) |

**Nuevo endpoint propuesto (S2 del plan):**

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/v2/horas-extras/empleado/{cedula}/autorizado` | GET | Devuelve `{autorizado: bool, fuente: 'ERP'\|'ESPECIAL', motivo?: str}` |

---

### B3. ¿Cómo manejar el caso de un empleado que la ley excluye de HE pero el ERP lo marca como autorizado? 🔴 PENDIENTE

**Escenario:** Un empleado de dirección/confianza/manejo (excluido por CST art. 162) que en el ERP tiene `autoriza_he='S'`.

**Opciones:**
- **A.** El campo del ERP tiene prioridad (se le calculan HE).
- **B.** La ley tiene prioridad (no se le calculan HE, se ignora el campo del ERP).
- **C.** Se calcula solo el recargo nocturno y dominical (que sí aplica), pero NO las HE.

**Recomendación inicial:** **C** — el campo del ERP solo aplica para los cargos que legalmente SÍ tienen derecho a HE. Si el cargo es dirección/confianza/manejo, el campo del ERP se ignora para HE (pero se mantiene como informativo).

**Pendiente:** Validar con RRHH o con el abogado laboralista de la empresa.

---

## Sección C — Novedades no-HE (REM, LIC, INC, VAC, PNR, RET, CMP, ARL, AUS, SAN, DXT)

### C1. ¿El módulo calcula reglas de INC/ARL/AUS/SAN/PNR/RET, o solo registra días crudos? ✅ RESUELTA

**Decisión del usuario 2026-06-15:** **Solo registra días crudos.** SIIGO aplica las reglas legales para pagar.

**Implicaciones:**

- ✅ El módulo guarda los días reportados por la regional (1 fila por día con `cantidad` y `cantidad_horas`).
- ❌ **NO** se calcula INC con prorrateo 2/180/360, ni ARL 100%/ARL, ni descuentos AUS/SAN/PNR.
- ❌ **NO** se crea la tabla `nomina_reglas_prorrateo`.
- ❌ **NO** se añade el campo `tipo_calculo` en `nomina_novedad_registro`.
- ✅ El motor entrega **minutos crudos** a SIIGO; SIIGO aplica las reglas legales para el pago real.
- ✅ La pre-liquidación con costo por OT (Sección H) **tampoco** aplica reglas de INC/ARL — usa `cantidad × valor_hora_ordinaria` para todos los conceptos (es estimación interna, no pago real).

**Justificación de la decisión:**
- SIIGO es la fuente de verdad para el pago. Replicar reglas legales en el módulo = riesgo de drift (el motor podría divergir de la ley si esta cambia).
- El módulo se enfoca en su valor diferencial: cálculo de HE/recargos, bolsa de horas, costos por OT.
- Para auditoría interna, el reporte "minutos por concepto" es suficiente; el detalle del % aplicado por ley vive en SIIGO.

**Reglas de liquidación (referencia, NO implementadas en el módulo):**

| Novedad | Cálculo legal | Base legal | Módulo hace... |
|---|---|---|---|
| REM (remunerado) | días × 480 min, 100% | Art. 57 CST | Registra días |
| LIC (licencia remunerada) | días × 480 min, 100% | Convención / pacto | Registra días |
| INC (incapacidad) | 2 días 100% empleador; 3-90 66.67% EPS; 91-180 50% empleador; 181-540 50% EPS | Ley 100/1993 art. 206 | Registra días |
| VAC (vacaciones) | días × 480 min, 100% | CST art. 186 | Registra días |
| PNR (permiso no remunerado) | 0 min, no se liquida | Pacto | Registra días (valor 0) |
| RET (retiro) | Liquidación final prorrateada | CST art. 64 | Registra días |
| CMP (compensatorio) | 0 min (ya compensado con tiempo) | Ley 2466/2025 (ver A4) | Registra + descuenta de bolsa (ver I6) |
| ARL | 2 días 100% empleador; 3+ 100% ARL | Ley 100/1993 art. 206 | Registra días |
| AUS (ausencia) | 0 min, descuento | Reglamento interno | Registra días |
| SAN (sanción) | 0 min, descuento | Reglamento interno | Registra días |
| DXT (descanso) | 100% si es descanso remunerado pactado | CST art. 172-173 | Registra días |
| SALARIO | días × 480 min, 100% (es el día base) | N/A — no es novedad | Registra días |

---

### C2. ¿La unidad "HORAS" aplica para HED/HEN/HEFD/HEFN/HF/RN/RF y la unidad "DIAS" para el resto? 🟠 EN ANÁLISIS

**Estado:** La spec actual dice que la unidad depende del tipo. **Correcto para HE/recargos**. Pero:

- **HF (Hora Festiva)** es un recargo, no una novedad. Debe calcularse automáticamente a partir de la marca, no registrarse manualmente.
- **RN (Recargo Nocturno)** es un recargo. Igual.
- **REM/LIC/INC/VAC/PNR/RET/CMP/ARL/AUS/SAN/DXT** son novedades en días, registradas manualmente por el responsable regional.

**Recomendación:** Mantener la unidad `HORAS` para HE (HED, HEN, HEFD, HEFN) y `DIAS` para el resto. Los recargos HF, RN, RF NO se registran manualmente — se calculan automáticamente a partir de la marca y el horario pactado.

**Implicación para la spec:** El campo `tipo_novedad` debe distinguir:
- `HED | HEN | HEFD | HEFN` → unidad HORAS, **opcionalmente manuales** (si el responsable quiere corregir un cálculo automático).
- `HF | RN | RF` → NO se registran manualmente, solo se calculan.
- `REM | LIC | INC | VAC | PNR | RET | CMP | ARL | AUS | SAN | DXT | SALARIO` → unidad DIAS, manuales.

---

## Sección D — Festivos (Ley Emiliani y Calendarific)

### D1. ¿Cuál es la lista canónica de festivos 2026? ✅ RESUELTA

**Respuesta (confirmada por el usuario en sesión 2026-06-15):**
- **Fuente primaria:** API de **Calendarific** (configurada vía `CALENDARIFIC_API_KEY` en `.env`).
- **Fallback:** Tabla hardcodeada de la **Ley Emiliani** (Ley 51 de 1983) en `nomina_festivo_calendario`.

**Arquitectura de la solución:**

```
GET /novedades-nomina/festivos/{anio}
        │
        ├─ 1. ¿Hay CALENDARIFIC_API_KEY configurada?
        │     ├─ SÍ → GET https://calendarific.com/api/v2/holidays?country=CO&year={anio}
        │     │        ├─ 200 OK → retornar festivos de Calendarific
        │     │        └─ Error/timeout → LOG warning + ir a paso 2
        │     └─ NO → ir a paso 2
        │
        ├─ 2. Buscar en nomina_festivo_calendario WHERE anio = {anio}
        │     ├─ Hay registros → retornar (fallback Ley Emiliani)
        │     └─ No hay registros → 404 con mensaje "Sin festivos para {anio}"
        │
        └─ 3. Si Calendarific OK, persistir/actualizar nomina_festivo_calendario con fuente='CALENDARIFIC'
```

**Lista tentativa 2026 (19 festivos según Wikipedia, en orden cronológico):**

| # | Fecha (2026) | Día semana | Festivo | Carácter |
|---|---|---|---|---|
| 1 | 1 enero | jueves | Año Nuevo | Civil fijo |
| 2 | 12 enero | lunes | Epifanía (Reyes Magos) | Religioso móvil |
| 3 | 23 marzo | lunes | San José | Religioso móvil |
| 4 | 2 abril | jueves | Jueves Santo | Religioso (litúrgico) |
| 5 | 3 abril | viernes | Viernes Santo | Religioso (litúrgico) |
| 6 | 1 mayo | viernes | Día del Trabajo | Civil fijo |
| 7 | 18 mayo | lunes | Ascensión de Jesús | Religioso móvil |
| 8 | 8 junio | lunes | Corpus Christi | Religioso móvil |
| 9 | 15 junio | lunes | Sagrado Corazón | Civil móvil |
| 10 | 29 junio | lunes | San Pedro y San Pablo | Religioso móvil |
| 11 | 13 julio | lunes | Virgen de Chiquinquirá | Religioso móvil |
| 12 | 20 julio | lunes | Independencia Nacional | Civil fijo |
| 13 | 7 agosto | viernes | Batalla de Boyacá | Civil fijo |
| 14 | 17 agosto | lunes | Asunción de la Virgen | Religioso móvil |
| 15 | 12 octubre | lunes | Diversidad Étnica y Cultural | Civil móvil |
| 16 | 2 noviembre | lunes | Todos los Santos | Religioso móvil |
| 17 | 16 noviembre | lunes | Independencia de Cartagena | Civil móvil |
| 18 | 8 diciembre | martes | Inmaculada Concepción | Religioso fijo |
| 19 | 25 diciembre | viernes | Navidad | Religioso fijo |

**Pendiente menor:** Resolver la inconsistencia 18 vs 19 festivos. Calendarific es la verdad; el fallback Ley Emiliani debe coincidir con lo que Calendarific devuelva para no tener drift.

**Pendiente operativo:** Confirmar si la empresa tiene `CALENDARIFIC_API_KEY` configurada en `.env` o si la estrategia inicial es "solo fallback Ley Emiliani" hasta obtener la key.

---

## Sección H — 🆕 Pre-liquidación y análisis de costos por OT (NUEVO alcance)

**Origen:** Feedback del usuario en sesión 2026-06-15. El módulo no solo debe entregar minutos a SIIGO, también debe permitir **pre-liquidar la nómina** y **relacionar los costos con las Órdenes de Trabajo (OT)**.

**Caso de uso:**

> El analista de presupuesto necesita responder: "¿Cuánto le cuesta a la empresa esta OT esta semana en mano de obra?" o "¿Esta OT está sobrecargando el presupuesto? ¿Hay demasiada gente o muy pocas horas extra?"

**Implicaciones para el alcance original:**

| Antes (spec 2026-06-01) | Ahora (sesión 2026-06-15) |
|---|---|
| NO calcula COP | SÍ calcula COP para pre-liquidación (capa separada del motor puro) |
| No se relaciona con OT | SÍ se relaciona con OT via `ot_cc_id` (ya existe en spec para `marca` y `novedad`) |
| Output: minutos por concepto | Output dual: (1) minutos para SIIGO, (2) pre-liquidación COP por OT |
| 8 tablas nuevas | ~10 tablas nuevas (añadir `nomina_reglas_prorrateo` y `nomina_costo_ot`) |

### H1. ¿Qué es una OT, cómo se identifica y tiene campo de presupuesto? ✅ RESUELTA

**Respuesta (descubrimiento en BD pruebas3 el 2026-06-15):**

La "BASE DE DATOS GENERAL" mencionada por el usuario **es una tabla real en el ERP**, no solo un Excel en la NAS. Se llama **`public.basegeneralcostos`** y tiene 40.535 filas en pruebas3. Esta tabla es la **fuente de verdad** para los datos de OT, M.O. y presupuestos.

**Tabla: `basegeneralcostos` (40.535 filas en pruebas3)**

| Columna | Tipo | Ejemplo | Significado |
|---|---|---|---|
| `op` | TEXT | `2-14622-200` | Código compuesto: `b - orden - sub_indice` |
| `orden` | TEXT | `14622` | **Identificador de la OT** (varchar, no int) |
| `orden_vieja_nueva` | TEXT | `NUEVA` / `VIEJA` | Indica si la OT fue migrada |
| `clasificacion_de_la_orden` | TEXT | `FACT` / `PROYECTO` / `ADICIONALES` / `SUMINISTRO` / `CORT` / `ANUL` / `EN PROC` / `OT PLANTA` / `GAR_*` | Clasificación comercial |
| `cc` | TEXT | `3020` | **Centro de costo** |
| `scc` | TEXT | `20` | **Subcentro de costo** |
| `b` | TEXT | `2` | Negocio / unidad de negocio (B2, B3) |
| `especialidad` | TEXT | `FREON` / `GENERALES` | Especialidad técnica |
| `sub_indice` | TEXT | `200` | **Sub-índice** contable |
| `estado` | TEXT | `TERMINADO` | Estado de la OT |
| `categoria_sub_indice` | TEXT | `MANO DE OBRA` / `CONTRATO - M.O` / `PRODUCE` / `FACTURA` / `CONTRATO` | **🔑 Campo M.O. que el usuario recordaba** |
| `cliente` | TEXT | `ALMACENES EXITO` | Cliente |
| `vr_contratado` | DOUBLE PRECISION | `17200000.0` | **💰 Presupuesto contratado de la OT** |
| `descripcion` | TEXT | `MANTENIMIENTO PREVENTIVO MENSUAL OCTUBRE 2022.` | Descripción de la OT |
| `apertura_siigo` | TEXT | `2022-10-07` | Fecha apertura en SIIGO |
| `cierre_siigo` | TEXT | `2022-11-10` | Fecha cierre en SIIGO |
| `ingeniero` | TEXT | `—` | Ingeniero responsable |
| `fuente` | TEXT | `BASE_GENERAL` | Origen (constante) |

**El campo M.O. (Mano de Obra) — `categoria_sub_indice`:**

| Valor | # filas | # OTs únicas | Significado |
|---|---|---|---|
| `CONTRATO - M.O` | 2.343 | 2.161 | **M.O. bajo contrato** (la "M.O" que el usuario recordaba) |
| `MANO DE OBRA` | 6.886 | 5.224 | M.O. general (sin contrato explícito) |
| `PRODUCE` | 6.665 | — | Producción de planta |
| `CONTRATO` | 6.081 | — | Contrato comercial |
| `FACTURA` | 5.728 | — | Facturación |
| `CONTRATO - M.O` + `MANO DE OBRA` | 9.229 | 7.385 | **Total M.O.** |

**Cross-check con presupuesto de M.O.:**

| Estado presupuesto | # OTs M.O. (`CONTRATO - M.O`) |
|---|---|
| Con `vr_contratado > 0` | 2.033 |
| Sin presupuesto (`vr_contratado = 0` o NULL) | 310 |

**Para el módulo de pre-liquidación con costo por OT:**

- **JOIN principal** (semana × OT):
  ```sql
  SELECT
      B.orden              AS ot_id,
      B.cc                 AS centro_costo,
      B.scc                AS subcentro_costo,
      B.sub_indice         AS subindice,
      B.categoria_sub_indice AS mo_clasificacion,
      B.vr_contratado      AS presupuesto_cop,
      B.cliente,
      B.descripcion
  FROM basegeneralcostos B
  WHERE B.categoria_sub_indice IN ('CONTRATO - M.O', 'MANO DE OBRA')  -- solo M.O.
    AND B.orden ~ '^[0-9]+$'  -- solo OTs con orden numérica
  ```

- **Cálculo de % consumido por la semana:**
  ```
  %_consumido_semana = (SUM(costo_total_cop) de la semana para esa OT) / vr_contratado * 100
  ```

- **Alerta de sobrecosto:** si `%_consumido_acumulado > 100%` → alerta amarilla; `> 120%` → alerta roja.

**Tablas relacionadas (para referencia, no como fuente primaria):**

| Tabla | Filas | Propósito |
|---|---|---|
| `basegeneralcostos` | 40.535 | **FUENTE PRIMARIA** de OT/M.O./presupuesto |
| `otsistemasolicitudes` | 856 | Catálogo auxiliar de OTs (sistema) |
| `ordeninternatrabajo` | — | OT internas de producción |
| `ordentrabajobdmemoficha` | 993 | Join OT ↔ memoficha |
| `lineasolicitudmaterial` | — | Líneas de solicitud de material (tiene `subindice`, `centrocosto`, `subcentrocosto`) |

**Implicación para la spec del módulo HE:**

- `nomina_horario_pactado.ot_cc_id` debe corresponderse con `basegeneralcostos.orden` (campo TEXT).
- El `ot_cc_id` es la **llave de unión** entre el módulo de HE/novedades y el módulo de costos por OT.
- La **pregunta del usuario "¿el campo de M.O. registra subindice, subcentro y centro de costo?"** queda respondida: **SÍ**, todos están en `basegeneralcostos` (`cc`, `scc`, `sub_indice`), y se accede filtrando por `categoria_sub_indice IN ('CONTRATO - M.O', 'MANO DE OBRA')`.

### H2. ¿Cómo se compone el costo de mano de obra? (factor prestacional) ✅ RESUELTA

**Decisión del usuario 2026-06-15:** **Por nivel de riesgo ARL (3 niveles: operativo, administrativo, dirección).**

**Componentes del costo empresa (Colombia):**

| Concepto | % sobre salario | Notas |
|---|---|---|
| Salario base | 100% | `beneficio.salario` |
| Salud (EPS) | 8.5% | Empleador |
| Pensión (AFP) | 12% | Empleador |
| **ARL** | **0.522% – 6.96%** | **Depende del nivel de riesgo** ← variabilidad clave |
| Caja de compensación | 4% | Empleador |
| SENA | 2% | Si aplica (empleadores > 1 SMLMV) |
| ICBF | 3% | Si aplica |
| Prima de servicios | 8.33% | 1 mes al año |
| Cesantías | 8.33% | 1 mes al año |
| Intereses sobre cesantías | 1% | Anual |
| Vacaciones | 4.17% | 15 días hábiles al año |
| **Carga prestacional (rango)** | **~50% – 56%** | **Según nivel de riesgo ARL** |

**Costo empresa = Salario × (1 + factor_prestacional / 100)**

**Descubrimiento en ERP (2026-06-15):**

| Tabla | Campo | Tipo | Descubrimiento |
|---|---|---|---|
| `contrato` | `riesgoarl` | `DOUBLE PRECISION` | Porcentaje de riesgo ARL (no nivel entero) |
| `contrato` | `arl` | `TEXT` | Nombre de la ARL (SURA, BOLIVAR, POSITIVA, etc.) |

**Valores distintos en pruebas3 (3.554 contratos con riesgo):**

| `riesgoarl` | Nivel ARL real | # Contratos | Categoría módulo |
|---|---|---|---|
| 0.522 | **Nivel I** (Riesgo Mínimo) | 522 | Operativo |
| 0.522 | (variante) | 129 | Operativo |
| 1.044 | **Nivel II** (Riesgo Bajo) | 61 | Operativo |
| 2.436 | **Nivel III** (Riesgo Medio) | 465 | Administrativo |
| 2.440 | (variante) | 117 | Administrativo |
| 4.350 | **Nivel IV** (Riesgo Alto) | 93 | Dirección |
| **6.960** | **Nivel V** (Riesgo Máximo) | **2.338** | Dirección |

**Mapeo al modelo de 3 niveles del módulo:**

| Categoría módulo | Niveles ARL incluidos | Factor prestacional default | % ARL usado en cálculo |
|---|---|---|---|
| **Operativo** (I, II) | Riesgo mínimo + bajo | **50%** | 1.044% (peor caso del rango) |
| **Administrativo** (III) | Riesgo medio | **53%** | 2.436% (caso típico) |
| **Dirección** (IV, V) | Riesgo alto + máximo | **56%** | 6.960% (peor caso del rango) |

**Modelo de datos:**

```python
class NominaFactorPrestacionalRiesgo(SQLModel, table=True):
    """Catálogo de factores prestacionales por nivel de riesgo ARL."""
    __tablename__ = "nomina_factor_prestacional_riesgo"
    id: Optional[int] = Field(default=None, primary_key=True)
    categoria: str  # 'OPERATIVO' | 'ADMINISTRATIVO' | 'DIRECCION'
    niveles_arl_incluidos: str  # 'I,II' | 'III' | 'IV,V'
    factor_prestacional_pct: Decimal  # 50.00 | 53.00 | 56.00
    arl_porcentaje_referencia: Decimal  # %ARL usado para el cálculo
    descripcion: Optional[str]
    activo: bool = True
```

**Determinación de la categoría del empleado (regla del motor):**

```python
def categoria_riesgo_desde_porcentaje(riesgo_arl_pct: float) -> str:
    """Mapea el %ARL del contrato a una categoría del módulo."""
    if riesgo_arl_pct <= 1.044:
        return 'OPERATIVO'
    elif riesgo_arl_pct <= 2.436:
        return 'ADMINISTRATIVO'
    else:
        return 'DIRECCION'


def factor_prestacional_para_empleado(cedula: str, session) -> Decimal:
    """Obtiene el factor prestacional para un empleado según su contrato vigente."""
    contrato = ContratoERP.consultar_vigente(cedula)
    if not contrato or contrato.riesgoarl is None:
        # Default si no hay contrato o no tiene riesgo definido
        return Decimal('52.00')

    categoria = categoria_riesgo_desde_porcentaje(contrato.riesgoarl)
    factor = session.query(NominaFactorPrestacionalRiesgo).filter_by(
        categoria=categoria, activo=True
    ).first()

    return factor.factor_prestacional_pct if factor else Decimal('52.00')
```

**Caché (analogía con E1):**

- Cachear `factor_prestacional_actual` y `categoria_riesgo_actual` en `nomina_horario_pactado`.
- Refrescar con el mismo job batch diario que refresca `autorizado_he_erp`.
- Alertas: si `contrato.riesgoarl` cambia de categoría (ej. Nivel II → III), el job lo detecta y actualiza.

**Tabla seed (a crear en S0):**

```sql
INSERT INTO nomina_factor_prestacional_riesgo (categoria, niveles_arl_incluidos, factor_prestacional_pct, arl_porcentaje_referencia, descripcion) VALUES
('OPERATIVO',     'I,II',   50.00, 1.044, 'Operativos con riesgo mínimo y bajo (oficinas, administrativas sin campo)'),
('ADMINISTRATIVO', 'III',    53.00, 2.436, 'Administrativos con riesgo medio (supervisión, ventas con campo limitado)'),
('DIRECCION',      'IV,V',   56.00, 6.960, 'Personal de dirección/confianza y operativos con riesgo alto/máximo (técnicos de campo)');
```

### H3. ¿Cómo se calcula el valor de la hora? ✅ RESUELTA

**Fórmula:**

```
valor_hora_ordinaria = salario_mensual / horas_mensuales
horas_mensuales = jornada_semanal_h × 4.33 semanas/mes
valor_minuto = valor_hora_ordinaria / 60
```

**Ejemplo (con SMMLV 2026 y 44h/sem):**
```
valor_hora_ordinaria = 1.750.905 / (44 × 4.33) = 1.750.905 / 190.52 = 9.191 COP/h
valor_minuto = 9.191 / 60 = 153 COP/min
```

**Para HE y recargos** se multiplica por el porcentaje legal:
- HED: `valor_minuto × 1.25` (25% sobre ordinario)
- HEN: `valor_minuto × 1.75` (75% sobre ordinario)
- HF: `valor_minuto × 1.80` (80% sobre ordinario, periodo jul25-jun26)
- HE diurna dominical: `valor_minuto × 2.05` (25% + 80%)
- HE nocturna dominical: `valor_minuto × 2.55` (75% + 80%)

**Con carga prestacional incluida** (costo empresa):
```
costo_minuto_hefd = valor_minuto × 2.05 × 1.52
```

### H4. ¿Cómo se agrega el costo por OT? 🟠 EN ANÁLISIS

**Modelo propuesto — nueva tabla `nomina_costo_ot`:**

```python
class NominaCostoOt(SQLModel, table=True):
    __tablename__ = "nomina_costo_ot"
    id: Optional[int] = Field(default=None, primary_key=True)
    ot_id: str  # FK a la tabla de OTs del proyecto
    cedula: str
    anio: int
    semana_iso: int
    # Desglose de minutos
    minutos_ordinarios: int = 0
    minutos_hed: int = 0
    minutos_hen: int = 0
    minutos_hefd: int = 0
    minutos_hefn: int = 0
    minutos_hf: int = 0
    minutos_rn: int = 0
    minutos_rf: int = 0
    minutos_rem: int = 0  # otros en minutos
    minutos_lic: int = 0
    minutos_inc: int = 0
    minutos_vac: int = 0
    # Desglose de costos (calculados con factor_prestacional)
    costo_ordinario_cop: Decimal
    costo_hed_cop: Decimal
    costo_hen_cop: Decimal
    costo_hefd_cop: Decimal
    costo_hefn_cop: Decimal
    costo_hf_cop: Decimal
    costo_rn_cop: Decimal
    costo_rf_cop: Decimal
    costo_rem_cop: Decimal
    costo_total_cop: Decimal  # SUM
    fecha_calculo: datetime
    parametros_legales_id: int  # versión de parámetros usada
```

**Lógica de población:**

```
Para cada (ot_id, semana, empleado):
  1. JOIN nomina_marca_timelog WHERE ot_cc_id = ot_id AND fecha in semana
  2. JOIN nomina_novedad_registro WHERE ot_cc_id = ot_id AND fecha in semana
  3. JOIN nomina_calculo_semanal WHERE cedula AND semana
  4. Para cada marca, calcular minutos por concepto
  5. Multiplicar por valor_minuto del empleado (de beneficio.salario)
  6. Aplicar factor prestacional
  7. Sumar y guardar
```

### H5. ¿Qué endpoints nuevos se necesitan? ✅ RESUELTA (parcial)

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/v2/horas-extras/costo-ot/{ot_id}?anio=&semana=` | GET | Retorna el costo total de la OT en una semana |
| `/api/v2/horas-extras/costo-ot/{ot_id}?desde=&hasta=` | GET | Retorna serie temporal de costos |
| `/api/v2/horas-extras/costo-ot/{ot_id}/personas` | GET | Lista personas asignadas con horas y costo |
| `/api/v2/horas-extras/costo-ot/top?semana=&limit=10` | GET | Top N OTs más costosas |
| `/api/v2/horas-extras/preliquidacion/{cedula}?anio=&semana=` | GET | Pre-liquidación de un empleado (minutos + COP) |

### H6. ¿Qué vistas de UI nuevas se necesitan? 🟠 EN ANÁLISIS

**Vistas propuestas para añadir al portal (extensión de S5-S6):**

1. **Dashboard de Costos por OT** (`/novedades-nomina/costos-ot`)
   - Tabla: OT | Semana | Personas | Horas totales | Costo total | % del presupuesto
   - Filtros: rango de semanas, OT, centro de costo
   - Cards de resumen: costo total semana, # de OTs activas, top 5 OTs

2. **Detalle de Costo por OT** (`/novedades-nomina/costos-ot/{ot_id}`)
   - Serie temporal (gráfico de barras por semana)
   - Tabla de personas: nombre | horas ordinarias | horas extra | costo
   - Comparación contra presupuesto (si existe)
   - Alertas: "Esta OT está al 120% del presupuesto"

3. **Pre-liquidación por Empleado** (`/novedades-nomina/preliquidacion/{cedula}`)
   - Minutos por concepto
   - Valor por concepto (con desglose de factor prestacional)
   - Comparación vs SIIGO (si hay retroalimentación)

4. **Configuración de Factor Prestacional** (`/novedades-nomina/parametros#prestacional`)
   - Editar factor global
   - Override por empleado (si la empresa lo requiere)

### H7. ¿Cuándo se calcula el costo por OT? ✅ RESUELTA

**Decisión del usuario 2026-06-15:** **Real-time al confirmar cálculo semanal.**

**Implementación:**

```python
# Endpoint: POST /api/v2/horas-extras/calculo/confirmar
async def confirmar_calculo_semanal(anio: int, semana_iso: int, db: Session):
    # 1. Calcular minutos por concepto para todos los empleados (motor puro)
    await motor_puro.calcular(anio, semana_iso, db)

    # 2. Inmediatamente después, calcular costos por OT (capa 2)
    #    Para cada OT que tuvo actividad en la semana:
    await preliquidacion_service.calcular_costos_ot(anio, semana_iso, db)

    # 3. Devolver resumen al usuario
    return {"semana": semana_iso, "costos_ot_calculados": N, "duracion_ms": ...}
```

**Tabla afectada:** `nomina_costo_ot` (propuesta en H4) se llena con los datos de la semana.

**Trade-off aceptado:**
- La confirmación tarda más (proporcional al # de empleados × # de OTs en la semana).
- Para 60 empleados × 21 OTs como en el Excel de Camila Bahoz, el cálculo es <1 segundo.
- Si en el futuro hay 1000+ empleados, se puede pasar a H7-opción A+B (agregar batch como respaldo).

**Validación de presupuestos:**

```python
# Después de calcular costos por OT, comparar contra presupuesto
for ot in nomina_costo_ot:
    presupuesto = basegeneralcostos.get_vr_contratado(ot.ot_id)
    if presupuesto and ot.costo_acumulado > presupuesto * 1.20:
        emit_alert(f"OT {ot.ot_id} está al {ot.costo_acumulado/presupuesto*100:.0f}% del presupuesto")
```

### H8. ¿Las novedades no-HE se asocian a una OT específica o son del empleado? ✅ RESUELTA

**Decisión del usuario 2026-06-15:** **Siempre del empleado, nunca de la OT.**

**Implicaciones:**

- ❌ INC, VAC, LIC, PNR, RET, ARL, AUS, SAN, DXT **NO** se asocian a ninguna OT.
- ❌ El campo `referencia` (OT/CC) en estas novedades queda **NULL** o apunta al CC genérico del empleado.
- ❌ NO se suman al costo de ninguna OT.
- ✅ La pre-liquidación muestra el costo del empleado por separado (no por OT).
- ✅ El campo `referencia` solo se llena para: SALARIO, HED, HEN, HEFD, HEFN, HF, RN, RF, CMP (las novedades que son TRABAJO real).

**Justificación:**
- Una incapacidad no es trabajo en una OT. Pretender lo contrario distorsiona los costos por OT.
- El analista de presupuesto quiere ver "cuánto me costó esta OT en mano de obra", no "cuánto me costó esta OT en incapacidades que nada tienen que ver con ella".
- El costo de las novedades del empleado va al **pool general** (no por OT).

**Modelo de datos actualizado:**

```python
class NominaNovedadRegistro(SQLModel, table=True):
    # ...
    novedad: str  # SALARIO, HED, ..., INC, VAC, LIC, etc.
    referencia: Optional[str] = None  # Solo para novedades de TRABAJO
    tipo_referencia: Optional[str] = None  # 'CC' | 'OT' | None

    @field_validator('referencia')
    def validate_referencia(cls, v, values):
        novedad = values.get('novedad')
        # Catálogo de novedades que requieren referencia
        novedades_con_ot = {'SALARIO', 'CMP', 'HED', 'HEN', 'HEFD', 'HEFN', 'HF', 'RN', 'RF'}
        novedades_sin_ot = {'INC', 'VAC', 'LIC', 'PNR', 'RET', 'ARL', 'AUS', 'SAN', 'DXT'}

        if novedad in novedades_con_ot and v is None:
            raise ValueError(f'Novedad {novedad} requiere OT/CC')
        if novedad in novedades_sin_ot and v is not None:
            raise ValueError(f'Novedad {novedad} NO debe tener OT/CC (es del empleado)')
        return v
```

**Cálculo de costo por OT (revisado en H4 con esta decisión):**

```python
async def calcular_costos_ot(anio, semana_iso, db):
    for ot in basegeneralcostos.get_ots_con_mo():
        # Solo se suman al costo de la OT las novedades DE TRABAJO
        novedades_trabajo = db.query(NominaNovedadRegistro).filter(
            NominaNovedadRegistro.referencia == ot.orden,
            NominaNovedadRegistro.tipo_referencia == 'OT',
            NominaNovedadRegistro.novedad.in_({'SALARIO', 'HED', 'HEN', 'HEFD', 'HEFN', 'HF', 'RN', 'RF', 'CMP'}),
            NominaNovedadRegistro.fecha.between(inicio_semana, fin_semana)
        ).all()

        # Calcular costo (minutos × valor_minuto × factor_prestacional)
        costo_total = sum(nov.costo_calculado for nov in novedades_trabajo)

        # Persistir
        nomina_costo_ot.upsert(ot_id=ot.orden, semana=semana_iso, costo=costo_total)
```

**Pre-liquidación del empleado (separada del costo por OT):**

```python
def calcular_preliquidacion_empleado(cedula, anio, semana_iso):
    """Muestra TODAS las novedades del empleado (incluyendo INC/VAC sin OT)."""
    novedades = db.query(NominaNovedadRegistro).filter_by(cedula=cedula, semana=semana_iso).all()
    # ... calcula costo, agrupado por novedad, pero NO por OT ...
```

---

## Sección E — Datos del ERP y contrato

### E1. ¿El flag `autoriza_he` se consulta al ERP en cada cálculo o se cachea? ✅ RESUELTA

**Decisión del usuario 2026-06-15:** **Cachear en `nomina_horario_pactado` y refrescar con un job batch diario.**

**Justificación:**
- El flag cambia poco frecuentemente (solo cuando RRHH autoriza/revoca el permiso de HE).
- En cada cálculo de HE se hace para muchos empleados (semanal), no queremos N consultas al ERP.
- Un job diario a las 02:00 refresca el flag de los horarios vigentes.

**Modelo:**

```python
class NominaHorarioPactado(SQLModel, table=True):
    __tablename__ = "nomina_horario_pactado"
    # ... campos existentes de la spec ...

    # Nuevos campos (ver I8 + decisión E1)
    autorizado_he_erp: Optional[bool] = None       # copia del flag del ERP
    autorizado_he_erp_refreshed_at: Optional[datetime] = None  # cuándo se refrescó
    autorizado_he_override: Optional[bool] = None   # override de la regional (NULL si no hay)
    autorizado_he_override_by: Optional[str] = None # cédula del regional
    autorizado_he_override_at: Optional[datetime] = None
    autorizado_he_override_justificacion: Optional[str] = None
```

**Lógica del cálculo (combina caché + override):**

```python
def empleado_autorizado_he(horario: NominaHorarioPactado) -> bool:
    # Override tiene prioridad absoluta
    if horario.autorizado_he_override is not None:
        return horario.autorizado_he_override

    # Si no hay override, usar el flag del ERP (cacheado)
    return horario.autorizado_he_erp or False


def calcular_horas_extras(marca, horario, parametros, empleado):
    if not empleado_autorizado_he(horario):
        # No calcular HE; sí calcular recargos (nocturno, festivo)
        resultado["warnings"].append({
            "codigo": "EMPLEADO_NO_AUTORIZADO_HE",
            "detalle": f"Empleado {empleado.nombre} no autorizado para HE"
        })
        # ... calcular solo recargos ...
    else:
        # ... calcular HE + recargos ...
```

**Job batch diario (`/api/v2/internal/jobs/refrescar-autorizacion-he`):**

```python
# Ejecutar a las 02:00 cada día
async def refrescar_autorizacion_he_erp():
    # 1. Obtener todos los horarios vigentes
    horarios = await session.execute(
        select(NominaHorarioPactado)
        .where(NominaHorarioPactado.vigente_hasta.is_(None))
    )
    horarios = horarios.scalars().all()

    # 2. Para cada horario, consultar el flag actual del ERP
    cedulas = list(set(h.cedula for h in horarios))
    empleados_erp = await EmpleadosService.consultar_empleados_bulk(cedulas)

    # 3. Actualizar el flag en cada horario
    for horario in horarios:
        emp = empleados_erp.get(horario.cedula)
        if emp:
            horario.autorizado_he_erp = emp.autoriza_he
            horario.autorizado_he_erp_refreshed_at = datetime.utcnow()

    await session.commit()
```

**Casos especiales:**
- **Override activo:** si `autorizado_he_override IS NOT NULL`, el job NO sobrescribe el override (solo actualiza el flag del ERP para referencia).
- **Cambio reciente en el ERP (mismo día):** se refleja al día siguiente en el caché. Si la inmediatez es crítica, el regional puede usar el endpoint `POST /api/v2/horas-extras/empleado/{cedula}/refresh-autorizacion` que fuerza una consulta inmediata.
- **Empleado nuevo:** al crear el horario, se consulta el ERP una vez y se llena `autorizado_he_erp` con ese valor.

---

## Sección F — Estado global del proyecto

| Sprint | Estado | Bloqueado por | Notas |
|---|---|---|---|
| **S0** (migración + seeds + RBAC) | 🟠 Casi listo | Pendiente H2, H7, H8 (no bloquean S0 en sí) | C1, E1, I3-I6 ya resueltas |
| **S1** (motor de cálculo de minutos) | 🔴 Bloqueado | S0 | Capa 1 |
| **S2** (bolsa + workflow + ERP) | 🟠 Parcial | S0 + ajuste endpoint EmpleadosService | Modelo bolsa 1:1 (I6) y caché flag (E1) ya decididos |
| **S3** (routers) | 🟢 Listo para arrancar | S1, S2 | |
| **S4** (cálculo + bolsa routers) | 🟢 Listo | S3 | |
| **S5** (UI básica) | 🟢 Listo | S4 | |
| **S6** (UI avanzada) | 🟢 Listo | S5 | |
| **S7** (E2E + docs) | 🟢 Listo | S6 | Capa 1 (minutos) |
| **🆕 S8** (capa de pre-liquidación + costos OT) | 🔴 Pendiente planear | S7 + H2, H7, H8 | Capa 2 (COP) — alcance nuevo |
| **🆕 S9** (UI de costos por OT y pre-liquidación) | 🔴 Pendiente planear | S8 | |

---

## Sección G — Preguntas para el usuario (próxima iteración)

✅ **Resueltas por descubrimiento en BD (no requieren tu input):**
- **B1** — Campo real = `beneficio.autorizacionhorasextras` (BOOLEAN, en tabla `beneficio`).
- **A6** — El flag del ERP distingue automáticamente a los trabajadores sin derecho a HE.
- **B3** — El flag del ERP es la única fuente de verdad.
- **H1** — Tabla OT = `public.basegeneralcostos`; campo M.O. = `categoria_sub_indice`; presupuesto = `vr_contratado`.
- **I3** — `nomina_catalogo_novedades` y `nomina_conceptos` son dos cosas distintas; ambas se mantienen.
- **I4** — `basegeneralcostos` (ERP) es la fuente de verdad para OTs; `Listado OT` del Excel no se usa.
- **I5** — Campo `referencia` único con discriminador `tipo_referencia` (CC|OT).
- **I6** — CMP descuenta 1:1 de la bolsa de horas.
- **C1** — El módulo solo registra días crudos. NO aplica reglas de INC/ARL/AUS/SAN/PNR/RET. SIIGO es la fuente de verdad.
- **E1** — Flag `autoriza_he` se cachea en `nomina_horario_pactado` y se refresca con job batch diario.
- **H2** — Factor prestacional varía por nivel de riesgo ARL (3 categorías: Operativo 50%, Administrativo 53%, Dirección 56%). Campo ERP = `contrato.riesgoarl`.
- **H7** — Cálculo de costo por OT en real-time al confirmar cálculo semanal.
- **H8** — INC, VAC, LIC, PNR, RET, ARL, AUS, SAN, DXT son SIEMPRE del empleado, NUNCA de la OT. Solo SALARIO/CMP/HE/recargos se asocian a OT/CC.

🟠 **Aún pendientes (necesitan tu input):**

1. ~~H7 — Cálculo de costo~~ ✅ Resuelta.
2. ~~H8 — Novedades con OT~~ ✅ Resuelta.

**🎉 Todas las preguntas resueltas. Podemos arrancar S0 con confianza.** El nuevo alcance de pre-liquidación + costos por OT se entrega como S8-S9 (nuevos sprints) o se integra en S4-S6 si la capacidad lo permite.

---

## Sección I — 🆕 Análisis del Excel regional (Junio 2026)

**Origen:** El usuario subió el archivo `11.Formulario Reporte de Novedades Regionales 6 DE JUNIO -20 DE JUNIO.xlsm` (12 hojas, 357 registros, 1Q de junio 2026, regional CAMILA BAHOZ). Se analiza como referencia para diseñar el nuevo módulo y se confirman 4 decisiones de modelado.

### I1. Estructura del archivo ✅ RESUELTA

| Hoja | Rol | Filas | Uso para el módulo |
|---|---|---|---|
| **`Tabla`** | Datos crudos capturados (esta quincena) | 357 | **Es el payload de entrada** que el módulo debe aceptar |
| `Registro` | Formulario en blanco (vacía) | 31 | Sugerencia de UI para el nuevo registro |
| `Validaciones` | Dashboard de auditoría (faltantes, conteos) | 102 | **Replica** = endpoint `GET /validaciones/regional/{regional}/{quincena}` |
| `Informe` | Tabla dinámica (vacía) | 83 | **Replica** = endpoint de informe exportable |
| `Empleados` | Catálogo ERP con flag `AUTORIZAN HORAS EXTRAS` (130 empleados, 3 regionales) | 130 | **Replica** = endpoint `GET /empleados?regional=&autoriza_he=` |
| `ESTABLECIMIENTO_SOLID` | Maestro crudo ERP (no usado en este reporte) | 4074 | No tocar (es del ERP) |
| **`Novedades`** | **Catálogo de reglas** (16 tipos, 4 reglas por tipo) | 19 | **Catálogo visible para la regional** (ver I2) |
| `Centros de Costo` | Catálogo cc/subcc/especialidad (B30/B31/B32/B33) | 402 | Replicar parcialmente (es info de Costos) |
| `Listado OT` | OTs activas (de Dropbox/Costos) | 770 | **NO usar como fuente** (ver I4) |
| `Ordenes` | Detalle de OTs con sub-índice y estado | 770 | No usar |
| `Encargados` | Quién captura | 9 | Info de RBAC |
| `Control de Cambios` | Bitácora de versiones | 20 | Info de auditoría |

### I2. La hoja `Novedades` ES el catálogo de reglas del Excel ✅ RESUELTA

**Esta hoja es la fuente operativa de reglas para la regional** y el módulo nuevo debe replicar la misma información (aunque NO como única fuente de verdad, ver I3).

| Novedad | Descripción | Unidad | ¿Requiere OT/CC? | HE No Aplica |
|---|---|---|---|---|
| ARL | Accidente de trabajo | DIAS | NO REQUIERE | |
| AUS | Ausente sin soporte | DIAS | NO REQUIERE | |
| **CMP** | Compensatorio | DIAS | SI REQUIERE | **CMP** |
| DXT | Devuelto por tardanza | DIAS | NO REQUIERE | |
| HED | Hora extra diurna | HORAS | SI REQUIERE | |
| HEFD | HE festiva diurna | HORAS | SI REQUIERE | |
| HEFN | HE festiva nocturna | HORAS | SI REQUIERE | |
| HEN | Hora extra nocturna | HORAS | SI REQUIERE | |
| HF | Hora festiva | HORAS | SI REQUIERE | |
| **INC** | Incapacidad | DIAS | NO REQUIERE | **INC** |
| PNR | Permiso no remunerado | DIAS | NO REQUIERE | |
| REM | Permiso remunerado | DIAS | NO REQUIERE | |
| **RET** | Retiro de la empresa | DIAS | SI REQUIERE | **RET** |
| RF | Recargo festivo | HORAS | SI REQUIERE | |
| RN | Recargo nocturno | HORAS | SI REQUIERE | |
| SAN | Sancionado | DIAS | NO REQUIERE | |
| VAC | Vacaciones | DIAS | NO REQUIERE | |

**Interpretación de la columna `HE No Aplica`:**
- `CMP`, `INC`, `RET` → NO se calculan HE ni recargos (son excepciones por diseño).
- El resto de novedades sí admiten recargos (cuando aplique por horario/fecha).

**Semilla propuesta para `nomina_catalogo_novedades`:**

```python
class NominaCatalogoNovedad(SQLModel, table=True):
    __tablename__ = "nomina_catalogo_novedades"
    id: Optional[int] = Field(default=None, primary_key=True)
    codigo: str  # 'HED', 'CMP', 'INC', etc.
    descripcion: str
    unidad: str  # 'HORAS' | 'DIAS'
    requiere_ot_cc: bool  # True si requiere OT o CC
    no_aplica_he: bool  # True si NO se calculan HE/recargos para esta novedad
    activo: bool = True
    created_at: datetime
```

### I3. Sobre el catálogo de novedades: nomina_conceptos vs hoja Novedades ✅ RESUELTA

**Decisión del usuario 2026-06-15:** **Hay dos cosas distintas, ambas se mantienen.**

| Tabla | Propósito | Quién la mantiene |
|---|---|---|
| `nomina_conceptos` (ya existe en BD) | Conceptos del motor de cálculo (HED, HEN, etc.) con sus porcentajes y reglas internas | El motor del módulo de HE |
| `nomina_catalogo_novedades` (nueva, ver I2) | Catálogo de novedades que la regional ve y puede digitar en la planilla | La regional (vía UI) o importada desde la hoja `Novedades` del Excel |

**Implicación:** el módulo nuevo NO debe reutilizar `nomina_conceptos` como catálogo de entrada. Necesita su propia tabla `nomina_catalogo_novedades` con las 4 reglas del Excel (unidad, requiere_ot_cc, no_aplica_he). Los códigos se mantienen iguales (`HED`, `CMP`, etc.) para que la migración del Excel sea 1:1.

### I4. Listado OT (770) vs basegeneralcostos (40.535) ✅ RESUELTA

**Decisión del usuario 2026-06-15:** **`basegeneralcostos` (ERP) es la fuente de verdad.**

| Fuente | Filas | Ventajas | Desventajas |
|---|---|---|---|
| **`basegeneralcostos` (ERP)** | **40.535** | Actualizada desde Solid; tiene `vr_contratado` (presupuesto); tiene `categoria_sub_indice` (clasificador M.O.) | Puede incluir OTs cerradas o anuladas |
| `Listado OT` (Excel) | 770 | Solo OTs "en proceso" (activas) | Viene de Dropbox (fuera de ERP); no se actualiza solo; sin presupuesto |

**Decisión:** El módulo valida contra `basegeneralcostos`. Si la OT referenciada no existe ahí, se marca como WARNING (no ERROR) para no bloquear a la regional si hay OTs nuevas aún no migradas al ERP.

### I5. El campo `OT/CC` del Excel: un solo campo con discriminador ✅ RESUELTA

**Decisión del usuario 2026-06-15:** **Un solo campo con discriminador (igual al Excel).**

**Hallazgo clave:** En el Excel, el campo `OT/CC` puede contener indistintamente:
- Un número de OT real (ej. `4002`, `3989`, `4017`) → con `UBICACION = 'OT'`
- Un centro de costo (ej. `3080`) → con `UBICACION = 'CC'`

**Análisis del Excel de Camila Bahoz:**
- 171 filas con OT=3080 tienen **todas** `UBICACION=CC` y `Sub=20` (FREON) → **3080 es un CC, no una OT**
- 186 filas con OT real tienen `UBICACION=OT` y `Sub=300` (M.O.) → esas sí son OTs

**Modelo propuesto (conserva la lógica regional):**

```python
class NominaNovedadRegistro(SQLModel, table=True):
    # ...
    referencia: str  # El número tal cual: '3080' o '4002'
    tipo_referencia: str  # 'CC' | 'OT' (validado contra basegeneralcostos)
    sub_referencia: str  # Subcentro / subindice
    especialidad: Optional[str]  # '31' (FREON), '30' (PANELERIA), etc.
```

**Validación automática al guardar:**
```python
if tipo_referencia == 'CC':
    validar_contra_centro_costo(referencia, sub_referencia)
elif tipo_referencia == 'OT':
    validar_contra_basegeneralcostos(referencia, sub_referencia)
```

### I6. CMP (compensatorio) descuenta 1:1 de la bolsa de horas ✅ RESUELTA

**Decisión del usuario 2026-06-15:** **CMP descuenta 1:1 de la bolsa.**

**Hallazgo clave:** En el Excel, `CMP` aparece 82 veces (todas en CC=3080-FREON, regional CAMILA BAHOZ). Es un día libre de 8h que se le da al empleado.

**Semántica legal:** El CMP es la materialización de la **bolsa de horas** (Ley 2466/2025, art. 24): las HE que el empleado trabajó y NO se le pagaron en dinero se acumulan como tiempo compensatorio.

**Modelo de datos propuesto (integración con `bolsa_horas`):**

```python
class NominaBolsaHoras(SQLModel, table=True):
    __tablename__ = "nomina_bolsa_horas"
    id: Optional[int] = Field(default=None, primary_key=True)
    cedula: str
    periodo_inicio: date
    periodo_fin: date
    horas_acreditadas: Decimal  # HE trabajadas que entran a bolsa (= 1.5 × HE si ratio=1.5)
    horas_consumidas: Decimal  # CMPs tomados × 8h
    horas_disponibles: Decimal  # horas_acreditadas - horas_consumidas
    vigencia_hasta: date  # fecha de expiración
```

**Regla del motor (al registrar un CMP):**
```python
# Cuando se confirma un registro con novedad='CMP' y cantidad=1 día:
bolsa = NominaBolsaHoras.get_or_create(cedula, periodo)
bolsa.horas_consumidas += 8  # 1 día = 8 horas
if bolsa.horas_consumidas > bolsa.horas_disponibles:
    raise ValidationError("Empleado sin horas disponibles en bolsa")
```

**Regla del motor (al confirmar HE):**
```python
# Cuando se confirma un registro con novedad='HED' o 'HEFD'/'HEFN'/'HEN':
bolsa.horas_acreditadas += horas_trabajadas * bolsa_ratio_credito  # 1.5 por defecto
bolsa.vigencia_hasta = fecha_he + timedelta(weeks=bolsa_vigencia_semanas)  # 4 sem default
```

### I7. CANT vs CANT. HORAS: dos campos con semántica distinta ✅ RESUELTA

**Hallazgo clave del Excel:**

| Novedad | CANT (valor típico) | CANT. HORAS (valor típico) | ¿Difieren? |
|---|---|---|---|
| SALARIO | 1 (1 día) | 8 (8 horas de ese día) | **SÍ** |
| CMP | 1 (1 día) | 8 (8 horas del día libre) | **SÍ** |
| HED / HEN / HEFD / HEFN | 4 (4 horas extras) | 4 (las mismas 4 horas) | NO |
| HF / RN / RF | 8 (8 horas del recargo) | 8 (las mismas 8 horas) | NO |

**Interpretación:**
- `CANT` = cantidad en la **unidad del concepto** (días para SALARIO/CMP, horas para HE)
- `CANT. HORAS` = **siempre** la conversión a horas (factor: 1 día = 8h)

**Modelo:**
```python
class NominaNovedadRegistro(SQLModel, table=True):
    # ...
    cantidad: Decimal  # en la unidad del concepto
    cantidad_horas: Decimal  # siempre en horas (calculado al guardar)
    unidad: str  # 'DIAS' | 'HORAS' (viene de nomina_catalogo_novedades)

    @field_validator('cantidad_horas')
    def validate_horas(cls, v, values):
        unidad = values.get('unidad')
        cant = values.get('cantidad')
        if unidad == 'DIAS' and v != cant * 8:
            raise ValueError('cantidad_horas debe ser cantidad * 8')
        if unidad == 'HORAS' and v != cant:
            raise ValueError('cantidad_horas debe ser igual a cantidad')
        return v
```

### I8. El flag `APLICA HE` viene del ERP pero se puede override ✅ RESUELTA

**Hallazgo:** En el Excel de Camila Bahoz, 354 filas tienen `APLICA HE=SI` y 3 tienen `NO`. Esas 3 son del mismo empleado (JHONATAN ALBERTO RODRIGUEZ, cédula 1151196889, cargo AYUDANTE DE ADN), quien en la hoja `Empleados` tiene `AUTORIZAN HORAS EXTRAS=NO` (flag del ERP).

**Implicación para el módulo:**
- Por defecto, al crear un registro de HE, se jala `autoriza_he` del ERP (cacheado en `nomina_horario_pactado`).
- La regional puede hacer **override** con justificación obligatoria (`observaciones`).
- Los overrides se registran en una tabla de auditoría para no abusar.

```python
class NominaOverrideAutorizaHE(SQLModel, table=True):
    __tablename__ = "nomina_override_autoriza_he"
    id: Optional[int] = Field(default=None, primary_key=True)
    registro_id: int  # FK a nomina_novedad_registro
    cedula: str
    flag_original: bool  # lo que decía el ERP
    flag_override: bool  # lo que puso la regional
    justificacion: str  # obligatoria
    usuario_override: str  # cédula del usuario regional
    timestamp: datetime
```

### I9. Datos de la quincena analizada (snapshots de referencia)

**Resumen operativo del archivo de Camila Bahoz (1Q junio 2026):**

- 357 registros, 57 empleados únicos, 5 días (06-10 junio)
- 7 sucursales: YUMBO(96), BOGOTA(76), CARTAGENA(72), BARRANQUILLA(51), MEDELLIN(49), CALDAS(7), MALAMBO(6)
- 4 empresas: REFRIDCOL(244), SUMMAR TEMPORALES(65), MULTIEMPLEOS(46), REDES HUMANAS(2)
- 8 novedades distintas: SALARIO(196), CMP(82), HF(32), HED(28), HEFD(12), RN(3), RF(3), HEFN(1)
- 21 OTs distintas, top: 3080 (CC FREON ADN, 171), 3989 (27), 3736 (24), 4002 (23), 3894 (20)
- Las columnas `SALARIO` y `BASE HORA` están **vacías en Tabla** (la planilla NO trae salario del ERP)

**Implicación para el módulo:** El salario debe consultarse de `beneficio.salario` (vía ERP) — no del archivo. Ver pregunta E1 (caché sí/no) que sigue pendiente.

### I10. Validaciones del Excel: funcionalidad a replicar

La hoja `Validaciones` del Excel hace 4 auditorías automáticas que el módulo nuevo debe replicar como endpoints:

| Validación | Query en Excel | Endpoint propuesto |
|---|---|---|
| Empleados del regional sin registro en la quincena | `Empleados.Regional = 'CAMILA BAHOZ' AND NOT IN Tabla` | `GET /api/v2/novedades-nomina/validaciones/{regional}/{quincena}/faltantes` |
| Empleados registrados con novedades duplicadas | `COUNT(Tabla.cédula) > 1 por día` | `GET .../duplicados` |
| Conteo de novedades por día (grilla día × empleado) | `COUNT(Tabla) GROUP BY empleado, fecha` | `GET .../conteo-diario` |
| Empleados NO en Empleados pero SÍ en Tabla | `Tabla NOT IN Empleados` | `GET .../no-en-erp` |

---

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-06-15 | Apertura. Investigación legal + identificación de gaps. |
| 2026-06-15 | Confirmación del usuario: jornada nocturna 19:00-06:00 vigente. Todos los parámetros (incluyendo bolsa) configurables. |
| 2026-06-15 | **Descubrimiento en BD pruebas3**: el campo `autorizado_he` está en `beneficio.autorizacionhorasextras` (BOOLEAN), NO en `contrato` ni en `establecimiento`. Se actualiza B1, B2, B3, A6 con el hallazgo. La regional del Excel original (Astrid Camila Bahoz, cédula 1004343552) tiene el flag en `FALSE`, confirmando la lógica. |
| 2026-06-15 | **A3 resuelta**: el límite semanal 12h ES regla legal (derivada de 2h/día × 6 días/sem, jornada típica colombiana). Documentar como "derivado de art. 167A CST sobre jornada de 6 días". |
| 2026-06-15 | **D1 resuelta**: festivos 2026 con API Calendarific como primaria + fallback a tabla hardcodeada de Ley Emiliani. Si no hay `CALENDARIFIC_API_KEY` configurada, S0 entrega solo el fallback. |
| 2026-06-15 | **A4 resuelta**: bolsa de horas totalmente parametrizable (ratio + vigencia). Sin restricción legal hardcoded. |
| 2026-06-15 | **A5 resuelta**: jornada semanal totalmente parametrizable. Semilla con 44h (H1 2026) → 42h (H2 2026), ajustable sin código. |
| 2026-06-15 | **🆕 Nuevo alcance**: pre-liquidación con COP + análisis de costos por OT. Sección H añadida con 8 preguntas (H1-H8). C1 revisada: motor puro entrega minutos a SIIGO, capa 2 entrega COP para análisis interno. Estimación adicional: ~1.5 d-h. |
| 2026-06-15 | **H1 resuelta**: la "BASE DE DATOS GENERAL" del ERP es la tabla `public.basegeneralcostos` (40.535 filas). El campo M.O. que el usuario recordaba es `categoria_sub_indice` con valores `CONTRATO - M.O` (2.343 filas / 2.161 OTs) y `MANO DE OBRA` (6.886 / 5.224). Centro de costo = `cc`, subcentro = `scc`, subindice = `sub_indice`. Presupuesto = `vr_contratado` (2.033 OTs M.O. con presupuesto, 310 sin él). |
| 2026-06-15 | **🆕 Sección I — Análisis del Excel regional** (`11.Formulario Reporte de Novedades Regionales 6 DE JUNIO -20 DE JUNIO.xlsm`, regional CAMILA BAHOZ, 1Q jun 2026). 10 hallazgos: estructura de 12 hojas; hoja `Novedades` = catálogo de 16 reglas (unidad, requiere_ot_cc, no_aplica_he); OT 3080 en realidad es CC; `CANT ≠ CANT. HORAS`; flag `APLICA HE` con override; hoja `Validaciones` con 4 auditorías a replicar. 4 decisiones confirmadas: I3 (catálogo independiente), I4 (`basegeneralcostos` es la verdad), I5 (campo único con discriminador), I6 (CMP descuenta 1:1 de bolsa). Estado: 🟢 18 resueltas / 🔴 2 pendientes / 🟠 2 en análisis. |
| 2026-06-15 | **C1 resuelta**: el módulo solo registra días crudos. NO se calcula INC/ARL con prorrateos. SIIGO aplica las reglas legales para el pago. Esto elimina `nomina_reglas_prorrateo` y el campo `tipo_calculo`. La pre-liquidación con costo por OT tampoco aplica reglas de INC/ARL. Estado: 🟢 19 resueltas / 🔴 1 pendiente / 🟠 2 en análisis. |
| 2026-06-15 | **E1 resuelta**: flag `autoriza_he` se cachea en `nomina_horario_pactado` (campos `autorizado_he_erp` + `autorizado_he_override`). Job batch diario a las 02:00 refresca desde `beneficio.autorizacionhorasextras`. Override por regional con justificación. Estado: 🟢 20 resueltas / 🔴 0 pendientes / 🟠 3 en análisis (H2/H7/H8 no bloquean S0). |
| 2026-06-15 | **H2 resuelta**: factor prestacional varía por nivel de riesgo ARL en 3 categorías. Descubrimiento en ERP: campo `contrato.riesgoarl` (DOUBLE PRECISION, en %). Valores en pruebas3: 0.522% (Nivel I, 522 contratos), 1.044% (II, 61), 2.436% (III, 465), 4.350% (IV, 93), 6.96% (V, 2338). Mapeo: Operativo=I,II → 50%; Administrativo=III → 53%; Dirección=IV,V → 56%. Nueva tabla `nomina_factor_prestacional_riesgo`. Estado: 🟢 21 resueltas / 🔴 0 pendientes / 🟠 2 en análisis (H7/H8 no bloquean S0). |
| 2026-06-15 | **H7 resuelta**: cálculo de costo por OT en real-time al confirmar el cálculo semanal (`POST /calculo/confirmar` dispara `calcular_costos_ot` inmediatamente). Validación de presupuesto post-cálculo. |
| 2026-06-15 | **H8 resuelta**: INC, VAC, LIC, PNR, RET, ARL, AUS, SAN, DXT son SIEMPRE del empleado, nunca de la OT. Solo SALARIO/CMP/HE/recargos asocian OT/CC. Esto simplifica el modelo: `referencia` es NULL para ausencias. El costo por OT solo suma trabajo real. La pre-liquidación del empleado muestra todo (incluyendo ausencias), pero sin agrupación por OT. **🎉 Todas las preguntas resueltas. Estado: 🟢 23 resueltas / 🔴 0 pendientes / 🟠 0 en análisis.**
| 2026-06-17 | **🆕 Sprint S7 — Planificador semanal masivo (nueva vista)**: el usuario reporta que el ingreso de novedades (INC/VAC/AUS/LIC) y el ajuste de horario deben unificarse en una sola pantalla, con flujo semanal: (1) seleccionar grupo de empleados desde el ERP, (2) asignar horario por defecto de la semana, (3) ajustar entradas/salidas/almuerzo por empleado × día según avanza la semana, (4) ver cálculo de HE en vivo sin persistir, (5) confirmar al cierre. Decisiones: nueva vista `PlanificadorSemanalView` paralela a las existentes; batch endpoints que reutilizan las tablas `nomina_horario_pactado_dia` y `nomina_novedad_evento` (sin nueva tabla cabecera); estado BORRADOR mientras se ajusta + botón Pre-calcular que muestra HE sin tocar el estado + botón Confirmar que dispara el motor de confirmación actual por empleado. Compatibilidad verificada: S6 BOLSA_DESACTIVADA bloquea correctamente en confirmar_plan, reportándose en `errores[]` por empleado. Detalle completo en `docs/specs/2026-06-17_sprint-S7-planificador-semanal.md`. Estado: 🟢 24 resueltas / 🔴 0 pendientes / 🟠 0 en análisis. | |
