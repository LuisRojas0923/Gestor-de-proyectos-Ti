# Bot de Gestión Documental

Bot modular para sincronizar carpetas de desarrollos con API.

## Uso Rápido

1. **Activar entorno:**
   ```bash
   activate.bat
   ```

2. **Ejecutar app:**
   ```bash
   python bot_main.py
   ```

## Funciones

- **Cargar desarrollos** desde API
- **Analizar carpetas** locales  
- **Filtrar** por ID, nombre o estado
- **Ejecutar acciones** de creación/movimiento
- **Ver etapas** de desarrollos
- **Abrir carpetas** con doble clic

## Arquitectura Modular

- `bot_main.py` - Orquestador principal
- `bot_models.py` - Clases de datos del bot
- `bot_api_client.py` - Comunicación con API
- `bot_file_manager.py` - Gestión de archivos
- `bot_ui_components.py` - Componentes de interfaz

## Archivos

- `bot_main.py` - App principal
- `activate.bat` - Activar entorno
- `install.bat` - Instalar dependencias
- `requirements.txt` - Dependencias
- `venv/` - Entorno virtual
