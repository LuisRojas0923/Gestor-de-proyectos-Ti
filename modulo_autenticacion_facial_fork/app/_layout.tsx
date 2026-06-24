import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { AppProvider, useApp } from '../src/context/AppContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, currentUser } = useAuth();
  const { profiles, isLoading: isAppLoading } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || isAppLoading) return;

    const inLoginScreen = segments[0] === 'login';
    const inEnrollScreen = segments[0] === 'enroll';
    const inRoot = segments.length === (0 as number);

    if (!isAuthenticated && !inLoginScreen) {
      // No autenticado y no está en login → redirigir a login
      router.replace('/login');
    } else if (isAuthenticated) {
      // Verificar si el usuario ya registró su rostro en este dispositivo
      const hasEnrolledFace = profiles.some(p => p.id === currentUser?.id);

      if (!hasEnrolledFace && !inEnrollScreen) {
        // Autenticado pero no tiene rostro -> obligarlo a registrar su rostro
        router.replace('/enroll');
      } else if (hasEnrolledFace && (inLoginScreen || inEnrollScreen || inRoot)) {
        // Autenticado y ya tiene rostro -> no puede ir a login ni a enroll, va a tabs
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading, isAppLoading, segments, profiles, currentUser]);

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
