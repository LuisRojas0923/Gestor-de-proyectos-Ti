/**
 * DefaultHorarioSemana — Paso 2 del planificador.
 *
 * Define el horario por defecto (L-D) y permite aplicarlo en bloque a
 * todos los empleados seleccionados. El estado vive en el padre
 * (PlanificadorSemanalView) — este componente es controlado.
 */
import React from 'react';
import { Button, MaterialCard, Text } from '../../../../../components/atoms';
import { Copy } from 'lucide-react';
import type { PlanDiaIn } from '../../../../../types/horasExtrasPlanificador';
import WeeklyScheduleEditor from './WeeklyScheduleEditor';

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
  return (
    <MaterialCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <Text className="font-semibold">Paso 2 — Horario por defecto de la semana</Text>
        <Button variant="primary" size="sm" onClick={onAplicarATodos}>
          <Copy className="w-4 h-4 mr-1" />
          Aplicar a todos
        </Button>
      </div>

      <WeeklyScheduleEditor value={dias} onChange={onChange} compact />
    </MaterialCard>
  );
};

export default DefaultHorarioSemana;
