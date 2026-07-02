import React, { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { Badge, Button, MaterialCard, Text } from '../../../../../components/atoms';
import Modal from '../../../../../components/molecules/Modal';

interface TimeClockPickerProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  presentation?: 'modal' | 'inline';
  triggerClassName?: string;
  showIcon?: boolean;
}

type PickerMode = 'hora' | 'minuto';

const HORAS_RELOJ = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTOS = Array.from({ length: 12 }, (_, index) => index * 5);
const DIAL_POSITIONS = [
  'left-[calc(50%+0px)] top-[calc(50%-78px)]',
  'left-[calc(50%+39px)] top-[calc(50%-68px)]',
  'left-[calc(50%+68px)] top-[calc(50%-39px)]',
  'left-[calc(50%+78px)] top-[calc(50%+0px)]',
  'left-[calc(50%+68px)] top-[calc(50%+39px)]',
  'left-[calc(50%+39px)] top-[calc(50%+68px)]',
  'left-[calc(50%+0px)] top-[calc(50%+78px)]',
  'left-[calc(50%-39px)] top-[calc(50%+68px)]',
  'left-[calc(50%-68px)] top-[calc(50%+39px)]',
  'left-[calc(50%-78px)] top-[calc(50%+0px)]',
  'left-[calc(50%-68px)] top-[calc(50%-39px)]',
  'left-[calc(50%-39px)] top-[calc(50%-68px)]',
] as const;

const pad = (value: number): string => String(value).padStart(2, '0');

const parseTime = (value: string | null): { hora: number; minuto: number } => {
  if (!value) return { hora: 7, minuto: 30 };
  const [horaRaw, minutoRaw] = value.split(':').map(Number);
  return {
    hora: Number.isFinite(horaRaw) ? Math.max(0, Math.min(23, horaRaw)) : 7,
    minuto: Number.isFinite(minutoRaw) ? Math.max(0, Math.min(59, minutoRaw)) : 30,
  };
};

const formatTime = (hora: number, minuto: number): string => `${pad(hora)}:${pad(minuto)}`;

const horaEnDial = (hora: number): number => {
  const modulo = hora % 12;
  return modulo === 0 ? 12 : modulo;
};

const horaDesdeDial = (dialHour: number, period: 'AM' | 'PM'): number => {
  if (period === 'AM') return dialHour === 12 ? 0 : dialHour;
  return dialHour === 12 ? 12 : dialHour + 12;
};

const TimeClockPicker: React.FC<TimeClockPickerProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  presentation = 'modal',
  triggerClassName = '',
  showIcon = true,
}) => {
  const [{ hora, minuto }, setDraft] = useState(() => parseTime(value));
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PickerMode>('hora');

  const selectedMinute = useMemo(() => Math.round(minuto / 5) * 5 % 60, [minuto]);
  const period = hora >= 12 ? 'PM' : 'AM';

  const abrir = () => {
    setDraft(parseTime(value));
    setMode('hora');
    setOpen(true);
  };

  const confirmar = () => {
    onChange(formatTime(hora, minuto));
    setOpen(false);
  };

  const cancelar = () => {
    setDraft(parseTime(value));
    setOpen(false);
  };

  const limpiar = () => {
    onChange(null);
    setOpen(false);
  };

  const cambiarPeriodo = (nextPeriod: 'AM' | 'PM') => {
    setDraft((prev) => ({ ...prev, hora: horaDesdeDial(horaEnDial(prev.hora), nextPeriod) }));
  };

  const renderDial = (
    items: number[],
    selectedItem: number,
    renderLabel: (item: number) => string,
    onSelect: (item: number) => void,
    positionForItem?: (item: number, index: number) => number,
  ) => (
    <div className="relative mx-auto h-52 w-52 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-variant)] shadow-inner sm:h-56 sm:w-56">
      <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-primary)]" />
      {items.map((item, index) => {
        const positionIndex = positionForItem ? positionForItem(item, index) : index;
        const selected = item === selectedItem;
        return (
          <Button
            key={item}
            type="button"
            variant="custom"
            size="xs"
            rounded="full"
            aria-label={`Seleccionar ${mode} ${renderLabel(item)}`}
            onClick={() => onSelect(item)}
            className={`absolute h-8 w-8 !p-0 -translate-x-1/2 -translate-y-1/2 text-xs ${DIAL_POSITIONS[positionIndex]} ${
              selected
                ? 'bg-[var(--color-primary)] text-[var(--color-surface)] shadow-md'
                : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-primary)]/10'
            }`}
          >
            {renderLabel(item)}
          </Button>
        );
      })}
    </div>
  );

  const content = (
    <div className="space-y-3">
      <div className="rounded-2xl bg-[var(--color-primary)]/10 px-4 py-3 text-center">
        <Text className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)]">Hora seleccionada</Text>
        <Text className="mt-0.5 text-3xl font-semibold leading-none text-[var(--color-primary)]">
          {formatTime(hora, minuto)}
        </Text>
      </div>

      <div className="mx-auto grid max-w-48 grid-cols-2 gap-1 rounded-full bg-[var(--color-surface-variant)] p-1">
        <Button variant={mode === 'hora' ? 'primary' : 'ghost'} size="xs" rounded="full" onClick={() => setMode('hora')}>
          Hora
        </Button>
        <Button variant={mode === 'minuto' ? 'primary' : 'ghost'} size="xs" rounded="full" onClick={() => setMode('minuto')}>
          Minutos
        </Button>
      </div>

      {mode === 'hora' && (
        <div className="mx-auto grid max-w-32 grid-cols-2 gap-1 rounded-full border border-[var(--color-border)] p-1">
          <Button variant={period === 'AM' ? 'primary' : 'ghost'} size="xs" rounded="full" onClick={() => cambiarPeriodo('AM')}>
            AM
          </Button>
          <Button variant={period === 'PM' ? 'primary' : 'ghost'} size="xs" rounded="full" onClick={() => cambiarPeriodo('PM')}>
            PM
          </Button>
        </div>
      )}

      {mode === 'hora'
        ? renderDial(
            HORAS_RELOJ,
            horaEnDial(hora),
            (item) => pad(item),
                (item) => {
                  setDraft((prev) => ({ ...prev, hora: horaDesdeDial(item, period) }));
                  setMode('minuto');
                },
                (item) => item % 12,
              )
        : renderDial(MINUTOS, selectedMinute, (item) => pad(item), (item) => setDraft((prev) => ({ ...prev, minuto: item })))}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Badge variant="default" size="xs">Formato 24h</Badge>
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" onClick={limpiar}>Limpiar</Button>
          <Button variant="ghost" size="sm" onClick={cancelar}>Cancelar</Button>
          <Button variant="primary" size="sm" onClick={confirmar}>Aceptar</Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        fullWidth
        disabled={disabled}
        onClick={abrir}
        aria-label={`${label}: ${value || 'Sin hora'}`}
        className={`h-10 justify-between rounded-2xl border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-text-primary)] hover:bg-[var(--color-surface-variant)] ${triggerClassName}`}
      >
        {showIcon && <Clock className="mr-2 h-4 w-4 text-[var(--color-text-secondary)]" />}
        {value || '--:--'}
      </Button>

      {presentation === 'modal' ? (
        <Modal isOpen={open} onClose={cancelar} title={`Seleccionar ${label.toLowerCase()}`} size="sm" contentClassName="!p-3 sm:!p-4">
          {content}
        </Modal>
      ) : open ? (
        <MaterialCard className="mt-3 p-3 shadow-lg" role="group" aria-label={`Selector de ${label.toLowerCase()}`}>
          {content}
        </MaterialCard>
      ) : null}
    </>
  );
};

export default TimeClockPicker;
