-- =============================================================================
-- SCRIPT DE CARGA MASIVA DE ACTIVIDADES Y SUBTAREAS EN PRODUCCIÓN
-- Gestor de Proyectos TI
-- =============================================================================
-- Este script es idempotente: elimina registros previos con los mismos IDs
-- y realiza la carga de desarrollos planos con sus sub-tareas WBS correspondientes.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. LIMPIEZA DE REGISTROS PREVIOS (IDEMPOTENCIA)
-- -----------------------------------------------------------------------------
DELETE FROM validaciones_asignacion WHERE desarrollo_id IN (
    'ACT-00049', 'ACT-00050', 'ACT-00051', 'ACT-00052', 'ACT-00053',
    'ACT-00054', 'ACT-00055', 'ACT-00056', 'ACT-00057', 'ACT-00058',
    'ACT-00059', 'ACT-00060', 'ACT-00061'
);

DELETE FROM actividades WHERE desarrollo_id IN (
    'ACT-00049', 'ACT-00050', 'ACT-00051', 'ACT-00052', 'ACT-00053',
    'ACT-00054', 'ACT-00055', 'ACT-00056', 'ACT-00057', 'ACT-00058',
    'ACT-00059', 'ACT-00060', 'ACT-00061'
);

DELETE FROM desarrollos WHERE id IN (
    'ACT-00049', 'ACT-00050', 'ACT-00051', 'ACT-00052', 'ACT-00053',
    'ACT-00054', 'ACT-00055', 'ACT-00056', 'ACT-00057', 'ACT-00058',
    'ACT-00059', 'ACT-00060', 'ACT-00061'
);


-- -----------------------------------------------------------------------------
-- 2. INSERCIÓN DE DESARROLLOS (PROYECTOS)
-- -----------------------------------------------------------------------------
INSERT INTO desarrollos (
    id, nombre, descripcion, modulo, tipo, ambiente,
    responsable, responsable_id, analista, autoridad, supervisor, creado_por_id,
    area_desarrollo, area_ejecutor, estado_general, estado_validacion, porcentaje_progreso, creado_en
) VALUES 
('ACT-00049', '1. Consulta y Construcción de Proveedores', 'Construcción de módulo para consulta de catálogo de productos y fuentes', 'Proveedores', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Compras', 'D&DT', 'En Progreso', 'aprobada', 50.0, NOW()),
('ACT-00050', '2.1 Inventario Físico', 'Sistema de gestión de inventario físico implementado', 'Logística', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Logística', 'D&DT', 'Completado', 'aprobada', 100.0, NOW()),
('ACT-00051', '2.2 Adaptación para Inventarios Cíclicos', 'Módulo para gestionar ciclos de inventario', 'Logística', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Logística', 'D&DT', 'En Progreso', 'aprobada', 50.0, NOW()),
('ACT-00052', '2.3 Formularios del Sistema de Solicitudes', 'Desarrollo de formularios para solicitudes de logística', 'Logística', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Logística', 'D&DT', 'En Progreso', 'aprobada', 60.0, NOW()),
('ACT-00053', '3.1 Certificado de Ingresos y Retenciones', 'Generación de certificados laborales para empleados', 'Gestión Humana', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Gestión Humana', 'D&DT', 'Pendiente', 'aprobada', 0.0, NOW()),
('ACT-00054', '4.1 Ingreso de Legalizaciones Web', 'Plataforma para legalizaciones de viáticos en línea', 'Gestión Humana', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Contabilidad', 'D&DT', 'En Progreso', 'aprobada', 75.0, NOW()),
('ACT-00055', '4.2 Generación de Estado de Cuenta en PDF y Portal', 'Reporte visual de viáticos por empleado', 'Gestión Humana', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Contabilidad', 'D&DT', 'Completado', 'aprobada', 100.0, NOW()),
('ACT-00056', '4.3 Generación de Estado de Cuenta en XLS', 'Exportación de datos de viáticos a formato Excel', 'Gestión Humana', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Contabilidad', 'D&DT', 'En Progreso', 'aprobada', 33.0, NOW()),
('ACT-00057', '5.1 Matriz de Celulares', 'Control y asignación de dispositivos móviles corporativos', 'Gestión Humana', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Administrativa', 'D&DT', 'En Progreso', 'aprobada', 40.0, NOW()),
('ACT-00058', '6.1 Funcionalidades de Aprobación de Solicitud de Desarrollos', 'Flujo de aprobación para solicitudes de desarrollo', 'Funcionalidades Generales', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Sistemas', 'D&DT', 'Pendiente', 'aprobada', 0.0, NOW()),
('ACT-00059', '6.2 Reserva de Salas', 'Sistema de reservación de espacios y salas de reunión', 'Funcionalidades Generales', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Administrativa', 'D&DT', 'Completado', 'aprobada', 100.0, NOW()),
('ACT-00060', '6.3 Funcionalidades de Respuesta a Solicitud de Tickets', 'Sistema de gestión de tickets y respuestas', 'Funcionalidades Generales', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Sistemas', 'D&DT', 'Completado', 'aprobada', 100.0, NOW()),
('ACT-00061', '6.4 Módulo de Gestión de Actividades', 'Control y seguimiento de actividades por proyecto', 'Funcionalidades Generales', 'Proyecto', 'Portal', 'OSORIO LENIS HARRY', 'USR-14836440', 'ROJAS VILLOTA LUIS ENRIQUE', 'TORRES AGUDELO MARIBELL', 'ROJAS VILLOTA LUIS ENRIQUE', 'USR-1107068093', 'Sistemas', 'D&DT', 'Completado', 'aprobada', 100.0, NOW());


-- -----------------------------------------------------------------------------
-- 3. INSERCIÓN DE SUBTAREAS WBS
-- -----------------------------------------------------------------------------

-- ACT-00049: 1. Consulta y Construcción de Proveedores
INSERT INTO actividades (desarrollo_id, parent_id, titulo, estado, responsable_id, asignado_a_id, delegado_por_id, estado_validacion, horas_estimadas, horas_reales, porcentaje_avance, creado_en) VALUES 
('ACT-00049', NULL, 'Identificación de la fuente de datos en Excel (Catalogo de Artículos)', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00049', NULL, 'Construcción del script de carga hacia PostgreSQL', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00049', NULL, 'Validación de resultados e inconsistencias', 'En Progreso', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW()),
('ACT-00049', NULL, 'Despliegue y automatización en servidor', 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW());

-- ACT-00050: 2.1 Inventario Físico
INSERT INTO actividades (desarrollo_id, parent_id, titulo, estado, responsable_id, asignado_a_id, delegado_por_id, estado_validacion, horas_estimadas, horas_reales, porcentaje_avance, creado_en) VALUES 
('ACT-00050', NULL, 'Pantalla de captura para conteo físico de activos', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00050', NULL, 'Generación de informes de inconsistencias y auditoría', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00050', NULL, 'Sincronización de datos con el módulo de Inventario Anual', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW());

-- ACT-00051: 2.2 Adaptación para Inventarios Cíclicos
INSERT INTO actividades (desarrollo_id, parent_id, titulo, estado, responsable_id, asignado_a_id, delegado_por_id, estado_validacion, horas_estimadas, horas_reales, porcentaje_avance, creado_en) VALUES 
('ACT-00051', NULL, 'Recibimiento de solicitud de parametrización', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00051', NULL, 'Levantamiento del proceso y lógica de ciclos', 'En Progreso', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW());

-- ACT-00052: 2.3 Formularios del Sistema de Solicitudes
INSERT INTO actividades (desarrollo_id, parent_id, titulo, estado, responsable_id, asignado_a_id, delegado_por_id, estado_validacion, horas_estimadas, horas_reales, porcentaje_avance, creado_en) VALUES 
('ACT-00052', NULL, 'Diseño de interfaz de formularios de almacén', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00052', NULL, 'Validación de campos obligatorios en el frontend', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00052', NULL, 'Diseño de tarjetas de estado de pedidos', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00052', NULL, 'Integración con el flujo de aprobación RDX', 'En Progreso', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW()),
('ACT-00052', NULL, 'Pruebas funcionales integradas', 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW());

-- ACT-00053: 3.1 Certificado de Ingresos y Retenciones
INSERT INTO actividades (desarrollo_id, parent_id, titulo, estado, responsable_id, asignado_a_id, delegado_por_id, estado_validacion, horas_estimadas, horas_reales, porcentaje_avance, creado_en) VALUES 
('ACT-00053', NULL, 'Diseño del layout del certificado laboral', 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW()),
('ACT-00053', NULL, 'Validación de datos de nómina', 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW()),
('ACT-00053', NULL, 'Generación del reporte en formato PDF', 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW()),
('ACT-00053', NULL, 'Envío automático por correo corporativo', 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW());

-- ACT-00054: 4.1 Ingreso de Legalizaciones Web
INSERT INTO actividades (desarrollo_id, parent_id, titulo, estado, responsable_id, asignado_a_id, delegado_por_id, estado_validacion, horas_estimadas, horas_reales, porcentaje_avance, creado_en) VALUES 
('ACT-00054', NULL, 'Interfaz de carga de documentos y adjuntos (soporte)', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00054', NULL, 'Validación y parseo de recibos y facturas', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00054', NULL, 'Flujo de aprobación multinivel por jefatura', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00054', NULL, 'Integración con el módulo contable', 'En Progreso', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW());

-- ACT-00055: 4.2 Generación de Estado de Cuenta en PDF y Portal
INSERT INTO actividades (desarrollo_id, parent_id, titulo, estado, responsable_id, asignado_a_id, delegado_por_id, estado_validacion, horas_estimadas, horas_reales, porcentaje_avance, creado_en) VALUES 
('ACT-00055', NULL, 'Template visual para exportación a PDF', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00055', NULL, 'Widget interactivo de saldos en el portal', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00055', NULL, 'Cálculo automático de saldos de viáticos', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW());

-- ACT-00056: 4.3 Generación de Estado de Cuenta en XLS
INSERT INTO actividades (desarrollo_id, parent_id, titulo, estado, responsable_id, asignado_a_id, delegado_por_id, estado_validacion, horas_estimadas, horas_reales, porcentaje_avance, creado_en) VALUES 
('ACT-00056', NULL, 'Diseño de estructura de columnas para reporte de gastos', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00056', NULL, 'Definición de estilos y formato de celdas', 'En Progreso', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW()),
('ACT-00056', NULL, 'Validación de datos exportados contra base de datos', 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW());

-- ACT-00057: 5.1 Matriz de Celulares
INSERT INTO actividades (desarrollo_id, parent_id, titulo, estado, responsable_id, asignado_a_id, delegado_por_id, estado_validacion, horas_estimadas, horas_reales, porcentaje_avance, creado_en) VALUES 
('ACT-00057', NULL, 'Registro e inventario de líneas corporativas', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00057', NULL, 'Mapeo de asignaciones de equipos a empleados', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00057', NULL, 'Seguimiento de mantenimientos y reparaciones', 'En Progreso', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW()),
('ACT-00057', NULL, 'Control de costos y auditoría de uso mensual', 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW());

-- ACT-00058: 6.1 Funcionalidades de Aprobación de Solicitud de Desarrollos
INSERT INTO actividades (desarrollo_id, parent_id, titulo, estado, responsable_id, asignado_a_id, delegado_por_id, estado_validacion, horas_estimadas, horas_reales, porcentaje_avance, creado_en) VALUES 
('ACT-00058', NULL, 'Configuración de matrices de niveles de aprobación', 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW()),
('ACT-00058', NULL, 'Notificaciones en tiempo real a aprobadores', 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW()),
('ACT-00058', NULL, 'Módulo de firmas digitales y registro de decisiones', 'Pendiente', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 0.0, NOW());

-- ACT-00059: 6.2 Reserva de Salas
INSERT INTO actividades (desarrollo_id, parent_id, titulo, estado, responsable_id, asignado_a_id, delegado_por_id, estado_validacion, horas_estimadas, horas_reales, porcentaje_avance, creado_en) VALUES 
('ACT-00059', NULL, 'Calendario de disponibilidad de salas en tiempo real', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00059', NULL, 'Control de conflictos de horarios y duplicaciones', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00059', NULL, 'Módulo de notificaciones de confirmación de reserva', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00059', NULL, 'Flujo de cancelación y reprogramación', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW());

-- ACT-00060: 6.3 Funcionalidades de Respuesta a Solicitud de Tickets
INSERT INTO actividades (desarrollo_id, parent_id, titulo, estado, responsable_id, asignado_a_id, delegado_por_id, estado_validacion, horas_estimadas, horas_reales, porcentaje_avance, creado_en) VALUES 
('ACT-00060', NULL, 'Módulo de respuesta técnica y chat interno en ticket', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00060', NULL, 'Gestión de estados del ticket (Abierto, En Proceso, Resuelto)', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00060', NULL, 'Escalamiento automático por SLA', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00060', NULL, 'Historial y base de conocimiento de soluciones', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW());

-- ACT-00061: 6.4 Módulo de Gestión de Actividades
INSERT INTO actividades (desarrollo_id, parent_id, titulo, estado, responsable_id, asignado_a_id, delegado_por_id, estado_validacion, horas_estimadas, horas_reales, porcentaje_avance, creado_en) VALUES 
('ACT-00061', NULL, 'Creación de actividades WBS desde el portal', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00061', NULL, 'Asignación jerárquica de responsables y analistas', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00061', NULL, 'Seguimiento visual en diagrama de Gantt híbrido', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW()),
('ACT-00061', NULL, 'Cálculo automático y propagación de avances', 'Completado', 'USR-1107068093', 'USR-1107068093', 'USR-14836440', 'aprobada', 0.0, 0.0, 100.0, NOW());

COMMIT;
