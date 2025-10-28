# Bot de Gestión Documental - Documentación Completa

## 🎯 Descripción General

Bot completo para gestionar desarrollos y carpetas, con funcionalidades de comparación, agrupación de acciones y ejecución de recomendaciones.

## 📁 Estructura de Archivos

### Archivos Principales:
- **`bot_simple.py`** (12,771 bytes) - Bot principal con interfaz gráfica
- **`servicio_api.py`** (3,549 bytes) - Servicio para obtener datos del API
- **`bot_comparator.py`** (9,092 bytes) - Módulo de comparación y sugerencias
- **`bot_actions.py`** (9,254 bytes) - Manejador de acciones y ejecución
- **`bot_actions_view.py`** (11,181 bytes) - Vista de acciones agrupadas

## 🔧 Funcionalidades del Bot

### 1. **Bot Principal (`bot_simple.py`)**
- **🔄 Actualizar**: Carga 52 desarrollos desde el servicio API
- **📁 Escanear Carpetas**: Busca carpetas existentes en el sistema
- **🔍 Comparar y Sugerir**: Compara desarrollos contra rutas y genera sugerencias
- **🎯 Vista de Acciones**: Abre vista especializada para acciones agrupadas
- **📋 Validar Controles**: Valida controles de calidad
- **❌ Cerrar**: Cierra el bot con confirmación

### 2. **Vista de Acciones (`bot_actions_view.py`)**
- **🆕 Crear Carpetas**: Pestaña con desarrollos que necesitan carpetas
- **📁 Mover Carpetas**: Pestaña con desarrollos que tienen carpetas para mover
- **⏸️ Pendientes**: Pestaña con desarrollos sin etapa definida
- **🆕 Ejecutar Creaciones**: Ejecuta creación de carpetas automáticamente
- **📁 Ejecutar Movimientos**: Ejecuta movimiento de carpetas automáticamente

### 3. **Módulo de Comparación (`bot_comparator.py`)**
- **Identifica desarrollos sin etapa**: Marca como "⏸️ PENDIENTE"
- **Genera sugerencias**: CREAR, ABRIR, o PENDIENTE
- **Maneja errores**: Procesamiento robusto de datos
- **Genera resúmenes**: Estadísticas detalladas

### 4. **Manejador de Acciones (`bot_actions.py`)**
- **Agrupa acciones**: Por tipo (CREAR, MOVER, PENDIENTE)
- **Ejecuta creaciones**: Crea carpetas con formato `{ID}_{Nombre}`
- **Ejecuta movimientos**: Mueve carpetas a ubicaciones correctas
- **Mapea etapas**: Asigna carpetas según la etapa del desarrollo

## 🚀 Flujo de Trabajo

### Paso 1: Cargar Datos
1. Ejecutar `python bot_simple.py`
2. Hacer clic en **"🔄 Actualizar"**
3. El bot carga 52 desarrollos desde el servicio API

### Paso 2: Comparar y Sugerir
1. Hacer clic en **"🔍 Comparar y Sugerir"**
2. El bot analiza cada desarrollo:
   - ✅ **Con etapa**: Sugiere CREAR o ABRIR
   - ⏸️ **Sin etapa**: Marca como PENDIENTE
3. Se muestran estadísticas en el log

### Paso 3: Vista de Acciones
1. Hacer clic en **"🎯 Vista de Acciones"**
2. Se abre una nueva ventana con pestañas:
   - **🆕 Crear**: Desarrollos que necesitan carpetas
   - **📁 Mover**: Desarrollos con carpetas para mover
   - **⏸️ Pendientes**: Desarrollos sin etapa

### Paso 4: Ejecutar Acciones
1. En la vista de acciones, hacer clic en:
   - **"🆕 Ejecutar Creaciones"**: Crea carpetas automáticamente
   - **"📁 Ejecutar Movimientos"**: Mueve carpetas automáticamente
2. El bot ejecuta las acciones y muestra resultados

## 📊 Tipos de Acciones

### 🆕 CREAR
- **Desarrollos sin carpeta** que tienen etapa definida
- **Acción**: Crear carpeta con formato `{ID}_{Nombre}`
- **Ubicación**: Según la etapa del desarrollo

### 📁 ABRIR
- **Desarrollos con carpeta existente**
- **Acción**: Mover a ubicación correcta según etapa
- **Resultado**: Reorganización automática

### ⏸️ PENDIENTE
- **Desarrollos sin etapa definida**
- **Acción**: Ninguna (no se pueden procesar)
- **Motivo**: "No se puede procesar - Sin etapa definida"

## 🗂️ Mapeo de Etapas a Carpetas

| Etapa | Carpeta de Destino |
|-------|-------------------|
| Definición | `Definición/` |
| Análisis | `Análisis/` |
| Desarrollo del Requerimiento | `Desarrollo del Requerimiento/` |
| Plan de Pruebas | `Plan de Pruebas/` |
| Ejecución de Pruebas | `Ejecución de Pruebas/` |
| Despliegue (Pruebas) | `Despliegue (Pruebas)/` |
| Aprobación (Pase) | `Aprobación (Pase)/` |
| Devuelto | `Devuelto/` |
| Aprobación Propuesta | `Aprobación Propuesta/` |
| Elaboración Propuesta | `Elaboración Propuesta/` |

## ⚙️ Configuración

### Ruta Base
```python
base_path = "C:/Users/lerv8093/OneDrive - Grupo Coomeva/PROYECTOS DESARROLLOS/Desarrollos"
```

### Servicio API
```python
api_url = "http://localhost:8000/api/v1/developments"
```

## 🎯 Características Técnicas

### ✅ Cumplimiento de Reglas
- **Archivos < 300 líneas**: Todos los módulos respetan el límite
- **Modularización**: Funcionalidades separadas en módulos especializados
- **Manejo de errores**: Logging robusto con fallback
- **Interfaz moderna**: Usando ttkbootstrap

### 🔧 Funcionalidades Avanzadas
- **Comparación inteligente**: Identifica desarrollos sin etapa
- **Agrupación automática**: Organiza acciones por tipo
- **Ejecución masiva**: Procesa múltiples desarrollos
- **Logging detallado**: Seguimiento completo de operaciones
- **Confirmaciones**: Previene ejecuciones accidentales

## 🚀 Uso Rápido

1. **Iniciar**: `python bot_simple.py`
2. **Cargar**: Clic en "🔄 Actualizar"
3. **Comparar**: Clic en "🔍 Comparar y Sugerir"
4. **Acciones**: Clic en "🎯 Vista de Acciones"
5. **Ejecutar**: Clic en botones de ejecución según necesidad

## 📈 Beneficios

- ✅ **Automatización**: Reduce trabajo manual
- ✅ **Organización**: Mantiene estructura de carpetas
- ✅ **Trazabilidad**: Log completo de operaciones
- ✅ **Seguridad**: Confirmaciones antes de ejecutar
- ✅ **Flexibilidad**: Maneja diferentes tipos de desarrollos
- ✅ **Escalabilidad**: Procesa 52+ desarrollos eficientemente
