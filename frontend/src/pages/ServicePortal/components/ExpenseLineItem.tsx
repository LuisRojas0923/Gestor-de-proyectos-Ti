import React from 'react';
import { Trash2 } from 'lucide-react';
import { Text, Input, Select } from '../../../components/atoms';
import { CurrencyInput } from '../../../components/atoms/CurrencyInput';

interface ExpenseLineItemProps {
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
        <tr className={`hover:bg-[var(--color-surface-variant)]/30 transition-colors group/line ${isSearchingOT === linea.id ? 'relative z-[60]' : 'relative z-0'}`}>
            {/* # No. */}
            <td className="px-4 py-2 border-b border-[var(--color-border)] border-r border-[var(--color-border)]/30">
                <div className="h-8 flex items-center justify-center bg-[#002060]/5 rounded-lg border border-[#002060]/10">
                    <span className="text-xs text-[#002060] font-mono font-bold">{index + 1}</span>
                </div>
            </td>

            {/* Categoría */}
            <td className="px-2 py-2 border-b border-[var(--color-border)]">
                <Select
                    value={linea.categoria}
                    onChange={(e) => updateLinea(linea.id, 'categoria', e.target.value)}
                    className="!border-none !bg-transparent !shadow-none !px-2 !h-8 text-[11px]"
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
            </td>

            {/* Fecha */}
            <td className="px-2 py-2 border-b border-[var(--color-border)]">
                <Input
                    type="date"
                    value={linea.fecha}
                    onChange={(e) => updateLinea(linea.id, 'fecha', e.target.value)}
                    className="!border-none !bg-transparent !shadow-none !px-2 !h-8 text-[11px]"
                    fullWidth
                />
            </td>

            {/* OT / OS */}
            <td className="px-2 py-2 border-b border-[var(--color-border)]">
                <div className="relative">
                    <Input
                        type="text"
                        placeholder="Buscar OT..."
                        value={linea.ot}
                        onChange={(e) => handleOTSearch(e.target.value, linea.id)}
                        className="!border-none !bg-transparent !shadow-none !px-2 !h-8 text-[11px] font-bold placeholder:font-normal placeholder:opacity-40"
                    />
                    {isSearchingOT === linea.id && ots.length > 0 && (
                        <div className="absolute top-full left-0 w-[300px] bg-[var(--color-surface)] backdrop-blur-md border border-[var(--color-border)] rounded-xl shadow-2xl z-[100] max-h-60 overflow-y-auto mt-1 py-1 animate-in fade-in slide-in-from-top-1 duration-200">
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
            </td>

            {/* C. Costo */}
            <td className="px-2 py-2 border-b border-[var(--color-border)]">
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
                    className="!border-none !bg-transparent !shadow-none !px-2 !h-8 text-[11px]"
                    options={[
                        { value: '', label: '...' },
                        ...Array.from(new Set(linea.combinacionesCC.map((c: any) => c.centrocosto?.trim()).filter(Boolean))).map((cc: any) => ({
                            value: cc || '',
                            label: cc || ''
                        }))
                    ]}
                />
            </td>

            {/* Subcentro */}
            <td className="px-2 py-2 border-b border-[var(--color-border)]">
                <Select
                    value={linea.scc}
                    disabled={!linea.cc}
                    onChange={(e) => updateLinea(linea.id, 'scc', e.target.value)}
                    className="!border-none !bg-transparent !shadow-none !px-2 !h-8 text-[11px]"
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
            </td>

            {/* Factura */}
            <td className="px-2 py-2 border-b border-[var(--color-border)]">
                <CurrencyInput
                    value={linea.valorConFactura.toString()}
                    onChange={(val: string) => updateLinea(linea.id, 'valorConFactura', val)}
                    className="!text-[11px] !h-8 text-right font-bold bg-[var(--color-primary)]/5 border-none focus:ring-2 focus:ring-[var(--color-primary)]/20 rounded-lg !px-2"
                    size="sm"
                />
            </td>

            {/* Sin Factura */}
            <td className="px-2 py-2 border-b border-[var(--color-border)]">
                <CurrencyInput
                    value={linea.valorSinFactura.toString()}
                    onChange={(val: string) => updateLinea(linea.id, 'valorSinFactura', val)}
                    className="!text-[11px] !h-8 text-right font-bold bg-[var(--color-primary)]/5 border-none focus:ring-2 focus:ring-[var(--color-primary)]/20 rounded-lg !px-2"
                    size="sm"
                />
            </td>

            {/* Observaciones */}
            <td className="px-2 py-2 border-b border-[var(--color-border)]">
                <Input
                    type="text"
                    placeholder="Motivo..."
                    value={linea.observaciones}
                    onChange={(e) => updateLinea(linea.id, 'observaciones', e.target.value)}
                    className="!border-none !bg-transparent !shadow-none !px-2 !h-8 text-[11px] placeholder:opacity-30"
                    fullWidth
                />
            </td>

            {/* Botón Eliminar */}
            <td className="px-4 py-2 text-center border-b border-[var(--color-border)]">
                <button
                    type="button"
                    onClick={() => removeLinea(linea.id)}
                    className="text-[var(--color-text-secondary)] opacity-10 hover:opacity-100 hover:text-red-500 transition-all rounded-lg p-1.5 flex items-center justify-center mx-auto"
                >
                    <Trash2 size={16} />
                </button>
            </td>
        </tr>
    );
};

export default ExpenseLineItem;
