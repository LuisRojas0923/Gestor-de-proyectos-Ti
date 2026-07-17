# Build Fase 1P - Migraciones fuera del runtime

**Fecha:** 2026-07-16
**Rama:** `Modulo_Geoface`
**SHA contractual:** `990a697d`
**Estado:** APROBADO y versionado en `7f699853`; waiver ERP autorizado

## Resultado

- FastAPI startup ejecuta solo verificación estructural y RBAC mediante SELECT.
- `python -m app.manage migrate` concentra DDL, saneamientos, seeds, bootstrap
  inicial opcional y sincronización RBAC bajo un advisory lock PostgreSQL.
- Los helpers de migración propagan fallos y el comando devuelve exit 1 saneado.
- `gestor_migrador` usa `SET ROLE gestor_schema_owner`; `gestor_runtime` no es
  miembro del owner, no tiene DDL ni escritura directa sobre RBAC.
- Compose separa credenciales y provisiona roles en bases PostgreSQL nuevas.
- `docker-compose.bootstrap.yml` monta una clave de un solo uso solo al job;
  después del primer admin se retira ese override y el archivo secreto.
- Se eliminó definitivamente `admin/admin123`.
- Las operaciones privilegiadas exigen una capacidad separada de la credencial
  DB; PostgreSQL conserva solo su SHA-256 y runtime no puede leer la tabla.

## Evidencia TDD

### Rojo inicial

Comando:

`$env:PYTHONPATH="backend_v2;"+$env:PYTHONPATH; python -m pytest testing/backend/test_startup_migration_roles.py -q`

Resultado 11:18:20: **6 failed**. Fallaron startup mutante, verificadores
inexistentes, CLI inexistente, job Compose ausente y bootstrap `admin123`.

Desviación registrada: los casos unitarios de dos migradores y job fallido se
agregaron tras esa primera ejecución y aparecieron verdes. La aceptación real
PostgreSQL sí tuvo rojo posterior: falló porque el descubrimiento dinámico no
registró `formato_2276`; se reemplazó por `models/registry.py` explícito.

### Verde focal

- Rojos de rerevisión 14:52: **5 failed** por actor falsificable, namespace,
  payloads sin schema, hash predecible y límite biométrico inconsistente.
- Rojos de identidad/sesión: **3 failed** por JWT en claro, revocación web no
  aplicada y fallback de capacidad por variable.
- Rojos posteriores: **1 failed** por estado de cuenta sin proteger, **1 failed**
  por hash expuesto en `/auth/yo` y **5 failed** por refresh, revocación
  fail-open, replay, secreto JWT público y carrera de analistas.
- Rojos de cierre: **1 failed** por payload MCP abierto; **4 failed** por secreto
  template, analista reclamable, CAS ausente y sesión fail-open; **2 failed** por
  DDL runtime/password heredado; **3 failed** por autorización HTTP; **1 failed**
  por DML RBAC directo; y aceptación roja por índice de auditoría semánticamente
  incorrecto no detectado.
- Ejecución final de `test_startup_migration_roles.py` +
  `test_phase1p_auth_security.py` + `test_phase1p_endpoint_security.py`:
  **47 passed**, 2 warnings, 388.45 s.
- `test_startup_migration_roles_postgres.py`: **1 passed**, 2 warnings,
  211.76 s en la ejecución final.
- PostgreSQL real: `postgres:15-alpine`, contenedor y volumen efímeros, roles
  owner/migrador/runtime distintos y puertos temporales exclusivos.
- La aceptación ejecutó dos migradores concurrentes y múltiples reruns limpios.
- Antes de esos reruns ejecutó el comando completo en subprocess con
  `ENVIRONMENT=production`, `APP_PROCESS_ROLE=migrate` y sin `JWT_SECRET_KEY`.
- Validó FastAPI real `/health`, primer ticket y `ticket_id_seq`, ownership,
  default grants, unicidad/reparación RBAC y DDL/RBAC denegados al runtime.
- Rechazó y reparó objetos ausentes y homónimos incompatibles: constraint no
  validado, trigger deshabilitado, función no-op, índice no único y owner errado.
- Verificó que runtime no cambia roles/hashes ni elimina cuentas admin y que no
  puede insertar en `roles_sistema`.
- Conservó por HTTP creación/eliminación de roles, actualización de permisos y
  cambio de rol mediante procedimientos `SECURITY DEFINER` verificados.
- Cubrió homónimos en otro schema, constraints debilitados, eventos extra,
  overloads, owner de las diez funciones críticas y funciones no-op con marker.
- Rechazó llamadas directas con actor forjado y capacidad incorrecta; validó
  cambio propio, reset administrativo no reclamable y recuperación por token.
- Detectó `search_path=sombra,public`, trigger enlazado a una función sombra y
  un grant `EXECUTE` inesperado; `migrate` reparó siempre objetos en `public`.
- Persistió solo SHA-256 de JWT, revocó tokens web tras rol/reset y bloqueó DML
  runtime sobre hash, estado, cédula y recuperación de cualquier usuario.
- `/auth/yo` excluye `hash_contrasena` de la serialización pública.
- La capacidad se leyó exclusivamente desde archivo; un grant inesperado sobre
  su tabla privada también bloqueó startup y fue reparado por `migrate`.
- Refresh concurrente dejó un único ganador, extendió expiración DB, rechazó
  MCP y revocó el token anterior. Recuperación concurrente dejó un único ganador
  mediante compare-and-swap del hash vigente.
- Una credencial MCP `read` emitida por HTTP recibió `403` al intentar crear un
  rol directamente; claim y scope persistido deben coincidir.
- La aceptación eliminó `auditoria_eventos`, sustituyó uno de sus índices por
  otro homónimo sobre una columna incorrecta, comprobó el bloqueo de startup y
  confirmó reparación exclusiva mediante `migrate`.
- Activar/desactivar por HTTP persistió estado y revocó la sesión; la aceptación
  comprobó también ausencia de `hash_contrasena` en la respuesta real.

## Regresiones

- `test_horarios_migracion_seguridad.py::test_fallo_migracion_critica_se_propaga`:
  **1 passed**.
- `test_horas_extras_s0.py`: **27 passed**, 2 warnings.
- Evidencia histórica amplia JIT/configuración: **34 passed**. El rerun focal
  posterior sobre los archivos vigentes obtuvo **19 passed**, 2 warnings.
- `test_infrastructure.py test_regresiones.py`: **4 passed, 4 skipped** por
  autenticación/ERP no configurados.
- El último rerun contra el stack compartido alcanzó **1 passed/1 skipped** y
  luego agotó timeout en `/health`; la aceptación aislada mantuvo HTTP 200.
- El stack compartido ejecutó `provision-roles` dos veces, `migrate` terminó con
  exit 0 y backend, frontend y proxy `/api/v2/health` respondieron HTTP 200.
- Los skips globales aún requieren entorno objetivo con ERP o waiver explícito
  al aprobar la fase.

## Validaciones Operativas

- `docker compose config --quiet`: OK desarrollo.
- `docker compose --profile database-admin run --rm provision-roles`: OK sobre
  volumen existente; las secuencias `OWNED BY` se transfieren con su tabla.
- `docker compose run --rm migrate`: exit 0.
- `npm run build`: OK, 4.027 módulos transformados.
- `http://localhost:5173/`, backend y proxy `/api/v2/health`: HTTP 200.
- Compose Pruebas3 y producción con variables dummy no secretas: OK.
- Compose desarrollo + `docker-compose.bootstrap.yml`: OK.
- `sh -n postgres/init/01-gestor-roles.sh` en Alpine 3.20: OK.
- Provisionador reejecutado sobre volumen existente: OK; passwords repetidos
  producen exit no cero antes de conectar.
- Provisionador reparó contaminación deliberada (`BYPASSRLS`, miembro extra y
  tercero capaz de asumir owner) hasta dejar solo owner -> migrador.
- `python -m py_compile` focal: OK.
- `git diff --check` del alcance: OK; permanece una línea final concurrente en
  `docs/ESQUEMA_BASE_DATOS.md`, excluida del stage de esta fase.
- `python -m pytest testing/backend/test_auth_refresh.py
  testing/backend/test_password_recovery.py -q`: **9 passed, 3 failed** en
  179.04 s. Los tres fallos legacy ocurrieron antes del contrato funcional por
  `WinError 64` del PostgreSQL compartido y Redis local no disponible; la
  aceptación aislada cubre recuperación, replay y concurrencia.
- Graphify AST final: **4.825 nodos / 9.409 aristas / 372 comunidades**.

## Límites

Todo código fuente y prueba creado o modificado por la fase permanece en 500
líneas o menos. `test_auth_escalation.py` queda exactamente en 500; la aceptación
se dividió entre test y helper para respetar el límite. Los documentos históricos
o generados extensos no se contabilizan como módulos de código.

## Operación

1. Para una base nueva, definir roles/passwords y levantar `db`; el init script
   crea owner NOLOGIN, migrador NOINHERIT y runtime mínimo.
2. Generar `RBAC_ADMIN_CAPABILITY_FILE` con 32+ caracteres y montarlo tanto en
   `migrate` como en `backend`.
3. Si no existe admin, ejecutar una única vez con
   `-f docker-compose.bootstrap.yml` y un archivo secreto de 32+ caracteres.
4. Retirar el override y eliminar el archivo tras el primer migrate exitoso.
5. En volúmenes existentes, ejecutar manualmente
   `docker compose --profile database-admin run --rm provision-roles`; los
   scripts init no se reejecutan por sí solos.
6. Ejecutar `migrate`; solo después backend puede iniciar con la URL runtime.

## Riesgos Pendientes

- El usuario autorizó waiver ERP temporal el 2026-07-17 para cerrar la fase y
  preparar la demostración. Los cuatro casos siguen obligatorios antes de
  producción.
- La auditoría integral de exposición de PostgreSQL, HBA y privilegios por tabla
  permanece separada; no fue introducida ni resuelta por esta recuperación.
- Backend, seguridad/RBAC y docs/tests aprobaron el delta; el usuario autorizó
  el commit local. No existe autorización de push.

## Deuda Fuera de Alcance

- `password-status` y la respuesta de login para cuentas pendientes conservan
  diferencias históricas requeridas por el frontend; `forgot-password` sí quedó
  uniforme. Captcha/gating y trabajo bcrypt equivalente quedan para hardening.
- El registro JIT necesita insertar cuentas de rol bajo y la edición de perfil
  mantiene DML runtime sobre campos no privilegiados. El trigger bloquea rol,
  hash, estado, identidad, recuperación, `viaticante` y cualquier eliminación.
- La sincronización ERP aún contiene adaptadores síncronos dentro de rutas async
  y algunos routers legacy concentran lógica de negocio; no fueron introducidos
  por Fase 1P.
- Producción conserva publicación de PostgreSQL/HBA amplio y Redis sin password
  obligatorio. Requiere una fase DevOps coordinada para no cortar acceso remoto.
- La aceptación usa los nombres canónicos de roles; Compose prueba inyección de
  nombres configurables, pero falta una aceptación aislada renombrando los tres.
- `docs/ESQUEMA_BASE_DATOS.md` contiene la tabla de capacidad, junto con cambios
  concurrentes. Sus hunks deben revisarse selectivamente al preparar el commit.

## Documentación Durable

- `ADR-010` fija la separación migrador/runtime.
- `docs/OPERACION_MIGRACIONES_DB.md` documenta roles, objetos críticos y
  cutover; supersede instrucciones históricas incompatibles.
- `docs/GUIA_MANTENIMIENTO.md` exige provisionar/migrar antes de backend.
