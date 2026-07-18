# Revisión backend — Firma final del contrato de Planilla Regional

**Fecha:** 2026-07-16
**Build:** Contrato versionado de Planilla Regional
**Autor del build:** OpenCode
**Modo:** build, revisión read-only
**Proyecto:** Gestor-de-proyectos-Ti

---

## 1. Archivos revisados

- `docs/specs/2026-07-16_planilla-regional-ddl.md`
- `docs/specs/2026-07-16_planilla-regional-consulta-tabla.md`
- `docs/specs/2026-07-16_planilla-regional-seguridad-operativa.md`
- `docs/reviews/plans/2026-07-16_planilla-regional-automatica-ejecucion.md`

Alcance cerrado exclusivamente a los tres pendientes de la revisión backend anterior y a la comprobación de manifiesto, checkpoint y grants ya corregidos.

## 2. Subagente ejecutado

| Subagente | Resultado | Bloquea | Notas |
|---|---|---|---|
| backend-reviewer | approved | no | Los tres pendientes contractuales están cerrados. |

## 3. Hallazgos bloqueantes

Ninguno.

## 4. Comprobaciones finales

1. **Guard `FALLIDO` y tabla vacía: cerrado.** El checkpoint captura `id_corte=COALESCE(max(id),0)` y el trigger mantiene bloqueadas las nuevas filas Planilla tanto en `EN_PROGRESO` como en `FALLIDO`; reanudación conserva el corte y solo `COMPLETADO` o `ABORTADO` liberan el guard (`planilla-regional-ddl.md:267-285`).
2. **DTO OT legacy compatible: cerrado.** Durante 1A-4C, `ubicacion` y `metodo_distribucion` son opcionales y el adaptador backend deriva ambos para el payload vigente; el endpoint v2 de Fase 5 exige el contrato nuevo sin retirar el adaptador legacy durante la activación (`planilla-regional-ddl.md:136-171`).
3. **`solicitud_id` durable: cerrado.** El cliente genera UUIDv4 y lo envía en `Idempotency-Key`; preview lo valida y persiste en el manifiesto durable, y confirmación bloquea/relee el manifiesto y valida actor, digest y TTL. Replay y dos workers tienen comportamiento definido (`planilla-regional-consulta-tabla.md:68-72`; `planilla-regional-ddl.md:289-321`).
4. **Manifiesto/checkpoint/grants: comprobados.** Los objetos y constraints contractuales están nombrados; la separación owner/migrador/runtime, las revocaciones de auditoría y el `GRANT EXECUTE` mínimo quedan explícitos, con verificación de privilegios reales prevista en 1P (`planilla-regional-ddl.md:395-406`; `planilla-regional-seguridad-operativa.md:27-36`; plan de ejecución: 80-107).

## 5. Tests / comandos ejecutados

No se ejecutaron suites: esta fue una firma read-only de contrato y aún no existe implementación de Planilla Regional.

Pruebas contractualmente obligatorias al implementar:

- lote fallido → `FALLIDO` → inserción concurrente rechazada → reanudación con mismo corte; incluir tabla vacía;
- payload OT legacy sin campos nuevos aceptado durante expand y payload v2 discriminado con `Decimal`;
- preview/confirmación/replay con igual y distinto `solicitud_id`/digest, reinicio de proceso y dos workers.

## 6. Documentación / RBAC

No se requiere seguimiento adicional para esta firma. El registro efectivo en `rbac_manifest.py`, las pruebas de grants y la actualización de `docs/ESQUEMA_BASE_DATOS.md` permanecen correctamente asignados a sus fases de implementación; no corresponden a Fase 0.

## 7. Decisión final

- [x] `approved`
- [ ] `approved_with_risks`
- [ ] `blocked`

Los tres pendientes previos están resueltos y no se identificó un bug bloqueante o alto concreto dentro del alcance cerrado.
