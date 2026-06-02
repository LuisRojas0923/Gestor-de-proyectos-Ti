# ACTA DE REUNIÓN
## Levantamiento de Información — Proceso de Tesorería (Pagos)

| Campo | Detalle |
|---|---|
| **Fecha** | _(por confirmar — no se especificó en la reunión)_ |
| **Lugar / Modalidad** | Reunión remota / presencial (no especificado) |
| **Convocada por** | Gerencia del proyecto de Transformación Digital |
| **Objetivo** | Levantamiento macro del proceso a cargo de la persona responsable de Tesorería (Maris), como punto de partida para la transformación digital del área. |
| **Alcance de esta reunión** | Reconocimiento inicial del proceso, subprocesos, herramientas, fuentes, entregables y agenda. **No se abordan los detalles operativos** — esos se recolectarán en una segunda fase con los analistas. |

---

## 1. Asistentes

| Nombre | Rol | Asistió |
|---|---|---|
| Laura | Jefa inmediata de Maris / referente del proceso de Tesorería | Sí |
| Maris _(Mare)_ | Auxiliar de Tesorería — responsable operativa de los pagos | Sí (referenciada, no habló directamente) |
| _(Por confirmar)_ | Representante del SGI (Pedro) | **No asistió** |
| _(Por confirmar)_ | Analistas del proyecto (Luis Carvajal y Luis Rojas) | _(Se incorporan en la siguiente fase)_ |
| _(Por confirmar)_ | Gerencia / Director del proyecto | Pendiente de socialización del acta |

> ⚠️ **Nota:** En el acta debe quedar registrado que el departamento SGI no asistió a la reunión.

---

## 2. Contexto

- Se está adelantando un ejercicio de **transformación digital** en el área de Tesorería.
- El proyecto sigue tres premisas metodológicas, en este orden:
  1. **Organizar** el proceso.
  2. **Sistematizar** (vía ERP).
  3. **Automatizar** lo que sea automatizable.
- Se busca que la herramienta (ERP) absorba las planillas Excel actuales, de modo que el usuario quede obligado a operar por el canal oficial y bajo las reglas de negocio definidas.
- El ERP ya existe (**SIIGO**). El usuario debe ser llevado a que lo use como única vía.

---

## 3. Proceso macro identificado

**Proceso global:** Pagos (Tesorería).

La gestión del cargo gira en torno a la **gestión operativa de pagos**. Todo lo demás es de apoyo o seguimiento.

### 3.1 Subprocesos del proceso de pagos

| # | Subproceso | Observaciones |
|---|---|---|
| 1 | **Pago a proveedores** | Con paso previo de programación que viene del ERP. |
| 2 | **Pago a contratistas** | Operativamente idéntico al pago a proveedores; se diferencian en el paso anterior (origen del registro). |
| 3 | **Pago de viáticos** | Se gestiona desde una plataforma interna de viáticos. |
| 4 | **Caja menor** | Marcado como "asterisco aparte" — se considera aparte, aunque también es un pago. |

> **Conclusión del análisis:** proveedores y contratistas comparten el mismo flujo de pago; la diferencia está en el **paso anterior** (cómo llegan al sistema). A partir de cierto punto se funden en un solo proceso de pagos.

---

## 4. Herramientas y sistemas utilizados

| Herramienta | Uso actual | Estado / Comentario |
|---|---|---|
| **SIIGO** (ERP) | Sistema oficial — fuente de cuentas por pagar, registro de facturas, contabilización, generación de archivos para bancos. | Ya adquirido. Se busca que sea el único canal. |
| **Excel** | Múltiples planillas: programación de proveedores, base de datos de vehículos, gastos fijos, etc. | Se quieren absorber dentro del ERP. |
| **Plataforma de viáticos** | Gestión de solicitudes de viáticos. | Hoy es muy manual. |
| **Banco de Occidente** | Pagos a proveedores/contratistas. Tiene macro/Excel con base de datos propia de proveedores. Genera archivo plano que se sube al portal del banco. | Proceso "gigante" en macro. |
| **Banco de Bogotá** | Pagos a proveedores/contratistas. Tiene base de datos propia de proveedores. Genera archivo plano. | Proceso similar a Occidente. |
| **Bancolombia** | Pagos a proveedores/contratistas. Tiene archivo plano. | En este momento **en stand-by** — los pagos se están haciendo a mano directamente en el banco. |
| **Correo electrónico / llamadas** | Comunicación con bancos y proveedores. | No es automatizable por ahora, pero se revisará. |

### 4.1 Plantillas de bancos

- Cada banco provee una **plantilla / base de datos** que el área de Tesorería diligencia.
- La idea: que la herramienta interna de la empresa (no la plantilla del banco) determine **a qué banco pagar** según la cuenta y NIT del proveedor, en lugar de hacerlo a mano.

---

## 5. Flujo de Pago a Proveedores (paso a paso, versión actual)

1. **Recepción de facturas** — llegan en físico y/o se registran en **SIIGO**.
2. **Contabilización** — Contabilidad (Yajaira) registra la factura en **SIIGO** (cuando es física, también se ingresa al sistema).
3. **Descarga de cuentas por pagar** — Maris descarga desde **SIIGO** un archivo de cuentas por pagar con facturas pendientes y vencimientos.
4. **Armado de programación de proveedores** — Maris aplica filtros en el Excel de programación (saca facturas que no se deben pagar) y arma el listado a pagar.
5. **División por banco** — divide el pago total entre los bancos. **Hoy se hace a mano.** Antes se hacía con una base de datos propia que se dejó de alimentar.
6. **Generación de archivo plano** — usando la plantilla de cada banco (Occidente / Bogotá / Bancolombia), con NIT, valor, etc.
7. **Subida del archivo al banco** — el archivo plano se carga al portal del banco.
8. **Control interno** — Control Interno revisa antes de ejecutar el pago.
9. **Ejecución del pago** — el banco procesa.
10. **Conciliación contable** — Contabilidad registra el pago contra la factura o contra el anticipo (nota contable).

> 🔴 **Foco crítico:** pasos 4, 5 y 6 son los que se quieren sistematizar/automatizar.

---

## 6. Agenda semanal del cargo de Tesorería

| Día | Actividad |
|---|---|
| **Lunes** | Pago de viáticos. |
| **Martes** | Pago a proveedores — semana vencida. |
| **Miércoles** | Pago a contratistas. |
| **Jueves** | Programación de pagos + apoyo en gestión de informes financieros (seguimiento financiero). |
| **Viernes** | Pago a contratistas. |

- Existe una rutina: **los martes se paga la semana vencida completa** (todo lo vencido entre lunes y domingo anteriores).
- La separación lunes/martes/miércoles/viernes busca evitar que todo se vuelva "urgente".

---

## 7. Entregables actuales y futuros

### 7.1 Entregables que se generan hoy

| Entregable | Destinatario | Observación |
|---|---|---|
| Movimientos de banco | Contabilidad | Para cruces contables. |
| Extractos bancarios (cuenta corriente, ahorros, fiducias, tarjetas de crédito) | Contabilidad | Descargados del banco. Hoy los descarga directamente Maris porque es la única autorizada en los portales bancarios. |
| Minuta (G6 — centros de costos) | Costos | Se procesa en **SIIGO** a partir de las facturas y pagos. |
| Archivo plano por banco | Banco correspondiente | Muere en el banco. |

### 7.2 Entregables que se quieren implementar

| Entregable | Frecuencia | Estado |
|---|---|---|
| **Informe de flujo de caja** | _(definir)_ | En implementación, lo está elaborando la jefa. |
| **Informe de costos y gastos fijos** | Mensual | Casi no se está alimentando; debería salir del ERP. |
| **Seguimiento de pagos exitosos vs rechazados** | Continuo | Deseado — para detectar rechazos y reprocesos. |
| **Seguimiento de urgencias y anticipos** | Continuo | Deseado — para controlar la "urgenciitis". |

### 7.3 Entregable de soporte a socios (vehículos)

- Seguimiento del parque automotor de los socios:
  - Pólizas
  - Impuestos
  - SOAT
  - Tecnomecánica
- Hoy se lleva en Excel. La idea: que el sistema genere **alertas** (por ejemplo, "faltan 5 días para vencer la póliza").
- Es una tarea **anual con seguimiento continuo**.

---

## 8. Fuentes de información (por confirmar en fase de detalle)

A levantar con Luis Carvajal en la siguiente fase:

- **Facturas** (físicas y electrónicas).
- **Archivos descargados del ERP** (cuentas por pagar, programación).
- **Excels operativos** (programación de proveedores, gastos fijos, vehículos).
- **Plataformas de bancos** (plantillas, bases de datos, archivos planos).
- **Plataforma de viáticos** (requerimientos).
- **Correos electrónicos y llamadas** con bancos y proveedores.

---

## 9. Asteriscos / Puntos pendientes a resolver

1. **Caja menor** — considerarlo aparte en el alcance (no es prioridad inicial).
2. **Asignación de banco por proveedor** — antes existía una base de datos propia que indicaba el banco; se perdió. Hoy se hace a mano. **El nuevo sistema debería resolverlo automáticamente.**
3. **Quién autoriza/descarga los extractos bancarios** — hoy Maris porque es la única con credenciales. Contabilidad debería poder autogestionar la descarga desde el ERP.
4. **Capacitación / adopción** — el usuario se resiste al cambio. Se requiere que use el ERP de forma obligatoria.
5. **Procesos manuales repetitivos** — la idea es consolidarlos en el ERP y eliminar entregables que solo existen por la fragmentación actual.
6. **KPIs del cargo** — actualmente no se miden; se quieren introducir (pagos exitosos, rechazos, urgencias, anticipos).
7. **Minuta (G6)** — se debe confirmar el nombre técnico y el proceso exacto en **SIIGO**.
8. **Frecuencia y forma** del flujo de caja y gastos fijos (lo está armando la jefa actualmente).

---

## 10. Decisiones y alcance del proyecto (lo que queda formalizado)

1. La **primera fase** se enfoca en el **proceso macro de pagos** (proveedores + contratistas + viáticos). Caja menor queda como asterisco aparte.
2. Se va a **revisar el proceso antes de sistematizarlo**: si el proceso actual no está bien, se ajusta antes de meterlo al ERP.
3. Las **tres premisas** del proyecto son obligatorias: **organizar → sistematizar → automatizar**.
4. El **ERP será el canal oficial** y único. El usuario no tendrá opción de hacerlo a mano.
5. Se incorporará el concepto de **autogestión**: Contabilidad (y otros clientes internos) deberá poder consultar y descargar sus propios informes desde el ERP, sin solicitarlos por correo.
6. La persona encargada del cargo (Maris) **deberá tener la información al día en el ERP** para que el resto de áreas pueda ver información real.
7. El proyecto de Tesorería será atendido por **Luis Carvajal** (líder analista) con apoyo de **Luis Rojas**.

---

## 11. Próximos pasos

| # | Acción | Responsable | Plazo |
|---|---|---|---|
| 1 | Aprobar el acta de esta reunión | Laura + equipo | Antes de la próxima semana |
| 2 | Compartir el acta con el SGI (Pedro) y la gerencia | Equipo del proyecto | Después de aprobada |
| 3 | Iniciar la **inmersión / levantamiento detallado** del proceso | Luis Carvajal (+ Luis Rojas) | Próxima semana (o antes) |
| 4 | Entrevistar a Maris, Laura y al SGI | Luis Carvajal | Por agendar |
| 5 | Levantar fuentes, herramientas, subprocesos a detalle | Luis Carvajal | Próxima fase |
| 6 | Revisar contraflujos y proponer mejoras de proceso | Equipo del proyecto | Próxima fase |
| 7 | Empezar a alimentar **flujo de caja** y **gastos fijos** desde la fuente | Tesorería (Maris) | Continuo / paralelo |

---

## 12. Cierre

- Se confirma que este es un **mapa general / bosquejo macro** del proceso. **No es el detalle**.
- El detalle se construirá con uno de los analistas (Luis Carvajal) en apoyo de Luis Rojas.
- Laura confirma que la base inicial es suficiente para arrancar. Las nuevas necesidades que surjan durante el desarrollo se irán atendiendo.
- Se insiste en que el éxito del proyecto depende de la **adopción por parte del usuario** (Maris y, eventualmente, las auxiliares administrativas que la apoyen).

---

### Firmas de aprobación

| Nombre | Cargo | Firma | Fecha |
|---|---|---|---|
| Laura | Jefa de Tesorería | _______________ | ____/____/____ |
| _(Representante SGI)_ | Director SGI | _______________ | ____/____/____ |
| _(Gerencia)_ | Gerencia | _______________ | ____/____/____ |
| _(Project Lead)_ | Líder del proyecto | _______________ | ____/____/____ |

---

> **Documento generado a partir de la transcripción de la reunión de levantamiento de información.**
> Cualquier ajuste posterior debe quedar registrado en una nueva versión del acta.
