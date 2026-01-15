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

### 📋 Documentación Arquitectónica

El proyecto cuenta con una **documentación arquitectónica completa** distribuida en tres documentos especializados:

-   **`ARQUITECTURA_BASE_DATOS.md`**: Especificación completa de la estructura de base de datos normalizada, incluyendo:
    -   28 tablas normalizadas con relaciones detalladas
    -   Ciclo de desarrollo con 11 etapas agrupadas en 3 fases principales
    -   Vistas SQL para cálculo automático de KPIs
    -   Índices optimizados para rendimiento
    -   Flujo de datos y automatización de indicadores

-   **`ARQUITECTURA_BACKEND.md`**: Arquitectura completa del backend, incluyendo:
    -   Modelos SQLAlchemy para todas las entidades
    -   Endpoints de API RESTful organizados por módulos
    -   Servicios de negocio y lógica de aplicación
    -   Schemas Pydantic para validación de datos
    -   Flujo del ciclo de desarrollo con disparadores automáticos

-   **`ARQUITECTURA_FRONTEND.md`**: Especificación de la arquitectura del frontend, incluyendo:
    -   Estructura de componentes React organizados por módulos
    -   Jerarquía de componentes UI y estados de aplicación
    -   Hooks personalizados y gestión de estado
    -   Integración con servicios de backend
    -   Diseño responsive y experiencia de usuario

---

## 💾 Esquema de la Base de Datos

### 🏗️ Estructura Visual de la Base de Datos

```
PostgreSQL Database: "gestor_proyectos"
│
├── 📋 developments (Tabla Principal)
│   ├── 🔑 id (VARCHAR, PK) ──────────────┐
│   ├── name (VARCHAR)                    │
│   ├── description (TEXT)                │
│   ├── module (VARCHAR)                  │
│   ├── type (VARCHAR)                    │
│   ├── provider (VARCHAR)                │
│   ├── requesting_area (VARCHAR)         │
│   ├── main_responsible (VARCHAR)        │
│   ├── general_status (VARCHAR)          │
│   ├── current_stage (VARCHAR)           │
│   ├── observations (TEXT)               │
│   ├── 📅 start_date (TIMESTAMP)         │
│   ├── 📅 estimated_end_date (TIMESTAMP) │
│   ├── 📅 actual_end_date (TIMESTAMP)    │
│   ├── 📅 target_closure_date (TIMESTAMP)│
│   ├── 📅 scheduled_delivery_date (TIMESTAMP) │
│   ├── 📅 actual_delivery_date (TIMESTAMP)    │
│   ├── estimated_days (INTEGER)          │
│   ├── 💰 estimated_cost (DECIMAL)       │
│   ├── proposal_number (VARCHAR)         │
│   ├── environment (VARCHAR)             │
│   ├── portal_link (VARCHAR)             │
│   ├── returns_count (INTEGER)           │
│   ├── test_defects_count (INTEGER)      │
│   ├── 📅 created_at (TIMESTAMP)         │
│   └── 📅 updated_at (TIMESTAMP)         │
│                                         │
├── 📝 activity_logs (Bitácora)           │
│   ├── 🔑 id (SERIAL, PK)                │
│   ├── 🔗 development_id (VARCHAR, FK) ──┘
│   ├── 📅 date (TIMESTAMP)
│   ├── description (TEXT)
│   ├── user_id (VARCHAR) [Futuro]
│   ├── activity_type (VARCHAR) [Futuro]
│   ├── 📅 created_at (TIMESTAMP)
│   └── 📅 updated_at (TIMESTAMP)
│
└── 🚨 incidents (Incidencias Post-Producción)
    ├── 🔑 id (SERIAL, PK)
    ├── 🔗 development_id (VARCHAR, FK) ──┘
    ├── description (TEXT)
    ├── severity (VARCHAR) [Futuro]
    ├── impact (VARCHAR) [Futuro]
    ├── 📅 report_date (TIMESTAMP)
    ├── 📅 resolution_date (TIMESTAMP)
    ├── status ('Abierta'|'Cerrada')
    ├── assigned_to (VARCHAR) [Futuro]
    ├── 📅 created_at (TIMESTAMP)
    └── 📅 updated_at (TIMESTAMP)

Relaciones:
├── developments 1 ──── N activity_logs
└── developments 1 ──── N incidents
```

### 📊 Índices y Constraints

```
Índices Principales:
├── developments
│   ├── 🔑 PRIMARY KEY (id)
│   ├── 📇 INDEX idx_dev_status (general_status)
│   ├── 📇 INDEX idx_dev_provider (provider)
│   ├── 📇 INDEX idx_dev_dates (start_date, estimated_end_date)
│   └── 📇 INDEX idx_dev_responsible (main_responsible)
│
├── activity_logs
│   ├── 🔑 PRIMARY KEY (id)
│   ├── 🔗 FOREIGN KEY (development_id) REFERENCES developments(id)
│   ├── 📇 INDEX idx_activity_dev (development_id)
│   └── 📇 INDEX idx_activity_date (date)
│
└── incidents
    ├── 🔑 PRIMARY KEY (id)
    ├── 🔗 FOREIGN KEY (development_id) REFERENCES developments(id)
    ├── 📇 INDEX idx_incident_dev (development_id)
    ├── 📇 INDEX idx_incident_status (status)
    └── 📇 INDEX idx_incident_dates (report_date, resolution_date)

Constraints:
├── developments.general_status ∈ ('Pendiente', 'En curso', 'Completado', 'Cancelado')
├── incidents.status ∈ ('Abierta', 'Cerrada')
├── developments.estimated_days >= 0
├── developments.returns_count >= 0
├── developments.test_defects_count >= 0
└── developments.estimated_cost >= 0
```

### 🔄 Flujo de Datos y Operaciones

```
Operaciones CRUD Principales:

📝 CREATE Operations:
├── INSERT development → Nuevo proyecto/requerimiento
├── INSERT activity_log → Nueva entrada en bitácora
└── INSERT incident → Nueva incidencia reportada

📖 READ Operations:
├── SELECT developments → Lista principal (con filtros)
├── SELECT development + activities + incidents → Vista detallada
├── SELECT para KPIs → Cálculos de rendimiento
└── SELECT para reportes → Datos consolidados

✏️ UPDATE Operations:
├── UPDATE development.current_stage → Cambio de etapa
├── UPDATE development.general_status → Cambio de estado
├── UPDATE incident.resolution_date → Cierre de incidencia
└── UPDATE development.actual_end_date → Finalización real

🗑️ DELETE Operations:
├── Soft delete developments → Marcar como cancelado
├── CASCADE delete activities → Al eliminar desarrollo
└── CASCADE delete incidents → Al eliminar desarrollo
```

### 📈 Consultas para KPIs

```sql
-- Cumplimiento de Fechas Global
SELECT 
    provider,
    COUNT(*) as total_entregas,
    SUM(CASE WHEN actual_delivery_date <= scheduled_delivery_date 
        THEN 1 ELSE 0 END) as entregas_a_tiempo,
    ROUND(
        (SUM(CASE WHEN actual_delivery_date <= scheduled_delivery_date 
            THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2
    ) as porcentaje_cumplimiento
FROM developments 
WHERE actual_delivery_date IS NOT NULL
GROUP BY provider;

-- Calidad en Primera Entrega
SELECT 
    provider,
    COUNT(*) as total_entregas,
    SUM(CASE WHEN returns_count = 0 THEN 1 ELSE 0 END) as sin_devoluciones,
    ROUND(
        (SUM(CASE WHEN returns_count = 0 THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2
    ) as calidad_primera_entrega
FROM developments 
WHERE general_status = 'Completado'
GROUP BY provider;

-- Defectos por Entrega
SELECT 
    provider,
    AVG(test_defects_count) as promedio_defectos,
    MAX(test_defects_count) as max_defectos,
    MIN(test_defects_count) as min_defectos
FROM developments 
WHERE general_status = 'Completado'
GROUP BY provider;

-- Tiempo de Respuesta a Incidencias
SELECT 
    d.provider,
    AVG(EXTRACT(EPOCH FROM (i.resolution_date - i.report_date))/3600) as horas_promedio,
    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (i.resolution_date - i.report_date))/3600
    ) as mediana_horas
FROM incidents i
JOIN developments d ON i.development_id = d.id
WHERE i.resolution_date IS NOT NULL
GROUP BY d.provider;
```

El núcleo de la aplicación se basa en tres tablas principales que se relacionan entre sí:

### Tabla `developments`
Esta es la tabla central que almacena cada uno de los desarrollos o requerimientos.

| Columna                   | Tipo           | Descripción                                           |
| ------------------------- | -------------- | ----------------------------------------------------- |
| `id`                      | `String` (PK)  | Identificador único (ej. No. de Solicitud).           |
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
| `portal_link`             | `String`       | Enlace al ticket en el Portal de Servicios.           |

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

## 📊 Modelo Entidad-Relación (MER) Completo

### 🏗️ Diagrama del Sistema de Gestión de Proyectos TI

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           SISTEMA DE GESTIÓN DE PROYECTOS TI                        │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   AUTH_USERS     │    │   DEVELOPMENTS   │    │  ACTIVITY_LOGS   │
├──────────────────┤    ├──────────────────┤    ├──────────────────┤
│ id (PK)          │    │ id (PK)          │    │ id (PK)          │
│ email (UNIQUE)   │    │ name             │    │ development_id(FK)│
│ password_hash    │    │ description      │    │ date             │
│ name             │    │ module           │    │ description      │
│ role             │    │ type             │    │ category         │
│ is_active        │    │ start_date       │    │ user_id (FK)     │
│ email_verified   │    │ estimated_end_date│   │ created_at       │
│ avatar_url       │    │ target_closure_date│   └──────────────────┘
│ timezone         │    │ estimated_days   │              │
│ created_at       │    │ main_responsible │              │
│ updated_at       │    │ provider         │              │
│ last_login       │    │ requesting_area  │              │
└──────────────────┘    │ general_status   │              │
         │               │ current_stage    │              │
         │               │ observations     │              │
         │               │ estimated_cost   │              │
         │               │ proposal_number  │              │
         │               │ environment      │              │
         │               │ portal_link      │              │
         │               │ scheduled_delivery_date │       │
         │               │ actual_delivery_date    │       │
         │               │ returns_count    │              │
         │               │ test_defects_count│             │
         │               │ created_at       │              │
         │               │ updated_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │    INCIDENTS     │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ report_date      │              │
         │               │ resolution_date  │              │
         │               │ description      │              │
         │               │ severity         │              │
         │               │ impact           │              │
         │               │ status           │              │
         │               │ assigned_to (FK) │              │
         │               │ created_at       │              │
         │               │ updated_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │   MILESTONES     │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ title            │              │
         │               │ description      │              │
         │               │ due_date         │              │
         │               │ status           │              │
         │               │ completion_date  │              │
         │               │ created_by (FK)  │              │
         │               │ created_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │ QUALITY_CONTROLS │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ control_code     │              │
         │               │ control_name     │              │
         │               │ stage_prefix     │              │
         │               │ status           │              │
         │               │ completed_by (FK)│              │
         │               │ completed_at     │              │
         │               │ observations     │              │
         │               │ created_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │   TEST_TASKS     │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ requirement_id   │              │
         │               │ title            │              │
         │               │ description      │              │
         │               │ status           │              │
         │               │ estimated_hours  │              │
         │               │ actual_hours     │              │
         │               │ assigned_to (FK) │              │
         │               │ priority         │              │
         │               │ is_timer_active  │              │
         │               │ created_at       │              │
         │               │ updated_at       │              │
         │               └──────────────────┘              │
         │                        │                        │
         │                        │                        │
         │               ┌──────────────────┐              │
         │               │   KPI_METRICS    │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ development_id(FK)│             │
         │               │ metric_type      │              │
         │               │ provider         │              │
         │               │ period_start     │              │
         │               │ period_end       │              │
         │               │ value            │              │
         │               │ target_value     │              │
         │               │ calculated_at    │              │
         │               │ calculated_by(FK)│              │
         │               └──────────────────┘              │
         │                                                 │
         │               ┌──────────────────┐              │
         │               │  CHAT_SESSIONS   │              │
         │               ├──────────────────┤              │
         │               │ id (PK)          │              │
         │               │ user_id (FK)     │──────────────┘
         │               │ title            │
         │               │ created_at       │
         │               │ updated_at       │
         │               └──────────────────┘
         │                        │
         │                        │
         │               ┌──────────────────┐
         │               │  CHAT_MESSAGES   │
         │               ├──────────────────┤
         │               │ id (PK)          │
         │               │ session_id (FK)  │
         │               │ content          │
         │               │ sender           │
         │               │ message_type     │
         │               │ metadata         │
         │               │ created_at       │
         │               └──────────────────┘
         │
         │               ┌──────────────────┐
         │               │   AUTH_TOKENS    │
         │               ├──────────────────┤
         │               │ id (PK)          │
         │               │ user_id (FK)     │──────────────┘
         │               │ token_hash       │
         │               │ token_type       │
         │               │ name             │
         │               │ expires_at       │
         │               │ last_used_at     │
         │               │ created_at       │
         │               └──────────────────┘
         │
         │               ┌──────────────────┐
         │               │ USER_SESSIONS    │
         │               ├──────────────────┤
         │               │ id (PK)          │
         │               │ user_id (FK)     │──────────────┘
         │               │ session_token    │
         │               │ ip_address       │
         │               │ user_agent       │
         │               │ expires_at       │
         │               │ created_at       │
         │               └──────────────────┘
         │
         │               ┌──────────────────┐
         │               │ SYSTEM_SETTINGS  │
         │               ├──────────────────┤
         │               │ id (PK)          │
         │               │ user_id (FK)     │──────────────┘
         │               │ category         │
         │               │ key              │
         │               │ value            │
         │               │ created_at       │
         │               │ updated_at       │
         │               └──────────────────┘

         ┌──────────────────┐
         │   PERMISSIONS    │
         ├──────────────────┤
         │ id (PK)          │
         │ name (UNIQUE)    │
         │ description      │
         │ resource         │
         │ action           │
         └──────────────────┘
                  │
                  │
         ┌──────────────────┐
         │ ROLE_PERMISSIONS │
         ├──────────────────┤
         │ role (PK)        │
         │ permission_id(PK)│
         └──────────────────┘
```

### 🔗 Relaciones Principales

#### **1. AUTH_USERS (1:N) con múltiples tablas:**
- `AUTH_USERS` → `AUTH_TOKENS` (Un usuario puede tener múltiples tokens)
- `AUTH_USERS` → `USER_SESSIONS` (Un usuario puede tener múltiples sesiones)
- `AUTH_USERS` → `CHAT_SESSIONS` (Un usuario puede tener múltiples chats)
- `AUTH_USERS` → `SYSTEM_SETTINGS` (Un usuario puede tener múltiples configuraciones)

#### **2. DEVELOPMENTS (1:N) como entidad central:**
- `DEVELOPMENTS` → `ACTIVITY_LOGS` (Un desarrollo tiene múltiples actividades)
- `DEVELOPMENTS` → `INCIDENTS` (Un desarrollo puede tener múltiples incidencias)
- `DEVELOPMENTS` → `MILESTONES` (Un desarrollo tiene múltiples hitos)
- `DEVELOPMENTS` → `QUALITY_CONTROLS` (Un desarrollo tiene múltiples controles)
- `DEVELOPMENTS` → `TEST_TASKS` (Un desarrollo tiene múltiples tareas de testing)
- `DEVELOPMENTS` → `KPI_METRICS` (Un desarrollo genera múltiples métricas)

#### **3. Relaciones de Chat:**
- `CHAT_SESSIONS` → `CHAT_MESSAGES` (Una sesión tiene múltiples mensajes)

#### **4. Sistema de Permisos:**
- `PERMISSIONS` ↔ `ROLE_PERMISSIONS` ↔ `AUTH_USERS.role` (Many-to-Many a través de roles)

### 📋 Cardinalidades Detalladas

```
AUTH_USERS (1) ──── (N) AUTH_TOKENS
AUTH_USERS (1) ──── (N) USER_SESSIONS  
AUTH_USERS (1) ──── (N) CHAT_SESSIONS
AUTH_USERS (1) ──── (N) SYSTEM_SETTINGS
AUTH_USERS (1) ──── (N) ACTIVITY_LOGS (created_by)
AUTH_USERS (1) ──── (N) INCIDENTS (assigned_to)
AUTH_USERS (1) ──── (N) MILESTONES (created_by)
AUTH_USERS (1) ──── (N) QUALITY_CONTROLS (completed_by)
AUTH_USERS (1) ──── (N) TEST_TASKS (assigned_to)
AUTH_USERS (1) ──── (N) KPI_METRICS (calculated_by)

DEVELOPMENTS (1) ──── (N) ACTIVITY_LOGS
DEVELOPMENTS (1) ──── (N) INCIDENTS
DEVELOPMENTS (1) ──── (N) MILESTONES
DEVELOPMENTS (1) ──── (N) QUALITY_CONTROLS
DEVELOPMENTS (1) ──── (N) TEST_TASKS
DEVELOPMENTS (1) ──── (N) KPI_METRICS

CHAT_SESSIONS (1) ──── (N) CHAT_MESSAGES

PERMISSIONS (N) ──── (N) ROLES (via ROLE_PERMISSIONS)
```

### 🎯 Índices Recomendados para Performance

```sql
-- Índices para performance
CREATE INDEX idx_developments_status ON developments(general_status);
CREATE INDEX idx_developments_provider ON developments(provider);
CREATE INDEX idx_developments_dates ON developments(start_date, estimated_end_date);
CREATE INDEX idx_activity_logs_dev_date ON activity_logs(development_id, date);
CREATE INDEX idx_incidents_dev_status ON incidents(development_id, status);
CREATE INDEX idx_quality_controls_dev ON quality_controls(development_id);
CREATE INDEX idx_test_tasks_assigned ON test_tasks(assigned_to, status);
CREATE INDEX idx_auth_tokens_user ON auth_tokens(user_id, token_type);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX idx_kpi_metrics_dev_type ON kpi_metrics(development_id, metric_type);
CREATE INDEX idx_milestones_dev_status ON milestones(development_id, status);
```

### 📊 Tablas por Estado de Implementación

#### ✅ **Implementadas Actualmente:**
- `developments` - Tabla principal de desarrollos
- `activity_logs` - Bitácora de actividades
- `incidents` - Incidencias post-producción

#### 🚧 **Pendientes de Implementar:**
- `auth_users` - Sistema de autenticación
- `auth_tokens` - Tokens de API y sesiones
- `user_sessions` - Sesiones de usuario
- `permissions` - Permisos del sistema
- `role_permissions` - Relación roles-permisos
- `milestones` - Hitos del proyecto
- `quality_controls` - Controles de calidad
- `test_tasks` - Tareas de testing
- `kpi_metrics` - Métricas de rendimiento
- `chat_sessions` - Sesiones de chat
- `chat_messages` - Mensajes del chat
- `system_settings` - Configuraciones del sistema

### 🔄 Flujo de Datos Completo

```
1. AUTENTICACIÓN:
   AUTH_USERS → AUTH_TOKENS → USER_SESSIONS

2. GESTIÓN DE PROYECTOS:
   DEVELOPMENTS → ACTIVITY_LOGS + INCIDENTS + MILESTONES

3. CONTROL DE CALIDAD:
   QUALITY_CONTROLS → TEST_TASKS → KPI_METRICS

4. COMUNICACIÓN:
   CHAT_SESSIONS → CHAT_MESSAGES

5. CONFIGURACIÓN:
   SYSTEM_SETTINGS (por usuario)
```

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

## 🏗️ Jerarquía de Componentes UI

### Página "Mis Desarrollos" (`MyDevelopments.tsx`)

```
MyDevelopments (Componente Principal)
├── Header Section
│   ├── Título: "Mis Desarrollos"
│   ├── Indicador de Panel Abierto (condicional)
│   └── Botón "Importar Excel"
│
├── Filtros Section
│   ├── Barra de Búsqueda (por ID o nombre)
│   ├── Filtro por Proveedor (dropdown)
│   └── Filtro por Estado (dropdown)
│
├── Tabla de Desarrollos (Vista Desktop > 1024px)
│   ├── Headers: [No. Solicitud, Nombre, Proveedor, Responsable, Estado, Progreso, Acciones]
│   └── Filas de Datos
│       ├── Botón Ver Detalles (ícono ojo) → Abre Side Panel
│       └── Botón Editar (ícono lápiz) → Abre Modal de Edición
│
├── Vista de Tarjetas (Vista Mobile/Tablet < 1024px)
│   └── Cards Individuales por Desarrollo
│       ├── Información Principal
│       ├── Detalles en Grid (Responsable, Proveedor)
│       └── Acciones (Ver/Editar)
│
├── Side Panel - "Centro de Control" (Condicional: isViewPanelOpen)
│   ├── Header
│   │   ├── Título: "Centro de Control - {ID}"
│   │   └── Botón Cerrar (X)
│   ├── Información Principal
│   │   ├── ID del Desarrollo
│   │   └── Nombre del Desarrollo
│   ├── Grid de Detalles Clave
│   │   ├── Estado
│   │   ├── Progreso
│   │   ├── Proveedor
│   │   └── Responsable
│   ├── Sección Cronograma de Hitos
│   │   └── Placeholder para Gantt Chart
│   ├── Controles de Calidad (Dinámicos por Etapa)
│   │   ├── Título con nombre de etapa actual
│   │   └── Lista de Controles (checkboxes + descripciones)
│   │       ├── C003-GT (Etapas 1-2)
│   │       ├── C021-GT (Etapas 5-7)
│   │       ├── C004-GT (Etapas 8-10)
│   │       └── C027-GT (Etapas 8-10)
│   └── Bitácora de Actividades
│       ├── Formulario de Nueva Actividad
│       │   ├── Textarea para descripción
│       │   └── Botón "Registrar Actividad"
│       └── Lista de Actividades (orden cronológico inverso)
│
├── Modal de Edición (Condicional: isEditModalOpen)
│   ├── Header con título y botón cerrar
│   ├── Formulario en Grid
│   │   ├── No. Solicitud (deshabilitado)
│   │   ├── Nombre del Desarrollo
│   │   ├── Estado General (dropdown)
│   │   └── Etapa del Progreso (dropdown con optgroups)
│   │       ├── "EN EJECUCIÓN" (Definición, Análisis, Desarrollo, etc.)
│   │       ├── "EN ESPERA" (Propuesta, Aprobación, etc.)
│   │       └── "FINALES/OTROS" (Desplegado, Cancelado)
│   └── Botones de Acción (Cancelar, Guardar)
│
└── Modal de Importación (Condicional: isImportModalOpen)
    ├── Header con título y botón cerrar
    └── Componente ExcelImporter
        ├── Zona de arrastrar archivo
        ├── Vista previa de datos
        ├── Mapeo de columnas
        └── Botones de confirmación
```

### Estados y Variables de Control

```
Estados Principales:
├── developments: Development[] - Lista principal de desarrollos
├── selectedDevelopment: Development | null - Desarrollo seleccionado
├── isViewPanelOpen: boolean - Control del Side Panel
├── isEditModalOpen: boolean - Control del Modal de Edición
├── isImportModalOpen: boolean - Control del Modal de Importación
├── editingDevelopment: Development | null - Copia para edición
└── newActivity: string - Texto de nueva actividad

Estados de Filtros:
├── searchTerm: string - Término de búsqueda
├── providerFilter: string - Filtro por proveedor
└── statusFilter: string - Filtro por estado

Datos Calculados (useMemo):
└── filteredDevelopments - Lista filtrada según criterios
```

### Funciones de Manejo de Eventos

```
Navegación y Visualización:
├── handleViewDetails(dev) → Abre Side Panel
├── handleEdit(dev) → Abre Modal de Edición
├── handleCloseModal() → Cierra Modal de Edición
└── setViewPanelOpen(false) → Cierra Side Panel

Gestión de Datos:
├── loadDevelopments() → Carga desde API/localStorage
├── handleImport(data) → Procesa importación de Excel
├── handleAddActivity() → Agrega actividad a bitácora
└── handleFormChange(e) → Actualiza formulario de edición

Filtros:
├── setSearchTerm(value) → Actualiza búsqueda
├── setProviderFilter(value) → Actualiza filtro proveedor
└── setStatusFilter(value) → Actualiza filtro estado
```

### Configuraciones y Constantes

```
Mapeo de Datos:
└── columnMapping - Mapeo Excel → Modelo de datos

Etapas del Proceso:
├── executionStages[] - Etapas en ejecución
├── waitingStages[] - Etapas de espera
├── finalStages[] - Etapas finales
└── processStages[] - Controles de calidad por etapa

Estilos y Utilidades:
├── getStatusColor(status) → Clases CSS por estado
├── uniqueProviders - Lista de proveedores únicos
└── uniqueStatuses - Lista de estados únicos
```

---

## 📝 Notas de Desarrollo

- **Entorno Dockerizado**: PostgreSQL, FastAPI y React con hot-reloading automático
- **Base de Datos**: Se crea automáticamente al ejecutar las migraciones Alembic
- **API Documentada**: FastAPI genera documentación automática en `/docs`
- **Datos Híbridos**: API PostgreSQL como fuente principal, localStorage como fallback
- **Consultas SQL**: Herramientas integradas para desarrollo y debugging de BD
- **Responsive Design**: Optimizado para desktop, tablet y móvil
- **Modo Oscuro**: Tema adaptativo en toda la aplicación
- **Controles de Calidad**: Integración completa con procedimiento FD-PR-072
- **Importación Excel**: Procesamiento full-stack con validación y deduplicación
- **Centro de Control**: Panel dinámico específico por desarrollo
- **Servicios de IA**: Preparado para integración (OpenAI/Google Gemini)
- **Documentación Técnica**: Jerarquías UI y esquemas de BD completamente documentados
- **📋 Documentación Arquitectónica**: Ver `ARQUITECTURA_BASE_DATOS.md`, `ARQUITECTURA_BACKEND.md` y `ARQUITECTURA_FRONTEND.md` para especificaciones completas

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

### ✅ Backend API Completa (FastAPI + PostgreSQL)
- **Modelos de Datos Robustos**: SQLAlchemy con relaciones completas entre tablas
- **Endpoints RESTful**: CRUD completo para desarrollos, actividades e incidencias
- **Importación Masiva**: Endpoint `/developments/bulk` para importar múltiples desarrollos
- **Validación de Datos**: Esquemas Pydantic para validación automática
- **Manejo de Errores**: Respuestas HTTP apropiadas y manejo de excepciones
- **Consultas Optimizadas**: Índices y queries optimizadas para KPIs

### ✅ Integración Frontend-Backend Completa
- **Carga Dinámica**: Los datos se cargan desde la API PostgreSQL
- **Fallback a localStorage**: Si la API no está disponible, usa datos locales
- **Sincronización**: Actualización automática después de operaciones CRUD
- **Manejo de Estados**: Loading states y error handling apropiados

### ✅ Importación desde Excel (Full-Stack)
- **Frontend**: Componente que permite arrastrar y soltar archivos Excel (.xls, .xlsx, .csv)
- **Backend**: Procesamiento server-side con validación y deduplicación
- **Vista Previa**: Muestra los datos que se van a importar antes de confirmar
- **Mapeo de Columnas**: Configurado para la estructura real del archivo de exportación de Remedy:
  - `'No. de la solicitud'` → ID de Remedy
  - `'Cliente Interno'` → Nombre del desarrollo
  - `'Asignado a'` → Responsable principal
  - `'Solicitud Interna requerida'` → Área solicitante
  - `'Estado'` → Estado general
  - `'Fecha de envío'` → Fecha de inicio
  - `'Fecha de finalización planificada'` → Fecha estimada de fin

### ✅ Centro de Control Avanzado
- **Panel Lateral Dinámico**: "Centro de Control" específico por desarrollo
- **Bitácora de Actividades**: Registro cronológico con persistencia en base de datos
- **Controles de Calidad Contextuales**: Muestran automáticamente los controles según la etapa actual
- **Cronograma de Hitos**: Preparado para integración con Gantt charts
- **Responsive Design**: Adaptativo a diferentes tamaños de pantalla

### ✅ Diseño Responsivo Optimizado
- **Vista de Tabla para Desktop**: Tabla completa en pantallas grandes (>1024px)
- **Vista de Tarjetas para Portátiles**: Cards compactas sin scroll horizontal para pantallas medianas (<1024px)
- **Panel Lateral Adaptativo**: 
  - Portátiles: Ancho reducido (320px)
  - Tablets: Pantalla completa
  - Desktop: Ancho original (384px)
- **Filtros Responsivos**: Layout adaptativo según el tamaño de pantalla
- **Sin Barras de Desplazamiento**: Eliminadas en pantallas de portátil (13"-15")

### ✅ Documentación Técnica Completa
- **Jerarquía de Componentes UI**: Estructura visual detallada de todos los componentes
- **Esquema de Base de Datos**: Diagramas visuales, índices, constraints y consultas SQL
- **Estados y Variables**: Documentación completa de la gestión de estado
- **Flujo de Datos**: Operaciones CRUD y flujos de información documentados
- **Consultas KPI**: Queries SQL listas para usar en análisis de rendimiento

### ✅ Herramientas de Desarrollo
- **Configuración SQLTools**: Conexión automática a PostgreSQL desde VS Code
- **Consultas Predefinidas**: Archivo `consultas.sql` con queries optimizadas
- **Scripts de Desarrollo**: Comandos Docker y utilidades de desarrollo
- **Extensiones Recomendadas**: Lista de extensiones VS Code para el proyecto

## 🚀 Estado Actual del Proyecto

### ✅ Backend Completamente Implementado
- **API RESTful**: FastAPI con todos los endpoints necesarios
- **Base de Datos**: PostgreSQL con migraciones Alembic
- **Modelos Robustos**: SQLAlchemy con relaciones y validaciones
- **Importación Server-Side**: Procesamiento de Excel en backend
- **Consultas Optimizadas**: Índices y queries para KPIs

### ✅ Frontend-Backend Integrado
- **Carga de Datos**: API calls reemplazaron localStorage como fuente principal
- **Sincronización**: Actualizaciones en tiempo real
- **Fallback Inteligente**: localStorage como backup si API no disponible
- **Manejo de Errores**: UX apropiado para estados de error y carga

### 🔄 Próximas Mejoras Planificadas

#### 🎯 Funcionalidades de Negocio:
- **Autenticación y Autorización**: Sistema de usuarios y roles
- **Notificaciones**: Alertas por email usando Microsoft Graph API
- **Web Scraping**: Automatización de importación desde Remedy
- **Gantt Charts**: Cronogramas interactivos en el Centro de Control
- **Reportes Avanzados**: Dashboards con métricas en tiempo real

#### 🛠️ Mejoras Técnicas:
- **Testing**: Suite de pruebas unitarias y de integración
- **CI/CD**: Pipeline de despliegue automatizado
- **Monitoring**: Logs estructurados y métricas de aplicación
- **Cache**: Redis para optimización de consultas frecuentes
- **API Versioning**: Versionado de endpoints para compatibilidad

#### 📊 Análisis y BI:
- **Machine Learning**: Predicción de fechas de entrega
- **Análisis Predictivo**: Identificación de riesgos en proyectos
- **Dashboards Ejecutivos**: Métricas consolidadas para directivos
- **Integración BI**: Conectores para Power BI o Tableau

### 🧹 Código Legacy a Limpiar:
- **Datos de Muestra**: ~50 líneas de `sampleDevelopments` (mantenidas para desarrollo)
- **Comentarios TODO**: Marcadores de funcionalidades pendientes
- **Código Comentado**: Limpieza de código experimental

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
