# Backend review — Planilla Regional final

**Fecha:** 2026-07-16
**Resultado:** `blocked`

## Bloqueantes y altos nuevos

1. **[BLOQUEANTE] El guard del backfill se abre después de un fallo.** `docs/specs/2026-07-16_planilla-regional-ddl.md:279` rechaza escrituras solo durante `EN_PROGRESO`, pero tras un rollback cambia a `FALLIDO` y la reanudación conserva el `id_corte`. En esa ventana pueden entrar filas Planilla con ID mayor al corte que no serán procesadas ni detectadas por la verificación final `id <= id_corte`. El guard debe permanecer cerrado en todo estado reanudable (`EN_PROGRESO|FALLIDO`) o el corte debe ampliarse de forma segura; además, el contrato debe definir `COALESCE(max(id), 0)` para tabla vacía.

2. **[BLOQUEANTE] La transición del DTO OT/CC rompe la fase expand inactiva.** `docs/specs/2026-07-16_planilla-regional-ddl.md:153` hace obligatorios `ubicacion` y `metodo_distribucion` en inputs nuevos, mientras el cliente vigente no los envía y las fases 1A/2 modifican schema/backend antes de la adaptación frontend de Fase 5. Esto contradice la puerta de Fase 1A que exige no cambiar escritores actuales. Debe existir una ventana explícita de compatibilidad: aceptar el DTO vigente y derivar ambos campos en servidor, o versionar/cortar backend y frontend atómicamente; luego retirar el shape legacy en una fase posterior.

3. **[ALTO] El manifiesto durable no fija el origen de `solicitud_id`.** La tabla exige `solicitud_id NOT NULL UNIQUE` (`ddl.md:288`), pero el contrato de preview solo devuelve `manifest_id` y digest, y `solicitud_id` aparece por primera vez en confirmación (`consulta-tabla.md:70`). No queda definido cómo se persiste y vincula antes de confirmar, por lo que la idempotencia/replay entre reinicios y workers admite implementaciones incompatibles. El DTO de preview debe recibir el `solicitud_id` cliente o devolver el generado, y confirmación debe validar exactamente ese valor persistido.

## Pruebas obligatorias añadidas

- Fallo de lote → estado `FALLIDO` → intento de inserción concurrente rechazado → reanudación con el mismo corte → cero filas sin ITEM; incluir tabla vacía.
- Payload OT vigente, sin campos nuevos, continúa aceptado durante expand; payload nuevo valida discriminación OT/CC y Decimal; prueba de retiro posterior del compatibility path.
- Preview/confirmación/replay con el mismo y distinto `solicitud_id`/digest, reinicio de proceso y dos workers.

## Validación restante

No se identificaron otros bloqueantes/altos nuevos en preservación de índices legacy, privilegios de migrador/runtime/auditoría, históricos sin crudo ni separación del migrador externo. SHA contractual y commit permanecen correctamente como gate humano posterior, no como hallazgo técnico.
