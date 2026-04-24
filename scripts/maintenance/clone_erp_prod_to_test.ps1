# Script para clonar la base de datos ERP (SOLID) de PRODUCCION a PRUEBAS
# Origen: Servidor ERP (192.168.0.21:5432) -> DB: solid
# Destino: Servidor ERP (192.168.0.21:5432) -> DB: solidpruebas3

# Forzar codificación UTF-8 para evitar daños en caracteres especiales (ñ, tildes)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$HOST_IP = "192.168.0.21"
$PORT = "5432"
$SRC_DB = "solid"
$DST_DB = "solidpruebas3"
$USER = "postgres"
$PASS = "AdminSolid2025"

Write-Host "--- Iniciando clonacion de ERP (solid -> solidpruebas3) ---" -ForegroundColor Cyan
Write-Host "ADVERTENCIA: Esta operacion borrara todos los datos en $DST_DB y los reemplazara con datos de PRODUCCION." -ForegroundColor Red

# 1. Confirmacion de seguridad
$confirmation = Read-Host "Enter 'S' para continuar"
if ($confirmation -ne "S" -and $confirmation -ne "s") {
    Write-Host "Operacion cancelada por el usuario." -ForegroundColor Gray
    exit
}

Write-Host "2. Iniciando transferencia de datos (ERP Prod -> ERP Pruebas)..." -ForegroundColor Yellow

# Ejecucion de pg_dump y psql vía Docker (Unificado para evitar errores de codificación en PS)
$PG_IMAGE = "postgres:16-alpine"
docker run --rm -e PGPASSWORD=$PASS $PG_IMAGE sh -c "pg_dump -h $HOST_IP -p $PORT -U $USER -d $SRC_DB --clean --if-exists --no-owner --no-privileges | psql -h $HOST_IP -p $PORT -U $USER -d $DST_DB"

if ($LASTEXITCODE -eq 0) {
    Write-Host "--- Clonacion de ERP completada exitosamente ---" -ForegroundColor Green
} else {
    Write-Host "--- Ocurrio un error durante la clonacion del ERP ---" -ForegroundColor Red
}
