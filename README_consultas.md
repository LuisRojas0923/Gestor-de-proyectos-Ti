# 🐘 Consultas PostgreSQL - Gestor de Proyectos TI

## 📋 Extensiones recomendadas para VS Code:

1. **SQLTools** (mtxr.sqltools)
2. **SQLTools PostgreSQL Driver** (mtxr.sqltools-driver-pg)
3. **PostgreSQL** (ckolkman.vscode-postgres)

## 🚀 Cómo usar:

### Opción 1: Con SQLTools (Recomendado)
1. Instala las extensiones mencionadas
2. Abre el archivo `consultas.sql`
3. La conexión ya está configurada en `.vscode/settings.json`
4. Haz clic en el ícono de SQLTools en la barra lateral
5. Conecta a "PostgreSQL - Gestor Proyectos"
6. Selecciona cualquier consulta y presiona `Ctrl+E Ctrl+E` (o `Cmd+E Cmd+E` en Mac)

### Opción 2: Ejecutar bloques específicos
- Cada consulta tiene un comentario `-- @block NombreDelBloque`
- Selecciona la consulta que quieres ejecutar
- Usa el comando de tu extensión SQL para ejecutar

### Opción 3: Conexión manual
Si prefieres configurar tu propia conexión:
- **Host:** localhost
- **Puerto:** 5432
- **Base de datos:** project_manager
- **Usuario:** user
- **Contraseña:** password

## 📁 Archivos incluidos:

- `consultas.sql` - Consultas optimizadas para extensiones
- `consultas_postgresql.py` - Script Python interactivo (alternativa)
- `consultas_rapidas.sql` - Consultas básicas sin formato especial
- `.vscode/settings.json` - Configuración automática para VS Code

## 🔍 Tipos de consultas disponibles:

### Información básica:
- Ver todas las tablas
- Ver estructura de tablas específicas
- Contar registros

### Datos de prueba:
- Insertar usuarios de ejemplo
- Insertar proyectos de ejemplo  
- Insertar requerimientos de ejemplo

### Análisis:
- Requerimientos por estado
- Usuarios con más asignaciones
- Proyectos por estado
- Requerimientos críticos

### Mantenimiento:
- Información del sistema
- Tamaño de tablas
- Limpieza de datos (usar con cuidado)

## ⚡ Atajos de teclado comunes:

- **SQLTools:** `Ctrl+E Ctrl+E` - Ejecutar consulta seleccionada
- **PostgreSQL Extension:** `F5` - Ejecutar consulta
- **Seleccionar todo:** `Ctrl+A`
- **Ejecutar todo el archivo:** Depende de la extensión

## 🛠️ Troubleshooting:

**Error de conexión:**
```bash
# Verificar que los contenedores estén corriendo
docker ps

# Si no están corriendo:
docker-compose up -d
```

**Extensión no encuentra la conexión:**
1. Reinicia VS Code
2. Verifica que el archivo `.vscode/settings.json` existe
3. Revisa la configuración de SQLTools en VS Code
