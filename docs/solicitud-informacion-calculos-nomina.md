# Solicitud de informacion para calculos de nomina

## Objetivo

Solicitar a Gestion Humana/Nomina la confirmacion oficial de las reglas, fuentes, formatos, responsables y criterios operativos que deben aplicar el portal y el ERP para:

- Definir el tratamiento funcional de horas extras, autorizaciones, topes, bolsa de horas y reporte a nomina.
- Ejecutar reglas del modulo de liquidacion de nomina.
- Generar cartas laborales.
- Consultar, publicar o enviar desprendibles de pago.

El objetivo es evitar que TI parametrice calculos, documentos o flujos de publicacion con base en supuestos. Toda regla debe quedar respaldada por una respuesta oficial de Gestion Humana/Nomina, una politica interna, una configuracion vigente del sistema de nomina, una fuente legal aplicable o una definicion formal del proceso.

Para agilizar la revision, las preguntas especificas de horarios, jornadas, turnos, almuerzo, redondeos, recargos nocturnos, cruce de fechas y calendario de festivos quedaron separadas en [solicitud-informacion-horarios-horas-extras.md](solicitud-informacion-horarios-horas-extras.md).

El presente documento se organiza en cuatro bloques:

1. Horas extras.
2. Modulo de liquidacion de nomina.
3. Cartas laborales.
4. Desprendibles de pago.

## Contexto general

El portal y el ERP intervienen en procesos sensibles de Gestion Humana: calculo de novedades, validacion de nomina, generacion de documentos laborales y consulta de informacion salarial. Por esa razon, se requiere confirmacion funcional antes de cerrar reglas de calculo, formatos de documentos, rutas de archivos, permisos, aprobaciones o automatizaciones.

Para el modulo de horas extras, este documento conserva las decisiones de autorizacion, control, pago, bolsa, codigos y reporte a nomina. Las reglas de jornada y horario que alimentan el motor de calculo se documentan aparte para que Gestion Humana/Nomina pueda revisarlas sin mezclar temas.

Actualmente, el sistema contempla una marca de autorizacion de horas extras del empleado: valor base del ERP (`autoriza_he_default`) y, si existe, override del portal (`autoriza_he_override`). Tambien se requiere confirmar si existen restricciones por establecimiento para reconocer horas extras o recargos. Esa configuracion tecnica inicial debe ser confirmada por Gestion Humana/Nomina antes de usarla como regla oficial.

Lo mismo aplica para liquidacion de nomina, cartas laborales y desprendibles de pago: ninguna regla, formato, ruta, permiso o automatizacion debe tratarse como definitiva sin validacion formal del area responsable.

## Bloque 1: horas extras

Equipo de Gestion Humana/Nomina,

Para parametrizar correctamente el modulo de horas extras del portal, solicitamos confirmar las siguientes decisiones. La respuesta debe indicar la regla oficial que debe aplicar el sistema, la fuente o soporte, el responsable que aprueba la regla y la fecha desde la cual esta vigente.

Las reglas de horarios y turnos se responden en el documento complementario de horarios. Aqui se solicita confirmar que debe ocurrir con las horas ya calculadas por el motor.

### Decisiones obligatorias de control, autorizacion y pago

| # | Decision requerida | Pregunta para Gestion Humana/Nomina | Detalle a confirmar | Respuesta oficial |
|---|---|---|---|---|
| 1 | Alcance del modulo | Cuando el motor identifique tiempo adicional, recargo o festivo, que debe hacer el portal con esa novedad? | Confirmar si el portal solo registra y reporta, si tambien liquida valor esperado, o si debe bloquear ciertos casos antes de enviarlos a nomina. |  |
| 2 | Topes y controles | Que limites de horas extra debe validar el portal y que debe hacer si se superan? | Confirmar topes diarios, semanales o mensuales, y si el sistema debe bloquear, advertir o permitir con aprobacion especial. |  |
| 3 | Autorizacion de horas extra | Una hora extra debe estar autorizada antes de registrarse o puede aprobarse despues? | Confirmar aprobadores, soporte requerido y si la autorizacion aplica por dia, semana, empleado, area u orden de trabajo. |  |
| 4 | Empleado no autorizado para HE | Si un empleado esta marcado como no autorizado para horas extras y aun asi registra tiempo adicional, que debe hacer el portal? | Confirmar si bloquea, guarda solo evidencia, descarta, envia a aprobacion excepcional, reporta sin liquidar o convierte el tiempo en otra novedad. |  |
| 5 | Registro operativo no autorizado | Si el empleado no esta autorizado para HE pero realmente trabajo tiempo adicional, se debe conservar el dato de entrada/salida? | Confirmar si se guarda trazabilidad aunque no se liquide como HE, que estado debe usar y quien puede consultarlo. |  |
| 6 | Aprobacion excepcional | Existe un flujo para autorizar excepcionalmente horas extra de un empleado que inicialmente no esta autorizado? | Confirmar quien aprueba, que soporte exige, si modifica el override del portal y si aplica solo al dia/semana o queda permanente. |  |
| 7 | Fuente de autorizacion HE | Cual es la fuente oficial para saber si un empleado esta autorizado para horas extra? | El portal ya contempla valor base del ERP (`autoriza_he_default`) y override interno (`autoriza_he_override`). Confirmar prioridad, vigencia, responsable y proceso de actualizacion. |  |
| 8 | Restriccion por establecimiento | Si se reportan horas extras o recargos para un empleado cuyo establecimiento no esta autorizado para reconocerlos, que debe hacer el portal? | Confirmar si se bloquea el registro, se guarda como pendiente, se conserva solo como evidencia, se envia a aprobacion excepcional, se reporta sin liquidar o si debe existir una tabla especial por establecimiento para definir que horas extras/recargos se reconocen. |  |
| 9 | Bolsa de horas | La empresa manejara bolsa de horas compensatorias o todas las horas extras se pagaran en nomina? | Si hay bolsa, confirmar conceptos que acumulan, factor de acumulacion, autorizacion de consumo, vencimiento y casos en que debe pagarse. |  |
| 10 | Pago y cortes de nomina | Cuando se pagan las horas extras aprobadas y que pasa con registros tardios? | Confirmar cortes de nomina, aprobaciones despues del cierre, pago en siguiente periodo o aprobacion especial. |  |
| 11 | Codigos oficiales de nomina | Que codigo debe enviarse al ERP/nomina para cada concepto? | Confirmar codigos para HED, HEN, HEFD, HEFN, recargo nocturno, dominical, festivo, compensatorio, bolsa y conceptos que no se liquidan. |  |
| 12 | Base salarial | Con que base se calcula el valor de la hora cuando aplique liquidacion? | Confirmar si se usa solo salario basico o tambien otros conceptos salariales, y si el auxilio de transporte afecta algun calculo. |  |
| 13 | Casos de prueba oficiales | Nomina puede entregar ejemplos reales con resultado esperado? | Incluir salario, entrada/salida, almuerzo, tipo de dia, autorizacion HE, codigo esperado, horas calculadas y valor final. |  |

### Casos de ejemplo para confirmar

Estos casos no son reglas propuestas por TI. Sirven para que Gestion Humana/Nomina indique cual debe ser el tratamiento correcto esperado por el portal.

| Caso | Pregunta concreta | Respuesta de Nomina |
|---|---|---|
| Empleado no autorizado para HE trabaja 2 horas adicionales. | El portal bloquea, conserva evidencia, pide aprobacion excepcional o reporta sin liquidar? |  |
| Empleado registra HE o recargos en un establecimiento que no esta autorizado para reconocerlos. | El portal bloquea, deja pendiente, conserva evidencia, pide aprobacion excepcional o aplica una tabla de conceptos reconocidos por establecimiento? |  |
| Empleado autorizado supera el tope mensual definido. | El portal bloquea, advierte, permite con aprobacion especial o reporta a Nomina con observacion? |  |
| Hora extra aprobada llega despues del cierre de nomina. | Se rechaza, se paga en la siguiente nomina o requiere aprobacion especial? |  |
| Tiempo adicional queda registrado como evidencia pero no como HE liquidable. | Que estado, codigo o observacion debe usar el sistema? |  |
| Empleado consume horas acumuladas en bolsa como descanso. | Quien aprueba el consumo y como se descuenta del saldo? |  |

### Formato de respuesta esperado

Para cada decision, solicitamos responder con estos datos:

| Campo | Informacion requerida |
|---|---|
| Respuesta oficial | Regla que debe aplicar el portal. |
| Fuente o soporte | Politica interna, contrato, convencion, ERP, concepto juridico o norma aplicable. |
| Responsable | Area o persona que aprueba la regla. |
| Fecha de vigencia | Desde cuando aplica. |
| Excepciones | Cargos, contratos, sedes, areas, centros de costo o casos especiales. |
| Ejemplo validado | Caso de prueba con resultado esperado, cuando aplique. |

### Punto critico para Desarrollo

Hasta recibir respuesta formal, el portal no debe tratar como definitiva ninguna regla laboral o de liquidacion. Cualquier parametro actual debe considerarse provisional y sujeto a validacion de Gestion Humana/Nomina.

La respuesta oficial a este documento y al documento complementario de horarios sera el insumo para ajustar la parametrizacion, las validaciones, las advertencias y los casos de prueba del motor de calculo de `/service-portal/horas-extras`.

---

## Modulo de liquidacion de nomina

### Contexto

Este bloque busca confirmar las reglas funcionales del modulo de liquidacion de nomina. Necesitamos que Gestion Humana/Nomina indique como debe calcularse cada concepto, que informacion debe usarse como fuente oficial y que debe hacer el sistema cuando el resultado no coincida con lo liquidado en nomina.

### Decisiones obligatorias para calculo por campo (12 puntos)

| # | Decision requerida | Pregunta para Gestion Humana/Nomina | Detalle a confirmar | Respuesta oficial |
|---|---|---|---|---|
| 1 | Flujo SIIGO vs auditoria ERP | Confirmamos que hay dos flujos separados: generar interfaz para SIIGO y auditar despues lo que SIIGO liquido? | Definir si el ERP debe calcular valores para enviar a SIIGO, para auditar SIIGO, o para ambos. |  |
| 2 | Periodo y prorrateo | La nomina se calcula por quincena Q1/Q2 y los valores se prorratean con divisor 30? | Confirmar Q1/Q2, ingresos, retiros, fechas centinela de retiro y si este criterio aplica a sueldo, auxilio transporte y auxilios contractuales. |  |
| 3 | Sueldo y salario vigente | `beneficio.salario` es la fuente oficial del sueldo vigente para la fecha de liquidacion? | Confirmar si basta el salario actual o si se requiere historico salarial; confirmar si licencias no remuneradas descuentan sueldo o van solo como deduccion separada. |  |
| 4 | Auxilio de transporte | El auxilio de transporte se calcula proporcional a dias trabajados y con tope de 2 SMLV? | Confirmar fuente del SMLV, valor legal, exclusiones por perfil/cargo y tratamiento de aprendices SENA. |  |
| 5 | Horas y recargos por campo | Cuales son el divisor de hora, factores y nombres oficiales para HED, HEN, RN, RF, HF, HEFD y HEFN? | La documentacion tiene inconsistencias entre `220`/`240`, `RF`/`HF` y nombres `HEFD`/`HEFN` vs `HEDF`/`HENF`. |  |
| 6 | Fuente de cantidades | Para conceptos por horas, dias o valores, que campo debe usar el ERP como cantidad oficial? | Confirmar uso de `horas`, `dias` y `valor` en `nomina_registros_normalizados`, y que hacer si llega en el campo equivocado. |  |
| 7 | Rodamiento y alimentacion NCS | Como se calculan rodamiento y alimentacion: mensual, quincenal, fijo o prorrateado? | Confirmar autorizacion de rodamiento, uso de `baseRodamiento`, prioridad entre alimentacion quincenal/mensual y perfiles autorizados. |  |
| 8 | Bases prestacionales | Que conceptos entran a seguridad social, prestaciones, fondo solidaridad y retefuente? | Confirmar naturaleza salarial/no salarial de rodamiento, alimentacion NCS, comisiones, auxilios y excepciones por contrato o politica. |  |
| 9 | Conceptos fijos SIIGO | Que conceptos no deben exportarse porque ya estan fijos en SIIGO, pero si deben auditarse? | La documentacion sugiere `20` rodamiento, `22` alimentacion NCS y `55` plan funerario. Confirmar si siempre se excluyen o depende del perfil/grupo. |  |
| 10 | Formato interfaz SIIGO | Cual es el formato oficial que SIIGO recibe para cada concepto? | Confirmar archivo `.xls`/`.xlsx`/`.csv`, formato decimal, `VARIABLE`, `VALOR`, grupo/cuenta y reglas para valores, horas y dias. |  |
| 11 | Estados y excepciones | Que estados de `estado_validacion` entran al calculo y cuales se excluyen? | Confirmar estados incluidos/excluidos, excepciones manuales, pagos a terceros, exoneraciones, retirados y registros sin establecimiento. |  |
| 12 | Auditoria y diferencias | Como redondea SIIGO y que debe hacer el ERP cuando su valor esperado difiere del liquidado? | Confirmar tolerancias, aprobacion, ajuste, descuento en siguiente periodo, aceptacion de diferencia o escalamiento. |  |

### Casos de ejemplo para calculo por campo

| Caso | Pregunta concreta | Respuesta de Nomina |
|---|---|---|
| Empleado con salario mensual de $3.000.000 activo toda Q1. | Sueldo basico Q1 = 3.000.000 * 15 / 30? |  |
| Empleado ingresa el dia 10 de Q1 con salario de $3.000.000. | Se pagan 6 dias de sueldo? El auxilio de transporte tambien se prorratea con esos dias? |  |
| Empleado se retira el dia 20 en Q2. | Se pagan solo dias 16 al 20? Que pasa con auxilio transporte y auxilios contractuales? |  |
| Empleado tiene salario inferior a 2 SMLV. | Recibe auxilio de transporte proporcional a dias trabajados? |  |
| Empleado supera 2 SMLV por salario base, pero tiene novedades o comisiones. | El tope del auxilio se evalua solo con salario base o con ingresos del periodo? |  |
| Aprendiz SENA en etapa lectiva o practica. | Como se calcula sueldo/cuota sostenimiento y auxilio de transporte? |  |
| Empleado con rodamiento de $300.000 y autorizado. | El valor se paga mensual prorrateado, mitad por quincena o fijo por periodo? |  |
| Empleado con rodamiento pero sin autorizacion. | Se paga cero, se bloquea, o queda para aprobacion? |  |
| Empleado tiene alimentacion quincenal y mensual diligenciadas. | Cual campo tiene prioridad y si se prorratea por ingreso/retiro? |  |
| Concepto `20`, `22` o `55` aparece en novedades origen. | Se excluye de interfaz SIIGO por ser fijo, pero se audita de todas formas? |  |
| Concepto de horas llega con cantidad en `valor` y no en `horas`. | El ERP debe interpretarlo como cantidad o marcar error de calidad de dato? |  |
| SIIGO liquida un valor diferente al calculado por ERP. | La diferencia se ajusta, se acepta, se descuenta en siguiente periodo o se escala a revision? |  |

Para esta seccion tambien se solicita responder con el formato oficial indicado arriba: respuesta oficial, fuente o soporte, responsable, fecha de vigencia, excepciones y ejemplo validado cuando aplique.

---

## Cartas laborales

### Contexto

Este bloque busca confirmar los criterios funcionales para generar cartas laborales desde el portal. Gestion Humana debe definir que tipos de carta se pueden emitir, que datos debe contener cada una, quien las aprueba y cual es el formato oficial.

### Decisiones obligatorias para cartas laborales

| # | Decision requerida | Pregunta para Gestion Humana/Nomina | Detalle a confirmar | Respuesta oficial |
|---|---|---|---|---|
| 1 | Tipos de carta | Que tipos de cartas laborales debe generar el portal? | Confirmar carta laboral simple, con salario, sin salario, para banco, estudio, visa u otros usos. |  |
| 2 | Plantilla oficial | Cual es el formato institucional que debe usarse? | Entregar plantilla oficial editable, membrete, textos fijos, logos, ciudad, fecha y estructura. |  |
| 3 | Datos obligatorios | Que datos debe contener cada tipo de carta? | Confirmar nombre, cedula, cargo, salario, tipo de contrato, fecha de ingreso, empresa, estado, ciudad y destinatario. |  |
| 4 | Manejo del salario | En que cartas debe mostrarse salario y como debe presentarse? | Confirmar si se muestra salario basico, promedio, integral, auxilios, beneficios o si debe omitirse. |  |
| 5 | Firma y aprobacion | Quien firma y quien aprueba la carta antes de generarla? | Confirmar responsable, cargo, firma digital/imagen, validacion previa y casos que requieren aprobacion manual. |  |
| 6 | Formato de salida | La carta debe generarse en PDF, Word o ambos? | Confirmar si el empleado puede descargarla, si debe enviarse por correo o si queda solo para gestion interna. |  |
| 7 | Almacenamiento | Como se deben nombrar y conservar las cartas generadas? | Confirmar nomenclatura, ruta o repositorio, tiempo de conservacion y si se guarda copia por empleado. |  |
| 8 | Restricciones | Hay empleados o situaciones donde no se debe generar carta automaticamente? | Confirmar restricciones por estado del contrato, retiro, tipo de contrato, cargo, sanciones, periodo de prueba u otros casos. |  |

### Casos de ejemplo para cartas laborales

| Caso | Pregunta concreta | Respuesta de Gestion Humana |
|---|---|---|
| Empleado activo solicita carta laboral simple. | Que datos debe mostrar y quien puede generarla? |  |
| Empleado solicita carta para banco con salario. | Debe incluir salario basico, auxilios, promedio o beneficios? |  |
| Empleado solicita carta sin salario para estudio. | Existe plantilla distinta o se usa la misma omitiendo salario? |  |
| Empleado retirado solicita certificacion laboral. | El portal puede generarla automaticamente o requiere aprobacion manual? |  |
| Carta requiere firma de Gestion Humana. | Se usa firma digital, imagen de firma o firma manual posterior? |  |

---

## Desprendibles de pago

### Contexto

Este bloque busca confirmar la fuente oficial, ruta, permisos y reglas para consultar, publicar o enviar desprendibles de pago desde el portal. Estos documentos contienen informacion salarial, por lo que se requiere autorizacion funcional y reglas claras de confidencialidad.

### Decisiones obligatorias para desprendibles

| # | Decision requerida | Pregunta para Gestion Humana/Nomina | Detalle a confirmar | Respuesta oficial |
|---|---|---|---|---|
| 1 | Fuente oficial | Cual es el desprendible valido: SIIGO, ERP, Excel, portal u otra fuente? | Confirmar cual documento debe publicarse y cual no debe usarse como oficial. |  |
| 2 | Ruta actual | Donde se generan, guardan o consultan actualmente los desprendibles? | Confirmar carpeta de red, SIIGO, portal, archivo local u otro repositorio. |  |
| 3 | Periodicidad | Los desprendibles se generan por Q1, Q2, mensual u otro periodo? | Confirmar cuando existe desprendible y que periodo debe ver el empleado. |  |
| 4 | Formato y nombre | En que formato estan y como se nombran los archivos? | Confirmar PDF, Excel u otro; nomenclatura por cedula, periodo, quincena, nombre o ano. |  |
| 5 | Permisos | Quien puede consultar, descargar, publicar o administrar desprendibles? | Confirmar permisos para empleado, Gestion Humana, Nomina, jefes, administradores y auditoria. |  |
| 6 | Publicacion en portal | Gestion Humana autoriza publicar o enviar desprendibles desde el portal? | Confirmar canal: descarga en perfil, correo, publicacion automatica o esquema mixto. |  |
| 7 | Momento de publicacion | Cuando se debe publicar o enviar el desprendible? | Confirmar si es al cierre, despues de aprobacion, despues de cargar SIIGO o en otra fecha. |  |
| 8 | Trazabilidad y errores | Que registro debe quedar y que hacer si un desprendible no se encuentra o falla el envio? | Confirmar log de consulta/envio, reintentos, errores, soporte y responsable de correccion. |  |
| 9 | Historico | Desde que fecha se deben conservar y consultar desprendibles historicos? | Confirmar alcance de migracion, retencion documental y acceso a periodos anteriores. |  |

### Casos de ejemplo para desprendibles

| Caso | Pregunta concreta | Respuesta de Gestion Humana |
|---|---|---|
| Empleado consulta su desprendible de Q1. | Debe verlo apenas cierre la nomina o despues de aprobacion de Gestion Humana? |  |
| Desprendible no existe en la ruta oficial. | El portal muestra error, crea solicitud a Nomina o reintenta busqueda? |  |
| Empleado retirado solicita desprendible historico. | Puede consultarlo por portal o debe solicitarlo a Gestion Humana? |  |
| Hay desprendible en SIIGO y otro archivo en carpeta interna. | Cual es el oficial que debe publicar el portal? |  |
| Se envia desprendible por correo. | Debe quedar registro de fecha, hora, destinatario, periodo y estado de envio? |  |

Para cartas laborales y desprendibles tambien se solicita responder con el formato oficial indicado arriba: respuesta oficial, fuente o soporte, responsable, fecha de vigencia, excepciones y ejemplo validado cuando aplique.
