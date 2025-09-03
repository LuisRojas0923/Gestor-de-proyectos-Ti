# Asistente Inteligente de Gestión de Proyectos

Este proyecto es una aplicación web diseñada para actuar como un asistente personal en la gestión de proyectos de software, específicamente enfocado en optimizar el rol de intermediario entre los usuarios finales y los proveedores de tecnología.

La aplicación extrae requerimientos de una plataforma web externa, los centraliza, y utiliza Inteligencia Artificial para analizarlos, procesarlos y generar comunicaciones efectivas.

---

## 🏗️ Arquitectura Tecnológica

El proyecto está construido con una arquitectura moderna separando el frontend del backend:

-   **Backend**: **Python** con el framework **FastAPI** para construir una API RESTful de alto rendimiento.
    -   **Base de Datos**: **SQLite** para simplicidad y portabilidad, gestionada a través del ORM **SQLAlchemy**.
    -   **Migraciones de BD**: **Alembic** para manejar cambios en el esquema de la base de datos de forma controlada.
    -   **Extracción de Datos**: **Selenium** para realizar web scraping de la plataforma de requerimientos.
    -   **Integración con IA**: Conexión a APIs de modelos de lenguaje grandes (ej. OpenAI, Google Gemini).
    -   **Integración con Email**: **Microsoft Graph API SDK** para interactuar con Outlook (Microsoft 365).

-   **Frontend**: **React 18** con **TypeScript** y **Vite** para construir una interfaz de usuario interactiva y dinámica.
    -   **Styling**: **Tailwind CSS** para diseño responsive y moderno.
    -   **Gráficos**: **Recharts** para visualizaciones de datos.
    -   **Internacionalización**: **react-i18next** para soporte multiidioma.

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

## 🚀 Configuración y Puesta en Marcha

### Prerrequisitos

-   Python 3.8+
-   Node.js 16+ y npm
-   Chrome/Chromium para Selenium

### 1. Configuración del Backend

1.  **Navegar al directorio del backend:**
    ```bash
    cd backend
    ```

2.  **Crear y activar un entorno virtual:**
    ```bash
    # En Windows
    python -m venv venv
    venv\Scripts\activate

    # En macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Instalar las dependencias de Python:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configurar las variables de entorno:**
    -   Crea una copia del archivo `env.example` y renómbrala a `.env`.
    -   Rellena las variables necesarias (credenciales de la web de scraping, claves de la API de IA, etc.).

5.  **Aplicar las migraciones de la base de datos:**
    ```bash
    alembic upgrade head
    ```

6.  **Ejecutar el servidor del backend:**
    ```bash
    uvicorn app.main:app --reload
    ```
    El servidor estará disponible en `http://127.0.0.1:8000`. La documentación interactiva de la API estará en `http://127.0.0.1:8000/docs`.

### 2. Configuración del Frontend

1.  **Navegar al directorio del frontend:**
    ```bash
    cd frontend
    ```

2.  **Instalar las dependencias de Node.js:**
    ```bash
    npm install
    ```

3.  **Ejecutar la aplicación de React:**
    ```bash
    npm run dev
    ```
    La aplicación web estará disponible en `http://localhost:5173`.

---

## ✨ Funcionalidades Clave

-   ✅ **Extracción Automatizada**: Módulo de Selenium para iniciar sesión y extraer datos de requerimientos.
-   ✅ **Dashboard Centralizado**: Visualización de todos los requerimientos en una sola interfaz.
-   ✅ **Procesamiento con IA**:
    -   Resumen automático de requerimientos.
    -   Clasificación y priorización sugerida.
    -   Generación de especificaciones técnicas para proveedores.
-   ✅ **Generación de Comunicaciones**:
    -   Creación de borradores de correo para usuarios finales.
    -   Envío de correos a través de la integración con Outlook.
-   ✅ **Cálculo de KPIs**: Medir tiempos de respuesta, volumen de requerimientos, etc.

---

## 📊 Cobertura del Flujo del Analista y Controles

A continuación se detalla cómo la aplicación cubre el flujo de trabajo del Analista de Sistemas descrito en el **procedimiento FD-PR-072**, indicando el nivel de automatización y los controles internos soportados.

| Paso del Flujo | Módulo / Función | Nivel | Control |
| -------------- | ---------------- | ------ | -------- |
| Recepción de requerimiento (Remedy) | Ingesta `scraper.py` + webhook | A | — |
| Validación de formato FD-FT-284 | Servicio `ai_service.py` (validación de campos) | A | C003-GT |
| Notificación y recordatorios al Líder Usuario | `graph_service.py` (emails) | A | C003-GT |
| Clasificación del tipo de requerimiento | `ai_service.py` (clasificador) | A | — |
| Enrutamiento a ORM / Automatización / Desarrollo | Motor de flujo | A | — |
| Gestión de propuestas con proveedor | Módulo de comunicaciones + versionado | S | — |
| Plan de trabajo y cronograma | Dashboard Kanban/Gantt | S | — |
| Instalación en ambiente de pruebas | Check-list interactivo | S | — |
| Seguimiento de pruebas y SLA | Panel de incidencias | A | C021-GT |
| Reporte mensual de avances | Generador de reportes PDF/Excel | A | — |
| Verificación de entregables y áreas impactadas | Wizard de validación | S | C004-GT |
| Repositorio documental y muestreo 10 % | Archivador + verificador | A | C027-GT |

**Leyenda de nivel**: **A** = Automatizado, **S** = Semiautomatizado (requiere confirmación), **M** = Manual.

---

## 🔧 Desarrollo

### Estructura del Backend

- **FastAPI**: API REST moderna y rápida con documentación automática
- **SQLAlchemy**: ORM para gestión de base de datos
- **Alembic**: Migraciones de base de datos
- **Pydantic**: Validación de datos y serialización
- **Selenium**: Web scraping automatizado
- **OpenAI/Gemini**: Integración con servicios de IA
- **Microsoft Graph**: Integración con Outlook/Office 365

### Estructura del Frontend

- **React 18**: Biblioteca de interfaz de usuario
- **TypeScript**: Tipado estático para mejor desarrollo
- **Vite**: Herramienta de construcción rápida
- **Tailwind CSS**: Framework de CSS utilitario
- **Recharts**: Biblioteca de gráficos para React
- **React Router**: Enrutamiento de la aplicación
- **React i18next**: Internacionalización

---

## 📝 Notas de Desarrollo

- El backend está configurado para usar SQLite por defecto, pero puede cambiarse a PostgreSQL o MySQL modificando la variable `DATABASE_URL`.
- Los servicios de IA tienen fallback entre OpenAI y Google Gemini.
- El frontend incluye modo oscuro/claro y sidebar colapsable.
- Todas las páginas están implementadas con datos de ejemplo (mock data).
- La base de datos se crea automáticamente al ejecutar las migraciones.

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
