# Guía de Despliegue - Ambiente de Pruebas 3

Esta guía detalla el proceso para desplegar el ambiente de **Pruebas 3** en el servidor, utilizando Docker y GitHub. 

---

## 🏗️ 1. Preparación del Código (PC Local)

Antes de ir al servidor, debes asegurar que los cambios estén en GitHub.

1. **Subir cambios a la rama principal:**
   ```bash
   git add .
   git commit -m "feat: descripción de los cambios"
   git push origin main
   ```

---

## 🔑 2. Conexión y Autenticación del Servidor

El servidor utiliza una **Deploy Key** (llave SSH) para conectarse a GitHub de forma segura sin pedir contraseña constantemente.

### ¿Cómo verificar si la llave está activa?
En la terminal de **Ubuntu (WSL2)** del servidor, ejecuta:
```bash
ssh -T git@github.com
```
- **Si responde:** `Hi LuisRojas0923! You've successfully authenticated...`, la llave está perfecta. No necesitas hacer nada más.
- **Si responde error de permiso:** Debes asegurar que la llave privada esté cargada:
  ```bash
  eval `ssh-agent -s`
  ssh-add ~/.ssh/id_rsa_deploy  # El nombre puede variar
  ```

---

## 🚀 3. Despliegue en el Servidor (Paso a Paso)

Sigue estos comandos estrictamente en la terminal de **Ubuntu** del servidor:

### Paso 1: Crear e ingresar a la carpeta independiente
Para que Pruebas 3 no afecte a Producción, usaremos una carpeta nueva:
```bash
mkdir -p /mnt/c/GestorTI_Pruebas3
cd /mnt/c/GestorTI_Pruebas3
```

### Paso 2: Clonar el repositorio (Solo la primera vez)
Si la carpeta está vacía, clona el proyecto:
```bash
git clone git@github.com:LuisRojas0923/Gestor-de-proyectos-Ti.git .
```

### Paso 3: Bajar el código nuevo (Actualizaciones)
Si ya lo tienes clonado, simplemente descarga los cambios:
```bash
git pull origin main
```

### Paso 3: Configurar variables específicas
Asegúrate de que el archivo `.env.pruebas3` tenga los valores correctos (IPs, contraseñas).
```bash
nano .env.pruebas3
```

### Paso 4: Levantar el ambiente con Docker
Ejecuta el comando inyectando el archivo de variables y el compose específico:
```bash
sudo docker compose --env-file .env.pruebas3 -f docker-compose.Pruebas3.yml up -d --build
```

---

## 🌐 4. Configuración de Red y Puertos

Para evitar choques con Producción y otros ambientes, **Pruebas 3** utiliza estos puertos exclusivos:

| Servicio | Puerto Externo | Puerto Interno Docker |
|----------|----------------|-----------------------|
| **Frontend (Web)** | **8083** | 80 |
| **API (Backend)** | **8001** | 8000 |
| **Base de Datos** | **5435** | 5432 |

### Apertura de Firewall (PowerShell como Administrador)
Debes ejecutar esto en el **Windows** del servidor para permitir el tráfico:
```powershell
netsh advfirewall firewall add rule name="Gestor TI - Pruebas 3 Web" dir=in action=allow protocol=TCP localport=8083
netsh advfirewall firewall add rule name="Gestor TI - Pruebas 3 API" dir=in action=allow protocol=TCP localport=8001
netsh advfirewall firewall add rule name="Gestor TI - Pruebas 3 DB" dir=in action=allow protocol=TCP localport=5435
```

---

## 🛠️ 5. Comandos de Verificación (¿Cómo saber si todo está bien?)

Si algo no carga, ejecuta estos comandos en el servidor para "ver" qué pasa:

1. **Ver si los contenedores están corriendo:**
   ```bash
   sudo docker ps | grep pruebas3
   ```
   *(Deberías ver 4 contenedores con el sufijo `-pruebas3`).*

2. **Ver errores en tiempo real del API:**
   ```bash
   sudo docker compose -f docker-compose.Pruebas3.yml logs -f backend
   ```

3. **Ver si el puerto está escuchando en Windows:**
   ```powershell
   # En PowerShell Admin
   netstat -ano | findstr :8083
   ```

---

## 💾 6. Inicializar Datos (Si la base está vacía)
Si es la primera vez que despliegas o borraste la base de datos, carga los permisos y categorías:
```bash
sudo docker cp /mnt/c/GestorTI/INICIALIZAR_DATOS_SISTEMA.sql gestor-de-proyectos-ti-db-pruebas3:/tmp/
sudo docker exec -it gestor-de-proyectos-ti-db-pruebas3 psql -U user -d project_manager_pruebas3 -f /tmp/INICIALIZAR_DATOS_SISTEMA.sql
```

---

> [!IMPORTANT]
> **No olvides**: La URL de acceso para Pruebas 3 será: `http://192.168.0.21:8083`
