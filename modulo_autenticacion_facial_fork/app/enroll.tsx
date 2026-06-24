import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/constants';

const { width } = Dimensions.get('window');
const OVAL_WIDTH = width * 0.62;
const OVAL_HEIGHT = OVAL_WIDTH * 1.35;

export default function EnrollScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraFlash, setCameraFlash] = useState<'off' | 'on'>('off');
  
  const { addProfile } = useApp();
  const { currentUser, logout } = useAuth();

  const handleCapture = async () => {
    if (!cameraRef.current || !currentUser) return;

    try {
      setIsCapturing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
      });

      // Call addProfile with the new signature: addProfile(id, name, photoUri)
      await addProfile(currentUser.id, currentUser.displayName, photo.uri);

      setIsCapturing(false);
      router.replace('/(tabs)');
      
    } catch (error) {
      setIsCapturing(false);
      console.error(error);
      alert('Error al capturar la foto. Inténtalo de nuevo.');
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
            Necesitamos acceso a tu cámara para registrar tu rostro en el sistema.
          </Text>
          <TouchableOpacity 
            style={styles.permissionBtn} 
            onPress={async () => {
              const result = await requestPermission();
              if (!result.granted) {
                alert('Permiso denegado. Si estás en web, asegúrate de usar http://localhost o revisar el candado del navegador.');
              }
            }}
          >
            <Text style={styles.permissionBtnText}>Permitir Acceso</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerGlass}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 8 }}>
          <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: 'bold' }}>Tu Foto de Perfil</Text>
          <TouchableOpacity 
            onPress={async () => {
              await logout();
              router.replace('/login');
            }}
            style={{ padding: 4 }}
          >
            <Ionicons name="log-out-outline" size={28} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          Toma una foto de tu rostro. Esta será tu foto de referencia oficial para registrar tu asistencia todos los días.
        </Text>
      </View>

      <CameraView
        style={styles.cameraView}
        facing="front"
        flash={cameraFlash}
        ref={cameraRef}
      >
        <View style={styles.cameraOverlayTop} />
        <View style={styles.cameraOverlayBottom} />

        <View style={styles.ovalContainer}>
          <View style={[
            styles.ovalGuide,
            isCapturing && styles.ovalGuideCapturing,
          ]} />
          <View style={[styles.cornerMarker, styles.cornerTL]} />
          <View style={[styles.cornerMarker, styles.cornerTR]} />
          <View style={[styles.cornerMarker, styles.cornerBL]} />
          <View style={[styles.cornerMarker, styles.cornerBR]} />
        </View>
      </CameraView>

      <View style={styles.bottomControls}>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.sideButton} onPress={toggleFlash}>
            <Ionicons
              name={cameraFlash === 'on' ? 'flash' : 'flash-outline'}
              size={24}
              color={cameraFlash === 'on' ? COLORS.warning : COLORS.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleCapture}
            disabled={isCapturing}
            activeOpacity={0.7}
          >
            <View style={styles.captureOuter}>
              <View style={[styles.captureInner, isCapturing && styles.captureInnerActive]}>
                {isCapturing ? (
                  <Ionicons name="hourglass-outline" size={32} color={COLORS.text} />
                ) : (
                  <View style={styles.captureCircle} />
                )}
              </View>
            </View>
          </TouchableOpacity>
          <View style={{ width: 50 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGlass: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(26, 26, 46, 0.85)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionIconBg: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
  },
  permissionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  cameraView: {
    flex: 1,
    backgroundColor: '#0D0D1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(10, 10, 26, 0.85)',
  },
  cameraOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(10, 10, 26, 0.9)',
  },
  ovalContainer: {
    width: OVAL_WIDTH + 20,
    height: OVAL_HEIGHT + 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ovalGuide: {
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    borderRadius: OVAL_WIDTH / 2,
    borderWidth: 2.5,
    borderColor: 'rgba(108, 92, 231, 0.5)',
    backgroundColor: 'rgba(108, 92, 231, 0.03)',
  },
  ovalGuideCapturing: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(0, 206, 201, 0.05)',
  },
  cornerMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 60,
    paddingTop: 20,
    backgroundColor: 'transparent',
    zIndex: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  sideButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  captureInner: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInnerActive: {
    backgroundColor: COLORS.accent,
  },
  captureCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});
