import React from 'react';
import { Trash2 } from 'lucide-react';
import { Text, Input, Select, MaterialCard } from '../../../components/atoms';
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
                    size="xs"
                    onChange={(e) => updateLinea(linea.id, 'categoria', e.target.value)}
                    className="!border-none !bg-transparent !shadow-none !px-2"
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
                    size="xs"
                    onChange={(e) => updateLinea(linea.id, 'fecha', e.target.value)}
                    className="!border-none !bg-transparent !shadow-none !px-2"
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
                        size="xs"
                        onChange={(e) => handleOTSearch(e.target.value, linea.id)}
                        className="!border-none !bg-transparent !shadow-none !px-2 font-bold placeholder:font-normal placeholder:opacity-40"
                    />
                    {isSearchingOT === linea.id && ots.length > 0 && (
                        <div className="absolute top-full left-0 w-[400px] z-[100] mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            <MaterialCard elevation={4} className="!rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]/95 backdrop-blur-md shadow-2xl">
                                <div className="max-h-60 overflow-y-auto py-1">
                                    {ots.map((ot) => (
                                        <div
                                            key={ot.numero}
                                            className="px-4 py-2.5 hover:bg-[var(--color-primary)]/10 cursor-pointer border-b border-[var(--color-border)]/50 last:border-none transition-colors group"
                                            onClick={() => selectOT(ot, linea.id)}
                                        >
                                            <div className="flex items-center justify-between mb-0.5">
                                                <Text variant="body2" weight="bold" color="text-primary" className="font-mono">
                                                    {ot.numero}
                                                </Text>
                                                <Text variant="caption" weight="bold" color="primary" className="opacity-0 group-hover:opacity-100 uppercase tracking-tighter">
                                                    Seleccionar
                                                </Text>
                                            </div>
                                            <Text variant="caption" color="text-secondary" className="truncate uppercase font-medium">
                                                {ot.cliente}
                                            </Text>
                                        </div>
                                    ))}
                                </div>
                            </MaterialCard>
                        </div>
                    )}
                </div>
            </td>

            {/* C. Costo */}
            <td className="px-2 py-2 border-b border-[var(--color-border)]">
                <Select
                    value={linea.cc}
                    size="xs"
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
                    className="!border-none !bg-transparent !shadow-none !px-2"
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
                    size="xs"
                    disabled={!linea.cc}
                    onChange={(e) => updateLinea(linea.id, 'scc', e.target.value)}
                    className="!border-none !bg-transparent !shadow-none !px-2"
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
                    size="xs"
                    onChange={(val: string) => updateLinea(linea.id, 'valorConFactura', val)}
                    className="font-bold bg-[var(--color-primary)]/5 border-none focus:ring-2 focus:ring-[var(--color-primary)]/20 rounded-lg !px-2"
                />
            </td>

            {/* Sin Factura */}
            <td className="px-2 py-2 border-b border-[var(--color-border)]">
                <CurrencyInput
                    value={linea.valorSinFactura.toString()}
                    size="xs"
                    onChange={(val: string) => updateLinea(linea.id, 'valorSinFactura', val)}
                    className="font-bold bg-[var(--color-primary)]/5 border-none focus:ring-2 focus:ring-[var(--color-primary)]/20 rounded-lg !px-2"
                />
            </td>

            {/* Observaciones */}
            <td className="px-2 py-2 border-b border-[var(--color-border)]">
                <Input
                    type="text"
                    placeholder="Motivo..."
                    value={linea.observaciones}
                    size="xs"
                    onChange={(e) => updateLinea(linea.id, 'observaciones', e.target.value)}
                    className="!border-none !bg-transparent !shadow-none !px-2 placeholder:opacity-30"
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
