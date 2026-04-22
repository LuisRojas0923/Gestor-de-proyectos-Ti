import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XCircle, RotateCcw, Search, CheckSquare, Square } from 'lucide-react';
import { Text, Button, Input, Icon } from '../atoms';

export interface ColumnFilterPopoverProps {
    title: string;
    options: string[];
    selectedValues: Set<string>;
    onSelectionChange: (values: Set<string>) => void;
    onClose: () => void;
    anchorRect: DOMRect | null;
    type?: 'text' | 'date';
    dateRange?: { start: string, end: string };
    onDateRangeChange?: (range: { start: string, end: string }) => void;
}

export const ColumnFilterPopover: React.FC<ColumnFilterPopoverProps> = ({
    title,
    options,
    selectedValues,
    onSelectionChange,
    onClose,
    anchorRect,
    type = 'text',
    dateRange,
    onDateRangeChange
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'selection' | 'range'>(type === 'date' ? 'range' : 'selection');
    const popoverRef = useRef<HTMLDivElement>(null);

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Cerrar al presionar Escape o click fuera
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    if (!anchorRect) return null;

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleOption = (option: string) => {
        const newSet = new Set(selectedValues);
        if (newSet.has(option)) {
            newSet.delete(option);
        } else {
            newSet.add(option);
        }
        onSelectionChange(newSet);
    };

    const handleSelectAll = () => {
        onSelectionChange(new Set(options));
    };

    const handleClear = () => {
        onSelectionChange(new Set());
    };

    // Calcular posición óptima
    const POPOVER_WIDTH = 260;
    const POPOVER_HEIGHT = 500;
    const MARGIN = 16;

    let top = anchorRect.bottom + 8;
    let left = anchorRect.left;
    let actualHeight = POPOVER_HEIGHT;

    // Evitar que se salga por la derecha
    if (left + POPOVER_WIDTH > window.innerWidth - MARGIN) {
        left = window.innerWidth - POPOVER_WIDTH - MARGIN;
    }
    // Evitar que se salga por la izquierda
    if (left < MARGIN) left = MARGIN;

    // Espacio disponible arriba y abajo
    const spaceBelow = window.innerHeight - anchorRect.bottom - MARGIN;
    const spaceAbove = anchorRect.top - MARGIN;

    // Si no cabe abajo, intentamos arriba
    if (spaceBelow < POPOVER_HEIGHT && spaceAbove > spaceBelow) {
        // Cabe mejor arriba
        actualHeight = Math.min(POPOVER_HEIGHT, spaceAbove);
        top = anchorRect.top - actualHeight - 8;
    } else {
        // Cabe mejor abajo (o no cabe en ninguno, pero preferimos abajo)
        actualHeight = Math.min(POPOVER_HEIGHT, spaceBelow);
        top = anchorRect.bottom + 8;
    }

    const position = {
        top: Math.max(MARGIN, top),
        left: left,
        width: POPOVER_WIDTH,
        maxHeight: actualHeight
    };

    return createPortal(
        <div
            ref={popoverRef}
            className="fixed z-[9999] bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
            style={position} // @audit-ok
        >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <Text variant="caption" weight="bold" className="uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Filtrar: {title}
                </Text>
                <Button 
                    variant="ghost" 
                    size="xs" 
                    onClick={onClose} 
                    icon={XCircle}
                    className="!p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                />
            </div>

            {/* Tabs si es fecha */}
            {type === 'date' && (
                <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <Button
                        variant="custom"
                        size="xs"
                        onClick={() => setActiveTab('range')}
                        className={`flex-1 !py-2 !text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'range' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400'}`}
                    >
                        Rango
                    </Button>
                    <Button
                        variant="custom"
                        size="xs"
                        onClick={() => setActiveTab('selection')}
                        className={`flex-1 !py-2 !text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'selection' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400'}`}
                    >
                        Selección
                    </Button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'range' && type === 'date' ? (
                    <div className="p-3 space-y-3">
                        {/* Filtro por Mes */}
                        <div className="space-y-1.5">
                            <Text variant="caption" className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Por Mes (Año actual)</Text>
                            <div className="grid grid-cols-3 gap-1.5">
                                {months.map((month, idx) => (
                                    <Button
                                        key={month}
                                        variant="custom"
                                        size="xs"
                                        onClick={() => {
                                            const year = new Date().getFullYear();
                                            const start = `${year}-${String(idx + 1).padStart(2, '0')}-01`;
                                            const end = `${year}-${String(idx + 1).padStart(2, '0')}-31`;
                                            onDateRangeChange?.({ start, end });
                                        }}
                                        className={`!px-1 !py-1 !text-[10px] rounded-lg transition-all ${
                                            dateRange?.start.includes(`-${String(idx + 1).padStart(2, '0')}-`)
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                        }`}
                                    >
                                        {month.substring(0, 3)}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Filtro por Rango Manual */}
                        <div className="space-y-1.5">
                            <Text variant="caption" className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Rango Personalizado</Text>
                            <div className="flex flex-col gap-1.5">
                                <div className="flex flex-col gap-1">
                                    <Text variant="caption" className="text-[9px] text-slate-400 uppercase ml-1">Desde</Text>
                                    <Input
                                        type="date"
                                        size="xs"
                                        fullWidth
                                        value={dateRange?.start || ''}
                                        onChange={(e) => onDateRangeChange?.({ ...dateRange!, start: e.target.value })}
                                        className="!bg-slate-100 dark:!bg-slate-800 !border-none !rounded-xl text-xs"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Text variant="caption" className="text-[9px] text-slate-400 uppercase ml-1">Hasta</Text>
                                    <Input
                                        type="date"
                                        size="xs"
                                        fullWidth
                                        value={dateRange?.end || ''}
                                        onChange={(e) => onDateRangeChange?.({ ...dateRange!, end: e.target.value })}
                                        className="!bg-slate-100 dark:!bg-slate-800 !border-none !rounded-xl text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => onDateRangeChange?.({ start: '', end: '' })}
                            icon={RotateCcw}
                            className="w-full !py-1.5 !text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                        >
                            Limpiar Rango
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Buscador */}
                        <div className="p-3">
                            <Input
                                type="text"
                                size="xs"
                                autoFocus
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                icon={Search}
                                className="!bg-slate-100 dark:!bg-slate-800 !border-none !rounded-xl"
                            />
                        </div>

                        {/* Acciones Rápidas */}
                        <div className="px-4 py-1 flex items-center gap-4 border-b border-slate-50 dark:border-slate-800/50 pb-2">
                            <Button
                                variant="ghost"
                                size="xs"
                                onClick={handleSelectAll}
                                icon={CheckSquare}
                                className="text-[10px] font-bold text-blue-500 hover:text-blue-600 transition-colors uppercase tracking-tight p-0 h-auto"
                            >
                                Todo
                            </Button>
                            <Button
                                variant="ghost"
                                size="xs"
                                onClick={handleClear}
                                icon={RotateCcw}
                                className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-tight p-0 h-auto"
                            >
                                Limpiar
                            </Button>
                        </div>

                        {/* Lista de Opciones */}
                        <div className="p-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option) => (
                                    <Button
                                        key={option}
                                        variant="custom"
                                        size="xs"
                                        onClick={() => toggleOption(option)}
                                        className="w-full flex items-center gap-2 !px-2 !py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all group"
                                    >
                                        <div className={`shrink-0 transition-colors ${selectedValues.has(option) ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                            <Icon name={selectedValues.has(option) ? CheckSquare : Square} size="xs" />
                                        </div>
                                        <Text variant="caption" className={`truncate !text-[11px] transition-colors ${selectedValues.has(option) ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {type === 'date' 
                                            ? option.split('-').reverse().join('/') 
                                            : (option || '(Vacío)')}
                                        </Text>
                                    </Button>
                                ))
                            ) : (
                                <div className="py-8 text-center">
                                    <Text variant="caption" className="text-slate-400">No hay coincidencias</Text>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <Text variant="caption" className="text-[10px] text-slate-400 font-medium">
                    {selectedValues.size} seleccionados de {options.length}
                </Text>
            </div>
        </div>,
        document.body
    );
};
