import React, { useState, useCallback, useRef, useLayoutEffect } from 'react';
import { Text, Button } from '../atoms';
import { FilterDropdown } from './FilterDropdown';

export interface DataTableColumn<T> {
    key: string;
    label: string;
    /** Ancho mínimo de la columna, e.g. '100px'. El browser expande según el contenido. */
    minWidth?: string;
    /** La columna absorbe el espacio sobrante (equivalente a flex-1 / 1fr). */
    flex?: boolean;
    centered?: boolean;
    filterable?: boolean;
    /** Clases extra aplicadas al wrapper de la celda en el body, e.g. 'px-6'. */
    cellClassName?: string;
    render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
    columns: DataTableColumn<T>[];
    data: T[];
    keyExtractor: (row: T) => string;

    headerClassName?: string;

    showRowIndicator?: boolean;
    rowIndicatorColor?: string;
    onRowClick?: (row: T) => void;
    renderRowActions?: (row: T) => React.ReactNode;
    actionsMinWidth?: string;

    onMouseEnterRow?: (row: T, event: React.MouseEvent) => void;
    onMouseLeaveRow?: () => void;
    bodyRef?: React.RefObject<HTMLDivElement>;

    columnFilters?: Record<string, Set<string>>;
    columnOptions?: Record<string, string[]>;
    onFilterChange?: (columnKey: string, filter: Set<string>) => void;

    isLoading?: boolean;
    loadingMessage?: string;

    emptyMessage?: string;
    emptyIcon?: React.ReactNode;

    maxHeight?: string;
    minHeight?: string;
    className?: string;
}

export function DataTable<T>({
    columns,
    data,
    keyExtractor,
    headerClassName = '',
    showRowIndicator = false,
    rowIndicatorColor = 'bg-[var(--deep-navy)]',
    onRowClick,
    renderRowActions,
    actionsMinWidth = '100px',
    onMouseEnterRow,
    onMouseLeaveRow,
    bodyRef,
    columnFilters = {},
    columnOptions = {},
    onFilterChange,
    isLoading,
    loadingMessage = 'Cargando...',
    emptyMessage = 'No hay datos',
    emptyIcon,
    maxHeight = 'max-h-[calc(100vh-300px)]',
    minHeight = 'min-h-[100px]',
    className = '',
}: DataTableProps<T>) {
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
    const [filterSearchTerm, setFilterSearchTerm] = useState('');
    const [tempFilters, setTempFilters] = useState<Set<string>>(new Set());
    const headerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const bodyGridRef = useRef<HTMLDivElement>(null);
    const headerGridRef = useRef<HTMLDivElement>(null);

    const gridTemplateColumns = [
        ...columns.map(col =>
            col.flex
                ? `minmax(${col.minWidth ?? 'min-content'}, 1fr)`
                : `minmax(${col.minWidth ?? 'min-content'}, auto)`
        ),
        ...(renderRowActions ? [`minmax(${actionsMinWidth}, auto)`] : []),
    ].join(' ');

    useLayoutEffect(() => {
        if (headerGridRef.current) {
            headerGridRef.current.style.display = 'grid';
            headerGridRef.current.style.gridTemplateColumns = gridTemplateColumns;
        }
        if (bodyGridRef.current) {
            bodyGridRef.current.style.display = 'grid';
            bodyGridRef.current.style.gridTemplateColumns = gridTemplateColumns;
            bodyGridRef.current.style.alignContent = 'start';
        }

        const sync = () => {
            if (!bodyGridRef.current || !headerGridRef.current) return;
            const computed = window.getComputedStyle(bodyGridRef.current).gridTemplateColumns;
            headerGridRef.current.style.gridTemplateColumns = computed;
        };

        sync();
        const observer = new ResizeObserver(sync);
        if (bodyGridRef.current) observer.observe(bodyGridRef.current);
        return () => observer.disconnect();
    }, [data, columns, renderRowActions, gridTemplateColumns]);

    const toggleFilter = useCallback((key: string) => {
        const el = headerRefs.current[key];
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (activeFilter === key) {
            setActiveFilter(null);
            setAnchorRect(null);
            setFilterSearchTerm('');
        } else {
            setActiveFilter(key);
            setAnchorRect(rect);
            setFilterSearchTerm('');
            setTempFilters(columnFilters[key] || new Set());
        }
    }, [activeFilter, columnFilters]);

    const handleToggleOption = useCallback((value: string) => {
        setTempFilters(prev => {
            const next = new Set(prev);
            if (next.has(value)) next.delete(value);
            else next.add(value);
            return next;
        });
    }, []);

    const handleApplyFilter = useCallback(() => {
        if (activeFilter && onFilterChange) {
            onFilterChange(activeFilter, tempFilters);
        }
        setActiveFilter(null);
        setAnchorRect(null);
        setFilterSearchTerm('');
    }, [activeFilter, tempFilters, onFilterChange]);

    const getFilterOptions = (key: string) =>
        (columnOptions[key] || []).map(opt => ({ value: opt, label: opt }));

    const hasFilterActive = (key: string) => {
        const f = columnFilters[key];
        return !!(f && f.size > 0);
    };

    const isAllSelected = activeFilter
        ? tempFilters.size === getFilterOptions(activeFilter).length
        : false;

    return (
        <div className={`relative flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm ${maxHeight} ${minHeight} ${className}`}>

            {/* Filter Dropdown */}
            {activeFilter && anchorRect && (
                <FilterDropdown
                    isOpen
                    onClose={() => { setActiveFilter(null); setAnchorRect(null); }}
                    anchorRect={anchorRect}
                    title={columns.find(c => c.key === activeFilter)?.label}
                    type="categorical"
                    searchTerm={filterSearchTerm}
                    onSearchChange={setFilterSearchTerm}
                    onSelectAll={() => setTempFilters(new Set(getFilterOptions(activeFilter).map(o => o.value)))}
                    isAllSelected={isAllSelected}
                    options={getFilterOptions(activeFilter)}
                    tempValue={Array.from(tempFilters)}
                    onToggleOption={handleToggleOption}
                    onApply={handleApplyFilter}
                    triggerHeight={40}
                />
            )}

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
                    <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
                    <Text variant="body2" color="text-secondary" weight="medium">{loadingMessage}</Text>
                </div>
            ) : data.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
                    {emptyIcon}
                    <Text variant="body2" color="text-secondary" weight="medium">{emptyMessage}</Text>
                </div>
            ) : (
                <>
                    {/*
                     * Header — shrink-0, fuera del scroll, misma plantilla de grid que las filas.
                     * Ambos usan gridTemplateColumns idéntico → columnas alineadas visualmente.
                     */}
                    <div
                        ref={headerGridRef}
                        className={`shrink-0 bg-[var(--deep-navy)] rounded-t-2xl border-b border-[var(--deep-navy)] overflow-hidden z-20 ${headerClassName}`}
                    >
                        {columns.map((col) => (
                            <Button
                                key={col.key}
                                ref={(el) => { headerRefs.current[col.key] = el; }}
                                variant="custom"
                                disabled={!col.filterable}
                                onClick={() => col.filterable && toggleFilter(col.key)}
                                className={`
                                    flex items-center ${col.centered ? 'justify-center' : ''} py-2.5 px-4
                                    border-r border-white/10
                                    ${col.filterable ? 'hover:bg-white/10 cursor-pointer outline-none group' : 'cursor-default'}
                                    transition-all duration-200
                                `}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Text
                                        variant="caption"
                                        weight="bold"
                                        className={`uppercase tracking-wider !text-[11px] transition-colors whitespace-nowrap truncate ${
                                            hasFilterActive(col.key)
                                                ? 'text-yellow-400'
                                                : 'text-white'
                                        }`}
                                    >
                                        {col.label}
                                    </Text>
                                </div>
                            </Button>
                        ))}
                        {renderRowActions && (
                            <div className="flex items-center justify-center py-2.5 px-4">
                                <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[11px] text-white whitespace-nowrap">
                                    Acciones
                                </Text>
                            </div>
                        )}
                    </div>

                    {/*
                     * Body — scroll vertical dinámico, grid con el mismo template.
                     * Ya no usa flex-1 para que su altura dependa del contenido de las filas.
                     */}
                    <div
                        ref={(el) => {
                            (bodyGridRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                            if (bodyRef) (bodyRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                        }}
                        className="overflow-y-auto custom-scrollbar"
                    >
                        {data.map((row) => (
                            <div
                                key={keyExtractor(row)}
                                onClick={() => onRowClick?.(row)}
                                className="group relative grid col-span-full grid-cols-subgrid border-b border-[var(--color-border)] hover:bg-[var(--color-surface-variant)] transition-colors cursor-pointer"
                                onMouseEnter={(e) => onMouseEnterRow?.(row, e)}
                                onMouseLeave={onMouseLeaveRow}
                            >
                                {showRowIndicator && (
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${rowIndicatorColor}`} />
                                )}
                                {columns.map((col) => (
                                    <div
                                        key={col.key}
                                        className={`flex items-center ${col.centered ? 'justify-center' : ''} py-3 px-4 min-w-0 ${col.cellClassName ?? ''}`}
                                    >
                                        {col.render ? col.render(row) : (
                                            <Text variant="caption" className="truncate">
                                                {String((row as Record<string, unknown>)[col.key] ?? '')}
                                            </Text>
                                        )}
                                    </div>
                                ))}
                                {renderRowActions && (
                                    <div className="flex items-center justify-center py-3 px-4 gap-2">
                                        {renderRowActions(row)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default DataTable;
