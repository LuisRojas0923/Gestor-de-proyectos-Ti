# Bot de Gestión Documental

Bot para sincronizar carpetas de desarrollos basado en datos del API del sistema de gestión de proyectos.

## Características

- **UI Tkinter**: Interfaz clásica con tablas ordenables
- **UI PySide6**: Interfaz moderna con filtros y sorting nativo
- **Análisis inteligente**: Detecta carpetas existentes por ID Remedy
- **Sincronización**: Crea/mueve carpetas según estado del desarrollo
- **Logging**: Registra todas las operaciones en CSV

## Instalación

### Opción 1: Automática (Windows)
```bash
# Ejecutar en la carpeta del bot
install.bat
```

### Opción 2: Manual
```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

## Uso

### Activar entorno
```bash
# Windows
activate.bat

# Linux/Mac
source venv/bin/activate
```

### Ejecutar aplicaciones
```bash
# UI Tkinter (clásica)
python main.py

# UI PySide6 (moderna)
python qt_app.py
```

## Configuración

1. **API Base URL**: `http://localhost:8000/api/v1`
2. **Ruta base**: `C:\Users\lerv8093\OneDrive - Grupo Coomeva\PROYECTOS DESARROLLOS\Desarrollos`
3. **Authorization**: Opcional, si el API requiere autenticación

## Funcionamiento

1. **Cargar desarrollos**: Obtiene datos del API
2. **Analizar carpeta local**: Busca carpetas existentes recursivamente
3. **Ejecutar acciones**: 
   - Crea carpetas faltantes con subcarpetas (Correos, Formatos, Documentos)
   - Mueve carpetas al estado correcto
   - Genera log CSV de operaciones

## Estructura de carpetas

```
Desarrollos/
├── Estado1/
│   ├── ID123_Nombre del Proyecto/
│   │   ├── Correos/
│   │   ├── Formatos/
│   │   └── Documentos/
│   └── ID456_Otro Proyecto/
└── Estado2/
    └── ID789_Proyecto Final/
```

## Logs

Los logs se guardan en `logs/bot_log_YYYYMMDD_HHMMSS.csv` con:
- Fecha y hora
- Acción realizada
- ID Remedy
- Ruta afectada
- Detalles

## Dependencias

- `requests`: Para consumo del API
- `PySide6`: Para UI moderna (opcional)
- `tkinter`: Incluido en Python (UI clásica)
