UPDATE usuarios
SET correo = 'admin_test@example.invalid',
    correo_actualizado = TRUE,
    correo_verificado = TRUE
WHERE cedula = 'admin_test';

INSERT INTO categorias_ticket (
    id, nombre, descripcion, icono, tipo_formulario
) VALUES (
    'soporte_software',
    'Soporte de software',
    'Categoria sintetica para regresiones aisladas',
    'code',
    'basico'
)
ON CONFLICT (id) DO NOTHING;
