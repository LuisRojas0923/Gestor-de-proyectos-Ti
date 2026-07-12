import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Title,
  Text,
  MaterialCard,
  Button,
  Input,
  Select,
  Textarea,
  Badge,
} from '../../../../components/atoms';
import { ArrowLeft, Save, CheckCircle2, Ban } from 'lucide-react';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import {
  crearNovedad,
  obtenerNovedad,
  actualizarNovedad,
  confirmarNovedad,
  anularNovedad,
} from '../../../../services/horasExtrasService';
import type {
  NovedadEstado,
  NovedadAnularRequest,
} from '../../../../types/horasExtras';

const CODIGO_OPTIONS = [
  { value: 'LIC', label: 'LIC — Licencia remunerada', categoria: 'LICENCIA' },
  { value: 'PNR', label: 'PNR — Licencia no remunerada', categoria: 'LICENCIA' },
  { value: 'VAC', label: 'VAC — Vacaciones disfrutadas', categoria: 'VACACION' },
  { value: 'INC', label: 'INC — Incapacidad', categoria: 'INCAPACIDAD' },
  { value: 'DXT', label: 'DXT — Descanso por tratamiento', categoria: 'INCAPACIDAD' },
  { value: 'AUS', label: 'AUS — Ausencia injustificada', categoria: 'AUSENCIA' },
  { value: 'SAN', label: 'SAN — Sanción disciplinaria', categoria: 'AUSENCIA' },
  { value: 'RET', label: 'RET — Retardo', categoria: 'AUSENCIA' },
];

const ESTADO_VARIANT: Record<NovedadEstado, 'default' | 'info' | 'error'> = {
  BORRADOR: 'default',
  CONFIRMADO: 'info',
  ANULADO: 'error',
};

const NovedadFormView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined && id !== 'nueva';
  const novedadId = isEdit ? Number(id) : null;
  const { addNotification } = useNotifications();

  const [cedula, setCedula] = useState('');
  const [codigo, setCodigo] = useState('LIC');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [estado, setEstado] = useState<NovedadEstado>('BORRADOR');
  const [anuladoJustificacion, setAnuladoJustificacion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [anularModal, setAnularModal] = useState(false);
  const [anularJustificacion, setAnularJustificacion] = useState('');

  useEffect(() => {
    if (!novedadId) return;
    setCargando(true);
    obtenerNovedad(novedadId, localStorage.getItem('token') || '')
      .then((n) => {
        setCedula(n.cedula);
        setCodigo(n.codigo_novedad);
        setFechaInicio(n.fecha_inicio);
        setFechaFin(n.fecha_fin);
        setObservaciones(n.observaciones ?? '');
        setEstado(n.estado);
        setAnuladoJustificacion(n.anulado_justificacion);
      })
      .catch((e) => addNotification('error', e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setCargando(false));
  }, [novedadId, addNotification]);

  const editable = estado === 'BORRADOR';

  const handleGuardar = async () => {
    if (!cedula.trim() || !fechaInicio || !fechaFin) {
      addNotification('error', 'Cédula, fecha_inicio y fecha_fin son obligatorios');
      return;
    }
    if (fechaFin < fechaInicio) {
      addNotification('error', 'fecha_fin debe ser >= fecha_inicio');
      return;
    }
    setGuardando(true);
    try {
      if (novedadId) {
        const r = await actualizarNovedad(
          novedadId,
          {
            cedula: cedula.trim(),
            codigo_novedad: codigo,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            observaciones: observaciones || null,
          },
          localStorage.getItem('token') || '',
        );
        setEstado(r.estado);
        addNotification('success', `Novedad #${r.id} actualizada`);
      } else {
        const r = await crearNovedad(
          {
            cedula: cedula.trim(),
            codigo_novedad: codigo,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            observaciones: observaciones || null,
          },
          localStorage.getItem('token') || '',
        );
        addNotification('success', `Novedad #${r.id} creada en BORRADOR`);
        navigate(`/service-portal/horas-extras/novedades/${r.id}`, { replace: true });
      }
    } catch (e) {
      addNotification('error', e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleConfirmar = async () => {
    if (!novedadId) return;
    try {
      const r = await confirmarNovedad(novedadId, localStorage.getItem('token') || '');
      setEstado(r.estado);
      addNotification('success', `Novedad #${r.id} confirmada`);
    } catch (e) {
      addNotification('error', e instanceof Error ? e.message : 'Error al confirmar');
    }
  };

  const handleAnular = async () => {
    if (!novedadId) return;
    if (anularJustificacion.trim().length < 5) {
      addNotification('error', 'La justificación debe tener al menos 5 caracteres');
      return;
    }
    try {
      const payload: NovedadAnularRequest = { justificacion: anularJustificacion.trim() };
      const r = await anularNovedad(novedadId, payload, localStorage.getItem('token') || '');
      setEstado(r.estado);
      setAnuladoJustificacion(r.anulado_justificacion);
      setAnularModal(false);
      setAnularJustificacion('');
      addNotification('success', `Novedad #${r.id} anulada`);
    } catch (e) {
      addNotification('error', e instanceof Error ? e.message : 'Error al anular');
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="secondary"
          onClick={() => navigate('/service-portal/horas-extras/novedades')}
          className="!p-2 !rounded-full"
          aria-label="Volver a Novedades"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Title level={2} className="!m-0">
          {isEdit ? `Novedad #${novedadId}` : 'Nueva Novedad'}
        </Title>
        {isEdit && (
          <div className="ml-auto">
            <Badge variant={ESTADO_VARIANT[estado]} size="md">{estado}</Badge>
          </div>
        )}
      </div>

      {cargando ? (
        <MaterialCard className="p-6 text-center">
          <Text className="text-slate-500">Cargando...</Text>
        </MaterialCard>
      ) : (
        <>
          <MaterialCard className="p-6 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Cédula del empleado"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                disabled={!editable}
                placeholder="1234567890"
              />
              <Select
                label="Código de novedad"
                value={codigo}
                onChange={setCodigo}
                disabled={!editable}
                options={CODIGO_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
              />
              <Input
                label="Fecha inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                disabled={!editable}
              />
              <Input
                label="Fecha fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                disabled={!editable}
              />
            </div>
            <div className="mt-4">
              <Textarea
                label="Observaciones (opcional)"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                disabled={!editable}
                rows={3}
              />
            </div>
          </MaterialCard>

          {anuladoJustificacion && (
            <MaterialCard className="p-4 mb-4 bg-red-50 border border-red-200">
              <Text className="text-red-700 text-sm">
                <strong>Anulada:</strong> {anuladoJustificacion}
              </Text>
            </MaterialCard>
          )}

          <MaterialCard className="p-4">
            <div className="flex justify-end gap-2 flex-wrap">
              {editable && (
                <Button onClick={handleGuardar} disabled={guardando}>
                  <Save className="w-4 h-4 mr-2" />
                  {guardando ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear en BORRADOR'}
                </Button>
              )}
              {isEdit && estado === 'BORRADOR' && (
                <Button onClick={handleConfirmar} variant="primary">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar
                </Button>
              )}
              {isEdit && estado !== 'ANULADO' && (
                <Button variant="secondary" onClick={() => setAnularModal(true)}>
                  <Ban className="w-4 h-4 mr-2" />
                  Anular
                </Button>
              )}
            </div>
          </MaterialCard>

          {anularModal && (
            <MaterialCard className="p-4 mt-4 border border-red-200">
              <Text className="font-medium mb-2">Anular novedad (requiere justificación)</Text>
              <Textarea
                value={anularJustificacion}
                onChange={(e) => setAnularJustificacion(e.target.value)}
                rows={2}
                placeholder="Mínimo 5 caracteres"
              />
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="secondary" onClick={() => { setAnularModal(false); setAnularJustificacion(''); }}>
                  Cancelar
                </Button>
                <Button onClick={handleAnular}>
                  Confirmar anulación
                </Button>
              </div>
            </MaterialCard>
          )}
        </>
      )}
    </div>
  );
};

export default NovedadFormView;
