# Guía de Desarrollo - GeoFace (Módulo Móvil)

## Requisitos Previos

- **Node.js** ≥ 18
- **Expo CLI** (`npm install -g expo-cli`) o `npx expo`
- **Dispositivo/Emulador** Android o iOS (la versión web no soporta la cámara nativa correctamente)
- Acceso a la red del servidor central (`backend_v2`) corriendo localmente o en entorno de pruebas.

## Inicio Rápido

### 1. Levantar el Backend Central (OBLIGATORIO)

La aplicación móvil depende del servidor principal para procesar el reconocimiento facial. Desde la raíz del proyecto principal:

```bash
# Recomendado: Usar Docker
docker compose up --build

# O manualmente (desde /backend_v2):
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
*(Asegúrate de que la IA descargue sus modelos la primera vez que se ejecute).*

### 2. App Móvil

Dentro de esta carpeta (`modulo_autenticacion_facial_fork`):

```bash
npm install
npx expo start
```

Escanea el QR con Expo Go en tu dispositivo físico (deben estar en la misma red WiFi), o presiona `a` para abrir el emulador de Android / `i` para el simulador de iOS.

## Comandos Útiles

| Comando | Descripción |
|---|---|
| `npm start` | Inicia servidor Expo |
| `npm run android` | Inicia en Android |
| `npm run ios` | Inicia en iOS |
| `npx tsc --noEmit` | Verifica tipos TypeScript |
| `eas build -p android --profile preview` | Generar el APK para pruebas |

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
- Errores de conexión: mensaje claro "Servidor No Disponible" indicando revisar la IP en Ajustes.

## Consideraciones Importantes

### Reconocimiento Facial
- El celular ya no procesa los embeddings matemáticos (vectores). Todo se envía mediante `FormData` (la foto física) a FastAPI.
- Es vital no enviar imágenes de 10 Megabytes; la cámara de Expo debe configurarse en una calidad media/baja (`quality: 0.5`) para evitar saturar la RAM del servidor central.

### Geolocalización
- El GPS se inicia automáticamente al abrir la app.
- El tracking continúa mientras la app está en foreground.
- La zona se calcula contra TODAS las geocercas configuradas.
- Sin zonas configuradas → `isInZone` siempre es `false` (bloquea el check-in).

### Estado Global
- No usar estado global para UI temporal (modales, formularios)
- Solo usar AppContext para datos persistentes (perfiles locales, zonas, configuraciones)
- El estado de ubicación se actualiza automáticamente via `useLocation` hook

## Pruebas y Validación

1. `npx tsc --noEmit` → verificar tipos.
2. Probar con servidor encendido (IP configurada en Ajustes) → flujo completo.
3. Probar con servidor apagado → debe atrapar el error sin crashear.
4. Probar fuera de zona → bloqueo correcto del botón de la cámara.
5. Probar con/sin permisos de cámara y ubicación.

## Troubleshooting

| Problema | Solución |
|---|---|
| "No se pudo conectar al servidor" | Revisa que la IP en la pestaña Ajustes de la App coincida con la IP de tu PC (`ipconfig`). |
| "OOMKilled en Servidor" | El backend se quedó sin memoria RAM procesando DeepFace. Reinicia Docker. |
| "No se detectó un rostro" | La foto salió oscura o borrosa. Repetir foto. |
| Expo Go no conecta | Verifica que el PC y el celular estén conectados exactamente a la misma red WiFi (No usar VPNs). |
| TypeScript errors | `npx tsc --noEmit` para diagnóstico |
| Permisos de cámara/locación | Ir a Ajustes del celular → Apps → Expo Go/GeoFace → Permisos |
