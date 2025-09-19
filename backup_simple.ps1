# Script de Backup Simple - Sistema Gestión Proyectos TI
# Ejecutar diariamente para mantener backups actualizados

param(
    [string]$BackupPath = ".\backups"
)

# Crear directorio si no existe
if (!(Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
}

# Generar timestamp
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "=== BACKUP DEL SISTEMA GESTION PROYECTOS TI ===" -ForegroundColor Cyan
Write-Host "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
Write-Host ""

# 1. Backup de Base de Datos
Write-Host "1. Creando backup de base de datos..." -ForegroundColor Yellow
$DbBackupFile = "$BackupPath\database_$Timestamp.sql"
docker exec gestor-de-proyectos-ti-db-1 pg_dump -U user -d project_manager > $DbBackupFile

if (Test-Path $DbBackupFile) {
    $DbSize = (Get-Item $DbBackupFile).Length
    $DbSizeMB = [math]::Round($DbSize / 1MB, 2)
    Write-Host "   Base de datos: $DbSizeMB MB" -ForegroundColor Green
} else {
    Write-Host "   ERROR: No se pudo crear backup de base de datos" -ForegroundColor Red
    exit 1
}

# 2. Backup de Código Fuente
Write-Host "2. Creando backup de código fuente..." -ForegroundColor Yellow
$CodeBackupFile = "$BackupPath\source_$Timestamp.zip"

# Archivos a incluir
$FilesToInclude = @(
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

# Crear archivo temporal
$TempDir = "$BackupPath\temp_$Timestamp"
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

# Copiar archivos
foreach ($Pattern in $FilesToInclude) {
    if (Test-Path $Pattern) {
        Copy-Item -Path $Pattern -Destination $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Comprimir
Compress-Archive -Path "$TempDir\*" -DestinationPath $CodeBackupFile -Force
Remove-Item -Path $TempDir -Recurse -Force

if (Test-Path $CodeBackupFile) {
    $CodeSize = (Get-Item $CodeBackupFile).Length
    $CodeSizeMB = [math]::Round($CodeSize / 1MB, 2)
    Write-Host "   Código fuente: $CodeSizeMB MB" -ForegroundColor Green
} else {
    Write-Host "   ERROR: No se pudo crear backup de código" -ForegroundColor Red
}

# 3. Limpiar backups antiguos
Write-Host "3. Limpiando backups antiguos..." -ForegroundColor Yellow
$OldDbBackups = Get-ChildItem "$BackupPath\database_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 7
$OldCodeBackups = Get-ChildItem "$BackupPath\source_*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 5

if ($OldDbBackups) {
    $OldDbBackups | Remove-Item -Force
    Write-Host "   Eliminados $($OldDbBackups.Count) backups de base de datos antiguos" -ForegroundColor Yellow
}

if ($OldCodeBackups) {
    $OldCodeBackups | Remove-Item -Force
    Write-Host "   Eliminados $($OldCodeBackups.Count) backups de código antiguos" -ForegroundColor Yellow
}

# 4. Resumen
Write-Host ""
Write-Host "=== RESUMEN DEL BACKUP ===" -ForegroundColor Cyan
Write-Host "Base de datos: $DbBackupFile" -ForegroundColor Green
Write-Host "Código fuente: $CodeBackupFile" -ForegroundColor Green
Write-Host ""
Write-Host "RECOMENDACION: Subir archivos a OneDrive o Google Drive" -ForegroundColor Yellow
Write-Host "Backup completado exitosamente!" -ForegroundColor Green
