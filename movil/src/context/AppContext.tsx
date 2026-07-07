import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation } from '../hooks/useLocation';
import {
    getCheckIns,
    getProfiles,
    getThreshold,
    getZones,
    saveFacePhoto,
    saveThreshold,
    addCheckIn as storageAddCheckIn,
    clearCheckIns as storageClearCheckIns,
    deleteProfile as storageDeleteProfile,
    deleteZone as storageDeleteZone,
    replaceZones as storageReplaceZones,
    saveProfile as storageSaveProfile,
    saveZone as storageSaveZone,
} from '../services/storage';
import { BiometricStatus, CheckIn, FaceProfile, LocationState, Zone } from '../types';
import {
  createOfficialZone,
  deleteOfficialZone,
  enrollFace,
  getBiometricStatus,
  getCheckIns as apiGetCheckIns,
  getAllCheckIns as apiGetAllCheckIns,
  getOfficialZones,
} from '../services/faceApi';

interface AppContextType {
  profiles: FaceProfile[];
  zones: Zone[];
  checkIns: CheckIn[];
  threshold: number;
  biometricStatus: BiometricStatus | null;
  biometricStatusUserId: string | null;
  isBiometricStatusLoading: boolean;
  locationState: LocationState;
  isLoading: boolean;
  
  // Actions
  addProfile: (id: string, name: string, photoUri?: string) => Promise<FaceProfile>;
  updateProfilePhoto: (id: string, photoUri: string) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  addZone: (name: string, latitude: number, longitude: number, radius: number) => Promise<Zone>;
  deleteZone: (id: string) => Promise<void>;
  addCheckIn: (checkIn: Omit<CheckIn, 'id' | 'timestamp'>) => Promise<void>;
  clearCheckIns: () => Promise<void>;
  fetchCheckIns: (userId?: string) => Promise<void>;
  refreshBiometricStatus: (userId: string) => Promise<BiometricStatus>;
  refreshZones: () => Promise<Zone[]>;
  setThreshold: (value: number) => Promise<void>;
  startLocationTracking: () => Promise<void>;
  stopLocationTracking: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<FaceProfile[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [threshold, setThresholdState] = useState<number>(75);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [biometricStatusUserId, setBiometricStatusUserId] = useState<string | null>(null);
  const [isBiometricStatusLoading, setIsBiometricStatusLoading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize location hook with zones
  const locationHook = useLocation(zones);

  // Load all initial data from storage
  useEffect(() => {
    async function loadData() {
      try {
        // Cargar datos rápidamente sin esperar demasiado
        Promise.all([
          getProfiles(),
          getZones(),
          getThreshold(),
        ]).then(([storedProfiles, storedZones, storedThreshold]) => {
          setProfiles(storedProfiles);
          setZones(storedZones);
          setThresholdState(storedThreshold);
        }).catch((error) => {
          console.error('Error al cargar datos:', error);
        }).finally(() => {
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Error al cargar datos del almacenamiento:', error);
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const refreshBiometricStatus = useCallback(async (userId: string) => {
    setIsBiometricStatusLoading(true);
    try {
      const status = await getBiometricStatus();
      setBiometricStatus(status);
      setBiometricStatusUserId(userId);
      return status;
    } catch (err) {
      console.error('Error consultando estado biometrico:', err);
      const failClosedStatus = { enrolado: false, fotoUrl: null, actualizadoEn: null };
      setBiometricStatus(failClosedStatus);
      setBiometricStatusUserId(userId);
      return failClosedStatus;
    } finally {
      setIsBiometricStatusLoading(false);
    }
  }, []);

  const refreshZones = useCallback(async () => {
    try {
      const officialZones = await getOfficialZones();
      const mappedZones: Zone[] = officialZones.map((zone) => ({
        id: String(zone.id),
        name: zone.nombre,
        center: { latitude: zone.latitud, longitude: zone.longitud },
        radius: zone.radio,
      }));
      setZones(mappedZones);
      await storageReplaceZones(mappedZones);
      return mappedZones;
    } catch (err) {
      console.error('Error consultando zonas oficiales:', err);
      return zones;
    }
  }, [zones]);

  // Profile operations
  const addProfile = useCallback(async (id: string, name: string, photoUri?: string) => {
    const newProfile: FaceProfile = {
      id,
      name,
      photoUris: [],
      createdAt: new Date().toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      updatedAt: new Date().toISOString(),
    };

    if (photoUri) {
      try {
        const localPhotoUri = await saveFacePhoto(id, photoUri, 0);
        newProfile.photoUris = [localPhotoUri];
        await enrollFace(localPhotoUri, id, name);
        const backendStatus = await getBiometricStatus();
        if (!backendStatus.enrolado) {
          throw new Error('El backend no confirmó el enrolamiento biométrico. Intenta nuevamente.');
        }
        setBiometricStatus(backendStatus);
        setBiometricStatusUserId(id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Error al procesar foto facial:', msg);
        // Lanzar el error para que la UI sepa que falló y NO guarde localmente
        throw err;
      }
    }

    await storageSaveProfile(newProfile);
    setProfiles((prev) => [newProfile, ...prev]);
    return newProfile;
  }, []);

  const updateProfilePhoto = useCallback(async (id: string, photoUri: string) => {
    try {
      const localPhotoUri = await saveFacePhoto(id, photoUri, 0);
      const profile = profiles.find(p => p.id === id);
      await enrollFace(localPhotoUri, id, profile?.name);
      const backendStatus = await getBiometricStatus();
      if (!backendStatus.enrolado) {
        throw new Error('El backend no confirmó la actualización biométrica. Intenta nuevamente.');
      }
      setBiometricStatus(backendStatus);
      setBiometricStatusUserId(id);

      setProfiles((prev) => {
        const next = [...prev];
        const idx = next.findIndex(p => p.id === id);
        if (idx !== -1) {
          next[idx] = {
            ...next[idx],
            photoUris: [localPhotoUri],
            updatedAt: new Date().toISOString(),
          };
          storageSaveProfile(next[idx]).catch(e => console.error('Error guardando perfil:', e));
        }
        return next;
      });
    } catch (err) {
      console.error('Error al actualizar la foto de perfil:', err);
      throw err;
    }
  }, [profiles]);

  const deleteProfile = useCallback(async (id: string) => {
    try {
      await storageDeleteProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error('Error borrando perfil:', e);
    }
  }, []);

  // Zone operations
  const addZone = useCallback(async (name: string, latitude: number, longitude: number, radius: number) => {
    try {
      const officialZone = await createOfficialZone(name, latitude, longitude, radius);
      const newZone: Zone = {
        id: String(officialZone.id),
        name: officialZone.nombre,
        center: { latitude: officialZone.latitud, longitude: officialZone.longitud },
        radius: officialZone.radio,
      };
      await storageSaveZone(newZone);
      setZones((prev) => [...prev, newZone]);
      return newZone;
    } catch (e) {
      console.error('Error guardando zona oficial:', e);
      throw e;
    }
  }, []);

  const deleteZone = useCallback(async (id: string) => {
    try {
      await deleteOfficialZone(id);
      await storageDeleteZone(id);
      setZones((prev) => prev.filter((z) => z.id !== id));
    } catch (e) {
      console.error('Error borrando zona oficial:', e);
      throw e;
    }
  }, []);

  // Check-in operations
  const addCheckIn = useCallback(async (checkInData: Omit<CheckIn, 'id' | 'timestamp'>) => {
    const newCheckIn: CheckIn = {
      ...checkInData,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    };
    try {
      await storageAddCheckIn(newCheckIn);
      setCheckIns((prev) => [newCheckIn, ...prev.slice(0, 99)]);
    } catch (e) {
      console.error('Error guardando check-in:', e);
    }
  }, []);

  const clearCheckIns = useCallback(async () => {
    try {
      await storageClearCheckIns();
      setCheckIns([]);
    } catch (e) {
      console.error('Error limpiando check-ins:', e);
    }
  }, []);

  const fetchCheckIns = useCallback(async (userId?: string) => {
    try {
      const records = userId ? await apiGetCheckIns(userId) : await apiGetAllCheckIns();
      const mappedCheckIns: CheckIn[] = records.map(r => {
        const zone = zones.find(z => z.id === r.zoneId) || {
          id: r.zoneId || '0', name: 'Desconocida', center: {latitude: 0, longitude: 0}, radius: 100
        };
        const profile = profiles.find(p => p.id === r.userId);
        return {
          id: r.id,
          profileId: r.userId,
          profileName: profile?.name || 'Usuario ' + r.userId,
          zone,
          verification: {
            isMatch: r.isMatch,
            confidence: (r.confidence || 0) / 100,
            matchedProfile: profile || null,
            timestamp: r.timestamp || new Date().toISOString()
          },
          location: r.location,
          timestamp: r.timestamp || new Date().toISOString(),
          evidenciaUrl: r.evidenciaUrl || undefined
        };
      });
      setCheckIns(mappedCheckIns);
    } catch (e) {
      console.error('Error obteniendo historial de asistencias:', e);
    }
  }, [zones, profiles]);

  // Threshold operations
  const setThreshold = useCallback(async (value: number) => {
    const clamped = Math.max(50, Math.min(99, value));
    await saveThreshold(clamped);
    setThresholdState(clamped);
  }, []);

  return (
    <AppContext.Provider
      value={{
          profiles,
          zones,
          checkIns,
          threshold,
          biometricStatus,
          biometricStatusUserId,
          isBiometricStatusLoading,
          locationState: locationHook,
          isLoading,
        addProfile,
        updateProfilePhoto,
        deleteProfile,
        addZone,
        deleteZone,
          addCheckIn,
          clearCheckIns,
          fetchCheckIns,
          refreshBiometricStatus,
          refreshZones,
          setThreshold,
        startLocationTracking: locationHook.startTracking,
        stopLocationTracking: locationHook.stopTracking,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
}
