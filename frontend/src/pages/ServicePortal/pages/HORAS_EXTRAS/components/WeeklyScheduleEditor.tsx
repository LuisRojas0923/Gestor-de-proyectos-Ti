import { Eraser, Moon } from 'lucide-react';
import Badge from '../../../../../components/atoms/Badge';
import Button from '../../../../../components/atoms/Button';
import Input from '../../../../../components/atoms/Input';
import MaterialCard from '../../../../../components/atoms/MaterialCard';
import Switch from '../../../../../components/atoms/Switch';
import { Text } from '../../../../../components/atoms/Text';
import type { HorarioSemanalDia } from '../../../../../types/horariosRelaciones';
import { calcularHorasDia, labelDia } from '../utils/horarioUtils';
import { errorTurno } from '../utils/validarTurno';
import TimeClockPicker from './TimeClockPicker';

interface WeeklyScheduleEditorProps<T extends HorarioSemanalDia> {
  value: T[];
  onChange: (value: T[]) => void;
  disabled?: boolean;
  compact?: boolean;
  showHoursSummary?: boolean;
  ariaLabel?: string;
}

const formatearHoras = (horas: number): string => horas.toLocaleString('es-CO', {
  maximumFractionDigits: 2,
});

const WeeklyScheduleEditor = <T extends HorarioSemanalDia>({
  value,
  onChange,
  disabled = false,
  compact = false,
  showHoursSummary = false,
  ariaLabel = 'Editor semanal de horario',
}: WeeklyScheduleEditorProps<T>) => {
  const actualizar = (index: number, patch: Partial<HorarioSemanalDia>) => {
    onChange(value.map((dia, current) => current === index ? { ...dia, ...patch } : dia));
  };

  const limpiarDia = (index: number) => actualizar(index, {
    hora_entrada: null,
    hora_salida: null,
    minutos_almuerzo: 0,
    cruza_medianoche: false,
  });

  const horasPorDia = value.map((dia) => calcularHorasDia(
    dia.hora_entrada,
    dia.hora_salida,
    dia.minutos_almuerzo,
    dia.cruza_medianoche,
  ));
  const horasSemanales = horasPorDia.reduce((total, horas) => total + horas, 0);
  const erroresPorDia = value.map((dia) => errorTurno(dia));
  const diasInvalidos = erroresPorDia.filter(Boolean).length;

  return (
    <MaterialCard className="p-3 sm:p-4" role="group" aria-label={ariaLabel}>
      <Text className="mb-3 text-sm text-[var(--color-text-secondary)]">
        Configura entrada, salida y almuerzo. Activa jornada nocturna cuando la salida sea al día siguiente.{showHoursSummary ? ' Las horas mostradas ya descuentan el almuerzo.' : ''}
      </Text>
      {showHoursSummary && (
        <MaterialCard
          elevation={0}
          role="status"
          aria-live="polite"
          className="mb-3 flex flex-col gap-2 border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <Text className="font-semibold text-[var(--color-text-primary)]">Total de la plantilla</Text>
            <Text className="text-xs text-[var(--color-text-secondary)]">Suma neta de los siete días</Text>
          </div>
          <Badge variant={diasInvalidos > 0 ? 'warning' : 'primary'} size="lg">
            {diasInvalidos > 0
              ? `${diasInvalidos} ${diasInvalidos === 1 ? 'día' : 'días'} por revisar`
              : `${formatearHoras(horasSemanales)} h semanales`}
          </Badge>
        </MaterialCard>
      )}
      <div className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-7' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-7'}`}>
        {value.map((dia, index) => {
          const esFranco = dia.hora_entrada === null && dia.hora_salida === null;
          return (
            <MaterialCard key={dia.dia_semana} elevation={0} className="p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Badge variant={dia.dia_semana >= 6 ? 'info' : 'default'}>{labelDia(dia.dia_semana)}</Badge>
                <div className="flex items-center gap-1.5">
                  {dia.cruza_medianoche && <Moon className="h-4 w-4 text-[var(--color-primary)]" aria-label="Cruza medianoche" />}
                  {showHoursSummary && (
                    <Badge variant={erroresPorDia[index] ? 'warning' : 'primary'} size="sm">
                      {erroresPorDia[index] ? 'Revisar' : `${formatearHoras(horasPorDia[index])} h`}
                    </Badge>
                  )}
                </div>
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
                  <Button type="button" variant="ghost" size="sm" fullWidth icon={Eraser} disabled={disabled || esFranco} onClick={() => limpiarDia(index)}>
                    Limpiar {labelDia(dia.dia_semana)}
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
