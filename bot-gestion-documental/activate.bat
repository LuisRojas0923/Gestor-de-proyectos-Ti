@echo off
echo Activando entorno virtual (.venv) con uv/powershell...
if exist .venv\Scripts\activate.bat (
  call .venv\Scripts\activate.bat
  echo.
  echo Entorno activado. Para ejecutar:
  echo   python bot_main.py
  echo.
  echo Para desactivar: deactivate
  goto :eof
)
echo No existe .venv. Ejecuta primero: install.bat
