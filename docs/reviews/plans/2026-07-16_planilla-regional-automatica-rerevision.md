# Reporte de Rerevisión de Plan

**Fecha:** 2026-07-16
**Estado:** Supersedido por `2026-07-16_planilla-regional-automatica-aprobacion-final.md`
**Plan:** Planilla Regional automática desde el Planificador
**Plan revisado:** `implementation_plan.md` y `docs/specs/2026-07-15_planilla-regional-automatica.md`
**Modo:** plan
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Objetivo

Revalidar el plan antes de iniciar la implementación de la Planilla Regional automática, contrastándolo con el backend, frontend, RBAC, flujos legacy, pruebas y estado real de la rama `Modulo_Geoface`.

## 2. Estado Actual

- No existe implementación automática ni suites `test_planilla_regional_*`.
- El código actual conserva extractores y vistas manuales separadas para 1Q/2Q.
- `implementation_plan.md` está ignorado por Git; el contrato versionado disponible es la especificación.
- El reporte del 15 de julio quedó como `aprobado_con_riesgos`, pero esta rerevisión encontró bloqueantes no documentados.
- La rama incluye cambios de múltiples módulos no relacionados; el build debe fijar un SHA base y limitar cada entrega a Planilla Regional.

## 3. Hallazgos Bloqueantes

### 3.1 RET y DXT reinterpretan históricos

La especificación cambia en sitio `RET` de retardo a retiro y `DXT` de descanso por tratamiento a devuelto por tardanza (`docs/specs/2026-07-15_planilla-regional-automatica.md:300-302`). Los eventos existentes guardan el código, pero no un snapshot de su semántica (`backend_v2/app/models/novedades_nomina/horas_extras_novedad_evento.py:35-53`).

Antes de migrar se debe adoptar una de estas estrategias:

- versionar o renombrar los códigos legacy;
- persistir la semántica histórica por evento;
- o bloquear la migración cuando existan eventos pendientes de remediación.

### 3.2 Tabla Maestra no consumiría filas automáticas

La tabla nueva solo se incorpora a la consulta regional prevista. Tabla Maestra determina disponibilidad y consolidación desde `nomina_registros_normalizados` (`backend_v2/app/services/novedades_nomina/tabla_maestra_service.py:28-67,113-179`). Al bloquear la carga manual después de activar la generación automática, Tabla Maestra marcaría el período como incompleto y omitiría las filas nuevas.

Se requiere una proyección combinada reutilizable por:

- consulta regional;
- Tabla Maestra;
- exportación oficial;
- y `exportar-solid`, si este flujo continúa vigente.

### 3.3 DDL no idempotente y extensión privilegiada

El contrato exige migración idempotente, pero crea las tablas de configuración y códigos sin `IF NOT EXISTS` (`docs/specs/2026-07-15_planilla-regional-automatica.md:227-250`). También intenta crear `btree_gist` desde el usuario runtime (`:237`).

La migración debe:

- validar objetos y constraints en `pg_catalog`;
- soportar doble ejecución y esquema parcial;
- verificar `btree_gist` en startup, no instalarlo con el rol de aplicación;
- definir backfill por fases, índices concurrentes o ventana de mantenimiento.

### 3.4 Frontera transaccional incompleta

El plan declara un único propietario de `commit`/`rollback`, pero el grafo actual conserva un `commit()` profundo en `backend_v2/app/services/novedades_nomina/planificador_costos_ot.py:103`, invocado durante confirmación desde `planificador_persistencia.py:235-271`.

El plan debe inventariar todos los callees transaccionales y fijar el patrón para concurrencia:

1. `begin_nested`.
2. `flush`.
3. Captura de `IntegrityError` después de revertir el savepoint fallido.
4. Relectura de la versión ganadora bajo lock.
5. `commit` o `rollback` solo en el orquestador exterior.

### 3.5 Bypass salarial y autorización legacy ambigua

La matriz propuesta no exige `salario.consultar` en todos los endpoints que pueden devolver salario, base hora o totales monetarios (`docs/specs/2026-07-15_planilla-regional-automatica.md:408,421-429`). Varias rutas legacy tampoco tienen una dependencia global de autenticación (`backend_v2/app/api/novedades_nomina/nomina_router.py:29-66,267-333`).

Se debe definir:

- permiso base para todas las rutas de Novedades de Nómina;
- resolución category-aware desde una allowlist canónica, no desde categoría controlada por el cliente;
- redacción backend de salario y totales sin permiso salarial;
- `require-all` para exportación, preview y descarga de originales;
- alcance aplicado antes de filas, búsquedas, facetas, resumen y exportación.

### 3.6 Auditoría puede almacenar PII y falla abierta

El middleware actual captura cuerpos POST y puede registrar `busqueda`, nombres o cédulas no reconocidas por el redactor (`backend_v2/app/core/middleware/auditoria_middleware.py:54-205`; `backend_v2/app/services/auditoria/servicio.py:15-46`). Los fallos de auditoría son absorbidos.

Planilla Regional requiere auditoría dedicada con DTO allowlisted, sin cuerpo crudo, trigger append-only y política fail-closed para exportación, carga, configuración y denegaciones críticas. La rotación HMAC debe definir clave actual/anterior, identificador de clave, canonicalización, algoritmo y campos protegidos.

### 3.7 Contrato frontend insuficiente

El API solo define filtros multivalor para cinco campos, pero la UI promete filtros por columna en 22 columnas (`docs/specs/2026-07-15_planilla-regional-automatica.md:350-386,445-451`). Faltan semántica de autoexclusión de facetas, truncamiento, conservación de seleccionados y canales independientes para consulta y facetas.

También faltan guardas frontend concretas para:

- consultar;
- cargar;
- exportar con intersección de tres permisos;
- mostrar salario;
- filtrar tarjetas y navegación según permisos efectivos.

`FilterDropdown` debe corregir nombre accesible, asociación del popover, foco y navegación por teclado antes de reutilizarse en esta tabla.

### 3.8 Plan y rama no tienen una unidad de entrega segura

El checklist mezcla migración, backfill, ERP, refactor transaccional, hardening legacy, UI y activación irreversible. La rama contiene además cientos de archivos ajenos al módulo. No debe ejecutarse como una sola entrega.

Fases mínimas requeridas:

1. Baseline y preservación RET/DXT.
2. Esquema inactivo y migración idempotente.
3. Dominio puro, ERP read-only y snapshots OT/CC.
4. Integración transaccional con Planificador.
5. Consulta combinada, Tabla Maestra, RBAC y legacy.
6. Frontend compartido 1Q/2Q.
7. Despliegue y activación con aprobación humana separada.

Cada fase necesita pruebas rojas/verdes, revisión de build y un diff acotado desde un SHA base declarado.

## 4. Correcciones Altas Requeridas

- Definir clave legacy canónica como hash estable previo al enriquecimiento ERP; `VARCHAR(180)` no cubre el dominio actual.
- Añadir DDL explícito para snapshots OT/CC, `cliente`, discriminador y valores `NUMERIC`/`Decimal`.
- Decidir si la distribución porcentual existente se rechaza o se convierte determinísticamente a horas.
- Segmentar físicamente jornadas que cruzan medianoche antes de clasificar quincena, vigencia y activación.
- Blindar ITEM con trigger inmutable, unicidad de identidad más versión y `reemplaza_item <> item`.
- Aislar cargas XLSX/XLSM con lectura por chunks, límites ZIP, presupuesto de memoria/CPU y política frente a macros.
- Definir una única ubicación para `planillaRegionalService.ts`; la arquitectura del proyecto favorece `frontend/src/services/`.
- No ampliar `DataTable.tsx`, `PlanificadorSemanalView.tsx` ni los previews actuales que están en el límite de 550 líneas.

## 5. Evidencia y Pruebas Faltantes

- Doble ejecución y dos migradores concurrentes sobre esquema parcial.
- Preservación de eventos históricos RET/DXT.
- Tabla Maestra con automático, legacy activo/inactivo y períodos posteriores a activación.
- Rollback conjunto de horario, costos OT, cálculo y Planilla Regional sin commits profundos.
- Cruces 15/16 y fin/inicio de mes con quincena, vigencias y redondeo.
- Recarga legacy idéntica, modificada y ausente con ITEM estable/versionado.
- Matriz HTTP completa de autenticación, permisos, salario y alcance.
- Exportación con 20 columnas, filtros idénticos, límites, rate limit, fórmulas y auditoría sin PII.
- Frontend con pruebas nominales para los doce comportamientos descritos en el plan.

No se ejecutaron pruebas de Planilla Regional porque las suites previstas todavía no existen.

## 6. Matriz de Subagentes

```text
Subagente | Resultado | Bloquea
----------|-----------|--------
scope-reviewer | blocked | sí
backend-reviewer | blocked | sí
frontend-reviewer | blocked | sí
docs-tests-reviewer | blocked | sí
security-rbac-reviewer | blocked | sí
mobile-reviewer | no aplica mientras móvil permanezca fuera del diff | no
```

## 7. Decisión Final

- [ ] `aprobado`
- [ ] `aprobado_con_riesgos`
- [x] `bloqueado`

La aprobación humana RIPER no debe solicitarse de nuevo hasta corregir primero la especificación y convertir el plan en fases desplegables. No se autoriza todavía modificar código de aplicación.
