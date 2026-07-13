# Bitacora: Gestion de Tiempo y Asistencia en el Portal

**Fecha:** 2026-07-12
**Rama:** `Modulo_Geoface`
**Plan:** `docs/reviews/plans/2026-07-11_gestion-tiempo-asistencia-portal.md`

## Objetivo

Agrupar horarios, horas extras, biometria, plantillas y alcance de empleados bajo una sola entrada del Portal de Servicios, siguiendo el patron de navegacion interna de Viaticos sin copiar su deuda visual o de accesibilidad.

## Implementacion

- Se agrego `/service-portal/tiempo-asistencia` como hub autenticado.
- `DashboardView` reemplaza cuatro tarjetas independientes por una sola entrada buscable.
- Un registro tipado centraliza seccion, ruta, permiso y disponibilidad de cada opcion.
- Las rutas profundas y sus guardas RBAC permanecen sin cambios.
- `ServiceCard` ahora usa un boton accesible del sistema de diseno.
- Todas las vistas de primer nivel de Horas Extras, Biometria, Plantillas y Alcance vuelven de forma explicita al nuevo hub.
- `/service-portal/horas-extras` se conserva como alias del hub y la ruta legacy de empleados abre el panel integrado del Planificador.
- Empleados exige el mismo permiso de planificacion que su destino; el detalle de horario conserva ese panel como padre al volver, cancelar o guardar.
- La pre-liquidacion individual se presenta como `Calculadora individual de horas extras`, con acciones separadas para simular y confirmar, para distinguirla del Planificador semanal.
- Se elimino `Empleados y disponibilidad` como acceso redundante del hub; la tabla permanece integrada en el Planificador y su ruta historica se conserva como alias compatible.
- Se elimino `Novedades` como acceso independiente del hub para centralizar su captura operativa en el Planificador; las rutas, historicos y endpoints se conservan por compatibilidad.
- Se elimino `Bolsa de horas` del hub; la ruta, los historicos y la logica backend se conservan para trazabilidad y compatibilidad con calculos existentes.
- Se rediseño Configuracion de horas extras con jerarquia visual por grupos, skeletons, indicadores de cambios, validacion legal basica, justificacion nueva obligatoria y proteccion contra descarte accidental.
- Se elimino `Horario semanal` como acceso independiente del hub; la edición individual conserva su ruta y el flujo principal permanece integrado en Planificador y Plantillas.

## Seguridad

El hub aplica una union visual de permisos exactos y falla cerrado cuando no hay opciones. No agrega permisos, bypasses por rol ni cambios backend. La autorizacion real permanece en `ProtectedRoute` y en los endpoints backend.

## Verificacion

- Pruebas focales: 58 aprobadas en configuracion, hub, dashboard, rutas, retornos y tarjeta accesible.
- TypeScript y lint focal sin errores.
- Build de produccion: 4025 modulos transformados.
- Suite global: 245 aprobadas, 2 omitidas y 3 fallidas. La suite completa del Planificador pasa 20/20 al reejecutarse; MyDevelopments y Register conservan dos expectativas desactualizadas ajenas al cambio.
- Lint global: 517 errores y 60 warnings preexistentes fuera del alcance.
