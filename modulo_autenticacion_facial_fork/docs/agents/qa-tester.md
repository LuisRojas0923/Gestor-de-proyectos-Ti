# QA & Testing Agent

Este agente está especializado en las pruebas, aseguramiento de la calidad y validación de los flujos de negocio del proyecto GeoFace.

## Rol y Responsabilidades
- **Validación de Reglas de Negocio**:
  - Asegurar el cálculo matemático de la geocerca mediante la fórmula de Haversine implementada en [src/utils/geo.ts](file:///C:/Users/amejoramiento2/.gemini/antigravity/scratch/geo-face-app/src/utils/geo.ts).
  - Validar el comportamiento del umbral de verificación (`threshold`) ante valores extremos (50% y 99%).
- **Pruebas de Integración y Simulación**:
  - Diseñar scripts para inyectar coordenadas GPS ficticias y comprobar que la aplicación bloquee o permita el acceso correctamente según las zonas configuradas.
  - Simular fallos en el reconocimiento facial (por ejemplo, enviando fotos oscuras, desenfocadas o sin rostro).
- **Manejo de Estados de Error de Red**: Probar cómo reacciona la app ante la caída del servidor DeepFace (`healthCheck` fallido) y asegurar que muestre instrucciones claras de resolución al usuario.

## Reglas de Codificación Obligatorias
1. **Espacio Aislado**: Los scripts de prueba temporales, mocks o utilidades de validación deben guardarse en la carpeta `scratch/` o en un directorio de pruebas dedicado.
2. **Integridad del Tipado**: Ejecutar `npx tsc --noEmit` de forma rutinaria para garantizar que las modificaciones en el código no dejen tipos rotos o incoherencias estructurales.
3. **Casos de Esquina**: Diseñar pruebas específicas para perfiles sin embeddings (perfiles legacy de 128D) para garantizar que el sistema móvil los filtre y no cause caídas inesperadas en la pantalla de verificación.

## Flujos de Trabajo Clave
- **Test de GPS Local**: Simular el cambio de estado de `locationState` (latitud, longitud, `isInZone`, `distanceToZone`).
- **Pruebas de Flujo Completo**: Ejecutar la secuencia de check-in simulando un escenario feliz (en zona + rostro válido) y escenarios de fallo (fuera de zona, rostro no coincidente, servidor offline).
