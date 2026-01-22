import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Text } from '../../../components/atoms';
import { TicketStatus } from '../../../hooks/useTicketDetail';

interface TicketTimelineProps {
    status: string;
    stages: TicketStatus[];
}

const TicketTimeline: React.FC<TicketTimelineProps> = ({ status, stages }) => {
    const currentStageIndex = stages.indexOf(status as any);

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-8">
                <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-[0.2em] opacity-40">Ciclo de Vida del Ticket</Text>
                <Text variant="caption" weight="bold" color="primary" className="uppercase">Tiempo transcurrido: 4.2h</Text>
            </div>

            <div className="relative flex items-center justify-between px-4">
                <div className="absolute left-10 right-10 h-0.5 bg-neutral-100 dark:bg-neutral-800 top-1/2 -translate-y-1/2 -z-0"></div>
                {(() => {
                    const progressWidth = `${(currentStageIndex >= 0 ? (currentStageIndex / (stages.length - 1)) * 80 : 0)}%`;
                    const progressStyle = { width: progressWidth };
                    return (
                        <div className="absolute left-10 h-0.5 bg-blue-500 top-1/2 -translate-y-1/2 -z-0 transition-all duration-700" style={progressStyle}></div>
                    );
                })()}

                {stages.map((stage, idx) => (
                    <div key={stage} className="relative z-10 flex flex-col items-center group">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${idx <= currentStageIndex
                            ? 'bg-blue-500 border-blue-100 dark:border-blue-900/30'
                            : 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700'
                            }`}>
                            {idx < currentStageIndex ? (
                                <CheckCircle size={16} className="text-white" />
                            ) : (
                                <Text variant="caption" weight="bold" color="white" className={`${idx <= currentStageIndex ? '' : 'text-neutral-400'}`}>0{idx + 1}</Text>
                            )}
                        </div>
                        <Text variant="caption" weight="bold" className={`absolute -bottom-8 whitespace-nowrap tracking-widest ${idx <= currentStageIndex ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'
                            }`}>
                            {stage}
                        </Text>
                    </div>
                ))}
            </div>
            <div className="h-10"></div>
        </div>
    );
};

export default TicketTimeline;
