# Almacenamiento de archivos de nómina

## Ruta y volúmenes

El backend resuelve los originales bajo `backend_v2/uploads/nomina` en ejecución local y bajo `/app/uploads/nomina` dentro del contenedor.

- Desarrollo: `./backend_v2/uploads:/app/uploads`.
- Pruebas3: `./GestionTi_SoporteFiles_Pruebas3/nomina:/app/uploads/nomina`.
- Producción: `./GestionTi_SoporteFiles/nomina:/app/uploads/nomina`.

Los archivos se nombran por SHA-256 y extensión validada. Las rutas runtime están excluidas de Git. El directorio no debe publicarse mediante Nginx; las descargas pasan por endpoints autenticados que verifican contención bajo la ruta autorizada.

## Respaldo y restauración

El respaldo debe incluir en el mismo punto operativo:

1. PostgreSQL, incluidas `nomina_archivos` y `nomina_registros_normalizados`.
2. El volumen `uploads/nomina` correspondiente al entorno.

Una restauración se considera válida solo si los hashes y rutas registrados en PostgreSQL existen en el volumen restaurado. Debe verificarse una descarga autenticada antes de reabrir el servicio.

## Retención y limpieza

- No hay borrado automático de originales de nómina.
- Un original se conserva mientras exista una fila que lo referencie en `nomina_archivos` o durante el plazo documental definido por la organización, el que sea mayor.
- Los archivos sin metadata pueden aparecer tras una caída entre la escritura física y el commit. Se consideran huérfanos, no se sirven por API y no deben borrarse durante un despliegue o rollback.
- La limpieza de huérfanos requiere inventario por hash, backup recuperable, comparación contra `nomina_archivos`, aprobación operativa y registro de auditoría. Primero se mueve el archivo a cuarentena; el borrado definitivo solo ocurre después de verificar el período de recuperación acordado.

## Seguridad operativa

- Restringir lectura y escritura del volumen al usuario del backend y al proceso de backup.
- No registrar contenido, nombres con datos personales ni rutas completas en logs de error.
- Monitorear espacio libre y alertar antes de alcanzar el 80 % del volumen.
- El rollback de aplicación no elimina archivos ni metadata de nómina.
