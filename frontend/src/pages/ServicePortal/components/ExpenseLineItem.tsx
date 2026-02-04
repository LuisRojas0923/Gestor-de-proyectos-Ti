import React from 'react';
import { Trash2, Paperclip, CheckCircle2 } from 'lucide-react';
import { Text, Input, Select, MaterialCard } from '../../../components/atoms';
import { CurrencyInput } from '../../../components/atoms/CurrencyInput';
import { fileToBase64, validateFileSize } from '../../../utils/fileUtils';
import { useNotifications } from '../../../components/notifications/NotificationsContext';

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
    errors?: string[];
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
    setLineas,
    errors = []
}) => {
    const { addNotification } = useNotifications();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newAdjuntos = [...(linea.adjuntos || [])];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (!validateFileSize(file, 2)) {
                addNotification('warning', `El archivo ${file.name} supera el límite de 2MB.`);
                continue;
            }

            try {
                const base64 = await fileToBase64(file);
                newAdjuntos.push({
                    nombre: file.name,
                    tipo: file.type,
                    contenido: base64
                });
            } catch (err) {
                console.error("Error al procesar archivo:", err);
                addNotification('error', `No se pudo procesar el archivo ${file.name}.`);
            }
        }

        updateLinea(linea.id, 'adjuntos', newAdjuntos);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    return (
        <tr className={`hover:bg-[var(--color-surface-variant)]/30 transition-colors group/line ${isSearchingOT === linea.id ? 'relative z-[60]' : 'relative z-0'}`}>
            {/* # No. */}
            <td className="px-3 py-2 border-b border-[var(--color-border)] text-center">
                <div className="flex items-center justify-center">
                    <span className="w-6 h-6 flex items-center justify-center bg-[#002060]/10 text-[#002060] text-[10px] font-black rounded-full border border-[#002060]/20 shadow-sm">
                        {index + 1}
                    </span>
                </div>
            </td>

            {/* Categoría */}
            <td className={`px-2 py-2 border-b border-[var(--color-border)] ${errors.includes('categoria') ? 'bg-red-50/50' : ''}`}>
                <Select
                    value={linea.categoria}
                    size="xs"
                    onChange={(e) => updateLinea(linea.id, 'categoria', e.target.value)}
                    className={`!border-none !bg-transparent !shadow-none !px-2 ${errors.includes('categoria') ? 'ring-1 ring-red-500 rounded-lg' : ''}`}
                    options={[
                        { value: '', label: 'Seleccione...' },
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
            <td className={`px-2 py-2 border-b border-[var(--color-border)] ${errors.includes('ot') ? 'bg-red-50/50' : ''}`}>
                <div className="relative">
                    <Input
                        type="text"
                        placeholder="Buscar OT..."
                        value={linea.ot}
                        size="xs"
                        onChange={(e) => handleOTSearch(e.target.value, linea.id)}
                        className={`!border-none !bg-transparent !shadow-none !px-2 font-bold placeholder:font-normal placeholder:opacity-40 ${errors.includes('ot') ? 'ring-1 ring-red-500 rounded-lg' : ''}`}
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
            <td className={`px-2 py-2 border-b border-[var(--color-border)] ${errors.includes('cc') ? 'bg-red-50/50' : ''}`}>
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
                    className={`!border-none !bg-transparent !shadow-none !px-2 ${errors.includes('cc') ? 'ring-1 ring-red-500 rounded-lg' : ''}`}
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
            <td className={`px-2 py-2 border-b border-[var(--color-border)] ${errors.includes('scc') ? 'bg-red-50/50' : ''}`}>
                <Select
                    value={linea.scc}
                    size="xs"
                    disabled={!linea.cc}
                    onChange={(e) => updateLinea(linea.id, 'scc', e.target.value)}
                    className={`!border-none !bg-transparent !shadow-none !px-2 ${errors.includes('scc') ? 'ring-1 ring-red-500 rounded-lg' : ''}`}
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
            <td className={`px-2 py-2 border-b border-[var(--color-border)] ${errors.includes('valorConFactura') ? 'bg-red-50/50' : ''}`}>
                <CurrencyInput
                    value={linea.valorConFactura.toString()}
                    size="xs"
                    onChange={(val: string) => updateLinea(linea.id, 'valorConFactura', val)}
                    className={`font-bold bg-[var(--color-primary)]/5 border-none focus:ring-2 focus:ring-[var(--color-primary)]/20 rounded-lg !px-2 ${errors.includes('valorConFactura') ? 'ring-1 ring-red-500' : ''}`}
                />
            </td>

            {/* Sin Factura */}
            <td className={`px-2 py-2 border-b border-[var(--color-border)] ${errors.includes('valorSinFactura') ? 'bg-red-50/50' : ''}`}>
                <CurrencyInput
                    value={linea.valorSinFactura.toString()}
                    size="xs"
                    onChange={(val: string) => updateLinea(linea.id, 'valorSinFactura', val)}
                    className={`font-bold bg-[var(--color-primary)]/5 border-none focus:ring-2 focus:ring-[var(--color-primary)]/20 rounded-lg !px-2 ${errors.includes('valorSinFactura') ? 'ring-1 ring-red-500' : ''}`}
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

            {/* Adjunto */}
            <td className="px-2 py-2 border-b border-[var(--color-border)] text-center">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                    multiple
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        p-1.5 rounded-lg transition-all flex items-center justify-center mx-auto
                        ${linea.adjuntos && linea.adjuntos.length > 0
                            ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                            : 'text-[var(--color-text-secondary)] opacity-10 hover:opacity-100 hover:bg-[var(--color-surface-variant)]'
                        }
                    `}
                    title={linea.adjuntos && linea.adjuntos.length > 0 ? `${linea.adjuntos.length} adjunto(s)` : 'Adjuntar factura'}
                >
                    {linea.adjuntos && linea.adjuntos.length > 0 ? (
                        <CheckCircle2 size={16} />
                    ) : (
                        <Paperclip size={16} />
                    )}
                </button>
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
