# 🚀 Guía de Integración: Módulo de Gestión de Actividades (WBS & Bitácora)

Este directorio contiene todos los archivos necesarios para implementar un **Módulo de Gestión de Actividades Jerárquico (WBS), Registro de Historial (Bitácora) y Plantillas** en un nuevo proyecto independiente.

---

## 🗄️ Paso 1: Inicialización de la Base de Datos (PostgreSQL)

1. Conéctate a tu base de datos PostgreSQL de destino.
2. Ejecuta el archivo de migración provisto en:
   `database/migracion_actividades.sql`
3. **Nota sobre claves foráneas**: Las tablas `actividades`, `registro_actividades` y `validaciones_asignacion` están preparadas para asociarse a un identificador de proyecto/desarrollo (`desarrollo_id` de tipo `VARCHAR(50)`).
   * Si en tu nuevo proyecto la tabla de proyectos se llama diferente (ej: `proyectos` o `tasks`), actualiza la clave foránea en `actividades.desarrollo_id` o retira la restricción `REFERENCES` para que sea un ID lógico simple.

---

## 🐍 Paso 2: Configuración del Backend (FastAPI + SQLModel / SQLAlchemy Async)

Copia el contenido de la carpeta `backend/` a tu servidor de FastAPI:

### 1. Modelos (`models/`)
* Registra los nuevos modelos en tu archivo principal de metadatos o base de datos (`SQLModel.metadata`) para que estén disponibles.
* Ajusta las relaciones en `models/actividad.py` y `models/validacion_asignacion.py`:
  * Si tu tabla de proyectos/desarrollos se llama diferente, ajusta el campo `desarrollo_id: str = Field(foreign_key="tu_tabla.id")`.
  * Si no usas un sistema jerárquico organizacional de usuarios, puedes desvincular o poner como opcionales los campos `responsable_id`, `asignado_a_id`, `delegado_por_id` y `validador_id`.

### 2. Servicios (`services/`)
* **`porcentaje_service.py`**: Este servicio se encarga de calcular el avance promedio de las tareas hijas y propagarlo hacia los nodos padres. 
  * Si no tienes una entidad `Desarrollo` en tu nuevo proyecto, comenta o elimina la función `recalcular_progreso_desarrollo` para evitar fallos de importación.
* **`actividad_delete_service.py`**: Este servicio realiza la eliminación recursiva segura "bottom-up" (desde las hojas hasta la raíz). Úsalo en tus endpoints de borrado para evitar errores de restricción de clave foránea física en Postgres.

### 3. Rutas / API (`api/`)
* Añade los routers a tu aplicación FastAPI (`app.include_router(...)`):
  * `actividades_router.py`
  * `plantillas_router.py`
  * `log_actividades_router.py`
* **Inyección de Dependencias**: Por defecto, los routers inyectan la sesión de base de datos asíncrona mediante `db: AsyncSession = Depends(obtener_db)`. Asegúrate de importar tu función generadora de sesión (`get_db` o equivalente) y actualizar las sentencias de importación en los encabezados de los routers.

---

## ⚛️ Paso 3: Configuración del Frontend (React + TypeScript)

Copia el contenido de la carpeta `frontend/` a tu aplicación React:

### 1. Dependencias Requeridas
Asegúrate de instalar los siguientes paquetes de iconos y portales en tu nuevo frontend:
```bash
npm install lucide-react react-dom
```

### 2. Estilos y Tailwind CSS
Los componentes utilizan clases condicionales para soportar **Modo Oscuro (Dark Mode)** y responsividad móvil en base a Tailwind CSS. Asegúrate de tener configurado Tailwind en tu proyecto destino.

### 3. Sistema de Diseño (Átomos)
* Hemos incluido los **Átomos** esenciales (Button, Input, Select, Text, Title, Badge, etc.) en `frontend/atoms/`.
* Si tu nuevo proyecto ya cuenta con su propio Design System (ej: Shadcn, MaterialUI, etc.):
  * Puedes eliminar la carpeta `frontend/atoms/`.
  * Abre los componentes en `frontend/molecules/` y `frontend/organisms/` y reemplaza los imports de los átomos por los componentes de tu nueva biblioteca de UI.

### 4. Hook de Red y Conectividad (`useApi`)
* Los modales llaman al hook `useApi` para realizar las peticiones HTTP e inyectar el token JWT.
* **Acción requerida**: Modifica el import y el uso de `useApi` en `ActivityCreateModal.tsx`, `ActivityEditModal.tsx` y `ActivityDeleteModal.tsx` para adaptarlo al fetcher de tu nueva aplicación (por ejemplo, reemplazándolo por llamadas directas con `axios`, `fetch` nativo, o hooks de `react-query`).
