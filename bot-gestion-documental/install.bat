@echo off
echo Instalando dependencias con uv...
where uv >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo uv no encontrado. Intentando instalar con winget...
  winget install --id Astral-Software.UV -e --silent
)
echo Creando entorno .venv con uv...
uv venv .venv
echo Instalando requirements.txt con uv...
uv pip install -r requirements.txt
echo.
echo Instalacion completada. Para activar: activate.bat
pause
