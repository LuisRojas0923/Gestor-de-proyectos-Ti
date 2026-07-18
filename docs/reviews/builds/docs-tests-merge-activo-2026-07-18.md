# Revisión docs/tests — merge activo staged/unstaged — 2026-07-18

**Estado:** `blocked`

**Alcance:** RBAC, uploads, rate limiting, ERP async, persistencia y concurrencia de cooperativas, facturas de líneas corporativas, auditoría PII, frontend y arnés Antigravity/OpenCode.

## Evidencia inspeccionada

- Se revisaron por separado el índice, el working tree y los archivos no rastreados. El índice contiene 118 archivos y el working tree añade 23 archivos modificados más cuatro archivos funcionales no rastreados y `uploads/`.
- Recolección ejecutada por este revisor:

```text
python -m pytest --collect-only testing/backend/test_actividad_archivos.py testing/backend/test_cooperativas_archivos_seguridad.py testing/backend/test_cooperativas_persistencia.py testing/backend/test_beneficiar_prima.py testing/backend/test_grancoop_nombre_matching.py testing/backend/test_erp_empleados_service.py testing/backend/test_lineas_corporativas.py testing/backend/test_lineas_corporativas_seguridad.py testing/backend/test_lineas_corporativas_facturas.py testing/backend/test_auditoria_acciones.py testing/agent_harness/test_validate_antigravity_harness.py -q
135 tests collected in 13.08s
```

- Desglose recolectado: evidencias WBS 10; cooperativas 40; ERP empleados 14; líneas corporativas/facturas 34; auditoría 15; arnés 22.
- `--collect-only` confirma importación y descubrimiento, **no** confirma que los casos pasen.
- Evidencia histórica revisada: WBS 10 backend y 6 frontend; PR14 30 backend, 27 auditoría y 16 frontend; PR15 27 backend; arnés 22 pruebas y 9 adaptadores. Esos resultados anteceden o no incluyen todo el delta unstaged actual.

## Hallazgos por severidad

### ALTO 1 — La persistencia de uploads de cooperativas no está cerrada para producción

`persistencia_cooperativas.py:16-49` escribe en la ruta relativa `uploads/nomina`. Desarrollo monta `./backend_v2/uploads:/app/uploads` (`docker-compose.yml:122-125`), pero producción solo monta `/app/storage/attachments` y biometría (`docker-compose.prod.yml:142-145`). Por tanto, los archivos de cooperativas quedan en la capa efímera del contenedor productivo salvo una configuración externa no documentada.

Además, existe `uploads/nomina/<hash>.txt` no rastreado y `/uploads/` no está cubierto por `.gitignore`. No debe entrar al merge ni conservar posibles datos operativos como artefactos del repositorio.

**Bloqueo:** definir y probar almacenamiento persistente productivo para nómina, documentar backup/retención/limpieza y excluir artefactos locales.

### ALTO 2 — La concurrencia de cooperativas y facturas solo se comprueba con mocks

- `test_cooperativas_persistencia.py:31-46` verifica que el SQL contiene `pg_advisory_xact_lock`, pero no ejecuta dos sesiones PostgreSQL ni prueba serialización, rollback o resultado final.
- `test_lineas_corporativas_facturas.py:11-43` solo verifica orden de tres llamadas, período vacío y propagación de error. No demuestra importación endpoint-level, reemplazo idempotente ni dos importaciones concurrentes del mismo período.
- El catálogo describe “reemplazo idempotente” para facturas (`testing/CATALOGO_PRUEBAS.md:29`) sin una prueba que compruebe el estado final de detalle/resumen.
- La escritura física de cooperativas ocurre antes del advisory lock y del commit DB (`persistencia_cooperativas.py:45-49`; routers de Beneficiar/Grancoop), pero no hay prueba de limpieza o reconciliación cuando falla la transacción.

**Bloqueo:** añadir carreras reales con dos `AsyncSession` PostgreSQL y pruebas endpoint-level de éxito/error/rollback/idempotencia para ambos módulos.

### ALTO 3 — Los rate limiters nuevos no tienen cobertura de 429 ni aislamiento de bucket

WBS configura `RATE_LIMIT_ACTIVIDAD_ARCHIVO` y cooperativas añade `5/minute`, pero no existe ninguna prueba que consuma el límite y observe `429`. La búsqueda focal no encontró casos de rate limit para WBS, Beneficiar o Grancoop. Los tests HTTP actuales deshabilitan el limiter donde aplica.

El reporte PR15 afirma que el rate limit fue validado, pero su evidencia automatizada de 27 casos no contiene un escenario 429. Tampoco se comprueba clave por actor/IP, separación entre endpoints ni backend Redis/multiworker.

**Bloqueo:** pruebas 429 para los tres endpoints, reset determinista del limiter y al menos una prueba que fije la clave/bucket esperado.

### ALTO 4 — La evidencia verde y los estados `PASSED` no corresponden al árbol final

- El delta unstaged agrega wrappers ERP async, persistencia cooperativa, advisory lock de facturas, redacción adicional de línea, cambios frontend y tests nuevos después de los reportes focales disponibles.
- `testing/CATALOGO_PRUEBAS.md` marca Facturas, Seguridad Cooperativas, ERP, frontend y arnés como `PASSED`; para el árbol final solo se reprodujo colección.
- PR15 registra 27 casos, mientras el alcance cooperativas vigente recolecta 40. PR14 registra 16 frontend, pero las suites corporativas vigentes incorporan casos posteriores. El reporte del arnés registra 9 adaptadores, mientras el árbol actual contiene 11 adaptadores Antigravity.
- No hay salida final de pytest, Vitest, typecheck, build, lint focal, infraestructura ni Master Health Check sobre la combinación staged+unstaged actual.

**Bloqueo:** ejecutar y registrar las suites focales finales, infraestructura/regresiones, frontend focal/build/typecheck/lint y validador del arnés; corregir estados del catálogo si algún check no se ejecuta o falla.

### ALTO 5 — El merge activo no es todavía una unidad trazable

Los routers del working tree importan `facturas_service.py` y `persistencia_cooperativas.py`, pero ambos servicios y sus tests continúan no rastreados. También quedan numerosos archivos `MM`/`AM`, por lo que el índice no representa la implementación final revisada. Un merge del índice actual excluiría los hardenings unstaged; un `git add` indiscriminado podría incluir `uploads/`.

**Bloqueo:** cerrar explícitamente qué delta entra, rastrear solo servicios/tests intencionales, excluir `uploads/` y repetir evidencia sobre el snapshot exacto a fusionar.

### MEDIO 1 — Falta registrar la nueva suite de persistencia cooperativa

`test_cooperativas_persistencia.py` es una suite nueva y no aparece en `testing/CATALOGO_PRUEBAS.md`, incumpliendo `skill_testing_mandate`. La fila de ERP tampoco describe los tres wrappers que descargan consultas sync al threadpool.

### MEDIO 2 — ERP async está cubierto por delegación, no por comportamiento cooperativo integral

Los tres casos nuevos de `test_erp_empleados_service.py` prueban que se llama `run_in_threadpool`, y la degradación de alertas ERP también está cubierta. Falta un caso de éxito de alertas y una prueba que demuestre que la consulta sync no bloquea el event loop bajo concurrencia. El bridge ERP/infraestructura no fue reejecutado para el delta final.

### MEDIO 3 — Auditoría PII tiene buenas pruebas unitarias, pero no integración de middleware/evento real

La cobertura verifica redacción de documento, nombre, IMEI, serial, línea, identificador y ruta (`test_lineas_corporativas_seguridad.py`, `test_auditoria_acciones.py`). Sin embargo, usa `AsyncMock` e inspección del statement; no prueba una mutación HTTP real seguida de la fila persistida por el middleware. Tampoco demuestra que GET/POST/DELETE de evidencia WBS produzcan un evento real, solo clasificación de ruta.

### MEDIO 4 — Cobertura frontend final incompleta

Hay pruebas útiles de teclado/filtros, modales, readonly, doble solicitud de factura, reintento WBS y descarga bearer. Persisten brechas: carga WBS completamente exitosa, edición/reemplazo, refresh 401, error de descarga, botón de URL legada, CRUD exitoso de gestores y rechazo 403 visible, importación de factura exitosa/error y estados de alerta ERP. Los cambios unstaged de `Select`, `DataTable`, `LineDetailForm` y tests asociados no tienen ejecución final registrada.

### MEDIO 5 — Evidencia y roster del arnés requieren reconciliación

ADR-006 y ADR-007 documentan Antigravity y la paridad dinámica, por lo que la decisión arquitectónica existe. No obstante, `antigravity-agent-harness-2026-07-17.md:46-47` conserva evidencia de 9 adaptadores, mientras hoy hay 11. ADR-006 describe ocho roles y singulariza `graphify-searcher`, sin identificar claramente `deepseek-searcher` y `frontend-table-specialist` como ayudantes/especialistas adaptados. Se requiere rerun del validador final y ajustar el reporte/roster documental para evitar drift.

### BAJO 1 — Cobertura residual de uploads WBS

WBS cubre lifecycle HTTP, PDF, tamaño, aislamiento, asignado no creador, RBAC y 413 chunked. Continúan pendientes positivos PNG/JPEG/TXT/CSV/Office, MIME discordante, symlink, cancelación, 401/404/409 completos, evento real de auditoría y GET concurrente con reemplazo/DELETE. Son riesgos ya documentados, pero deben permanecer visibles.

## Cobertura por dominio solicitada

| Dominio | Estado |
|---|---|
| RBAC | Parcial: módulos existentes correctos; 401/403 básicos cubiertos; faltan matrices por ruta y limiter 429. |
| Uploads WBS | Cobertura mínima presente; riesgos residuales documentados. |
| Uploads cooperativas | Validación y lote cubiertos unitariamente; persistencia productiva/rollback bloqueados. |
| Rate limiter | Bloqueado: sin pruebas 429. |
| ERP async | Parcial: delegación a threadpool cubierta; sin ejecución final ni cooperación integral. |
| Cooperativas persistencia/concurrencia | Bloqueado: suite no catalogada y sin PostgreSQL real. |
| Facturas | Bloqueado: mocks no demuestran idempotencia/concurrencia y estado PASS sin evidencia final. |
| Auditoría PII | Unitario adecuado; integración real pendiente. |
| Frontend | Suites presentes, pero evidencia final y varios flujos críticos pendientes. |
| Arnés | Documentación/validator presentes; evidencia de 9 no coincide con los 11 adaptadores actuales. |

## Pruebas requeridas

1. PostgreSQL real con dos sesiones para cooperativas y facturas; comprobar serialización y estado final único.
2. Endpoint-level de cooperativas/facturas: éxito, borde, error, rollback, reintento e idempotencia.
3. 429 de WBS, Beneficiar y Grancoop con reset/bucket determinista.
4. Fallo DB después de escribir archivos cooperativos: compensación o reconciliación verificable.
5. Infraestructura y Master Health Check sobre el snapshot final, justificando cada skip.
6. Auditoría HTTP real con persistencia y redacción PII; auditoría real de descarga WBS.
7. ERP async: éxito de alertas y prueba de no bloqueo/cooperación del event loop.
8. Vitest focal final para WBS, líneas corporativas y componentes compartidos; typecheck, build y lint focal.
9. Validador Antigravity y su pytest sobre los 11 adaptadores actuales.

## Documentación requerida

1. Registrar `test_cooperativas_persistencia.py` en `testing/CATALOGO_PRUEBAS.md`.
2. Cambiar estados `PASSED` por evidencia exacta del snapshot final; no declarar idempotencia/concurrencia sin pruebas correspondientes.
3. Actualizar la descripción de ERP Empleados para incluir wrappers async/threadpool.
4. Documentar persistencia productiva, volumen, backup, retención, huérfanos y limpieza de `uploads/nomina`; alinear despliegue productivo con esa decisión.
5. Reconciliar el reporte del arnés y el wording de ADR-006/ADR-007/AGENTS con 11 adaptadores.
6. No se requiere actualizar `docs/ESQUEMA_BASE_DATOS.md`: no hay tabla/columna/constraint nuevo; `archivo_url` ya existe y el cambio es de contrato Pydantic de escritura.
7. No se requiere un nuevo módulo en `rbac_manifest.py`: se reutilizan `developments`, `nomina_novedades` y `lineas_corporativas` ya existentes.

## Decisión

`blocked`. La cobertura base es amplia y las pruebas se recolectan, pero no existe evidencia verde del snapshot final; faltan pruebas obligatorias de rate limiting y concurrencia real; la persistencia productiva de uploads de cooperativas no está garantizada; el catálogo omite una suite y sobredeclara estados; y el índice todavía excluye servicios/tests requeridos mientras deja un directorio de uploads no rastreado.
