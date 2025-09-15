-- =============================================================================
-- MIGRACIÓN COMPLETA DE BASE DE DATOS - SISTEMA DE GESTIÓN DE PROYECTOS TI
-- Basado en ARQUITECTURA_BASE_DATOS.md
-- =============================================================================

-- ELIMINAR TODA LA ESTRUCTURA EXISTENTE
-- =============================================================================

-- Eliminar vistas existentes
DROP VIEW IF EXISTS kpi_historical_view CASCADE;
DROP VIEW IF EXISTS provider_kpi_summary CASCADE;
DROP VIEW IF EXISTS post_production_rework_view CASCADE;
DROP VIEW IF EXISTS defects_per_delivery_view CASCADE;
DROP VIEW IF EXISTS failure_response_time_view CASCADE;
DROP VIEW IF EXISTS first_time_quality_view CASCADE;
DROP VIEW IF EXISTS development_compliance_days_view CASCADE;
DROP VIEW IF EXISTS global_compliance_view CASCADE;
DROP VIEW IF EXISTS applicable_quality_controls CASCADE;
DROP VIEW IF EXISTS current_quality_controls CASCADE;
DROP VIEW IF EXISTS upcoming_activities_alerts CASCADE;
DROP VIEW IF EXISTS latest_development_observation CASCADE;
DROP VIEW IF EXISTS development_cycle_flow CASCADE;
DROP VIEW IF EXISTS current_development_status CASCADE;

-- Eliminar tablas existentes (en orden correcto por dependencias)
DROP TABLE IF EXISTS development_delivery_history CASCADE;
DROP TABLE IF EXISTS development_test_results CASCADE;
DROP TABLE IF EXISTS development_quality_metrics CASCADE;
DROP TABLE IF EXISTS development_functionalities CASCADE;
DROP TABLE IF EXISTS development_kpi_metrics CASCADE;
DROP TABLE IF EXISTS development_upcoming_activities CASCADE;
DROP TABLE IF EXISTS development_quality_controls CASCADE;
DROP TABLE IF EXISTS quality_control_catalog CASCADE;
DROP TABLE IF EXISTS development_observations CASCADE;
DROP TABLE IF EXISTS development_status_history CASCADE;
DROP TABLE IF EXISTS development_responsibles CASCADE;
DROP TABLE IF EXISTS development_providers CASCADE;
DROP TABLE IF EXISTS development_installers CASCADE;
DROP TABLE IF EXISTS development_proposals CASCADE;
DROP TABLE IF EXISTS development_dates CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS developments CASCADE;
DROP TABLE IF EXISTS development_stages CASCADE;
DROP TABLE IF EXISTS development_phases CASCADE;

-- Eliminar tablas del sistema de usuarios y chat (si existen)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS auth_tokens CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS auth_users CASCADE;

-- =============================================================================
-- CREAR NUEVA ESTRUCTURA DE BASE DE DATOS
-- =============================================================================

-- 1. TABLA: development_phases (Fases Generales del Desarrollo)
-- =============================================================================
CREATE TABLE development_phases (
    id SERIAL PRIMARY KEY,
    phase_name VARCHAR(100) NOT NULL,             -- 'En Ejecución', 'En Espera', 'Finales / Otros'
    phase_description TEXT,                       -- Descripción de la fase
    phase_color VARCHAR(20),                      -- Color para visualización ('info', 'warning', 'success')
    is_active BOOLEAN DEFAULT TRUE,               -- Si la fase está activa
    sort_order INTEGER,                           -- Orden de visualización
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA: development_stages (Etapas Específicas del Ciclo)
-- =============================================================================
CREATE TABLE development_stages (
    id SERIAL PRIMARY KEY,
    phase_id INTEGER REFERENCES development_phases(id),
    stage_code VARCHAR(20) NOT NULL,             -- '0', '1', '2', '3', etc.
    stage_name VARCHAR(255) NOT NULL,            -- Nombre amigable de la etapa
    stage_description TEXT,                      -- Descripción detallada
    is_milestone BOOLEAN DEFAULT FALSE,          -- Si es un hito importante
    estimated_days INTEGER,                      -- Días estimados para esta etapa
    responsible_party VARCHAR(100),              -- 'proveedor', 'usuario', 'equipo_interno'
    sort_order INTEGER,                          -- Orden dentro de la fase
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA PRINCIPAL: developments (Datos Maestros del Desarrollo)
-- =============================================================================
CREATE TABLE developments (
    id VARCHAR(50) PRIMARY KEY,                    -- No.Remedy
    name VARCHAR(255) NOT NULL,                    -- Nombre del Desarrollo
    description TEXT,                              -- Descripción
    module VARCHAR(100),                           -- Módulo
    type VARCHAR(50),                              -- Tipo (Desarrollo/Consulta)
    environment VARCHAR(100),                      -- Ambiente
    remedy_link TEXT,                              -- Link Remedy
    
    -- CAMPOS PARA CICLO DE DESARROLLO
    current_phase_id INTEGER REFERENCES development_phases(id),
    current_stage_id INTEGER REFERENCES development_stages(id),
    stage_progress_percentage DECIMAL(5,2) DEFAULT 0.0,
    
    -- CAMPOS LEGACY PARA COMPATIBILIDAD CON CRUD.PY
    general_status VARCHAR(50) DEFAULT 'Pendiente', -- 'Pendiente', 'En curso', 'Completado'
    estimated_end_date DATE,                        -- Fecha estimada de finalización
    provider VARCHAR(100),                          -- Proveedor principal
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA: development_dates (Fechas y Cronograma)
-- =============================================================================
CREATE TABLE development_dates (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    date_type VARCHAR(50) NOT NULL,                -- 'inicio', 'fin_estimado', 'entrega', 'cierre', 'produccion'
    planned_date DATE,                             -- Fecha planificada
    actual_date DATE,                              -- Fecha real
    days_estimated INTEGER,                        -- Días estimados
    days_actual INTEGER,                           -- Días reales
    
    -- CAMPOS PARA INDICADORES DE CALIDAD
    delivery_status VARCHAR(50),                   -- 'on_time', 'delayed', 'cancelled'
    approval_status VARCHAR(50),                   -- 'approved_first_time', 'approved_with_returns', 'rejected'
    functionality_count INTEGER DEFAULT 0,         -- Número de funcionalidades entregadas
    production_deployment_date DATE,               -- Fecha de despliegue a producción
    delivery_compliance_score DECIMAL(5,2),        -- Puntuación de cumplimiento (0-100)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA: development_proposals (Propuestas Comerciales)
-- =============================================================================
CREATE TABLE development_proposals (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    proposal_number VARCHAR(100) NOT NULL,         -- Número de propuesta
    cost DECIMAL(15,2),                            -- Costo
    status VARCHAR(50),                            -- Estado de la propuesta
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA: development_installers (Instaladores y Versiones)
-- =============================================================================
CREATE TABLE development_installers (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    installer_number VARCHAR(100),                 -- Número de instalador
    version VARCHAR(50),                           -- Versión
    environment VARCHAR(100),                      -- Ambiente específico
    installation_date DATE,                        -- Fecha de instalación
    status VARCHAR(50),                            -- Estado del instalador
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA: development_providers (Proveedores y Radicados)
-- =============================================================================
CREATE TABLE development_providers (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    provider_name VARCHAR(100) NOT NULL,           -- Proveedor (Ingesoft, ITC, TI)
    side_service_point VARCHAR(100),               -- SIDE/Service Point
    provider_system VARCHAR(100),                  -- Sistema del proveedor
    status VARCHAR(50),                            -- Estado con el proveedor
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA: development_responsibles (Responsables y Asignaciones)
-- =============================================================================
CREATE TABLE development_responsibles (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    user_name VARCHAR(255) NOT NULL,               -- Nombre del usuario
    role_type VARCHAR(50) NOT NULL,                -- 'solicitante', 'tecnico', 'area'
    area VARCHAR(100),                             -- Área
    is_primary BOOLEAN DEFAULT FALSE,              -- Responsable principal
    assigned_date DATE,                            -- Fecha de asignación
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABLA: development_status_history (Historial de Estados)
-- =============================================================================
CREATE TABLE development_status_history (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    status VARCHAR(50) NOT NULL,                   -- Estado (En curso, Completado, etc.)
    progress_stage VARCHAR(100),                   -- Etapa de progreso
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(255),                       -- Quien hizo el cambio
    previous_status VARCHAR(50),                   -- Estado anterior
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABLA: development_observations (Bitácora y Observaciones)
-- =============================================================================
CREATE TABLE development_observations (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    observation_type VARCHAR(50) NOT NULL,         -- 'estado', 'seguimiento', 'problema', 'acuerdo'
    content TEXT NOT NULL,                         -- Contenido de la observación
    author VARCHAR(255),                           -- Autor de la observación
    observation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_current BOOLEAN DEFAULT FALSE,              -- Observación actual
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABLA: quality_control_catalog (Catálogo de Controles FD-PR-072)
-- =============================================================================
CREATE TABLE quality_control_catalog (
    id SERIAL PRIMARY KEY,
    control_code VARCHAR(20) NOT NULL UNIQUE,      -- C003-GT, C021-GT, C004-GT, C027-GT
    control_name VARCHAR(255) NOT NULL,            -- Nombre del control
    description TEXT NOT NULL,                     -- Descripción detallada del control
    stage_prefix VARCHAR(50) NOT NULL,             -- Etapas donde aplica (1-2, 5-7, 8-10)
    stage_description VARCHAR(255),                -- Descripción de las etapas
    deliverables TEXT,                             -- Entregables requeridos
    validation_criteria TEXT,                      -- Criterios de validación
    is_active BOOLEAN DEFAULT TRUE,                -- Control activo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. TABLA: development_quality_controls (Controles por Desarrollo)
-- =============================================================================
CREATE TABLE development_quality_controls (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    control_catalog_id INTEGER REFERENCES quality_control_catalog(id),
    control_code VARCHAR(20) NOT NULL,             -- C003-GT, C021-GT, C004-GT, C027-GT
    status VARCHAR(50) DEFAULT 'Pendiente',        -- 'Pendiente', 'Completado', 'No Aplica', 'Rechazado'
    validation_status VARCHAR(50) DEFAULT 'Pendiente', -- 'Pendiente', 'Validado', 'Rechazado', 'En Revisión'
    completed_by VARCHAR(255),                     -- Quien completó el control
    completed_at TIMESTAMP,                        -- Fecha de completado
    validated_by VARCHAR(255),                     -- Quien validó el control
    validated_at TIMESTAMP,                        -- Fecha de validación
    deliverables_provided TEXT,                    -- Entregables proporcionados
    validation_notes TEXT,                         -- Notas de validación
    rejection_reason TEXT,                         -- Razón de rechazo si aplica
    evidence_files TEXT,                           -- Archivos de evidencia (JSON array)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. TABLA: development_kpi_metrics (Métricas e Indicadores)
-- =============================================================================
CREATE TABLE development_kpi_metrics (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    metric_type VARCHAR(100) NOT NULL,             -- 'cumplimiento_fechas', 'calidad_primera_entrega', etc.
    provider VARCHAR(100),                         -- Proveedor para agrupación
    period_start DATE,                             -- Inicio del período
    period_end DATE,                               -- Fin del período
    value DECIMAL(10,2),                           -- Valor de la métrica
    target_value DECIMAL(10,2),                    -- Valor objetivo
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calculated_by VARCHAR(255),                    -- Quien calculó la métrica
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. TABLA: development_upcoming_activities (Sistema de Alertas)
-- =============================================================================
CREATE TABLE development_upcoming_activities (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    activity_type VARCHAR(100) NOT NULL,           -- 'entrega_proveedor', 'reunion', 'entrega_usuario', 'revision'
    title VARCHAR(255) NOT NULL,                   -- Título de la actividad
    description TEXT,                              -- Descripción detallada
    due_date DATE NOT NULL,                        -- Fecha límite
    responsible_party VARCHAR(100) NOT NULL,       -- 'proveedor', 'usuario', 'equipo_interno'
    responsible_person VARCHAR(255),               -- Persona específica responsable
    status VARCHAR(50) DEFAULT 'Pendiente',        -- 'Pendiente', 'Completado', 'Vencido', 'Cancelado'
    priority VARCHAR(20) DEFAULT 'Media',          -- 'Alta', 'Media', 'Baja'
    alert_sent BOOLEAN DEFAULT FALSE,              -- Si se envió alerta
    completed_at TIMESTAMP,                        -- Fecha de completado
    created_by VARCHAR(255),                       -- Quien creó la actividad
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. TABLA: activity_logs (Bitácora de Actividades Diarias)
-- =============================================================================
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    date TIMESTAMP NOT NULL,                       -- Fecha de la actividad
    description TEXT NOT NULL,                     -- Descripción de la actividad
    category VARCHAR(100),                         -- Categoría de la actividad
    user_id VARCHAR(255),                          -- Usuario que registró
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. TABLA: incidents (Incidencias Post-Producción)
-- =============================================================================
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    report_date TIMESTAMP NOT NULL,                -- Fecha de reporte
    resolution_date TIMESTAMP,                     -- Fecha de resolución
    description TEXT NOT NULL,                     -- Descripción de la incidencia
    severity VARCHAR(50),                          -- Severidad
    impact VARCHAR(50),                            -- Impacto
    status VARCHAR(50) DEFAULT 'Abierta',          -- 'Abierta', 'Cerrada'
    assigned_to VARCHAR(255),                      -- Asignado a
    
    -- CAMPOS PARA INDICADORES DE CALIDAD
    is_production_derived BOOLEAN DEFAULT FALSE,    -- Si la incidencia es derivada de producción
    incident_type VARCHAR(50),                      -- 'production', 'development', 'testing', 'deployment'
    severity_level VARCHAR(20),                     -- 'low', 'medium', 'high', 'critical'
    response_time_hours DECIMAL(8,2),               -- Tiempo de respuesta en horas (calculado)
    resolution_time_hours DECIMAL(8,2),             -- Tiempo de resolución en horas (calculado)
    is_rework BOOLEAN DEFAULT FALSE,                -- Si requiere retrabajo
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. TABLA: development_functionalities (Funcionalidades Entregadas)
-- =============================================================================
CREATE TABLE development_functionalities (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    functionality_name VARCHAR(255) NOT NULL,         -- Nombre de la funcionalidad
    functionality_code VARCHAR(100),                  -- Código único de funcionalidad
    description TEXT,                                 -- Descripción detallada
    status VARCHAR(50) DEFAULT 'delivered',          -- 'delivered', 'pending', 'rejected', 'in_progress'
    delivery_date DATE,                               -- Fecha de entrega
    defects_count INTEGER DEFAULT 0,                  -- Número de defectos encontrados
    test_coverage_percentage DECIMAL(5,2),            -- Cobertura de pruebas (%)
    complexity_level VARCHAR(20) DEFAULT 'medium',    -- 'low', 'medium', 'high', 'critical'
    estimated_hours DECIMAL(8,2),                     -- Horas estimadas
    actual_hours DECIMAL(8,2),                        -- Horas reales
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. TABLA: development_quality_metrics (Métricas de Calidad Calculadas)
-- =============================================================================
CREATE TABLE development_quality_metrics (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    provider VARCHAR(100),                            -- Proveedor para agrupación
    metric_type VARCHAR(100) NOT NULL,               -- 'first_time_quality', 'defects_per_delivery', etc.
    metric_name VARCHAR(255) NOT NULL,               -- Nombre descriptivo de la métrica
    value DECIMAL(10,2),                             -- Valor calculado
    target_value DECIMAL(10,2),                      -- Valor objetivo
    unit VARCHAR(20) DEFAULT 'percentage',           -- 'percentage', 'hours', 'count', 'days'
    calculation_method VARCHAR(100),                 -- Método de cálculo usado
    period_start DATE,                               -- Inicio del período de cálculo
    period_end DATE,                                 -- Fin del período de cálculo
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calculated_by VARCHAR(255),                      -- Usuario o sistema que calculó
    is_current BOOLEAN DEFAULT TRUE,                 -- Si es la métrica actual
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. TABLA: development_test_results (Resultados de Pruebas)
-- =============================================================================
CREATE TABLE development_test_results (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    functionality_id INTEGER REFERENCES development_functionalities(id),
    test_type VARCHAR(50) NOT NULL,                  -- 'unit', 'integration', 'system', 'user_acceptance'
    test_phase VARCHAR(50),                          -- 'development', 'testing', 'pre_production', 'production'
    test_date DATE,                                  -- Fecha de la prueba
    test_status VARCHAR(50),                         -- 'passed', 'failed', 'blocked', 'not_executed'
    defects_found INTEGER DEFAULT 0,                -- Defectos encontrados en esta prueba
    defects_severity VARCHAR(50),                    -- 'low', 'medium', 'high', 'critical'
    test_coverage DECIMAL(5,2),                      -- Cobertura de pruebas (%)
    execution_time_hours DECIMAL(8,2),               -- Tiempo de ejecución
    tester_name VARCHAR(255),                        -- Nombre del tester
    notes TEXT,                                      -- Observaciones
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 20. TABLA: development_delivery_history (Historial de Entregas)
-- =============================================================================
CREATE TABLE development_delivery_history (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    delivery_version VARCHAR(50),                    -- Versión de entrega
    delivery_type VARCHAR(50),                       -- 'initial', 'revision', 'fix', 'final'
    delivery_date DATE,                              -- Fecha de entrega
    delivery_status VARCHAR(50),                     -- 'delivered', 'returned', 'accepted', 'rejected'
    return_reason TEXT,                              -- Razón de devolución si aplica
    return_count INTEGER DEFAULT 0,                  -- Número de devoluciones
    approval_date DATE,                              -- Fecha de aprobación
    approved_by VARCHAR(255),                        -- Quien aprobó
    quality_score DECIMAL(5,2),                      -- Puntuación de calidad (0-100)
    defects_reported INTEGER DEFAULT 0,              -- Defectos reportados
    defects_resolved INTEGER DEFAULT 0,              -- Defectos resueltos
    delivery_notes TEXT,                             -- Notas de entrega
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INSERTAR DATOS DE CATÁLOGO
-- =============================================================================

-- FASES GENERALES DEL DESARROLLO
-- =============================================================================
INSERT INTO development_phases (phase_name, phase_description, phase_color, sort_order) VALUES
('En Ejecución', 'Desarrollo en proceso activo de ejecución', 'info', 1),
('En Espera', 'Desarrollo en estado de espera por aprobaciones o decisiones', 'warning', 2),
('Finales / Otros', 'Desarrollo finalizado, desplegado o cancelado', 'success', 3);

-- ETAPAS ESPECÍFICAS DEL CICLO
-- =============================================================================
INSERT INTO development_stages (phase_id, stage_code, stage_name, stage_description, is_milestone, estimated_days, responsible_party, sort_order) VALUES

-- FASE: En Ejecución (ID: 1)
(1, '1', 'Definición', 'Definición y especificación de requerimientos', true, 5, 'usuario', 1),
(1, '2', 'Análisis', 'Análisis técnico y funcional del desarrollo', true, 3, 'proveedor', 2),
(1, '5', 'Desarrollo', 'Desarrollo e implementación del sistema', true, 15, 'proveedor', 5),
(1, '6', 'Despliegue (Pruebas)', 'Instalación del desarrollo en ambiente de pruebas', false, 2, 'equipo_interno', 6),
(1, '7', 'Plan de Pruebas', 'Elaboración del plan y escenarios de prueba', false, 3, 'usuario', 7),
(1, '8', 'Ejecución Pruebas', 'Ejecución y certificación de pruebas por el usuario', true, 7, 'usuario', 8),

-- FASE: En Espera (ID: 2)
(2, '3', 'Propuesta', 'Elaboración y presentación de propuesta comercial', true, 10, 'proveedor', 3),
(2, '4', 'Aprobación', 'Esperando aprobación del comité de compras', false, 5, 'equipo_interno', 4),
(2, '9', 'Aprobación (Pase)', 'Aprobación final para pasar a producción', true, 3, 'equipo_interno', 9),

-- FASE: Finales / Otros (ID: 3)
(3, '10', 'Desplegado', 'Desarrollo desplegado y funcionando en producción', true, 0, 'equipo_interno', 10),
(3, '0', 'Cancelado', 'Desarrollo cancelado por cualquier motivo', false, 0, 'equipo_interno', 0);

-- CONTROLES DE CALIDAD FD-PR-072
-- =============================================================================
INSERT INTO quality_control_catalog (control_code, control_name, description, stage_prefix, stage_description, deliverables, validation_criteria) VALUES

('C003-GT', 'Validación de Requerimientos Claros y Completos', 
 'Verificar que los requerimientos estén claramente definidos, sean completos y cumplan con los estándares de calidad establecidos.',
 '1-2', 'Etapas de Definición y Análisis',
 'Documento de requerimientos, Matriz de trazabilidad, Aprobación del área solicitante',
 'Requerimientos claros, completos, aprobados por el área solicitante, matriz de trazabilidad actualizada'),

('C021-GT', 'Validación de Pruebas de Usuario vs. Requerimientos',
 'Verificar que las pruebas de usuario estén alineadas con los requerimientos definidos y que cubran todos los casos de uso.',
 '5-7', 'Etapas de Desarrollo y Pruebas',
 'Plan de pruebas, Casos de prueba, Evidencia de ejecución, Reporte de resultados',
 'Pruebas ejecutadas exitosamente, casos de prueba cubren todos los requerimientos, evidencia de aprobación del usuario'),

('C004-GT', 'Garantía de Entregas sin Impacto Negativo',
 'Asegurar que las entregas no generen impactos negativos en el sistema o procesos existentes.',
 '8-10', 'Etapas de Despliegue y Producción',
 'Plan de despliegue, Pruebas de regresión, Certificación de ambiente, Rollback plan',
 'Despliegue exitoso, pruebas de regresión aprobadas, certificación de ambiente, plan de rollback validado'),

('C027-GT', 'Validación Trimestral de Soportes en Producción',
 'Verificar trimestralmente que los soportes en producción estén funcionando correctamente y cumplan con los SLAs.',
 '8-10', 'Etapas de Producción y Soporte',
 'Reporte trimestral de soporte, Evidencia de cumplimiento de SLAs, Métricas de disponibilidad',
 'SLA cumplido, métricas de disponibilidad dentro de rangos, reporte trimestral aprobado');

-- =============================================================================
-- CREAR ÍNDICES PARA PERFORMANCE
-- =============================================================================

-- Índices para tablas principales
CREATE INDEX idx_developments_module ON developments(module);
CREATE INDEX idx_developments_type ON developments(type);
CREATE INDEX idx_developments_current_phase ON developments(current_phase_id);
CREATE INDEX idx_developments_current_stage ON developments(current_stage_id);

-- Índices para fases y etapas
CREATE INDEX idx_development_phases_name ON development_phases(phase_name);
CREATE INDEX idx_development_phases_sort ON development_phases(sort_order);
CREATE INDEX idx_development_stages_phase ON development_stages(phase_id);
CREATE INDEX idx_development_stages_code ON development_stages(stage_code);
CREATE INDEX idx_development_stages_sort ON development_stages(sort_order);
CREATE INDEX idx_development_stages_responsible ON development_stages(responsible_party);

-- Índices para tablas relacionadas
CREATE INDEX idx_development_dates_dev_type ON development_dates(development_id, date_type);
CREATE INDEX idx_development_proposals_dev ON development_proposals(development_id);
CREATE INDEX idx_development_installers_dev ON development_installers(development_id);
CREATE INDEX idx_development_providers_dev ON development_providers(development_id);
CREATE INDEX idx_development_responsibles_dev ON development_responsibles(development_id);
CREATE INDEX idx_development_status_history_dev ON development_status_history(development_id);
CREATE INDEX idx_development_observations_dev ON development_observations(development_id);
CREATE INDEX idx_development_observations_current ON development_observations(development_id, is_current);

-- Índices para controles de calidad
CREATE INDEX idx_quality_control_catalog_code ON quality_control_catalog(control_code);
CREATE INDEX idx_quality_control_catalog_stage ON quality_control_catalog(stage_prefix);
CREATE INDEX idx_development_quality_controls_dev ON development_quality_controls(development_id);
CREATE INDEX idx_development_quality_controls_catalog ON development_quality_controls(control_catalog_id);
CREATE INDEX idx_development_quality_controls_status ON development_quality_controls(status, validation_status);

-- Índices para KPIs y métricas
CREATE INDEX idx_development_kpi_metrics_dev ON development_kpi_metrics(development_id);
CREATE INDEX idx_development_kpi_metrics_type ON development_kpi_metrics(metric_type);
CREATE INDEX idx_development_upcoming_activities_dev ON development_upcoming_activities(development_id);
CREATE INDEX idx_development_upcoming_activities_due ON development_upcoming_activities(due_date);
CREATE INDEX idx_development_upcoming_activities_status ON development_upcoming_activities(status);

-- Índices para tablas de indicadores de calidad
CREATE INDEX idx_development_functionalities_dev ON development_functionalities(development_id);
CREATE INDEX idx_development_functionalities_status ON development_functionalities(status, delivery_date);
CREATE INDEX idx_development_quality_metrics_dev ON development_quality_metrics(development_id);
CREATE INDEX idx_development_quality_metrics_provider ON development_quality_metrics(provider, metric_type);
CREATE INDEX idx_development_quality_metrics_current ON development_quality_metrics(is_current, calculated_at);
CREATE INDEX idx_development_test_results_dev ON development_test_results(development_id);
CREATE INDEX idx_development_test_results_functionality ON development_test_results(functionality_id);
CREATE INDEX idx_development_test_results_phase ON development_test_results(test_phase, test_date);
CREATE INDEX idx_development_delivery_history_dev ON development_delivery_history(development_id);
CREATE INDEX idx_development_delivery_history_status ON development_delivery_history(delivery_status, delivery_date);

-- Índices para campos de indicadores en tablas existentes
CREATE INDEX idx_development_dates_delivery_status ON development_dates(date_type, delivery_status);
CREATE INDEX idx_development_dates_approval_status ON development_dates(date_type, approval_status);
CREATE INDEX idx_incidents_production_derived ON incidents(is_production_derived, incident_type);
CREATE INDEX idx_incidents_response_time ON incidents(response_time_hours, resolution_time_hours);
CREATE INDEX idx_incidents_rework ON incidents(is_rework, status);

-- Índices para bitácora
CREATE INDEX idx_activity_logs_dev_date ON activity_logs(development_id, date);
CREATE INDEX idx_incidents_dev_status ON incidents(development_id, status);

-- =============================================================================
-- MENSAJE DE CONFIRMACIÓN
-- =============================================================================

-- Mostrar resumen de tablas creadas
SELECT 'MIGRACIÓN COMPLETADA EXITOSAMENTE' as status;

SELECT 
    'Fases creadas: ' || COUNT(*) as fases_count
FROM development_phases;

SELECT 
    'Etapas creadas: ' || COUNT(*) as etapas_count
FROM development_stages;

SELECT 
    'Controles de calidad creados: ' || COUNT(*) as controles_count
FROM quality_control_catalog;

-- =============================================================================
-- FIN DEL SCRIPT DE MIGRACIÓN
-- =============================================================================
