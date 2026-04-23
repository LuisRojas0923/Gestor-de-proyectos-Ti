import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { Text } from './Text';
import { FilterDropdown } from '../molecules';

interface MultiSelectOption {
    value: string;
    label: string;
}

interface MultiSelectProps {
    label?: string;
    options: MultiSelectOption[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    minimal?: boolean;
    disabled?: boolean;
    size?: 'md' | 'sm' | 'xs';
    className?: string;
    triggerLabel?: string;
}

/**
 * Átomo MultiSelect v3: Alto rendimiento, portal para evitar recortes de overflow y búsqueda integrada.
 */
export const MultiSelect: React.FC<MultiSelectProps> = ({
    label,
    options,
    value,
    onChange,
    placeholder = 'Seleccionar...',
    minimal = false,
    disabled = false,
    size = 'md',
    className = '',
    triggerLabel = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [tempValue, setTempValue] = useState<string[]>([]);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
    
    const containerRef = useRef<HTMLDivElement>(null);

    // Cerrar al hacer clic fuera (manejado globalmente por ser Portal)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node) && 
                !(event.target as Element).closest('.multiselect-dropdown-portal')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const toggleDropdown = useCallback(() => {
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // Calculamos la posición exacta para el Portal
            setDropdownPos({
                top: rect.bottom,
                left: rect.left,
                width: Math.max(rect.width, 220)
            });
            setTempValue(value);
            setSearchTerm('');
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [isOpen, value]);

    const toggleOption = (optValue: string) => {
        setTempValue(prev => 
            prev.includes(optValue) ? prev.filter(v => v !== optValue) : [...prev, optValue]
        );
    };

    const handleApply = () => {
        onChange(tempValue);
        setIsOpen(false);
    };

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowSearch = searchTerm.toLowerCase();
        return options.filter(opt => 
            opt.label.toLowerCase().includes(lowSearch) || 
            opt.value.toLowerCase().includes(lowSearch)
        );
    }, [options, searchTerm]);

    const isAllSelected = filteredOptions.length > 0 && filteredOptions.every(opt => tempValue.includes(opt.value));

    const toggleAll = () => {
        const filteredValues = filteredOptions.map(o => o.value);
        if (isAllSelected) {
            setTempValue(prev => prev.filter(v => !filteredValues.includes(v)));
        } else {
            const newValues = Array.from(new Set([...tempValue, ...filteredValues]));
            setTempValue(newValues);
        }
    };

    const displayLabel = value.length === 0 
        ? placeholder 
        : value.length === 1 
            ? options.find(o => o.value === value[0])?.label || value[0]
            : `${value.length} seleccionados`;

    return (
        <div className={`relative flex flex-col gap-1 ${className}`} ref={containerRef}>
            {label && (
                <Text variant="caption" weight="bold" color="text-secondary" className="text-[10px] uppercase tracking-wider ml-1">
                    {label}
                </Text>
            )}
            
            <div
                role="button"
                tabIndex={0}
                onClick={() => !disabled && toggleDropdown()}
                onKeyDown={(e) => !disabled && (e.key === 'Enter' || e.key === ' ') && toggleDropdown()}
                className={`flex items-center justify-center transition-all group
                    ${minimal 
                        ? `p-1 rounded-md text-[12px] h-full w-full ${value.length > 0 ? 'bg-white/10 shadow-sm' : 'hover:bg-white/10'}` 
                        : `flex items-center justify-between w-full px-3 py-1 text-left bg-white dark:bg-neutral-800 border rounded-xl 
                           ${size === 'md' ? 'h-10 text-xs' : size === 'sm' ? 'h-8 text-[11px]' : 'h-6 text-[9px] px-2'}
                           ${isOpen ? 'border-primary-500 ring-1 ring-primary-500/20' : 'border-neutral-200 dark:border-neutral-700'}
                           hover:border-neutral-300 dark:hover:border-neutral-600 cursor-pointer`
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
            >
                {!minimal && (
                    <Text as="span" className={`truncate ${value.length === 0 ? 'text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                        {displayLabel}
                    </Text>
                )}
                
                {minimal ? (
                    <div className="relative flex items-center justify-center gap-1 w-full h-full">
                        {triggerLabel ? (
                            <Text as="span" align="center" weight="bold" className={`text-[10px] uppercase tracking-wider leading-none transition-colors ${isOpen || value.length > 0 ? 'text-primary-400 font-black underline decoration-2' : 'text-white/70'}`}>
                                {triggerLabel}
                            </Text>
                        ) : (
                            <Filter 
                                size={14} 
                                className={`transition-colors ${isOpen || value.length > 0 ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`} 
                            />
                        )}
                    </div>
                ) : (
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : 'text-slate-400'}`} />
                )}
            </div>            <FilterDropdown
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                anchorRect={dropdownPos}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onSelectAll={toggleAll}
                isAllSelected={isAllSelected}
                options={filteredOptions}
                tempValue={tempValue}
                onToggleOption={toggleOption}
                onApply={handleApply}
                placeholder="Buscar opciones..."
            />
        </div>
    );
};
