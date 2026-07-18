import React from 'react';
import { LayoutGrid, TableProperties } from 'lucide-react';
import { Button, MaterialCard, Text } from '../../../../../components/atoms';

export type VistaHorario = 'matriz' | 'tabular';

interface SelectorVistaHorarioProps {
  vista: VistaHorario;
  onChange: (vista: VistaHorario) => void;
}

const SelectorVistaHorario: React.FC<SelectorVistaHorarioProps> = ({ vista, onChange }) => (
  <MaterialCard className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0 px-1">
      <Text className="text-xs font-semibold text-[var(--color-text-primary)]">Presentación del horario</Text>
      <Text className="text-[11px] text-[var(--color-text-secondary)]">Cambia la forma de revisar los mismos datos sin perder el borrador.</Text>
    </div>
    <div role="group" aria-label="Presentación del horario" className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--color-surface-variant)] p-1">
      <Button
        variant={vista === 'matriz' ? 'primary' : 'ghost'} size="sm"
        aria-pressed={vista === 'matriz'}
        icon={LayoutGrid} onClick={() => onChange('matriz')}
      >
        Matriz semanal
      </Button>
      <Button
        variant={vista === 'tabular' ? 'primary' : 'ghost'} size="sm"
        aria-pressed={vista === 'tabular'}
        icon={TableProperties} onClick={() => onChange('tabular')}
      >
        Vista tabular
      </Button>
    </div>
  </MaterialCard>
);

export default SelectorVistaHorario;
