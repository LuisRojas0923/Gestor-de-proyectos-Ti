import { Text, Input, Button } from '../../../../../components/atoms';
import { Save } from 'lucide-react';

interface MobileItemCardProps {
    item: any;
    value: string;
    obs: string;
    onChange: (field: 'cant' | 'obs', val: string) => void;
    onSave: (id: number) => void;
    isSaving: boolean;
    isInvalid: boolean;
    isSaved: boolean;
}

export const MobileItemCard = ({ item, value, obs, onChange, onSave, isSaving, isInvalid, isSaved }: MobileItemCardProps) => {
    return (
        <div className={`bg-[var(--color-surface)] border rounded-3xl p-4 space-y-3 shadow-sm transition-all ${isInvalid ? 'border-red-500 ring-1 ring-red-500/50 bg-red-50/5 dark:bg-red-900/5' : isSaved ? 'border-green-500/30 bg-green-500/5 ring-1 ring-green-500/10' : 'border-[var(--color-border)]'}`}>
            <div className="flex flex-wrap gap-1">
                <div className="bg-primary-500/5 px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-primary-500/10">
                    <Text variant="caption" className="text-[7px] uppercase text-primary-600">BOD</Text>
                    <Text variant="caption" className="text-[9px] font-bold">{item.bodega}</Text>
                </div>
                <div className="bg-blue-500/5 px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-blue-500/10">
                    <Text variant="caption" className="text-[7px] uppercase text-blue-600">BLQ</Text>
                    <Text variant="caption" className="text-[9px] font-bold">{item.bloque}</Text>
                </div>
                <div className="bg-blue-500/5 px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-blue-500/10">
                    <Text variant="caption" className="text-[7px] uppercase text-blue-600">EST</Text>
                    <Text variant="caption" className="text-[9px] font-bold">{item.estante}</Text>
                </div>
                <div className="bg-blue-500/5 px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-blue-500/10">
                    <Text variant="caption" className="text-[7px] uppercase text-blue-600">NIV</Text>
                    <Text variant="caption" className="text-[9px] font-bold">{item.nivel}</Text>
                </div>
                {item.unidad && (
                    <div className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <Text variant="caption" className="text-[9px] font-bold">{item.unidad}</Text>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Text variant="caption" weight="bold" className="text-primary-600 text-[11px] shrink-0 font-mono">{item.codigo}</Text>
                <div className="w-px h-3 bg-neutral-200" />
                <Text variant="caption" className="line-clamp-1 text-[10px] opacity-70">{item.descripcion}</Text>
            </div>

            <div className="flex gap-2 items-end">
                <div className="w-16 shrink-0">
                    <Text variant="caption" className="text-[7px] uppercase font-bold text-neutral-400 ml-1 mb-0.5 block">Cant</Text>
                    <Input
                        type="text"
                        inputMode="decimal"
                        value={value}
                        error={isInvalid}
                        success={isSaved}
                        onChange={(e) => {
                            const sanitized = e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
                            if (sanitized.split('.').length > 2) return;
                            onChange('cant', sanitized);
                        }}
                        className="text-center font-bold text-sm rounded-2xl h-10 w-full transition-all"
                        placeholder=""
                    />
                </div>
                <div className="flex-1">
                    <Text variant="caption" className="text-[7px] uppercase font-bold text-neutral-400 ml-1 mb-0.5 block">Observaciones</Text>
                    <Input
                        value={obs}
                        onChange={(e) => onChange('obs', e.target.value)}
                        placeholder="..."
                        className="rounded-2xl h-10 text-xs w-full"
                    />
                </div>
                <Button
                    variant="primary"
                    onClick={() => onSave(item.id)}
                    disabled={isSaving}
                    className="rounded-xl h-10 px-3 shrink-0 shadow-md"
                >
                    <Save size={14} />
                </Button>
            </div>
        </div>
    );
};
