import React from 'react';
import { Button, Text, Textarea, Title } from '../../../../../../components/atoms';
import type { RequisicionRP } from '../../types/requisicion.types';

interface Props {
  requisicion: RequisicionRP;
  motivoCancelacion: string;
  setMotivoCancelacion: (val: string) => void;
  cancelando: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const CancelarRPModal: React.FC<Props> = ({
  requisicion,
  motivoCancelacion,
  setMotivoCancelacion,
  cancelando,
  onClose,
  onConfirm
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-surface)] w-full max-w-md rounded-3xl border border-[var(--color-border)] shadow-2xl p-6 space-y-5">
        <div>
          <Title variant="h5" weight="bold" className="text-rose-600">Cancelar Requisición</Title>
          <Text variant="caption" color="secondary" className="mt-1">
            Esta acción es irreversible. La RP <strong>{requisicion.rp}</strong> quedará en estado <strong>Cancelada</strong>.
          </Text>
        </div>
        <div className="space-y-1">
          <Text variant="caption" className="font-semibold text-xs text-[var(--color-text-secondary)]">Motivo de cancelación (obligatorio)</Text>
          <Textarea
            placeholder="Ej: Por orden de gerencia, la vacante ya no es necesaria..."
            value={motivoCancelacion}
            onChange={e => setMotivoCancelacion(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            rows={4}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Volver</Button>
          <Button
            variant="primary"
            className="bg-rose-600 hover:bg-rose-700 text-white"
            disabled={!motivoCancelacion.trim() || cancelando}
            onClick={onConfirm}
          >
            {cancelando ? 'Cancelando...' : 'Confirmar Cancelación'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CancelarRPModal;
