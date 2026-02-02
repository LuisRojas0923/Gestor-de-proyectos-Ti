import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Input, Select, Text, CurrencyInput } from '../../../components/atoms';
import { LineaGasto, OTData } from '../hooks/useExpenseForm';

interface ExpenseLineItemProps {
    linea: LineaGasto;
    index: number;
    isSearchingOT: string | null;
    ots: OTData[];
    updateLinea: (id: string, field: keyof LineaGasto, value: any) => void;
    removeLinea: (id: string) => void;
    handleOTSearch: (query: string, lineaId: string) => void;
    selectOT: (ot: OTData, lineaId: string) => void;
    setLineas: React.Dispatch<React.SetStateAction<LineaGasto[]>>;
}

const ExpenseLineItem: React.FC<ExpenseLineItemProps> = ({
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
        <div className={`bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all group/line relative ${isSearchingOT === linea.id ? 'z-[100]' : 'z-10'}`}>
            <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[40px_2fr_1.5fr_1.5fr_1.2fr_1.2fr_1.5fr_1.5fr_2fr_50px] gap-4 items-end">

                    {/* # No. */}
                    <div className="hidden lg:block">
                        <div className="h-10 flex flex-col items-center justify-center bg-[#002060]/5 rounded-xl border border-[#002060]/10">
                            <Text weight="bold" className="text-sm text-[#002060] font-mono leading-none">{index + 1}</Text>
                        </div>
                    </div>

                    {/* Categoría */}
                    <div>
                        <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 mb-1 uppercase tracking-tight block">Categoría</Text>
                        <Select
                            value={linea.categoria}
                            onChange={(e) => updateLinea(linea.id, 'categoria', e.target.value)}
                            className="w-full"
                            size="sm"
                            options={[
                                { value: "", label: "Seleccionar..." },
                                { value: "Alimentación", label: "Alimentación" },
                                { value: "Hospedaje", label: "Hospedaje" },
                                { value: "Transporte Municipal", label: "Transporte Mun." },
                                { value: "Transporte Intermunicipal", label: "Transporte Inter." },
                                { value: "Peajes", label: "Peajes" },
                                { value: "Combustible", label: "Combustible" },
                                { value: "Papeleria", label: "Papelería" },
                                { value: "Imprevistos", label: "Imprevistos" }
                            ]}
                        />
                    </div>

                    {/* Fecha */}
                    <div>
                        <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 mb-1 uppercase tracking-tight block">Fecha</Text>
                        <Input
                            type="date"
                            value={linea.fecha}
                            onChange={(e) => updateLinea(linea.id, 'fecha', e.target.value)}
                            className="w-full"
                            size="sm"
                        />
                    </div>

                    {/* OT / OS */}
                    <div>
                        <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 mb-1 uppercase tracking-tight block">OT / OS</Text>
                        <div className="relative">
                            <Input
                                placeholder="Buscar..."
                                value={linea.ot}
                                onChange={(e) => handleOTSearch(e.target.value, linea.id)}
                                className="w-full"
                                size="sm"
                            />
                            {isSearchingOT === linea.id && ots.length > 0 && (
                                <div className="absolute top-full left-0 w-full sm:w-[320px] bg-[var(--color-surface)] backdrop-blur-md border border-[var(--color-border)] rounded-2xl shadow-2xl z-[100] max-h-60 overflow-y-auto mt-2 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {ots.map((ot) => (
                                        <div
                                            key={ot.numero}
                                            className="px-4 py-3 hover:bg-[var(--color-primary)]/10 cursor-pointer border-b border-[var(--color-border)]/50 last:border-none transition-colors group"
                                            onClick={() => selectOT(ot, linea.id)}
                                        >
                                            <div className="flex items-center justify-between mb-0.5">
                                                <Text weight="bold" className="text-xs text-[var(--color-text-primary)]">{ot.numero}</Text>
                                                <Text weight="bold" className="text-[9px] text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">SELECCIONAR</Text>
                                            </div>
                                            <Text variant="caption" className="text-[10px] text-[var(--color-text-secondary)] opacity-70 block truncate uppercase tracking-tight">{ot.cliente}</Text>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* C. Costo */}
                    <div>
                        <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 mb-1 uppercase tracking-tight block">C. Costo</Text>
                        <Select
                            value={linea.cc}
                            disabled={!linea.ot || linea.combinacionesCC.length === 0}
                            onChange={(e) => {
                                const newCC = e.target.value;
                                const sccsDisp = linea.combinacionesCC
                                    .filter(c => c.centrocosto?.trim() === newCC)
                                    .map(c => c.subcentrocosto?.trim())
                                    .filter(Boolean);
                                const newSCC = sccsDisp.length === 1 ? (sccsDisp[0] || '') : '';
                                setLineas(prevLineas => prevLineas.map(l =>
                                    l.id === linea.id
                                        ? { ...l, cc: newCC, scc: newSCC }
                                        : l
                                ));
                            }}
                            className="w-full"
                            size="sm"
                            options={[
                                { value: "", label: "..." },
                                ...Array.from(new Set(linea.combinacionesCC.map(c => c.centrocosto?.trim()).filter(Boolean))).map(cc => ({
                                    value: cc || '',
                                    label: cc || ''
                                }))
                            ]}
                        />
                    </div>

                    {/* Subcentro */}
                    <div>
                        <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 mb-1 uppercase tracking-tight block">Subcentro</Text>
                        <Select
                            value={linea.scc}
                            disabled={!linea.cc}
                            onChange={(e) => updateLinea(linea.id, 'scc', e.target.value)}
                            className="w-full"
                            size="sm"
                            options={[
                                { value: "", label: "..." },
                                ...(linea.combinacionesCC
                                    .filter(c => c.centrocosto?.trim() === linea.cc)
                                    .map(c => c.subcentrocosto?.trim())
                                    .filter(Boolean)
                                    .map(scc => ({
                                        value: scc || '',
                                        label: scc || ''
                                    }))
                                )
                            ]}
                        />
                    </div>

                    {/* Factura */}
                    <div>
                        <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 mb-1 uppercase tracking-tight block">Val. Factura</Text>
                        <CurrencyInput
                            value={linea.valorConFactura.toString()}
                            onChange={(val) => updateLinea(linea.id, 'valorConFactura', val)}
                            className="!text-[12px] !h-10 text-right font-bold bg-[var(--color-primary)]/5"
                            size="sm"
                        />
                    </div>

                    {/* Sin Factura */}
                    <div>
                        <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 mb-1 uppercase tracking-tight block">Val. Sin Fac.</Text>
                        <CurrencyInput
                            value={linea.valorSinFactura.toString()}
                            onChange={(val) => updateLinea(linea.id, 'valorSinFactura', val)}
                            className="!text-[12px] !h-10 text-right font-bold bg-[var(--color-primary)]/5"
                            size="sm"
                        />
                    </div>

                    {/* Observaciones */}
                    <div>
                        <Text as="label" variant="caption" weight="bold" className="text-[11px] text-[var(--color-text-secondary)] opacity-60 mb-1 uppercase tracking-tight block">Observaciones</Text>
                        <Input
                            placeholder="Motivo..."
                            value={linea.observaciones}
                            onChange={(e) => updateLinea(linea.id, 'observaciones', e.target.value)}
                            className="w-full"
                            size="sm"
                        />
                    </div>

                    {/* Botón Eliminar */}
                    <div className="flex justify-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLinea(linea.id)}
                            className="text-[var(--color-text-secondary)] opacity-20 hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all rounded-xl !p-2 h-10 w-10 flex items-center justify-center"
                            icon={Trash2}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ExpenseLineItem;
