# Especificación - Horarios prediseñados y relaciones de empleados

**Fecha:** 2026-07-10
**Estado:** CERRADA; implementada y validada con aprobación especializada
**Rama base:** `Modulo_Geoface`
**Módulos:** Horas Extras, GeoFace, usuarios y ERP

## 1. Objetivo

Incorporar dos capacidades relacionadas:

1. Un catálogo de plantillas semanales de horario que permita crear, editar, desactivar y aplicar un horario prediseñado a uno o varios empleados.
2. Una relación muchos-a-muchos entre usuarios gestores del portal y empleados activos del ERP para limitar qué empleados puede consultar u operar cada gestor en Horarios y en la consulta administrativa de GeoFace.

## 2. Decisiones funcionales aprobadas

- La relación aplica a Horarios/Planificador y a la consulta administrativa de GeoFace.
- Un empleado puede estar relacionado con varios gestores.
- Las plantillas forman un catálogo persistente y se asignan explícitamente a empleados.
- Habrá dos permisos administrativos nuevos: uno para plantillas y otro para relaciones.
- La columna `Reporta a` mostrará el jefe contractual real del ERP, no la regional.
- `Disponible` significa disponible para la semana ISO consultada: empleado activo, autorización HE efectiva y ausencia de una novedad bloqueante vigente.
- Las plantillas soportarán turnos que cruzan medianoche mediante `cruza_medianoche`.
- Aplicar una plantilla y guardar relaciones serán operaciones atómicas: si una fila falla, no se modifica ninguna.
- Los bulk legacy de guardado y confirmación conservarán sus resultados parciales por errores de negocio, pero validarán permiso y alcance de todo el lote antes de la primera escritura.
- Editar una plantilla no cambia horarios ya aplicados. Cada aplicación conserva un snapshot inmutable.

## 3. Conceptos y límites

### 3.1 Plantilla de horario

Una plantilla es un patrón reutilizable de siete días. Cada día contiene:

- `dia_semana`, de 1 a 7.
- `hora_entrada` y `hora_salida`, ambas presentes o ambas nulas.
- `minutos_almuerzo`, entre 0 y 240.
- `cruza_medianoche`, obligatorio cuando la salida pertenece al día siguiente.

Una plantilla no es un registro de asistencia ni un plan semanal ejecutado. Aplicarla copia sus valores al horario pactado actual y deja una evidencia histórica independiente.

### 3.2 Relación gestor-empleado

La relación expresa alcance operativo: "este usuario puede consultar u operar este empleado". No expresa jerarquía, subordinación, aprobación ni reporte organizacional.

Por ese motivo no se reutilizarán `relaciones_usuarios` ni `historial_relaciones_usuarios`, que representan una relación lineal entre dos cuentas locales y tienen cardinalidad y semántica diferentes.

La identidad del empleado será la cédula canónica del ERP. La identidad del gestor será `usuarios.id`. No habrá FK entre bases de datos; la existencia y actividad del empleado se validarán contra el ERP antes de activar una relación.

### 3.3 Disponibilidad semanal

La respuesta del empleado incluirá:

- `autoriza_he`: autorización efectiva de horas extra.
- `disponible_semana`: resultado calculado para `anio` y `semana_iso`.
- `motivo_no_disponible`: código controlado, no texto libre.

La semana se valida con `date.fromisocalendar(anio, semana_iso, 1)` y comprende de lunes a domingo, ambos inclusive. La disponibilidad se resuelve en este orden:

1. Contrato ERP activo; de lo contrario `EMPLEADO_INACTIVO`.
2. Autorización efectiva HE; de lo contrario `NO_AUTORIZA_HE`.
3. Novedad `CONFIRMADO` que se superponga con la semana y cuya categoría sea `VACACION`, `INCAPACIDAD` o `LICENCIA`; motivos `VACACIONES`, `INCAPACIDAD` o `LICENCIA`.

Las novedades `BORRADOR` y `ANULADO` no bloquean. La autorización efectiva usa el override `ACTIVO` más reciente cuya vigencia se superponga con la semana; si no existe, usa `autoriza_he_default` sincronizado desde ERP. La relación puede administrarse aunque el empleado no esté disponible esa semana.

## 4. Autorización

Toda operación por empleado combina dos controles:

```text
permiso funcional del endpoint
AND
(rol canónico admin OR relación activa gestor-empleado)
```

- El rol canónico `admin` evita el filtro por filas, pero no evita autenticación ni el permiso funcional del endpoint.
- Un permiso RBAC equivalente no convierte otro rol en administrador global.
- La ausencia o falla al resolver el alcance deniega la operación; nunca habilita todos los empleados.
- El empleado conserva acceso a sus propias marcas GeoFace mediante los endpoints de autoservicio actuales.
- Los gestores consultan marcas de su equipo mediante endpoints administrativos separados.
- Conocer una cédula, un ID de cálculo o el nombre de una evidencia no constituye autorización.
- Para recursos individuales, inexistencia y falta de alcance producen el mismo `404` genérico.

Permisos nuevos propuestos:

- `nomina_horas_extras.plantillas_horario.administrar`
- `alcance_empleados.administrar`

La aplicación de una plantilla requiere `nomina_horas_extras.planificar` y alcance sobre todos los empleados, pero no requiere administrar el catálogo. El acceso administrativo de GeoFace mantiene el permiso funcional `biometria` y exige una relación activa o rol canónico `admin`.

## 5. Experiencia de usuario

### 5.1 Pantalla Plantillas de horario

- Lista paginada de plantillas activas e inactivas.
- Crear, editar, duplicar y desactivar.
- Editor semanal de siete días con soporte de jornada nocturna.
- Acción `Aplicar a empleados` con búsqueda, filtros y selección masiva.
- Confirmación con resumen de plantilla, versión y número de empleados.
- Resultado único de éxito o error porque el lote es atómico.

### 5.2 Pantalla Relaciones de empleados

- Selector buscable de usuario gestor.
- Selector de año y semana ISO para calcular disponibilidad.
- Tabla de escritorio con cuatro columnas visuales:
  - `Sel.`: checkbox.
  - `Empleado`: nombre, cédula y cargo.
  - `Operación`: área, ciudad y jefe ERP real.
  - `HE`: autorización y disponibilidad semanal.
- Búsqueda y filtros server-side por nombre, cédula, cargo, área, ciudad, jefe, autorización, disponibilidad y estado de relación.
- Selección persistente entre páginas mediante cédula.
- Cambio de gestor con cambios pendientes exige confirmar descarte.
- En móvil se usa una lista de tarjetas seleccionables; no se comprime la tabla de escritorio.
- Guardado masivo atómico con contador de altas, bajas y elementos sin cambio.
- El catálogo administrativo consulta el universo ERP para el gestor seleccionado y está exento únicamente del alcance operativo del actor; exige `alcance_empleados.administrar` y no se reutiliza en Horarios, Planificador o GeoFace.

## 6. Contratos funcionales

### 6.1 Paginación y filtros

- Paginación por `limit` y `offset`, con límite máximo de 100.
- Orden estable por cédula y contrato activo más reciente.
- La búsqueda se aplica antes de contar y paginar.
- Los totales y facetas solo consideran empleados dentro del alcance del solicitante, salvo en la pantalla administrativa de relaciones.
- La interfaz cancela o descarta respuestas obsoletas al cambiar filtros.

### 6.2 Operaciones masivas

- Máximo inicial: 200 empleados por solicitud.
- Cédulas normalizadas y deduplicadas antes de autorizar.
- Validación de permiso y alcance completa antes de escribir.
- Aplicación de plantilla y relaciones usan una transacción única para todo el lote.
- Ambas reciben `solicitud_id` UUID. Un ledger persiste tipo, actor, objetivo, hash canónico del payload, estado y resultado sanitizado en la misma transacción.
- Mismo UUID, actor, objetivo y hash devuelve el resultado previo sin duplicar efectos.
- Reutilizar UUID con actor, objetivo o payload diferente devuelve `409`.
- Una cédula presente en altas y bajas devuelve `422`.
- El límite de 200 se evalúa después de normalizar y deduplicar.
- Guardado y confirmación legacy primero autorizan el lote completo. Después conservan su semántica parcial por errores de negocio y quedan fuera del ledger en esta entrega.
- El pre-cálculo no persiste y no usa idempotencia, pero autoriza todo el lote antes de calcular.

### 6.3 Jefe ERP real

El listado dejará de mapear `contrato.regional` como `quien_reporta`. Se tomará `contrato.jefe` del contrato activo más reciente. Antes de implementar se verificará si el campo contiene nombre, cédula o código; si es un identificador, el nombre se resolverá en lote, sin N+1.

### 6.4 Duplicación y errores HTTP

- Duplicar crea una plantilla activa independiente, versión 1, con nombre nuevo obligatorio y copia exacta de los siete días.
- La operación registra snapshot e historial de tipo `DUPLICADA` y no conserva vínculo operativo con el origen.
- `401`: sin autenticación.
- `403`: autenticado sin permiso funcional.
- `404`: recurso individual inexistente o fuera de alcance.
- `409`: versión esperada, nombre, concurrencia o idempotencia en conflicto.
- `422`: payload, semana ISO, horario, cédula o lote inválido.

### 6.5 GeoFace propio y de equipo

- Los endpoints de autoservicio derivan el usuario exclusivamente del JWT; `usuario_id` deja de habilitar consultas administrativas.
- La evidencia propia valida ownership.
- Toda consulta de equipo, incluido admin, usa endpoints administrativos por `registro_id`; nunca se autoriza por filename.
- El alcance se aplica en SQL antes de contar, filtrar y paginar.
- Usuario sin cédula canónica, registro inexistente y registro fuera de alcance responden el mismo `404`.
- Fotos y evidencias se entregan con `Cache-Control: no-store, private` y sin exponer rutas físicas o nombres almacenados.
- Listados ERP, relaciones y asistencias administrativas con PII también usan `Cache-Control: no-store, private`.

## 7. No-objetivos

- No modificar la aplicación móvil GeoFace ni el motor biométrico.
- No conectar automáticamente las marcas GeoFace con el cálculo de horas extra.
- No modificar las reglas legales de liquidación HE.
- No sincronizar automáticamente una edición de plantilla hacia empleados ya asignados.
- No reemplazar ni inferir la jerarquía organizacional a partir de estas relaciones.
- No crear una tabla local maestra de empleados ni modificar el ERP.
- No ampliar el alcance a bolsa, compensación, costos OT u otros módulos en esta entrega.

## 8. Criterios de aceptación

1. Un administrador de plantillas puede crear una plantilla válida de siete días y aplicarla a un lote autorizado.
2. El horario aplicado soporta cruce de medianoche y calcula correctamente la duración.
3. Editar o desactivar una plantilla no altera el horario ni el snapshot de una aplicación anterior.
4. Un administrador de relaciones puede asignar varios gestores al mismo empleado y guardar el cambio atómicamente.
5. Un gestor ve y opera únicamente empleados relacionados en Horarios/Planificador.
6. Un gestor ve únicamente asistencias y evidencias GeoFace de empleados relacionados; el empleado conserva su autoservicio.
7. La tabla muestra jefe ERP real, autorización HE y disponibilidad de la semana elegida.
8. Los listados, conteos, búsquedas y facetas no revelan empleados fuera del alcance.
9. Los endpoints responden `401`, `403`, `404/409` y `422` de forma consistente sin filtrar PII.
10. Las mutaciones críticas dejan historial durable sin copiar cuerpos bulk ni coordenadas, fotos o datos biométricos.
