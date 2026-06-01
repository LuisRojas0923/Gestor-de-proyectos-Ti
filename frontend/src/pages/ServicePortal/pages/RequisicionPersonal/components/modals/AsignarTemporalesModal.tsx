import React from 'react';
import { Button, Input, Text, Title } from '../../../../../../components/atoms';
import type { EmpresaTemporal } from '../../types/requisicion.types';

interface Props {
  todasTemporales: EmpresaTemporal[];
  temporalesSeleccionadas: number[];
  setTemporalesSeleccionadas: (ids: number[]) => void;
  onClose: () => void;
  onGuardar: () => void;
}

const AsignarTemporalesModal: React.FC<Props> = ({
  todasTemporales,
  temporalesSeleccionadas,
  setTemporalesSeleccionadas,
  onClose,
  onGuardar
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-surface)] w-full max-w-md rounded-3xl border border-[var(--color-border)] shadow-2xl p-6 space-y-6">
        <div>
          <Title variant="h5" weight="bold">Asignar Temporales</Title>
          <Text variant="caption" color="secondary" className="mt-1">
            Selecciona las empresas temporales o medios a las que se enviará esta requisición.
          </Text>
        </div>
        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          {todasTemporales.map(t => {
            const checked = temporalesSeleccionadas.includes(t.id);
            return (
              <label // @audit-ok
                key={t.id} 
                className="flex items-center gap-4 p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
              >
                <input // @audit-ok
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (checked) {
                      setTemporalesSeleccionadas(temporalesSeleccionadas.filter(id => id !== t.id));
                    } else {
                      setTemporalesSeleccionadas([...temporalesSeleccionadas, t.id]);
                    }
                  }}
                  className="w-5 h-5 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                />
                <Text as="span" className="text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wide uppercase">{t.nombre}</Text>
              </label>
            );
          })}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onGuardar}>Guardar Asignación</Button>
        </div>
      </div>
    </div>
  );
};

export default AsignarTemporalesModal;
