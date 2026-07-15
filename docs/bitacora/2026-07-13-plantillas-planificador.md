# Bitacora - Plantillas en el planificador semanal

**Fecha:** 2026-07-13

## Objetivo

Agregar en la barra compacta del Planificador semanal un desplegable de plantillas activas para aplicar su horario completo a los empleados seleccionados.

## Implementacion

- Selector compacto ubicado despues de los chips de dias.
- Consulta de hasta 100 plantillas activas con cancelacion al desmontar.
- Aplicacion de entrada, salida, almuerzo, cruce de medianoche y francos para los siete dias.
- Conservacion de novedades y asignaciones OT existentes.
- Normalizacion de horas backend `HH:MM:SS` al contrato del planificador `HH:MM`.
- Actualizacion de dias activos segun la plantilla aplicada.
- Lectura de plantillas permitida para roles con permiso de planificar o administrar plantillas.
- Las plantillas inactivas solo pueden consultarse con el permiso administrativo.
- Crear, editar, duplicar y desactivar plantillas continúan restringidos al permiso administrativo.
- El selector usa una superficie diferenciada, opciones compatibles con modo oscuro y una cuadrícula que separa horario manual y plantilla en escritorio.
- En móvil, el bloque de plantilla ocupa todo el ancho y evita desbordamiento horizontal.

## Validacion

- Frontend focal: 23 pruebas aprobadas.
- Backend RBAC y plantillas: 17 pruebas aprobadas.
- ESLint focal aprobado.
- Build frontend aprobado con 4027 modulos.
