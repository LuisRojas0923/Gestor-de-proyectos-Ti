import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Filter, X } from 'lucide-react';
import { Input, Text, Button } from '../atoms';
import ExcelIcon from '../../assets/images/categories/Soporte Mejoramiento.png';
import { FilterDropdown } from '../molecules/FilterDropdown';

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

    const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>(() => {
        try {
            const saved = sessionStorage.getItem(`${storageKey}_columns`);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

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

    const handleFilterChange = (key: string, values: string[]) => {
        setColumnFilters(prev => ({
            ...prev,
            [key]: values
        }));
    };

    const getColumnOptions = (key: string) => {
        const uniqueValues = Array.from(new Set(data.map(r => String((r as any)[key] || '').toUpperCase())));
        return uniqueValues.sort().map(v => ({ label: v, value: v }));
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

        // 2. Column Filters (Excel style multi-select)
        const activeFiltersEntries = Object.entries(columnFilters).filter(([_, vals]: [string, string[]]) => vals.length > 0);
        if (activeFiltersEntries.length > 0) {
            result = result.filter(row => {
                return activeFiltersEntries.every(([key, filterVals]: [string, string[]]) => {
                    const cellValue = String(row[key] || '').toUpperCase();
                    return filterVals.includes(cellValue);
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

        const headers = columns.map(col => col.header);
        const decimalFormatter = new Intl.NumberFormat('es-CO', {
            useGrouping: false,
            minimumFractionDigits: 0,
            maximumFractionDigits: 10,
        });

        const rows = filteredAndSortedData.map(row =>
            columns.map(col => {
                const val = row[col.accessorKey as keyof T];
                if (val === null || val === undefined) return '';
                if (typeof val === 'number') {
                    return decimalFormatter.format(val);
                }
                const stringVal = String(val).replace(/"/g, '""');
                return `"${stringVal}"`;
            }).join(';')
        );

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 flex-none items-center mb-0.5 py-0">
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

            <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden ${fullHeight ? 'flex-1 min-h-0' : ''}`}>
                <div className={`${fullHeight ? 'h-full' : 'max-h-[600px]'} overflow-x-auto overflow-y-auto`}>
                    <table className="w-full text-sm border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-[var(--color-primary-900)] text-white shadow-md overflow-hidden">
                                <th className="text-center py-3 px-4 font-bold w-12 align-middle first:rounded-tl-xl border-b border-white/5 border-r border-white/5">
                                    <Text as="span" weight="bold" color="inherit" size="xs">#</Text>
                                </th>
                                {columns.map((col, idx) => {
                                    const colKey = col.accessorKey as string;
                                    const isLast = idx === columns.length - 1;
                                    return (
                                        <th 
                                            key={idx} 
                                            className={`
                                                py-3 px-4 font-bold text-white whitespace-nowrap align-middle relative border-b border-white/5 border-r border-white/5
                                                ${isLast ? 'last:rounded-tr-xl border-r-0' : ''}
                                                text-center
                                            `}
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <Text as="span" weight="bold" color="inherit" size="xs" className="uppercase tracking-wider">
                                                    {col.header}
                                                </Text>
                                                {col.enableColumnFilter !== false && (
                                                    <FilterDropdown 
                                                        options={getColumnOptions(colKey)}
                                                        selectedOptions={columnFilters[colKey] || []}
                                                        onFilterChange={(vals) => handleFilterChange(colKey, vals)}
                                                        dark
                                                    />
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                            {filteredAndSortedData.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="py-2 px-4 text-slate-400 font-mono w-12 border-r border-slate-50 dark:border-slate-700/50 text-center">{rowIndex + 1}</td>
                                    {columns.map((col, colIndex) => (
                                        <td 
                                            key={colIndex} 
                                            className={`py-2 px-4 border-r border-slate-50 dark:border-slate-700/50 ${col.align === 'right' ? 'text-right font-mono font-semibold' : col.align === 'center' ? 'text-center' : 'text-left'}`}
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
