# Backend build review — carga real de evidencias WBS (cierre)

Fecha: 2026-07-15
Scope: router/servicio/middleware de evidencias WBS, modelo/config/acceso/main/auditoría/requirements, documentación y pruebas backend
Resultado: approved_with_risks

## Findings

### MEDIUM — GET mantiene una carrera frente a reemplazo o DELETE concurrente

- Referencias: `backend_v2/app/api/desarrollos/actividad_archivos_router.py:185-212`, `backend_v2/app/api/desarrollos/actividad_archivos_router.py:144-152`, `backend_v2/app/api/desarrollos/actividad_archivos_router.py:237-248`.
- La ruta se valida antes de crear `FileResponse`, pero el archivo se abre después. Un escritor puede confirmar y retirar esa versión en la ventana intermedia, haciendo fallar una descarga ya autorizada.
- No bloquea la carga real ni compromete autorización/integridad persistida, pero debe cubrirse con descriptor/stream estable o limpieza diferida y una prueba concurrente.

## Bloqueos resueltos

- Antes del rollback se copian `usuario.id`, `usuario.nombre` y `usuario.rol` a un contexto desacoplado de SQLAlchemy; la segunda autorización usa ese snapshot y no la instancia ORM expirada (`actividad_archivos_router.py:116-135`).
- La transacción read-only se cierra antes de `request.form()`, liberando conexión y evitando I/O multipart dentro de la transacción.
- `CargaActividadExcedida` se propaga al middleware; multipart chunked sin `Content-Length` devuelve 413.
- `FOR UPDATE` ocurre después de recibir/validar el archivo, seguido de relectura, reautorización y revalidación antes del commit.
- El servicio captura `BaseException`, protege y espera `os.replace` ante cancelación y limpia temporal/final.
- `archivo_url` no existe en schemas write; extras se ignoran para compatibilidad y no llegan a `model_dump()`. El campo permanece en lectura.
- La referencia física exige filename sin separadores y padre exacto de la actividad.
- Auth/RBAC y autorización por recurso preceden al parser multipart.
- RBAC reutiliza correctamente `developments`; no requiere cambio de manifiesto.
- No existe DDL nuevo ni SQL ajeno a PostgreSQL; `archivo_url` ya tiene blindaje y documentación de esquema.
- Archivos revisados bajo 550 líneas.

## Required tests

- Seguimiento no bloqueante: GET concurrente con reemplazo/DELETE.
- Antes del despliegue: ejecutar focales, infraestructura y regresiones dentro de Docker, justificando skips.

## Required docs/RBAC follow-up

- El runbook ya usa `docker compose exec backend pytest ...`.
- Sin follow-up de manifiesto RBAC ni de `docs/ESQUEMA_BASE_DATOS.md`.

## Evidencia

- Reportado por el solicitante: `test_actividad_archivos.py` 10 passed y `test_actividad_delete.py` 16 passed; lifecycle HTTP verde.
- Recolección permitida del revisor: 26 casos recolectados.
- `git diff --check`: sin errores, aparte de avisos LF/CRLF.

## Blocking reasons

- Ninguno.
