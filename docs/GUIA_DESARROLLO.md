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

---

## 5. Mejores Prácticas de Desarrollo (Backend & Frontend)

### 5.1 Carga de Relaciones en Entornos Asíncronos (SQLAlchemy)

Debido al uso de `AsyncSession`, SQLAlchemy prohíbe la carga diferida (*lazy loading*) de relaciones dentro de un contexto asíncrono. Intentar acceder a una relación que no fue cargada disparará el error: `greenlet_spawn has not been called; can't call blocking symbol`.

**Regla de Oro**: Si el endpoint es `async def`, **DEBES** declarar explícitamente qué relaciones vas a usar mediante `joinedload` (para 1:1 o N:1) o `selectinload` (para 1:N).

**Ejemplo Correcto**:
```python
from sqlalchemy.orm import joinedload
from sqlmodel import select

stmt = select(ModeloPrincipal).options(joinedload(ModeloPrincipal.relacion)).where(...)
resultado = (await db.execute(stmt)).unique().scalar_one_or_none()
```

### 5.2 Estructura de Atributos en Frontend (Atomic Design)

Para evitar **dependencias circulares** que rompan el renderizado de React:
1. **NO** importes átomos desde `./index` dentro de la propia carpeta `atoms`.
2. Importa directamente desde el archivo base: `import { Text } from './Text';` en lugar de `import { Text } from './index';`.
3. El archivo `index.ts` solo debe usarse para exportar, no para consumo interno de la misma carpeta.

### 5.3 Patrón: Filtros en cascada con `useColumnFilters`

`src/hooks/useColumnFilters.ts` devuelve por defecto opciones de dropdown en **cascada** (faceted search): para cada columna K, las opciones son los valores únicos de K en las filas que pasan todos los demás filtros activos, unidos con los valores ya seleccionados en K (para no perder chips).

Cuándo usar cascada:
- ✅ Listas con jerarquías reales (país→ciudad, equipo→miembro, área→responsable).
- ✅ Tableros con muchos datos donde el usuario refina progresivamente.

Cuándo **desactivarla** (pasar `cascade: false` como cuarto arg):
- ❌ Filtros ortogonales (ej. rango de fechas + texto libre) donde la cascada confunde más que ayuda.
- ❌ Vistas donde el universo de opciones es pequeño y siempre se quiere ver todo.

Costos: por cada cambio de filtro, el hook itera `columnas × filas` para recalcular `cascadingOptions`. Para < 5000 filas es despreciable; sobre eso medir.

Tests: ver `src/hooks/__tests__/useColumnFilters.cascade.test.ts` para los 7 escenarios de referencia.

### 5.4 Patrón: Persistencia frontend-only en `localStorage`

Para estado de UI que NO debe llegar al backend (marcas personales, vistas, etc.):

1. Crear hook en `src/pages/<Modulo>/hooks/use<Name>.ts` (específico del módulo).
2. Lazy init desde `localStorage.getItem(KEY)` con `try/catch` (storage puede estar deshabilitado, cuota llena, o contener JSON inválido).
3. `useEffect` que serializa en cada cambio.
4. Si el usuario puede tener la página abierta en varias pestañas, escuchar `window.addEventListener('storage', …)` para sincronizar.
5. Tests con `@testing-library/react` `renderHook` + `act`, mockeando `localStorage` con `localStorage.clear()` en `beforeEach`.

Ejemplo de referencia: `src/pages/MyDevelopments/hooks/useReviewedDevelopments.ts`.

---

## 6. Grafo del codebase (graphify)

El arnés OpenCode y los agentes pueden usar `graphify-out/` para explorar impacto cruzado entre módulos. El directorio está en `.gitignore` (cada desarrollador lo genera localmente).

### 6.1 Generación local (AST-only, sin API key)

Modo por defecto del repo: extracción estructural de código (imports, llamadas, símbolos) sin LLM semántico.

**Requisito:** Python 3.12+ con `pip install graphifyy`

```powershell
cd C:\Users\amejoramiento6\Gestor-de-proyectos-Ti
py -3.12 scripts/graphify_build_ast.py
```

**Corpus escaneado:** `backend_v2/app`, `frontend/src`, `docs` (~630 archivos de código/docs).

**Salidas:**

| Archivo | Uso |
|---------|-----|
| `graphify-out/GRAPH_REPORT.md` | Resumen humano, comunidades, hubs |
| `graphify-out/graph.json` | Grafo para CLI y subagentes |
| `graphify-out/.graphify_detect.json` | Metadatos del corpus |

### 6.2 Consultas desde CLI

```powershell
# Tras generar graphify-out/ (AST o extract semántico):
py -3.12 scripts/graphify_from_env.py query "autenticacion RBAC" --budget 1500
py -3.12 scripts/graphify_from_env.py path "ServicioAuth" "PermisoRol"
```

### 6.3 Clave Gemini en `.env`

En la raíz del repo, `.env` incluye (vacío hasta que pegues tu clave):

```env
GEMINI_API_KEY=
GOOGLE_API_KEY=
```

Puedes usar la misma clave en ambas; graphify lee cualquiera de las dos. Crear o rotar en [Google AI Studio](https://aistudio.google.com/apikey).

**¿Quién lee `.env` automáticamente?**

| Comando | Lee `GEMINI_API_KEY` del `.env` |
|---------|-----------------------------------|
| Backend FastAPI / Docker | Sí (otras vars; no usa graphify por defecto) |
| `py -3.12 -m graphify ...` directo | **No** |
| `py -3.12 scripts/graphify_from_env.py ...` | **Sí** |
| `py -3.12 scripts/graphify_build_ast.py` | Sí (carga `.env`; el modo AST no consume la clave) |

### 6.4 Extracción semántica completa (opcional)

Pega la clave en `GEMINI_API_KEY=` y ejecuta (el script carga `.env` solo):

```powershell
py -3.12 scripts/graphify_from_env.py extract docs --out . --backend gemini
py -3.12 scripts/graphify_from_env.py query "ADR arquitectura" --budget 1500
```

El monorepo completo (~900 archivos) es grande; prefiere subcarpetas o el script AST antes de un `extract` global.

### 6.5 Integración con subagentes

Ver `.opencode/agent/_shared-discovery.md` y `docs/decisions/ADR-006-protocolo-descubrimiento-agentes.md`. Los revisores **leen** `GRAPH_REPORT.md`; no ejecutan el pipeline si tienen `bash: deny`.

---

## 7. Motor Biométrico Interno

La biometría facial usa dos servicios separados:

- `backend`: API pública en `:8000`, dueña de JWT, RBAC, usuario actual, auditoría, persistencia y decisión final.
- `biometria-engine`: servicio interno Docker con DeepFace/OpenCV/TensorFlow. No publica puerto al host y no recibe JWT ni datos personales.

Variables relevantes:

```env
BIOMETRIA_ENGINE_URL=http://biometria-engine:8010
BIOMETRIA_ENGINE_TOKEN=<secreto-interno>
BIOMETRIA_ENGINE_TIMEOUT_SECONDS=30
DEEPFACE_MODEL=Facenet
DEEPFACE_DETECTOR=opencv
MATCH_THRESHOLD=0.40
```

Validaciones útiles:

```powershell
docker compose ps
docker compose exec backend python -c "import httpx; print(httpx.get('http://biometria-engine:8010/health').json())"
docker compose exec biometria-engine python -c "import cv2; from deepface import DeepFace; import tf_keras; print('ok')"
```

Desde la app móvil se usa siempre el backend principal por IP LAN del host, por ejemplo `http://192.168.40.163:8000/api/v2` en la red local actual. Configura esa IP en `movil/.env` con `EXPO_PUBLIC_API_HOST=192.168.40.163`. El móvil nunca debe llamar directo a `biometria-engine`.
