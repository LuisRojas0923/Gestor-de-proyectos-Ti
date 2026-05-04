import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, X, Check } from 'lucide-react';
import { Text, Button, Input } from '../atoms';

interface FilterDropdownProps {
    // API Simple (Uncontrolled/Trigger mode)
    options?: { value: string; label: string }[];
    selectedOptions?: string[];
    onFilterChange?: (values: string[]) => void;
    dark?: boolean;

    // API Compleja (Controlled mode)
    isOpen?: boolean;
    onClose?: () => void;
    anchorRect?: { top: number; left: number; width: number } | DOMRect | null;
    title?: string;
    type?: 'categorical' | 'numeric' | 'date';
    searchTerm?: string;
    onSearchChange?: (value: string) => void;
    onSelectAll?: () => void;
    isAllSelected?: boolean;
    tempValue?: string[];
    onToggleOption?: (value: string) => void;
    rangeValue?: { min: string | number; max: string | number };
    onRangeChange?: (range: { min: string | number; max: string | number }) => void;
    onApply?: () => void;
    placeholder?: string;
    triggerHeight?: number;
}

/**
 * FilterDropdown: Molécula versátil que soporta tanto el modo simple (trigger incluido)
 * como el modo complejo (controlado externamente por portal).
 */
export const FilterDropdown: React.FC<FilterDropdownProps> = (props) => {
    // --- Lógica para el Modo Simple (Trigger Interno) ---
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [internalSearch, setInternalSearch] = useState('');
    const [internalAnchor, setInternalAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const isSimpleMode = props.onFilterChange !== undefined;
    const effectiveIsOpen = isSimpleMode ? internalIsOpen : (props.isOpen || false);
    
    // Unificar anchorRect
    let effectiveAnchor: { top: number; left: number; width: number } | null = null;
    if (isSimpleMode) {
        effectiveAnchor = internalAnchor;
    } else if (props.anchorRect) {
        // Convertir DOMRect a objeto plano si es necesario
        effectiveAnchor = {
            top: props.anchorRect.top + window.scrollY,
            left: props.anchorRect.left + window.scrollX,
            width: props.anchorRect.width
        };
    }

    const toggleSimple = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setInternalAnchor({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
        setInternalIsOpen(!internalIsOpen);
    };

    // --- Contenido del Dropdown ---
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (effectiveIsOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                if (isSimpleMode && triggerRef.current && triggerRef.current.contains(event.target as Node)) return;
                
                if (isSimpleMode) setInternalIsOpen(false);
                else props.onClose?.();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [effectiveIsOpen, isSimpleMode, props]);

    if (!effectiveIsOpen && isSimpleMode) {
        const hasFilters = (props.selectedOptions?.length || 0) > 0;
        return (
            <Button
                variant="ghost"
                ref={triggerRef}
                onClick={toggleSimple}
                className={`flex items-center justify-center p-1 h-auto min-w-0 rounded-md transition-all relative ${
                    hasFilters ? 'bg-primary-500 text-white shadow-sm' : 
                    props.dark ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
            >
                <Filter className={`w-3.5 h-3.5 ${hasFilters ? 'fill-current' : ''}`} />
                {hasFilters && (
                    <Text as="span" className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border border-white dark:border-slate-900 font-bold">
                        {props.selectedOptions?.length}
                    </Text>
                )}
            </Button>
        );
    }

    if (!effectiveIsOpen || !effectiveAnchor) return null;

    // --- Handlers unificados ---
    const currentType = props.type || 'categorical';
    const currentSearch = isSimpleMode ? internalSearch : (props.searchTerm || '');
    const currentOptions = isSimpleMode ? (props.options || []) : (props.options || []);
    const currentSelected = isSimpleMode ? (props.selectedOptions || []) : (props.tempValue || []);

    const handleSearch = (val: string) => {
        if (isSimpleMode) setInternalSearch(val);
        else props.onSearchChange?.(val);
    };

    const handleToggle = (val: string) => {
        if (isSimpleMode) {
            const next = currentSelected.includes(val) 
                ? currentSelected.filter(v => v !== val)
                : [...currentSelected, val];
            props.onFilterChange?.(next);
        } else {
            props.onToggleOption?.(val);
        }
    };

    const handleSelectAll = () => {
        if (isSimpleMode) {
            const next = currentSelected.length === currentOptions.length ? [] : currentOptions.map(o => o.value);
            props.onFilterChange?.(next);
        } else {
            props.onSelectAll?.();
        }
    };

    const handleApply = () => {
        if (isSimpleMode) setInternalIsOpen(false);
        else props.onApply?.();
    };

    const filteredOptions = currentOptions.filter(o => 
        o.label.toLowerCase().includes(currentSearch.toLowerCase())
    );

    const isAllSelected = currentOptions.length > 0 && currentSelected.length === currentOptions.length;

    const dropdownStyle: React.CSSProperties = {
        top: effectiveAnchor.top + 5,
        left: Math.min(effectiveAnchor.left, window.innerWidth - 260),
        maxHeight: '450px'
    };

    return createPortal(
        <div 
            ref={dropdownRef}
            className="fixed z-[9999] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col min-w-[240px]"
            style={dropdownStyle}
        >
            {/* Header */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                <Text variant="caption" weight="bold" className="text-[10px] uppercase tracking-widest text-slate-500">
                    {props.title || 'Filtrar Columna'}
                </Text>
                <Button variant="ghost" size="icon" onClick={handleApply} className="h-6 w-6 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {currentType === 'categorical' ? (
                    <>
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                            <Input 
                                size="xs"
                                icon={Search}
                                placeholder={props.placeholder || "Buscar..."}
                                value={currentSearch}
                                onChange={(e) => handleSearch(e.target.value)}
                                autoFocus
                                className="[&_input]:h-8 [&_input]:text-[11px] [&_input]:bg-slate-100 dark:[&_input]:bg-slate-800 [&_input]:border-none"
                            />
                        </div>

                        <div onClick={handleSelectAll} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border-b border-slate-50 dark:border-slate-800">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isAllSelected ? 'bg-primary-500 border-primary-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                {isAllSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <Text variant="caption" weight="bold" className="text-[11px]">Seleccionar Todos</Text>
                        </div>

                        <div className="py-1">
                            {filteredOptions.map(opt => (
                                <div key={opt.value} onClick={() => handleToggle(opt.value)} className="flex items-center gap-2 px-3 py-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/10 cursor-pointer">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${currentSelected.includes(opt.value) ? 'bg-primary-500 border-primary-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                        {currentSelected.includes(opt.value) && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <Text variant="caption" className="text-[11px] truncate">{opt.label || '(Vacío)'}</Text>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Text variant="caption" className="text-[10px] text-neutral-400 uppercase font-bold">Mínimo</Text>
                                <Input
                                    type="number"
                                    size="xs"
                                    value={String(props.rangeValue?.min ?? '')}
                                    onChange={(e) => props.onRangeChange?.({ ...props.rangeValue!, min: e.target.value })}
                                    className="!bg-neutral-100 dark:!bg-slate-800 !border-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <Text variant="caption" className="text-[10px] text-neutral-400 uppercase font-bold">Máximo</Text>
                                <Input
                                    type="number"
                                    size="xs"
                                    value={String(props.rangeValue?.max ?? '')}
                                    onChange={(e) => props.onRangeChange?.({ ...props.rangeValue!, max: e.target.value })}
                                    className="!bg-neutral-100 dark:!bg-slate-800 !border-none"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex justify-between items-center">
                <Text variant="caption" className="text-[9px] text-slate-400">
                    {currentType === 'categorical' ? `${currentSelected.length} seleccionados` : 'Filtro por rango'}
                </Text>
                <Button onClick={handleApply} variant="primary" size="xs" className="!h-7 !text-[10px] px-4">Listo</Button>
            </div>
        </div>,
        document.body
    );
};
