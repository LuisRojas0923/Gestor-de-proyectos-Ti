import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, memo } from 'react';
import {
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants';
import { formatDistance } from '../utils/geo';
import { formatCheckInDate } from '../utils/format';
import { exportCheckInsToCSV } from '../utils/export';
import { styles } from '../styles/index.styles';
import StatsCard from '../components/StatsCard';
import CheckInItem from '../components/CheckInItem';
import { showAlert } from '../utils/alert';

const TrackingDot = memo(function TrackingDot({ isTracking }: { isTracking: boolean }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isTracking) {
      pulseAnim.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isTracking, pulseAnim]);

  return (
    <View style={styles.trackingDotContainer}>
      <Animated.View
        style={[
          styles.trackingDot,
          {
            backgroundColor: isTracking ? COLORS.success : COLORS.danger,
            opacity: isTracking ? pulseAnim : 1,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.trackingDotGlow,
          {
            backgroundColor: isTracking ? COLORS.success : COLORS.danger,
            opacity: isTracking ? pulseAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.1, 0.3] }) : 0,
          },
        ]}
      />
    </View>
  );
});

export default function DashboardScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { isLoading, checkIns, locationState, startLocationTracking, stopLocationTracking, fetchCheckIns } = useApp();
  const {
    currentLocation = null,
    isInZone = false,
    distanceToZone = null,
    nearestZone = null,
    isTracking = false,
    error = null,
  } = locationState || {};
  useEffect(() => {
    if (currentUser?.id) {
      if (currentUser.role === 'admin') {
        fetchCheckIns();
      } else {
        fetchCheckIns(currentUser.id);
      }
    }
  }, [currentUser, fetchCheckIns]);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.appTitle}>GeoFace</Text>
        <Text style={styles.appSubtitle}>Inicializando...</Text>
      </View>
    );
  }

  const toggleTracking = () => {
    if (isTracking) {
      stopLocationTracking();
    } else {
      startLocationTracking();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerGradient}>
        <View style={styles.headerGradientLayer1} />
        <View style={styles.headerGradientLayer2} />
        <View style={styles.headerGradientLayer3} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>GeoFace</Text>
            <Text style={styles.appSubtitle}>Control de asistencia inteligente</Text>
          </View>
          <TouchableOpacity 
            style={styles.notificationBtn} 
            accessibilityLabel="Notificaciones"
            onPress={() => {
            if (error) {
              showAlert('Error de Ubicación', error);
            } else {
              showAlert('Estado', 'Sistema GPS activo y funcionando.');
            }
          }}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.textSecondary} />
            {error && <View style={styles.notifBadge} />}
          </TouchableOpacity>
        </View>

        <View style={styles.trackingCard}>
          <View style={styles.trackingCardInner}>
            <View style={styles.trackingHeader}>
              <TrackingDot isTracking={isTracking} />
              <Text style={styles.trackingText}>
                {isTracking ? 'GPS Activo' : 'GPS Inactivo'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[
                  styles.trackingToggle,
                  { backgroundColor: isTracking ? 'rgba(0, 184, 148, 0.15)' : 'rgba(255, 118, 117, 0.15)' },
                ]}
                accessibilityLabel="Alternar Rastreo GPS"
                onPress={toggleTracking}
              >
                <Ionicons
                  name={isTracking ? 'pause' : 'play'}
                  size={16}
                  color={isTracking ? COLORS.success : COLORS.danger}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.zoneCard}>
          {isInZone && <View style={styles.zoneGlow} />}
          <View style={styles.zoneCardContent}>
            <View
              style={[
                styles.zoneIconContainer,
                {
                  backgroundColor: isInZone
                    ? 'rgba(0, 184, 148, 0.15)'
                    : 'rgba(255, 118, 117, 0.1)',
                  borderColor: isInZone
                    ? 'rgba(0, 184, 148, 0.3)'
                    : 'rgba(255, 118, 117, 0.2)',
                },
              ]}
            >
              <Ionicons
                name={isInZone ? 'shield-checkmark' : 'shield-outline'}
                size={48}
                color={isInZone ? COLORS.success : COLORS.textMuted}
              />
            </View>
            <Text
              style={[
                styles.zoneStatus,
                { color: isInZone ? COLORS.success : COLORS.danger },
              ]}
            >
              {isInZone ? 'En Zona' : 'Fuera de Zona'}
            </Text>
            <Text style={styles.zoneSubtext}>
              {isInZone
                ? `Dentro de rango: ${nearestZone?.name || 'Zona Principal'}`
                : nearestZone
                ? `Acércate a ${nearestZone.name}`
                : 'Crea una zona en Ajustes'}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatsCard
            icon="navigate"
            iconColor={COLORS.info}
            value={distanceToZone !== null ? formatDistance(distanceToZone) : 'N/A'}
            label="Distancia"
          />
          <StatsCard
            icon="location-outline"
            iconColor={COLORS.accent}
            value={currentLocation ? currentLocation.latitude.toFixed(4) : '0.0000'}
            label="Latitud"
          />
          <StatsCard
            icon="compass-outline"
            iconColor={COLORS.primaryLight}
            value={currentLocation ? currentLocation.longitude.toFixed(4) : '0.0000'}
            label="Longitud"
          />
        </View>

        {/* Verify Identity Button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            !isInZone && styles.verifyButtonDisabled,
          ]}
          disabled={!isInZone}
          activeOpacity={0.8}
          accessibilityLabel="Verificar Identidad"
          onPress={() => router.push('/(tabs)/verify')}
        >
          {isInZone && <View style={styles.verifyButtonGlow} />}
          <View style={styles.verifyButtonInner}>
            <View style={styles.verifyButtonBg}>
              <Ionicons name="scan" size={28} color={COLORS.text} />
              <Text style={styles.verifyButtonText}>Verificar Identidad</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Recent Check-ins */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.sectionTitle}>Registros Recientes</Text>
            {currentUser?.role === 'admin' && checkIns.length > 0 && (
              <TouchableOpacity
                onPress={() => exportCheckInsToCSV(checkIns)}
                style={{ padding: 6, backgroundColor: 'rgba(0, 210, 255, 0.15)', borderRadius: 8, marginLeft: 4 }}
                accessibilityLabel="Descargar Reporte Excel/CSV"
              >
                <Ionicons name="download-outline" size={18} color={COLORS.primaryLight} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity accessibilityLabel="Nuevo Registro" onPress={() => router.push('/(tabs)/verify')}>
            <Text style={styles.sectionAction}>Nuevo Registro</Text>
          </TouchableOpacity>
        </View>

        {checkIns.length === 0 ? (
          <View style={styles.checkInCard}>
            <Text style={{ color: COLORS.textMuted, fontSize: 14, flex: 1, textAlign: 'center', paddingVertical: 8 }}>
              Sin registros recientes
            </Text>
          </View>
        ) : (
          checkIns.map((item) => (
            <CheckInItem
              key={item.id}
              isMatch={item.verification.isMatch}
              confidence={item.verification.confidence}
              profileName={item.profileName}
              zoneName={item.zone.name}
              formattedDate={formatCheckInDate(item.timestamp)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
