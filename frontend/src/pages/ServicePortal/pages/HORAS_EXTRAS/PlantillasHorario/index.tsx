import { useRef, useState } from 'react';
import { ArrowLeft, CalendarClock, Copy, Pencil, Plus, Power, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Badge from '../../../../../components/atoms/Badge';
import Button from '../../../../../components/atoms/Button';
import Input from '../../../../../components/atoms/Input';
import MaterialCard from '../../../../../components/atoms/MaterialCard';
import Skeleton from '../../../../../components/atoms/Skeleton';
import Switch from '../../../../../components/atoms/Switch';
import { Text } from '../../../../../components/atoms/Text';
import { Title } from '../../../../../components/atoms/Title';
import Callout from '../../../../../components/molecules/Callout';
import { useNotifications } from '../../../../../components/notifications/NotificationsContext';
import { useAppContext } from '../../../../../context/AppContext';
import { aplicarPlantilla, actualizarPlantilla, crearPlantilla, desactivarPlantilla, duplicarPlantilla } from '../../../../../services/horariosRelacionesService';
import type { PlantillaHorario, PlantillaHorarioInput } from './types';
import AplicarPlantillaModal from './components/AplicarPlantillaModal';
import PlantillaActionModal from './components/PlantillaActionModal';
import PlantillaEditorModal from './components/PlantillaEditorModal';
import { usePlantillasHorario } from './hooks/usePlantillasHorario';

const PlantillasHorarioPage = () => {
  const navigate = useNavigate();
  const catalogo = usePlantillasHorario();
  const { state } = useAppContext();
  const { addNotification } = useNotifications();
  const puedeAplicar = state.user?.permissions?.includes('nomina_horas_extras.planificar') ?? false;
  const [editando, setEditando] = useState<PlantillaHorario | null | undefined>(undefined);
  const [aplicando, setAplicando] = useState<PlantillaHorario | null>(null);
  const [accion, setAccion] = useState<{ plantilla: PlantillaHorario; tipo: 'duplicar' | 'desactivar' } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const ejecutandoRef = useRef(false);
  const solicitudAplicacionRef = useRef<{ payload: string; id: string } | null>(null);

  const ejecutar = async (action: () => Promise<unknown>, success: string) => {
    if (ejecutandoRef.current) return false;
    ejecutandoRef.current = true;
    setGuardando(true);
    try { await action(); addNotification('success', success); catalogo.recargar(); return true; }
    catch (reason: unknown) { addNotification('error', reason instanceof Error ? reason.message : 'No se pudo completar la operación'); return false; }
    finally { ejecutandoRef.current = false; setGuardando(false); }
  };

  const guardar = async (value: PlantillaHorarioInput) => {
    const ok = editando
      ? await ejecutar(() => actualizarPlantilla(editando.id, { ...value, version_esperada: editando.version }), 'Plantilla actualizada')
      : await ejecutar(() => crearPlantilla(value), 'Plantilla creada');
    if (ok) setEditando(undefined);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><Button variant="ghost" icon={ArrowLeft} className="-ml-2 mb-2" onClick={() => navigate('/service-portal/tiempo-asistencia')}>Volver a Tiempo y Asistencia</Button><Title variant="h3">Plantillas de horario</Title><Text color="text-secondary">Catálogo semanal reutilizable y versionado.</Text></div>
        <Button variant="primary" icon={Plus} onClick={() => setEditando(null)}>Nueva plantilla</Button>
      </div>
      <MaterialCard className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
        <Input label="Buscar" value={catalogo.busqueda} onChange={(event) => catalogo.setBusqueda(event.target.value)} placeholder="Nombre o descripción" />
        <Switch checked={catalogo.soloActivas} onChange={catalogo.setSoloActivas} label="Solo activas" className="self-end pb-2" />
      </MaterialCard>
      {catalogo.error && <Callout variant="error" role="alert" title="No fue posible cargar el catálogo">{catalogo.error}<Button variant="ghost" size="sm" onClick={catalogo.recargar}>Reintentar</Button></Callout>}
      {catalogo.cargando ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-48 rounded-3xl" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {catalogo.items.map((plantilla) => (
            <MaterialCard key={plantilla.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3"><CalendarClock className="h-6 w-6 text-[var(--color-primary)]" /><Badge variant={plantilla.esta_activa ? 'success' : 'default'}>{plantilla.esta_activa ? 'Activa' : 'Inactiva'}</Badge></div>
              <Title variant="h5" className="mt-3">{plantilla.nombre}</Title>
              <Text className="mt-1 min-h-10 text-sm text-[var(--color-text-secondary)]">{plantilla.descripcion || 'Sin descripción'}</Text>
              <Text className="mt-2 text-xs">Versión {plantilla.version}</Text>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" icon={Pencil} onClick={() => setEditando(plantilla)} disabled={!plantilla.esta_activa}>Editar</Button>
                 <Button size="sm" variant="ghost" icon={Copy} onClick={() => setAccion({ plantilla, tipo: 'duplicar' })}>Duplicar</Button>
                 {plantilla.esta_activa && <Button size="sm" variant="ghost" icon={Power} onClick={() => setAccion({ plantilla, tipo: 'desactivar' })}>Desactivar</Button>}
                {puedeAplicar && plantilla.esta_activa && <Button size="sm" variant="primary" icon={Users} onClick={() => setAplicando(plantilla)}>Aplicar</Button>}
              </div>
            </MaterialCard>
          ))}
        </div>
      )}
      {!catalogo.cargando && !catalogo.error && catalogo.items.length === 0 && <Callout variant="info">No hay plantillas que coincidan con los filtros.</Callout>}
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" disabled={catalogo.offset === 0} onClick={() => catalogo.setOffset(Math.max(0, catalogo.offset - catalogo.limit))}>Anterior</Button>
        <Text className="text-xs">{catalogo.total} plantillas</Text>
        <Button variant="ghost" disabled={catalogo.offset + catalogo.limit >= catalogo.total} onClick={() => catalogo.setOffset(catalogo.offset + catalogo.limit)}>Siguiente</Button>
      </div>
      <PlantillaEditorModal open={editando !== undefined} plantilla={editando ?? null} guardando={guardando} onClose={() => setEditando(undefined)} onSave={guardar} />
      <AplicarPlantillaModal open={!!aplicando} plantilla={aplicando} guardando={guardando} onClose={() => { solicitudAplicacionRef.current = null; setAplicando(null); }} onSelectionChange={() => { solicitudAplicacionRef.current = null; }} onApply={async (empleados) => {
         if (!aplicando) return;
          const cedulas = [...empleados].sort();
          const payloadKey = JSON.stringify([aplicando.id, cedulas]);
          if (solicitudAplicacionRef.current?.payload !== payloadKey) solicitudAplicacionRef.current = { payload: payloadKey, id: crypto.randomUUID() };
          const ok = await ejecutar(() => aplicarPlantilla(aplicando.id, { solicitud_id: solicitudAplicacionRef.current!.id, cedulas }), 'Plantilla aplicada');
          if (ok) { solicitudAplicacionRef.current = null; setAplicando(null); }
       }} />
      <PlantillaActionModal
        plantilla={accion?.plantilla ?? null}
        accion={accion?.tipo ?? null}
        guardando={guardando}
        onClose={() => setAccion(null)}
        onConfirm={async (nombre) => {
          if (!accion) return;
          const ok = accion.tipo === 'duplicar'
            ? await ejecutar(() => duplicarPlantilla(accion.plantilla.id, nombre ?? ''), 'Plantilla duplicada')
            : await ejecutar(() => desactivarPlantilla(accion.plantilla.id), 'Plantilla desactivada');
          if (ok) setAccion(null);
        }}
      />
    </div>
  );
};

export default PlantillasHorarioPage;
