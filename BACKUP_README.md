# 🛡️ Sistema de Backup - Gestor de Proyectos TI

## 📋 **RESUMEN DE LA SITUACIÓN**

Actualmente trabajas en un entorno productivo sin servidor dedicado, por lo que es **CRÍTICO** mantener backups regulares de tu información.

## 🚨 **RIESGOS IDENTIFICADOS**

- **Pérdida de datos** si tu PC se daña
- **Base de datos PostgreSQL** almacenada en volumen Docker
- **Código fuente** en desarrollo activo
- **Configuraciones** y datos de prueba

## 🛠️ **SOLUCIONES IMPLEMENTADAS**

### **1. Scripts de Backup Automatizados**

#### **Backup de Base de Datos:**
```powershell
.\backup_database.ps1
```
- Crea backup completo de PostgreSQL
- Mantiene últimos 7 backups
- Incluye timestamp automático

#### **Backup Completo del Proyecto:**
```powershell
.\backup_complete_project.ps1
```
- Backup de base de datos + código fuente
- Crea archivo ZIP comprimido
- Mantiene últimos 5 backups completos

#### **Restauración:**
```powershell
.\restore_database.ps1 -BackupFile "backup_database_20250919_0859.sql"
```

### **2. Configuración de Backup**

Archivo `backup_config.json` contiene:
- Configuraciones de retención
- Patrones de archivos a incluir/excluir
- Configuraciones de almacenamiento

## 📅 **CRONOGRAMA RECOMENDADO**

### **Backups Diarios (Base de Datos):**
```powershell
# Ejecutar todos los días al finalizar trabajo
.\backup_database.ps1
```

### **Backups Semanales (Proyecto Completo):**
```powershell
# Ejecutar cada viernes
.\backup_complete_project.ps1
```

### **Backups Antes de Cambios Importantes:**
- Antes de actualizaciones de código
- Antes de cambios en base de datos
- Antes de modificaciones de configuración

## ☁️ **ALMACENAMIENTO EN LA NUBE**

### **OneDrive (Recomendado):**
1. Crear carpeta `Backups/Proyectos`
2. Subir archivos ZIP semanales
3. Configurar sincronización automática

### **Google Drive (Alternativa):**
1. Crear carpeta `Backups_Proyectos`
2. Subir manualmente cada semana
3. Mantener versión local + nube

## 🔄 **PROCESO DE RESTAURACIÓN**

### **Escenario 1: Pérdida de Base de Datos**
```powershell
# 1. Restaurar base de datos
.\restore_database.ps1 -BackupFile "backup_database_YYYYMMDD_HHMMSS.sql"

# 2. Verificar funcionamiento
docker-compose up -d
```

### **Escenario 2: Pérdida Completa del Proyecto**
```powershell
# 1. Descargar backup desde la nube
# 2. Extraer archivo ZIP
# 3. Copiar código fuente al directorio del proyecto
# 4. Restaurar base de datos
.\restore_database.ps1 -BackupFile "database_backup.sql"

# 5. Reconstruir contenedores
docker-compose build
docker-compose up -d
```

## ⚠️ **ADVERTENCIAS IMPORTANTES**

### **Antes de Restaurar:**
- **SIEMPRE** hacer backup actual antes de restaurar
- Verificar que el archivo de backup no esté corrupto
- Detener servicios antes de restaurar

### **Verificaciones Post-Restauración:**
- Verificar que la base de datos esté funcionando
- Probar endpoints de la API
- Verificar que el frontend se conecte correctamente

## 📊 **MONITOREO DE BACKUPS**

### **Verificar Backups Existentes:**
```powershell
# Ver backups de base de datos
Get-ChildItem .\backups\backup_database_*.sql

# Ver backups completos
Get-ChildItem .\project_backups\*.zip
```

### **Verificar Tamaños:**
- Base de datos: ~200KB (actual)
- Proyecto completo: ~5-10MB
- Si los tamaños cambian significativamente, investigar

## 🚀 **AUTOMATIZACIÓN (OPCIONAL)**

### **Tarea Programada de Windows:**
1. Abrir "Programador de tareas"
2. Crear tarea básica
3. Configurar para ejecutar `backup_database.ps1` diariamente
4. Configurar para ejecutar `backup_complete_project.ps1` semanalmente

### **Script de Automatización:**
```powershell
# Crear script que ejecute ambos backups
.\backup_database.ps1
.\backup_complete_project.ps1

# Subir a OneDrive (si está configurado)
# Implementar según tu configuración de OneDrive
```

## 📞 **CONTACTO DE EMERGENCIA**

En caso de pérdida de datos:
1. **NO** tocar el sistema hasta tener backup
2. Verificar backups disponibles
3. Seguir proceso de restauración paso a paso
4. Documentar cualquier problema encontrado

## ✅ **CHECKLIST DE BACKUP**

### **Diario:**
- [ ] Ejecutar `backup_database.ps1`
- [ ] Verificar que se creó el archivo
- [ ] Verificar tamaño del backup

### **Semanal:**
- [ ] Ejecutar `backup_complete_project.ps1`
- [ ] Subir archivo ZIP a la nube
- [ ] Verificar que se subió correctamente
- [ ] Limpiar backups antiguos

### **Antes de Cambios Importantes:**
- [ ] Backup completo del proyecto
- [ ] Backup de base de datos
- [ ] Documentar cambios a realizar
- [ ] Tener plan de rollback

---

**🎯 RECUERDA: Un backup es solo tan bueno como su última restauración exitosa.**
