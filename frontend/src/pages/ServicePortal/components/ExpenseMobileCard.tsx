import React from 'react';
import { Trash2, Calendar, Hash, Tag, Info, DollarSign } from 'lucide-react';
import { Text, Input, Select, MaterialCard, Button } from '../../../components/atoms';
import { CurrencyInput } from '../../../components/atoms/CurrencyInput';

interface ExpenseMobileCardProps {
    linea: any;
    index: number;
    isSearchingOT: string | null;
    ots: any[];
    updateLinea: (id: string, field: any, value: any) => void;
    removeLinea: (id: string) => void;
    handleOTSearch: (query: string, id: string) => void;
    selectOT: (ot: any, id: string) => void;
    setLineas: React.Dispatch<React.SetStateAction<any[]>>;
}

const ExpenseMobileCard: React.FC<ExpenseMobileCardProps> = ({
    linea,
    index,
    isSearchingOT,
    ots,
    updateLinea,
    removeLinea,
    handleOTSearch,
    selectOT,
    setLineas
}) => {
    return (
        <MaterialCard className="p-4 mb-4 relative group overflow-visible">
            {/* Cabecera: # e Icono eliminar */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--color-border)]/50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex items-center justify-center bg-[#002060]/10 rounded-full border border-[#002060]/20">
                        <Text as="span" variant="caption" weight="bold" className="text-[#002060] text-[10px] leading-none">{index + 1}</Text>
                    </div>
                    <Text weight="bold" className="text-sm uppercase tracking-tight text-[var(--color-primary)]">Gasto Registrado</Text>
                </div>
                <Button
                    variant="ghost"
                    onClick={() => removeLinea(linea.id)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors flex items-center justify-center !w-9 !h-9"
                    icon={Trash2}
                />
            </div>

            {/* Grid de Campos */}
            <div className="space-y-4">
                {/* Categoría y Fecha */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 opacity-50 mb-1">
                            <Tag size={12} className="text-[var(--color-text-secondary)]" />
                            <Text variant="caption" weight="bold" className="text-[9px] uppercase tracking-wider">Categoría</Text>
                        </div>
                        <Select
                            value={linea.categoria}
                            onChange={(e) => updateLinea(linea.id, 'categoria', e.target.value)}
                            className="text-xs bg-[var(--color-surface-variant)]/30 border-[var(--color-border)]/50 rounded-xl"
                            options={[
                                { value: 'Alimentación', label: 'Alimentación' },
                                { value: 'Hospedaje', label: 'Hospedaje' },
                                { value: 'Transporte Municipal', label: 'Transporte Mun.' },
                                { value: 'Transporte Intermunicipal', label: 'Transporte Inter.' },
                                { value: 'Peajes', label: 'Peajes' },
                                { value: 'Combustible', label: 'Combustible' },
                                { value: 'Papeleria', label: 'Papelería' },
                                { value: 'Imprevistos', label: 'Imprevistos' },
                            ]}
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 opacity-50 mb-1">
                            <Calendar size={12} className="text-[var(--color-text-secondary)]" />
                            <Text variant="caption" weight="bold" className="text-[9px] uppercase tracking-wider">Fecha</Text>
                        </div>
                        <Input
                            type="date"
                            value={linea.fecha}
                            onChange={(e) => updateLinea(linea.id, 'fecha', e.target.value)}
                            className="text-xs bg-[var(--color-surface-variant)]/30 border-[var(--color-border)]/50 rounded-xl"
                            fullWidth
                        />
                    </div>
                </div>

                {/* OT / OS (Con buscador superpuesto) */}
                <div className="space-y-1 relative">
                    <div className="flex items-center gap-1.5 opacity-50 mb-1">
                        <Hash size={12} className="text-[var(--color-text-secondary)]" />
                        <Text variant="caption" weight="bold" className="text-[9px] uppercase tracking-wider">OT / Proyecto</Text>
                    </div>
                    <Input
                        type="text"
                        placeholder="Buscar OT..."
                        value={linea.ot}
                        onChange={(e) => handleOTSearch(e.target.value, linea.id)}
                        className="text-xs font-bold bg-[var(--color-surface-variant)]/30 border-[var(--color-border)]/50 rounded-xl placeholder:font-normal placeholder:opacity-40"
                    />
                    {isSearchingOT === linea.id && ots.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-[var(--color-surface)] backdrop-blur-md border border-[var(--color-border)] rounded-xl shadow-2xl z-[100] max-h-60 overflow-y-auto mt-1 py-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            {ots.map((ot) => (
                                <div
                                    key={ot.numero}
                                    className="px-3 py-2 hover:bg-[var(--color-primary)]/10 cursor-pointer border-b border-[var(--color-border)]/50 last:border-none transition-colors group"
                                    onClick={() => selectOT(ot, linea.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <Text weight="bold" className="text-[10px] text-[var(--color-text-primary)]">{ot.numero}</Text>
                                        <Text weight="bold" className="text-[8px] text-[var(--color-primary)] opacity-0 group-hover:opacity-100 uppercase">Seleccionar</Text>
                                    </div>
                                    <Text variant="caption" className="text-[9px] text-[var(--color-text-secondary)] truncate uppercase">{ot.cliente}</Text>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Centro de Costo y Subcentro */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Text variant="caption" weight="bold" className="text-[9px] uppercase tracking-wider opacity-50 mb-1">C. Costo</Text>
                        <Select
                            value={linea.cc}
                            disabled={!linea.ot || linea.combinacionesCC.length === 0}
                            onChange={(e) => {
                                const newCC = e.target.value;
                                const sccsDisp = linea.combinacionesCC
                                    .filter((c: any) => c.centrocosto?.trim() === newCC)
                                    .map((c: any) => c.subcentrocosto?.trim())
                                    .filter(Boolean);
                                const newSCC = sccsDisp.length === 1 ? (sccsDisp[0] || '') : '';
                                setLineas(prevLineas => prevLineas.map((l: any) =>
                                    l.id === linea.id
                                        ? { ...l, cc: newCC, scc: newSCC }
                                        : l
                                ));
                            }}
                            className="text-xs bg-[var(--color-surface-variant)]/30 border-[var(--color-border)]/50 rounded-xl"
                            options={[
                                { value: '', label: '...' },
                                ...Array.from(new Set(linea.combinacionesCC.map((c: any) => c.centrocosto?.trim()).filter(Boolean))).map((cc: any) => ({
                                    value: cc || '',
                                    label: cc || ''
                                }))
                            ]}
                        />
                    </div>
                    <div className="space-y-1">
                        <Text variant="caption" weight="bold" className="text-[9px] uppercase tracking-wider opacity-50 mb-1">Subcentro</Text>
                        <Select
                            value={linea.scc}
                            disabled={!linea.cc}
                            onChange={(e) => updateLinea(linea.id, 'scc', e.target.value)}
                            className="text-xs bg-[var(--color-surface-variant)]/30 border-[var(--color-border)]/50 rounded-xl"
                            options={[
                                { value: '', label: '...' },
                                ...linea.combinacionesCC
                                    .filter((c: any) => c.centrocosto?.trim() === linea.cc)
                                    .map((c: any) => c.subcentrocosto?.trim())
                                    .filter(Boolean)
                                    .map((scc: any) => ({
                                        value: scc || '',
                                        label: scc || ''
                                    }))
                            ]}
                        />
                    </div>
                </div>

                {/* Valores Financieros */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--color-primary)]/5 rounded-2xl border border-[var(--color-primary)]/10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[var(--color-primary)] mb-1">
                            <DollarSign size={10} />
                            <Text variant="caption" weight="bold" className="text-[9px] uppercase tracking-wider">Con Factura</Text>
                        </div>
                        <CurrencyInput
                            value={linea.valorConFactura.toString()}
                            onChange={(val: string) => updateLinea(linea.id, 'valorConFactura', val)}
                            className="!text-xs !h-9 text-right font-black bg-white dark:bg-black/20 border-none shadow-sm rounded-xl !px-3"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[var(--color-text-secondary)] mb-1">
                            <Info size={10} />
                            <Text variant="caption" weight="bold" className="text-[9px] uppercase tracking-wider">Sin Factura</Text>
                        </div>
                        <CurrencyInput
                            value={linea.valorSinFactura.toString()}
                            onChange={(val: string) => updateLinea(linea.id, 'valorSinFactura', val)}
                            className="!text-xs !h-9 text-right font-black bg-white dark:bg-black/20 border-none shadow-sm rounded-xl !px-3"
                        />
                    </div>
                </div>

                {/* Observaciones */}
                <div className="space-y-1">
                    <Text variant="caption" weight="bold" className="text-[9px] uppercase tracking-wider opacity-50 mb-1">Motivo / Observación</Text>
                    <Input
                        type="text"
                        placeholder="Ej: Almuerzo entrega proyecto..."
                        value={linea.observaciones}
                        onChange={(e) => updateLinea(linea.id, 'observaciones', e.target.value)}
                        className="text-xs bg-[var(--color-surface-variant)]/30 border-[var(--color-border)]/50 rounded-xl placeholder:opacity-30"
                        fullWidth
                    />
                </div>
            </div>
        </MaterialCard>
    );
};

export default ExpenseMobileCard;
