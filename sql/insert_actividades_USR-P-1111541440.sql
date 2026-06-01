-- Actividades para USR-P-1111541440
-- Fecha: 2026-05-28

-- ERROR: ACT-00150 no existe en desarrollos. Usar ACT-00067 para "CONTABILIZCION VIATICOS"
-- INSERT INTO actividades (
--     id, desarrollo_id, titulo, descripcion, estado,
--     responsable_id, asignado_a_id, delegado_por_id,
--     fecha_inicio_estimada, fecha_fin_estimada,
--     horas_estimadas, horas_reales, porcentaje_avance,
--     seguimiento, compromiso,
--     creado_en, actualizado_en
-- ) VALUES (
--     1005, 'ACT-00150', 'CONTABILIZACION VIATICOS MAYO', NULL, 'Pausa',
--     'USR-P-1111541440', 'USR-P-1111541440', NULL,
--     '2026-05-01', '2026-05-31', 0, 0, 0, NULL, NULL,
--     '2026-05-28 17:06:06.149393-05', '2026-05-28 17:06:06.149393-05'
-- );
INSERT INTO actividades (
    id, desarrollo_id, titulo, descripcion, estado,
    responsable_id, asignado_a_id, delegado_por_id,
    fecha_inicio_estimada, fecha_fin_estimada,
    horas_estimadas, horas_reales, porcentaje_avance,
    seguimiento, compromiso,
    creado_en, actualizado_en
) VALUES (
    249, 'ACT-00067', 'CONTABILIZACION VIATICOS MAYO', NULL, 'Pausa',
    'USR-P-1111541440', 'USR-P-1111541440', NULL,
    '2026-05-01', '2026-05-31', 0, 0, 0, NULL, NULL,
    '2026-05-28 17:06:06.149393-05', '2026-05-28 17:06:06.149393-05'
);

-- ACT-00072
INSERT INTO actividades (
    id, desarrollo_id, titulo, descripcion, estado,
    responsable_id, asignado_a_id, delegado_por_id,
    fecha_inicio_estimada, fecha_fin_estimada,
    horas_estimadas, horas_reales, porcentaje_avance,
    seguimiento, compromiso,
    creado_en, actualizado_en
) VALUES
    (288, 'ACT-00072', 'Revision y aprobacion de consignaciones', NULL, 'Pendiente',
     'USR-P-1111541440', 'USR-P-1111541440', NULL,
     '2026-05-01', '2026-05-15', 20, 0, 0, NULL, NULL,
     '2026-05-28 17:06:06.149393-05', '2026-05-28 17:06:06.149393-05'),
    (289, 'ACT-00072', 'Registro contable de consignaciones', NULL, 'Pendiente',
     'USR-P-1111541440', 'USR-P-1111541440', NULL,
     '2026-05-15', '2026-05-31', 20, 0, 0, NULL, NULL,
     '2026-05-28 17:06:06.149393-05', '2026-05-28 17:06:06.149393-05');
