# Evidencias de actividades WBS

## Contrato

- Cada actividad admite un único archivo de evidencia; una nueva carga reemplaza la anterior.
- Formatos: PDF, PNG, JPEG, TXT UTF-8, CSV UTF-8, DOCX, XLSX y PPTX sin macros.
- Tamaño máximo: `STORAGE_MAX_SIZE_MB`, 25 MB por defecto y rango configurable de 1 a 100 MB.
- `archivo_url` es de solo lectura para clientes. Las URLs HTTP/HTTPS históricas se conservan, pero no son descargadas por el backend.
- Los endpoints requieren JWT, permiso RBAC `developments` y acceso al recurso WBS.

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| `POST` | `/api/v2/actividades/{id}/archivo` | Carga multipart con el campo `archivo` |
| `GET` | `/api/v2/actividades/{id}/archivo` | Descarga privada y auditada |
| `DELETE` | `/api/v2/actividades/{id}/archivo` | Desvincula y elimina el archivo interno |

La autenticación y el rate limit se evalúan antes de analizar el multipart. Un middleware ASGI limita el cuerpo completo antes de que llegue al parser, incluso cuando la solicitud no trae `Content-Length`.

## Persistencia

Los archivos se guardan bajo:

```text
STORAGE_PATH/actividades/{actividad_id}/{uuid}_{nombre_seguro}
```

Los `docker-compose` del proyecto montan `/app/storage/attachments` como volumen persistente. No se debe publicar ese volumen con `StaticFiles` ni mediante Nginx; toda descarga pasa por la API para aplicar autorización y auditoría.

## Operación

- El backup debe incluir conjuntamente PostgreSQL y el volumen configurado en `STORAGE_PATH`.
- La anulación lógica de una actividad conserva su evidencia para auditoría.
- Una URL legada solo se desvincula; el backend nunca intenta borrarla ni solicitarla.
- Los archivos temporales usan el mismo directorio del archivo final y se eliminan ante errores controlados.
- Si una limpieza física falla después de confirmar la base de datos, debe revisarse el log del backend y eliminarse el huérfano durante mantenimiento.
- En despliegues con varios hosts, `STORAGE_PATH` debe apuntar a almacenamiento compartido.

## Verificación

```powershell
docker compose exec backend pytest testing/backend/test_actividad_archivos.py -v
docker compose exec backend pytest testing/backend/test_infrastructure.py testing/backend/test_regresiones.py -v
```
