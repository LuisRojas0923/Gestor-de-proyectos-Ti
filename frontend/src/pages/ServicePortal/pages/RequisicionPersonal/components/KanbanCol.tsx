import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Text } from '../../../../../components/atoms';
import type { CandidatoRequisicion } from '../types/requisicion.types';

interface KanbanColProps {
  title: string;
  count: number;
  colorClass: string;
  candidatos: CandidatoRequisicion[];
  onMover: (cand: CandidatoRequisicion, target: string) => void;
  ops: { label: string; target: string }[];
}

const KanbanCol: React.FC<KanbanColProps> = ({ title, count, colorClass, candidatos, onMover, ops }) => {
  return (
    <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden flex flex-col max-h-[500px] bg-[var(--color-surface)] shadow-sm">
      <div className={`p-3.5 border-b border-[var(--color-border)] flex items-center justify-between font-bold text-xs uppercase tracking-wider ${colorClass.split(' ')[0]} ${colorClass.split(' ')[1]}`}>
        <span className={colorClass.split(' ')[2]}>{title}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-black bg-[var(--color-surface)] ${colorClass.split(' ')[2]}`}>{count}</span>
      </div>
      <div className="p-3 overflow-y-auto space-y-3 flex-grow bg-[var(--color-surface-secondary)]/15">
        {candidatos.length === 0 ? (
          <div className="text-center py-8 text-xs italic text-[var(--color-text-tertiary)]">Sin candidatos</div>
        ) : (
          candidatos.map(c => (
            <div key={c.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 shadow-sm flex flex-col space-y-2 hover:border-[var(--color-primary)]/50 transition-colors">
              <div>
                <Text className="font-bold text-sm block leading-tight text-[var(--color-text-primary)]">{c.nombre_candidato}</Text>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[10px] text-blue-800 font-bold tracking-wide uppercase shrink-0">
                    {c.nombre_temporal || 'Directo'}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-tertiary)] shrink-0">
                    {c.creado_en ? new Date(c.creado_en).toLocaleDateString('es-CO') : ''}
                  </span>
                </div>
                {c.estado === 'NO_APLICA' && c.causal_descarte && (
                  <div className="mt-2 p-1.5 rounded bg-red-50 border border-red-100 flex items-start gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
                    <span className="text-[10px] text-red-700 leading-tight">
                      Causal: <strong>{c.causal_descarte}</strong>
                      {c.observaciones && <span className="block mt-0.5 text-red-600/80 italic font-medium">"{c.observaciones}"</span>}
                    </span>
                  </div>
                )}
                {c.estado !== 'NO_APLICA' && c.observaciones && (
                  <div className="mt-2 text-[10px] text-[var(--color-text-secondary)] italic leading-tight bg-[var(--color-surface-secondary)]/40 p-1.5 rounded">
                    "{c.observaciones}"
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-1 border-t border-[var(--color-border)] pt-2 mt-1">
                {ops.map(op => (
                  <button
                    key={op.target}
                    onClick={() => onMover(c, op.target)}
                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                      op.target === 'NO_APLICA' 
                        ? 'border-red-200 bg-red-50 hover:bg-red-100 text-red-800' 
                        : op.target === 'CONTRATADO'
                        ? 'border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-800 font-extrabold'
                        : 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default KanbanCol;
