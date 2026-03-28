import { memo } from 'react';
import { Text, Input } from '../../../../../components/atoms';

interface TableRowProps {
    item: any;
    value: string;
    obs: string;
    onChange: (field: 'cant' | 'obs', value: string) => void;
    isInvalid: boolean;
    isSaved: boolean;
}

/**
 * Componente de fila de tabla optimizado con React.memo para alta performance.
 */
export const TableRow = memo(({ item, value, obs, onChange, isInvalid, isSaved }: TableRowProps) => {
    return (
        <tr className={`hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors border-b border-neutral-100 dark:border-neutral-800 last:border-0 h-10 ${isInvalid ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
            <td className="p-0.5 text-center w-[20px]"><Text as="span" className="tag-badge">{item.bodega}</Text></td>
            <td className="p-0.5 text-center w-[20px]"><Text as="span" className="tag-badge">{item.bloque}</Text></td>
            <td className="p-0.5 text-center w-[20px]"><Text as="span" className="tag-badge">{item.estante}</Text></td>
            <td className="p-0.5 text-center w-[20px]"><Text as="span" className="tag-badge">{item.nivel}</Text></td>
            <td className="p-1 px-0.5 w-[45px]">
                <Text variant="caption" weight="bold" className="text-primary-600 text-[8px] tracking-tighter truncate block">{item.codigo}</Text>
            </td>
            <td className="p-1 px-1">
                <Text variant="caption" className="line-clamp-1 text-[7px] leading-tight opacity-80 max-w-[180px]">{item.descripcion}</Text>
            </td>
            <td className="p-1 text-center text-[9px] font-bold w-[30px]">{item.unidad}</td>
            <td className="p-1 bg-primary-500/5 text-center w-[55px]">
                <Input
                    type="text"
                    value={value}
                    fullWidth={false}
                    size="xs"
                    error={isInvalid}
                    success={isSaved}
                    onChange={(e) => {
                        const sanitized = e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
                        if (sanitized.split('.').length > 2) return;
                        onChange('cant', sanitized);
                    }}
                    className="text-right font-bold text-[10px] rounded-md h-7 w-full mx-auto !px-1 shadow-sm transition-all"
                    placeholder=""
                />
            </td>
            <td className="p-1 px-1 w-[150px]">
                <Input
                    value={obs}
                    fullWidth={true}
                    size="xs"
                    onChange={(e) => onChange('obs', e.target.value)}
                    placeholder="..."
                    className="rounded-md h-7 text-[8px] w-full"
                />
            </td>
        </tr>
    );
});

TableRow.displayName = 'TableRow';
