# Investigación Legal — Horas Extras, Recargos y Novedades (Colombia)

**Fecha:** 2026-06-15
**Propósito:** Validar que la spec `2026-06-01_modulo-horas-extras-novedades.md` y el plan asociado estén alineados con la normatividad colombiana vigente (CST, Ley 2466/2025, Ley Emiliani 51/1983) antes de iniciar el Sprint S0.
**Autor:** Investigación de escritorio (sesión con el usuario).
**Alcance:** validación legal, NO incluye análisis de seguridad ni de arquitectura.

---

## 1. Resumen ejecutivo

| Estado | # | Hallazgo |
|---|---|---|
| 🟢 **Confirmado** | 1 | Recargo nocturno 35% (CST art. 160, 168). |
| 🟢 **Confirmado** | 2 | Hora extra diurna 25%, hora extra nocturna 75% sobre hora ordinaria diurna (CST art. 167). |
| 🟢 **Confirmado** | 3 | Regla de acumulación de recargos: 80% + 35% = 115% (dominical nocturno), 80% + 25% = 105% (extra dominical diurna), 80% + 75% = 155% (extra dominical nocturna). |
| 🟢 **Confirmado** | 4 | Recargo dominical/festivo progresivo Ley 2466/2025: 80% (jul25-jun26), 90% (jul26-jun27), 100% (jul27+). |
| 🟡 **Confirmado parcial** | 5 | Límite HE: 2 h/día (art. 167A). El límite semanal de 12 h **no aparece en las fuentes consultadas** — la spec lo asume. |
| 🟡 **Confirmado parcial** | 6 | SMMLV 2026: $1.750.905 + auxilio $249.095 = $2.000.000 (fuente: Wikipedia, sin Decreto citado). |
| 🟡 **Confirmado parcial** | 7 | Jornada nocturna actual: 21:00-06:00 (CST art. 160 vigente). La spec asume 19:00-06:00 desde 25-dic-2025. **DISCREPANCIA** con texto histórico CST. |
| 🟡 **Confirmado parcial** | 8 | Excepciones al límite HE: dirección, confianza, manejo, vigilancia (CST art. 162). NO mencionadas en la spec. |
| 🔴 **No confirmado** | 9 | Jornada semanal 44h ene-jun 2026. **DISCREPANCIA** con Ley 2101/2021, que ya redujo a 42h. |
| 🔴 **No confirmado** | 10 | Bolsa de horas con ratio 1.5:1 (Art. 17 Ley 2466). Una fuente consultada indica que la Ley 2466 **no menciona** bolsa de horas. |
| 🔴 **No confirmado** | 11 | Lista oficial de festivos 2026. Fuente secundaria lista 19 festivos, menciona 18. Hay inconsistencia. |
| 🔴 **No confirmado** | 12 | Texto literal Ley 2466/2025. Fuentes secundarias accesibles (SUIN, función pública) no devolvieron contenido. |

---

## 2. Hallazgos confirmados con fuente

### 2.1 CST artículos 158-168 (Código Sustantivo del Trabajo)

**Fuente primaria:** Gerencie.com — *Recargo Nocturno* y *Jornada Laboral* (citando SUIN Juriscol, id 30019323). Acceso el 2026-06-15.

**Art. 160 — Jornada diurna y nocturna (texto vigente del CST):**
> "El trabajo diurno es el que se realiza en el período comprendido entre las seis horas (6:00 a. m.) y las veintiuna horas (7:00 p. m.)."
> "El trabajo nocturno es el que se realiza en el período comprendido entre las veintiuna horas (7:00 p. m.) y las seis horas (6:00 a. m.)."

**Art. 161 — Jornada máxima legal (resumen):**
- a) Diurna 6:00-18:00: hasta **8 h/día y 48 h/semana**.
- b) Nocturna: hasta **7 h/día y 42 h/semana**, con recargo.
- c) Jornada 36 h/semana: exenta de recargo nocturno.

**Art. 160 — Recargo nocturno:**
> "El trabajo nocturno por el solo hecho de ser nocturno se remunera con un recargo del treinta y cinco por ciento (35%)."

**Art. 167 — Hora extra nocturna:**
> "El trabajo extra nocturno se remunera con un recargo del setenta y cinco por ciento (75%) sobre el valor del trabajo ordinario diurno."

**Art. 162 — Exclusiones a la jornada máxima (literal):**
> "a) Los trabajadores de dirección, confianza y manejo."

**Art. 167A — Límite de horas extras (referencia):**
- Máximo **2 horas extras diarias**.
- Previa autorización del Ministerio del Trabajo.

**Regla de acumulación confirmada:**
- Recargo dominical (80%) + nocturno (35%) = **115%** sobre hora ordinaria en jornada dominical nocturna.
- Hora extra diurna (25%) + recargo dominical (80%) = **105%** sobre hora ordinaria.
- Hora extra nocturna (75%) + recargo dominical (80%) = **155%** sobre hora ordinaria.

**Sentencia CSJ — Sala Laboral 40016 de 2012:**
- Los trabajadores de dirección/confianza/manejo NO tienen derecho a horas extras.
- SÍ tienen derecho a recargo nocturno sobre su jornada ordinaria.

### 2.2 Ley 2466 de 2025 (Reforma Laboral)

**Fuente secundaria:** Gerencie.com — *Ley 2466 de 2025 (análisis 2026)*. Acceso el 2026-06-15.

**Reducción de jornada semanal:**
> "Hasta el 15 de julio de 2026 la jornada laboral máxima es de 44 horas semanales, y a partir del 16 de julio de 2026 disminuye a 42 horas semanales."

⚠️ **CONFLICTO con la fuente anterior (gerencie.com/jornada-laboral.html)**, que indica que la jornada ya es de 42 h semanales desde la entrada en vigencia de la **Ley 2101 de 2021** (que culminó su cronograma de 48 → 47 → 46 → 45 → 44 → 42 h en 2025). **Las dos fuentes de gerencie.com se contradicen** — no pudimos verificar el texto oficial.

**Recargo dominical progresivo (Art. 25 de la Ley 2466, según gerencie.com):**

| Período | Recargo dominical/festivo |
|---|---|
| 1 jul 2025 – 30 jun 2026 | **80%** |
| 1 jul 2026 – 30 jun 2027 | **90%** |
| 1 jul 2027 en adelante | **100%** |

**Recargos por horas extras (vigentes 2026):**

| Tipo | Recargo | Composición |
|---|---|---|
| Hora extra diurna | 25% | +25% sobre hora ord. |
| Hora extra nocturna | 75% | +75% sobre hora ord. |
| Extra diurna dominical/festiva | 105% | 25% HE + 80% festivo |
| Extra nocturna dominical/festiva | 155% | 75% HE + 80% festivo |
| Nocturna ordinaria | 35% | +35% sobre hora ord. |
| Dominical/festiva ordinaria | 80% | +80% sobre hora ord. |
| Dominical/festiva nocturna ordinaria | 115% | 80% festivo + 35% nocturno |

> "Cuando coinciden dos recargos, los porcentajes correspondientes se suman" (gerencie.com citando la ley).

**Sobre la "bolsa de horas":**
> "La fuente **no menciona** el mecanismo de bolsa de horas (banco de horas) de la Ley 2466 de 2025."

⚠️ **DISCREPANCIA con la spec del proyecto**, que afirma que el Art. 17 de la Ley 2466 establece una bolsa de horas con ratio 1.5:1. La spec NO cita el texto literal del artículo. Riesgo de spec incorrecta.

### 2.3 SMMLV y auxilio de transporte 2026

**Fuente:** Wikipedia — *Salario mínimo en Colombia*. Acceso el 2026-06-15.

| Concepto | Valor 2026 |
|---|---|
| SMMLV | **$1.750.905** COP |
| Auxilio de transporte | **$249.095** COP |
| Total ingresos mínimos | $2.000.000 COP |

⚠️ **Sin verificación de Decreto** del Ministerio del Trabajo que fija estos valores para 2026. Wikipedia es fuente terciaria.

**Cálculo de hora ordinaria (gerencie.com — ejemplo con $3.000.000 salario):**
- Con 44 h/sem × 4.33 sem: 230 h/mes → hora ordinaria ≈ $13.043
- Con 42 h/sem × 4.33 sem: 220 h/mes → hora ordinaria ≈ $13.636

### 2.4 Festivos Colombia 2026

**Fuente:** Wikipedia — *Anexo:Días festivos en Colombia*. Acceso el 2026-06-15.

| Mes | Día (2026) | Festivo | Carácter | Regla Emiliani |
|---|---|---|---|---|
| Enero | 1 (jue) | Año Nuevo | Civil | Fecha fija |
| Enero | 12 (lun) | Epifanía (Día de los Reyes) | Religioso | Primer lunes ≥ 6 enero |
| Marzo | 23 (lun) | San José | Religioso | Primer lunes ≥ 19 marzo |
| Abril | 2 (jue) | Jueves Santo | Religioso | Calculado litúrgicamente |
| Abril | 3 (vie) | Viernes Santo | Religioso | Calculado litúrgicamente |
| Mayo | 1 (vie) | Día del Trabajo | Civil | Fecha fija |
| Mayo | 18 (lun) | Ascensión de Jesús | Religioso | 7º lunes post-Pascua |
| Junio | 8 (lun) | Corpus Christi | Religioso | 9º lunes post-Pascua |
| Junio | 15 (lun) | Sagrado Corazón | Civil | 10º viernes post-Pascua |
| Junio | 29 (lun) | San Pedro y San Pablo | Religioso | Primer lunes ≥ 29 junio |
| Julio | 13 (lun) | Virgen de Chiquinquirá | Religioso | Primer lunes ≥ 9 julio |
| Julio | 20 (lun) | Independencia Nacional | Civil | Fecha fija |
| Agosto | 7 (vie) | Batalla de Boyacá | Civil | Fecha fija |
| Agosto | 17 (lun) | Asunción de la Virgen | Religioso | Primer lunes ≥ 15 agosto |
| Octubre | 12 (lun) | Diversidad Étnica y Cultural | Civil | Primer lunes ≥ 12 octubre |
| Noviembre | 2 (lun) | Día de Todos los Santos | Religioso | Primer lunes ≥ 1 noviembre |
| Noviembre | 16 (lun) | Independencia de Cartagena | Civil | Primer lunes ≥ 11 noviembre |
| Diciembre | 8 (mar) | Inmaculada Concepción | Religioso | Fecha fija |
| Diciembre | 25 (vie) | Navidad | Religioso | Fecha fija |

⚠️ **Inconsistencia:** La fuente cuenta **19 festivos** en la tabla pero el cuerpo dice 18. La práctica colombiana generalmente incluye 18 festivos. Una posible omisión es **Ascensión de la Virgen** (15 agosto) — pero sí aparece. Otra posibilidad es que la fuente agrupa Jueves+Viernes Santo como un solo "evento". **Requiere verificación con fuente oficial** (Decreto que fija festivos para 2026, usualmente firmado en noviembre del año anterior).

**Distribución 2026:** **8 fijos** + **11 móviles** (no coincide con la fuente que dice 10 móviles — la diferencia es Sagrado Corazón, que sí se mueve desde 2018).

### 2.5 Ley 51 de 1983 (Ley Emiliani)

**Regla general:** Los festivos religiosos que no caen en lunes se trasladan al lunes siguiente. Festivos civiles fijos (1 enero, 1 mayo, 20 julio, 7 agosto, 8 diciembre, 25 diciembre) NO se trasladan.

**Fuente no accesible:** El texto literal de la Ley 51 de 1983 no se pudo obtener de SUIN Juriscol ni de Función Pública. Sólo se confirmó la regla general y la lista práctica de festivos 2026 vía Wikipedia.

---

## 3. Discrepancias entre la spec y la normatividad

### 3.1 DISCREPANCIA #1: Jornada semanal 2026 (CRÍTICO)

**Spec del proyecto dice:**

| Vigencia | Jornada semanal |
|---|---|
| ene-jun 2026 | 44 h |
| jul-dic 2026 | 42 h |

**Lo encontrado en fuentes secundarias:**

- **Gerencie.com (jornada-laboral):** "La jornada máxima legal en Colombia es de **42 horas semanales** (art. 161 CST, modificado por Ley 2101 de 2021)". Sostiene que la reducción de la Ley 2101 (48→42) **ya culminó**.
- **Gerencie.com (análisis Ley 2466):** "Hasta el 15 de julio de 2026 la jornada laboral máxima es de **44 horas semanales**, y a partir del 16 de julio de 2026 disminuye a **42 horas semanales**."

**Las dos fuentes se contradicen.** Sin acceso al texto oficial de la Ley 2466 y al Decreto de transición de la Ley 2101, no es posible confirmar.

**Hipótesis más probable:** La Ley 2466 aplazó la transición final de 44→42h al 16 de julio de 2026 (extensión del cronograma de Ley 2101). Esto es consistente con la spec. **Pero requiere verificación.**

**Acción:** Confirmar con texto oficial. Si es correcto, la spec está OK.

### 3.2 DISCREPANCIA #2: Jornada nocturna (ALTA PRIORIDAD)

**Spec del proyecto dice:**

| Parámetro | Valor |
|---|---|
| `hora_nocturna_inicio` | 19:00 |
| `hora_nocturna_fin` | 06:00 |
| Vigencia | desde 25-dic-2025 |

**Lo encontrado:**

- **CST art. 160 (texto vigente al 2026-06-15 según gerencie.com):** jornada nocturna = **21:00-06:00**.
- **La spec no cita el artículo de la Ley 2466** que cambia a 19:00-06:00.
- **Una de las fuentes consultadas (gerencie.com) menciona explícitamente la regla 21:00-06:00** sin nota de derogatoria. Sugiere que la nueva regla puede no estar vigente al 15 de junio de 2026.

**Acción:** Verificar fecha exacta de entrada en vigencia de la jornada nocturna 19:00-06:00. Si es posterior a 2026-06-15, los parámetros del Sprint S0 (que se cargan con `vigencia_desde=2026-07-01` p. ej.) deben usar 21:00-06:00 hasta esa fecha, y 19:00-06:00 después.

### 3.3 DISCREPANCIA #3: Bolsa de horas (CRÍTICO)

**Spec del proyecto dice:**
> "Bolsa de horas: al confirmar el cálculo semanal, si `estado='APROBADO'`, se acredita al empleado `minutos_bolsa_credito = (HED + HEN + HEFD + HEFN) × parametros.bolsa_ratio_credito` (default 1.5)."
> "Vigencia: cada crédito expira `bolsa_vigencia_semanas` (default 4) semanas después de la fecha de cierre del cálculo."

**Lo encontrado:**

- Una de las fuentes secundarias consultadas (gerencie.com) **NO menciona** la bolsa de horas como parte de la Ley 2466.
- La spec cita "Art. 17 Ley 2466/2025" pero no pudimos verificar.
- El "banco de horas" (mecanismo preexistente en CST art. 165) tiene reglas distintas: compensación 1:1 con tiempo, no con dinero.

**Acción crítica:** **NO iniciar S0 con `bolsa_ratio_credito=1.5` hardcoded.** Validar con:
1. Texto oficial Ley 2466 (Art. 17 según spec).
2. Si la empresa tiene convención colectiva propia que establezca bolsa 1.5:1.
3. Si el ratio debe ser 1:1 (lo habitual) en lugar de 1.5:1.

Si la bolsa de horas NO está en Ley 2466, podría ser una **decisión interna de la empresa** — en cuyo caso NO debe parametrizarse como "regla legal", sino como "política empresarial" configurable por la organización (y el default debería ser 1:1 según CST art. 165).

### 3.4 DISCREPANCIA #4: Límite semanal de HE

**Spec del proyecto dice:**
- `limite_he_diario_min`: 120
- `limite_he_semanal_min`: 720 (= 12 h)

**Lo encontrado:**

- El límite de **2 h/día** está confirmado en CST art. 167A.
- El **límite semanal de 12 h NO aparece** en las fuentes secundarias consultadas. Gerencie.com habla de combinaciones máximas (47 h/sem con 2 h/día extra, etc.) pero no establece un límite semanal explícito.

**Acción:** Verificar si existe límite semanal de 12 h. Si NO existe legalmente, la spec debe documentar el `limite_he_semanal_min` como **recomendación operativa**, no como regla legal.

### 3.5 OMISIÓN #1: Trabajadores de dirección/confianza/manejo

**Spec del proyecto:** No menciona las exclusiones del CST art. 162.

**Lo encontrado:** Estos trabajadores:
- NO tienen derecho a horas extras (CST art. 162 + CSJ Sala Laboral Sentencia 40016 de 2012).
- SÍ tienen derecho a recargo nocturno sobre su jornada.
- SÍ tienen derecho a recargo dominical/festivo.

**Acción:** Añadir un campo `categoria_cargo` o `aplica_he` al modelo `nomina_horario_pactado` (o como catálogo de empleados) para excluir del cálculo de HE a los trabajadores de dirección/confianza/manejo. **No implementarlo genera errores de cálculo para empleados excluidos.**

### 3.6 OMISIÓN #2: Jornada mixta (art. 158 CST)

**Spec del proyecto:** No menciona jornada mixta.

**Lo encontrado:** La jornada mixta es la que cruza el límite diurno/nocturno (antes de las 21:00 y después de las 6:00). Regla: el tiempo laborado en horario nocturno se paga con recargo, el resto como ordinario. El motor debe detectar tramos.

**Acción:** Verificar que los casos borde del motor (punto 1.3 de la spec) cubran explícitamente el caso de **jornada mixta** (ej. marca 18:00-02:00). La spec menciona "marca que cruza las 19:00/06:00" pero NO la marca que cruza las 21:00/06:00 (jornada mixta tradicional). Con el cambio a 19:00, **toda marca de más de 10 horas cruza necesariamente el límite** y debe clasificarse por tramos.

### 3.7 Inconsistencia: cantidad de festivos

**Spec del proyecto (implícito):** 18 festivos (vía Calendarific + Ley Emiliani).

**Fuente secundaria:** 19 festivos en la tabla (Wikipedia), o 18 si se omite Jueves Santo o Viernes Santo. La práctica colombiana generalmente cuenta 18, excluyendo uno de los dos Santos de la Semana Santa.

**Acción:** Validar con el Decreto que fija festivos para 2026. Implementar contra la API de Calendarific como fuente primaria, y usar la tabla hardcodeada de la Ley Emiliani solo como fallback. La spec debe aclarar cuál festivo es el "18º" y cuál es la fuente de verdad (Decreto nacional vs. Calendarific).

---

## 4. Gaps críticos que requieren validación

| # | Gap | Impacto si no se resuelve |
|---|---|---|
| 1 | Texto literal Ley 2466/2025 (Art. 17 bolsa de horas, Art. 25 recargo dominical, Arts. de jornada nocturna) | **Alto** — el cálculo completo depende de esto. |
| 2 | Lista oficial festivos 2026 (Decreto 1527 de 2025 o equivalente) | **Medio** — Calendarific es la fuente primaria, pero el fallback debe coincidir. |
| 3 | SMMLV 2026 y auxilio de transporte (Decreto firmado) | **Medio** — la spec no calcula COP, pero el reporte debe ser trazable. |
| 4 | Reglas internas de la empresa (¿hay empleados de dirección/confianza/manejo?) | **Alto** — define si hace falta el campo `categoria_cargo`. |
| 5 | Convensión colectiva de la empresa (¿hay bolsa de horas propia?) | **Alto** — cambia el ratio 1.5:1 vs 1:1. |
| 6 | Fecha exacta de entrada en vigencia de jornada nocturna 19:00-06:00 | **Alto** — los parámetros del S0 pueden estar mal. |
| 7 | Fecha exacta de entrada en vigencia de jornada 42 h/sem | **Medio** — afecta el cálculo de valor hora ordinaria. |

---

## 5. Recomendaciones para ajustar la spec

### 5.1 Antes de S0 (Bloqueante)

1. **Confirmar si la "bolsa de horas 1.5:1" es legal o política interna.** Si es política interna, marcar como `parametro_empresa` con default 1:1 (CST art. 165) hasta que la empresa lo cambie.
2. **Validar fecha de jornada nocturna 19:00-06:00.** Si NO está vigente al 2026-07-01, el seed de `nomina_parametros_legales` debe usar 21:00-06:00 con `vigencia_hasta` a la fecha del cambio.
3. **Definir la lista canónica de 18 festivos** que se usará en el fallback Ley Emiliani. Sugerencia: usar la lista de Wikipedia (19 festivos) y documentar en el código por qué se eligió esa fuente, con la nota de "verificar contra Decreto de 2026".

### 5.2 Antes de S1 (Motor de cálculo) — Bloqueante

1. **Cubrir el caso de jornada mixta** (marca que cruza 21:00-06:00 si la vigencia es la anterior, o 19:00-06:00 si la nueva). La spec ya menciona el cruce por 19:00; falta el cruce por 21:00 para la transición.
2. **Cubrir el caso de trabajador de dirección/confianza/manejo** → no calcular HE. La spec no lo menciona.
3. **Cubrir el caso de límite semanal 12 h** solo si se confirma que es regla legal. Si no, convertir a `warning` operativo, no legal.

### 5.3 Antes de S5 (UI) — Deseable

1. Añadir un selector de "tipo de cargo" en el horario pactado (`NOMINAL | DIRECCION | CONFIANZA | MANEJO | VIGILANCIA`).
2. Si el empleado es DIRECCIÓN/CONFIANZA/MANEJO, ocultar la sección de "Horas Extras" en la UI y mostrar solo el recargo nocturno + dominical.

### 5.4 Documentación paralela

- Crear `docs/decisions/ADR-007-parametros-legales-2026.md` con los valores confirmados y las fuentes.
- Crear `docs/research/2026-06-15-investigacion-legal-horas-extras.md` (este documento) ✓
- Actualizar `docs/ESQUEMA_BASE_DATOS.md` con las 8 tablas (cuando se ejecute S0).

---

## 6. Preguntas para el usuario

Estas preguntas son **bloqueantes** para S0:

1. **¿Tienes acceso al texto oficial de la Ley 2466 de 2025?** Si sí, ¿puedes pasármelo? Sin esto, la spec puede tener errores materiales en parámetros legales.

2. **¿La "bolsa de horas 1.5:1" de la spec viene de la Ley 2466 o es política interna de la empresa?** Si es política interna, ¿hay documento/convensión colectiva que lo respalde?

3. **¿La jornada nocturna de 19:00-06:00 está vigente al 2026-06-15?** Si no, ¿cuál es la fecha exacta de entrada en vigencia? Esto define los valores del seed inicial.

4. **¿La jornada de 42 h/sem ya aplica en 2026 o sigue en 44 h hasta el 16 de julio?** Confirmar con Decreto o texto oficial.

5. **¿Tienen empleados clasificados como dirección/confianza/manejo en el ERP?** Si sí, ¿el ERP tiene el campo? Si no, ¿cómo planean identificarlos?

6. **¿Cuál es la fuente oficial de festivos 2026 que usa la empresa?** (Decreto nacional, Calendarific, calendario interno). Esto define si Calendarific es la fuente primaria o el fallback.

7. **¿El cálculo de valor hora ordinaria (no parte del módulo) se hace con base en salario + auxilio de transporte, o solo salario?** Esto NO está en el alcance del módulo (que entrega solo minutos), pero es relevante para validar el output.

8. **¿Cómo manejan las novedades no-HE (REM, LIC, INC, VAC, PNR, RET, CMP, ARL, AUS, SAN, DXT, SALARIO)?** ¿Se calculan a partir de marcas reales, o las reporta el responsable regional manualmente? La spec dice que van a `nomina_novedad_registro` con `descripcion_libre`, pero la forma de pago de cada una (días × 480 min) varía:
   - REM (remunerado): 100% del día
   - LIC (licencia remunerada): 100% del día
   - INC (incapacidad): primeros 2 días empleador, del 3 al 90 EPS, del 91+ empleador o ARL según %establecido por ley
   - VAC: 100% del día
   - PNR (permiso no remunerado): 0%
   - RET (retiro): liquidación final
   - CMP (compensatorio): 0% (ya compensado)
   - ARL: primeros 2 días empleador, luego ARL
   - AUS (ausencia): 0%
   - SAN (sanción): 0%
   - DXT (descanso): 100% si es día de descanso remunerado pactado
   - SALARIO: 100% (es el día base, no novedad)

   **La spec actualmente trata todas como "días × 480 min", lo cual es incorrecto para INC, ARL, AUS, SAN, PNR.** Hay que validar.

9. **¿Quieres que valide el texto de la Ley 2466 con otra fuente?** Tengo acceso limitado a fuentes oficiales colombianas (SUIN, función pública, mintrabajo están bloqueados o devuelven 404). Puedo intentar otras rutas si me das acceso a Internet, pero con el alcance actual ya toqué techo.

---

## 7. Plan de acción propuesto

| Prioridad | Acción | Bloqueante para |
|---|---|---|
| P0 | Validar las 6 preguntas bloqueantes con el usuario o con un abogado laboralista | S0 |
| P0 | Confirmar el texto de la Ley 2466 con el Ministerio del Trabajo (o pasar el archivo) | S0, S1 |
| P1 | Ajustar la spec para incluir: jornada mixta, dirección/confianza/manejo, lista canónica de festivos | S1 |
| P1 | Decidir política de bolsa de horas: legal vs interna | S1, S2 |
| P2 | Crear ADR-007 con valores confirmados y fuentes | S0 |
| P2 | Actualizar `ESQUEMA_BASE_DATOS.md` con las 8 tablas | S0 |
| P3 | Revisar reglas de novedades no-HE (REM, LIC, INC, etc.) con RRHH | S2 |

---

## 8. Fuentes consultadas

| # | Fuente | URL | Estado |
|---|---|---|---|
| 1 | Gerencie.com — Recargo Nocturno | https://www.gerencie.com/recargo-nocturno.html | ✅ Accedida |
| 2 | Gerencie.com — Jornada Laboral | https://www.gerencie.com/jornada-laboral.html | ✅ Accedida |
| 3 | Gerencie.com — Análisis Ley 2466 de 2025 | https://www.gerencie.com/ley-2466-de-2025.html | ✅ Accedida |
| 4 | Wikipedia — Anexo:Días festivos en Colombia | https://es.wikipedia.org/wiki/Anexo:D%C3%ADas_festivos_en_Colombia | ✅ Accedida |
| 5 | Wikipedia — Salario mínimo en Colombia | https://es.wikipedia.org/wiki/Salario_m%C3%ADnimo_en_Colombia | ✅ Accedida |
| 6 | Gerencie.com — Ley 51 de 1983 | https://www.gerencie.com/ley-51-de-1983.html | ❌ 404 |
| 7 | Gerencie.com — Bolsa de horas | (varias URLs) | ❌ 404 |
| 8 | Función Pública — Gestor Normativo | (varias URLs) | ❌ No disponible |
| 9 | SUIN Juriscol | (varias URLs) | ❌ Certificado no verificable |
| 10 | Ministerio del Trabajo | (varias URLs) | ❌ 404 |
| 11 | Actualícese | (varias URLs) | ❌ 404 |
| 12 | Mintrabajo, DIAN, alcaldiabogota | (varias URLs) | ❌ 404 |
| 13 | Specs del proyecto | docs/specs/2026-06-01_*.md, docs/specs/2026-06-12_*.md | ✅ Leídas |

---

## 9. Conclusión

**No recomiendo iniciar S0 sin antes responder las preguntas bloqueantes (sección 6).** La spec tiene 3 discrepancias materiales con lo que muestran las fuentes secundarias (jornada semanal, jornada nocturna, bolsa de horas) y 2 omisiones importantes (dirección/confianza/manejo, jornada mixta). Codear contra una spec con reglas legales incorrectas generaría cálculos erróneos que afectarían directamente el pago de nómina — exactamente el problema que el módulo busca resolver.

**Próximo paso recomendado:** Que el usuario valide las 6 preguntas de la sección 6, idealmente con apoyo de un abogado laboralista o con el texto oficial de la Ley 2466. Una vez resueltas, ajustamos la spec y arrancamos S0 con confianza.
