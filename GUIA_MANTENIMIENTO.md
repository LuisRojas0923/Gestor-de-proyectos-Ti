# Guía de Mantenimiento y Despliegue - Gestor de Proyectos TI

Esta guía contiene los comandos esenciales para administrar el servidor de producción (IP: 192.168.0.21) utilizando Docker y Git.

## 1. Actualizar el Código (Git Pull)

Cuando realices cambios en el repositorio de GitHub y quieras verlos reflejados en el servidor:

### Paso A: Sincronizar desde PowerShell (Windows)
Debido a que las llaves SSH están configuradas en Windows, es más fácil hacer el pull desde allí:
1. Abre **PowerShell**.
2. Ejecuta:
   ```powershell
   cd C:\GestorTI
   git pull origin main
   ```

### Paso B: Resolver Conflictos de Archivos Untracked
Si el `git pull` falla porque un archivo local (como `docker-compose.prod.yml`) no está en Git:
```powershell
# Cambiar nombre al archivo que bloquea
Rename-Item -Path "C:\GestorTI\docker-compose.prod.yml" -NewName "docker-compose.prod.yml.backup"
# Reintentar el pull
git pull origin main
```

---

## 2. Administración de Docker (Ubuntu WSL2)

Todos estos comandos se ejecutan dentro del terminal de **Ubuntu**.

### Reiniciar el Sistema (Sin reconstruir)
Si solo quieres reiniciar los servicios (por ejemplo, después de un cambio en el `.env` o un error temporal):
```bash
cd /mnt/c/GestorTI
sudo docker-compose -f docker-compose.prod.yml restart
```

### ¿Cuándo reconstruir contenedores? (Rebuild)
Debes reconstruir (usar `--build`) cuando:
1. Hayas hecho un `git pull` con cambios en el código de Python (Backend) o React (Frontend).
2. Hayas modificado un `Dockerfile`.
3. Hayas agregado nuevas librerías en `requirements.txt` o `package.json`.

**Comando para reconstruir y levantar:**
```bash
sudo docker-compose -f docker-compose.prod.yml up -d --build
```

### Limpieza profunda (Reset de Base de Datos)
Si necesitas borrar la base de datos local y recrear las tablas de cero (Cuidado: borra datos):
```bash
sudo docker-compose -f docker-compose.prod.yml down -v
sudo docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 3. Monitoreo de Logs (Ubuntu)

Para ver qué está pasando "dentro" de los servicios y detectar errores:

### Ver Logs del Backend (API)
```bash
# Ver las últimas 50 líneas
sudo docker logs gestorti_backend_1 --tail 50

# Ver logs en tiempo real (seguimiento)
sudo docker logs -f gestorti_backend_1
```

### Ver Logs de la Base de Datos (Postgres)
```bash
sudo docker logs gestor-de-proyectos-ti-db --tail 50
```

### Ver Logs del Servidor Web (Nginx)
Útil para ver si el error es de conexión de red (502 Gateway):
```bash
sudo docker logs gestor-de-proyectos-ti-nginx --tail 50
```

### Ver Logs del Frontend
Normalmente el frontend es estático, pero si hay errores al servir los archivos:
```bash
sudo docker logs gestorti_frontend_1 --tail 50
```

---

## 5. Carga de Datos Iniciales (Seed)

Si notas que el sistema está vacío (no hay categorías de tickets, no hay permisos en el menú, etc.), ejecuta el script maestro de inicialización:

```bash
# Copia el script al contenedor de la base de datos
sudo docker cp /mnt/c/GestorTI/INICIALIZAR_DATOS_SISTEMA.sql gestor-de-proyectos-ti-db:/tmp/

# Ejecuta el script dentro de PostgreSQL
sudo docker exec -it gestor-de-proyectos-ti-db psql -U user -d project_manager -f /tmp/INICIALIZAR_DATOS_SISTEMA.sql
```

Esto activará:
- ✅ **Categorías de Soporte** (Hardware, Software, etc.)
- ✅ **Matriz de Permisos** (Habilita el menú lateral)
- ✅ **Etapas de Desarrollo**
- ✅ **Salas de Reuniones**

---

## 6. Acceso Externo desde Clientes (DBeaver / pgAdmin)

Como el puerto **5432** del servidor ya está ocupado por tu ERP, hemos configurado Docker para que la base de datos del proyecto sea accesible por el puerto **5433**.

### Pasos para conectar desde otro equipo:

1. **Configurar el Túnel en Windows Server (PowerShell Admin):**
   Debes mapear el puerto de Windows hacia Linux/WSL2:
   ```powershell
   # 1. Obtener la IP de WSL
   wsl -d Ubuntu hostname -I
   
   # 2. Crear el proxy (reemplaza <IP_WSL> con el resultado del comando anterior)
   netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=5433 connectaddress=<IP_WSL> connectport=5433
   ```

2. **Abrir el Puerto en Firewall (PowerShell Admin):**
   ```powershell
   New-NetFirewallRule -DisplayName "Docker DB External Access" -Direction Inbound -LocalPort 5433 -Protocol TCP -Action Allow
   ```

3. **Datos de Conexión en tu Cliente (DBeaver/pgAdmin):**
   - **Host:** `192.168.0.21`
   - **Puerto:** `5433`
   - **Base de Datos:** `project_manager`
   - **Usuario:** `user`
   - **Contraseña:** (La que está en tu archivo .env)

---

> [!NOTE]
> Recuerda que el archivo `.env` en `C:\GestorTI\.env` es la fuente de verdad para las credenciales y configuraciones de producción.
