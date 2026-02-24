-- 1. Forzar recreación de la tabla para asegurar estructura correcta
DROP TABLE IF EXISTS permisos_rol CASCADE;

CREATE TABLE permisos_rol (
    id SERIAL PRIMARY KEY,
    rol VARCHAR(50) NOT NULL,
    modulo VARCHAR(100) NOT NULL,
    permitido BOOLEAN DEFAULT TRUE,
    UNIQUE(rol, modulo)
);

-- 2. Insertar permisos iniciales
INSERT INTO permisos_rol (rol, modulo, permitido) VALUES
('admin', 'dashboard', true),
('analyst', 'dashboard', true),
('director', 'dashboard', true),
('admin', 'developments', true),
('analyst', 'developments', true),
('director', 'developments', true),
('admin', 'indicators', true),
('analyst', 'indicators', true),
('director', 'indicators', true),
('admin', 'ticket-management', true),
('analyst', 'ticket-management', true),
('director', 'ticket-management', true),
('admin', 'reports', true),
('analyst', 'reports', true),
('director', 'reports', true),
('admin', 'chat', true),
('analyst', 'chat', true),
('director', 'chat', true),
('admin', 'service-portal', true),
('analyst', 'service-portal', true),
('director', 'service-portal', true),
('usuario', 'service-portal', true),
('user', 'service-portal', true),
('admin', 'user-admin', true),
('admin', 'settings', true),
('analyst', 'settings', true),
('director', 'settings', true),
('admin', 'design-catalog', true),
('admin_sistemas', 'dashboard', true),
('admin_sistemas', 'developments', true),
('admin_sistemas', 'indicators', true),
('admin_sistemas', 'ticket-management', true),
('admin_sistemas', 'reports', true),
('admin_sistemas', 'chat', true),
('admin_sistemas', 'service-portal', true),
('admin_sistemas', 'settings', true)
ON CONFLICT (rol, modulo) DO NOTHING;
