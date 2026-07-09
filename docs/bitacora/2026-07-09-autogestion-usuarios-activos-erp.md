# Bitacora - Autogestion de usuarios activos ERP

**Fecha:** 2026-07-09
**Alcance:** Auth backend, validacion ERP, textos de registro y pruebas.

## Decision

El primer acceso y el registro publico dejan de depender de aprobacion manual cuando el ERP confirma empleado con contrato activo. Si ERP no confirma activo, no esta disponible o devuelve estado vacio, el sistema falla cerrado y no crea usuario.

## Cambios

- JIT crea usuario activo solo si ERP confirma estado `Activo`, pero no entrega token hasta configurar contrasena.
- Registro publico crea cuenta habilitada solo con empleado activo ERP.
- Setup-password bloquea cuentas locales inactivas y controla duplicados concurrentes con rollback.
- `viaticante` se normaliza para evitar tratar valores como `N`, `False` o `0` como verdaderos.
- Login valida `esta_activo` antes de exponer estado de contrasena pendiente.

## Evidencia

- `python -m pytest testing/backend/test_autogestion_usuarios_erp.py testing/backend/test_jit_approval.py testing/backend/test_jit_contrasena_eq_cedula.py testing/backend/test_erp_empleados_service.py -v` -> 26 passed.
- `python -m pytest testing/backend/test_setup_password.py -x -vv` -> bloqueado localmente por `asyncpg.exceptions.InvalidPasswordError` con usuario PostgreSQL `user`.
- `npm run lint` en `frontend/` -> bloqueado localmente porque `eslint` no esta instalado en el worktree.
