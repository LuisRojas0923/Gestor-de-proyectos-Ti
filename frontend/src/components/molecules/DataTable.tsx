import React, { useState, useCallback, useRef, useLayoutEffect } from 'react';
import { Text, Button } from '../atoms';
import { FilterDropdown } from './FilterDropdown';
import { ArrowUp, ArrowDown } from 'lucide-react';

export interface DataTableColumn<T> {
    key: string;
    label: string;
    /** Ancho mínimo de la columna, e.g. '100px'. */
    minWidth?: string;
    /** Ancho máximo de la columna. Si se iguala a minWidth la columna queda fija. */
    maxWidth?: string;
    /** La columna absorbe el espacio sobrante (equivalente a flex-1 / 1fr). */
    flex?: boolean;
    centered?: boolean;
    filterable?: boolean;
    /** Clases extra aplicadas al wrapper de la celda en el body, e.g. 'px-6'. */
    cellClassName?: string;
    render?: (row: T) => React.ReactNode;
    subFilters?: { key: string; label: string }[];
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

    activeSortKey?: string | null;
    activeSortDir?: 'asc' | 'desc' | null;
    onSort?: (key: string, dir: 'asc' | 'desc' | null) => void;

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
    activeSortKey,
    activeSortDir,
    onSort,
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
    const [activeSubFilter, setActiveSubFilter] = useState<string | null>(null);
    const [tempSubFilters, setTempSubFilters] = useState<Record<string, Set<string>>>({});
    const headerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const bodyGridRef = useRef<HTMLDivElement>(null);
    const headerGridRef = useRef<HTMLDivElement>(null);

    const gridTemplateColumns = [
        ...columns.map(col =>
            col.flex
                ? `minmax(${col.minWidth ?? 'min-content'}, 1fr)`
                : `minmax(${col.minWidth ?? 'min-content'}, ${col.maxWidth ?? 'auto'})`
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
            setActiveSubFilter(null);
        } else {
            setActiveFilter(key);
            setAnchorRect(rect);
            setFilterSearchTerm('');
            const col = columns.find(c => c.key === key);
            const firstSubKey = col?.subFilters && col.subFilters.length > 0 ? col.subFilters[0].key : key;
            setActiveSubFilter(firstSubKey);
            
            const initialTemp: Record<string, Set<string>> = {};
            if (col?.subFilters && col.subFilters.length > 0) {
                col.subFilters.forEach(sub => {
                    initialTemp[sub.key] = new Set(columnFilters[sub.key] || []);
                });
            } else {
                initialTemp[key] = new Set(columnFilters[key] || []);
            }
            setTempSubFilters(initialTemp);
        }
    }, [activeFilter, columnFilters, columns]);

    const handleToggleOption = useCallback((value: string) => {
        if (!activeSubFilter) return;
        setTempSubFilters(prev => {
            const next = { ...prev };
            const currentSet = new Set(next[activeSubFilter] || []);
            if (currentSet.has(value)) currentSet.delete(value);
            else currentSet.add(value);
            next[activeSubFilter] = currentSet;
            return next;
        });
    }, [activeSubFilter]);

    const handleApplyFilter = useCallback(() => {
        if (activeFilter && onFilterChange) {
            const col = columns.find(c => c.key === activeFilter);
            if (col?.subFilters && col.subFilters.length > 0) {
                col.subFilters.forEach(sub => {
                    onFilterChange(sub.key, tempSubFilters[sub.key] || new Set());
                });
            } else {
                onFilterChange(activeFilter, tempSubFilters[activeFilter] || new Set());
            }
        }
        setActiveFilter(null);
        setAnchorRect(null);
        setFilterSearchTerm('');
        setActiveSubFilter(null);
    }, [activeFilter, tempSubFilters, onFilterChange, columns]);

    const getFilterOptions = useCallback((key: string) =>
        (columnOptions[key] || [])
            .filter(o => o.toLowerCase().includes(filterSearchTerm.toLowerCase()))
            .map(opt => ({ value: opt, label: opt })), [columnOptions, filterSearchTerm]);

    const hasFilterActive = useCallback((key: string) => {
        const col = columns.find(c => c.key === key);
        if (col?.subFilters && col.subFilters.length > 0) {
            return col.subFilters.some(sub => {
                const f = columnFilters[sub.key];
                return !!(f && f.size > 0);
            });
        }
        const f = columnFilters[key];
        return !!(f && f.size > 0);
    }, [columnFilters, columns]);

    const isAllSelected = activeFilter && activeSubFilter
        ? (tempSubFilters[activeSubFilter]?.size ?? 0) === getFilterOptions(activeSubFilter).length
        : false;

    return (
        <div className={`relative flex flex-col overflow-x-auto overflow-y-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm ${maxHeight} ${minHeight} ${className}`}>

            {/* Filter Dropdown */}
            {activeFilter && anchorRect && (
                <FilterDropdown
                    isOpen
                    onClose={() => { setActiveFilter(null); setAnchorRect(null); setActiveSubFilter(null); }}
                    anchorRect={anchorRect}
                    title={columns.find(c => c.key === activeFilter)?.label}
                    type="categorical"
                    searchTerm={filterSearchTerm}
                    onSearchChange={setFilterSearchTerm}
                    onSelectAll={() => {
                        if (!activeSubFilter) return;
                        setTempSubFilters(prev => {
                            const next = { ...prev };
                            next[activeSubFilter] = new Set(getFilterOptions(activeSubFilter).map(o => o.value));
                            return next;
                        });
                    }}
                    isAllSelected={isAllSelected}
                    options={getFilterOptions(activeSubFilter || activeFilter)}
                    tempValue={Array.from(tempSubFilters[activeSubFilter || activeFilter] || [])}
                    onToggleOption={handleToggleOption}
                    onClearSelection={() => {
                        const key = activeSubFilter || activeFilter;
                        if (!key) return;
                        setTempSubFilters(prev => ({ ...prev, [key]: new Set() }));
                    }}
                    onApply={handleApplyFilter}
                    triggerHeight={40}
                    sortDir={activeFilter === activeSortKey ? activeSortDir : null}
                    onSort={onSort ? (dir) => { onSort(activeFilter!, dir); } : undefined}
                    subFilters={columns.find(c => c.key === activeFilter)?.subFilters}
                    activeSubFilter={activeSubFilter || undefined}
                    onSubFilterChange={(subKey) => {
                        setActiveSubFilter(subKey);
                        setFilterSearchTerm('');
                    }}
                />
            )}

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
                    <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
                    <Text variant="body2" color="text-secondary" weight="medium">{loadingMessage}</Text>
                </div>
            ) : (
                <>
                    {/*
                     * Header — shrink-0, fuera del scroll, misma plantilla de grid que las filas.
                     * Ambos usan gridTemplateColumns idéntico → columnas alineadas visualmente.
                     */}
                    <div
                        ref={headerGridRef}
                        className={`shrink-0 bg-[var(--deep-navy)] border-b border-[var(--deep-navy)] overflow-hidden z-20 ${headerClassName}`}
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
                                <div className="flex items-center gap-1.5 overflow-hidden">
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
                                    {activeSortKey === col.key && activeSortDir && (
                                        activeSortDir === 'asc' ? (
                                            <ArrowUp size={11} className="text-yellow-400 shrink-0 animate-in fade-in slide-in-from-bottom-1 duration-200" />
                                        ) : (
                                            <ArrowDown size={11} className="text-yellow-400 shrink-0 animate-in fade-in slide-in-from-top-1 duration-200" />
                                        )
                                    )}
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

                    {data.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
                            {emptyIcon}
                            <Text variant="body2" color="text-secondary" weight="medium">{emptyMessage}</Text>
                        </div>
                    ) : (
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
                    )}
                </>
            )}
        </div>
    );
}

export default DataTable;
