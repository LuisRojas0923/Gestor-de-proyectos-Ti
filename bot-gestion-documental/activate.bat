@echo off
echo Activando entorno virtual del Bot de Gestión Documental...
call venv\Scripts\activate.bat
echo.
echo Entorno activado. Para ejecutar:
echo   python main.py          (UI Tkinter)
echo   python qt_app.py        (UI PySide6)
echo.
echo Para desactivar: deactivate
