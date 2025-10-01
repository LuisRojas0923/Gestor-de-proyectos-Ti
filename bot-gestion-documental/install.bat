@echo off
echo Instalando dependencias del Bot de Gestión Documental...
call venv\Scripts\activate.bat
pip install -r requirements.txt
echo.
echo Instalación completada.
echo Para activar el entorno: activate.bat
pause
