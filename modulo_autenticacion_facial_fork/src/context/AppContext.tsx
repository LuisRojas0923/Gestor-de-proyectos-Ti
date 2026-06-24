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
    saveProfile as storageSaveProfile,
    saveZone as storageSaveZone,
} from '../services/storage';
import { CheckIn, FaceProfile, LocationState, Zone } from '../types';
import { enrollFace, getCheckIns as apiGetCheckIns, getAllCheckIns as apiGetAllCheckIns, healthCheck } from '../services/faceApi';

interface AppContextType {
  profiles: FaceProfile[];
  zones: Zone[];
  checkIns: CheckIn[];
  threshold: number;
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

        const serverOnline = await healthCheck();
        if (serverOnline) {
          // Enrolar el rostro en el servidor
          await enrollFace(localPhotoUri, id, name);
        }
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

      try {
        const serverOnline = await healthCheck();
        if (serverOnline) {
          const profile = profiles.find(p => p.id === id);
          await enrollFace(localPhotoUri, id, profile?.name);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Error al enrolar rostro en el servidor:', msg);
      }

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
    }
  }, []);

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
    const newZone: Zone = {
      id: Date.now().toString(),
      name,
      center: { latitude, longitude },
      radius,
    };
    try {
      await storageSaveZone(newZone);
      setZones((prev) => [...prev, newZone]);
      return newZone;
    } catch (e) {
      console.error('Error guardando zona:', e);
      throw e;
    }
  }, []);

  const deleteZone = useCallback(async (id: string) => {
    try {
      await storageDeleteZone(id);
      setZones((prev) => prev.filter((z) => z.id !== id));
    } catch (e) {
      console.error('Error borrando zona:', e);
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
          timestamp: r.timestamp || new Date().toISOString()
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
