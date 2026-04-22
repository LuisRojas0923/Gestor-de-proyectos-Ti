# Script para clonar la base de datos de PRODUCCION a PRUEBAS
# Origen: Servidor Produccion (192.168.0.21:5433)
# Destino: Servidor Pruebas 3 (192.168.0.21:5435)

# 0. Cargar variables para evitar hardcoding
$ROOT_DIR = "$PSScriptRoot/../.."
if (Test-Path "$ROOT_DIR/.env") {
    Get-Content "$ROOT_DIR/.env" | Where-Object { $_ -match "=" -and $_ -notmatch "^#" } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        Set-Variable -Name "PROD_$($name.Trim())" -Value $value.Trim() -Scope Script
    }
}
if (Test-Path "$ROOT_DIR/.env.pruebas3") {
    Get-Content "$ROOT_DIR/.env.pruebas3" | Where-Object { $_ -match "=" -and $_ -notmatch "^#" } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        Set-Variable -Name "TEST_$($name.Trim())" -Value $value.Trim() -Scope Script
    }
}

$HOST_IP = "192.168.0.21"
$PROD_PORT = "5433"
$TEST_PORT = "5435"

# Usar nombres de variables cargadas (PROD_DB_NAME, etc)
$PROD_DB = $PROD_DB_NAME
$TEST_DB = $TEST_DB_NAME
$USER = $PROD_DB_USER
$PASS = $PROD_DB_PASS

$TEST_BACKEND_CONTAINER = "gestor-de-proyectos-ti-backend-pruebas3"

Write-Host "--- Iniciando clonacion de PRODUCCION a PRUEBAS ---" -ForegroundColor Cyan
Write-Host "ADVERTENCIA: Se borraran todos los datos actuales en PRUEBAS ($TEST_DB)." -ForegroundColor Red

# 1. Confirmacion de seguridad
$confirmation = Read-Host "Enter 'S' para continuar"
if ($confirmation -ne "S" -and $confirmation -ne "s") {
    Write-Host "Operacion cancelada por el usuario." -ForegroundColor Gray
    exit
}

Write-Host "2. Validando conexion con el servidor..." -ForegroundColor Yellow
if (!(Test-NetConnection ${HOST_IP} -Port ${PROD_PORT}).TcpTestSucceeded) {
    Write-Host "ERROR: No se puede alcanzar el puerto de Produccion (${PROD_PORT}) en ${HOST_IP}" -ForegroundColor Red
    exit 1
}

Write-Host "3. Iniciando transferencia de datos (Produccion -> Pruebas)..." -ForegroundColor Yellow

# Ejecucion directa de la tuberia (mas robusto que Invoke-Expression)
$PG_IMAGE = "postgres:15-alpine"
docker run --rm -e PGPASSWORD=$PASS $PG_IMAGE pg_dump -h $HOST_IP -p $PROD_PORT -U $USER -d $PROD_DB --clean --if-exists --no-owner --no-privileges | docker run --rm -i -e PGPASSWORD=$PASS $PG_IMAGE psql -h $HOST_IP -p $TEST_PORT -U $USER -d $TEST_DB

if ($LASTEXITCODE -eq 0) {
    Write-Host "4. Reiniciando backend de Pruebas para aplicar autosanacion..." -ForegroundColor Yellow
    docker restart $TEST_BACKEND_CONTAINER 2>$null
    Write-Host "--- Clonacion completada exitosamente ---" -ForegroundColor Green
} else {
    Write-Host "--- Ocurrio un error durante la clonacion ---" -ForegroundColor Red
}
