import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ArrowUpAZ, ArrowDownAZ, Check } from 'lucide-react';
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
    anchorRect?: { top: number; bottom?: number; left: number; width: number } | DOMRect | null;
    title?: string;
    type?: 'categorical' | 'numeric' | 'date';

    // Props para Categorical
    searchTerm?: string;
    onSearchChange?: (value: string) => void;
    onSelectAll?: () => void;
    isAllSelected?: boolean;
    tempValue?: string[];
    onToggleOption?: (value: string) => void;
    onClearSelection?: () => void;
    optionTextAlign?: 'left' | 'right';

    // Props para Range (Numeric/Date)
    rangeValue?: { min: string | number; max: string | number };
    onRangeChange?: (range: { min: string | number; max: string | number }) => void;

    // Ordenación
    sortDir?: 'asc' | 'desc' | null;
    onSort?: (dir: 'asc' | 'desc' | null) => void;

    onApply?: () => void;
    placeholder?: string;
    triggerHeight?: number;
    maxWidth?: number;
    subFilters?: { key: string; label: string }[];
    activeSubFilter?: string;
    onSubFilterChange?: (key: string) => void;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = (props) => {
    const {
        isOpen,
        onClose,
        anchorRect,
        title,
        type = 'categorical',
        searchTerm = '',
        onSearchChange,
        onSelectAll,
        isAllSelected: propIsAllSelected,
        options = [],
        tempValue = [],
        onToggleOption,
        rangeValue = { min: '', max: '' },
        onRangeChange,
        sortDir,
        onSort,
        onApply,
        placeholder = 'Buscar...',
        triggerHeight = 40,
        maxWidth,
        subFilters,
        activeSubFilter,
        onSubFilterChange,
        onClearSelection,
        optionTextAlign = 'left',
    } = props;

    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [internalSearch, setInternalSearch] = useState('');
    const [internalAnchor, setInternalAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isSimpleMode = props.onFilterChange !== undefined;
    const effectiveIsOpen = isSimpleMode ? internalIsOpen : (isOpen || false);

    // Unificar anchorRect
    let effectiveAnchor: { top: number; left: number; width: number } | null = null;
    if (isSimpleMode) {
        effectiveAnchor = internalAnchor;
    } else if (anchorRect) {
        effectiveAnchor = {
            top: anchorRect.bottom ?? anchorRect.top,
            left: anchorRect.left,
            width: anchorRect.width
        };
    }

    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const [maxHeight, setMaxHeight] = useState<string>('450px');
    const [viewportSize, setViewportSize] = useState(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
    }));
    const anchorTop = effectiveAnchor?.top;
    const anchorLeft = effectiveAnchor?.left;

    useEffect(() => {
        if (!effectiveIsOpen) return;
        const updateViewportSize = () => setViewportSize({
            width: window.innerWidth,
            height: window.innerHeight,
        });
        updateViewportSize();
        window.addEventListener('resize', updateViewportSize);
        window.visualViewport?.addEventListener('resize', updateViewportSize);
        return () => {
            window.removeEventListener('resize', updateViewportSize);
            window.visualViewport?.removeEventListener('resize', updateViewportSize);
        };
    }, [effectiveIsOpen]);

    useEffect(() => {
        if (effectiveIsOpen && anchorTop !== undefined && anchorLeft !== undefined) {
            const spaceBelow = viewportSize.height - anchorTop - 20;

            if (spaceBelow < 300 && anchorTop > 300) {
                setPosition({
                    top: anchorTop - (triggerHeight + 8) - Math.min(400, anchorTop - 40),
                    left: anchorLeft
                });
                setMaxHeight(`${anchorTop - 60}px`);
            } else {
                setPosition({ top: anchorTop + 4, left: anchorLeft });
                setMaxHeight(`${Math.min(450, spaceBelow)}px`);
            }
        }
    }, [effectiveIsOpen, anchorTop, anchorLeft, triggerHeight, viewportSize.height]);

    const toggleSimple = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setInternalAnchor({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
        setInternalIsOpen(prev => !prev);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (effectiveIsOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                if (isSimpleMode && triggerRef.current && triggerRef.current.contains(event.target as Node)) return;
                
                if (isSimpleMode) setInternalIsOpen(false);
                else onClose?.();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [effectiveIsOpen, isSimpleMode, onClose]);

    useEffect(() => {
        if (!effectiveIsOpen) return;
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            if (isSimpleMode) setInternalIsOpen(false);
            else onClose?.();
            requestAnimationFrame(() => triggerRef.current?.focus());
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [effectiveIsOpen, isSimpleMode, onClose]);

    if (!effectiveIsOpen && isSimpleMode) {
        const hasFilters = (props.selectedOptions?.length || 0) > 0;
        return (
            <Button
                ref={triggerRef}
                onClick={toggleSimple}
                variant="custom"
                className="absolute inset-0 w-full h-full bg-transparent border-none cursor-pointer focus:outline-none z-10 p-0 m-0"
            >
                {hasFilters && (
                    <Text as="span" color="inherit" className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full font-bold shadow-sm">
                        {props.selectedOptions?.length}
                    </Text>
                )}
            </Button>
        );
    }

    if (!effectiveIsOpen || !effectiveAnchor || !position) return null;

    // --- Handlers unificados ---
    const currentType = type;
    const currentSearch = isSimpleMode ? internalSearch : searchTerm;
    const currentOptions = options;
    const currentSelected = isSimpleMode ? (props.selectedOptions || []) : tempValue;

    const handleSearch = (val: string) => {
        if (isSimpleMode) setInternalSearch(val);
        else onSearchChange?.(val);
    };

    const handleToggle = (val: string) => {
        if (isSimpleMode) {
            const next = currentSelected.includes(val) 
                ? currentSelected.filter(v => v !== val)
                : [...currentSelected, val];
            props.onFilterChange?.(next);
        } else {
            onToggleOption?.(val);
        }
    };

    const handleSelectAll = () => {
        if (isSimpleMode) {
            const next = currentSelected.length === currentOptions.length ? [] : currentOptions.map(o => o.value);
            props.onFilterChange?.(next);
        } else {
            onSelectAll?.();
        }
    };

    const handleApply = () => {
        if (isSimpleMode) setInternalIsOpen(false);
        else onApply?.();
    };

    const filteredOptions = currentOptions.filter(o => 
        o.label.toLowerCase().includes(currentSearch.toLowerCase())
    );

    const isAllSelected = isSimpleMode 
        ? (currentOptions.length > 0 && currentSelected.length === currentOptions.length)
        : (propIsAllSelected ?? (currentOptions.length > 0 && currentSelected.length === currentOptions.length));

    const viewportMargin = 12;
    const availableWidth = Math.max(viewportSize.width - viewportMargin * 2, 0);
    const minimumWidth = Math.min(280, availableWidth);
    const dropdownWidth = Math.min(
        Math.max(effectiveAnchor.width, minimumWidth),
        maxWidth ?? Number.POSITIVE_INFINITY,
        availableWidth
    );
    const dynamicStyle: React.CSSProperties = {
        top: position.top,
        left: Math.max(viewportMargin, Math.min(position.left, viewportSize.width - dropdownWidth - viewportMargin)),
        width: dropdownWidth,
        maxHeight: maxHeight
    };

    return createPortal(
        <div
            ref={dropdownRef}
            className="fixed z-[9999] min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
            style={dynamicStyle}
            role="dialog"
            aria-label={title || 'Filtrar columna'}
        >
            {/* Header */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                <Text variant="caption" weight="bold" className="text-[10px] uppercase tracking-widest text-slate-500">
                    {title || 'Filtrar Columna'}
                </Text>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={isSimpleMode ? handleApply : onClose}
                    title="Cerrar"
                    aria-label="Cerrar filtro"
                    className="!w-5 !h-5 !p-0 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700"
                >
                    <X size={12} />
                </Button>
            </div>

            {/* Sub-filtros */}
            {subFilters && subFilters.length > 0 && (
                <div className="flex border-b border-slate-100 dark:border-slate-800 p-1 gap-1 bg-slate-50 dark:bg-slate-900/50 shrink-0">
                    {subFilters.map((sub) => {
                        const isActive = sub.key === activeSubFilter;
                        return (
                            <Button
                                key={sub.key}
                                variant="custom"
                                size="xs"
                                onClick={() => onSubFilterChange?.(sub.key)}
                                className={`flex-1 !py-1 !text-[9px] font-semibold rounded-lg transition-all ${
                                    isActive
                                        ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-900/40 shadow-sm'
                                        : 'bg-transparent border border-transparent text-slate-500 hover:bg-slate-100/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/70'
                                }`}
                            >
                                {sub.label}
                            </Button>
                        );
                    })}
                </div>
            )}

            {/* Contenido según tipo */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {currentType === 'categorical' ? (
                    <>
                        {/* Ordenación */}
                        {!isSimpleMode && onSort && (
                            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                                <Text variant="caption" align={optionTextAlign} className="flex-1 text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Ordenar
                                </Text>
                                <Button
                                    variant="custom"
                                    size="sm"
                                    onClick={() => onSort(sortDir === 'asc' ? null : 'asc')}
                                    title="Ascendente (A → Z)"
                                    className={`!w-6 !h-6 !p-0 rounded-lg border transition-all ${
                                        sortDir === 'asc'
                                            ? 'bg-primary-500 border-primary-500 text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-primary-400 hover:text-primary-500'
                                    }`}
                                >
                                    <ArrowUpAZ size={13} />
                                </Button>
                                <Button
                                    variant="custom"
                                    size="sm"
                                    onClick={() => onSort(sortDir === 'desc' ? null : 'desc')}
                                    title="Descendente (Z → A)"
                                    className={`!w-6 !h-6 !p-0 rounded-lg border transition-all ${
                                        sortDir === 'desc'
                                            ? 'bg-primary-500 border-primary-500 text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-primary-400 hover:text-primary-500'
                                    }`}
                                >
                                    <ArrowDownAZ size={13} />
                                </Button>
                            </div>
                        )}

                        <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                            <Input
                                placeholder={placeholder}
                                size="xs"
                                icon={Search}
                                value={currentSearch}
                                aria-label={`Buscar valores de ${title || 'la columna'}`}
                                onChange={(e) => handleSearch(e.target.value)}
                                autoFocus
                                className={`[&_input]:h-8 [&_input]:text-[11px] [&_input]:bg-slate-100 dark:[&_input]:bg-slate-800 [&_input]:border-none ${optionTextAlign === 'right' ? 'text-right' : ''}`}
                            />
                        </div>

                        <Button
                            type="button"
                            variant="custom"
                            onClick={handleSelectAll}
                            aria-pressed={isAllSelected}
                            fullWidth
                            className={`flex items-center px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border-b border-slate-100 dark:border-slate-800 transition-colors ${optionTextAlign === 'right' ? '!justify-end' : '!justify-start'}`}
                        >
                            <div className="inline-flex w-fit max-w-full min-w-0 items-center gap-2">
                                <div aria-hidden="true" className={`w-3.5 h-3.5 shrink-0 rounded border flex items-center justify-center transition-colors ${isAllSelected ? 'bg-primary-500 border-primary-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {isAllSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <Text variant="caption" weight="bold" align={optionTextAlign} className="min-w-0 text-[11px] truncate">Seleccionar Todos</Text>
                            </div>
                        </Button>

                        <div className="py-1">
                            {filteredOptions.map(opt => (
                                <Button
                                    key={opt.value}
                                    type="button"
                                    variant="custom"
                                    fullWidth
                                    aria-pressed={currentSelected.includes(opt.value)}
                                    onClick={() => handleToggle(opt.value)}
                                    className={`flex items-center px-3 py-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/10 cursor-pointer ${optionTextAlign === 'right' ? '!justify-end' : '!justify-start'}`}
                                >
                                    <div className="inline-flex w-fit max-w-full min-w-0 items-center gap-2">
                                        <div aria-hidden="true" className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${currentSelected.includes(opt.value) ? 'bg-primary-500 border-primary-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                            {currentSelected.includes(opt.value) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <Text variant="caption" align={optionTextAlign} className="min-w-0 text-[11px] truncate" title={opt.label || '(Vacío)'}>{opt.label || '(Vacío)'}</Text>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Text variant="caption" className="text-[10px] text-slate-500 uppercase font-bold">Mínimo</Text>
                                <Input
                                    type="number"
                                    size="xs"
                                    value={String(rangeValue?.min ?? '')}
                                    onChange={(e) => onRangeChange?.({ ...rangeValue, min: e.target.value })}
                                    className="!bg-slate-100 dark:!bg-slate-800 !border-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <Text variant="caption" className="text-[10px] text-slate-500 uppercase font-bold">Máximo</Text>
                                <Input
                                    type="number"
                                    size="xs"
                                    value={String(rangeValue?.max ?? '')}
                                    onChange={(e) => onRangeChange?.({ ...rangeValue, max: e.target.value })}
                                    className="!bg-slate-100 dark:!bg-slate-800 !border-none"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex flex-col gap-2.5">
                {/* Fila superior: Texto */}
                <div className="flex items-center justify-between">
                    <Text variant="caption" color="text-secondary" className="opacity-60 px-1">
                        {type === 'categorical' ? `${currentSelected.length} seleccionados` : 'Filtro por rango'}
                    </Text>
                </div>
                
                {/* Fila inferior: Botones en los extremos */}
                <div className="flex items-center justify-between gap-2 w-full">
                    {type === 'categorical' && currentSelected.length > 0 && onClearSelection ? (
                        <Button
                            variant="ghost"
                            size="xs"
                            onClick={onClearSelection}
                            className="text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider font-medium"
                        >
                            Limpiar
                        </Button>
                    ) : (
                        <div />
                    )}
                    <Button
                        onClick={handleApply}
                        variant="primary"
                        size="xs"
                        className="uppercase tracking-wider font-bold shadow-md hover:shadow-lg transition-all"
                    >
                        Aplicar
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};
