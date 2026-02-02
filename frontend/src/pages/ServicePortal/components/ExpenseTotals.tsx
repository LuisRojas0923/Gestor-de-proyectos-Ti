import React from 'react';
import { Text } from '../../../components/atoms';

interface ExpenseTotalsProps {
    totalFacturado: number;
    totalSinFactura: number;
    totalGeneral: number;
}

const ExpenseTotals: React.FC<ExpenseTotalsProps> = ({ totalFacturado, totalSinFactura, totalGeneral }) => {
    return (
        <section className="bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-2xl p-3 shadow-xl mt-4 border border-[var(--color-border)] backdrop-blur-sm">
            <div className="grid md:grid-cols-2 gap-4 items-center max-w-3xl mx-auto">
                <div className="grid grid-cols-2 gap-20 text-[var(--color-text-secondary)]">
                    <div className="flex flex-col flex-1 bg-[#002060]/5 p-2 rounded-xl border border-[#002060]/10">
                        <Text variant="caption" weight="bold" className="text-[10px] uppercase tracking-wider mb-0.5 opacity-70">Total Con Facturado</Text>
                        <Text className="font-mono text-[var(--color-text-primary)] text-base font-bold">${totalFacturado.toLocaleString()}</Text>
                    </div>
                    <div className="flex flex-col flex-1 bg-[#002060]/5 p-2 rounded-xl border border-[#002060]/10">
                        <Text variant="caption" weight="bold" className="text-[10px] uppercase tracking-wider mb-0.5 opacity-70">Total Sin Factura</Text>
                        <Text className="font-mono text-[var(--color-text-primary)] text-base font-bold">${totalSinFactura.toLocaleString()}</Text>
                    </div>
                </div>

                <div className="text-center md:border-l border-[var(--color-border)] md:pl-6 py-1">
                    <Text variant="caption" weight="bold" className="text-[9px] text-[var(--color-primary)] uppercase tracking-[0.2em] mb-1">Gran Total Reportado</Text>
                    <Text className="text-4xl font-black text-[var(--color-text-primary)] drop-shadow-md leading-none">
                        ${totalGeneral.toLocaleString()}
                    </Text>
                </div>
            </div>
        </section>
    );
};

export default ExpenseTotals;
