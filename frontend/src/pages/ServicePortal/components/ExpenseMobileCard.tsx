import React from 'react';
import { Trash2, Calendar, Hash, Tag, Info, DollarSign, Paperclip, CheckCircle2 } from 'lucide-react';
import { Text, Input, Select, MaterialCard, Button } from '../../../components/atoms';
import { CurrencyInput } from '../../../components/atoms/CurrencyInput';
import { fileToBase64, validateFileSize } from '../../../utils/fileUtils';
import { useNotifications } from '../../../components/notifications/NotificationsContext';

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
    errors?: string[];
    isReadOnly?: boolean;
    categorias?: { label: string, value: string }[];
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
    setLineas,
    errors = [],
    isReadOnly = false,
    categorias = []
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
        <MaterialCard className="p-4 mb-4 relative group overflow-visible">
            {/* Cabecera: # e Icono eliminar */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--color-border)]/50">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 flex items-center justify-center bg-[#002060]/10 text-[#002060] text-[11px] font-black rounded-full border border-[#002060]/20 shadow-sm shrink-0">
                        {index + 1}
                    </div>
                    <Text weight="bold" className="text-[13px] uppercase tracking-[0.05em] text-[var(--color-primary)] font-black">GASTO REGISTRADO</Text>
                </div>
                <div className="flex items-center gap-1">
                    <Input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                        multiple
                    />
                    <Button
                        variant="ghost"
                        disabled={isReadOnly}
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-2 rounded-full transition-colors flex items-center justify-center !w-9 !h-9 ${linea.adjuntos && linea.adjuntos.length > 0 ? 'text-green-600 bg-green-50' : 'text-slate-400'
                            } disabled:opacity-20`}
                        icon={linea.adjuntos && linea.adjuntos.length > 0 ? CheckCircle2 : Paperclip}
                        title="Adjuntar factura"
                    />
                    <Button
                        variant="ghost"
                        disabled={isReadOnly}
                        onClick={() => removeLinea(linea.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors flex items-center justify-center !w-9 !h-9 disabled:opacity-0"
                        icon={Trash2}
                    />
                </div>
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
                            size="xs"
                            disabled={isReadOnly}
                            onChange={(e) => updateLinea(linea.id, 'categoria', e.target.value)}
                            className={`bg-[var(--color-surface-variant)]/30 border-none rounded-xl ${errors.includes('categoria') ? 'ring-1 ring-red-500' : ''} disabled:opacity-50`}
                            options={[
                                { value: '', label: 'Seleccione...' },
                                ...categorias
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
                            size="xs"
                            disabled={isReadOnly}
                            onChange={(e) => updateLinea(linea.id, 'fecha', e.target.value)}
                            className="bg-[var(--color-surface-variant)]/30 border-none rounded-xl disabled:opacity-50"
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
                        size="xs"
                        disabled={isReadOnly}
                        onChange={(e) => handleOTSearch(e.target.value, linea.id)}
                        className={`font-bold bg-[var(--color-surface-variant)]/30 border-none rounded-xl placeholder:font-normal placeholder:opacity-40 ${errors.includes('ot') ? 'ring-1 ring-red-500' : ''} disabled:opacity-50`}
                    />
                    {isSearchingOT === linea.id && ots.length > 0 && (
                        <div className="absolute top-full left-0 w-full z-[100] mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
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

                {/* Centro de Costo y Subcentro */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Text variant="caption" weight="bold" className="text-[9px] uppercase tracking-wider opacity-50 mb-1">C. Costo</Text>
                        {linea.ot ? (
                            <Select
                                value={linea.cc}
                                size="xs"
                                disabled={isReadOnly || !linea.ot || linea.combinacionesCC.length === 0}
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
                                className={`bg-[var(--color-surface-variant)]/30 border-none rounded-xl ${errors.includes('cc') ? 'ring-1 ring-red-500' : ''} disabled:opacity-50`}
                                options={[
                                    { value: '', label: '...' },
                                    ...Array.from(new Set(linea.combinacionesCC.map((c: any) => c.centrocosto?.trim()).filter(Boolean))).map((cc: any) => ({
                                        value: cc || '',
                                        label: cc || ''
                                    }))
                                ]}
                            />
                        ) : (
                            <Input
                                type="text"
                                maxLength={4}
                                placeholder="0000"
                                value={linea.cc}
                                size="xs"
                                disabled={isReadOnly}
                                onChange={(e) => updateLinea(linea.id, 'cc', e.target.value.replace(/\D/g, '').slice(0, 4))}
                                className={`bg-[var(--color-surface-variant)]/30 border-none rounded-xl text-center font-mono ${errors.includes('cc') ? 'ring-1 ring-red-500' : ''} disabled:opacity-50`}
                            />
                        )}
                    </div>
                    <div className="space-y-1">
                        <Text variant="caption" weight="bold" className="text-[9px] uppercase tracking-wider opacity-50 mb-1">Subcentro</Text>
                        {linea.ot ? (
                            <Select
                                value={linea.scc}
                                size="xs"
                                disabled={isReadOnly || !linea.cc}
                                onChange={(e) => updateLinea(linea.id, 'scc', e.target.value)}
                                className={`bg-[var(--color-surface-variant)]/30 border-none rounded-xl ${errors.includes('scc') ? 'ring-1 ring-red-500' : ''} disabled:opacity-50`}
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
                        ) : (
                            <Input
                                type="text"
                                maxLength={2}
                                placeholder="00"
                                value={linea.scc}
                                size="xs"
                                disabled={isReadOnly}
                                onChange={(e) => updateLinea(linea.id, 'scc', e.target.value.replace(/\D/g, '').slice(0, 2))}
                                className={`bg-[var(--color-surface-variant)]/30 border-none rounded-xl text-center font-mono ${errors.includes('scc') ? 'ring-1 ring-red-500' : ''} disabled:opacity-50`}
                            />
                        )}
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
                            value={(linea.valorConFactura ?? 0).toString()}
                            size="xs"
                            disabled={isReadOnly}
                            onChange={(val: string) => updateLinea(linea.id, 'valorConFactura', val)}
                            className={`!h-8 text-right font-black bg-white dark:bg-black/20 border-none shadow-sm rounded-xl !px-3 ${errors.includes('valorConFactura') ? 'ring-1 ring-red-500' : ''} disabled:opacity-50`}
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[var(--color-text-secondary)] mb-1">
                            <Info size={10} />
                            <Text variant="caption" weight="bold" className="text-[9px] uppercase tracking-wider">Sin Factura</Text>
                        </div>
                        <CurrencyInput
                            value={(linea.valorSinFactura ?? 0).toString()}
                            size="xs"
                            disabled={isReadOnly}
                            onChange={(val: string) => updateLinea(linea.id, 'valorSinFactura', val)}
                            className={`!h-8 text-right font-black bg-white dark:bg-black/20 border-none shadow-sm rounded-xl !px-3 ${errors.includes('valorSinFactura') ? 'ring-1 ring-red-500' : ''} disabled:opacity-50`}
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
                        size="xs"
                        disabled={isReadOnly}
                        onChange={(e) => updateLinea(linea.id, 'observaciones', e.target.value)}
                        className="bg-[var(--color-surface-variant)]/30 border-none rounded-xl placeholder:opacity-30 disabled:opacity-50"
                        fullWidth
                    />
                </div>
            </div>
        </MaterialCard>
    );
};

export default ExpenseMobileCard;
