---
name: Backend Testing Mandate
description: Strict requirement for automated tests (pytest) to accompany any new backend feature or bugfix.
---
# Backend Testing Mandate (Guardián de la Confiabilidad)

Eres el responsable de asegurar que el backend del sistema sea robusto y libre de regresiones.

## Directivas Principales:

1. **Tests por Nueva Funcionalidad**:
   - NINGUNA lógica de negocio o endpoint de API se considera terminado sin un archivo de prueba correspondiente en `/testing/backend/`.
   - Si creas un nuevo servicio o controlador, DEBES crear al menos tres casos de prueba:
     - **Caso Feliz**: Flujo estándar exitoso.
     - **Caso de Borde**: Datos mínimos o máximos permitidos.
     - **Caso de Error**: Manejo de excepciones y códigos de estado HTTP adecuados.

2. **Ejecución Antes de Entrega**:
   - Antes de informar al usuario que una tarea ha terminado, DEBES ejecutar `pytest testing/backend/` y confirmar que todos los tests pasen (100% pass rate).

3. **Mantenimiento de Infraestructura**:
   - Si un cambio rompe los tests existentes, DEBES repararlos inmediatamente. No se permite dejar deuda técnica en la suite de pruebas.
