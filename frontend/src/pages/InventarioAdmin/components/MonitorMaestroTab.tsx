import React, { useState, useMemo, useTransition, useCallback, useDeferredValue, useEffect, useRef } from 'react';
import { Title, Text, Button, Badge, MultiSelect } from '../../../components/atoms';
import { CheckCircle2, AlertCircle, Clock, Search, Filter } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';

interface MonitorMaestroTabProps {
    stats: any;
    inventoryList: any[];
    isLoadingData: boolean;
    filters: { bodega: string, estado: string, search: string };
    setFilters: (filters: any) => void;
    fetchStats: () => void;
    fetchInventoryList: () => void;
}

// Estilos de grilla compartidos para mantener alineación entre cabecera y filas virtualizadas
const GRID_STYLE = "grid grid-cols-[40px_75px_75px_60px_85px_1fr_60px_60px_60px_60px_60px_60px_60px_110px] items-center gap-0 divide-x divide-neutral-100 dark:divide-neutral-800 w-full";

// Componente de Esqueleto de Carga para reducir el LCP
const SkeletonRow = () => (
    <div className={`${GRID_STYLE} border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 h-[44px]`}>
        {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="px-2 h-full flex items-center justify-center">
                <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            </div>
        ))}
    </div>
);

// Componente de Fila Memoizado para máximo rendimiento
const InventoryRow = React.memo(({ item, style }: { item: any, style?: React.CSSProperties }) => {
    // Usamos los campos persistidos en DB que calculó el backend
    const cantFinalLocal = Number(item.cantidad_final) || 0;
    const difGlobal = Number(item.diferencia_total) || 0;

    // Autoridad total de la base de datos para el estado
    const status = item.estado;

    return (
        <div style={style} className={`${GRID_STYLE} hover:bg-primary-500/[0.02] transition-colors border-b border-neutral-50 dark:border-neutral-800 bg-white dark:bg-neutral-900/50`}>
            <div className="p-0.5 text-center flex justify-center">
                <Text className="text-[9px] font-normal text-neutral-900 dark:text-neutral-100">{item.bodega}</Text>
            </div>
            <div className="p-0.5 text-center flex justify-center">
                <Text className="text-[9px] font-normal text-neutral-900 dark:text-neutral-100">{item.bloque}</Text>
            </div>
            <div className="p-0.5 text-center flex justify-center">
                <Text className="text-[9px] font-normal text-neutral-900 dark:text-neutral-100">{item.estante}</Text>
            </div>
            <div className="p-0.5 text-center flex justify-center">
                <Text className="text-[9px] font-normal text-neutral-900 dark:text-neutral-100">{item.nivel || '-'}</Text>
            </div>
            <div className="p-1 px-1 flex justify-center">
                <Text as="span" className="text-[9px] font-normal text-neutral-900 dark:text-neutral-100">{item.codigo}</Text>
            </div>
            <div className="p-1 px-2 overflow-hidden text-left">
                <Text className="text-[9px] font-normal line-clamp-1 opacity-80 text-neutral-900 dark:text-neutral-100">{item.descripcion}</Text>
            </div>
            <div className="p-1 text-center flex justify-center"><Text as="span" className="text-[9px] font-normal text-neutral-900 dark:text-neutral-100">{item.cantidad_sistema}</Text></div>
            <div className="p-1 text-center flex justify-center"><Text as="span" className="text-[9px] font-normal text-neutral-900 dark:text-neutral-100">{item.invporlegalizar || '0'}</Text></div>
            
            {/* Cantidad Final */}
            {/* Cantidad Final LOCAL */}
            <div className="p-1 text-center flex justify-center bg-neutral-50/50 dark:bg-neutral-800/20 font-bold">
                <Text as="span" className="text-[9px] text-primary-600 dark:text-primary-400">{cantFinalLocal}</Text>
            </div>

            <div className="p-1 text-center flex justify-center"><Text as="span" className="text-[9px] font-normal text-neutral-900 dark:text-neutral-100">{item.cant_c1 || '0'}</Text></div>
            <div className="p-1 text-center flex justify-center"><Text as="span" className="text-[9px] font-normal text-neutral-900 dark:text-neutral-100">{item.cant_c2 || '0'}</Text></div>
            <div className="p-1 text-center flex justify-center"><Text as="span" className="text-[9px] font-normal text-neutral-900 dark:text-neutral-100">{item.cant_c3 || '0'}</Text></div>
            
            {/* Diferencia DIF - Ahora es GLOBAL y Balanceada */}
            <div className={`p-1 text-center flex justify-center font-bold relative ${difGlobal > 0 ? 'text-green-600' : difGlobal < 0 ? 'text-red-600' : 'text-neutral-400'}`}>
                <Text as="span" className="text-[9px]">{difGlobal > 0 ? `+${difGlobal}` : difGlobal}</Text>
            </div>

            <div className="p-1 text-center flex justify-center">
                <Badge variant={
                    status === 'CONCILIADO' ? 'success' :
                        status === 'DISCREPANTE' ? 'error' :
                            status === 'RECONTEO' ? 'warning' :
                                'default'
                } size="sm" className="text-[9px] px-2 py-0.5 uppercase tracking-tighter font-bold">{status}</Badge>
            </div>
        </div>
    );
});

const MonitorMaestroTab: React.FC<MonitorMaestroTabProps> = ({
    stats,
    inventoryList,
    isLoadingData,
    filters,
}) => {
    const [columnFilters, setColumnFilters] = useState<{ [key: string]: string[] }>({});
    const [isPending, startTransition] = useTransition();
    const [tableHeight, setTableHeight] = useState(600);
    const tableRef = useRef<HTMLDivElement>(null);

    const deferredFilters = useDeferredValue(columnFilters);
    const deferredSearch = useDeferredValue(filters.search);

    // Cálculo dinámico de altura para evitar doble scroll
    useEffect(() => {
        const updateHeight = () => {
            if (tableRef.current) {
                const rect = tableRef.current.getBoundingClientRect();
                const availableHeight = window.innerHeight - rect.top - 40;
                setTableHeight(Math.max(300, availableHeight));
            }
        };

        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    // Memoización de la lista filtrada principal
    const filteredList = useMemo(() => {
        const activeCriteria = Object.entries(deferredFilters)
            .filter(([_, values]) => values.length > 0) as [string, string[]][];

        const searchLower = deferredSearch?.toLowerCase() || '';

        const result = inventoryList.filter(item => {
            if (searchLower) {
                const searchStr = `${item.codigo} ${item.descripcion}`.toLowerCase();
                if (!searchStr.includes(searchLower)) return false;
            }

            return activeCriteria.every(([col, selectedValues]) => {
                const itemValue = String(item[col as keyof any] || '');
                return selectedValues.includes(itemValue);
            });
        });

        return [...result].sort((a, b) => {
            if (a.bodega !== b.bodega) return a.bodega.localeCompare(b.bodega);
            if (a.bloque !== b.bloque) return a.bloque.localeCompare(b.bloque);
            if (a.estante !== b.estante) return a.estante.localeCompare(b.estante);
            if (a.nivel !== b.nivel) return (a.nivel || '').localeCompare(b.nivel || '');
            return a.codigo.localeCompare(b.codigo);
        });
    }, [inventoryList, deferredFilters, deferredSearch]);

    const VirtualRow = useCallback(({ index, style }: { index: number, style: React.CSSProperties }) => {
        const item = filteredList[index];
        if (!item) return null;
        return (
            <InventoryRow 
                item={item} 
                style={style} 
            />
        );
    }, [filteredList]);

    const getOptionsForColumn = useCallback((col: string) => {
        const otherFilters = { ...columnFilters };
        delete otherFilters[col];

        const sourceList = inventoryList.filter(item => {
            return (Object.entries(otherFilters) as [string, string[]][]).every(([c, selectedValues]) => {
                if (selectedValues.length === 0) return true;
                const itemValue = String(item[c as keyof any] || '');
                return selectedValues.includes(itemValue);
            });
        });

        const unique = Array.from(new Set(sourceList.map(item => String(item[col as keyof any] || ''))))
            .filter(Boolean)
            .sort();
        return unique.map(val => ({ value: val, label: val }));
    }, [inventoryList, columnFilters]);

    const handleColumnFilterChange = useCallback((col: string, values: string[]) => {
        startTransition(() => {
            setColumnFilters(prev => ({ ...prev, [col]: values }));
        });
    }, []);

    const FilterHeader = React.memo(({ label, col, width = 'auto' }: { label: string, col: string, width?: string }) => {
        const options = useMemo(() => getOptionsForColumn(col), [col]);
        return (
            <div className={`p-0 bg-navy border-none flex flex-col items-center justify-center h-full ${width !== 'auto' ? `w-[${width}] min-w-[${width}]` : ''}`}>
                <MultiSelect
                    triggerLabel={label}
                    options={options}
                    value={deferredFilters[col] || []}
                    onChange={(v) => handleColumnFilterChange(col, v)}
                    minimal={true}
                    className="w-full h-full"
                />
            </div>
        );
    });

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <div className="max-w-[1300px] mx-auto w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {[
                        { label: 'Total Items', value: stats.total, icon: Search, color: 'text-neutral-500', bg: 'bg-neutral-50' },
                        { label: 'Conciliados', value: `${stats.conciliados} (${stats.porcentaje_avance}%)`, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50/50' },
                        { label: 'Ubic. Errónea', value: stats.erroneos, icon: AlertCircle, color: 'text-indigo-600', bg: 'bg-indigo-50/50' },
                        { label: 'Discrepantes', value: stats.discrepantes, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50/50' },
                        { label: 'En Reconteo', value: stats.reconteo, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50/50' },
                    ].map((card, i) => (
                        <div key={i} className={`p-4 rounded-2xl border border-[var(--color-border)] ${card.bg} space-y-2 transition-transform hover:scale-[1.02] duration-300`}>
                            <div className="flex items-center justify-between">
                                <Text variant="caption" weight="bold" className="uppercase tracking-tight opacity-70 whitespace-nowrap">{card.label}</Text>
                                <card.icon size={16} className={card.color} />
                            </div>
                            <Title variant="h5" weight="bold" className={card.color}>{card.value}</Title>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end mb-2 px-1">
                {Object.keys(columnFilters).length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={Filter}
                        onClick={() => setColumnFilters({})}
                        className="text-[10px] uppercase font-bold text-primary-500 hover:bg-primary-50 !h-7 !py-0 !rounded-xl transition-all animate-in fade-in zoom-in duration-300"
                    >
                        Limpiar {Object.keys(columnFilters).length} Filtros
                    </Button>
                )}
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-sm relative">
                {isPending && <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-50 animate-pulse pointer-events-none" />}
                
                <div
                    ref={tableRef}
                    className="relative overflow-x-auto overflow-y-hidden shadow-inner border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900/50 scrollbar-thin scrollbar-thumb-neutral-200"
                >
                    <div className="w-full">
                        {/* Cabecera Estática */}
                        <div className={`sticky top-0 z-20 bg-navy text-white shadow-sm ${GRID_STYLE} h-12`}>
                            <FilterHeader label="BDG." col="bodega" width="40px" />
                            <FilterHeader label="Blq." col="bloque" width="75px" />
                            <FilterHeader label="Est." col="estante" width="75px" />
                            <FilterHeader label="Niv." col="nivel" width="60px" />
                            <FilterHeader label="Código" col="codigo" width="85px" />
                            <FilterHeader label="Descripción" col="descripcion" width="1fr" />
                            <FilterHeader label="SIIG" col="cantidad_sistema" width="60px" />
                            <FilterHeader label="I.LEG" col="invporlegalizar" width="60px" />
                            <div className="flex flex-col items-center justify-center h-full w-[60px] min-w-[60px] bg-white/5 border-x border-white/10">
                                <Text className="text-[8px] uppercase font-bold text-primary-300">Final</Text>
                            </div>
                            <FilterHeader label="C1" col="cant_c1" width="60px" />
                            <FilterHeader label="C2" col="cant_c2" width="60px" />
                            <FilterHeader label="C3" col="cant_c3" width="60px" />
                            <div className="flex flex-col items-center justify-center h-full w-[60px] min-w-[60px] bg-white/5 border-l border-white/10">
                                <Text className="text-[8px] uppercase font-bold text-primary-300">DIF</Text>
                            </div>
                            <FilterHeader label="Estado" col="estado" width="110px" />
                        </div>

                        {/* Cuerpo Virtualizado */}
                        <div className="bg-white dark:bg-transparent">
                            {isLoadingData ? (
                                Array.from({ length: 15 }).map((_, i) => <SkeletonRow key={i} />)
                            ) : filteredList.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center justify-center">
                                    <Search size={32} className="text-neutral-300 mb-3" />
                                    <Text variant="caption" color="text-secondary">No se encontraron resultados para los filtros aplicados.</Text>
                                </div>
                            ) : (
                                <List
                                    height={tableHeight - 48}
                                    itemCount={filteredList.length}
                                    itemSize={44}
                                    width="100%"
                                    className="scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700"
                                >
                                    {VirtualRow}
                                </List>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonitorMaestroTab;
