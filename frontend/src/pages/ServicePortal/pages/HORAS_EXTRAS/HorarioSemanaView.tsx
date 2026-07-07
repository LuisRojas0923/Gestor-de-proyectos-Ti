import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Title, Text, Button, MaterialCard, Input, Badge } from '../../../../components/atoms';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import {
  obtenerHorarioSemana,
  actualizarHorarioSemana,
} from '../../../../services/horasExtrasService';
import type { HorarioPactadoDiaUpdate } from '../../../../types/horasExtras';
import { labelDia } from './utils/horarioUtils';

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

  const updateDia = (idx: number, patch: Partial<HorarioPactadoDiaUpdate>) => {
    setDias((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const marcarFranco = (idx: number) => {
    setDias((prev) =>
      prev.map((d, i) =>
        i === idx
          ? { dia_semana: d.dia_semana, hora_entrada: null, hora_salida: null, minutos_almuerzo: 0 }
          : d,
      ),
    );
  };

  const handleGuardar = async () => {
    if (!cedula.trim()) {
      addNotification('error', 'Cédula requerida');
      return;
    }
    // Validación local: hora_salida > hora_entrada
    for (const d of dias) {
      if (d.hora_entrada && d.hora_salida && d.hora_salida <= d.hora_entrada) {
        addNotification(
          'error',
          `${labelDia(d.dia_semana)}: la salida debe ser posterior a la entrada`,
        );
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
        <MaterialCard className="p-4 mb-4">
          <Text className="text-sm text-slate-500 mb-3 block">
            Configura hora de entrada, salida y minutos de almuerzo para cada día.
            Deja en blanco los días libres (sábado, domingo, franco).
          </Text>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-2 pr-3 w-16">Día</th>
                  <th className="py-2 pr-3">Entrada</th>
                  <th className="py-2 pr-3">Salida</th>
                  <th className="py-2 pr-3 w-32">Almuerzo (min)</th>
                  <th className="py-2 pr-3 w-28"></th>
                </tr>
              </thead>
              <tbody>
                {dias.map((d, idx) => {
                  const esFinDeSemana = d.dia_semana >= 6;
                  return (
                    <tr key={d.dia_semana} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 align-middle">
                        <Badge variant={esFinDeSemana ? 'info' : 'default'} size="sm">
                          {labelDia(d.dia_semana)}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          type="time"
                          value={d.hora_entrada ?? ''}
                          onChange={(e) =>
                            updateDia(idx, {
                              hora_entrada: e.target.value === '' ? null : e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          type="time"
                          value={d.hora_salida ?? ''}
                          onChange={(e) =>
                            updateDia(idx, {
                              hora_salida: e.target.value === '' ? null : e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          type="number"
                          min={0}
                          max={240}
                          step={5}
                          value={d.minutos_almuerzo}
                          onChange={(e) =>
                            updateDia(idx, {
                              minutos_almuerzo: Math.max(0, Math.min(240, Number(e.target.value) || 0)),
                            })
                          }
                          disabled={d.hora_entrada === null}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Button
                          variant="secondary"
                          onClick={() => marcarFranco(idx)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Franco
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </MaterialCard>
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
