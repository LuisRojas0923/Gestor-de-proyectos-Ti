# Asistente de Gestión y Seguimiento de Desarrollos

## 🎯 Visión del Producto

Este proyecto evoluciona de un gestor de proyectos a un **asistente personal inteligente**, diseñado para el seguimiento detallado del ciclo de vida de los desarrollos de software. El objetivo es centralizar, gestionar y medir el rendimiento de los requerimientos gestionados tanto por equipos internos como por proveedores externos.

La herramienta está enfocada en proporcionar un **"centro de control"** para cada desarrollo, registrar el día a día de las actividades y calcular automáticamente los indicadores clave de rendimiento (KPIs) para la toma de decisiones.

---

## ✨ Funcionalidades Clave

-   ✅ **Módulo "Mis Desarrollos"**: Un panel central para visualizar y gestionar todos los desarrollos, replicando y mejorando el control que actualmente se lleva en Excel. Incluye toda la información relevante como responsable, proveedor, fechas clave y costos.

-   ✅ **Centro de Control por Desarrollo**: Cada desarrollo tiene su propio espacio de trabajo detallado que incluye:
    -   **Información Principal**: Todos los datos maestros del requerimiento.
    -   **Cronograma de Hitos**: Fases clave del desarrollo (análisis, diseño, pruebas, etc.) en una vista de línea de tiempo.
    -   **Bitácora de Actividades**: Un registro cronológico para anotar el progreso diario, devoluciones, reuniones o cualquier evento relevante.

-   ✅ **Dashboard de Indicadores (KPIs)**: Un módulo dedicado a medir el rendimiento de los proveedores de forma automática, basado en los siguientes indicadores:
    1.  **Cumplimiento de fechas Global**: `Entregas a tiempo ÷ entregas programadas × 100%`
    2.  **Cumplimiento de fechas Desarrollo**: Diferencia en días entre fecha programada y real.
    3.  **Calidad en primera entrega**: `Entregas aprobadas sin devoluciones ÷ entregas totales × 100%`
    4.  **Tiempo de respuesta a fallas**: Mediana de horas desde el reporte hasta la solución.
    5.  **Defectos por entrega**: `Defectos en Pruebas ÷ funcionalidades entregadas`
    6.  **Retrabajo posproducción**: `Incidencias derivadas ÷ entregas en producción × 100%`

-   ✅ **Registro de Incidencias**: Una sección para registrar fallos o problemas que ocurren después de una entrega, alimentando directamente los indicadores de calidad.

---

## 🚀 Configuración y Puesta en Marcha (con Docker)

Este proyecto está completamente dockerizado para garantizar un entorno de desarrollo consistente y fácil de configurar.

### Prerrequisitos

-   **Docker Desktop**: Asegúrate de tenerlo instalado y en ejecución. Puedes descargarlo desde [aquí](https://www.docker.com/products/docker-desktop/).

### Puesta en Marcha

1.  **Clona el repositorio** (si aún no lo has hecho).

2.  **Configura las variables de entorno:**
    -   Dentro de la carpeta `backend/`, crea una copia del archivo `env.example` y renómbrala a `.env`.
    -   Rellena las variables necesarias (credenciales, claves de API, etc.).

3.  **Construye y levanta los servicios:**
    -   Abre una terminal en la raíz del proyecto y ejecuta el siguiente comando:
    ```bash
    docker compose up --build
    ```
    -   Este comando construirá las imágenes para el backend y el frontend, y luego iniciará los contenedores.

4.  **¡Listo!**
    -   El **Frontend** estará disponible en `http://localhost:5173`.
    -   El **Backend** estará disponible en `http://localhost:8000`.
    -   La documentación interactiva de la API estará en `http://localhost:8000/docs`.

### Comandos útiles de Docker

-   **Para detener los servicios:**
    ```bash
    docker compose down
    ```
-   **Para ver los logs de un servicio (ej. backend):**
    ```bash
    docker compose logs -f backend
    ```
-   **Para entrar a la terminal de un contenedor (ej. backend):**
    ```bash
    docker compose exec backend bash
    ```

---

## 🏗️ Arquitectura Tecnológica

El proyecto está construido con una arquitectura moderna separando el frontend del backend:

-   **Backend**: **Python** con el framework **FastAPI** para construir una API RESTful de alto rendimiento.
    -   **Base de Datos**: **PostgreSQL** (gestionada dentro de Docker) a través del ORM **SQLAlchemy**.
    -   **Migraciones de BD**: **Alembic** para manejar cambios en el esquema de la base de datos de forma controlada.
    -   **Extracción de Datos**: **Selenium** para realizar web scraping de la plataforma de requerimientos.
    -   **Integración con IA**: Conexión a APIs de modelos de lenguaje grandes (ej. OpenAI, Google Gemini).
    -   **Integración con Email**: **Microsoft Graph API SDK** para interactuar con Outlook (Microsoft 365).

-   **Frontend**: **React 18** con **TypeScript** y **Vite** para construir una interfaz de usuario interactiva y dinámica.
    -   **Styling**: **Tailwind CSS** para diseño responsive y moderno.
    -   **Gráficos**: **Recharts** para visualizaciones de datos.
    -   **Internacionalización**: **react-i18next** para soporte multiidioma.

---

## 💾 Esquema de la Base de Datos

El núcleo de la aplicación se basa en tres tablas principales que se relacionan entre sí:

### Tabla `developments`
Esta es la tabla central que almacena cada uno de los desarrollos o requerimientos.

| Columna                   | Tipo           | Descripción                                           |
| ------------------------- | -------------- | ----------------------------------------------------- |
| `id`                      | `String` (PK)  | Identificador único (ej. No. Remedy).                 |
| `name`                    | `String`       | Nombre del desarrollo.                                |
| `description`             | `Text`         | Descripción detallada.                                |
| `provider`                | `String`       | Proveedor o equipo responsable (TI, Ingesoft, etc.).  |
| `general_status`          | `String`       | Estado general (En curso, Pendiente, Completado).     |
| `current_stage`           | `String`       | Etapa específica del progreso.                        |
| `start_date`              | `DateTime`     | Fecha de inicio del desarrollo.                       |
| `scheduled_delivery_date` | `DateTime`     | Fecha programada de entrega (para KPIs).              |
| `actual_delivery_date`    | `DateTime`     | Fecha real en la que se entregó (para KPIs).          |
| `returns_count`           | `Integer`      | Contador de devoluciones (para KPI de calidad).       |
| `test_defects_count`      | `Integer`      | Contador de defectos en pruebas (para KPI de calidad). |
| `estimated_cost`          | `Float`        | Costo estimado o final del desarrollo.                |
| `proposal_number`         | `String`       | Identificador de la propuesta comercial asociada.     |

#### Relaciones

-   **Una a Muchas:** Un `development` puede tener muchas `activity_logs`.
-   **Una a Muchas:** Un `development` puede tener muchos `incidents`.

La conexión se realiza a través del campo `development_id` en las tablas `activity_logs` e `incidents`, que actúa como Clave Foránea (FK) apuntando al `id` de la tabla `developments`.

### Tabla `activity_logs`
Almacena el historial de la bitácora para cada desarrollo.

| Columna          | Tipo         | Descripción                                        |
| ---------------- | ------------ | -------------------------------------------------- |
| `id`             | `Integer` (PK) | Identificador único de la entrada.                 |
| `development_id` | `String` (FK)  | Vincula la actividad al desarrollo correspondiente. |
| `date`           | `DateTime`   | Fecha en que se registró la actividad.             |
| `description`    | `Text`       | Descripción de la actividad o seguimiento.         |

### Tabla `incidents`
Registra las incidencias o fallos que ocurren después de que un desarrollo pasa a producción.

| Columna           | Tipo         | Descripción                                        |
| ----------------- | ------------ | -------------------------------------------------- |
| `id`              | `Integer` (PK) | Identificador único de la incidencia.              |
| `development_id`  | `String` (FK)  | Vincula la incidencia al desarrollo de origen.     |
| `report_date`     | `DateTime`   | Fecha en que se reportó el fallo.                  |
| `resolution_date` | `DateTime`   | Fecha en que se solucionó el fallo.                |
| `description`     | `Text`       | Descripción de la incidencia.                      |

---

## 📁 Estructura del Directorio

```
/
├── backend/                # Código fuente del backend en Python
│   ├── app/                # Directorio principal de la aplicación FastAPI
│   │   ├── __init__.py
│   │   ├── main.py         # Punto de entrada de la aplicación
│   │   ├── models.py       # Modelos de SQLAlchemy (tablas de la BD)
│   │   ├── schemas.py      # Esquemas Pydantic (validación de datos API)
│   │   ├── crud.py         # Funciones para interactuar con la BD (CRUD)
│   │   ├── database.py     # Configuración de base de datos
│   │   └── services/       # Lógica de negocio específica
│   │       ├── scraper.py  # Módulo de Selenium para web scraping
│   │       ├── ai_service.py # Módulo para servicios de IA
│   │       └── graph_service.py # Módulo para Microsoft Graph
│   ├── alembic/            # Configuración y migraciones de Alembic
│   │   ├── env.py          # Configuración del entorno
│   │   ├── script.py.mako  # Plantilla para migraciones
│   │   └── versions/       # Archivos de migración
│   ├── requirements.txt    # Dependencias de Python
│   └── env.example         # Ejemplo de variables de entorno
│
└── frontend/               # Código fuente del frontend en React
    ├── public/             # Archivos estáticos
    ├── src/                # Código fuente de React
    │   ├── components/     # Componentes reutilizables
    │   │   ├── common/     # Componentes comunes (MetricCard, LoadingSpinner)
    │   │   └── layout/     # Componentes de layout (Sidebar, TopBar, Layout)
    │   ├── context/        # Contexto global de la aplicación
    │   ├── hooks/          # Hooks personalizados (useApi)
    │   ├── i18n/           # Configuración de internacionalización
    │   ├── pages/          # Páginas de la aplicación
    │   │   ├── Dashboard.tsx
    │   │   ├── Requirements.tsx
    │   │   ├── Testing.tsx
    │   │   ├── Chat.tsx
    │   │   ├── Reports.tsx
    │   │   └── Settings.tsx
    │   ├── App.tsx         # Componente principal
    │   ├── Router.tsx      # Configuración de rutas
    │   └── main.tsx        # Punto de entrada
    ├── package.json        # Dependencias de Node.js
    ├── tsconfig.json       # Configuración de TypeScript
    ├── vite.config.ts      # Configuración de Vite
    ├── tailwind.config.js  # Configuración de Tailwind CSS
    └── eslint.config.js    # Configuración de ESLint
```

---

## 📝 Notas de Desarrollo

- El entorno de Docker está configurado para usar una base de datos PostgreSQL.
- El backend y el frontend se recargan automáticamente cuando detectan cambios en el código (`hot-reloading`).
- Los servicios de IA tienen fallback entre OpenAI y Google Gemini.
- El frontend incluye modo oscuro/claro y sidebar colapsable.
- Todas las páginas están implementadas con datos de ejemplo (mock data).
- La base de datos se crea automáticamente al ejecutar las migraciones.

## 🆕 Funcionalidades Implementadas Recientemente

### ✅ Controles de Calidad por Etapa
- **Integración con Procedimiento FD-PR-072**: Se implementaron los controles de calidad específicos para cada etapa del proceso de gestión de la demanda.
- **Controles Dinámicos**: Cada desarrollo muestra automáticamente los controles correspondientes a su etapa actual:
  - **C003-GT**: Validación de requerimientos claros y completos (Etapas 1-2)
  - **C021-GT**: Validación de pruebas de usuario vs. requerimientos (Etapas 5-7)  
  - **C004-GT**: Garantía de entregas sin impacto negativo (Etapas 8-10)
  - **C027-GT**: Validación trimestral de soportes en producción (Etapas 8-10)

### ✅ Reporte Mensual para Directivos
- **Tabla Consolidada**: Vista específica en la página de Reportes que muestra:
  - Estado detallado de desarrollos en curso
  - Cálculo automático de días de desfase (comparando fecha estimada vs. actual)
  - Conteo de incidencias por desarrollo
  - Fechas de inicio y cierre estimadas
- **Cumplimiento del Procedimiento**: Implementa exactamente lo requerido en la sección 6.3 del documento FD-PR-072.

### ✅ Importación desde Excel (Frontend)
- **Importador Visual**: Componente que permite arrastrar y soltar archivos Excel (.xls, .xlsx, .csv)
- **Vista Previa**: Muestra los datos que se van a importar antes de confirmar
- **Deduplicación Automática**: Evita importar desarrollos duplicados basándose en el ID de Remedy
- **Mapeo de Columnas**: Configurado para la estructura real del archivo de exportación de Remedy:
  - `'No. de la solicitud'` → ID de Remedy
  - `'Cliente Interno'` → Nombre del desarrollo
  - `'Asignado a'` → Responsable principal
  - `'Solicitud Interna requerida'` → Área solicitante
  - `'Estado'` → Estado general
  - `'Fecha de envío'` → Fecha de inicio
  - `'Fecha de finalización planificada'` → Fecha estimada de fin
- **Persistencia Local**: Los datos importados se guardan en localStorage del navegador como solución temporal

### ✅ Diseño Responsivo Optimizado
- **Vista de Tabla para Desktop**: Tabla completa en pantallas grandes (>1024px)
- **Vista de Tarjetas para Portátiles**: Cards compactas sin scroll horizontal para pantallas medianas (<1024px)
- **Panel Lateral Adaptativo**: 
  - Portátiles: Ancho reducido (320px)
  - Tablets: Pantalla completa
  - Desktop: Ancho original (384px)
- **Filtros Responsivos**: Layout adaptativo según el tamaño de pantalla
- **Sin Barras de Desplazamiento**: Eliminadas en pantallas de portátil (13"-15")

## 🔄 Migración Futura (Backend)

### Código Temporal que se Eliminará:
- **Datos de Muestra**: ~100 líneas de `sampleDevelopments` (desarrollo ficticio)
- **Lógica localStorage**: ~20 líneas de persistencia local
- **Importación Manual**: ~40 líneas de procesamiento de Excel en frontend
- **Total estimado**: ~35-40% del código actual (~280-290 líneas)

### Funcionalidad que se Moverá al Backend:
- **Importación de Excel**: Procesamiento server-side con `pandas` o `openpyxl`
- **Gestión de Datos**: Reemplazar localStorage con PostgreSQL
- **Deduplicación**: Lógica de validación en base de datos
- **APIs RESTful**: Endpoints para CRUD de desarrollos, importación y reportes

### Beneficios Post-Migración:
- **Código más limpio**: Frontend enfocado solo en UI/UX
- **Datos centralizados**: Sincronización entre múltiples usuarios
- **Mejor rendimiento**: Sin limitaciones de localStorage
- **Escalabilidad**: Preparado para crecimiento empresarial

---

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.
