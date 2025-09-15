-- =============================================================================
-- DATOS SEED - SISTEMA DE GESTIÓN DE PROYECTOS TI
-- Poblar tablas con datos básicos necesarios para funcionar
-- =============================================================================

-- INSERTAR FASES DEL DESARROLLO
-- =============================================================================
INSERT INTO development_phases (phase_name, phase_description, phase_color, sort_order) VALUES
('En Ejecución', 'Desarrollo en proceso activo de ejecución con trabajo continuo del equipo', 'info', 1),
('En Espera', 'Desarrollo en estado de espera por aprobaciones, decisiones o dependencias externas', 'warning', 2),
('Finales / Otros', 'Desarrollo finalizado exitosamente, desplegado en producción o cancelado', 'success', 3);

-- INSERTAR ETAPAS DEL CICLO DE DESARROLLO
-- =============================================================================

-- FASE: En Ejecución (ID: 1)
INSERT INTO development_stages (phase_id, stage_code, stage_name, stage_description, is_milestone, estimated_days, responsible_party, sort_order) VALUES
(1, '1', 'Definición', 'Definición y especificación detallada de requerimientos funcionales y técnicos', true, 5, 'usuario', 1),
(1, '2', 'Análisis', 'Análisis técnico y funcional del desarrollo, arquitectura y diseño', true, 3, 'proveedor', 2),
(1, '5', 'Desarrollo', 'Desarrollo e implementación del sistema según especificaciones', true, 15, 'proveedor', 5),
(1, '6', 'Despliegue (Pruebas)', 'Instalación del desarrollo en ambiente de pruebas para validación', false, 2, 'equipo_interno', 6),
(1, '7', 'Plan de Pruebas', 'Elaboración del plan de pruebas y definición de escenarios de validación', false, 3, 'usuario', 7),
(1, '8', 'Ejecución Pruebas', 'Ejecución y certificación de pruebas por parte del usuario final', true, 7, 'usuario', 8);

-- FASE: En Espera (ID: 2)
INSERT INTO development_stages (phase_id, stage_code, stage_name, stage_description, is_milestone, estimated_days, responsible_party, sort_order) VALUES
(2, '3', 'Propuesta', 'Elaboración y presentación de propuesta comercial y técnica', true, 10, 'proveedor', 3),
(2, '4', 'Aprobación', 'Esperando aprobación del comité de compras o autoridad competente', false, 5, 'equipo_interno', 4),
(2, '9', 'Aprobación (Pase)', 'Aprobación final para pasar el desarrollo a ambiente de producción', true, 3, 'equipo_interno', 9);

-- FASE: Finales / Otros (ID: 3)
INSERT INTO development_stages (phase_id, stage_code, stage_name, stage_description, is_milestone, estimated_days, responsible_party, sort_order) VALUES
(3, '10', 'Desplegado', 'Desarrollo desplegado exitosamente y funcionando en ambiente de producción', true, 0, 'equipo_interno', 10),
(3, '0', 'Cancelado', 'Desarrollo cancelado por cualquier motivo (presupuesto, cambio de prioridades, etc.)', false, 0, 'equipo_interno', 0);

-- INSERTAR CATÁLOGO DE CONTROLES DE CALIDAD (FD-PR-072)
-- =============================================================================
INSERT INTO quality_control_catalog (control_code, control_name, description, stage_prefix, stage_description, deliverables, validation_criteria, is_active) VALUES

('C003-GT', 'Validación de Requerimientos Claros y Completos', 
 'Verificar que los requerimientos estén claramente definidos, sean completos y cumplan con los estándares de calidad establecidos por la organización.',
 '1-2', 'Etapas de Definición y Análisis',
 'Documento de requerimientos funcionales y técnicos, Matriz de trazabilidad completa, Aprobación formal del área solicitante, Casos de uso definidos',
 'Requerimientos claros y sin ambigüedades, Completitud verificada al 100%, Aprobación documentada del área solicitante, Matriz de trazabilidad actualizada y validada',
 true),

('C021-GT', 'Validación de Pruebas de Usuario vs. Requerimientos',
 'Verificar que las pruebas de usuario estén completamente alineadas con los requerimientos definidos y que cubran todos los casos de uso y escenarios críticos.',
 '5-7', 'Etapas de Desarrollo, Despliegue y Plan de Pruebas',
 'Plan de pruebas detallado, Casos de prueba por cada requerimiento, Evidencia de ejecución de pruebas, Reporte de resultados con trazabilidad, Certificación de cobertura',
 'Pruebas ejecutadas exitosamente al 100%, Casos de prueba cubren todos los requerimientos, Evidencia documentada de aprobación del usuario, Trazabilidad completa requerimiento-prueba',
 true),

('C004-GT', 'Garantía de Entregas sin Impacto Negativo',
 'Asegurar que las entregas no generen impactos negativos en el sistema existente, procesos operativos o experiencia del usuario final.',
 '8-10', 'Etapas de Ejecución de Pruebas, Aprobación y Despliegue',
 'Plan de despliegue detallado, Pruebas de regresión completas, Certificación de ambiente de pruebas, Plan de rollback documentado, Análisis de impacto',
 'Despliegue exitoso sin errores críticos, Pruebas de regresión aprobadas al 100%, Certificación de ambiente completada, Plan de rollback validado y probado',
 true),

('C027-GT', 'Validación Trimestral de Soportes en Producción',
 'Verificar trimestralmente que los desarrollos en producción estén funcionando correctamente, cumplan con los SLAs establecidos y mantengan la calidad esperada.',
 '10', 'Etapa de Desplegado - Soporte en Producción',
 'Reporte trimestral de soporte y disponibilidad, Evidencia de cumplimiento de SLAs, Métricas de disponibilidad y rendimiento, Log de incidencias y resoluciones',
 'SLA cumplido según acuerdo de servicio, Métricas de disponibilidad dentro de rangos establecidos (>99%), Reporte trimestral aprobado por área usuaria',
 true);

-- INSERTAR CONFIGURACIONES BÁSICAS DEL SISTEMA
-- =============================================================================
INSERT INTO system_settings (user_id, category, key, value) VALUES
('system', 'kpi', 'global_compliance_target', '85.0'),
('system', 'kpi', 'first_time_quality_target', '80.0'),
('system', 'kpi', 'response_time_target_hours', '4.0'),
('system', 'kpi', 'defects_per_delivery_target', '2.0'),
('system', 'kpi', 'post_production_rework_target', '5.0'),
('system', 'alerts', 'notification_days_ahead', '7'),
('system', 'alerts', 'urgent_threshold_days', '3'),
('system', 'alerts', 'overdue_check_enabled', 'true'),
('system', 'quality', 'auto_generate_controls', 'true'),
('system', 'quality', 'require_evidence_files', 'true');

-- INSERTAR PERMISOS BÁSICOS DEL SISTEMA
-- =============================================================================
INSERT INTO permissions (name, description, resource, action) VALUES
-- Permisos de Desarrollos
('developments.read', 'Ver desarrollos', 'developments', 'read'),
('developments.write', 'Crear y modificar desarrollos', 'developments', 'write'),
('developments.delete', 'Eliminar desarrollos', 'developments', 'delete'),
('developments.admin', 'Administrar todos los desarrollos', 'developments', 'admin'),

-- Permisos de Controles de Calidad
('quality.read', 'Ver controles de calidad', 'quality', 'read'),
('quality.write', 'Validar controles de calidad', 'quality', 'write'),
('quality.admin', 'Administrar catálogo de controles', 'quality', 'admin'),

-- Permisos de KPIs
('kpi.read', 'Ver métricas y KPIs', 'kpi', 'read'),
('kpi.calculate', 'Calcular métricas', 'kpi', 'write'),
('kpi.admin', 'Administrar configuración de KPIs', 'kpi', 'admin'),

-- Permisos de Alertas
('alerts.read', 'Ver alertas y actividades', 'alerts', 'read'),
('alerts.write', 'Crear y modificar alertas', 'alerts', 'write'),
('alerts.admin', 'Administrar sistema de alertas', 'alerts', 'admin'),

-- Permisos de Chat
('chat.read', 'Ver conversaciones', 'chat', 'read'),
('chat.write', 'Enviar mensajes', 'chat', 'write'),

-- Permisos de IA
('ai.read', 'Ver análisis de IA', 'ai', 'read'),
('ai.analyze', 'Solicitar análisis de IA', 'ai', 'write'),
('ai.admin', 'Administrar configuración de IA', 'ai', 'admin');

-- INSERTAR ROLES Y PERMISOS
-- =============================================================================
INSERT INTO role_permissions (role, permission_id) VALUES
-- Rol: admin (todos los permisos)
('admin', (SELECT id FROM permissions WHERE name = 'developments.admin')),
('admin', (SELECT id FROM permissions WHERE name = 'quality.admin')),
('admin', (SELECT id FROM permissions WHERE name = 'kpi.admin')),
('admin', (SELECT id FROM permissions WHERE name = 'alerts.admin')),
('admin', (SELECT id FROM permissions WHERE name = 'chat.write')),
('admin', (SELECT id FROM permissions WHERE name = 'ai.admin')),

-- Rol: manager (permisos de gestión)
('manager', (SELECT id FROM permissions WHERE name = 'developments.write')),
('manager', (SELECT id FROM permissions WHERE name = 'quality.write')),
('manager', (SELECT id FROM permissions WHERE name = 'kpi.read')),
('manager', (SELECT id FROM permissions WHERE name = 'alerts.write')),
('manager', (SELECT id FROM permissions WHERE name = 'chat.write')),
('manager', (SELECT id FROM permissions WHERE name = 'ai.analyze')),

-- Rol: user (permisos básicos)
('user', (SELECT id FROM permissions WHERE name = 'developments.read')),
('user', (SELECT id FROM permissions WHERE name = 'quality.read')),
('user', (SELECT id FROM permissions WHERE name = 'kpi.read')),
('user', (SELECT id FROM permissions WHERE name = 'alerts.read')),
('user', (SELECT id FROM permissions WHERE name = 'chat.write')),
('user', (SELECT id FROM permissions WHERE name = 'ai.read'));

-- INSERTAR CONFIGURACIONES DE MODELOS DE IA (MCP)
-- =============================================================================
INSERT INTO ai_model_configs (model_name, provider, is_active, max_tokens, temperature, cost_per_input_token, cost_per_output_token, rate_limit_per_minute, context_window, specialization, configuration) VALUES

('claude-3-sonnet-20240229', 'anthropic', true, 4000, 0.7, 0.000003, 0.000015, 60, 200000, 
 'Análisis técnico detallado, recomendaciones de mejora, detección de riesgos',
 '{"system_prompt": "Eres un experto en gestión de proyectos de TI especializado en análisis técnico y mejora de procesos.", "max_retries": 3}'),

('claude-3-haiku-20240307', 'anthropic', true, 4000, 0.5, 0.00000025, 0.00000125, 120, 200000,
 'Respuestas rápidas, chat interactivo, consultas básicas',
 '{"system_prompt": "Eres un asistente eficiente para consultas rápidas sobre proyectos de TI.", "max_retries": 2}'),

('gpt-4-turbo-preview', 'openai', false, 4000, 0.7, 0.00001, 0.00003, 60, 128000,
 'Análisis general, predicciones, generación de reportes',
 '{"system_prompt": "Analiza proyectos de TI y proporciona insights basados en datos.", "max_retries": 3}'),

('gpt-3.5-turbo', 'openai', false, 4000, 0.8, 0.0000005, 0.0000015, 120, 16000,
 'Chat básico, consultas simples, soporte general',
 '{"system_prompt": "Asiste con consultas básicas sobre gestión de proyectos.", "max_retries": 2}');

-- =============================================================================
-- DATOS DE EJEMPLO PARA DESARROLLO Y TESTING
-- =============================================================================

-- Insertar usuario de ejemplo para testing
INSERT INTO auth_users (id, email, password_hash, name, role, is_active, email_verified) VALUES
('admin-001', 'admin@gestor-proyectos.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Administrador Sistema', 'admin', true, true),
('user-001', 'usuario@gestor-proyectos.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Usuario Ejemplo', 'user', true, true);
-- Contraseña para ambos: "password123"

-- Insertar desarrollo de ejemplo
INSERT INTO developments (id, name, description, module, type, environment, current_phase_id, current_stage_id, stage_progress_percentage, general_status, provider) VALUES
('REQ-2024-001', 'Sistema de Autenticación Mejorada', 
 'Implementación de autenticación de dos factores y mejoras de seguridad en el sistema principal',
 'Seguridad', 'Desarrollo', 'Producción', 
 1, (SELECT id FROM development_stages WHERE stage_code = '2'), 75.0, 'En curso', 'Ingesoft');

-- Insertar fechas para el desarrollo de ejemplo
INSERT INTO development_dates (development_id, date_type, planned_date, actual_date, days_estimated, days_actual, delivery_status, approval_status) VALUES
('REQ-2024-001', 'inicio', '2024-01-15', '2024-01-15', 0, 0, 'on_time', 'approved_first_time'),
('REQ-2024-001', 'fin_estimado', '2024-03-15', NULL, 60, NULL, NULL, NULL);

-- Insertar proveedor para el desarrollo de ejemplo
INSERT INTO development_providers (development_id, provider_name, side_service_point, provider_system, status) VALUES
('REQ-2024-001', 'Ingesoft', 'SP-001', 'Sistema Interno Ingesoft', 'Activo');

-- Insertar responsable para el desarrollo de ejemplo
INSERT INTO development_responsibles (development_id, user_name, role_type, area, is_primary, assigned_date) VALUES
('REQ-2024-001', 'Juan Pérez', 'tecnico', 'Desarrollo', true, '2024-01-15');

-- Insertar controles de calidad automáticos para el desarrollo de ejemplo
INSERT INTO development_quality_controls (development_id, control_catalog_id, control_code, status, validation_status) VALUES
('REQ-2024-001', (SELECT id FROM quality_control_catalog WHERE control_code = 'C003-GT'), 'C003-GT', 'Completado', 'Validado'),
('REQ-2024-001', (SELECT id FROM quality_control_catalog WHERE control_code = 'C021-GT'), 'C021-GT', 'Pendiente', 'Pendiente');

-- Insertar actividad próxima de ejemplo
INSERT INTO development_upcoming_activities (development_id, activity_type, title, description, due_date, responsible_party, responsible_person, status, priority) VALUES
('REQ-2024-001', 'entrega_proveedor', 'Entrega de Módulo de Autenticación', 
 'Entrega del módulo principal de autenticación de dos factores para pruebas de usuario',
 CURRENT_DATE + INTERVAL '5 days', 'proveedor', 'Juan Pérez', 'Pendiente', 'Alta');

-- =============================================================================
-- MENSAJE DE CONFIRMACIÓN
-- =============================================================================
-- Este script ha poblado la base de datos con:
-- ✅ 3 Fases del desarrollo
-- ✅ 11 Etapas del ciclo completo  
-- ✅ 4 Controles de calidad FD-PR-072
-- ✅ Configuraciones básicas del sistema
-- ✅ 15 Permisos y 3 roles básicos
-- ✅ 4 Configuraciones de modelos de IA
-- ✅ Datos de ejemplo para testing
-- 
-- La base de datos está lista para comenzar a trabajar.
