# Guía de Despliegue - Ambiente de Pruebas 3

Esta guía detalla el proceso para desplegar el ambiente de **Pruebas 3** en el servidor, utilizando Docker y GitHub. 

---

## 🏗️ 1. Preparación del Código (PC Local)

Antes de ir al servidor, debes asegurar que los cambios estén en GitHub.

1. **Subir cambios a la rama principal:**
   ```bash
   git add .                              # Prepara todos los archivos modificados para el commit
   git commit -m "feat: descripción de los cambios" # Crea el paquete de cambios con un mensaje descriptivo
   git push origin main                   # Sube tus cambios al repositorio central en GitHub
   ```

---

## 🔌 2. Acceso Remoto al Servidor (SSH)

Para conectarte al servidor desde tu máquina local de forma rápida:

1.  **Configurar SSH Local**: Agrega esto a tu archivo `~/.ssh/config` en tu PC:
    ```text
    Host GestorTI-Server
        HostName 192.168.0.21
        User amejoramiento6
        StrictHostKeyChecking no
    ```
2.  **Entrar al servidor**: Ejecuta `ssh GestorTI-Server` en tu terminal.
3.  **Activar WSL**: Una vez logueado en Windows, escribe `wsl` para entrar al entorno Linux.
4.  **Ir a Pruebas 3**: `cd /mnt/c/GestorTI_Pruebas3`.

---

## 🔑 3. Conexión y Autenticación del Servidor (GitHub)

El servidor utiliza una **Deploy Key** (llave SSH) para conectarse a GitHub de forma segura sin pedir contraseña constantemente.

### ¿Cómo verificar si la llave está activa?
En la terminal de **Ubuntu (WSL2)** del servidor, ejecuta:
```bash
ssh -T git@github.com   # Intenta establecer una conexión de prueba con GitHub usando tu llave SSH
```
- **Si responde:** `Hi LuisRojas0923! You've successfully authenticated...`, la llave está perfecta. No necesitas hacer nada más.
- **Si responde error de permiso:** Debes asegurar que la llave privada esté cargada:
  ```bash
  eval `ssh-agent -s`           # Inicia el agente de llaves SSH en segundo plano
  ssh-add ~/.ssh/id_rsa_deploy  # Carga tu llave privada específica al agente
  ```

---

## 🚀 4. Despliegue en el Servidor (Paso a Paso)

Sigue estos comandos estrictamente en la terminal de **Ubuntu** del servidor:

### Paso 1: Crear e ingresar a la carpeta independiente
Para que Pruebas 3 no afecte a Producción, usaremos una carpeta nueva:
```bash
mkdir -p /mnt/c/GestorTI_Pruebas3   # Crea la carpeta en Windows (si no existe) desde Linux
cd /mnt/c/GestorTI_Pruebas3          # Entra a la carpeta de trabajo
```

### Paso 2: Clonar el repositorio (Solo la primera vez)
Si la carpeta está vacía, clona el proyecto:
```bash
git clone git@github.com:LuisRojas0923/Gestor-de-proyectos-Ti.git .   # Descarga todo el proyecto en la carpeta actual
```

### Paso 3: Bajar el código nuevo (Actualizaciones)
Si ya lo tienes clonado, simplemente descarga los cambios:
```bash
git pull origin main    # Trae y combina los cambios más recientes desde GitHub
```

### Paso 3: Configurar variables específicas
Asegúrate de que el archivo `.env.pruebas3` tenga los valores correctos (IPs, contraseñas).
```bash
nano .env.pruebas3   # Abre un editor de texto simple para revisar/cambiar valores del entorno
```

### Paso 4: Levantar el ambiente con Docker
Ejecuta el comando inyectando el archivo de variables y el compose específico. **Recomendamos el modo silencioso** para que el despliegue sea más rápido y cómodo:

```bash
# --build: Reconstruye las imágenes con el código nuevo
# > resultado.txt 2>&1: Guarda todo el proceso en un archivo para revisión fácil
sudo docker compose --env-file .env.pruebas3 -f docker-compose.Pruebas3.yml up -d --build > resultado.txt 2>&1
```

> [!TIP]
> Si el comando anterior falla o Nginx no toma los cambios, fuerza el reinicio:
> `sudo docker compose -f docker-compose.Pruebas3.yml up -d --force-recreate nginx > resultado_nginx.txt 2>&1`

---

## 🌐 5. Configuración de Red y Puertos

Para evitar choques con Producción y otros ambientes, **Pruebas 3** utiliza estos puertos exclusivos:

| Servicio | Puerto Externo | Puerto Interno Docker |
|----------|----------------|-----------------------|
| **Frontend (Web)** | **8083** | 80 |
| **API (Backend)** | **8001** | 8000 |
| **Base de Datos** | **5435** | 5432 |

### 4.1 Apertura de Firewall y Túnel de Red (PowerShell como Administrador)
Como Docker en WSL2 a veces solo escucha en `localhost` (127.0.0.1), debes ejecutar esto en **Windows** para que otros equipos puedan entrar:

```powershell
# 1. Abrir los puertos en el Firewall de Windows
netsh advfirewall firewall add rule name="Gestor TI - Pruebas 3 Web" dir=in action=allow protocol=TCP localport=8083
netsh advfirewall firewall add rule name="Gestor TI - Pruebas 3 API" dir=in action=allow protocol=TCP localport=8001
netsh advfirewall firewall add rule name="Gestor TI - Pruebas 3 DB" dir=in action=allow protocol=TCP localport=5435

# 2. Crear el túnel (PortProxy) para que responda a la IP 192.168.0.21
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8083 connectaddress=127.0.0.1 connectport=8083
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8001 connectaddress=127.0.0.1 connectport=8001
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=5435 connectaddress=127.0.0.1 connectport=5435
```

---

## 🛠️ 6. Comandos de Verificación (¿Cómo saber si todo está bien?)

Si algo no carga, ejecuta estos comandos en el servidor para "ver" qué pasa:

1. **Ver si los contenedores están corriendo:**
   ```bash
   sudo docker ps | grep pruebas3
   ```

2. **Diagnóstico Silencioso (Logs a archivo):**
   Si el sitio da error 502 o 504, guarda los logs en archivos para revisarlos sin saturar la terminal:
   ```bash
   # Ver logs del Backend
   sudo docker logs gestor-de-proyectos-ti-backend-pruebas3 --tail 100 > logs_backend.txt 2>&1

   # Ver logs de Nginx (Proxy)
   sudo docker logs gestor-de-proyectos-ti-nginx-pruebas3 --tail 100 > logs_nginx.txt 2>&1
   ```

3. **Ver si el puerto está escuchando en Windows:**
   ```powershell
   # Muestra si Windows está escuchando peticiones en el puerto del sitio web
   netstat -ano | findstr :8083
   ```

---

## 💾 7. Inicializar Datos (Si la base está vacía)
Si es la primera vez que despliegas o borraste la base de datos, carga los permisos y categorías:
```bash
# Copia el archivo SQL desde Windows a la carpeta temporal del contenedor de base de datos
sudo docker cp /mnt/c/GestorTI/INICIALIZAR_DATOS_SISTEMA.sql gestor-de-proyectos-ti-db-pruebas3:/tmp/

# Ejecuta el motor de PostgreSQL para procesar el archivo y crear tablas/datos
sudo docker exec -it gestor-de-proyectos-ti-db-pruebas3 psql -U user -d project_manager_pruebas3 -f /tmp/INICIALIZAR_DATOS_SISTEMA.sql
```

---

> [!IMPORTANT]
> **No olvides**: La URL de acceso para Pruebas 3 será: `http://192.168.0.21:8083`
