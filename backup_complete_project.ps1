# Script de Backup Completo del Proyecto - Sistema Gestión Proyectos TI
# Creado: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

param(
    [string]$BackupPath = ".\project_backups",
    [string]$ProjectName = "Gestor-de-proyectos-Ti"
)

# Crear directorio de backups si no existe
if (!(Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force
    Write-Host "✅ Directorio de backups creado: $BackupPath" -ForegroundColor Green
}

# Generar nombre de archivo con timestamp
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = "$BackupPath\$ProjectName`_$Timestamp"

Write-Host "🚀 Iniciando backup completo del proyecto..." -ForegroundColor Yellow
Write-Host "📁 Directorio: $BackupDir" -ForegroundColor Cyan

try {
    # Crear directorio de backup
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    
    # 1. Backup de la base de datos
    Write-Host "📊 Creando backup de base de datos..." -ForegroundColor Yellow
    $DbBackupFile = "$BackupDir\database_backup.sql"
    docker exec gestor-de-proyectos-ti-db-1 pg_dump -U user -d project_manager > $DbBackupFile
    
    # 2. Backup del código fuente (excluyendo node_modules, __pycache__, etc.)
    Write-Host "📁 Copiando código fuente..." -ForegroundColor Yellow
    $SourceDir = "$BackupDir\source"
    New-Item -ItemType Directory -Path $SourceDir -Force | Out-Null
    
    # Copiar archivos importantes
    $FilesToCopy = @(
        "backend\app",
        "backend\alembic",
        "backend\*.py",
        "backend\*.txt",
        "backend\*.ini",
        "backend\*.sql",
        "backend\*.md",
        "backend\Dockerfile",
        "frontend\src",
        "frontend\public",
        "frontend\*.json",
        "frontend\*.js",
        "frontend\*.ts",
        "frontend\*.html",
        "frontend\Dockerfile",
        "docker-compose.yml",
        "*.md",
        "*.ps1"
    )
    
    foreach ($Pattern in $FilesToCopy) {
        if (Test-Path $Pattern) {
            Copy-Item -Path $Pattern -Destination $SourceDir -Recurse -Force
        }
    }
    
    # 3. Crear archivo de información del backup
    $InfoFile = "$BackupDir\backup_info.txt"
    $Info = @"
BACKUP COMPLETO DEL PROYECTO
============================
Fecha: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Proyecto: $ProjectName
Ubicación: $BackupDir

CONTENIDO:
- database_backup.sql: Backup completo de PostgreSQL
- source/: Código fuente del proyecto
- backup_info.txt: Este archivo

INSTRUCCIONES DE RESTAURACIÓN:
1. Restaurar base de datos: .\restore_database.ps1 -BackupFile "$DbBackupFile"
2. Restaurar código: Copiar contenido de source/ al directorio del proyecto
3. Reconstruir contenedores: docker-compose build
4. Iniciar servicios: docker-compose up -d

NOTAS:
- Este backup incluye solo archivos esenciales
- Excluye node_modules, __pycache__, y archivos temporales
- Para restauración completa, ejecutar scripts de setup
"@
    
    $Info | Out-File -FilePath $InfoFile -Encoding UTF8
    
    # 4. Crear archivo ZIP del backup
    Write-Host "📦 Comprimiendo backup..." -ForegroundColor Yellow
    $ZipFile = "$BackupPath\$ProjectName`_$Timestamp.zip"
    Compress-Archive -Path "$BackupDir\*" -DestinationPath $ZipFile -Force
    
    # Calcular tamaños
    $DbSize = (Get-Item $DbBackupFile).Length
    $DbSizeMB = [math]::Round($DbSize / 1MB, 2)
    $ZipSize = (Get-Item $ZipFile).Length
    $ZipSizeMB = [math]::Round($ZipSize / 1MB, 2)
    
    Write-Host "✅ Backup completo finalizado!" -ForegroundColor Green
    Write-Host "📊 Tamaño base de datos: $DbSizeMB MB" -ForegroundColor Green
    Write-Host "📦 Tamaño ZIP: $ZipSizeMB MB" -ForegroundColor Green
    Write-Host "📁 Ubicación: $ZipFile" -ForegroundColor Green
    
    # Limpiar backups antiguos (mantener solo los últimos 5)
    $OldBackups = Get-ChildItem "$BackupPath\$ProjectName`_*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 5
    if ($OldBackups) {
        $OldBackups | Remove-Item -Force
        Write-Host "🧹 Backups antiguos eliminados: $($OldBackups.Count) archivos" -ForegroundColor Yellow
    }
    
    # Limpiar directorio temporal
    Remove-Item -Path $BackupDir -Recurse -Force
    
} catch {
    Write-Host "❌ Error durante el backup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Proceso de backup completo finalizado" -ForegroundColor Green
Write-Host "💡 Recomendación: Subir el archivo ZIP a OneDrive o Google Drive" -ForegroundColor Cyan
