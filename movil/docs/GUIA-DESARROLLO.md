# Guía de Desarrollo - GeoFace

## Requisitos Previos

- **Node.js** ≥ 18
- **Python** ≥ 3.9 (para servidor DeepFace)
- **Expo CLI** (`npm install -g expo-cli`) o `npx expo`
- **Dispositivo/Emulador** Android o iOS (la web no tiene cámara real)

## Inicio Rápido

### 1. Servidor DeepFace (OBLIGATORIO para reconocimiento facial)

```bash
cd face-server
pip install -r requirements.txt   # ~500MB de descarga en primera ejecución
python server.py                  # Descarga modelo Facenet512 (~500MB)
```

El servidor inicia en `http://0.0.0.0:5005`. La primera ejecución descarga los pesos del modelo (30-60 segundos).

### 2. App Móvil

```bash
npm install
npx expo start
```

Escanea el QR con Expo Go en tu dispositivo, o presiona `a` para Android emulator / `i` para iOS simulator.

## Comandos Útiles

| Comando | Descripción |
|---|---|
| `npm start` | Inicia servidor Expo |
| `npm run android` | Inicia en Android |
| `npm run ios` | Inicia en iOS |
| `npm run web` | Inicia en web (sin cámara) |
| `npx tsc --noEmit` | Verifica tipos TypeScript |
| `cd face-server && python server.py` | Inicia servidor facial |

## Convenciones de Código

### TypeScript
- Tipos estrictos: evitar `any`
- Usar interfaces de `src/types/index.ts` para datos del dominio
- Props de componentes con interfaz dedicada (ej. `ProfileCardProps`)

### Estilos
- Usar `StyleSheet.create` en archivos separados por pantalla (`src/styles/`)
- Colores siempre desde `COLORS` en `src/constants/`
- Tema oscuro unificado

### Componentes
- Functional components con hooks
- Props tipadas con interfaz
- Nombrar archivos en PascalCase para componentes (ej. `ProfileCard.tsx`)
- Colocar en `src/components/`

### Navegación
- Las rutas en `app/(tabs)/` son solo re-exports
- La lógica de negocio va en `src/screens/`
- Los estilos van en `src/styles/`

### Manejo de Errores
- API calls (`faceApi.ts`) envueltas en try/catch
- Mostrar errores con `Alert.alert()` (UI en español)
- Errores de conexión: mensaje claro "Servidor No Disponible" con instrucciones
- Usar `FaceApiError` para errores del servidor

## Estructura para Nuevas Funcionalidades

1. Agregar tipos en `src/types/index.ts`
2. Agregar servicio en `src/services/`
3. Agregar utilidad en `src/utils/` si aplica
4. Crear componente en `src/components/` (si es reutilizable)
5. Crear/actualizar screen en `src/screens/`
6. Actualizar layout/ruta en `app/` si es necesario

## Consideraciones Importantes

### Embeddings Faciales
- **Solo vectores 512D** son válidos (Facenet512)
- Perfiles con 128D (legacy) se filtran automáticamente en VerifyScreen
- Si el servidor está offline al crear un perfil, `faceDescriptor` queda como `null`
- Un perfil sin embedding no puede ser verificado

### Geolocalización
- El GPS se inicia automáticamente al abrir la app
- El tracking continúa mientras la app está en foreground
- La zona se calcula contra TODAS las geocercas configuradas
- Sin zonas configuradas → `isInZone` siempre es `false`

### Estado Global
- No usar estado global para UI temporal (modales, formularios)
- Solo usar AppContext para datos persistentes (profiles, zones, checkIns, threshold)
- El estado de ubicación se actualiza automáticamente via `useLocation` hook

## Pruebas y Validación

1. `npx tsc --noEmit` → verificar tipos
2. Probar con servidor encendido → flujo completo
3. Probar con servidor apagado → mensaje de error
4. Probar fuera de zona → bloqueo correcto
5. Probar con/sin perfiles registrados
6. Probar umbral muy alto (99%) → falsos negativos esperados

## Troubleshooting

| Problema | Solución |
|---|---|
| "No se pudo conectar" | Verificar que `python server.py` esté corriendo |
| "Dimensión de embedding incorrecta" | Re-registrar perfil con servidor encendido |
| "No se detectó un rostro" | Mejorar iluminación, rostro de frente, sin obstrucciones |
| Expo Go no conecta al servidor | Ambos dispositivos en misma red WiFi |
| Error 500 en servidor | Revisar logs del servidor Python |
| TypeScript errors | `npx tsc --noEmit` para diagnóstico |
| Permisos de cámara/locación | Ir a Ajustes del dispositivo → Apps → GeoFace → Permisos |
