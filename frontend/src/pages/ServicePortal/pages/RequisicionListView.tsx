import React from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button, Text, Title } from '../../../components/atoms';

interface RequisicionListViewProps {
    onBack: () => void;
}

const RequisicionListView: React.FC<RequisicionListViewProps> = ({ onBack }) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="text-neutral-700 hover:bg-white/10 dark:text-neutral-300 dark:hover:bg-neutral-800 px-3 py-1.5 text-sm rounded-lg flex items-center gap-2"
                >
                    <ArrowLeft size={18} />
                    <Text weight="medium" className="text-base font-medium text-left text-gray-900 dark:text-gray-100 hidden sm:inline">
                        Volver
                    </Text>
                </Button>
                <Title variant="h4" weight="bold" color="text-primary" className="uppercase tracking-tight">
                    Solicitudes de Personal
                </Title>
                <div className="w-20"></div>
            </div>

            <div className="bg-[var(--color-surface)] rounded-[2rem] border border-[var(--color-border)] shadow-sm overflow-hidden p-12 flex flex-col items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center space-x-3 text-[var(--color-primary)] opacity-50 mb-6">
                        <Clock size={48} className="animate-pulse" />
                    </div>
                    <Title variant="h3" weight="bold" className="text-[var(--color-text-primary)]">
                        En Proceso
                    </Title>
                    <Text variant="body1" color="text-secondary" className="max-w-md mx-auto">
                        Actualmente no hay requisiciones registradas o están siendo procesadas por el sistema.
                    </Text>
                </div>
            </div>
        </div>
    );
};

export default RequisicionListView;
