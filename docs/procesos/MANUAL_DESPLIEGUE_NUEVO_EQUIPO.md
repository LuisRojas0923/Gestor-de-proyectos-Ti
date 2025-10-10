# 🚀 Manual de Despliegue en Equipo Nuevo

## 📋 Descripción

Este manual te guía paso a paso para desplegar el **Gestor de Proyectos TI** en un equipo completamente nuevo utilizando los backups generados.

---

## ⚠️ Antes de Comenzar

### Requisitos del Sistema

- **Sistema Operativo:** Windows 10/11 (64-bit)
- **RAM:** Mínimo 8 GB (Recomendado 16 GB)
- **Espacio en Disco:** Mínimo 10 GB libres
- **Conexión a Internet:** Requerida para descargar software

### Archivos de Backup Necesarios

Debes tener acceso a:
- `database_YYYYMMDD_HHMMSS.sql` - Backup de base de datos
- `source_YYYYMMDD_HHMMSS.zip` - Backup de código fuente

> **Nota:** Estos archivos deberían estar en OneDrive, Google Drive u otro almacenamiento en la nube.

---

## 📝 FASE 1: Instalación de Prerrequisitos

### 1.1 Instalar Docker Desktop

Docker es **OBLIGATORIO** para ejecutar el proyecto.

1. **Descargar Docker Desktop:**
   - Ir a: https://www.docker.com/products/docker-desktop/
   - Descargar versión para Windows
   - Tamaño aproximado: ~500 MB

2. **Instalar Docker Desktop:**
   - Ejecutar el instalador descargado
   - Aceptar términos y condiciones
   - Habilitar WSL 2 si se solicita
   - **Reiniciar el equipo cuando termine**

3. **Verificar Instalación:**
   ```powershell
   # Abrir PowerShell y ejecutar:
   docker --version
   docker-compose --version
   ```
   
   Deberías ver algo como:
   ```
   Docker version 24.x.x
   Docker Compose version v2.x.x
   ```

4. **Iniciar Docker Desktop:**
   - Abrir Docker Desktop desde el menú de inicio
   - Esperar a que inicie completamente (ícono verde en la barra de tareas)

### 1.2 Instalar Git (Opcional pero Recomendado)

Si planeas hacer control de versiones:

1. **Descargar Git:**
   - Ir a: https://git-scm.com/download/win
   - Descargar versión más reciente

2. **Instalar:**
   - Ejecutar instalador
   - Usar configuraciones por defecto
   - Seleccionar "Git from the command line and also from 3rd-party software"

3. **Verificar:**
   ```powershell
   git --version
   ```

### 1.3 Instalar Editor de Código (Opcional)

Recomendado: **Visual Studio Code**
- Descargar: https://code.visualstudio.com/
- Instalar con configuraciones por defecto

---

## 📦 FASE 2: Preparación del Entorno

### 2.1 Descargar Backups desde la Nube

1. **Acceder a tu almacenamiento en la nube:**
   - OneDrive: Carpeta `Backups/Proyectos`
   - Google Drive: Carpeta `Backups_Proyectos`

2. **Descargar los archivos más recientes:**
   - `database_YYYYMMDD_HHMMSS.sql`
   - `source_YYYYMMDD_HHMMSS.zip`

3. **Crear carpeta temporal:**
   ```powershell
   # Crear en el escritorio o donde prefieras
   New-Item -ItemType Directory -Path "C:\Temp\ProyectoRestauracion"
   ```

4. **Mover los backups descargados a la carpeta temporal**

### 2.2 Extraer Código Fuente

1. **Extraer el archivo ZIP:**
   ```powershell
   # Ir a la carpeta temporal
   cd C:\Temp\ProyectoRestauracion
   
   # Extraer (usar explorador de Windows o PowerShell)
   Expand-Archive -Path ".\source_YYYYMMDD_HHMMSS.zip" -DestinationPath ".\proyecto"
   ```

2. **Elegir ubicación final:**
   
   Decide dónde quieres el proyecto. Ejemplos:
   - `C:\Proyectos\Gestor-de-proyectos-Ti`
   - `C:\Users\TuUsuario\Documents\Gestor-de-proyectos-Ti`

3. **Mover proyecto a ubicación final:**
   ```powershell
   # Ejemplo:
   Move-Item -Path ".\proyecto" -Destination "C:\Proyectos\Gestor-de-proyectos-Ti"
   ```

4. **Navegar al proyecto:**
   ```powershell
   cd "C:\Proyectos\Gestor-de-proyectos-Ti"
   ```

---

## ⚙️ FASE 3: Configuración del Proyecto

### 3.1 Crear Carpeta de Backups

```powershell
# Dentro del directorio del proyecto
New-Item -ItemType Directory -Path ".\backups" -Force
```

### 3.2 Copiar Backup de Base de Datos

```powershell
# Copiar el archivo SQL a la carpeta backups del proyecto
Copy-Item -Path "C:\Temp\ProyectoRestauracion\database_YYYYMMDD_HHMMSS.sql" -Destination ".\backups\"
```

### 3.3 Configurar Variables de Entorno (Backend)

**CRÍTICO:** Sin este paso, el proyecto no funcionará.

1. **Navegar a la carpeta backend:**
   ```powershell
   cd backend
   ```

2. **Verificar si existe `env.example`:**
   ```powershell
   Get-Item env.example
   ```

3. **Crear archivo `.env` desde el ejemplo:**
   ```powershell
   Copy-Item env.example .env
   ```

4. **Editar el archivo `.env`:**
   
   Abrirlo con un editor de texto y configurar:
   
   ```env
   # Base de datos
   DATABASE_URL=postgresql://user:password@db:5432/project_manager
   POSTGRES_USER=user
   POSTGRES_PASSWORD=password
   POSTGRES_DB=project_manager
   
   # API
   API_HOST=0.0.0.0
   API_PORT=8000
   
   # Seguridad (cambiar en producción)
   SECRET_KEY=tu-clave-secreta-super-segura-cambiala
   
   # Otras configuraciones según necesites
   ```

   > **Importante:** Si tienes configuraciones específicas de email, APIs externas, etc., configúralas aquí.

5. **Volver al directorio raíz:**
   ```powershell
   cd ..
   ```

---

## 🔄 FASE 4: Restauración de Base de Datos

### 4.1 Iniciar Servicios Docker (Primera vez)

```powershell
# Construir y levantar contenedores
docker-compose up -d
```

**Esperar entre 2-5 minutos** mientras Docker descarga imágenes y construye contenedores.

### 4.2 Verificar que Contenedores Estén Corriendo

```powershell
docker ps
```

Deberías ver al menos 3 contenedores:
- `gestor-de-proyectos-ti-db-1` (PostgreSQL)
- `gestor-de-proyectos-ti-backend-1` (FastAPI)
- `gestor-de-proyectos-ti-frontend-1` (React)

### 4.3 Restaurar Base de Datos

**Opción A: Usar Script de Restauración (Recomendado)**

```powershell
.\restore_simple.ps1 -BackupFile ".\backups\database_YYYYMMDD_HHMMSS.sql" -Type "database"
```

**Opción B: Restauración Manual**

Si el script no funciona:

```powershell
# Copiar backup al contenedor de base de datos
docker cp .\backups\database_YYYYMMDD_HHMMSS.sql gestor-de-proyectos-ti-db-1:/tmp/backup.sql

# Ejecutar restauración dentro del contenedor
docker exec -i gestor-de-proyectos-ti-db-1 psql -U user -d project_manager -f /tmp/backup.sql
```

### 4.4 Verificar Restauración

```powershell
# Conectarse a PostgreSQL
docker exec -it gestor-de-proyectos-ti-db-1 psql -U user -d project_manager

# Dentro de psql, ejecutar:
\dt
# Deberías ver las tablas: developments, activity_logs, incidents, etc.

# Contar registros en developments
SELECT COUNT(*) FROM developments;

# Salir
\q
```

---

## ✅ FASE 5: Verificación del Despliegue

### 5.1 Verificar Backend (API)

1. **Abrir navegador y acceder a:**
   ```
   http://localhost:8000/docs
   ```

2. **Deberías ver:**
   - Documentación interactiva de FastAPI (Swagger UI)
   - Lista de endpoints disponibles

3. **Probar un endpoint:**
   - Expandir `GET /developments/`
   - Click en "Try it out"
   - Click en "Execute"
   - Verificar que devuelve datos (código 200)

### 5.2 Verificar Frontend (Aplicación)

1. **Abrir navegador y acceder a:**
   ```
   http://localhost:5173
   ```

2. **Deberías ver:**
   - Interfaz de la aplicación
   - Panel lateral con navegación
   - Página de inicio o Dashboard

3. **Navegar a "Mis Desarrollos":**
   - Verificar que cargue la lista de desarrollos
   - Verificar que muestre datos correctos

### 5.3 Verificar Logs de Contenedores

Si algo no funciona:

```powershell
# Ver logs del backend
docker-compose logs backend

# Ver logs del frontend
docker-compose logs frontend

# Ver logs de la base de datos
docker-compose logs db

# Ver logs en tiempo real
docker-compose logs -f
```

---

## 🛠️ FASE 6: Configuración Post-Despliegue

### 6.1 Verificar Scripts de Backup

```powershell
# Verificar que los scripts existen
Get-Item .\backup_simple.ps1
Get-Item .\restore_simple.ps1
```

### 6.2 Realizar Primer Backup de Prueba

```powershell
# Ejecutar backup para asegurar que funciona
.\backup_simple.ps1

# Verificar archivos creados
Get-ChildItem .\backups\ | Sort-Object LastWriteTime -Descending
```

### 6.3 Configurar Backup en la Nube

1. **Crear carpeta en OneDrive:**
   - Carpeta: `Backups/Proyectos`

2. **Subir primer backup:**
   - Arrastrar archivos desde `.\backups\` a OneDrive

3. **Configurar sincronización semanal** (ver INSTRUCCIONES_BACKUP.md)

---

## 🔧 Troubleshooting Común

### Problema: Docker no inicia

**Síntoma:** `docker: command not found` o error al ejecutar `docker ps`

**Solución:**
1. Verificar que Docker Desktop esté corriendo (ícono en barra de tareas)
2. Reiniciar Docker Desktop
3. Reiniciar el equipo si es necesario
4. Verificar que WSL 2 esté habilitado (Windows 10/11)

### Problema: Contenedores no se construyen

**Síntoma:** Error al ejecutar `docker-compose up`

**Solución:**
```powershell
# Limpiar contenedores antiguos
docker-compose down -v

# Reconstruir desde cero
docker-compose build --no-cache

# Levantar servicios
docker-compose up -d
```

### Problema: Base de datos no restaura

**Síntoma:** Error al ejecutar restore o tablas vacías

**Solución:**
```powershell
# Detener servicios
docker-compose down

# Eliminar volumen de base de datos
docker volume rm gestor-de-proyectos-ti_postgres_data

# Levantar servicios nuevamente
docker-compose up -d

# Esperar 30 segundos y reintentar restauración
.\restore_simple.ps1 -BackupFile ".\backups\database_YYYYMMDD_HHMMSS.sql" -Type "database"
```

### Problema: Frontend no carga

**Síntoma:** Página en blanco en http://localhost:5173

**Solución:**
```powershell
# Ver logs del frontend
docker-compose logs frontend

# Si hay errores de compilación, reconstruir
docker-compose restart frontend

# Si persiste, reconstruir completamente
docker-compose down
docker-compose build frontend
docker-compose up -d
```

### Problema: Backend devuelve error 500

**Síntoma:** Endpoints de API fallan

**Solución:**
```powershell
# Verificar variables de entorno
cat backend\.env

# Verificar conexión a base de datos
docker-compose logs backend | Select-String "database"

# Reiniciar backend
docker-compose restart backend
```

### Problema: Puerto ya en uso

**Síntoma:** `Error: Port 8000 is already in use`

**Solución:**
```powershell
# Opción 1: Identificar proceso usando el puerto
netstat -ano | findstr :8000

# Opción 2: Cambiar puerto en docker-compose.yml
# Editar docker-compose.yml y cambiar "8000:8000" por "8001:8000"
```

---

## 📋 Checklist de Despliegue Exitoso

Marca cada item conforme lo completes:

### Prerrequisitos
- [ ] Docker Desktop instalado y corriendo
- [ ] Git instalado (opcional)
- [ ] Editor de código instalado (opcional)

### Archivos y Configuración
- [ ] Backups descargados desde la nube
- [ ] Código fuente extraído en ubicación final
- [ ] Carpeta `backups` creada
- [ ] Backup SQL copiado a carpeta `backups`
- [ ] Archivo `.env` creado y configurado en backend

### Servicios Docker
- [ ] `docker-compose up -d` ejecutado sin errores
- [ ] 3 contenedores corriendo (db, backend, frontend)
- [ ] Base de datos restaurada exitosamente
- [ ] Tablas verificadas en PostgreSQL

### Verificación
- [ ] Backend accesible en http://localhost:8000/docs
- [ ] Endpoints de API responden correctamente
- [ ] Frontend accesible en http://localhost:5173
- [ ] Datos visibles en "Mis Desarrollos"
- [ ] Logs sin errores críticos

### Post-Despliegue
- [ ] Backup de prueba ejecutado correctamente
- [ ] Carpeta en OneDrive creada
- [ ] Primer backup subido a la nube
- [ ] Documentación revisada

---

## 📞 Soporte y Recursos

### Documentación Relacionada

- `INSTRUCCIONES_BACKUP.md` - Backup diario
- `BACKUP_README.md` - Sistema completo de backups
- `README.md` - Información general del proyecto
- `docs/arquitectura/` - Arquitectura del sistema

### Comandos Útiles de Docker

```powershell
# Ver contenedores corriendo
docker ps

# Ver todos los contenedores (incluso detenidos)
docker ps -a

# Ver logs de un servicio específico
docker-compose logs [servicio]

# Detener todos los servicios
docker-compose down

# Iniciar servicios
docker-compose up -d

# Reconstruir un servicio específico
docker-compose build [servicio]

# Reiniciar un servicio
docker-compose restart [servicio]

# Ver uso de recursos
docker stats

# Limpiar recursos no usados
docker system prune -a
```

### Comandos de PowerShell Útiles

```powershell
# Ver archivos recientes
Get-ChildItem -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 10

# Buscar archivo
Get-ChildItem -Recurse -Filter "*.sql"

# Ver tamaño de carpeta
Get-ChildItem -Recurse | Measure-Object -Property Length -Sum

# Crear archivo de log
docker-compose logs > despliegue_log.txt
```

---

## ⚠️ Advertencias Finales

### Seguridad

1. **NUNCA** commitear el archivo `.env` a Git
2. **CAMBIAR** el `SECRET_KEY` en producción
3. **USAR** contraseñas fuertes para PostgreSQL
4. **MANTENER** Docker Desktop actualizado

### Backups

1. **EJECUTAR** `.\backup_simple.ps1` diariamente
2. **SUBIR** backups a la nube semanalmente
3. **VERIFICAR** que los backups sean válidos
4. **PROBAR** restauración periódicamente

### Mantenimiento

1. **ACTUALIZAR** dependencias regularmente
2. **MONITOREAR** logs de errores
3. **LIMPIAR** contenedores no usados
4. **DOCUMENTAR** cambios de configuración

---

## 🎯 Próximos Pasos

Una vez que el sistema esté corriendo:

1. **Familiarizarse con la aplicación:**
   - Explorar todas las páginas
   - Probar crear/editar desarrollos
   - Revisar indicadores KPIs

2. **Configurar backups automáticos:**
   - Ver `INSTRUCCIONES_BACKUP.md`
   - Configurar tarea programada de Windows (opcional)

3. **Personalizar configuraciones:**
   - Revisar archivo `.env`
   - Ajustar según necesidades específicas

4. **Revisar documentación técnica:**
   - `docs/arquitectura/ARQUITECTURA_BACKEND.md`
   - `docs/arquitectura/ARQUITECTURA_FRONTEND.md`
   - `docs/arquitectura/ARQUITECTURA_BASE_DATOS.md`

---

**✅ Si completaste todos los pasos del checklist, tu sistema está desplegado correctamente.**

**🎉 ¡Felicitaciones! El Gestor de Proyectos TI está listo para usar.**

