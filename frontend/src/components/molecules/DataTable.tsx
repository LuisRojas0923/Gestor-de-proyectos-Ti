import React, { useState, useCallback, useRef, useLayoutEffect } from 'react';
import { Text, Button } from '../atoms';
import { FilterDropdown } from './FilterDropdown';
import { ArrowUp, ArrowDown, GripVertical } from 'lucide-react';

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
    getRowClassName?: (row: T) => string;
    bodyRef?: React.RefObject<HTMLDivElement>;
    isRowDraggable?: boolean;
    onRowsReorder?: (fromIndex: number, toIndex: number) => void;

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
    getRowClassName,
    bodyRef,
    isRowDraggable = false,
    onRowsReorder,
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
    const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
    const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);
    const headerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const bodyGridRef = useRef<HTMLDivElement>(null);
    const headerGridRef = useRef<HTMLDivElement>(null);

    const gridTemplateColumns = [
        ...(isRowDraggable ? ['minmax(36px, 36px)'] : []),
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
        const filterKey = activeFilter;
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
        requestAnimationFrame(() => filterKey && headerRefs.current[filterKey]?.focus());
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

    const moveRowWithKeyboard = (rowIndex: number, direction: -1 | 1) => {
        const targetIndex = rowIndex + direction;
        if (targetIndex < 0 || targetIndex >= data.length) return;
        onRowsReorder?.(rowIndex, targetIndex);
    };

    return (
        <div
            className={`relative flex flex-col overflow-x-auto overflow-y-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm ${maxHeight} ${minHeight} ${className}`}
            role="table"
            aria-rowcount={data.length + 1}
        >

            {/* Filter Dropdown */}
            {activeFilter && anchorRect && (
                <FilterDropdown
                    isOpen
                    onClose={() => {
                        const filterKey = activeFilter;
                        setActiveFilter(null);
                        setAnchorRect(null);
                        setActiveSubFilter(null);
                        requestAnimationFrame(() => {
                            const activeElement = document.activeElement as HTMLElement | null;
                            if (
                                filterKey &&
                                (!activeElement || activeElement === document.body || !document.contains(activeElement))
                            ) {
                                headerRefs.current[filterKey]?.focus();
                            }
                        });
                    }}
                    anchorRect={anchorRect}
                    title={columns.find(c => c.key === activeFilter)?.label}
                    type="categorical"
                    searchTerm={filterSearchTerm}
                    onSearchChange={setFilterSearchTerm}
                    onSelectAll={() => {
                        if (!activeSubFilter) return;
                        setTempSubFilters(prev => {
                            const next = { ...prev };
                            next[activeSubFilter] = isAllSelected
                                ? new Set()
                                : new Set(getFilterOptions(activeSubFilter).map(o => o.value));
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
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10" role="status" aria-live="polite">
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
                        className={`shrink-0 bg-[var(--deep-navy)] border-b border-[var(--deep-navy)] overflow-hidden z-20 w-full min-w-fit ${headerClassName}`}
                        role="row"
                    >
                        {isRowDraggable && (
                            <div className="flex items-center justify-center py-2.5 px-2 border-r border-white/10">
                                <GripVertical size={13} className="text-white/70" />
                            </div>
                        )}
                        {columns.map((col) => (
                            <div key={col.key} role="columnheader" className="min-w-0">
                              <Button
                                ref={(el) => { headerRefs.current[col.key] = el; }}
                                variant="custom"
                                disabled={!col.filterable}
                                onClick={() => col.filterable && toggleFilter(col.key)}
                                aria-haspopup={col.filterable ? 'dialog' : undefined}
                                aria-expanded={col.filterable ? activeFilter === col.key : undefined}
                                fullWidth
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
                            </div>
                        ))}
                        {renderRowActions && (
                            <div className="flex items-center justify-center py-2.5 px-4" role="columnheader">
                                <Text variant="caption" weight="bold" className="uppercase tracking-wider !text-[11px] text-white whitespace-nowrap">
                                    Acciones
                                </Text>
                            </div>
                        )}
                    </div>

                    {data.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10" role="status">
                            {emptyIcon}
                            <Text variant="body2" color="text-secondary" weight="medium">{emptyMessage}</Text>
                        </div>
                    ) : (
                        <div
                            ref={(el) => {
                                (bodyGridRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                                if (bodyRef) (bodyRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                            }}
                            className="flex-1 min-h-0 overflow-y-auto custom-scrollbar w-full min-w-fit"
                            role="rowgroup"
                        >
                            {data.map((row, rowIndex) => (
                                <div
                                    data-datatable-row="true"
                                    role="row"
                                    key={keyExtractor(row)}
                                    onClick={() => onRowClick?.(row)}
                                    onDragOver={(e) => {
                                        if (!isRowDraggable || draggedRowIndex === null) return;
                                        e.preventDefault();
                                        if (dragOverRowIndex !== rowIndex) setDragOverRowIndex(rowIndex);
                                    }}
                                    onDrop={(e) => {
                                        if (!isRowDraggable || draggedRowIndex === null) return;
                                        e.preventDefault();
                                        if (draggedRowIndex !== rowIndex) onRowsReorder?.(draggedRowIndex, rowIndex);
                                        setDraggedRowIndex(null);
                                        setDragOverRowIndex(null);
                                    }}
                                    className={`group relative grid col-span-full grid-cols-subgrid border-b border-[var(--color-border)] hover:bg-[var(--color-surface-variant)] transition-all duration-200 cursor-pointer ${getRowClassName?.(row) ?? ''} ${dragOverRowIndex === rowIndex ? 'my-1 bg-[var(--color-primary)]/8 ring-1 ring-inset ring-[var(--color-primary)]/25 before:absolute before:-top-1 before:left-3 before:right-3 before:h-0.5 before:rounded-full before:bg-[var(--color-primary)] before:shadow-sm before:content-[""]' : ''} ${draggedRowIndex === rowIndex ? 'scale-[0.985] border-dashed bg-[var(--color-surface-variant)]/50 opacity-35 ring-1 ring-inset ring-[var(--color-primary)]/25' : ''}`}
                                    onMouseEnter={(e) => onMouseEnterRow?.(row, e)}
                                    onMouseLeave={onMouseLeaveRow}
                                >
                                    {showRowIndicator && (
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${rowIndicatorColor}`} />
                                    )}
                                    {isRowDraggable && (
                                        <div className="flex items-center justify-center py-3 px-2 min-w-0" role="cell">
                                            <Button
                                                variant="custom"
                                                size="xs"
                                                type="button"
                                                draggable
                                                aria-label={`Mover fila ${rowIndex + 1}. Usa flecha arriba o abajo para reordenar.`}
                                                title="Arrastrar para ordenar"
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => {
                                                    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    moveRowWithKeyboard(rowIndex, e.key === 'ArrowUp' ? -1 : 1);
                                                }}
                                                onDragStart={(e) => {
                                                    e.stopPropagation();
                                                    setDraggedRowIndex(rowIndex);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                    e.dataTransfer.setData('text/plain', keyExtractor(row));

                                                    const sourceRow = e.currentTarget.closest('[data-datatable-row]') as HTMLElement | null;
                                                    if (sourceRow) {
                                                        const dragImage = sourceRow.cloneNode(true) as HTMLElement;
                                                        const gridTemplate = bodyGridRef.current
                                                            ? window.getComputedStyle(bodyGridRef.current).gridTemplateColumns
                                                            : window.getComputedStyle(sourceRow).gridTemplateColumns;
                                                        dragImage.style.position = 'fixed';
                                                        dragImage.style.top = '-1000px';
                                                        dragImage.style.left = '-1000px';
                                                        dragImage.style.display = 'grid';
                                                        dragImage.style.gridTemplateColumns = gridTemplate;
                                                        dragImage.style.width = `${sourceRow.offsetWidth}px`;
                                                        dragImage.style.pointerEvents = 'none';
                                                        dragImage.style.opacity = '0.35';
                                                        dragImage.style.transform = 'scale(0.985)';
                                                        dragImage.style.boxShadow = 'none';
                                                        dragImage.style.background = 'var(--color-surface-variant)';
                                                        dragImage.style.borderTop = '1px solid var(--color-border)';
                                                        dragImage.style.borderBottom = '1px solid var(--color-border)';
                                                        dragImage.style.borderRadius = '0';
                                                        dragImage.style.overflow = 'hidden';
                                                        dragImage.style.zIndex = '9999';
                                                        document.body.appendChild(dragImage);
                                                        e.dataTransfer.setDragImage?.(dragImage, 18, 18);
                                                        window.setTimeout(() => dragImage.remove(), 0);
                                                    }
                                                }}
                                                onDragEnd={() => {
                                                    setDraggedRowIndex(null);
                                                    setDragOverRowIndex(null);
                                                }}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-variant)] hover:text-[var(--color-primary)] cursor-grab active:cursor-grabbing transition-colors"
                                            >
                                                <GripVertical size={15} />
                                            </Button>
                                        </div>
                                    )}
                                    {columns.map((col) => (
                                        <div
                                            key={col.key}
                                            role="cell"
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
                                        <div className="flex items-center justify-center py-3 px-4 gap-2" role="cell">
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
