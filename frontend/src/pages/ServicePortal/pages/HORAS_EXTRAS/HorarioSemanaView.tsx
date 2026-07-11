import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Title, Button, MaterialCard, Input } from '../../../../components/atoms';
import { ArrowLeft, Save } from 'lucide-react';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import {
  obtenerHorarioSemana,
  actualizarHorarioSemana,
} from '../../../../services/horasExtrasService';
import type { HorarioPactadoDiaUpdate } from '../../../../types/horasExtras';
import { labelDia } from './utils/horarioUtils';
import WeeklyScheduleEditor from './components/WeeklyScheduleEditor';
import { errorTurno } from './utils/validarTurno';

const HorarioSemanaView: React.FC = () => {
  const navigate = useNavigate();
  const { cedula: cedulaParam } = useParams<{ cedula: string }>();
  const { addNotification } = useNotifications();

  const [cedula, setCedula] = useState(cedulaParam ?? '');
  const [dias, setDias] = useState<HorarioPactadoDiaUpdate[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = async (c: string) => {
    if (!c.trim()) return;
    setCargando(true);
    try {
      const r = await obtenerHorarioSemana(c.trim(), localStorage.getItem('token') || '');
      setCedula(c.trim());
      setDias(
        r.dias.map((d) => ({
          dia_semana: d.dia_semana,
          hora_entrada: d.hora_entrada,
          hora_salida: d.hora_salida,
          minutos_almuerzo: d.minutos_almuerzo,
          cruza_medianoche: d.cruza_medianoche,
        })),
      );
    } catch (e: unknown) {
      addNotification('error', e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (cedulaParam) cargar(cedulaParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cedulaParam]);

  const handleGuardar = async () => {
    if (!cedula.trim()) {
      addNotification('error', 'Cédula requerida');
      return;
    }
    for (const d of dias) {
      const error = errorTurno(d);
      if (error) {
        addNotification('error', `${labelDia(d.dia_semana)}: ${error}`);
        return;
      }
    }
    setGuardando(true);
    try {
      await actualizarHorarioSemana(cedula.trim(), dias, localStorage.getItem('token') || '');
      addNotification('success', `Horario de ${cedula} guardado`);
      navigate('/service-portal/horas-extras/calculos');
    } catch (e: unknown) {
      addNotification('error', e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="secondary"
          onClick={() => navigate('/service-portal/horas-extras')}
          className="!p-2 !rounded-full"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Title level={2} className="!m-0">Horario semanal del empleado</Title>
      </div>

      <MaterialCard className="p-4 mb-4">
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input
              label="Cédula del empleado"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              disabled={!!cedulaParam}
              placeholder="1234567890"
            />
          </div>
          {!cedulaParam && (
            <Button onClick={() => cargar(cedula)} disabled={cargando || !cedula.trim()}>
              {cargando ? 'Cargando...' : 'Cargar'}
            </Button>
          )}
        </div>
      </MaterialCard>

      {dias.length > 0 && (
        <WeeklyScheduleEditor value={dias} onChange={setDias} ariaLabel="Horario semanal del empleado" />
      )}

      {dias.length > 0 && (
        <MaterialCard className="p-4">
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => navigate('/service-portal/horas-extras')}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={guardando}>
              <Save className="w-4 h-4 mr-2" />
              {guardando ? 'Guardando...' : 'Guardar horario'}
            </Button>
          </div>
        </MaterialCard>
      )}
    </div>
  );
};

export default HorarioSemanaView;
