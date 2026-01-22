import { useCallback, useEffect, useState } from 'react';
import {
  DevelopmentObservation,
  DevelopmentObservationCreate,
  DevelopmentObservationUpdate
} from '../types/development';
import { useApi } from './useApi';

interface UseObservationsReturn {
  observations: DevelopmentObservation[];
  loading: boolean;
  error: string | null;
  createObservation: (data: DevelopmentObservationCreate) => Promise<DevelopmentObservation | null>;
  updateObservation: (id: number, data: DevelopmentObservationUpdate) => Promise<DevelopmentObservation | null>;
  deleteObservation: (id: number) => Promise<boolean>;
  refreshObservations: () => Promise<void>;
}

export const useObservations = (developmentId: string | null): UseObservationsReturn => {
  const [observations, setObservations] = useState<DevelopmentObservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { get, post, put, delete: deleteRequest } = useApi();

  const loadObservations = useCallback(async () => {
    if (!developmentId) {
      setObservations([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await get(`/desarrollos/${developmentId}/observations`) as DevelopmentObservation[];
      setObservations(response || []);
    } catch (err) {
      console.error('Error loading observations:', err);
      setError('Error al cargar las observaciones');
      setObservations([]);
    } finally {
      setLoading(false);
    }
  }, [developmentId, get]);

  const createObservation = useCallback(async (data: DevelopmentObservationCreate): Promise<DevelopmentObservation | null> => {
    if (!developmentId) {
      setError('No hay desarrollo seleccionado');
      return null;
    }

    try {
      setError(null);

      const response = await post(`/desarrollos/${developmentId}/observations`, data) as DevelopmentObservation;

      // Actualizar la lista local
      setObservations(prev => [response, ...prev]);

      return response;
    } catch (err) {
      console.error('Error creating observation:', err);
      setError('Error al crear la observación');
      return null;
    }
  }, [developmentId, post]);

  const updateObservation = useCallback(async (id: number, data: DevelopmentObservationUpdate): Promise<DevelopmentObservation | null> => {
    if (!developmentId) {
      setError('No hay desarrollo seleccionado');
      return null;
    }

    try {
      setError(null);

      const response = await put(`/desarrollos/${developmentId}/observations/${id}`, data) as DevelopmentObservation;

      // Actualizar la lista local
      setObservations(prev =>
        prev.map(obs => obs.id === id ? response : obs)
      );

      return response;
    } catch (err) {
      console.error('Error updating observation:', err);
      setError('Error al actualizar la observación');
      return null;
    }
  }, [developmentId, put]);

  const deleteObservation = useCallback(async (id: number): Promise<boolean> => {
    if (!developmentId) {
      setError('No hay desarrollo seleccionado');
      return false;
    }

    try {
      setError(null);

      await deleteRequest(`/desarrollos/${developmentId}/observations/${id}`); // [CONTROLADO]

      // Actualizar la lista local
      setObservations(prev => prev.filter(obs => obs.id !== id));

      return true;
    } catch (err) {
      console.error('Error deleting observation:', err);
      setError('Error al eliminar la observación');
      return false;
    }
  }, [developmentId, deleteRequest]);

  const refreshObservations = useCallback(async () => {
    await loadObservations();
  }, [loadObservations]);

  // Cargar observaciones cuando cambie el developmentId
  useEffect(() => {
    loadObservations();
  }, [loadObservations]);

  return {
    observations,
    loading,
    error,
    createObservation,
    updateObservation,
    deleteObservation,
    refreshObservations
  };
};
