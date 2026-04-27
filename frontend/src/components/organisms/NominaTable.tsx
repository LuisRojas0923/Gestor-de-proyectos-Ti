import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Filter, X } from 'lucide-react';
import { Input, Text, Button } from '../atoms';
import ExcelIcon from '../../assets/images/categories/Soporte Mejoramiento.png';

export interface ColumnDef<T> {
    header: string;
    accessorKey: keyof T | string;
    cell?: (row: T) => React.ReactNode;
    align?: 'left' | 'center' | 'right';
    enableColumnFilter?: boolean;
}

interface NominaTableProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    globalFilterText?: string;
    onGlobalFilterChange?: (text: string) => void;
    customSort?: (a: T, b: T) => number;
    filterColumn?: string;
    filterValue?: string;
    fullHeight?: boolean;
    exportFileName?: string;
    hideSearch?: boolean;
}

export function NominaTable<T extends Record<string, any>>({
    data,
    columns,
    globalFilterText,
    onGlobalFilterChange,
    customSort,
    filterColumn,
    filterValue,
    fullHeight = false,
    exportFileName = 'exporte_nomina.csv',
    hideSearch = false
}: NominaTableProps<T>) {
    const location = useLocation();
    const storageKey = `nomina_table_filters_${location.pathname}`;

    const [columnFilters, setColumnFilters] = useState<Record<string, string>>(() => {
        try {
            const saved = sessionStorage.getItem(`${storageKey}_columns`);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);

    // Guardar filtros de columna en sessionStorage
    useEffect(() => {
        sessionStorage.setItem(`${storageKey}_columns`, JSON.stringify(columnFilters));
    }, [columnFilters, storageKey]);

    // Restaurar filtro global al montar
    useEffect(() => {
        const savedGlobal = sessionStorage.getItem(`${storageKey}_global`);
        if (savedGlobal && savedGlobal !== globalFilterText && onGlobalFilterChange) {
            onGlobalFilterChange(savedGlobal);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Guardar filtro global cuando cambie
    useEffect(() => {
        if (globalFilterText !== undefined) {
            sessionStorage.setItem(`${storageKey}_global`, globalFilterText);
        }
    }, [globalFilterText, storageKey]);

    const handleFilterChange = (key: string, value: string) => {
        setColumnFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const filteredAndSortedData = useMemo(() => {
        let result = data;

        // 1. Global Filter (searches across all values in the row)
        if (globalFilterText) {
            const lowerGlobal = globalFilterText.toLowerCase();
            result = result.filter(row => {
                return Object.values(row).some((val: any) => 
                    String(val).toLowerCase().includes(lowerGlobal)
                );
            });
        }

        // 2. Column Filters
        const activeFilters = Object.entries(columnFilters).filter(([_, val]: [string, string]) => val.trim() !== '');
        if (activeFilters.length > 0) {
            result = result.filter(row => {
                return activeFilters.every(([key, filterVal]: [string, string]) => {
                    const cellValue = String(row[key] || '').toLowerCase();
                    return cellValue.includes(filterVal.toLowerCase());
                });
            });
        }

        // 3. External Column Filter
        if (filterColumn && filterValue) {
            result = result.filter(row => {
                const cellValue = String(row[filterColumn] || '').toLowerCase();
                return cellValue.includes(filterValue.toLowerCase());
            });
        }

        // 3. Custom Sort (if provided)
        if (customSort) {
            result = [...result].sort(customSort);
        }

        return result;
    }, [data, globalFilterText, columnFilters, customSort]);

    const handleExport = () => {
        if (filteredAndSortedData.length === 0) return;

        // Get headers from columns
        const headers = columns.map(col => col.header);

        // Map rows to CSV values
        // Numeric values: written WITHOUT quotes and WITH comma as decimal separator.
        // A semicolon-delimited CSV with unquoted "10130,03" tokens is what
        // Spanish-locale Excel (es-CO) expects to recognize a cell as a real number.
        // We use Intl.NumberFormat from the numeric type — not a string replace.
        const decimalFormatter = new Intl.NumberFormat('es-CO', {
            useGrouping: false,          // no thousands separator → no ambiguity
            minimumFractionDigits: 0,
            maximumFractionDigits: 10,   // preserve up to 10 decimal places
        });

        const rows = filteredAndSortedData.map(row =>
            columns.map(col => {
                const val = row[col.accessorKey as keyof T];
                if (val === null || val === undefined) return '';
                // Numeric type → unquoted token with locale decimal comma
                // Excel (es-CO) reads this as a real number, not text.
                if (typeof val === 'number') {
                    return decimalFormatter.format(val); // e.g. 10130,03
                }
                // Text values → escape internal quotes and wrap in double-quotes
                const stringVal = String(val).replace(/"/g, '""');
                return `"${stringVal}"`;
            }).join(';')
        );

        // Assemble CSV with UTF-8 BOM for Excel compatibility
        const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', exportFileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={`space-y-1 ${fullHeight ? 'h-full flex flex-col' : ''}`}>
            {/* Table Header Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 flex-none items-center mb-0.5 py-0">
                {/* Export Button (Aligned with "Asociados" width) */}
                <div className="lg:col-span-2">
                    {data.length > 0 && (
                        <Button
                            variant="erp"
                            onClick={handleExport}
                            className="h-[42px] w-full font-bold shadow-sm rounded-lg transition-all active:scale-95 mt-0.5"
                        >
                            <div className="flex items-center justify-center gap-3 w-full">
                                <img src={ExcelIcon} alt="Excel" className="w-8 h-8 object-contain" />
                                <Text as="span" className="leading-none text-slate-700 mt-0.5" size="sm" weight="bold">EXPORTAR</Text>
                            </div>
                        </Button>
                    )}
                </div>

                {/* Container for alignment/search */}
                <div className="lg:col-span-10 flex justify-end items-center">
                    {onGlobalFilterChange !== undefined && !hideSearch && (
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                type="search"
                                size="sm"
                                placeholder="Buscar en todos los campos..."
                                className="pl-10 h-[42px]"
                                fullWidth
                                value={globalFilterText || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onGlobalFilterChange(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </div>
            {/* Table */}
            <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden ${fullHeight ? 'flex-1 min-h-0' : ''}`}>
                <div className={`${fullHeight ? 'h-full' : 'max-h-[600px]'} overflow-x-auto overflow-y-auto`}>
                    <table className="w-full text-sm border-collapse">
                        <thead className="sticky top-0 z-10 bg-primary-500 shadow-md text-sm">
                            <tr>
                                <th className="text-left py-2 px-4 font-bold text-white bg-inherit w-12 align-middle border-b border-primary-600">
                                    <Text as="span" weight="bold" color="inherit" size="sm">#</Text>
                                </th>
                                {columns.map((col, idx) => {
                                    const colKey = col.accessorKey as string;
                                    const hasActiveFilter = !!columnFilters[colKey];
                                    const isFilterOpen = activeFilterColumn === colKey;

                                    return (
                                        <th 
                                            key={idx} 
                                            className={`py-2 px-4 font-bold text-white bg-inherit whitespace-nowrap align-middle relative border-b border-primary-600 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                                        >
                                            <div className={`flex items-center gap-2 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                                                <Text as="span" weight="semibold" color="inherit" size="sm">{col.header}</Text>
                                                {col.enableColumnFilter !== false && (
                                                    <Button
                                                        variant="ghost"
                                                        size="xs"
                                                        onClick={() => setActiveFilterColumn(isFilterOpen ? null : colKey)}
                                                        className={`p-1 rounded transition-colors ${hasActiveFilter ? 'bg-[var(--color-primary)] text-white' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                                    >
                                                        <Filter className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>

                                            {isFilterOpen && (
                                                <div className="absolute top-full left-4 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 z-50 min-w-[200px] text-left">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <Text size="sm" weight="bold">Filtrar {col.header}</Text>
                                                        <Button 
                                                            variant="ghost"
                                                            size="xs"
                                                            onClick={() => setActiveFilterColumn(null)}
                                                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                    <Input 
                                                        type="text" 
                                                        placeholder="Buscar..."
                                                        className="h-9 text-sm"
                                                        value={columnFilters[colKey] || ''}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange(colKey, e.target.value)}
                                                        autoFocus
                                                    />
                                                    <div className="mt-3 flex justify-end">
                                                        <Button 
                                                            variant="ghost"
                                                            size="xs"
                                                            className="text-xs text-[var(--color-primary)] font-semibold hover:underline p-0 h-auto"
                                                            onClick={() => {
                                                                handleFilterChange(colKey, '');
                                                                setActiveFilterColumn(null);
                                                            }}
                                                        >
                                                            Limpiar
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                            {filteredAndSortedData.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="py-2 px-4 text-slate-400 font-mono w-12">{rowIndex + 1}</td>
                                    {columns.map((col, colIndex) => (
                                        <td 
                                            key={colIndex} 
                                            className={`py-2 px-4 ${col.align === 'right' ? 'text-right font-mono font-semibold' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                                        >
                                            {col.cell ? col.cell(row) : (row[col.accessorKey as keyof T] as React.ReactNode)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {filteredAndSortedData.length === 0 && (
                                <tr>
                                    <td colSpan={columns.length + 1} className="p-8 text-center text-slate-500">
                                        No se encontraron resultados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 text-right bg-white dark:bg-slate-800 relative z-20">
                    <Text size="sm" color="text-secondary">
                        Mostrando {filteredAndSortedData.length} de {data.length} filas
                    </Text>
                </div>
            </div>
        </div>
    );
}
