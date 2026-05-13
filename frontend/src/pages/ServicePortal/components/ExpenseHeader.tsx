import React from 'react';
import { Title } from '../../../components/atoms';

const ExpenseHeader: React.FC = () => (
    <div className="md:sticky top-16 z-40 bg-[var(--color-background)]/80 backdrop-blur-md py-1.5 flex items-center justify-between transition-all">
        <div className="w-10 md:w-20"></div>
        <Title variant="h5" weight="bold" color="text-primary" className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-lg md:text-xl uppercase pointer-events-none w-full text-center">
            REPORTE DE GASTOS
        </Title>
        <div className="w-10 md:w-20"></div>
    </div>
);

export default ExpenseHeader;
