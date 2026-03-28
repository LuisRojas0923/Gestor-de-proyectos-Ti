import { Text, MultiSelect } from '../../../../../components/atoms';

interface FilterHeaderProps {
    label: string;
    col: string;
    minWidth?: string;
    align?: 'left' | 'center';
    columnFilters: { [key: string]: string[] };
    getUniqueValues: (col: string) => { value: string; label: string }[];
    onFilterChange: (col: string, values: string[]) => void;
}

export const FilterHeader = ({ 
    label, 
    col, 
    minWidth = '30px', 
    align = 'left', 
    columnFilters, 
    getUniqueValues, 
    onFilterChange 
}: FilterHeaderProps) => {
    const hasFilters = (columnFilters[col] || []).length > 0;

    return (
        <th className={`p-0 bg-navy border-b border-white/10 group cursor-pointer hover:bg-white/5 transition-colors relative sticky top-0 z-20 ios-sticky-fix w-[${minWidth}] min-w-[${minWidth}]`}>
            <div className={`flex items-center gap-0.5 h-8 ${align === 'center' ? 'justify-center' : 'justify-start'} px-1`}>
                <Text variant="caption" weight="bold" className={`text-white uppercase text-[12px] tracking-tighter ${hasFilters ? 'text-primary-400' : ''}`}>{label}</Text>

                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end pr-1 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                        <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"></path>
                    </svg>
                </div>

                <div className="absolute inset-0">
                    <MultiSelect
                        placeholder=""
                        options={getUniqueValues(col)}
                        value={columnFilters[col] || []}
                        onChange={(v) => onFilterChange(col, v)}
                        minimal={true}
                        size="xs"
                        className="w-full h-full opacity-0 pointer-events-auto [&_button]:w-full [&_button]:h-full [&_button]:p-0"
                    />
                </div>

                {hasFilters && (
                    <div className="absolute top-1 right-1 w-1 h-1 bg-primary-500 rounded-full shadow-sm shadow-primary-500/50" />
                )}
            </div>
        </th>
    );
};
