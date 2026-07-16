# Plan de Ejecución por Fases - Planilla Regional Automática

**Fecha:** 2026-07-16
**Autor:** OpenCode
**Modo:** plan
**Estado RIPER:** PLAN aprobado con riesgos; ejecución bloqueada hasta SHA contractual y autorización de Fase 1P
**Rama:** `Modulo_Geoface`
**SHA base de investigación:** `b210dd49efb690fb99b9fca714e9e007c6405ee4`
**SHA contractual:** pendiente de commit aprobado; debe incluir spec, contratos, ADR y este plan
**Especificación:** `docs/specs/2026-07-15_planilla-regional-automatica.md`
**DDL:** `docs/specs/2026-07-16_planilla-regional-ddl.md`
**Consulta/tabla:** `docs/specs/2026-07-16_planilla-regional-consulta-tabla.md`
**Seguridad operativa:** `docs/specs/2026-07-16_planilla-regional-seguridad-operativa.md`
**Decisión:** `docs/decisions/ADR-009-planilla-regional-item-versionado.md`
**Rerevisión inicial:** `docs/reviews/plans/2026-07-16_planilla-regional-automatica-rerevision.md`

---

## 1. Objetivo

Generar Planilla Regional desde el Planificador, conservar cargas Excel históricas y alimentar con una proyección única las pantallas 1Q/2Q, Tabla Maestra y exportaciones, sin reinterpretar históricos ni exponer PII o salario fuera del alcance autorizado.

## 2. Decisiones Cerradas

1. `RET` y `DXT` históricos conservan sus significados; se crean `RETIRO` y `DEV_TARDANZA` con códigos de salida iniciales `RET`/`DXT`.
2. Tabla Maestra y `exportar-solid` continúan soportados y consumen la proyección combinada.
3. La distribución porcentual se convierte a horas con Decimal en servidor.
4. `.xlsm` continúa soportado sin ejecutar macros, con cuarentena y antimalware fail-closed.
5. `btree_gist` se provisiona fuera del usuario runtime.
6. No habrá commits profundos ni dual-write.
7. La activación es independiente, irreversible y requiere aprobación humana propia.

## 3. Límites de Entrega

- Cada fase empieza y termina verde, tiene diff acotado, reporte de build, revisión y SHA aprobado.
- El fallo rojo TDD se registra antes del código, pero nunca es el estado final de una fase.
- No se incluyen cambios en móvil, tickets, inventario, indicadores ni otros módulos.
- `backend_v2/storage/` usa mount runtime fuera del árbol fuente y nunca se versiona.
- Todo archivo creado o modificado por esta feature termina en máximo 500 líneas (puerta RIPER más estricta); archivos de 550 no se tocan. El reporte conserva conteos.
- Los wrappers 1Q/2Q se reemplazan o reducen; no se amplían temporalmente.
- No se actualiza el esquema documentado con tablas propuestas hasta aplicar realmente el checkpoint expand.
- Entre fases: `REVIEW -> aprobación humana -> commit/SHA -> siguiente fase`.

### RACI por fase

| Fase | R - ejecuta | A - responde/aprueba | C - consultado | I - informado |
|---|---|---|---|---|
| 0 | OpenCode | usuario | revisores obligatorios | equipo técnico |
| 1P | backend/DevOps | usuario | DBA, seguridad, QA | equipo técnico |
| 1A | backend | usuario | DBA, seguridad, QA | DevOps |
| 1B | backend/DBA | usuario | seguridad, QA | Gestión Humana |
| 1C | backend/DBA | usuario | seguridad, QA | DevOps |
| 2 | backend/ERP | usuario | DBA, seguridad, QA | Gestión Humana |
| 3 | backend | usuario | DBA, seguridad, QA | Gestión Humana |
| 4A | backend/DevOps | usuario | DBA, seguridad, QA | Gestión Humana |
| 4B | backend | usuario | DBA, seguridad, QA | frontend |
| 4C | backend/DevOps | usuario | Gestión Humana, seguridad, QA | usuarios afectados |
| 5 | frontend | usuario | seguridad, QA, diseño | usuarios piloto |
| 6 | orquestador/DevOps | usuario final | DBA, seguridad, QA, Gestión Humana | operación |

## 4. Fase 0 - Contrato Versionado

### Alcance

- Spec principal y contratos DDL/consulta.
- ADR-009.
- Plan por checkpoints.
- Exclusión efectiva de storage.
- Grafo AST generado: 4.756 nodos/9.276 aristas; se actualiza antes de EXECUTE si cambia el SHA.
- Rerevisión de scope, backend, frontend, seguridad y docs/tests.

### Puerta de salida

- Todos los revisores aprueban o dejan solo riesgos no bloqueantes.
- `git diff --check` pasa y cada documento queda bajo 500 líneas.
- Stage/commit contractual usa allowlist: `.gitignore`, spec principal, tres contratos 2026-07-16, ADR-009, plan/rerevisiones Planilla; excluye memoria y reportes ajenos.
- El usuario autoriza commit; el SHA resultante se registra en la rerevisión/evidencia de Fase 0, sin editar autorreferencialmente este plan.
- El usuario autoriza explícitamente iniciar Fase 1P.

## 5. Fase 1P - Migraciones Fuera del Runtime

### Pruebas rojas antes del código

- Crear `testing/backend/test_startup_migration_roles.py`; startup con runtime sin DDL falla hoy y migraciones/seeds/RBAC escriben desde runtime.
- Dos jobs migradores, job fallido y verify-only sobre esquema incompleto.

### Allowlist de archivos

- `backend_v2/app/main.py`
- `backend_v2/app/core/migrations/manager.py`
- `backend_v2/app/services/auth/rbac_discovery.py`
- módulo nuevo de job/verify y Compose/perfiles de migración
- tests de infraestructura/startup; otros módulos solo si el inventario documenta una mutación concreta y scope aprueba

### Implementación

1. Inventariar DDL, saneamientos, seeds, bootstrap admin y escrituras RBAC de startup.
2. Crear perfil/job `migrate` con secreto `gestor_migrador`; runtime no recibe esa credencial.
3. Mover todas esas mutaciones al job manteniendo orden/idempotencia; eliminar password bootstrap predecible.
4. Convertir startup runtime a verify-only de esquema/RBAC y error saneado/fail-closed.
5. Provisionar owner/migrador/runtime y comprobar grants reales.

### Puerta verde

- Stack arranca con runtime sin DDL después de ejecutar job.
- Esquema incompleto bloquea runtime y se corrige solo mediante job.
- Suites globales de infraestructura/regresión pasan; reporte rojo/verde, revisión, aprobación DBA/usuario y SHA.

## 6. Fase 1A - Expand Inactivo

### Pruebas rojas antes del código

- Crear `testing/backend/test_planilla_regional_migracion.py`.
- Fallos esperados: objetos ausentes, schema parcial sin reparar, all-or-none ausente, mutación ITEM, columnas OT en float, activación inválida y vigencias de códigos solapadas.
- Registrar comando, entorno y salida roja en reporte de build.

### Archivos previstos

- `backend_v2/app/core/migrations/planilla_regional_migration.py`
- `backend_v2/app/core/migrations/manager.py`
- `backend_v2/app/models/novedades_nomina/planilla_regional.py`
- `backend_v2/app/models/novedades_nomina/planificador_dia_ot.py`
- `backend_v2/app/models/novedades_nomina/schemas_horas_extras_planificador.py`
- `backend_v2/app/services/novedades_nomina/seed_horas_extras.py`
- job/script de migración de despliegue y Compose; startup queda en modo verify-only

### Implementación

1. Provisionar roles owner/migrador/runtime por DBA y ejecutar migración fuera del startup.
2. Verificar `btree_gist` sin instalarlo.
3. Crear objetos/columnas de dominio, funciones y triggers seguros del registro global/configuración/códigos; no crear auditoría ni habilitar triggers consumidores.
4. Convertir columnas OT mediante columnas sombra y swap verificado; schemas usan Decimal.
5. Insertar `RETIRO` y `DEV_TARDANZA` sin mutar `RET`, `DXT` ni eventos.
6. Mantener `activada=false`; manager/startup solo verifica y no ejecuta backfill ni DDL.

### Puerta verde

- Doble ejecución y esquema parcial convergen.
- Ausencia de `btree_gist` falla sin dejar objetos parciales.
- El despliegue no cambia respuestas ni escritores actuales.
- Pruebas focales, infraestructura y regresiones pasan.
- Runtime no posee DDL ni puede alterar triggers; revisión, aprobación humana y SHA de Fase 1A.
- Reporte conserva comando/entorno/salida roja previa y salida verde final.

## 7. Fase 1B - Backfill Reanudable

### Pruebas rojas antes del código

- Interrupción/reanudación, dos workers, lotes parciales, hash canónico y `setval` monotónico.
- Carga `PARCIAL` no archiva ausentes; `REEMPLAZO_COMPLETO` sí lo hace tras confirmación.

### Archivos previstos

- migración/servicio de backfill dedicado
- tabla `nomina_planilla_regional_migracion_checkpoint`
- `testing/backend/test_planilla_regional_legacy.py`

### Implementación

1. Procesar rangos de PK con checkpoint confirmado por lote.
2. Inventariar crudo recuperable; calcular hashes CRUDA o fallback no reconciliable sin bloquear ITEM.
3. Reservar ITEM con `INSERT ... RETURNING` bajo advisory lock.
4. Ajustar secuencia sin disminuirla.
5. Registrar métricas sin PII y permitir forward-fix reanudable.

### Puerta verde

- Reanudar no duplica ITEM ni cambia hashes.
- Dos backfills concurrentes convergen.
- Volumen, WAL, duración y rollback/forward-fix quedan documentados.
- Revisión, aprobación humana y SHA de Fase 1B.
- Reporte conserva evidencia roja/verde y conteos `CRUDA|PERSISTIDA_NO_RECONCILIABLE` sin PII.

## 8. Fase 1C - Validate

### Pruebas rojas antes del código

- FK `NOT VALID`, validación por separado, índices, triggers consumidores y versión duplicada.

### Implementación

1. Crear índices concurrentes fuera de transacción cuando el volumen lo exija.
2. Agregar y validar constraints por objeto.
3. Habilitar inmutabilidad de ITEM en tablas consumidoras; el registro global ya quedó protegido en expand.
4. Coordinar índices concurrentes con advisory lock de sesión en conexión autocommit.
5. Verificar definiciones exactas en `pg_catalog` y blindaje estructural.

### Puerta verde

- UPDATE/DELETE del registro global y reasignación en consumidores fallan.
- Identidad/versión duplicada y autorreemplazo fallan.
- Reinicio de backend verifica sin reparar silenciosamente definiciones incompatibles.
- Revisión, aprobación humana y SHA de Fase 1C.
- Reporte conserva evidencia roja/verde y definiciones `pg_catalog`.

## 9. Fase 2 - Dominio y ERP

### Pruebas rojas antes del código

- Crear `test_planilla_regional_dominio.py` y `test_planilla_regional_erp.py`.
- Casos: medianoche, 15/16, 31/1, vigencias, Decimal, porcentaje, fallback CC, datos ausentes, una consulta bulk, TLS/read-only/privilegios y cierre de recursos.

### Archivos previstos

- `planilla_regional_clasificador.py`
- `planilla_regional_prorrateo.py`
- `planilla_regional_generador.py`
- `services/erp/planilla_regional_erp.py`
- `backend_v2/app/services/novedades_nomina/planilla_regional_settings.py`
- `.env.example` y Compose de despliegue

### Implementación

1. Segmentar intervalos en medianoche antes de resolver fecha.
2. Convertir porcentajes a horas con Decimal y residuo determinista.
3. Resolver contrato/OT en una consulta bulk allowlisted.
4. Crear `PlanillaRegionalSettings` como SSOT aislado y factory ERP local; no instanciar configuraciones globales ni usar fallback.
5. Verificar TLS, `current_user`, `transaction_read_only` y ausencia de DML/DDL en producción.
6. Generar objetos de dominio con snapshots completos, todavía sin persistirlos. Settings crea primero campos ERP/entorno; seguridad extiende el mismo modelo en 4A.

### Puerta verde

- Clasificación y snapshots en memoria son deterministas.
- Cambiar fuentes después no altera el resultado ya generado.
- `test_infrastructure.py` valida la DSN dedicada.
- Revisión, aprobación humana y SHA de Fase 2.
- Reporte conserva evidencia roja/verde.

## 10. Fase 3 - Persistencia y Transacciones

### Pruebas rojas antes del código

- Completar `test_planilla_regional_persistencia.py`.
- Casos independientes: guardar, confirmar, pagar, compensar, anular, fallo intermedio, carrera, replay y corrección oficial.

### Archivos previstos

- `planilla_regional_persistencia.py`
- `planificador_persistencia.py`
- `planificador_costos_ot.py`
- servicios de confirmación y workflow

### Implementación

1. Extraer hooks `*_sin_commit`.
2. Retirar commits profundos de todo el grafo.
3. Aplicar advisory lock y savepoint por empleado.
4. Salir/rollback del savepoint antes de releer tras `IntegrityError`.
5. Persistir snapshots generados en Fase 2 y transicionar estados atómicamente.

### Puerta verde

- Una carrera produce un solo ITEM lógico.
- Cada fallo revierte horario, costos OT, cálculo y fila; integración de auditoría dedicada se prueba después en Fase 4A.
- Búsqueda estática y pruebas confirman ausencia de commits internos.
- Revisión, aprobación humana y SHA de Fase 3.
- Reporte conserva evidencia roja/verde.

## 11. Fase 4A - Fundaciones de Seguridad

### Pruebas rojas antes del código

- Crear `testing/backend/test_planilla_regional_seguridad_operativa.py` para auditoría HMAC/kid, rate limit, storage, cuarentena, antimalware, ZIP hostil y permisos no asignados.
- Incluir bordes 31/32 bytes, límites ±1 y ciclo nominal de servicios de auditoría/archivo limpio sin depender aún de rutas HTTP.

### Archivos previstos

- migración, modelo y servicio de auditoría Planilla Regional
- `backend_v2/app/core/rbac_manifest.py`
- `backend_v2/app/core/auditoria_manifest.py`
- `planilla_regional_settings.py`
- `.gitignore`, `.env.example` y Compose
- Dockerfile/servicio worker aislado y servicio de cuarentena/escaneo

### Implementación

1. Registrar siete permisos, inicialmente solo para admin.
2. Crear esquema/servicio de auditoría por eventos, función SECURITY DEFINER y firma con keyring; mantener middleware genérico sin cambios.
3. Crear buckets independientes y fail-closed Redis.
4. Montar `/var/lib/gestor/planilla-regional` fuera del source tree con permisos contractuales.
5. Implementar cuarentena y worker aislado con escaneo, retención, cuotas y límites contractuales.
6. Agregar rol owner/función de auditoría sobre la base de roles ya provisionada; preparar matriz RBAC y auto-discovery fail-closed.

### Puerta verde

- Ninguna ruta cambia aún de autorización.
- Auditoría verifica después de rotación y no contiene PII.
- Archivos hostiles fallan antes de parsear; storage no aparece en Git.
- Antimalware y Redis están disponibles en el entorno objetivo.
- Revisión, aprobación humana y SHA de Fase 4A.
- Reporte conserva evidencia roja/verde y preflight `development|pruebas3|production|test`; auditoría dedicada permanece dormida.

## 12. Fase 4B - Proyección y API Nueva

### Pruebas rojas antes del código

- Crear suites de consulta, faceta, cursor, configuración y exportación nueva detrás de feature flag desactivado.
- Incluir límites 1/100/101, 50/51 y 50.000/50.001 y performance con 50.000 filas.

### Archivos previstos

- `planilla_regional_consulta.py`
- `planilla_regional_exportacion.py`
- `backend_v2/app/models/novedades_nomina/schemas_planilla_regional.py` como SSOT Pydantic de fila, consulta, faceta, exportación, configuración, códigos, manifiesto y confirmación
- router dedicado de Planilla Regional

### Implementación

1. Crear relación acotada por alcance para legacy/automático activos.
2. Implementar backend `/consultar`, `/faceta`, exportación y cursores firmados con DTOs canónicos.
3. Proteger rutas nuevas con require-all y mantener feature flag desactivado salvo admin de prueba.
4. Devolver salario/base hora en `null`, omitir agregados monetarios y bloquear filtros salariales sin permiso.
5. Medir consulta, facetas y cursores con fixture de 50.000 filas.

### Puerta verde

- DTO Pydantic/OpenAPI queda congelado para espejo TypeScript.
- `set()` devuelve cero; facetas/agregados/exportación no observan fuera de alcance.
- Performance backend y cursores concurrentes cumplen presupuesto.
- Revisión, aprobación humana y SHA de Fase 4B.
- Reporte conserva evidencia roja/verde; flag sigue desactivado.

## 13. Fase 4C - Legacy, Tabla Maestra y Cutover de Seguridad

### Pruebas rojas antes del código

- Crear `test_planilla_regional_tabla_maestra.py`, `test_planilla_regional_http_security.py`, pruebas de manifiesto durable y matriz completa 401/403/404.
- Cubrir recarga parcial/completa, dos workers, expiración, aliases, archivos fuera de alcance, cero auditoría duplicada y categorías ajenas sin regresión.

### Archivos previstos

- reutilizar schemas de manifiesto/confirmación del SSOT Pydantic congelado en 4B
- `tabla_maestra_service.py` y `routers/tabla_maestra.py`
- `nomina_service.py`, `nomina_router.py` y extractores 1Q/2Q
- dependencias category-aware/require-all
- `backend_v2/app/core/middleware/auditoria_middleware.py`

### Implementación

1. Implementar manifiestos durables, preview sin escritura y confirmación atómica.
2. Aplicar proyección canónica a Tabla Maestra/Solid y allowlist versionada.
3. Aplicar permisos solo a ramas Planilla y excepciones dedicadas.
4. Desplegar soporte dual en modo GENERICA, drenar versiones antiguas y cambiar SSOT DB a DEDICADA; cada request fija modo compartido por middleware/endpoint.
5. Aplicar matriz de roles aprobada, rate limits, cuarentena y 404 uniforme.

### Puerta verde

- Tabla Maestra/Solid cumplen shape, alcance y estados.
- Toggle concurrente y versiones mixtas compatibles generan exactamente un flujo; gate impide cutover con instancia antigua.
- Categorías ajenas conservan contrato; pruebas de bypass compartido pasan.
- Revisión, aprobación humana y SHA; flag permanece desactivado hasta Fase 6.
- Reporte 4C conserva comando, entorno, SHA, salida roja previa y salida verde final.

## 14. Fase 5 - Frontend Compartido

### Pruebas rojas antes del código

- Crear suites de servicio, hook, vista, rutas y `FilterDropdown` accesible.
- Fallos esperados: filtros no serializados, carreras, guardas inexistentes, foco/ARIA incompleto y tabla no semántica.

### Archivos previstos

- `frontend/src/services/planillaRegionalService.ts`
- `frontend/src/types/generated/planillaRegional.ts` generado desde OpenAPI y script/check reproducible
- carpeta `NOVEDADES_NOMINA/PlanillaRegional/`
- wrappers 1Q/2Q
- `frontend/src/config/api.ts`
- `ConfiguracionHorasExtrasView.tsx` o componente extraído para códigos/activación
- `ServicePortal.tsx` y `NominaDashboard.tsx`
- `TablaMaestraView.tsx` y `NominaSummaryView.tsx` para acciones dedicadas
- `ProtectedRoute.tsx` o helper `RequireAllPermissions`
- `Button.tsx`, extracción de `FilterDropdown.tsx` y su prueba focal
- `Modal.tsx` para soportar `initialFocusRef` verificable
- nuevas primitivas semánticas Table/Pagination del sistema de diseño
- `AppContext.tsx`/`useServicePortal.ts`/hook de permisos para revalidación fail-closed
- Playwright/Chromium, script y fixture de viewport/portal
- `frontend/playwright.config.ts`, `frontend/e2e/planilla-regional.spec.ts`, `package.json` y lockfile

### Implementación

1. Generar TypeScript desde OpenAPI congelado y hacer fallar CI si el artefacto cambia; cubre nullability, enums, BIGINT string y errores.
2. Separar AbortController y secuencia last-request-wins por canal.
3. Extraer rutas Nómina de `ServicePortal` y trigger/contenido/hook de `FilterDropdown` antes de agregar comportamiento; cada archivo queda <=500.
4. Implementar tabla semántica de 22 columnas sin ampliar `DataTable.tsx`.
5. Corregir ARIA, teclado, foco y tokens de `FilterDropdown`.
6. Aplicar guardas de ruta, tarjeta y acciones desde un SSOT require-all.
7. Implementar exportación `{blob, filename}` con limpieza en `finally`.
8. Invalidar filas/resumen/faceta tras carga legacy.
9. Implementar siete columnas móviles, offsets sticky, portal sin recorte y selector accesible.

### Puerta verde

- Vitest cubre filtros, facetas, cursores con inserciones, carreras invertidas, matriz require-all, permisos en sesión, portal, exportación, teclado y responsive.
- Playwright/React Profiler cumple viewports/portal y commit React <200 ms; p95 API ya quedó cerrado en 4B.
- Lint focal limpio; global sin errores nuevos sobre baseline.
- Build Vite y ambas rutas pasan.
- Revisión frontend, seguridad, docs/tests y scope; aprobación humana y SHA.
- Reporte conserva evidencia roja/verde, conteos <=500 y suite frontend completa.

## 15. Fase 6 - Despliegue Desactivado y Activación

1. Ejecutar suites focales, infraestructura, regresiones, frontend y auditoría incremental.
2. Ejecutar `scripts/sync_docs.py` y verificar contenido generado.
3. Actualizar esquema/MER, catálogo, bitácora, walkthrough y reporte final.
4. Desplegar con `activada=false` y ejecutar smoke tests.
5. Verificar ERP read-only, extensión, storage, antimalware, Redis y keyring.
6. Verificar gate técnico de hardening global/aislamiento shared-routes; sin evidencia `/activar` debe responder 409.
7. Solicitar aprobación humana específica para fecha futura 1/16.
8. Registrar SHA desplegado, habilitar flag/cutover y activar una vez; verificar 1Q/2Q, Tabla Maestra, Solid y auditoría.

### Puerta verde

- Todos los revisores aprueban.
- Existe forward-fix, monitoreo, alertas y responsable operativo.
- Activación tiene evidencia y aprobación humana separadas.

## 16. Matriz TDD Nominal

| Suite | Casos mínimos nombrados |
|---|---|
| migración | doble ejecución, definición incompatible, all-or-none legacy, extensión ausente, dos migradores, reanudación, setval, ITEM consumidor, RET/DXT |
| legacy | hash canónico, parcial, reemplazo completo, idéntica, modificada, ausente, solape activación |
| dominio | medianoche, 15/16, 31/1, vigencias, porcentaje, residuos, conceptos diarios |
| ERP | sin fallback, TLS, current_user, read-only, sin DML/DDL, bulk único, timeout, cierre, datos ausentes |
| persistencia | replay, cambio identidad, corrección oficial, carrera, guardar/confirmar/pagar/compensar/anular rollback |
| Tabla Maestra | disponibilidad oficial, mapeo valor cero, agregación, legacy/automático, inactivos, alcance |
| seguridad | auth category-aware, require-all, salario, facetas, 404 uniforme, eventos HMAC, rotación, rate limits, ZIP/XLSM limpio/hostil |
| exportación | mismos filtros, 20 columnas, 50.000 filas, headers, fórmulas, limpieza, auditoría fail-closed |
| frontend | JSON exacto, faceta truncada, cursores, last-request-wins, ruta/tarjeta/acciones, permisos en sesión, foco/ARIA/portal, móvil |
| contrato DTO | Pydantic/OpenAPI vs TypeScript: nombres, nullability, enums, BIGINT string y errores |

Cada caso se convierte en nombre de test explícito al iniciar su fase y se registra en `testing/CATALOGO_PRUEBAS.md` al quedar verde.

## 17. Comandos de Validación

- `docker compose run --rm -T -v "${PWD}:/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2 backend pytest testing/backend/test_planilla_regional_*.py -q`
- `docker compose run --rm -T -v "${PWD}:/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2 backend pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -q`
- `docker compose exec -T frontend npm run test -- --run src/tests/planillaRegionalService.test.ts src/tests/usePlanillaRegional.test.tsx src/tests/PlanillaRegionalView.test.tsx src/tests/PlanillaRegionalRoutes.test.tsx src/components/molecules/__tests__/FilterDropdown.test.tsx`
- `docker compose exec -T frontend npm run lint`
- `docker compose exec -T frontend npm run build`
- `docker compose exec -T frontend npm run test -- --run`
- `docker compose exec -T frontend npm run test:e2e -- planilla-regional`
- `python scripts/sync_docs.py`
- `python -m auditoria --incremental --no-ui`

## 18. Checklist Atómico

1. [ ] Aprobar y versionar Fase 0; fijar SHA contractual.
2. [ ] Ejecutar/revisar/versionar Fase 1P migrador/runtime.
3. [ ] Ejecutar/revisar/versionar Fase 1A expand.
4. [ ] Ejecutar/revisar/versionar Fase 1B backfill.
5. [ ] Ejecutar/revisar/versionar Fase 1C validate.
6. [ ] Ejecutar/revisar/versionar Fase 2 dominio/ERP.
7. [ ] Ejecutar/revisar/versionar Fase 3 transacciones.
8. [ ] Ejecutar/revisar/versionar Fase 4A seguridad.
9. [ ] Ejecutar/revisar/versionar Fase 4B API nueva.
10. [ ] Ejecutar/revisar/versionar Fase 4C legacy/cutover.
11. [ ] Ejecutar/revisar/versionar Fase 5 frontend.
12. [ ] Desplegar Fase 6 desactivada.
13. [ ] Aprobar activación.
14. [ ] Activar y verificar.

## 19. Puerta RIPER

No se crearán pruebas ni código de aplicación hasta que este contrato resulte aprobado y el usuario autorice explícitamente iniciar Fase 1P. Al iniciar EXECUTE se crea `task.md`; cada fase vuelve a REVIEW antes de continuar.
