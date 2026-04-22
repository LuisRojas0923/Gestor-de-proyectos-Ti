# Script para clonar la base de datos de PRUEBAS a LOCAL
# Origen: Servidor Pruebas 3 (192.168.0.21:5435)
# Destino: Docker Local

# Forzar codificación UTF-8 para evitar daños en caracteres especiales (ñ, tildes)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 0. Cargar variables desde .env y .env.pruebas3 para evitar hardcoding
$ROOT_DIR = "$PSScriptRoot/../.."
if (Test-Path "$ROOT_DIR/.env.pruebas3") {
    Get-Content "$ROOT_DIR/.env.pruebas3" | Where-Object { $_ -match "=" -and $_ -notmatch "^#" } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        Set-Variable -Name "SRC_$($name.Trim())" -Value $value.Trim() -Scope Script
    }
}
if (Test-Path "$ROOT_DIR/.env") {
    Get-Content "$ROOT_DIR/.env" | Where-Object { $_ -match "=" -and $_ -notmatch "^#" } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        Set-Variable -Name "LOCAL_$($name.Trim())" -Value $value.Trim() -Scope Script
    }
}

$SOURCE_HOST = "192.168.0.21"
$SOURCE_PORT = "5435"
$SOURCE_DB = "project_manager_pruebas3"
$SOURCE_USER = $SRC_DB_USER
$SOURCE_PASS = $SRC_DB_PASS

$TARGET_CONTAINER = "gestor-de-proyectos-ti-db"
$BACKEND_CONTAINER = "gestor-de-proyectos-ti-backend-1"
$TARGET_DB = $LOCAL_DB_NAME
$TARGET_USER = $LOCAL_DB_USER

Write-Host "--- Iniciando clonacion de PRUEBAS a LOCAL ---" -ForegroundColor Cyan

# 1. Verificar contenedores locales
$containerStatus = docker inspect -f '{{.State.Running}}' $TARGET_CONTAINER 2>$null
if ($containerStatus -ne "true") {
    Write-Host "ERROR: El contenedor de base de datos $TARGET_CONTAINER no esta en ejecucion." -ForegroundColor Red
    exit 1
}

Write-Host "1. Extrayendo datos de Pruebas (${SOURCE_HOST}:${SOURCE_PORT})..." -ForegroundColor Yellow
Write-Host "2. Restaurando en contenedor local ($TARGET_CONTAINER)..." -ForegroundColor Yellow

# Ejecucion directa de la tuberia
$PG_IMAGE = "postgres:15-alpine"
docker run --rm -e PGPASSWORD=$SOURCE_PASS $PG_IMAGE pg_dump -h $SOURCE_HOST -p $SOURCE_PORT -U $SOURCE_USER -d $SOURCE_DB --clean --if-exists --no-owner --no-privileges | docker exec -i $TARGET_CONTAINER psql -U $TARGET_USER -d $TARGET_DB

if ($LASTEXITCODE -eq 0) {
    Write-Host "3. Reiniciando backend para aplicar autosanacion y limpiar cache..." -ForegroundColor Yellow
    docker restart $BACKEND_CONTAINER
    Write-Host "--- Clonacion completada exitosamente ---" -ForegroundColor Green
} else {
    Write-Host "--- Ocurrio un error durante la clonacion ---" -ForegroundColor Red
}
