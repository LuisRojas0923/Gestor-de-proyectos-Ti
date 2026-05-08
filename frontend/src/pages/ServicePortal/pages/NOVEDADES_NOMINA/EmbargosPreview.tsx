import React, { useState, useMemo, useEffect } from 'react';
import { Title, Text, Button, Select, Input, Badge } from '../../../../components/atoms';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, AlertTriangle, Search, History, 
    ChevronRight, Database, LayoutGrid, Plus 
} from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import SubcategorySummaryCard from './components/SubcategorySummaryCard';
import EmbargosForm, { EmbargoManualRow } from './components/EmbargosForm';
import { FilterDropdown } from '../../../../components/molecules/FilterDropdown';

interface EmbargosRow {
    cedula: string;
    nombre_asociado: string;
    valor: number;
    empresa: string;
    concepto: string;
}

interface WarningDetalle {
    cedula: string;
    nombre: string;
    motivo: string;
}

interface EmbargosResponse {
    rows: EmbargosRow[];
    summary: {
        total_asociados: number;
        total_filas: number;
        total_valor: number;
    };
    warnings: string[];
    warnings_detalle: WarningDetalle[];
}

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const EmbargosPreview: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<EmbargosResponse | null>(null);
    const [showForm, setShowForm] = useState(true);

    // Filtros
    const [searchText, setSearchText] = useState('');
    const [warningsDetalle, setWarningsDetalle] = useState<WarningDetalle[]>([]);
    const [showWarnings, setShowWarnings] = useState(false);

    // Filtros por columna (Excel style)
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

    // ── Cargar datos guardados al montar o cambiar periodo ──
    useEffect(() => {
        const fetchSaved = async () => {
            setIsLoading(true);
            setData(null);
            const token = localStorage.getItem('token');
            try {
                const res = await axios.get(
                    `${API_CONFIG.BASE_URL}/novedades-nomina/embargos/datos`,
                    { 
                        params: { mes, anio },
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
                if (res.data.rows && res.data.rows.length > 0) {
                    setData(res.data);
                    setWarningsDetalle(res.data.warnings_detalle || []);
                    setShowForm(false);
                } else {
                    setData(null);
                    setWarningsDetalle([]);
                    setShowForm(true);
                }
            } catch (err) {
                console.error('Error cargando datos EMBARGOS:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSaved();
    }, [mes, anio]);

    const handleProcessManual = async (manualRows: EmbargoManualRow[]) => {
        setIsProcessing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(
                `${API_CONFIG.BASE_URL}/novedades-nomina/embargos/procesar-manual`,
                {
                    mes,
                    anio,
                    rows: manualRows
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setData(res.data);
            setWarningsDetalle(res.data.warnings_detalle || []);
            addNotification('success', `Procesados ${res.data.summary.total_asociados} asociados.`);
            setShowForm(false);
        } catch (err) {
            console.error(err);
            addNotification('error', 'Error al procesar los datos manuales.');
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredRows = useMemo(() => {
        if (!data) return [];
        return data.rows
            .filter(r => {
                // Filtro de búsqueda global
                const matchGlobal = searchText === ''
                    || r.cedula.toLowerCase().includes(searchText.toLowerCase())
                    || (r.nombre_asociado && r.nombre_asociado.toLowerCase().includes(searchText.toLowerCase()));
                
                if (!matchGlobal) return false;

                // Filtros por columna
                for (const [key, values] of Object.entries(activeFilters)) {
                    if (values.length === 0) continue;
                    const rowValue = String((r as any)[key] || '').toUpperCase();
                    if (!values.includes(rowValue)) return false;
                }

                return true;
            })
            .sort((a, b) => (a.nombre_asociado || "").localeCompare(b.nombre_asociado || ""));
    }, [data, searchText, activeFilters]);

    const getColumnOptions = (key: keyof EmbargosRow) => {
        if (!data) return [];
        const uniqueValues = Array.from(new Set(data.rows.map(r => String(r[key] || '').toUpperCase())));
        return uniqueValues.sort().map(v => ({ label: v, value: v }));
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

    const summaries = useMemo(() => {
        const porEmpresa: Record<string, number> = {};
        const porConcepto: Record<string, number> = {};
        
        if (data && data.rows) {
            data.rows.forEach(row => {
                const emp = row.empresa || 'REFRIDCOL';
                const con = row.concepto || 'N/A';
                const val = row.valor || 0;
                
                porEmpresa[emp] = (porEmpresa[emp] || 0) + val;
                porConcepto[con] = (porConcepto[con] || 0) + val;
            });
        }
        
        return {
            totalAsociados: data?.summary?.total_asociados ?? 0,
            valorTotal: data?.summary?.total_valor ?? 0,
            porEmpresa,
            porConcepto
        };
    }, [data]);

    return (
        <div className="max-w-[1600px] mx-auto h-[calc(100vh-170px)] flex flex-col animate-in fade-in duration-500 overflow-hidden px-1 space-y-2">
            {/* Header */}
            <div className="flex-none pb-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/service-portal/novedades-nomina')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                                <Database className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <Title variant="h5" weight="bold">Embargos</Title>
                                <Text color="text-secondary" className="text-[10px] leading-none uppercase tracking-widest">DESCUENTOS / EMBARGOS</Text>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button 
                            variant={showForm ? 'primary' : 'outline'} 
                            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-300 shadow-sm h-auto py-1 px-2.5 min-w-[80px] ${showForm ? 'bg-[var(--color-primary)] text-white' : 'border-slate-200 text-slate-600'}`}
                            onClick={() => setShowForm(true)}
                        >
                            <Plus className={`w-3.5 h-3.5 mx-auto ${showForm ? 'text-white' : 'text-indigo-600'}`} />
                            <Text as="span" color="inherit" weight="black" className="text-[8px] uppercase tracking-wider text-center w-full">Ingresar Datos</Text>
                        </Button>
                        <Button 
                            variant={!showForm ? 'primary' : 'outline'} 
                            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-300 shadow-sm h-auto py-1 px-2.5 min-w-[80px] ${!showForm ? 'bg-[var(--color-primary)] text-white' : 'border-slate-200 text-slate-600'}`}
                            disabled={!data}
                            onClick={() => setShowForm(false)}
                        >
                            <LayoutGrid className={`w-3.5 h-3.5 mx-auto ${!showForm ? 'text-white' : 'text-indigo-600'}`} />
                            <Text as="span" color="inherit" weight="black" className="text-[8px] uppercase tracking-wider text-center w-full">Ver Resultados</Text>
                        </Button>

                        <Button 
                            variant="outline" 
                            className="flex flex-col items-center justify-center gap-0.5 rounded-xl border-slate-200 dark:border-slate-700 font-semibold h-auto py-1 px-2.5 min-w-[80px] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-300 shadow-sm"
                            onClick={() => navigate('/service-portal/novedades-nomina/historial?subcategoria=EMBARGOS')}
                        >
                            <History className="w-3.5 h-3.5 text-[var(--color-primary)] mx-auto" />
                            <Text size="xs" weight="black" className="text-[8px] text-center text-slate-600 dark:text-slate-300 uppercase">Historial</Text>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Controls / Period Selection */}
            <div className="flex-none bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-2">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-24">
                            <Input
                                label="Año"
                                size="sm"
                                type="number"
                                className="!mb-0 shadow-sm"
                                value={anio.toString()}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnio(parseInt(e.target.value))}
                            />
                        </div>
                        <div className="w-40">
                            <Select
                                label="Mes"
                                size="sm"
                                className="!mb-0 shadow-sm"
                                value={mes.toString()}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMes(parseInt(e.target.value))}
                                options={MESES.map((m, i) => ({ value: (i + 1).toString(), label: m }))}
                            />
                        </div>
                    </div>
                    <div className="hidden md:block">
                        <Text size="xs" color="text-secondary" className="italic font-medium opacity-80">
                            {showForm ? 'Ingresa los datos en el formulario inferior.' : 'Datos cargados para este periodo.'}
                        </Text>
                    </div>
                </div>
            </div>

            {/* Results Summary */}
            {data && (
                <div className="flex-none grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <SubcategorySummaryCard label="Asociados" value={summaries.totalAsociados} isCentered />
                    <SubcategorySummaryCard label="Valor x Empresa" details={summaries.porEmpresa} isTabulated formatAsCurrency />
                    <SubcategorySummaryCard label="Valor x Concepto" details={summaries.porConcepto} isTabulated formatAsCurrency />
                    <SubcategorySummaryCard label="Valor Total" value={summaries.valorTotal} isCentered formatAsCurrency />
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-y-auto pr-1">
                {showForm ? (
                    <div className="space-y-4 pb-4">
                        <EmbargosForm onProcess={handleProcessManual} isProcessing={isProcessing} />
                    </div>
                ) : (
                    <>
                        {isLoading && (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                                <Text className="ml-3" color="text-secondary">Cargando...</Text>
                            </div>
                        )}

                        {data && !isLoading && (
                            <>
                                {data.warnings.length > 0 && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                                            <Text weight="bold" size="xs" className="text-amber-800 dark:text-amber-300">Advertencias ({data.warnings.length})</Text>
                                        </div>
                                        <ul className="space-y-0.5 ml-6 list-disc">
                                            {data.warnings.map((w, i) => <li key={i}><Text size="xs" className="text-amber-700 dark:text-amber-400 text-[10px]">{w}</Text></li>)}
                                        </ul>
                                    </div>
                                )}

                                {warningsDetalle.length > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                                <Text weight="bold" size="xs" className="text-red-800 dark:text-red-300">Cédulas con problemas ({warningsDetalle.length})</Text>
                                            </div>
                                            <Button variant="ghost" size="xs" onClick={() => setShowWarnings(!showWarnings)}>
                                                <Text as="span" color="inherit" size="xs">{showWarnings ? 'Ocultar' : 'Ver detalle'}</Text>
                                            </Button>
                                        </div>
                                        {showWarnings && (
                                            <div className="mt-2 overflow-x-auto rounded-lg border border-red-200 dark:border-red-700 max-h-32">
                                                <table className="w-full text-[10px]">
                                                    <thead className="sticky top-0 bg-red-100 dark:bg-red-900/30">
                                                        <tr>
                                                            <th className="text-left p-2 font-bold text-red-800">CÉDULA</th>
                                                            <th className="text-left p-2 font-bold text-red-800">NOMBRE</th>
                                                            <th className="text-left p-2 font-bold text-red-800">MOTIVO</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-red-100">
                                                        {warningsDetalle.map((w, i) => (
                                                            <tr key={i} className="hover:bg-red-50">
                                                                 <td className="p-1.5 font-mono">{w.cedula}</td>
                                                                 <td className="p-1.5">{w.nombre}</td>
                                                                 <td className="p-1.5"><Badge variant="error" size="xs">{w.motivo}</Badge></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex-1 min-h-[400px] bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                                    <div className="flex-none p-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                                        <div className="flex items-center gap-2">
                                            <Database className="w-3.5 h-3.5 text-slate-400" />
                                            <Text variant="caption" weight="bold" className="uppercase tracking-wider text-slate-500">REGISTROS CARGADOS</Text>
                                        </div>
                                        <Text size="xs" color="text-secondary" className="text-[10px] font-bold">{filteredRows.length} REGISTROS</Text>
                                    </div>
                                    <div className="flex-1 overflow-auto">
                                        <table className="w-full text-[11px] border-collapse">
                                                    <thead className="sticky top-0 z-10">
                                                        <tr className="bg-[var(--color-primary-900)] text-white shadow-md">
                                                            <th className="text-center py-2 px-4 font-bold uppercase tracking-wider w-12 border-b border-white/5 border-r border-white/5 first:rounded-tl-xl">#</th>
                                                            <th className="text-center py-2 px-4 font-bold uppercase tracking-wider w-32 border-b border-white/5 border-r border-white/5">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <Text as="span" size="xs" color="inherit">CEDULA</Text>
                                                                    <FilterDropdown 
                                                                        options={getColumnOptions('cedula')}
                                                                        selectedOptions={activeFilters['cedula'] || []}
                                                                        onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, cedula: vals }))}
                                                                        dark
                                                                    />
                                                                </div>
                                                            </th>
                                                            <th className="text-left py-2 px-4 font-bold uppercase tracking-wider w-[232px] border-b border-white/5 border-r border-white/5">
                                                                <div className="flex items-center justify-start gap-1">
                                                                    <Text as="span" size="xs" color="inherit">NOMBRE</Text>
                                                                    <FilterDropdown 
                                                                        options={getColumnOptions('nombre_asociado')}
                                                                        selectedOptions={activeFilters['nombre_asociado'] || []}
                                                                        onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, nombre_asociado: vals }))}
                                                                        dark
                                                                    />
                                                                </div>
                                                            </th>
                                                            <th className="text-center py-2 px-4 font-bold uppercase tracking-wider w-36 border-b border-white/5 border-r border-white/5">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <Text as="span" size="xs" color="inherit">EMPRESA</Text>
                                                                    <FilterDropdown 
                                                                        options={getColumnOptions('empresa')}
                                                                        selectedOptions={activeFilters['empresa'] || []}
                                                                        onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, empresa: vals }))}
                                                                        dark
                                                                    />
                                                                </div>
                                                            </th>
                                                            <th className="text-center py-2 px-4 font-bold uppercase tracking-wider w-36 border-b border-white/5 border-r border-white/5">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <Text as="span" size="xs" color="inherit">VALOR</Text>
                                                                </div>
                                                            </th>
                                                            <th className="text-center py-2 px-4 font-bold uppercase tracking-wider w-36 border-b border-white/5 last:rounded-tr-xl">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <Text as="span" size="xs" color="inherit">CONCEPTO</Text>
                                                                    <FilterDropdown 
                                                                        options={getColumnOptions('concepto')}
                                                                        selectedOptions={activeFilters['concepto'] || []}
                                                                        onFilterChange={(vals) => setActiveFilters(prev => ({ ...prev, concepto: vals }))}
                                                                        dark
                                                                    />
                                                                </div>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {filteredRows.map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                        <td className="p-2 text-slate-400 font-mono w-12 border-r border-slate-50 text-center">{i + 1}</td>
                                                        <td className="p-2 font-mono border-r border-slate-50 text-center">{row.cedula}</td>
                                                        <td className="p-2 border-r border-slate-50 text-left pl-4">{row.nombre_asociado}</td>
                                                        <td className="p-2 border-r border-slate-50 text-center">{row.empresa}</td>
                                                        <td className="p-2 text-right font-mono font-bold text-[var(--color-primary)] border-r border-slate-50">{formatCurrency(row.valor)}</td>
                                                        <td className="p-2 text-center"><Badge variant="info" size="xs">{row.concepto}</Badge></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default EmbargosPreview;
