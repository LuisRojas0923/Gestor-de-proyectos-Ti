import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';

export default function TabLayout() {
  const isWeb = Platform.OS === 'web';
  const { currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'admin';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(20, 20, 40, 0.95)',
          borderTopColor: 'rgba(108, 92, 231, 0.2)',
          borderTopWidth: 1,
          height: isWeb ? 60 : Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: isWeb ? 6 : Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          ...(isWeb ? {} : { position: 'absolute' as const }),
          elevation: 0,
        },
        tabBarActiveTintColor: '#6C5CE7',
        tabBarInactiveTintColor: '#6C6C80',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location" size={size} color={color} />
          ),
          // Solo admins ven el Dashboard
          href: isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profiles"
        options={{
          title: 'Perfiles',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
          // Solo admins ven Perfiles
          href: isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="verify"
        options={{
          title: 'Verificar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan" size={size} color={color} />
          ),
          // Todos ven Verificar
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
          // Todos ven Ajustes
        }}
      />
      <Tabs.Screen
        name="location-test"
        options={{
          title: 'Ubicación',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
          // Solo admins ven Ubicación
          href: isAdmin ? undefined : null,
        }}
      />
    </Tabs>
  );
}
