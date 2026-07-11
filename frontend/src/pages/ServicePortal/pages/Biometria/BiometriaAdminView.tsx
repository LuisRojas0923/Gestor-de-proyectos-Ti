import { useEffect, useState } from 'react';
import axios from 'axios';
import { Eye, Map, MapPin, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Input, MaterialCard, Select, Spinner, Text, Title } from '../../../../components/atoms';
import Callout from '../../../../components/molecules/Callout';
import { DataTable, type DataTableColumn } from '../../../../components/molecules/DataTable';
import Modal from '../../../../components/molecules/Modal';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import { API_CONFIG, API_ENDPOINTS } from '../../../../config/api';
import { useIsAdmin } from '../../../../hooks/useIsAdmin';
import { listarAsistenciasBiometria, obtenerEvidenciaBiometria } from '../../../../services/horariosRelacionesService';
import type { AsistenciaBiometriaAdmin } from '../../../../types/horariosRelaciones';

interface Zona {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
  radio: number;
}

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const fechaLegible = (value: string | null) => value
  ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'No disponible';

const BiometriaAdminView = () => {
  const isAdmin = useIsAdmin();
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<'zonas' | 'asistencias'>('asistencias');
  const [asistencias, setAsistencias] = useState<AsistenciaBiometriaAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [usuarioId, setUsuarioId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [resultado, setResultado] = useState<boolean | undefined>();
  const [cargandoAsistencias, setCargandoAsistencias] = useState(false);
  const [errorAsistencias, setErrorAsistencias] = useState('');
  const [revision, setRevision] = useState(0);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [cargandoZonas, setCargandoZonas] = useState(false);
  const [creandoZona, setCreandoZona] = useState(false);
  const [newZona, setNewZona] = useState({ nombre: '', latitud: '', longitud: '', radio: '100' });
  const [evidenciaUrl, setEvidenciaUrl] = useState<string | null>(null);
  const [cargandoEvidencia, setCargandoEvidencia] = useState<number | null>(null);
  const [zonaEliminar, setZonaEliminar] = useState<Zona | null>(null);
  const [eliminandoZona, setEliminandoZona] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState('');
  const limit = 20;

  useEffect(() => {
    if (activeTab !== 'asistencias') return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCargandoAsistencias(true);
      setErrorAsistencias('');
      try {
        const response = await listarAsistenciasBiometria({
          usuario_id: usuarioId.trim() || undefined,
          fecha_desde: fechaDesde ? `${fechaDesde}T00:00:00` : undefined,
          fecha_hasta: fechaHasta ? `${fechaHasta}T23:59:59` : undefined,
          resultado,
          limit,
          offset,
        }, controller.signal);
        setAsistencias(response.items);
        setTotal(response.total);
      } catch (reason: unknown) {
        if (!controller.signal.aborted) setErrorAsistencias(reason instanceof Error ? reason.message : 'No se pudieron cargar las asistencias');
      } finally {
        if (!controller.signal.aborted) setCargandoAsistencias(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [activeTab, fechaDesde, fechaHasta, offset, resultado, revision, usuarioId]);

  const fetchZonas = async () => {
    setCargandoZonas(true);
    try {
      const response = await axios.get<Zona[]>(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.BIOMETRIA_ZONAS}`, { headers: authHeaders() });
      setZonas(response.data);
    } catch {
      addNotification('error', 'No se pudieron cargar las zonas');
    } finally {
      setCargandoZonas(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'zonas' || !isAdmin) return;
    let vigente = true;
    setCargandoZonas(true);
    axios.get<Zona[]>(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.BIOMETRIA_ZONAS}`, { headers: authHeaders() })
      .then((response) => { if (vigente) setZonas(response.data); })
      .catch(() => { if (vigente) addNotification('error', 'No se pudieron cargar las zonas'); })
      .finally(() => { if (vigente) setCargandoZonas(false); });
    return () => { vigente = false; };
  }, [activeTab, addNotification, isAdmin]);

  const crearZona = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreandoZona(true);
    try {
      await axios.post(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.BIOMETRIA_ZONAS}`, {
        nombre: newZona.nombre,
        latitud: Number(newZona.latitud),
        longitud: Number(newZona.longitud),
        radio: Number(newZona.radio),
      }, { headers: authHeaders() });
      setNewZona({ nombre: '', latitud: '', longitud: '', radio: '100' });
      addNotification('success', 'Zona creada');
      await fetchZonas();
    } catch {
      addNotification('error', 'No se pudo crear la zona');
    } finally {
      setCreandoZona(false);
    }
  };

  const eliminarZona = async () => {
    if (!zonaEliminar || eliminandoZona) return;
    setEliminandoZona(true);
    try {
      await axios.delete(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.BIOMETRIA_ZONAS}/${zonaEliminar.id}`, { headers: authHeaders() });
      addNotification('success', 'Zona eliminada');
      setZonaEliminar(null);
      await fetchZonas();
    } catch {
      addNotification('error', 'No se pudo eliminar la zona');
    } finally {
      setEliminandoZona(false);
    }
  };

  const usarUbicacion = () => {
    if (!navigator.geolocation) {
      setErrorUbicacion('Tu navegador no soporta geolocalización. Ingresa las coordenadas manualmente.');
      return;
    }
    setErrorUbicacion('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setNewZona((current) => ({ ...current, latitud: String(coords.latitude), longitud: String(coords.longitude) })),
      () => {
        setErrorUbicacion('No se pudo obtener la ubicación. Verifica los permisos del navegador.');
        addNotification('error', 'No se pudo obtener la ubicación');
      },
      { enableHighAccuracy: true },
    );
  };

  const verEvidencia = async (registroId: number) => {
    setCargandoEvidencia(registroId);
    try {
      const blob = await obtenerEvidenciaBiometria(registroId);
      setEvidenciaUrl(URL.createObjectURL(blob));
    } catch (reason: unknown) {
      addNotification('error', reason instanceof Error ? reason.message : 'No se pudo cargar la evidencia');
    } finally {
      setCargandoEvidencia(null);
    }
  };

  const cerrarEvidencia = () => {
    if (evidenciaUrl) URL.revokeObjectURL(evidenciaUrl);
    setEvidenciaUrl(null);
  };

  useEffect(() => () => { if (evidenciaUrl) URL.revokeObjectURL(evidenciaUrl); }, [evidenciaUrl]);

  const columns: DataTableColumn<AsistenciaBiometriaAdmin>[] = [
    { key: 'fecha', label: 'Fecha', minWidth: '170px', render: (row) => fechaLegible(row.creado_en) },
    { key: 'empleado', label: 'Empleado', minWidth: '220px', flex: true, render: (row) => <div className="text-left"><Text className="font-semibold">{row.empleado_nombre}</Text><Text className="text-xs text-[var(--color-text-secondary)]">{row.empleado_cedula}</Text></div> },
    { key: 'zona', label: 'Zona', minWidth: '140px', render: (row) => row.zona_nombre ?? 'Sin zona' },
    { key: 'resultado', label: 'Resultado', centered: true, render: (row) => <Badge variant={row.resultado ? 'success' : 'error'}>{row.resultado ? 'Exitoso' : 'Fallido'}</Badge> },
    { key: 'evidencia', label: 'Evidencia', centered: true, render: (row) => <Button variant="ghost" size="sm" icon={Eye} disabled={cargandoEvidencia === row.id} onClick={() => void verEvidencia(row.id)} aria-label={`Ver evidencia de ${row.empleado_nombre}`}>{cargandoEvidencia === row.id ? 'Cargando...' : 'Ver'}</Button> },
  ];

  const cambiarTab = (event: React.KeyboardEvent<HTMLButtonElement>, next: 'zonas' | 'asistencias') => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setActiveTab(next);
    window.setTimeout(() => document.getElementById(`supervision-tab-${next}`)?.focus(), 0);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-3 sm:p-5 lg:p-8">
      <div><Title variant="h3">Supervisión de biometría</Title><Text color="text-secondary">Consulta únicamente las asistencias autorizadas para tu equipo.</Text></div>
      {isAdmin && <div className="flex gap-2" role="tablist" aria-label="Secciones de biometría"><Button id="supervision-tab-asistencias" role="tab" aria-selected={activeTab === 'asistencias'} aria-controls="supervision-panel-asistencias" tabIndex={activeTab === 'asistencias' ? 0 : -1} variant={activeTab === 'asistencias' ? 'primary' : 'ghost'} onClick={() => setActiveTab('asistencias')} onKeyDown={(event) => cambiarTab(event, 'zonas')}>Asistencias</Button><Button id="supervision-tab-zonas" role="tab" aria-selected={activeTab === 'zonas'} aria-controls="supervision-panel-zonas" tabIndex={activeTab === 'zonas' ? 0 : -1} variant={activeTab === 'zonas' ? 'primary' : 'ghost'} onClick={() => setActiveTab('zonas')} onKeyDown={(event) => cambiarTab(event, 'asistencias')}>Zonas</Button></div>}

      {activeTab === 'asistencias' && <div id="supervision-panel-asistencias" role="tabpanel" aria-labelledby={isAdmin ? 'supervision-tab-asistencias' : undefined} aria-label={isAdmin ? undefined : 'Asistencias del equipo'} tabIndex={0} className="space-y-4">
        <MaterialCard className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Usuario" value={usuarioId} onChange={(event) => { setUsuarioId(event.target.value); setOffset(0); }} placeholder="ID de usuario" />
          <Input label="Desde" type="date" value={fechaDesde} onChange={(event) => { setFechaDesde(event.target.value); setOffset(0); }} />
          <Input label="Hasta" type="date" value={fechaHasta} onChange={(event) => { setFechaHasta(event.target.value); setOffset(0); }} />
          <Select label="Resultado" value={resultado === undefined ? '' : String(resultado)} onChange={(event) => { setResultado(event.target.value === '' ? undefined : event.target.value === 'true'); setOffset(0); }} options={[{ value: '', label: 'Todos' }, { value: 'true', label: 'Exitosos' }, { value: 'false', label: 'Fallidos' }]} />
        </MaterialCard>
        {errorAsistencias && <Callout variant="error" role="alert" title="No fue posible cargar asistencias">{errorAsistencias}<Button variant="ghost" size="sm" onClick={() => setRevision((value) => value + 1)}>Reintentar</Button></Callout>}
        <MaterialCard className="overflow-hidden p-0" aria-busy={cargandoAsistencias}><DataTable data={asistencias} columns={columns} keyExtractor={(row) => String(row.id)} isLoading={cargandoAsistencias} loadingMessage="Consultando asistencias..." emptyMessage="No hay asistencias para los filtros actuales." /></MaterialCard>
        <div className="flex items-center justify-center gap-3"><Button variant="ghost" disabled={cargandoAsistencias || offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>Anterior</Button><Text className="text-xs">{total === 0 ? 0 : offset + 1}-{Math.min(offset + limit, total)} de {total}</Text><Button variant="ghost" disabled={cargandoAsistencias || offset + limit >= total} onClick={() => setOffset(offset + limit)}>Siguiente</Button></div>
      </div>}

      {activeTab === 'zonas' && isAdmin && <div id="supervision-panel-zonas" role="tabpanel" aria-labelledby="supervision-tab-zonas" tabIndex={0} className="grid gap-5 lg:grid-cols-3">
        <MaterialCard className="p-4 lg:col-span-1"><Title variant="h6" className="mb-4">Nueva zona</Title><form onSubmit={crearZona} className="space-y-3"><Input label="Nombre" value={newZona.nombre} onChange={(event) => setNewZona({ ...newZona, nombre: event.target.value })} required /><Button type="button" variant="outline" icon={MapPin} fullWidth onClick={usarUbicacion}>Usar mi ubicación</Button>{errorUbicacion && <Callout variant="error" role="alert">{errorUbicacion}</Callout>}<Input label="Latitud" type="number" step="any" value={newZona.latitud} onChange={(event) => setNewZona({ ...newZona, latitud: event.target.value })} required /><Input label="Longitud" type="number" step="any" value={newZona.longitud} onChange={(event) => setNewZona({ ...newZona, longitud: event.target.value })} required /><Input label="Radio (metros)" type="number" value={newZona.radio} onChange={(event) => setNewZona({ ...newZona, radio: event.target.value })} required /><Button type="submit" variant="primary" icon={Plus} fullWidth disabled={creandoZona}>{creandoZona ? 'Creando...' : 'Crear zona'}</Button></form></MaterialCard>
        <MaterialCard className="p-4 lg:col-span-2"><Title variant="h6" className="mb-4">Zonas registradas</Title>{cargandoZonas ? <div className="flex justify-center p-8"><Spinner size="md" /></div> : <div className="space-y-3">{zonas.map((zona) => <MaterialCard key={zona.id} elevation={0} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><Text className="font-semibold">{zona.nombre}</Text><Text className="text-xs text-[var(--color-text-secondary)]">Radio: {zona.radio} m</Text></div><div className="flex gap-2"><Button variant="ghost" size="sm" icon={Map} onClick={() => window.open(`https://www.google.com/maps?q=${zona.latitud},${zona.longitud}`, '_blank', 'noopener,noreferrer')}>Mapa</Button><Button variant="ghost" size="sm" icon={Trash2} onClick={() => setZonaEliminar(zona)}>Eliminar</Button></div></MaterialCard>)}{zonas.length === 0 && <Text color="text-secondary">No hay zonas configuradas.</Text>}</div>}</MaterialCard>
      </div>}

      <Modal isOpen={evidenciaUrl !== null} onClose={cerrarEvidencia} title="Evidencia de asistencia" size="lg">
        {evidenciaUrl && <img src={evidenciaUrl} alt="Evidencia de asistencia" className="max-h-[70vh] w-full rounded-2xl object-contain" />}
      </Modal>
      <Modal isOpen={zonaEliminar !== null} onClose={() => setZonaEliminar(null)} title="Eliminar zona" size="sm" closeOnOverlayClick={!eliminandoZona} closeOnEscape={!eliminandoZona} closeButtonDisabled={eliminandoZona}>
        <div className="space-y-4"><Text>¿Deseas eliminar la zona {zonaEliminar?.nombre}? Esta acción no se puede deshacer.</Text><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" disabled={eliminandoZona} onClick={() => setZonaEliminar(null)}>Cancelar</Button><Button variant="danger" disabled={eliminandoZona} onClick={() => void eliminarZona()}>{eliminandoZona ? 'Eliminando...' : 'Eliminar zona'}</Button></div></div>
      </Modal>
    </div>
  );
};

export default BiometriaAdminView;
