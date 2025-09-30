# 🏗️ Arquitectura de Base de Datos - Sistema de Gestión de Proyectos TI

## 📋 Análisis de la Tabla Actual

### Problemas Identificados:
1. **Tabla monolítica** con múltiples responsabilidades
2. **Datos históricos** mezclados con datos de catálogo
3. **Relaciones 1:N** no normalizadas (desarrollo → múltiples propuestas, instaladores)
4. **Campos de bitácora** mezclados con datos maestros
5. **Inconsistencias** en el llenado de campos críticos
6. **Falta sistema de alertas** para próximas actividades
7. **Controles de calidad** no relacionados con etapas específicas

### Datos por Tipo:
- **📊 Datos Maestros**: Información base del desarrollo
- **📈 Datos Históricos**: Cambios de estado, fechas, progreso
- **📝 Datos de Bitácora**: Observaciones, seguimiento diario
- **🔗 Datos de Relación**: Propuestas, instaladores, responsables
- **🎯 Datos de KPIs**: Métricas e indicadores de rendimiento
- **✅ Datos de Control**: Controles de calidad por etapa
- **⏰ Datos de Alertas**: Próximas actividades y fechas límite

---

## 🎯 Propuesta de Normalización

### 1. **TABLA: `development_phases`**
**Fases Generales del Desarrollo (Agrupaciones Superiores)**

```sql
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
```

### 2. **TABLA: `development_stages`**
**Etapas Específicas del Ciclo de Desarrollo**

```sql
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
```

### 3. **TABLA PRINCIPAL: `developments`**
**Datos Maestros del Desarrollo**

```sql
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
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. **TABLA: `development_dates`**
**Fechas y Cronograma (Datos Históricos + Indicadores)**

```sql
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
```

### 5. **TABLA: `development_proposals`**
**Propuestas Comerciales (Relación 1:N)**

```sql
CREATE TABLE development_proposals (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    proposal_number VARCHAR(100) NOT NULL,         -- Número de propuesta
    cost DECIMAL(15,2),                            -- Costo
    status VARCHAR(50),                            -- Estado de la propuesta
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 6. **TABLA: `development_installers`**
**Instaladores y Versiones (Relación 1:N)**

```sql
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
```

### 7. **TABLA: `development_providers`**
**Proveedores y Radicados (Relación 1:N)**

```sql
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
```

### 8. **TABLA: `development_responsibles`**
**Responsables y Asignaciones (Relación 1:N)**

```sql
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
```

### 9. **TABLA: `development_status_history`**
**Historial de Estados y Progreso (Datos Históricos)**

```sql
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
```

### 10. **TABLA: `development_observations`**
**Bitácora y Observaciones (Datos de Bitácora)**

```sql
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
```

### 11. **TABLA: `quality_control_catalog`**
**Catálogo de Controles de Calidad (FD-PR-072)**

```sql
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
```

### 12. **TABLA: `development_quality_controls`**
**Controles de Calidad por Desarrollo (Validación y Entregables)**

```sql
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
```

### 13. **TABLA: `development_kpi_metrics`**
**Métricas e Indicadores de Rendimiento**

```sql
CREATE TABLE development_kpi_metrics (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    metric_type VARCHAR(100) NOT NULL,             -- 'cumplimiento_fechas', 'calidad_primera_entrega', 'defectos_entrega'
    provider VARCHAR(100),                         -- Proveedor para agrupación
    period_start DATE,                             -- Inicio del período
    period_end DATE,                               -- Fin del período
    value DECIMAL(10,2),                           -- Valor de la métrica
    target_value DECIMAL(10,2),                    -- Valor objetivo
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calculated_by VARCHAR(255),                    -- Quien calculó la métrica
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 14. **TABLA: `development_upcoming_activities`**
**Sistema de Alertas y Próximas Actividades**

```sql
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
```

### 15. **TABLA: `development_activity_logs`** (YA EXISTE - VALIDAR)
**Bitácora de Actividades Diarias**

```sql
-- TABLA YA IMPLEMENTADA - Validar estructura
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
```

### 16. **TABLA: `development_incidents`** (YA EXISTE - VALIDAR)
**Incidencias Post-Producción**

```sql
-- TABLA YA IMPLEMENTADA - AMPLIADA PARA INDICADORES
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
```

### 17. **TABLA: `development_functionalities`**
**Funcionalidades Entregadas por Desarrollo**

```sql
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
```

### 18. **TABLA: `development_quality_metrics`**
**Métricas de Calidad Calculadas**

```sql
CREATE TABLE development_quality_metrics (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    provider VARCHAR(100),                            -- Proveedor para agrupación
    metric_type VARCHAR(100) NOT NULL,               -- 'first_time_quality', 'defects_per_delivery', 'compliance_score'
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
```

### 19. **TABLA: `development_test_results`**
**Resultados de Pruebas y Defectos**

```sql
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
```

### 20. **TABLA: `development_delivery_history`**
**Historial de Entregas y Devoluciones**

```sql
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
```

---

## 🔗 Relaciones y Cardinalidades

### **Relaciones para Fases y Etapas:**
```
development_phases (1) ──── (N) development_stages
development_phases (1) ──── (N) developments (current_phase_id)
development_stages (1) ──── (N) developments (current_stage_id)
```

### **Relaciones 1:N (Un desarrollo tiene muchos...):**
```
developments (1) ──── (N) development_dates
developments (1) ──── (N) development_proposals  
developments (1) ──── (N) development_installers
developments (1) ──── (N) development_providers
developments (1) ──── (N) development_responsibles
developments (1) ──── (N) development_status_history
developments (1) ──── (N) development_observations
developments (1) ──── (N) development_quality_controls
developments (1) ──── (N) development_kpi_metrics
developments (1) ──── (N) development_upcoming_activities
developments (1) ──── (N) development_functionalities
developments (1) ──── (N) development_quality_metrics
developments (1) ──── (N) development_test_results
developments (1) ──── (N) development_delivery_history
developments (1) ──── (N) activity_logs (YA EXISTE)
developments (1) ──── (N) incidents (YA EXISTE)
```

### **Relaciones para Indicadores de Calidad:**
```
development_functionalities (1) ──── (N) development_test_results
development_providers (1) ──── (N) development_quality_metrics (por proveedor)
development_dates (1) ──── (N) development_delivery_history (por entrega)
```

### **Relaciones de Controles de Calidad:**
```
quality_control_catalog (1) ──── (N) development_quality_controls
development_quality_controls.control_catalog_id → quality_control_catalog.id
development_quality_controls.development_id → developments.id
```

### **Campos Calculados (Vistas):**
```sql
-- Vista para obtener el estado actual del desarrollo
CREATE VIEW current_development_status AS
SELECT 
    d.id,
    d.name,
    d.description,
    d.module,
    d.type,
    d.environment,
    d.remedy_link,
    dp.phase_name as current_phase,
    dp.phase_color as phase_color,
    ds.stage_code,
    ds.stage_name as current_stage,
    ds.stage_description,
    ds.responsible_party,
    ds.is_milestone,
    d.stage_progress_percentage,
    d.created_at,
    d.updated_at
FROM developments d
LEFT JOIN development_phases dp ON d.current_phase_id = dp.id
LEFT JOIN development_stages ds ON d.current_stage_id = ds.id;

-- Vista para el flujo completo del ciclo de desarrollo
CREATE VIEW development_cycle_flow AS
SELECT 
    ds.stage_code,
    ds.stage_name,
    ds.stage_description,
    dp.phase_name,
    dp.phase_color,
    ds.is_milestone,
    ds.estimated_days,
    ds.responsible_party,
    ds.sort_order,
    CASE 
        WHEN ds.responsible_party = 'proveedor' THEN 'Proveedor'
        WHEN ds.responsible_party = 'usuario' THEN 'Usuario'
        WHEN ds.responsible_party = 'equipo_interno' THEN 'Equipo Interno'
        ELSE 'No Definido'
    END as responsible_party_name
FROM development_stages ds
JOIN development_phases dp ON ds.phase_id = dp.id
WHERE ds.is_active = TRUE
ORDER BY ds.sort_order;

-- Vista para obtener la observación más reciente
CREATE VIEW latest_development_observation AS
SELECT 
    d.*,
    do.content as latest_observation,
    do.author as observation_author,
    do.observation_date
FROM developments d
LEFT JOIN development_observations do ON d.id = do.development_id
WHERE do.is_current = TRUE;

-- Vista para alertas de próximas actividades
CREATE VIEW upcoming_activities_alerts AS
SELECT 
    d.id as development_id,
    d.name as development_name,
    dua.*,
    CASE 
        WHEN dua.due_date < CURRENT_DATE THEN 'Vencido'
        WHEN dua.due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'Urgente'
        WHEN dua.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'Próximo'
        ELSE 'Normal'
    END as alert_level
FROM developments d
JOIN development_upcoming_activities dua ON d.id = dua.development_id
WHERE dua.status = 'Pendiente' 
  AND dua.due_date <= CURRENT_DATE + INTERVAL '30 days';

-- Vista para controles de calidad por etapa actual
CREATE VIEW current_quality_controls AS
SELECT 
    d.id as development_id,
    d.name as development_name,
    dsh.progress_stage as current_stage,
    qcc.control_code,
    qcc.control_name,
    qcc.description,
    qcc.deliverables,
    qcc.validation_criteria,
    dqc.status,
    dqc.validation_status,
    dqc.completed_by,
    dqc.completed_at,
    dqc.validated_by,
    dqc.validated_at,
    dqc.deliverables_provided,
    dqc.validation_notes,
    dqc.evidence_files
FROM developments d
JOIN development_status_history dsh ON d.id = dsh.development_id
JOIN development_quality_controls dqc ON d.id = dqc.development_id
JOIN quality_control_catalog qcc ON dqc.control_catalog_id = qcc.id
WHERE dsh.is_current = TRUE
  AND qcc.stage_prefix LIKE '%' || SPLIT_PART(dsh.progress_stage, '.', 1) || '%'
  AND qcc.is_active = TRUE;

-- Vista para controles aplicables por etapa
CREATE VIEW applicable_quality_controls AS
SELECT 
    qcc.*,
    CASE 
        WHEN dqc.id IS NULL THEN 'No Aplica'
        ELSE dqc.status
    END as current_status
FROM quality_control_catalog qcc
LEFT JOIN development_quality_controls dqc ON qcc.id = dqc.control_catalog_id
WHERE qcc.is_active = TRUE;

-- =============================================================================
-- VISTAS PARA CÁLCULO DE INDICADORES DE CALIDAD (KPIs)
-- =============================================================================

-- Vista para Cumplimiento Global de Fechas
CREATE VIEW global_compliance_view AS
SELECT 
    dp.provider_name,
    COUNT(*) as total_deliveries,
    SUM(CASE WHEN dd.delivery_status = 'on_time' THEN 1 ELSE 0 END) as on_time_deliveries,
    SUM(CASE WHEN dd.delivery_status = 'delayed' THEN 1 ELSE 0 END) as delayed_deliveries,
    ROUND(
        (SUM(CASE WHEN dd.delivery_status = 'on_time' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
    ) as compliance_percentage,
    AVG(dd.delivery_compliance_score) as avg_compliance_score,
    MAX(dd.actual_date) as last_delivery_date
FROM development_dates dd
JOIN development_providers dp ON dd.development_id = dp.development_id
WHERE dd.date_type = 'entrega' 
  AND dd.actual_date IS NOT NULL
GROUP BY dp.provider_name;

-- Vista para Cumplimiento de Fechas por Desarrollo
CREATE VIEW development_compliance_days_view AS
SELECT 
    d.id as development_id,
    d.name as development_name,
    dp.provider_name,
    dd.planned_date,
    dd.actual_date,
    dd.delivery_status,
    CASE 
        WHEN dd.actual_date IS NOT NULL AND dd.planned_date IS NOT NULL THEN
            EXTRACT(DAYS FROM (dd.actual_date - dd.planned_date))
        ELSE NULL
    END as days_difference,
    dd.days_estimated,
    dd.days_actual,
    CASE 
        WHEN dd.days_actual IS NOT NULL AND dd.days_estimated IS NOT NULL THEN
            (dd.days_actual - dd.days_estimated)
        ELSE NULL
    END as estimated_vs_actual_days
FROM developments d
JOIN development_dates dd ON d.id = dd.development_id
JOIN development_providers dp ON d.id = dp.development_id
WHERE dd.date_type = 'entrega';

-- Vista para Calidad en Primera Entrega
CREATE VIEW first_time_quality_view AS
SELECT 
    dp.provider_name,
    COUNT(*) as total_deliveries,
    SUM(CASE WHEN dd.approval_status = 'approved_first_time' THEN 1 ELSE 0 END) as first_time_approved,
    SUM(CASE WHEN dd.approval_status = 'approved_with_returns' THEN 1 ELSE 0 END) as approved_with_returns,
    SUM(CASE WHEN dd.approval_status = 'rejected' THEN 1 ELSE 0 END) as rejected_deliveries,
    ROUND(
        (SUM(CASE WHEN dd.approval_status = 'approved_first_time' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
    ) as quality_percentage,
    AVG(dd.delivery_compliance_score) as avg_quality_score
FROM development_dates dd
JOIN development_providers dp ON dd.development_id = dp.development_id
WHERE dd.date_type = 'entrega' 
  AND dd.approval_status IS NOT NULL
GROUP BY dp.provider_name;

-- Vista para Tiempo de Respuesta a Fallas
CREATE VIEW failure_response_time_view AS
SELECT 
    dp.provider_name,
    COUNT(*) as total_incidents,
    AVG(i.response_time_hours) as avg_response_time_hours,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY i.response_time_hours) as median_response_time_hours,
    AVG(i.resolution_time_hours) as avg_resolution_time_hours,
    SUM(CASE WHEN i.response_time_hours <= 4 THEN 1 ELSE 0 END) as incidents_within_4h,
    ROUND(
        (SUM(CASE WHEN i.response_time_hours <= 4 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
    ) as response_sla_compliance
FROM incidents i
JOIN development_providers dp ON i.development_id = dp.development_id
WHERE i.response_time_hours IS NOT NULL
  AND i.status = 'Cerrada'
GROUP BY dp.provider_name;

-- Vista para Defectos por Entrega
CREATE VIEW defects_per_delivery_view AS
SELECT 
    dp.provider_name,
    COUNT(DISTINCT dd.development_id) as total_deliveries,
    SUM(df.defects_count) as total_defects,
    SUM(dd.functionality_count) as total_functionalities,
    ROUND(
        CASE 
            WHEN SUM(dd.functionality_count) > 0 THEN 
                (SUM(df.defects_count) * 1.0 / SUM(dd.functionality_count))
            ELSE 0
        END, 2
    ) as defects_per_functionality,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT dd.development_id) > 0 THEN 
                (SUM(df.defects_count) * 1.0 / COUNT(DISTINCT dd.development_id))
            ELSE 0
        END, 2
    ) as defects_per_delivery,
    AVG(df.test_coverage_percentage) as avg_test_coverage
FROM development_dates dd
JOIN development_providers dp ON dd.development_id = dp.development_id
LEFT JOIN development_functionalities df ON dd.development_id = df.development_id
WHERE dd.date_type = 'entrega'
GROUP BY dp.provider_name;

-- Vista para Retrabajo Post-Producción
CREATE VIEW post_production_rework_view AS
SELECT 
    dp.provider_name,
    COUNT(DISTINCT i.development_id) as total_production_deliveries,
    SUM(CASE WHEN i.is_production_derived = TRUE THEN 1 ELSE 0 END) as production_incidents,
    SUM(CASE WHEN i.is_rework = TRUE THEN 1 ELSE 0 END) as rework_incidents,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT i.development_id) > 0 THEN 
                (SUM(CASE WHEN i.is_production_derived = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT i.development_id))
            ELSE 0
        END, 2
    ) as production_incident_rate,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT i.development_id) > 0 THEN 
                (SUM(CASE WHEN i.is_rework = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT i.development_id))
            ELSE 0
        END, 2
    ) as rework_rate,
    AVG(CASE WHEN i.is_production_derived = TRUE THEN i.resolution_time_hours END) as avg_production_resolution_time
FROM incidents i
JOIN development_providers dp ON i.development_id = dp.development_id
JOIN development_dates dd ON i.development_id = dd.development_id
WHERE dd.date_type = 'produccion' 
  AND dd.actual_date IS NOT NULL
GROUP BY dp.provider_name;

-- Vista Consolidada de Indicadores por Proveedor
CREATE VIEW provider_kpi_summary AS
SELECT 
    COALESCE(gc.provider_name, ftq.provider_name, frt.provider_name, dpd.provider_name, ppr.provider_name) as provider_name,
    
    -- Cumplimiento Global
    COALESCE(gc.compliance_percentage, 0) as global_compliance,
    COALESCE(gc.total_deliveries, 0) as total_deliveries,
    COALESCE(gc.on_time_deliveries, 0) as on_time_deliveries,
    
    -- Calidad Primera Entrega
    COALESCE(ftq.quality_percentage, 0) as first_time_quality,
    COALESCE(ftq.total_deliveries, 0) as quality_tracked_deliveries,
    
    -- Tiempo de Respuesta
    COALESCE(frt.median_response_time_hours, 0) as failure_response_time_hours,
    COALESCE(frt.response_sla_compliance, 0) as response_sla_compliance,
    
    -- Defectos por Entrega
    COALESCE(dpd.defects_per_delivery, 0) as defects_per_delivery,
    COALESCE(dpd.avg_test_coverage, 0) as avg_test_coverage,
    
    -- Retrabajo Post-Producción
    COALESCE(ppr.production_incident_rate, 0) as post_production_rework_rate,
    COALESCE(ppr.rework_rate, 0) as rework_rate,
    
    -- Métricas Calculadas
    CURRENT_TIMESTAMP as calculated_at

FROM global_compliance_view gc
FULL OUTER JOIN first_time_quality_view ftq ON gc.provider_name = ftq.provider_name
FULL OUTER JOIN failure_response_time_view frt ON COALESCE(gc.provider_name, ftq.provider_name) = frt.provider_name
FULL OUTER JOIN defects_per_delivery_view dpd ON COALESCE(gc.provider_name, ftq.provider_name, frt.provider_name) = dpd.provider_name
FULL OUTER JOIN post_production_rework_view ppr ON COALESCE(gc.provider_name, ftq.provider_name, frt.provider_name, dpd.provider_name) = ppr.provider_name;

-- Vista para Historial de Métricas por Período
CREATE VIEW kpi_historical_view AS
SELECT 
    dqm.provider,
    dqm.metric_type,
    dqm.metric_name,
    dqm.value,
    dqm.target_value,
    dqm.unit,
    dqm.period_start,
    dqm.period_end,
    dqm.calculated_at,
    ROUND(
        CASE 
            WHEN dqm.target_value > 0 THEN 
                ((dqm.value - dqm.target_value) / dqm.target_value * 100)
            ELSE 0
        END, 2
    ) as variance_percentage,
    CASE 
        WHEN dqm.value >= dqm.target_value THEN 'Target Met'
        ELSE 'Below Target'
    END as target_status
FROM development_quality_metrics dqm
WHERE dqm.is_current = TRUE
ORDER BY dqm.provider, dqm.metric_type, dqm.period_start DESC;
```

---

## 📋 Datos de Ejemplo para Fases y Etapas

### **Fases Generales del Desarrollo:**

```sql
-- Insertar fases generales del desarrollo
INSERT INTO development_phases (phase_name, phase_description, phase_color, sort_order) VALUES
('En Ejecución', 'Desarrollo en proceso activo de ejecución', 'info', 1),
('En Espera', 'Desarrollo en estado de espera por aprobaciones o decisiones', 'warning', 2),
('Finales / Otros', 'Desarrollo finalizado, desplegado o cancelado', 'success', 3);
```

### **Etapas Específicas del Ciclo:**

```sql
-- Insertar etapas específicas del ciclo de desarrollo
INSERT INTO development_stages (phase_id, stage_code, stage_name, stage_description, is_milestone, estimated_days, responsible_party, sort_order) VALUES

-- FASE: En Ejecución (ID: 1)
(1, '1', 'Definición', 'Definición y especificación de requerimientos', true, 5, 'usuario', 1),
(1, '2', 'Análisis', 'Análisis técnico y funcional del desarrollo', true, 3, 'proveedor', 2),
(1, '6', 'Despliegue (Pruebas)', 'Instalación del desarrollo en ambiente de pruebas', false, 2, 'equipo_interno', 6),
(1, '7', 'Plan de Pruebas', 'Elaboración del plan y escenarios de prueba', false, 3, 'usuario', 7),
(1, '8', 'Ejecución Pruebas', 'Ejecución y certificación de pruebas por el usuario', true, 7, 'usuario', 8),

-- FASE: En Espera (ID: 2)
(2, '3', 'Propuesta', 'Elaboración y presentación de propuesta comercial', true, 10, 'proveedor', 3),
(2, '4', 'Aprobación', 'Esperando aprobación del comité de compras', false, 5, 'equipo_interno', 4),
(1, '5', 'Desarrollo', 'Desarrollo e implementación del sistema', true, 15, 'proveedor', 5),
(2, '9', 'Aprobación (Pase)', 'Aprobación final para pasar a producción', true, 3, 'equipo_interno', 9),

-- FASE: Finales / Otros (ID: 3)
(3, '10', 'Desplegado', 'Desarrollo desplegado y funcionando en producción', true, 0, 'equipo_interno', 10),
(3, '0', 'Cancelado', 'Desarrollo cancelado por cualquier motivo', false, 0, 'equipo_interno', 0);
```

## 📋 Datos de Ejemplo para Catálogo de Controles

### **Controles FD-PR-072:**

```sql
-- Insertar controles de calidad del procedimiento FD-PR-072
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
```

---

## 📊 Índices Recomendados

```sql
-- Índices para performance
CREATE INDEX idx_developments_module ON developments(module);
CREATE INDEX idx_developments_type ON developments(type);
CREATE INDEX idx_development_dates_dev_type ON development_dates(development_id, date_type);
CREATE INDEX idx_development_proposals_dev ON development_proposals(development_id);
CREATE INDEX idx_development_installers_dev ON development_installers(development_id);
CREATE INDEX idx_development_providers_dev ON development_providers(development_id);
CREATE INDEX idx_development_responsibles_dev ON development_responsibles(development_id);
CREATE INDEX idx_development_status_history_dev ON development_status_history(development_id);
CREATE INDEX idx_development_observations_dev ON development_observations(development_id);
CREATE INDEX idx_development_observations_current ON development_observations(development_id, is_current);

-- Índices para nuevas tablas
CREATE INDEX idx_quality_control_catalog_code ON quality_control_catalog(control_code);
CREATE INDEX idx_quality_control_catalog_stage ON quality_control_catalog(stage_prefix);
CREATE INDEX idx_development_quality_controls_dev ON development_quality_controls(development_id);
CREATE INDEX idx_development_quality_controls_catalog ON development_quality_controls(control_catalog_id);
CREATE INDEX idx_development_quality_controls_status ON development_quality_controls(status, validation_status);
CREATE INDEX idx_development_kpi_metrics_dev ON development_kpi_metrics(development_id);
CREATE INDEX idx_development_kpi_metrics_type ON development_kpi_metrics(metric_type);
CREATE INDEX idx_development_upcoming_activities_dev ON development_upcoming_activities(development_id);
CREATE INDEX idx_development_upcoming_activities_due ON development_upcoming_activities(due_date);
CREATE INDEX idx_development_upcoming_activities_status ON development_upcoming_activities(status);
CREATE INDEX idx_development_upcoming_activities_alerts ON development_upcoming_activities(due_date, status) 
WHERE status = 'Pendiente';

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

-- Índices para tablas existentes (validar si ya existen)
CREATE INDEX idx_activity_logs_dev_date ON activity_logs(development_id, date);
CREATE INDEX idx_incidents_dev_status ON incidents(development_id, status);

-- Índices para fases y etapas del desarrollo
CREATE INDEX idx_developments_current_phase ON developments(current_phase_id);
CREATE INDEX idx_developments_current_stage ON developments(current_stage_id);
CREATE INDEX idx_development_phases_name ON development_phases(phase_name);
CREATE INDEX idx_development_phases_sort ON development_phases(sort_order);
CREATE INDEX idx_development_stages_phase ON development_stages(phase_id);
CREATE INDEX idx_development_stages_code ON development_stages(stage_code);
CREATE INDEX idx_development_stages_sort ON development_stages(sort_order);
CREATE INDEX idx_development_stages_responsible ON development_stages(responsible_party);
```

---

## 🔄 Flujo del Ciclo de Desarrollo

### **📊 Mapeo de Estados de Progreso:**

El sistema ahora soporta el ciclo completo de desarrollo con 11 etapas organizadas en 3 fases principales:

#### **🔵 FASE: En Ejecución**
- **1. Definición** - Definición y especificación de requerimientos
- **2. Análisis** - Análisis técnico y funcional del desarrollo
- **5. Desarrollo** - Desarrollo e implementación del sistema
- **6. Despliegue (Pruebas)** - Instalación del desarrollo en ambiente de pruebas
- **7. Plan de Pruebas** - Elaboración del plan y escenarios de prueba
- **8. Ejecución Pruebas** - Ejecución y certificación de pruebas por el usuario

#### **🟡 FASE: En Espera**
- **3. Propuesta** - Elaboración y presentación de propuesta comercial
- **4. Aprobación** - Esperando aprobación del comité de compras
- **9. Aprobación (Pase)** - Aprobación final para pasar a producción

#### **🟢 FASE: Finales / Otros**
- **10. Desplegado** - Desarrollo desplegado y funcionando en producción
- **0. Cancelado** - Desarrollo cancelado por cualquier motivo

### **🎯 Disparadores Automáticos para Indicadores:**

```sql
-- Ejemplo de lógica para detectar entregas automáticamente
-- Cuando un desarrollo pasa a etapa 5 (Entrega de Desarrollo)
UPDATE development_delivery_history 
SET delivery_type = 'initial', 
    delivery_date = CURRENT_DATE,
    delivery_status = 'delivered'
WHERE development_id = ? 
  AND NOT EXISTS (SELECT 1 FROM development_delivery_history WHERE development_id = ?);

-- Si ya existe una entrega anterior, es una devolución
UPDATE development_delivery_history 
SET delivery_type = 'revision',
    return_count = return_count + 1,
    approval_status = 'approved_with_returns'
WHERE development_id = ? 
  AND delivery_type = 'initial';
```

### **📈 Integración con Indicadores:**

- **Etapa 5 (Desarrollo)** → Dispara cálculo de "Cumplimiento de fechas"
- **Etapa 6 (Despliegue Pruebas)** → Dispara cálculo de "Calidad en primera entrega"
- **Etapa 8 (Ejecución Pruebas)** → Dispara cálculo de "Defectos por entrega"
- **Etapa 10 (Desplegado)** → Dispara cálculo de "Retrabajo post-producción"

---

## 🎯 Beneficios de la Normalización

### **1. Flexibilidad:**
- ✅ Un desarrollo puede tener múltiples propuestas
- ✅ Un desarrollo puede tener múltiples instaladores
- ✅ Un desarrollo puede tener múltiples proveedores
- ✅ Historial completo de cambios de estado
- ✅ **Sistema de alertas** para próximas actividades
- ✅ **Controles de calidad** dinámicos por etapa

### **2. Integridad:**
- ✅ Datos maestros separados de datos históricos
- ✅ Relaciones claras y consistentes
- ✅ Eliminación de redundancias
- ✅ **Marcas temporales** para auditoría completa
- ✅ **Validación** de controles por etapa

### **3. Escalabilidad:**
- ✅ Fácil agregar nuevos tipos de datos
- ✅ Consultas optimizadas por tabla
- ✅ Mantenimiento simplificado
- ✅ **KPIs automáticos** y métricas
- ✅ **Sistema de alertas** escalable

### **4. Trazabilidad:**
- ✅ Historial completo de cambios
- ✅ Auditoría de modificaciones
- ✅ Seguimiento temporal
- ✅ **Trazabilidad de controles** de calidad
- ✅ **Auditoría de alertas** y actividades

### **5. Funcionalidades Nuevas:**
- ✅ **Sistema de alertas** automático
- ✅ **Controles de calidad** por etapa (FD-PR-072)
- ✅ **KPIs automáticos** de rendimiento
- ✅ **Marcas temporales** para auditoría
- ✅ **Próximas actividades** con fechas límite

---

## 🔄 Migración desde Tabla Actual

### **Fase 1: Validar Estructura Existente**
1. **Revisar tablas actuales**: `developments`, `activity_logs`, `incidents`
2. **Validar campos** que ya existen vs. los que faltan
3. **Identificar gaps** en la estructura actual
4. **Crear tablas nuevas** que faltan

### **Fase 2: Crear Estructura Completa**
1. Crear todas las tablas nuevas
2. Crear índices y constraints
3. Crear vistas para compatibilidad
4. **Implementar sistema de alertas**
5. **Configurar controles de calidad**

### **Fase 3: Migrar Datos**
1. Extraer datos de la tabla actual
2. Distribuir en las nuevas tablas
3. **Migrar datos históricos** a tablas especializadas
4. **Crear registros de controles** de calidad
5. Validar integridad de datos

### **Fase 4: Actualizar Aplicación**
1. Modificar modelos SQLAlchemy
2. Actualizar endpoints de API
3. **Implementar sistema de alertas** en backend
4. **Integrar controles de calidad** en frontend
5. Modificar frontend para nuevas estructuras

### **Fase 5: Limpieza y Optimización**
1. Eliminar tabla antigua
2. Optimizar consultas
3. **Configurar alertas automáticas**
4. **Implementar KPIs automáticos**
5. Documentar cambios

---

## 📝 Próximos Pasos

1. **Revisar** esta propuesta de normalización
2. **Validar** estructura actual vs. propuesta
3. **Ajustar** campos y relaciones según necesidades
4. **Validar** que cubra todos los casos de uso
5. **Crear** scripts de migración
6. **Implementar** cuando esté aprobado

---

## 🎯 Funcionalidades Clave Implementadas

### **Sistema de Alertas:**
- ✅ **Próximas actividades** con fechas límite
- ✅ **Alertas automáticas** (Vencido, Urgente, Próximo)
- ✅ **Responsables** por actividad
- ✅ **Prioridades** y estados

### **Controles de Calidad:**
- ✅ **Catálogo de controles** (quality_control_catalog)
- ✅ **Integración con FD-PR-072** (C003-GT, C021-GT, C004-GT, C027-GT)
- ✅ **Controles por etapa** automáticos según progreso
- ✅ **Sistema de validación** con entregables
- ✅ **Trazabilidad completa** de cumplimiento
- ✅ **Archivos de evidencia** y notas de validación

### **KPIs y Métricas:**
- ✅ **Métricas automáticas** de rendimiento
- ✅ **Agrupación por proveedor**
- ✅ **Períodos** y valores objetivo
- ✅ **Cálculo automático** de indicadores

### **Marcas Temporales:**
- ✅ **Auditoría completa** en todas las tablas
- ✅ **created_at** y **updated_at** en cada registro
- ✅ **Trazabilidad** de cambios
- ✅ **Historial** de modificaciones

---

## 📊 Cálculo de Indicadores con la Nueva Estructura

### **1. Cumplimiento de fechas Global**
**Fórmula:** `Entregas a tiempo ÷ entregas programadas × 100%`
**Implementación:**
```sql
-- Usar vista: global_compliance_view
SELECT provider_name, compliance_percentage 
FROM global_compliance_view;
```

### **2. Cumplimiento de fechas Desarrollo**
**Fórmula:** Diferencia en días entre fecha programada y real
**Implementación:**
```sql
-- Usar vista: development_compliance_days_view
SELECT provider_name, AVG(days_difference) as avg_days_difference
FROM development_compliance_days_view 
GROUP BY provider_name;
```

### **3. Calidad en primera entrega**
**Fórmula:** `Entregas aprobadas sin devoluciones ÷ entregas totales × 100%`
**Implementación:**
```sql
-- Usar vista: first_time_quality_view
SELECT provider_name, quality_percentage 
FROM first_time_quality_view;
```

### **4. Tiempo de respuesta a fallas**
**Fórmula:** Mediana de horas desde el reporte hasta la solución
**Implementación:**
```sql
-- Usar vista: failure_response_time_view
SELECT provider_name, median_response_time_hours 
FROM failure_response_time_view;
```

### **5. Defectos por entrega**
**Fórmula:** `Defectos en Pruebas ÷ funcionalidades entregadas`
**Implementación:**
```sql
-- Usar vista: defects_per_delivery_view
SELECT provider_name, defects_per_delivery 
FROM defects_per_delivery_view;
```

### **6. Retrabajo posproducción**
**Fórmula:** `Incidencias derivadas ÷ entregas en producción × 100%`
**Implementación:**
```sql
-- Usar vista: post_production_rework_view
SELECT provider_name, production_incident_rate 
FROM post_production_rework_view;
```

### **Vista Consolidada para Dashboard:**
```sql
-- Usar vista: provider_kpi_summary
SELECT 
    provider_name,
    global_compliance,
    first_time_quality,
    failure_response_time_hours,
    defects_per_delivery,
    post_production_rework_rate
FROM provider_kpi_summary;
```

---

## ❓ Preguntas para Refinamiento

1. ¿Faltan campos importantes en alguna tabla?
2. ¿Las relaciones están correctas?
3. ¿Necesitamos tablas adicionales?
4. ¿Los tipos de datos son apropiados?
5. ¿Las vistas calculadas son útiles?
6. ¿El sistema de alertas cubre todos los casos?
7. ¿Los controles de calidad están bien relacionados?
8. ¿Las métricas de KPIs son suficientes?
9. ¿El catálogo de controles cubre todos los casos del FD-PR-072?
10. ¿El sistema de validación con entregables es completo?

---

## 📊 Modelo Entidad-Relación (MER) Completo Actualizado

### 🏗️ Diagrama del Sistema de Gestión de Proyectos TI (Versión Normalizada)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE GESTIÓN DE PROYECTOS TI - NORMALIZADO                │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   AUTH_USERS     │    │   DEVELOPMENTS   │    │  ACTIVITY_LOGS   │
├──────────────────┤    ├──────────────────┤    ├──────────────────┤
│ id (PK)          │    │ id (PK)          │    │ id (PK)          │
│ email (UNIQUE)   │    │ name             │    │ development_id(FK)│
│ password_hash    │    │ description      │    │ date             │
│ name             │    │ module           │    │ description      │
│ role             │    │ type             │    │ category         │
│ is_active        │    │ environment      │    │ user_id (FK)     │
│ email_verified   │    │ remedy_link      │    │ created_at       │
│ avatar_url       │    │ created_at       │    │ updated_at       │
│ timezone         │    │ updated_at       │    └──────────────────┘
│ created_at       │    └──────────────────┘              │
│ updated_at       │              │                       │
│ last_login       │              │                       │
└──────────────────┘              │                       │
         │                        │                       │
         │                        │                       │
         │               ┌──────────────────┐              │
         │               │ DEVELOPMENT_DATES│              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ date_type        │              │
         │               │ planned_date     │              │
         │               │ actual_date      │              │
         │               │ days_estimated   │              │
         │               │ days_actual      │              │
         │               │ created_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │DEVELOPMENT_PROPOSALS│           │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ proposal_number  │              │
         │               │ cost             │              │
         │               │ status           │              │
         │               │ created_at       │              │
         │               │ updated_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │DEVELOPMENT_INSTALLERS│          │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ installer_number │              │
         │               │ version          │              │
         │               │ environment      │              │
         │               │ installation_date│              │
         │               │ status           │              │
         │               │ created_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │DEVELOPMENT_PROVIDERS│           │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ provider_name    │              │
         │               │ side_service_point│             │
         │               │ provider_system  │              │
         │               │ status           │              │
         │               │ created_at       │              │
         │               │ updated_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │DEVELOPMENT_RESPONSIBLES│        │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ user_name        │              │
         │               │ role_type        │              │
         │               │ area             │              │
         │               │ is_primary       │              │
         │               │ assigned_date    │              │
         │               │ created_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │DEVELOPMENT_STATUS_HISTORY│      │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ status           │              │
         │               │ progress_stage   │              │
         │               │ change_date      │              │
         │               │ changed_by       │              │
         │               │ previous_status  │              │
         │               │ created_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │DEVELOPMENT_OBSERVATIONS│        │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ observation_type │              │
         │               │ content          │              │
         │               │ author           │              │
         │               │ observation_date │              │
         │               │ is_current       │              │
         │               │ created_at       │              │
         │               │ updated_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │DEVELOPMENT_UPCOMING_ACTIVITIES│ │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ activity_type    │              │
         │               │ title            │              │
         │               │ description      │              │
         │               │ due_date         │              │
         │               │ responsible_party│              │
         │               │ responsible_person│             │
         │               │ status           │              │
         │               │ priority         │              │
         │               │ alert_sent       │              │
         │               │ completed_at     │              │
         │               │ created_by       │              │
         │               │ created_at       │              │
         │               │ updated_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │DEVELOPMENT_KPI_METRICS│         │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ metric_type      │              │
         │               │ provider         │              │
         │               │ period_start     │              │
         │               │ period_end       │              │
         │               │ value            │              │
         │               │ target_value     │              │
         │               │ calculated_at    │              │
         │               │ calculated_by(FK)│              │
         │               │ created_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │    INCIDENTS     │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ report_date      │              │
         │               │ resolution_date  │              │
         │               │ description      │              │
         │               │ severity         │              │
         │               │ impact           │              │
         │               │ status           │              │
         │               │ assigned_to (FK) │              │
         │               │ created_at       │              │
         │               │ updated_at       │              │
         │               └──────────────────┘              │
         │                                                 │
         │               ┌──────────────────┐              │
         │               │  CHAT_SESSIONS   │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ user_id (FK)     │──────────────┘
         │               │ title            │
         │               │ created_at       │
         │               │ updated_at       │
         │               └──────────────────┘
         │                        │
         │                        │
         │               ┌──────────────────┐
         │               │  CHAT_MESSAGES   │
         │               ├──────────────────┤
         │               │ id (PK)          │
         │               │ session_id (FK)  │
         │               │ content          │
         │               │ sender           │
         │               │ message_type     │
         │               │ metadata         │
         │               │ created_at       │
         │               └──────────────────┘
         │
         │               ┌──────────────────┐
         │               │   AUTH_TOKENS    │
         │               ├──────────────────┤
         │               │ id (PK)          │
         │               │ user_id (FK)     │──────────────┘
         │               │ token_hash       │
         │               │ token_type       │
         │               │ name             │
         │               │ expires_at       │
         │               │ last_used_at     │
         │               │ created_at       │
         │               └──────────────────┘
         │
         │               ┌──────────────────┐
         │               │ USER_SESSIONS    │
         │               ├──────────────────┤
         │               │ id (PK)          │
         │               │ user_id (FK)     │──────────────┘
         │               │ session_token    │
         │               │ ip_address       │
         │               │ user_agent       │
         │               │ expires_at       │
         │               │ created_at       │
         │               └──────────────────┘
         │
         │               ┌──────────────────┐
         │               │ SYSTEM_SETTINGS  │
         │               ├──────────────────┤
         │               │ id (PK)          │
         │               │ user_id (FK)     │──────────────┘
         │               │ category         │
         │               │ key              │
         │               │ value            │
         │               │ created_at       │
         │               │ updated_at       │
         │               └──────────────────┘

         ┌──────────────────┐
         │   PERMISSIONS    │
         ├──────────────────┤
         │ id (PK)          │
         │ name (UNIQUE)    │
         │ description      │
         │ resource         │
         │ action           │
         └──────────────────┘
                  │
                  │
         ┌──────────────────┐
         │ ROLE_PERMISSIONS │
         ├──────────────────┤
         │ role (PK)        │
         │ permission_id(PK)│
         └──────────────────┘

         ┌──────────────────┐
         │QUALITY_CONTROL_CATALOG│
         ├──────────────────┤
         │ id (PK)          │
         │ control_code     │
         │ control_name     │
         │ description      │
         │ stage_prefix     │
         │ stage_description│
         │ deliverables     │
         │ validation_criteria│
         │ is_active        │
         │ created_at       │
         │ updated_at       │
         └──────────────────┘
                  │
                  │
         ┌──────────────────┐
         │DEVELOPMENT_QUALITY_CONTROLS│
         ├──────────────────┤
         │ id (PK)          │
         │ development_id(FK)│
         │ control_catalog_id(FK)│
         │ control_code     │
         │ status           │
         │ validation_status│
         │ completed_by     │
         │ completed_at     │
         │ validated_by     │
         │ validated_at     │
         │ deliverables_provided│
         │ validation_notes │
         │ rejection_reason │
         │ evidence_files   │
         │ created_at       │
         │ updated_at       │
         └──────────────────┘
```

### 🔗 Relaciones Principales Actualizadas

#### **1. AUTH_USERS (1:N) con múltiples tablas:**
- `AUTH_USERS` → `AUTH_TOKENS` (Un usuario puede tener múltiples tokens)
- `AUTH_USERS` → `USER_SESSIONS` (Un usuario puede tener múltiples sesiones)
- `AUTH_USERS` → `CHAT_SESSIONS` (Un usuario puede tener múltiples chats)
- `AUTH_USERS` → `SYSTEM_SETTINGS` (Un usuario puede tener múltiples configuraciones)
- `AUTH_USERS` → `ACTIVITY_LOGS` (created_by)
- `AUTH_USERS` → `INCIDENTS` (assigned_to)
- `AUTH_USERS` → `DEVELOPMENT_KPI_METRICS` (calculated_by)

#### **2. DEVELOPMENTS (1:N) como entidad central:**
- `DEVELOPMENTS` → `ACTIVITY_LOGS` (Un desarrollo tiene múltiples actividades)
- `DEVELOPMENTS` → `INCIDENTS` (Un desarrollo puede tener múltiples incidencias)
- `DEVELOPMENTS` → `DEVELOPMENT_DATES` (Fechas y cronograma)
- `DEVELOPMENTS` → `DEVELOPMENT_PROPOSALS` (Múltiples propuestas)
- `DEVELOPMENTS` → `DEVELOPMENT_INSTALLERS` (Múltiples instaladores)
- `DEVELOPMENTS` → `DEVELOPMENT_PROVIDERS` (Múltiples proveedores)
- `DEVELOPMENTS` → `DEVELOPMENT_RESPONSIBLES` (Múltiples responsables)
- `DEVELOPMENTS` → `DEVELOPMENT_STATUS_HISTORY` (Historial de estados)
- `DEVELOPMENTS` → `DEVELOPMENT_OBSERVATIONS` (Observaciones y bitácora)
- `DEVELOPMENTS` → `DEVELOPMENT_UPCOMING_ACTIVITIES` (Próximas actividades)
- `DEVELOPMENTS` → `DEVELOPMENT_KPI_METRICS` (Métricas de rendimiento)
- `DEVELOPMENTS` → `DEVELOPMENT_QUALITY_CONTROLS` (Controles de calidad)

#### **3. Sistema de Controles de Calidad:**
- `QUALITY_CONTROL_CATALOG` → `DEVELOPMENT_QUALITY_CONTROLS` (Catálogo a implementación)

#### **4. Relaciones de Chat:**
- `CHAT_SESSIONS` → `CHAT_MESSAGES` (Una sesión tiene múltiples mensajes)

#### **5. Sistema de Permisos:**
- `PERMISSIONS` ↔ `ROLE_PERMISSIONS` ↔ `AUTH_USERS.role` (Many-to-Many a través de roles)

### 📋 Cardinalidades Detalladas Actualizadas

```
AUTH_USERS (1) ──── (N) AUTH_TOKENS
AUTH_USERS (1) ──── (N) USER_SESSIONS  
AUTH_USERS (1) ──── (N) CHAT_SESSIONS
AUTH_USERS (1) ──── (N) SYSTEM_SETTINGS
AUTH_USERS (1) ──── (N) ACTIVITY_LOGS (created_by)
AUTH_USERS (1) ──── (N) INCIDENTS (assigned_to)
AUTH_USERS (1) ──── (N) DEVELOPMENT_KPI_METRICS (calculated_by)

DEVELOPMENTS (1) ──── (N) ACTIVITY_LOGS
DEVELOPMENTS (1) ──── (N) INCIDENTS
DEVELOPMENTS (1) ──── (N) DEVELOPMENT_DATES
DEVELOPMENTS (1) ──── (N) DEVELOPMENT_PROPOSALS
DEVELOPMENTS (1) ──── (N) DEVELOPMENT_INSTALLERS
DEVELOPMENTS (1) ──── (N) DEVELOPMENT_PROVIDERS
DEVELOPMENTS (1) ──── (N) DEVELOPMENT_RESPONSIBLES
DEVELOPMENTS (1) ──── (N) DEVELOPMENT_STATUS_HISTORY
DEVELOPMENTS (1) ──── (N) DEVELOPMENT_OBSERVATIONS
DEVELOPMENTS (1) ──── (N) DEVELOPMENT_UPCOMING_ACTIVITIES
DEVELOPMENTS (1) ──── (N) DEVELOPMENT_KPI_METRICS
DEVELOPMENTS (1) ──── (N) DEVELOPMENT_QUALITY_CONTROLS

CHAT_SESSIONS (1) ──── (N) CHAT_MESSAGES

PERMISSIONS (N) ──── (N) ROLES (via ROLE_PERMISSIONS)

QUALITY_CONTROL_CATALOG (1) ──── (N) DEVELOPMENT_QUALITY_CONTROLS
```

### 🎯 Índices Recomendados para Performance

```sql
-- Índices para performance
CREATE INDEX idx_developments_module ON developments(module);
CREATE INDEX idx_developments_type ON developments(type);
CREATE INDEX idx_development_dates_dev_type ON development_dates(development_id, date_type);
CREATE INDEX idx_development_proposals_dev ON development_proposals(development_id);
CREATE INDEX idx_development_installers_dev ON development_installers(development_id);
CREATE INDEX idx_development_providers_dev ON development_providers(development_id);
CREATE INDEX idx_development_responsibles_dev ON development_responsibles(development_id);
CREATE INDEX idx_development_status_history_dev ON development_status_history(development_id);
CREATE INDEX idx_development_observations_dev ON development_observations(development_id);
CREATE INDEX idx_development_upcoming_activities_dev ON development_upcoming_activities(development_id);
CREATE INDEX idx_development_upcoming_activities_due ON development_upcoming_activities(due_date);
CREATE INDEX idx_development_kpi_metrics_dev ON development_kpi_metrics(development_id);
CREATE INDEX idx_development_quality_controls_dev ON development_quality_controls(development_id);
CREATE INDEX idx_quality_control_catalog_stage ON quality_control_catalog(stage_prefix);
CREATE INDEX idx_auth_tokens_user ON auth_tokens(user_id, token_type);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
```

---

## 🤖 **EXTENSIÓN MCP - Tablas para Inteligencia Artificial**

### **21. TABLA: `ai_context_cache`**
**Cache de Contexto para IA (Optimización de Performance)**

```sql
CREATE TABLE ai_context_cache (
    id SERIAL PRIMARY KEY,
    context_key VARCHAR(255) NOT NULL UNIQUE,        -- Hash del contexto
    development_id VARCHAR(50) REFERENCES developments(id),
    context_type VARCHAR(50) NOT NULL,               -- 'development', 'provider', 'kpi', 'quality'
    context_data JSONB NOT NULL,                     -- Contexto serializado
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,                   -- TTL del cache
    access_count INTEGER DEFAULT 0,                  -- Contador de accesos
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_ai_context_cache_key ON ai_context_cache(context_key);
CREATE INDEX idx_ai_context_cache_dev ON ai_context_cache(development_id);
CREATE INDEX idx_ai_context_cache_type ON ai_context_cache(context_type);
CREATE INDEX idx_ai_context_cache_expires ON ai_context_cache(expires_at);
```

### **22. TABLA: `ai_analysis_history`**
**Historial de Análisis de IA**

```sql
CREATE TABLE ai_analysis_history (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    analysis_type VARCHAR(100) NOT NULL,             -- 'risk_analysis', 'performance_review', 'prediction'
    query_text TEXT NOT NULL,                        -- Pregunta original del usuario
    context_used JSONB,                              -- Contexto que se envió a la IA
    ai_response TEXT NOT NULL,                       -- Respuesta de la IA
    ai_model VARCHAR(50) NOT NULL,                   -- 'claude-3-sonnet', 'gpt-4', etc.
    tokens_used INTEGER,                             -- Tokens consumidos
    response_time_ms INTEGER,                        -- Tiempo de respuesta en ms
    user_id VARCHAR(50),                             -- Usuario que hizo la consulta
    confidence_score DECIMAL(3,2),                   -- Confianza de la IA (0-1)
    was_helpful BOOLEAN,                             -- Feedback del usuario
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para análisis y reportes
CREATE INDEX idx_ai_analysis_dev ON ai_analysis_history(development_id);
CREATE INDEX idx_ai_analysis_type ON ai_analysis_history(analysis_type);
CREATE INDEX idx_ai_analysis_user ON ai_analysis_history(user_id);
CREATE INDEX idx_ai_analysis_date ON ai_analysis_history(created_at);
CREATE INDEX idx_ai_analysis_model ON ai_analysis_history(ai_model);
```

### **23. TABLA: `ai_recommendations`**
**Recomendaciones Generadas por IA**

```sql
CREATE TABLE ai_recommendations (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50) REFERENCES developments(id),
    recommendation_type VARCHAR(100) NOT NULL,       -- 'process_improvement', 'risk_mitigation', 'timeline_optimization'
    title VARCHAR(255) NOT NULL,                     -- Título de la recomendación
    description TEXT NOT NULL,                       -- Descripción detallada
    priority VARCHAR(20) DEFAULT 'medium',           -- 'low', 'medium', 'high', 'critical'
    impact_score DECIMAL(3,2),                       -- Impacto esperado (0-1)
    effort_score DECIMAL(3,2),                       -- Esfuerzo requerido (0-1)
    ai_confidence DECIMAL(3,2),                      -- Confianza de la IA (0-1)
    status VARCHAR(50) DEFAULT 'pending',            -- 'pending', 'accepted', 'rejected', 'implemented'
    implementation_notes TEXT,                       -- Notas de implementación
    assigned_to VARCHAR(255),                        -- Responsable de implementar
    due_date DATE,                                   -- Fecha límite sugerida
    implemented_at TIMESTAMP,                        -- Fecha de implementación
    results_feedback TEXT,                           -- Feedback de resultados
    generated_by VARCHAR(50) NOT NULL,               -- Modelo de IA que generó
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para gestión de recomendaciones
CREATE INDEX idx_ai_recommendations_dev ON ai_recommendations(development_id);
CREATE INDEX idx_ai_recommendations_type ON ai_recommendations(recommendation_type);
CREATE INDEX idx_ai_recommendations_status ON ai_recommendations(status);
CREATE INDEX idx_ai_recommendations_priority ON ai_recommendations(priority);
CREATE INDEX idx_ai_recommendations_assigned ON ai_recommendations(assigned_to);
```

### **24. TABLA: `ai_usage_metrics`**
**Métricas de Uso de IA**

```sql
CREATE TABLE ai_usage_metrics (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),                             -- Usuario (puede ser NULL para métricas del sistema)
    ai_model VARCHAR(50) NOT NULL,                   -- Modelo de IA usado
    operation_type VARCHAR(100) NOT NULL,            -- 'analysis', 'chat', 'recommendation', 'prediction'
    tokens_input INTEGER DEFAULT 0,                  -- Tokens de entrada
    tokens_output INTEGER DEFAULT 0,                 -- Tokens de salida
    cost_estimate DECIMAL(10,4),                     -- Costo estimado en USD
    response_time_ms INTEGER,                        -- Tiempo de respuesta
    success BOOLEAN DEFAULT TRUE,                    -- Si la operación fue exitosa
    error_message TEXT,                              -- Mensaje de error si falló
    context_size INTEGER,                            -- Tamaño del contexto enviado
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_partition DATE DEFAULT CURRENT_DATE         -- Para particionado por fecha
);

-- Índices para reportes de uso
CREATE INDEX idx_ai_usage_user ON ai_usage_metrics(user_id);
CREATE INDEX idx_ai_usage_model ON ai_usage_metrics(ai_model);
CREATE INDEX idx_ai_usage_operation ON ai_usage_metrics(operation_type);
CREATE INDEX idx_ai_usage_date ON ai_usage_metrics(date_partition);
CREATE INDEX idx_ai_usage_cost ON ai_usage_metrics(cost_estimate);
```

### **25. TABLA: `ai_model_configs`**
**Configuraciones de Modelos de IA**

```sql
CREATE TABLE ai_model_configs (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(50) NOT NULL UNIQUE,          -- 'claude-3-sonnet', 'gpt-4', etc.
    provider VARCHAR(50) NOT NULL,                   -- 'anthropic', 'openai'
    is_active BOOLEAN DEFAULT TRUE,                  -- Si el modelo está activo
    max_tokens INTEGER DEFAULT 4000,                 -- Máximo de tokens por request
    temperature DECIMAL(3,2) DEFAULT 0.7,            -- Temperatura del modelo
    cost_per_input_token DECIMAL(10,8),              -- Costo por token de entrada
    cost_per_output_token DECIMAL(10,8),             -- Costo por token de salida
    rate_limit_per_minute INTEGER DEFAULT 60,        -- Límite de requests por minuto
    context_window INTEGER DEFAULT 200000,           -- Ventana de contexto del modelo
    specialization TEXT,                             -- Especialización del modelo
    configuration JSONB,                             -- Configuración específica del modelo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para gestión de modelos
CREATE INDEX idx_ai_model_configs_name ON ai_model_configs(model_name);
CREATE INDEX idx_ai_model_configs_provider ON ai_model_configs(provider);
CREATE INDEX idx_ai_model_configs_active ON ai_model_configs(is_active);
```

## 🔗 **Relaciones MCP con Tablas Existentes**

### **Nuevas Relaciones:**
```
developments (1) ──── (N) ai_context_cache
developments (1) ──── (N) ai_analysis_history
developments (1) ──── (N) ai_recommendations
auth_users (1) ──── (N) ai_analysis_history (user_id)
auth_users (1) ──── (N) ai_usage_metrics (user_id)
```

## 📊 **Vistas MCP para Reportes**

### **Vista de Uso de IA por Usuario:**
```sql
CREATE VIEW ai_user_usage_summary AS
SELECT 
    u.name as user_name,
    u.email,
    aum.ai_model,
    COUNT(*) as total_operations,
    SUM(aum.tokens_input + aum.tokens_output) as total_tokens,
    SUM(aum.cost_estimate) as total_cost,
    AVG(aum.response_time_ms) as avg_response_time,
    COUNT(CASE WHEN aum.success = FALSE THEN 1 END) as failed_operations,
    MAX(aum.created_at) as last_used
FROM auth_users u
JOIN ai_usage_metrics aum ON u.id = aum.user_id
GROUP BY u.name, u.email, aum.ai_model;
```

### **Vista de Efectividad de Recomendaciones:**
```sql
CREATE VIEW ai_recommendation_effectiveness AS
SELECT 
    recommendation_type,
    COUNT(*) as total_recommendations,
    COUNT(CASE WHEN status = 'implemented' THEN 1 END) as implemented_count,
    ROUND(
        COUNT(CASE WHEN status = 'implemented' THEN 1 END) * 100.0 / COUNT(*), 2
    ) as implementation_rate,
    AVG(impact_score) as avg_impact_score,
    AVG(ai_confidence) as avg_confidence,
    AVG(EXTRACT(DAYS FROM (implemented_at - created_at))) as avg_implementation_days
FROM ai_recommendations
GROUP BY recommendation_type;
```

## 🎯 **Datos de Ejemplo MCP**

### **Configuraciones de Modelos:**
```sql
INSERT INTO ai_model_configs (model_name, provider, max_tokens, temperature, cost_per_input_token, cost_per_output_token, rate_limit_per_minute, context_window, specialization) VALUES
('claude-3-sonnet-20240229', 'anthropic', 4000, 0.7, 0.000003, 0.000015, 60, 200000, 'Análisis técnico y recomendaciones'),
('claude-3-haiku-20240307', 'anthropic', 4000, 0.5, 0.00000025, 0.00000125, 120, 200000, 'Respuestas rápidas y chat'),
('gpt-4-turbo-preview', 'openai', 4000, 0.7, 0.00001, 0.00003, 60, 128000, 'Análisis general y predicciones'),
('gpt-3.5-turbo', 'openai', 4000, 0.8, 0.0000005, 0.0000015, 120, 16000, 'Chat y consultas básicas');
```

---

*Documento actualizado con extensión MCP para Inteligencia Artificial*
