# Plan por fases - Optimizacion de rendimiento de la aplicacion

**Fecha:** 2026-07-12
**Autor del plan:** OpenCode
**Modo:** plan
**Estado RIPER:** PLAN - ejecucion bloqueada hasta aprobacion humana
**Proyecto:** Gestor-de-proyectos-Ti
**Evidencia RESEARCH:** seccion 2 de este documento, diagnostico de frontend/backend/infraestructura del 2026-07-12
**Especificacion inicial:** secciones 1-4; fases 4-5 requieren especificacion y ADR propios antes de implementarse
**Aprobacion humana de ejecucion:** pendiente

---

## 1. Objetivo

Reducir la latencia percibida al navegar por el Portal de Servicios y las rutas de Tiempo y Asistencia, separando y midiendo cuatro fuentes de costo:

1. Transformacion de modulos Vite sobre Docker Desktop/Windows.
2. Solicitudes frontend duplicadas o innecesarias.
3. Autenticacion/RBAC y sincronizacion incidental con ERP.
4. Consultas locales o externas de endpoints concretos.

La implementacion se divide en fases reversibles. Ninguna fase avanza si no mejora su linea base o si introduce regresiones funcionales, de HMR, RBAC o aislamiento entre sesiones.

## 2. Evidencia inicial

### 2.1 Capturas del usuario

- Modulos TSX de 50-100 KB tardan entre 2.8 y 3.7 segundos en carga fria de desarrollo.
- `parametros-calculo` aparece dos veces, con 790 ms y 1.55 s.
- `festivos/2026?fuente=auto` aparece dos veces, con 855 ms y 1.60 s.
- `version.json` alcanzo 3.24 s.
- Modulos de Alcance de empleados tardan entre 2.2 y 3.7 s.

### 2.2 Mediciones locales de diagnostico

| Indicador | Resultado inicial |
|---|---:|
| CPU frontend Gestor en Docker | 37.11 % |
| CPU backend Gestor en Docker | 8.68 % |
| CPU frontend TrazaEco concurrente | 37.26 % |
| Modulo Configuracion caliente | 299 ms |
| Modulo Pre-liquidacion caliente | 172 ms |
| Modulo Alcance caliente | 156 ms |
| Modulo Modal caliente | 102 ms |

Las mediciones autenticadas de API todavia no tienen p50/p95 reproducible. Los tiempos `401` solo confirman conectividad y no representan el camino real de autenticacion, RBAC, PostgreSQL o ERP.

### 2.3 Causas confirmadas por inspeccion

- `frontend/vite.config.ts` fuerza `usePolling: true`.
- `docker-compose.yml` monta `./frontend:/app` y declara varias variables de polling.
- `lucide-react` esta excluido de `optimizeDeps`.
- `frontend/src/main.tsx` usa `StrictMode`; los efectos no cancelables producen dos GET completados en desarrollo.
- `useServicePortal` carga modulos, categorias, perfil y tickets tambien en rutas profundas.
- `Router -> ServicePortal -> featureRoutes -> pagina` forma una cascada lazy serial en carga fria.
- La autenticacion puede sincronizar perfil contra ERP y hacer `commit` durante cualquier GET protegido cuando faltan datos del usuario.
- La consulta ERP usada por autenticacion ejecuta SQLAlchemy sincrono dentro de un wrapper async.

## 3. Metas cuantitativas

Las metas se validan en la misma maquina y con el mismo conjunto de contenedores de la linea base.

| Indicador | Meta fase 1-2 | Meta final provisional |
|---|---:|---:|
| CPU frontend inactivo | < 10 % | < 5 % |
| Modulo caliente Vite p95 | < 150 ms | < 100 ms |
| Primera ruta fria Tiempo y Asistencia | < 1.5 s | < 1.0 s |
| GET completados iguales por montaje en StrictMode | 1 | 1 |
| `parametros-calculo` autenticado p95 | < 400 ms | < 250 ms |
| `festivos` autenticado p95 | < 400 ms | < 250 ms |
| `gestores` autenticado p95 | < 700 ms | < 500 ms |

Si una meta no es realista tras obtener la linea base autenticada, debe ajustarse en el reporte de build antes de implementar la fase correspondiente, nunca despues para ocultar una regresion.

## 4. No-objetivos

- No quitar React `StrictMode`.
- No convertir todas las rutas lazy en imports estaticos.
- No agregar React Query, SWR u otra dependencia durante las fases 0-2.
- No cachear datos protegidos en `localStorage`, IndexedDB, Service Worker ni Cache API.
- No mezclar respuestas entre usuarios, roles, permisos o sesiones.
- No cambiar contratos API, permisos RBAC ni reglas de negocio como efecto colateral.
- No optimizar tablas o crear indices sin `EXPLAIN (ANALYZE, BUFFERS)` y volumen representativo.
- No incluir `frontend/package-lock.json` previo salvo que una fase cambie dependencias de forma explicita.

## 5. Fase 0 - Linea base e instrumentacion

### Objetivo

Crear una medicion reproducible antes de tocar comportamiento.

### Implementacion

1. Crear `scripts/performance_baseline.ps1` para medir:
   - `docker stats --no-stream`.
   - Tiempo de respuesta de modulos Vite frios y calientes.
   - Navegacion a Configuracion, Calculadora y Alcance con DevTools limpio.
   - Conteo de requests completados, cancelados y fallidos.
2. Instrumentar temporalmente o mediante logging estructurado en `backend_v2/app/middleware/` y dependencias de `backend_v2/app/api/auth/profile_router.py` los segmentos backend:
   - Espera de pool.
   - Autenticacion local.
   - Consulta RBAC.
   - Sincronizacion ERP.
   - Servicio del endpoint.
   Usar reloj monotonic, `correlacion_id` opaco, nombres de segmento de baja cardinalidad y logging estructurado sin `print()`, JWT, cédulas, payloads ni `str(e)`.
3. Medir 5 iteraciones de calentamiento descartadas y 50 iteraciones secuenciales autenticadas; reportar p50, p95 y maximo mediante metodo nearest-rank.
4. Ejecutar dos escenarios:
   - Solo stack Gestor activo.
   - Gestor y otros stacks de desarrollo activos.
5. Persistir resultados en `docs/reviews/builds/<fecha>_linea-base-rendimiento.md`.

### Protocolo reproducible

1. Comando automatizado:
   - `powershell -ExecutionPolicy Bypass -File scripts/performance_baseline.ps1 -Warmup 5 -Iterations 50 -CpuWindowSeconds 30 -OutputPath docs/reviews/builds/evidence/<fecha>_rendimiento.json`
2. El token de prueba se recibe exclusivamente desde `PERF_AUTH_TOKEN`; el script falla si no existe, nunca lo imprime y no acepta credenciales por argumentos.
3. La evidencia JSON solo contiene alias de ruta, status, milisegundos, percentiles, CPU y memoria. No guarda headers, JWT, cookies, cuerpos, cédulas ni nombres.
4. CPU se muestrea una vez por segundo durante 30 segundos; se reportan mediana, p95 y maximo, no un unico `docker stats`.
5. Cache caliente: 5 warm-ups descartados y 50 requests secuenciales en el mismo proceso.
6. Cache fria de desarrollo: reiniciar frontend, abrir una ventana de incognito con cache deshabilitada y capturar la primera navegacion. Se repite 5 veces y se reportan las 5 muestras; no se calcula p95 con este subconjunto.
7. Navegacion y contenido visible se miden manualmente con Performance API y HAR:
   - Inicio de `performance.mark` antes de navegar.
   - Marca al renderizar el encabezado de la pagina.
   - Exportar HAR sin contenido y revisar que no incluya `Authorization`, cookies, query con PII ni cuerpos.
8. Secuencia de escenarios: solo Gestor, luego Gestor con stacks concurrentes. Reiniciar frontend entre escenarios y esperar 30 segundos antes de medir.
9. Tolerancia de ruido: repetir el escenario si el coeficiente de variacion supera 20 % o si Docker ejecuta build/indexacion durante la ventana.

### Puerta de salida

- Existe un comando reproducible, datos crudos anonimizados y resultados con fecha, maquina, contenedores y actor de prueba descrito solo por rol/permisos, sin credenciales o PII.
- Se identifican los dos endpoints autenticados con mayor p95 antes de iniciar fase 3.

### Rollback

- Eliminar solo instrumentacion temporal si agrega costo medible; conservar el script y el reporte.

## 6. Fase 1 - Vite y Docker de desarrollo

### Objetivo

Reducir CPU en reposo y transformacion fria sin romper HMR en Windows.

### Archivos previstos

- `frontend/vite.config.ts`
- `docker-compose.yml`
- `frontend/Dockerfile.dev` si la medicion demuestra necesidad
- Pruebas/configuracion de infraestructura aplicable

### Implementacion

1. Hacer `usePolling` dependiente de una comparacion estricta `process.env.CHOKIDAR_USEPOLLING === 'true'`; no usar `Boolean(string)`.
2. Cuando polling sea necesario en Docker Desktop/Windows, fijar intervalo inicial de 500 ms mediante `CHOKIDAR_INTERVAL_MS`, parseado como entero positivo con fallback seguro.
3. Retirar `WATCHPACK_POLLING` y `WATCHFILES_FORCE_POLLING` del servicio frontend si se confirma que no son consumidas por Vite.
4. Eliminar `lucide-react` de `optimizeDeps.exclude` y permitir su prebundle local.
5. Verificar arranque limpio, creacion, renombrado y edicion de archivos TSX, HMR y reinicio del contenedor con polling activo e inactivo.
6. Documentar que stacks Docker no usados deben detenerse para evitar competencia sostenida de CPU.

### Criterios de aceptacion

- CPU frontend inactivo < 10 % con HMR funcional.
- Una edicion se refleja en <= 1 segundo con polling Windows.
- No aparecen errores de prebundle ni recargas completas repetitivas.
- Build de produccion no cambia su comportamiento.

### Rollback

- Restaurar polling activo con el intervalo anterior si HMR deja de detectar cambios.
- Restaurar exclusion de `lucide-react` solo si existe un error reproducible y documentado del optimizador.

## 7. Fase 2 - Ciclo de red frontend

### Objetivo

Reducir solicitudes duplicadas e innecesarias manteniendo `StrictMode` y aislamiento por sesion.

### Archivos previstos

- `frontend/src/services/horasExtrasService.ts`
- `frontend/src/services/http/` para extraer cliente y query builder antes de superar 550 lineas
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/hooks/useContextoPreLiquidacion.ts`
- `frontend/src/pages/ServicePortal/pages/HORAS_EXTRAS/ConfiguracionHorasExtrasView.tsx`
- `frontend/src/pages/ServicePortal/hooks/useServicePortal.ts`
- `frontend/src/hooks/useAppVersionCheck.ts`
- Pruebas Vitest de hooks y servicios

### Implementacion

1. Extraer `request<T>` y `buildQuery` de `horasExtrasService.ts` (524 lineas actuales) antes de agregar comportamiento; ningun archivo puede superar 550 lineas.
2. Extender `request<T>` con `signal?: AbortSignal` para GET de Horas Extras (`parametros-calculo`, `festivos`, novedades confirmadas). Las llamadas actuales de modulos, categorias, tickets y perfil usan Axios: deben recibir `signal` mediante `axios.get(..., { signal })` o migrarse explicitamente al cliente compartido; no se considera cubierto por cambiar solo `request<T>`.
3. Cancelar efectos al desmontar o cambiar filtros; una respuesta antigua nunca puede sobrescribir el estado nuevo. `AbortError` es cancelacion silenciosa: no genera toast ni reemplaza datos validos por estado vacio.
4. En desarrollo, omitir `version.json`; en produccion, impedir checks simultaneos por montaje, intervalo y visibilidad.
5. Diferir festivos hasta que la Calculadora tenga una accion o contexto que los requiera.
6. Aplicar esta matriz ruta -> recurso:
   - Dashboard/hub: `moduleStatus`; no cargar categorias ni tickets.
   - Crear servicio/ticket: categorias y perfil estrictamente necesario.
   - Lista/detalle de tickets: tickets y recursos explicitos de esa vista.
   - Rutas profundas de Tiempo y Asistencia: no cargar categorias ni tickets.
   - `refreshUserProfile`: mover al ciclo de autenticacion; mientras fase 4 no exista, ejecutarlo una sola vez por sesion y nunca por cada cambio de ruta.
7. Evaluar single-flight solo para GET idempotentes si la cancelacion no alcanza la meta. Antes de implementarlo, agregar a `AppContext` una generacion efimera de sesion como SSOT, renovada en cada login/logout.
8. Si se implementa single-flight:
   - Clave por identificador local del principal, generacion de sesion, version/snapshot de permisos y alcance efectivo, URL y query normalizada; nunca usar el JWT como clave.
   - Nunca almacenar JWT en logs o persistencia.
   - Limpiar y cancelar en logout, cambio de usuario, `401`, `403`, cambio de permisos o cambio de alcance.
   - No cachear errores ni mutaciones.
   - Una cancelacion individual no aborta una promesa compartida por otros consumidores; usar conteo de consumidores o limitar single-flight a recursos sin señales independientes.

### Criterios de aceptacion

- Pruebas montadas realmente dentro de `<StrictMode>` muestran un primer request abortado y exactamente un GET completado por recurso.
- Navegar directamente a Configuracion no carga categorias o tickets innecesarios.
- Cambiar año, semana, cedula o filtros cancela la solicitud anterior.
- Logout/login con otro usuario no reutiliza respuestas protegidas.
- `visibilitychange` e intervalo de version no se solapan.
- Cancelar no genera toast, no borra datos validos y una respuesta vieja no pisa filtros nuevos.

### Rollback

- Revertir por hook o servicio individual; no retirar `StrictMode` como mitigacion.

## 8. Fase 3 - Cascada de rutas y prefetch

### Objetivo

Reducir espera de navegacion fria sin aumentar de nuevo el bundle inicial.

### Archivos previstos

- `frontend/src/components/Router.tsx`
- `frontend/src/pages/ServicePortal.tsx`
- `frontend/src/pages/ServicePortal/routes/featureRoutes.tsx`
- `frontend/src/components/molecules/ServiceCard.tsx` o helper de prefetch
- Pruebas de navegacion y build

### Implementacion

1. Medir waterfall `Router -> ServicePortal -> featureRoutes -> pagina` despues de fases 1-2.
2. Hacer lazy `DashboardView` si evita transformarlo en rutas profundas sin penalizar inicio.
3. Prefetchear chunks al enfocar, hacer hover o `pointerdown` sobre opciones autorizadas del hub; en tactil puede usarse prefetch acotado por visibilidad/idle.
4. El prefetch se condiciona por permiso exacto y nunca dispara fetch de datos a nivel de modulo.
5. Reemplazar barrels por imports directos solo en rutas demostradas como criticas.
6. Comparar tamaño inicial, cantidad de chunks y tiempo a contenido visible.
7. La navegacion directa fria no se beneficia del hover: si incumple presupuesto, reducir al menos un salto serial declarando el registro lazy de features en una capa accesible desde Router; si no se modifica, el waterfall debe demostrar que ya cumple la meta.

### Criterios de aceptacion

- Primera ruta fria < 1.5 s en escenario controlado.
- Bundle inicial gzip no aumenta mas de 5 %.
- Prefetch no ocurre para opciones sin permiso.
- Navegacion por teclado obtiene el mismo beneficio que hover.
- Navegacion tactil tiene prefetch acotado y no descarga todas las features.
- El bundle inicial se compara tambien contra la referencia previa de 113.48 kB gzip, no solo contra la fase anterior.

### Rollback

- Retirar prefetch de la ruta que aumente trafico o memoria sin mejorar tiempo visible.

## 9. Fase 4 - Autenticacion, RBAC y ERP

### Objetivo

Sacar consultas ERP sincronas y escrituras incidentales del camino comun de GET protegidos.

### Archivos previstos

- `backend_v2/app/api/auth/profile_router.py`
- `backend_v2/app/services/auth/servicio.py`
- `backend_v2/app/services/erp/empleados_service.py`
- Nuevo servicio de identidad local y enriquecimiento ERP para evitar crecer `ServicioAuth` (466 lineas)
- Schema publico allowlist para `/auth/yo`
- Dependencias de autenticacion/RBAC y cache Redis
- `testing/backend/` con TDD obligatorio

### Implementacion

1. Usar las trazas de fase 0 para confirmar frecuencia y costo de sincronizacion incidental.
2. Materializar identidad local durante login/JIT antes de emitir JWT. Cada request posterior exige usuario local existente y `esta_activo=True`; usuario ausente o desactivado falla cerrado sin sintetizar roles desde el token.
3. Separar autenticacion local de enriquecimiento ERP:
   - Autenticacion valida token, usuario local activo y permisos sin consultar ERP.
   - Enriquecimiento se ejecuta durante login, job o endpoint POST explicito e idempotente; `/auth/yo` queda como GET local sin escrituras ni ERP.
   - `/auth/yo` usa schema publico allowlist y prueba negativa para `hash_contrasena`, tokens y campos internos.
4. Ejecutar cualquier consulta ERP sincrona en threadpool mientras no exista driver async. Cada worker abre y cierra su propia `SessionErp`; nunca compartir una sesion entre event loop e hilo.
5. Aplicar limite de concurrencia inicial de 8 workers y timeout provisional de 5 segundos, ajustados con fase 0. La cancelacion de coroutine no se considera cancelacion del SQL; registrar y cerrar la sesion al terminar.
6. No mantener una transaccion PostgreSQL abierta mientras se espera ERP.
7. Si la medicion justifica cache RBAC, usar Redis con version compartida por rol/modulo, TTL defensivo maximo de 60 segundos y proteccion anti-stampede. Invalidar despues del commit exitoso de permisos, roles, modulos o auto-discovery; rollback no publica invalidacion.
8. Ante fallo de Redis, consultar PostgreSQL. Nunca reutilizar un permiso positivo potencialmente revocado cuando DB e invalidacion fallan.
9. Medir bcrypt y aislarlo en capacidad limitada solo si aparece como costo significativo.
10. Mantener fail-closed: errores ERP nunca amplian alcance ni permisos.

### Criterios de aceptacion

- GET protegido de usuario ya autenticado no consulta ERP.
- Usuario incompleto conserva un flujo explicito de sincronizacion sin perder datos actuales.
- Usuario portal sin fila local se materializa en login/JIT antes del JWT o se rechaza; nunca se resuelve desde ERP en un GET cualquiera.
- Usuario desactivado despues de emitir JWT queda rechazado en la siguiente peticion.
- Un ERP lento no bloquea el event loop ni degrada endpoints locales no relacionados.
- Pruebas concurrentes verifican aislamiento, revocacion y fallo cerrado.
- Revocacion RBAC se propaga entre workers dentro del limite explicito y se invalida solo despues del commit.

### Rollback

- Feature flag temporal apagado por defecto para volver al enriquecimiento anterior durante despliegue, con propietario, telemetria y fecha de retiro; debe incluir procedimiento de purga de cache y no mantener doble camino indefinidamente.

## 10. Fase 5 - Endpoints e indices

### Objetivo

Optimizar solo endpoints cuyo p95 siga fuera del presupuesto despues de fases anteriores.

### Candidatos iniciales

- `GET /parametros-calculo`
- `GET /festivos/{anio}`
- `GET /alcance-empleados/gestores`
- `GET /alcance-empleados/gestores/{id}/empleados`

### Implementacion

1. Capturar `EXPLAIN (ANALYZE, BUFFERS)` con volumen representativo solo sobre SELECT.
2. Parametros: cache corta en memoria o Redis, invalidada despues del commit exitoso del PUT.
3. Festivos: cache por `(anio, fuente)`, invalidada despues del commit de sincronizacion.
4. Gestores:
   - Agregar solo relaciones de gestores de la pagina.
   - Evaluar indice parcial de relaciones activas.
   - Evaluar `pg_trgm`/GIN para busqueda contiene solo si la cardinalidad lo justifica.
5. Empleados de gestor: empujar filtros y paginacion al origen ERP o justificar con medicion el filtrado completo en Python.
6. Empleados ERP: revisar normalizacion e indices antes de eliminar `TRIM(CAST(... AS TEXT))`; no crear indices ERP sin propiedad y aprobacion operativa.
7. Toda cache backend se consulta despues de autenticacion y RBAC. Gestores/empleados no se comparten globalmente; su clave incluye principal y alcance efectivo.
8. Invalidar despues del commit exitoso para toda mutacion relevante (POST/PATCH/PUT/DELETE, bulk, sincronizacion o cambio de alcance), con TTL, tamaño maximo y proteccion anti-stampede documentados.
9. Registrar `EXPLAIN` con parametros anonimizados, cardinalidad, version/configuracion PostgreSQL, planning/execution time, filas estimadas/reales, buffers y cache fria/caliente.
10. Si se usa `pg_trgm`, incluir extension, migracion reversible y estrategia operativa `CREATE/DROP INDEX CONCURRENTLY` fuera de transaccion cuando aplique.

### Criterios de aceptacion

- p95 cumple presupuesto con cache fria y caliente reportadas por separado.
- Invalidacion comprobada tras mutaciones.
- Mismo contrato JSON, paginacion, alcance y permisos.
- No se crean indices sin mejora visible en plan y tiempo.

### Rollback

- Cada cache e indice debe poder retirarse independientemente.
- Migraciones de indices definen rollback operativo seguro; `DROP INDEX IF EXISTS` por si solo no se considera suficiente en produccion.

## 11. Orden y puertas de aprobacion

```text
Fase 0 -> aprobar linea base
Fase 1 -> medir y aprobar entorno
Fase 2 -> medir y aprobar red frontend
Fase 3 -> medir y aprobar navegacion
Fase 4 -> aprobar diseño auth/ERP antes de codigo backend
Fase 5 -> aprobar EXPLAIN e indices antes de migracion
```

Cada flecha exige evidencia persistida y aprobacion humana antes de iniciar la fase siguiente. Las fases 1 y 2 pueden pertenecer al mismo ciclo de trabajo, pero fase 2 no comienza hasta medir y aprobar fase 1; conservan commits y reportes separados. Las fases 4 y 5 requieren ademas una especificacion tecnica nueva por afectar backend critico.

## 12. Pruebas y validacion

### Frontend

- Crear/actualizar pruebas focales en `frontend/src/tests/performance/`:
  - `strictModeRequests.test.tsx`: doble montaje, primer request abortado y uno completado.
  - `staleResponses.test.tsx`: respuesta vieja no pisa filtros y cancelacion no genera toast.
  - `sessionIsolation.test.tsx`: logout/login y cambio de permisos cancelan vuelos pendientes.
  - `routePrefetch.test.tsx`: foco, hover, pointer y permiso denegado.
- Actualizar `frontend/src/tests/useAppVersionCheck.test.ts`: intervalo y visibilidad no se solapan; DEV no solicita manifiesto.
- Navegacion directa conserva `Suspense` y fallback accesible.
- `docker compose exec -T frontend npm run test -- --run <focales>`
- `docker compose exec -T frontend npm exec tsc -- --noEmit --pretty false`
- `docker compose exec -T frontend npm run build`
- `docker compose exec -T frontend npm exec eslint -- <archivos-focales>`
- `docker compose exec -T frontend npm run lint`; registrar por separado deuda global preexistente y resultado focal.
- `pre-commit run design-system-check --files <archivos-frontend>`
- `pre-commit run dark-mode-token-check --files <archivos-frontend>`
- Suite completa: `docker compose exec -T frontend npm run test -- --run`; fallos baseline se registran sin ocultarlos.

### Backend

- TDD rojo/verde antes de cambios en autenticacion o endpoints.
- Crear suites focales:
  - `testing/backend/test_auth_local_sin_erp.py`.
  - `testing/backend/test_rbac_cache_invalidation.py` si se aprueba cache.
  - `testing/backend/test_performance_endpoints.py` para contrato/query count, no umbrales temporales fragiles.
- Casos: usuario local, portal materializado, incompleto, desactivado tras JWT, ERP lento/caido, saturacion de threadpool, cierre de sesiones, revocacion multiworker y rollback sin invalidacion incorrecta.
- Comando reproducible Windows/local:
  - `$env:PYTHONPATH = "backend_v2;" + $env:PYTHONPATH; python -m pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py <focales-nuevas> -v`
- Registrar toda suite nueva en `testing/CATALOGO_PRUEBAS.md`.

### Rendimiento

- Misma maquina, navegador, usuario de prueba y contenedores.
- Cache fria y caliente separadas.
- 5 warm-ups descartados y 50 iteraciones secuenciales; reportar p50, p95 y maximo mediante nearest-rank.
- Conservar waterfall o salida cruda en el reporte de build, sin credenciales ni PII.

## 13. Impacto en documentacion

- [x] Plan persistido en `docs/reviews/plans/`.
- [ ] Reporte de linea base en `docs/reviews/builds/`.
- [ ] Bitacora por fase implementada.
- [ ] `docs/GUIA_DESARROLLO.md` para polling y perfil de desarrollo.
- [ ] `docs/ARQUITECTURA_FRONTEND.md` si se introduce single-flight o prefetch reusable.
- [ ] `docs/ESQUEMA_BASE_DATOS.md` solo si fase 5 agrega indices.
- [ ] ADR obligatorio antes de fase 4 para separar autenticacion de enriquecimiento ERP y definir identidad local, threadpool, cache/invalidation RBAC y rollback.

## 14. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigacion |
|---|---|---|---|
| HMR deja de detectar cambios en Windows | Media | Alta | Polling configurable, prueba activa/inactiva y rollback inmediato |
| Quitar `StrictMode` oculta duplicados | Media | Alta | Prohibido por no-objetivos; corregir efectos |
| Cache mezcla usuarios o permisos | Media | Critica | Clave por sesion/permisos, memoria solamente, invalidacion en auth |
| Prefetch salta control visual | Baja | Alta | Condicionar por permiso exacto; backend sigue siendo autoridad |
| ERP caido bloquea endpoints locales | Alta | Alta | Separar enriquecimiento, threadpool y fail-closed |
| Threadpool ERP se satura y traslada la cola | Media | Alta | Limite de concurrencia, timeout, metricas de cola y sesiones por worker |
| Cache crece o genera stampede | Media | Alta | TTL, tamaño maximo, single-flight backend y observabilidad |
| Instrumentacion altera la latencia medida | Media | Media | Reloj monotonic, logging muestreado y comparar con instrumentacion apagada |
| Mejora Windows no representa produccion | Alta | Media | Separar metricas dev de p95 API y build productivo |
| Indices agregan costo sin beneficio | Media | Media | EXPLAIN obligatorio y rollback por indice |
| Benchmark no reproducible | Media | Alta | Script, entorno, iteraciones y cache documentados |
| Cambios locales ajenos entran al build | Media | Media | Stage explicito; excluir `package-lock.json` previo |

## 15. Matriz de subagentes

```text
Subagente              | Motivo                                      | Resultado                  | Bloquea
-----------------------|---------------------------------------------|----------------------------|--------
harness-router         | Determinar alcance transversal              | frontend/backend/scope/sec | no
scope-reviewer         | Limitar fase 1 y puertas posteriores        | approved_with_risks        | no
frontend-reviewer      | Vite, StrictMode, lazy y ciclo de red       | approved_with_risks        | no para fases 0-1
backend-reviewer       | Auth, ERP, RBAC y endpoints                 | approved_with_risks        | si para fases 4-5
security-rbac-reviewer | Cache por sesion, prefetch y fail-closed    | approved_with_risks        | si para fases 4-5
docs-tests-reviewer    | Evidencia, comandos y protocolo estadistico| approved_with_risks        | no para fases 0-1
mobile-reviewer        | Sin alcance movil                           | no requerido               | no
```

## 16. Checklist atomico

### Fase 0

- [x] Crear script de baseline.
- [x] Medir CPU y modulos frontend con 30/50 muestras.
- [ ] Medir requests y endpoints autenticados con 50 muestras.
- [x] Persistir p50/p95/max frontend en evidencia anonimizada.
- [ ] Persistir p50/p95/max autenticado y waterfall manual.
- [ ] Aprobar linea base.

### Fase 1

Ejecucion parcial autorizada por el usuario el 2026-07-13 para atender la degradacion observada en DevTools. La puerta de cierre permanece abierta y no habilita fases backend.

- [x] Parametrizar polling e intervalo.
- [x] Limpiar variables frontend no consumidas.
- [x] Evaluar prebundle de `lucide-react`; se descarto `include` por regresion medida.
- [x] Evitar espera global del escaneo y precalentar modulos focales.
- [x] Verificar HMR Windows y build.
- [x] Comparar CPU y modulos.
- [ ] Validar navegacion real con HAR anonimizado.

### Fase 2

- [ ] Añadir cancelacion GET focal.
- [x] Evitar `version.json` en dev; queda pendiente deduplicar checks productivos.
- [ ] Diferir festivos.
- [ ] Condicionar cargas globales del Portal.
- [ ] Probar StrictMode y aislamiento de sesion.

### Fase 3

- [ ] Medir cascada lazy restante.
- [ ] Evaluar Dashboard lazy.
- [ ] Prefetch por hover/foco y permiso.
- [ ] Comparar bundle y tiempo visible.

### Fase 4

- [ ] Diseñar separacion auth/enriquecimiento ERP.
- [ ] Obtener aprobacion humana especifica.
- [ ] Implementar TDD y threadpool/async.
- [ ] Cache RBAC con invalidacion si la medicion lo justifica.

### Fase 5

- [ ] Elegir maximo dos endpoints por p95.
- [ ] Capturar EXPLAIN.
- [ ] Implementar cache/consulta/indice minimo.
- [ ] Validar invalidacion, RBAC y rollback.

## 17. Decision final

- [ ] `aprobado`
- [x] `aprobado_con_riesgos`
- [ ] `bloqueado`

El plan queda aprobado con riesgos documentados. La ejecucion debe comenzar por fase 0 y requiere aprobacion explicita del usuario. Las fases 2-3 exigen cerrar sus contratos frontend antes de concluirlas; fases 4-5 permanecen bloqueadas hasta una especificacion/ADR y una segunda aprobacion humana.
