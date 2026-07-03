import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LatLng, Zone } from '../../src/types';
import { calculateDistance, formatDistance } from '../../src/utils/geo';

const DEMO_ZONE: Zone = {
  id: 'demo',
  name: 'Centro - Zona de prueba',
  center: { latitude: 40.7128, longitude: -74.006 },
  radius: 100,
  color: '#00B894',
};

const COLORS = {
  primary: '#667eea',
  success: '#00B894',
  danger: '#FF6B6B',
  warning: '#FFE66D',
  background: '#0A0A1A',
  surface: '#1A1A2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0AEC0',
};

export default function LocationTestScreen() {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isInZone, setIsInZone] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permiso de ubicación denegado');
        Alert.alert('Permiso requerido', 'La app necesita acceso a tu ubicación para funcionar');
        return;
      }
      startTracking();
    } catch (err) {
      setError('Error al solicitar permisos');
    }
  };

  const startTracking = async () => {
    try {
      setIsTracking(true);
      setError(null);

      // Obtener ubicación actual
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const loc: LatLng = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      updateLocation(loc);

      // Watchear cambios de ubicación
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5, // 5 metros
          timeInterval: 3000, // 3 segundos
        },
        (newLocation) => {
          const newLoc: LatLng = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          };
          updateLocation(newLoc);
        }
      );

      // Guardar la subscription para cancelarla después
      return () => subscription.remove();
    } catch (err) {
      console.error('Error en tracking:', err);
      setError('Error al iniciar tracking de ubicación');
      setIsTracking(false);
    }
  };

  const updateLocation = (loc: LatLng) => {
    setLocation(loc);
    const dist = calculateDistance(loc, DEMO_ZONE.center);
    setDistance(dist);
    setIsInZone(dist <= DEMO_ZONE.radius);
    setRefreshCount((prev) => prev + 1);
  };

  const stopTracking = () => {
    setIsTracking(false);
    setLocation(null);
    setDistance(null);
  };

  const getMapUrl = () => {
    if (!location) return '';
    return `https://www.google.com/maps/@${location.latitude},${location.longitude},17z`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="location" size={32} color={COLORS.success} />
        <Text style={styles.title}>Test de Geolocalización</Text>
      </View>

      {/* Status Card */}
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Estado de tracking:</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isTracking ? COLORS.success : COLORS.danger },
            ]}
          >
            <Ionicons
              name={isTracking ? 'radio-button-on' : 'radio-button-off'}
              size={16}
              color="#fff"
            />
            <Text style={styles.statusText}>{isTracking ? 'ACTIVO' : 'INACTIVO'}</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="warning" size={20} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Ubicación Actual */}
      {location && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 Tu Ubicación</Text>

            <View style={styles.locationInfo}>
              <View style={styles.coordRow}>
                <Text style={styles.coordLabel}>Latitud:</Text>
                <Text style={styles.coordValue}>{location.latitude.toFixed(6)}</Text>
              </View>
              <View style={styles.coordRow}>
                <Text style={styles.coordLabel}>Longitud:</Text>
                <Text style={styles.coordValue}>{location.longitude.toFixed(6)}</Text>
              </View>
              <View style={styles.coordRow}>
                <Text style={styles.coordLabel}>Precisión:</Text>
                <Text style={styles.coordValue}>Alta (GPS)</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                Alert.alert(
                  'Abrir en Google Maps',
                  '¿Abrir tu ubicación en Google Maps?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Abrir',
                      onPress: () => {
                        // En una app real, aquí abrirías Google Maps
                        Alert.alert('URL', getMapUrl());
                      },
                    },
                  ]
                );
              }}
            >
              <Ionicons name="map" size={18} color="#fff" />
              <Text style={styles.buttonText}>Ver en Maps</Text>
            </TouchableOpacity>
          </View>

          {/* Zona de Prueba */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎯 Zona de Referencia</Text>

            <View style={styles.zoneInfo}>
              <View style={styles.coordRow}>
                <Text style={styles.coordLabel}>Nombre:</Text>
                <Text style={styles.coordValue}>{DEMO_ZONE.name}</Text>
              </View>
              <View style={styles.coordRow}>
                <Text style={styles.coordLabel}>Centro Lat:</Text>
                <Text style={styles.coordValue}>{DEMO_ZONE.center.latitude.toFixed(6)}</Text>
              </View>
              <View style={styles.coordRow}>
                <Text style={styles.coordLabel}>Centro Lon:</Text>
                <Text style={styles.coordValue}>{DEMO_ZONE.center.longitude.toFixed(6)}</Text>
              </View>
              <View style={styles.coordRow}>
                <Text style={styles.coordLabel}>Radio:</Text>
                <Text style={styles.coordValue}>{DEMO_ZONE.radius} metros</Text>
              </View>
            </View>
          </View>

          {/* Distancia y Estado */}
          {distance !== null && (
            <View
              style={[
                styles.card,
                {
                  borderLeftWidth: 4,
                  borderLeftColor: isInZone ? COLORS.success : COLORS.danger,
                },
              ]}
            >
              <View style={styles.distanceContainer}>
                <Ionicons
                  name={isInZone ? 'checkmark-circle' : 'close-circle'}
                  size={48}
                  color={isInZone ? COLORS.success : COLORS.danger}
                />
                <View style={styles.distanceInfo}>
                  <Text style={styles.distanceLabel}>
                    {isInZone ? '✅ Dentro de zona' : '❌ Fuera de zona'}
                  </Text>
                  <Text style={styles.distanceValue}>{formatDistance(distance)}</Text>
                  <Text style={styles.distanceSubtext}>
                    de distancia al centro
                  </Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min((distance / DEMO_ZONE.radius) * 100, 100)}%`,
                      backgroundColor: isInZone ? COLORS.success : COLORS.danger,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Estadísticas */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Información</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Actualizaciones</Text>
                <Text style={styles.statValue}>{refreshCount}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Estado</Text>
                <Text style={[styles.statValue, { color: isInZone ? COLORS.success : COLORS.danger }]}>
                  {isInZone ? 'En zona' : 'Fuera'}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Botones de Control */}
      <View style={styles.buttonContainer}>
        {!isTracking ? (
          <TouchableOpacity style={[styles.largeButton, styles.startButton]} onPress={startTracking}>
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.largeButtonText}>Iniciar Tracking</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.largeButton, styles.stopButton]} onPress={stopTracking}>
            <Ionicons name="stop" size={24} color="#fff" />
            <Text style={styles.largeButtonText}>Detener Tracking</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Tip: Abre esta pantalla y camina alrededor de la zona para ver cómo cambia la distancia
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    flex: 1,
  },
  locationInfo: {
    gap: 12,
    marginBottom: 12,
  },
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  coordLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  coordValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  zoneInfo: {
    gap: 12,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  distanceInfo: {
    flex: 1,
  },
  distanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  distanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  distanceSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  largeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  startButton: {
    backgroundColor: COLORS.success,
  },
  stopButton: {
    backgroundColor: COLORS.danger,
  },
  largeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
