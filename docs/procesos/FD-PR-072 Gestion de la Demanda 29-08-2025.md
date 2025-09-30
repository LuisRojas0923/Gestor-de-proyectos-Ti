# 1. OBJETIVO

Gestionar los proyectos y/o requerimientos para la
implementación de mejoras, nuevas funcionalidades, consultas de información o
cambios por requerimientos legales que impacten los procesos a través de los
sistemas de información utilizados en la operación de la Fiduciaria.

# 2. ALCANCE

Este procedimiento cubre la gestión de un requerimiento desde su radicación en Remedy hasta su implantación en producción y cierre.

**Incluye:** análisis, desarrollo o parametrización, pruebas, aprobaciones y despliegue.

**No incluye:** incidentes de soporte ni proyectos de infraestructura ajenos al software de negocio.

# 3. TÉRMINOS Y DEFINICIONES

**3.1. Alcance al Requerimiento:** Ajuste que no afecta
la totalidad del requerimiento, normalmente se usa para agregar detalles al
requerimiento inicial.

**3.2. Cambio de Emergencia:** Es un cambio que no puede
esperar y por lo tanto no puede seguir el procedimiento de aprobación normal.

**3.3. Correcciones:** Es la solicitud documentada para
la corrección de una inconsistencia.

**3.4. Mejoras a las Aplicaciones:** Es una necesidad
documentada que corresponda al mantenimiento continuo después del inicio del
funcionamiento de la aplicación.

**3.5. Necesidad:** Solicitud de un proyecto o
requerimiento de software identificada por un área interna de la fiduciaria.

**3.6. Nuevas Funcionalidades:** Es una necesidad
documentada sobre la forma o funcionalidad de un producto o servicio. Proceso
que el sistema debe hacer o una cualidad que el sistema debe poseer.

**3.7. ORM:** Herramienta de gestión de información que
permite acceder a los diferentes sistemas de gestión para extraer información
sin necesidad de complejos códigos o procesos.

**3.8. Proyecto:** Esfuerzo temporal que se lleva a cabo
para crear un producto, servicio o resultado único.

**3.9. Pruebas Técnicas:** Se realizan en etapa de
desarrollo. A partir de las entradas, se verifica el resultado esperado
controlando el proceso de los datos al interior del software y sus distintos
componentes (Base de datos, código, tablas, parámetros, etc.). Son
responsabilidad del proveedor/analista/programador.

**3.10. Pruebas de Usuario:** Ejecutadas por el
responsable del requerimiento para garantizar que el sistema se comporte de
acuerdo con el requerimiento realizado.

**3.11. Pruebas Unitarias:** Son las pruebas realizadas a
un componente en particular del sistema tal como un programa, un módulo, una
transacción o reporte funcional, según su especificación.

**3.12. Pruebas Integrales de Aceptación:** Son las
pruebas que pretenden demostrar que todos los aspectos del sistema trabajan
juntos y de acuerdo con lo definido en los requerimientos. Buscan aceptar que
el software entregado por el proveedor corresponda a los requerimientos de los
usuarios. Incluyen verificación de seguridad, funcionalidad, tiempos de
respuesta, nivel de carga y volumen.

**3.13. Requerimiento Legal:** Solicitud que se origina
por normas y/o leyes emitidas por los entes gubernamentales.

**3.14. Solicitud de Información:** Es una necesidad de
información documentada, que se origina por cualquier área de la empresa, ente
de control o del GECC.

**3.15. Solicitud Técnica:** Es una necesidad documentada
que no requiere más de 4 horas de esfuerzo de un ingeniero. Casos técnicos
específicamente: cargue de archivos, programas, objetos, extracción de
información y desarrollos.

**3.16. SQL:** Es un lenguaje de programación para
almacenar y procesar información en una base de datos.

**3.17. Criterios de Solicitud Técnica (No requieren
procedimiento formal):** Los siguientes requerimientos técnicos se ejecutan
sin necesidad de llevar a cabo el procedimiento descrito en este manual.

| **No.**                         | **Criterios de solicitud técnica** |
| ------------------------------------- | ----------------------------------------- |
| 1                                     | Ejecutar                                  |
| Query                                 |                                           |
| 2                                     | Validación,                              |
| revisión y preparación de ambientes |                                           |
| 3                                     | Validaciones                              |
| de novedades (soporte producción)    |                                           |
| 4                                     | Configuración                            |
| de usuarios                           |                                           |
| 5                                     | Asesorías                                |
| sobre una aplicación específica     |                                           |
| 6                                     | Soporte                                   |
| aplicación                           |                                           |
| 7                                     | Parametrización                          |

# 4. DOCUMENTOS RELACIONADOS

* **FD-FT-284**
  Formato Requerimiento de Necesidades
* **FD-FT-060**
  Formato Pruebas Aplicativo

# 5. REGLAS GENERALES

**5.1. Definición de Roles**

* **Líder
  Usuario:**

ü
Plantea la idea o necesidad del requerimiento.

ü
Socializa (cuando aplique) el requerimiento y/o
proyecto con las áreas impactadas.

ü
Diligencia previamente el formato FD-FT-284
"Requerimiento necesidades".

ü
Realiza la solicitud formal ante el área de TI
mediante la creación del requerimiento en Remedy, adjuntando el formato
FD-FT-284.

ü
Participa activamente en las reuniones de
entendimiento del requerimiento con el proveedor.

ü
Valida la propuesta comercial entregada por el
proveedor.

ü
Define los escenarios de pruebas y diligencia el
formato FD-FT-060 "Formato Pruebas Aplicativo".

ü
Realiza las pruebas, registra los resultados en
el formato FD-FT-060 y lo entrega al área de TI.

ü
Apoya el proceso desde la radicación hasta la
implementación en producción.

* **Analista
  De Sistemas:**

ü
Realiza un análisis inicial de viabilidad y
factibilidad del requerimiento.

ü
Realiza un seguimiento proactivo a los
requerimientos con pendientes.

ü
Asegura que exista un plan de trabajo
documentado en Remedy.

ü
Coordina y da seguimiento a las actividades del
proveedor de desarrollo y pruebas.

ü
Administra el grupo primario de usuarios y
registra el seguimiento a la toma de decisiones.

ü
Verifica que el proveedor entregue los
instructivos o procedimientos requeridos.

ü
Define el ambiente de pruebas y comunica esta
información al Líder Usuario.

ü
Participa en todo el ciclo de vida del
requerimiento.

ü
Gestiona directamente los requerimientos para
crear o modificar consultas en el aplicativo ORM, incluyendo la validación con
el usuario y el cierre del caso tras su confirmación.

ü
Identifica los requerimientos de automatización
y los canaliza al Líder de Mejoramiento para que sean gestionados dentro del
proceso de Aseguramiento y Mejora.

* **Comité
  de Cambios de la UTI:**
  * Cualquier
    desarrollo que tenga alto impacto en las aplicaciones CORE debe ser
    presentado por el Arquitecto de soluciones de TI ante este comité.
  * Al
    comité asiste el Arquitecto de soluciones de TI de la Fiduciaria y el
    usuario líder del proceso.
* **Rol
  Arquitecto de Soluciones:**
  * Responsable
    del cargue de la planeación del requerimiento en Remedy para solicitar el
    cambio en la UTI (si aplica).
  * Gestión
    y coordinación de procesos para empaquetar, probar e implementar a
    producción los servicios.
* **Director
  de TI:**
  * Autoriza
    los requerimientos que no superan el umbral de costo/esfuerzo definido
    para aprobación directa.
  * Notifica
    vía correo al proveedor la autorización para iniciar con los ajustes o
    nuevos desarrollos.

**5.2. Reglas**

* Todo
  requerimiento deberá estar claramente diligenciado en el Formato  **FD-FT-284** .
  En caso de inconsistencias:
  * Si
    el formato no está diligenciado, se notificará al usuario y tendrá **3
    días hábiles** para su diligenciamiento. De lo contrario, el caso será
    cerrado.
  * Si
    el formato está incompleto o poco claro, se notificará al usuario y
    tendrá **15 días hábiles** para realizar las aclaraciones. De lo
    contrario, el caso será cerrado.
* Si
  un requerimiento aprobado en el comité de compras sufre cambios que
  afecten su alcance, deberá ser analizado nuevamente en el Comité.
* Para
  realizar el paso a producción, el usuario líder debe enviar un correo
  electrónico con su visto bueno, adjuntando el formato  **FD-FT-060** .
* En
  la Fiduciaria no se realiza desarrollo de software directamente en los
  Core; este proceso está tercerizado.
* Todo
  desarrollo interno para mejorar un proceso está sujeto a la disponibilidad
  de herramientas autorizadas por el grupo Coomeva.

# 6. PROCEDIMIENTO

**6.1. Solicitud y Análisis de Requerimientos**

* **Líder
  Usuario o colaborador:**

ü
Crea el requerimiento en Remedy adjuntando el
formato FD-FT-284.

ü
Atiende las solicitudes de aclaración del área
de TI.

* **Analista
  De Sistemas:**

ü
Revisa cada requerimiento para detectar
información faltante o que no aplique; si encuentra vacíos o incoherencias,
devuelve el requerimiento al Líder Usuario para que realice las modificaciones
necesarias antes de continuar el flujo.

ü
Convoca y participa en una reunión de
entendimiento con el Líder Usuario y las áreas implicadas, asegurando que todos
comprendan el alcance, las dependencias y los entregables del requerimiento.

ü
**Nota:** Los requerimientos que sean
devueltos al usuario para realizar ajustes en la etapa de análisis, se estipula
un tiempo no mayor a **15 días hábiles** para realizar dicho ajuste, de lo
contrario se procederá con el cambio de la prioridad o la no atención de la
solicitud.

**Flujos Específicos de Gestión del Analista:**

* **Para
  Consultas en ORM:** Si el requerimiento consiste en la creación o
  modificación de una consulta en el aplicativo ORM, el Analista de Sistemas
  procederá a desarrollarla directamente tras validar el alcance. Una vez
  creada, notificará al usuario para su validación. Con la confirmación del
  usuario, el requerimiento se dará por terminado.
* **Para
  Requerimientos de Automatización:** Si el requerimiento es identificado
  como una solicitud de automatización, el Analista de Sistemas lo
  transferirá al Líder de Mejoramiento. A partir de este punto, el
  requerimiento sale del flujo de este procedimiento y pasa a ser gestionado
  por el proceso de "Aseguramiento y Mejora".
* **Para
  requerimientos que necesitan desarrollo externo, el Analista de Sistemas
  gestiona la comunicación con el proveedor, desde la solicitud de la
  propuesta hasta la coordinación técnica.**
* **Analista
  de Sistemas y Proveedor:**

ü
Se programa sesión técnica con el proveedor y
las áreas encargadas del requerimiento con el fin de aclarar dudas.

ü
El Analista reenvía la propuesta al Líder
Usuario por correo electrónico y gestiona las correcciones necesarias hasta
lograr la alineación total.

ü
En caso de dudas sobre la propuesta comercial,
es responsabilidad del Líder Usuario solicitar un nuevo espacio con el
proveedor.

Control C003-GT El ANALISTA SISTEMAS cada
vez que se presente solicitud de desarrollo (portal transaccional, Sifi o
finansoft) y/o consulta ORM valida que el requerimiento sea claro, completo y
corresponda a la necesidad del Líder Usuario comparando en el formato "FD-FT
284 Formato de requerimiento de necesidades" el objetivo del desarrollo
versus la necesidad establecida en el formato. En caso de novedad notifica al
Líder Usuario y/o solicita reunión de entendimiento para que se realicen los
ajustes necesarios.

**6.2. Autorización Requerimiento**

* **Líder
  Usuario o colaborador:**

ü
**Para requerimientos > 10 horas:** El
Líder de Usuario crea una presentación y la envía al comité de compras.

ü
**Para requerimientos <= 10 horas:** El
Líder de Usuario solicita la aprobación directamente al Director de Tecnología.

ü
Los requerimientos de extracción de información
o de mejoras en los procesos no necesitan autorización del comité de compras.

ü
Si la propuesta no es autorizada, el líder debe
reevaluar costos con el proveedor o el requerimiento.

* **Jefe
  Gestión Financiera y Administrativo FID:**

ü  Informa
vía correo electrónico al Director de TI la aprobación de las propuestas por
parte del Comité de Compras, adjuntando el acta de la sesión como soporte
formal.

* **Director
  de TI:**

ü  Notifica
al proveedor la autorización para iniciar el desarrollo.

* **Analista
  De Sistemas:**

ü  Solicita
al proveedor las fechas tentativas de entrega y crea un plan de trabajo.

**6.3. Fase de Pruebas**

* **Analista
  De Sistemas:**

ü
Recibe los desarrollos y coordina la instalación
en el ambiente de pruebas. El desarrollado será aceptado por el área de
Tecnología siempre y cuando el proveedor de desarrollo entregue en las
condiciones de operación necesarias para garantizar el inicio de la etapa depruebas (paquete de instalación con
instructivos de instalación y de uso) para ello se solicita una cesión donde el
proveedor demuestre la funcionalidad del desarrollo.

ü
Envía correo notificando el inicio de pruebas y
adjunta instructivos si aplica.

ü
Agenda sesión con las áreas implicadas para
definir escenarios de prueba.

ü
Establece cronogramas de pruebas que incluyan
responsables y fechas claras, con el fin de garantizar la planificación y
coordinación entre las áreas involucradas.

ü
Verifica previamente la disponibilidad y
estabilidad del ambiente de pruebas antes de iniciar las validaciones.

ü
Realiza el seguimiento del proceso de pruebas
hasta la certificación final del requerimiento.

ü
Activa los planes de contingencia definidos en
caso de que el área usuaria no pueda ejecutar las pruebas por limitaciones
operativas.

ü
Elabora y presenta un reporte mensual
consolidado a los directivos de las áreas implicadas, en el cual se informe el
estado de los desarrollos en curso, el cumplimiento de los cronogramas, las
incidencias identificadas durante la fase de pruebas y las fechas tentativas de
cierre de cada desarrollo.

* **Líder
  Usuario o colaborador:**

ü  Diligencia
el formato FD-FT-060 con los escenarios de prueba.

ü  Ejecuta
las pruebas y comunica las no conformidades al área de Tecnología.

ü  Participa
en la definición de acuerdos de nivel de servicio (SLA) que establezcan tiempos
máximos de respuesta de cada actor involucrado en el proceso de pruebas.

Apoya
la medición de los indicadores de gestión definidos para el proceso de pruebas,
tales como tiempos de ejecución, número de incidencias y cumplimiento de fechas
establecidas.

C021-GT
El ANALISTA SISTEMAS cada vez que se presente nuevos desarrollos, mejoras o
ajustes a los desarrollos existentes valida que las pruebas realizadas por el
Líder Usuario correspondan al requerimiento comparando los escenarios
establecidos en el test de funcionamiento entregado por el proveedor versus los
escenarios del formato FD-FT-060 FORMATO PRUEBAS APLICATIVO y que cuente con
visto bueno del líder usuario y/o procesos y áreas afectadas. En caso de
novedad se solicita revisión y ajuste de los escenarios al área
correspondiente.

**6.4. Certificación de Pruebas**

* **Líder
  Usuario o colaborador:**

ü  Envía
por correo electrónico el formato FD-FT-060 con soportes y la aceptación del
desarrollo.

* **Equipo
  de Implementación (Arquitecto / Analista Senior):**

ü  Define
y documenta un plan de rollback antes de la instalación en producción.

ü  Valida
la instalación y funcionalidad en producción.

ü  Valida
la secuencia de la versión antes de subir a producción.

ü  Antes
de realizar cambios, valida que cuenta con la autorización y documentación
requerida.

ü  Notifica
al cliente una vez el cambio está en producción.

C004-GT ARQUITECTO DE SOLUCIONES/ ANALISTA SISTEMAS cada vez
que el proveedor entrega un desarrollo para pruebas garantiza que las entregas
de desarrollo del proveedor cumplan con los requisitos establecidos y no
generen impacto negativo en producción: (i) cuando se trate de nuevos
desarrollos valida con el líder solicitante que todas las áreas relacionadas
con las funcionalidades participen de las pruebas de toda la funcionalidad (ii)
cuando se trate de desarrollos específicos valida en la reunión de entendimiento
que participen todas las áreas impactadas y solicita al líder solicitante el
plan de pruebas para la certificación del paso a producción. En caso de novedad
no se realiza el paso a producción.

C027-GT  El ARQUITECTO
DE SOLUCIONES trimestralmente mediante muestra aleatoria del (10%) valida que
los cambios en ambiente productivo de nuevos desarrollos y funcionalidades
cuente con los soportes correspondientes, requerimiento, autorización del
solicitante, formato de pruebas, correo de confirmación de instalación para
haber efectuado la instalación, comparando los documentos relacionados en
remedy versus los soportes relacionados en la carpeta por del desarrollo. En
caso de novedad solicitar los faltantes al ANALISTA DE SISTEMA encargado.

# 7. RIESGOS Y CONTROLES

**7.1. Responsabilidad del líder del proceso**

* Identificar,
  medir y controlar los riesgos operativos (formato FD-FT-016).
* Garantizar
  que todos los colaboradores que participan en el proceso conozcan los
  riesgos y ejecuten los controles.
* Garantizar
  la actualización y publicación de la Matriz de Riesgo Operativo.
* Definir
  e implementar planes de acción para reducir la exposición al riesgo.
* Cumplir
  con lo dispuesto en el documento FD-DC-237 manual SIAR.

**7.2. Matriz y Mapa de Riesgo Operativo**

La matriz y mapa de riesgo operativo del proceso
"Gestión de tecnología" se encuentra publicado en la plataforma
documental.

| **Versión**                                                         | **Fecha** | **Descripción de la modificación** |
| -------------------------------------------------------------------------- | --------------- | ------------------------------------------ |
| 1                                                                          | Enero           |                                            |
| 06-2018                                                                    | Creación       |                                            |
| del documento                                                              |                 |                                            |
| 2                                                                          | Febrero         |                                            |
| 19-2020                                                                    | - Cambio        |                                            |
| de Comité de usuarios por grupo primario usuarios.`<br>`- Modificación |                 |                                            |
| numeral 5.6 Cambios de emergencia                                          |                 |                                            |
| 3                                                                          | Mayo            |                                            |
| 28–2025                                                                   | Se              |                                            |
| actualiza documento y se incluyen controles alineados a la matriz RO.      |                 |                                            |

| **Elaboró**                                                                      | **Revisó**                      | **Aprobó**                      |
| --------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------- |
| **Nombre:**Ana Maria Realpe – Miguel Teuta – Juan Carlos Gomez – Jonattan Olivares   | **Nombre:**Julio Enrique Puerto Cutiva | **Nombre:**Julio Enrique Puerto Cutiva |
| **Cargo:**Analista de sistemas / Arquitecto de soluciones / Analista de Sistemas Senior | **Cargo:**Director de Tecnología      | **Cargo:**Director de Tecnología      |
| **Fecha:**Mayo 28–2025                                                                 | **Fecha:**Mayo 28–2025                | **Fecha:**Mayo 28–2025                |
