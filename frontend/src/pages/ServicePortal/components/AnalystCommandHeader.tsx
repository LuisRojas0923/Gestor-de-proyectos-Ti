import React from 'react';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { Button, Text, Icon } from '../../../components/atoms';

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
    const stages = ['Nuevo', 'Abierto', 'En Proceso', 'Escalado', 'Cerrado'];

    // Función para manejar el cambio de tema localmente si es necesario, 
    // aunque ThemeToggle ya lo hace globalmente. Aquí usamos el botón del diseño manual.
    const toggleDarkMode = () => {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    };

    return (
        <header className="h-14 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-6 z-20 sticky top-0 transition-colors">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="p-2 rounded-lg transition-colors group"
                >
                    <Icon name={ArrowLeft} size="sm" className="text-slate-500 group-hover:text-[var(--color-primary)]" />
                </Button>
                <div className="flex flex-col">
                    <Text variant="caption" weight="bold" color="text-secondary" className="uppercase tracking-tighter leading-none opacity-50">Ticket ID</Text>
                    <Text variant="body2" weight="bold" className="font-mono text-blue-600 dark:text-blue-400">{ticketId}</Text>
                </div>
            </div>

            {/* Mini Stepper Compacto - Oculto en móvil o scrollable */}
            <div className="hidden md:flex items-center gap-8 text-[10px] font-bold uppercase tracking-widest">
                {stages.map((stage) => {
                    const isActive = status === stage;
                    const isCompleted = stages.indexOf(status) > stages.indexOf(stage);

                    return (
                        <div key={stage} className="relative group">
                            <Text
                                variant="caption"
                                weight="bold"
                                className={`
                                    transition-colors
                                    ${isActive ? 'text-[var(--color-text-primary)]' :
                                        isCompleted ? 'text-blue-500' : 'text-slate-400'}
                                `}
                            >
                                {stage}
                            </Text>
                            {isActive && (
                                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    onClick={toggleDarkMode}
                    className="p-2 rounded-lg text-slate-500 transition-colors"
                >
                    <Icon name={Sun} size="sm" className="hidden dark:block" />
                    <Icon name={Moon} size="sm" className="block dark:hidden" />
                </Button>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={onSave}
                    loading={isSaving}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20"
                >
                    {isSaving ? 'GUARDANDO' : 'GUARDAR'}
                </Button>
            </div>
        </header>
    );
};

export default AnalystCommandHeader;
