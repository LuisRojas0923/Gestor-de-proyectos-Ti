# Revisión Build PR #15: ETL primas cooperativas

**Fecha:** 2026-07-15
**PR:** `#15 feat: Actualización ETL Novedades Nómina (Primas Beneficiar y Grancoop)`
**Base integrada:** `origin/main`

## Cambios validados

- `DCTO_PRIMA` es opcional para Beneficiar y no altera meses ordinarios.
- `CREDIPRIMA` genera `GRANCOOP PRIMA` sin sumar la columna total del PDF.
- `FONDO MUTUAL` solo se clasifica como prima cuando `NOMPRI` es un token del nombre.
- Archivo y nombre conservan correspondencia uno a uno; nombres vacíos o desalineados se rechazan.
- Las cargas exigen autenticación, permiso `nomina_novedades`, firma válida, máximo cinco archivos y 20 MB por archivo.
- PDFs con más de 500 páginas o cinco millones de caracteres se rechazan.
- Errores de parser/DB no exponen detalles internos y el parsing se ejecuta fuera del event loop.

## Evidencia TDD

Rojo inicial:

```text
5 failed, 6 passed
```

Verde focal final:

```text
27 passed, 11 warnings
```

Comando:

```powershell
docker compose run --rm -T -v "<worktree>:/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2 backend pytest testing/backend/test_cooperativas_archivos_seguridad.py testing/backend/test_beneficiar_prima.py testing/backend/test_grancoop_nombre_matching.py -q
```

Infraestructura:

```text
1 passed, 1 skipped, 2 warnings
```

```powershell
docker compose run --rm -T -v "<worktree>:/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2 backend pytest testing/backend/test_infrastructure.py -q
```

Health check transversal contra backend temporal de la PR en `:18001`:

```text
3 passed, 3 skipped, 2 warnings
```

```powershell
docker compose run --rm -T -v "<worktree>:/workspace" -w /workspace -e PYTHONPATH=/workspace/backend_v2 -e TEST_BASE_URL=http://host.docker.internal:18001/api/v2 backend pytest testing/backend/test_regresiones.py -q
```

Los skips corresponden a escenarios que requieren datos/servicios opcionales del entorno. No hubo fallos.

## Revisores

| Revisor | Estado previo | Correccion |
|---|---|---|
| Backend | Bloqueado | Pruebas actualizadas, validacion archivo/nombre, firmas por extension y health verde. |
| Seguridad/RBAC | Bloqueado | Auth/RBAC, limites, rate limit, threadpool con timeout y errores/logs saneados. |
| Docs/pruebas | Bloqueado | Catalogo, TDD, comandos Docker y evidencia completa. |
| Alcance | Bloqueado hasta persistir | Sin scope creep; frontend/movil no aplican. |
