import { History } from 'lucide-react';
import { Text, Icon } from '../../../components/atoms';
import { TicketHistory } from '../../../hooks/useTicketDetail';

interface AnalystSidebarTimelineProps {
    history: TicketHistory[];
}

const AnalystSidebarTimeline: React.FC<AnalystSidebarTimelineProps> = ({ history }) => {
    return (
        <aside className="col-span-3 bg-[var(--color-surface)] border-l border-[var(--color-border)] p-4 flex flex-col hidden lg:flex custom-scrollbar transition-colors">
            <div className="flex items-center gap-3 mb-6">
                <Icon name={History} size="sm" className="text-slate-400" />
                <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-widest opacity-50">Auditoría del Ticket</Text>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                {history.length > 0 ? (
                    history.map((item, idx) => (
                        <div key={item.id} className="relative pl-6 border-l border-slate-200 dark:border-slate-800 pb-2 transition-all">
                            {/* Dot */}
                            <div className={`
                                absolute -left-[4.5px] top-1 w-2 h-2 rounded-full ring-4 ring-[var(--color-surface)]
                                ${idx === 0
                                    ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse'
                                    : 'bg-slate-300 dark:bg-slate-600'}
                            `}></div>

                            <div className="space-y-1">
                                <Text variant="caption" weight="bold" color="text-primary" className="block text-[11px] leading-tight">
                                    {item.accion}
                                </Text>
                                <Text variant="caption" className="text-slate-500 dark:text-slate-400 leading-tight block text-[10px]">
                                    {item.detalle}
                                </Text>
                                <Text variant="caption" className="font-mono text-[9px] text-slate-400 uppercase pt-1 block">
                                    {new Date(item.creado_en).toLocaleString('es-ES', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </Text>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                        <Text variant="caption" className="text-slate-400 italic">Sin actividad registrada.</Text>
                    </div>
                )}
            </div>

            {/* Footer Sidebar: Metadatos */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 opacity-50">
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <Text variant="caption" weight="bold" color="inherit">Vía: Portal Web</Text>
                    <Text variant="caption" weight="bold" color="inherit">Consola V2</Text>
                </div>
            </div>
        </aside>
    );
};

export default AnalystSidebarTimeline;
