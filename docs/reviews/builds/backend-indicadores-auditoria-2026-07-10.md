# Reporte de Revisión Backend — Indicadores y auditoría del sistema

**Fecha:** 2026-07-10
**Build:** `origin/main...origin/indicadores_auditoria_del_sistema`
**Autor del build:** rama remota `indicadores_auditoria_del_sistema`
**Modo:** revisión de plan/build read-only
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Alcance inspeccionado

- Backend y pruebas del diff de triple punto entre `origin/main` y `origin/indicadores_auditoria_del_sistema`.
- Áreas: arquitectura async, modelos/contratos, auditoría e indicadores, inventario, viáticos, auth/rate limiting, PostgreSQL, RBAC y obligaciones de pruebas.
- No se ejecutaron tests ni servicios: el rol de revisión no puede ejecutar Docker y la rama objetivo no está checkout. Solo se hizo inspección Git read-only.

## 2. Decisión

**Backend review: blocked**

El merge no debe avanzar mientras permanezcan los bloqueantes críticos y altos de las secciones 3 y 4.

## 3. Hallazgos bloqueantes

### CRÍTICO-1 — La auditoría acepta identidad declarada por un body no confiable

`backend_v2/app/core/middleware/auditoria_middleware.py` usa `usuario_id`, `empleado_nombre`, `usuario_nombre`, `cargo` y `rol` del JSON cuando no pudo resolver un actor autenticado. Un cliente no autenticado puede atribuir a otra persona eventos de cualquier POST/PUT/PATCH auditable, incluso cuando el endpoint termine en 401/403. Esto invalida la integridad probatoria de la bitácora.

**Gate:** el actor solo puede proceder de `request.state` establecido por auth o de un JWT validado. Nunca del payload. Debe existir prueba negativa de suplantación.

### CRÍTICO-2 — WebSocket de auditoría público y broadcast bloqueante

`backend_v2/app/api/auditoria/router.py` expone `/auditoria/ws/dashboard` sin autenticación ni permiso `auditoria_sistema`. `ws_manager.py` acepta conexiones sin límite y envía secuencialmente, sin timeout. `ServicioAuditoria.registrar()` espera ese broadcast después de cada commit; un cliente lento puede retrasar cada mutación auditada y agotar memoria/conexiones. El estado en memoria tampoco funciona correctamente con múltiples workers.

**Gate:** autenticación y RBAC antes de `accept`, límites de conexiones, timeout/backpressure, desconexión segura y mecanismo multi-worker o eliminación del WS del merge. El registro de auditoría no puede depender de la velocidad del cliente.

### CRÍTICO-3 — Se incorpora un script que borra auditoría append-only

`backend_v2/clear_logs.py` elimina todos los registros de auditoría del módulo viáticos y hace commit sin guardas de entorno, confirmación ni filtro de datos de prueba. Esto contradice el carácter append-only de `auditoria_acciones_usuario` y puede destruir evidencia real. `check_nulls.py` además incorpora conexión `psycopg2` síncrona y credenciales hardcodeadas.

**Gate:** retirar estos scripts del cambio. Cualquier mantenimiento excepcional debe tener diseño, autorización, guardas de entorno, trazabilidad y documentación separados.

### ALTO-1 — Regresión probable del rate limit de login

`backend_v2/app/core/config.py` cambia `5/minute;20/hour` por `5minute;20/hour`. La cadena deja de seguir la sintaxis documentada de SlowAPI/limits y puede fallar al importar/decorar `/auth/login` o dejar el límite inoperante. Es un endpoint obligatorio de rate limiting.

**Gate:** restaurar sintaxis válida y demostrar 5 intentos permitidos + siguiente 429, recuperación del bucket y límites de `setup-password` y `forgot-password`.

### ALTO-2 — Idempotencia de viáticos vulnerable a carrera

`/viaticos/estado-cuenta/auditar-descarga` implementa “buscar y luego insertar” sin constraint único, lock ni manejo de `IntegrityError`. Dos solicitudes concurrentes pueden registrar duplicados dentro de la ventana de 4 h 30 min. La lógica y transacción están directamente en el router, contra `api -> services -> models`.

**Gate:** mover la regla a servicio y hacerla atómica en PostgreSQL (constraint/clave idempotente o lock transaccional bien justificado), con rollback y test concurrente.

### ALTO-3 — Endpoints “fantasma” de inventario sin auth/RBAC ni servicio

Los tres POST `/inventario/auditar-*` retornan 200 públicamente, no declaran usuario actual ni permiso de inventario, no llaman a un servicio y dependen de un efecto lateral del middleware. Esto amplía superficie pública y no garantiza que el evento exista.

**Gate:** auth + RBAC explícitos, contrato y servicio auditables, o eliminación de esos endpoints.

### ALTO-4 — Cobertura de pruebas insuficiente y duplicada

Solo se agregan dos escenarios bajo `testing/backend/`, duplicados también en `backend_v2/`. No hay pruebas para WS, RBAC, inventario, middleware anti-suplantación, filtros/fechas del dashboard, errores/rollback, PII, auth ni concurrencia. Los tests consultan una DB viva completa y uno borra/crea usuarios mediante commits, por lo que no son unitarios, deterministas ni paralelizables. `testing/CATALOGO_PRUEBAS.md` no fue actualizado.

**Gate:** completar la matriz de la sección 6, conservar una sola ubicación canónica y registrar las suites en el catálogo.

## 4. Hallazgos de riesgo alto/medio

1. **Rendimiento de estadísticas (alto):** `ServicioAuditoriaEstadisticas` ejecuta numerosas agregaciones y hasta 50 consultas adicionales N+1 para últimos eventos por módulo. Sin rango obligatorio, escanea todo el historial; varias columnas agrupadas/filtradas no tienen índices específicos. Cada broadcast puede disparar refetches simultáneos.
2. **Privacidad (alto):** los endpoints de viáticos persisten cédula y nombre consultados directamente en JSONB, sin pasar por `ServicioAuditoria.registrar()` ni política de minimización/retención. La lista de enmascarado no cubre cédulas o nombres.
3. **Errores internos (medio):** viáticos devuelve `str(e)` al cliente en HTTP 500; puede revelar SQL o infraestructura. Auth registra cada excepción de token inválido a nivel error, facilitando ruido/log flooding.
4. **Contratos/organización (medio):** los nuevos schemas de estadísticas están dentro del módulo ORM y usan defaults mutables (`[]`, `{}`) en vez de `Field(default_factory=...)`. El servicio retorna `Dict[str, Any]`; conviene un contrato concreto también entre capas.
5. **Calidad del diff (medio):** `git diff --check` falla por espacios finales en numerosos archivos y newline extra. `testing/backend/.env.test` introduce mojibake/BOM en comentarios y mantiene valores sensibles versionados.
6. **Scripts y archivos de prueba fuera de convención (medio):** `backend_v2/conftest.py` duplica `testing/backend/conftest.py`; los tests duplicados en `backend_v2/` quedan fuera de `testpaths` normal, pero pueden recolectarse accidentalmente al indicar paths explícitos.
7. **Escala multi-worker (medio):** el gestor WS en memoria solo notifica clientes conectados al mismo proceso. No garantiza actualización en despliegues con varios workers.
8. **PostgreSQL (positivo con gate):** las consultas nuevas usan construcciones PostgreSQL válidas (`INTERVAL`, `date_trunc`, `to_char`, JSONB ya existente). No se observó cambio estructural de tabla, migración ni blindaje requerido en este diff. Aun así, debe validarse el plan de consultas contra PostgreSQL real.
9. **Límite de archivos:** `servicio_estadisticas.py` tiene 382 líneas y queda bajo 550. Debe verificarse el total final de routers; el cambio incrementa especialmente `api/viaticos/router.py` y profundiza su mezcla de responsabilidades.

## 5. Gates antes del merge

### G0 — Higiene y alcance

- `git diff --check origin/main...origin/indicadores_auditoria_del_sistema` debe terminar sin salida.
- Retirar scripts destructivos/diagnósticos y artefactos duplicados (`clear_logs.py`, `check_*.py`, `check_nulls.py`, tests y conftest fuera de `testing/backend/`).
- No incluir secretos ni credenciales reales; corregir encoding de `.env.test`.

### G1 — Seguridad, RBAC y auth

- Cerrar suplantación del actor en middleware.
- Proteger REST y WS de auditoría con `auditoria_sistema`; proteger endpoints de inventario y viáticos con permisos explícitos acordes al manifiesto existente.
- Validar rate limits de login, setup-password y forgot-password con Redis compartido.
- Confirmar guardas de secretos/defaults en arranque de producción.

### G2 — Arquitectura y transacciones

- Mantener handlers async para DB principal y mover reglas de viáticos/inventario a servicios.
- No introducir acceso sync a PostgreSQL principal. La dependencia ERP sync preexistente debe aislarse de endpoints async o ejecutarse fuera del event loop en una refactorización controlada.
- Hacer atómica la deduplicación y probar `IntegrityError`, rollback e idempotencia concurrente.
- Desacoplar notificación WS del commit y de la latencia HTTP.

### G3 — Modelo, esquema y PostgreSQL

- Confirmar que no hay cambio DDL. Si se añade constraint/índice para idempotencia/rendimiento: migración PostgreSQL reversible, blindaje cuando aplique y actualización de `docs/ESQUEMA_BASE_DATOS.md`.
- Ejecutar `EXPLAIN (ANALYZE, BUFFERS)` en dataset representativo para estadísticas de 1, 7, 30 y 365 días; fijar presupuesto de consultas y latencia.
- Definir timezone y límites válidos (`fecha_desde <= fecha_hasta`, rango máximo).

### G4 — Suite backend obligatoria

- La recolección completa no debe tener errores ni duplicados.
- Deben pasar suites focales nuevas y regresiones de auditoría, inventario, viáticos y auth.
- Deben pasar `test_infrastructure.py` y `test_regresiones.py` sin skips inesperados.
- Actualizar `testing/CATALOGO_PRUEBAS.md` con resultados reales, no estados asumidos.

### G5 — Concurrencia y carga

- Prueba simultánea de deduplicación de viáticos: N solicitudes, exactamente un evento.
- Prueba de WS con conexión no autorizada, permiso revocado, cliente lento, desconexión y límite de conexiones.
- Prueba de dashboard con volumen representativo y varios clientes; sin N+1 ni tormenta de refetch.

## 6. Pruebas backend requeridas

### Auditoría/indicadores

- Happy path, rango vacío, límites inclusivos, rango inválido, timezone, clasificación 400/401/403/409/422/500 y totales consistentes.
- RBAC 401/403/200 para `/eventos`, `/estadisticas` y WS.
- No suplantación por `usuario_id`/`rol` en body; actor siempre derivado del token.
- Enmascarado/minimización de PII y secretos en snapshots/metadatos.
- Fallo de persistencia no rompe operación principal; rollback deja sesión utilizable.
- Presupuesto máximo de queries para estadísticas y dataset grande.

### Inventario

- 401 sin token, 403 sin permiso, 200 con permiso; un único evento por exportación/impresión real.
- Fallo del registro de auditoría y reintento definidos explícitamente.
- Regresión de cargas/plantillas y permisos existentes (`test_inventario_full.py`).

### Viáticos

- PDF/XLSX válidos, tipo inválido, payload mínimo/máximo, usuario inexistente/inactivo y 401.
- Frontera exacta de 4 h 30 min y separación por usuario/tipo/entidad según regla acordada.
- Concurrencia e idempotencia; `IntegrityError` con rollback.
- Metadatos de tercero bajo política de PII; no exposición de excepciones SQL.
- Regresión ERP/estado de cuenta (`test_viaticos.py`, infraestructura).

### Auth

- Parser de límites al importar la app; login 429, setup-password 429 y forgot-password 429.
- Login correcto/incorrecto, lockout, refresh y token malformado sin filtrar secretos ni inundar logs.
- Confirmar que excluir `/auth/refresh` del middleware no elimina evidencia de seguridad requerida.

## 7. Comandos verificables

### Antes del merge

```powershell
git diff --check origin/main...origin/indicadores_auditoria_del_sistema
docker compose exec backend python -m pytest --collect-only testing/backend -q
docker compose exec backend python -m pytest testing/backend/test_auditoria_acciones.py testing/backend/test_auditoria_snapshots_orm.py testing/backend/test_auditoria_stats_fallos.py testing/backend/test_auditoria_descarga_viaticos.py -v
docker compose exec backend python -m pytest testing/backend/test_inventario_full.py testing/backend/test_viaticos.py -v
docker compose exec backend python -m pytest testing/backend/test_auth_rate_limit.py testing/backend/test_auth_refresh.py testing/backend/test_auth_escalation.py -v
docker compose exec backend python -m pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -v
docker compose exec backend python -m pytest testing/backend -v
```

Si se incorpora DDL:

```powershell
docker compose exec backend alembic upgrade head
docker compose exec backend alembic downgrade -1
docker compose exec backend alembic upgrade head
```

### Después del merge en staging

```powershell
docker compose exec backend python -m pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -v
docker compose exec backend python -m pytest testing/backend/test_auditoria_acciones.py testing/backend/test_inventario_full.py testing/backend/test_viaticos.py testing/backend/test_auth_rate_limit.py -v
```

Además: smoke HTTP 401/403/200 para auditoría/inventario/viáticos, conexión WS autorizada/no autorizada, verificación de un solo evento bajo concurrencia y observación de latencia/error rate/pool DB/Redis durante al menos una ventana operativa.

## 8. Comandos ejecutados en esta revisión

- `git status`, `git log`, `git diff`, `git show` sobre el rango solicitado — inspección completada.
- `git diff --check ...` — **FAIL**, múltiples espacios finales/newline extra.
- Tests, Docker y Alembic — **NO EJECUTADOS** por mandato read-only y restricciones del subagente.

## 9. Documentación y RBAC

- `auditoria_sistema`, inventario y viáticos ya tienen entradas relacionadas en el manifiesto, pero deben definirse y probarse los permisos exactos de cada endpoint nuevo y del WS.
- `testing/CATALOGO_PRUEBAS.md` debe registrar las nuevas suites.
- `docs/ESQUEMA_BASE_DATOS.md` no requiere cambio por los schemas de respuesta actuales; sí será obligatorio si la corrección de concurrencia agrega constraint/índice/columna.
- Recomendada una decisión/nota técnica para la arquitectura de eventos multi-worker y política de retención/PII de auditoría.

## 10. Seguimiento mínimo

| Acción | Prioridad | Gate |
|---|---:|---|
| Eliminar identidad desde body y scripts destructivos | Crítica | G0/G1 |
| Autenticar/autorizar y desacoplar WS | Crítica | G1/G2/G5 |
| Restaurar y probar rate limit de login | Alta | G1/G4 |
| Idempotencia atómica de viáticos en servicio | Alta | G2/G3/G5 |
| Proteger/replantear endpoints fantasma de inventario | Alta | G1/G2 |
| Completar matriz de tests y catálogo | Alta | G4 |
| Optimizar consultas/índices con evidencia PostgreSQL | Alta | G3/G5 |
