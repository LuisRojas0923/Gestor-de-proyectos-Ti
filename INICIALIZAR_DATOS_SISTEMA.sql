-- ==========================================
-- SCRIPT DE INICIALIZACIÓN DE DATOS MAESTROS
-- Gestor de Proyectos TI - Refridcol 2025
-- ==========================================

-- 1. Categorías de Tickets (Soporte)
-- Estas categorías aparecen en el desplegable para crear nuevos tickets
INSERT INTO categorias_ticket (id, nombre, tipo_formulario, descripcion, icono) VALUES
('soporte_hardware', 'Soporte de Hardware', 'support', 'Problemas físicos con equipos (PCs, Monitores)', 'Cpu'),
('soporte_software', 'Soporte de Software', 'support', 'Instalación y errores de programas', 'AppWindow'),
('soporte_impresoras', 'Soporte de Impresoras', 'support', 'Mantenimiento y consumibles', 'Printer'),
('perifericos', 'Periféricos y Equipos', 'asset', 'Solicitud de nuevos equipos', 'Mouse'),
('soporte_mejora', 'Soporte Mejoramiento', 'support', 'Ajustes a sistemas existentes', 'Wrench'),
('nuevos_desarrollos_mejora', 'Nuevos Desarrollos', 'development', 'Nuevas funcionalidades o software', 'Code'),
('compra_licencias', 'Compra de Licencias', 'asset', 'Software licenciado', 'ShieldCheck')
ON CONFLICT (id) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    tipo_formulario = EXCLUDED.tipo_formulario,
    descripcion = EXCLUDED.descripcion;

-- 2. Permisos por Rol
-- Esto habilita los módulos en el menú lateral para los diferentes roles
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
('admin', 'design-catalog', true)
ON CONFLICT (rol, modulo) DO UPDATE SET permitido = EXCLUDED.permitido;

-- 3. Fases y Etapas por Defecto (Desarrollo)
-- Ayuda a que los proyectos de desarrollo tengan una estructura base
INSERT INTO fases_desarrollo (id, nombre, codigo, orden, descripcion, color) VALUES
(1, 'Definición', 'DEF', 1, 'Levantamiento de requisitos', '#3498db'),
(2, 'Diseño', 'DES', 2, 'Diseño técnico y UX', '#9b59b6'),
(3, 'Desarrollo', 'DEV', 3, 'Codificación activa', '#2ecc71'),
(4, 'Pruebas', 'TEST', 4, 'QA y UAT', '#f1c40f'),
(5, 'Despliegue', 'PROD', 5, 'Paso a producción', '#e67e22')
ON CONFLICT (id) DO NOTHING;

INSERT INTO etapas_desarrollo (fase_id, nombre, codigo, orden, porcentaje_inicio, porcentaje_fin) VALUES
(1, 'Análisis Inicial', 'ANALISIS', 1, 0, 50),
(1, 'Aprobación', 'APROB', 2, 50, 100),
(3, 'Frontend', 'FRONT', 1, 0, 50),
(3, 'Backend', 'BACK', 2, 50, 100)
ON CONFLICT (id) DO NOTHING;

-- 4. Sala de ejemplo (Reserva de Salas)
INSERT INTO rooms (id, name, capacity, resources, is_active, notes)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'Sala de reuniones 1',
    10,
    ARRAY['Proyector', 'Pizarra'],
    TRUE,
    'Sala principal'
) ON CONFLICT (id) DO NOTHING;
