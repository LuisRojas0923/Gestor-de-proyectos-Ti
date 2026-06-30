import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

async function getActiveSessionToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem('geo_face_session');
    }
    return await SecureStore.getItemAsync('geo_face_session');
  } catch {
    return null;
  }
}

// Importar FileSystem solo en plataformas nativas (no disponible en web)
let FileSystem: typeof import('expo-file-system/legacy') | null = null;
if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system/legacy');
}

const DEFAULT_SERVER_PORT = 8001;
const REQUEST_TIMEOUT = 120000;

function getServerHost(): string {
  // Dirección por defecto (puedes cambiarla si no usas esta red local)
  return `http://192.168.0.21:${DEFAULT_SERVER_PORT}/api/v2`;
}

let API_BASE = getServerHost();

export function setServerAddress(input: string) {
  let address = input.trim();
  if (!address.startsWith('http://') && !address.startsWith('https://')) {
    address = `http://${address}`;
  }
  
  // Comprobar si la dirección tiene puerto o es dominio
  const cleanAddress = address.replace('://', '');
  const hasPort = /:\d+/.test(cleanAddress);
  const hostPart = cleanAddress.split('/')[0].split(':')[0];
  const isDomain = /[a-zA-Z]/.test(hostPart);
  
  if (!hasPort && !isDomain) {
    // Usar el puerto 8001 por defecto para desarrollo/pruebas locales
    address = `${address}:${DEFAULT_SERVER_PORT}`;
  }
  
  if (!address.endsWith('/api/v2')) {
    address = address.replace(/\/$/, '') + '/api/v2';
  }
  
  API_BASE = address;
  console.log('API_BASE configured to:', API_BASE);
}

export function getServerAddress(): string {
  return API_BASE;
}

export async function loadServerAddress(): Promise<void> {
  try {
    const savedIp = await AsyncStorage.getItem('@server_ip');
    if (savedIp) {
      setServerAddress(savedIp);
    }
  } catch (error) {
    console.error('Failed to load server IP:', error);
  }
}

export async function saveAndSetServerAddress(hostname: string): Promise<void> {
  try {
    await AsyncStorage.setItem('@server_ip', hostname);
    setServerAddress(hostname);
  } catch (error) {
    console.error('Failed to save server IP:', error);
  }
}

export class FaceApiError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'FaceApiError';
  }
}

export interface VerifyResponse {
  verified: boolean;
  confidence: number;
  distance: number;
  threshold?: number;
}

export interface EnrollResponse {
  status: string;
  message: string;
}

async function request<T>(path: string, body: unknown = null, timeout = REQUEST_TIMEOUT, method = 'POST'): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const token = await getActiveSessionToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };
    if (body !== null && method !== 'GET') {
      if (body instanceof FormData) {
        delete headers['Content-Type'];
        fetchOptions.body = body;
      } else {
        fetchOptions.body = JSON.stringify(body);
      }
    }

    const res = await fetch(`${API_BASE}${path}`, fetchOptions);

    const text = await res.text();

    if (!res.ok) {
      let errorMsg = `Ocurrió un problema en el servidor (${res.status}).`;
      try {
        const errData = JSON.parse(text);
        if (errData && errData.error) {
          errorMsg = errData.error;
        } else if (errData && errData.detail) {
          errorMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
        }
      } catch (e) {
        // No es JSON válido
      }
      throw new FaceApiError(errorMsg, `HTTP_${res.status}`);
    }

    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      throw new FaceApiError(
        `Ocurrió un error inesperado al leer la respuesta del servidor.`,
        'INVALID_RESPONSE'
      );
    }

    return data;
  } catch (err: unknown) {
    if (err instanceof FaceApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new FaceApiError('El servidor no respondió a tiempo. Revisa tu conexión.', 'TIMEOUT');
    }
    throw new FaceApiError(
      `No se pudo conectar al servidor. Verifica que esté encendido.`,
      'CONNECTION_REFUSED'
    );
  } finally {
    clearTimeout(timer);
  }
}

async function photoToBase64(photoUri: string): Promise<string> {
  // En web, las URIs de fotos son blob: o data: URIs
  if (Platform.OS === 'web') {
    // Si ya es un data URI, retornarlo directamente
    if (photoUri.startsWith('data:')) {
      return photoUri;
    }
    // Convertir blob URI a base64 usando fetch + FileReader
    const response = await fetch(photoUri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // En nativo, usar FileSystem
  const base64 = await FileSystem!.readAsStringAsync(photoUri, {
    encoding: FileSystem!.EncodingType.Base64,
  });
  return `data:image/jpeg;base64,${base64}`;
}

export async function enrollFace(photoUri: string, userId: string, userName?: string): Promise<void> {
  const formData = new FormData();
  formData.append('image', {
    uri: photoUri,
    name: 'photo.jpg',
    type: 'image/jpeg'
  } as any);
  
  await request<unknown>('/biometria/enrolar', formData);
}

export async function verifyFace(
  photoUri: string,
  userId: string,
  zoneId?: string,
  latitude?: number,
  longitude?: number
): Promise<VerifyResponse> {
  const formData = new FormData();
  formData.append('image', {
    uri: photoUri,
    name: 'photo.jpg',
    type: 'image/jpeg'
  } as any);
  formData.append('latitud', (latitude || 0.0).toString());
  formData.append('longitud', (longitude || 0.0).toString());
  if (zoneId) {
    formData.append('zona_id', zoneId.toString());
  }

  return request<VerifyResponse>('/biometria/asistencia', formData);
}

export async function getCheckIns(userId: string): Promise<any[]> {
  return request<any[]>(`/biometria/asistencias?usuario_id=${userId}`, null, REQUEST_TIMEOUT, 'GET');
}

export async function getAllCheckIns(): Promise<any[]> {
  return request<any[]>(`/biometria/asistencias`, null, REQUEST_TIMEOUT, 'GET');
}

export async function healthCheck(): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  try {
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
