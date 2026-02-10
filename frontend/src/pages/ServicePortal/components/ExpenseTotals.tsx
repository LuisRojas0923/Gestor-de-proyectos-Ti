import React from 'react';
import { Text } from '../../../components/atoms';

interface ExpenseTotalsProps {
    totalFacturado: number;
    totalSinFactura: number;
    totalGeneral: number;
}

const ExpenseTotals: React.FC<ExpenseTotalsProps> = ({ totalFacturado, totalSinFactura, totalGeneral }) => {
    return (
        <div className="flex items-center w-full h-full px-2 gap-2">
            {/* Columna 1: Total con Factura (Flex-1) */}
            <div className="flex-1 flex flex-col items-start border-r border-gray-100 dark:border-white/5 pr-2 h-10 justify-center overflow-hidden">
                <Text variant="caption" weight="bold" className="text-[9px] sm:text-[10px] uppercase tracking-wider mb-0.5 opacity-60 leading-tight whitespace-nowrap">Total con Factura</Text>
                <Text className="font-mono text-[var(--color-text-primary)] text-base sm:text-xl font-black leading-none">${totalFacturado.toLocaleString()}</Text>
            </div>

            {/* Columna 2: Total sin Factura (Flex-1) */}
            <div className="flex-1 flex flex-col items-start h-10 justify-center pl-2 overflow-hidden">
                <Text variant="caption" weight="bold" className="text-[9px] sm:text-[10px] uppercase tracking-wider mb-0.5 opacity-60 leading-tight whitespace-nowrap">Total sin Factura</Text>
                <Text className="font-mono text-[var(--color-text-primary)] text-base sm:text-xl font-black leading-none">${totalSinFactura.toLocaleString()}</Text>
            </div>

            {/* Columna 3: Gran Total (33.3% del padre para evitar overflow) */}
            <div className="w-[33.3%] flex flex-col items-start bg-[#002060]/10 py-3 px-4 sm:px-6 rounded-2xl border border-[#002060]/10 justify-center h-[68px] ml-auto overflow-hidden">
                <Text variant="caption" weight="bold" className="text-[8px] sm:text-[10px] text-[var(--color-primary)] uppercase tracking-wider mb-1 whitespace-nowrap">Gran Total</Text>
                <Text className="text-xl sm:text-3xl font-black text-[var(--color-text-primary)] leading-none text-left">
                    ${totalGeneral.toLocaleString()}
                </Text>
            </div>
        </div>
    );
};

export default ExpenseTotals;
