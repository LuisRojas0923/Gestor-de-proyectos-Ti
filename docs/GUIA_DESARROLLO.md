# Guía del Desarrollador - Gestor de Proyectos TI

Este documento centraliza las instrucciones clave para los desarrolladores que trabajan localmente en su máquina con el repositorio de GitHub.

---

## 1. Autenticación y Credenciales (GitHub)

Para poder sincronizar código (`git pull` y `git push`) con GitHub necesitas credenciales válidas. GitHub **no acepta contraseñas de cuenta** por HTTPS; debes usar un **Personal Access Token (PAT)**.

### 1.1 Credenciales ya configuradas en Windows
- Git está configurado para usar el **Administrador de credenciales de Windows** (`credential.helper = manager`).
- La **primera vez** que hagas `git pull` o `git push`, Windows te pedirá usuario y contraseña. En contraseña debes pegar tu **token**.

### 1.2 Cómo crear un Personal Access Token (PAT)
1. Inicia sesión en **GitHub**.
2. Clic en tu **foto de perfil** (arriba a la derecha) → **Settings**.
3. En el menú izquierdo, al final: **Developer settings**.
4. **Personal access tokens** → **Tokens (classic)**.
5. **Generate new token** → **Generate new token (classic)**.
6. Pon un nombre (ej: `Gestor-de-proyectos-Ti`) y elige la expiración.
7. Marca el permiso **repo** (acceso completo a repositorios).
8. Clic en **Generate token** y cópialo inmediatamente (solo se muestra una vez).

### 1.3 Solución de Errores Comunes de Autenticación
Si Git sigue pidiendo credenciales o arroja error de autenticación:
1. Asegúrate de haber pegado el Token, no tu password de cuenta.
2. Abre el **Administrador de credenciales de Windows** (Credential Manager).
3. Ve a **Credenciales de Windows** y busca la entrada `git:https://github.com`.
4. Edítala y pega tu nuevo Token, o elimínala para que Git te vuelva a solicitar las credenciales en tu próximo comando.

---

## 2. Flujo de Trabajo y Resolución de Conflictos

Si tienes código en tu máquina que aún no subes, pero otra persona actualizó el repositorio centralizado, sigue estos pasos para combinar el código sin perder tus desarrollos locales.

> **Pre-requisito**: Tus cambios locales sucios deben estar guardados temporalmente con `git stash` antes de bajar cambios remotos.

### 2.1 Traer los cambios del servidor remoto
Navega a la carpeta del proyecto y descárgalo:
```powershell
cd C:\Users\amejoramiento2\Documents\Gestor-de-proyectos-Ti-2
git pull origin main
```
*(Si te pide credenciales, usa el Token generado en el Paso 1).*

### 2.2 Recuperar tus cambios locales encima
Una vez el repositorio centralizado está descargado, aplica tus propios cambios guardados:
```powershell
git stash pop
```
Esto combina tus archivos modificados localmente con lo que acabas de descargar.

### 2.3 Manejo de Conflictos
Si Git avisa de **Conflictos (Merge branch / Conflict in...)** después de hacer el *pop*:
1. Abre los archivos indicados en tu editor (VS Code). 
2. Busca las marcas rojas/verdes (`<<<<<<< HEAD`, `=======`, `>>>>>>>`).
3. Escoge la versión de código correcta (tuya, del remoto, o una combinación de ambas).
4. Borra las marcas delimitadoras (`<<<<`, `====`, `>>>>`).
5. Añade los archivos resueltos y guardados:
   ```powershell
   git add .
   git commit -m "chore(git): resolver conflictos de fusión con rama principal"
   ```

Si los conflictos son catastróficos y prefieres volver atrás descartando tu propio código (peligroso):
```powershell
git stash drop
```

---

## 3. Extensiones y Herramientas Recomendadas

- **Visual Studio Code**: Editor oficial del equipo.
- **SQLTools**: Extensión instalada directamente en VS Code para explorar la base de datos PostgreSQL sin salir del entorno.
- **Postman / Thunder Client**: Para probar los endpoints de la API de FastAPI.

---

## 4. Mantenimiento y Verificación de Base de Datos

Consultas útiles para verificar que el entorno de base de datos (Producción o Pruebas) esté correctamente configurado.

### 4.1 Verificación de Estructura (Sesiones)
Comprueba que las columnas y tipos de datos coincidan con la última versión del sistema:
```sql
SELECT 
    column_name, 
    data_type, 
    character_maximum_length, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'sesiones'
ORDER BY ordinal_position;
```

### 4.2 Verificación de Índices
Asegura que existan los índices necesarios para el rendimiento de la Torre de Control:
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'sesiones';
```

### 4.3 Verificación de Permisos (Roles Críticos)
Valida que los administradores tengan acceso a los módulos de control:
```sql
SELECT * FROM permisos_rol 
WHERE modulo = 'control-tower' 
AND rol IN ('admin', 'admin_sistemas');
```

### 4.4 Monitoreo de Sesiones Recientes
Valida si el servidor está registrando correctamente los metadatos de usuario:
```sql
SELECT id, usuario_id, nombre_usuario, rol_usuario, ultima_actividad_en, fin_sesion 
FROM sesiones 
ORDER BY creado_en DESC 
LIMIT 10;
```
