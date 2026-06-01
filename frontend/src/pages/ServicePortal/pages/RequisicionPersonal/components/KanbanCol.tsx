import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button, Text } from '../../../../../components/atoms';
import type { CandidatoRequisicion } from '../types/requisicion.types';

interface KanbanColProps {
  title: string;
  count: number;
  theme: 'indigo' | 'emerald' | 'violet' | 'red';
  candidatos: CandidatoRequisicion[];
  onMover: (cand: CandidatoRequisicion, target: string) => void;
  ops: { label: string; target: string }[];
}

const KanbanCol: React.FC<KanbanColProps> = ({ title, count, theme, candidatos, onMover, ops }) => {
  const themeClasses = {
    indigo: { header: 'bg-indigo-100 border-indigo-200 text-indigo-900', badge: 'bg-white text-indigo-700' },
    emerald: { header: 'bg-emerald-100 border-emerald-200 text-emerald-900', badge: 'bg-white text-emerald-700' },
    violet: { header: 'bg-violet-100 border-violet-200 text-violet-900', badge: 'bg-white text-violet-700' },
    red: { header: 'bg-rose-100 border-rose-200 text-rose-900', badge: 'bg-white text-rose-700' },
  }[theme];

  return (
    <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden flex flex-col max-h-[500px] bg-[var(--color-surface)] shadow-sm">
      <div className={`p-3.5 border-b flex items-center justify-between font-bold text-xs uppercase tracking-wider ${themeClasses?.header}`}>
        <Text as="span" color="inherit">{title}</Text>
        <Text as="span" className={`px-2 py-0.5 rounded-full text-xs font-black shadow-sm ${themeClasses?.badge}`}>{count}</Text>
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
                  <Text as="span" className="px-1.5 py-0.5 rounded bg-blue-50 text-[10px] text-blue-800 font-bold tracking-wide uppercase shrink-0">
                    {c.nombre_temporal || 'Directo'}
                  </Text>
                  <Text as="span" className="text-[10px] text-[var(--color-text-tertiary)] shrink-0">
                    {c.creado_en ? new Date(c.creado_en).toLocaleDateString('es-CO') : ''}
                  </Text>
                </div>
                {c.estado === 'NO_APLICA' && c.causal_descarte && (
                  <div className="mt-2 p-1.5 rounded bg-red-50 border border-red-100 flex items-start gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
                    <Text as="span" className="text-[10px] text-red-700 leading-tight">
                      Causal: <strong>{c.causal_descarte}</strong>
                      {c.observaciones && <Text as="span" className="block mt-0.5 text-red-600/80 italic font-medium">"{c.observaciones}"</Text>}
                    </Text>
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
                  <Button
                    variant="custom"
                    key={op.target}
                    onClick={() => onMover(c, op.target)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-wide font-bold border transition-all hover:shadow-sm ${
                      op.target === 'NO_APLICA' 
                        ? 'border-red-200 bg-red-50 hover:bg-red-100 text-red-700' 
                        : op.target === 'CONTRATADO'
                        ? 'border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700'
                        : 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700'
                    }`}
                  >
                    {op.label}
                  </Button>
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
