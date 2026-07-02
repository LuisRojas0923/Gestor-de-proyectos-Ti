# Respuesta de Gestion Humana - Reglas de horarios para horas extras

## Fuente recibida

Documento recibido: `C:\Users\amejoramiento6\TrazaEco-Core\docs\solicitud informacion y reglas para modulo de horas extras.pdf`.

El documento responde principalmente reglas de horarios, jornada, recargos nocturnos, turnos que cruzan medianoche, festivos y manejo operativo de colaboradores no autorizados para horas extras.

Importante: el documento indica que las preguntas sobre autorizaciones, bolsa de horas, pago, topes y codigos de nomina estan en el documento complementario `solicitud-informacion-calculos-nomina.md`. Por lo tanto, la bolsa de horas no queda confirmada con este PDF.

## Reglas confirmadas

| Tema | Respuesta oficial recibida | Interpretacion funcional para el portal |
|---|---|---|
| Jornada semanal | A partir del 16 de julio de 2026 se toman 42 horas semanales y 210 horas mensuales. | El calculo no debe quedar fijo en 44 horas semanales ni 220 mensuales despues de esa fecha. |
| Generacion de hora extra | La revision es semanal. | La hora extra no debe determinarse solo por exceso diario; debe revisarse el total semanal. |
| Compensacion entre dias | Si se compensa, pero debe existir opcion para marcar si la hora es compensada o no, y verificar permisos concedidos con autorizacion. | El sistema necesita una decision de usuario/aprobador para marcar compensacion; no debe compensar sin trazabilidad. |
| Dominical programado | Si se programa un dominical, se debe pagar como recargo por trabajo extra segun informacion autorizada por lideres. | El dominical autorizado no debe perderse por compensacion semanal ordinaria. |
| Horario pactado | El sistema debe comparar entrada y salida real contra el horario habitual por cumplimiento normativo. | El horario pactado debe ser insumo del calculo y de auditoria. |
| Tiempo antes o despues del horario | Se deja registro, pero no se paga horas extras sin autorizacion del jefe inmediato. | El portal debe conservar evidencia aunque no liquide automaticamente. |
| Cambio de turno | Reemplaza la jornada de acuerdo con el cliente y debe existir opcion de modificar la jornada habitual. | Se requiere funcionalidad para cambio de turno autorizado o jornada contingente. |
| Almuerzo administrativo | Para personal administrativo se toma por defecto 30 minutos sin necesidad de marcar. | Administrativos deben tener almuerzo default de 30 minutos. |
| Almuerzo operativo | En operaciones, el horario asignado queda de acuerdo con el area, obra o cliente. | No hay un unico almuerzo operativo; debe depender del horario/obra/cliente. |
| Otras pausas | No se manejan otras pausas o descansos aparte del almuerzo. | No se requiere campo adicional de pausas por ahora. |
| Redondeo | Unidad y 2 decimales, ejemplo 9.25, 7.50, 2.00. | Las horas deben manejarse en decimal con 2 cifras, no en bloques obligatorios de 15 o 30 minutos. |
| Jornada nocturna | Aplica cuando compromete jornada entre 7:00 p.m. y 6:00 a.m. | La franja nocturna oficial para este modulo debe ser 19:00 a 06:00. |
| Recargo nocturno ordinario | Se paga si el trabajador cumple su jornada normal entre 7:00 p.m. y 6:00 a.m. | No todo nocturno es hora extra; puede ser recargo sobre jornada normal. |
| Hora extra nocturna | Son las horas trabajadas de mas en el rango de 7:00 p.m. a 6:00 a.m. | Solo el exceso autorizado dentro de esa franja se trata como HEN. |
| Recargo dominical nocturno | Aplica a horas de jornada normal trabajadas domingo entre 7:00 p.m. y 11:59 p.m. Si continua despues de medianoche y el lunes es ordinario, pasa a recargo nocturno normal. | Los conceptos deben cambiar por fecha y tipo de dia al cruzar medianoche. |
| Turno que cruza medianoche | Se debe partir en dos dias. | El formulario/calculo debe permitir partir un turno nocturno en dos registros o tramos. |
| Autorizacion de turnos que cruzan medianoche | Autorizan los lideres del proceso. | Se necesita trazabilidad de aprobacion del lider. |
| Festivos | Se usa calendario nacional de Colombia con traslado Ley Emiliani. | La fuente actual de festivos nacionales con Ley Emiliani queda validada. |
| No autorizado para horas extras | Debe quedar registro de tiempos realizados aunque no exista autorizacion previa para pago de horas extras. | No se debe bloquear el registro operativo; debe guardarse como evidencia. |
| No autorizado con recargos | Colaboradores no autorizados deben tener parametro normativo para pagar sus respectivos recargos festivos y/o nocturnos. | Aunque no haya HE autorizada, algunos recargos normativos podrian reconocerse. Se requiere parametrizacion por concepto permitido. |

## Conceptos mencionados por Gestion Humana

| Concepto | Descripcion recibida | Nota funcional |
|---|---|---|
| Recargo Nocturno Ordinario | Se paga si el trabajador cumple su jornada normal entre 7:00 p.m. y 6:00 a.m. | Debe separarse de HEN. |
| HEN | Hora Extra Nocturna: horas trabajadas de mas entre 7:00 p.m. y 6:00 a.m. | Requiere exceso y autorizacion para pago. |
| Recargo Dominical Nocturno | Horas normales del domingo entre 7:00 p.m. y 11:59 p.m.; despues de medianoche pasa a RN si el lunes es ordinario. | Requiere cambio de concepto por dia. |
| Recargo Dominical Diurno | Jornada normal del domingo entre 6:00 a.m. y 7:00 p.m. | Aplica sobre jornada normal dominical. |
| HEDF | Hora Extra Diurna Dominical/Festiva entre 6:00 a.m. y 7:00 p.m. | En codigo/documentos tambien aparece como HEFD; hay que alinear nombre oficial. |
| HENF | Hora Extra Nocturna Dominical/Festiva entre 7:00 p.m. y 6:00 a.m. | En codigo/documentos tambien aparece como HEFN; hay que alinear nombre oficial. |
| HF | Dominicales no compensados. | Requiere confirmar si corresponde al codigo actual del portal. |
| RF | Recargo Nocturno Festivo Sin Compensar. | Requiere confirmar formula/codigo exacto de nomina. |

## Casos respondidos

| Caso | Respuesta recibida | Criterio que deja |
|---|---|---|
| Trabaja 9 horas todos los dias de lunes a viernes. | Se revisa el total general y se reporta la HE, pidiendo autorizacion de incluir o no en nomina. | El calculo debe ser semanal y el pago requiere autorizacion. |
| Un dia trabaja 7 horas y otro 9 en la misma semana. | Se compensa y se revisa el total general segun la jornada ordinaria. | Debe existir compensacion semanal, pero con opcion y verificacion de permisos. |
| Entra antes del horario habitual. | Se requiere autorizacion y debe quedar registro. | Evidencia obligatoria; pago condicionado a autorizacion. |
| Sale despues del horario habitual. | Se requiere autorizacion y debe quedar registro. | Evidencia obligatoria; pago condicionado a autorizacion. |
| Trabaja festivo segun calendario nacional. | Se usa calendario nacional de Colombia con traslado Ley Emiliani. | Fuente de festivos validada. |
| Almuerzo no tomado por urgencia. | El horario asignado queda de acuerdo con el area y la obra. | No hay regla unica; debe depender del contexto operativo. |
| Colaborador no autorizado reporta horas o recargos. | Se requiere autorizacion para pago de horas extras y recargos; sin embargo debe quedar registro. | No bloquear captura; separar evidencia de liquidacion. |

## Pendientes que no quedan cerrados

| Tema pendiente | Motivo |
|---|---|
| Bolsa de horas | El PDF no responde si se manejara bolsa. Dice que bolsa esta en el documento complementario. No debe activarse ni asumirse con esta respuesta. |
| Factor de acumulacion de bolsa | No hay respuesta 1:1, 1.5:1 u otra. |
| Consumo de bolsa | No se define quien aprueba consumo ni cuando se descuenta. |
| Pago vs compensacion | Se menciona que debe existir opcion de marcar compensada o no, pero no define politica completa de bolsa. |
| Topes de horas extras | El PDF confirma revision semanal, pero no define topes concretos ni si se bloquea o advierte al superarlos. |
| Codigos oficiales de nomina | Aparecen nombres HEDF/HENF, HF y RF, pero no codigos finales de exportacion ni equivalencias con los codigos actuales del sistema. |
| Factores de liquidacion | No se confirman porcentajes/factores de HED, HEN, HEDF, HENF, RN, RF, HF. |
| Base salarial y divisor | Se confirma 210 horas mensuales desde 16 de julio de 2026, pero no se confirma formula completa del valor hora ni base salarial. |
| Casos 6 y 7 completos | El documento incluye imagen/ejemplo, pero la respuesta textual no deja completamente formalizada la separacion de horas y conceptos para todos los escenarios. |

## Implicaciones para desarrollo

| Area | Cambio o validacion necesaria |
|---|---|
| Motor de calculo | Cambiar de logica fija diaria a revision semanal con comparacion contra horario pactado. |
| Parametros legales | Agregar vigencia: 42 h semanales y 210 h mensuales desde 2026-07-16. |
| Jornada nocturna | Usar franja 19:00 a 06:00 para RN/HEN/recargos nocturnos. |
| Turnos cruzando medianoche | Permitir partir turnos en dos dias/tramos. |
| Evidencia | Guardar registros aunque no sean liquidables por falta de autorizacion. |
| Autorizacion | Separar registro operativo de aprobacion para pago. |
| Recargos para no autorizados | Permitir parametrizar recargos normativos reconocibles aunque el empleado no tenga autorizacion de HE. |
| Compensacion semanal | Agregar opcion explicita para marcar si horas se compensan o no, con autorizacion. |
| Festivos | Mantener calendario nacional Colombia con traslado Ley Emiliani. |
| Nombres de conceptos | Alinear codigos del sistema con nombres usados por Nomina: HEDF/HENF vs HEFD/HEFN. |

## Conclusion sobre bolsa de horas

Con esta respuesta no se puede concluir que la empresa manejara bolsa de horas.

Lo recibido solo confirma que debe existir la opcion de marcar si unas horas son compensadas o no, y que debe verificarse autorizacion. Eso no equivale a una politica completa de bolsa de horas.

Para activar bolsa se necesita todavia una respuesta formal a estas preguntas minimas:

| Pregunta critica | Por que falta |
|---|---|
| ¿La empresa manejara bolsa de horas compensatorias? | El PDF no lo responde. |
| ¿Que conceptos acumulan bolsa? | No se define. |
| ¿El factor es 1:1, 1.5:1 u otro? | No se define. |
| ¿Quien aprueba que una hora vaya a bolsa y no a pago? | No se define como politica de bolsa. |
| ¿Quien aprueba el consumo de horas compensadas? | No se define. |
| ¿La bolsa vence? | No se define. |
| ¿Cuando una hora en bolsa debe pagarse en nomina? | No se define. |

Recomendacion: mantener la bolsa de horas desactivada como regla de calculo automatico hasta recibir respuesta formal del documento complementario de calculos de nomina.
