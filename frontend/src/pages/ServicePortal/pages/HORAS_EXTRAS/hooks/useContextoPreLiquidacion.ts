import { useEffect, useMemo, useState } from 'react';
import { listarFestivos, listarNovedades } from '../../../../../services/horasExtrasService';
import type { Festivo, NovedadEventoListItem } from '../../../../../types/horasExtras';
import { fechaEnRango, fechaIsoCorta, fechasDeSemanaIso } from '../utils/horarioUtils';
import { CODIGOS_NOVEDAD_SUPRESION } from '../utils/preLiquidacionUtils';

export function useContextoPreLiquidacion(cedula: string, anio: number, semana: number) {
  const [festivosSemana, setFestivosSemana] = useState<Festivo[]>([]);
  const [novedadesSemana, setNovedadesSemana] = useState<NovedadEventoListItem[]>([]);

  const fechasSemana = useMemo(
    () => fechasDeSemanaIso(anio, semana).map(fechaIsoCorta),
    [anio, semana],
  );

  const festivoPorFecha = useMemo(() => {
    const m = new Map<string, Festivo>();
    for (const f of festivosSemana) {
      const key = typeof f.fecha === 'string' ? f.fecha.slice(0, 10) : fechaIsoCorta(new Date(f.fecha));
      m.set(key, f);
    }
    return m;
  }, [festivosSemana]);

  const novedadesPorFecha = useMemo(() => {
    const m = new Map<string, NovedadEventoListItem[]>();
    for (const n of novedadesSemana) {
      if (!(CODIGOS_NOVEDAD_SUPRESION as readonly string[]).includes(n.codigo_novedad)) continue;
      const inicio = n.fecha_inicio.slice(0, 10);
      const fin = n.fecha_fin.slice(0, 10);
      for (const fecha of fechasSemana) {
        if (fechaEnRango(fecha, inicio, fin)) {
          const list = m.get(fecha) ?? [];
          list.push(n);
          m.set(fecha, list);
        }
      }
    }
    return m;
  }, [novedadesSemana, fechasSemana]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const fs = await listarFestivos(anio, 'auto', token);
        if (!cancel) setFestivosSemana(fs);
      } catch {
        if (!cancel) setFestivosSemana([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [anio]);

  useEffect(() => {
    if (!cedula.trim()) {
      setNovedadesSemana([]);
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const r = await listarNovedades(
          { cedula: cedula.trim(), fecha_desde: fechasSemana[0], fecha_hasta: fechasSemana[6], estado: 'CONFIRMADO', limit: 200 },
          token,
        );
        if (!cancel) setNovedadesSemana(r.items);
      } catch {
        if (!cancel) setNovedadesSemana([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [cedula, fechasSemana]);

  return { fechasSemana, festivoPorFecha, novedadesPorFecha };
}
