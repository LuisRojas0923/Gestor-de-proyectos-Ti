import { useEffect } from 'react';
import {
  guardarBorradorPlanificadorLocal,
  PLANIFICADOR_DRAFT_KEY,
  type PlanificadorDraft,
} from '../utils/planificadorDraft';

export const usePersistirBorradorPlanificador = (
  draft: PlanificadorDraft,
  habilitado = true,
) => {
  const serializado = JSON.stringify(draft);

  useEffect(() => {
    if (!habilitado) {
      window.sessionStorage.removeItem(PLANIFICADOR_DRAFT_KEY);
      return;
    }
    guardarBorradorPlanificadorLocal(JSON.parse(serializado) as PlanificadorDraft);
  }, [habilitado, serializado]);
};
