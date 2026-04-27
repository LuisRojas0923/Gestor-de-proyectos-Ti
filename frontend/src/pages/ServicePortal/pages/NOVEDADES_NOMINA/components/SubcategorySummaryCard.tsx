import React from 'react';
import { Title, Text } from '../../../../../components/atoms';

interface SubcategorySummaryCardProps {
    label: string;
    value?: string | number;
    details?: Record<string, string | number>;
    tooltipDetail?: Record<string, string | number>;
    isCentered?: boolean;
    isTabulated?: boolean;
    formatAsCurrency?: boolean;
    detailColumns?: number;
}

const SubcategorySummaryCard: React.FC<SubcategorySummaryCardProps> = ({
    label,
    value,
    details,
    tooltipDetail,
    isCentered = false,
    isTabulated = false,
    formatAsCurrency = false,
    detailColumns = 1
}) => {
    return (
        <div className="bg-[var(--color-surface)] p-3 rounded-xl shadow-lg border border-[var(--color-border)]/10 flex flex-col h-full min-h-[90px] group relative transition-all duration-300 hover:shadow-xl hover:border-[var(--color-primary)]/20">
            <Text 
                size="sm" 
                weight="bold"
                color="text-secondary" 
                className={`mb-1.5 uppercase tracking-wider text-[10px] ${isTabulated || isCentered ? 'text-center' : ''}`}
            >
                {label}
                {tooltipDetail && <Text as="span" className="ml-1 opacity-50">ⓘ</Text>}
            </Text>
            
            <div className={`flex flex-col flex-1 justify-center ${isCentered ? 'items-center text-center' : ''}`}>
                {isTabulated && details ? (
                    <div className={`w-full ${detailColumns > 1 
                        ? `grid grid-cols-1 ${
                            detailColumns === 2 ? 'sm:grid-cols-2' : 
                            detailColumns === 3 ? 'sm:grid-cols-3' : 
                            detailColumns === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-1'
                          } gap-x-3 gap-y-1` 
                        : 'space-y-1'}`}>
                        {Object.entries(details).map(([k, v]) => {
                            const isTotal = k.toUpperCase() === 'TOTAL';
                            return (
                                <React.Fragment key={k}>
                                    <div className={`flex justify-between items-center gap-2 ${isTotal && detailColumns > 1 ? `col-span-full border-t border-[var(--color-border)]/10 mt-2 pt-1` : ''} ${isTotal && detailColumns === 1 ? 'border-t border-[var(--color-border)]/10 my-1 pt-1' : ''}`}>
                                        <Text size="sm" weight={isTotal ? "bold" : "normal"} className={`${isTotal ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'} text-[11px]`}>
                                            {k}:
                                        </Text>
                                        <Text size="sm" weight="black" className={`${isTotal ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'} text-[11px]`}>
                                            {typeof v === 'number' 
                                                ? v.toLocaleString('es-CO', { 
                                                    style: formatAsCurrency ? 'currency' : 'decimal', 
                                                    currency: 'COP', 
                                                    maximumFractionDigits: formatAsCurrency ? 0 : 0 
                                                  }) 
                                                : v}
                                        </Text>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                ) : (
                    <Title 
                        variant="h5" 
                        weight="black" 
                        className={`text-[var(--color-text-primary)] leading-tight text-[11px] ${isCentered ? 'text-center' : ''}`}
                    >
                        {typeof value === 'number' 
                            ? value.toLocaleString('es-CO', { 
                                style: formatAsCurrency ? 'currency' : 'decimal', 
                                currency: 'COP', 
                                maximumFractionDigits: 0 
                              }) 
                            : value}
                    </Title>
                )}
            </div>

            {/* Tooltip */}
            {tooltipDetail && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block z-[100] w-64 p-3 bg-[var(--color-surface)] rounded-xl shadow-2xl border border-[var(--color-border)]/20 pointer-events-none transition-all duration-200 animate-in fade-in slide-in-from-top-2">
                    <div className="text-[10px] uppercase font-black text-[var(--color-primary)] mb-2 border-b border-[var(--color-border)]/10 pb-1.5">
                        Detalle de {label}
                    </div>
                    <div className="space-y-1.5">
                        {Object.entries(tooltipDetail).map(([k, v]) => {
                            const isTotal = k.toUpperCase() === 'TOTAL';
                            return (
                                <div key={k} className={`flex justify-between items-center text-[11px] ${isTotal ? 'pt-1.5 mt-1.5 border-t border-[var(--color-border)]/10 border-dashed' : ''}`}>
                                    <Text as="span" className={`${isTotal ? 'font-black text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] opacity-60'}`}>{k}:</Text>
                                    <Text as="span" className={`${isTotal ? 'font-black text-[var(--color-primary)]' : 'font-bold text-[var(--color-text-primary)]'}`}>
                                        {typeof v === 'number' 
                                            ? v.toLocaleString('es-CO', { 
                                                style: formatAsCurrency ? 'currency' : 'decimal', 
                                                currency: 'COP', 
                                                maximumFractionDigits: 0 
                                              }) 
                                            : v}
                                    </Text>
                                </div>
                            );
                        })}
                    </div>
                    {/* Arrow */}
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[var(--color-surface)] border-t border-l border-[var(--color-border)]/20 rotate-45"></div>
                </div>
            )}
        </div>
    );
};

export default SubcategorySummaryCard;
