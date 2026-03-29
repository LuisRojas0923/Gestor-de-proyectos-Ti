import React, { useState, useMemo, useTransition, useCallback, useDeferredValue, useEffect, useRef } from 'react';
import { Text, Button, Badge, MultiSelect } from '../../../components/atoms';
import { CheckCircle2, Search, Filter } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';

interface MonitorMaestroTabProps {
    stats: any;
    inventoryList: any[];
    isLoadingData: boolean;
    filters: { bodega: string, estado: string, search: string };
    setFilters: (filters: any) => void;
    columnFilters: Record<string, string[]>;
    setColumnFilters: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
    fetchStats: () => void;
    fetchInventoryList: () => void;
    coverage: any;
}

// Estilos de grilla compartidos para mantener alineación entre cabecera y filas virtualizadas
const GRID_STYLE = "grid grid-cols-[85px_85px_85px_140px_100px_1fr_60px_60px_60px_55px_55px_55px_55px_110px] items-center gap-0 divide-x divide-neutral-100 dark:divide-neutral-800 w-full min-w-[1100px]";

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
    // Función de formateo robusta para decimales
    const formatNum = (v: any) => {
        const n = Number(v);
        if (isNaN(n)) return '0';
        return Number.isInteger(n) ? String(n) : n.toFixed(2);
    };

    const cantFinalLocal = Number(item.cantidad_final) || 0;
    const difGlobal = Number(item.diferencia_total) || 0;
    const status = item.estado;

    // Lógica de Coincidencias para Resaltado Cromático
    const nC1 = Number(item.cant_c1) || 0;
    const nC2 = Number(item.cant_c2) || 0;
    const nC3 = Number(item.cant_c3) || 0;
    const nFinal = cantFinalLocal;

    // Caso 1: C1 ya es correcto vs Sistema
    const c1MatchesGoal = nC1 === nFinal && nC1 !== 0;

    // Caso 2: C1 y C2 coinciden entre sí
    const matchesC1C2 = nC1 === nC2 && nC1 !== 0;

    // Caso 3: C2 es correcto vs Sistema
    const c2MatchesGoal = nC2 === nFinal && nC2 !== 0;

    // Caso 4: C3 coincide con alguno de los anteriores
    const matchesC3C2 = nC3 === nC2 && nC3 !== 0;
    const matchesC3C1 = nC3 === nC1 && nC3 !== 0;
    const matchesC3Goal = nC3 === nFinal && nC3 !== 0;

    // Estilo de Fondo para Matches (Verde Suave) y Errores (Rojo Suave)
    const bgMatch = "bg-emerald-500/20 dark:bg-emerald-500/10 font-bold border-green-500/20";
    const bgError = "bg-red-500/20 dark:bg-red-500/10 font-bold border-red-500/20";

    const getC1Style = () => {
        if (status === 'CONCILIADO' && (c1MatchesGoal || matchesC1C2 || matchesC3C1)) return bgMatch;
        if ((status === 'DISCREPANTE' || status === 'RECONTEO') && nC1 !== 0 && !c1MatchesGoal) return bgError;
        return '';
    };

    const getC2Style = () => {
        if (status === 'CONCILIADO' && (c2MatchesGoal || matchesC1C2 || matchesC3C2)) return bgMatch;
        if ((status === 'DISCREPANTE' || status === 'RECONTEO') && nC2 !== 0 && !c2MatchesGoal) return bgError;
        return '';
    };

    const getC3Style = () => {
        if (status === 'CONCILIADO' && (matchesC3C2 || matchesC3C1 || matchesC3Goal)) return bgMatch;
        if ((status === 'DISCREPANTE' || status === 'RECONTEO') && nC3 !== 0 && !matchesC3Goal) return bgError;
        return '';
    };

    return (
        <div style={style} className={`${GRID_STYLE} hover:bg-primary-500/[0.02] transition-colors border-b border-neutral-50 dark:border-neutral-800 bg-white dark:bg-neutral-900/50`}>
            <div className="p-0.5 text-center flex justify-center">
                <Text className="text-[10px] font-normal text-neutral-900 dark:text-neutral-100">{item.bodega}</Text>
            </div>
            <div className="p-0.5 text-center flex justify-center">
                <Text className="text-[10px] font-normal text-neutral-900 dark:text-neutral-100">{item.bloque}</Text>
            </div>
            <div className="p-0.5 text-center flex justify-center">
                <Text className="text-[10px] font-normal text-neutral-900 dark:text-neutral-100">{item.estante}</Text>
            </div>
            <div className="p-0.5 text-center flex justify-center">
                <Text className="text-[10px] font-normal text-neutral-900 dark:text-neutral-100">{item.nivel || '-'}</Text>
            </div>
            <div className="p-1 px-1 flex justify-center">
                <Text as="span" className="text-[10px] font-normal text-neutral-900 dark:text-neutral-100">{item.codigo}</Text>
            </div>
            <div className="p-1 px-2 overflow-hidden text-left">
                <Text className="text-[10px] font-normal line-clamp-1 opacity-80 text-neutral-900 dark:text-neutral-100">{item.descripcion}</Text>
            </div>
            <div className="p-1 text-center flex justify-center"><Text as="span" className="text-[10px] font-normal text-neutral-900 dark:text-neutral-100">{formatNum(item.cantidad_sistema)}</Text></div>
            <div className="p-1 text-center flex justify-center"><Text as="span" className="text-[10px] font-normal text-neutral-900 dark:text-neutral-100">{formatNum(item.invporlegalizar)}</Text></div>

            {/* Cantidad Final */}
            <div className="p-1 text-center flex justify-center bg-neutral-50/50 dark:bg-neutral-800/20 font-bold">
                <Text as="span" className="text-[10px] text-primary-600 dark:text-primary-400">{formatNum(cantFinalLocal)}</Text>
            </div>

            <div className={`p-1 text-center flex justify-center transition-colors ${getC1Style()}`}>
                <Text as="span" className="text-[10px] font-normal text-neutral-900 dark:text-neutral-100">{formatNum(item.cant_c1)}</Text>
            </div>
            <div className={`p-1 text-center flex justify-center transition-colors ${getC2Style()}`}>
                <Text as="span" className="text-[10px] font-normal text-neutral-900 dark:text-neutral-100">{formatNum(item.cant_c2)}</Text>
            </div>
            <div className={`p-1 text-center flex justify-center transition-colors ${getC3Style()}`}>
                <Text as="span" className="text-[10px] font-normal text-neutral-900 dark:text-neutral-100">{formatNum(item.cant_c3)}</Text>
            </div>

            {/* Diferencia DIF - Formato Condicional */}
            <div className={`p-1 text-center flex justify-center font-bold relative transition-colors 
                ${difGlobal > 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600' :
                    difGlobal < 0 ? 'bg-red-50 dark:bg-red-900/10 text-red-600' :
                        'text-neutral-400'}`}>
                <Text as="span" className="text-[10px]">{difGlobal > 0 ? `+${formatNum(difGlobal)}` : formatNum(difGlobal)}</Text>
            </div>

            <div className="p-1 text-center flex justify-center">
                <Badge variant={
                    status === 'CONCILIADO' ? 'success' :
                        status === 'DISCREPANTE' ? 'error' :
                            status === 'RECONTEO' ? 'warning' :
                                'default'
                } size="sm" className="text-[10px] px-2 py-0.5 uppercase tracking-tighter font-bold">{status}</Badge>
            </div>
        </div>
    );
});

const MonitorMaestroTab: React.FC<MonitorMaestroTabProps> = ({
    stats,
    inventoryList,
    isLoadingData,
    filters,
    columnFilters,
    setColumnFilters,
    coverage,
}) => {
    const [isPending, startTransition] = useTransition();
    const [tableHeight, setTableHeight] = useState(600);
    const [containerWidth, setContainerWidth] = useState(1100);
    const tableRef = useRef<HTMLDivElement>(null);

    const deferredFilters = useDeferredValue(columnFilters);
    const deferredSearch = useDeferredValue(filters.search);

    // Componente interno para las barras de progreso globales
    const GlobalProgressBar = ({ label, current, total, color, icon: Icon }: any) => {
        const percentage = Math.min(100, Math.round((current / total) * 100) || 0);
        const isComplete = percentage === 100;
        const barColor = isComplete ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : color.replace('text-', 'bg-');
        const textColor = isComplete ? 'text-green-500' : color;

        return (
            <div className="flex-1 min-w-[240px] p-3 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm flex flex-col gap-2 transition-all">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${textColor.replace('text-', 'bg-').replace('-600', '-500/10').replace('-500', '-500/10')}`}>
                            <Icon size={14} className={textColor} />
                        </div>
                        <Text variant="caption" weight="bold" className="uppercase text-[9px] tracking-widest opacity-60">{label}</Text>
                    </div>
                    <Text variant="caption" weight="bold" className="text-[11px] font-black">{current} / {total}</Text>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden shadow-inner">
                        <div
                            className={`h-full transition-all duration-1000 ${barColor}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <Text variant="caption" weight="bold" className={`text-[11px] min-w-[35px] text-right font-black ${textColor}`}>{percentage}%</Text>
                </div>
            </div>
        );
    };

    // Cálculo dinámico de altura para evitar doble scroll
    useEffect(() => {
        const updateHeight = () => {
            if (tableRef.current) {
                const rect = tableRef.current.getBoundingClientRect();
                const availableHeight = window.innerHeight - rect.top - 40;
                setTableHeight(Math.max(300, availableHeight));
                setContainerWidth(rect.width - 2);
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
                const rawValue = item[col as keyof any];
                const itemValue = (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') ? '' : String(rawValue);
                return selectedValues.includes(itemValue);
            });
        });

        return [...result].sort((a, b) => {
            if (a.bodega !== b.bodega) return a.bodega.localeCompare(b.bodega, undefined, { numeric: true });
            if (a.bloque !== b.bloque) return a.bloque.localeCompare(b.bloque, undefined, { numeric: true });
            if (a.estante !== b.estante) return a.estante.localeCompare(b.estante, undefined, { numeric: true });
            if (a.nivel !== b.nivel) return (a.nivel || '').localeCompare(b.nivel || '', undefined, { numeric: true });
            return (a.codigo || '').localeCompare(b.codigo || '');
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

        const unique = Array.from(new Set(sourceList.map(item => {
            const raw = item[col as keyof any];
            return (raw === null || raw === undefined || String(raw).trim() === '') ? '' : String(raw);
        })))
            .sort((a, b) => {
                if (a === '' && b === '') return 0;
                if (a === '') return -1;
                if (b === '') return 1;
                return a.localeCompare(b, undefined, { numeric: true });
            });
        return unique.map(val => ({ value: val, label: val === '' ? '(Vacío)' : val }));
    }, [inventoryList, columnFilters]);

    const handleColumnFilterChange = useCallback((col: string, values: string[]) => {
        startTransition(() => {
            setColumnFilters(prev => ({ ...prev, [col]: values }));
        });
    }, []);

    const FilterHeader = React.memo(({ label, col, width = 'auto' }: { label: string, col: string, width?: string }) => {
        const options = useMemo(() => getOptionsForColumn(col), [col]);
        // Solo aplicamos ancho fijo si no es flexible (1fr) o auto
        const fixedWidth = width !== 'auto' && width !== '1fr';
        return (
            <div className={`p-0 bg-navy border-none flex flex-col items-center justify-center h-full ${fixedWidth ? `w-[${width}] min-w-[${width}]` : ''}`}>
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

            {/* Fila 1: Resumen Global */}
            <div className="flex flex-wrap gap-4 px-1">
                <GlobalProgressBar
                    label="Avance Procesado"
                    current={(Number(stats.total) || 0) - (Number(stats.pendientes) || 0)}
                    total={Number(stats.total) || 0}
                    color="text-primary-600"
                    icon={Search}
                />
                <GlobalProgressBar
                    label="Efectividad Consiliación"
                    current={stats.conciliados}
                    total={Number(stats.total) || 0}
                    color="text-emerald-600"
                    icon={CheckCircle2}
                />

                {/* Pendientes Rápidos */}
                <div className="flex gap-2 shrink-0">
                    {[
                        { label: 'C1', val: stats.pendientes_c1, color: 'text-neutral-500', bg: 'bg-neutral-100' },
                        { label: 'C2', val: stats.pendientes_c2, color: 'text-amber-600', bg: 'bg-amber-100/50' },
                        { label: 'C3', val: stats.pendientes_c3, color: 'text-red-600', bg: 'bg-red-100/50' }
                    ].map(p => (
                        <div key={p.label} className={`flex flex-col items-center justify-center px-4 rounded-2xl border border-neutral-100 dark:border-neutral-700 ${p.bg} min-w-[70px]`}>
                            <Text className="text-[8px] uppercase font-black opacity-40 leading-none mb-1">Pend {p.label}</Text>
                            <Text className={`text-lg font-black ${p.color}`}>{p.val}</Text>
                        </div>
                    ))}
                </div>
            </div>

            {/* Fila 2: Progreso por Bodega (Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-1">
                {coverage?.desglose_bodega && Object.entries(coverage.desglose_bodega).map(([name, b]: [string, any]) => (
                    <div key={name} className="bg-neutral-50 dark:bg-neutral-800/30 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm flex flex-col gap-2 hover:border-primary-500 transition-colors group">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-black text-neutral-400 group-hover:text-primary-500 transition-colors">Bodega {name}</span>
                            <span className="text-[9px] opacity-40 font-bold">{b.parejas} parejas</span>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {/* C1 PROGRESS ROW */}
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <Text className="text-[9px] font-black opacity-60">CONTEO 1</Text>
                                    <Text className={`text-[9px] font-black ${b.p_c1 === 100 ? 'text-green-500' : 'text-primary-600'}`}>{b.hechos_c1} / {b.total} ({b.p_c1}%)</Text>
                                </div>
                                <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden shadow-inner">
                                    <div className={`h-full transition-all duration-1000 ${b.p_c1 === 100 ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${b.p_c1}%` }} />
                                </div>
                            </div>

                            {/* C2 PROGRESS ROW */}
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <Text className="text-[9px] font-black opacity-60">CONTEO 2</Text>
                                    <Text className={`text-[9px] font-black ${b.p_c2 === 100 ? 'text-green-500' : 'text-amber-600'}`}>{b.hechos_c2} / {b.total} ({b.p_c2}%)</Text>
                                </div>
                                <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden shadow-inner">
                                    <div className={`h-full transition-all duration-1000 ${b.p_c2 === 100 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${b.p_c2}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
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
                            <FilterHeader label="BODEGA" col="bodega" width="85px" />
                            <FilterHeader label="BLOQUE" col="bloque" width="85px" />
                            <FilterHeader label="ESTANTE" col="estante" width="85px" />
                            <FilterHeader label="NIVEL" col="nivel" width="140px" />
                            <FilterHeader label="CÓDIGO" col="codigo" width="100px" />
                            <FilterHeader label="DESCRIPCIÓN" col="descripcion" width="1fr" />
                            <FilterHeader label="SIIG" col="cantidad_sistema" width="60px" />
                            <FilterHeader label="I.LEG" col="invporlegalizar" width="60px" />
                            <div className="flex flex-col items-center justify-center h-full bg-white/5">
                                <Text as="span" align="center" className="text-[9px] uppercase font-bold text-primary-300">INV</Text>
                            </div>
                            <FilterHeader label="C1" col="cant_c1" width="55px" />
                            <FilterHeader label="C2" col="cant_c2" width="55px" />
                            <FilterHeader label="C3" col="cant_c3" width="55px" />
                            <div className="flex flex-col items-center justify-center h-full bg-white/5">
                                <Text as="span" align="center" className="text-[9px] uppercase font-bold text-primary-300">DIF</Text>
                            </div>
                            <FilterHeader label="ESTADO" col="estado" width="110px" />
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
                                    width={Math.max(containerWidth, 1100)}
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
