-- =====================================================================================
-- MIGRACIÓN MCP - Model Context Protocol para IA (VERSIÓN CORREGIDA)
-- Sistema de Gestión de Proyectos TI
-- =====================================================================================

-- Crear tablas para funcionalidad de IA con MCP

-- =====================================================================================
-- TABLA 21: ai_context_cache
-- Cache de Contexto para IA (Optimización de Performance)
-- =====================================================================================

CREATE TABLE ai_context_cache (
    id SERIAL PRIMARY KEY,
    context_key VARCHAR(255) NOT NULL UNIQUE,        -- Hash del contexto
    development_id VARCHAR(50),                      -- Referencias developments(id) - sin FK por ahora
    context_type VARCHAR(50) NOT NULL,               -- 'development', 'provider', 'kpi', 'quality'
    context_data JSONB NOT NULL,                     -- Contexto serializado
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,                   -- TTL del cache
    access_count INTEGER DEFAULT 0,                  -- Contador de accesos
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comentarios para documentación
COMMENT ON TABLE ai_context_cache IS 'Cache optimizado de contexto para consultas de IA';
COMMENT ON COLUMN ai_context_cache.context_key IS 'Hash único del contexto para evitar duplicados';
COMMENT ON COLUMN ai_context_cache.context_type IS 'Tipo de contexto: development, provider, kpi, quality';
COMMENT ON COLUMN ai_context_cache.context_data IS 'Datos del contexto en formato JSON';
COMMENT ON COLUMN ai_context_cache.expires_at IS 'Fecha de expiración del cache (TTL)';

-- =====================================================================================
-- TABLA 22: ai_analysis_history
-- Historial de Análisis de IA
-- =====================================================================================

CREATE TABLE ai_analysis_history (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50),                      -- Referencias developments(id) - sin FK por ahora
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

-- Comentarios para documentación
COMMENT ON TABLE ai_analysis_history IS 'Historial completo de análisis realizados por IA';
COMMENT ON COLUMN ai_analysis_history.analysis_type IS 'Tipo de análisis: risk_analysis, performance_review, prediction, etc.';
COMMENT ON COLUMN ai_analysis_history.query_text IS 'Pregunta original formulada por el usuario';
COMMENT ON COLUMN ai_analysis_history.context_used IS 'Contexto completo enviado al modelo de IA';
COMMENT ON COLUMN ai_analysis_history.ai_model IS 'Modelo de IA utilizado para el análisis';
COMMENT ON COLUMN ai_analysis_history.confidence_score IS 'Nivel de confianza del análisis (0.0 a 1.0)';

-- =====================================================================================
-- TABLA 23: ai_recommendations
-- Recomendaciones Generadas por IA
-- =====================================================================================

CREATE TABLE ai_recommendations (
    id SERIAL PRIMARY KEY,
    development_id VARCHAR(50),                      -- Referencias developments(id) - sin FK por ahora
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

-- Comentarios para documentación
COMMENT ON TABLE ai_recommendations IS 'Recomendaciones inteligentes generadas por IA';
COMMENT ON COLUMN ai_recommendations.recommendation_type IS 'Tipo: process_improvement, risk_mitigation, timeline_optimization';
COMMENT ON COLUMN ai_recommendations.impact_score IS 'Impacto esperado de 0.0 (bajo) a 1.0 (alto)';
COMMENT ON COLUMN ai_recommendations.effort_score IS 'Esfuerzo requerido de 0.0 (bajo) a 1.0 (alto)';
COMMENT ON COLUMN ai_recommendations.ai_confidence IS 'Confianza de la IA en la recomendación (0.0 a 1.0)';

-- =====================================================================================
-- TABLA 24: ai_usage_metrics
-- Métricas de Uso de IA
-- =====================================================================================

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

-- Comentarios para documentación
COMMENT ON TABLE ai_usage_metrics IS 'Métricas detalladas de uso y costos de IA';
COMMENT ON COLUMN ai_usage_metrics.operation_type IS 'Tipo de operación: analysis, chat, recommendation, prediction';
COMMENT ON COLUMN ai_usage_metrics.cost_estimate IS 'Costo estimado en dólares americanos';
COMMENT ON COLUMN ai_usage_metrics.date_partition IS 'Fecha para particionado de datos';

-- =====================================================================================
-- TABLA 25: ai_model_configs
-- Configuraciones de Modelos de IA
-- =====================================================================================

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

-- Comentarios para documentación
COMMENT ON TABLE ai_model_configs IS 'Configuraciones y parámetros de modelos de IA disponibles';
COMMENT ON COLUMN ai_model_configs.model_name IS 'Nombre único del modelo (ej: claude-3-sonnet-20240229)';
COMMENT ON COLUMN ai_model_configs.provider IS 'Proveedor del modelo: anthropic, openai, etc.';
COMMENT ON COLUMN ai_model_configs.temperature IS 'Temperatura del modelo (0.0 a 1.0)';
COMMENT ON COLUMN ai_model_configs.context_window IS 'Máximo de tokens que puede procesar el modelo';

-- =====================================================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================================================

-- Índices para ai_context_cache
CREATE INDEX idx_ai_context_cache_key ON ai_context_cache(context_key);
CREATE INDEX idx_ai_context_cache_dev ON ai_context_cache(development_id);
CREATE INDEX idx_ai_context_cache_type ON ai_context_cache(context_type);
CREATE INDEX idx_ai_context_cache_expires ON ai_context_cache(expires_at);
CREATE INDEX idx_ai_context_cache_access_count ON ai_context_cache(access_count DESC);

-- Índices para ai_analysis_history
CREATE INDEX idx_ai_analysis_dev ON ai_analysis_history(development_id);
CREATE INDEX idx_ai_analysis_type ON ai_analysis_history(analysis_type);
CREATE INDEX idx_ai_analysis_user ON ai_analysis_history(user_id);
CREATE INDEX idx_ai_analysis_date ON ai_analysis_history(created_at);
CREATE INDEX idx_ai_analysis_model ON ai_analysis_history(ai_model);
CREATE INDEX idx_ai_analysis_helpful ON ai_analysis_history(was_helpful);

-- Índices para ai_recommendations
CREATE INDEX idx_ai_recommendations_dev ON ai_recommendations(development_id);
CREATE INDEX idx_ai_recommendations_type ON ai_recommendations(recommendation_type);
CREATE INDEX idx_ai_recommendations_status ON ai_recommendations(status);
CREATE INDEX idx_ai_recommendations_priority ON ai_recommendations(priority);
CREATE INDEX idx_ai_recommendations_assigned ON ai_recommendations(assigned_to);
CREATE INDEX idx_ai_recommendations_due_date ON ai_recommendations(due_date);
CREATE INDEX idx_ai_recommendations_impact ON ai_recommendations(impact_score DESC);

-- Índices para ai_usage_metrics
CREATE INDEX idx_ai_usage_user ON ai_usage_metrics(user_id);
CREATE INDEX idx_ai_usage_model ON ai_usage_metrics(ai_model);
CREATE INDEX idx_ai_usage_operation ON ai_usage_metrics(operation_type);
CREATE INDEX idx_ai_usage_date ON ai_usage_metrics(date_partition);
CREATE INDEX idx_ai_usage_cost ON ai_usage_metrics(cost_estimate);
CREATE INDEX idx_ai_usage_success ON ai_usage_metrics(success);

-- Índices para ai_model_configs
CREATE INDEX idx_ai_model_configs_name ON ai_model_configs(model_name);
CREATE INDEX idx_ai_model_configs_provider ON ai_model_configs(provider);
CREATE INDEX idx_ai_model_configs_active ON ai_model_configs(is_active);

-- =====================================================================================
-- DATOS INICIALES - Configuraciones de Modelos
-- =====================================================================================

-- Insertar configuraciones de modelos de IA
INSERT INTO ai_model_configs (
    model_name, 
    provider, 
    max_tokens, 
    temperature, 
    cost_per_input_token, 
    cost_per_output_token, 
    rate_limit_per_minute, 
    context_window, 
    specialization,
    configuration
) VALUES
-- Claude Models (Anthropic)
(
    'claude-3-sonnet-20240229', 
    'anthropic', 
    4000, 
    0.7, 
    0.000003, 
    0.000015, 
    60, 
    200000, 
    'Análisis técnico detallado y recomendaciones estratégicas',
    '{"system_prompt": "Eres un experto en gestión de proyectos TI especializado en análisis de desarrollos."}'
),
(
    'claude-3-haiku-20240307', 
    'anthropic', 
    4000, 
    0.5, 
    0.00000025, 
    0.00000125, 
    120, 
    200000, 
    'Respuestas rápidas para chat y consultas básicas',
    '{"system_prompt": "Proporciona respuestas rápidas y precisas sobre gestión de proyectos."}'
),
-- OpenAI Models
(
    'gpt-4-turbo-preview', 
    'openai', 
    4000, 
    0.7, 
    0.00001, 
    0.00003, 
    60, 
    128000, 
    'Análisis general y predicciones de cronogramas',
    '{"system_prompt": "Analiza datos de proyectos y genera predicciones precisas."}'
),
(
    'gpt-3.5-turbo', 
    'openai', 
    4000, 
    0.8, 
    0.0000005, 
    0.0000015, 
    120, 
    16000, 
    'Chat interactivo y consultas de soporte',
    '{"system_prompt": "Asiste a usuarios con consultas sobre el sistema de gestión."}'
);

-- =====================================================================================
-- TRIGGERS PARA AUDITORÍA
-- =====================================================================================

-- Trigger para actualizar updated_at en ai_recommendations
CREATE OR REPLACE FUNCTION update_ai_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_recommendations_updated_at
    BEFORE UPDATE ON ai_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_recommendations_updated_at();

-- Trigger para actualizar updated_at en ai_model_configs
CREATE OR REPLACE FUNCTION update_ai_model_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_model_configs_updated_at
    BEFORE UPDATE ON ai_model_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_model_configs_updated_at();

-- Trigger para actualizar access_count en cache
CREATE OR REPLACE FUNCTION update_ai_cache_access()
RETURNS TRIGGER AS $$
BEGIN
    NEW.access_count = OLD.access_count + 1;
    NEW.last_accessed_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_cache_access
    BEFORE UPDATE ON ai_context_cache
    FOR EACH ROW
    WHEN (OLD.context_data = NEW.context_data)
    EXECUTE FUNCTION update_ai_cache_access();

-- =====================================================================================
-- FUNCIONES UTILITARIAS MCP
-- =====================================================================================

-- Función para limpiar cache expirado
CREATE OR REPLACE FUNCTION clean_expired_ai_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_context_cache 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clean_expired_ai_cache() IS 'Limpia entradas de cache expiradas y retorna el número de registros eliminados';

-- Función para obtener estadísticas de uso de IA
CREATE OR REPLACE FUNCTION get_ai_usage_stats(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    model VARCHAR(50),
    total_operations BIGINT,
    total_cost NUMERIC,
    avg_response_time NUMERIC,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aum.ai_model,
        COUNT(*)::BIGINT as total_operations,
        COALESCE(SUM(aum.cost_estimate), 0)::NUMERIC as total_cost,
        COALESCE(AVG(aum.response_time_ms), 0)::NUMERIC as avg_response_time,
        ROUND(
            COUNT(CASE WHEN aum.success = TRUE THEN 1 END) * 100.0 / COUNT(*), 2
        )::NUMERIC as success_rate
    FROM ai_usage_metrics aum
    WHERE aum.date_partition BETWEEN start_date AND end_date
    GROUP BY aum.ai_model
    ORDER BY total_operations DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_ai_usage_stats(DATE, DATE) IS 'Obtiene estadísticas de uso de IA para un rango de fechas';

-- =====================================================================================
-- VALIDACIÓN DE MIGRACIÓN CORREGIDA
-- =====================================================================================

-- Verificar que todas las tablas se crearon correctamente
DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'ai_context_cache',
        'ai_analysis_history', 
        'ai_recommendations',
        'ai_usage_metrics',
        'ai_model_configs'
    ];
    table_name_var TEXT;
BEGIN
    RAISE NOTICE '=== VALIDACIÓN DE MIGRACIÓN MCP ===';
    
    FOREACH table_name_var IN ARRAY expected_tables
    LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables 
        WHERE table_name = table_name_var
        AND table_schema = 'public';
        
        IF table_count = 1 THEN
            RAISE NOTICE '✅ Tabla % creada correctamente', table_name_var;
        ELSE
            RAISE EXCEPTION '❌ Error: Tabla % no fue creada', table_name_var;
        END IF;
    END LOOP;
    
    -- Verificar datos iniciales
    SELECT COUNT(*) INTO table_count FROM ai_model_configs;
    IF table_count >= 4 THEN
        RAISE NOTICE '✅ Configuraciones de modelos IA insertadas: % registros', table_count;
    ELSE
        RAISE EXCEPTION '❌ Error: No se insertaron las configuraciones de modelos';
    END IF;
    
    RAISE NOTICE '=== MIGRACIÓN MCP COMPLETADA EXITOSAMENTE ===';
END;
$$;

-- =====================================================================================
-- FIN DE MIGRACIÓN MCP
-- =====================================================================================
