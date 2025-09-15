-- =============================================================================
-- CONSULTAS SIMPLES PARA CREAR DESARROLLOS DE PRUEBA
-- Sistema de Gestión de Proyectos TI - Datos de Testing
-- =============================================================================

-- Primero ejecuta esto para ver los IDs de las etapas:
-- SELECT id, stage_code, stage_name FROM development_stages ORDER BY sort_order;

-- =============================================================================
-- DESARROLLOS DE PRUEBA POR ETAPA DEL CICLO
-- =============================================================================

-- 1. DESARROLLO EN ETAPA: DEFINICIÓN (Etapa 1 - Fase: En Ejecución)
INSERT INTO developments (
    id, name, description, module, type, environment, remedy_link,
    current_phase_id, current_stage_id, stage_progress_percentage,
    general_status, estimated_end_date, provider
) VALUES (
    'REQ-TEST-001', 
    'Sistema de Gestión de Inventarios - Fase Definición',
    'Desarrollo de sistema para gestión de inventarios con control de stock, alertas automáticas y reportes de rotación.',
    'Inventarios', 
    'Desarrollo', 
    'Desarrollo', 
    'https://remedy.company.com/REQ-TEST-001',
    1, 
    1, 
    25.0,
    'En curso', 
    '2024-06-15', 
    'Ingesoft'
);

-- 2. DESARROLLO EN ETAPA: ANÁLISIS (Etapa 2 - Fase: En Ejecución)
INSERT INTO developments (
    id, name, description, module, type, environment, remedy_link,
    current_phase_id, current_stage_id, stage_progress_percentage,
    general_status, estimated_end_date, provider
) VALUES (
    'REQ-TEST-002', 
    'Módulo de Reportes Financieros - Fase Análisis',
    'Desarrollo de módulo para generación automática de reportes financieros con integración a sistemas contables.',
    'Finanzas', 
    'Desarrollo', 
    'Desarrollo', 
    'https://remedy.company.com/REQ-TEST-002',
    1, 
    2, 
    60.0,
    'En curso', 
    '2024-07-20', 
    'ITC'
);

-- 3. DESARROLLO EN ETAPA: PROPUESTA (Etapa 3 - Fase: En Espera)
INSERT INTO developments (
    id, name, description, module, type, environment, remedy_link,
    current_phase_id, current_stage_id, stage_progress_percentage,
    general_status, estimated_end_date, provider
) VALUES (
    'REQ-TEST-003', 
    'Portal de Clientes Digital - Fase Propuesta',
    'Desarrollo de portal web para clientes con funcionalidades de autogestión y consulta de estados.',
    'Atención Cliente', 
    'Desarrollo', 
    'Desarrollo', 
    'https://remedy.company.com/REQ-TEST-003',
    2, 
    3, 
    0.0,
    'Pendiente', 
    '2024-08-30', 
    'Proveedor Externo'
);

-- 4. DESARROLLO EN ETAPA: APROBACIÓN (Etapa 4 - Fase: En Espera)
INSERT INTO developments (
    id, name, description, module, type, environment, remedy_link,
    current_phase_id, current_stage_id, stage_progress_percentage,
    general_status, estimated_end_date, provider
) VALUES (
    'REQ-TEST-004', 
    'Sistema de Monitoreo de Redes - Fase Aprobación',
    'Implementación de sistema de monitoreo en tiempo real para infraestructura de red con alertas automáticas.',
    'Infraestructura', 
    'Desarrollo', 
    'Producción', 
    'https://remedy.company.com/REQ-TEST-004',
    2, 
    4, 
    0.0,
    'Pendiente', 
    '2024-09-15', 
    'TI Interno'
);

-- 5. DESARROLLO EN ETAPA: DESARROLLO (Etapa 5 - Fase: En Ejecución)
INSERT INTO developments (
    id, name, description, module, type, environment, remedy_link,
    current_phase_id, current_stage_id, stage_progress_percentage,
    general_status, estimated_end_date, provider
) VALUES (
    'REQ-TEST-005', 
    'API de Integración con Sistemas Externos - Fase Desarrollo',
    'Desarrollo de API REST para integración con sistemas externos de proveedores y clientes.',
    'Integración', 
    'Desarrollo', 
    'Desarrollo', 
    'https://remedy.company.com/REQ-TEST-005',
    1, 
    5, 
    45.0,
    'En curso', 
    '2024-07-10', 
    'Ingesoft'
);

-- 6. DESARROLLO EN ETAPA: DESPLIEGUE PRUEBAS (Etapa 6 - Fase: En Ejecución)
INSERT INTO developments (
    id, name, description, module, type, environment, remedy_link,
    current_phase_id, current_stage_id, stage_progress_percentage,
    general_status, estimated_end_date, provider
) VALUES (
    'REQ-TEST-006', 
    'Módulo de Gestión Documental - Fase Despliegue Pruebas',
    'Sistema de gestión documental con workflow de aprobaciones y control de versiones.',
    'Documentación', 
    'Desarrollo', 
    'Pruebas', 
    'https://remedy.company.com/REQ-TEST-006',
    1, 
    6, 
    80.0,
    'En curso', 
    '2024-06-30', 
    'ITC'
);

-- 7. DESARROLLO EN ETAPA: PLAN DE PRUEBAS (Etapa 7 - Fase: En Ejecución)
INSERT INTO developments (
    id, name, description, module, type, environment, remedy_link,
    current_phase_id, current_stage_id, stage_progress_percentage,
    general_status, estimated_end_date, provider
) VALUES (
    'REQ-TEST-007', 
    'Sistema de Reservas y Citas - Fase Plan de Pruebas',
    'Sistema para gestión de reservas y citas con calendario integrado y notificaciones automáticas.',
    'Atención Cliente', 
    'Desarrollo', 
    'Pruebas', 
    'https://remedy.company.com/REQ-TEST-007',
    1, 
    7, 
    70.0,
    'En curso', 
    '2024-07-25', 
    'Ingesoft'
);

-- 8. DESARROLLO EN ETAPA: EJECUCIÓN PRUEBAS (Etapa 8 - Fase: En Ejecución)
INSERT INTO developments (
    id, name, description, module, type, environment, remedy_link,
    current_phase_id, current_stage_id, stage_progress_percentage,
    general_status, estimated_end_date, provider
) VALUES (
    'REQ-TEST-008', 
    'Dashboard de Métricas Operacionales - Fase Ejecución Pruebas',
    'Dashboard en tiempo real con métricas operacionales, KPIs y alertas automáticas.',
    'Operaciones', 
    'Desarrollo', 
    'Pruebas', 
    'https://remedy.company.com/REQ-TEST-008',
    1, 
    8, 
    90.0,
    'En curso', 
    '2024-06-20', 
    'ITC'
);

-- 9. DESARROLLO EN ETAPA: APROBACIÓN PASE (Etapa 9 - Fase: En Espera)
INSERT INTO developments (
    id, name, description, module, type, environment, remedy_link,
    current_phase_id, current_stage_id, stage_progress_percentage,
    general_status, estimated_end_date, provider
) VALUES (
    'REQ-TEST-009', 
    'Sistema de Facturación Electrónica - Fase Aprobación Pase',
    'Sistema de facturación electrónica con integración a DIAN y gestión de documentos tributarios.',
    'Facturación', 
    'Desarrollo', 
    'Pruebas', 
    'https://remedy.company.com/REQ-TEST-009',
    2, 
    9, 
    0.0,
    'Pendiente', 
    '2024-08-10', 
    'Ingesoft'
);

-- 10. DESARROLLO EN ETAPA: DESPLEGADO (Etapa 10 - Fase: Finales / Otros)
INSERT INTO developments (
    id, name, description, module, type, environment, remedy_link,
    current_phase_id, current_stage_id, stage_progress_percentage,
    general_status, estimated_end_date, provider
) VALUES (
    'REQ-TEST-010', 
    'Sistema de Gestión de Recursos Humanos - Desplegado',
    'Sistema completo de gestión de RRHH con nómina, vacaciones, evaluaciones y reportes gerenciales.',
    'Recursos Humanos', 
    'Desarrollo', 
    'Producción', 
    'https://remedy.company.com/REQ-TEST-010',
    3, 
    10, 
    100.0,
    'Completado', 
    '2024-05-15', 
    'ITC'
);

-- 11. DESARROLLO EN ETAPA: CANCELADO (Etapa 0 - Fase: Finales / Otros)
INSERT INTO developments (
    id, name, description, module, type, environment, remedy_link,
    current_phase_id, current_stage_id, stage_progress_percentage,
    general_status, estimated_end_date, provider
) VALUES (
    'REQ-TEST-011', 
    'Sistema de Gestión de Almacenes - Cancelado',
    'Sistema para gestión de almacenes con control de inventario y picking automatizado.',
    'Logística', 
    'Desarrollo', 
    'Cancelado', 
    'https://remedy.company.com/REQ-TEST-011',
    3, 
    11, 
    0.0,
    'Cancelado', 
    '2024-12-31', 
    'Ingesoft'
);

-- =============================================================================
-- CONSULTA DE VERIFICACIÓN
-- =============================================================================

-- Verificar que se crearon correctamente los desarrollos de prueba
SELECT 
    d.id,
    d.name,
    dp.phase_name,
    ds.stage_name,
    ds.stage_code,
    d.stage_progress_percentage,
    d.general_status,
    d.provider,
    d.environment
FROM developments d
LEFT JOIN development_phases dp ON d.current_phase_id = dp.id
LEFT JOIN development_stages ds ON d.current_stage_id = ds.id
WHERE d.id LIKE 'REQ-TEST-%'
ORDER BY ds.sort_order, d.id;

-- =============================================================================
-- RESUMEN DE DESARROLLOS CREADOS
-- =============================================================================
-- ✅ REQ-TEST-001: Sistema de Gestión de Inventarios - Etapa: Definición (25%)
-- ✅ REQ-TEST-002: Módulo de Reportes Financieros - Etapa: Análisis (60%)
-- ✅ REQ-TEST-003: Portal de Clientes Digital - Etapa: Propuesta (0%)
-- ✅ REQ-TEST-004: Sistema de Monitoreo de Redes - Etapa: Aprobación (0%)
-- ✅ REQ-TEST-005: API de Integración con Sistemas Externos - Etapa: Desarrollo (45%)
-- ✅ REQ-TEST-006: Módulo de Gestión Documental - Etapa: Despliegue Pruebas (80%)
-- ✅ REQ-TEST-007: Sistema de Reservas y Citas - Etapa: Plan de Pruebas (70%)
-- ✅ REQ-TEST-008: Dashboard de Métricas Operacionales - Etapa: Ejecución Pruebas (90%)
-- ✅ REQ-TEST-009: Sistema de Facturación Electrónica - Etapa: Aprobación Pase (0%)
-- ✅ REQ-TEST-010: Sistema de Gestión de Recursos Humanos - Etapa: Desplegado (100%)
-- ✅ REQ-TEST-011: Sistema de Gestión de Almacenes - Etapa: Cancelado (0%)
-- 
-- Total: 11 desarrollos de prueba cubriendo todas las etapas del ciclo
-- =============================================================================
