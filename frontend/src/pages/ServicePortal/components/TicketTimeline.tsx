import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Text, Badge } from '../../../components/atoms';
import { TicketStatus } from '../../../hooks/useTicketDetail';

interface TicketTimelineProps {
    status: string;
    stages: TicketStatus[];
}

const TicketTimeline: React.FC<TicketTimelineProps> = ({ status, stages }) => {
    const currentStageIndex = stages.indexOf(status as any);

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 lg:p-10 shadow-sm border border-neutral-100 dark:border-neutral-800 transition-all duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                        <CheckCircle size={18} className="text-blue-500" />
                    </div>
                    <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-[0.2em] opacity-60">Línea de Tiempo del Ticket</Text>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-full border border-slate-100 dark:border-slate-800">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <Text variant="caption" weight="bold" className="text-blue-600 dark:text-blue-400">Estado Actual: {status}</Text>
                </div>
            </div>

            <div className="relative flex items-center justify-between overflow-x-auto pb-10 custom-scrollbar scrollbar-hide">
                {/* Línea de progreso de fondo */}
                <div className="absolute left-0 right-0 h-[2px] bg-slate-100 dark:bg-slate-800 top-4 -translate-y-1/2 -z-0 rounded-full"></div>

                {/* Línea de progreso activa */}
                <div
                    className="absolute left-0 h-[2px] bg-blue-500 top-4 -translate-y-1/2 -z-0 transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    style={{ width: `${(currentStageIndex >= 0 ? (currentStageIndex / (stages.length - 1)) * 100 : 0)}%` }}
                ></div>

                {stages.map((stage, idx) => {
                    const isActive = idx === currentStageIndex;
                    const isCompleted = idx < currentStageIndex;

                    return (
                        <div key={stage} className="relative z-10 flex flex-col items-center flex-1 min-w-[100px] group">
                            {/* Punto de Indicador */}
                            <div className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 scale-90 group-hover:scale-100 ${isCompleted ? 'bg-blue-500' :
                                isActive ? 'bg-white dark:bg-blue-600 border-4 border-blue-500 shadow-lg shadow-blue-500/20' :
                                    'bg-white dark:bg-neutral-800 border-2 border-slate-200 dark:border-slate-700'
                                }`}>
                                {isCompleted ? (
                                    <CheckCircle size={14} className="text-white" />
                                ) : (
                                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-500 dark:bg-white animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                )}
                            </div>

                            {/* Etiqueta de Texto */}
                            <div className="absolute top-10 flex flex-col items-center">
                                {isActive ? (
                                    <Badge
                                        variant="info"
                                        size="sm"
                                        className="whitespace-nowrap tracking-[0.1em] uppercase text-[9px] font-black scale-110"
                                    >
                                        {stage}
                                    </Badge>
                                ) : (
                                    <Text
                                        variant="caption"
                                        weight="bold"
                                        className={`whitespace-nowrap tracking-wider uppercase text-[9px] transition-all duration-300 ${isCompleted ? 'text-slate-900 dark:text-white opacity-80' :
                                            'text-slate-400 dark:text-slate-600'
                                            }`}
                                    >
                                        {stage}
                                    </Text>
                                )}

                                {isActive && (
                                    <div className="mt-2 w-6 h-[3px] bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="h-4"></div>
        </div>
    );
};

export default TicketTimeline;
