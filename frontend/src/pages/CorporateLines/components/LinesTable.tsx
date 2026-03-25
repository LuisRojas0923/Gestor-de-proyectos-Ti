import React from 'react';
import { Smartphone, AlertTriangle, Eye } from 'lucide-react';
import { Badge, Button, Text } from '../../../components/atoms';
import { CorporateLine } from '../useCorporateLines';

interface TableProps {
  lines: CorporateLine[];
  onSelect: (id: number) => void;
  employeeAlerts: Record<string, { inactivo: boolean; motivos: string }>;
}

export const LinesTable: React.FC<TableProps> = ({ lines, onSelect, employeeAlerts }) => {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-xl overflow-hidden animate-in fade-in duration-500">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-700">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Línea</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Asignado A</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Equipo</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Estado</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 text-right">Pago Empleado</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {lines.map((line) => {
              const hasAlert = line.documento_asignado && employeeAlerts[line.documento_asignado];
              
              return (
                <tr 
                  key={line.id} 
                  className="group hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-colors cursor-pointer"
                  onClick={() => onSelect(line.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-neutral-400 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 group-hover:text-primary-500 transition-colors shrink-0">
                        <Smartphone size={20} />
                      </div>
                      <div>
                        <Text weight="bold" className="font-mono text-sm block">{line.linea}</Text>
                        <Text variant="caption" color="text-secondary" className="uppercase tracking-tighter opacity-60 text-[9px] font-bold">
                          {line.empresa}
                        </Text>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 max-w-[200px]">
                      <div className={`shrink-0 w-2 h-2 rounded-full ${hasAlert ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
                      <div className="min-w-0">
                        <Text variant="body2" weight="medium" className="truncate block" title={line.asignado?.nombre || 'Sin asignar'}>
                          {line.asignado?.nombre || 'No asignada'}
                        </Text>
                        {hasAlert && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold uppercase">
                            <AlertTriangle size={10} /> Alerta
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Text variant="body2" color="text-secondary" className="truncate block max-w-[150px]">
                      {line.equipo?.modelo || '-'}
                    </Text>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={line.estatus === 'ACTIVA' ? 'success' : 'error'} size="sm" className="uppercase tracking-wider font-bold">
                      {line.estatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Text weight="bold" className="font-mono text-sm">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(line.pago_empleado)}
                    </Text>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                       <Button 
                          variant="ghost" 
                          size="sm" 
                          icon={Eye} 
                          className="hover:bg-primary-500 hover:text-white transition-all shadow-sm rounded-xl"
                       >
                         Ver Detalle
                       </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
