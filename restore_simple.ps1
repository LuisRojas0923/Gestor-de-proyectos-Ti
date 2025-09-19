# Script de Restauración Simple - Sistema Gestión Proyectos TI
# Usar en caso de pérdida de datos

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$Type = "database"  # "database" o "source"
)

Write-Host "=== RESTAURACION DEL SISTEMA GESTION PROYECTOS TI ===" -ForegroundColor Cyan
Write-Host "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
Write-Host "Archivo: $BackupFile" -ForegroundColor Yellow
Write-Host "Tipo: $Type" -ForegroundColor Yellow
Write-Host ""

# Verificar que el archivo existe
if (!(Test-Path $BackupFile)) {
    Write-Host "ERROR: El archivo de backup no existe: $BackupFile" -ForegroundColor Red
    exit 1
}

# Confirmar antes de proceder
Write-Host "ADVERTENCIA: Esta operacion reemplazara datos actuales!" -ForegroundColor Red
$Confirm = Read-Host "¿Continuar? (s/N)"
if ($Confirm -ne "s" -and $Confirm -ne "S") {
    Write-Host "Restauracion cancelada por el usuario" -ForegroundColor Yellow
    exit 0
}

try {
    if ($Type -eq "database") {
        Write-Host "1. Deteniendo servicios..." -ForegroundColor Yellow
        docker-compose down
        
        Write-Host "2. Iniciando solo base de datos..." -ForegroundColor Yellow
        docker-compose up -d db
        
        Write-Host "3. Esperando que la base de datos este lista..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        Write-Host "4. Restaurando base de datos..." -ForegroundColor Yellow
        Get-Content $BackupFile | docker exec -i gestor-de-proyectos-ti-db-1 psql -U user -d project_manager
        
        Write-Host "5. Reiniciando todos los servicios..." -ForegroundColor Yellow
        docker-compose up -d
        
        Write-Host "Base de datos restaurada exitosamente!" -ForegroundColor Green
        
    } elseif ($Type -eq "source") {
        Write-Host "1. Deteniendo servicios..." -ForegroundColor Yellow
        docker-compose down
        
        Write-Host "2. Extrayendo codigo fuente..." -ForegroundColor Yellow
        $TempDir = ".\temp_restore_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Expand-Archive -Path $BackupFile -DestinationPath $TempDir -Force
        
        Write-Host "3. Copiando archivos..." -ForegroundColor Yellow
        Copy-Item -Path "$TempDir\*" -Destination "." -Recurse -Force
        
        Write-Host "4. Limpiando archivos temporales..." -ForegroundColor Yellow
        Remove-Item -Path $TempDir -Recurse -Force
        
        Write-Host "5. Reconstruyendo contenedores..." -ForegroundColor Yellow
        docker-compose build
        
        Write-Host "6. Iniciando servicios..." -ForegroundColor Yellow
        docker-compose up -d
        
        Write-Host "Codigo fuente restaurado exitosamente!" -ForegroundColor Green
        
    } else {
        Write-Host "ERROR: Tipo no valido. Use 'database' o 'source'" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "ERROR durante la restauracion: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Reiniciando servicios..." -ForegroundColor Yellow
    docker-compose up -d
    exit 1
}

Write-Host ""
Write-Host "=== RESTAURACION COMPLETADA ===" -ForegroundColor Cyan
Write-Host "Verifica que el sistema este funcionando correctamente" -ForegroundColor Yellow
Write-Host "URLs para probar:" -ForegroundColor Yellow
Write-Host "  - Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  - API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
