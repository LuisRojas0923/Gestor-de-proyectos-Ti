import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button, Text, Title } from '../../../components/atoms';

interface ExpenseHeaderProps {
    onBack: () => void;
}

const ExpenseHeader: React.FC<ExpenseHeaderProps> = ({ onBack }) => (
    <div className="md:sticky top-16 z-40 bg-[var(--color-background)]/80 backdrop-blur-md py-1.5 flex items-center justify-between transition-all">
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
        <Title variant="h5" weight="bold" color="text-primary" className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-lg md:text-xl uppercase pointer-events-none w-full text-center">
            REPORTE DE GASTOS
        </Title>
        <div className="w-10 md:w-20"></div>
    </div>
);

export default ExpenseHeader;
