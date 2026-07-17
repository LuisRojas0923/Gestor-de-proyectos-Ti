# Guía de Mantenimiento y Operación - Producción 🚀

Este manual operativo detalla los procedimientos esenciales para el despliegue, mantenimiento y monitoreo del servidor de **Producción** (IP: `192.168.0.21`).

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

### Paso 3: Inicializar Base de Datos y roles
La aplicación no migra durante startup. El owner es `NOLOGIN`; define nombres
distintos y contraseñas diferentes para bootstrap PostgreSQL, migrador y
runtime. Genera también el archivo `RBAC_ADMIN_CAPABILITY_FILE` con
`openssl rand -hex 32`. En una base nueva, el init script crea los roles al
crear el volumen. En un volumen existente, ejecuta primero:
```bash
sudo docker compose -f docker-compose.prod.yml \
  --profile database-admin run --rm provision-roles
```

Si aún no existe administrador, crea un archivo secreto aleatorio de al menos
32 caracteres y ejecuta una sola vez:
```bash
sudo docker compose -f docker-compose.prod.yml \
  -f docker-compose.bootstrap.yml run --rm migrate
```
Elimina el archivo y no vuelvas a incluir ese override después del éxito.

---

## 🔄 2. Actualización de Código (Despliegue de Cambios)

Cuando el equipo de desarrollo sube mejoras a GitHub, aplícalas así:

### Paso 1: Descargar cambios
```bash
cd /mnt/c/GestorTI
git pull origin main    # Trae y combina las últimas mejoras desde GitHub
```

### Paso 2: Migrar y levantar contenedores
```bash
# El job debe terminar en cero antes de iniciar backend.
sudo docker compose -f docker-compose.prod.yml run --rm migrate
sudo docker compose -f docker-compose.prod.yml up -d --build
```

Si backend registra `Esquema incompleto` o `Privilegios runtime inválidos`, no
omitas la verificación. Detén el despliegue, restaura el backup si aplica,
ejecuta `provision-roles` y corrige mediante un nuevo job `migrate`.

Rollback: conserva backup previo y la imagen anterior, pero no intentes
deshacer DDL automáticamente. Las migraciones son idempotentes y se corrigen
con forward-fix revisado.

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

| Comando | Función |
|---------|---------|
| `sudo docker ps` | Lista qué contenedores están corriendo actualmente |
| `sudo docker compose -f docker-compose.prod.yml logs -f backend` | Ver errores del API en tiempo real |
| `sudo docker compose -f docker-compose.prod.yml logs -f nginx` | Ver logs de peticiones web y certificados |
| `sudo docker compose -f docker-compose.prod.yml logs -f db` | Ver errores de conexión a la base de datos |
| `sudo docker compose -f docker-compose.prod.yml logs migrate` | Ver el último job de migración |

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
**Resultado esperado:** 14 columnas, incluidas `nombre_usuario`, `rol_usuario`,
`ultima_actividad_en`, `fin_sesion`, `tipo_sesion`, `jti` y `scope`. La columna
`token_sesion` admite hasta 1000 caracteres, pero persiste solo SHA-256 de 64.

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
Si no existen, corrige el manifiesto RBAC versionado, solicita revisión y ejecuta
`docker compose -f docker-compose.prod.yml run --rm migrate`. Nunca repares RBAC
con DML manual usando la credencial runtime.

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
