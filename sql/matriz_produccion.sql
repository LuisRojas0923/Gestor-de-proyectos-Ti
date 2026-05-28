-- =============================================================================
-- SCRIPT DE CARGA MASIVA DE ACTIVIDADES Y SUBTAREAS EN PRODUCCIÓN
-- Gestor de Proyectos TI (Con Fechas de Commits Inferidas)
-- =============================================================================
-- Este script es idempotente: elimina registros previos con los mismos IDs
-- y realiza la carga de desarrollos planos con sus sub-tareas WBS correspondientes.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. LIMPIEZA DE REGISTROS PREVIOS (IDEMPOTENCIA)
-- -----------------------------------------------------------------------------
DELETE FROM validaciones_asignacion WHERE desarrollo_id IN ('ACT-00049', 'ACT-00050', 'ACT-00051', 'ACT-00052', 'ACT-00053', 'ACT-00054', 'ACT-00055', 'ACT-00056', 'ACT-00057', 'ACT-00058', 'ACT-00059', 'ACT-00060', 'ACT-00061');

DELETE FROM actividades WHERE desarrollo_id IN ('ACT-00049', 'ACT-00050', 'ACT-00051', 'ACT-00052', 'ACT-00053', 'ACT-00054', 'ACT-00055', 'ACT-00056', 'ACT-00057', 'ACT-00058', 'ACT-00059', 'ACT-00060', 'ACT-00061');

DELETE FROM desarrollos WHERE id IN ('ACT-00049', 'ACT-00050', 'ACT-00051', 'ACT-00052', 'ACT-00053', 'ACT-00054', 'ACT-00055', 'ACT-00056', 'ACT-00057', 'ACT-00058', 'ACT-00059', 'ACT-00060', 'ACT-00061');


-- -----------------------------------------------------------------------------
-- 2. INSERCIÓN DE DESARROLLOS (PROYECTOS)
-- -----------------------------------------------------------------------------
INSERT INTO desarrollos (
    id, nombre, descripcion, modulo, tipo, ambiente,
    responsable, responsable_id, analista, autoridad, supervisor, creado_por_id,
    area_desarrollo, area_ejecutor, estado_general, estado_validacion, porcentaje_progreso,
    fecha_inicio, fecha_estimada_fin, fecha_real_fin, creado_en
) VALUES 
('ACT-00049', '1. Consulta y Construcción de Proveedores', 'Construcción de módulo para consulta de catálogo de productos y fuentes', 'Proveedores', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Compras', 'D&DT', 'En Progreso', 'aprobada', 50.0, '2025-09-28', '2026-06-10', NULL, NOW()),
('ACT-00050', '2.1 Inventario Físico', 'Sistema de gestión de inventario físico implementado', 'Logística', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Logística', 'D&DT', 'Completado', 'aprobada', 100.0, '2026-02-27', '2026-03-31', '2026-03-31', NOW()),
('ACT-00051', '2.2 Adaptación para Inventarios Cíclicos', 'Módulo para gestionar ciclos de inventario', 'Logística', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Logística', 'D&DT', 'En Progreso', 'aprobada', 50.0, '2026-04-01', '2026-06-05', NULL, NOW()),
('ACT-00052', '2.3 Formularios del Sistema de Solicitudes', 'Desarrollo de formularios para solicitudes de logística', 'Logística', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Logística', 'D&DT', 'En Progreso', 'aprobada', 60.0, '2026-02-12', '2026-06-15', NULL, NOW()),
('ACT-00053', '3.1 Certificado de Ingresos y Retenciones', 'Generación de certificados laborales para empleados', 'Gestión Humana', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Gestión Humana', 'D&DT', 'Pendiente', 'aprobada', 0.0, NULL, '2026-07-10', NULL, NOW()),
('ACT-00054', '4.1 Ingreso de Legalizaciones Web', 'Plataforma para legalizaciones de viáticos en línea', 'Gestión Humana', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Contabilidad', 'D&DT', 'En Progreso', 'aprobada', 75.0, '2026-02-02', '2026-06-08', NULL, NOW()),
('ACT-00055', '4.2 Generación de Estado de Cuenta en PDF y Portal', 'Reporte visual de viáticos por empleado', 'Gestión Humana', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Contabilidad', 'D&DT', 'Completado', 'aprobada', 100.0, '2026-02-02', '2026-04-15', '2026-04-15', NOW()),
('ACT-00056', '4.3 Generación de Estado de Cuenta en XLS', 'Exportación de datos de viáticos a formato Excel', 'Gestión Humana', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Contabilidad', 'D&DT', 'En Progreso', 'aprobada', 33.0, '2026-04-16', '2026-06-12', NULL, NOW()),
('ACT-00057', '5.1 Matriz de Celulares', 'Control y asignación de dispositivos móviles corporativos', 'Gestión Humana', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Administrativa', 'D&DT', 'En Progreso', 'aprobada', 50.0, '2026-03-25', '2026-06-10', NULL, NOW()),
('ACT-00058', '6.1 Funcionalidades de Aprobación de Solicitud de Desarrollos', 'Flujo de aprobación para solicitudes de desarrollo', 'Funcionalidades Generales', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Sistemas', 'D&DT', 'Pendiente', 'aprobada', 0.0, NULL, '2026-07-05', NULL, NOW()),
('ACT-00059', '6.2 Reserva de Salas', 'Sistema de reservación de espacios y salas de reunión', 'Funcionalidades Generales', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Administrativa', 'D&DT', 'Completado', 'aprobada', 100.0, '2026-02-06', '2026-02-11', '2026-02-11', NOW()),
('ACT-00060', '6.3 Funcionalidades de Respuesta a Solicitud de Tickets', 'Sistema de gestión de tickets y respuestas', 'Funcionalidades Generales', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Sistemas', 'D&DT', 'Completado', 'aprobada', 100.0, '2026-01-18', '2026-05-26', '2026-05-26', NOW()),
('ACT-00061', '6.4 Módulo de Gestión de Actividades', 'Control y seguimiento de actividades por proyecto', 'Funcionalidades Generales', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Sistemas', 'D&DT', 'Completado', 'aprobada', 100.0, '2025-09-22', '2026-05-26', '2026-05-26', NOW());


-- -----------------------------------------------------------------------------
-- 3. INSERCIÓN DE SUBTAREAS WBS
-- -----------------------------------------------------------------------------
-- ACT-00049: 1. Consulta y Construcción de Proveedores
INSERT INTO actividades (
    desarrollo_id, parent_id, titulo, descripcion, estado, 
    responsable_id, asignado_a_id, delegado_por_id, estado_validacion,
    horas_estimadas, horas_reales, porcentaje_avance,
    fecha_inicio_estimada, fecha_fin_estimada, fecha_inicio_real, fecha_fin_real, creado_en
) VALUES 
('ACT-00049', NULL, 'Identificación de la fuente de datos en Excel (Catalogo de Artículos)', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2025-09-28', '2025-10-15', '2025-09-28', '2025-10-15', NOW()),
('ACT-00049', NULL, 'Construcción del script de carga hacia PostgreSQL', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2025-10-16', '2025-11-10', '2025-10-16', '2025-11-10', NOW()),
('ACT-00049', NULL, 'Validación de resultados e inconsistencias', NULL, 'En Progreso', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2025-11-11', '2026-05-30', '2025-11-11', NULL, NOW()),
('ACT-00049', NULL, 'Despliegue y automatización en servidor', NULL, 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-06-01', '2026-06-10', NULL, NULL, NOW());

-- ACT-00050: 2.1 Inventario Físico
INSERT INTO actividades (
    desarrollo_id, parent_id, titulo, descripcion, estado, 
    responsable_id, asignado_a_id, delegado_por_id, estado_validacion,
    horas_estimadas, horas_reales, porcentaje_avance,
    fecha_inicio_estimada, fecha_fin_estimada, fecha_inicio_real, fecha_fin_real, creado_en
) VALUES 
('ACT-00050', NULL, 'Pantalla de captura para conteo físico de activos', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-02-27', '2026-03-10', '2026-02-27', '2026-03-10', NOW()),
('ACT-00050', NULL, 'Generación de informes de inconsistencias y auditoría', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-03-11', '2026-03-20', '2026-03-11', '2026-03-20', NOW()),
('ACT-00050', NULL, 'Sincronización de datos con el módulo de Inventario Anual', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-03-21', '2026-03-31', '2026-03-21', '2026-03-31', NOW());

-- ACT-00051: 2.2 Adaptación para Inventarios Cíclicos
INSERT INTO actividades (
    desarrollo_id, parent_id, titulo, descripcion, estado, 
    responsable_id, asignado_a_id, delegado_por_id, estado_validacion,
    horas_estimadas, horas_reales, porcentaje_avance,
    fecha_inicio_estimada, fecha_fin_estimada, fecha_inicio_real, fecha_fin_real, creado_en
) VALUES 
('ACT-00051', NULL, 'Recibimiento de solicitud de parametrización', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-04-01', '2026-04-10', '2026-04-01', '2026-04-10', NOW()),
('ACT-00051', NULL, 'Levantamiento del proceso y lógica de ciclos', NULL, 'En Progreso', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-04-11', '2026-06-05', '2026-04-11', NULL, NOW());

-- ACT-00052: 2.3 Formularios del Sistema de Solicitudes
INSERT INTO actividades (
    desarrollo_id, parent_id, titulo, descripcion, estado, 
    responsable_id, asignado_a_id, delegado_por_id, estado_validacion,
    horas_estimadas, horas_reales, porcentaje_avance,
    fecha_inicio_estimada, fecha_fin_estimada, fecha_inicio_real, fecha_fin_real, creado_en
) VALUES 
('ACT-00052', NULL, 'Diseño de interfaz de formularios de almacén', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-02-12', '2026-02-25', '2026-02-12', '2026-02-25', NOW()),
('ACT-00052', NULL, 'Validación de campos obligatorios en el frontend', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-02-26', '2026-03-10', '2026-02-26', '2026-03-10', NOW()),
('ACT-00052', NULL, 'Diseño de tarjetas de estado de pedidos', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-03-11', '2026-03-25', '2026-03-11', '2026-03-25', NOW()),
('ACT-00052', NULL, 'Integración con el flujo de aprobación RDX', NULL, 'En Progreso', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-03-26', '2026-06-05', '2026-03-26', NULL, NOW()),
('ACT-00052', NULL, 'Pruebas funcionales integradas', NULL, 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-06-06', '2026-06-15', NULL, NULL, NOW());

-- ACT-00053: 3.1 Certificado de Ingresos y Retenciones
INSERT INTO actividades (
    desarrollo_id, parent_id, titulo, descripcion, estado, 
    responsable_id, asignado_a_id, delegado_por_id, estado_validacion,
    horas_estimadas, horas_reales, porcentaje_avance,
    fecha_inicio_estimada, fecha_fin_estimada, fecha_inicio_real, fecha_fin_real, creado_en
) VALUES 
('ACT-00053', NULL, 'Diseño del layout del certificado laboral', NULL, 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-06-10', '2026-06-18', NULL, NULL, NOW()),
('ACT-00053', NULL, 'Validación de datos de nómina', NULL, 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-06-19', '2026-06-25', NULL, NULL, NOW()),
('ACT-00053', NULL, 'Generación del reporte en formato PDF', NULL, 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-06-26', '2026-07-02', NULL, NULL, NOW()),
('ACT-00053', NULL, 'Envío automático por correo corporativo', NULL, 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-07-03', '2026-07-10', NULL, NULL, NOW());

-- ACT-00054: 4.1 Ingreso de Legalizaciones Web
INSERT INTO actividades (
    desarrollo_id, parent_id, titulo, descripcion, estado, 
    responsable_id, asignado_a_id, delegado_por_id, estado_validacion,
    horas_estimadas, horas_reales, porcentaje_avance,
    fecha_inicio_estimada, fecha_fin_estimada, fecha_inicio_real, fecha_fin_real, creado_en
) VALUES 
('ACT-00054', NULL, 'Interfaz de carga de documentos y adjuntos (soporte)', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-02-02', '2026-02-20', '2026-02-02', '2026-02-20', NOW()),
('ACT-00054', NULL, 'Validación y parseo de recibos y facturas', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-02-21', '2026-03-15', '2026-02-21', '2026-03-15', NOW()),
('ACT-00054', NULL, 'Flujo de aprobación multinivel por jefatura', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-03-16', '2026-04-10', '2026-03-16', '2026-04-10', NOW()),
('ACT-00054', NULL, 'Integración con el módulo contable', NULL, 'En Progreso', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-04-11', '2026-06-08', '2026-04-11', NULL, NOW());

-- ACT-00055: 4.2 Generación de Estado de Cuenta en PDF y Portal
INSERT INTO actividades (
    desarrollo_id, parent_id, titulo, descripcion, estado, 
    responsable_id, asignado_a_id, delegado_por_id, estado_validacion,
    horas_estimadas, horas_reales, porcentaje_avance,
    fecha_inicio_estimada, fecha_fin_estimada, fecha_inicio_real, fecha_fin_real, creado_en
) VALUES 
('ACT-00055', NULL, 'Template visual para exportación a PDF', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-02-02', '2026-02-25', '2026-02-02', '2026-02-25', NOW()),
('ACT-00055', NULL, 'Widget interactivo de saldos en el portal', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-02-26', '2026-03-20', '2026-02-26', '2026-03-20', NOW()),
('ACT-00055', NULL, 'Cálculo automático de saldos de viáticos', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-03-21', '2026-04-15', '2026-03-21', '2026-04-15', NOW());

-- ACT-00056: 4.3 Generación de Estado de Cuenta en XLS
INSERT INTO actividades (
    desarrollo_id, parent_id, titulo, descripcion, estado, 
    responsable_id, asignado_a_id, delegado_por_id, estado_validacion,
    horas_estimadas, horas_reales, porcentaje_avance,
    fecha_inicio_estimada, fecha_fin_estimada, fecha_inicio_real, fecha_fin_real, creado_en
) VALUES 
('ACT-00056', NULL, 'Diseño de estructura de columnas para reporte de gastos', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-04-16', '2026-04-30', '2026-04-16', '2026-04-30', NOW()),
('ACT-00056', NULL, 'Definición de estilos y formato de celdas', NULL, 'En Progreso', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-05-01', '2026-06-02', '2026-05-01', NULL, NOW()),
('ACT-00056', NULL, 'Validación de datos exportados contra base de datos', NULL, 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-06-03', '2026-06-12', NULL, NULL, NOW());

-- ACT-00057: 5.1 Matriz de Celulares
INSERT INTO actividades (
    desarrollo_id, parent_id, titulo, descripcion, estado, 
    responsable_id, asignado_a_id, delegado_por_id, estado_validacion,
    horas_estimadas, horas_reales, porcentaje_avance,
    fecha_inicio_estimada, fecha_fin_estimada, fecha_inicio_real, fecha_fin_real, creado_en
) VALUES 
('ACT-00057', NULL, 'Registro e inventario de líneas corporativas', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-03-25', '2026-04-10', '2026-03-25', '2026-04-10', NOW()),
('ACT-00057', NULL, 'Mapeo de asignaciones de equipos a empleados', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-04-11', '2026-04-30', '2026-04-11', '2026-04-30', NOW()),
('ACT-00057', NULL, 'Seguimiento de mantenimientos y reparaciones', NULL, 'En Progreso', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-05-01', '2026-06-01', '2026-05-01', NULL, NOW()),
('ACT-00057', NULL, 'Control de costos y auditoría de uso mensual', NULL, 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-06-02', '2026-06-10', NULL, NULL, NOW());

-- ACT-00058: 6.1 Funcionalidades de Aprobación de Solicitud de Desarrollos
INSERT INTO actividades (
    desarrollo_id, parent_id, titulo, descripcion, estado, 
    responsable_id, asignado_a_id, delegado_por_id, estado_validacion,
    horas_estimadas, horas_reales, porcentaje_avance,
    fecha_inicio_estimada, fecha_fin_estimada, fecha_inicio_real, fecha_fin_real, creado_en
) VALUES 
('ACT-00058', NULL, 'Configuración de matrices de niveles de aprobación', NULL, 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-06-15', '2026-06-22', NULL, NULL, NOW()),
('ACT-00058', NULL, 'Notificaciones en tiempo real a aprobadores', NULL, 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-06-23', '2026-06-28', NULL, NULL, NOW()),
('ACT-00058', NULL, 'Módulo de firmas digitales y registro de decisiones', NULL, 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-06-29', '2026-07-05', NULL, NULL, NOW());

-- ACT-00059: 6.2 Reserva de Salas
INSERT INTO actividades (
    desarrollo_id, parent_id, titulo, descripcion, estado, 
    responsable_id, asignado_a_id, delegado_por_id, estado_validacion,
    horas_estimadas, horas_reales, porcentaje_avance,
    fecha_inicio_estimada, fecha_fin_estimada, fecha_inicio_real, fecha_fin_real, creado_en
) VALUES 
('ACT-00059', NULL, 'Calendario de disponibilidad de salas en tiempo real', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-02-06', '2026-02-07', '2026-02-06', '2026-02-07', NOW()),
('ACT-00059', NULL, 'Control de conflictos de horarios y duplicaciones', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-02-08', '2026-02-09', '2026-02-08', '2026-02-09', NOW()),
('ACT-00059', NULL, 'Módulo de notificaciones de confirmación de reserva', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-02-09', '2026-02-10', '2026-02-09', '2026-02-10', NOW()),
('ACT-00059', NULL, 'Flujo de cancelación y reprogramación', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-02-10', '2026-02-11', '2026-02-10', '2026-02-11', NOW());

-- ACT-00060: 6.3 Funcionalidades de Respuesta a Solicitud de Tickets
INSERT INTO actividades (
    desarrollo_id, parent_id, titulo, descripcion, estado, 
    responsable_id, asignado_a_id, delegado_por_id, estado_validacion,
    horas_estimadas, horas_reales, porcentaje_avance,
    fecha_inicio_estimada, fecha_fin_estimada, fecha_inicio_real, fecha_fin_real, creado_en
) VALUES 
('ACT-00060', NULL, 'Módulo de respuesta técnica y chat interno en ticket', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-01-18', '2026-02-15', '2026-01-18', '2026-02-15', NOW()),
('ACT-00060', NULL, 'Gestión de estados del ticket (Abierto, En Proceso, Resuelto)', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-02-16', '2026-03-15', '2026-02-16', '2026-03-15', NOW()),
('ACT-00060', NULL, 'Escalamiento automático por SLA', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-03-16', '2026-04-20', '2026-03-16', '2026-04-20', NOW()),
('ACT-00060', NULL, 'Historial y base de conocimiento de soluciones', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-04-21', '2026-05-26', '2026-04-21', '2026-05-26', NOW());

-- ACT-00061: 6.4 Módulo de Gestión de Actividades
INSERT INTO actividades (
    desarrollo_id, parent_id, titulo, descripcion, estado, 
    responsable_id, asignado_a_id, delegado_por_id, estado_validacion,
    horas_estimadas, horas_reales, porcentaje_avance,
    fecha_inicio_estimada, fecha_fin_estimada, fecha_inicio_real, fecha_fin_real, creado_en
) VALUES 
('ACT-00061', NULL, 'Creación de actividades WBS desde el portal', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2025-09-22', '2025-11-30', '2025-09-22', '2025-11-30', NOW()),
('ACT-00061', NULL, 'Asignación jerárquica de responsables y analistas', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2025-12-01', '2026-02-15', '2025-12-01', '2026-02-15', NOW()),
('ACT-00061', NULL, 'Seguimiento visual en diagrama de Gantt híbrido', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-02-16', '2026-04-15', '2026-02-16', '2026-04-15', NOW()),
('ACT-00061', NULL, 'Cálculo automático y propagación de avances', NULL, 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, '2026-04-16', '2026-05-26', '2026-04-16', '2026-05-26', NOW());

COMMIT;
