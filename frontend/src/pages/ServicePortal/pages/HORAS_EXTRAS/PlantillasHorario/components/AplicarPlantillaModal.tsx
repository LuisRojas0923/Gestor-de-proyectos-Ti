import { useEffect, useState } from 'react';
import Badge from '../../../../../../components/atoms/Badge';
import Button from '../../../../../../components/atoms/Button';
import Checkbox from '../../../../../../components/atoms/Checkbox';
import Input from '../../../../../../components/atoms/Input';
import MaterialCard from '../../../../../../components/atoms/MaterialCard';
import Select from '../../../../../../components/atoms/Select';
import Skeleton from '../../../../../../components/atoms/Skeleton';
import { Text } from '../../../../../../components/atoms/Text';
import Callout from '../../../../../../components/molecules/Callout';
import Modal from '../../../../../../components/molecules/Modal';
import { listarEmpleadosOperativos } from '../../../../../../services/horariosRelacionesService';
import type { EmpleadoErpAlcance, PlantillaHorario } from '../../../../../../types/horariosRelaciones';

interface AplicarPlantillaModalProps {
  open: boolean;
  plantilla: PlantillaHorario | null;
  guardando: boolean;
  onClose: () => void;
  onApply: (cedulas: string[]) => void;
  onSelectionChange?: () => void;
}

const valorBooleano = (value: string): boolean | undefined => value === '' ? undefined : value === 'true';

const semanaIsoActual = (): { anio: number; semana: number } => {
  const fecha = new Date();
  const utc = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const inicio = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return { anio: utc.getUTCFullYear(), semana: Math.ceil((((utc.getTime() - inicio.getTime()) / 86400000) + 1) / 7) };
};

const AplicarPlantillaModal = ({ open, plantilla, guardando, onClose, onApply, onSelectionChange }: AplicarPlantillaModalProps) => {
  const actual = semanaIsoActual();
  const [items, setItems] = useState<EmpleadoErpAlcance[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [autorizaHe, setAutorizaHe] = useState<boolean | undefined>();
  const [disponible, setDisponible] = useState<boolean | undefined>();
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [revision, setRevision] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (!open) return;
    setSeleccion(new Set());
    setOffset(0);
    setBusqueda('');
    setAutorizaHe(undefined);
    setDisponible(undefined);
  }, [open, plantilla?.id]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCargando(true);
      setError('');
      try {
        const response = await listarEmpleadosOperativos({
          q: busqueda.trim() || undefined,
          anio: actual.anio,
          semana_iso: actual.semana,
          autoriza_he: autorizaHe,
          disponible_semana: disponible,
          orden: 'cedula',
          direccion: 'asc',
          limit,
          offset,
        }, controller.signal);
        setItems(response.items);
        setTotal(response.total);
      } catch (reason: unknown) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'No se pudieron consultar empleados');
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [actual.anio, actual.semana, autorizaHe, busqueda, disponible, offset, open, revision]);

  const toggle = (cedula: string) => {
    onSelectionChange?.();
    setSeleccion((current) => {
      const next = new Set(current);
      if (next.has(cedula)) next.delete(cedula); else if (next.size < 200) next.add(cedula);
      return next;
    });
  };
  const paginaSeleccionada = items.length > 0 && items.every((item) => seleccion.has(item.cedula));
  const seleccionarPagina = () => {
    onSelectionChange?.();
    setSeleccion((current) => {
      const next = new Set(current);
      items.forEach((item) => {
        if (paginaSeleccionada) next.delete(item.cedula);
        else if (next.size < 200) next.add(item.cedula);
      });
      return next;
    });
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={`Aplicar ${plantilla?.nombre ?? 'plantilla'}`} size="xl" closeOnOverlayClick={!guardando} closeOnEscape={!guardando} closeButtonDisabled={guardando}>
      <div className="space-y-3">
        <Callout variant="info">Versión {plantilla?.version}. Se aplicará de forma atómica a {seleccion.size} empleados.</Callout>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Buscar empleado" value={busqueda} onChange={(event) => { setBusqueda(event.target.value); setOffset(0); }} placeholder="Nombre, cédula o cargo" />
          <Select label="Autoriza HE" value={autorizaHe === undefined ? '' : String(autorizaHe)} onChange={(event) => { setAutorizaHe(valorBooleano(event.target.value)); setOffset(0); }} options={[{ value: '', label: 'Todos' }, { value: 'true', label: 'Autoriza' }, { value: 'false', label: 'No autoriza' }]} />
          <Select label="Disponibilidad" value={disponible === undefined ? '' : String(disponible)} onChange={(event) => { setDisponible(valorBooleano(event.target.value)); setOffset(0); }} options={[{ value: '', label: 'Todos' }, { value: 'true', label: 'Disponible' }, { value: 'false', label: 'No disponible' }]} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2" aria-live="polite">
          <Badge variant="info">{seleccion.size} seleccionados</Badge>
          <Button variant="ghost" size="sm" onClick={seleccionarPagina} disabled={cargando || items.length === 0}>{paginaSeleccionada ? 'Quitar página' : 'Seleccionar página'}</Button>
        </div>
        {seleccion.size === 200 && <Callout variant="warning">Alcanzaste el máximo de 200 empleados por aplicación.</Callout>}
        {error && <Callout variant="error" role="alert" title="No fue posible cargar empleados">{error}<Button variant="ghost" size="sm" onClick={() => setRevision((value) => value + 1)}>Reintentar</Button></Callout>}
        <div className="max-h-[50vh] space-y-2 overflow-y-auto" aria-label="Empleados disponibles" aria-busy={cargando}>
          {cargando ? Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-16 rounded-2xl" />) : items.map((empleado) => (
            <MaterialCard key={empleado.cedula} elevation={0} className="flex min-h-14 items-center gap-3 p-3">
              <Checkbox checked={seleccion.has(empleado.cedula)} onChange={() => toggle(empleado.cedula)} aria-label={`Seleccionar ${empleado.nombre ?? empleado.cedula}`} className="min-h-11 min-w-11 justify-center" />
              <div className="min-w-0 flex-1">
                <Text className="truncate font-semibold">{empleado.nombre ?? 'Sin nombre'}</Text>
                <Text className="text-xs text-[var(--color-text-secondary)]">{empleado.cedula} · {empleado.cargo ?? 'Sin cargo'}</Text>
              </div>
              <div className="hidden flex-col items-end gap-1 sm:flex">
                <Badge size="xs" variant={empleado.autoriza_he ? 'success' : 'warning'}>{empleado.autoriza_he ? 'Autoriza' : 'No autoriza'}</Badge>
                <Badge size="xs" variant={empleado.disponible_semana ? 'info' : 'warning'}>{empleado.disponible_semana ? 'Disponible' : 'No disponible'}</Badge>
              </div>
            </MaterialCard>
          ))}
          {!cargando && !error && items.length === 0 && <Text className="py-8 text-center text-[var(--color-text-secondary)]">No hay empleados para los filtros actuales.</Text>}
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" disabled={offset === 0 || cargando} onClick={() => setOffset(Math.max(0, offset - limit))}>Anterior</Button>
          <Text className="text-xs">{total === 0 ? 0 : offset + 1}-{Math.min(offset + limit, total)} de {total}</Text>
          <Button variant="ghost" disabled={offset + limit >= total || cargando} onClick={() => setOffset(offset + limit)}>Siguiente</Button>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button variant="primary" onClick={() => onApply([...seleccion])} disabled={guardando || seleccion.size === 0}>{guardando ? 'Aplicando...' : `Aplicar a ${seleccion.size}`}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default AplicarPlantillaModal;
