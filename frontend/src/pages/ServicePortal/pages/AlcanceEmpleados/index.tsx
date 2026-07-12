import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Save, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Input, MaterialCard, Select, Skeleton, Text, Title } from '../../../../components/atoms';
import Callout from '../../../../components/molecules/Callout';
import Modal from '../../../../components/molecules/Modal';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import { guardarRelaciones } from '../../../../services/horariosRelacionesService';
import type { EmpleadoErpAlcance } from './types';
import EmpleadosRelacionCards from './components/EmpleadosRelacionCards';
import EmpleadosRelacionTable from './components/EmpleadosRelacionTable';
import { useAlcanceEmpleados } from './hooks/useAlcanceEmpleados';

const valorBooleano = (value: string): boolean | undefined => value === '' ? undefined : value === 'true';
const opcionesFaceta = (items: string[] | undefined) => [
  { value: '', label: 'Todos' },
  ...(items ?? []).map((value) => ({ value, label: value })),
];
const MAX_CAMBIOS = 200;

const AlcanceEmpleadosPage = () => {
  const navigate = useNavigate();
  const datos = useAlcanceEmpleados();
  const { addNotification } = useNotifications();
  const [altas, setAltas] = useState<Set<string>>(new Set());
  const [bajas, setBajas] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState(false);
  const [gestorPendiente, setGestorPendiente] = useState<string | null>(null);
  const solicitudRef = useRef<{ payload: string; id: string } | null>(null);
  const enviandoRef = useRef(false);
  const hayCambios = altas.size > 0 || bajas.size > 0;
  const cantidadCambios = altas.size + bajas.size;

  useEffect(() => {
    const advertirSalida = (event: BeforeUnloadEvent) => {
      if (!hayCambios) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', advertirSalida);
    return () => window.removeEventListener('beforeunload', advertirSalida);
  }, [hayCambios]);

  const seleccionado = (item: EmpleadoErpAlcance) => altas.has(item.cedula) || (!!item.relacionado && !bajas.has(item.cedula));
  const toggle = (item: EmpleadoErpAlcance) => {
    const eliminaCambio = item.relacionado ? bajas.has(item.cedula) : altas.has(item.cedula);
    if (!eliminaCambio && cantidadCambios >= MAX_CAMBIOS) {
      addNotification('warning', `Solo puedes preparar ${MAX_CAMBIOS} cambios por guardado.`);
      return;
    }
    solicitudRef.current = null;
    if (item.relacionado) setBajas((current) => { const next = new Set(current); if (next.has(item.cedula)) next.delete(item.cedula); else next.add(item.cedula); return next; });
    else setAltas((current) => { const next = new Set(current); if (next.has(item.cedula)) next.delete(item.cedula); else next.add(item.cedula); return next; });
  };
  const paginaSeleccionada = datos.items.length > 0 && datos.items.every(seleccionado);
  const seleccionarPagina = () => {
    solicitudRef.current = null;
    const seleccionar = !paginaSeleccionada;
    const nextAltas = new Set(altas);
    const nextBajas = new Set(bajas);
    datos.items.forEach((item) => {
      const cambios = nextAltas.size + nextBajas.size;
      if (item.relacionado) {
        if (seleccionar) nextBajas.delete(item.cedula);
        else if (cambios < MAX_CAMBIOS) nextBajas.add(item.cedula);
      } else if (seleccionar && cambios < MAX_CAMBIOS) nextAltas.add(item.cedula);
      else if (!seleccionar) nextAltas.delete(item.cedula);
    });
    setAltas(nextAltas);
    setBajas(nextBajas);
    if (nextAltas.size + nextBajas.size === MAX_CAMBIOS && datos.items.some((item) => !seleccionado(item))) {
      addNotification('warning', `Se alcanzó el máximo de ${MAX_CAMBIOS} cambios.`);
    }
  };
  const aplicarCambioGestor = (next: string) => {
    setAltas(new Set());
    setBajas(new Set());
    solicitudRef.current = null;
    datos.setGestorId(next);
    setGestorPendiente(null);
  };
  const cambiarGestor = (next: string) => {
    if (hayCambios) setGestorPendiente(next);
    else aplicarCambioGestor(next);
  };
  const guardar = async () => {
    if (!datos.gestorId || enviandoRef.current || !hayCambios || cantidadCambios > MAX_CAMBIOS) return;
    enviandoRef.current = true;
    setGuardando(true);
    try {
      const cedulasAgregar = [...altas].sort();
      const cedulasQuitar = [...bajas].sort();
      const payloadKey = JSON.stringify([datos.gestorId, cedulasAgregar, cedulasQuitar]);
      if (solicitudRef.current?.payload !== payloadKey) solicitudRef.current = { payload: payloadKey, id: crypto.randomUUID() };
      const result = await guardarRelaciones(datos.gestorId, { solicitud_id: solicitudRef.current.id, cedulas_agregar: cedulasAgregar, cedulas_quitar: cedulasQuitar });
      addNotification('success', `Relaciones guardadas: ${result.agregadas + result.reactivadas} altas, ${result.desactivadas} bajas y ${result.sin_cambio} sin cambio`);
      setAltas(new Set());
      setBajas(new Set());
      solicitudRef.current = null;
      datos.recargar();
      datos.recargarGestores();
    } catch (reason: unknown) {
      addNotification('error', reason instanceof Error ? reason.message : 'No se pudieron guardar las relaciones');
    } finally {
      enviandoRef.current = false;
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div><Button variant="ghost" icon={ArrowLeft} className="-ml-2 mb-2" onClick={() => navigate('/service-portal/tiempo-asistencia')}>Volver a Tiempo y Asistencia</Button><Title variant="h3">Alcance de empleados</Title><Text color="text-secondary">Administra qué empleados ERP puede operar cada gestor.</Text></div>
      <MaterialCard className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
        <Input label="Buscar gestor" value={datos.busquedaGestor} onChange={(event) => datos.setBusquedagestor(event.target.value)} placeholder="Nombre" />
        <Select label="Gestor" value={datos.gestorId} disabled={datos.cargandoGestores} onChange={(event) => cambiarGestor(event.target.value)} options={[{ value: '', label: datos.cargandoGestores ? 'Consultando gestores...' : 'Selecciona un gestor' }, ...datos.gestores.map((item) => ({ value: item.id, label: `${item.nombre} · ${item.rol} (${item.relaciones_activas})` }))]} />
        <Input label="Año ISO" type="number" min={2020} max={2100} value={datos.anio} onChange={(event) => datos.setAnio(Number(event.target.value))} />
        <Input label="Semana ISO" type="number" min={1} max={53} value={datos.semanaIso} onChange={(event) => datos.setSemanaIso(Number(event.target.value))} />
      </MaterialCard>
      {datos.errorGestores && <Callout variant="error" role="alert">{datos.errorGestores}</Callout>}
      {datos.gestorId && <>
        <MaterialCard className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <Input label="Buscar empleado" value={datos.q} onChange={(event) => datos.setQ(event.target.value)} placeholder="Nombre, cédula, cargo, área o jefe" className="sm:col-span-2" />
          <Select label="Relación" value={datos.relacionado === undefined ? '' : String(datos.relacionado)} onChange={(event) => datos.setRelacionado(valorBooleano(event.target.value))} options={[{ value: '', label: 'Todas' }, { value: 'true', label: 'Relacionados' }, { value: 'false', label: 'No relacionados' }]} />
          <Select label="Autoriza HE" value={datos.autorizaHe === undefined ? '' : String(datos.autorizaHe)} onChange={(event) => datos.setAutorizaHe(valorBooleano(event.target.value))} options={[{ value: '', label: 'Todos' }, { value: 'true', label: 'Autoriza' }, { value: 'false', label: 'No autoriza' }]} />
          <Select label="Disponibilidad" value={datos.disponible === undefined ? '' : String(datos.disponible)} onChange={(event) => datos.setDisponible(valorBooleano(event.target.value))} options={[{ value: '', label: 'Todos' }, { value: 'true', label: 'Disponible' }, { value: 'false', label: 'No disponible' }]} />
          <Select label="Cargo" value={datos.cargo} onChange={(event) => datos.setCargo(event.target.value)} options={opcionesFaceta(datos.facetas.cargos)} />
          <Select label="Área" value={datos.area} onChange={(event) => datos.setArea(event.target.value)} options={opcionesFaceta(datos.facetas.areas)} />
          <Select label="Ciudad" value={datos.ciudad} onChange={(event) => datos.setCiudad(event.target.value)} options={opcionesFaceta(datos.facetas.ciudades)} />
          <Select label="Jefe" value={datos.jefe} onChange={(event) => datos.setJefe(event.target.value)} options={opcionesFaceta(datos.facetas.jefes)} />
        </MaterialCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
          <div className="flex flex-wrap gap-2"><Badge variant="info">{datos.total} resultados</Badge><Badge variant="success">{altas.size} altas</Badge><Badge variant="warning">{bajas.size} bajas</Badge></div>
          <div className="flex flex-col gap-2 sm:flex-row"><Button variant="ghost" icon={Users} onClick={seleccionarPagina} disabled={datos.cargando || !datos.items.length}>{paginaSeleccionada ? 'Quitar página' : 'Seleccionar página'}</Button><Button variant="primary" icon={Save} onClick={guardar} disabled={guardando || !hayCambios}>{guardando ? 'Guardando...' : 'Guardar cambios'}</Button></div>
        </div>
        {cantidadCambios >= MAX_CAMBIOS && <Callout variant="warning" role="status">Máximo alcanzado: {MAX_CAMBIOS} cambios por guardado. Quita un cambio para seleccionar otro empleado.</Callout>}
        {datos.error && <Callout variant="error" role="alert" title="No fue posible cargar el catálogo">{datos.error}<Button variant="ghost" size="sm" onClick={datos.recargar}>Reintentar</Button></Callout>}
        <MaterialCard className="hidden overflow-hidden p-0 md:block" aria-busy={datos.cargando}><EmpleadosRelacionTable items={datos.items} cargando={datos.cargando} seleccionado={seleccionado} onToggle={toggle} /></MaterialCard>
        <div className="md:hidden" aria-busy={datos.cargando}>{datos.cargando ? Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="mb-3 h-44 rounded-2xl" />) : <EmpleadosRelacionCards items={datos.items} seleccionado={seleccionado} onToggle={toggle} />}</div>
        {!datos.cargando && !datos.error && !datos.items.length && <Callout variant="info">No hay empleados que coincidan con los filtros.</Callout>}
        <div className="flex items-center justify-center gap-3"><Button variant="ghost" disabled={datos.cargando || datos.offset === 0} onClick={() => datos.setOffset(Math.max(0, datos.offset - datos.limit))}>Anterior</Button><Text className="text-xs">{datos.total === 0 ? 0 : datos.offset + 1}-{Math.min(datos.offset + datos.limit, datos.total)} de {datos.total}</Text><Button variant="ghost" disabled={datos.cargando || datos.offset + datos.limit >= datos.total} onClick={() => datos.setOffset(datos.offset + datos.limit)}>Siguiente</Button></div>
      </>}
      {!datos.gestorId && <Callout variant="info">Selecciona un gestor para consultar y administrar sus relaciones.</Callout>}
      <Modal isOpen={gestorPendiente !== null} onClose={() => setGestorPendiente(null)} title="Descartar cambios pendientes" size="sm">
        <div className="space-y-4">
          <Text>Al cambiar de gestor se perderán {altas.size + bajas.size} cambios sin guardar.</Text>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={() => setGestorPendiente(null)}>Continuar editando</Button><Button variant="danger" onClick={() => aplicarCambioGestor(gestorPendiente ?? '')}>Descartar y cambiar</Button></div>
        </div>
      </Modal>
    </div>
  );
};

export default AlcanceEmpleadosPage;
