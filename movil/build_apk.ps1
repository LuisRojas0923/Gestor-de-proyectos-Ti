$ErrorActionPreference = "Stop"

$SourceDir = $PSScriptRoot
$TempDir = "C:\temp_build"

Write-Host "=================================================="
Write-Host " INICIANDO BUILD DE APK (Metodo de Copia Temporal) "
Write-Host "=================================================="

# 1. Limpiar directorio temporal si existe
if (Test-Path $TempDir) {
    Write-Host "[*] Limpiando build anterior en $TempDir..."
    Remove-Item -Path $TempDir -Recurse -Force
}

# 2. Copiar proyecto a ruta corta (excluyendo basura y cachés)
Write-Host "[*] Copiando proyecto a $TempDir para evitar MAX_PATH..."
$robocopyArgs = @("$SourceDir", "$TempDir", "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np", "/XD", "node_modules", ".expo", ".cxx", "build", ".gradle")
& robocopy @robocopyArgs
# Robocopy devuelve exit codes < 8 como éxito
if ($LASTEXITCODE -ge 8) {
    Write-Host "Error copiando archivos con robocopy."
    exit 1
}

try {
    # 2.5 Instalar dependencias limpias en la ruta corta
    Set-Location -Path "$TempDir"
    Write-Host "[*] Instalando dependencias frescas en la ruta corta (npm install)..."
    npm install
    # 3. Movernos al directorio de Android en temp
    Set-Location -Path "$TempDir\android"

    # 4. Limpiar builds anteriores y cachés nativas (C++)
    Write-Host "[*] Limpiando cache de Gradle..."
    .\gradlew clean
    
    Write-Host "[*] Purgando caches nativas de CMake (.cxx) con rutas viejas..."
    Get-ChildItem -Path "$TempDir" -Recurse -Filter ".cxx" -Directory -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force

    # 5. Ejecutar compilacion
    Write-Host "[*] Iniciando compilacion (esto tomara varios minutos)..."
    .\gradlew assembleRelease
    $BuildStatus = $LASTEXITCODE

    # 6. Copiar el resultado
    if ($BuildStatus -eq 0) {
        Write-Host "Build completado con exito!"
        $ApkSource = "$TempDir\android\app\build\outputs\apk\release\app-release.apk"
        $ApkDest = Join-Path (Split-Path $SourceDir -Parent) "app-release.apk"
        
        Copy-Item -Path $ApkSource -Destination $ApkDest -Force
        Write-Host "APK guardado exitosamente en: $ApkDest"
    } else {
        Write-Host "El build ha fallado. Revisa los logs de arriba."
    }
} finally {
    # 7. Regresar y limpiar
    Set-Location -Path "C:\"
    Write-Host "[*] Limpiando archivos temporales..."
    Remove-Item -Path $TempDir -Recurse -Force
}
