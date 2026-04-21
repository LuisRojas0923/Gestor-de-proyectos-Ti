import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Navigate } from 'react-router-dom';
import { Title, Text, Button, MaterialCard, Input, Select, Checkbox } from '../../../../components/atoms';
import { useAppContext } from '../../../../context/AppContext';
import { ArrowLeft, Search, FileSpreadsheet, Filter, X } from 'lucide-react';
import { ImpuestosService } from '../../../../services/ImpuestosService';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';

// --- TIPOS Y COMPONENTES DE FILTRADO ---

interface Formato2276Item {
    id: number | string;
    entidad_informante: string;
    ano_gravable: number;
    nitb: string;
    pno: string;
    ono: string;
    pap: string;
    sap: string;
    pasa: number;
    tingbtp: number;
    apos: number;
    apof: number;
    vare: number;
    dir: string;
    mun: string;
    [key: string]: any;
}

interface FilterState {
    [key: string]: {
        type: 'categorical' | 'numeric';
        selected?: Set<string>;
        range?: { min: number | ''; max: number | '' };
    };
}

interface ColumnFilterPopoverProps {
    columnKey: string;
    title: string;
    type: 'categorical' | 'numeric';
    options: string[];
    currentState: FilterState[string];
    onSelectionChange: (key: string, newState: FilterState[string]) => void;
    onClose: () => void;
    anchorRect: DOMRect | null;
}

const ColumnFilterPopover: React.FC<ColumnFilterPopoverProps> = ({
    columnKey, title, type, options, currentState, onSelectionChange, onClose, anchorRect
}) => {
    const [search, setSearch] = useState('');
    const popoverRef = useRef<HTMLDivElement>(null);

    // Aplicar posicionamiento dinámico vía Ref para evitar violaciones de estilos inline en JSX
    React.useLayoutEffect(() => {
        if (popoverRef.current && anchorRect) {
            const POPOVER_WIDTH = 280;
            const POPOVER_HEIGHT = 400;
            const MARGIN = 16;
            
            let top = anchorRect.bottom + 8;
            let left = anchorRect.left;

            if (top + POPOVER_HEIGHT > window.innerHeight) {
                top = anchorRect.top - POPOVER_HEIGHT - 8;
            }
            if (left + POPOVER_WIDTH > window.innerWidth) {
                left = window.innerWidth - POPOVER_WIDTH - MARGIN;
            }

            popoverRef.current.style.top = `${top}px`;
            popoverRef.current.style.left = `${left}px`;
            popoverRef.current.style.width = `${POPOVER_WIDTH}px`;
        }
    }, [anchorRect]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) onClose();
        };
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    if (!anchorRect) return null;


    const filteredOptions = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

    const toggleOption = (opt: string) => {
        const newSelected = new Set(currentState.selected || []);
        if (newSelected.has(opt)) newSelected.delete(opt);
        else newSelected.add(opt);
        onSelectionChange(columnKey, { ...currentState, selected: newSelected });
    };

    const updateRange = (field: 'min' | 'max', val: string) => {
        const numVal = val === '' ? '' : Number(val);
        const newRange = { ...(currentState.range || { min: '', max: '' }), [field]: numVal };
        onSelectionChange(columnKey, { ...currentState, range: newRange });
    };

    return createPortal(
        <div 
            ref={popoverRef}
            className="fixed z-[9999] bg-white/95 dark:bg-neutral-800/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[400px]"
        >
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-700 flex justify-between items-center">
                <Text variant="caption" weight="bold" className="uppercase tracking-widest opacity-60">Filtrar: {title}</Text>
                <Button 
                    variant="ghost" 
                    onClick={onClose} 
                    className="p-1 h-8 w-8 rounded-full"
                    icon={X}
                />
            </div>

            {type === 'categorical' ? (
                <>
                    <div className="p-3">
                        <Input 
                            placeholder="Buscar valor..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            icon={Search}
                            className="bg-neutral-100 dark:bg-neutral-700 border-none"
                            fullWidth
                            size="sm"
                            autoFocus
                        />
                    </div>
                    <div className="px-3 pb-2 flex gap-2">
                        <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectionChange(columnKey, { ...currentState, selected: new Set(options) })}
                            className="text-[10px] text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 font-bold uppercase h-6 px-2"
                        >
                            Todos
                        </Button>
                        <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectionChange(columnKey, { ...currentState, selected: new Set() })}
                            className="text-[10px] text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 font-bold uppercase h-6 px-2"
                        >
                            Limpiar
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-1 py-1 custom-scrollbar">
                        {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                            <div 
                                key={opt} 
                                onClick={() => toggleOption(opt)}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 rounded-lg cursor-pointer transition-colors group"
                            >
                                <Checkbox 
                                    checked={!!currentState.selected?.has(opt)} 
                                    onChange={() => {}} 
                                />
                                <Text className="text-sm truncate opacity-80 group-hover:opacity-100">{opt || '(Vacío)'}</Text>
                            </div>
                        )) : (
                            <div className="p-8 text-center">
                                <Text variant="caption" className="opacity-40 italic">No hay coincidencias</Text>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Text variant="caption" className="text-[10px] opacity-60 uppercase">Desde</Text>
                            <Input 
                                type="number" 
                                value={currentState.range?.min?.toString() ?? ''}
                                onChange={(e) => updateRange('min', e.target.value)}
                                placeholder="Min"
                                className="bg-neutral-100 dark:bg-neutral-700 border-none"
                                size="sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Text variant="caption" className="text-[10px] opacity-60 uppercase">Hasta</Text>
                            <Input 
                                type="number" 
                                value={currentState.range?.max?.toString() ?? ''}
                                onChange={(e) => updateRange('max', e.target.value)}
                                placeholder="Max"
                                className="bg-neutral-100 dark:bg-neutral-700 border-none"
                                size="sm"
                            />
                        </div>
                    </div>
                    <Button 
                        fullWidth 
                        size="sm" 
                        variant="custom" 
                        onClick={() => onSelectionChange(columnKey, { ...currentState, range: { min: '', max: '' } })}
                        className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-300"
                    >
                        Resetear Rango
                    </Button>
                </div>
            )}

            <div className="p-3 border-t border-neutral-100 dark:border-neutral-700 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-800/50">
                <Text variant="caption" className="text-[10px] opacity-50">
                    {type === 'categorical' ? `${currentState.selected?.size} seleccionados` : 'Filtro por rango'}
                </Text>
            </div>
        </div>,
        document.body
    );
};

interface Formato2276DataTableProps {
    onBack: () => void;
}

const Formato2276DataTable: React.FC<Formato2276DataTableProps> = ({ onBack }) => {
    const { state } = useAppContext();
    const { user } = state;
    const { addNotification } = useNotifications();
    const [data, setData] = useState<Formato2276Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState<number | string>('');

    // --- ESTADO DE FILTROS AVANZADOS ---
    const [filters, setFilters] = useState<FilterState>({});
    const [activeFilter, setActiveFilter] = useState<{ key: string, title: string, type: 'categorical' | 'numeric', rect: DOMRect } | null>(null);

    const isContabilidad = user?.role === 'contabilidad' || user?.role === 'admin' || user?.role === 'admin_sistemas';

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await ImpuestosService.getRegistrosExogena(selectedYear ? Number(selectedYear) : undefined);
            setData(res);
        } catch (err: any) {
            addNotification('error', err || 'Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isContabilidad) {
            fetchData();
        }
    }, [selectedYear, isContabilidad]);

    const filteredData = useMemo(() => {
        if (!isContabilidad) return [];
        return data.filter((item: Formato2276Item) => {
            // 1. Búsqueda Global
            const searchMatch = !searchTerm || 
                item.nitb.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.pno.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.pap.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (!searchMatch) return false;

            // 2. Filtros por Columna
            for (const [key, filter] of Object.entries(filters)) {
                if (filter.type === 'categorical' && filter.selected && filter.selected.size > 0) {
                    if (!filter.selected.has(item[key]?.toString())) return false;
                }
                if (filter.type === 'numeric' && filter.range) {
                    const val = Number(item[key]);
                    if (filter.range.min !== '' && val < filter.range.min) return false;
                    if (filter.range.max !== '' && val > filter.range.max) return false;
                }
            }
            return true;
        });
    }, [data, searchTerm, filters, isContabilidad]);

    if (!isContabilidad) {
        return <Navigate to="/service-portal/contabilidad" replace />;
    }

    const getUniqueValues = (key: string) => {
        const values = new Set<string>();
        data.forEach((item: Formato2276Item) => {
            const val = item[key];
            if (val !== undefined && val !== null) values.add(val.toString());
        });
        return Array.from(values).sort();
    };

    const hasActiveFilters = Object.values(filters).some((f: any) => 
        (f.type === 'categorical' && f.selected && f.selected.size > 0) ||
        (f.type === 'numeric' && f.range && (f.range.min !== '' || f.range.max !== ''))
    );

    const renderFilterTrigger = (key: string, title: string, type: 'categorical' | 'numeric') => {
        const hasFilter = filters[key] && (
            (filters[key].type === 'categorical' && filters[key].selected && filters[key].selected.size > 0) ||
            (filters[key].type === 'numeric' && filters[key].range && (filters[key].range.min !== '' || filters[key].range.max !== ''))
        );

        return (
            <div className="flex items-center gap-1.5 group/header">
                <Text variant="caption" weight="bold" color="inherit" className="uppercase tracking-wider">{title}</Text>
                <Button
                    variant="custom"
                    size="sm"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setActiveFilter({ key, title, type, rect });
                    }}
                    className={`p-1 h-6 w-6 rounded-md transition-all shadow-none border-none ${hasFilter ? 'text-yellow-400 bg-white/20' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                    icon={Filter}
                />
            </div>
        );
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={onBack} size="sm" className="p-2" icon={ArrowLeft} />
                    <div>
                        <Title variant="h3" color="text-primary">Registros Formato 2276</Title>
                        <Text variant="caption" color="text-secondary">Visor de información exógena cargada en el sistema</Text>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Input 
                        placeholder="Buscar por NIT o Nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={Search}
                        className="w-full md:w-64"
                        fullWidth={false}
                    />
                    <Select 
                        className="w-40"
                        value={selectedYear.toString()}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        options={[
                            { value: "", label: "Todos los años" },
                            ...Array.from({ length: 5 }, (_, i) => {
                                const year = (new Date().getFullYear() - i).toString();
                                return { value: year, label: year };
                            })
                        ]}
                    />
                </div>
            </div>

            {/* Filtros Activos Indicator */}
            {hasActiveFilters && (
                <div className="flex items-center gap-3 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl animate-in slide-in-from-top-2">
                    <Filter size={14} className="text-primary-600" />
                    <Text variant="caption" weight="bold" className="text-primary-700 dark:text-primary-300">
                        Filtros activos: {Object.values(filters).filter((f: any) => 
                            (f.type === 'categorical' && f.selected && f.selected.size > 0) ||
                            (f.type === 'numeric' && f.range && (f.range.min !== '' || f.range.max !== ''))
                        ).length}
                    </Text>
                    <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilters({})}
                        className="ml-auto text-xs font-bold text-primary-600 hover:text-primary-700 underline h-auto p-0"
                    >
                        Limpiar todos
                    </Button>
                </div>
            )}

            {/* Table Container */}
            <MaterialCard className="overflow-hidden border-none shadow-premium bg-white dark:bg-neutral-900">
                <div className="relative overflow-auto max-h-[calc(100vh-280px)] scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
                    <table className="w-full text-left border-collapse min-w-[1500px]">
                        <thead className="sticky top-0 z-20">
                            <tr className="bg-[#000080] text-white">
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">{renderFilterTrigger('entidad_informante', 'Entidad', 'categorical')}</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider sticky left-0 z-30 bg-[#000080]">{renderFilterTrigger('ano_gravable', 'Año', 'categorical')}</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider sticky left-[60px] z-30 bg-[#000080]">{renderFilterTrigger('nitb', 'Documento', 'categorical')}</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">{renderFilterTrigger('pno', 'Beneficiario', 'categorical')}</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">{renderFilterTrigger('pasa', 'Salarios (PASA)', 'numeric')}</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">{renderFilterTrigger('tingbtp', 'Ingresos Brutos', 'numeric')}</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">{renderFilterTrigger('apos', 'Salud', 'numeric')}</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">{renderFilterTrigger('apof', 'Pensión', 'numeric')}</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">{renderFilterTrigger('vare', 'Retenciones', 'numeric')}</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">{renderFilterTrigger('dir', 'Dirección', 'categorical')}</th>
                                <th className="p-4 text-[11px] font-bold uppercase tracking-wider">{renderFilterTrigger('mun', 'Municipio', 'categorical')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {loading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array.from({ length: 10 }).map((_, j) => (
                                            <td key={j} className="p-4"><div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full"></div></td>
                                        ))}
                                    </tr>
                                ))
                            ) : filteredData.length > 0 ? (
                                filteredData.map((item: Formato2276Item) => (
                                    <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                                        <td className="p-4 text-sm text-neutral-500">{item.entidad_informante || '-'}</td>
                                        <td className="p-4 text-sm font-medium sticky left-0 bg-white dark:bg-neutral-900">{item.ano_gravable}</td>
                                        <td className="p-4 text-sm font-bold text-primary-600 dark:text-primary-400 sticky left-[60px] bg-white dark:bg-neutral-900">
                                            {item.nitb}
                                        </td>
                                        <td className="p-4 text-sm">
                                            {item.pno} {item.ono} {item.pap} {item.sap}
                                        </td>
                                        <td className="p-4 text-sm font-mono">${item.pasa.toLocaleString()}</td>
                                        <td className="p-4 text-sm font-mono">${item.tingbtp.toLocaleString()}</td>
                                        <td className="p-4 text-sm font-mono text-danger-500">${item.apos.toLocaleString()}</td>
                                        <td className="p-4 text-sm font-mono text-danger-500">${item.apof.toLocaleString()}</td>
                                        <td className="p-4 text-sm font-mono text-success-600 dark:text-success-400 font-bold">${item.vare.toLocaleString()}</td>
                                        <td className="p-4 text-sm text-neutral-500">{item.dir || '-'}</td>
                                        <td className="p-4 text-sm text-neutral-500">{item.mun || '-'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={11} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-50">
                                            <FileSpreadsheet size={48} />
                                            <Text>No se encontraron registros para los filtros aplicados</Text>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Footer / Stats */}
                {!loading && data.length > 0 && (
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-[var(--color-border)] flex justify-between items-center">
                        <Text variant="caption">Mostrando {filteredData.length} de {data.length} registros</Text>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <Text variant="caption" className="block">Total Retenciones</Text>
                                <Text weight="bold" className="text-success-600">
                                    ${filteredData.reduce((acc: number, curr: Formato2276Item) => acc + curr.vare, 0).toLocaleString()}
                                </Text>
                            </div>
                        </div>
                    </div>
                )}
                {/* Popover de Filtro */}
                {activeFilter && (
                    <ColumnFilterPopover 
                        columnKey={activeFilter.key}
                        title={activeFilter.title}
                        type={activeFilter.type}
                        options={getUniqueValues(activeFilter.key)}
                        currentState={filters[activeFilter.key] || { type: activeFilter.type, selected: new Set(), range: { min: '', max: '' } }}
                        onSelectionChange={(key: string, state: any) => setFilters((prev: any) => ({ ...prev, [key]: state }))}
                        onClose={() => setActiveFilter(null)}
                        anchorRect={activeFilter.rect}
                    />
                )}
            </MaterialCard>
        </div>
    );
};

export default Formato2276DataTable;
