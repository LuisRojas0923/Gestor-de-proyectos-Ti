import React, { useState } from 'react';
import { Info, X, Check } from 'lucide-react';
import { Button, Text, Title } from '../../../../../../components/atoms';

interface ModalSimuladorCentroCostoProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (codigo: string, label: string) => void;
  uens: any[];
  subcentros: any[];
  especialidades: any[];
}

export const ModalSimuladorCentroCosto: React.FC<ModalSimuladorCentroCostoProps> = ({
  isOpen, onClose, onSelect, uens, subcentros, especialidades
}) => {
  const [selUen, setSelUen] = useState<string>('');
  const [selSubcentro, setSelSubcentro] = useState<string>('');
  const [selEspecialidad, setSelEspecialidad] = useState<string>('');

  if (!isOpen) return null;

  const getSelectedUenLabel = () => uens.find(x => x.codigo === selUen)?.nombre || '---';
  const getSelectedSubcentroLabel = () => subcentros.find(x => x.codigo === selSubcentro)?.nombre || '---';
  const getSelectedEspecialidadLabel = () => especialidades.find(x => x.codigo === selEspecialidad)?.nombre || '---';

  const isComplete = selUen && selSubcentro && selEspecialidad;
  const finalCode = `${selUen || 'XX'}${selSubcentro || 'XX'}-${selEspecialidad || 'XX'}`;
  const finalLabel = `${getSelectedUenLabel()} - ${getSelectedSubcentroLabel()} - ${getSelectedEspecialidadLabel()}`;

  const handleApply = () => {
    if (isComplete) {
      onSelect(finalCode, finalLabel);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col border border-[var(--color-border)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-slate-50 dark:bg-neutral-800/50">
          <div>
            <Text as="h3" variant="h3" className="font-bold text-[var(--color-text-primary)]">Simulador de Centro de Costos</Text>
            <Text as="p" variant="body2" className="text-[var(--color-text-secondary)]">Seleccione la UEN, el Proceso y la Especialidad para generar el código.</Text>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-200 dark:hover:bg-neutral-700">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-[var(--color-background)]">
          <div className="flex flex-col xl:flex-row items-start gap-4">

            {/* Visualización Premium */}
            <div className="order-4 bg-gradient-to-br from-indigo-950 to-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-xl min-h-[300px] border border-indigo-900/30 w-full flex-[1.5] min-w-[300px]">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-300">
                  <Info size={20} />
                  <Text as="span" variant="body1" color="inherit" className="font-bold tracking-wide uppercase">Previsualización de Estructura</Text>
                </div>
                
                <div className="py-6 text-center">
                  <Text as="p" color="inherit" className="text-xs uppercase tracking-[0.25em] text-indigo-300 font-bold mb-1">Código Resultante (XXXX-XX)</Text>
                  <Title variant="h1" className="text-4xl sm:text-5xl lg:text-6xl tracking-tight font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-200 break-all">
                    {finalCode}
                  </Title>
                </div>
              </div>

              <div className="border-t border-white/10 pt-6 space-y-3">
                <div className="flex justify-between text-sm gap-2">
                  <Text as="span" color="inherit" className="opacity-60 flex-1">UEN (Unidad Estratégica de Negocio):</Text>
                  <Text as="span" color="inherit" className="font-bold text-right flex-1">{getSelectedUenLabel()} ({selUen || 'XX'})</Text>
                </div>
                <div className="flex justify-between text-sm gap-2">
                  <Text as="span" color="inherit" className="opacity-60 flex-1">Proceso:</Text>
                  <Text as="span" color="inherit" className="font-bold text-right flex-1">{getSelectedSubcentroLabel()} ({selSubcentro || 'XX'})</Text>
                </div>
                <div className="flex justify-between text-sm gap-2">
                  <Text as="span" color="inherit" className="opacity-60 flex-1">Especialidad / Subcentro:</Text>
                  <Text as="span" color="inherit" className="font-bold text-right flex-1">{getSelectedEspecialidadLabel()} ({selEspecialidad || 'XX'})</Text>
                </div>
              </div>
            </div>

            {/* UEN */}
            <div className="order-1 overflow-hidden rounded-xl border border-[var(--color-border)] shadow-sm h-fit max-h-[500px] overflow-y-auto w-full flex-1 min-w-0">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="sticky top-0 z-10">
                    <th colSpan={2} className="bg-blue-700 text-white text-center py-2 px-3 text-xs font-bold uppercase tracking-wider">
                      UEN
                    </th>
                  </tr>
                  <tr className="bg-blue-600 text-white text-xs font-semibold uppercase sticky top-8 z-10 shadow-sm">
                    <th className="py-2.5 px-3 w-16 text-center">COD</th>
                    <th className="py-2.5 px-3">UEN</th>
                  </tr>
                </thead>
                <tbody>
                  {uens.map((x, i) => (
                    <tr
                      key={x.codigo}
                      className={`border-b border-[var(--color-border)] cursor-pointer transition-colors ${
                        selUen === x.codigo
                          ? 'bg-blue-100 dark:bg-blue-900/40 font-semibold'
                          : i % 2 === 0
                          ? 'bg-[var(--color-surface)] hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          : 'bg-slate-50 dark:bg-slate-800/30 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                      onClick={() => setSelUen(x.codigo)}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-300 text-center">{x.codigo}</td>
                      <td className="py-2.5 px-3 text-[var(--color-text-primary)]">{x.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PROCESO */}
            <div className="order-2 overflow-hidden rounded-xl border border-[var(--color-border)] shadow-sm h-fit max-h-[500px] overflow-y-auto w-full flex-1 min-w-0">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="sticky top-0 z-10">
                    <th colSpan={2} className="bg-blue-700 text-white text-center py-2 px-3 text-xs font-bold uppercase tracking-wider">
                      PROCESO
                    </th>
                  </tr>
                  <tr className="bg-blue-600 text-white text-xs font-semibold uppercase sticky top-8 z-10 shadow-sm">
                    <th className="py-2.5 px-3 w-16 text-center">COD</th>
                    <th className="py-2.5 px-3">PROCESOS / GASTOS</th>
                  </tr>
                </thead>
                <tbody>
                  {subcentros.map((x, i) => (
                    <tr
                      key={x.codigo}
                      className={`border-b border-[var(--color-border)] cursor-pointer transition-colors ${
                        selSubcentro === x.codigo
                          ? 'bg-blue-100 dark:bg-blue-900/40 font-semibold'
                          : i % 2 === 0
                          ? 'bg-[var(--color-surface)] hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          : 'bg-slate-50 dark:bg-slate-800/30 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                      onClick={() => setSelSubcentro(x.codigo)}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-300 text-center">{x.codigo}</td>
                      <td className="py-2.5 px-3 text-[var(--color-text-primary)]">{x.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ESPECIALIDAD / SUBCENTRO */}
            <div className="order-3 overflow-hidden rounded-xl border border-[var(--color-border)] shadow-sm h-fit max-h-[500px] overflow-y-auto w-full flex-1 min-w-0">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="sticky top-0 z-10">
                    <th colSpan={2} className="bg-blue-700 text-white text-center py-2 px-3 text-xs font-bold uppercase tracking-wider">
                      SUBCENTRO
                    </th>
                  </tr>
                  <tr className="bg-blue-600 text-white text-xs font-semibold uppercase sticky top-8 z-10 shadow-sm">
                    <th className="py-2.5 px-3 w-16 text-center">COD</th>
                    <th className="py-2.5 px-3">ESPECIALIDAD</th>
                  </tr>
                </thead>
                <tbody>
                  {especialidades.map((x, i) => (
                    <tr
                      key={x.codigo}
                      className={`border-b border-[var(--color-border)] cursor-pointer transition-colors ${
                        selEspecialidad === x.codigo
                          ? 'bg-blue-100 dark:bg-blue-900/40 font-semibold'
                          : i % 2 === 0
                          ? 'bg-[var(--color-surface)] hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          : 'bg-slate-50 dark:bg-slate-800/30 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                      onClick={() => setSelEspecialidad(x.codigo)}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-300 text-center">{x.codigo}</td>
                      <td className="py-2.5 px-3 text-[var(--color-text-primary)]">{x.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)] bg-slate-50 dark:bg-neutral-800/50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            variant="primary" 
            onClick={handleApply} 
            disabled={!isComplete}
            icon={Check}
          >
            Aplicar Código
          </Button>
        </div>

      </div>
    </div>
  );
};
