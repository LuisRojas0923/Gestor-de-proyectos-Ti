# Análisis de Conexiones: MyDevelopments.tsx

Este documento detalla las conexiones entre el frontend, la API y la base de datos para la página de Gestión de Actividades (`MyDevelopments.tsx`).

## 1. Frontend (Interfaz de Usuario)
- **Archivo Principal:** `frontend/src/pages/MyDevelopments.tsx`
- **Hook de Datos:** `frontend/src/pages/MyDevelopments/hooks/useDevelopments.ts`

### Flujo de Datos
1. `loadDevelopments()` realiza una petición GET a la API.
2. Los datos se almacenan en el estado y se filtran localmente.

## 2. API (Endpoints)
- **Endpoint:** `/api/v2/desarrollos/`
- **Backend Router:** `backend_v2/app/api/desarrollos/router.py`

## 3. Base de Datos (PostgreSQL)
### Tablas Clave
- `desarrollos`: Información principal del proyecto.
- `fases_desarrollo` / `etapas_desarrollo`: Ciclo de vida.
- `actividades`: Bitácora de seguimiento.
