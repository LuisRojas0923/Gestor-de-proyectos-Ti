# Script de Backup Automatizado - Sistema Gestión Proyectos TI
# Creado: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

param(
    [string]$BackupPath = ".\backups",
    [string]$ContainerName = "gestor-de-proyectos-ti-db-1",
    [string]$DatabaseName = "project_manager",
    [string]$Username = "user"
)

# Crear directorio de backups si no existe
if (!(Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force
    Write-Host "Directorio de backups creado: $BackupPath" -ForegroundColor Green
}

# Generar nombre de archivo con timestamp
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupPath\backup_database_$Timestamp.sql"

Write-Host "Iniciando backup de base de datos..." -ForegroundColor Yellow
Write-Host "Archivo: $BackupFile" -ForegroundColor Cyan
Write-Host "Contenedor: $ContainerName" -ForegroundColor Cyan

try {
    # Ejecutar backup
    docker exec $ContainerName pg_dump -U $Username -d $DatabaseName > $BackupFile
    
    if (Test-Path $BackupFile) {
        $FileSize = (Get-Item $BackupFile).Length
        $FileSizeMB = [math]::Round($FileSize / 1MB, 2)
        
        Write-Host "Backup completado exitosamente!" -ForegroundColor Green
        Write-Host "Tamaño: $FileSizeMB MB" -ForegroundColor Green
        Write-Host "Ubicación: $BackupFile" -ForegroundColor Green
        
        # Limpiar backups antiguos (mantener solo los últimos 7)
        $OldBackups = Get-ChildItem "$BackupPath\backup_database_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 7
        if ($OldBackups) {
            $OldBackups | Remove-Item -Force
            Write-Host "Backups antiguos eliminados: $($OldBackups.Count) archivos" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "Error: No se pudo crear el archivo de backup" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "Error durante el backup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "Proceso de backup finalizado" -ForegroundColor Green
