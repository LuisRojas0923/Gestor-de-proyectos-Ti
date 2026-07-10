# Revisión docs/tests — ramas Nómina V2 e Indicadores de Auditoría

**Fecha:** 2026-07-10
**Modo:** plan, solo lectura
**Comparaciones:** `origin/main...origin/NOVEDADES_NOMINA_V2` y `origin/main...origin/indicadores_auditoria_del_sistema`
**Resultado:** `blocked`

## Alcance y evidencia inspeccionada

- `NOVEDADES_NOMINA_V2`: 2 archivos frontend, 11 inserciones y 10 eliminaciones; no añade tests ni documentación.
- `indicadores_auditoria_del_sistema`: 58 archivos, 4628 inserciones y 241 eliminaciones; añade dos tests canónicos y dos copias bajo `backend_v2/`, sin cambios en `docs/` ni en `testing/CATALOGO_PRUEBAS.md`.
- Se inspeccionaron historial, diffs, `pytest.ini`, catálogo, tests nuevos, fixtures y cambios principales de auditoría/viáticos.
- No se ejecutaron suites: la revisión fue sobre referencias remotas, sin checkout ni modificación de código. Sí se ejecutó inspección estática con `git diff --check`; ambas ramas reportan whitespace y la rama de auditoría además introduce mojibake/BOM en `testing/backend/.env.test`.

## Hallazgos

### Bloqueantes

1. **Cobertura insuficiente en auditoría.** Dos funciones de prueba no cubren el nuevo endpoint de estadísticas completo, autorización/RBAC, filtros y límites temporales, respuesta vacía, WebSocket, middleware, tres endpoints de inventario, segundo endpoint de viáticos, errores/rollback ni integración frontend. La rama cambia backend, seguridad y UI de forma transversal.
2. **Tests duplicados y fuera de ubicación canónica.** Existen copias en `backend_v2/test_auditoria_*.py` y `testing/backend/test_auditoria_*.py`. `pytest.ini` define `testpaths = testing/backend`; por tanto las copias de `backend_v2/` no entran en `python -m pytest` normal. La copia de descarga tampoco es idéntica: difiere en el manejo de limpieza. Debe quedar una sola versión por caso bajo `testing/backend/`.
3. **Sin trazabilidad documental ni evidencia ejecutada.** Los tests nuevos no están en `testing/CATALOGO_PRUEBAS.md`; no hay bitácora/reporte de build, comandos, conteos, fallos previos, resultados, skips ni artefactos. La política de deduplicación de 4 h 30 min y el canal WebSocket son comportamiento durable y deben documentarse.

### Altos

4. Los dos tests nuevos dependen de PostgreSQL y, para descarga, de un backend HTTP externo ya levantado. Escriben/commitean contra la base configurada y usan IDs fijos; esto requiere una DB exclusiva de pruebas, preflight y evidencia de cleanup. No son herméticos para CI.
5. El cambio `rate_limit_login: "5/minute;20/hour"` → `"5minute;20/hour"` no tiene prueba de parseo/configuración y aparenta formato inválido. Debe existir una prueba que instancie la configuración/limiter y demuestre el límite esperado antes de merge.
6. El WebSocket `/auditoria/ws/dashboard` y su reconexión frontend no tienen pruebas de autenticación/autorización, broadcast, desconexión, limpieza ni backoff. La prueba debe exigir rechazo sin permiso y no solo conectividad.

### Medios

7. `NOVEDADES_NOMINA_V2` corrige nulos/tipos y limita resultados a 50, pero no prueba: máximo 50, búsqueda por nombre/cédula, selección, ID/nombre/cargo ausentes y nodos vacantes. Al ser corrección de regresión frontend, se recomienda exigir una suite Vitest focalizada.
8. El test de estadísticas solo valida cuatro clasificaciones mediante deltas sobre datos ambientales. No valida todos los KPIs, agregaciones, rangos, ceros, 409, `NULL`, dispositivo, top rutas/usuarios ni contrato `AuditoriaEstadisticas`; además contiene una variable inicial no usada.
9. El test de deduplicación no define el comportamiento por persona consultada, expiración exacta a 4 h 30 min, usuarios distintos ni carreras concurrentes. Tampoco cubre tipo inválido, no autenticado, error DB o el reporte de gastos.
10. Los cinco commits de auditoría no siguen la convención del proyecto (`ultimos cambios`, `arreglos auditoria`, etc.), reduciendo trazabilidad. Los dos commits de Nómina sí usan tipo/ámbito, aunque la descripción está en inglés.

### Bajo

11. `git diff --check` reporta abundante whitespace en ambas ramas. Debe quedar limpio para que la evidencia de diff sea auditable.

## Documentación requerida

- Registrar las suites consolidadas en `testing/CATALOGO_PRUEBAS.md`, con propósito, cantidad de casos, dependencia de infraestructura y estado real; no marcar `PASSED` sin evidencia.
- Añadir bitácora o reporte de build con SHAs, orden de merge, entorno, comandos, resultados y skips justificados.
- Documentar el contrato de `/auditoria/estadisticas`, `/auditoria/ws/dashboard`, endpoints de auditoría de descargas y regla de deduplicación. Usar ADR si WebSocket/deduplicación se adopta como decisión durable.
- `docs/ESQUEMA_BASE_DATOS.md` no requiere cambio por las clases de respuesta `SQLModel` añadidas: el diff revisado no altera tabla/columna ORM. Si existe una migración o cambio físico no incluido, el MER y la documentación de DB pasan a ser obligatorios.

## Matriz de pruebas pre-merge

| Rama / área | Casos exigibles | Puerta |
|---|---|---|
| Nómina V2 — autocomplete | nombre/cédula, límite exacto 50, menos de 50, selección y lista vacía | Vitest focalizado verde |
| Nómina V2 — nodo | ID/nombre/cargo nulos, vacante, selección con ID válido, expandir/contraer | Vitest focalizado + lint + build |
| Auditoría — servicio estadísticas | dataset vacío; KPIs; filtros inclusivos; mismo día por hora; varios días; 400/401/403/409/422/500; `NULL`; dispositivos; top N | Unit/integración PostgreSQL verdes |
| Auditoría — API/RBAC | 401 sin token, 403 sin permiso, 200 autorizado, contrato de respuesta, rango inválido/invertido | Tests en `testing/backend/` |
| Auditoría — WebSocket | rechazo no autorizado, conexión autorizada, broadcast, cliente caído, disconnect y limpieza | Backend + hook frontend |
| Viáticos | PDF/XLSX, tipo inválido, cache antes/después de 4 h 30 min, usuarios/tipos/consultados distintos, concurrencia, rollback, reporte-gastos | Integración con DB exclusiva |
| Inventario/middleware | auth/RBAC de 3 endpoints, un solo evento por acción, actor de body permitido/ausente/spoofed, rutas excluidas | Regresión API/middleware |
| Frontend auditoría | loading/error/empty/success, parámetros de fechas, route guard, WebSocket/reconnect/cleanup, humanizer y tablas/modales críticas | Vitest focalizado |
| Transversal | infraestructura, regresiones backend, lint, build, suite frontend completa | Todo verde; skips explicados |

## Comandos pre-merge (PowerShell, ejecutar en cada rama ya checkout)

```powershell
git status --short --branch
git diff --check origin/main...HEAD
git diff --name-status origin/main...HEAD

# Ubicación y duplicados
git ls-files "*test_auditoria_stats_fallos.py" "*test_auditoria_descarga_viaticos.py"
git diff --no-index -- backend_v2/test_auditoria_stats_fallos.py testing/backend/test_auditoria_stats_fallos.py
git diff --no-index -- backend_v2/test_auditoria_descarga_viaticos.py testing/backend/test_auditoria_descarga_viaticos.py

# Colección canónica (debe listar una sola instancia de cada nodeid)
$env:PYTHONPATH = "backend_v2;" + $env:PYTHONPATH
python -m pytest --collect-only testing/backend/test_auditoria_stats_fallos.py testing/backend/test_auditoria_descarga_viaticos.py -q

# Auditoría focalizada y health checks
python -m pytest testing/backend/test_auditoria_stats_fallos.py testing/backend/test_auditoria_descarga_viaticos.py -vv | Tee-Object -FilePath testing/backend/auditoria_premerge.log
python -m pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -v | Tee-Object -FilePath testing/backend/health_premerge.log
python -m pytest testing/backend/ -v | Tee-Object -FilePath testing/backend/backend_premerge.log

# Frontend; usar --run para evitar watch mode
Push-Location frontend
npm run test -- --run
npm run lint
npm run build
Pop-Location
```

Antes de ejecutar los tests que escriben, verificar que `DB_HOST/DB_NAME` apunten exclusivamente a pruebas y adjuntar solo valores no secretos. No aceptar ejecución contra datos de desarrollo/producción.

## Matriz post-merge

| Momento | Validación | Criterio |
|---|---|---|
| Inmediato en main | colección, suites focalizadas, health checks, backend completo, Vitest, lint y build | 0 fallos/errores; skips justificados |
| Staging | RBAC 401/403/200, filtros, descarga y deduplicación, WebSocket detrás del proxy | contratos y conteos correctos, sin duplicados |
| Observación inicial | tasa 5xx/4xx, errores de limiter, conexiones WS, latencia de estadísticas, crecimiento de auditoría | sin regresión respecto de baseline acordado |
| Tras ambas ramas | repetir tests de jerarquía y auditoría en el mismo commit integrado | descartar interferencia entre merges |

```powershell
git status --short --branch
git log --oneline -10
$env:PYTHONPATH = "backend_v2;" + $env:PYTHONPATH
python -m pytest --collect-only testing/backend/ -q
python -m pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -v
python -m pytest testing/backend/ -v | Tee-Object -FilePath testing/backend/backend_postmerge.log
Push-Location frontend
npm run test -- --run
npm run lint
npm run build
Pop-Location
```

## Evidencia exigible

- SHA de rama y SHA integrado, fecha, OS, Python/Node, entorno (local/CI/staging) y DB de pruebas identificada sin secretos.
- Comando exacto, código de salida, resumen `passed/failed/skipped/errors`, duración y nodeids de fallos/skips.
- Log focalizado y completo; captura/JSON de 401, 403 y 200; evidencia de un solo evento persistido por descarga repetida y de expiración.
- Para frontend: salida Vitest no-watch, ESLint y Vite build; para WebSocket, conexión/rechazo/broadcast/reconexión.
- Confirmación de que `git ls-files` devuelve solo rutas canónicas bajo `testing/backend/` y de que `git diff --check` no reporta errores.
- Actualización del catálogo y vínculo al reporte/bitácora. No versionar credenciales, dumps ni logs con PII.

## Criterios de rollback

Rollback si ocurre cualquiera de estos puntos tras merge/despliegue:

- falla una suite crítica o aparece regresión en `test_infrastructure.py`/`test_regresiones.py`;
- rate limiter no inicia, rechaza tráfico válido o deja login sin el límite esperado;
- acceso a estadísticas/WebSocket sin RBAC, fuga de PII o suplantación de actor;
- duplicación/pérdida de eventos, deduplicación incorrecta entre usuarios/consultas o escrituras fuera de la DB de pruebas;
- incremento sostenido de 5xx, latencia/timeouts del dashboard o fuga de conexiones WebSocket;
- frontend no construye, ruta protegida falla o jerarquía pierde selección/renderizado.

Procedimiento recomendado: desplegar las ramas por separado y conservar el SHA previo. Si falla la segunda integración, revertir primero su merge commit (`git revert -m 1 <sha_merge>`) y repetir la matriz completa. No borrar registros de auditoría durante rollback; al no observarse migración de esquema en el diff, el rollback esperado es de aplicación. Si antes de merge aparece una migración, exigir plan reversible y backup/restauración probado.

## Decisión

**Bloqueado** para `indicadores_auditoria_del_sistema` hasta consolidar tests, ampliar cobertura y aportar documentación/evidencia. `NOVEDADES_NOMINA_V2` puede avanzar solo con riesgo explícito, pero se recomienda añadir los tests focalizados antes de integrar. La validación final debe hacerse sobre el commit que contenga ambas ramas.
