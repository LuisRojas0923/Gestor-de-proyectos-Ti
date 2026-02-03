-- Agregar permisos para el rol 'viaticante' y nuevos módulos de gestión
INSERT INTO permisos_rol (rol, modulo, permitido) VALUES
-- Módulo: Gestión de Viáticos
('viaticante', 'viaticos_gestion', true),
('admin', 'viaticos_gestion', true),
('director', 'viaticos_gestion', true),
('analyst', 'viaticos_gestion', true),
('user', 'viaticos_gestion', false),

-- Módulo: Mis Solicitudes
('viaticante', 'mis_solicitudes', true),
('admin', 'mis_solicitudes', true),
('director', 'mis_solicitudes', true),
('analyst', 'mis_solicitudes', true),
('user', 'mis_solicitudes', true),

-- Módulo: Soporte Sistemas
('viaticante', 'sistemas', true),
('admin', 'sistemas', true),
('director', 'sistemas', true),
('analyst', 'sistemas', true),
('user', 'sistemas', true),

-- Módulo: Desarrollo Software
('viaticante', 'desarrollo', false),
('admin', 'desarrollo', true),
('director', 'desarrollo', true),
('analyst', 'desarrollo', true),
('user', 'desarrollo', true),

-- Módulo: Mejoramiento
('viaticante', 'mejoramiento', false),
('admin', 'mejoramiento', true),
('director', 'mejoramiento', true),
('analyst', 'mejoramiento', true),
('user', 'mejoramiento', true),

-- Acceso básico al dashboard para el viaticante
('viaticante', 'dashboard', true),
('viaticante', 'service-portal', true)

ON CONFLICT (rol, modulo) DO NOTHING;
