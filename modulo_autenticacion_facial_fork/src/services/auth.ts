import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { UserAccount } from '../types';
import { getServerAddress } from './faceApi';

const KEYS = {
  SESSION: 'geo_face_session',
};

// --- Secure Store Wrappers (same pattern as storage.ts) ---

async function secureGetItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function secureSetItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (err: unknown) {
    console.error('Error secureSetItem in auth:', err);
  }
}

async function secureRemoveItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (err: unknown) {
    console.error('Error secureRemoveItem in auth:', err);
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  const fetchPromise = fetch(url, {
    ...options,
    signal: controller.signal,
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('El servidor no respondió a tiempo (Timeout).')), timeout + 100);
  });

  try {
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// --- Account CRUD (via Cloud Backend) ---

export async function getStoredAccounts(adminId: string): Promise<UserAccount[]> {
  try {
    const res = await fetchWithTimeout(`${getServerAddress()}/v1/users?admin_id=${adminId}`);
    if (!res.ok) throw new Error('Error de red o acceso denegado');
    const data = await res.json();
    return data.users as UserAccount[];
  } catch (e) {
    console.error('getStoredAccounts error:', e);
    return [];
  }
}


export async function deleteAccount(accountId: string, adminId: string): Promise<void> {
  const res = await fetchWithTimeout(`${getServerAddress()}/v1/users/${accountId}?admin_id=${adminId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar cuenta en la nube');
}

// --- Authentication (via Cloud Backend) ---

export async function authenticateUser(
  cedula: string,
  password: string
): Promise<UserAccount | null> {
  try {
    const body = `username=${encodeURIComponent(cedula)}&password=${encodeURIComponent(password)}`;
    const res = await fetchWithTimeout(`${getServerAddress()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    });
    
    if (res.status === 401 || res.status === 403 || res.status === 400 || res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`Error en el servidor: ${res.status}`);
    }
    
    const data = await res.json();
    if (data.access_token) {
      await setActiveSession(data.access_token);
      
      // Obtener los datos reales del usuario desde el ERP
      const realUser = await getUserById(data.access_token);
      if (realUser) {
        return realUser;
      }
      
      // Fallback en caso de que falle
      return {
        id: cedula,
        username: cedula,
        role: 'user',
        displayName: 'Usuario (Sin Conexión)',
        createdAt: new Date().toISOString()
      } as UserAccount;
    }
    return null;
  } catch (e: any) {
    console.error('authenticateUser error:', e);
    throw new Error(e.message || 'No se pudo conectar al servidor.');
  }
}

// --- Session Persistence (Local) ---

export async function getActiveSession(): Promise<string | null> {
  try {
    return await secureGetItem(KEYS.SESSION);
  } catch {
    return null;
  }
}

export async function setActiveSession(userId: string): Promise<void> {
  await secureSetItem(KEYS.SESSION, userId);
}

export async function clearSession(): Promise<void> {
  await secureRemoveItem(KEYS.SESSION);
}

// --- Utilities ---

export async function getUserById(token: string): Promise<UserAccount | null> {
  try {
    const res = await fetchWithTimeout(`${getServerAddress()}/auth/yo`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) return null;
    
    const data = await res.json();
    return {
      id: data.id,
      username: data.cedula,
      role: data.rol,
      displayName: data.nombre,
      createdAt: data.creado_en || new Date().toISOString()
    } as UserAccount;
  } catch (e) {
    console.error('getUserById error:', e);
    return null;
  }
}

export async function hasAnyAccounts(): Promise<boolean> {
  // Ahora siempre retornamos true ya que no se permite crear cuentas y asumimos que existen en el ERP
  return true;
}

export async function createAccount(
  username: string,
  password: string,
  role: 'admin' | 'user',
  displayName: string
): Promise<UserAccount> {
  throw new Error('La creación de cuentas desde la aplicación móvil no está permitida en el flujo empresarial.');
}
