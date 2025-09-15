import { useCallback, useState } from 'react';
import {
    Development,
    DevelopmentProgressUpdate,
    DevelopmentStageUpdate,
    DevelopmentUpdate
} from '../types/development';
import { useApi } from './useApi';

interface UseDevelopmentUpdatesReturn {
  loading: boolean;
  error: string | null;
  updateDevelopment: (id: string, data: DevelopmentUpdate) => Promise<Development | null>;
  changeStage: (id: string, data: DevelopmentStageUpdate) => Promise<boolean>;
  updateProgress: (id: string, data: DevelopmentProgressUpdate) => Promise<boolean>;
}

export const useDevelopmentUpdates = (): UseDevelopmentUpdatesReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { put, patch } = useApi();

  const updateDevelopment = useCallback(async (id: string, data: DevelopmentUpdate): Promise<Development | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await put(`/developments/${id}`, data) as Development;
      
      return response;
    } catch (err) {
      console.error('Error updating development:', err);
      setError('Error al actualizar el desarrollo');
      return null;
    } finally {
      setLoading(false);
    }
  }, [put]);

  const changeStage = useCallback(async (id: string, data: DevelopmentStageUpdate): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      await patch(`/developments/${id}/stage`, data);
      
      return true;
    } catch (err) {
      console.error('Error changing stage:', err);
      setError('Error al cambiar la etapa');
      return false;
    } finally {
      setLoading(false);
    }
  }, [patch]);

  const updateProgress = useCallback(async (id: string, data: DevelopmentProgressUpdate): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      await patch(`/developments/${id}/progress`, data);
      
      return true;
    } catch (err) {
      console.error('Error updating progress:', err);
      setError('Error al actualizar el progreso');
      return false;
    } finally {
      setLoading(false);
    }
  }, [patch]);

  return {
    loading,
    error,
    updateDevelopment,
    changeStage,
    updateProgress
  };
};
