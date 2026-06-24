import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants';
import { styles } from '../styles/verify.styles';
import { verifyFace, FaceApiError, healthCheck } from '../services/faceApi';
import { useAuth } from '../context/AuthContext';
import ResultOverlay from '../components/ResultOverlay';

type VerifyResult = {
  match: boolean;
  confidence: number;
  name: string;
  profilePhoto: string | null;
  selfieUri: string | null;
} | null;

type ErrorBanner = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  color: string;
} | null;

export default function VerifyScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isBackCamera, setIsBackCamera] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [result, setResult] = useState<VerifyResult>(null);
  const [cameraFlash, setCameraFlash] = useState<'off' | 'on'>('off');
  const [errorBanner, setErrorBanner] = useState<ErrorBanner>(null);
  const bannerAnim = useRef(new Animated.Value(0)).current;

  const { currentUser } = useAuth();
  const {
    profiles,
    locationState,
    threshold,
    addCheckIn,
  } = useApp();

  const {
    isInZone,
    nearestZone,
    currentLocation,
    distanceToZone,
  } = locationState;

  const currentUserProfile = useMemo(() => profiles.find(
    (p) => p.id === currentUser?.id
  ), [profiles, currentUser]);

  // Animar el banner de error al mostrarlo/ocultarlo
  useEffect(() => {
    if (errorBanner) {
      Animated.spring(bannerAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    } else {
      bannerAnim.setValue(0);
    }
  }, [errorBanner]);

  const showErrorBanner = (icon: keyof typeof Ionicons.glyphMap, title: string, message: string, color: string) => {
    setErrorBanner({ icon, title, message, color });
  };

  const dismissError = () => {
    Animated.timing(bannerAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setErrorBanner(null);
    });
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    // Limpiar cualquier error previo
    setErrorBanner(null);

    try {
      setIsCapturing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
      });

      const online = await healthCheck();
      if (!online) {
        setIsCapturing(false);
        showErrorBanner(
          'cloud-offline-outline',
          'Servidor No Disponible',
          'El servidor de reconocimiento facial no esta en ejecucion. Inicia el servidor Python.',
          COLORS.warning
        );
        return;
      }

      if (!currentUser || !currentUserProfile) {
        setIsCapturing(false);
        showErrorBanner(
          'people-outline',
          'Usuario No Registrado',
          'No se encontró tu perfil de usuario. Registra tu perfil en la pestaña Perfiles.',
          COLORS.info
        );
        return;
      }

      const serverResult = await verifyFace(
        photo.uri, 
        currentUser.id, 
        nearestZone?.id || '0', 
        currentLocation?.latitude || 0, 
        currentLocation?.longitude || 0
      );

      setIsCapturing(false);

      const confidence = serverResult.confidence || 0;
      // El backend arroja un error 401 si no coincide, por lo tanto si llega a este punto es exitoso
      const isMatch = true;
      const matchedProfile = isMatch ? currentUserProfile : undefined;

      await addCheckIn({
        profileId: currentUserProfile.id,
        profileName: currentUserProfile.name,
        zone: nearestZone || { id: '0', name: 'Desconocida', center: currentLocation || { latitude: 0, longitude: 0 }, radius: 100 },
        verification: {
          isMatch,
          confidence: confidence / 100,
          matchedProfile: isMatch && currentUserProfile ? currentUserProfile : null,
          timestamp: new Date().toISOString(),
        },
        location: currentLocation || { latitude: 0, longitude: 0 },
      });

      setResult({
        match: isMatch,
        confidence,
        name: matchedProfile?.name || 'Desconocido',
        profilePhoto: matchedProfile?.photoUris?.[0] || null,
        selfieUri: photo.uri,
      });

    } catch (error: unknown) {
      setIsCapturing(false);
      const msg = error instanceof FaceApiError ? error.message : '';

      // Detectar error de anti-spoofing
      if (msg.toLowerCase().includes('anti-spoofing') || msg.toLowerCase().includes('persona real')) {
        showErrorBanner(
          'shield-outline',
          'Persona No Detectada',
          'No se detecto una persona real frente a la camara. Asegurate de estar en un lugar bien iluminado.',
          COLORS.danger
        );
      } else if (msg.toLowerCase().includes('rostro')) {
        showErrorBanner(
          'scan-outline',
          'Rostro No Detectado',
          'No se pudo detectar un rostro en la imagen. Posiciona tu cara dentro del ovalo.',
          COLORS.warning
        );
      } else {
        showErrorBanner(
          'alert-circle-outline',
          'Error de Verificacion',
          msg || 'No se pudo completar la verificacion. Intentalo de nuevo.',
          COLORS.danger
        );
      }
      console.error(error);
    }
  };

  const toggleFlash = () => {
    setCameraFlash((prev) => (prev === 'off' ? 'on' : 'off'));
  };

  const hasPermission = Platform.OS === 'web' ? true : permission?.granted;

  if (!permission && Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Cargando permisos de cámara...</Text>
        </View>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconBg}>
            <Ionicons name="camera-outline" size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.permissionTitle}>Acceso a Cámara</Text>
          <Text style={styles.permissionText}>
            Necesitamos acceso a tu cámara para realizar el reconocimiento facial y verificar la identidad.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} accessibilityLabel="Permitir acceso a la cámara" onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Permitir Acceso</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!isInZone) {
    return (
      <View style={styles.container}>
        <View style={styles.bgCircle1} />
        <View style={[styles.bgCircle2, { bottom: 40, right: -40 }]} />
        
        <View style={styles.permissionContainer}>
          <View style={[styles.permissionIconBg, { borderColor: 'rgba(255, 118, 117, 0.25)', backgroundColor: 'rgba(255, 118, 117, 0.08)' }]}>
            <Ionicons name="location-outline" size={64} color={COLORS.danger} />
          </View>
          <Text style={styles.permissionTitle}>Ubicación Requerida</Text>
          <Text style={styles.permissionText}>
            Debes estar físicamente dentro de una zona de verificación para proceder con el check-in.
          </Text>
          {distanceToZone !== null && (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate-outline" size={16} color={COLORS.danger} />
              <Text style={styles.distanceBadgeText}>
                Distancia más cercana: {Math.round(distanceToZone)} metros
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.glassBorder }]}
            accessibilityLabel="Ir al Dashboard"
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={[styles.permissionBtnText, { color: COLORS.textSecondary }]}>Ir al Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (profiles.length === 0 || !currentUserProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.bgCircle1} />
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconBg}>
            <Ionicons name="people-outline" size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.permissionTitle}>
            {profiles.length === 0 ? 'Sin Perfiles Registrados' : 'Usuario Sin Perfil'}
          </Text>
          <Text style={styles.permissionText}>
            {profiles.length === 0
              ? 'Debes agregar al menos una persona en la pestaña de Perfiles.'
              : 'Tu usuario actual no tiene un perfil registrado. Crea uno en la pestaña de Perfiles.'}
          </Text>
          <TouchableOpacity style={styles.permissionBtn} accessibilityLabel="Ir a Perfiles" onPress={() => router.push('/(tabs)/profiles')}>
            <Text style={styles.permissionBtnText}>Ir a Perfiles</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.cameraView}
        facing={isBackCamera ? 'back' : 'front'}
        flash={cameraFlash}
        ref={cameraRef}
      >
        <View style={styles.cameraOverlayTop} />

        <View style={styles.gridContainer}>
          {[...Array(5)].map((_, i) => (
            <View
              key={`h-${i}`}
              style={[styles.gridLineH, { top: `${(i + 1) * 16.6}%` }]}
            />
          ))}
          {[...Array(4)].map((_, i) => (
            <View
              key={`v-${i}`}
              style={[styles.gridLineV, { left: `${(i + 1) * 20}%` }]}
            />
          ))}
        </View>

        <View style={styles.ovalContainer}>
          <View style={[
            styles.ovalGuide,
            isCapturing && styles.ovalGuideCapturing,
            errorBanner && { borderColor: errorBanner.color, backgroundColor: `${errorBanner.color}11` },
          ]} />
          <View style={[styles.cornerMarker, styles.cornerTL]} />
          <View style={[styles.cornerMarker, styles.cornerTR]} />
          <View style={[styles.cornerMarker, styles.cornerBL]} />
          <View style={[styles.cornerMarker, styles.cornerBR]} />
        </View>

        <View style={styles.guideTextContainer}>
          <Text style={styles.guideText}>
            {isCapturing ? 'Analizando rostro...' : 'Posiciona tu rostro dentro del óvalo'}
          </Text>
        </View>

        <View style={styles.cameraOverlayBottom} />
      </CameraView>

      {/* Banner de error inline */}
      {errorBanner && (
        <Animated.View
          style={[
            styles.errorBannerOverlay,
            {
              opacity: bannerAnim,
              transform: [{
                translateY: bannerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, 0],
                }),
              }],
            },
          ]}
        >
          <View style={[styles.errorBannerCard, { borderColor: `${errorBanner.color}44` }]}>
            <View style={[styles.errorBannerIconBg, { backgroundColor: `${errorBanner.color}22` }]}>
              <Ionicons name={errorBanner.icon} size={36} color={errorBanner.color} />
            </View>
            <Text style={[styles.errorBannerTitle, { color: errorBanner.color }]}>
              {errorBanner.title}
            </Text>
            <Text style={styles.errorBannerMessage}>
              {errorBanner.message}
            </Text>
            <TouchableOpacity
              style={[styles.errorBannerRetryBtn, { backgroundColor: errorBanner.color }]}
              accessibilityLabel="Reintentar verificación"
              onPress={dismissError}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
              <Text style={styles.errorBannerRetryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      <View style={styles.bottomControls}>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.sideButton} accessibilityLabel="Alternar flash de la cámara" onPress={toggleFlash}>
            <Ionicons
              name={cameraFlash === 'on' ? 'flash' : 'flash-outline'}
              size={24}
              color={cameraFlash === 'on' ? COLORS.warning : COLORS.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureButton}
            accessibilityLabel="Capturar foto para verificar identidad"
            onPress={handleCapture}
            disabled={isCapturing || !!errorBanner}
            activeOpacity={0.7}
          >
            <View style={styles.captureOuter}>
              <View style={[styles.captureInner, isCapturing && styles.captureInnerActive]}>
                {isCapturing ? (
                  <Ionicons name="scan" size={32} color={COLORS.text} />
                ) : (
                  <View style={styles.captureCircle} />
                )}
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sideButton}
            accessibilityLabel="Alternar cámara frontal y trasera"
            onPress={() => setIsBackCamera(!isBackCamera)}
          >
            <Ionicons name="camera-reverse-outline" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {result && (
        <ResultOverlay
          result={result}
          threshold={threshold}
          zoneName={nearestZone?.name}
          onDismiss={() => setResult(null)}
          onRetry={() => setResult(null)}
        />
      )}
    </View>
  );
}
