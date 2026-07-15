# Docs/tests review - Optimizacion Vite en plantillas de horario

**Fecha:** 2026-07-13
**Alcance:** `docs/reviews/builds/2026-07-13_optimizacion-vite-plantillas-horario.md`, plan, pruebas y evidencia asociada
**Decision:** `blocked`

No se leyeron archivos `.env` ni variantes con secretos.

## Hallazgos

### Alta - La ejecucion contradice las puertas vigentes del plan

El plan mantiene `Aprobacion humana de ejecucion: pendiente` y declara la fase 1 bloqueada hasta completar y aprobar la linea base autenticada. Sin embargo, el build registra como implementados cambios de fase 1 y parte de fase 2, mientras reconoce que la fase 0 completa sigue pendiente. Deben registrarse la aprobacion/excepcion y la nueva decision de puerta, o revertirse el estado de las fases a pendiente.

### Alta - Las metricas posteriores no tienen evidencia cruda trazable

En `docs/reviews/builds/evidence/` solo existe `2026-07-12_rendimiento-frontend.json`, correspondiente al antes (`git_sha: d704ada3`). No existe artefacto posterior con las 30 muestras de CPU, 5 warmups, 50 muestras por recurso ni la solicitud inicial reportada. El build tampoco identifica SHA/estado del arbol, comando exacto, maquina, contenedores o salida capturada. Por tanto, los valores posteriores y las validaciones enumeradas no son reproducibles ni verificables.

La aritmetica de reduccion si es coherente al redondear a un decimal:

- p50: `(38.81 - 19.22) / 38.81 = 50.5 %`.
- p95: `(43.67 - 25.10) / 43.67 = 42.5 %`.
- maximo: `(43.67 - 29.05) / 43.67 = 33.5 %`.

### Alta - No se satisface ni se mide completamente la puerta cuantitativa

- La meta de fase 1 exige CPU frontend inactivo menor a 10 %, pero el resultado posterior reportado es p50 19.22 % y p95 25.10 %.
- Los recursos del antes y despues no son los mismos, por lo que sus tiempos calientes no forman una comparacion pareada.
- La unica medicion inicial posterior no equivale a una navegacion fria: es una solicitud de modulo tras el warmup del servidor y solo tiene una muestra.
- Faltan las cinco repeticiones frias, tiempo a contenido visible y HAR anonimizado requeridos por el plan. No puede concluirse cumplimiento de la ruta fria menor a 1.5 s.

### Media - Pruebas insuficientes y evidencia de ejecucion incompleta

El reporte no conserva comandos ni salida de las ejecuciones. Los 16 casos focales corresponden de forma compatible con `gestionTiempoAsistenciaConfig.test.ts`, que valida opciones del hub y no la configuracion Vite ni los imports directos. Los 8 casos de versionado existen, pero solo uno cubre la nueva omision de `version.json` en desarrollo.

No hay pruebas automatizadas para:

- polling activo/inactivo;
- fallback ante intervalo ausente, invalido, cero o negativo;
- exclusiones `dist` y `coverage`;
- lista focal de warmup y `holdUntilCrawlEnd=false`;
- ausencia de regresion de render/imports en todos los componentes modificados.

Las pruebas existentes de `PlantillasHorarioPage`, `AplicarPlantillaModal` y `WeeklyScheduleEditor` aportan cobertura funcional, pero su ejecucion no esta reportada en este build. Este revisor solo ejecuto `python -m pytest --collect-only testing/scripts/test_performance_baseline.py`: 2 pruebas recolectadas; no se ejecuto npm, build ni Docker por restricciones del rol.

### Media - Documentacion operativa pendiente

Falta documentar en `docs/GUIA_DESARROLLO.md` el uso y valores por defecto de `VITE_USE_POLLING` y `VITE_POLLING_INTERVAL_MS`, incluido el efecto esperado sobre HMR. El build debe registrar tambien que la meta de CPU no se alcanzo y separar claramente cambios de fase 1 y fase 2. No se requiere ADR ni actualizacion de `docs/ESQUEMA_BASE_DATOS.md` porque no hubo cambio durable de arquitectura, modelos o esquema.

### Media - Atribucion del build contaminada por cambios no declarados

El arbol de trabajo contiene cambios adicionales, incluidos `frontend/package-lock.json` y `frontend/dist/index.html`; el plan excluye expresamente el lockfile si no cambian dependencias. Sin SHA posterior ni lista de archivos atribuibles, la evidencia de build no puede asociarse inequivocamente al alcance. Deben excluirse o justificarse antes del cierre.

## Pruebas requeridas

1. Persistir comando y salida de Vitest para `useAppVersionCheck`, `PlantillasHorarioPage`, `AplicarPlantillaModal` y `WeeklyScheduleEditor`; conservar el resultado de los 16 casos del hub solo como regresion lateral.
2. Agregar pruebas de configuracion para polling estricto y fallback de intervalo, exclusiones, warmup y `holdUntilCrawlEnd`.
3. Registrar TypeScript, ESLint focal, suite Vitest aplicable y build con comando, fecha y resumen de salida.
4. Verificar HMR con polling activo e inactivo, incluyendo crear, editar y renombrar un TSX, y dejar evidencia del tiempo de propagacion.
5. Repetir el benchmark posterior con el mismo protocolo y recursos del antes; guardar JSON crudo anonimizado. Para frio, realizar cinco reinicios/navegaciones y HAR sin contenido.
6. Completar las 50 muestras autenticadas de fase 0 antes de optimizar SQL/RBAC o declarar abierta la siguiente puerta.

## Documentacion requerida

1. Corregir metadatos, aprobacion y puertas del plan para reflejar lo realmente autorizado y ejecutado.
2. Ampliar el build con SHA/estado, comandos, entorno, artefactos crudos y evaluacion explicita de cada criterio, incluido el incumplimiento de CPU menor a 10 %.
3. Actualizar `docs/GUIA_DESARROLLO.md` con la configuracion de polling/HMR.
4. Justificar o excluir `package-lock.json` y artefactos de `dist` del alcance. El reporte de build ya aporta contexto duradero; una bitacora separada es opcional, aunque el checklist del plan aun la marca pendiente.

## Decision

**Bloqueado.** La mejora aritmetica reportada es internamente coherente, pero no esta respaldada por evidencia posterior reproducible, incumple la meta de CPU de fase 1 y fue implementada con una puerta documental que continua bloqueada.
