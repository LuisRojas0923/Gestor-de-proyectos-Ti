Security/RBAC review: approved

## Checklist results
- Auth en endpoints: N/A
- Schemas sin dict: N/A
- PK con Field(pattern): N/A
- PUT/PATCH exclude_unset: N/A
- No str(e) en 500: N/A
- Secrets guard: N/A
- No print(): N/A
- PII redacted: N/A

Findings: none. Re-review focused only on the prior HIGH concurrency issue for logical annulment versus concurrent POST subactivity creation. `eliminar_actividad_cascade` now locks the root, iteratively locks all currently known subtree IDs with `FOR UPDATE`, rescans descendants until the subtree ID set is stable, and only then marks rows as `anulada`. `crear_actividad` locks the immediate parent with `FOR UPDATE` and rejects `parent.anulada`, so concurrent creation either commits before the delete's stable rescan and is included, or waits until delete commits and is rejected.

RBAC/config impact: none for this focused concurrency re-review.

Blocking reasons: none.

Severity: BAJO
