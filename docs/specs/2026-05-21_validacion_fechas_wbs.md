# Especificación Técnica: Validación de Fechas en Actividades WBS (Tareas)

## Estado
- **Fase**: SPECIFY
- **Autor**: Antigravity (AI Coding Assistant)
- **Fecha**: 2026-05-21

## 1. Objetivos y Reglas de Negocio
El objetivo es asegurar que las fechas estimadas y reales de las actividades (tareas WBS) estén alineadas con el ciclo de vida del proyecto (Desarrollo) al que pertenecen. 

### Reglas de Validación de Fechas
1. **Consistencia Interna de la Tarea**:
   - `fecha_fin_estimada` >= `fecha_inicio_estimada` (si ambas están definidas).
   - `fecha_fin_real` >= `fecha_inicio_real` (si ambas están definidas).
2. **Consistencia con el Proyecto (Desarrollo)**:
   - **Inicio Estimado / Real**: Si el proyecto tiene `fecha_inicio` configurada:
     - `fecha_inicio_estimada` de la tarea debe ser >= `fecha_inicio` del proyecto.
     - `fecha_inicio_real` de la tarea debe ser >= `fecha_inicio` del proyecto.
   - **Fin Estimado**: Si el proyecto tiene `fecha_estimada_fin` configurada:
     - `fecha_fin_estimada` de la tarea debe ser <= `fecha_estimada_fin` del proyecto.
   - **Fin Real**: Si el proyecto tiene fecha final (priorizando `fecha_real_fin`, y si no existe, usando `fecha_estimada_fin`):
     - `fecha_fin_real` de la tarea debe ser <= fecha final del proyecto.

### Comportamiento con Fechas Nulas
- Si alguna fecha del proyecto (Desarrollo) no está definida en la base de datos (nula), se omitirá la validación correspondiente a esa fecha límite. Esto permite flexibilidad si el proyecto aún no tiene fechas definidas.

---

## 2. API / Backend (FastAPI & SQLModel)
Las validaciones se realizarán a nivel de API en el router `backend_v2/app/api/desarrollos/actividades_router.py` tanto para la creación (`POST /`) como para la actualización (`PATCH /{actividad_id}`).

### Respuestas de Error (HTTP 400 Bad Request)
Si las validaciones fallan, se lanzará una excepción HTTP 400 con un detalle descriptivo en español, por ejemplo:
- `"La fecha de fin estimada no puede ser anterior a la fecha de inicio estimada."`
- `"La fecha de inicio estimada (YYYY-MM-DD) no puede ser anterior a la fecha de inicio del proyecto (YYYY-MM-DD)."`
- `"La fecha de fin estimada (YYYY-MM-DD) no puede ser posterior a la fecha estimada de fin del proyecto (YYYY-MM-DD)."`

---

## 3. Frontend (React & TypeScript)
El componente `WbsNodeModal.tsx` debe reflejar visualmente estas restricciones:
1. **Límites de los Inputs (`min` / `max`)**:
   - Configurar la prop `min` en el input de `fechaInicioEstimada` y `fechaInicioReal` con la fecha de inicio del proyecto.
   - Configurar la prop `max` en el input de `fechaFinEstimada` con la fecha estimada de fin del proyecto.
   - Configurar la prop `max` en el input de `fechaFinReal` con la fecha real de fin (o en su defecto estimada de fin) del proyecto.
   - Dinámicamente, configurar la prop `min` de la fecha de fin para que sea mayor o igual a la fecha de inicio seleccionada por el usuario.
2. **Validación previa al envío (Feedback en UI)**:
   - Mostrar mensajes de error en rojo cerca de los inputs si el usuario ingresa manualmente fechas inválidas antes de enviar el formulario.
   - Deshabilitar el botón de guardado si hay errores de validación de fechas.

---

## 4. Plan de Pruebas (TDD)
1. **Pruebas Unitarias del Backend (`pytest`)**:
   - Crear un test `test_validacion_fechas_actividades` en `testing/backend/test_actividades_fechas.py` (o similar).
   - Simular la creación de una actividad con fechas fuera de los límites del desarrollo y verificar que retorna un código de estado HTTP 400 y el mensaje de error adecuado.
   - Simular la actualización de una actividad a fechas inválidas y comprobar la restricción HTTP 400.
