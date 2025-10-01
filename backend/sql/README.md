# SQL del Proyecto

Esta carpeta organiza todos los artefactos SQL del backend.

## Estructura
- `stored_procedures/`
  - `kpi/`: SPs relacionados con KPIs (cumplimientos, calidad, etc.)
  - `providers/`: SPs/funciones relacionadas con proveedores
- `functions/`: funciones auxiliares SQL
- `views/`: definiciones de vistas
- `migrations/`: scripts de migración (vacío si se usa Alembic)
- `seeds/`: datos de semilla/carga inicial
- `maintenance/`: tareas operativas (ejecución de SP, updates puntuales)
- `queries/`: consultas ad‑hoc y de soporte

## Ejecución

### Con psql
```bash
# Variables de ejemplo
PGURL="postgresql://user:password@localhost:5432/project_manager"

# Ejecutar un script
psql "$PGURL" -f backend/sql/stored_procedures/kpi/sp_kpi_cumplimiento_fechas.sql
```

### Con Docker (si el DB está en contenedor)
```bash
docker exec -i <container_postgres> psql \
  -U <user> -d project_manager \
  -f /app/backend/sql/stored_procedures/kpi/sp_kpi_cumplimiento_fechas.sql
```

### Consideraciones
- Respete el orden: primero `functions/`, luego `views/`, después `stored_procedures/` si hay dependencias.
- `migrations/` se usa sólo para tareas fuera de Alembic (el proyecto usa Alembic para migraciones). 
- Revise `backend/alembic/` para cambios de esquema.

## Mantenimiento
- Para ejecutar todos los SPs de KPI: ejecute primero los archivos base que crean funciones o vistas requeridas, y luego los `*_detalle.sql`.
- `maintenance/execute_sp.sql` permite ejecutar SPs de forma controlada.

## Soporte
- Base de datos: PostgreSQL
- Issues o dudas: crear ticket en el repositorio o contacte al equipo de backend.
