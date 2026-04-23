import React, { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Title, Text, Button, MaterialCard, Input, Select } from '../../../../components/atoms';
import { FilterDropdown } from '../../../../components/molecules';
import { useAppContext } from '../../../../context/AppContext';
import { ArrowLeft, Search, FileSpreadsheet, Filter } from 'lucide-react';
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

// El componente ColumnFilterPopover local ha sido eliminado a favor de FilterDropdown del sistema de diseño.

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
    const [filterSearch, setFilterSearch] = useState('');

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
                        setFilterSearch('');
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
                    <FilterDropdown
                        isOpen={!!activeFilter}
                        onClose={() => setActiveFilter(null)}
                        anchorRect={activeFilter.rect}
                        title={activeFilter.title}
                        type={activeFilter.type === 'categorical' ? 'categorical' : 'numeric'}
                        
                        // Categorical
                        searchTerm={filterSearch}
                        onSearchChange={setFilterSearch}
                        options={getUniqueValues(activeFilter.key)
                            .filter(o => o.toLowerCase().includes(filterSearch.toLowerCase()))
                            .map(o => ({ value: o, label: o }))}
                        tempValue={Array.from((filters[activeFilter.key] as any)?.selected || [])}
                        onToggleOption={(val) => {
                            const current = filters[activeFilter.key] || { type: activeFilter.type, selected: new Set(), range: { min: '', max: '' } };
                            const newSelected = new Set(current.selected || []);
                            if (newSelected.has(val)) newSelected.delete(val);
                            else newSelected.add(val);
                            setFilters(prev => ({ ...prev, [activeFilter.key]: { ...current, selected: newSelected } }));
                        }}
                        onSelectAll={() => {
                            const current = filters[activeFilter.key] || { type: activeFilter.type, selected: new Set(), range: { min: '', max: '' } };
                            setFilters(prev => ({ ...prev, [activeFilter.key]: { ...current, selected: new Set(getUniqueValues(activeFilter.key)) } }));
                        }}
                        isAllSelected={(filters[activeFilter.key] as any)?.selected?.size === getUniqueValues(activeFilter.key).length}
                        
                        // Numeric
                        rangeValue={{ 
                            min: (filters[activeFilter.key] as any)?.range?.min ?? '', 
                            max: (filters[activeFilter.key] as any)?.range?.max ?? '' 
                        }}
                        onRangeChange={(range) => {
                            const current = filters[activeFilter.key] || { type: activeFilter.type, selected: new Set(), range: { min: '', max: '' } };
                            const numericRange: { min: number | '', max: number | '' } = {
                                min: range.min === '' ? '' : Number(range.min),
                                max: range.max === '' ? '' : Number(range.max)
                            };
                            setFilters(prev => ({ ...prev, [activeFilter.key]: { ...current, range: numericRange } }));
                        }}
                        
                        onApply={() => setActiveFilter(null)}
                    />
                )}
            </MaterialCard>
        </div>
    );
};

export default Formato2276DataTable;
