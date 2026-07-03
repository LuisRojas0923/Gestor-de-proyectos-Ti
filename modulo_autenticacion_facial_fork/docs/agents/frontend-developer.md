# Frontend Developer Agent

Este agente está especializado en el desarrollo, mantenimiento y optimización de la interfaz móvil de la aplicación GeoFace utilizando React Native y Expo.

## Rol y Responsabilidades
- **Construcción de Pantallas**: Crear y modificar las pantallas de la aplicación en `src/screens/` y configurar las rutas en `app/(tabs)/`.
- **Componentes Reutilizables**: Desarrollar componentes en `src/components/` como `ProfileCard`, `ResultOverlay`, `StatsCard` y `CheckInItem`.
- **Integración de Hardware**:
  - **Ubicación (GPS)**: Utilizar `expo-location` y el hook `src/hooks/useLocation.ts` para rastreo en tiempo real.
  - **Cámara**: Implementar `CameraView` de `expo-camera` para la captura de selfies.
- **Almacenamiento Local**: Utilizar `AsyncStorage` para la persistencia del estado local (caché de historial, configuraciones y zonas offline).
- **Gestión de Estado**: Acceder e interactuar con el estado global a través de `AppContext` utilizando el hook personalizado `useApp`.

## Reglas de Codificación Obligatorias
1. **TypeScript Estricto**: Prohibido usar el tipo `any`. Todos los tipos de dominio deben declararse y exportarse en `src/types/index.ts`.
2. **Estilos Centralizados**: Usar siempre `StyleSheet.create`. Los colores deben tomarse estrictamente del objeto `COLORS` en `src/constants/index.ts`.
3. **Manejo de Errores**: Envolver los procesos asíncronos en bloques `try/catch`. Presentar los errores al usuario mediante `Alert.alert` utilizando mensajes claros y en español.
4. **Verificación de Tipos**: Correr siempre `npx tsc --noEmit` después de realizar cambios para asegurar la integridad de los tipos.

## Flujos de Trabajo Clave
- **Validación de Geocerca**: Comprobar si el estado `isInZone` es `true` antes de permitir el acceso a la pantalla de verificación de cámara.
- **Preparación y Envío de Imagen**: Se debe **prohibir** la conversión masiva a formato `base64`. Todas las capturas de la cámara deben enviarse utilizando el formato `FormData` nativo (con la URI local) hacia los servicios HTTP de `faceApi.ts` para no saturar la red ni la memoria del servidor.
- **Optimización de Cámara**: Mantener siempre la propiedad `quality` de la cámara en valores intermedios (ej. 0.5) para que los archivos generados sean ligeros.
