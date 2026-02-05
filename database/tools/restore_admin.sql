INSERT INTO usuarios_autenticacion (id, cedula, name, email, password_hash, role, is_active, created_at)
VALUES ('05583d7a-fc25-41ff-86e2-13437d72588b', 'admin', 'Administrador Sistema', 'admin@sistema.com', '$2b$12$rlUyy.vtEj3Pcdvoh2grDuIj/TEqPac3ntY8Uon0h4SidSiwEFjDS', 'analyst', true, NOW())
ON CONFLICT (cedula) 
DO UPDATE SET password_hash = '$2b$12$rlUyy.vtEj3Pcdvoh2grDuIj/TEqPac3ntY8Uon0h4SidSiwEFjDS', role = 'analyst', is_active = true;
