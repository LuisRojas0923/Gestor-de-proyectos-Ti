import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { Text, Button, Input } from '../atoms';

interface FilterDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    anchorRect: { top: number; left: number; width: number } | null;
    title?: string;
    type?: 'categorical' | 'numeric' | 'date';
    
    // Props para Categorical
    searchTerm?: string;
    onSearchChange?: (value: string) => void;
    onSelectAll?: () => void;
    isAllSelected?: boolean;
    options?: { value: string; label: string }[];
    tempValue?: string[];
    onToggleOption?: (value: string) => void;
    
    // Props para Range (Numeric/Date)
    rangeValue?: { min: string | number; max: string | number };
    onRangeChange?: (range: { min: string | number; max: string | number }) => void;
    
    onApply: () => void;
    placeholder?: string;
    triggerHeight?: number;
}

/**
 * FilterDropdown: Molécula que implementa el portal de selección múltiple 
 * y rangos basado en el estándar de diseño del catálogo.
 */
export const FilterDropdown: React.FC<FilterDropdownProps> = ({
    isOpen,
    onClose,
    anchorRect,
    title,
    type = 'categorical',
    searchTerm = '',
    onSearchChange,
    onSelectAll,
    isAllSelected,
    options = [],
    tempValue = [],
    onToggleOption,
    rangeValue = { min: '', max: '' },
    onRangeChange,
    onApply,
    placeholder = 'Buscar...',
    triggerHeight = 40
}) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const months = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                const isTrigger = (event.target as Element).closest('[role="button"]');
                if (!isTrigger) onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const [maxHeight, setMaxHeight] = React.useState('400px');
    const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (isOpen && anchorRect) {
            const windowHeight = window.innerHeight;
            const spaceBelow = windowHeight - anchorRect.top - 20;
            
            if (spaceBelow < 300 && anchorRect.top > 300) {
                setPosition({ 
                    top: anchorRect.top - (triggerHeight + 8) - Math.min(400, anchorRect.top - 40), 
                    left: anchorRect.left 
                });
                setMaxHeight(`${anchorRect.top - 60}px`);
            } else {
                setPosition({ top: anchorRect.top + 4, left: anchorRect.left });
                setMaxHeight(`${Math.min(450, spaceBelow)}px`);
            }
        }
    }, [isOpen, anchorRect, triggerHeight]);

    if (!isOpen || !anchorRect || !position) return null;
    
    const dynamicStyle: React.CSSProperties = {
        top: position.top,
        left: position.left,
        width: Math.max(anchorRect.width, 240),
        maxHeight: maxHeight
    };

    return createPortal(
        <div 
            ref={dropdownRef}
            className="multiselect-dropdown-portal fixed z-[9999] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-neutral-200/50 dark:border-slate-800/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
            style={dynamicStyle}
        >
            {/* Header */}
            <div className="p-3 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                <Text variant="caption" weight="bold" className="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                    Filtrar: {title || 'Columna'}
                </Text>
            </div>

            {/* Contenido según tipo */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {type === 'categorical' ? (
                    <>
                        <div className="p-2 border-b border-neutral-100 dark:border-slate-800">
                            <Input
                                placeholder={placeholder}
                                size="xs"
                                value={searchTerm}
                                onChange={(e) => onSearchChange?.(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && onApply()}
                                fullWidth
                                className="!border-none !bg-neutral-100 dark:!bg-slate-800/50"
                                icon={Search}
                            />
                        </div>

                        <div 
                            onClick={onSelectAll}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-slate-800/50 cursor-pointer border-b border-neutral-100 dark:border-slate-800 transition-colors"
                        >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${isAllSelected ? 'bg-primary-500 border-primary-500' : 'border-neutral-300 dark:border-neutral-600'}`}>
                                {isAllSelected && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                            </div>
                            <Text variant="caption" weight="bold" className="text-[10px] uppercase text-neutral-900 dark:text-neutral-100">
                                Seleccionar Todos
                            </Text>
                        </div>

                        <div className="py-1">
                            {options.map((opt) => {
                                const selected = tempValue.includes(opt.value);
                                return (
                                    <div
                                        key={opt.value}
                                        onClick={() => onToggleOption?.(opt.value)}
                                        className={`flex items-center gap-2 px-3 py-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/10 cursor-pointer transition-colors ${selected ? 'bg-primary-50/50 dark:bg-primary-900/5' : ''}`}
                                    >
                                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${selected ? 'bg-primary-500 border-primary-500' : 'border-neutral-300 dark:border-neutral-600'}`}>
                                            {selected && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                                        </div>
                                        <Text variant="caption" className="text-[11px] text-neutral-700 dark:text-neutral-300 truncate">
                                            {opt.label || '(Vacío)'}
                                        </Text>
                                    </div>
                                );
                            })}
                            {options.length === 0 && (
                                <div className="p-4 text-center">
                                    <Text variant="caption" color="text-secondary" className="italic">Sin resultados</Text>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="p-4 space-y-4">
                        {type === 'date' && (
                            <div className="space-y-2">
                                <Text variant="caption" weight="bold" className="text-[9px] uppercase text-neutral-400">Selección Rápida (Año actual)</Text>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {months.map((month, idx) => {
                                        const year = new Date().getFullYear();
                                        const startStr = `${year}-${String(idx + 1).padStart(2, '0')}-01`;
                                        const endStr = `${year}-${String(idx + 1).padStart(2, '0')}-31`;
                                        const isActive = rangeValue.min === startStr;

                                        return (
                                            <Button
                                                key={month}
                                                variant="custom"
                                                size="xs"
                                                onClick={() => onRangeChange?.({ min: startStr, max: endStr })}
                                                className={`!py-1 !text-[10px] rounded-lg transition-all ${isActive ? 'bg-primary-500 text-white shadow-lg' : 'bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'}`}
                                            >
                                                {month}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Text variant="caption" className="text-[10px] text-neutral-400 uppercase font-bold">{type === 'date' ? 'Desde' : 'Mínimo'}</Text>
                                <Input
                                    type={type === 'date' ? 'date' : 'number'}
                                    size="xs"
                                    fullWidth
                                    value={String(rangeValue.min ?? '')}
                                    onChange={(e) => onRangeChange?.({ ...rangeValue, min: e.target.value })}
                                    className="!bg-neutral-100 dark:!bg-slate-800 !border-none rounded-xl"
                                />
                            </div>
                            <div className="space-y-1">
                                <Text variant="caption" className="text-[10px] text-neutral-400 uppercase font-bold">{type === 'date' ? 'Hasta' : 'Máximo'}</Text>
                                <Input
                                    type={type === 'date' ? 'date' : 'number'}
                                    size="xs"
                                    fullWidth
                                    value={String(rangeValue.max ?? '')}
                                    onChange={(e) => onRangeChange?.({ ...rangeValue, max: e.target.value })}
                                    className="!bg-neutral-100 dark:!bg-slate-800 !border-none rounded-xl"
                                />
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => onRangeChange?.({ min: '', max: '' })}
                            className="w-full !py-1 text-[10px] font-bold text-neutral-400 hover:text-danger-500 uppercase tracking-widest transition-colors"
                        >
                            Limpiar Rango
                        </Button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50/30 dark:bg-slate-800/30 flex items-center justify-between gap-2">
                <Text variant="caption" className="text-[9px] font-normal text-neutral-500 dark:text-neutral-400 opacity-60 px-1">
                    {type === 'categorical' ? `${tempValue.length} seleccionados` : 'Filtro por rango'}
                </Text>
                <Button
                    onClick={onApply}
                    variant="primary"
                    size="xs"
                    className="!text-[10px] !px-4 !py-1.5 uppercase tracking-wider h-auto rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                    Aplicar
                </Button>
            </div>
        </div>,
        document.body
    );
};
