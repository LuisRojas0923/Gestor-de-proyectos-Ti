-- @block Conexión: PostgreSQL - Gestor Proyectos
-- Archivo optimizado para extensiones PostgreSQL de VS Code
-- Extensiones recomendadas: SQLTools, PostgreSQL

-- ===== INFORMACIÓN BÁSICA =====

-- @block Ver todas las tablas
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- @block Ver estructura de tabla users
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- @block Ver estructura de tabla requirements  
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'requirements' 
ORDER BY ordinal_position;

-- @block Ver estructura de tabla projects
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position;

-- ===== CONSULTAS DE DATOS =====

-- @block Contar registros en todas las tablas
SELECT 
    'users' as tabla, 
    (SELECT COUNT(*) FROM users) as registros
UNION ALL
SELECT 
    'requirements' as tabla, 
    (SELECT COUNT(*) FROM requirements) as registros
UNION ALL
SELECT 
    'projects' as tabla, 
    (SELECT COUNT(*) FROM projects) as registros
UNION ALL
SELECT 
    'communications' as tabla, 
    (SELECT COUNT(*) FROM communications) as registros;

-- @block Ver todos los usuarios
SELECT * FROM users 
ORDER BY created_at DESC 
LIMIT 10;

-- @block Ver todos los requerimientos
SELECT * FROM requirements 
ORDER BY created_at DESC 
LIMIT 10;

-- @block Ver todos los proyectos
SELECT * FROM projects 
ORDER BY created_at DESC 
LIMIT 10;

-- ===== INSERTAR DATOS DE PRUEBA =====

-- @block Insertar usuario de prueba
INSERT INTO users (name, email, role, created_at) 
VALUES 
    ('Juan Pérez', 'juan.perez@empresa.com', 'developer', NOW()),
    ('María García', 'maria.garcia@empresa.com', 'analyst', NOW()),
    ('Carlos López', 'carlos.lopez@empresa.com', 'manager', NOW())
RETURNING *;

-- @block Insertar proyectos de prueba
INSERT INTO projects (name, description, status, start_date, created_at)
VALUES 
    ('Sistema de Autenticación', 'Implementar login y registro de usuarios', 'active', NOW(), NOW()),
    ('Dashboard Analytics', 'Panel de control con métricas del negocio', 'planning', NOW(), NOW()),
    ('API REST', 'Desarrollo de API para aplicación móvil', 'completed', NOW() - INTERVAL '30 days', NOW())
RETURNING *;

-- @block Insertar requerimientos de prueba
INSERT INTO requirements (external_id, title, description, priority, status, type, assigned_user_id, created_at)
VALUES 
    ('REQ-001', 'Implementar login', 'Crear sistema de autenticación de usuarios', 'high', 'pending', 'feature', 1, NOW()),
    ('REQ-002', 'Dashboard principal', 'Diseñar pantalla principal del sistema', 'medium', 'in_progress', 'feature', 2, NOW()),
    ('REQ-003', 'Fix bug login', 'Corregir error en validación de contraseñas', 'critical', 'pending', 'bug', 1, NOW())
RETURNING *;

-- ===== CONSULTAS DE ANÁLISIS =====

-- @block Resumen de requerimientos por estado
SELECT 
    status,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM requirements), 2) as porcentaje
FROM requirements 
GROUP BY status 
ORDER BY cantidad DESC;

-- @block Usuarios con más requerimientos asignados
SELECT 
    u.name,
    u.email,
    u.role,
    COUNT(r.id) as total_requerimientos,
    COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completados,
    COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pendientes
FROM users u
LEFT JOIN requirements r ON u.id = r.assigned_user_id
GROUP BY u.id, u.name, u.email, u.role
ORDER BY total_requerimientos DESC;

-- @block Proyectos por estado con fechas
SELECT 
    name,
    status,
    start_date,
    end_date,
    CASE 
        WHEN end_date IS NULL THEN 'En progreso'
        WHEN end_date > NOW() THEN 'Futuro'
        ELSE 'Finalizado'
    END as estado_temporal
FROM projects 
ORDER BY start_date DESC;

-- @block Requerimientos críticos pendientes
SELECT 
    r.external_id,
    r.title,
    r.priority,
    r.status,
    u.name as asignado_a,
    r.created_at,
    EXTRACT(DAY FROM NOW() - r.created_at) as dias_pendiente
FROM requirements r
LEFT JOIN users u ON r.assigned_user_id = u.id
WHERE r.status IN ('pending', 'in_progress') 
    AND r.priority IN ('high', 'critical')
ORDER BY 
    CASE r.priority 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        ELSE 3 
    END,
    r.created_at;

-- ===== CONSULTAS DE LIMPIEZA (¡USAR CON CUIDADO!) =====

-- @block Eliminar datos de prueba (CUIDADO)
-- DELETE FROM requirements WHERE external_id LIKE 'REQ-%';
-- DELETE FROM projects WHERE name LIKE '%prueba%' OR name LIKE '%test%';
-- DELETE FROM users WHERE email LIKE '%@empresa.com';

-- @block Reiniciar secuencias
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;
-- ALTER SEQUENCE requirements_id_seq RESTART WITH 1; 
-- ALTER SEQUENCE projects_id_seq RESTART WITH 1;

-- ===== INFORMACIÓN DEL SISTEMA =====

-- @block Información de la base de datos
SELECT 
    current_database() as base_datos,
    current_user as usuario_actual,
    inet_server_addr() as servidor,
    inet_server_port() as puerto,
    version() as version_postgresql;

-- @block Tamaño de las tablas
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamaño,
    pg_total_relation_size(schemaname||'.'||tablename) as bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;


-- @block Contar registros en todas las tablas
SELECT 
    'users' as tabla, 
    (SELECT COUNT(*) FROM users) as registros
UNION ALL
SELECT 
    'requirements' as tabla, 
    (SELECT COUNT(*) FROM requirements) as registros;


-- @block crear tabla users
-- Crear tabla users en PostgreSQL
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,
    avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- @block Insertar usuarios de prueba
INSERT INTO users (name, email, role) 
VALUES 
    ('Juan Pérez', 'juan.perez@empresa.com', 'developer'),
    ('María García', 'maria.garcia@empresa.com', 'analyst');


-- @block Ver todos los registros de la tabla users
SELECT * FROM users;