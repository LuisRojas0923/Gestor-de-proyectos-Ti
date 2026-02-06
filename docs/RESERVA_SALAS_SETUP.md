# Reserva de Salas – Configuración de base de datos

## 1. Ejecutar el script SQL

El script `sql/reserva_salas_schema.sql` crea las tablas del módulo de reserva de salas en la misma base de datos del proyecto.

### Opción A: Con Adminer (recomendado si usas Docker)

1. Abre Adminer: `http://localhost:8085` (o la IP de tu máquina si accedes por red).
2. Conéctate con los mismos datos que usa el backend:
   - **Sistema:** PostgreSQL  
   - **Servidor:** `db` (desde Docker) o `localhost` (desde tu PC)  
   - **Usuario:** el valor de `DB_USER` (por defecto `user`)  
   - **Contraseña:** el valor de `DB_PASSWORD` (por defecto `password`)  
   - **Base de datos:** el valor de `DB_NAME` (por defecto `project_manager`)
3. Ve a **Importar** (o **SQL command**).
4. Pega el contenido de `sql/reserva_salas_schema.sql` y ejecuta.

### Opción B: Con psql desde la máquina

Si tienes `psql` y la base está en `localhost:5432`:

```bash
# Variables (ajusta si usas otras)
set PGPASSWORD=password
psql -h localhost -p 5432 -U user -d project_manager -f sql/reserva_salas_schema.sql
```

### Opción C: Con Docker (contenedor `db`)

```bash
# Desde la raíz del proyecto
docker exec -i gestor-de-proyectos-ti-db psql -U user -d project_manager < sql/reserva_salas_schema.sql
```

Ajusta el nombre del contenedor (`gestor-de-proyectos-ti-db`) y el usuario/base si los tienes distintos.

## 2. Verificar

Después de ejecutar el script deberías tener:

- Tablas: `rooms`, `reservation_series`, `reservations`, `reservation_audit`
- Una sala de ejemplo: "Sala de reuniones 1" (opcional; si no quieres datos de prueba, comenta o borra el `INSERT` final del script).

En Adminer puedes revisar la base de datos y ver que existan esas tablas.

## 3. Backend

Para que el frontend de Reserva de salas funcione con datos reales, el backend debe exponer la API de reserva de salas (endpoints bajo `/api/v2/reserva-salas/...`). Si esos endpoints aún no están implementados en este proyecto, el calendario seguirá mostrando el mensaje de “no hay salas” hasta que los implementes y conectes a estas tablas.
