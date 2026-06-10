import React from 'react';
import { X, Briefcase, MapPin, Building2, Users } from 'lucide-react';
import { Badge, Button, Text, Title } from '../../../../../components/atoms';
import { MetricasCedulaItem } from '../services/requisicionService';

const ESTADO_BADGE: Record<string, { label: string; variant: 'success' | 'error' | 'warning' | 'info' | 'default' }> = {
  CONTRATADO:   { label: 'Contratado',   variant: 'success'  },
  APLICA:       { label: 'Aplica',       variant: 'info'     },
  NO_APLICA:    { label: 'No Aplica',    variant: 'error'    },
  POR_EVALUAR:  { label: 'Por evaluar',  variant: 'warning'  },
};

const estadoBadge = (estado: string) => {
  const cfg = ESTADO_BADGE[estado] ?? { label: estado, variant: 'default' as const };
  return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>;
};

interface FilaCandidatoCompactaProps {
  item: MetricasCedulaItem;
  onSelect: () => void;
}

export const FilaCandidatoCompacta: React.FC<FilaCandidatoCompactaProps> = ({ item, onSelect }) => {
  const isRecurrente = item.total_postulaciones > 1;
  const isParalelo   = item.postulaciones_activas > 1;

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center justify-between p-4 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-indigo-500 hover:shadow-md transition-all rounded-xl text-left gap-4 group animate-in fade-in duration-200"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <Text weight="bold" className="text-sm text-[var(--color-text-primary)]">{item.nombre}</Text>
          <Text variant="caption" className="text-[var(--color-text-secondary)]">Cédula: {item.cedula}</Text>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isParalelo && (
          <span className="flex items-center gap-1 text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Paralelo
          </span>
        )}
        {isRecurrente && (
          <span className="flex items-center gap-1 text-[10px] bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full font-bold">
            {item.total_postulaciones} RPs
          </span>
        )}
        {item.contratado ? (
          <Badge variant="success" size="xs">Contratado</Badge>
        ) : (
          <Badge variant="neutral" size="xs">Postulante</Badge>
        )}
        <X className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors rotate-45" />
      </div>
    </button>
  );
};

interface DetalleCandidatoDrawerProps {
  item: MetricasCedulaItem | null;
  onClose: () => void;
}

export const DetalleCandidatoDrawer: React.FC<DetalleCandidatoDrawerProps> = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      {/* Drawer Container */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full border-l border-slate-100 dark:border-slate-800 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
          <div className="min-w-0">
            <Title variant="h5" weight="bold" className="text-slate-800 dark:text-slate-100 truncate">
              {item.nombre}
            </Title>
            <Text variant="caption" className="text-slate-400 font-mono mt-0.5">
              Cédula: {item.cedula}
            </Text>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800">
              <Text size="xs" color="text-secondary" className="block font-medium">Postulaciones</Text>
              <Text className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">{item.total_postulaciones}</Text>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800">
              <Text size="xs" color="text-secondary" className="block font-medium">Procesos Activos</Text>
              <Text className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">{item.postulaciones_activas}</Text>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800">
              <Text size="xs" color="text-secondary" className="block font-medium">Contratado</Text>
              <div className="mt-1 flex justify-center items-center relative h-7">
                {item.contratado ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative" />
                  </>
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                )}
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="space-y-4">
            <Title variant="h5" weight="bold" className="text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
              Historial de Candidaturas
            </Title>
            
            <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 pl-6 space-y-6">
              {item.historial.map((h, i) => {
                const isHired = h.estado_candidato === 'CONTRATADO';
                const isRejected = h.estado_candidato === 'NO_APLICA';

                return (
                  <div key={i} className="relative">
                    {/* Timeline bullet */}
                    <div className={`absolute -left-[33px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center ${
                      isHired ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-indigo-500'
                    }`}>
                      <div className="w-1 h-1 rounded-full bg-white" />
                    </div>

                    {/* Timeline Step Card */}
                    <div className="bg-white dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:shadow-sm transition-all space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                          {h.rp}
                        </span>
                        {estadoBadge(h.estado_candidato)}
                      </div>

                      <div className="space-y-1">
                        <Text weight="bold" className="text-sm text-slate-800 dark:text-slate-100">
                          {h.cargo}
                        </Text>
                        
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            {h.area || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            {h.ciudad || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {h.empresa_temporal && (
                        <div className="text-xs bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span>Temporal: <strong>{h.empresa_temporal}</strong></span>
                        </div>
                      )}

                      {h.causal_descarte && (
                        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg p-2.5">
                          <Text size="xs" weight="medium" className="text-rose-700 dark:text-rose-400 font-bold block mb-0.5">
                            Causal de Descarte:
                          </Text>
                          <Text size="xs" className="text-rose-600 dark:text-rose-400/90 leading-relaxed">
                            {h.causal_descarte}
                          </Text>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
