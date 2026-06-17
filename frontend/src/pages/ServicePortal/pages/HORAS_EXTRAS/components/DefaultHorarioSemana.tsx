/**
 * DefaultHorarioSemana — Paso 2 del planificador.
 *
 * Define el horario por defecto (L-D) y permite aplicarlo en bloque a
 * todos los empleados seleccionados. El estado vive en el padre
 * (PlanificadorSemanalView) — este componente es controlado.
 */
import React from 'react';
import { Input, Button, Text } from '../../../../../components/atoms';
import { Copy } from 'lucide-react';
import { labelDia } from '../utils/horarioUtils';
import type { PlanDiaIn } from '../../../../../types/horasExtras';

interface DefaultHorarioSemanaProps {
  dias: PlanDiaIn[];
  onChange: (dias: PlanDiaIn[]) => void;
  onAplicarATodos: () => void;
}

const DefaultHorarioSemana: React.FC<DefaultHorarioSemanaProps> = ({
  dias,
  onChange,
  onAplicarATodos,
}) => {
  const updateDia = (
    idx: number,
    patch: Partial<Pick<PlanDiaIn, 'hora_entrada' | 'hora_salida' | 'minutos_almuerzo'>>,
  ) => {
    onChange(dias.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <Text className="font-semibold">Paso 2 — Horario por defecto de la semana</Text>
        <Button variant="primary" size="sm" onClick={onAplicarATodos}>
          <Copy className="w-4 h-4 mr-1" />
          Aplicar a todos
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
        {dias.map((d, idx) => (
          <div key={d.dia_semana} className="border border-slate-100 rounded p-2">
            <Text className="text-xs font-medium text-slate-600 mb-1">
              {labelDia(d.dia_semana)}
            </Text>
            <Input
              type="time"
              value={d.hora_entrada ?? ''}
              onChange={(e) =>
                updateDia(idx, { hora_entrada: e.target.value || null })
              }
              className="text-xs mb-1"
              aria-label={`Entrada ${labelDia(d.dia_semana)}`}
            />
            <Input
              type="time"
              value={d.hora_salida ?? ''}
              onChange={(e) =>
                updateDia(idx, { hora_salida: e.target.value || null })
              }
              className="text-xs mb-1"
              aria-label={`Salida ${labelDia(d.dia_semana)}`}
            />
            <Input
              type="number"
              min={0}
              max={240}
              value={d.minutos_almuerzo}
              onChange={(e) =>
                updateDia(idx, {
                  minutos_almuerzo: Math.max(0, Math.min(240, Number(e.target.value) || 0)),
                })
              }
              className="text-xs"
              aria-label={`Almuerzo (min) ${labelDia(d.dia_semana)}`}
              placeholder="Almuerzo (min)"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default DefaultHorarioSemana;
