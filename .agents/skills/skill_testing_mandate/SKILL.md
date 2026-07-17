---
name: Backend Testing Mandate
description: Strict requirement for automated tests (pytest) to accompany any new backend feature or bugfix.
---
# Backend Testing Mandate (Guardián de la Confiabilidad)

Eres el responsable de asegurar que el backend del sistema sea robusto y libre de regresiones.

## Directivas Principales:

1. **Flujo Obligatorio TDD (Test-Driven Development)**:
   - ANTES de modificar o crear lógica en `backend_v2/`, el agente DEBE escribir el archivo de prueba correspondiente en `testing/backend/`.
   - El agente DEBE ejecutar la prueba (la cual fallará porque la lógica no existe aún) y mostrar la salida del error al usuario.
   - SOLO después de que el usuario vea la prueba fallar, el agente tiene permitido escribir el código fuente para hacer que la prueba pase a verde.
   - Al crear un nuevo servicio o controlador, DEBES crear al menos tres casos de prueba:
     - **Caso Feliz**: Flujo estándar exitoso.
     - **Caso de Borde**: Datos mínimos o máximos permitidos.
     - **Caso de Error**: Manejo de excepciones y códigos de estado HTTP adecuados.

2. **Validación de Infraestructura (NUEVO)**:
   - Todo cambio que afecte el almacenamiento físico (adjuntos) o conexiones con servicios externos (ERP) DEBE ser validado mediante la suite `test_infrastructure.py`.
   - Se debe verificar explícitamente la capacidad de escritura en disco y la respuesta de los puentes externos.

3. **Master Health Check (Regresiones)**:
   - Para cambios transversales, se DEBE ejecutar el Master Health Check (`test_regresiones.py`) que valida:
     - Ciclo de vida completo del ticket.
     - Persistencia de evidencias (adjuntos y comentarios).
     - Descubrimiento dinámico de seguridad (RBAC).
     - Resiliencia del esquema (Blindaje).

4. **Blindaje de Integridad Estructural (CRÍTICO)**:
   - Para tablas de alta criticidad (`comentarios_ticket`, `adjuntos_ticket`, `tickets`, `usuarios`), se DEBE implementar lógica de auto-reparación en `database.py`.
   - El sistema debe detectar y recrear columnas faltantes o ajustar tipos de datos erróneos durante el arranque (`init_db`) usando sentencias `IF NOT EXISTS` para evitar pérdida de datos.

5. **Ejecución y Logs**:
   - Antes de cada entrega, se recomienda ejecutar la suite completa generando un log de auditoría:
     `$env:PYTHONPATH = "backend_v2;" + $env:PYTHONPATH; python -m pytest testing/backend/ -v | Tee-Object -FilePath testing/backend/last_run.log`

6. **Documentación Obligatoria**:
   - Toda nueva suite de pruebas debe ser registrada en `testing/CATALOGO_PRUEBAS.md` con su propósito y estado actual.
