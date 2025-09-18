import { useState, useEffect } from 'react';
import { useApi } from './useApi';
import { DevelopmentQualityControl, QualityControlCatalog } from '../types';

interface UseQualityControlsReturn {
  controls: DevelopmentQualityControl[];
  catalog: QualityControlCatalog[];
  loading: boolean;
  error: string | null;
  loadControls: (developmentId: string) => Promise<void>;
  loadCatalog: () => Promise<void>;
  completeControl: (controlId: number, data: any) => Promise<boolean>;
  validateControl: (controlId: number, data: any) => Promise<boolean>;
  generateControls: (developmentId: string) => Promise<boolean>;
  refreshControls: () => Promise<void>;
}

export const useQualityControls = (developmentId?: string): UseQualityControlsReturn => {
  const { get, post, put } = useApi();
  const [controls, setControls] = useState<DevelopmentQualityControl[]>([]);
  const [catalog, setCatalog] = useState<QualityControlCatalog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadControls = async (devId: string, currentStageOnly: boolean = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await get(`/quality/controls?development_id=${devId}&current_stage_only=${currentStageOnly}`);
      setControls(response || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando controles');
      console.error('Error loading controls:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await get('/quality/catalog');
      setCatalog(response || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando catálogo');
      console.error('Error loading catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  const completeControl = async (controlId: number, data: any): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      await put(`/quality/controls/${controlId}`, {
        status: 'Completado',
        deliverables_provided: data.deliverables,
        deliverables_completed: JSON.stringify(data.deliverables_completed),
        completed_by: data.completed_by,
        completed_at: new Date().toISOString()
      });
      
      // Recargar controles
      if (developmentId) {
        await loadControls(developmentId);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error completando control');
      console.error('Error completing control:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const validateControl = async (controlId: number, data: any): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      await post(`/quality/controls/${controlId}/validate`, {
        validation_status: data.validation_status,
        validation_notes: data.validation_notes,
        validated_by: data.validated_by,
        validated_at: new Date().toISOString()
      });
      
      // Recargar controles
      if (developmentId) {
        await loadControls(developmentId);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error validando control');
      console.error('Error validating control:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const generateControls = async (devId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      await post(`/quality/developments/${devId}/generate-controls`);
      
      // Recargar controles
      await loadControls(devId);
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando controles');
      console.error('Error generating controls:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshControls = async () => {
    if (developmentId) {
      await loadControls(developmentId);
    }
  };

  // Cargar controles cuando cambie el developmentId
  useEffect(() => {
    if (developmentId) {
      loadControls(developmentId);
    }
  }, [developmentId]);

  // Cargar catálogo una vez
  useEffect(() => {
    loadCatalog();
  }, []);

  return {
    controls,
    catalog,
    loading,
    error,
    loadControls,
    loadCatalog,
    completeControl,
    validateControl,
    generateControls,
    refreshControls
  };
};
