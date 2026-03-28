import React, { useState, useMemo, useTransition, useCallback, useDeferredValue } from 'react';
import { Title, Text, Button, Input, Badge, MultiSelect } from '../../../components/atoms';
import { Search, CheckCircle2, AlertCircle, Clock, RefreshCcw, Loader2, Filter } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';

interface MonitorMaestroTabProps {
    stats: any;
    inventoryList: any[];
    isLoadingData: boolean;
    filters: any;
    setFilters: (f: any) => void;
    fetchStats: () => void;
    fetchInventoryList: () => void;
}

// Estilos de grilla compartidos para mantener alineación entre cabecera y filas virtualizadas
const GRID_STYLE = "grid grid-cols-[35px_35px_35px_35px_70px_1fr_45px_45px_40px_40px_40px_120px] items-center gap-0 divide-x divide-neutral-100 dark:divide-neutral-800 w-full min-w-[1200px]";

// Componente de Esqueleto de Carga para reducir el LCP
const SkeletonRow = () => (
    <div className={`${GRID_STYLE} border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 h-[40px]`}>
        {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="px-2 h-full flex items-center justify-center">
                <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            </div>
        ))}
    </div>
);

// Componente de Fila Memoizado para máximo rendimiento
const InventoryRow = React.memo(({ item, style }: { item: any, style?: React.CSSProperties }) => {
    return (
        <div style={style} className={`${GRID_STYLE} hover:bg-primary-500/[0.02] transition-colors border-b border-neutral-50 dark:border-neutral-800 bg-white dark:bg-neutral-900/50`}>
            <div className="p-0.5 text-center flex justify-center">
                <Text weight="bold" className="text-[12px] text-neutral-900 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded px-1">{item.bodega}</Text>
            </div>
            <div className="p-0.5 text-center flex justify-center">
                <Text weight="bold" className="text-[12px] text-neutral-900 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded px-1">{item.bloque}</Text>
            </div>
            <div className="p-0.5 text-center flex justify-center">
                <Text weight="bold" className="text-[12px] text-neutral-900 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded px-1">{item.estante}</Text>
            </div>
            <div className="p-0.5 text-center flex justify-center">
                <Text weight="bold" className="text-[12px] text-neutral-900 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded px-1">{item.nivel || '-'}</Text>
            </div>
            <div className="p-1 px-1 flex justify-center">
                <Text as="span" className="tag-badge-lg">{item.codigo}</Text>
            </div>
            <div className="p-1 px-2 overflow-hidden">
                <Text variant="caption" color="text-secondary" className="text-[9px] line-clamp-1 opacity-80">{item.descripcion}</Text>
            </div>
            <div className="p-1 text-center flex justify-center"><Text as="span" className="tag-badge-lg">{item.cantidad_sistema}</Text></div>
            <div className="p-1 text-center flex justify-center"><Text as="span" className="tag-badge-lg">{item.invporlegalizar || '0'}</Text></div>
            <div className="p-1 text-center flex justify-center"><Text as="span" className="tag-badge-lg">{item.cant_c1 || '0'}</Text></div>
            <div className="p-1 text-center flex justify-center"><Text as="span" className="tag-badge-lg">{item.cant_c2 || '0'}</Text></div>
            <div className="p-1 text-center flex justify-center"><Text as="span" className="tag-badge-lg">{item.cant_c3 || '0'}</Text></div>
            <div className="p-1 text-center flex justify-center">
                <Badge variant={
                    item.estado === 'CONCILIADO' ? 'success' :
                    item.estado === 'DISCREPANTE' ? 'error' :
                    item.estado === 'RECONTEO' ? 'warning' :
                    'default'
                } size="sm" className="text-[8px] px-2 py-1 uppercase tracking-tighter font-bold">{item.estado}</Badge>
            </div>
        </div>
    );
});

const MonitorMaestroTab: React.FC<MonitorMaestroTabProps> = ({
    stats,
    inventoryList,
    isLoadingData,
    filters,
    setFilters,
    fetchStats,
    fetchInventoryList
}) => {
    const [columnFilters, setColumnFilters] = useState<{ [key: string]: string[] }>({});
    const [isPending, startTransition] = useTransition();
    
    // Optimizamos el filtrado para que no bloquee el hilo principal
    const deferredFilters = useDeferredValue(columnFilters);
    const deferredSearch = useDeferredValue(filters.search);

    // Memoización de la lista filtrada principal con lógica optimizada O(N)
    const filteredList = useMemo(() => {
        // Pre-filtramos solo los criterios de búsqueda activos para evitar iteraciones vacías
        const activeCriteria = Object.entries(deferredFilters)
            .filter(([_, values]) => values.length > 0) as [string, string[]][];
        
        const searchLower = deferredSearch?.toLowerCase() || '';

        const result = inventoryList.filter(item => {
            // 1. Búsqueda Texto (Global)
            if (searchLower) {
                const searchStr = `${item.codigo} ${item.descripcion}`.toLowerCase();
                if (!searchStr.includes(searchLower)) return false;
            }

            // 2. Filtros de Columna (Cascada)
            return activeCriteria.every(([col, selectedValues]) => {
                const itemValue = String(item[col as keyof any] || '');
                return selectedValues.includes(itemValue);
            });
        });

        // Ordenamiento Jerárquico: Bodega > Bloque > Estante > Nivel
        return [...result].sort((a, b) => {
            if (a.bodega !== b.bodega) return a.bodega.localeCompare(b.bodega);
            if (a.bloque !== b.bloque) return a.bloque.localeCompare(b.bloque);
            if (a.estante !== b.estante) return a.estante.localeCompare(b.estante);
            return (a.nivel || '').localeCompare(b.nivel || '');
        });
    }, [inventoryList, deferredFilters, deferredSearch]);

    // Virtualización Renderer - Definido después de filteredList
    const VirtualRow = useCallback(({ index, style }: { index: number, style: React.CSSProperties }) => {
        const item = filteredList[index];
        if (!item) return null;
        return <InventoryRow item={item} style={style} />;
    }, [filteredList]);

    // Opciones de filtro memoizadas
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

    // Helper para cabeceras fusionadas
    const FilterHeader = React.memo(({ label, col, width = 'auto' }: { label: string, col: string, width?: string }) => {
        const options = useMemo(() => getOptionsForColumn(col), [col]);

        return (
            <div 
                className={`p-0 bg-navy border-none flex flex-col items-center justify-center h-full ${width !== 'auto' ? `w-[${width}] min-w-[${width}]` : ''}`}
            >
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Title variant="h5" weight="bold">Monitor Maestro</Title>
                        {isPending && <Loader2 size={14} className="animate-spin text-primary-500" />}
                    </div>
                    <Text variant="caption" color="text-secondary">Seguimiento en tiempo real de la toma física y conciliación. ({filteredList.length} registros)</Text>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    icon={RefreshCcw} 
                    onClick={() => { fetchStats(); fetchInventoryList(); }}
                    className="text-primary-500"
                >
                    Sincronizar Datos
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-sm relative">
                {isPending && <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-50 animate-pulse pointer-events-none" />}
                <div className="p-4 border-b border-[var(--color-border)] flex flex-wrap gap-4 items-center bg-neutral-50/30">
                    <div className="flex-1 min-w-[200px]">
                        <Input 
                            placeholder="Buscar por código o descripción..." 
                            icon={Search}
                            value={filters.search}
                            onChange={(e) => setFilters((prev: any) => ({ ...prev, search: e.target.value }))}
                            className="h-9 text-xs rounded-xl"
                        />
                    </div>
                    {Object.keys(columnFilters).length > 0 && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            icon={Filter}
                            onClick={() => setColumnFilters({})}
                            className="text-[10px] uppercase font-bold text-primary-500 border-primary-200 bg-primary-50"
                        >
                            Limpiar {Object.keys(columnFilters).length} Filtros
                        </Button>
                    )}
                </div>

                <div className="relative overflow-auto max-h-[calc(100vh-420px)] shadow-inner border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900/50 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700">
                    <div className="min-w-[1200px]">
                        {/* Cabecera Estática */}
                        <div className={`sticky top-0 z-20 bg-navy text-white shadow-sm ${GRID_STYLE} h-12`}>
                            <FilterHeader label="BDG." col="bodega" width="35px" />
                            <FilterHeader label="Blq." col="bloque" width="35px" />
                            <FilterHeader label="Est." col="estante" width="35px" />
                            <FilterHeader label="Niv." col="nivel" width="35px" />
                            <FilterHeader label="Código" col="codigo" width="70px" />
                            <FilterHeader label="Descripción" col="descripcion" width="100%" />
                            <FilterHeader label="SIIG" col="cantidad_sistema" width="45px" />
                            <FilterHeader label="Inv.Leg" col="invporlegalizar" width="45px" />
                            <FilterHeader label="C1" col="cant_c1" width="40px" />
                            <FilterHeader label="C2" col="cant_c2" width="40px" />
                            <FilterHeader label="C3" col="cant_c3" width="40px" />
                            <FilterHeader label="Estado" col="estado" width="120px" />
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
                                    height={500} // Ajustable o dynamic
                                    itemCount={filteredList.length}
                                    itemSize={40}
                                    width="100%"
                                    className="scrollbar-thin"
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
