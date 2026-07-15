import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Text, Textarea } from '../../../../../components/atoms';
import { Copy, Eraser } from 'lucide-react';
import TimeClockPicker from './TimeClockPicker';
import { labelDia } from '../utils/horarioUtils';

interface HorarioMasivoCardProps {
  compacto?: boolean;
  ocultarAcciones?: boolean;
  diasSemana: number[];
  diasDestino: Set<number>;
  seleccionadosCount: number;
  plantillaEntrada: string;
  plantillaSalida: string;
  plantillaAlmuerzo: number;
  novedadMasiva: string;
  observacionMasiva: string;
  codigosNovedad: string[];
  opcionesAlmuerzo: { value: string; label: string }[];
  selectorPlantilla?: React.ReactNode;
  onPlantillaEntradaChange: (value: string) => void;
  onPlantillaSalidaChange: (value: string) => void;
  onPlantillaAlmuerzoChange: (value: number) => void;
  onNovedadMasivaChange: (value: string) => void;
  onObservacionMasivaChange: (value: string) => void;
  onToggleDiaDestino: (dia: number) => void;
  onAplicarHorario: () => void;
  onLimpiarDias: () => void;
}

const chipClass = 'flex h-8 min-w-0 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/90 px-2 shadow-none';
const chipLabelClass = 'shrink-0 !text-[10px] font-semibold text-[var(--color-text-secondary)]';
const chipPickerClass = '!h-6 !justify-center !rounded-lg !border-none !bg-transparent !px-0 !text-[12px] !font-semibold !text-[var(--color-text-primary)] !shadow-none hover:!bg-transparent focus:!ring-0 focus:!ring-offset-0';
const actionButtonClass = 'h-8 rounded-full !px-3 text-xs';

interface ChipSelectOption {
  value: string;
  label: string;
}

interface ChipSelectProps {
  value: string;
  options: ChipSelectOption[];
  ariaLabel: string;
  className?: string;
  onChange: (value: string) => void;
}

const ChipSelect: React.FC<ChipSelectProps> = ({ value, options, ariaLabel, className = '', onChange }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<React.CSSProperties | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 116);
    setPosition({
      position: 'fixed',
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="custom"
        aria-label={`${ariaLabel}: ${selected?.label ?? ''}`}
        onClick={() => setOpen((prev) => !prev)}
        className={`h-6 min-w-0 rounded-lg border-none bg-transparent !px-1 text-[12px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-variant)] focus:ring-1 focus:ring-[var(--color-primary)]/40 focus:ring-offset-0 [&>span]:!text-[12px] ${className}`}
      >
        <Text as="span" className="truncate !text-[12px] font-semibold">
          {selected?.label ?? '—'}
        </Text>
      </Button>

      {open && position && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          className="z-[9999] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-xl"
          style={position}
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <Button
                key={option.value || '__empty__'}
                type="button"
                variant="custom"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full justify-start rounded-lg !px-2 !py-1 text-left text-[12px] ${
                  active
                    ? 'bg-[var(--color-primary)] text-[var(--color-surface)]'
                    : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-variant)]'
                }`}
              >
                {option.label}
              </Button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
};

const HorarioMasivoCard: React.FC<HorarioMasivoCardProps> = ({
  compacto = false,
  ocultarAcciones = false,
  diasSemana,
  diasDestino,
  seleccionadosCount,
  plantillaEntrada,
  plantillaSalida,
  plantillaAlmuerzo,
  novedadMasiva,
  observacionMasiva,
  codigosNovedad,
  opcionesAlmuerzo,
  selectorPlantilla,
  onPlantillaEntradaChange,
  onPlantillaSalidaChange,
  onPlantillaAlmuerzoChange,
  onNovedadMasivaChange,
  onObservacionMasivaChange,
  onToggleDiaDestino,
  onAplicarHorario,
  onLimpiarDias,
}) => {
  const sinEmpleados = seleccionadosCount === 0;
  const toolbarClass = compacto
    ? 'mt-2 border-t border-[var(--color-border)]/70 pt-2.5'
    : 'border-b border-[var(--color-border)] bg-[var(--color-surface-variant)]/25 p-2.5';
  const observacionClass = compacto
    ? 'mt-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-2.5'
    : 'border-b border-[var(--color-border)] bg-[var(--color-surface)] p-2.5';
  const layoutClass = compacto
    ? 'grid gap-2 2xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] 2xl:items-center'
    : 'flex flex-col gap-2 2xl:flex-row 2xl:items-center 2xl:justify-between';
  const controlesClass = compacto
    ? 'flex min-w-0 flex-wrap items-center gap-1.5 2xl:grid 2xl:grid-cols-[104px_96px_142px_190px_minmax(280px,1fr)]'
    : 'flex min-w-0 flex-wrap items-center gap-2';
  const accionesClass = compacto
    ? 'flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border)]/60 pt-2.5'
    : 'grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap 2xl:justify-end';

  return (
    <div>
      <div className={toolbarClass}>
        <div className={layoutClass}>
          <div className={controlesClass}>
            <div className={`${chipClass} min-w-[104px]`}>
              <Text className={chipLabelClass}>Entrada</Text>
              <div className="min-w-[42px] flex-1">
                <TimeClockPicker
                  label="Entrada"
                  value={plantillaEntrada}
                  onChange={(next) => onPlantillaEntradaChange(next ?? '')}
                  showIcon={false}
                  triggerClassName={chipPickerClass}
                />
              </div>
            </div>
            <div className={`${chipClass} min-w-[96px]`}>
              <Text className={chipLabelClass}>Salida</Text>
              <div className="min-w-[42px] flex-1">
                <TimeClockPicker
                  label="Salida"
                  value={plantillaSalida}
                  onChange={(next) => onPlantillaSalidaChange(next ?? '')}
                  showIcon={false}
                  triggerClassName={chipPickerClass}
                />
              </div>
            </div>
            <div className={`${chipClass} min-w-[142px]`}>
              <Text className={chipLabelClass}>Almuerzo</Text>
              <ChipSelect
                value={String(plantillaAlmuerzo)}
                options={opcionesAlmuerzo}
                ariaLabel="Almuerzo"
                className="w-[58px] shrink-0"
                onChange={(next) => onPlantillaAlmuerzoChange(Number(next))}
              />
            </div>
            <div className={`${chipClass} min-w-[190px]`}>
              <Text className={chipLabelClass}>Novedad</Text>
              <ChipSelect
                value={novedadMasiva}
                options={codigosNovedad.map((codigo) => ({ value: codigo, label: codigo || 'Sin novedad' }))}
                ariaLabel="Novedad"
                className="min-w-[102px] flex-1"
                onChange={onNovedadMasivaChange}
              />
            </div>
            <div className={`${chipClass} max-w-full gap-1.5 !h-auto min-h-8 py-1`}>
              <Text className={chipLabelClass}>Días</Text>
              <div className="flex min-w-0 flex-wrap items-center gap-1 sm:flex-nowrap">
                {diasSemana.map((dia) => {
                  const activo = diasDestino.has(dia);
                  return (
                    <Button
                      key={dia}
                      type="button"
                      variant="custom"
                      size="xs"
                      rounded="full"
                      onClick={() => onToggleDiaDestino(dia)}
                      className={`h-6 min-w-8 border !px-1.5 !text-[10px] [&>span]:!text-[10px] ${activo
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-surface)] shadow-sm'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]'
                      }`}
                    >
                      {labelDia(dia)}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {selectorPlantilla && <div className="min-w-0">{selectorPlantilla}</div>}

          {!ocultarAcciones && (
            <div className={accionesClass}>
              <Button variant="secondary" size="sm" onClick={onAplicarHorario} disabled={sinEmpleados} className={actionButtonClass}><Copy className="w-4 h-4 mr-1" />{novedadMasiva ? `Aplicar + ${novedadMasiva}` : 'Aplicar'}</Button>
              <Button variant="ghost" size="sm" onClick={onLimpiarDias} disabled={sinEmpleados} className={actionButtonClass}><Eraser className="w-4 h-4 mr-1" />Limpiar</Button>
            </div>
          )}
        </div>
      </div>

        {novedadMasiva && (
          <div className={observacionClass}>
            <Text className="mb-1 text-[10px] font-medium text-[var(--color-text-secondary)]">Observación para la novedad</Text>
            <Textarea value={observacionMasiva} onChange={(e) => onObservacionMasivaChange(e.target.value)} rows={2} placeholder="Observación para la novedad masiva" />
          </div>
        )}
    </div>
  );
};

export default HorarioMasivoCard;
