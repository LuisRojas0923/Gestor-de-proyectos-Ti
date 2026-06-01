---
trigger: model_decision
---

# Regla de Desarrollo Orientado a Especificación (Spec-Driven Development - SDD)

Esta regla es de cumplimiento obligatorio para todo desarrollo de nuevas características o modificaciones de arquitectura complejas en el proyecto.

## 🛑 Principios Fundamentales del Protocolo SDD:

1. **No Spec, No Code**: Tienes **PROHIBIDO** crear, modificar o eliminar archivos de código fuente (backend o frontend) sin que exista primero un documento de especificación técnica persistente. Esta especificación debe residir en `docs/specs/` o en su defecto en la carpeta de `artifacts/`.
2. **El Plan es un Contrato**: Antes de escribir una sola línea de código, debes detallar un plan de implementación (`implementation_plan.md`) con las firmas exactas de las funciones, cambios en base de datos y checklist atómico de tareas. Debes detenerte (`STOP`) y esperar la aprobación humana explícita antes de ejecutar el plan.
3. **TDD First (Backend & Frontend)**:
   - Para cambios en el backend, la creación de la prueba unitaria o de integración correspondiente en `testing/backend/` debe preceder a la lógica de negocio. Debe demostrarse el fallo de la prueba antes de su solución.
   - Para cambios en el frontend, se deben seguir las convenciones de pruebas configuradas en el proyecto.
4. **Done by Evidence (Revisión)**: Al completar las tareas, debes verificar que el comportamiento cumple exactamente con las firmas y especificaciones iniciales y documentar los resultados en el artefacto de cierre (`walkthrough.md`).
5. **Vías Rápidas (Fast Flow)**: Se permite omitir la fase formal de Plan y Spec solo para tareas triviales aisladas (textos, typos, pequeños ajustes visuales CSS que no alteren componentes compartidos, o tareas de sola documentación), sincronizando retrospectivamente la especificación si aplica.
