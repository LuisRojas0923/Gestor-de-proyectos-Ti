import { useCallback, useEffect, useState } from 'react';
import { listarPlantillas } from '../../../../../../services/horariosRelacionesService';
import type { PlantillaHorario } from '../types';

export const usePlantillasHorario = () => {
  const [items, setItems] = useState<PlantillaHorario[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [soloActivas, setSoloActivas] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const limit = 12;

  const recargar = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCargando(true);
      setError(null);
      try {
        const response = await listarPlantillas({
          q: busqueda.trim() || undefined,
          incluir_inactivas: !soloActivas,
          limit,
          offset,
        }, controller.signal);
        setItems(response.items);
        setTotal(response.total);
      } catch (reason: unknown) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'No se pudieron consultar las plantillas');
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [busqueda, offset, revision, soloActivas]);

  return {
    items, total, offset, limit, busqueda, soloActivas, cargando, error,
    setBusqueda: (value: string) => { setBusqueda(value); setOffset(0); },
    setSoloActivas: (value: boolean) => { setSoloActivas(value); setOffset(0); },
    setOffset,
    recargar,
  };
};
