---
name: RBAC Auto-Discovery (Gestor de Permisos Automático)
description: Asegura que cada nueva funcionalidad o módulo esté registrado formalmente en el Manifiesto Central del Backend (`rbac_manifest.py`) para que el sistema lo descubra y proteja automáticamente tras reiniciar.
---

# RBAC Auto-Discovery Skill (Backend SSOT)

Esta habilidad asegura que el Control de Acceso Basado en Roles (RBAC) dependa de un **único archivo de verdad (SSOT)** en el código fuente, eliminando el paso administrativo de crear módulos manualmente desde la interfaz gráfica.

## Mandatos Principales

### 1. Registro de Módulos (Vía Código)

**NUNCA** le pidas al administrador que cree módulos desde la pantalla de "Ajustes del Sistema".
Ese proceso ahora está íntegramente automatizado en el backend mediante Auto-Discovery.

- Si creas una nueva pantalla, pestaña o función que requiera protección de acceso, debes registrarla abriendo el archivo:
  👉 `backend_v2/app/core/rbac_manifest.py`

- Añade un nuevo diccionario a la lista `SYSTEM_MODULES_REGISTRY`:

  ```python
  {
      "id": "nuevo_modulo_id",
      "nombre": "Nombre Público Elegante",
      "categoria": "portal", # Opciones: portal, analistas, panel, otros
      "es_critico": False,
      "descripcion": "Breve descripción funcional."
  }
  ```

### 2. Auto-Descubrimiento (Despliegue)

- Tras modificar el manifiesto, el Agente debe reiniciar el contenedor del backend (ej. `docker restart gestor-de-proyectos-ti-backend-1`).
- En el arranque (`main.py`), el servidor detectará el nuevo ID en el manifiesto, lo insertará en la DB de PostgreSQL y automáticamente **le otorgará el permiso al rol `admin`** para asegurar que haya un responsable inicial.

### 3. Implementación en la UI (Frontend)

Al construir el componente visual en React/Vite:

- Usa exactamente el mismo `"id"` que colocaste en el manifiesto de Python.
- Patrón Estándar para verificar permisos de visibilidad:

  ```tsx
  const canSee = permissions.includes('nuevo_modulo_id') || ['admin'].includes(userRole);
  ```

- Si es una página entera, úsalo en las rutas:

  ```tsx
  <ProtectedRoute moduleCode="nuevo_modulo_id">
      <MiNuevaPantalla />
  </ProtectedRoute>
  ```

## Lista de Verificación

- [ ] ¿Modifiqué el archivo `rbac_manifest.py` para agregar la nueva funcionalidad?
- [ ] ¿El ID en TypeScript/React coincide *exactamente* con el ID del manifiesto en Python?
- [ ] ¿Hice un reinicio rápido del backend para que aplique el Auto-Discovery?
