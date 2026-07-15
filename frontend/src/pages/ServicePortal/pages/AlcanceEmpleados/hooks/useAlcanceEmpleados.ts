import { useEffect, useState } from 'react';
import { listarEmpleadosGestor, listarGestores } from '../../../../../services/horariosRelacionesService';
import type { EmpleadoErpAlcance, FacetasEmpleados, GestorAlcance } from '../../../../../types/horariosRelaciones';

const periodoIsoActual = () => {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return {
    anio: date.getUTCFullYear(),
    semana: Math.ceil((((date.getTime() - start.getTime()) / 86400000) + 1) / 7),
  };
};

export const useAlcanceEmpleados = () => {
  const periodoActual = periodoIsoActual();
  const [gestores, setGestores] = useState<GestorAlcance[]>([]);
  const [gestorId, setGestorId] = useState('');
  const [busquedaGestor, setBusquedaGestor] = useState('');
  const [items, setItems] = useState<EmpleadoErpAlcance[]>([]);
  const [total, setTotal] = useState(0);
  const [facetas, setFacetas] = useState<FacetasEmpleados>({});
  const [q, setQ] = useState('');
  const [anio, setAnio] = useState(periodoActual.anio);
  const [semanaIso, setSemanaIso] = useState(periodoActual.semana);
  const [relacionado, setRelacionado] = useState<boolean | undefined>();
  const [autorizaHe, setAutorizaHe] = useState<boolean | undefined>();
  const [disponible, setDisponible] = useState<boolean | undefined>();
  const [cargos, setCargos] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [ciudades, setCiudades] = useState<string[]>([]);
  const [jefes, setJefes] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargandoGestores, setCargandoGestores] = useState(false);
  const [errorGestores, setErrorGestores] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [revisionGestores, setRevisionGestores] = useState(0);
  const limit = 25;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCargandoGestores(true);
      setErrorGestores(null);
      try {
        const response = await listarGestores(busquedaGestor.trim(), controller.signal);
        setGestores(response.items);
      } catch (reason: unknown) {
        if (!controller.signal.aborted) setErrorGestores(reason instanceof Error ? reason.message : 'No se pudieron cargar los gestores');
      } finally {
        if (!controller.signal.aborted) setCargandoGestores(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [busquedaGestor, revisionGestores]);

  useEffect(() => {
    if (!gestorId) { setItems([]); setTotal(0); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCargando(true); setError(null);
      try {
        const response = await listarEmpleadosGestor(gestorId, {
          q: q.trim() || undefined, anio, semana_iso: semanaIso, relacionado,
          autoriza_he: autorizaHe, disponible_semana: disponible,
          cargos: cargos.length ? cargos : undefined, areas: areas.length ? areas : undefined,
          ciudades: ciudades.length ? ciudades : undefined, jefes: jefes.length ? jefes : undefined,
          orden: 'cedula', direccion: 'asc', limit, offset,
        }, controller.signal);
        setItems(response.items); setTotal(response.total); setFacetas(response.facetas);
      } catch (reason: unknown) {
        if (!controller.signal.aborted) {
          setItems([]);
          setTotal(0);
          setFacetas({});
          setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los empleados');
        }
      } finally { if (!controller.signal.aborted) setCargando(false); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [anio, areas, autorizaHe, cargos, ciudades, disponible, gestorId, jefes, offset, q, relacionado, revision, semanaIso]);

  const resetOffset = () => setOffset(0);
  return {
    gestores, gestorId, busquedaGestor, items, total, facetas, q, anio, semanaIso,
    relacionado, autorizaHe, disponible, cargos, areas, ciudades, jefes, offset, limit, cargando, error,
    cargandoGestores, errorGestores,
    setBusquedagestor: setBusquedaGestor,
    setGestorId: (value: string) => { setGestorId(value); resetOffset(); },
    setQ: (value: string) => { setQ(value); resetOffset(); },
    setAnio: (value: number) => { setAnio(value); resetOffset(); },
    setSemanaIso: (value: number) => { setSemanaIso(value); resetOffset(); },
    setRelacionado: (value: boolean | undefined) => { setRelacionado(value); resetOffset(); },
    setAutorizaHe: (value: boolean | undefined) => { setAutorizaHe(value); resetOffset(); },
    setDisponible: (value: boolean | undefined) => { setDisponible(value); resetOffset(); },
    setCargos: (values: string[]) => { setCargos(values); resetOffset(); },
    setAreas: (values: string[]) => { setAreas(values); resetOffset(); },
    setCiudades: (values: string[]) => { setCiudades(values); resetOffset(); },
    setJefes: (values: string[]) => { setJefes(values); resetOffset(); },
    setOffset,
    recargar: () => setRevision((value) => value + 1),
    recargarGestores: () => setRevisionGestores((value) => value + 1),
  };
};
