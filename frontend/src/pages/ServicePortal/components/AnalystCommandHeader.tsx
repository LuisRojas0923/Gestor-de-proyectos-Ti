import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Button, Text, ThemeToggle } from '../../../components/atoms';

interface AnalystCommandHeaderProps {
    ticketId: string;
    status: string;
    onBack: () => void;
    onSave: () => void;
    isSaving: boolean;
}

const AnalystCommandHeader: React.FC<AnalystCommandHeaderProps> = ({
    ticketId,
    status,
    onBack,
    onSave,
    isSaving
}) => {
    const stages = ['Asignado', 'En Proceso', 'Pendiente Info', 'Escalado', 'Resuelto', 'Cerrado'];
    const currentStageIndex = stages.indexOf(status);
    const progressWidth = currentStageIndex >= 0 ? (currentStageIndex / (stages.length - 1)) * 100 : 0;

    const getStageConfig = (stageName: string, index: number) => {
        const isActive = index === currentStageIndex;
        const isCompleted = index < currentStageIndex;

        // Configuración de estilos adaptada al sistema de diseño
        switch (stageName) {
            case 'Asignado':
                return {
                    icon: isCompleted || isActive ?
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M20 6 9 17l-5-5"></path></svg> :
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-200 dark:bg-indigo-900"></div>,
                    bgClass: isActive || isCompleted ? 'bg-indigo-500 shadow-sm shadow-indigo-500/20' : 'bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/50',
                    textClass: `text-indigo-600 dark:text-indigo-400 ${isActive || isCompleted ? 'opacity-100' : 'opacity-50'}`
                };
            case 'En Proceso':
                return {
                    icon: isCompleted || isActive ?
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M20 6 9 17l-5-5"></path></svg> :
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-200 dark:bg-blue-900"></div>,
                    bgClass: isActive || isCompleted ? 'bg-blue-500 shadow-sm shadow-blue-500/20' : 'bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/50',
                    textClass: `text-blue-600 dark:text-blue-400 ${isActive || isCompleted ? 'opacity-100' : 'opacity-50'}`
                };
            case 'Pendiente Info':
                return {
                    icon: <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-amber-500 dark:bg-white animate-pulse' : 'bg-amber-500 dark:bg-amber-900'}`}></div>,
                    bgClass: isActive ? 'bg-white dark:bg-amber-600 border-[3px] border-amber-500 shadow-md shadow-amber-500/30' : 'bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/50',
                    textClass: isActive ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shadow-sm px-1.5 py-0.5 rounded-full' : 'text-amber-500 dark:text-amber-700'
                };
            default:
                let color = 'slate';
                if (stageName === 'Escalado') color = 'purple';
                if (stageName === 'Resuelto') color = 'emerald';

                const textColors: any = { purple: 'text-purple-300 dark:text-purple-800', emerald: 'text-emerald-300 dark:text-emerald-800', slate: 'text-slate-300 dark:text-slate-700' };
                const bgColors: any = { purple: 'bg-purple-200 dark:bg-purple-900', emerald: 'bg-emerald-200 dark:bg-emerald-900', slate: 'bg-slate-200 dark:bg-slate-700' };

                return {
                    icon: <div className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-white' : bgColors[color]}`}></div>,
                    bgClass: isCompleted ? `bg-${color}-500 shadow-sm` : `bg-white dark:bg-slate-800 border border-${color}-200 dark:border-${color}-900/50`,
                    textClass: textColors[color]
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
                    <div className="flex items-center justify-between pb-4 pt-2 w-full lg:w-auto overflow-x-auto custom-scrollbar scrollbar-hide">
                        {/* Línea de base */}
                        <div className="absolute left-0 right-0 h-[1.5px] bg-slate-100 dark:bg-slate-800 top-5 -translate-y-1/2 -z-0 rounded-full"></div>
                        {/* Línea de progreso */}
                        <div
                            className="absolute left-0 h-[1.5px] bg-indigo-500 top-5 -translate-y-1/2 -z-10 transition-all duration-1000 ease-out rounded-full shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                            style={{ width: `${progressWidth}%` }}
                        ></div>

                        {stages.map((stage, idx) => {
                            const config = getStageConfig(stage, idx);
                            const isActive = idx === currentStageIndex;
                            const isCompleted = idx < currentStageIndex;

                            const isGenericCompleted = isCompleted && ['Escalado', 'Resuelto', 'Cerrado'].includes(stage);
                            const genericCompletedClass = isGenericCompleted ?
                                (stage === 'Escalado' ? 'bg-purple-500 border-none' : stage === 'Resuelto' ? 'bg-emerald-500 border-none' : 'bg-slate-500 border-none') : '';

                            const finalBgClass = isGenericCompleted ? genericCompletedClass : config.bgClass;
                            const finalTextClass = isGenericCompleted ? config.textClass.replace('300', '600').replace('800', '400') : config.textClass;
                            const inactiveTextClass = "text-slate-300 dark:text-slate-700";

                            return (
                                <div key={stage} className="relative z-10 flex flex-col items-center flex-1 min-w-[60px] group text-center px-1">
                                    <div className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${finalBgClass}`}>
                                        {isGenericCompleted ? (
                                            <Check size={10} className="text-white" strokeWidth={4} />
                                        ) : config.icon}
                                    </div>

                                    {isActive && stage === 'Pendiente Info' ? (
                                        <div className="absolute top-8 flex flex-col items-center w-full">
                                            <Text as="span" weight="bold" className={config.textClass}>
                                                {stage}
                                            </Text>
                                        </div>
                                    ) : (
                                        <Text as="span" weight="bold" className={`mt-2 text-[8px] tracking-tighter uppercase ${['Escalado', 'Resuelto', 'Cerrado'].includes(stage) && !isGenericCompleted ? inactiveTextClass : finalTextClass}`}>
                                            {stage}
                                        </Text>
                                    )}
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
