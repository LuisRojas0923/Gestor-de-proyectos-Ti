# Gemini Context: Gestor de Proyectos TI

Este archivo proporciona el contexto fundamental y las directrices para trabajar en el proyecto **Gestor de Proyectos TI**. Es un sistema "Asistente Personal Inteligente" para el seguimiento detallado del ciclo de vida de los desarrollos de software.

## 🎯 Visión y Propósito
Centralizar, gestionar y medir el rendimiento (KPIs) de los requerimientos de software. Actúa como un "Centro de Control" para cada desarrollo, registrando bitácoras y calculando desviaciones automáticamente.

## 🏗️ Arquitectura Tecnológica

### Backend (`/backend_v2`)
- **Framework:** FastAPI (Python 3.10+).
- **Base de Datos:** PostgreSQL (Normalizada, nombres en español).
- **ORM:** SQLAlchemy con soporte asíncrono (`AsyncSession`).
- **Migraciones:** Alembic.
- **Seguridad:** RBAC con auto-descubrimiento de módulos (`rbac_discovery.py`).
- **Integraciones:** Microsoft Graph API (Emails), Selenium (Scraping), IA (Gemini/OpenAI).

### Frontend (`/frontend`)
- **Framework:** React 18 + TypeScript + Vite.
- **Estilos:** Tailwind CSS.
- **Estado/UI:** Headless UI, Heroicons, Framer Motion.
- **Gráficos:** Recharts.
- **Internacionalización:** react-i18next.

## 🚀 Comandos Clave

### Desarrollo con Docker (Recomendado)
- **Levantar todo:** `docker compose up --build`
- **Backend:** `http://localhost:8000` (Docs: `/docs`)
- **Frontend:** `http://localhost:5173`

### Backend Manual
- **Instalación:** `pip install -r requirements.txt`
- **Ejecución:** `uvicorn app.main:app --reload --port 8000`
- **Pruebas:** `pytest` (Configurado en `pytest.ini`)

### Frontend Manual
- **Instalación:** `npm install`
- **Ejecución:** `npm run dev`
- **Linter:** `npm run lint`
- **Pruebas:** `npm test`

## ⚖️ Convenciones y Reglas de Oro

### 1. Protocolo de Errores (OBLIGATORIO)
Antes de corregir cualquier bug, debes entregar un análisis estructurado:
- **Causa Raíz:** Archivo, línea y explicación técnica.
- **Impacto:** Qué funcionalidad se ve afectada.
- **Propuesta:** Estrategia de solución.
*No realices cambios sin aprobación o sin completar este análisis.*

### 2. Backend: SQLAlchemy Asíncrono
- **Prohibido el Lazy Loading:** En endpoints `async def`, debes cargar relaciones explícitamente usando `joinedload` o `selectinload`.
- **Estructura Modular:** Los routers están en `app/api`, modelos en `app/models`, y lógica de negocio en `app/services`.

### 3. Frontend: Estructura y UI
- **Atomic Design:** Evitar dependencias circulares. No importar desde `./index` dentro de la propia carpeta del componente.
- **Responsive:** Mobile-first usando clases de Tailwind.
- **Consistencia:** Usar los componentes del sistema de diseño (ver `docs/UI_COMPONENTS.md`).

### 4. Git y Commits
- **Auth:** Usar Personal Access Token (PAT) para GitHub.
- **Mensajes:** Seguir [Conventional Commits](https://www.conventionalcommits.org/).

## 🛡️ Auditoría y Calidad
El proyecto utiliza hooks de `pre-commit` para asegurar la integridad:
- `guard-keywords`: Evita el uso de términos prohibidos.
- `enforce-architecture`: Valida que los archivos estén en sus carpetas correspondientes.
- `security-check-backend`: Auditoría AST de seguridad.
- `design-system-check`: Asegura el uso correcto de componentes UI.

## 📂 Directorios Importantes
- `/backend_v2/app`: Código fuente del servidor.
- `/frontend/src`: Código fuente de la interfaz.
- `/docs`: Documentación detallada de arquitectura y guías.
- `/sql`: Scripts de inicialización y mantenimiento de DB.
- `/.agents`: Reglas y habilidades específicas para la IA.

---
*Este documento es dinámico y debe actualizarse ante cambios significativos en la arquitectura o flujo de trabajo.*
