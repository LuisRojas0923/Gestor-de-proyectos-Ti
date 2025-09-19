# Script de Restauración - Sistema Gestión Proyectos TI
# Creado: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$ContainerName = "gestor-de-proyectos-ti-db-1",
    [string]$DatabaseName = "project_manager",
    [string]$Username = "user"
)

# Verificar que el archivo de backup existe
if (!(Test-Path $BackupFile)) {
    Write-Host "❌ Error: El archivo de backup no existe: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Iniciando restauración de base de datos..." -ForegroundColor Yellow
Write-Host "📁 Archivo: $BackupFile" -ForegroundColor Cyan
Write-Host "🐳 Contenedor: $ContainerName" -ForegroundColor Cyan

# Confirmar antes de proceder
$Confirm = Read-Host "⚠️  ADVERTENCIA: Esto reemplazará todos los datos actuales. ¿Continuar? (s/N)"
if ($Confirm -ne "s" -and $Confirm -ne "S") {
    Write-Host "❌ Restauración cancelada por el usuario" -ForegroundColor Yellow
    exit 0
}

try {
    # Detener la aplicación para evitar conflictos
    Write-Host "⏸️  Deteniendo servicios..." -ForegroundColor Yellow
    docker-compose down
    
    # Iniciar solo la base de datos
    Write-Host "🔄 Iniciando base de datos..." -ForegroundColor Yellow
    docker-compose up -d db
    
    # Esperar a que la base de datos esté lista
    Start-Sleep -Seconds 10
    
    # Restaurar la base de datos
    Write-Host "📥 Restaurando datos..." -ForegroundColor Yellow
    Get-Content $BackupFile | docker exec -i $ContainerName psql -U $Username -d $DatabaseName
    
    Write-Host "✅ Restauración completada exitosamente!" -ForegroundColor Green
    
    # Reiniciar todos los servicios
    Write-Host "🔄 Reiniciando servicios..." -ForegroundColor Yellow
    docker-compose up -d
    
    Write-Host "🎉 Sistema restaurado y funcionando" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error durante la restauración: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "🔄 Reiniciando servicios..." -ForegroundColor Yellow
    docker-compose up -d
    exit 1
}
