import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Text } from '../../../../../components/atoms';
import Modal from '../../../../../components/molecules/Modal';
import type { PlanSemanaIn } from '../../../../../types/horasExtrasPlanificador';

interface ConfirmarSemanaModalProps {
  abierto: boolean;
  confirmando: boolean;
  empleadosCount: number;
  semana: PlanSemanaIn;
  onCerrar: () => void;
  onConfirmar: () => void;
}

const ConfirmarSemanaModal: React.FC<ConfirmarSemanaModalProps> = ({
  abierto, confirmando, empleadosCount, semana, onCerrar, onConfirmar,
}) => (
  <Modal isOpen={abierto} onClose={onCerrar} title="Confirmar semana" size="md">
    <div className="space-y-4">
      <Text className="text-sm text-[var(--color-text-secondary)]">
        Se generarán los cálculos de horas extras para {empleadosCount} empleados en la semana {semana.semana_iso} de {semana.anio}.
      </Text>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary)]/5 p-4">
        <Text className="text-xs text-[var(--color-text-secondary)]">Rango a confirmar</Text>
        <Text className="font-semibold text-[var(--color-primary)]">{semana.fecha_inicio} → {semana.fecha_fin}</Text>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCerrar} disabled={confirmando}>Revisar de nuevo</Button>
        <Button variant="primary" onClick={onConfirmar} loading={confirmando} icon={CheckCircle2}>
          Confirmar y guardar
        </Button>
      </div>
    </div>
  </Modal>
);

export default ConfirmarSemanaModal;
