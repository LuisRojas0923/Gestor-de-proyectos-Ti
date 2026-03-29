import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Filter, Search, X } from 'lucide-react';
import { Text, Input, Button } from './index';

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
    const inputRef = useRef<HTMLInputElement>(null);

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
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: Math.max(rect.width, 220)
            });
            setTempValue(value);
            setSearchTerm('');
            setIsOpen(true);
            // El foco se maneja en un timeout para asegurar que el Portal ya está en el DOM
            setTimeout(() => inputRef.current?.focus(), 50);
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
        if (isAllSelected) {
            const filteredValues = filteredOptions.map(o => o.value);
            setTempValue(prev => prev.filter(v => !filteredValues.includes(v)));
        } else {
            const newValues = Array.from(new Set([...tempValue, ...filteredOptions.map(o => o.value)]));
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
                            <Text as="span" weight="bold" className={`text-[10px] uppercase tracking-wider leading-none transition-colors ${isOpen || value.length > 0 ? 'text-primary-400 font-black underline decoration-2' : 'text-white/70'}`}>
                                {triggerLabel}
                            </Text>
                        ) : (
                            <Filter 
                                size={14} 
                                className={`transition-colors ${isOpen || value.length > 0 ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`} 
                            />
                        )}
                        {/* Red Badge Removed - Using Shading Instead */}
                    </div>
                ) : (
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary-500' : 'text-neutral-400'}`} />
                )}
            </div>

            {isOpen && createPortal(
                <div 
                    className="multiselect-dropdown-portal absolute z-[9999] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{ 
                        top: dropdownPos.top + 4, 
                        left: dropdownPos.left, 
                        minWidth: dropdownPos.width,
                        maxHeight: '400px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Buscador */}
                    <div className="p-2 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 flex items-center gap-2">
                        <Input
                            ref={inputRef}
                            placeholder="Buscar..."
                            size="xs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                            fullWidth
                            className="!border-none !bg-transparent !shadow-none"
                            icon={Search}
                        />
                        {searchTerm && (
                            <X 
                                size={14} 
                                className="text-neutral-400 hover:text-neutral-600 cursor-pointer" 
                                onClick={() => setSearchTerm('')}
                            />
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700 max-h-[250px]">
                        {filteredOptions.length > 0 && (
                            <div 
                                onClick={toggleAll}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer border-b border-neutral-100 dark:border-neutral-800 transition-colors"
                            >
                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${isAllSelected ? 'bg-primary-500 border-primary-500' : 'border-neutral-300 dark:border-neutral-600'}`}>
                                    {isAllSelected && <Check size={10} className="text-white" />}
                                </div>
                                <Text variant="caption" weight="bold" className="text-[10px] uppercase">Seleccionar {searchTerm ? 'Visibles' : 'Todos'}</Text>
                            </div>
                        )}
                        
                        {filteredOptions.map((opt) => {
                            const selected = tempValue.includes(opt.value);
                            return (
                                <div
                                    key={opt.value || '__empty__'}
                                    onClick={() => toggleOption(opt.value)}
                                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/10 cursor-pointer transition-colors"
                                >
                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${selected ? 'bg-primary-500 border-primary-500' : 'border-neutral-300 dark:border-neutral-600'}`}>
                                        {selected && <Check size={10} className="text-white" />}
                                    </div>
                                    <Text variant="caption" className={`text-[11px] ${selected ? 'font-bold text-primary-600 dark:text-primary-400' : 'text-neutral-700 dark:text-neutral-300'}`}>{opt.label}</Text>
                                </div>
                            );
                        })}
                        
                        {filteredOptions.length === 0 && (
                            <div className="px-4 py-8 text-center flex flex-col items-center gap-2">
                                <Search size={24} className="text-neutral-200 dark:text-neutral-800" />
                                <Text variant="caption" color="text-secondary">Sin coincidencias</Text>
                            </div>
                        )}
                    </div>

                    {/* Footer con Acción */}
                    <div className="p-2 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-800/30 flex items-center justify-between gap-2">
                         <Text variant="caption" className="text-[9px] opacity-60 px-1">{tempValue.length} seleccionados</Text>
                         <Button
                            onClick={handleApply}
                            size="sm"
                            className="!text-[10px] !px-4 !py-1.5 uppercase tracking-wider h-auto"
                         >
                            Aplicar Filtro
                         </Button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
