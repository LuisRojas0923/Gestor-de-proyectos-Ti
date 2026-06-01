import React from 'react';
import { Button, Select, Text, Textarea, Title } from '../../../../../../components/atoms';
import type { CandidatoRequisicion } from '../../types/requisicion.types';

interface Props {
  candidatoDescartar: CandidatoRequisicion;
  causales: { value: string; label: string }[];
  causalSeleccionada: string;
  setCausalSeleccionada: (val: string) => void;
  obsDescarte: string;
  setObsDescarte: (val: string) => void;
  cargandoCandidatos: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DescartarCandidatoModal: React.FC<Props> = ({
  candidatoDescartar,
  causales,
  causalSeleccionada,
  setCausalSeleccionada,
  obsDescarte,
  setObsDescarte,
  cargandoCandidatos,
  onClose,
  onConfirm
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-surface)] w-full max-w-md rounded-3xl border border-[var(--color-border)] shadow-2xl p-6 space-y-5">
        <div>
          <Title variant="h5" weight="bold" className="text-red-600">Descartar Candidato</Title>
          <Text variant="caption" color="secondary" className="mt-1">
            Especifica los motivos por los cuales se descarta a: <strong>{candidatoDescartar.nombre_candidato}</strong>
          </Text>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <Text variant="caption" className="font-semibold text-xs text-[var(--color-text-secondary)]">Causal de Descarte (Obligatorio)</Text>
            <Select
              required
              value={causalSeleccionada}
              onChange={e => setCausalSeleccionada(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="" disabled>Selecciona la causal...</option>
              {causales.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Text variant="caption" className="font-semibold text-xs text-[var(--color-text-secondary)]">Comentarios / Observaciones</Text>
            <Textarea
              placeholder="Detalles sobre el descarte..."
              value={obsDescarte}
              onChange={e => setObsDescarte(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" className="bg-red-600 hover:bg-red-700 text-white" disabled={!causalSeleccionada || cargandoCandidatos} onClick={onConfirm}>
            Confirmar Descarte
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DescartarCandidatoModal;
