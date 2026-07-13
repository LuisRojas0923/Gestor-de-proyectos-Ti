# Reporte parcial - Linea base de rendimiento fase 0

**Fecha:** 2026-07-12
**Plan:** `docs/reviews/plans/2026-07-12_optimizacion-rendimiento-aplicacion.md`
**Estado:** parcial, puerta de fase 0 bloqueada por medicion autenticada pendiente
**Git medido:** `d704ada3`

## Objetivo

Establecer una linea base reproducible antes de modificar Vite, Docker, React o backend.

## Artefactos

- Script: `scripts/performance_baseline.ps1`.
- Pruebas: `testing/scripts/test_performance_baseline.py`.
- Evidencia cruda anonimizada: `docs/reviews/builds/evidence/2026-07-12_rendimiento-frontend.json`.

El JSON no contiene headers, JWT, cookies, respuestas, cédulas ni nombres. El token autenticado se acepta solo mediante `PERF_AUTH_TOKEN` en el proceso y nunca se serializa.

## Protocolo ejecutado

- Plataforma: Windows + Docker Desktop.
- Modo: `frontend-only`.
- Warm-up: 5 solicitudes descartadas por recurso.
- Muestras: 50 solicitudes secuenciales por módulo.
- Percentiles: nearest-rank.
- Recursos: 30 muestras por contenedor, una por segundo.

Comando:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/performance_baseline.ps1 `
  -FrontendOnly -Warmup 5 -Iterations 50 -CpuWindowSeconds 30 `
  -OutputPath docs/reviews/builds/evidence/2026-07-12_rendimiento-frontend.json
```

## Resultados

### Contenedores en reposo

| Contenedor | CPU p50 | CPU p95 | CPU max | Memoria p50 |
|---|---:|---:|---:|---:|
| Frontend | 38.81 % | 43.67 % | 43.67 % | 166.7 MiB |
| Backend | 8.92 % | 10.31 % | 10.43 % | 298.6 MiB |

### Módulos Vite calientes

| Recurso | p50 | p95 | max |
|---|---:|---:|---:|
| Configuración HE | 6.91 ms | 15.39 ms | 17.42 ms |
| Calculadora HE | 7.01 ms | 17.63 ms | 27.81 ms |
| Alcance | 3.97 ms | 4.86 ms | 5.34 ms |
| Modal | 3.52 ms | 4.42 ms | 4.49 ms |

## Interpretación

1. El tamaño de transferencia no explica la lentitud sostenida: una vez transformados, los módulos responden en milisegundos.
2. El frontend consume cerca de 40 % de CPU sin interacción, consistente con polling agresivo sobre el bind mount Windows/Linux.
3. Las capturas del usuario de 2.8-3.7 segundos representan carga/transformación fría y contención, no el camino caliente.
4. La fase 1 tiene una hipótesis fuerte y medible: parametrizar polling y permitir prebundle de `lucide-react` debe reducir CPU y primera transformación.

## Validación automatizada

```text
testing/scripts/test_performance_baseline.py: 2 passed
```

Las pruebas verifican percentiles del modo self-test y que el contrato no serialice valores sensibles.

## Bloqueo actual

`PERF_AUTH_TOKEN` no está definido en el proceso de ejecución. Por seguridad no se solicita pegar JWT en chat ni se leen archivos `.env` o almacenamiento del navegador.

Falta ejecutar el modo completo para obtener 50 muestras autenticadas de:

- `GET /parametros-calculo`.
- `GET /festivos/{anio}`.
- `GET /alcance-empleados/gestores`.

Comando pendiente, ejecutado por el usuario en una terminal con una sesión de prueba:

```powershell
$secureToken = Read-Host 'JWT temporal de prueba' -AsSecureString
$tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
  $env:PERF_AUTH_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
  & .\scripts\performance_baseline.ps1 -Warmup 5 -Iterations 50 -CpuWindowSeconds 30 `
    -OutputPath docs/reviews/builds/evidence/2026-07-12_rendimiento-autenticado.json
} finally {
  Remove-Item Env:PERF_AUTH_TOKEN -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
}
```

No debe compartirse el JWT ni versionarse la terminal o su historial.

## Decisión de puerta

- [ ] Fase 0 aprobada.
- [x] Fase 0 parcial.
- [x] Fase 1 bloqueada hasta incorporar la evidencia autenticada y aprobar la línea base completa.
