---
name: RBAC & Permissions Enforcer (Gestor de Permisos)
description: Garantiza que cada nueva funcionalidad esté registrada en el sistema RBAC y en la Matriz de Permisos. Flujo dinámico vía UI.
---

# RBAC & Permissions Enforcer Skill (Dinámico)

Esta habilidad asegura que el Control de Acceso Basado en Roles (RBAC) esté siempre sincronizado con las funcionalidades del sistema a través de la interfaz administrativa.

## Mandatos Principales

### 1. Registro de Módulos (Vía Interfaz)

**NUNCA** registres módulos editando archivos de configuración en el código (ej. `database.py` o estáticos en frontend).

- El registro debe hacerse desde el **Panel Maestro / Interruptor Maestro** en los Ajustes del Sistema.
- Haz clic en **"Registrar Módulo"** y completa el ID (único), Nombre y Categoría.

### 2. Matriz de Permisos (Dinámica)

Una vez registrado el módulo en el Panel Maestro, aparecerá automáticamente en la **Matriz de Control de Accesos**.

- Como desarrollador, debes entrar a la matriz y asignar el acceso a los roles correspondientes (ej. `admin`, `director`, `usuario`).

### 3. Implementación en la UI

Al construir el componente visual (tarjeta, botón, página):

- Usa el hook de permisos para validar el acceso: `permissions.includes('id_del_modulo')`.
- Incluye siempre los roles administrativos en el chequeo si es una función de gestión.
- **Patrón Estándar**:

  ```tsx
  const canSee = permissions.includes('nomina_gestion') || ['admin', 'manager'].includes(userRole);
  ```

### 4. Protección de Rutas

Asegura que el `moduleCode` en `ProtectedRoute` coincida exactamente con el ID registrado en la base de datos.

## Lista de Verificación

- [ ] ¿Se registró el módulo en el Panel Maestro utilizando la interfaz?
- [ ] ¿Se asignaron los permisos iniciales en la Matriz de Accesos?
- [ ] ¿El componente frontend usa exactamente el mismo ID para validar visibilidad?
- [ ] ¿La ruta está protegida si se trata de una página independiente?
