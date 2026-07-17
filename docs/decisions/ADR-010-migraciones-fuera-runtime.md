# ADR-010: Migraciones y RBAC fuera del runtime web

**Estado:** Aceptado
**Fecha:** 2026-07-16
**Fase:** Planilla Regional 1P

## Contexto

FastAPI ejecutaba `create_all`, ALTER, saneamientos, seeds y sincronización
RBAC durante startup con la misma credencial usada para atender requests. Un
fallo parcial podía quedar oculto y varios workers podían competir por DDL.

## Decisión

1. `python -m app.manage migrate` es el único entrypoint de mutación estructural.
2. El job autentica como `gestor_migrador`, ejecuta `SET ROLE
   gestor_schema_owner` y mantiene un advisory lock durante DDL, seeds y RBAC.
3. `gestor_schema_owner` es NOLOGIN; `gestor_runtime` no pertenece al owner,
   no tiene DDL ni escritura directa sobre tablas RBAC.
4. FastAPI startup solo consulta catálogo, ownership, objetos críticos,
   privilegios y manifiesto RBAC. Cualquier incompatibilidad bloquea startup.
5. Bases nuevas reciben roles mediante `postgres/init/01-gestor-roles.sh`.
   Volúmenes existentes ejecutan el perfil manual `database-admin` antes del
   job migrador.
6. El primer admin se crea opcionalmente mediante secreto montado como archivo
   con `docker-compose.bootstrap.yml`; el override y el archivo se retiran tras
   el primer migrate exitoso.
7. Las credenciales owner, migrador y runtime deben ser distintas. El
   provisionador falla si se reutilizan nombres o passwords.
8. Las mutaciones administrativas RBAC se conservan mediante procedimientos
   `SECURITY DEFINER` mínimos; runtime no recibe DML directo sobre sus tablas.
9. Los procedimientos exigen una capacidad independiente de la contraseña DB,
   montada como archivo. PostgreSQL conserva solo su SHA-256 en una tabla sin
   acceso runtime y el verificador exige namespace `public` y ACL exacta.
10. Los cambios legítimos de hash usan el mismo canal protegido. El escalado de
    rol no reemplaza la contraseña y el reset administrativo usa un bloqueo
    aleatorio seguido del flujo de recuperación por correo.
11. Los JWT de sesión se almacenan como SHA-256, todas las peticiones comprueban
    revocación/expiración y cualquier cambio de rol invalida tokens existentes.
    Cédula, hash y campos de recuperación tampoco se mutan por DML runtime.
12. Refresh rota token y expiración DB en una actualización condicional única.
    El cambio de contraseña y la revocación comparten transacción; los tokens de
    recuperación quedan ligados al hash vigente y un compare-and-swap garantiza
    un único ganador incluso bajo solicitudes concurrentes.
13. Los tokens MCP comparan el scope firmado con la sesión persistida y no
    pueden mutar directamente la API REST. Emisión/revocación y auditoría se
    confirman en una sola transacción.

## Consecuencias

- Backend no arranca sobre un volumen sin cutover; esto es fail-closed.
- Un despliegue debe completar `provision-roles -> migrate -> backend`.
- Agregar una migración exige actualizar el verificador estructural cuando el
  objeto sea crítico para seguridad o disponibilidad.
- Cambios de RBAC del manifiesto se materializan en el job, no reiniciando web.
- Los endpoints administrativos invocan procedimientos verificados y mantienen
  su autorización HTTP; no usan ORM directo para roles, permisos ni módulos.
- Rollback de aplicación no revierte DDL; se usa forward-fix y backup previo.
- La topología, grants e índices críticos se documentan en
  `docs/OPERACION_MIGRACIONES_DB.md`; las referencias históricas incompatibles
  deben marcarse como obsoletas o actualizarse explícitamente.
