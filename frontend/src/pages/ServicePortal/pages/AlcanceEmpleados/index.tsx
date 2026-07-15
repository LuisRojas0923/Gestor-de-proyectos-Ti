import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CalendarDays, Save, Search, UserRoundSearch, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Input, MaterialCard, Select, Skeleton, Text, Title } from '../../../../components/atoms';
import { MultiSelect } from '../../../../components/atoms/MultiSelect';
import Callout from '../../../../components/molecules/Callout';
import Modal from '../../../../components/molecules/Modal';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import { guardarRelaciones } from '../../../../services/horariosRelacionesService';
import type { EmpleadoErpAlcance } from './types';
import EmpleadosRelacionCards from './components/EmpleadosRelacionCards';
import EmpleadosRelacionTable from './components/EmpleadosRelacionTable';
import { useAlcanceEmpleados } from './hooks/useAlcanceEmpleados';

const valorBooleano = (value: string): boolean | undefined => value === '' ? undefined : value === 'true';
const opcionesFaceta = (items: string[] | undefined) => (items ?? []).map((value) => ({ value, label: value }));
const filtroBooleano = (value: boolean | undefined, positivo: string, negativo: string) => (
  new Set(value === undefined ? [] : [value ? positivo : negativo])
);
const leerFiltroBooleano = (values: Set<string>, positivo: string, negativo: string) => {
  if (values.size !== 1) return undefined;
  const [value] = values;
  if (value === positivo) return true;
  if (value === negativo) return false;
  return undefined;
};
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
  const filtrosTabla = {
    cargo: new Set(datos.cargos),
    area: new Set(datos.areas),
    ciudad: new Set(datos.ciudades),
    jefe: new Set(datos.jefes),
    relacionado: filtroBooleano(datos.relacionado, 'Relacionado', 'No relacionado'),
    autoriza_he: filtroBooleano(datos.autorizaHe, 'Autoriza', 'No autoriza'),
    disponible_semana: filtroBooleano(datos.disponible, 'Disponible', 'No disponible'),
  };
  const opcionesTabla = {
    cargo: datos.facetas.cargos ?? [],
    area: datos.facetas.areas ?? [],
    ciudad: datos.facetas.ciudades ?? [],
    jefe: datos.facetas.jefes ?? [],
    relacionado: ['Relacionado', 'No relacionado'],
    autoriza_he: ['Autoriza', 'No autoriza'],
    disponible_semana: ['Disponible', 'No disponible'],
  };
  const cantidadFiltros = Number(!!datos.q.trim())
    + Number(datos.cargos.length > 0) + Number(datos.areas.length > 0)
    + Number(datos.ciudades.length > 0) + Number(datos.jefes.length > 0)
    + Number(datos.relacionado !== undefined) + Number(datos.autorizaHe !== undefined) + Number(datos.disponible !== undefined);

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
  const cambiarFiltroTabla = (columnKey: string, filter: Set<string>) => {
    const values = Array.from(filter);
    if (columnKey === 'cargo') datos.setCargos(values);
    if (columnKey === 'area') datos.setAreas(values);
    if (columnKey === 'ciudad') datos.setCiudades(values);
    if (columnKey === 'jefe') datos.setJefes(values);
    if (columnKey === 'relacionado') datos.setRelacionado(leerFiltroBooleano(filter, 'Relacionado', 'No relacionado'));
    if (columnKey === 'autoriza_he') datos.setAutorizaHe(leerFiltroBooleano(filter, 'Autoriza', 'No autoriza'));
    if (columnKey === 'disponible_semana') datos.setDisponible(leerFiltroBooleano(filter, 'Disponible', 'No disponible'));
  };
  const limpiarFiltros = () => {
    datos.setQ('');
    datos.setRelacionado(undefined);
    datos.setAutorizaHe(undefined);
    datos.setDisponible(undefined);
    datos.setCargos([]);
    datos.setAreas([]);
    datos.setCiudades([]);
    datos.setJefes([]);
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
    <div className="mx-auto max-w-[1500px] space-y-4">
      <MaterialCard className="overflow-hidden border-[var(--color-primary)]/20 p-0 shadow-md shadow-[var(--color-primary)]/5">
        <div className="bg-gradient-to-br from-[var(--color-primary)]/15 via-[var(--color-surface)] to-[var(--color-surface-variant)] p-4 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/service-portal/tiempo-asistencia')}
                aria-label="Volver a Tiempo y Asistencia"
                title="Volver a Tiempo y Asistencia"
                className="h-11 w-11 shrink-0 !rounded-xl !border !border-[var(--color-border)]/70 !bg-[var(--color-surface)]/80 !p-0 shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/12 text-[var(--color-primary)]">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <Title variant="h3" className="!m-0 !text-xl leading-tight md:!text-2xl">Alcance de empleados</Title>
                <Text variant="caption" className="mt-0.5 !text-xs text-[var(--color-text-secondary)]">
                  Define qué empleados ERP puede gestionar cada responsable del portal.
                </Text>
              </div>
            </div>
            <Badge size="sm" variant="info" className="self-start sm:self-auto">Administración</Badge>
          </div>
        </div>
      </MaterialCard>

      <MaterialCard className="overflow-hidden border-[var(--color-border)]/70 p-0 shadow-sm">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)]/60 bg-[var(--color-surface-variant)]/40 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <UserRoundSearch className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <Title variant="h4" className="!m-0 !text-sm">Contexto de administración</Title>
            <Text variant="caption" className="!text-[10px] text-[var(--color-text-secondary)]">Selecciona el gestor y la semana que deseas administrar.</Text>
          </div>
        </div>
        <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,0.8fr)_minmax(320px,1.25fr)_140px_140px] xl:items-end">
          <Input size="sm" label="Buscar gestor" value={datos.busquedaGestor} onChange={(event) => datos.setBusquedagestor(event.target.value)} placeholder="Nombre del gestor" className="[&_label]:!text-xs" />
          <Select size="sm" label="Gestor" value={datos.gestorId} disabled={datos.cargandoGestores} onChange={(event) => cambiarGestor(event.target.value)} className="[&_label]:!text-xs" options={[{ value: '', label: datos.cargandoGestores ? 'Consultando gestores...' : 'Selecciona un gestor' }, ...datos.gestores.map((item) => ({ value: item.id, label: `${item.nombre} · ${item.rol} (${item.relaciones_activas})` }))]} />
          <Input size="sm" label="Año ISO" type="number" min={2020} max={2100} value={datos.anio} onChange={(event) => datos.setAnio(Number(event.target.value))} className="[&_label]:!text-xs" />
          <Input size="sm" label="Semana ISO" type="number" min={1} max={53} value={datos.semanaIso} onChange={(event) => datos.setSemanaIso(Number(event.target.value))} className="[&_label]:!text-xs" />
        </div>
      </MaterialCard>
      {datos.errorGestores && <Callout variant="error" role="alert">{datos.errorGestores}</Callout>}
      {datos.gestorId && <>
        <MaterialCard className="overflow-hidden border-[var(--color-border)]/70 p-0 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)]/60 bg-[var(--color-surface-variant)]/30 px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
            <div className="min-w-0">
              <Title variant="h4" className="!m-0 !text-sm">Buscar y filtrar empleados ERP</Title>
              <Text variant="caption" className="!text-[10px] text-[var(--color-text-secondary)]">Usa la búsqueda general y los filtros disponibles para acotar el catálogo.</Text>
            </div>
          </div>
          <div className="grid gap-3 p-3">
            <Input size="sm" label="Buscar empleado" value={datos.q} onChange={(event) => datos.setQ(event.target.value)} placeholder="Nombre, cédula, cargo, área o jefe" className="max-w-2xl [&_label]:!text-xs" />
            <div className="grid gap-3 sm:grid-cols-2 md:hidden">
              <Select size="sm" label="Relación" value={datos.relacionado === undefined ? '' : String(datos.relacionado)} onChange={(event) => datos.setRelacionado(valorBooleano(event.target.value))} className="[&_label]:!text-xs" options={[{ value: '', label: 'Todas' }, { value: 'true', label: 'Relacionados' }, { value: 'false', label: 'No relacionados' }]} />
              <Select size="sm" label="Autoriza HE" value={datos.autorizaHe === undefined ? '' : String(datos.autorizaHe)} onChange={(event) => datos.setAutorizaHe(valorBooleano(event.target.value))} className="[&_label]:!text-xs" options={[{ value: '', label: 'Todos' }, { value: 'true', label: 'Autoriza' }, { value: 'false', label: 'No autoriza' }]} />
              <Select size="sm" label="Disponibilidad" value={datos.disponible === undefined ? '' : String(datos.disponible)} onChange={(event) => datos.setDisponible(valorBooleano(event.target.value))} className="[&_label]:!text-xs" options={[{ value: '', label: 'Todos' }, { value: 'true', label: 'Disponible' }, { value: 'false', label: 'No disponible' }]} />
              <MultiSelect size="sm" label="Cargo" value={datos.cargos} onChange={datos.setCargos} options={opcionesFaceta(datos.facetas.cargos)} placeholder="Todos" />
              <MultiSelect size="sm" label="Área" value={datos.areas} onChange={datos.setAreas} options={opcionesFaceta(datos.facetas.areas)} placeholder="Todas" />
              <MultiSelect size="sm" label="Ciudad" value={datos.ciudades} onChange={datos.setCiudades} options={opcionesFaceta(datos.facetas.ciudades)} placeholder="Todas" />
              <MultiSelect size="sm" label="Jefe" value={datos.jefes} onChange={datos.setJefes} options={opcionesFaceta(datos.facetas.jefes)} placeholder="Todos" />
            </div>
          </div>
        </MaterialCard>
        <MaterialCard elevation={0} className="flex flex-col gap-3 border-[var(--color-border)]/70 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
          <div className="flex flex-wrap gap-2"><Badge variant="info">{datos.total} resultados</Badge><Badge variant="success">{altas.size} altas</Badge><Badge variant="warning">{bajas.size} bajas</Badge>{cantidadFiltros > 0 && <Badge variant="primary">{cantidadFiltros} filtros activos</Badge>}</div>
          <div className="flex flex-col gap-2 sm:flex-row">{cantidadFiltros > 0 && <Button variant="ghost" onClick={limpiarFiltros}>Limpiar filtros</Button>}<Button variant="ghost" icon={Users} onClick={seleccionarPagina} disabled={datos.cargando || !datos.items.length}>{paginaSeleccionada ? 'Quitar página' : 'Seleccionar página'}</Button><Button variant="primary" icon={Save} onClick={guardar} disabled={guardando || !hayCambios}>{guardando ? 'Guardando...' : 'Guardar cambios'}</Button></div>
        </MaterialCard>
        {cantidadCambios >= MAX_CAMBIOS && <Callout variant="warning" role="status">Máximo alcanzado: {MAX_CAMBIOS} cambios por guardado. Quita un cambio para seleccionar otro empleado.</Callout>}
        {datos.error && <Callout variant="error" role="alert" title="No fue posible cargar el catálogo">{datos.error}<Button variant="ghost" size="sm" onClick={datos.recargar}>Reintentar</Button></Callout>}
        <MaterialCard className="hidden overflow-hidden p-0 md:block" aria-busy={datos.cargando}><EmpleadosRelacionTable items={datos.items} cargando={datos.cargando} columnFilters={filtrosTabla} columnOptions={opcionesTabla} seleccionado={seleccionado} onFilterChange={cambiarFiltroTabla} onToggle={toggle} /></MaterialCard>
        <div className="md:hidden" aria-busy={datos.cargando}>{datos.cargando ? Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="mb-3 h-44 rounded-2xl" />) : <EmpleadosRelacionCards items={datos.items} seleccionado={seleccionado} onToggle={toggle} />}</div>
        {!datos.cargando && !datos.error && !datos.items.length && <Callout variant="info">No hay empleados que coincidan con los filtros.</Callout>}
        <div className="flex items-center justify-center gap-3"><Button variant="ghost" disabled={datos.cargando || datos.offset === 0} onClick={() => datos.setOffset(Math.max(0, datos.offset - datos.limit))}>Anterior</Button><Text className="text-xs">{datos.total === 0 ? 0 : datos.offset + 1}-{Math.min(datos.offset + datos.limit, datos.total)} de {datos.total}</Text><Button variant="ghost" disabled={datos.cargando || datos.offset + datos.limit >= datos.total} onClick={() => datos.setOffset(datos.offset + datos.limit)}>Siguiente</Button></div>
      </>}
      {!datos.gestorId && (
        <MaterialCard elevation={0} className="border-dashed border-[var(--color-primary)]/30 bg-[var(--color-primary)]/[0.03] p-8 shadow-none md:p-10">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <CalendarDays className="h-6 w-6" />
            </div>
            <Title variant="h4" className="!m-0 !text-lg">Selecciona un gestor para comenzar</Title>
            <Text variant="caption" className="mt-1 max-w-xl !text-xs leading-relaxed text-[var(--color-text-secondary)]">
              Selecciona un gestor para consultar y administrar sus relaciones. Después podrás filtrar el catálogo ERP y preparar altas o bajas para la semana elegida.
            </Text>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Badge size="sm" variant="default">1. Busca el gestor</Badge>
              <Badge size="sm" variant="default">2. Define la semana</Badge>
              <Badge size="sm" variant="info">3. Asigna empleados</Badge>
            </div>
          </div>
        </MaterialCard>
      )}
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
