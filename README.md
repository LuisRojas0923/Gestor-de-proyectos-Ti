# Asistente de Gestión y Seguimiento de Desarrollos

## 🎯 Visión del Producto

Este proyecto evoluciona de un gestor de proyectos a un **asistente personal inteligente**, diseñado para el seguimiento detallado del ciclo de vida de los desarrollos de software. El objetivo es centralizar, gestionar y medir el rendimiento de los requerimientos gestionados tanto por equipos internos como por proveedores externos.

La herramienta está enfocada en proporcionar un **"centro de control"** para cada desarrollo, registrar el día a día de las actividades y calcular automáticamente los indicadores clave de rendimiento (KPIs) para la toma de decisiones.

---

## ✨ Funcionalidades Clave

-   ✅ **Módulo "Mis Desarrollos"**: Un panel central para visualizar y gestionar todos los desarrollos, replicando y mejorando el control que actualmente se lleva en Excel. Incluye toda la información relevante como responsable, proveedor, fechas clave y costos.

-   ✅ **Centro de Control por Desarrollo**: Cada desarrollo tiene su propio espacio de trabajo detallado que incluye:
    -   **Información Principal**: Todos los datos maestros del requerimiento.
    -   **Cronograma de Hitos**: Fases clave del desarrollo (análisis, diseño, pruebas, etc.) en una vista de línea de tiempo interactiva.
    -   **Bitácora de Actividades (Log de Seguimiento)**: Un registro cronológico detallado para anotar el progreso diario, capturando estados específicos por etapa.

-   ✅ **Dashboard de Indicadores (KPIs)**: Un módulo avanzado para medir el rendimiento basado en datos reales:
    1.  **Cumplimiento de fechas Global**: `Entregas a tiempo ÷ entregas programadas × 100%`
    2.  **Cumplimiento de fechas Desarrollo**: Desviación en días por cada hito.
    3.  **Calidad en primera entrega**: Porcentaje de requerimientos aprobados sin devoluciones.
    4.  **Tiempo de respuesta a fallas**: Mediana de horas desde el reporte hasta la solución técnica.
    5.  **Defectos por entrega**: Promedio de incidencias encontradas durante la fase de pruebas.
    6.  **Retrabajo posproducción**: Índice de incidencias reportadas tras el despliegue final.

-   ✅ **Módulo de Reportes**: Generación de informes especializados:
    -   **Informe Ejecutivo**: Vista de alto nivel para gerencia.
    -   **Informe de Calidad**: Detalle de incidencias y cumplimiento por proveedor.
    -   **Informe Detallado de Casos Portal**: Seguimiento minucioso de tickets originados en el Portal.

-   ✅ **Portal de Servicios**: Integración para el seguimiento de tickets técnicos y de soporte vinculados a los desarrollos.

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
    -   Tablas normalizadas con nombres en español (`desarrollos`, `etapas_desarrollo`, `log_actividades_desarrollo`, etc.)
    -   Ciclo de desarrollo estructurado en Fases y Etapas configurables
    -   Vistas SQL y lógica para cálculo automático de KPIs
    -   Índices optimizados para rendimiento de consultas complejas

-   **`ARQUITECTURA_BACKEND.md`**: Arquitectura del servidor, incluyendo:
    -   Modelos SQLAlchemy dinámicos y relacionales
    -   Endpoints de API FastAPI organizados por módulos funcionales
    -   Servicios integrados (Scraper de Portal, IA, Microsoft Graph)
    -   Log de actividades con payloads dinámicos por etapa

-   **`ARQUITECTURA_FRONTEND.md`**: Especificación de la interfaz de usuario, incluyendo:
    -   Sistema de diseño basado en componentes reutilizables
    -   Gestión de estados complejos para el Centro de Control
    -   Integración de gráficos con Recharts y soporte multiidioma

---

## 💾 Esquema de la Base de Datos

El sistema utiliza una base de datos **PostgreSQL** normalizada para gestionar el ciclo de vida de los desarrollos.

-   **Diagrama MER y Relaciones**: Ver [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)
-   **Tablas de Soporte**: Ver [DATABASE_SCHEMA.md#tablas-de-soporte-y-referencia](docs/DATABASE_SCHEMA.md#tablas-de-soporte-y-referencia)

### 📈 Consultas y Reportes

El sistema automatiza el cálculo de KPIs mediante el análisis de fechas e incidencias.
- **Reportes Disponibles**: Estratégicos (Ejecutivo), Tácticos (Calidad/Desempeño) y Operativos (Casos Portal).

---

## 🏗️ Jerarquía de Componentes UI

La interfaz está construida de forma modular con React, siguiendo un sistema de diseño consistente.

-   **Estructura de Componentes**: Ver [UI_COMPONENTS.md](docs/UI_COMPONENTS.md)
-   **Gestión de Estado y Eventos**: Ver [UI_COMPONENTS.md#estados-y-variables-de-control](docs/UI_COMPONENTS.md#estados-y-variables-de-control)

---

## 🆕 Funcionalidades Recientes

Hemos implementado mejoras significativas en el control de calidad, reportes directivos e integración full-stack.

-   **Detalle de Nuevas Funcionalidades**: Ver [RECENT_FEATURES.md](docs/RECENT_FEATURES.md)

---

## 🚀 Estado Actual y Próximos Pasos

El backend y la integración básica están completados. Estamos trabajando en:
-   **Autenticación**: Sistema de usuarios y roles.
-   **Notificaciones**: Alertas vía Microsoft Graph.
-   **Gantt Charts**: Visualización interactiva de cronogramas.

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
