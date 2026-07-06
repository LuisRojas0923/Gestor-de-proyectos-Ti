import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button, Text, Title , Textarea} from '../../../../../../components/atoms';
import { RequisicionRP } from '../../types/requisicion.types';

interface Props {
  requisicion: RequisicionRP;
  motivo: string;
  setMotivo: (motivo: string) => void;
  devolviendo: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DevolverModificacionModal: React.FC<Props> = ({
  requisicion,
  motivo,
  setMotivo,
  devolviendo,
  onClose,
  onConfirm
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <Title variant="h6" className="text-amber-900 dark:text-amber-100 font-bold">
              Solicitar Modificación Salarial
            </Title>
          </div>
          <Button variant="custom" onClick={onClose} className="p-1 rounded-xl hover:bg-black/5 text-amber-700 transition-colors">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <Text>
            Estás a punto de devolver la requisición <Text as="span" color="inherit" className="font-bold">{requisicion.rp}</Text> al solicitante para que modifique los valores de contratación (Salario, Movilización, Alimentación o Vivienda).
          </Text>

          <div className="space-y-1.5">
            <Text variant="small" weight="bold">Motivo de la solicitud <Text as="span" color="inherit" className="text-rose-500">*</Text></Text>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explica por qué se requiere ajustar la oferta salarial..."
              className="w-full h-24 px-3 py-2 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 resize-none"
            />
          </div>
        </div>

        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]/30 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={devolviendo}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={onConfirm} 
            disabled={devolviendo || !motivo.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {devolviendo ? 'Devolviendo...' : 'Confirmar Devolución'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DevolverModificacionModal;
