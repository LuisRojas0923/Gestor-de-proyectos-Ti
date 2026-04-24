# Script para clonar la base de datos de PRODUCCION a PRUEBAS
# Origen: Servidor Produccion (192.168.0.21:5433)
# Destino: Servidor Pruebas 3 (192.168.0.21:5435)

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
if (Test-Path "$ROOT_DIR/.env.pruebas3") {
    Get-Content "$ROOT_DIR/.env.pruebas3" | Where-Object { $_ -match "=" -and $_ -notmatch "^#" } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        Set-Variable -Name "TEST_$($name.Trim())" -Value $value.Trim() -Scope Script
    }
}

$HOST_IP = "192.168.0.21"
$PROD_PORT = "5433"
$TEST_PORT = "5435"

# Usar nombres de variables cargadas
$PROD_DB = $PROD_DB_NAME
$PROD_USER = $PROD_DB_USER
$PROD_PASS = $PROD_DB_PASS

$TEST_DB = $TEST_DB_NAME
$TEST_USER = $TEST_DB_USER
$TEST_PASS = $TEST_DB_PASS

$TEST_BACKEND_CONTAINER = "gestor-de-proyectos-ti-backend-pruebas3"

# Validacion de carga
if (-not $PROD_DB -or -not $TEST_DB -or -not $PROD_PASS -or -not $TEST_PASS) {
    Write-Host "ERROR: No se pudieron cargar todas las variables necesarias de los archivos .env" -ForegroundColor Red
    Write-Host "Verifique que existan .env y .env.pruebas3 con las llaves DB_NAME, DB_USER y DB_PASS." -ForegroundColor Yellow
    exit 1
}
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

# Ejecucion directa de la tuberia (con credenciales separadas y protegidas)
$PG_IMAGE = "postgres:15-alpine"

Write-Host "Iniciando volcado desde Produccion ($PROD_DB) y restauracion en Pruebas ($TEST_DB)..." -ForegroundColor Gray

docker run --rm -e PGPASSWORD="$PROD_PASS" $PG_IMAGE pg_dump -h $HOST_IP -p $PROD_PORT -U $PROD_USER -d $PROD_DB --clean --if-exists --no-owner --no-privileges | `
docker run --rm -i -e PGPASSWORD="$TEST_PASS" $PG_IMAGE psql -h $HOST_IP -p $TEST_PORT -U $TEST_USER -d $TEST_DB

if ($LASTEXITCODE -eq 0) {
    Write-Host "4. Reiniciando backend de Pruebas para aplicar autosanacion..." -ForegroundColor Yellow
    docker restart $TEST_BACKEND_CONTAINER 2>$null
    Write-Host "--- Clonacion completada exitosamente ---" -ForegroundColor Green
} else {
    Write-Host "--- Ocurrio un error durante la clonacion ---" -ForegroundColor Red
}
