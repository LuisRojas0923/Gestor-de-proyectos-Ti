# Revisión final definitiva docs/tests — horarios/relaciones

> **Estado documental:** CERRADO. Veredicto vigente `approved_with_risks`.
> Los riesgos residuales no representan hallazgos funcionales bloqueantes.

**Fecha:** 2026-07-10
**Alcance:** build final, pruebas concurrentes, IDOR, ERP/disponibilidad, evidencia TDD y documentación
**Veredicto:** `approved_with_risks`

## Evidencia inspeccionada

- Working tree, pruebas nuevas y ampliadas, reportes, ADR-008, esquema, contrato API, catálogo, bitácora y plan.
- `testing/backend/test_relaciones_concurrencia.py`: dos sesiones PostgreSQL reales mediante `asyncio.gather` para relación concurrente y replay concurrente de aplicación.
- `testing/backend/test_horarios_segunda_revision.py`: 12 casos de IDOR/pre-liquidación, recursos indirectos, GeoFace, RBAC, frontera ERP, jefe contractual y disponibilidad VAC/INC/LIC.
- `pytest --collect-only` ejecutado por este revisor sobre diez suites focales: **71 casos recolectados**, sin error de colección y con cuatro warnings conocidos de entorno/deprecación.
- Evidencia final reportada y consistente en build, bitácora y catálogo: backend **154 passed**; overrides **19 passed**; health **4 passed / 4 skipped**; carreras PostgreSQL **2 passed**; frontend **199 passed / 2 skipped**; focal frontend **10/10**; `tsc`, build y lint focal OK.
- Evidencia TDD roja documentada: la suite fue encontrada antes de existir los módulos nuevos y falló en colección con `ModuleNotFoundError` para schemas/servicios que luego fueron implementados.

Este revisor no reejecutó suites, Docker ni npm por restricciones del subagente. Los resultados verdes se aceptan como evidencia reportada; la colección local confirma existencia e importabilidad de los casos.

## Hallazgos por severidad

### Crítica/Alta

No se identificaron hallazgos críticos ni altos de docs/tests en el delta final.

### Media

1. **La concurrencia real cubre las dos carreras centrales, pero no todas las variantes del plan.** Se prueba relación con UUID distintos y replay compatible del mismo ledger de aplicación. No hay carrera explícita de payload incompatible esperando `409` ni carrera aplicación↔writer legacy sobre la misma cédula. La implementación comparte locks y existen pruebas secuenciales de conflicto/rollback, por lo que queda como ampliación de cobertura y no como bloqueo.

2. **La matriz IDOR es materialmente mejor, pero sigue distribuida y no exhaustiva a nivel HTTP.** Hay casos para pre-liquidación, cálculo/novedad indirectos, aplicación fuera de alcance, GeoFace relacionado/no relacionado y evidencia. No todos los endpoints del inventario del plan tienen parametrización HTTP completa `401/403/404` por path/query/body. El riesgo principal quedó cubierto; se recomienda convertir el inventario del contrato en una matriz parametrizada mantenible.

3. **No existe artefacto final de cobertura ni transcript completo de las corridas verdes.** Los conteos 154/19/199/2 aparecen coherentemente en los documentos de cierre, pero no se encontró log persistido ni porcentaje de líneas/ramas. Los conteos no sustituyen cobertura cuantitativa.

4. **Cerrado: seguridad publicó veredicto final independiente.** `security-horarios-relaciones-2026-07-10.md` declara `approved_with_risks`, sin hallazgos funcionales ni bloqueantes vigentes; los veredictos `blocked` permanecen únicamente en su cuerpo histórico.

### Baja

5. **La evidencia TDD roja es narrativa, no transcript crudo.** El `ModuleNotFoundError` y los módulos ausentes identifican un rojo válido y demuestran orden prueba→implementación, pero no se conserva comando/salida íntegra ni conteo exacto.

6. **Quality gates heredados:** lint global permanece en 531 errores/63 warnings, mientras el focal está limpio. Los cuatro skips health corresponden a dependencias de backend/token y los dos skips frontend a `RequirementsConsolidation`, fuera del track; deberían quedar explícitos en el build para reducir ambigüedad.

## Aspectos conformes

- Migración idempotente, reparación de constraints, fallo crítico y triggers append-only cuentan con pruebas PostgreSQL.
- Relaciones cubren alta/baja/reactivación, historial, rollback, replay y concurrencia real.
- Aplicación cubre snapshots, inmutabilidad posterior, rollback, idempotencia y replay concurrente.
- Bulk legacy cubre identidad canónica y savepoints éxito/error/éxito.
- IDOR y GeoFace cubren denegación antes de ERP/recurso, filtrado SQL, evidencia genérica, RBAC y headers no-store.
- ERP/disponibilidad cubre `503`, orden determinista del jefe y VACACIÓN/INCAPACIDAD/LICENCIA.
- Frontend final tiene revisión especializada `approved` y pruebas de idempotencia, modal stack, límite 200, accesibilidad, GeoFace y turnos.
- ADR-008, esquema manual/generado, contrato API, arquitectura, catálogo, bitácora, plan y especificación están alineados con el working tree.
- Reportes históricos backend/security/docs están identificados como supersedidos; backend contiene además veredicto definitivo `approved`.
- No hubo cambios en `.agents/skills/` ni `.opencode/agent/`; ADR-006 no requiere actualización.

## Pruebas recomendadas no bloqueantes

1. Carrera concurrente incompatible sobre el mismo `solicitud_id` y carrera aplicación↔writer legacy.
2. Matriz HTTP parametrizada para todos los endpoints protegidos del contrato.
3. Publicar cobertura y conservar logs de ejecución/CI con nombres y motivos de skips.

## Documentación recomendada

- Emitir re-revisión final de security o agregar una cabecera inequívoca con el veredicto vigente.
- Registrar en el build los nombres/motivos de los seis skips.
- Mantener la evidencia TDD como recuperada/narrativa, sin atribuirle conteos no disponibles.

## Decisión

Las razones de bloqueo anteriores están cerradas en los archivos reales: existen concurrencia PostgreSQL multi-sesión, cobertura IDOR/ERP/disponibilidad relevante y evidencia roja que demuestra precedencia de las pruebas. Los riesgos restantes son de exhaustividad y trazabilidad de artefactos, no impiden aprobar el alcance docs/tests.

```text
Docs/tests review: approved_with_risks
Findings: 0 críticas, 0 altas, 4 medias, 2 bajas.
Required tests: ninguno bloqueante; recomendadas carreras incompatibles/legacy, matriz HTTP completa y cobertura.
Required docs: re-revisión security final y detalle de skips/logs.
Blocking reasons: ninguna.
```
