import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Button, Text, ThemeToggle } from '../../../components/atoms';

interface AnalystCommandHeaderProps {
    ticketId: string;
    status: string;
    subStatus?: string;
    onBack: () => void;
    onSave: () => void;
    isSaving: boolean;
}

const AnalystCommandHeader: React.FC<AnalystCommandHeaderProps> = ({
    ticketId,
    status, // Solo estados principales: Pendiente, Proceso, Cerrado
    subStatus,
    onBack,
    onSave,
    isSaving
}) => {
    const stages = ['Pendiente', 'Proceso', 'Cerrado'];
    const currentStageIndex = stages.indexOf(status);
    const progressWidth = currentStageIndex >= 0 ? (currentStageIndex / (stages.length - 1)) * 100 : 0;

    const getStageConfig = (stageName: string, index: number) => {
        const isActive = index === currentStageIndex;
        const isCompleted = index < currentStageIndex;

        // Configuración de estilos adaptada al sistema de diseño
        switch (stageName) {
            case 'Pendiente':
                return {
                    icon: isCompleted || isActive ? <Check size={10} className="text-white" strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-indigo-200 dark:bg-indigo-900"></div>,
                    bgClass: isActive || isCompleted ? 'bg-indigo-500 shadow-sm shadow-indigo-500/20' : 'bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/50',
                    textClass: `text-indigo-600 dark:text-indigo-400 ${isActive || isCompleted ? 'opacity-100' : 'opacity-50'}`
                };
            case 'Proceso':
                // Si es Proceso y el sub-estado es Pendiente Info, usamos color ámbar
                const isWarningSub = isActive && subStatus === 'Pendiente Información';
                return {
                    icon: isCompleted || isActive ? <Check size={10} className="text-white" strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-blue-200 dark:bg-blue-900"></div>,
                    bgClass: isActive || isCompleted
                        ? (isWarningSub ? 'bg-amber-500 shadow-sm shadow-amber-500/20' : 'bg-blue-500 shadow-sm shadow-blue-500/20')
                        : 'bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/50',
                    textClass: isWarningSub
                        ? 'text-amber-600 dark:text-amber-400'
                        : `text-blue-600 dark:text-blue-400 ${isActive || isCompleted ? 'opacity-100' : 'opacity-50'}`
                };
            case 'Cerrado':
                const isSuccessSub = isActive && subStatus === 'Resuelto';
                const isEscalatedSub = isActive && subStatus === 'Escalado';
                return {
                    icon: isCompleted || isActive ? <Check size={10} className="text-white" strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-emerald-200 dark:bg-emerald-900"></div>,
                    bgClass: isActive || isCompleted
                        ? (isEscalatedSub ? 'bg-purple-500' : isSuccessSub ? 'bg-emerald-500' : 'bg-slate-500')
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800',
                    textClass: isActive || isCompleted
                        ? (isEscalatedSub ? 'text-purple-600' : isSuccessSub ? 'text-emerald-600' : 'text-slate-600')
                        : 'text-slate-300 dark:text-slate-700'
                };
            default:
                return {
                    icon: null,
                    bgClass: 'bg-slate-100',
                    textClass: 'text-slate-400'
                };
        }
    };

    return (
        <header className="w-full bg-[var(--color-surface)] border-b border-neutral-200 dark:border-slate-800 shadow-sm transition-all duration-500">
            <div className="max-w-[1920px] mx-auto px-4 lg:px-6 py-4 flex flex-col md:flex-row items-center gap-4">

                {/* Identificador del Ticket + Back Button */}
                <div className="flex items-center gap-2 shrink-0 border-r border-neutral-100 dark:border-slate-800 pr-4">
                    <Button
                        variant="ghost"
                        onMouseDown={onBack}
                        icon={ArrowLeft}
                        size="sm"
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg mr-1 transition-colors text-neutral-500"
                    />
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm">#</div>
                    <div className="flex flex-col">
                        <Text variant="caption" className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Ticket ID</Text>
                        <Text variant="caption" className="text-xs font-black text-neutral-800 dark:text-neutral-100 uppercase leading-none">{ticketId}</Text>
                    </div>
                </div>

                {/* COMPONENTE DE LÍNEA DE TIEMPO COMPACTO */}
                <div className="flex-1 w-full relative">
                    <div className="flex items-center justify-between pb-4 pt-2 w-full lg:w-3/4 mx-auto overflow-x-visible">
                        {/* Línea de base */}
                        <div className="absolute left-0 right-0 h-[1.5px] bg-slate-100 dark:bg-slate-800 top-5 -translate-y-1/2 -z-0 rounded-full"></div>
                        {/* Línea de progreso */}
                        <div
                            className="absolute left-0 h-[1.5px] bg-indigo-500 top-5 -translate-y-1/2 -z-10 transition-all duration-1000 ease-out rounded-full shadow-[0_0_8px_rgba(99,102,241,0.3)] w-[var(--w)]"
                            style={{ '--w': `${progressWidth}%` } as React.CSSProperties}
                        ></div>

                        {stages.map((stage, idx) => {
                            const config = getStageConfig(stage, idx);
                            const isActive = idx === currentStageIndex;

                            return (
                                <div key={stage} className="relative z-10 flex flex-col items-center flex-1 group text-center px-1">
                                    <div className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${config.bgClass}`}>
                                        {config.icon}
                                    </div>

                                    <div className="absolute top-8 flex flex-col items-center w-full min-w-[120px]">
                                        <Text
                                            as="span"
                                            variant="caption"
                                            weight="bold"
                                            className={`uppercase tracking-tighter !text-[9px] ${config.textClass}`}
                                        >
                                            {stage}
                                        </Text>
                                        {isActive && subStatus && (
                                            <Text
                                                as="span"
                                                variant="caption"
                                                weight="bold"
                                                className={`uppercase mt-0.5 !text-[10px] tracking-widest animate-in fade-in slide-in-from-top-1 duration-700 ${config.textClass} bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-current/20 shadow-sm`}
                                            >
                                                {subStatus}
                                            </Text>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Actions Right */}
                <div className="flex items-center gap-2 shrink-0">
                    <ThemeToggle />

                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onSave}
                        loading={isSaving}
                    >
                        {isSaving ? '...' : 'Guardar'}
                    </Button>
                </div>
            </div>
        </header>
    );
};

export default AnalystCommandHeader;
