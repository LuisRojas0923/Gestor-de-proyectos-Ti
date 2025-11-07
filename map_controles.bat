@echo off
echo Mapeo de estructura de carpetas de Controles TI
echo ================================================
echo.
echo Explorando: \\cdpwin211\Controles TI\
echo.

echo Listando controles principales:
dir "\\cdpwin211\Controles TI" /b /ad
echo.

echo Detalles de cada control:
for /d %%i in ("\\cdpwin211\Controles TI\*") do (
    echo Control: %%~ni
    echo --------------------
    dir "%%i" /b /ad
    echo.
)

echo Mapeo completado.
pause
