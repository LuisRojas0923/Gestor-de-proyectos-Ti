# Script para clonar la base de datos de PRODUCCION a LOCAL
# Origen: Servidor Produccion (192.168.0.21:5433)
# Destino: Docker Local

# Forzar codificación UTF-8 para evitar daños en caracteres especiales (ñ, tildes)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 0. Cargar variables para evitar hardcoding
$ROOT_DIR = "$PSScriptRoot/../.."
if (Test-Path "$ROOT_DIR/.env") {
    Get-Content "$ROOT_DIR/.env" | Where-Object { $_ -match "=" -and $_ -notmatch "^#" } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        Set-Variable -Name "PROD_$($name.Trim())" -Value $value.Trim() -Scope Script
    }
}

if (Test-Path "$ROOT_DIR/.env") {
    Get-Content "$ROOT_DIR/.env" | Where-Object { $_ -match "=" -and $_ -notmatch "^#" } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        Set-Variable -Name "LOCAL_$($name.Trim())" -Value $value.Trim() -Scope Script
    }
}

$HOST_IP = "192.168.0.21"
$PROD_PORT = "5433"
$PROD_DB = $PROD_DB_NAME
$PROD_USER = $PROD_DB_USER
$PROD_PASS = $PROD_DB_PASS

$TARGET_CONTAINER = "gestor-de-proyectos-ti-db"
$BACKEND_CONTAINER = "gestor-de-proyectos-ti-backend-1"
$TARGET_DB = $LOCAL_DB_NAME
$TARGET_USER = $LOCAL_DB_USER

Write-Host "--- Iniciando clonacion de PRODUCCION a LOCAL ---" -ForegroundColor Cyan
Write-Host "ADVERTENCIA: Se borraran todos los datos actuales en LOCAL ($TARGET_DB)." -ForegroundColor Red

# 1. Confirmacion de seguridad
$confirmation = Read-Host "Enter 'S' para continuar"
if ($confirmation -ne "S" -and $confirmation -ne "s") {
    Write-Host "Operacion cancelada por el usuario." -ForegroundColor Gray
    exit
}

# 2. Verificar contenedor local
$containerStatus = docker inspect -f '{{.State.Running}}' $TARGET_CONTAINER 2>$null
if ($containerStatus -ne "true") {
    Write-Host "ERROR: El contenedor de base de datos $TARGET_CONTAINER no esta en ejecucion." -ForegroundColor Red
    exit 1
}

Write-Host "3. Iniciando transferencia de datos (Produccion -> Local)..." -ForegroundColor Yellow

# Ejecucion directa de la tuberia con pg_dump y psql
$PG_IMAGE = "postgres:15-alpine"
docker run --rm -e PGPASSWORD="$PROD_PASS" $PG_IMAGE pg_dump -h $HOST_IP -p $PROD_PORT -U $PROD_USER -d $PROD_DB --clean --if-exists --no-owner --no-privileges | docker exec -i $TARGET_CONTAINER psql -U $TARGET_USER -d $TARGET_DB

if ($LASTEXITCODE -eq 0) {
    Write-Host "4. Reiniciando backend local para aplicar autosanacion..." -ForegroundColor Yellow
    docker restart $BACKEND_CONTAINER 2>$null
    Write-Host "--- Clonacion completada exitosamente ---" -ForegroundColor Green
} else {
    Write-Host "--- Ocurrio un error durante la clonacion ---" -ForegroundColor Red
}
