import React, { useState, useMemo, useEffect } from 'react';
import { Title, Text, Button, Select, Input, Badge } from '../../../../components/atoms';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, AlertTriangle, Search, History, ChevronRight, Database } from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../../../../config/api';
import { useNotifications } from '../../../../components/notifications/NotificationsContext';
import SubcategorySummaryCard from './components/SubcategorySummaryCard';
import { FilterDropdown } from '../../../../components/molecules/FilterDropdown';

interface MedicinaPrepagadaRow {
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

interface MedicinaPrepagadaResponse {
    rows: MedicinaPrepagadaRow[];
    summary: {
        total_asociados: number;
        total_filas: number;
        total_valor: number;
        mes: number;
        anio: number;
    };
    warnings: string[];
    warnings_detalle: WarningDetalle[];
}

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const CURRENCY_FORMATTER = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
});

const MedicinaPrepagadaPreview: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<MedicinaPrepagadaResponse | null>(null);

    // Filtros
    const [searchText, setSearchText] = useState('');

    // Warnings ERP
    const [warningsDetalle, setWarningsDetalle] = useState<WarningDetalle[]>([]);
    const [showWarnings, setShowWarnings] = useState(false);

    // Filtros por columna (Excel style)
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

    // ── Cargar datos guardados al montar o cambiar periodo ──
    useEffect(() => {
        const fetchSaved = async () => {
            setIsLoading(true);
            try {
                const res = await axios.get(
                    `${API_CONFIG.BASE_URL}/novedades-nomina/medicina_prepagada/datos`,
                    { params: { mes, anio } }
                );
                if (res.data.rows && res.data.rows.length > 0) {
                    setData({ 
                        rows: res.data.rows, 
                        summary: res.data.summary, 
                        warnings: [], 
                        warnings_detalle: res.data.warnings_detalle || [] 
                    });
                    setWarningsDetalle(res.data.warnings_detalle || []);
                } else {
                    setData(null);
                    setWarningsDetalle([]);
                }
            } catch (err) {
                console.error('Error cargando datos MEDICINA PREPAGADA:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSaved();
    }, [mes, anio]);

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleProcess = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        try {
            const formData = new FormData();
            files.forEach(f => formData.append('files', f));
            formData.append('mes', mes.toString());
            formData.append('anio', anio.toString());

            const res = await axios.post(
                `${API_CONFIG.BASE_URL}/novedades-nomina/medicina_prepagada/preview`,
                formData,
            );
            setData(res.data);
            setWarningsDetalle(res.data.warnings_detalle || []);
            addNotification('success', `Procesados ${res.data.summary.total_asociados} asociados.`);
        } catch (err) {
            console.error(err);
            addNotification('error', 'Error al procesar los archivos.');
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

    const getColumnOptions = React.useCallback((key: keyof MedicinaPrepagadaRow) => {
        if (!data) return [];
        const uniqueValues = Array.from(new Set(data.rows.map(r => String(r[key] || '').toUpperCase())));
        return uniqueValues.sort().map(v => ({ label: v, value: v }));
    }, [data]);

    const formatCurrency = React.useCallback((val: number) =>
        CURRENCY_FORMATTER.format(val), []);

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
            {/* Header - Reduced space */}
            <div className="flex-none pb-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/service-portal/novedades-nomina')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <Title variant="h4" weight="bold">MEDICINA PREPAGADA – Preview</Title>
                            <Text color="text-secondary">OTROS / MEDICINA PREPAGADA</Text>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        className="flex flex-col items-end gap-0.5 h-auto py-1 px-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        onClick={() => navigate('/service-portal/novedades-nomina/historial?subcategoria=MEDICINA PREPAGADA')}
                    >
                        <div className="flex items-center gap-2">
                            <Title variant="h5" weight="bold" className="text-slate-800 dark:text-slate-200">Ver Histórico</Title>
                            <History className="w-4 h-4 text-[var(--color-primary)]" />
                        </div>
                        <div className="flex items-center gap-1">
                            <Text variant="caption" weight="bold" className="uppercase tracking-wider text-slate-500">
                                PREPAGADA / HISTORIAL
                            </Text>
                            <ChevronRight className="w-3 h-3 text-slate-400" />
                        </div>
                    </Button>
                </div>
            </div>

            {/* Upload Section - More compact */}
            <div className="flex-none bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col md:flex-row items-end gap-4">
                    <div className="w-full md:w-40">
                        <Select
                            label="Mes"
                            value={mes.toString()}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMes(parseInt(e.target.value))}
                            options={MESES.map((m, i) => ({ value: (i + 1).toString(), label: m }))}
                            className="[&_select]:h-[42px]"
                        />
                    </div>
                    <div className="w-full md:w-28">
                        <Input
                            label="Año"
                            type="number"
                            value={anio.toString()}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnio(parseInt(e.target.value))}
                            className="[&_input]:h-[42px]"
                        />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                        <Text as="label" variant="body2" weight="medium" color="text-primary" className="block">
                            Archivo Excel ({files.length} seleccionado)
                        </Text>
                        <div className="relative group">
                            <input id="file-upload" // @audit-ok
                                type="file"
                                multiple
                                accept=".xlsx,.xls"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={handleFilesChange}
                            />
                            <div className="flex items-center gap-2 px-4 h-[42px] rounded-xl border border-dashed border-slate-300 dark:border-slate-600 group-hover:border-[var(--color-primary)] transition-colors cursor-pointer bg-slate-50 dark:bg-slate-900/50">
                                <Upload className="w-4 h-4 text-slate-400 group-hover:text-[var(--color-primary)]" />
                                <Text size="sm" color="text-secondary" className="truncate">
                                    {files.length > 0
                                        ? files.map(f => f.name).join(', ')
                                        : 'Seleccionar Excel...'}
                                </Text>
                            </div>
                        </div>
                    </div>
                    <div className="shrink-0">
                        <Button
                            variant="primary"
                            className="px-6 h-[42px] rounded-xl font-bold shadow-lg flex items-center justify-center"
                            disabled={files.length === 0 || isProcessing}
                            onClick={handleProcess}
                        >
                            {isProcessing ? (
                                <Text as="span" color="inherit" className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    Procesando...
                                </Text>
                            ) : (
                                <Text as="span" color="inherit" className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Procesar Excel
                                </Text>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Loading saved data */}
            {isLoading && !isProcessing && (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
                    <Text className="ml-3" color="text-secondary">Cargando datos guardados...</Text>
                </div>
            )}

            {/* Results */}
            {data && !isLoading && (
                <div className="flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden">
                    {/* Summary Cards - Always Visible and tighter */}
                    <div className="flex-none grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <SubcategorySummaryCard 
                            label="Asociados" 
                            value={summaries.totalAsociados} 
                            isCentered
                        />
                        <SubcategorySummaryCard 
                            label="Valor x Empresa" 
                            details={summaries.porEmpresa} 
                            isTabulated
                            formatAsCurrency
                        />
                        <SubcategorySummaryCard 
                            label="Valor x Concepto" 
                            details={summaries.porConcepto} 
                            isTabulated
                            formatAsCurrency
                        />
                        <SubcategorySummaryCard 
                            label="Valor Total" 
                            value={summaries.valorTotal} 
                            isCentered
                            formatAsCurrency
                        />
                    </div>

                    {/* Warnings Text - Compact */}
                    {data.warnings && data.warnings.length > 0 && (
                        <div className="flex-none bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <Text weight="bold" size="xs" className="text-amber-800 dark:text-amber-300">
                                    Advertencias ({data.warnings.length})
                                </Text>
                            </div>
                            <ul className="space-y-0.5 ml-6 list-disc">
                                {data.warnings.map((w: string, i: number) => (
                                    <li key={`${w.id || w.cedula || 'w'}-${i}`}>
                                        <Text size="xs" className="text-amber-700 dark:text-amber-400 text-[10px]">{w}</Text>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Warnings ERP Detalle - Compact */}
                    {warningsDetalle.length > 0 && (
                        <div className="flex-none bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                    <Text weight="bold" size="xs" className="text-red-800 dark:text-red-300">
                                        Cédulas con problemas ({warningsDetalle.length})
                                    </Text>
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
                                            {warningsDetalle.map((w: WarningDetalle, i: number) => (
                                                <tr key={`${w.cedula || 'warn'}-${i}`} className="hover:bg-red-50">
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

                    {/* Table - Self scrolling */}
                    <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                        <div className="flex-none p-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                            <div className="flex items-center gap-2">
                                <Database className="w-3.5 h-3.5 text-slate-400" />
                                <Text variant="caption" weight="bold" className="uppercase tracking-wider text-slate-500">
                                    REGISTROS CARGADOS
                                </Text>
                            </div>
                            <Text size="xs" color="text-secondary" className="text-[10px] font-bold">
                                {filteredRows.length} REGISTROS
                            </Text>
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
                                        <th className="text-center py-2 px-4 font-bold uppercase tracking-wider w-[232px] border-b border-white/5 border-r border-white/5">
                                            <div className="flex items-center justify-center gap-1">
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
                                        <tr key={`${row.cedula || 'row'}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="p-2 text-slate-400 font-mono w-12 border-r border-slate-50 text-center">{i + 1}</td>
                                            <td className="p-2 font-mono border-r border-slate-50 text-center">{row.cedula}</td>
                                            <td className="p-2 border-r border-slate-50 text-left pl-4">{row.nombre_asociado}</td>
                                            <td className="p-2 border-r border-slate-50 text-center">{row.empresa}</td>
                                            <td className="p-2 text-right font-mono font-bold text-[var(--color-primary)] border-r border-slate-50">
                                                {formatCurrency(row.valor)}
                                            </td>
                                            <td className="p-2 text-center">
                                                <Badge variant="info" size="xs">{row.concepto}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State - Compact */}
            {!data && !isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                        <Database className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                    </div>
                    <Title variant="h5" weight="bold" className="text-slate-400 dark:text-slate-700 mb-1 uppercase tracking-widest text-xs">Sin datos procesados</Title>
                    <Text size="xs" className="text-slate-400 dark:text-slate-600 max-w-xs">
                        Selecciona y procesa archivo Excel para ver registros de {MESES[mes-1]} {anio}.
                    </Text>
                </div>
            )}
        </div>
    );
};

/* ---- Sub-components ---- */

export default MedicinaPrepagadaPreview;
