# Revisión final docs/TDD — Planilla Regional Fase 0

**Fecha:** 2026-07-16
**Alcance:** contrato versionado, plan por fases, ADR-009, TDD y evidencia graphify
**Resultado:** `blocked`

## Verificaciones conformes

- El reporte del 2026-07-15 está marcado explícitamente como supersedido y su decisión histórica como invalidada. La rerevisión final será persistida por el orquestador después de recibir resultados; no se exige en este checkout.
- El SHA contractual pendiente y el commit posterior son gates humanos declarados, no defectos de contenido.
- El plan exige rojo antes de código y evidencia final verde con comando, entorno y salida por fase. Fase 0 no cambia lógica ni esquema, por lo que no corresponde exigir suites `test_planilla_regional_*` todavía.
- `docs/ESQUEMA_BASE_DATOS.md` se difiere correctamente hasta aplicar realmente el checkpoint expand; cada suite futura debe registrarse en `testing/CATALOGO_PRUEBAS.md` al quedar verde.
- Graphify existe como artefacto local ignorado: `GRAPH_REPORT.md` del 2026-07-16 informa 4.756 nodos y 9.276 aristas, coincide con el plan y su corpus incluye ADR-009, el plan y los tres contratos del 2026-07-16. La regeneración si cambia el SHA antes de EXECUTE ya está definida.
- `git diff --check` pasó. Los documentos contractuales permanecen por debajo de 550 líneas.

## Hallazgos altos nuevos

### ALTO 1 — La matriz llamada RACI no fija ownership por subfase

`docs/reviews/plans/2026-07-16_planilla-regional-automatica-ejecucion.md:44-53` agrupa `1P-1C` y `4A-4C` y usa columnas operativas, no roles R/A/C/I. Esto no permite resolver ownership de los artefactos compartidos entre 1P/1A ni entre 4A/4B/4C, y tampoco fija el handoff hacia Fase 5.

**Corrección requerida:** separar filas para `1P`, `1A`, `4A`, `4B`, `4C` y `5`; asignar un único accountable y responsables técnicos explícitos para migrador/runtime, DDL de dominio, seguridad/auditoría, DTO/OpenAPI, cutover legacy y espejo/UI frontend. La aprobación humana de commit/SHA permanece como gate separado.

### ALTO 2 — El SSOT DTO queda incompleto entre 4B y 4C

La Fase 4B declara `schemas_planilla_regional.py` como SSOT Pydantic de fila, consulta, faceta, exportación, configuración y códigos (`:289`), pero la Fase 4C introduce schemas de manifiesto/confirmación sin ruta ni pertenencia expresa al mismo SSOT (`:317`). La Fase 5 sí consume el OpenAPI congelado, pero el contrato no impide una segunda definición backend para esos DTO.

**Corrección requerida:** declarar que todos los DTO de transporte de Planilla Regional —incluidos manifiesto, confirmación, errores y envelopes públicos— pertenecen al módulo/paquete Pydantic canónico y generan el OpenAPI; TypeScript solo lo refleja y la prueba de paridad cubre también esos DTO.

### ALTO 3 — El DDL afirma constraints nombrados, pero conserva varios implícitos

`docs/specs/2026-07-16_planilla-regional-ddl.md:12-17` exige nombre estable para todos los constraints. Sin embargo, quedan PK/UNIQUE/CHECK/FK inline sin nombre, especialmente en registro ITEM (`:35-40`), configuración/códigos (`:181-204`), auditoría (`:212-229`) y, por completo, manifiesto/manifiesto_archivo (`:286-310`). Las reglas OT/CC de `:163-167` tampoco tienen nombres contractuales. Las listas posteriores no cubren todas esas PK, FK, UNIQUE y CHECK.

**Corrección requerida:** enumerar nombres estables para cada PK, FK, UNIQUE, CHECK y EXCLUDE de todas las tablas/alteraciones, incluidos manifiestos y asignaciones OT/CC, y exigir su comparación por nombre y definición en `pg_catalog` más pruebas de esquema parcial/definición divergente.

## Pruebas y documentación requeridas

- No crear ni ejecutar pruebas de producto durante Fase 0. Al corregir el plan, conservar la obligación global de evidencia roja/verde por cada fase y hacer explícita esa evidencia en la puerta 4C.
- Añadir a la matriz de contrato DTO la paridad Pydantic/OpenAPI/TypeScript para manifiesto y confirmación.
- Añadir a pruebas contractuales de migración la verificación de todos los nombres y definiciones de constraints, incluyendo manifiestos y OT/CC.
- No actualizar todavía `docs/ESQUEMA_BASE_DATOS.md`; hacerlo al aplicar expand y ejecutar `scripts/sync_docs.py`.

## Veredicto

```text
Docs/tests review: blocked
Findings: 0 bloqueantes críticos; 3 altos nuevos (RACI/ownership, DTO SSOT y constraints nombrados).
Required tests: contrato de nombres/definiciones de constraints y paridad DTO completa al iniciar sus fases; evidencia roja-verde por fase.
Required docs: separar ownership 1P/1A/4A/4B/4C/5, cerrar SSOT de manifiestos y nombrar todos los constraints.
Blocking reasons: las tres ambigüedades altas impiden congelar un contrato ejecutable sin drift. SHA/commit humano pendiente no se considera defecto.
```
