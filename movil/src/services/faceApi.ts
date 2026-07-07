import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

declare const process: { env?: Record<string, string | undefined> };

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

const DEFAULT_SERVER_PORT = 8000;
const DEFAULT_SERVER_HOST = process.env?.EXPO_PUBLIC_API_HOST;
const REQUEST_TIMEOUT = 30000;

function getServerHost(): string {
  if (!DEFAULT_SERVER_HOST) {
    throw new Error('Configura EXPO_PUBLIC_API_HOST en movil/.env');
  }
  return `http://${DEFAULT_SERVER_HOST}:${DEFAULT_SERVER_PORT}/api/v2`;
}

let API_BASE = getServerHost();

function normalizeServerAddress(input: string): string {
  let address = input.trim();
  if (!address.startsWith('http://') && !address.startsWith('https://')) {
    address = `http://${address}`;
  }

  try {
    const parsed = new URL(address);
    const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname);

    if (!parsed.port && isIpAddress) {
      parsed.port = String(DEFAULT_SERVER_PORT);
    } else if (parsed.port === '8001') {
      parsed.port = String(DEFAULT_SERVER_PORT);
    }

    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    if (!cleanPath || cleanPath === '/') {
      parsed.pathname = '/api/v2';
    } else if (cleanPath.endsWith('/api/v2')) {
      parsed.pathname = cleanPath;
    } else {
      parsed.pathname = `${cleanPath}/api/v2`;
    }

    return parsed.toString().replace(/\/$/, '');
  } catch {
    if (!address.endsWith('/api/v2')) {
      address = address.replace(/\/$/, '') + '/api/v2';
    }
    return address;
  }
}

export function setServerAddress(input: string) {
  API_BASE = normalizeServerAddress(input);
}

export function getServerAddress(): string {
  return API_BASE;
}

export async function loadServerAddress(): Promise<void> {
  try {
    const savedIp = await AsyncStorage.getItem('@server_ip');
    if (savedIp) {
      const normalizedAddress = normalizeServerAddress(savedIp);
      setServerAddress(normalizedAddress);
      if (normalizedAddress !== savedIp) {
        await AsyncStorage.setItem('@server_ip', normalizedAddress);
      }
    }
  } catch (error) {
    console.error('Failed to load server IP:', error);
  }
}

export async function saveAndSetServerAddress(hostname: string): Promise<void> {
  try {
    const normalizedAddress = normalizeServerAddress(hostname);
    await AsyncStorage.setItem('@server_ip', normalizedAddress);
    setServerAddress(normalizedAddress);
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

export interface BiometricStatusResponse {
  enrolado: boolean;
  fotoUrl: string | null;
  actualizadoEn: string | null;
}

export interface BackendZoneResponse {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
  radio: number;
}

export interface CreateZoneResponse {
  status: string;
  zona: BackendZoneResponse;
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

export async function getBiometricStatus(): Promise<BiometricStatusResponse> {
  return request<BiometricStatusResponse>('/biometria/estado', null, REQUEST_TIMEOUT, 'GET');
}

export async function getOfficialZones(): Promise<BackendZoneResponse[]> {
  return request<BackendZoneResponse[]>('/biometria/zonas', null, REQUEST_TIMEOUT, 'GET');
}

export async function createOfficialZone(
  nombre: string,
  latitud: number,
  longitud: number,
  radio: number
): Promise<BackendZoneResponse> {
  const response = await request<CreateZoneResponse>('/biometria/zonas', { nombre, latitud, longitud, radio });
  return response.zona;
}

export async function deleteOfficialZone(id: string): Promise<void> {
  await request<unknown>(`/biometria/zonas/${encodeURIComponent(id)}`, null, REQUEST_TIMEOUT, 'DELETE');
}

const EVIDENCE_PATH_PATTERN = /^\/api\/v2\/biometria\/evidencia\/[A-Za-z0-9._-]+\.(png|webp|jpe?g)$/i;

function buildProtectedEvidenceUrl(relativeUrl: string): string {
  if (!EVIDENCE_PATH_PATTERN.test(relativeUrl)) {
    throw new FaceApiError('Ruta de evidencia no permitida.', 'INVALID_EVIDENCE_URL');
  }
  const baseUrl = API_BASE.replace(/\/api\/v2\/?$/, '');
  return `${baseUrl}${relativeUrl}`;
}

function mimeFromEvidenceUrl(relativeUrl: string): string {
  const extension = relativeUrl.match(/\.(png|webp|jpe?g)$/i)?.[1]?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export async function getAuthenticatedImageUri(relativeUrl: string): Promise<string> {
  const token = await getActiveSessionToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = buildProtectedEvidenceUrl(relativeUrl);
  const mimeType = mimeFromEvidenceUrl(relativeUrl);

  if (Platform.OS !== 'web' && FileSystem?.cacheDirectory) {
    const extension = relativeUrl.match(/\.(png|webp|jpe?g)$/i)?.[0] || '.jpg';
    const target = `${FileSystem.cacheDirectory}evidencia_${Date.now()}_${Math.random().toString(36).slice(2)}${extension}`;
    let downloadedUri: string | null = null;
    try {
      const result = await FileSystem.downloadAsync(url, target, { headers });
      downloadedUri = result.uri;
      if (result.status < 200 || result.status >= 300) {
        throw new FaceApiError('No se pudo cargar la evidencia fotografica.', `HTTP_${result.status}`);
      }
      const base64 = await FileSystem.readAsStringAsync(result.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:${mimeType};base64,${base64}`;
    } finally {
      if (downloadedUri) {
        FileSystem.deleteAsync(downloadedUri, { idempotent: true }).catch(() => {});
      }
    }
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new FaceApiError('No se pudo cargar la evidencia fotografica.', `HTTP_${response.status}`);
  }
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
  return request<any[]>(`/biometria/asistencias?usuario_id=${encodeURIComponent(userId)}`, null, REQUEST_TIMEOUT, 'GET');
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
