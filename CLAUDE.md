# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

## Reglas de comportamiento

1. **Piensa antes de actuar**: Analiza siempre el SDD y los tests existentes antes de proponer cambios.
2. **Edita lo mínimo**: Usa bloques de edición precisos. No reescribas archivos enteros si solo cambia una parte.
3. **No repitas código**: Prohibido imprimir funciones que no han cambiado.
4. **Sin explicaciones obvias**: No resumas ni expliques el código a menos que el usuario lo pida explícitamente. Ve directo al resultado.
5. **Salida concisa**: Si la tarea es exitosa, muestra solo el diff o el resultado del test. Nada más.
6. **Validación previa**: Antes de dar una tarea por terminada, verifica internamente que el cambio es correcto (tests, tipos, lógica).

---

## Descripción del proyecto

**Gestor de Proyectos TI** — Sistema full-stack de gestión de proyectos IT para rastrear desarrollos de software, hitos, KPIs, registros de actividad e integraciones con ERP externo. Módulos: Desarrollos, Panel de Control, Tickets, KPIs, Viáticos, Inventario, Líneas Corporativas, Impuestos, Reserva de Salas, Requisiciones.

---

## Comandos

### Docker (recomendado)

```bash
docker compose up --build          # Inicia todos los servicios con hot-reload
docker compose down                # Detiene todo
docker compose logs -f backend     # Ver logs del backend en tiempo real
docker compose exec backend bash   # Abrir shell en el contenedor backend
```

Servicios: backend (`localhost:8000`), frontend (`localhost:5173`), adminer (`localhost:8085`).

### Backend (local)

```bash
cd backend_v2
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Tests (pytest + pytest-asyncio, configurado en `pytest.ini`):
```bash
pytest                                                      # Todos los tests
pytest testing/backend/test_file.py::TestClass::test_name  # Test individual
```

### Frontend (local)

```bash
cd frontend
npm install
npm run dev      # Servidor de desarrollo Vite en :5173
npm run build    # Build de producción → dist/
npm run lint     # ESLint
npm run test     # Vitest (todos)
npm run test -- src/tests/MyFile.test.tsx  # Archivo de test individual
```

---

## Arquitectura

### Stack

| Capa | Tecnología |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0 (async), Alembic, asyncpg |
| Base de datos | PostgreSQL 15 |
| Auth | JWT (python-jose + bcrypt) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| Estado global | React Context (AppContext, NotificationsContext) |
| Formularios | React Hook Form + Yup |
| Testing | pytest + pytest-asyncio (backend), Vitest + jsdom (frontend) |
| Infraestructura | Docker Compose, builds multi-stage |

### Estructura del backend (`backend_v2/app/`)

```
main.py          ← Inicialización de FastAPI, CORS, registro de routers, hooks de startup
config.py        ← Pydantic BaseSettings cargado desde .env
database.py      ← Motor async de SQLAlchemy; también factory para la DB del ERP
api/             ← Un sub-paquete por módulo (auth, desarrollos, kpis, tickets, …)
models/          ← Modelos ORM de SQLAlchemy
services/        ← Lógica de negocio (invocada por los routers)
core/            ← Auto-descubrimiento del manifiesto RBAC, gestor de migraciones
```

Patrón: `router → service → model`. Todo async. El manifiesto RBAC se auto-descubre al iniciar.

### Estructura del frontend (`frontend/src/`)

```
App.tsx / main.tsx    ← Raíz, configuración de providers
components/Router.tsx ← Rutas de React Router
context/              ← AppContext (estado global), NotificationsContext
services/             ← Clientes Axios (proxy de Vite hacia /api/v2)
components/
  atoms/ molecules/   ← Jerarquía de diseño atómico
  auth/ development/ layout/ notifications/ …
pages/                ← Componentes de página
types/                ← Interfaces TypeScript
hooks/                ← Custom React hooks
```

Vite hace proxy de `/api/v2` → `backend:8000` en desarrollo (configurado en `vite.config.ts`).

### Configuración clave

| Archivo | Propósito |
|---|---|
| `.env` (raíz) | Credenciales DB, JWT secret, SMTP, conexión ERP, URLs de API |
| `backend_v2/app/config.py` | Lee `.env`, construye los strings de conexión a la DB |
| `frontend/vite.config.ts` | Reglas de proxy, configuración jsdom para Vitest |
| `docker-compose.yml` | Entorno de desarrollo (también `.prod.yml`, `.Pruebas3.yml`) |
| `pytest.ini` | Ruta de tests `testing/backend`, asyncio_mode auto |

### Base de datos

Todos los nombres de tablas y columnas están en español. Alembic gestiona las migraciones. Los scripts de seed están en `backend_v2/scripts/`. Adminer disponible en `localhost:8085` para inspección directa.

### Tareas en segundo plano

Un job de recolección de métricas corre cada 15 minutos como tarea de fondo de FastAPI, registrado en el startup de `main.py`.

---

## Documentación

Docs extendida en `/docs/`:
- `ARQUITECTURA_FRONTEND.md` — decisiones de diseño del frontend
- `ESQUEMA_BASE_DATOS.md` — esquema completo de la DB
- `GUIA_DESARROLLO.md` — configuración de dev, auth GitHub, resolución de conflictos, queries comunes
- `GUIA_MANTENIMIENTO.md` — procedimientos de mantenimiento
- `DESPLIEGUE_PRUEBAS3.md` — entorno de despliegue Pruebas3
