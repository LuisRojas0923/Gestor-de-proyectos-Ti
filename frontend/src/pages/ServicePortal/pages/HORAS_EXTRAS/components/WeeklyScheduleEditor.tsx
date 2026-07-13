import { Moon, Palmtree } from 'lucide-react';
import Badge from '../../../../../components/atoms/Badge';
import Button from '../../../../../components/atoms/Button';
import Input from '../../../../../components/atoms/Input';
import MaterialCard from '../../../../../components/atoms/MaterialCard';
import Switch from '../../../../../components/atoms/Switch';
import { Text } from '../../../../../components/atoms/Text';
import type { HorarioSemanalDia } from '../../../../../types/horariosRelaciones';
import { labelDia } from '../utils/horarioUtils';
import TimeClockPicker from './TimeClockPicker';

interface WeeklyScheduleEditorProps<T extends HorarioSemanalDia> {
  value: T[];
  onChange: (value: T[]) => void;
  disabled?: boolean;
  compact?: boolean;
  ariaLabel?: string;
}

const WeeklyScheduleEditor = <T extends HorarioSemanalDia>({
  value,
  onChange,
  disabled = false,
  compact = false,
  ariaLabel = 'Editor semanal de horario',
}: WeeklyScheduleEditorProps<T>) => {
  const actualizar = (index: number, patch: Partial<HorarioSemanalDia>) => {
    onChange(value.map((dia, current) => current === index ? { ...dia, ...patch } : dia));
  };

  const marcarFranco = (index: number) => actualizar(index, {
    hora_entrada: null,
    hora_salida: null,
    minutos_almuerzo: 0,
    cruza_medianoche: false,
  });

  return (
    <MaterialCard className="p-3 sm:p-4" role="group" aria-label={ariaLabel}>
      <Text className="mb-3 text-sm text-[var(--color-text-secondary)]">
        Configura entrada, salida y almuerzo. Activa jornada nocturna cuando la salida sea al día siguiente.
      </Text>
      <div className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-7' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-7'}`}>
        {value.map((dia, index) => {
          const esFranco = dia.hora_entrada === null && dia.hora_salida === null;
          return (
            <MaterialCard key={dia.dia_semana} elevation={0} className="p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Badge variant={dia.dia_semana >= 6 ? 'info' : 'default'}>{labelDia(dia.dia_semana)}</Badge>
                {dia.cruza_medianoche && <Moon className="h-4 w-4 text-[var(--color-primary)]" aria-label="Cruza medianoche" />}
              </div>
              <div className="space-y-2">
                <TimeClockPicker label={`Entrada ${labelDia(dia.dia_semana)}`} value={dia.hora_entrada} onChange={(hora_entrada) => actualizar(index, { hora_entrada })} disabled={disabled} showIcon={false} />
                <TimeClockPicker label={`Salida ${labelDia(dia.dia_semana)}`} value={dia.hora_salida} onChange={(hora_salida) => actualizar(index, { hora_salida })} disabled={disabled} showIcon={false} />
                <Input
                  type="number"
                  min={0}
                  max={240}
                  step={5}
                  value={dia.minutos_almuerzo}
                  disabled={disabled || esFranco}
                  aria-label={`Almuerzo en minutos ${labelDia(dia.dia_semana)}`}
                  onChange={(event) => actualizar(index, { minutos_almuerzo: Math.max(0, Math.min(240, Number(event.target.value) || 0)) })}
                />
                 <Switch checked={dia.cruza_medianoche} disabled={disabled || esFranco} label={`Cruza medianoche ${labelDia(dia.dia_semana)}`} onChange={(cruza_medianoche) => actualizar(index, { cruza_medianoche })} />
                 <Button type="button" variant="ghost" size="sm" fullWidth icon={Palmtree} disabled={disabled || esFranco} onClick={() => marcarFranco(index)}>
                   Franco {labelDia(dia.dia_semana)}
                </Button>
              </div>
            </MaterialCard>
          );
        })}
      </div>
    </MaterialCard>
  );
};

export default WeeklyScheduleEditor;
