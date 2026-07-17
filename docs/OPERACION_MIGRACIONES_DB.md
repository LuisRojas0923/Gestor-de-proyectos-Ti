# Operación de Migraciones y Roles PostgreSQL

Este documento es la referencia canónica de despliegue DB desde ADR-010.
Supersede cualquier instrucción histórica que indique ejecutar migraciones al
arrancar FastAPI, incluida la sección 4.1 de `PLAN_SERVIDOR_MCP.md`.

## Topología de roles

| Rol | Login | Responsabilidad |
|---|---|---|
| `gestor_schema_owner` | No | Owner de tablas, secuencias, funciones e índices. |
| `gestor_migrador` | Sí | Job; puede `SET ROLE gestor_schema_owner`. |
| `gestor_runtime` | Sí | CRUD mínimo, sin DDL ni escritura directa RBAC. |

Los nombres de owner, migrador y runtime deben ser distintos. Las contraseñas
de bootstrap PostgreSQL, migrador y runtime tampoco pueden reutilizarse;
`postgres/init/01-gestor-roles.sh` falla si detecta contaminación.

## Objetos críticos

- `ticket_id_seq`: secuencia requerida para IDs `TKT-XXXX`.
- `ux_permisos_rol_rol_modulo`: índice único sobre `(rol, modulo)`.
- `rechazar_mutacion_append_only()`: función de historiales inmutables.
- `proteger_credenciales_admin_runtime()`: impide escalado de rol y toma de
  cuentas administrativas usando la credencial runtime.
- `configuracion_seguridad_runtime`: conserva solo el SHA-256 de la capacidad
  administrativa y no concede acceso directo a runtime.
- `validar_capacidad_rbac()`: valida la capacidad antes de cada operación
  privilegiada; runtime no recibe `EXECUTE` sobre esta función.
- `auth_actualizar_hash_usuario()`: permite cambios legítimos de contraseña sin
  relajar el trigger contra toma directa de cuentas administrativas.
- `auth_consumir_token_recuperacion()`: cambia el hash por compare-and-swap;
  dos solicitudes con el mismo enlace dejan un único ganador.
- `auth_actualizar_correo_usuario()`: actualiza y verifica correo por el mismo
  canal protegido, evitando desviar recuperaciones con la credencial DB.
- `admin_actualizar_estado_usuario()`: activa o desactiva cuentas únicamente
  con capacidad y un actor administrador vigente.
- `admin_actualizar_modulo()`: conserva metadata/activación administrativa sin
  devolver DML directo sobre `modulos_sistema` al runtime.
- `auditoria_eventos` y sus índices por usuario/fecha y resultado: startup
  verifica columnas, ownership y semántica; `migrate` repara índices alterados.
- Constraints y triggers nombrados de plantillas/relaciones.

Startup valida definición, estado, tabla destino, ownership y grants de estos
objetos con consultas al catálogo. Un objeto homónimo incompatible no pasa.

Las APIs administrativas conservan creación/eliminación de roles, matriz de
permisos y cambios de rol mediante funciones `SECURITY DEFINER` con
firma/cuerpo/owner/search_path y ACL exacta verificados. Cada llamada requiere
la capacidad de 32+ caracteres montada en `RBAC_ADMIN_CAPABILITY_FILE`; conocer
solo la credencial PostgreSQL runtime no permite usarlas.

## Base nueva

1. Definir secretos distintos, incluida una capacidad generada con
   `openssl rand -hex 32` para `RBAC_ADMIN_CAPABILITY_FILE`.
2. Crear `db`; Docker ejecuta `01-gestor-roles.sh` una vez.
3. Si no existe admin, montar un secreto de 32+ caracteres con
   `docker compose -f docker-compose.prod.yml -f docker-compose.bootstrap.yml
   run --rm migrate` durante un solo job.
4. Ejecutar `docker compose -f docker-compose.prod.yml run --rm migrate`.
5. Retirar override/archivo bootstrap y levantar backend.

## Volumen existente

1. Tomar backup y detener backend.
2. Ejecutar `docker compose -f docker-compose.prod.yml --profile database-admin
   run --rm provision-roles`.
3. Ejecutar `docker compose -f docker-compose.prod.yml run --rm migrate`.
4. Verificar exit cero y luego levantar backend con la URL runtime.
5. Si startup falla, no omitir el verificador; aplicar forward-fix o restaurar
   el backup según la decisión operativa.

## Privilegios runtime

Runtime recibe CRUD de dominio y uso de secuencias por default privileges. Se
revoca DML sobre `modulos_sistema`, `permisos_rol` y `roles_sistema`, además de
CREATE sobre schema. Un trigger impide modificar roles, hashes, estado, cédula
y campos de recuperación directamente desde la sesión runtime. Los JWT de `sesiones` se
persisten solo como SHA-256 y toda petición valida que la sesión siga activa.

Rotar la capacidad exige actualizar el archivo, ejecutar `migrate` para
reemplazar su hash y reiniciar backend con el mismo secreto. El reset
administrativo invalida la clave con un valor aleatorio y envía un enlace de
recuperación; nunca restaura la contraseña a la cédula.

Refresh rota atómicamente el hash del token web y extiende `expira_en`; el token
anterior deja de ser válido y dos refresh concurrentes tienen un solo ganador.
Los tokens de recuperación incluyen una huella del hash vigente y consumen el
hash por compare-and-swap: el primer cambio invalida cualquier replay, incluso
si dos solicitudes llegan simultáneamente.

Los tokens MCP deben coincidir en `jti` y `scope` con una sesión vigente. El
backend rechaza mutaciones REST con credenciales MCP; token y evento de auditoría
se confirman o revierten juntos.

La sección de aplicación de `docs/PLAN_SERVIDOR_MCP.md` ya remite a ADR-010.
Este documento y ADR-010 son canónicos; todo cambio estructural se ejecuta
únicamente mediante `app.manage migrate`.
