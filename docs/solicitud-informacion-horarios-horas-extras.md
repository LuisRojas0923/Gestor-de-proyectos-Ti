# Solicitud de informacion sobre horarios para horas extras

## Objetivo

Solicitar a Gestion Humana/Nomina la confirmacion oficial de las reglas de horarios que debe usar el motor de calculo del modulo `/service-portal/horas-extras`.

Este documento se separa del documento general de nomina para revisar mas rapido las preguntas de jornada, turnos, almuerzo, redondeos, recargos nocturnos, cruce de fechas y festivos. Las decisiones de autorizacion, empleados no autorizados, bolsa de horas, pago, topes y codigos oficiales se mantienen en [solicitud-informacion-calculos-nomina.md](solicitud-informacion-calculos-nomina.md).

## Contexto del modulo

El portal recibe como dato operativo principal:

- Fecha del registro.
- Hora de ingreso.
- Hora de salida.
- Minutos de almuerzo o pausa, cuando aplique.

Con esos datos, el motor calcula tiempo trabajado y lo clasifica como jornada ordinaria, hora extra, recargo nocturno, domingo/festivo o cruce de conceptos. TI necesita que Gestion Humana/Nomina confirme la regla oficial antes de dejar parametros definitivos.

Configuraciones tecnicas que requieren confirmacion:

- Clasificacion preliminar de hora extra por exceso sobre la jornada ordinaria diaria.
- Franja nocturna actualmente documentada para validacion: `19:00` a `06:00`.
- Divisor mensual usado en calculos de valor hora, cuando aplique.
- Calendario de festivos nacionales de Colombia con Ley Emiliani.

Estos valores no deben asumirse como politica laboral definitiva hasta recibir respuesta formal.

## Decisiones obligatorias sobre horarios y jornadas

| # | Decision requerida | Pregunta para Gestion Humana/Nomina | Detalle a confirmar | Respuesta oficial |
|---|---|---|---|---|
| 1 | Jornada ordinaria | Cuales son las horas ordinarias diarias, semanales y mensuales que debe usar el sistema? | Confirmar horas por dia, horas por semana, divisor mensual y si cambia por empleado, cargo, area, sede, empresa o centro de costo. |  |
| 2 | Regla base de hora extra | El portal debe calcular horas extra por exceso diario, por exceso semanal o por una regla mixta? | Aclarar si se comparan las horas contra el horario pactado de cada dia, contra el total semanal, o contra ambos criterios. |  |
| 3 | Compensacion entre dias | Las horas faltantes de un dia pueden compensarse con horas adicionales de otro dia dentro de la misma semana? | Ejemplo: trabaja 7 horas un dia y 9 horas otro. Confirmar si se compensa o si la hora adicional se liquida como extra. |  |
| 4 | Horario pactado | El portal debe comparar la entrada/salida real contra un horario pactado del empleado? | Confirmar si el horario se parametriza por empleado, cargo, area, sede o turno, o si solo importa el total de horas trabajadas. |  |
| 5 | Trabajo antes o despues del horario | Que pasa con el tiempo registrado antes de la entrada pactada o despues de la salida pactada? | Confirmar si se liquida automaticamente, requiere autorizacion, queda solo como evidencia, se ignora o se registra como otra novedad. |  |
| 6 | Cambio de turno por urgencia | Si a un empleado le cambian el turno por necesidad operativa, el nuevo horario reemplaza la jornada del dia o se suma a la jornada normal? | Confirmar como se reporta el cambio, quien lo autoriza y si el sistema debe reconocerlo como turno ordinario, extra o mixto. |  |
| 7 | Almuerzo y pausas | Que tiempos se deben descontar de la jornada registrada? | Confirmar minutos de almuerzo, pausas no remuneradas, descansos obligatorios y si el descuento es fijo o editable por dia. |  |
| 8 | Redondeo | Como debe redondear el sistema las horas y minutos trabajados? | Confirmar si se usan minutos exactos, bloques de 15 minutos, bloques de 30 minutos, redondeo hacia arriba/abajo u otra regla. |  |
| 9 | Recargo nocturno | Cual es la franja oficial de recargo nocturno y como se divide una jornada que la cruza? | Confirmar hora de inicio, hora de fin y si el sistema debe separar tramos diurnos/nocturnos dentro del mismo registro. |  |
| 10 | Cruce de fecha | Si una jornada inicia un dia y termina al dia siguiente, el sistema debe partir el registro por fecha calendario? | Confirmar como separar horas antes y despues de medianoche, y que pasa si el segundo dia es sabado, domingo o festivo. |  |
| 11 | Sabados, domingos y festivos | Como debe identificar el portal el tipo de dia trabajado? | Confirmar tratamiento de sabados, domingos y festivos, y si se aplican reglas distintas por sede, cargo, contrato o turno. |  |
| 12 | Festivos Colombia | El motor usa actualmente el calendario de festivos nacionales de Colombia con Ley Emiliani. Gestion Humana/Nomina confirma que esta es la regla oficial? | Confirmar si se acepta Ley Emiliani como fuente oficial, si debe usarse otro calendario interno/ERP, y que hacer cuando una hora festiva tambien es nocturna. |  |

## Casos de ejemplo para confirmar

Estos casos no son reglas propuestas por TI. Sirven para que Gestion Humana/Nomina indique cual debe ser el calculo correcto esperado por el portal.

| Caso | Pregunta concreta | Respuesta de Nomina |
|---|---|---|
| Turno pactado lunes a jueves 07:30-17:00; el viernes, por urgencia, trabaja 19:00-06:00 del sabado. | Ese turno reemplaza la jornada ordinaria del viernes o se suma? Como se separan horas ordinarias, extras, nocturnas y sabado? |  |
| Empleado trabaja 9 horas diarias de lunes a viernes. | Se liquida 1 hora extra diaria o solo se revisa el total semanal? |  |
| Empleado trabaja 7 horas un dia y 9 horas otro dentro de la misma semana. | Se compensan las horas entre dias o la hora adicional se liquida como extra? |  |
| Empleado con horario 07:30-17:00 ingresa a las 06:30 y sale a las 17:00. | La hora antes del horario pactado se liquida, requiere autorizacion o queda solo como registro? |  |
| Empleado con horario 07:30-17:00 sale a las 19:00. | Las 2 horas despues del horario se liquidan como HE, requieren aprobacion o se clasifican de otra forma? |  |
| Empleado trabaja 19:00-06:00 en un dia ordinario. | Que parte es jornada ordinaria, que parte es recargo nocturno y que parte seria hora extra? |  |
| Empleado trabaja 19:00-06:00 y el dia siguiente es sabado, domingo o festivo. | El sistema debe dividir el turno por fecha calendario y aplicar concepto distinto despues de medianoche? |  |
| Empleado trabaja en un festivo calculado con Ley Emiliani. | Ese calendario es correcto y que concepto/codigo debe reportarse? |  |
| Empleado trabaja en franja nocturna durante un festivo. | Se reporta como hora extra festiva nocturna, recargo festivo nocturno u otro concepto oficial? |  |
| Registro tiene almuerzo fijo, pero el empleado no tomo almuerzo por urgencia. | El portal descuenta el almuerzo de todas formas o permite ajustar el descuento del dia? |  |

## Formato de respuesta esperado

Para cada decision, solicitamos responder con estos datos:

| Campo | Informacion requerida |
|---|---|
| Respuesta oficial | Regla que debe aplicar el portal. |
| Fuente o soporte | Politica interna, contrato, convencion, ERP, concepto juridico o norma aplicable. |
| Responsable | Area o persona que aprueba la regla. |
| Fecha de vigencia | Desde cuando aplica. |
| Excepciones | Cargos, contratos, sedes, areas, centros de costo, turnos o casos especiales. |
| Ejemplo validado | Caso de prueba con resultado esperado, cuando aplique. |

## Punto critico para Desarrollo

Hasta recibir respuesta formal, el portal no debe tratar como definitiva ninguna regla de horario, jornada, recargo nocturno, cruce de fecha o festivo. Cualquier parametro actual debe considerarse provisional y sujeto a validacion de Gestion Humana/Nomina.
