@echo off
echo Instalando dependencias...
pip install -r requirements.txt
echo.
echo Iniciando servidor DeepFace...
echo.
python server.py
