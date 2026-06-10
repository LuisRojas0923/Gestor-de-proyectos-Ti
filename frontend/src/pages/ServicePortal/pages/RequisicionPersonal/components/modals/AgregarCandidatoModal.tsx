import React from 'react';
import { Button, Input, Select, Text, Textarea, Title } from '../../../../../../components/atoms';
import type { RequisicionTemporal } from '../../types/requisicion.types';

interface Props {
  asignadas: RequisicionTemporal[];
  nuevoNombreCand: string;
  setNuevoNombreCand: (val: string) => void;
  nuevaCedulaCand: string;
  setNuevaCedulaCand: (val: string) => void;
  nuevaTemporalCand: number;
  setNuevaTemporalCand: (val: number) => void;
  nuevasObsCand: string;
  setNuevasObsCand: (val: string) => void;
  cargandoCandidatos: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const AgregarCandidatoModal: React.FC<Props> = ({
  asignadas,
  nuevoNombreCand,
  setNuevoNombreCand,
  nuevaCedulaCand,
  setNuevaCedulaCand,
  nuevaTemporalCand,
  setNuevaTemporalCand,
  nuevasObsCand,
  setNuevasObsCand,
  cargandoCandidatos,
  onClose,
  onSubmit
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <form onSubmit={onSubmit} className="bg-[var(--color-surface)] w-full max-w-md rounded-3xl border border-[var(--color-border)] shadow-2xl p-6 space-y-5">
        <div>
          <Title variant="h5" weight="bold">Agregar Candidato</Title>
          <Text variant="caption" color="secondary" className="mt-1">
            Ingresa los datos del nuevo candidato remitido para la vacante.
          </Text>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <Text variant="caption" className="font-semibold text-xs text-[var(--color-text-secondary)]">Nombre del Candidato</Text>
            <Input
              required
              type="text"
              placeholder="Ej: Carlos Gómez"
              value={nuevoNombreCand}
              onChange={e => setNuevoNombreCand(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div className="space-y-1">
            <Text variant="caption" className="font-semibold text-xs text-[var(--color-text-secondary)]">
              Cédula <span className="text-red-500">*</span>
            </Text>
            <Input
              required
              type="text"
              placeholder="Ej: 1234567890"
              value={nuevaCedulaCand}
              onChange={e => setNuevaCedulaCand(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div className="space-y-1">
            <Text variant="caption" className="font-semibold text-xs text-[var(--color-text-secondary)]">Temporal Remitente</Text>
            <Select
              required
              value={nuevaTemporalCand || ''}
              onChange={e => setNuevaTemporalCand(Number(e.target.value))}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="" disabled>Selecciona una temporal...</option>
              {asignadas.map(a => (
                <option key={a.temporal_id} value={a.temporal_id}>{a.nombre_temporal}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Text variant="caption" className="font-semibold text-xs text-[var(--color-text-secondary)]">Observaciones iniciales</Text>
            <Textarea
              placeholder="Ej: Experiencia de 3 años, vive en Cali."
              value={nuevasObsCand}
              onChange={e => setNuevasObsCand(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              rows={2}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={cargandoCandidatos}>Registrar Candidato</Button>
        </div>
      </form>
    </div>
  );
};

export default AgregarCandidatoModal;
