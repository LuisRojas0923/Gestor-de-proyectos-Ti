# Protocolo Estricto de Desarrollo (TDD First)

- **Prohibición de Código sin Prueba Previa**: Tienes PROHIBIDO crear o modificar la lógica de negocio, endpoints (routers) o servicios del backend sin antes haber creado un archivo de prueba en `testing/backend/`.
- **Demostración de Fallo**: Una vez escrita la prueba, debes ejecutarla usando `pytest` y mostrar el registro de que la prueba falla (`FAILED`). 
- **Implementación**: Solo después de demostrar que la prueba falla y valida el caso de uso esperado, puedes proceder a implementar el código necesario para que la prueba sea exitosa (`PASSED`).
