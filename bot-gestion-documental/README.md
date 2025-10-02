# Bot de Gestión Documental

Bot modular para sincronizar carpetas de desarrollos con API. Al iniciar, carga automáticamente desarrollos desde la API y analiza la ruta base configurada.

## Uso Rápido

1. **Activar entorno:**
   ```bash
   activate.bat
   ```

2. **Ejecutar app:**
   ```bash
   python bot_main.py
   ```

3. **Configurar (opcional):**
   - Copia `config.json.sample` a `config.json` y ajusta `api_base_url` y `base_directories`.

## Funciones

- **Cargar desarrollos** desde API (automático al iniciar)
- **Analizar carpetas** locales (automático al iniciar)
- **Filtrar** por ID, nombre o estado
- **Botones de refresco** para recargar manualmente
- **Ruta base por defecto**: `C:\Users\lerv8093\OneDrive - Grupo Coomeva\PROYECTOS DESARROLLOS\Desarrollos`

## Arquitectura Modular

- `bot_main.py` - Orquestador principal con auto-carga
- `bot_models.py` - Dataclasses para mapeo de datos
- `bot_api_client.py` - Cliente HTTP con autodetección de API v1/v2
- `bot_file_manager.py` - Escaneo de rutas base
- `bot_ui_components.py` - Componentes de UI (Treeview, columnas)

## Archivos

- `bot_main.py` - App principal con auto-carga
- `activate.bat` - Activar entorno
- `install.bat` - Instalar dependencias con uv
- `requirements.txt` - Dependencias (requests)
- `config.json.sample` - Plantilla de configuración
- `smoke_test_bot.py` - Test de humo
- `.venv/` - Entorno virtual (uv)
