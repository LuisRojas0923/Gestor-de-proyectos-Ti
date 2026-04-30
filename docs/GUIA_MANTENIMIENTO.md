# Guía de Mantenimiento y Operación - Producción 🚀

Este manual operativo detalla los procedimientos esenciales para el despliegue, mantenimiento y monitoreo del servidor de **Producción** (IP: `192.168.0.21`).

---

## 🔌 0. Acceso Remoto al Servidor (SSH)

Para facilitar la conexión desde tu máquina local, agrega la siguiente configuración a tu archivo `~/.ssh/config`:

```text
Host GestorTI-Server
    HostName 192.168.0.21
    User amejoramiento6
    StrictHostKeyChecking no
```

### Cómo entrar al servidor:
1.  **Conexión SSH**: Abre una terminal y ejecuta `ssh GestorTI-Server`.
2.  **Entrar a Linux (WSL2)**: Una vez dentro del prompt de Windows del servidor, escribe `wsl`.
3.  **Ir a la carpeta del proyecto**: `cd /mnt/c/GestorTI`.

---

## 🏗️ 1. Instalación Inicial (Setup desde Cero)

Sigue estos pasos en la terminal de **Ubuntu (WSL2)** si necesitas recrear el ambiente en el servidor:

### Paso 1: Crear e ingresar a la carpeta
```bash
mkdir -p /mnt/c/GestorTI   # Crea el directorio en el disco C: de Windows desde Linux
cd /mnt/c/GestorTI          # Entra a la carpeta de trabajo
```

### Paso 2: Clonar el repositorio
El servidor utiliza una **Deploy Key** para conectarse de forma segura:
```bash
# git clone: Descarga el proyecto completo en la carpeta actual
git clone git@github.com:LuisRojas0923/Gestor-de-proyectos-Ti.git .
```

### Paso 3: Inicializar Base de Datos (SQL Maestro)
Si la base de datos está vacía, carga el script con toda la estructura y roles:
```bash
# Copia el script al contenedor de Postgres
sudo docker cp ./sql/init_db.sql gestor-de-proyectos-ti-db:/tmp/

# Ejecuta el motor SQL para aplicar los cambios (Roles, Permisos, Categorías)
sudo docker exec -it gestor-de-proyectos-ti-db psql -U user -d project_manager -f /tmp/init_db.sql
```

---

## 🔄 2. Actualización de Código (Despliegue de Cambios)

Cuando el equipo de desarrollo sube mejoras a GitHub, aplícalas así:

### Paso 1: Descargar cambios
```bash
cd /mnt/c/GestorTI
git pull origin main    # Trae y combina las últimas mejoras desde GitHub
```

### Paso 2: Levantar Contenedores (Despliegue Silencioso)
```bash
# --build: Reconstruye las imágenes con el código nuevo descargado
# > resultado_prod.txt: Guarda el progreso para revisión cómoda y ejecución rápida
sudo docker compose -f docker-compose.prod.yml up -d --build > resultado_prod.txt 2>&1
```

> [!IMPORTANT]
> Si actualizaste la configuración de Nginx (SSL o WebSockets), fuerza su recreación:
> `sudo docker compose -f docker-compose.prod.yml up -d --force-recreate nginx > resultado_nginx.txt 2>&1`

---

## 🛡️ 3. Persistencia y Scripts Especiales

### 3.1 Mantener Docker Vivo (Persistencia)
Para evitar que los contenedores se apaguen al cerrar la terminal de Ubuntu, asegúrate de que el script `.vbs` esté activo en el **Programador de Tareas** de Windows:

- **Ubicación del script**: `C:\GestorTI\mantener_docker_vivo.vbs`
- **Función**: Inicia Ubuntu silenciosamente al arrancar el servidor y sostiene la ejecución de Docker.

### 3.2 Administración de Servicios
```bash
sudo docker compose -f docker-compose.prod.yml restart # Reinicio rápido (sin reconstruir)
sudo docker compose -f docker-compose.prod.yml down    # Apaga todo el sistema
```

---

## 📊 4. Monitoreo y Logs (Troubleshooting)

Si algo no funciona correctamente, inspecciona el interior de los contenedores:

| Función | Comando (Ver en vivo) | Comando (Guardar a .txt) |
|---------|-----------------------|--------------------------|
| **Estado General** | `sudo docker ps` | `sudo docker ps > status.txt` |
| **Logs API** | `sudo docker logs gestorti-backend-1 -f` | `sudo docker logs gestorti-backend-1 --tail 200 > logs_api.txt` |
| **Logs Nginx** | `sudo docker logs gestor-de-proyectos-ti-nginx -f` | `sudo docker logs gestor-de-proyectos-ti-nginx --tail 200 > logs_nginx.txt` |
| **Logs Redis** | `sudo docker logs gestor-de-proyectos-ti-redis-prod -f` | `sudo docker logs gestor-de-proyectos-ti-redis-prod > logs_redis.txt` |

---

## 🛠️ 5. Utilidades y Scripts de Mantenimiento

En la carpeta `./sql/` encontrarás scripts especializados para tareas administrativas comunes:

### 🧹 Limpieza de Datos
- **[util_limpiar_tickets.sql](file:///c:/Users/amejoramiento6/Gestor-de-proyectos-Ti/sql/util_limpiar_tickets.sql)**: Borra los tickets de prueba pero mantiene la configuración de categorías.

### 🔧 Reparación Técnica
- **[util_reparar_secuencias.sql](file:///c:/Users/amejoramiento6/Gestor-de-proyectos-Ti/sql/util_reparar_secuencias.sql)**: Corrige errores de ID cuando un insert manual falla o los números no coinciden.

### 🔗 Sincronización ERP
- **[erp_alineacion_viaticos.sql](file:///c:/Users/amejoramiento6/Gestor-de-proyectos-Ti/sql/erp_alineacion_viaticos.sql)**: Ajusta los saldos de viáticos con la base de datos de Solid.

**¿Cómo ejecutar una utilidad?**
```bash
sudo docker cp ./sql/NOMBRE_DEL_SCRIPT.sql gestor-de-proyectos-ti-db:/tmp/
sudo docker exec -it gestor-de-proyectos-ti-db psql -U user -d project_manager -f /tmp/NOMBRE_DEL_SCRIPT.sql
```

---

## 🔍 6. Verificación de Base de Datos (Diagnóstico)

Consultas para validar que la base de datos esté correctamente configurada después de un despliegue o migración.

### 6.1 Estructura de la Tabla Sesiones
Verifica que las columnas y los tipos de datos coincidan con la última versión:
```sql
SELECT 
    column_name, 
    data_type, 
    character_maximum_length, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'sesiones'
ORDER BY ordinal_position;
```
**Resultado esperado:** 11 columnas incluyendo `nombre_usuario`, `rol_usuario`, `ultima_actividad_en` y `fin_sesion`. El campo `token_sesion` debe tener longitud máxima de **1000**.

### 6.2 Índices de Rendimiento
Asegura que los índices necesarios para la Torre de Control existan:
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'sesiones';
```
**Resultado esperado:** Debe existir `idx_sesiones_actividad_reciente`.

### 6.3 Permisos de Torre de Control
Valida que los roles administrativos tengan acceso al módulo:
```sql
SELECT * FROM permisos_rol 
WHERE modulo = 'control-tower' 
AND rol IN ('admin', 'admin_sistemas');
```
**Resultado esperado:** 2 registros con `permitido = true`. 
Si no existen, ejecuta:
```sql
INSERT INTO permisos_rol (rol, modulo, permitido) VALUES
('admin', 'control-tower', true),
('admin_sistemas', 'control-tower', true)
ON CONFLICT (rol, modulo) DO UPDATE SET permitido = true;
```

### 6.4 Monitoreo de Sesiones en Tiempo Real
Valida que el backend esté guardando los metadatos correctamente:
```sql
SELECT id, usuario_id, nombre_usuario, rol_usuario, ultima_actividad_en, fin_sesion 
FROM sesiones 
ORDER BY creado_en DESC 
LIMIT 10;
```
**Resultado esperado:** Las columnas `nombre_usuario` y `rol_usuario` deben tener datos (no NULL) para sesiones recientes.

---

> [!IMPORTANT]
> Nunca modifiques el archivo `.env` directamente en producción sin antes tener una copia de respaldo. Es la "llave" de acceso a todas las bases de datos.
