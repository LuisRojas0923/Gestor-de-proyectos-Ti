# 🛡️ INSTRUCCIONES RÁPIDAS DE BACKUP

## 🚨 **SITUACIÓN ACTUAL**
Trabajas en entorno productivo sin servidor dedicado. **ES CRÍTICO** hacer backups regulares.

## ⚡ **BACKUP DIARIO (OBLIGATORIO)**

### **Ejecutar todos los días al finalizar trabajo:**
```powershell
.\backup_simple.ps1
```

**Esto crea:**
- Backup de base de datos (0.19 MB)
- Backup de código fuente (0.54 MB)
- Limpia backups antiguos automáticamente

## 🔄 **RESTAURACIÓN EN CASO DE EMERGENCIA**

### **Si pierdes la base de datos:**
```powershell
.\restore_simple.ps1 -BackupFile ".\backups\database_YYYYMMDD_HHMMSS.sql" -Type "database"
```

### **Si pierdes el código fuente:**
```powershell
.\restore_simple.ps1 -BackupFile ".\backups\source_YYYYMMDD_HHMMSS.zip" -Type "source"
```

## ☁️ **ALMACENAMIENTO EN LA NUBE**

### **OneDrive (Recomendado):**
1. Crear carpeta `Backups/Proyectos`
2. Subir archivos ZIP semanales
3. Mantener versión local + nube

### **Google Drive (Alternativa):**
1. Crear carpeta `Backups_Proyectos`
2. Subir manualmente cada semana

## 📅 **CRONOGRAMA RECOMENDADO**

- **Diario:** `.\backup_simple.ps1` (al finalizar trabajo)
- **Semanal:** Subir backups a la nube
- **Antes de cambios importantes:** Backup completo

## ⚠️ **ADVERTENCIAS IMPORTANTES**

- **SIEMPRE** hacer backup antes de restaurar
- **NO** tocar el sistema si pierdes datos
- **Verificar** que los backups no estén corruptos
- **Probar** restauración en entorno de prueba

## 🆘 **EN CASO DE EMERGENCIA**

1. **NO** tocar el sistema
2. Verificar backups disponibles
3. Seguir proceso de restauración
4. Documentar cualquier problema

## 📊 **VERIFICAR BACKUPS**

```powershell
# Ver backups disponibles
Get-ChildItem .\backups\ | Sort-Object LastWriteTime -Descending

# Verificar tamaños
# Base de datos: ~0.19 MB
# Código fuente: ~0.54 MB
```

## ✅ **CHECKLIST DIARIO**

- [ ] Ejecutar `.\backup_simple.ps1`
- [ ] Verificar que se crearon los archivos
- [ ] Verificar tamaños de los backups
- [ ] Subir a la nube (semanalmente)

---

**🎯 RECUERDA: Un backup es solo tan bueno como su última restauración exitosa.**
