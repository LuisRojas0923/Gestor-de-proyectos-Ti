import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { FaceProfile, Zone, CheckIn } from '../types';

// Importar FileSystem solo en plataformas nativas
let FileSystem: typeof import('expo-file-system/legacy') | null = null;
if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system/legacy');
}

const KEYS = {
  PROFILES: 'geo_face_profiles',
  ZONES: 'geo_face_zones',
  CHECKINS: 'geo_face_checkins',
};

const FACE_PHOTOS_DIR = Platform.OS !== 'web' && FileSystem
  ? `${FileSystem.documentDirectory}face_photos/`
  : '';

// Ensure the photos directory exists (solo en nativo)
async function ensurePhotoDir(): Promise<void> {
  if (Platform.OS === 'web' || !FileSystem) return;
  const dirInfo = await FileSystem.getInfoAsync(FACE_PHOTOS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(FACE_PHOTOS_DIR, { intermediates: true });
  }
}

// SECURE STORE WRAPPERS (Con lógica de migración automática)
async function secureGetItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  
  let result = await SecureStore.getItemAsync(key);
  
  // Migración automática desde AsyncStorage (solo ocurre una vez si AsyncStorage tiene datos legacy)
  if (!result) {
    result = await AsyncStorage.getItem(key);
    if (result) {
      // Guardar en almacenamiento encriptado
      await SecureStore.setItemAsync(key, result);
      // Borrar la copia en texto plano
      await AsyncStorage.removeItem(key);
    }
  }
  return result;
}

async function secureSetItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (err: unknown) {
    console.error('Error secureSetItem:', err);
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
    console.error('Error secureRemoveItem:', err);
  }
}

// PROFILES
export async function getProfiles(): Promise<FaceProfile[]> {
  try {
    const data = await secureGetItem(KEYS.PROFILES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveProfile(profile: FaceProfile): Promise<void> {
  const profiles = await getProfiles();
  const index = profiles.findIndex((p) => p.id === profile.id);
  if (index >= 0) {
    profiles[index] = profile;
  } else {
    profiles.push(profile);
  }
  await secureSetItem(KEYS.PROFILES, JSON.stringify(profiles));
}

export async function deleteProfile(profileId: string): Promise<void> {
  const profiles = await getProfiles();
  const filtered = profiles.filter((p) => p.id !== profileId);
  await secureSetItem(KEYS.PROFILES, JSON.stringify(filtered));
  // Limpiar fotos del disco solo en nativo
  if (Platform.OS !== 'web' && FileSystem) {
    try {
      const photoDir = `${FACE_PHOTOS_DIR}${profileId}/`;
      const dirInfo = await FileSystem.getInfoAsync(photoDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(photoDir, { idempotent: true });
      }
    } catch {
      // ignore cleanup errors
    }
  }
}

// Save a face photo and return the URI
export async function saveFacePhoto(
  profileId: string,
  photoUri: string,
  index: number
): Promise<string> {
  // En web, guardar la URI directamente (es un blob: o data: URI)
  if (Platform.OS === 'web') {
    return photoUri;
  }

  // En nativo, copiar el archivo al directorio de fotos
  await ensurePhotoDir();
  const profileDir = `${FACE_PHOTOS_DIR}${profileId}/`;
  const dirInfo = await FileSystem!.getInfoAsync(profileDir);
  if (!dirInfo.exists) {
    await FileSystem!.makeDirectoryAsync(profileDir, { intermediates: true });
  }
  const destUri = `${profileDir}face_${index}.jpg`;
  try {
    await FileSystem!.copyAsync({ from: photoUri, to: destUri });
  } catch (err: unknown) {
    console.error('Error copiando imagen al directorio:', err);
    throw err;
  }
  return destUri;
}

// ZONES
export async function getZones(): Promise<Zone[]> {
  try {
    const data = await secureGetItem(KEYS.ZONES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveZone(zone: Zone): Promise<void> {
  const zones = await getZones();
  const index = zones.findIndex((z) => z.id === zone.id);
  if (index >= 0) {
    zones[index] = zone;
  } else {
    zones.push(zone);
  }
  await secureSetItem(KEYS.ZONES, JSON.stringify(zones));
}

export async function deleteZone(zoneId: string): Promise<void> {
  const zones = await getZones();
  const filtered = zones.filter((z) => z.id !== zoneId);
  await secureSetItem(KEYS.ZONES, JSON.stringify(filtered));
}

// CHECK-INS
export async function getCheckIns(): Promise<CheckIn[]> {
  try {
    const data = await secureGetItem(KEYS.CHECKINS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function addCheckIn(checkIn: CheckIn): Promise<void> {
  const checkIns = await getCheckIns();
  checkIns.unshift(checkIn); // add to beginning
  // Keep only last 100 check-ins
  const trimmed = checkIns.slice(0, 100);
  await secureSetItem(KEYS.CHECKINS, JSON.stringify(trimmed));
}

export async function clearCheckIns(): Promise<void> {
  await secureSetItem(KEYS.CHECKINS, JSON.stringify([]));
}

// THRESHOLD
export async function getThreshold(): Promise<number> {
  try {
    const val = await secureGetItem('geo_face_threshold');
    return val ? parseInt(val, 10) : 75;
  } catch {
    return 75;
  }
}

export async function saveThreshold(threshold: number): Promise<void> {
  try {
    await secureSetItem('geo_face_threshold', threshold.toString());
  } catch {
    // ignore
  }
}
