import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '../src/context/AppContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, currentUser } = useAuth();
  const {
    biometricStatus,
    biometricStatusUserId,
    isBiometricStatusLoading,
    isLoading: isAppLoading,
    refreshBiometricStatus,
    refreshZones,
  } = useApp();
  const segments = useSegments();
  const router = useRouter();
  const [biometricCheckUserId, setBiometricCheckUserId] = useState<string | null>(null);
  const [zonesCheckUserId, setZonesCheckUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setBiometricCheckUserId(null);
      setZonesCheckUserId(null);
      return;
    }
    if (isLoading || !isAuthenticated || !currentUser) return;

    if (biometricCheckUserId !== currentUser.id || biometricStatusUserId !== currentUser.id) {
      setBiometricCheckUserId(currentUser.id);
      refreshBiometricStatus(currentUser.id).catch((error) => {
        console.error('Error actualizando estado biometrico:', error);
      });
    }

    if (zonesCheckUserId !== currentUser.id) {
      setZonesCheckUserId(currentUser.id);
      refreshZones().catch((error) => {
        console.error('Error actualizando zonas oficiales:', error);
      });
    }
  }, [isAuthenticated, isLoading, currentUser, biometricCheckUserId, biometricStatusUserId, zonesCheckUserId, refreshBiometricStatus, refreshZones]);

  useEffect(() => {
    if (isLoading || isAppLoading || isBiometricStatusLoading) return;

    const inLoginScreen = segments[0] === 'login';
    const inEnrollScreen = segments[0] === 'enroll';
    const inRoot = segments.length === (0 as number);

    if (!isAuthenticated && !inLoginScreen) {
      // No autenticado y no está en login → redirigir a login
      router.replace('/login');
    } else if (isAuthenticated) {
      if (!currentUser || biometricStatusUserId !== currentUser.id) return;

      const hasEnrolledFace = biometricStatus?.enrolado === true;

      if (!hasEnrolledFace && !inEnrollScreen) {
        // El backend es la fuente de verdad: si no confirma enrolamiento, va a enrolar.
        router.replace('/enroll');
      } else if (hasEnrolledFace && (inLoginScreen || inEnrollScreen || inRoot)) {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading, isAppLoading, isBiometricStatusLoading, segments, biometricStatus, biometricStatusUserId, currentUser]);

  return <>{children}</>;
}

import { requestNotificationPermissions } from '../src/services/notifications';

export default function RootLayout() {
  useEffect(() => {
    requestNotificationPermissions().catch(console.error);
  }, []);

  return (
    <AuthProvider>
      <AppProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          <AuthGate>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0A0A1A' },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="login" options={{ animation: 'fade' }} />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </AuthGate>
        </View>
      </AppProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
});
